import assert from "node:assert/strict";
import test from "node:test";
import {
  createMetaDailyEnrollment, readMetaDailyEnrollment, hasMetaDailyEnrollment,
  hasMetaDailyDuplicateHold, stripMetaDailyEnrollment, metaDailyEnrollmentFingerprint,
} from "../lib/metaDailyEnrollment";
import { isMetaSalesDailySeriesLead, metaSalesDailyAnchor } from "../lib/metaSalesDailySeries";

const enrollment = createMetaDailyEnrollment("2026-10-08T18:00:00Z", "123456789");
const diagnostic = { form_id: "verified-old-form", meta_daily30: enrollment };
const lead = { source: "facebook-lead-ad", created_at: "2026-01-01T00:00:00Z", marketing_email_consent: true, diagnostic };

test("trusted enrollment is canonical and public diagnostics strip both reserved keys", () => {
  assert.ok(enrollment);
  assert.equal(enrollment.enrolled_at, "2026-10-08T18:00:00.000Z");
  assert.equal(readMetaDailyEnrollment(diagnostic), enrollment);
  assert.deepEqual(stripMetaDailyEnrollment({ ...diagnostic, other: { keep: true }, meta_daily30_duplicate_of: "canonical" }), { form_id: "verified-old-form", other: { keep: true } });
  for (const id of ["", "abc", "123/456"]) assert.equal(createMetaDailyEnrollment("2026-10-08T18:00:00Z", id), null);
  assert.equal(createMetaDailyEnrollment("invalid", "123"), null);
  for (const value of [null, [], "invalid"]) assert.deepEqual(stripMetaDailyEnrollment(value), {});
});

test("invalid marker presence and malformed duplicate holds fail closed", () => {
  for (const marker of [null, {}, { ...enrollment, version: 2 }, { ...enrollment, source: "website" }, { ...enrollment, meta_lead_id: "bad" }, { ...enrollment, enrolled_at: "2026-10-08T18:00:00Z" }]) {
    const d = { meta_daily30: marker };
    assert.equal(hasMetaDailyEnrollment(d), true);
    assert.equal(readMetaDailyEnrollment(d), null);
    assert.equal(isMetaSalesDailySeriesLead({ ...lead, diagnostic: d }), false);
  }
  assert.equal(hasMetaDailyDuplicateHold({ meta_daily30_duplicate_of: null }), true);
  assert.equal(isMetaSalesDailySeriesLead({ ...lead, diagnostic: { ...diagnostic, meta_daily30_duplicate_of: "canonical" } }), false);
});

test("enrollment anchors old canonical sources without resetting accepted legacy history", () => {
  for (const source of ["meta_lead_ad", "facebook-lead-ad", "website"]) {
    assert.equal(isMetaSalesDailySeriesLead({ ...lead, source }, [{ step: 105, delivery_status: "sent" }, { step: 601, delivery_status: "sent" }]), true);
  }
  assert.equal(metaSalesDailyAnchor(lead), enrollment!.enrolled_at);
  for (const delivery_status of ["pending", "failed", undefined]) {
    assert.equal(isMetaSalesDailySeriesLead(lead, [{ step: 105, delivery_status }]), false);
  }
  assert.equal(isMetaSalesDailySeriesLead(lead, [{ step: 801, delivery_status: "pending" }]), true);
  assert.equal(isMetaSalesDailySeriesLead({ ...lead, marketing_email_consent: false }), false);
});

test("final-check fingerprint ignores unrelated diagnostics but detects every marker transition", () => {
  const baseline = metaDailyEnrollmentFingerprint(diagnostic);
  assert.equal(metaDailyEnrollmentFingerprint({ other: "changed", meta_daily30: { source: "facebook_lead_ads", meta_lead_id: "123456789", enrolled_at: enrollment!.enrolled_at, campaign: "meta_sales_daily30_v1", version: 1 } }), baseline);
  assert.notEqual(metaDailyEnrollmentFingerprint({}), baseline);
  assert.notEqual(metaDailyEnrollmentFingerprint({ ...diagnostic, meta_daily30: { ...enrollment, enrolled_at: "2026-10-09T18:00:00.000Z" } }), baseline);
  assert.notEqual(metaDailyEnrollmentFingerprint({ ...diagnostic, meta_daily30_duplicate_of: "canonical" }), baseline);
});
