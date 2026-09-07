import "server-only";
import type { ScoreboardBusiness } from "./scoreboard";
import { CAPTURE_SOURCES, normalizeCaptureCoverage } from "./scoreboardCaptureCoverage";

/** Reads only aggregate RPC output. Individual contact tables are never requested. */
export async function fetchCaptureCoverage(business: ScoreboardBusiness, daysBack = 30) {
  if (business.feed.kind !== "supabase" || !CAPTURE_SOURCES[business.slug]) return null;
  try {
    const response = await fetch(`${business.feed.url}/rest/v1/rpc/scoreboard_public_capture_coverage`, {
      method: "POST",
      headers: { apikey: business.feed.publishableKey, Authorization: `Bearer ${business.feed.publishableKey}`, "content-type": "application/json" },
      body: JSON.stringify({ days_back: daysBack }),
      signal: AbortSignal.timeout(8000),
      next: { revalidate: 900 },
    });
    if (!response.ok) return null;
    return normalizeCaptureCoverage(await response.json(), business.slug, daysBack);
  } catch {
    return null;
  }
}
