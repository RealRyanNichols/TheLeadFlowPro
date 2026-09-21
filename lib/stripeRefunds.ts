// Money going back out, or never arriving. purchases.status is written as
// "paid" once by the webhook and, until 2026-09-21, never changed; course
// and kit access, the digest, and the scoreboard all filter on "paid", so
// flipping the status is the whole of revoking access and correcting the
// totals. Leaf module: no network, no Next.js.

export type RefundOutcome = {
  status: "refunded" | "disputed" | "payment_failed";
  /** Known directly for an async failure; for charge events the webhook resolves it from the payment intent. */
  sessionId: string | null;
  paymentIntent: string | null;
  chargeId: string | null;
  amountCents: number;
  /** A partial refund alerts but does not change the status. */
  partial: boolean;
  /** Evidence due date for a dispute, as Stripe sends it (unix seconds), when present. */
  evidenceDueBy: number | null;
  reason: string | null;
};

function str(value: unknown, max = 200): string | null {
  return typeof value === "string" && value.trim() ? value.trim().slice(0, max) : null;
}

function idOf(value: unknown): string | null {
  if (typeof value === "string") return value.slice(0, 200);
  if (value && typeof value === "object" && typeof (value as { id?: unknown }).id === "string") return String((value as { id: string }).id).slice(0, 200);
  return null;
}

export function refundOutcome(eventType: unknown, input: unknown): RefundOutcome | null {
  const object = input && typeof input === "object" ? (input as Record<string, unknown>) : {};
  if (eventType === "charge.refunded") {
    if (object.refunded !== true) return null;
    const amount = Number(object.amount);
    const refunded = Number(object.amount_refunded);
    const partial = Number.isFinite(amount) && Number.isFinite(refunded) && refunded < amount;
    return {
      status: "refunded",
      sessionId: null,
      paymentIntent: idOf(object.payment_intent),
      chargeId: idOf(object.id),
      amountCents: Number.isFinite(refunded) ? Math.round(refunded) : 0,
      partial,
      evidenceDueBy: null,
      reason: null,
    };
  }
  if (eventType === "charge.dispute.created") {
    const evidence = (object.evidence_details && typeof object.evidence_details === "object" ? (object.evidence_details as Record<string, unknown>).due_by : null) as unknown;
    const amount = Number(object.amount);
    return {
      status: "disputed",
      sessionId: null,
      paymentIntent: idOf(object.payment_intent),
      chargeId: idOf(object.charge),
      amountCents: Number.isFinite(amount) ? Math.round(amount) : 0,
      partial: false,
      evidenceDueBy: typeof evidence === "number" && Number.isFinite(evidence) ? evidence : null,
      reason: str(object.reason, 100),
    };
  }
  if (eventType === "checkout.session.async_payment_failed") {
    const amount = Number(object.amount_total);
    return {
      status: "payment_failed",
      sessionId: idOf(object.id),
      paymentIntent: idOf(object.payment_intent),
      chargeId: null,
      amountCents: Number.isFinite(amount) ? Math.round(amount) : 0,
      partial: false,
      evidenceDueBy: null,
      reason: null,
    };
  }
  return null;
}
