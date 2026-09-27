// The agency retainer door (decision 66): an agency retainer paid through
// /agency/pay monthly is a Stripe subscription that renews until cancelled.
// This module reads what the webhook stamped on the lead, decides whether a
// retainer can be ended, proves the subscription belongs to that lead, and
// talks to Stripe to end it at the close of the paid period. Nothing here
// charges, refunds, or emails the client; Stripe's own customer emails
// follow the dashboard's settings.
//
// Leaf module: no Next.js, no Supabase, no Stripe SDK, so the unit tests run
// it directly with a fake fetch.

/** Same pin as lib/stripe.ts, so the subscription shape is the one this code reads. */
export const STRIPE_API_VERSION = "2026-07-29.dahlia";

export type RetainerState = {
  service: string;
  reference: string | null;
  /** The checkout session that started the retainer. */
  sessionId: string | null;
  /** The Stripe subscription, when the webhook saw it on the session. */
  subscriptionId: string | null;
  /** Set once an admin ended the retainer from the lead page, or Stripe reported it set to end. */
  cancelScheduledAt: string | null;
  cancelledBy: string | null;
  /** When the paid period closes, from Stripe, once known. */
  currentPeriodEnd: string | null;
  /** Set once Stripe reported the subscription deleted. */
  endedAt: string | null;
};

const SESSION_RE = /^cs_[A-Za-z0-9_]{8,200}$/;
const SUBSCRIPTION_RE = /^sub_[A-Za-z0-9]{8,200}$/;
const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

function record(value: unknown): Record<string, unknown> | null {
  return value && typeof value === "object" && !Array.isArray(value) ? (value as Record<string, unknown>) : null;
}

function text(value: unknown, max = 200): string | null {
  return typeof value === "string" && value.trim() ? value.trim().slice(0, max) : null;
}

/** A well-formed Stripe subscription id, or null. Accepts the id or the expanded object. */
export function subscriptionIdOf(value: unknown): string | null {
  const id = typeof value === "string" ? value : record(value)?.id;
  return typeof id === "string" && SUBSCRIPTION_RE.test(id) ? id : null;
}

/**
 * The monthly retainer on a lead, read from diagnostic.agency_payment (the
 * stamp the Stripe webhook writes). One-time agency payments and leads with
 * no agency payment return null: there is nothing to end.
 *
 * The checkout session comes from agency_payment.stripe. A lead the webhook
 * created for the payment itself (source "agency_payment") carried that
 * stamp at the diagnostic root before September 27, 2026, so that shape is
 * read too; a shared lead's root stamp belongs to another product and is
 * never used.
 */
export function retainerFromDiagnostic(diagnostic: unknown): RetainerState | null {
  const root = record(diagnostic);
  const payment = record(root?.agency_payment);
  if (!payment || payment.billing !== "monthly") return null;
  const stripe = record(payment.stripe) ?? (root?.source === "agency_payment" ? record(root.stripe) : null);
  const sessionId = text(stripe?.session_id);
  return {
    service: text(payment.service) ?? "service",
    reference: text(payment.reference),
    sessionId: sessionId && SESSION_RE.test(sessionId) ? sessionId : null,
    subscriptionId: subscriptionIdOf(payment.subscription_id),
    cancelScheduledAt: text(payment.cancel_scheduled_at, 40),
    cancelledBy: text(payment.cancelled_by, 120),
    currentPeriodEnd: text(payment.current_period_end, 40),
    endedAt: text(payment.ended_at, 40),
  };
}

/** True while the retainer renews: paid monthly, not set to end, not ended. */
export function retainerActive(state: RetainerState | null): boolean {
  return !!state && !state.cancelScheduledAt && !state.endedAt;
}

type Fetcher = (input: string, init?: RequestInit) => Promise<Response>;

function stripeHeaders(stripeKey: string, form = false): Record<string, string> {
  return {
    Authorization: `Bearer ${stripeKey}`,
    "Stripe-Version": STRIPE_API_VERSION,
    ...(form ? { "Content-Type": "application/x-www-form-urlencoded" } : {}),
  };
}

/**
 * The subscription behind a checkout session, from Stripe. Used when the
 * stamp on the lead predates the subscription_id field.
 */
export async function subscriptionIdFromSession(stripeKey: string, sessionId: string, fetcher: Fetcher = fetch): Promise<string | null> {
  if (!SESSION_RE.test(sessionId)) return null;
  try {
    const r = await fetcher(`https://api.stripe.com/v1/checkout/sessions/${encodeURIComponent(sessionId)}`, {
      headers: stripeHeaders(stripeKey),
      cache: "no-store",
      signal: AbortSignal.timeout(8000),
    });
    if (!r.ok) return null;
    const session = (await r.json().catch(() => null)) as { subscription?: unknown } | null;
    return subscriptionIdOf(session?.subscription);
  } catch {
    return null;
  }
}

export type Ownership =
  | { ok: true; currentPeriodEnd: string | null; status: string | null; cancelAtPeriodEnd: boolean }
  | { ok: false; reason: "not_found" | "not_agency" | "not_this_lead" | "unreachable" };

type StripeSubscription = {
  id?: unknown;
  status?: unknown;
  cancel_at_period_end?: unknown;
  current_period_end?: unknown;
  metadata?: Record<string, unknown> | null;
  customer?: unknown;
  items?: { data?: { current_period_end?: unknown }[] } | null;
};

function periodEndOf(sub: StripeSubscription | null): string | null {
  const raw = typeof sub?.current_period_end === "number" ? sub.current_period_end : sub?.items?.data?.[0]?.current_period_end;
  return typeof raw === "number" && Number.isFinite(raw) ? new Date(raw * 1000).toISOString() : null;
}

/**
 * Proves the subscription is this lead's agency retainer before anything is
 * changed. The lead's diagnostic is not trusted for this: an unauthenticated
 * form post can write it. Stripe's own record must say the subscription is
 * an agency payment and either carry this lead's id (the pay link did) or
 * belong to a customer with this lead's email.
 */
export async function subscriptionBelongsToLead(
  stripeKey: string,
  subscriptionId: string,
  lead: { id: string; email: string | null },
  fetcher: Fetcher = fetch,
): Promise<Ownership> {
  if (!SUBSCRIPTION_RE.test(subscriptionId) || !UUID_RE.test(lead.id)) return { ok: false, reason: "not_found" };
  try {
    const r = await fetcher(`https://api.stripe.com/v1/subscriptions/${encodeURIComponent(subscriptionId)}?expand[]=customer`, {
      headers: stripeHeaders(stripeKey),
      cache: "no-store",
      signal: AbortSignal.timeout(8000),
    });
    if (r.status === 404) return { ok: false, reason: "not_found" };
    if (!r.ok) return { ok: false, reason: "unreachable" };
    const sub = (await r.json().catch(() => null)) as StripeSubscription | null;
    if (!sub || sub.id !== subscriptionId) return { ok: false, reason: "not_found" };
    const metadata = record(sub.metadata) ?? {};
    if (metadata.kind !== "agency_payment") return { ok: false, reason: "not_agency" };
    const linked = typeof metadata.lead_id === "string" && metadata.lead_id.toLowerCase() === lead.id.toLowerCase();
    const customerEmail = text(record(sub.customer)?.email)?.toLowerCase() ?? null;
    const leadEmail = text(lead.email)?.toLowerCase() ?? null;
    const sameEmail = !!customerEmail && !!leadEmail && customerEmail === leadEmail;
    if (!linked && !sameEmail) return { ok: false, reason: "not_this_lead" };
    return {
      ok: true,
      currentPeriodEnd: periodEndOf(sub),
      status: typeof sub.status === "string" ? sub.status : null,
      cancelAtPeriodEnd: sub.cancel_at_period_end === true,
    };
  } catch {
    return { ok: false, reason: "unreachable" };
  }
}

export type CancelResult =
  | { ok: true; currentPeriodEnd: string | null; alreadyScheduled: boolean }
  | { ok: false; reason: "stripe_refused" | "unreachable" };

/**
 * End the retainer at the close of the paid period. The client keeps what
 * they paid for; nothing renews after it. Idempotent: a subscription already
 * set to end answers ok with alreadyScheduled. Call subscriptionBelongsToLead
 * first; this function trusts its caller.
 */
export async function cancelRetainerAtPeriodEnd(stripeKey: string, subscriptionId: string, fetcher: Fetcher = fetch): Promise<CancelResult> {
  if (!SUBSCRIPTION_RE.test(subscriptionId)) return { ok: false, reason: "stripe_refused" };
  try {
    const r = await fetcher(`https://api.stripe.com/v1/subscriptions/${encodeURIComponent(subscriptionId)}`, {
      method: "POST",
      headers: stripeHeaders(stripeKey, true),
      body: new URLSearchParams({ cancel_at_period_end: "true" }).toString(),
      signal: AbortSignal.timeout(8000),
    });
    if (!r.ok) return { ok: false, reason: "stripe_refused" };
    const sub = (await r.json().catch(() => null)) as StripeSubscription | null;
    return { ok: true, currentPeriodEnd: periodEndOf(sub), alreadyScheduled: sub?.status === "canceled" };
  } catch {
    return { ok: false, reason: "unreachable" };
  }
}

/** The timeline line the lead page shows. Stable text, so a retried save is not added twice. */
export function retainerCancelDetail(state: RetainerState, subscriptionId: string, by: string): string {
  return `Agency retainer (${state.service}${state.reference ? `, ${state.reference}` : ""}) set to end at the close of the paid period by ${by}. Subscription: ${subscriptionId}.`;
}

/** What the confirm box says before the click. */
export function retainerCancelPrompt(state: RetainerState): string {
  return `End the ${state.service} retainer${state.reference ? ` (${state.reference})` : ""}? It stops renewing at the close of the paid period. The client keeps this period. Nothing is refunded and nothing is emailed to the client from here; the owner alert comes through the Stripe webhook, and Stripe's own emails follow its dashboard settings.`;
}

/** The note the lead page shows once the retainer is set to end or has ended. */
export function retainerEndedNote(state: RetainerState): string {
  if (state.endedAt) return `Agency retainer (${state.service}) ended in Stripe on ${state.endedAt.slice(0, 10)}.`;
  const when = state.currentPeriodEnd ? ` on ${state.currentPeriodEnd.slice(0, 10)}` : "";
  const by = state.cancelledBy ? ` by ${state.cancelledBy}` : "";
  const clicked = state.cancelScheduledAt ? ` (set ${state.cancelScheduledAt.slice(0, 10)})` : "";
  return `Agency retainer (${state.service}) set to end at the close of the paid period${when}${by}${clicked}.`;
}
