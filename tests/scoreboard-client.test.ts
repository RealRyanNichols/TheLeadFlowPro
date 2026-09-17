import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import test from "node:test";
import { SCOREBOARD_BUSINESSES, buildWindows, publicScoreboardBusiness, publicScoreboardBusinesses, type ScoreboardDay } from "../lib/scoreboard.ts";
import { tracksMetric } from "../lib/scoreboardMetrics.ts";
import { daysToCsv, ownerKey, ownerMetrics, ownerReading, ownerViewPath, verifyOwnerKey } from "../lib/scoreboardOwner.ts";
import { copyProblems } from "../lib/hq/copy.ts";

const SECRETS = ["test-secret-that-is-long-enough-1234"];
const BANNED = ["guarantee", "roas", "#1", "best in", "ranked", "x return", "% increase", "because of", "revenue of", "in revenue"];

function day(d: string, over: Partial<ScoreboardDay> = {}): ScoreboardDay {
  return { day: d, views: 10, visitors: 8, clicks: 2, leads: 1, paid_leads: 0, unpaid_leads: 1, calls: 0, forms: 1, sales: 0, ...over };
}
function shift(d: string, delta: number): string {
  const [y, m, dd] = d.split("-").map(Number);
  return new Date(Date.UTC(y, m - 1, dd + delta)).toISOString().slice(0, 10);
}
const TODAY = "2026-09-17";
const ninety = (over: (d: string, i: number) => Partial<ScoreboardDay> = () => ({})) => Array.from({ length: 90 }, (_, i) => day(shift(TODAY, -(89 - i)), over(shift(TODAY, -(89 - i)), i)));

test("every board carries a written opt-in and only opted-in boards are public", () => {
  for (const b of SCOREBOARD_BUSINESSES) {
    assert.ok(b.optIn.approvedBy.length > 3, b.slug);
    assert.match(b.optIn.approvedOn, /^\d{4}-\d{2}-\d{2}$/, b.slug);
  }
  assert.deepEqual(publicScoreboardBusinesses().map((b) => b.slug), SCOREBOARD_BUSINESSES.filter((b) => b.optIn.publicBoard).map((b) => b.slug));
  const withdrawn = { ...SCOREBOARD_BUSINESSES[0], optIn: { ...SCOREBOARD_BUSINESSES[0].optIn, publicBoard: false } };
  assert.equal(publicScoreboardBusiness("no-such-board"), null);
  assert.equal(withdrawn.optIn.publicBoard, false);
});

test("unsupported metrics come from the registry, not a slug check", () => {
  const rrn = SCOREBOARD_BUSINESSES.find((b) => b.slug === "realryannichols")!;
  assert.equal(tracksMetric(rrn, "calls"), false);
  assert.equal(tracksMetric(rrn, "views"), true);
  const pda = SCOREBOARD_BUSINESSES.find((b) => b.slug === "premier-dental-academy-of-longview")!;
  assert.equal(tracksMetric(pda, "calls"), true);
  assert.ok(!ownerMetrics(rrn).some((m) => m.key === "calls" || m.key === "paid_leads"));
});

test("owner keys: signed per business, verified only for that business, and never without a secret", () => {
  const key = ownerKey("premier-dental-academy-of-longview", SECRETS);
  assert.ok(verifyOwnerKey("premier-dental-academy-of-longview", key, SECRETS));
  assert.ok(!verifyOwnerKey("realryannichols", key, SECRETS), "a key for one client does not open another");
  assert.ok(!verifyOwnerKey("premier-dental-academy-of-longview", key.slice(0, -2) + "xx", SECRETS));
  assert.ok(!verifyOwnerKey("premier-dental-academy-of-longview", key, []));
  assert.ok(!verifyOwnerKey("premier-dental-academy-of-longview", "", SECRETS));
  assert.ok(!verifyOwnerKey("premier-dental-academy-of-longview", "../../etc", SECRETS));
  assert.throws(() => ownerKey("x", []), /No signing secret/);
  // Rotation: a key signed with the old secret still verifies while the old secret stays in the chain.
  assert.ok(verifyOwnerKey("premier-dental-academy-of-longview", key, ["new-secret-that-is-long-enough-5678", ...SECRETS]));
  assert.equal(ownerViewPath("a-b", "k_1"), "/scoreboard/a-b/owner?k=k_1");
});

test("the CSV holds aggregate day rows only and drops metrics the feed does not track", () => {
  const csv = daysToCsv([day("2026-09-16", { leads: 3, sales: 2 }), day("2026-09-17")], { unsupportedMetrics: ["calls", "paid_leads"] });
  const [header, r1] = csv.trim().split("\n");
  assert.equal(header, "day,views,visitors,clicks,leads,unpaid_leads,forms,sales");
  assert.equal(r1, "2026-09-16,10,8,2,3,1,1,2");
  assert.ok(!/name|email|phone|\$/.test(csv));
});

test("the owner reading states counts and comparisons, claims no causes, and says when the prior window is missing", () => {
  const business = SCOREBOARD_BUSINESSES.find((b) => b.slug === "the-leadflow-pro")!;
  const days = ninety((d, i) => ({ views: i < 60 ? 5 : 20, leads: i < 60 ? 0 : 2, paid_leads: i < 60 ? 0 : 1, unpaid_leads: i < 60 ? 0 : 1, sales: i >= 85 ? 1 : 0 }));
  const windows = buildWindows(days, TODAY);
  const r = ownerReading(business, windows, days, TODAY);
  assert.equal(r.headline, "Last 30 days: 600 views, 60 lead records.");
  assert.ok(r.notes.some((n) => n.startsWith("Views: 600 in the last 30 days, up 450 against the 30 days before (150).")));
  assert.ok(r.notes.some((n) => n.includes("30 of 60 lead records carry an advertising source")));
  assert.ok(r.notes.some((n) => n.includes("5 payment records") && n.includes("not revenue")));
  const text = [r.headline, ...r.notes].join(" ").toLowerCase();
  for (const b of BANNED) assert.ok(!text.includes(b), b);
  for (const n of r.notes) assert.deepEqual(copyProblems(n), [], n);

  const short = days.slice(-30);
  const r2 = ownerReading(business, buildWindows(short, TODAY), short, TODAY);
  assert.ok(r2.notes.some((n) => n.includes("does not reach back far enough")));

  const quiet = ninety(() => ({ views: 0, visitors: 0, clicks: 0, leads: 0, unpaid_leads: 0, forms: 0 }));
  const r3 = ownerReading(business, buildWindows(quiet, TODAY), quiet, TODAY);
  assert.ok(r3.notes.some((n) => n.includes("Either tracking is off")));
});

test("the owner page and CSV route are gated, noindex, and never store or send", () => {
  const page = readFileSync(join(process.cwd(), "app/scoreboard/[business]/owner/page.tsx"), "utf8");
  assert.ok(page.includes("!business.optIn.ownerView || !verifyOwnerKey(slug, k)) notFound()"));
  assert.ok(page.includes("robots: { index: false, follow: false, noarchive: true }"));
  const route = readFileSync(join(process.cwd(), "app/api/scoreboard/owner/route.ts"), "utf8");
  assert.ok(route.includes("verifyOwnerKey(slug, key)") && route.includes("status: 404"));
  assert.ok(route.includes('"x-robots-tag": "noindex"'));
  for (const src of [page, route]) assert.ok(!/resend|sendEmail|createServiceClient|\.insert\(|\.update\(/i.test(src));
  const business = readFileSync(join(process.cwd(), "app/scoreboard/[business]/page.tsx"), "utf8");
  assert.ok(business.includes("publicScoreboardBusiness(slug)") && !business.includes("SCOREBOARD_BUSINESSES"));
  for (const f of ["app/sitemap.ts", "lib/publicOgCatalog.ts", "components/site/HomeScoreboard.tsx", "app/scoreboard/metrics/[metric]/page.tsx"]) {
    const s = readFileSync(join(process.cwd(), f), "utf8");
    assert.ok(s.includes("publicScoreboardBusinesses()") && !s.includes("SCOREBOARD_BUSINESSES"), f);
  }
});
