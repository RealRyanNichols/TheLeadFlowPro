import { describe, it } from "node:test";
import assert from "node:assert/strict";
import {
  consumeProPurchaseReceipt, createProPurchaseReceipt, PRO_PURCHASE_RECEIPT_PATH,
  PRO_PURCHASE_RECEIPT_TTL, proPurchaseConsumptionRow, proPurchasePath,
  proPurchaseReceiptCookieOptions, signProPurchaseReceipt, verifyProPurchaseReceipt,
} from "../lib/proPurchaseReceipt.ts";
import { mergeProAccess, signProAccess, verifyProAccess } from "../lib/proAccess.ts";
import { createProPurchaseReceiptConsumer } from "../lib/analytics/proPurchaseClient.ts";

const secret = "receipt-test-secret";
const now = 1_800_000_000;
const sessionId = "cs_test_receipt123456789";
const catalog = [{ slug: "missed-call-text-back-kit", priceUsd: 19 }, { slug: "qr-sign-kit", priceUsd: 10 }];
const session = {
  id: sessionId, created: now, payment_status: "paid", currency: "usd", amount_total: 1425, amount_subtotal: 1900,
  metadata: { kind: "pro_tool", pro_slug: "missed-call-text-back-kit" },
  customer_details: { email: "private-buyer@example.test", name: "Private Buyer" },
};
const receipt = createProPurchaseReceipt(sessionId, session, catalog, now)!;
const receiptToken = signProPurchaseReceipt(receipt, secret);
const accessToken = signProAccess(mergeProAccess(null, "private-buyer@example.test", ["pro_tool:missed-call-text-back-kit"], now), secret);
const origin = "https://www.theleadflowpro.com";
const request = (headers: Record<string, string> = {}, path = proPurchasePath(receipt.sku), method = "POST") => new Request(`${origin}${PRO_PURCHASE_RECEIPT_PATH}`, {
  method, headers: { origin, referer: `${origin}${path}`, "x-leadflow-receipt": "1", "sec-fetch-site": "same-origin", ...headers },
});
const input = () => ({ request: request(), receiptToken, accessToken, secrets: [secret], now });

describe("signed Pro purchase receipt", () => {
  it("records the verified discounted amount, stable event ID and product without buyer identity", () => {
    assert.equal(receipt.amountCents, 1425);
    assert.equal(receipt.sku, "missed-call-text-back-kit");
    assert.equal(receipt.currency, "USD");
    assert.equal(receipt.expiresAt, now + 600);
    assert.match(receipt.eventId, /^purchase_[a-f0-9]{64}$/);
    assert.equal(createProPurchaseReceipt(sessionId, session, catalog, now + 100)?.eventId, receipt.eventId);
    assert.doesNotMatch(JSON.stringify(receipt), /cs_test_|private-buyer|Private Buyer|customer_details/);
  });

  it("never creates a Purchase receipt for free, unpaid, malformed or mismatched sessions", () => {
    for (const change of [
      { payment_status: "unpaid" }, { payment_status: "no_payment_required" },
      { id: "cs_test_wrong12345678" }, { currency: "eur" },
      { amount_total: 0 }, { amount_total: -1 }, { amount_total: "1425" },
      { amount_total: 1425.5 }, { amount_total: null },
      { created: undefined }, { created: now + 31 }, { created: now - 30 * 24 * 60 * 60 },
      { metadata: { kind: "pro_tool", pro_slug: "unknown-kit" } },
      { metadata: { kind: "pro_tool", pro_slug: "qr-sign-kit" } },
    ]) assert.equal(createProPurchaseReceipt(sessionId, { ...session, ...change }, catalog, now), null);
    assert.equal(createProPurchaseReceipt("cs_../../bad", session, catalog, now), null);
  });

  it("supports the bundle and clean public destinations without access-bearing queries", () => {
    const bundle = createProPurchaseReceipt(sessionId, { ...session, amount_subtotal: 3900, metadata: { kind: "pro_bundle" } }, catalog, now)!;
    assert.equal(bundle.sku, "pro_bundle");
    assert.equal(proPurchasePath(bundle.sku), "/tools/pro");
    assert.equal(proPurchasePath(receipt.sku), "/tools/pro/missed-call-text-back-kit");
    assert.doesNotMatch(proPurchasePath(receipt.sku), /[?#]/);
  });

  it("rejects edits, forged tokens and access tokens from the other signature namespace", () => {
    const [body, signature] = receiptToken.split(".");
    const forged = Buffer.from(JSON.stringify({ ...JSON.parse(Buffer.from(body, "base64url").toString()), amountCents: 2900 })).toString("base64url");
    for (const token of [undefined, "", "x.y", `${forged}.${signature}`, accessToken, `${"x".repeat(3000)}.y`]) {
      assert.equal(verifyProPurchaseReceipt(token, [secret], now), null);
    }
    assert.equal(verifyProPurchaseReceipt(receiptToken, ["wrong-secret"], now), null);
    assert.ok(verifyProPurchaseReceipt(receiptToken, ["rotated-secret", secret], now));
  });

  it("expires promptly and refuses fabricated long-lived or future receipts", () => {
    assert.equal(verifyProPurchaseReceipt(receiptToken, [secret], now + PRO_PURCHASE_RECEIPT_TTL), null);
    assert.equal(verifyProPurchaseReceipt(receiptToken, [secret], now - 31), null);
    assert.equal(verifyProPurchaseReceipt(signProPurchaseReceipt({ ...receipt, expiresAt: now + 86400 }, secret), [secret], now), null);
    const options = proPurchaseReceiptCookieOptions();
    assert.equal(options.httpOnly, true);
    assert.equal(options.path, PRO_PURCHASE_RECEIPT_PATH);
    assert.equal(options.maxAge, 600);
    assert.equal(options.sameSite, "lax");
  });
});

describe("same-origin, one-time receipt consumption", () => {
  it("does not consume for cross-origin, missing custom header, GET or private return URLs", async () => {
    let claims = 0;
    const claimOnce = async () => { claims++; return true; };
    for (const bad of [
      request({ origin: "https://other.example" }), request({ origin: "" }),
      request({ "x-leadflow-receipt": "" }), request({ "sec-fetch-site": "cross-site" }),
      request({}, proPurchasePath(receipt.sku), "GET"),
    ]) {
      const result = await consumeProPurchaseReceipt({ ...input(), request: bad, claimOnce });
      assert.equal(result.status, 403);
      assert.equal(result.clearCookie, false);
      assert.equal(result.event, null);
    }
    for (const path of ["/admin", "/tools/pro/qr-sign-kit", `${proPurchasePath(receipt.sku)}?session_id=private`, `${proPurchasePath(receipt.sku)}?email=private`]) {
      assert.equal((await consumeProPurchaseReceipt({ ...input(), request: request({}, path), claimOnce })).event, null);
    }
    assert.equal(claims, 0);
  });

  it("requires both an authentic receipt and existing access to the purchased kit", async () => {
    let claims = 0;
    const wrongAccess = signProAccess(mergeProAccess(null, "other@example.test", ["pro_tool:qr-sign-kit"], now), secret);
    for (const change of [{ receiptToken: undefined }, { receiptToken: "forged.token" }, { accessToken: undefined }, { accessToken: wrongAccess }]) {
      const result = await consumeProPurchaseReceipt({ ...input(), ...change, claimOnce: async () => { claims++; return true; } });
      assert.equal(result.status, 204);
      assert.equal(result.event, null);
    }
    assert.equal(claims, 0);
  });

  it("consumes once across concurrent requests and repeated checkout claims", async () => {
    const stored = new Set<string>();
    const claimOnce = async (value: typeof receipt) => {
      const id = proPurchaseConsumptionRow(value).client_id;
      if (stored.has(id)) return false;
      stored.add(id);
      return true;
    };
    const results = await Promise.all([consumeProPurchaseReceipt({ ...input(), claimOnce }), consumeProPurchaseReceipt({ ...input(), claimOnce })]);
    assert.deepEqual(results.map(r => r.status).sort(), [200, 204]);
    const event = results.find(r => r.event)?.event;
    assert.deepEqual(event, { eventId: receipt.eventId, value: 14.25, currency: "USD", sku: receipt.sku });
    assert.ok(results.every(r => r.clearCookie));
    const again = createProPurchaseReceipt(sessionId, session, catalog, now + 100)!;
    const repeated = await consumeProPurchaseReceipt({ ...input(), now: now + 100, receiptToken: signProPurchaseReceipt(again, secret), claimOnce });
    assert.equal(repeated.status, 204);
    assert.equal(stored.size, 1);
    assert.doesNotMatch(JSON.stringify(event), /cs_test_|private-buyer|Private Buyer/);
  });

  it("keeps receipt/access usable on a store failure and records no private data in the dedupe row", async () => {
    const result = await consumeProPurchaseReceipt({ ...input(), claimOnce: async () => { throw new Error("unavailable"); } });
    assert.deepEqual(result, { status: 503, clearCookie: false, event: null });
    assert.ok(verifyProAccess(accessToken, [secret]));
    const row = proPurchaseConsumptionRow(receipt);
    assert.match(row.client_id, /^[a-f0-9]{8}-[a-f0-9]{4}-5[a-f0-9]{3}-a[a-f0-9]{3}-[a-f0-9]{12}$/);
    assert.equal(row.event_name, "pro_purchase_receipt_consumed");
    assert.equal(row.meta.amount_usd, 14.25);
    assert.doesNotMatch(JSON.stringify(row), /cs_test_|private-buyer|Private Buyer|session_id|email/);
  });
});

describe("browser receipt handoff", () => {
  const event = { eventId: receipt.eventId, value: 14.25, currency: "USD", sku: receipt.sku };
  it("makes one same-origin request across overlapping mounts and dedupes without browser storage", async () => {
    let calls = 0;
    const consumer = createProPurchaseReceiptConsumer(async (url, init) => {
      calls++;
      assert.equal(url, PRO_PURCHASE_RECEIPT_PATH);
      assert.equal(init?.method, "POST");
      assert.equal(init?.credentials, "same-origin");
      assert.equal(init?.cache, "no-store");
      assert.equal(init?.body, undefined);
      return new Response(JSON.stringify({ ...event, email: "never-forward@example.test", session_id: sessionId }));
    });
    const [a, b] = await Promise.all([consumer.consume(), consumer.consume()]);
    assert.equal(calls, 1);
    assert.deepEqual(a, event);
    assert.deepEqual(b, event);
    assert.equal(consumer.claimEvent(a!.eventId), true);
    assert.equal(consumer.claimEvent(b!.eventId), false);
  });

  it("retries temporary failures but refuses free, malformed and identity-shaped payloads", async () => {
    let calls = 0;
    const retry = createProPurchaseReceiptConsumer(async () => ++calls === 1 ? new Response(null, { status: 503 }) : new Response(JSON.stringify(event)));
    await assert.rejects(retry.consume());
    assert.deepEqual(await retry.consume(), event);
    for (const change of [{ value: 0 }, { value: -1 }, { value: "14.25" }, { currency: "EUR" }, { sku: "customer@example.test" }, { eventId: sessionId }]) {
      const consumer = createProPurchaseReceiptConsumer(async () => new Response(JSON.stringify({ ...event, ...change })));
      assert.equal(await consumer.consume(), null);
    }
    const empty = createProPurchaseReceiptConsumer(async () => new Response(null, { status: 204 }));
    assert.equal(await empty.consume(), null);
  });
});
