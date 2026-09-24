// Speed to lead: the pure half.
//
// Every new row in public.leads gets three jobs from a database trigger
// (supabase/migrations/20260922190000_speed_to_lead.sql): a text to Ryan and
// Pat, the NEW LEAD email, and one automatic first text to the lead. The
// server half (lib/speedToLeadAlertsServer.ts) claims and delivers them. This file
// holds every decision and every word, as pure functions over rows, so the
// rules can be tested without a clock, a database or a provider.
//
// Rules, in the order they are applied to a job:
//   1. Nothing sends unless SPEED_TO_LEAD_ENABLED is exactly "true". While it
//      is off the jobs simply wait (the dispatcher does not even read them).
//   2. A deleted or test lead is skipped.
//   3. A lead whose phone is a staff phone is the Quo webhook logging our own
//      alert text to Ryan or Pat; it is marked as a test record and skipped,
//      so an alert can never alert about itself.
//   4. Stale: staff alerts older than two hours and first texts older than
//      fourteen hours are skipped, so switching the feature on can never blast
//      a backlog. Fourteen hours covers the longest quiet-hours hold (9 pm to
//      8 am) plus the retries.
//   5. The first text needs a phone, recorded consent, no STOP on the lead,
//      the Quo kill switch off, and 8 am to 9 pm Central. Outside the window
//      it waits for the morning instead of being dropped. The global STOP
//      list is checked inside the sender (lib/quo.ts).
//   6. Staff alerts need configured staff phones (texts) and are not held for
//      quiet hours: they are internal.

import { CLOSED_STATUSES, canText, interestLabel, sourceLabel } from "@/lib/callSheet";
import {
  isPlaceholderFirstName,
  leadAlertTime,
  leadFirstText,
  leadWorkspaceUrl,
} from "@/lib/leadNotify";
import { BUSINESS } from "@/lib/site/business";
import { nextSendWindowOpen, withinSendWindow } from "@/lib/smsPolicy";
import { isPlaceholderEmail } from "@/lib/uncalled";
import type { QuoSendResult } from "@/lib/quo";

export { leadFirstText };

export type SpeedToLeadChannel = "staff_sms" | "staff_email" | "lead_sms";
export type SpeedToLeadStatus = "pending" | "sending" | "sent" | "failed" | "skipped";

export const SPEED_TO_LEAD_CHANNELS: readonly SpeedToLeadChannel[] = ["staff_sms", "staff_email", "lead_sms"];

export type SpeedToLeadJob = {
  id: string;
  lead_id: string;
  channel: SpeedToLeadChannel;
  status: SpeedToLeadStatus;
  attempt_count: number;
  next_attempt_at: string;
  last_attempt_at: string | null;
  sent_at: string | null;
  provider_message_ids: string[] | null;
  skip_reason: string | null;
  last_error: string | null;
  created_at: string;
  updated_at: string;
};

export type SpeedToLeadLead = {
  id: string;
  created_at: string;
  full_name: string | null;
  business_name: string | null;
  email: string | null;
  phone: string | null;
  interest: string | null;
  status: string | null;
  source: string | null;
  utm_source: string | null;
  sms_consent: boolean | null;
  sms_unsubscribed_at: string | null;
  is_test: boolean | null;
  deleted_at: string | null;
  goals: string | null;
  current_platform: string | null;
  timeline: string | null;
  /** diagnostic->>source: the form the lead came through. */
  funnel: string | null;
};

/** The columns the dispatcher reads for a lead. */
export const SPEED_TO_LEAD_LEAD_COLUMNS =
  "id, created_at, full_name, business_name, email, phone, interest, status, source, utm_source, sms_consent, sms_unsubscribed_at, is_test, deleted_at, goals, current_platform, timeline, funnel:diagnostic->>source";

/** Backoff after attempts 1 to 4. The fifth failed attempt is final. */
export const SPEED_TO_LEAD_RETRY_MINUTES = [1, 5, 15, 60] as const;
export const SPEED_TO_LEAD_MAX_ATTEMPTS = 5;
/** A job left in "sending" longer than this is taken to have crashed and is reclaimed. */
export const SPEED_TO_LEAD_CLAIM_LEASE_MINUTES = 5;
export const STAFF_ALERT_STALE_HOURS = 2;
export const LEAD_TEXT_STALE_HOURS = 14;
/** Jobs one cron run handles. */
export const SPEED_TO_LEAD_SWEEP_LIMIT = 25;

type Env = Record<string, string | undefined>;

/** Master switch. Features ship dormant: anything but exactly "true" is off. */
export function speedToLeadEnabled(env: Env): boolean {
  return env.SPEED_TO_LEAD_ENABLED === "true";
}

/** The Quo emergency stop, read the same way lib/quo.ts reads it: texting is off unless exactly "false". */
export function smsKillSwitchOn(env: Env): boolean {
  return env.QUO_OUTBOUND_SMS_DISABLED !== "false";
}

/**
 * SPEED_TO_LEAD_STAFF_PHONES: a comma list of 10-digit or E.164 US numbers.
 * Returns the last ten digits of each valid entry, de-duplicated. Anything
 * that is not a US number is ignored rather than guessed at.
 */
export function parseStaffPhones(raw: string | null | undefined): string[] {
  const out: string[] = [];
  for (const part of String(raw ?? "").split(/[,;\n]/)) {
    const digits = part.replace(/\D/g, "");
    const last10 = digits.length === 11 && digits.startsWith("1") ? digits.slice(1) : digits.length === 10 ? digits : "";
    if (last10 && !out.includes(last10)) out.push(last10);
  }
  return out;
}

export function staffPhoneE164(last10: string): string {
  return `+1${last10}`;
}

/** Last ten digits, the same identity public.normalize_phone and lib/quo.ts use. */
function last10(phone: string | null | undefined): string {
  return String(phone ?? "").replace(/\D/g, "").slice(-10);
}

export function isStaffPhone(phone: string | null | undefined, staffLast10: readonly string[]): boolean {
  const norm = last10(phone);
  return norm.length === 10 && staffLast10.includes(norm);
}

export function speedToLeadRetryDelayMinutes(attemptCount: number): number {
  const index = Math.max(0, Math.min(SPEED_TO_LEAD_RETRY_MINUTES.length - 1, attemptCount - 1));
  return SPEED_TO_LEAD_RETRY_MINUTES[index];
}

export function staffEmailIdempotencyKey(leadId: string): string {
  return `speed-to-lead-${leadId}-staff_email-v1`;
}

// ---------------------------------------------------------------- words ---

// Some ICU builds put a narrow no-break space before AM/PM; texts stay plain.
const plainSpaces = (text: string) => text.replace(/[  ]/g, " ");

function centralParts(at: Date) {
  const day = plainSpaces(new Intl.DateTimeFormat("en-US", { timeZone: BUSINESS.timezone, month: "short", day: "numeric" }).format(at));
  const time = plainSpaces(new Intl.DateTimeFormat("en-US", { timeZone: BUSINESS.timezone, hour: "numeric", minute: "2-digit" }).format(at));
  return { day, time };
}

/** "2:14 PM CT" for a lead from today (Central), "Sep 21, 11:58 PM CT" for an older one. */
export function alertTimeLabel(createdAt: string, now: Date): string {
  const at = new Date(createdAt);
  if (Number.isNaN(at.getTime())) return "time unknown";
  const lead = centralParts(at);
  const today = centralParts(now);
  return lead.day === today.day ? `${lead.time} CT` : `${lead.day}, ${lead.time} CT`;
}

function oneLine(value: string | null | undefined, max: number): string {
  return String(value ?? "").replace(/\s+/g, " ").trim().slice(0, max).trim();
}

/** A first name for an internal alert: looser than the lead-facing one, never a made-up placeholder. */
function staffFirstName(fullName: string | null | undefined): string | null {
  const first = oneLine(fullName, 200).split(" ")[0] ?? "";
  if (!first || isPlaceholderFirstName(first)) return null;
  return first.slice(0, 30);
}

type AlertLead = Pick<
  SpeedToLeadLead,
  "id" | "created_at" | "full_name" | "business_name" | "interest" | "source" | "utm_source"
>;

/**
 * The staff text. First name only and no phone or email: a lock screen is
 * not the CRM, and the link carries the rest.
 *
 *   NEW LEAD | Meta lead ad | 2:14 PM CT
 *   Jane at Example Co. Website Launch.
 *   Open: https://www.theleadflowpro.com/admin/sales/leads/<id>
 */
export function staffAlertText(lead: AlertLead, siteUrl: string, now: Date): string {
  const source = oneLine(sourceLabel(lead), 40);
  const first = staffFirstName(lead.full_name);
  const business = oneLine(lead.business_name, 60);
  const who = first ? `${first}${business ? ` at ${business}` : ""}` : business ? `Someone at ${business}` : "No name given";
  const interest = oneLine(interestLabel(lead.interest || "unsure"), 40);
  return [
    `NEW LEAD | ${source} | ${alertTimeLabel(lead.created_at, now)}`,
    `${who}. ${interest}.`,
    `Open: ${leadWorkspaceUrl(lead.id, siteUrl)}`,
  ].join("\n");
}

/**
 * The NEW LEAD email for leads the existing owner-alert outbox does not
 * cover (every door except the website form and Meta). Same fields that
 * alert carries, plus when it came in and the one link to the lead.
 * `firstMessage` is what a text-in lead actually wrote, when there is one.
 */
export function staffAlertEmail(
  lead: SpeedToLeadLead,
  siteUrl: string,
  options: { firstMessage?: string | null } = {},
): { subject: string; text: string } {
  const source = sourceLabel(lead);
  const name = oneLine(lead.full_name, 200) || "No name given";
  const business = oneLine(lead.business_name, 200);
  const at = new Date(lead.created_at);
  const received = Number.isNaN(at.getTime()) ? "time unknown" : leadAlertTime(at);
  const texting = canText(lead) ? "consented" : lead.sms_unsubscribed_at ? "replied STOP, call only" : "no text consent";
  const told = String(lead.goals ?? "").trim() || String(options.firstMessage ?? "").trim().slice(0, 1000) || "-";
  return {
    subject: `NEW LEAD [${source}]: ${name}${business ? ` (${business})` : ""}`,
    text: [
      `New lead from ${source}, ${received}.`,
      ``,
      `Name: ${name}`,
      `Business: ${business || "-"}`,
      `Email: ${isPlaceholderEmail(lead.email) ? "- (none given)" : lead.email}`,
      `Phone: ${lead.phone || "-"}`,
      `Texting: ${texting}`,
      `Recommended path: ${interestLabel(lead.interest || "unsure")}`,
      `Home base: ${lead.current_platform || "-"}`,
      `Timeline: ${lead.timeline || "-"}`,
      `Source: ${lead.source || "website"}${lead.utm_source ? ` / ${lead.utm_source}` : ""}`,
      ``,
      `What they told me:`,
      told,
      ``,
      `Open: ${leadWorkspaceUrl(lead.id, siteUrl)}`,
    ].join("\n"),
  };
}

// GSM 03.38 basic set and its extension table (extension characters cost two).
const GSM_BASIC =
  "@£$¥èéùìòÇ\nØø\rÅåΔ_ΦΓΛΩΠΨΣΘΞÆæßÉ !\"#¤%&'()*+,-./0123456789:;<=>?¡ABCDEFGHIJKLMNOPQRSTUVWXYZÄÖÑÜ§¿abcdefghijklmnopqrstuvwxyzäöñüà";
const GSM_EXTENDED = "^{}\\[~]|€\f";

/** How many SMS segments a body costs: GSM-7 is 160 single / 153 per part, anything else is UCS-2 at 70 / 67. */
export function smsSegments(text: string): number {
  let septets = 0;
  let gsm = true;
  for (const ch of text) {
    if (GSM_BASIC.includes(ch)) septets += 1;
    else if (GSM_EXTENDED.includes(ch)) septets += 2;
    else {
      gsm = false;
      break;
    }
  }
  if (gsm) return septets <= 160 ? 1 : Math.ceil(septets / 153);
  const units = [...text].reduce((n, ch) => n + (ch.codePointAt(0)! > 0xffff ? 2 : 1), 0);
  return units <= 70 ? 1 : Math.ceil(units / 67);
}

// ------------------------------------------------------------- decisions ---

export type SpeedToLeadDecision =
  | { kind: "send" }
  | { kind: "skip"; reason: string }
  | { kind: "hold"; until: Date; reason: string }
  | { kind: "staff_number" };

export type SpeedToLeadDecisionInput = {
  channel: SpeedToLeadChannel;
  lead: SpeedToLeadLead | null;
  now: Date;
  staffPhones: readonly string[];
  killSwitchOn: boolean;
};

function hoursSince(iso: string, now: Date): number {
  const at = Date.parse(iso);
  return Number.isFinite(at) ? (now.getTime() - at) / 3_600_000 : Number.POSITIVE_INFINITY;
}

export function decideSpeedToLeadJob(input: SpeedToLeadDecisionInput): SpeedToLeadDecision {
  const { channel, lead, now } = input;
  if (!lead) return { kind: "skip", reason: "lead not found" };
  if (lead.deleted_at) return { kind: "skip", reason: "lead deleted" };
  if (lead.is_test) return { kind: "skip", reason: "test record" };
  if (isStaffPhone(lead.phone, input.staffPhones)) return { kind: "staff_number" };

  const age = hoursSince(lead.created_at, now);
  if (channel !== "lead_sms" && age > STAFF_ALERT_STALE_HOURS) return { kind: "skip", reason: "stale" };
  if (channel === "lead_sms" && age > LEAD_TEXT_STALE_HOURS) return { kind: "skip", reason: "stale" };

  if (channel === "staff_email") return { kind: "send" };

  if (channel === "staff_sms") {
    if (input.staffPhones.length === 0) return { kind: "skip", reason: "no staff phones configured" };
    if (input.killSwitchOn) return { kind: "skip", reason: "sms kill switch on" };
    return { kind: "send" };
  }

  // lead_sms
  // Someone who texted the line first is answered by the inbound auto-reply
  // (lib/quo.ts sendInboundAutoReply); a second automated text would be one
  // too many, and the webhook's placeholder name would open it.
  if (lead.source === "quo_inbound") return { kind: "skip", reason: "texted in first; the inbound auto-reply answers" };
  // A paid order or a closed lead is not asked a qualifying question.
  if ((CLOSED_STATUSES as readonly string[]).includes(lead.status ?? "")) {
    return { kind: "skip", reason: `lead already ${lead.status}` };
  }
  if (!lead.phone) return { kind: "skip", reason: "no phone" };
  if (lead.sms_unsubscribed_at) return { kind: "skip", reason: "replied STOP" };
  if (!lead.sms_consent) return { kind: "skip", reason: "no sms consent" };
  if (input.killSwitchOn) return { kind: "skip", reason: "sms kill switch on" };
  if (!withinSendWindow(now)) return { kind: "hold", until: nextSendWindowOpen(now), reason: "quiet hours" };
  return { kind: "send" };
}

/**
 * What a refused text means for its job. null: retry with backoff. A skip
 * reason: final, nothing will change by trying again. "hold": wait for the
 * send window (a boundary race with the pre-check).
 */
export function outcomeForQuoRefusal(
  result: Extract<QuoSendResult, { ok: false }>,
  channel: "staff_sms" | "lead_sms",
): { kind: "retry" } | { kind: "skip"; reason: string } | { kind: "hold" } {
  switch (result.reason) {
    case "kill_switch":
      return { kind: "skip", reason: "sms kill switch on" };
    case "suppressed":
      return { kind: "skip", reason: channel === "lead_sms" ? "replied STOP" : "staff number on STOP list" };
    case "invalid_phone":
      return { kind: "skip", reason: "phone number is not textable" };
    case "quiet_hours":
      return { kind: "hold" };
    default:
      return { kind: "retry" };
  }
}

const CHANNEL_NOUN: Record<SpeedToLeadChannel, string> = {
  staff_sms: "staff text",
  staff_email: "staff email",
  lead_sms: "first text",
};

/** The one lead_activity line per job outcome that matters: sent, or failed for good. */
export function speedToLeadActivityDetail(channel: SpeedToLeadChannel, outcome: "sent" | "failed" | "staff_number", error?: string): string {
  if (outcome === "staff_number") {
    return "Speed to lead: this number is a staff phone, so the record was marked as a test and nothing was sent.";
  }
  if (outcome === "sent") return `Speed to lead: ${CHANNEL_NOUN[channel]} sent`;
  return `Speed to lead: ${CHANNEL_NOUN[channel]} failed: ${String(error ?? "unknown error")}`.slice(0, 1000);
}

export function channelNoun(channel: SpeedToLeadChannel): string {
  return CHANNEL_NOUN[channel];
}
