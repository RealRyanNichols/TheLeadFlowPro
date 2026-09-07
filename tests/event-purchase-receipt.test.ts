import { test } from "node:test";
import assert from "node:assert/strict";
import { createEventPurchaseReceipt, signEventPurchaseReceipt, verifyEventPurchaseReceipt, eventReceiptRequestAllowed, eventConsumptionRow, eventReceiptCookieOptions, eventThanksPath } from "../lib/eventPurchaseReceipt.ts";
const now = 1800000000, secret = 'fixture-event-secret';
const registration = { id: 'reg-test', event_id: 'event-test', status: 'paid', stripe_session_id: 'cs_test_eventfixture123', access_token: 'a'.repeat(48), event_slug: 'fixture-workshop' };
const session = { id: registration.stripe_session_id, created: now, currency: 'usd', payment_status: 'paid', amount_total: 9700, metadata: { kind: 'event', registration_id: registration.id, event_id: registration.event_id, ticket_amount_cents: '9700' } };
const receipt = createEventPurchaseReceipt(session, registration, now)!;
test('paid workshop receipt requires verified session, matching seat, correct amount and recent purchase', () => {
    assert.equal(receipt.amountCents, 9700);
    assert.equal(receipt.sku, 'fixture-workshop');
    assert.match(receipt.eventId, /^purchase_[a-f0-9]{64}$/);
    for (const change of [{ payment_status: 'unpaid' }, { currency: 'eur' }, { amount_total: 9600 }, { created: now - 31 * 86400 }, { metadata: { ...session.metadata, registration_id: 'other' } }])
        assert.equal(createEventPurchaseReceipt({ ...session, ...change }, registration, now), null);
    for (const status of ['pending', 'overbooked', 'refunded', 'cancelled', 'transferred'])
        assert.equal(createEventPurchaseReceipt(session, { ...registration, status }, now), null);
});
test('private receipt signature rejects forged, expired and cross-purpose tokens', () => {
    const token = signEventPurchaseReceipt(receipt, secret);
    assert.deepEqual(verifyEventPurchaseReceipt(token, [secret], now), receipt);
    assert.equal(verifyEventPurchaseReceipt(token, ['wrong'], now), null);
    assert.equal(verifyEventPurchaseReceipt(token, [secret], now + 600), null);
    assert.equal(verifyEventPurchaseReceipt(token.replace(/^./, 'X'), [secret], now), null);
    assert.equal(eventReceiptCookieOptions().httpOnly, true);
    assert.equal(eventReceiptCookieOptions().path, '/api/events');
});
test('only the clean same-origin thank-you page may consume an event receipt', () => {
    const origin = 'https://www.theleadflowpro.com';
    const make = (path = eventThanksPath(receipt.sku), extra: Record<string, string> = {}) => new Request(origin + '/api/events/purchase-receipt', { method: 'POST', headers: { origin, referer: origin + path, 'x-leadflow-receipt': '1', 'sec-fetch-site': 'same-origin', ...extra } });
    assert.equal(eventReceiptRequestAllowed(make(), receipt), true);
    for (const path of ['/admin', '/events/other/thanks', eventThanksPath(receipt.sku) + '?t=secret', eventThanksPath(receipt.sku) + '?session_id=secret'])
        assert.equal(eventReceiptRequestAllowed(make(path), receipt), false);
    assert.equal(eventReceiptRequestAllowed(make(undefined, { origin: 'https://attacker.test' }), receipt), false);
});
test('analytics storage contains only opaque order ID, price and public workshop route', () => {
    const row = eventConsumptionRow(receipt);
    assert.equal(row.path, '/events/fixture-workshop/thanks');
    assert.equal(row.event_name, 'event_purchase_receipt_consumed');
    assert.equal(row.meta.amount_usd, 97);
    assert.doesNotMatch(JSON.stringify(row), /cs_test|registrationToken|aaaaaaaa|reg-test/);
    assert.equal(eventConsumptionRow({ ...receipt, issuedAt: now + 20, expiresAt: now + 620 }).client_id, row.client_id);
});
