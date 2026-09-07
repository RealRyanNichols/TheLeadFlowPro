import { test } from "node:test";
import assert from "node:assert/strict";
import { PRO_TOOLS, getProTool } from "../lib/tools/pro/index.ts";
import { valuesFor } from "../lib/tools/pro/render.ts";
import { parseServices, roundPrice } from "../lib/tools/pro/kits/rate-card-kit.ts";
import { parseEstimateLines } from "../lib/tools/pro/kits/job-estimate-kit.ts";
import type { Values } from "../lib/tools/types.ts";
function run(slug: string, values: Values = {}) { const kit = getProTool(slug)!; return kit.run(valuesFor(kit, values)); }
function document(slug: string, id: string, values: Values = {}) { const result = run(slug, values); const doc = result.documents?.find(d => d.id === id); assert.ok(doc, `${slug} ${id}`); return doc.body; }
for (const [cost, expected] of [[100, 100], [100.01, 105], [102, 105], [104.99, 105], [0, 5]])
    test(`rate card never prices ${cost} below the required cost`, () => assert.equal(roundPrice(cost), expected));
test("rate card rejects negative, letter-contaminated and nonfinite hours", () => {
    const result = parseServices("Bad negative | -2 | 10\nBad letters | 2oops | 10\nBad infinity | Infinity | 10\nGood | 1.5 | $1,200.25");
    assert.equal(result.bad.length, 3);
    assert.deepEqual(result.services, [{ name: "Good", hours: 1.5, materials: 1200.25 }]);
});
test("rate-card price in customer card and internal sheet includes the same labor and material markup", () => {
    // ($60,000 / .75 + $16,000) / (48 * 40 * .5) = $100/hour.
    // 1.25hr * $100 + $80 materials *1.15 = $217 -> round UP $220.
    const values = { take: 60000, overhead: 16000, weeks: 48, hours: 40, billable: 50, tax: 25, services: "Service | 1.25 | 80", matMarkup: 15 };
    const r = run("rate-card-kit", values);
    assert.equal(r.headline?.value, "$100.00");
    for (const d of (r.documents ?? []).filter(d => /rate|worksheet/.test(d.id)))
        assert.match(d.body, /\$220/);
});
test("estimate split uses actual cents and matches printed deposit and remaining balance", () => {
    // 10.01 + 0.04 =10.05; 8.25% tax rounds .83; total10.88; 35% rounds3.81; remaining7.07.
    const v = { lines: "First | 5.00 | 10.01\nSecond | 0.01 | 0.04", taxRate: 8.25, deposit: 35 };
    const r = run("job-estimate-kit", v);
    assert.equal(r.headline?.value, "$10.88");
    assert.match(r.headline?.sub ?? "", /\$3\.81 deposit, \$7\.07/);
    assert.equal(r.stats?.find(s => s.label === 'Subtotal')?.value, '$10.05');
    assert.equal(r.stats?.find(s => s.label === 'Sales tax')?.value, '$0.83');
    for (const id of ['estimate', 'invoice']) {
        const body = document('job-estimate-kit', id, v);
        for (const amount of ['$10.88', '$3.81', '$7.07'])
            assert.ok(body.includes(amount), `${id} lacks ${amount}`);
    }
});
test("half-cent deposits reconcile exactly rather than rounding both halves up", () => {
    const r = run('job-estimate-kit', { lines: 'Small line | 0.05', taxRate: 0, deposit: 50 });
    assert.equal(r.headline?.value, '$0.05');
    assert.match(r.headline?.sub ?? '', /\$0\.03 deposit, \$0\.02/);
});
test("estimate rejects empty or fractional-cent prices rather than silently interpreting them as zero", () => {
    const parsed = parseEstimateLines('Blank | \nToo precise | 1.005\nGood | 1.01');
    assert.equal(parsed.bad.length, 2);
    assert.equal(parsed.lines[0].price, 1.01);
});
for (const [current, goal, total, needed] of [[4.2, 4.6, 10, 10], [4.3, 4.8, 47, 118], [4.5, 4.8, 20, 30], [4.9, 4.8, 20, 0], [5, 4.8, 0, 1]])
    test(`review target ${current}/${goal}/${total} uses ${needed} new reviews`, () => {
        const r = run('google-review-kit', { current, goal, total });
        assert.equal(r.headline?.value, needed === 0 ? '4.9' : String(needed));
    });
test("review weekly CSV increments sum to cumulative total when volume is fractional", () => {
    const text = document('google-review-kit', 'plan', { current: 4.3, total: 47, weekly: 1, yesRate: 5 });
    const rows = text.split('\r\n').slice(1).map(l => l.replace(/^"|"$/g, '').split('","'));
    let total = 47;
    for (const row of rows) {
        total += Number(row[3]);
        assert.equal(Number(row[4]), total);
    }
    assert.equal(total, 48);
});
test("quote lift cannot project more paid jobs than all available quotes", () => {
    const r = run('quote-follow-up-kit', { quotes: 10, value: 1000, closeNow: 90, lift: 40, margin: 50 });
    assert.equal(r.headline?.value, '$12,000');
    assert.match(r.headline?.sub ?? '', /\$6,000/);
});
test("missed-call response promise preserves 90 minutes in every script", () => {
    const body = document('missed-call-text-back-kit', 'messages', { promise: 90 });
    assert.match(body, /90 minutes/);
    assert.doesNotMatch(body, /inside 2 hours/);
});
test("missed-call yearly, monthly and per-call numbers have independent expected values", () => {
    const r = run('missed-call-text-back-kit', { missed: 5, closeRate: 20, ticket: 150, repeats: 2 });
    //150*3*.2=90/call; 5calls=450/week;52weeks=23400;12months=1950.
    assert.equal(r.headline?.value, '$23,400');
    assert.match(r.headline?.sub ?? '', /\$1,950 a month/);
    assert.match(r.headline?.sub ?? '', /\$90\.00 per unanswered ring/);
});
for (const kit of PRO_TOOLS)
    test(`${kit.slug} returns usable full documents without invalid numeric output`, () => {
        const r = run(kit.slug);
        assert.ok((r.documents?.length ?? 0) > 0);
        for (const d of r.documents ?? []) {
            assert.ok(d.body.length > 30);
            assert.doesNotMatch(d.body, /\b(?:NaN|Infinity)\b/);
        }
    });

test("review kit refuses unsupported fractional slider steps instead of rounding a different goal", () => {
    const result = run("google-review-kit", { current: 4.3, goal: 4.75, total: 20 });
    assert.equal(result.headline?.value, "Check inputs");
    assert.equal(result.documents, undefined);
});
