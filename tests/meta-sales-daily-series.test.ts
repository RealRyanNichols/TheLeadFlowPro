import assert from "node:assert/strict";
import test from "node:test";
import {
  isMetaSalesDailySeriesLead,
  META_SALES_DAILY_FIRST_STEP,
  META_SALES_DAILY_LAST_STEP,
  META_SALES_DAILY_STEPS,
  metaSalesDailyAgeInDays,
  metaSalesDailyNewSendAllowed,
  metaSalesDailyStepsDueBy,
  renderMetaSalesDailyStep,
} from "../lib/metaSalesDailySeries";

const HOUR = 3600_000;
const capture = {
  source: "meta_lead_ad", created_at: "2026-10-08T12:00:00.000Z",
  marketing_email_consent: true, diagnostic: { form_id: "2084381329108926" },
};

test("daily selector admits the approved cutoff and only unclaimed or own-version history", () => {
  assert.equal(isMetaSalesDailySeriesLead(capture), true);
  assert.equal(isMetaSalesDailySeriesLead({ ...capture, created_at: "2026-10-08T11:59:59.999Z" }), false);
  assert.equal(isMetaSalesDailySeriesLead({ ...capture, created_at: "invalid" }), false);
  assert.equal(isMetaSalesDailySeriesLead({ ...capture, source: "website" }), false);
  assert.equal(isMetaSalesDailySeriesLead({ ...capture, marketing_email_consent: false }), false);
  assert.equal(isMetaSalesDailySeriesLead({ ...capture, diagnostic: { form_id: "unknown" } }), false);
  for (const step of [0, 101, 105, 501, 601, 701, 709, 700, 831]) {
    assert.equal(isMetaSalesDailySeriesLead(capture, [{ step }]), false, `keep step ${step} in its original cohort`);
  }
  assert.equal(isMetaSalesDailySeriesLead(capture, [{ step: 801 }, { step: 830 }]), true);
});

test("daily age follows Chicago dates across midnight and DST rather than elapsed24h", () => {
  assert.equal(metaSalesDailyAgeInDays("2026-10-09T04:59:00Z", Date.parse("2026-10-09T05:00:00Z")), 1);
  assert.equal(metaSalesDailyAgeInDays("2026-11-01T05:00:00Z", Date.parse("2026-11-02T06:00:00Z")), 1);
  assert.equal(metaSalesDailyAgeInDays("2027-03-14T06:00:00Z", Date.parse("2027-03-15T05:00:00Z")), 1);
  assert.equal(metaSalesDailyAgeInDays("2026-10-08T18:00:00Z", Date.parse("2026-10-09T12:00:00Z")), 1);
  for (const value of [null, "invalid", undefined]) assert.equal(Number.isNaN(metaSalesDailyAgeInDays(value)), true);
  assert.equal(Number.isNaN(metaSalesDailyAgeInDays(capture.created_at, Number.NaN)), true);
  assert.equal(Number.isNaN(metaSalesDailyAgeInDays(capture.created_at, 1e20)), true);
});

test("daily gating permits a slightly earlier next morning but blocks same-date and sub20h bursts", () => {
  const first = Date.parse("2026-10-09T12:00:05Z");
  assert.equal(metaSalesDailyNewSendAllowed(first, Date.parse("2026-10-10T12:00:00Z")), true);
  assert.equal(metaSalesDailyNewSendAllowed(first, first + 7 * HOUR), false);
  // 00:01 and20:02 on the same Chicago date remain one slot even after20h.
  assert.equal(metaSalesDailyNewSendAllowed(Date.parse("2026-10-10T05:01:00Z"), Date.parse("2026-10-11T01:02:00Z")), false);
  const late = Date.parse("2026-10-10T00:00:00Z"); // Oct9 7PM CDT
  assert.equal(metaSalesDailyNewSendAllowed(late, Date.parse("2026-10-10T12:00:00Z")), false);
  assert.equal(metaSalesDailyNewSendAllowed(late, Date.parse("2026-10-10T20:00:00Z")), true);
  assert.equal(metaSalesDailyNewSendAllowed(undefined, first), true);
  assert.equal(metaSalesDailyNewSendAllowed(Number.NaN, first), false);
  assert.equal(metaSalesDailyNewSendAllowed(undefined, 1e20), false);
});

test("daily content provides exactly thirty distinct steps and finite calendar slots", () => {
  assert.equal(META_SALES_DAILY_STEPS.length, 30);
  assert.deepEqual(META_SALES_DAILY_STEPS.map((row) => row.day), Array.from({ length: 30 }, (_, i) => i + 1));
  assert.deepEqual(META_SALES_DAILY_STEPS.map((row) => row.step), Array.from({ length: 30 }, (_, i) => META_SALES_DAILY_FIRST_STEP + i));
  assert.equal(META_SALES_DAILY_LAST_STEP, 830);
  assert.equal(new Set(META_SALES_DAILY_STEPS.map((row) => row.subject)).size, 30);
  assert.equal(metaSalesDailyStepsDueBy(0).length, 0);
  assert.equal(metaSalesDailyStepsDueBy(1).length, 1);
  assert.equal(metaSalesDailyStepsDueBy(30).length, 30);
  assert.equal(metaSalesDailyStepsDueBy(31).length, 0);
  assert.equal(metaSalesDailyStepsDueBy(Number.NaN).length, 0);
});

test("every daily body renders exact signed unsubscribe links without residual braces", () => {
  const signed = "https://www.theleadflowpro.com/api/unsubscribe?lead=fixture&sig=signed";
  for (const step of META_SALES_DAILY_STEPS) {
    const body = renderMetaSalesDailyStep(step, signed);
    assert.ok(step.html && step.text && step.subject);
    assert.ok(body.text.includes(signed));
    assert.ok(body.html.includes(signed.replaceAll("&", "&amp;")));
    assert.equal(/\{\{\{|UNSUBSCRIBE_LINK|%7B/i.test(body.html + body.text), false);
    assert.ok(body.html.includes("utm_campaign=meta_sales_daily30_v1"));
  }
});
