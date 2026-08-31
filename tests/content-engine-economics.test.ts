import assert from "node:assert/strict";
import test from "node:test";
import { estimateContentRevenue } from "../lib/contentEngineMath.ts";

test("Content Engine planning math keeps every assumption visible", () => {
  const result = estimateContentRevenue({
    qualifiedViews: 5000,
    visitRatePercent: 2,
    buyerRatePercent: 5,
    orderValue: 127,
  });

  assert.equal(result.pageVisits, 100);
  assert.equal(result.buyers, 5);
  assert.equal(result.revenue, 635);
});

test("Content Engine planning math fails closed on invalid inputs", () => {
  const result = estimateContentRevenue({
    qualifiedViews: Number.NaN,
    visitRatePercent: -3,
    buyerRatePercent: Number.POSITIVE_INFINITY,
    orderValue: -127,
  });

  assert.deepEqual(result, { pageVisits: 0, buyers: 0, revenue: 0 });
});

test("Content Engine planning math will not treat more than 100 percent as possible", () => {
  const result = estimateContentRevenue({
    qualifiedViews: 100,
    visitRatePercent: 250,
    buyerRatePercent: 150,
    orderValue: 10,
  });

  assert.deepEqual(result, { pageVisits: 100, buyers: 100, revenue: 1000 });
});
