import { describe, it } from "node:test";
import assert from "node:assert/strict";
import {
  SCOREBOARD_BUSINESSES,
  SCOREBOARD_METRICS,
  buildWindows,
  normalizeDays,
  recentSeries,
  shiftDay,
  summarizeWindow,
} from "../lib/scoreboard.ts";

const rows = normalizeDays([
  { day: "2026-09-01", views: "10", visitors: 4, clicks: 1, leads: 2, paid_leads: 1, unpaid_leads: 1, calls: 0, forms: 1, sales: 0 },
  { day: "2026-09-02T00:00:00", views: 5, visitors: 3, clicks: 0, leads: 1, paid_leads: 0, unpaid_leads: 1, calls: 1, forms: 0, sales: 1 },
  { day: "not a day", views: 999 },
  null,
]);

describe("scoreboard helpers", () => {
  it("normalizes feed rows, drops junk, and sorts by day", () => {
    assert.equal(rows.length, 2);
    assert.deepEqual(rows.map((row) => row.day), ["2026-09-01", "2026-09-02"]);
    assert.equal(rows[0].views, 10);
    assert.equal(rows[1].sales, 1);
  });

  it("sums a calendar window ending today and ignores days outside it", () => {
    const today = "2026-09-02";
    const todayOnly = summarizeWindow(rows, 1, today);
    assert.equal(todayOnly.views, 5);
    assert.equal(todayOnly.calls, 1);
    const week = summarizeWindow(rows, 7, today);
    assert.equal(week.views, 15);
    assert.equal(week.leads, 3);
    assert.equal(week.paid_leads + week.unpaid_leads, week.leads);
    const before = summarizeWindow(rows, 1, "2026-08-31");
    assert.equal(before.views, 0);
  });

  it("builds the four public windows", () => {
    const windows = buildWindows(rows, "2026-09-02");
    assert.deepEqual(windows.map((window) => window.key), ["today", "7d", "30d", "90d"]);
    assert.equal(windows[2].totals.views, 15);
  });

  it("returns a dense recent series with zero rows for missing days", () => {
    const series = recentSeries(rows, 4, "2026-09-02");
    assert.deepEqual(series.map((row) => row.day), ["2026-08-30", "2026-08-31", "2026-09-01", "2026-09-02"]);
    assert.equal(series[0].views, 0);
    assert.equal(series[3].views, 5);
  });

  it("shifts days across month boundaries", () => {
    assert.equal(shiftDay("2026-09-01", -1), "2026-08-31");
    assert.equal(shiftDay("2026-12-31", 1), "2027-01-01");
  });

  it("never publishes money and never invents a feed", () => {
    for (const business of SCOREBOARD_BUSINESSES) {
      // Only Ryan's own media company shows a sales count (its book case study).
      // Every client board stays sales-off until Ryan approves it by name.
      assert.equal(
        business.showSales,
        business.slug === "realryannichols",
        `${business.slug} must not show sales until Ryan approves`,
      );
      if (business.feed.kind === "supabase") {
        assert.match(business.feed.url, /^https:\/\/[a-z]+\.supabase\.co$/);
        assert.match(business.feed.publishableKey, /^sb_publishable_/);
      }
    }
    const headline = SCOREBOARD_METRICS.filter((metric) => metric.headline).map((metric) => metric.key);
    assert.deepEqual(headline, ["views", "clicks", "leads", "paid_leads", "unpaid_leads"]);
    for (const metric of SCOREBOARD_METRICS) {
      assert.doesNotMatch(metric.what, /guarantee|revenue|\$/i);
      assert.match(metric.move.href, /^\//);
    }
  });
});

// Missing or malformed values must not become invented zeroes on a public board.
it("rejects incomplete, negative and duplicate aggregate rows", () => {
  const good = { ...rows[0] };
  assert.deepEqual(normalizeDays([{ day: "2026-09-01", views: 10 }]), []);
  assert.deepEqual(normalizeDays([{ ...good, leads: -1 }]), []);
  assert.deepEqual(normalizeDays([{ ...good, leads: null }]), []);
  assert.equal(normalizeDays([good, good]).length, 1);
});
