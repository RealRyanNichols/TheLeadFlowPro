// One place where a new lead turns into an alert to Ryan and a reply to the
// lead. Both the website form (/api/leads) and Meta instant forms
// (/api/meta-leads) call this, so a lead is treated the same no matter which
// door it came through. Fails soft: a broken email provider never blocks the
// lead from being saved.

import { BUSINESS } from "@/lib/site/business";
import { CONSULTATION } from "@/lib/site/consultation";
import { bookingPage } from "@/lib/site/external-links";
import { PAST_EVENT_COPY, resolveFeaturedEvent } from "@/lib/site/events";
import { usd } from "@/lib/site/prices";

// Display labels for leads.interest. The database CHECK constraint fixes the
// set of values (supabase/migrations/20260901234500); these labels are what
// the owner alert and the admin pipeline print. "learn" is the workshop and
// training list, "done_for_you" is the full-service agency lane.
// "free_website_program" is display-only: the free website build was retired
// on 2026-09-22, old rows still carry the value, and /api/leads no longer
// accepts it from any form.
export const INTEREST_LABELS: Record<string, string> = {
  learn: "Training and workshops",
  build_with_you: "Legacy guided build path",
  done_for_you: "Agency: run it for me",
  unsure: "Not sure yet",
  blueprint: "System Map",
  system_map: "System Map",
  launch_system: "Website Launch",
  website_launch: "Website Launch",
  free_website_program: "Free Website Program (retired)",
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

export type LeadEmailNotificationType = "owner_alert" | "lead_welcome";

export type LeadEmailSendResult =
  | { ok: true; providerMessageId: string | null }
  | { ok: false; error: string };

// Keep the public lead POST responsive when Resend is slow. Outbox sends carry
// a stable provider idempotency key, so an abort after Resend accepted the
// request remains safe to retry with the same key.
export const LEAD_EMAIL_PROVIDER_TIMEOUT_MS = 5_000;

type LegacySeriesCandidate = Pick<NotifiableLead, "interest" | "goals" | "source">;

// The historical Resend Event automation is retired, and so is the 30-day
// sequence that replaced it (lib/nurture.ts, retired with the free website
// build on 2026-09-22). Never enroll a lead in this legacy provider-side
// automation.
export function shouldEnrollInLegacyEmailSeries(_lead: LegacySeriesCandidate) {
  return false;
}

// Sends from theleadflowpro.com, the only domain verified on the Resend
// account. It used to send from realryannichols.com, which is not verified
// there, so Resend rejected every single lead email and the failure went to
// console.error where nobody saw it. Leads came in, Ryan heard nothing, and
// the Resend dashboard showed zero sent. If you change this address, verify
// the domain in Resend first.
async function sendDetailed(
  payload: object,
  idempotencyKey?: string,
): Promise<LeadEmailSendResult> {
  const key = process.env.RESEND_API_KEY?.trim();
  if (!key) return { ok: false, error: "RESEND_API_KEY is not configured" };
  try {
    const r = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${key}`,
        "Content-Type": "application/json",
        ...(idempotencyKey ? { "Idempotency-Key": idempotencyKey } : {}),
      },
      body: JSON.stringify(payload),
      ...(idempotencyKey
        ? { signal: AbortSignal.timeout(LEAD_EMAIL_PROVIDER_TIMEOUT_MS) }
        : {}),
    });
    const raw = await r.text().catch(() => "");
    if (!r.ok) {
      return {
        ok: false,
        error: `Resend returned HTTP ${r.status}${raw ? `: ${raw}` : ""}`.slice(0, 1000),
      };
    }
    let providerMessageId: string | null = null;
    try {
      const body = JSON.parse(raw) as { id?: unknown };
      if (typeof body.id === "string") providerMessageId = body.id.slice(0, 200);
    } catch {
      // A 2xx response is accepted even if the optional provider id is absent.
    }
    return { ok: true, providerMessageId };
  } catch (e) {
    return {
      ok: false,
      error: `Resend request failed: ${e instanceof Error ? e.message : "unknown error"}`.slice(
        0,
        1000,
      ),
    };
  }
}

async function send(payload: object): Promise<boolean> {
  const result = await sendDetailed(payload);
  if (!result.ok) console.error("Resend send failed:", result.error);
  return result.ok;
}

// Everyone who works inbound leads gets the NEW LEAD alert. Ryan reads
// hello@, and Pat is the one on the phone with inbound, so a lead that only
// reached one inbox is a lead one of them never knew about. One email, both
// recipients, so the thread stays shared instead of forking.
//
// This is the NEW LEAD alert only. The intake, digest and Stripe alerts
// elsewhere in the app still go to hello@ alone and are a separate decision.
export const OWNER_ALERT_RECIPIENTS = [
  BUSINESS.email.hello,
  BUSINESS.email.pat,
];

const OWNER_ALERT_FROM = `${BUSINESS.name} <${BUSINESS.email.alerts}>`;

/**
 * The one lead link every NEW LEAD alert carries. /admin/sales/* admits both
 * roles that work leads (Pat is sales, Ryan is admin); /admin/leads/* would
 * bounce Pat to the dashboard.
 */
export function leadWorkspaceUrl(leadId: string, siteUrl: string = BUSINESS.siteUrl): string {
  return `${siteUrl}/admin/sales/leads/${leadId}`;
}

/** "Tue, Sep 22, 2:14 PM CT": when a lead arrived, in the business time zone. */
export function leadAlertTime(at: Date): string {
  const text = new Intl.DateTimeFormat("en-US", {
    timeZone: BUSINESS.timezone,
    weekday: "short",
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
  }).format(at);
  // Some ICU builds put a narrow no-break space before AM/PM.
  return `${text.replace(/[  ]/g, " ")} CT`;
}

/** What the outbox row knows that the frozen lead snapshot does not. */
export type OwnerAlertContext = {
  leadId?: string | null;
  /** When the lead arrived. Defaults to the moment the alert is built. */
  receivedAt?: string | Date | null;
};

function alertInstant(value: OwnerAlertContext["receivedAt"]): Date {
  const at = value ? new Date(value) : new Date();
  return Number.isNaN(at.getTime()) ? new Date() : at;
}

function ownerAlertPayload(lead: NotifiableLead, context: OwnerAlertContext = {}) {
  const via = lead.source === "meta_lead_ad" ? " [FACEBOOK LEAD AD]" : "";
  return {
    from: OWNER_ALERT_FROM,
    reply_to: BUSINESS.email.hello,
    to: OWNER_ALERT_RECIPIENTS,
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
      `Received: ${leadAlertTime(alertInstant(context.receivedAt))}`,
      ``,
      `What they told me:`,
      lead.goals || "-",
      ``,
      context.leadId ? `Open: ${leadWorkspaceUrl(context.leadId)}` : `Manage: ${BUSINESS.siteUrl}/admin`,
    ].join("\n"),
  };
}

/**
 * The speed-to-lead NEW LEAD email (lib/speedToLead.ts builds the words).
 * Same sender and the same two inboxes as the owner alert, with a stable
 * provider idempotency key so a retried job never lands twice.
 */
export async function sendOwnerAlertEmail(
  content: { subject: string; text: string },
  idempotencyKey: string,
): Promise<LeadEmailSendResult> {
  return sendDetailed(
    {
      from: OWNER_ALERT_FROM,
      reply_to: BUSINESS.email.hello,
      to: OWNER_ALERT_RECIPIENTS,
      subject: content.subject,
      text: content.text,
    },
    idempotencyKey,
  );
}

const FROM_RYAN = `${BUSINESS.operator} <${BUSINESS.email.ryan}>`;
const SIGNATURE = [
  ``,
  `Talk soon,`,
  BUSINESS.operator,
  BUSINESS.name,
  BUSINESS.phone.display,
];

// The self-serve booking line. Nothing until lib/site/external-links.ts has
// a booking page; then one plain sentence and the address, in the emails and
// the text-back that already promise a reply within one business day.
export function bookingLines(url: string | null = bookingPage()): string[] {
  return url ? [`Or pick the time yourself, right now:`, url, ``] : [];
}

export function bookingSentence(url: string | null = bookingPage()): string {
  return url ? ` Pick a time yourself here: ${url}` : "";
}

// Funnels that own their own transactional message. The outbox still queues a
// welcome job for them (the trigger cannot tell funnels apart), so the send
// path acknowledges the job without emailing the person twice.
export const WELCOME_SUPPRESSED_FUNNELS = new Set(["tool_studio_monthly_change"]);

export function welcomeSuppressed(lead: Pick<NotifiableLead, "funnel">) {
  return !!lead.funnel && WELCOME_SUPPRESSED_FUNNELS.has(lead.funnel);
}

// The "next workshop" list reply. Used for the evergreen list form and for
// workshop-form leads that arrive after the featured event has run.
function workshopListWelcome(base: { from: string; to: string[]; reply_to: string }, first: string) {
  return {
    ...base,
    subject: `${first}, you are on the list for the next workshop.`,
    text: [
      `${first},`,
      ``,
      `You are on the list. When the next Longview workshop date is set, you hear about it before it goes anywhere else.`,
      ``,
      `Until then, the free starter lesson is the fastest way to get a real result from ChatGPT on your own business:`,
      `${BUSINESS.siteUrl}${PAST_EVENT_COPY.lessonPath}`,
      ``,
      `Run it on a task you actually have this week. Reply and tell me what came back and I will tell you what I would change.`,
      ``,
      `Questions? Call or text me at ${BUSINESS.phone.display}.`,
      ...SIGNATURE,
    ].join("\n"),
  };
}

function funnelWelcome(lead: NotifiableLead, first: string) {
  const base = { from: FROM_RYAN, to: [lead.email], reply_to: BUSINESS.email.hello };
  switch (lead.funnel) {
    case "commerce_planner":
      return {
        ...base,
        subject: `${first}, your commerce build request is in.`,
        text: [
          `${first},`,
          "",
          "Your commerce build list and contact details are saved with The LeadFlow Pro.",
          "",
          "I will review what you sell and the accounts you already use. We will agree the scope, cost, and payment and delivery checks before any build.",
          "",
          "Submitting the list did not buy a service, connect an account, or authorize a charge.",
          "",
          "Reply here with any details you want to add. Do not send passwords, payment information, or customer lists.",
          "",
          "You can keep using the free tools and kit previews here:",
          "https://www.theleadflowpro.com/commerce",
          ...SIGNATURE,
        ].join("\n"),
      };
    case "operator_academy_free_access":
      return {
        ...base,
        subject: `${first}, your two free courses are open.`,
        text: [
          `${first},`,
          ``,
          `The Offer Engine and The Lead Capture System are unlocked for you. Sixteen lessons, the exact prompts I use, and the workbooks.`,
          ``,
          `Start here:`,
          `https://www.theleadflowpro.com/training/offer-engine`,
          `https://www.theleadflowpro.com/training/lead-capture-system`,
          ``,
          `Access lives in the browser you signed up on. If you want your progress and assignments saved, create a free login with this same email:`,
          `https://www.theleadflowpro.com/login?mode=signup&next=/training/offer-engine`,
          ``,
          `Do the work in lesson one before you read lesson two. The assignment is the course.`,
          ``,
          `If you would rather have me build the system with you, reply to this email and tell me what you sell.`,
          ...SIGNATURE,
        ].join("\n"),
      };
    case "chatgpt_operator_free_access":
      return {
        ...base,
        subject: `${first}, your free ChatGPT lesson is ready.`,
        text: [
          `${first},`,
          ``,
          `Your free starter lesson from The ChatGPT Operator is open right now:`,
          `https://www.theleadflowpro.com/chatgpt/free`,
          ``,
          `Run the prompt on your own business, not a made-up one. That is the whole point.`,
          ``,
          `The full course is twelve lessons, four reviewed builds, and a capstone. Details and the founding price are on the course page when you are ready:`,
          `https://www.theleadflowpro.com/chatgpt`,
          ...SIGNATURE,
        ].join("\n"),
      };
    case "tool_studio":
      return {
        ...base,
        subject: `${first}, your Tool Studio request is in.`,
        text: [
          `${first},`,
          ``,
          `Your Tool Studio request landed with me. If you finished checkout, the Stripe receipt is your confirmation and I have the order on my desk.`,
          ``,
          `What happens next:`,
          ``,
          `1. I read what you want the tool to do and who it is for.`,
          `2. I reach out within one business day from ${BUSINESS.phone.display} with the blueprint questions.`,
          `3. You approve the plan before anything gets built. No passwords, ever.`,
          ``,
          `If you did not finish checkout and want to, the page is here:`,
          `https://www.theleadflowpro.com/go/tools`,
          ...SIGNATURE,
        ].join("\n"),
      };
    case "lead_follow_up_funnel":
      return {
        ...base,
        subject: `${first}, your Follow-Up Campaign order is in.`,
        text: [
          `${first},`,
          ``,
          `Your Follow-Up Campaign order landed with me. I write the messages. You send them from your own accounts. Nothing goes out in your name from mine.`,
          ``,
          `What happens next:`,
          ``,
          `1. Finish the short intake on the page after checkout so I know your offer, your buyer, and how you talk.`,
          `2. I write the first draft within five business days of the intake.`,
          `3. You review, I revise, you start sending.`,
          ``,
          `If you did not finish checkout and want to, the page is here:`,
          `https://www.theleadflowpro.com/go/lead-follow-up`,
          ...SIGNATURE,
        ].join("\n"),
      };
    case "time_back_funnel":
      return {
        ...base,
        subject: `${first}, your Time Back order is in.`,
        text: [
          `${first},`,
          ``,
          `Your Time Back order landed with me. If you finished checkout, the Stripe receipt is your confirmation.`,
          ``,
          `What happens next:`,
          ``,
          `1. The welcome page after checkout collects your photos, your logo if you have one, and how you want to sound.`,
          `2. I write and schedule the posts. Nothing publishes without your approval on the first batch.`,
          `3. Posts go live within five business days of your onboarding landing.`,
          ``,
          `You never hand over a password. Access happens through approvals you control and can revoke.`,
          ...SIGNATURE,
        ].join("\n"),
      };
    case "package_page":
      return {
        ...base,
        subject: `${first}, your order is in.`,
        text: [
          `${first},`,
          ``,
          `Your ${INTEREST_LABELS[lead.interest] ?? "package"} request landed with me. If you paid, the Stripe receipt is your confirmation.`,
          ``,
          `What happens next:`,
          ``,
          `1. I read what you told me about the business.`,
          `2. I reach out within one business day from ${BUSINESS.phone.display} to schedule the call.`,
          `3. Want the call to start warm? Run the Business Growth Diagnostic first. It takes about ten minutes and it is the exact intake I use:`,
          `https://www.theleadflowpro.com/diagnostic`,
          ...SIGNATURE,
        ].join("\n"),
      };
    case "workshop_sep17": {
      // The Meta instant form for the workshop keeps delivering leads after
      // the room has closed. Once the featured event is past, the reply is
      // the list note, never a seat pitch for a date that has gone.
      const workshop = resolveFeaturedEvent();
      if (workshop.status === "past") return workshopListWelcome(base, first);
      const timeRange = workshop.when.timeRange.replace("–", " to ").replace(" Central", "");
      return {
        ...base,
        subject: `${first}, your seat is not locked yet.`,
        text: [
          `${first},`,
          ``,
          `You put your name in for the ${workshop.when.shortDate} workshop in Longview. Good move.`,
          ``,
          `One thing: seats are confirmed after payment, and there are only ${workshop.seats} chairs in the room.`,
          ``,
          `Lock yours here:`,
          workshop.detailsHref,
          ``,
          `One evening. ${timeRange}. Bring your laptop and one real task from your business. You leave with a ChatGPT workflow you can run again the next day.`,
          ``,
          `${usd(workshop.priceUsd)}. No subscription. No upsell in the room.`,
          ``,
          `Questions? Call or text me at ${BUSINESS.phone.display}.`,
          ...SIGNATURE,
        ].join("\n"),
      };
    }
    case "workshop_waitlist":
      return workshopListWelcome(base, first);
    case CONSULTATION.funnel:
      return {
        ...base,
        subject: `${first}, your free consultation request is in.`,
        text: [
          `${first},`,
          ``,
          `Your request for the free ${CONSULTATION.minutes}-minute business consultation just landed with me. Not a ticket queue. Mine.`,
          ``,
          `Here is what happens next:`,
          ``,
          `1. I read what you told me about the business and what is getting in the way.`,
          `2. I reach out within one business day, the way you asked: a text or a call from ${BUSINESS.phone.display}, or an email from this address. We set the time and the place: your business, my office in ${BUSINESS.city}, or a call. Save that number, it is my direct line.`,
          `3. We sit down for ${CONSULTATION.minutes} minutes and go through everything you bring. You leave knowing what to fix first and your next three moves, whether you hire me or not.`,
          ``,
          `Have ready if you can:`,
          ...CONSULTATION.bring.map((item) => `- ${item}`),
          ``,
          `Want to move faster? Call or text me at ${BUSINESS.phone.display}.`,
          ...bookingLines(),
          ...SIGNATURE,
        ].join("\n"),
      };
    case "agency_intake":
      return {
        ...base,
        subject: `${first}, your agency intake is in.`,
        text: [
          `${first},`,
          ``,
          `Your answers landed with me. Not a ticket queue. Mine.`,
          ``,
          `Here is what happens next:`,
          ``,
          `1. I read what you sell, where your leads come from now, and the budget you said you are genuinely prepared to spend on ads each month.`,
          `2. I reach out within one business day from ${BUSINESS.phone.display} to map the first ninety days.`,
          `3. You get the scope, what you own, what you pay the platforms directly, and the price in writing before anything is built or billed.`,
          ``,
          `Two things that will not change: the ad accounts, pixel, audiences, and leads stay in your name, and nothing runs without your written approval.`,
          ``,
          `The agency pages are here if you want to read the process first:`,
          `${BUSINESS.siteUrl}/agency`,
          ...SIGNATURE,
        ].join("\n"),
      };
    case "free_tools":
      return {
        ...base,
        subject: `${first}, your results are saved.`,
        text: [
          `${first},`,
          ``,
          `Your calculator result is saved and you can run it again any time. All 86 free tools are here, no login needed:`,
          `https://www.theleadflowpro.com/tools`,
          ``,
          `If the number surprised you, that is usually the sign something in the business is worth fixing first. Reply to this email and tell me which tool you ran. I will tell you what I would do about it.`,
          ...SIGNATURE,
        ].join("\n"),
      };
    default:
      return null;
  }
}

export function leadWelcomePayload(lead: NotifiableLead) {
  const first = String(lead.full_name || "").trim().split(" ")[0] || "there";
  const funnelSpecific = funnelWelcome(lead, first);
  if (funnelSpecific) return funnelSpecific;
  return {
    from: FROM_RYAN,
    to: [lead.email],
    reply_to: BUSINESS.email.hello,
    subject: `Got it, ${first}. I am looking at what to fix first.`,
    text: [
      `${first},`,
      ``,
      `Your answers just landed in my system. Not a ticket queue. Mine. I read every one of these myself.`,
      ``,
      `Here is what happens next:`,
      ``,
      `1. I look at what you told me: what you are running now, what it is costing you, and how fast you want it changed.`,
      `2. I reach out within one business day. Usually a text or call from ${BUSINESS.phone.display}. Save that number, it is my direct line.`,
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
  };
}

export async function sendLeadEmailNotification(
  lead: NotifiableLead,
  notificationType: LeadEmailNotificationType,
  idempotencyKey: string,
  context: OwnerAlertContext = {},
): Promise<LeadEmailSendResult> {
  if (notificationType === "lead_welcome" && welcomeSuppressed(lead)) {
    return { ok: true, providerMessageId: null };
  }
  return sendDetailed(
    notificationType === "owner_alert" ? ownerAlertPayload(lead, context) : leadWelcomePayload(lead),
    idempotencyKey,
  );
}

// Internal-only alert for server-side events such as a verified Stripe
// deposit. This deliberately does not contact the lead or enroll them in any
// automation. Returning the provider result lets webhook callers ask Stripe
// to retry when the internal alert could not be accepted.
export async function sendInternalLeadAlert(lead: NotifiableLead, context: OwnerAlertContext = {}) {
  return send(ownerAlertPayload(lead, context));
}

export async function sendLeadEmails(lead: NotifiableLead) {
  if (!process.env.RESEND_API_KEY) return;
  await sendInternalLeadAlert(lead);
  if (!welcomeSuppressed(lead)) await send(leadWelcomePayload(lead));
}

// The legacy Resend event automation this used to trigger is retired, along
// with the free website build offer it sold (2026-09-22). It stays as a no-op
// only because its old callers (notifyNewLead and the retired
// /api/cron/followups route) still import it. It never calls Resend.
export async function enrollInEmailSeries(_email: string): Promise<void> {
  return;
}

// THE FIRST TEXT (speed to lead, 2026-09-22). One automatic text per lead,
// sent by the lead_sms job in lib/speedToLeadServer.ts and nowhere else: the
// intake routes no longer text on their own. It asks exactly one qualifying
// question so the first call starts warm, points at /services, and ends with
// the opt-out. Plain GSM characters only and at most two SMS segments
// (lib/speedToLead.ts smsSegments; the test pins both).
const FIRST_TEXT_QUESTION =
  "Quick question so I call you ready: what is costing you the most business right now, missed calls, slow follow-up, or not enough leads?";

// Names the software invents when nobody typed one (Meta, the Quo webhook,
// the text-in alert). "Unknown, this is Ryan" is worse than "Hi, this is Ryan".
const PLACEHOLDER_FIRST_NAMES = new Set(["facebook", "unknown", "text-in", "unnamed", "lead", "test", "n/a", "na", "none"]);

/** True when the first word of a name is one the software made up, not one a person typed. */
export function isPlaceholderFirstName(first: string): boolean {
  return PLACEHOLDER_FIRST_NAMES.has(first.trim().toLowerCase());
}

/** A first name fit to open a text with, or null. Letters, apostrophes and hyphens only, so the text stays in plain GSM characters. */
export function leadFirstName(fullName: string | null | undefined): string | null {
  const first = String(fullName ?? "").trim().split(/\s+/)[0] ?? "";
  if (!first || isPlaceholderFirstName(first)) return null;
  if (!/^[A-Za-z][A-Za-z'-]{0,19}$/.test(first)) return null;
  return first.charAt(0).toUpperCase() + first.slice(1);
}

export function leadFirstText(lead: { full_name?: string | null; funnel?: string | null }): string {
  const first = leadFirstName(lead.full_name);
  const opener = `${first ?? "Hi"}, this is Ryan with The LeadFlow Pro.`;
  const request =
    lead.funnel === CONSULTATION.funnel ? "Got your free consultation request." : "Got your request.";
  return `${opener} ${request} ${FIRST_TEXT_QUESTION} See what we build: theleadflowpro.com/services Reply STOP to opt out.`;
}

// The fixed sentences of every automated text-back, without the name and
// without the optional booking line. The Quo webhook echoes every outbound
// text on the line back into lead_messages, so the call sheet and the
// Uncalled list need a way to tell software's texts from a person's. Keep
// these in step with the bodies. The first two are the retired text-backs,
// kept because their echoes are already in lead_messages.
const AUTOMATED_TEXT_MARKERS = [
  "this is Ryan with The LeadFlow Pro. Got your answers and I am already looking at what to fix first.",
  `this is Ryan with The LeadFlow Pro. Got your request for the free ${CONSULTATION.minutes}-minute consultation.`,
  FIRST_TEXT_QUESTION,
] as const;

/** True when a message body is one the application sends on its own (the text-backs), not one a person typed. */
export function isAutomatedLeadText(body: string): boolean {
  const text = String(body ?? "");
  return AUTOMATED_TEXT_MARKERS.some((marker) => text.includes(marker));
}

/**
 * RETIRED 2026-09-22 (replaced by leadFirstText). Kept so the call sheet can
 * still recognise the copies already sent and so the booking-line tests keep
 * their meaning. Nothing sends this any more.
 */
export function leadTextBackBody(first: string, booking: string | null = bookingPage()): string {
  return `${first}, this is Ryan with The LeadFlow Pro. Got your answers and I am already looking at what to fix first. I will text or call you shortly. Save this number, it is my direct line.${bookingSentence(booking)} Reply STOP to opt out.`;
}

/**
 * RETIRED 2026-09-22 (leadFirstText folds the consultation in). Kept for the
 * same reason as leadTextBackBody: recognising texts already sent.
 */
export function leadConsultationTextBody(first: string, booking: string | null = bookingPage()): string {
  return `${first}, this is Ryan with The LeadFlow Pro. Got your request for the free ${CONSULTATION.minutes}-minute consultation. I will text or call you within one business day to set the time and the place. Save this number, it is my direct line.${bookingSentence(booking)} Reply STOP to opt out.`;
}

// RETIRED 2026-09-22. The first text to a lead is the speed-to-lead lead_sms
// job (lib/speedToLeadServer.ts), the single sender, so a lead can never get
// two. This stays a no-op only so the legacy notifyNewLead below compiles
// unchanged; it never texts anyone. Do not bring a send back here.
export async function notifyNewLeadSms(_lead: NotifiableLead): Promise<void> {
  return;
}

// Alert + reply + text + eligible legacy-series enrollment, in that order.
// Never throws: a broken provider must never stop a lead from being saved.
export async function notifyNewLead(lead: NotifiableLead) {
  try {
    await sendLeadEmails(lead);
  } catch (e) {
    console.error("lead email step failed:", e);
  }
  await notifyNewLeadSms(lead);
  try {
    if (shouldEnrollInLegacyEmailSeries(lead)) {
      await enrollInEmailSeries(lead.email);
    }
  } catch (e) {
    console.error("lead series enroll step failed:", e);
  }
}
