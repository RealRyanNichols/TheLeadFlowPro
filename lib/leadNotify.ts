// One place where a new lead turns into an alert to Ryan and a reply to the
// lead. Both the website form (/api/leads) and Meta instant forms
// (/api/meta-leads) call this, so a lead is treated the same no matter which
// door it came through. Fails soft: a broken email provider never blocks the
// lead from being saved.

import { sendLeadText } from "@/lib/quo";

export const INTEREST_LABELS: Record<string, string> = {
  learn: "Legacy training path",
  build_with_you: "Legacy guided build path",
  done_for_you: "Legacy full-service path",
  unsure: "Not sure yet",
  blueprint: "System Map",
  system_map: "System Map",
  launch_system: "Website Launch",
  website_launch: "Website Launch",
  free_website_program: "Free Website Program",
  lead_engine: "Lead Engine",
  training_platform: "Training Platform",
  company_os: "Company OS",
  industry_os: "Company OS",
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
  /**
   * diagnostic.source of the form the lead came through, when there was one.
   * The welcome reply has to describe the thing they actually just asked for:
   * a Free Build order and a Fix First diagnostic are not the same promise.
   */
  funnel?: string | null;
};

type LegacySeriesCandidate = Pick<NotifiableLead, "interest" | "goals" | "source">;

// The historical Resend Event automation is retired. The active Free Website
// Program sequence lives in lib/nurture.ts and is sent by /api/cron/nurture,
// using the lead's explicit marketing_email_consent snapshot. Never enroll a
// lead in this legacy provider-side automation as well, or they would receive
// two independent sequences.
export function shouldEnrollInLegacyEmailSeries(_lead: LegacySeriesCandidate) {
  return false;
}

// Sends from theleadflowpro.com, the only domain verified on the Resend
// account. It used to send from realryannichols.com, which is not verified
// there, so Resend rejected every single lead email and the failure went to
// console.error where nobody saw it. Leads came in, Ryan heard nothing, and
// the Resend dashboard showed zero sent. If you change this address, verify
// the domain in Resend first.
async function send(payload: object): Promise<boolean> {
  const key = process.env.RESEND_API_KEY;
  if (!key) return false;
  try {
    const r = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${key}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify(payload),
    });
    if (!r.ok) {
      console.error("Resend send failed:", r.status, await r.text().catch(() => ""));
      return false;
    }
    return true;
  } catch (e) {
    console.error("Resend send error:", e);
    return false;
  }
}

// Internal-only alert for server-side events such as a verified Stripe
// deposit. This deliberately does not contact the lead or enroll them in any
// automation. Returning the provider result lets webhook callers ask Stripe
// to retry when the internal alert could not be accepted.
export async function sendInternalLeadAlert(lead: NotifiableLead) {
  const via = lead.source === "meta_lead_ad" ? " [FACEBOOK LEAD AD]" : "";

  return send({
    from: "The LeadFlow Pro <leadflow@theleadflowpro.com>",
    reply_to: "hello@theleadflowpro.com",
    to: ["hello@theleadflowpro.com"],
    subject: `NEW LEAD${via}: ${lead.full_name}${lead.business_name ? ` (${lead.business_name})` : ""} | ${INTEREST_LABELS[lead.interest] ?? lead.interest}`,
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
}

export async function sendLeadEmails(lead: NotifiableLead) {
  if (!process.env.RESEND_API_KEY) return;

  const first = String(lead.full_name || "").trim().split(" ")[0] || "there";

  await sendInternalLeadAlert(lead);

  // Free Website Program applications get their own transactional reply.
  // This confirms receipt; the separate 30-day series still requires the
  // optional marketing-email checkbox.
  if (lead.funnel === "free_build_funnel" || lead.interest === "free_website_program") {
    await send({
      from: "Ryan Nichols <ryan@theleadflowpro.com>",
      to: [lead.email],
      reply_to: "hello@theleadflowpro.com",
      subject: `${first}, your free website application is in.`,
      text: [
        `${first},`,
        ``,
        `Your Free Website Program application just landed with me. Not a ticket queue. Mine.`,
        ``,
        `Here is what happens next:`,
        ``,
        `1. I review the business, the current website or Facebook page, and the service you want more customers for.`,
        `2. I reach out within one business day. Usually a text or call from (903) 500-8898. Save that number, it is my direct line.`,
        `3. If the application fits the current capacity, we put the five pages, ownership, outside costs, corrections, and exclusions into a written scope before the build starts.`,
        ``,
        `The build fee is $0. No paid add-on is required. Domain registration, paid hosting after the included 90 days, software, advertising spend, and work outside the five-page scope are separate and disclosed before approval.`,
        ``,
        `Have ready if you can: a few real photos of real work and your logo if you have one. No passwords, ever. Access happens through approvals you control.`,
        ``,
        `Review the exact program terms here:`,
        `https://www.theleadflowpro.com/free-build`,
        ``,
        `Talk soon,`,
        `Ryan Nichols`,
        `The LeadFlow Pro`,
        `(903) 500-8898`,
      ].join("\n"),
    });
    return;
  }

  await send({
    from: "Ryan Nichols <ryan@theleadflowpro.com>",
    to: [lead.email],
    reply_to: "hello@theleadflowpro.com",
    subject: `Got it, ${first}. I am looking at what to fix first.`,
    text: [
      `${first},`,
      ``,
      `Your answers just landed in my system. Not a ticket queue. Mine. I read every one of these myself.`,
      ``,
      `Here is what happens next:`,
      ``,
      `1. I look at what you told me: what you are running now, what it is costing you, and how fast you want it changed.`,
      `2. I reach out within one business day. Usually a text first, from (903) 500-8898. Save that number, it is my direct line.`,
      `3. You leave that first conversation knowing the fastest thing to fix and your next three moves, whether you hire me or not.`,
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

// Sends the historical "free-build-lead" event that powers the legacy Resend
// automation. Callers must first pass shouldEnrollInLegacyEmailSeries().
//
// This is NOT a normal email send. The automation is triggered by the Resend
// Events API, not by adding a contact to an audience. It listens for the event
// name below and nothing else. Until this call existed the automation sat
// Enabled with Runs: 0 forever, because the app only ever called
// /emails (transactional) and never /events/send. Leads got the welcome email
// and then silence.
//
// If the series ever stops firing, check three things in order:
//   1. Resend -> Automations -> is it still Enabled, and is Runs climbing?
//   2. Does SERIES_EVENT below still match the automation trigger exactly?
//   3. Is RESEND_API_KEY set in Vercel for the environment you deployed to?
const SERIES_EVENT = "free-build-lead";

export async function enrollInEmailSeries(email: string) {
  const key = process.env.RESEND_API_KEY;
  if (!key || !email) return;
  try {
    const r = await fetch("https://api.resend.com/events/send", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${key}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ event: SERIES_EVENT, email }),
    });
    if (!r.ok) {
      console.error("Resend series enroll failed:", r.status, await r.text().catch(() => ""));
    }
  } catch (e) {
    console.error("Resend series enroll error:", e);
  }
}

export async function textLeadBack(lead: NotifiableLead) {
  if (!lead.phone) return;
  const first = String(lead.full_name || "").trim().split(" ")[0] || "there";
  await sendLeadText(
    lead.phone,
    `${first}, this is Ryan with The LeadFlow Pro. Got your answers and I am already looking at what to fix first. I will text or call you shortly. Save this number, it is my direct line. Reply STOP to opt out.`,
  );
}

// Alert + reply + text + eligible legacy-series enrollment, in that order.
// Never throws: a broken provider must never stop a lead from being saved.
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
  try {
    if (shouldEnrollInLegacyEmailSeries(lead)) {
      await enrollInEmailSeries(lead.email);
    }
  } catch (e) {
    console.error("lead series enroll step failed:", e);
  }
}
