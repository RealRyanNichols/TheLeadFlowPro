import assert from "node:assert/strict";
import test from "node:test";
import { PLAN_DISCLAIMER, jobsMath, parseCount, parseDollars, planRows } from "../lib/commandCenterPlan.ts";
import { ACQUISITION_PLANNING_TARGETS, MANAGED_COMMERCIAL_TERMS } from "../lib/site/managedPlans.ts";
import { PRICES } from "../lib/site/prices.ts";

// Plan and call: the arithmetic for the second call, from the owner's
// planning rates. These are the pricing page's numbers; the test pins the
// sheet to them so a price change cannot leave the board behind.

test("planRows are the pricing page's planning targets against the base campaign", () => {
  const rows = planRows();
  assert.equal(rows.length, ACQUISITION_PLANNING_TARGETS.length);
  const farm = rows.find((r) => r.rateUsd === PRICES.farmAcquiredJobPlanningTarget);
  assert.ok(farm, "the farm/ag planning rate is on the sheet");
  assert.equal(farm.outcomesAtBase, Math.floor(MANAGED_COMMERCIAL_TERMS.startingUpfrontUsd / PRICES.farmAcquiredJobPlanningTarget));
  assert.equal(farm.fiveMoreUsd, 5 * PRICES.farmAcquiredJobPlanningTarget);
  const property = rows.find((r) => r.rateUsd === PRICES.propertyCompletedDealPlanningTarget);
  assert.ok(property, "the real estate planning rate is on the sheet");
  assert.equal(property.outcomesAtBase, Math.floor(MANAGED_COMMERCIAL_TERMS.startingUpfrontUsd / PRICES.propertyCompletedDealPlanningTarget));
  for (const row of rows) {
    assert.ok(row.industry && row.outcome, "every row names its industry and the counted outcome");
    assert.ok(row.rateUsd > 0);
  }
});

test("jobsMath: the base covers its jobs; more jobs add the rate each; profit per job gives the contribution at target", () => {
  const base = MANAGED_COMMERCIAL_TERMS.startingUpfrontUsd;
  const rate = PRICES.farmAcquiredJobPlanningTarget;
  const atBase = jobsMath({ jobs: Math.floor(base / rate), rateUsd: rate });
  assert.equal(atBase.investmentUsd, base, "the base is the floor");
  assert.equal(atBase.jobsAtBase, Math.floor(base / rate));
  assert.equal(atBase.contributionUsd, null, "no profit figure, no contribution");
  const more = jobsMath({ jobs: Math.floor(base / rate) + 5, rateUsd: rate, profitPerJobUsd: 2_000 });
  assert.equal(more.investmentUsd, base + 5 * rate);
  assert.equal(more.contributionUsd, more.jobs * 2_000 - more.investmentUsd);
  const few = jobsMath({ jobs: 1, rateUsd: rate, profitPerJobUsd: 100 });
  assert.equal(few.investmentUsd, base, "one job still costs the base campaign");
  assert.equal(few.contributionUsd, 100 - base, "a negative contribution is shown, not hidden");
  // Junk is clamped, never thrown.
  const junk = jobsMath({ jobs: 0, rateUsd: 0, profitPerJobUsd: Number.NaN });
  assert.equal(junk.jobs, 1);
  assert.equal(junk.rateUsd, 1);
  assert.equal(junk.profitPerJobUsd, null);
});

test("parseCount and parseDollars take the query string as typed and clamp it", () => {
  assert.equal(parseCount("15", 3, 1, 500), 15);
  assert.equal(parseCount(["20", "9"], 3, 1, 500), 20);
  assert.equal(parseCount("900", 3, 1, 500), 500);
  assert.equal(parseCount("-4", 3, 1, 500), 1);
  assert.equal(parseCount("fifteen", 3, 1, 500), 3);
  assert.equal(parseCount(undefined, 3, 1, 500), 3);
  assert.equal(parseDollars("$2,500", 1, 1_000_000), 2500);
  assert.equal(parseDollars(" 499.6 ", 1, 1_000_000), 500);
  assert.equal(parseDollars("", 1, 1_000_000), null);
  assert.equal(parseDollars(undefined, 1, 1_000_000), null);
  assert.equal(parseDollars("lots", 1, 1_000_000), null);
  assert.equal(parseDollars("0", 1, 1_000_000), 1);
  assert.equal(parseDollars("99999999", 1, 1_000_000), 1_000_000);
});

test("the disclaimer says planning, not promise, and what a counted job is", () => {
  assert.match(PLAN_DISCLAIMER, /not measured results and not a promise/);
  assert.match(PLAN_DISCLAIMER, /signed or paid jobs and completed deals, never leads or appointments/);
});
