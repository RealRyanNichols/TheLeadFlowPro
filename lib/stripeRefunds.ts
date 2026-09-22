// Money going back out, or never arriving. purchases.status is written as
// "paid" once by the webhook and, until 2026-09-21, never changed. Course
// access and account-based kit access (lib/access.ts, lib/proAccessServer.ts),
// the digest, and the scoreboard all filter on "paid", so flipping the status
// corrects the totals and closes those doors. A kit access cookie or a
// derived license key already in a buyer's hands is not consulted against
// purchases and keeps working until it expires. Leaf module: no network.

export type RefundOutcome = {
  status: "refunded" | "disputed" | "payment_failed" | "dispute_won";
  /** Known directly for an async failure; for charge events the webhook resolves it from the invoice or payment intent. */
  sessionId: string | null;
  /** The invoice the charge paid, when Stripe says so. Purchases from invoices are keyed by this id. */
  invoiceId: string | null;
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
    // Stripe sets `refunded` only when the whole charge is refunded; a
    // partial refund arrives with refunded: false and amount_refunded > 0.
    // Decide on money moved, not on the flag.
    const amount = Number(object.amount);
    const refunded = Number(object.amount_refunded);
    if (!Number.isFinite(refunded) || refunded <= 0) return null;
    const partial = Number.isFinite(amount) ? refunded < amount : object.refunded !== true;
    return {
      status: "refunded",
      sessionId: null,
      invoiceId: idOf(object.invoice),
      paymentIntent: idOf(object.payment_intent),
      chargeId: idOf(object.id),
      amountCents: Math.round(refunded),
      partial,
      evidenceDueBy: null,
      reason: null,
    };
  }
  if (eventType === "charge.dispute.created" || eventType === "charge.dispute.closed") {
    const disputeStatus = str(object.status, 40);
    if (eventType === "charge.dispute.closed" && disputeStatus !== "won") return null;
    const evidence = (object.evidence_details && typeof object.evidence_details === "object" ? (object.evidence_details as Record<string, unknown>).due_by : null) as unknown;
    const amount = Number(object.amount);
    return {
      status: eventType === "charge.dispute.closed" ? "dispute_won" : "disputed",
      sessionId: null,
      invoiceId: null,
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
      invoiceId: null,
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
