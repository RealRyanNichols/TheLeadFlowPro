// Payments hooks. Stripe, in the client's own account, is the authority.
// The stack keeps a ledger of what Stripe said, keyed by Stripe's own ids,
// and applies each event exactly once. A browser coming back from checkout
// proves nothing; only a verified event marks anything paid.

export type PaymentStatus = "pending" | "paid" | "refunded" | "failed";

export type Payment = {
  id: string;
  personId: string | null;
  /** Stripe object id: checkout session, payment intent, or invoice. */
  providerId: string;
  amountCents: number;
  currency: string;
  status: PaymentStatus;
  description: string;
  /** Stripe event id that last moved this row. */
  lastEventId: string;
  createdAt: string;
  updatedAt: string;
};

export type StripeEventLike = {
  id: string;
  type: string;
  created: number;
  data: { object: Record<string, unknown> };
};

export type Ledger = {
  payments: Payment[];
  /** Every Stripe event id ever applied. The idempotency wall. */
  appliedEventIds: Set<string>;
};

export type ApplyResult = { applied: boolean; reason?: "duplicate" | "ignored_type" | "no_amount"; payment?: Payment; personEmail?: string | null };

function str(v: unknown): string | null {
  return typeof v === "string" && v.trim() ? v : null;
}

function int(v: unknown): number | null {
  return typeof v === "number" && Number.isFinite(v) ? Math.trunc(v) : null;
}

/** Look up the person by the email Stripe carries, if the client's config maps it. Returned to the caller; not resolved here. */
function emailOf(obj: Record<string, unknown>): string | null {
  const details = obj.customer_details as Record<string, unknown> | undefined;
  return str(details?.email) ?? str(obj.customer_email) ?? str(obj.receipt_email) ?? null;
}

export function applyStripeEvent(ledger: Ledger, event: StripeEventLike, now: Date, newId: () => string): ApplyResult {
  if (ledger.appliedEventIds.has(event.id)) return { applied: false, reason: "duplicate" };
  const obj = event.data.object;
  const at = now.toISOString();
  const upsert = (providerId: string, patch: Partial<Payment> & { amountCents: number; currency: string; status: PaymentStatus }): Payment => {
    const existing = ledger.payments.find((p) => p.providerId === providerId);
    if (existing) {
      Object.assign(existing, patch, { lastEventId: event.id, updatedAt: at });
      return existing;
    }
    const created: Payment = { id: newId(), personId: null, providerId, description: "", createdAt: at, updatedAt: at, lastEventId: event.id, ...patch };
    ledger.payments.push(created);
    return created;
  };

  let payment: Payment | undefined;
  switch (event.type) {
    case "checkout.session.completed": {
      const amount = int(obj.amount_total);
      if (amount === null) return { applied: false, reason: "no_amount" };
      const paid = obj.payment_status === "paid";
      payment = upsert(String(obj.id), { amountCents: amount, currency: String(obj.currency ?? "usd").toUpperCase(), status: paid ? "paid" : "pending", description: "Checkout" });
      break;
    }
    case "invoice.paid": {
      const amount = int(obj.amount_paid);
      if (amount === null) return { applied: false, reason: "no_amount" };
      payment = upsert(String(obj.id), { amountCents: amount, currency: String(obj.currency ?? "usd").toUpperCase(), status: "paid", description: "Invoice" });
      break;
    }
    case "invoice.payment_failed": {
      const amount = int(obj.amount_due) ?? 0;
      payment = upsert(String(obj.id), { amountCents: amount, currency: String(obj.currency ?? "usd").toUpperCase(), status: "failed", description: "Invoice" });
      break;
    }
    case "charge.refunded": {
      const pi = str(obj.payment_intent) ?? String(obj.id);
      const amount = int(obj.amount_refunded) ?? int(obj.amount) ?? 0;
      payment = upsert(pi, { amountCents: amount, currency: String(obj.currency ?? "usd").toUpperCase(), status: "refunded", description: "Refund" });
      break;
    }
    default:
      return { applied: false, reason: "ignored_type" };
  }
  ledger.appliedEventIds.add(event.id);
  return { applied: true, payment, personEmail: emailOf(obj) };
}

/** What the thank-you page may say when the browser comes back with a session id and nothing is verified yet. */
export function redirectState(): { status: "pending_verification"; message: string } {
  return { status: "pending_verification", message: "Thanks. Your payment is being confirmed and your receipt will arrive by email." };
}

/** Failed payments create a private action for the owner, never a public label on the person. */
export function paymentActions(payments: Payment[]): { paymentId: string; text: string }[] {
  return payments.filter((p) => p.status === "failed").map((p) => ({ paymentId: p.id, text: `A payment of ${(p.amountCents / 100).toFixed(2)} ${p.currency} did not go through. Reach out privately.` }));
}
