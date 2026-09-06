import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { fetchPaidSession, type PaidSession } from "../lib/stripeSession.ts";
import { freeBuildConfirmation, purchaseConfirmation } from "../lib/purchaseConfirmation.ts";
import { purchaseEvent } from "../lib/analytics/purchaseEvent.ts";

const sessionId = "cs_test_confirmation12345678";
const verified: PaidSession = {
  sessionId,
  amountUsd: 19,
  kind: "pro_tool",
  eventId: `purchase_${"a".repeat(64)}`,
};

describe("payment confirmation authority", () => {
  it("does not confirm a payment or training access from any purchase query alone", () => {
    for (const purchase of ["build_deposit", "package_deposit", "package_full", "event", "learn_it", "system_map"]) {
      assert.equal(purchaseConfirmation({ purchase }, null), "unverified");
      assert.equal(purchaseConfirmation({ purchase, sessionId }, null), "unverified");
    }
  });

  it("preserves the ordinary free lead thank-you", () => {
    assert.equal(purchaseConfirmation({}, null), "lead");
  });

  it("uses verified product metadata instead of a changed return URL", () => {
    assert.equal(purchaseConfirmation({ purchase: "learn_it" }, verified), "payment");
    assert.equal(purchaseConfirmation({ purchase: "event" }, { ...verified, kind: "system_map" }), "system_map");
    assert.equal(purchaseConfirmation({}, { ...verified, kind: "package_full" }), "deposit");
    assert.equal(purchaseConfirmation({}, { ...verified, kind: "event" }), "event");
    assert.equal(purchaseConfirmation({}, { ...verified, kind: "learn_it" }), "training");
    assert.equal(purchaseConfirmation({ purchase: "learn_it" }, { ...verified, kind: null }), "payment");
  });
});

describe("Free Build payment confirmation", () => {
  it("does not turn a free application or absent payment into a paid order", () => {
    assert.equal(freeBuildConfirmation(null).status, "unverified");
    assert.equal(freeBuildConfirmation(verified).status, "other_payment");
    assert.equal(freeBuildConfirmation({ ...verified, kind: null }).status, "other_payment");
  });

  it("uses the verified purchased tier and preserves verified historical paid IDs", () => {
    const current = freeBuildConfirmation({ ...verified, kind: "free_build_followup", amountUsd: 147.75 });
    assert.equal(current.status, "paid");
    assert.equal(current.tier?.id, "free_build_followup");
    const historical = freeBuildConfirmation({ ...verified, kind: "free_build_only", amountUsd: 1000 });
    assert.equal(historical.status, "paid");
    assert.equal(historical.tier, undefined);
  });
});

describe("Stripe payment verification", () => {
  it("fails closed on missing, unpaid, mismatched, malformed or unavailable sessions", async (t) => {
    const oldKey = process.env.STRIPE_SECRET_KEY;
    const oldFetch = globalThis.fetch;
    t.after(() => {
      if (oldKey === undefined) delete process.env.STRIPE_SECRET_KEY;
      else process.env.STRIPE_SECRET_KEY = oldKey;
      globalThis.fetch = oldFetch;
    });
    process.env.STRIPE_SECRET_KEY = "test-only-secret";
    let calls = 0;
    globalThis.fetch = async () => { calls++; throw new Error("provider unavailable"); };
    assert.equal(await fetchPaidSession(undefined), null);
    assert.equal(await fetchPaidSession("cs_../../private"), null);
    assert.equal(calls, 0);
    assert.equal(await fetchPaidSession(sessionId), null);
    const base = { id: sessionId, payment_status: "paid", currency: "usd", amount_total: 1900 };
    for (const change of [
      { payment_status: "unpaid" }, { payment_status: "no_payment_required" },
      { id: "cs_test_other12345678" }, { currency: "eur" },
      { amount_total: null }, { amount_total: "1900" }, { amount_total: -1 },
      { amount_total: 1900.5 }, { amount_total: Number.MAX_SAFE_INTEGER + 1 },
    ]) {
      globalThis.fetch = async () => new Response(JSON.stringify({ ...base, ...change }));
      assert.equal(await fetchPaidSession(sessionId), null);
    }
    globalThis.fetch = async () => new Response("unavailable", { status: 503 });
    assert.equal(await fetchPaidSession(sessionId), null);
    delete process.env.STRIPE_SECRET_KEY;
    assert.equal(await fetchPaidSession(sessionId), null);
  });

  it("uses the actual discounted paid total and a stable opaque conversion ID", async (t) => {
    const oldKey = process.env.STRIPE_SECRET_KEY;
    const oldFetch = globalThis.fetch;
    t.after(() => {
      if (oldKey === undefined) delete process.env.STRIPE_SECRET_KEY;
      else process.env.STRIPE_SECRET_KEY = oldKey;
      globalThis.fetch = oldFetch;
    });
    process.env.STRIPE_SECRET_KEY = "test-only-secret";
    globalThis.fetch = async (url, init) => {
      assert.equal(String(url), `https://api.stripe.com/v1/checkout/sessions/${sessionId}`);
      assert.equal(init?.cache, "no-store");
      return new Response(JSON.stringify({
        id: sessionId, payment_status: "paid", currency: "usd", amount_total: 1425,
        amount_subtotal: 1900, metadata: { kind: "pro_tool" },
        customer_details: { email: "private-buyer@example.test", name: "Private Buyer" },
      }));
    };
    const paid = await fetchPaidSession(sessionId);
    assert.ok(paid);
    assert.equal(paid.amountUsd, 14.25);
    assert.equal(paid.kind, "pro_tool");
    assert.match(paid.eventId, /^purchase_[a-f0-9]{64}$/);
    assert.equal(paid.eventId, (await fetchPaidSession(sessionId))?.eventId);
    const payload = purchaseEvent(paid.amountUsd, paid.eventId);
    assert.ok(payload);
    assert.equal(payload.value, 14.25);
    assert.equal(JSON.stringify(payload).includes(sessionId), false);
    assert.equal(JSON.stringify(payload).includes("private-buyer"), false);
    assert.equal(JSON.stringify(paid).includes("Private Buyer"), false);
  });
});

describe("purchase event payload", () => {
  it("never invents a default value or accepts a raw checkout credential as the event ID", () => {
    for (const value of [undefined, NaN, Infinity, -1]) {
      assert.equal(purchaseEvent(value, verified.eventId), null);
    }
    for (const eventId of [undefined, null, "", sessionId, "free_build_basic"]) {
      assert.equal(purchaseEvent(19, eventId), null);
    }
    assert.deepEqual(purchaseEvent(0, verified.eventId), { value: 0, currency: "USD", eventId: verified.eventId });
  });
});
