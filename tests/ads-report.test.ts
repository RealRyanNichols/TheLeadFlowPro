import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import test from "node:test";
import { ADS_DEFINITIONS, adsReportEmail, buildAdsWeeklyReport, platformForLead, usdCents } from "../lib/ads/report.ts";
import { SAMPLE_LABEL, SAMPLE_NOW, sampleAdsRows, sampleLeads, sampleWorkspace } from "../lib/ads/fixtures.ts";
import { fetchAdsDaily, googleProvider, liveProvidersEnabled, metaProvider, sandboxProvider } from "../lib/ads/providers.ts";
import { copyProblems } from "../lib/hq/copy.ts";
import { lead, workspace } from "./fixtures/hq.ts";

const BANNED = ["roas", "return on ad spend", "guarantee", "#1", "best in", "x return", "% increase", "ranked"];

function sample() {
  return buildAdsWeeklyReport({ workspace: sampleWorkspace(), rows: sampleAdsRows(), leads: sampleLeads(), now: SAMPLE_NOW });
}

test("money: spend per platform is the exact cent sum of the week's rows", () => {
  const r = sample();
  const rows = sampleAdsRows().filter((x) => x.date >= r.weekStart && x.date <= r.weekEnd);
  for (const p of r.platforms) {
    const expected = rows.filter((x) => x.platform === p.platform).reduce((s, x) => s + x.spend_cents, 0);
    assert.equal(p.spendCents, expected, p.platform);
    assert.ok(Number.isInteger(p.spendCents));
  }
  assert.equal(r.totalSpendCents, r.platforms.reduce((s, p) => s + p.spendCents, 0));
  assert.equal(usdCents(123456), "$1,234.56");
  assert.equal(usdCents(5, "CAD"), "0.05 CAD");
});

test("money: cost per lead divides spend by the client's own lead count, rounded to the cent, and is null with no leads", () => {
  const r = sample();
  const meta = r.platforms.find((p) => p.platform === "meta")!;
  assert.equal(meta.leads, 4);
  assert.equal(meta.costPerLeadCents, Math.round(meta.spendCents / 4));
  const google = r.platforms.find((p) => p.platform === "google")!;
  assert.equal(google.leads, 2);
  const none = buildAdsWeeklyReport({ workspace: sampleWorkspace(), rows: sampleAdsRows(), leads: [], now: SAMPLE_NOW });
  for (const p of none.platforms) assert.equal(p.costPerLeadCents, null);
  assert.ok(none.text.includes("n/a (no leads)"));
});

test("prior week comparison appears only when prior data exists", () => {
  const r = sample();
  const meta = r.platforms.find((p) => p.platform === "meta")!;
  assert.ok(meta.priorSpendCents !== null && meta.priorSpendCents > 0);
  assert.equal(meta.priorLeads, 2);
  const thisWeekOnly = sampleAdsRows().filter((x) => x.date >= r.weekStart);
  const noPrior = buildAdsWeeklyReport({ workspace: sampleWorkspace(), rows: thisWeekOnly, leads: sampleLeads().filter((l) => l.created_at >= `${r.weekStart}`), now: SAMPLE_NOW });
  for (const p of noPrior.platforms) {
    assert.equal(p.priorSpendCents, null);
    assert.equal(p.priorCostPerLeadCents, null);
  }
});

test("data isolation: rows or leads from another workspace are refused", () => {
  const ws = sampleWorkspace();
  const foreignRows = sampleAdsRows("ws-other");
  assert.throws(() => buildAdsWeeklyReport({ workspace: ws, rows: foreignRows, leads: [], now: SAMPLE_NOW }), /another workspace/);
  const foreignLead = { ...sampleLeads()[0], workspace_id: "ws-other" };
  assert.throws(() => buildAdsWeeklyReport({ workspace: ws, rows: [], leads: [foreignLead], now: SAMPLE_NOW }), /another workspace/);
});

test("the trace chain follows source → action → outcome from the client's own records and excludes spam and non-ad leads", () => {
  const r = sample();
  assert.equal(r.chain.leads, 6);
  assert.equal(r.chain.contacted, 5);
  assert.equal(r.chain.booked, 1);
  assert.equal(r.chain.won, 2);
  assert.equal(r.chain.wonValueCents, 480000, "only the won lead with a recorded value counts");
  assert.ok(!r.trace.some((t) => t.name === "Spam Bot"));
  assert.ok(!r.trace.some((t) => t.name === "Gray Nakamura"), "a phone lead is not an ad lead");
  const avery = r.trace.find((t) => t.name === "Avery Stone")!;
  assert.equal(avery.action, "Replied (instant text-back)");
  assert.equal(avery.outcome, "Won, $4,800.00 recorded");
  const drew = r.trace.find((t) => t.name === "Drew Patel")!;
  assert.equal(drew.action, "No reply yet");
});

test("platform attribution reads the client's own tagging and nothing else", () => {
  assert.equal(platformForLead(lead({ source: "meta" })), "meta");
  assert.equal(platformForLead(lead({ source: "website", meta: { utm_source: "google" } })), "google");
  assert.equal(platformForLead(lead({ source: "website", source_detail: "google ads" })), "google");
  assert.equal(platformForLead(lead({ source: "form", meta: { utm_source: "instagram" } })), "meta");
  assert.equal(platformForLead(lead({ source: "call" })), null);
  assert.equal(platformForLead(lead({ source: "website", source_detail: "organic" })), null);
});

test("exactly one recommended decision, and the rules fire in priority order", () => {
  const r = sample();
  assert.match(r.decision.headline, /^Answer the 1 ad lead still waiting/);

  const answered = sampleLeads().map((l) => (l.id === "s-4" ? { ...l, first_contact_at: l.created_at } : l));
  const r2 = buildAdsWeeklyReport({ workspace: sampleWorkspace(), rows: sampleAdsRows(), leads: answered, now: SAMPLE_NOW });
  assert.match(r2.decision.headline, /^Record the value on the 1 won ad lead/);

  const r3 = buildAdsWeeklyReport({ workspace: sampleWorkspace(), rows: sampleAdsRows(), leads: [], now: SAMPLE_NOW });
  assert.match(r3.decision.headline, /^Check lead tagging before judging the ads/);

  const r4 = buildAdsWeeklyReport({ workspace: sampleWorkspace(), rows: [], leads: [], now: SAMPLE_NOW });
  assert.match(r4.decision.headline, /^Keep the current setup/);
});

test("the report prints every definition, no ROAS or superlatives, and no lead phone numbers or emails", () => {
  const r = sample();
  const email = adsReportEmail(r);
  for (const d of ADS_DEFINITIONS) assert.ok(r.text.includes(`${d.term}:`), d.term);
  const lower = `${r.text} ${email.subject}`.toLowerCase();
  for (const b of BANNED) assert.ok(!lower.includes(b), b);
  assert.deepEqual(copyProblems(r.decision.headline + " " + r.decision.why), []);
  const leads = sampleLeads();
  for (const l of leads) {
    if (l.phone) assert.ok(!r.text.includes(l.phone));
    if (l.email) assert.ok(!r.text.includes(l.email));
  }
  assert.ok(email.subject.startsWith("Ads report for Fixture Fence Co"));
  assert.ok(email.text.includes("Nothing in it is estimated."));
});

test("the sample is labelled fictional and never uses The LeadFlow Pro's contact details", () => {
  assert.match(SAMPLE_LABEL, /fictional/);
  const text = JSON.stringify({ ws: sampleWorkspace(), leads: sampleLeads() });
  assert.ok(!text.includes("500-8898"));
  assert.ok(!text.includes("theleadflowpro.com"));
  assert.ok(sampleWorkspace().name.includes("fictional"));
});

test("providers: live calls are off by default and never echo the token", async () => {
  assert.equal(liveProvidersEnabled({}), false);
  assert.equal(liveProvidersEnabled({ ADS_LIVE_PROVIDERS: "1" }), false);
  assert.equal(liveProvidersEnabled({ ADS_LIVE_PROVIDERS: "true" }), true);
  const range = { start: "2026-09-07", end: "2026-09-13" };
  const off = await fetchAdsDaily({ workspaceId: "ws-1", platform: "meta", accountId: "act_1", token: "SECRET-TOKEN", range, env: {} });
  assert.deepEqual(off, { ok: false, code: "disabled", error: "Live ad platform calls are switched off on the server." });
  assert.ok(!JSON.stringify(off).includes("SECRET-TOKEN"));
  const g = await googleProvider({ workspaceId: "ws-1", platform: "google", accountId: "1-2-3", token: "SECRET-TOKEN", range, env: { ADS_LIVE_PROVIDERS: "true" } });
  assert.equal(g.ok, false);
  if (!g.ok) assert.equal(g.code, "not_configured");
  const noToken = await metaProvider({ workspaceId: "ws-1", platform: "meta", accountId: "act_1", token: null, range, env: { ADS_LIVE_PROVIDERS: "true" } });
  assert.equal(noToken.ok, false);
  if (!noToken.ok) assert.equal(noToken.code, "not_configured");
});

test("providers: the Meta adapter maps insights to cent rows for the right workspace and reports auth failures without the token", async () => {
  const range = { start: "2026-09-07", end: "2026-09-13" };
  const seen: string[] = [];
  const fetchImpl = (async (url: string | URL | Request, init?: RequestInit) => {
    seen.push(String(url));
    assert.equal((init?.headers as Record<string, string>).Authorization, "Bearer SECRET-TOKEN");
    return new Response(
      JSON.stringify({
        data: [
          { campaign_name: "Quotes", spend: "12.34", impressions: "500", clicks: "20", account_currency: "USD", date_start: "2026-09-08", actions: [{ action_type: "lead", value: "2" }] },
          { campaign_name: "Quotes", spend: "0", impressions: "0", clicks: "0", account_currency: "USD", date_start: "2026-09-09" },
        ],
      }),
      { status: 200 },
    );
  }) as typeof fetch;
  const r = await metaProvider({ workspaceId: "ws-9", platform: "meta", accountId: "123", token: "SECRET-TOKEN", range, env: { ADS_LIVE_PROVIDERS: "true" }, fetchImpl });
  assert.ok(r.ok);
  if (r.ok) {
    assert.equal(r.rows.length, 2);
    assert.deepEqual(r.rows[0], { workspace_id: "ws-9", platform: "meta", account_id: "act_123", campaign: "Quotes", date: "2026-09-08", spend_cents: 1234, currency: "USD", impressions: 500, clicks: 20, platform_leads: 2 });
    assert.ok(!JSON.stringify(r).includes("SECRET-TOKEN"));
  }
  assert.ok(seen[0].includes("act_123/insights"));
  const denied = await metaProvider({ workspaceId: "ws-9", platform: "meta", accountId: "act_123", token: "SECRET-TOKEN", range, env: { ADS_LIVE_PROVIDERS: "true" }, fetchImpl: (async () => new Response("{}", { status: 401 })) as typeof fetch });
  assert.equal(denied.ok, false);
  if (!denied.ok) {
    assert.equal(denied.code, "auth");
    assert.ok(!denied.error.includes("SECRET-TOKEN"));
  }
});

test("providers: the sandbox returns only the asked workspace, platform, and range", () => {
  const r = sandboxProvider({ workspaceId: "ws-x", platform: "google", range: { start: "2026-09-07", end: "2026-09-13" } });
  assert.ok(r.ok);
  if (r.ok) {
    assert.equal(r.rows.length, 7);
    assert.ok(r.rows.every((x) => x.workspace_id === "ws-x" && x.platform === "google"));
  }
});

test("the migration scopes both tables to a workspace with RLS and adds the two ad connection kinds", () => {
  const sql = readFileSync(join(process.cwd(), "supabase/migrations/20260917100000_hq_ads_reporting.sql"), "utf8");
  assert.ok(sql.includes("'meta_ads', 'google_ads'"));
  for (const table of ["hq_ads_daily", "hq_ads_reports"]) {
    assert.ok(sql.includes(`alter table public.${table} enable row level security`), table);
    assert.ok(sql.includes(`references public.hq_workspaces(id) on delete cascade`));
    assert.ok(sql.includes(`on public.${table}\n  for select to authenticated using (public.hq_member_of(workspace_id))`), table);
  }
  assert.ok(sql.includes("unique (workspace_id, platform, account_id, campaign, date)"), "idempotent daily rows");
  assert.ok(!/insert|update|delete/i.test(sql.split("grant select")[1]?.split("drop policy")[0] ?? ""), "browser roles get select only");
});

test("a real workspace with no ad rows and no ad leads produces an honest empty report", () => {
  const r = buildAdsWeeklyReport({ workspace: workspace(), rows: [], leads: [lead({ created_at: "2026-09-10T15:00:00Z" })], now: new Date("2026-09-14T14:00:00Z") });
  assert.equal(r.hasAdsData, false);
  assert.equal(r.platforms.length, 0);
  assert.equal(r.totalLeads, 1);
  assert.ok(r.text.includes("No ad spend was reported for this week."));
  assert.ok(r.text.includes("No ad-tagged leads this week."));
});
