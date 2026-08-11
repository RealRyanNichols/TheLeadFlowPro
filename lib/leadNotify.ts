// One place where a new lead turns into an alert to Ryan and a reply to the
// lead. Both the website form (/api/leads) and Meta instant forms
// (/api/meta-leads) call this, so a lead is treated the same no matter which
// door it came through. Fails soft: a broken email provider never blocks the
// lead from being saved.

import { sendLeadText } from "@/lib/quo";

export const INTEREST_LABELS: Record<string, string> = {
  learn: "Learn It (training)",
  build_with_you: "Build It With You",
  done_for_you: "Done For You",
  unsure: "Not sure yet",
  blueprint: "System Map",
  launch_system: "LeadFlow Launch",
  industry_os: "Industry OS",
  custom_platform: "Custom Platform",
  operations: "Operations Partner",
};

export type NotifiableLead = {
  full_name: string;
  email: string;
  phone?: string | null;
  business_name?: string | null;
  interest: string;
  goals?: string | null;
  current_platform?: string | null;
  timeline?: string | null;
  utm_source?: string | null;
  source?: string | null;
  sms_consent?: boolean;
};

// Sends from theleadflowpro.com, the only domain verified on the Resend
// account. It used to send from realryannichols.com, which is not verified
// there, so Resend rejected every single lead email and the failure went to
// console.error where nobody saw it. Leads came in, Ryan heard nothing, and
// the Resend dashboard showed zero sent. If you change this address, verify
// the domain in Resend first.
async function send(payload: object) {
  const key = process.env.RESEND_API_KEY;
  if (!key) return;
  try {
    const r = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${key}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify(payload),
    });
    if (!r.ok) console.error("Resend send failed:", r.status, await r.text().catch(() => ""));
  } catch (e) {
    console.error("Resend send error:", e);
  }
}

export async function sendLeadEmails(lead: NotifiableLead) {
  if (!process.env.RESEND_API_KEY) return;

  const first = String(lead.full_name || "").trim().split(" ")[0] || "there";
  const via = lead.source === "meta_lead_ad" ? " [FACEBOOK LEAD AD]" : "";

  await send({
    from: "The LeadFlow Pro <leadflow@theleadflowpro.com>",
    reply_to: "hello@theleadflowpro.com",
    to: ["hello@theleadflowpro.com"],
    subject: `NEW LEAD${via}: ${lead.full_name}${lead.business_name ? ` (${lead.business_name})` : ""} — ${INTEREST_LABELS[lead.interest] ?? lead.interest}`,
    text: [
      `Name: ${lead.full_name}`,
      `Business: ${lead.business_name || "-"}`,
      `Email: ${lead.email}`,
      `Phone: ${lead.phone || "-"}`,
      `Recommended path: ${INTEREST_LABELS[lead.interest] ?? lead.interest}`,
      `Home base: ${lead.current_platform || "-"}`,
      `Timeline: ${lead.timeline || "-"}`,
      `Source: ${lead.source || "website"}${lead.utm_source ? ` / ${lead.utm_source}` : ""}`,
      ``,
      `What they told me:`,
      lead.goals || "-",
      ``,
      `Manage: https://www.theleadflowpro.com/admin`,
    ].join("\n"),
  });

  await send({
    from: "Ryan Nichols <ryan@theleadflowpro.com>",
    to: [lead.email],
    reply_to: "hello@theleadflowpro.com",
    subject: `Got it, ${first}. Your build request is in my hands.`,
    text: [
      `${first},`,
      ``,
      `Your request just landed in my system. Not a ticket queue. Mine. I read every one of these myself.`,
      ``,
      `Here is what happens next:`,
      ``,
      `1. I look at what you told me: your business, what you have online now, and how fast you want this.`,
      `2. I reach out within one business day. Usually a text first, from (903) 500-8898. Save that number, it is my direct line.`,
      `3. You leave that first conversation knowing your next three moves, whether you hire me or not.`,
      ``,
      `Want a head start? The live systems I have already built and handed over are here:`,
      `https://www.theleadflowpro.com/portfolio`,
      ``,
      `Talk soon,`,
      `Ryan Nichols`,
      `The LeadFlow Pro`,
      `https://www.theleadflowpro.com`,
    ].join("\n"),
  });
}

export async function textLeadBack(lead: NotifiableLead) {
  if (!lead.phone) return;
  const first = String(lead.full_name || "").trim().split(" ")[0] || "there";
  await sendLeadText(
    lead.phone,
    `${first}, this is Ryan with The LeadFlow Pro. Got your request and I am already looking at it. I will text or call you shortly. Save this number, it is my direct line. Reply STOP to opt out.`,
  );
}

// Alert + reply + text, in that order. Never throws.
export async function notifyNewLead(lead: NotifiableLead) {
  try {
    await sendLeadEmails(lead);
  } catch (e) {
    console.error("lead email step failed:", e);
  }
  try {
    if (lead.sms_consent && lead.phone) await textLeadBack(lead);
  } catch (e) {
    console.error("lead text step failed:", e);
  }
}
