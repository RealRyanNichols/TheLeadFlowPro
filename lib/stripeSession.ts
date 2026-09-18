// Look up whether a Stripe Checkout session is actually paid, and for how much.
// Used by every post-payment page before it fires a Purchase conversion, so the
// number reported to Meta and Google is the real amount (promo codes and
// customer-chosen deposits included) and a reload never double-fires.
//
// Fails closed: unavailable, malformed and unpaid sessions never confirm a sale.

import { createHash } from "node:crypto";

export type PaidSession = {
  amountUsd: number;
  sessionId: string;
  kind: string | null;
  eventId: string;
  /**
   * The session's own metadata, string values only, for pages that need to
   * say what was bought (the agency service, the billing cadence, the scope
   * reference). Never customer details: those stay out of the render tree.
   */
  metadata?: Record<string, string>;
};

const METADATA_KEY = /^[a-z][a-z0-9_]{0,39}$/;

function safeMetadata(raw: unknown): Record<string, string> {
  const out: Record<string, string> = {};
  if (!raw || typeof raw !== "object") return out;
  for (const [key, value] of Object.entries(raw as Record<string, unknown>)) {
    if (!METADATA_KEY.test(key) || typeof value !== "string") continue;
    out[key] = value.slice(0, 200);
  }
  return out;
}

export function stripePurchaseEventId(sessionId: string): string {
  return `purchase_${createHash("sha256").update(`stripe:purchase:${sessionId}`).digest("hex")}`;
}

export async function fetchPaidSession(sessionId: string | undefined | null): Promise<PaidSession | null> {
  const key = process.env.STRIPE_SECRET_KEY;
  if (!key || !sessionId || !/^cs_[A-Za-z0-9_]{8,200}$/.test(sessionId)) return null;
  try {
    const r = await fetch(
      `https://api.stripe.com/v1/checkout/sessions/${encodeURIComponent(sessionId)}`,
      { headers: { Authorization: `Bearer ${key}` }, cache: "no-store" },
    );
    if (!r.ok) return null;
    const j = (await r.json()) as {
      id?: string;
      payment_status?: string;
      amount_total?: number;
      currency?: string;
      metadata?: Record<string, unknown> | null;
    };
    if (j.id !== sessionId || j.payment_status !== "paid" || j.currency !== "usd" ||
      typeof j.amount_total !== "number" || !Number.isSafeInteger(j.amount_total) || j.amount_total < 0) return null;
    const kind = typeof j.metadata?.kind === "string" && /^[a-z][a-z0-9_]{0,79}$/.test(j.metadata.kind)
      ? j.metadata.kind : null;
    return {
      amountUsd: j.amount_total / 100,
      sessionId,
      kind,
      // An ad event needs a stable identifier, never the access-bearing session ID.
      eventId: stripePurchaseEventId(sessionId),
      metadata: safeMetadata(j.metadata),
    };
  } catch {
    return null;
  }
}
