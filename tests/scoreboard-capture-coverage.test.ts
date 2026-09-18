import assert from "node:assert/strict";
import test from "node:test";
import { normalizeCaptureCoverage } from "../lib/scoreboardCaptureCoverage";

const slug = "premier-dental-academy-of-longview";
const raw = ["leads", "subscribers", "enrollment_forms"].map((source) => ({ source, records: "78", additional_emails: "2", start_day: "2026-08-08", end_day: "2026-09-06" }));
const parse = (rows: unknown) => normalizeCaptureCoverage(rows, slug, 30, "2026-09-06");

test("capture coverage preserves separate record and additional email counts", () => {
  const rows = parse(raw);
  assert.equal(rows?.length, 3);
  assert.equal(rows?.[1].records, 78);
  assert.equal(rows?.[1].additional_emails, 2);
});

test("capture coverage fails closed for missing, stale, unknown or impossible counts", () => {
  assert.equal(parse(raw.slice(0, 2)), null);
  assert.equal(parse(raw.map((r) => ({ ...r, end_day: "2026-09-05" }))), null);
  assert.equal(parse([raw[0], raw[1], { ...raw[2], source: "private_notes" }]), null);
  assert.equal(parse(raw.map((r) => ({ ...r, additional_emails: 79 }))), null);
  assert.equal(parse(raw.map((r) => ({ ...r, records: null }))), null);
  assert.equal(parse([raw[0], raw[0], raw[2]]), null);
});

const lfpSlug = "the-leadflow-pro";
const lfpSources = ["ad_lead_forms", "phone_line", "website_forms", "other_leads", "event_registrations"];
const lfpRaw = lfpSources.map((source) => ({ source, records: "46", additional_emails: "0", start_day: "2026-08-19", end_day: "2026-09-17" }));
const parseLfp = (rows: unknown) => normalizeCaptureCoverage(rows, lfpSlug, 30, "2026-09-17");

test("the leadflow pro capture coverage accepts its own five sources in map order", () => {
  const rows = parseLfp(lfpRaw);
  assert.equal(rows?.length, 5);
  assert.deepEqual(rows?.map((row) => row.source), lfpSources);
  assert.equal(rows?.[4].records, 46);
});

test("the leadflow pro capture coverage fails closed on a missing or foreign source", () => {
  assert.equal(parseLfp(lfpRaw.slice(0, 4)), null);
  assert.equal(parseLfp([...lfpRaw.slice(0, 4), { ...lfpRaw[4], source: "operator_prospects" }]), null);
  assert.equal(parseLfp(lfpRaw.map((r) => ({ ...r, end_day: "2026-09-16" }))), null);
  assert.equal(parseLfp(lfpRaw.map((r) => ({ ...r, additional_emails: "47" }))), null);
});
