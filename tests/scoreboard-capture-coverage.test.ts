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
