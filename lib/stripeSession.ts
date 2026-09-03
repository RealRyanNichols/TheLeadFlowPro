// Look up whether a Stripe Checkout session is actually paid, and for how much.
// Used by every post-payment page before it fires a Purchase conversion, so the
// number reported to Meta and Google is the real amount (promo codes and
// customer-chosen deposits included) and a reload never double-fires.
//
// Fails soft on purpose: no Stripe key, unpaid session, or Stripe unreachable
// all return null, and the page simply renders without the ping.

export type PaidSession = { amountUsd: number; sessionId: string };

export async function fetchPaidSession(sessionId: string | undefined | null): Promise<PaidSession | null> {
  const key = process.env.STRIPE_SECRET_KEY;
  if (!key || !sessionId || !sessionId.startsWith("cs_")) return null;
  try {
    const r = await fetch(
      `https://api.stripe.com/v1/checkout/sessions/${encodeURIComponent(sessionId)}`,
      { headers: { Authorization: `Bearer ${key}` }, cache: "no-store" },
    );
    if (!r.ok) return null;
    const j = (await r.json()) as { payment_status?: string; amount_total?: number };
    if (j.payment_status !== "paid" || !Number.isFinite(Number(j.amount_total))) return null;
    return { amountUsd: Number(j.amount_total) / 100, sessionId };
  } catch {
    return null;
  }
}
