import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import test from "node:test";
import { refundOutcome } from "../lib/stripeRefunds.ts";

test("a full refund flips the status; a partial one, which Stripe sends with refunded false, only alerts", () => {
  const full = refundOutcome("charge.refunded", { id: "ch_1", refunded: true, amount: 49700, amount_refunded: 49700, payment_intent: "pi_1", invoice: null });
  assert.deepEqual(full, { status: "refunded", sessionId: null, invoiceId: null, paymentIntent: "pi_1", chargeId: "ch_1", amountCents: 49700, partial: false, evidenceDueBy: null, reason: null });
  // Stripe sets `refunded` only for a full refund. A partial refund arrives with refunded: false.
  const partial = refundOutcome("charge.refunded", { id: "ch_1", refunded: false, amount: 49700, amount_refunded: 10000, payment_intent: { id: "pi_1" } });
  assert.equal(partial?.partial, true);
  assert.equal(partial?.paymentIntent, "pi_1");
  assert.equal(partial?.amountCents, 10000);
  assert.equal(refundOutcome("charge.refunded", { id: "ch_2", refunded: false, amount: 49700, amount_refunded: 0 }), null);
  // A charge that paid an invoice carries the invoice id, which is the purchase key for renewals and invoices.
  const onInvoice = refundOutcome("charge.refunded", { id: "ch_3", refunded: true, amount: 90000, amount_refunded: 90000, invoice: "in_1", payment_intent: "pi_3" });
  assert.equal(onInvoice?.invoiceId, "in_1");
  assert.equal(refundOutcome("charge.refunded", { id: "ch_4", refunded: true, amount: 100, amount_refunded: 100, invoice: { id: "in_2" } })?.invoiceId, "in_2");
});

test("a dispute, a dispute won, and a failed async payment are recognised; everything else is ignored", () => {
  const dispute = refundOutcome("charge.dispute.created", { id: "dp_1", charge: "ch_9", payment_intent: "pi_9", amount: 100000, reason: "fraudulent", evidence_details: { due_by: 1_800_000_000 } });
  assert.equal(dispute?.status, "disputed");
  assert.equal(dispute?.chargeId, "ch_9");
  assert.equal(dispute?.paymentIntent, "pi_9");
  assert.equal(dispute?.reason, "fraudulent");
  assert.equal(dispute?.evidenceDueBy, 1_800_000_000);
  assert.equal(refundOutcome("charge.dispute.closed", { id: "dp_1", charge: "ch_9", status: "won", amount: 100000 })?.status, "dispute_won");
  assert.equal(refundOutcome("charge.dispute.closed", { id: "dp_1", charge: "ch_9", status: "lost", amount: 100000 }), null);
  const failed = refundOutcome("checkout.session.async_payment_failed", { id: "cs_x", amount_total: 19700 });
  assert.equal(failed?.status, "payment_failed");
  assert.equal(failed?.sessionId, "cs_x");
  assert.equal(refundOutcome("checkout.session.completed", { id: "cs_y" }), null);
  assert.equal(refundOutcome("invoice.paid", {}), null);
});

test("the webhook tries the invoice key first, flips only a paid row after alerting, restores only a disputed one, and never emails the buyer", () => {
  const hook = readFileSync(join(process.cwd(), "app/api/stripe-webhook/route.ts"), "utf8");
  const start = hook.indexOf("async function handleMoneyBack");
  const money = hook.slice(start, hook.indexOf("\nasync function ", start + 1));
  const invoiceKey = money.indexOf("if (outcome.invoiceId) candidates.push(outcome.invoiceId)");
  const sessionLookup = money.indexOf("checkout/sessions?payment_intent=");
  assert.ok(invoiceKey > 0 && sessionLookup > invoiceKey, "the invoice id is tried before the session lookup");
  const alertAt = money.indexOf("await internalAlert(supabase, alertKey, purpose");
  const flipAt = money.indexOf(".update({ status: toStatus })");
  assert.ok(alertAt > 0 && flipAt > alertAt, "the owner alert is sent before the status flip");
  assert.ok(money.includes('.eq("status", fromStatus)') && money.includes('restoring ? "disputed" : "paid"'), "a flip leaves paid, a restore leaves disputed, nothing else moves");
  assert.ok(money.includes("purchase.status === fromStatus"), "the alert claims a flip only when the row really is in the from-state");
  assert.ok(!money.includes("to: [purchase") && !money.includes("reply_to"), "the buyer is never emailed from here");
  for (const p of ['"refund:internal"', '"refund:partial:internal"', '"dispute:internal"', '"dispute-won:internal"', '"async-failed:internal"']) assert.ok(money.includes(p), p);
  assert.ok(hook.includes("charge.refunded, charge.dispute.created, charge.dispute.closed"), "the registration comment lists the new events");
  const access = readFileSync(join(process.cwd(), "lib/access.ts"), "utf8");
  assert.ok(access.includes('.eq("status", "paid")'), "course access still keys on paid, so a flip revokes it");
});
