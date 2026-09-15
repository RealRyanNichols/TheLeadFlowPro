import { NextResponse } from "next/server";
import { createClient as createSupabaseClient } from "@supabase/supabase-js";
import { SUPABASE_URL } from "@/lib/config";
import {
  INBOUND_AUTO_REPLY,
  normalizePhoneLast10,
  sendInboundAutoReply,
  toE164,
  verifyLeadFlowQuoInboundIdentity,
} from "@/lib/quo";
import { sendInternalLeadAlert } from "@/lib/leadNotify";
import { leadFlowSupabaseRuntimeIssues } from "@/lib/metaCampaignGuard";

// Inbound SMS from Quo. This route does NOT create leads, log messages, or
// decide anything about consent. It authenticates the caller, proves the event
// belongs to The LeadFlow Pro line, and hands the payload to one database
// function.
//
// WHY IT LOOKS LIKE THIS (Task 0, 2026-09-16)
// There were two systems that both created leads from inbound Quo traffic:
// this route, and public.log_quo_activity, which the Supabase edge function
// quo-webhook calls. Nothing coordinated them. If both endpoints were ever
// registered in Quo, one inbound text fanned out to both, both lookups missed,
// and you got two lead rows with different sources, different sentinel emails
// and opposite consent flags. Nothing collided, so nothing was detected.
//
// public.log_quo_activity now owns lead creation outright. Both doors call it.
// That is what makes double delivery harmless: its writes are ON CONFLICT
// (provider_id) against real unique indexes, so the second copy of one message
// updates a row instead of creating a second one. It also means it no longer
// matters which endpoint Quo is registered against.
//
// STOP is handled inside that function, before any lead is created, and an
// unknown number that texts STOP is recorded in public.sms_suppressions rather
// than dropped. Do not add a STOP check here. A second implementation is how
// the two lists drifted apart the first time.
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
// Uses the service role key because Quo is unauthenticated to Supabase and
// log_quo_activity is service-role only. The shared secret is the gate.

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

  // Nothing usable, and nothing to retry. Quo gets a clean acknowledgement.
  if (!text || !from || !providerId) {
    return NextResponse.json({ ok: true, skipped: true });
  }

  const last10 = normalizePhoneLast10(from);
  if (last10.length < 10) return NextResponse.json({ ok: true, skipped: true });

  const supabase = createSupabaseClient(SUPABASE_URL, serviceKey, {
    auth: { persistSession: false },
  });

  // ------------------------------------------------------- single owner ---
  const { data: result, error } = await supabase.rpc("log_quo_activity", {
    payload: {
      kind: "message",
      channel: "sms",
      provider_id: providerId,
      conversation_id: obj?.conversationId ?? null,
      participant_phone: String(from),
      direction: "incoming",
      occurred_at: obj?.createdAt ?? payload?.createdAt ?? null,
      body: text,
      author: obj?.userId ?? null,
      delivered: true,
      source: "quo",
    },
  });

  if (error) {
    // A 500 is correct here: Quo retries, and the write is idempotent on
    // provider_id, so a retry costs nothing and a dropped message costs a lead.
    console.error("quo-inbound: log_quo_activity failed:", error.message);
    return NextResponse.json({ ok: false, error: error.message }, { status: 500 });
  }

  const created = Boolean(result?.lead_created);
  const leadId: string | null = result?.lead_id ?? null;
  const stopped = Boolean(result?.sms_opted_out) || Boolean(result?.suppressed);

  // Ryan finds out a stranger texted him the same way he finds out about every
  // other lead. Fails soft: a broken mailer never blocks anything.
  if (created && leadId) {
    const e164For = toE164(String(from));
    await sendInternalLeadAlert({
      full_name: `Text-in ${last10.slice(0, 3)}-${last10.slice(3, 6)}-${last10.slice(6)}`,
      email: `(no email, texted in from ${e164For ?? from})`,
      phone: e164For ?? String(from),
      interest: "unsure",
      goals: text.slice(0, 1000),
      source: "sms_inbound",
    }).catch(() => false);
  }

  // ---------------------------------------------------------- auto-reply ---
  // Once per person, ever, keyed on the phone number rather than the lead row,
  // because duplicate lead rows for one person exist. Claim the row first, then
  // call the provider, never the reverse: a claim that is never stamped sent is
  // released so a later inbound message can retry, and a crash between the two
  // costs one missed reply rather than an unbounded loop of them.
  let replied = false;
  const e164 = toE164(String(from));

  if (result?.auto_reply_eligible && !stopped && e164) {
    const claim = await supabase
      .from("sms_auto_replies")
      .insert({ phone_norm: last10, lead_id: leadId, attempts: 1 })
      .select("phone_norm")
      .single();

    if (!claim.error) {
      replied = await sendInboundAutoReply(e164, INBOUND_AUTO_REPLY);

      if (replied) {
        await supabase
          .from("sms_auto_replies")
          .update({ sent_at: new Date().toISOString() })
          .eq("phone_norm", last10);

        if (leadId) {
          await supabase.from("lead_messages").insert({
            lead_id: leadId,
            direction: "out",
            channel: "sms",
            body: INBOUND_AUTO_REPLY,
            author: "Ryan Nichols",
            delivered: true,
          });
        }
      } else {
        // Release the claim. The switch is off, or the provider refused. Either
        // way this person has not had their one reply yet.
        await supabase
          .from("sms_auto_replies")
          .delete()
          .eq("phone_norm", last10)
          .is("sent_at", null);
      }
    }
  }

  return NextResponse.json({
    ok: true,
    matched: Boolean(leadId),
    created,
    stopped,
    replied,
  });
}
