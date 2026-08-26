import type { StripeCheckoutSession } from "@/lib/stripeCheckout";

// Server-side read of a finished Checkout Session.
//
// WHY: the ad-platform conversion events fired on /thank-you used to report a
// hardcoded $497 for every purchase. A $500 Website Launch deposit, a $1,000
// full payment and a $25,000 custom build deposit all arrived at Meta as the
// same $497. Every number downstream of that was wrong, and the ones that
// matter most (which campaign is worth more than it costs) were wrong in a
// direction that quietly favors whatever sells the cheapest thing.
//
// The success URL carries session_id={CHECKOUT_SESSION_ID}, so the real amount
// is one authenticated call away. Reading it from Stripe rather than trusting
// a number in the query string also means a stranger cannot hand themselves a
// Purchase event by typing a URL: Stripe is the one saying what was paid.
//
// SERVER ONLY. STRIPE_SECRET_KEY must never reach the browser.

export type PaidSession = {
  /** What Stripe says was actually collected, in whole dollars. */
  amountUsd: number;
  /** The metadata.kind we set at checkout, or "unknown" for Payment Links. */
  kind: string;
};

/** A Stripe Checkout Session id, as it appears in the success URL. */
function looksLikeSessionId(value: string): boolean {
  return /^cs_[A-Za-z0-9_]{8,200}$/.test(value);
}

/**
 * Look up a Checkout Session and return it only if Stripe reports it paid.
 *
 * Returns null when the id is missing or malformed, when STRIPE_SECRET_KEY is
 * not configured, when Stripe refuses the lookup, or when the session exists
 * but is unpaid. Callers must treat null as "no verified amount" rather than
 * "no sale": the caller decides whether an unverified visit is still worth
 * reporting as a conversion without a value attached.
 */
export async function paidSession(sessionId: string | undefined): Promise<PaidSession | null> {
  const id = String(sessionId ?? "").trim();
  if (!looksLikeSessionId(id)) return null;

  const key = process.env.STRIPE_SECRET_KEY;
  if (!key) return null;

  try {
    const response = await fetch(`https://api.stripe.com/v1/checkout/sessions/${id}`, {
      headers: { Authorization: `Bearer ${key}` },
      // The amount on a completed session never changes, but this page is
      // rendered once per buyer and the answer is worthless if it is stale
      // from somebody else's checkout.
      cache: "no-store",
    });
    if (!response.ok) return null;

    const session = (await response.json()) as StripeCheckoutSession;
    if (session.payment_status !== "paid") return null;

    const cents = Number(session.amount_total);
    if (!Number.isFinite(cents) || cents <= 0) return null;

    const kind =
      typeof session.metadata?.kind === "string" ? session.metadata.kind.slice(0, 64) : "unknown";

    return { amountUsd: Math.round(cents) / 100, kind };
  } catch {
    // A conversion event with no value beats a page that will not render.
    return null;
  }
}
