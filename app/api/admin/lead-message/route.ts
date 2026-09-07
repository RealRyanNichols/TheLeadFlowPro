import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { sendLeadText } from "@/lib/quo";
import {
  leadMessageAuthor,
  leadMessageEmail,
  hasLeadEmailAddress,
} from "@/lib/leadMessageAuthor";

// Send a message to a lead from the CRM and record it on the thread.
//
// Runs server-side because the Quo and Resend keys live in env vars and must
// never reach the browser. The browser only ever posts { lead_id, body }.
//
// Channel choice, in order:
//   1. SMS through Quo, if the lead has a phone AND gave SMS consent.
//   2. Email through Resend otherwise.
// Consent is checked here rather than in the UI so it cannot be bypassed by a
// crafted request.
//
// The message row is written EITHER WAY. A send that the provider rejects is
// stored with delivered=false and the error, so a failed message never silently
// vanishes from the conversation.

async function sendEmail(
  to: string,
  name: string,
  body: string,
  author: ReturnType<typeof leadMessageAuthor>,
) {
  const key = process.env.RESEND_API_KEY;
  if (!key)
    return {
      ok: false,
      id: null as string | null,
      error: "RESEND_API_KEY not set",
    };
  try {
    const r = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${key}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify(leadMessageEmail(to, name, body, author)),
    });
    const j = await r.json().catch(() => ({}));
    if (!r.ok)
      return { ok: false, id: null, error: j?.message || `Resend ${r.status}` };
    return { ok: true, id: j?.id ?? null, error: null };
  } catch (e) {
    return { ok: false, id: null, error: String(e).slice(0, 200) };
  }
}

export async function POST(request: Request) {
  const supabase = await createClient();

  // Admin or sales only. RLS also guards lead_messages, but failing here gives a clear
  // answer instead of a silent empty insert.
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user)
    return NextResponse.json({ error: "Not signed in" }, { status: 401 });
  const { data: profile } = await supabase
    .from("profiles")
    .select("role, full_name")
    .eq("id", user.id)
    .single();
  if (profile?.role !== "admin" && profile?.role !== "sales") {
    return NextResponse.json(
      { error: "Sales access required" },
      { status: 403 },
    );
  }

  const author = leadMessageAuthor(profile.full_name, user.email);
  const payload = await request.json().catch(() => ({}));
  const leadId = String(payload.lead_id ?? "");
  const body = String(payload.body ?? "")
    .trim()
    .slice(0, 3000);
  if (!leadId || !body) {
    return NextResponse.json(
      { error: "lead_id and body are required" },
      { status: 400 },
    );
  }

  const { data: lead } = await supabase
    .from("leads")
    .select("id, full_name, email, phone, sms_consent, sms_unsubscribed_at")
    .eq("id", leadId)
    .single();
  if (!lead)
    return NextResponse.json({ error: "Lead not found" }, { status: 404 });

  const canText =
    Boolean(lead.phone) &&
    Boolean(lead.sms_consent) &&
    !lead.sms_unsubscribed_at;

  let channel: "sms" | "email";
  let ok = false;
  let providerId: string | null = null;
  let error: string | null = null;

  if (canText) {
    channel = "sms";
    ok = await sendLeadText(lead.phone as string, body);
    if (!ok) error = "Quo did not accept the message";
  } else {
    channel = "email";
    if (!hasLeadEmailAddress(lead.email)) {
      return NextResponse.json(
        {
          error:
            "This lead has no phone with SMS consent and no usable email address.",
        },
        { status: 400 },
      );
    }
    const res = await sendEmail(lead.email, lead.full_name, body, author);
    ok = res.ok;
    providerId = res.id;
    error = res.error;
  }

  const { data: row, error: insertError } = await supabase
    .from("lead_messages")
    .insert({
      lead_id: leadId,
      direction: "out",
      channel,
      body,
      author: author.auditName,
      delivered: ok,
      provider_id: providerId,
      error,
    })
    .select()
    .single();

  if (insertError) {
    return NextResponse.json({ error: insertError.message }, { status: 500 });
  }

  await supabase.from("lead_activity").insert({
    lead_id: leadId,
    kind: "message",
    detail: ok
      ? `${author.auditName} sent ${channel === "sms" ? "a text" : "an email"}`
      : `${author.auditName}: ${channel === "sms" ? "text" : "email"} failed to send`,
  });

  return NextResponse.json({ message: row, delivered: ok, channel, error });
}
