import assert from "node:assert/strict";
import { createRequire } from "node:module";
import fs from "node:fs";
import test from "node:test";

const require = createRequire(import.meta.url);
const { analyzeAdsBrain } = require("../deploy/ads-brain/logic.cjs") as {
  analyzeAdsBrain: (meta: Record<string, unknown>, leads: Record<string, unknown>, now: Date) => any;
};

const leads = {
  totals: { total: 12, d7: 3, d30: 12, uncontacted: 2, proposal: 1, won: 0 },
  statuses: [], campaigns: [], forms: [], daily: [],
};

test("observer keeps spend locked and raises a critical alert if Meta still reports active ads", () => {
  const result = analyzeAdsBrain({
    ok: true,
    identity: { adAccountId: "1637329904238602" },
    campaigns: [{ id: "c1", name: "Campaign", effective_status: "ACTIVE" }],
    ads: [{ id: "a1", name: "Ad", campaign_id: "c1", effective_status: "ACTIVE" }],
    forms: [], insights: [], account: { account_id: "1637329904238602" },
  }, leads, new Date("2026-09-24T12:00:00Z"));
  assert.equal(result.hard_stops.mode, "observe_only");
  assert.equal(result.hard_stops.spend_lock, true);
  assert.equal(result.hard_stops.mutate_campaigns, false);
  assert.ok(result.alerts.some((alert: { key: string }) => alert.key === "ads_delivery_active"));
  assert.ok(result.alerts.some((alert: { key: string }) => alert.key === "meta_leads_uncontacted"));
});

test("observer rejects any foreign ad account", () => {
  const result = analyzeAdsBrain({
    ok: true,
    identity: { adAccountId: "924465906541446" },
    campaigns: [], ads: [], forms: [], insights: [], account: {},
  }, leads, new Date("2026-09-24T12:00:00Z"));
  assert.equal(result.identity.match, false);
  assert.ok(result.alerts.some((alert: { key: string }) => alert.key === "foreign_ad_account"));
});

test("observer reports a disconnected Meta source without losing CRM analysis", () => {
  const result = analyzeAdsBrain({ ok: false, error: "read access missing" }, leads, new Date("2026-09-24T12:00:00Z"));
  assert.equal(result.meta.connected, false);
  assert.equal(result.leads.totals.total, 12);
  assert.ok(result.alerts.some((alert: { key: string }) => alert.key === "meta_reporting_disconnected"));
});

test("observer keeps account reporting connected when only Page form inventory is unavailable", () => {
  const result = analyzeAdsBrain({
    ok: true,
    identity: { adAccountId: "1637329904238602" },
    campaigns: [], ads: [], forms: [], insights: [], account: { account_id: "1637329904238602" },
    form_access: { connected: false, error: "Page access token required" },
  }, leads, new Date("2026-09-24T12:00:00Z"));
  assert.equal(result.meta.connected, true);
  assert.equal(result.meta.form_access.connected, false);
  assert.ok(result.alerts.some((alert: { key: string }) => alert.key === "meta_form_reporting_limited"));
  assert.ok(!result.alerts.some((alert: { key: string }) => alert.key === "meta_reporting_disconnected"));
});

test("private dashboard never presents disconnected delivery or spend as zero", () => {
  const dashboard = fs.readFileSync(new URL("../deploy/ads-brain/public/ads.html", import.meta.url), "utf8");
  assert.match(dashboard, /m\.connected\?num\(\(m\.active_ads\|\|\[\]\)\.length\):'Unknown'/);
  assert.match(dashboard, /m\.connected\?money\(seven\.spend\):'Unavailable'/);
  assert.match(dashboard, /Cannot verify delivery until ads_read is connected/);
});
