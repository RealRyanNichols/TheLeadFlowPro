import { NextResponse } from "next/server";
import { createClient as createSupabaseClient } from "@supabase/supabase-js";
import { SUPABASE_URL } from "@/lib/config";
import {
  INBOUND_AUTO_REPLY,
  isStopMessage,
  sendInboundAutoReply,
  toE164,
  verifyLeadFlowQuoInboundIdentity,
} from "@/lib/quo";
import { sendInternalLeadAlert } from "@/lib/leadNotify";
import { leadFlowSupabaseRuntimeIssues } from "@/lib/metaCampaignGuard";

// Inbound SMS from Quo. Three jobs, in this order:
//
//   1. Honor STOP immediately, before anything else can send anything.
//   2. Put the message on the right lead record, creating the lead if this
//      number has never reached us before. Somebody who texts the number off
//      an ad IS a lead, and used to vanish into a console.warn.
//   3. Send exactly one auto-reply, ever, per person.
//
// THE RULE THIS ENFORCES (Ryan's, 2026-08-26): nobody gets a text from us
// unless they texted us first. There is no cold outbound and no form-fill
// trigger. The August 21 emergency stop on application-originated outbound
// stays in force and this route does not touch it. The auto-reply has its own
// switch, QUO_INBOUND_AUTOREPLY_ENABLED, and its own function in lib/quo.ts.
//
// SETUP (one time, in the Quo dashboard):
//   Webhooks -> new webhook -> event "message.received"
//   URL: https://www.theleadflowpro.com/api/quo-inbound?secret=<QUO_WEBHOOK_SECRET>
// Select only The LeadFlow Pro number as the webhook resource. Then set:
//   QUO_WEBHOOK_SECRET: any long random string
//   QUO_LEADFLOW_INBOUND_PHONE_NUMBER_ID: the verified PN... id for
//     The LeadFlow Pro line (+1 903-500-8898)
// Without the exact PN id, ingestion is disabled by default. The handler also
// checks the payload's `to` number, so a shared-workspace/PDA event is ignored.
//
// Until that webhook is pointed here this route never fires, and nothing in
// the thread breaks: outbound-by-hand and manual logging still work.
//
// Uses the service role key because Quo is unauthenticated to Supabase and
// lead_messages is admin-only under RLS. The shared secret is the gate.

const AUTO_REPLY_MARKER = "Sent the inbound auto-reply";

function normalize(phone: string) {
  const digits = String(phone ?? "").replace(/[^\d]/g, "");
  return digits.slice(-10); // match on the last 10 so +1/1/formatting all agree
}

export async function POST(request: Request) {
  const secret = process.env.QUO_WEBHOOK_SECRET;
  const given = new URL(request.url).searchParams.get("secret");
  if (!secret || given !== secret) {
    return NextResponse.json({ ok: false }, { status: 401 });
  }

  // The service-role key must never be read or used until the runtime is
  // proven to be the exact LeadFlow Supabase project.
  const runtimeIdentityIssues = leadFlowSupabaseRuntimeIssues(SUPABASE_URL);
  if (runtimeIdentityIssues.length) {
    console.error("quo-inbound: runtime identity rejected", runtimeIdentityIssues);
    return NextResponse.json({ ok: false, disabled: true }, { status: 503 });
  }

  const payload = await request.json().catch(() => null);
  if (!payload) return NextResponse.json({ ok: false }, { status: 400 });

  // Quo wraps the message in data.object for message.* events.
  const obj = payload?.data?.object ?? payload?.data ?? payload;
  const inboundIdentity = verifyLeadFlowQuoInboundIdentity({
    eventType: payload?.type,
    direction: obj?.direction,
    phoneNumberId: obj?.phoneNumberId,
    to: obj?.to,
    allowedPhoneNumberId: process.env.QUO_LEADFLOW_INBOUND_PHONE_NUMBER_ID,
  });
  if (!inboundIdentity.ok) {
    if (inboundIdentity.reason === "inbound_not_configured") {
      console.error("quo-inbound: exact LeadFlow phone-number id is not configured");
      // Acknowledge without ingesting so a safely disabled webhook does not
      // create a provider retry storm. The original SMS remains in Quo.
      return NextResponse.json({ ok: true, skipped: true, disabled: true });
    }
    // A shared Quo webhook can legitimately deliver another resource. Acknowledge
    // it without touching LeadFlow CRM so Quo does not retry it indefinitely.
    return NextResponse.json({ ok: true, skipped: true });
  }

  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!serviceKey) {
    console.error("quo-inbound: SUPABASE_SERVICE_ROLE_KEY not set");
    return NextResponse.json({ ok: false }, { status: 500 });
  }

  const text = String(obj?.text ?? obj?.body ?? obj?.content ?? "").trim();
  const from = obj?.from?.phoneNumber ?? obj?.from ?? "";
  const providerId = obj?.id ? String(obj.id) : null;

  // Ignore our own outbound echo, and anything with no usable content.
  if (!text || !from) {
    return NextResponse.json({ ok: true, skipped: true });
  }

  const supabase = createSupabaseClient(SUPABASE_URL, serviceKey, {
    auth: { persistSession: false },
  });

  const last10 = normalize(from);
  if (last10.length < 10) return NextResponse.json({ ok: true, skipped: true });

  // ------------------------------------------------------------------ lead ---
  const { data: leads } = await supabase
    .from("leads")
    .select("id, phone, full_name, sms_unsubscribed_at")
    .not("phone", "is", null)
    .is("deleted_at", null)
    .order("created_at", { ascending: false })
    .limit(500);

  let lead = (leads ?? []).find((l) => normalize(l.phone as string) === last10) ?? null;

  // --------------------------------------------------------- STOP, first ---
  // Before any lookup work turns into a send. If they said stop, we record it
  // and we are done. No reply, not even a confirmation: the carrier sends
  // that one and a second message from us is exactly what they asked to stop.
  if (isStopMessage(text)) {
    if (lead) {
      await supabase
        .from("leads")
        .update({ sms_unsubscribed_at: new Date().toISOString(), sms_consent: false })
        .eq("id", lead.id);
      await supabase.from("lead_activity").insert({
        lead_id: lead.id,
        kind: "system",
        detail: "Texted STOP. Outbound SMS to this number is off.",
      });
    }
    return NextResponse.json({ ok: true, stopped: true });
  }

  const e164 = toE164(String(from));
  let created = false;

  if (!lead) {
    // Somebody texted the number cold, most likely straight off an ad. That is
    // a lead, not a stray message. The email column is NOT NULL, so it gets a
    // sentinel address that every sending path already refuses to mail.
    const inserted = await supabase
      .from("leads")
      .insert({
        full_name: `Text-in ${last10.slice(0, 3)}-${last10.slice(3, 6)}-${last10.slice(6)}`,
        email: `${last10}@no-email.sms.lead`,
        phone: e164 ?? String(from).slice(0, 50),
        interest: "unsure",
        goals: `Texted (903) 500-8898 first. First message: ${text.slice(0, 500)}`,
        best_contact_method: "text",
        source: "sms_inbound",
        utm_source: "sms",
        utm_medium: "inbound",
        utm_campaign: "text_in",
        // They started the conversation, so replying by text is invited. They
        // never gave an email address, so email marketing consent stays false.
        sms_consent: true,
        marketing_email_consent: false,
        consent_at: new Date().toISOString(),
        status: "new",
      })
      .select("id, phone, full_name, sms_unsubscribed_at")
      .single();

    if (inserted.error) {
      console.error("quo-inbound: could not create lead:", inserted.error.message);
      return NextResponse.json({ ok: true, matched: false });
    }
    lead = inserted.data;
    created = true;

    // Ryan finds out a stranger texted him the same way he finds out about
    // every other lead. Fails soft: a broken mailer never blocks the reply.
    await sendInternalLeadAlert({
      full_name: lead.full_name,
      email: `(no email, texted in from ${e164 ?? from})`,
      phone: lead.phone,
      interest: "unsure",
      goals: text.slice(0, 1000),
      source: "sms_inbound",
    }).catch(() => false);
  }

  // ------------------------------------------------------------- message ---
  // Idempotency: Quo retries webhooks, and a duplicate would show the same
  // reply twice in the thread and could double-fire the auto-reply.
  if (providerId) {
    const { data: existing } = await supabase
      .from("lead_messages")
      .select("id")
      .eq("provider_id", providerId)
      .maybeSingle();
    if (existing) return NextResponse.json({ ok: true, duplicate: true });
  }

  await supabase.from("lead_messages").insert({
    lead_id: lead.id,
    direction: "in",
    channel: "sms",
    body: text.slice(0, 3000),
    author: lead.full_name,
    delivered: true,
    provider_id: providerId,
  });

  await supabase.from("lead_activity").insert({
    lead_id: lead.id,
    kind: "message",
    detail: created ? "Texted us first" : "They replied by text",
  });

  // ---------------------------------------------------------- auto-reply ---
  // Once per person, ever. The activity row is the marker, and it is written
  // only after Quo accepts the send, so a failed send retries on their next
  // message instead of being silently swallowed.
  let replied = false;
  if (!lead.sms_unsubscribed_at) {
    const { data: alreadyReplied } = await supabase
      .from("lead_activity")
      .select("id")
      .eq("lead_id", lead.id)
      .eq("kind", "system")
      .eq("detail", AUTO_REPLY_MARKER)
      .limit(1)
      .maybeSingle();

    if (!alreadyReplied && e164) {
      replied = await sendInboundAutoReply(e164, INBOUND_AUTO_REPLY);
      if (replied) {
        await supabase.from("lead_messages").insert({
          lead_id: lead.id,
          direction: "out",
          channel: "sms",
          body: INBOUND_AUTO_REPLY,
          author: "Ryan Nichols",
          delivered: true,
        });
        await supabase.from("lead_activity").insert({
          lead_id: lead.id,
          kind: "system",
          detail: AUTO_REPLY_MARKER,
        });
      }
    }
  }

  return NextResponse.json({ ok: true, matched: true, created, replied });
}
