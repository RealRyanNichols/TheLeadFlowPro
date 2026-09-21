import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import test from "node:test";
import { refundOutcome } from "../lib/stripeRefunds.ts";

test("a full refund flips the status, a partial one only alerts", () => {
  const full = refundOutcome("charge.refunded", { id: "ch_1", refunded: true, amount: 49700, amount_refunded: 49700, payment_intent: "pi_1" });
  assert.deepEqual(full, { status: "refunded", sessionId: null, paymentIntent: "pi_1", chargeId: "ch_1", amountCents: 49700, partial: false, evidenceDueBy: null, reason: null });
  const partial = refundOutcome("charge.refunded", { id: "ch_1", refunded: true, amount: 49700, amount_refunded: 10000, payment_intent: { id: "pi_1" } });
  assert.equal(partial?.partial, true);
  assert.equal(partial?.paymentIntent, "pi_1");
  assert.equal(partial?.amountCents, 10000);
  assert.equal(refundOutcome("charge.refunded", { id: "ch_2", refunded: false }), null);
});

test("a dispute and a failed async payment are recognised; everything else is ignored", () => {
  const dispute = refundOutcome("charge.dispute.created", { id: "dp_1", charge: "ch_9", payment_intent: "pi_9", amount: 100000, reason: "fraudulent", evidence_details: { due_by: 1_800_000_000 } });
  assert.equal(dispute?.status, "disputed");
  assert.equal(dispute?.chargeId, "ch_9");
  assert.equal(dispute?.paymentIntent, "pi_9");
  assert.equal(dispute?.reason, "fraudulent");
  assert.equal(dispute?.evidenceDueBy, 1_800_000_000);
  const failed = refundOutcome("checkout.session.async_payment_failed", { id: "cs_x", amount_total: 19700 });
  assert.equal(failed?.status, "payment_failed");
  assert.equal(failed?.sessionId, "cs_x");
  assert.equal(refundOutcome("checkout.session.completed", { id: "cs_y" }), null);
  assert.equal(refundOutcome("invoice.paid", {}), null);
});

test("the webhook flips only paid rows, alerts the owner first, and access still keys on paid", () => {
  const hook = readFileSync(join(process.cwd(), "app/api/stripe-webhook/route.ts"), "utf8");
  const money = hook.slice(hook.indexOf("async function handleMoneyBack"));
  const alertAt = money.indexOf("refund:internal");
  const flipAt = money.indexOf('.update({ status: outcome.status })');
  assert.ok(alertAt > 0 && flipAt > alertAt, "the owner alert is sent before the status flip");
  assert.ok(money.includes('.eq("status", "paid")'), "only a paid row is flipped");
  assert.ok(!money.includes("to: [purchase") && !money.includes("reply_to"), "the buyer is never emailed from here");
  assert.ok(hook.includes("charge.refunded, charge.dispute.created"), "the registration comment lists the new events");
  const access = readFileSync(join(process.cwd(), "lib/access.ts"), "utf8");
  assert.ok(access.includes('.eq("status", "paid")'), "course access still keys on paid, so a flip revokes it");
});
