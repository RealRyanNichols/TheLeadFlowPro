// Read only the explicitly public aggregate RPC. Neither the homepage nor a
// public scoreboard needs a service key or access to individual contact rows.
import "server-only";
import { SUPABASE_URL, SUPABASE_ANON_KEY } from "@/lib/config";
import { normalizeDays, type ScoreboardBusiness, type ScoreboardDay } from "@/lib/scoreboard";

export type ScoreboardFetchResult =
  | { ok: true; days: ScoreboardDay[]; fetchedAt: string }
  | { ok: false; reason: string };

export async function fetchScoreboardDays(business: ScoreboardBusiness, daysBack = 90): Promise<ScoreboardFetchResult> {
  try {
    const url = business.feed.kind === "local" ? SUPABASE_URL : business.feed.url;
    const key = business.feed.kind === "local" ? SUPABASE_ANON_KEY : business.feed.publishableKey;
    const response = await fetch(`${url}/rest/v1/rpc/scoreboard_public_daily`, {
      method: "POST",
      headers: { apikey: key, Authorization: `Bearer ${key}`, "content-type": "application/json" },
      body: JSON.stringify({ days_back: Math.min(400, Math.max(1, Math.trunc(daysBack))) }),
      signal: AbortSignal.timeout(8000),
      next: { revalidate: 900 },
    });
    if (!response.ok) return { ok: false, reason: `feed responded ${response.status}` };
    const raw = await response.json();
    if (!Array.isArray(raw) || raw.length === 0) return { ok: false, reason: "No aggregate records returned" };
    const days = normalizeDays(raw);
    if (days.length !== raw.length) return { ok: false, reason: "Incomplete aggregate records" };
    return { ok: true, days, fetchedAt: new Date().toISOString() };
  } catch {
    return { ok: false, reason: "feed unreachable" };
  }
}
