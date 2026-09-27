// The agency retainer door (decision 66): an agency retainer paid through
// /agency/pay monthly is a Stripe subscription that renews until cancelled.
// This module reads what the webhook stamped on the lead, decides whether a
// retainer can be ended, and talks to Stripe to end it at the close of the
// paid period. Nothing here charges, refunds, or emails the client; Stripe's
// own customer emails follow the dashboard's settings.
//
// Leaf module: no Next.js, no Supabase, no Stripe SDK, so the unit tests run
// it directly with a fake fetch.

export type RetainerState = {
  service: string;
  reference: string | null;
  /** The checkout session that started the retainer. */
  sessionId: string | null;
  /** The Stripe subscription, when the webhook saw it on the session. */
  subscriptionId: string | null;
  /** Set once an admin ended the retainer from the lead page. */
  cancelScheduledAt: string | null;
  cancelledBy: string | null;
};

const SESSION_RE = /^cs_[A-Za-z0-9_]{8,200}$/;
const SUBSCRIPTION_RE = /^sub_[A-Za-z0-9]{8,200}$/;

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
 */
export function retainerFromDiagnostic(diagnostic: unknown): RetainerState | null {
  const payment = record(record(diagnostic)?.agency_payment);
  if (!payment || payment.billing !== "monthly") return null;
  const stripe = record(payment.stripe);
  const sessionId = text(stripe?.session_id);
  return {
    service: text(payment.service) ?? "service",
    reference: text(payment.reference),
    sessionId: sessionId && SESSION_RE.test(sessionId) ? sessionId : null,
    subscriptionId: subscriptionIdOf(payment.subscription_id),
    cancelScheduledAt: text(payment.cancel_scheduled_at, 40),
    cancelledBy: text(payment.cancelled_by, 120),
  };
}

/** True while the retainer renews: paid monthly and not yet ended from the lead page. */
export function retainerActive(state: RetainerState | null): boolean {
  return !!state && !state.cancelScheduledAt;
}

type Fetcher = (input: string, init?: RequestInit) => Promise<Response>;

/**
 * The subscription behind a checkout session, from Stripe. Used when the
 * stamp on the lead predates the subscription_id field.
 */
export async function subscriptionIdFromSession(stripeKey: string, sessionId: string, fetcher: Fetcher = fetch): Promise<string | null> {
  if (!SESSION_RE.test(sessionId)) return null;
  try {
    const r = await fetcher(`https://api.stripe.com/v1/checkout/sessions/${encodeURIComponent(sessionId)}`, {
      headers: { Authorization: `Bearer ${stripeKey}` },
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

export type CancelResult =
  | { ok: true; currentPeriodEnd: string | null; alreadyScheduled: boolean }
  | { ok: false; reason: "stripe_refused" | "unreachable" };

/**
 * End the retainer at the close of the paid period. The client keeps what
 * they paid for; nothing renews after it. Idempotent: a subscription already
 * set to end answers ok with alreadyScheduled.
 */
export async function cancelRetainerAtPeriodEnd(stripeKey: string, subscriptionId: string, fetcher: Fetcher = fetch): Promise<CancelResult> {
  if (!SUBSCRIPTION_RE.test(subscriptionId)) return { ok: false, reason: "stripe_refused" };
  try {
    const r = await fetcher(`https://api.stripe.com/v1/subscriptions/${encodeURIComponent(subscriptionId)}`, {
      method: "POST",
      headers: { Authorization: `Bearer ${stripeKey}`, "Content-Type": "application/x-www-form-urlencoded" },
      body: new URLSearchParams({ cancel_at_period_end: "true" }).toString(),
      signal: AbortSignal.timeout(8000),
    });
    if (!r.ok) return { ok: false, reason: "stripe_refused" };
    const sub = (await r.json().catch(() => null)) as { cancel_at_period_end?: unknown; current_period_end?: unknown; status?: unknown } | null;
    const end = typeof sub?.current_period_end === "number" && Number.isFinite(sub.current_period_end) ? new Date(sub.current_period_end * 1000).toISOString() : null;
    return { ok: true, currentPeriodEnd: end, alreadyScheduled: sub?.status === "canceled" };
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
  return `End the ${state.service} retainer${state.reference ? ` (${state.reference})` : ""}? It stops renewing at the close of the paid period. The client keeps this period. Nothing is refunded and nothing is emailed from here; Stripe's own emails follow its dashboard settings.`;
}
