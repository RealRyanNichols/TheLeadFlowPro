import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { SCOREBOARD_BUSINESSES, emptyTotals, shiftDay, type ScoreboardDay } from "../lib/scoreboard.ts";
import { aggregateMetric, hasCompleteWindow, METRIC_GUIDES, metricGuide, metricPath, tracksMetric, type MetricFeed } from "../lib/scoreboardMetrics.ts";

const today = "2026-09-06";
function days(count: number, values: Partial<ScoreboardDay> = {}) {
  return Array.from({ length: count }, (_, i) => ({ day: shiftDay(today, i - count + 1), ...emptyTotals(), ...values }));
}
function feed(index: number, rows = days(30)): MetricFeed {
  return { business: SCOREBOARD_BUSINESSES[index], result: { ok: true, days: rows, fetchedAt: "2026-09-06T18:20:17.000Z" } };
}

describe("public metric aggregation", () => {
  it("sums the same Central calendar window across businesses, without including future records", () => {
    const result = aggregateMetric([feed(0, [...days(30, { views: 2 }), { ...emptyTotals(), day: "2026-09-07", views: 9999 }]), feed(1, days(30, { views: 3 }))], "views", 7, today);
    assert.equal(result.total, 35);
    assert.equal(result.reporting, 2);
    assert.equal(result.complete, true);
    assert.deepEqual(result.series.map(({ value }) => value), Array(7).fill(5));
  });
  it("uses an explicit zero from a complete feed as real zero", () => {
    const result = aggregateMetric([feed(0)], "calls", 30, today);
    assert.equal(result.total, 0);
    assert.equal(result.series[0].value, 0);
    assert.equal(result.complete, true);
  });
  it("keeps unavailable data distinct from zero and labels partial coverage", () => {
    const failed: MetricFeed = { business: SCOREBOARD_BUSINESSES[1], result: { ok: false, reason: "offline" } };
    const partial = aggregateMetric([feed(0, days(30, { leads: 2 })), failed], "leads", 30, today);
    assert.equal(partial.total, 60);
    assert.equal(partial.reporting, 1);
    assert.equal(partial.expected, 2);
    assert.equal(partial.complete, false);
    const missing = aggregateMetric([failed], "leads", 30, today);
    assert.equal(missing.total, null);
    assert.ok(missing.series.every(({ value }) => value === null));
  });
  it("excludes a feed with a missing day from the entire comparison window", () => {
    const incomplete = feed(1, days(29, { clicks: 999 }));
    const result = aggregateMetric([feed(0, days(30, { clicks: 1 })), incomplete], "clicks", 30, today);
    assert.equal(result.total, 30);
    assert.equal(result.reporting, 1);
    assert.equal(result.complete, false);
    assert.equal(hasCompleteWindow(days(29), 30, today), false);
    assert.equal(hasCompleteWindow(days(30), 30, today), true);
  });
  it("does not present a hardcoded unmeasured source field as an observed zero", () => {
    assert.equal(tracksMetric(SCOREBOARD_BUSINESSES[2], "calls"), false);
    assert.equal(tracksMetric(SCOREBOARD_BUSINESSES[2], "paid_leads"), false);
    const result = aggregateMetric([feed(0, days(30, { calls: 1 })), feed(2)], "calls", 30, today);
    assert.equal(result.total, 30);
    assert.equal(result.expected, 1);
    assert.equal(result.unsupported, 1);
    assert.equal(aggregateMetric([feed(2)], "paid_leads", 30, today).total, null);
  });
  it("keeps visitor-days additive rather than claiming unique people", () => {
    assert.equal(aggregateMetric([feed(0, days(30, { visitors: 1 })), feed(1, days(30, { visitors: 1 }))], "visitors", 30, today).total, 60);
    assert.match(metricGuide("daily-visitors")!.title, /summed/);
  });
  it("offers eight unique public routes and does not expose sales as an aggregate metric", () => {
    assert.equal(METRIC_GUIDES.length, 8);
    assert.equal(new Set(METRIC_GUIDES.map(({ slug }) => slug)).size, 8);
    assert.equal(metricGuide("anything-else"), null);
    assert.equal(metricPath("sales"), null);
    for (const guide of METRIC_GUIDES) {
      assert.equal(metricPath(guide.key), `/scoreboard/metrics/${guide.slug}`);
      assert.ok(guide.steps.length >= 3);
      assert.match(guide.prompt, /\[/);
    }
  });
});
