// The 30-day Meta lead nurture: pure logic only, no I/O. The cron route and
// the tests both run through these functions, so what the simulation proves
// is what production does.
//
// Ledger contract: public.lead_emails (lead_id, step) UNIQUE. This sequence
// owns steps 101-130 (step 101 = day 1). Steps 0-4 are the retired legacy
// series; never touch them. A claim row is inserted BEFORE the send, so two
// overlapping runs can never email the same step twice.
//
// Consent contract: only leads whose OPTIONAL marketing checkbox was checked
// (leads.marketing_email_consent) ever enter the sequence. Everyone else gets
// transactional only — the instant welcome and Patrick's call. Quo/SMS is
// excluded from this system entirely.

import crypto from "node:crypto";

/** First step number of this sequence in lead_emails. Day N = STEP_BASE + N. */
export const STEP_BASE = 100;
export const SEQUENCE_DAYS = 30;

export const FIRST_STEP = STEP_BASE + 1;
export const LAST_STEP = STEP_BASE + SEQUENCE_DAYS;

export type NurtureLead = {
  id: string;
  full_name: string | null;
  email: string;
  source: string | null;
  status: string;
  is_test: boolean | null;
  deleted_at: string | null;
  marketing_email_consent: boolean | null;
  email_unsubscribed_at: string | null;
  consent_at: string | null;
  created_at: string;
};

/** Why a lead is not being emailed right now. Order matters: first hit wins. */
export type Ineligibility =
  | "deleted"
  | "test_lead"
  | "not_meta_lead"
  | "no_marketing_consent"
  | "unsubscribed"
  | "no_real_email"
  | "converted"
  | "purchased";

/**
 * The consent gate. Purchase status arrives separately because it lives in
 * another table (purchases, by email) — the caller looks it up.
 */
export function ineligibleReason(
  lead: NurtureLead,
  { hasPurchase = false }: { hasPurchase?: boolean } = {},
): Ineligibility | null {
  if (lead.deleted_at) return "deleted";
  if (lead.is_test) return "test_lead";
  if (lead.source !== "meta_lead_ad") return "not_meta_lead";
  if (!lead.marketing_email_consent) return "no_marketing_consent";
  if (lead.email_unsubscribed_at) return "unsubscribed";
  if (!lead.email || lead.email.endsWith("@no-email.facebook.lead")) return "no_real_email";
  // A purchase converts them to the customer track; 'won' is the manual
  // version of the same fact.
  if (lead.status === "won") return "converted";
  if (hasPurchase) return "purchased";
  return null;
}

/**
 * Whole days since the lead signed up, in the lead's reality (consent_at is
 * stamped at capture; created_at is the fallback for older rows).
 */
export function daysSinceSignup(lead: Pick<NurtureLead, "consent_at" | "created_at">, now: Date): number {
  const start = new Date(lead.consent_at ?? lead.created_at).getTime();
  if (!Number.isFinite(start)) return 0;
  return Math.floor((now.getTime() - start) / 86_400_000);
}

/**
 * The single step due right now, given which steps have already been sent.
 * One email per lead per run, always the earliest unsent day whose date has
 * arrived — so a lead who signed up before the sequence launched moves
 * through it one day at a time instead of getting a backlog dump.
 * Day 1's email goes out on the first run at least one full day after signup.
 */
export function dueStep(
  lead: Pick<NurtureLead, "consent_at" | "created_at">,
  sentSteps: ReadonlySet<number>,
  now: Date,
): number | null {
  const day = Math.min(daysSinceSignup(lead, now), SEQUENCE_DAYS);
  if (day < 1) return null;
  for (let step = FIRST_STEP; step <= STEP_BASE + day; step++) {
    if (!sentSteps.has(step)) return step;
  }
  return null;
}

/** True between 8am and 6pm America/Chicago — the only window we send in. */
export function inSendWindow(now: Date): boolean {
  const hour = Number(
    new Intl.DateTimeFormat("en-US", {
      timeZone: "America/Chicago",
      hour: "numeric",
      hour12: false,
    }).format(now),
  );
  return hour >= 8 && hour < 18;
}

// ---------------------------------------------------------- signed links ---

/**
 * HMAC over the lead id. The unsubscribe link carries lead_id + signature, so
 * only someone holding an email we sent can flip email_unsubscribed_at, and
 * no schema change or per-lead token row is needed.
 */
export function signUnsubscribe(leadId: string, secret: string): string {
  return crypto.createHmac("sha256", secret).update(`unsub:${leadId}`).digest("hex").slice(0, 32);
}

export function verifyUnsubscribe(leadId: string, signature: string, secret: string): boolean {
  const expected = signUnsubscribe(leadId, secret);
  const a = Buffer.from(expected);
  const b = Buffer.from(String(signature ?? ""));
  return a.length === b.length && crypto.timingSafeEqual(a, b);
}

export function unsubscribeUrl(leadId: string, secret: string): string {
  return `https://www.theleadflowpro.com/api/email/unsubscribe?l=${encodeURIComponent(
    leadId,
  )}&s=${signUnsubscribe(leadId, secret)}`;
}
