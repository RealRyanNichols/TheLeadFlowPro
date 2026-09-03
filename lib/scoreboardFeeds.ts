// Server-side feed access for the Scoreboard. Kept apart from lib/scoreboard.ts so the
// pure helpers stay importable by tests and client components.
import "server-only";
import { createServiceClient } from "@/lib/supabase/service";
import { normalizeDays, type ScoreboardBusiness, type ScoreboardDay } from "@/lib/scoreboard";

export type ScoreboardFetchResult =
  | { ok: true; days: ScoreboardDay[]; fetchedAt: string }
  | { ok: false; reason: string };

export async function fetchScoreboardDays(
  business: ScoreboardBusiness,
  daysBack = 90,
): Promise<ScoreboardFetchResult> {
  try {
    if (business.feed.kind === "local") {
      const service = createServiceClient();
      const { data, error } = await service.rpc("scoreboard_public_daily", { days_back: daysBack });
      if (error) return { ok: false, reason: error.message };
      return { ok: true, days: normalizeDays(data), fetchedAt: new Date().toISOString() };
    }
    const response = await fetch(`${business.feed.url}/rest/v1/rpc/scoreboard_public_daily`, {
      method: "POST",
      headers: {
        apikey: business.feed.publishableKey,
        Authorization: `Bearer ${business.feed.publishableKey}`,
        "content-type": "application/json",
      },
      body: JSON.stringify({ days_back: daysBack }),
      next: { revalidate: 900 },
    });
    if (!response.ok) return { ok: false, reason: `feed responded ${response.status}` };
    const data = await response.json();
    return { ok: true, days: normalizeDays(data), fetchedAt: new Date().toISOString() };
  } catch (error) {
    return { ok: false, reason: error instanceof Error ? error.message : "feed unreachable" };
  }
}

