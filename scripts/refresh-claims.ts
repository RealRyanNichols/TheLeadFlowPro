// Refresh the approved claims that can be read from public aggregate feeds.
//
// Run: node --experimental-strip-types --no-warnings --import ./scripts/register-ts.mjs scripts/refresh-claims.ts
//
// For every claim in lib/site/claims.ts that carries a `refresh` block, read
// the public scoreboard feed for that business (the same aggregate function
// the /scoreboard page reads with the business's publishable key), sum the
// window, and print the new value with today's date. It writes
// content/claims/refresh-<date>.json for review and never edits the config
// itself: Ryan (or a reviewed commit) moves the number into lib/site/claims.ts
// with the new asOf and reviewBy. Values without a `refresh` block are listed
// as manual so nothing goes stale silently.
//
// No names, contacts, or private records are ever read. The feed returns
// per-day counts and nothing else.

import { mkdirSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { CLAIMS } from "../lib/site/claims.ts";
import { SCOREBOARD_BUSINESSES, summarizeWindow } from "../lib/scoreboard.ts";
import { fetchScoreboardDays } from "../lib/scoreboardFeeds.ts";

function centralToday(): string {
  return new Intl.DateTimeFormat("en-CA", { timeZone: "America/Chicago", year: "numeric", month: "2-digit", day: "2-digit" }).format(new Date());
}

function plusDays(iso: string, days: number): string {
  const [y, m, d] = iso.split("-").map(Number);
  const date = new Date(Date.UTC(y, m - 1, d + days));
  return date.toISOString().slice(0, 10);
}

type RefreshRow = {
  id: string;
  label: string;
  business: string;
  mode: "refreshed" | "feed_unavailable" | "manual";
  previous: string;
  next: string | null;
  asOf: string;
  reviewBy: string;
  note: string;
};

async function main() {
  const today = centralToday();
  const rows: RefreshRow[] = [];
  for (const claim of CLAIMS) {
    if (!claim.refresh) {
      rows.push({
        id: claim.id,
        label: claim.label,
        business: claim.business,
        mode: "manual",
        previous: claim.value,
        next: null,
        asOf: claim.asOf,
        reviewBy: claim.reviewBy,
        note: "No public feed. Confirm by hand and update asOf/reviewBy in lib/site/claims.ts.",
      });
      continue;
    }
    const business = SCOREBOARD_BUSINESSES.find((b) => b.slug === claim.refresh!.business);
    if (!business) {
      rows.push({ id: claim.id, label: claim.label, business: claim.business, mode: "feed_unavailable", previous: claim.value, next: null, asOf: claim.asOf, reviewBy: claim.reviewBy, note: `No scoreboard business with slug ${claim.refresh.business}.` });
      continue;
    }
    const result = await fetchScoreboardDays(business, claim.refresh.days);
    if (!result.ok) {
      rows.push({ id: claim.id, label: claim.label, business: claim.business, mode: "feed_unavailable", previous: claim.value, next: null, asOf: claim.asOf, reviewBy: claim.reviewBy, note: "Feed could not be read. The previous value stays until it can." });
      continue;
    }
    const totals = summarizeWindow(result.days, claim.refresh.days);
    const value = claim.refresh.metric === "leads" ? totals.leads : totals.views;
    rows.push({
      id: claim.id,
      label: claim.label,
      business: claim.business,
      mode: "refreshed",
      previous: claim.value,
      next: value.toLocaleString("en-US"),
      asOf: today,
      reviewBy: plusDays(today, 30),
      note: `${claim.refresh.days} days ending ${today}, read from the public aggregate feed.`,
    });
  }
  const dir = join(process.cwd(), "content", "claims");
  mkdirSync(dir, { recursive: true });
  const file = join(dir, `refresh-${today}.json`);
  writeFileSync(file, JSON.stringify({ generated_at: new Date().toISOString(), rows }, null, 2));
  console.log(`Wrote ${file}`);
  for (const row of rows) {
    console.log(`  ${row.mode.padEnd(16)} ${row.id.padEnd(24)} ${row.previous} -> ${row.next ?? "(manual)"}  ${row.note}`);
  }
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
