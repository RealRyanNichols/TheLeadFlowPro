import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { sendLeadText } from "@/lib/quo";

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

const RESEND_FROM = "Ryan Nichols <ryan@theleadflowpro.com>";

function esc(s: string) {
  return s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
}

async function sendEmail(to: string, name: string, body: string) {
  const key = process.env.RESEND_API_KEY;
  if (!key) return { ok: false, id: null as string | null, error: "RESEND_API_KEY not set" };
  const firstName = (name || "").trim().split(/\s+/)[0] || "there";
  const html = `<div style="font-family:system-ui,-apple-system,Segoe UI,sans-serif;font-size:15px;line-height:1.6;color:#0a1220">
<p>Hi ${esc(firstName)},</p>
<p>${esc(body).replace(/\n/g, "<br>")}</p>
<p style="margin-top:22px">Ryan Nichols<br>
<span style="color:#4e5866">The LeadFlow Pro &middot; (903) 500-8898</span></p>
</div>`;
  try {
    const r = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: { Authorization: `Bearer ${key}`, "Content-Type": "application/json" },
      body: JSON.stringify({
        from: RESEND_FROM,
        to,
        reply_to: "ryan@theleadflowpro.com",
        subject: `Message from Ryan at The LeadFlow Pro`,
        html,
        text: `Hi ${firstName},\n\n${body}\n\nRyan Nichols\nThe LeadFlow Pro · (903) 500-8898`,
      }),
    });
    const j = await r.json().catch(() => ({}));
    if (!r.ok) return { ok: false, id: null, error: j?.message || `Resend ${r.status}` };
    return { ok: true, id: j?.id ?? null, error: null };
  } catch (e) {
    return { ok: false, id: null, error: String(e).slice(0, 200) };
  }
}

export async function POST(request: Request) {
  const supabase = await createClient();

  // Admin only. RLS also guards lead_messages, but failing here gives a clear
  // answer instead of a silent empty insert.
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Not signed in" }, { status: 401 });
  const { data: profile } = await supabase
    .from("profiles")
    .select("role, full_name")
    .eq("id", user.id)
    .single();
  if (profile?.role !== "admin") {
    return NextResponse.json({ error: "Admins only" }, { status: 403 });
  }

  const payload = await request.json().catch(() => ({}));
  const leadId = String(payload.lead_id ?? "");
  const body = String(payload.body ?? "").trim().slice(0, 3000);
  if (!leadId || !body) {
    return NextResponse.json({ error: "lead_id and body are required" }, { status: 400 });
  }

  const { data: lead } = await supabase
    .from("leads")
    .select("id, full_name, email, phone, sms_consent, sms_unsubscribed_at")
    .eq("id", leadId)
    .single();
  if (!lead) return NextResponse.json({ error: "Lead not found" }, { status: 404 });

  const canText =
    Boolean(lead.phone) && Boolean(lead.sms_consent) && !lead.sms_unsubscribed_at;

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
    if (!lead.email) {
      return NextResponse.json(
        { error: "This lead has no phone with SMS consent and no email address." },
        { status: 400 },
      );
    }
    const res = await sendEmail(lead.email, lead.full_name, body);
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
      author: profile?.full_name || user.email || "admin",
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
      ? `Sent ${channel === "sms" ? "a text" : "an email"}`
      : `${channel === "sms" ? "Text" : "Email"} failed to send`,
  });

  return NextResponse.json({ message: row, delivered: ok, channel, error });
}
