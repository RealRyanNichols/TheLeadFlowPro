import "server-only";
import { SUPABASE_URL, SUPABASE_ANON_KEY } from "@/lib/config";
import type { ScoreboardBusiness } from "./scoreboard";
import { CAPTURE_SOURCES, normalizeCaptureCoverage } from "./scoreboardCaptureCoverage";

/** Reads only aggregate RPC output. Individual contact tables are never requested. */
export async function fetchCaptureCoverage(business: ScoreboardBusiness, daysBack = 30) {
  if (!CAPTURE_SOURCES[business.slug]) return null;
  try {
    // The LeadFlow Pro's own feed is kind "local". It publishes the same public
    // aggregate RPC and is read the same way, through its own URL and anon key,
    // exactly as fetchScoreboardDays does. Gating on kind "supabase" was the
    // reason the company's own board never rendered this panel.
    const url = business.feed.kind === "local" ? SUPABASE_URL : business.feed.url;
    const key = business.feed.kind === "local" ? SUPABASE_ANON_KEY : business.feed.publishableKey;
    const response = await fetch(`${url}/rest/v1/rpc/scoreboard_public_capture_coverage`, {
      method: "POST",
      headers: { apikey: key, Authorization: `Bearer ${key}`, "content-type": "application/json" },
      body: JSON.stringify({ days_back: daysBack }),
      signal: AbortSignal.timeout(8000),
      // No fetch-level Data Cache; the page's ISR window is the only cache. See
      // lib/scoreboardFeeds.ts for why `cache: "no-store"` is not used here.
    });
    if (!response.ok) return null;
    return normalizeCaptureCoverage(await response.json(), business.slug, daysBack);
  } catch {
    return null;
  }
}
