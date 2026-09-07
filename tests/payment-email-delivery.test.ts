import { test } from "node:test";
import assert from "node:assert/strict";
import type { SupabaseClient } from "@supabase/supabase-js";
import { deliverPaymentEmail } from "../lib/paymentEmailDelivery.ts";
function fixture() {
    const rows = new Map<string, Record<string, unknown>>();
    let failMark = false;
    const db = { from: () => { let key = ''; let patch: Record<string, unknown> | null = null; const q = { upsert: async (row: Record<string, unknown>) => { if (!rows.has(String(row.delivery_key)))
                rows.set(String(row.delivery_key), row); return { error: null }; }, select: () => q, eq: (_k: string, v: string) => { key = v; return q; }, single: async () => ({ data: rows.get(key), error: null }), update: (p: Record<string, unknown>) => { patch = p; return q; }, then: (resolve: (v: unknown) => unknown) => { if (patch && !failMark)
                Object.assign(rows.get(key)!, patch); return Promise.resolve({ data: failMark ? null : [{ delivery_key: key }], error: failMark ? { code: 'fail' } : null }).then(resolve); } }; return q; } } as unknown as SupabaseClient;
    const input = { supabase: db, sessionId: 'cs_test_isolated', purpose: 'pro-kit:buyer', payload: { to: ['qa@example.test'], text: 'Example access receipt' }, apiKey: 'fake', now: 1800000000000 };
    return { rows, input, failMark: (v: boolean) => { failMark = v; } };
}
test('provider acceptance is durable across later webhook retries and deploys', async () => {
    const f = fixture();
    let attempts = 0;
    const fetcher: typeof fetch = async () => { attempts++; return Response.json({ id: 'provider-message' }); };
    await deliverPaymentEmail({ ...f.input, fetcher });
    await deliverPaymentEmail({ ...f.input, now: f.input.now + 10 * 86400000, fetcher });
    assert.equal(attempts, 1);
    assert.equal(f.rows.size, 1);
    assert.ok([...f.rows.values()][0].sent_at);
    assert.doesNotMatch(JSON.stringify([...f.rows.values()]), /qa@|Example access/);
});
test('provider rejection remains retryable with the same idempotency key', async () => {
    const f = fixture();
    const keys: string[] = [];
    let reject = true;
    const fetcher: typeof fetch = async (_url, init) => { assert.ok(init?.signal, 'provider request has a finite timeout'); keys.push(new Headers(init?.headers).get('Idempotency-Key')!); return reject ? Response.json({ error: 'unavailable' }, { status: 429 }) : Response.json({ id: 'provider-message' }); };
    await assert.rejects(deliverPaymentEmail({ ...f.input, fetcher }), /not accepted/);
    reject = false;
    await deliverPaymentEmail({ ...f.input, fetcher });
    assert.equal(keys[0], keys[1]);
    assert.ok(keys[0]);
});
test('crash after accepted send retries same body/key and preserves unknown-send boundary', async () => {
    const f = fixture();
    const keys: string[] = [];
    const fetcher: typeof fetch = async (_url, init) => { assert.ok(init?.signal, 'provider request has a finite timeout'); keys.push(new Headers(init?.headers).get('Idempotency-Key')!); return Response.json({ id: 'same-provider-id' }); };
    f.failMark(true);
    await assert.rejects(deliverPaymentEmail({ ...f.input, fetcher }), /marker/);
    f.failMark(false);
    await deliverPaymentEmail({ ...f.input, fetcher });
    assert.equal(keys[0], keys[1]);
    const g = fixture();
    g.failMark(true);
    await assert.rejects(deliverPaymentEmail({ ...g.input, fetcher }), /marker/);
    g.failMark(false);
    await assert.rejects(deliverPaymentEmail({ ...g.input, now: g.input.now + 24 * 3600000, fetcher }), /needs review/);
});
test('changed receipt body cannot defeat provider deduplication', async () => {
    const f = fixture();
    const fetcher: typeof fetch = async () => Response.json({ error: 'unavailable' }, { status: 503 });
    await assert.rejects(deliverPaymentEmail({ ...f.input, fetcher }));
    await assert.rejects(deliverPaymentEmail({ ...f.input, payload: { different: true }, fetcher }), /needs review/);
});
test('internal and buyer delivery markers are independent', async () => {
    const f = fixture();
    let attempts = 0;
    const fetcher: typeof fetch = async () => Response.json({ id: `message-${++attempts}` });
    await deliverPaymentEmail({ ...f.input, purpose: 'pro-kit:internal', fetcher });
    await deliverPaymentEmail({ ...f.input, fetcher });
    assert.equal(f.rows.size, 2);
    assert.equal(attempts, 2);
});
test('missing provider key or malformed acceptance cannot mark receipt sent', async () => {
    const f = fixture();
    await assert.rejects(deliverPaymentEmail({ ...f.input, apiKey: '' }), /not configured/);
    await assert.rejects(deliverPaymentEmail({ ...f.input, fetcher: async () => Response.json({}) }), /not accepted/);
    assert.equal([...f.rows.values()][0].sent_at, undefined);
});
