import "server-only";
import { ADS_BRAIN, metaLeadCount, numericMetric } from "@/lib/adsBrain";
import { dateDaysAgo, graphObject, graphRows, metaReadToken } from "@/lib/metaInsights";
import type { AdRow } from "@/lib/growthSignals";

// One row per ad for the scorecard on the Next actions page: what each ad
// spent and how many leads Meta counted for it, plus whether it is running.
//
// The command center reads the same account by campaign (lib/metaInsights.ts).
// A verdict on wording needs it by ad, because two ads in one campaign carry
// different words. Same token, same allowlist check, same manners: GET only,
// bounded by a timeout, cached for ten minutes, and it never throws into a
// page. Nothing here can change an ad, a budget or a campaign.

export type LeadFlowAdRows =
  | { ok: true; generatedAt: string; cached: boolean; rows: AdRow[] }
  | { ok: false; reason: "not_configured" | "unavailable"; detail: string };

/** How long one answer from Meta serves the page before it is fetched again. */
export const META_AD_ROWS_TTL_MS = 10 * 60_000;

type CacheEntry = { at: number; value: Extract<LeadFlowAdRows, { ok: true }> };
const cache = new Map<string, CacheEntry>();

/**
 * Merge Meta's ad list with its ad-level insights. Pure, so the mapping is
 * tested without a network. An ad with no spend in the window still appears
 * when it is running, so "this ad is on and has delivered nothing" is visible.
 */
export function adRowsFrom(ads: readonly Record<string, unknown>[], insights: readonly Record<string, unknown>[]): AdRow[] {
  const byId = new Map<string, AdRow>();
  for (const ad of ads) {
    const id = String(ad.id ?? "");
    if (!id) continue;
    byId.set(id, {
      ad_id: id,
      ad_name: String(ad.name ?? "Unnamed ad"),
      campaign_name: String((ad.campaign as { name?: unknown } | undefined)?.name ?? ""),
      effective_status: String(ad.effective_status ?? ""),
      spendCents: 0,
      platformLeads: 0,
    });
  }
  for (const row of insights) {
    const id = String(row.ad_id ?? "");
    if (!id) continue;
    const existing = byId.get(id);
    const base: AdRow = existing ?? {
      ad_id: id,
      ad_name: String(row.ad_name ?? "Unnamed ad"),
      campaign_name: String(row.campaign_name ?? ""),
      // Not in the ad list any more (deleted or archived): it cannot be running.
      effective_status: "ARCHIVED",
      spendCents: 0,
      platformLeads: 0,
    };
    byId.set(id, {
      ...base,
      campaign_name: base.campaign_name || String(row.campaign_name ?? ""),
      spendCents: base.spendCents + Math.round(numericMetric(row.spend) * 100),
      platformLeads: base.platformLeads + metaLeadCount(row.actions),
    });
  }
  return [...byId.values()]
    .filter((ad) => ad.effective_status === "ACTIVE" || ad.spendCents > 0 || ad.platformLeads > 0)
    .sort((a, b) => b.spendCents - a.spendCents);
}

export async function fetchLeadFlowAdRows(
  opts: { days?: number; timeoutMs?: number; now?: Date; env?: Record<string, string | undefined> } = {},
): Promise<LeadFlowAdRows> {
  const token = metaReadToken(opts.env);
  if (!token) return { ok: false, reason: "not_configured", detail: "META_ADS_READ_TOKEN is not set on this server." };
  const days = Math.min(90, Math.max(1, Math.floor(opts.days ?? 7)));
  const now = opts.now ?? new Date();
  const key = `${days}`;
  const hit = cache.get(key);
  if (hit && now.getTime() - hit.at < META_AD_ROWS_TTL_MS) return { ...hit.value, cached: true };

  const accountPath = `act_${ADS_BRAIN.identity.adAccountId}`;
  try {
    const [account, ads, insights] = await Promise.all([
      graphObject<Record<string, unknown>>(accountPath, "id,account_id,business", token, opts.timeoutMs),
      graphRows<Record<string, unknown>>(`${accountPath}/ads`, "id,name,effective_status,campaign{name}", token, {}, opts.timeoutMs),
      graphRows<Record<string, unknown>>(
        `${accountPath}/insights`,
        "ad_id,ad_name,campaign_name,spend,actions",
        token,
        { level: "ad", time_range: JSON.stringify({ since: dateDaysAgo(days, now), until: dateDaysAgo(0, now) }) },
        opts.timeoutMs,
      ),
    ]);
    if (String(account.account_id ?? "") !== ADS_BRAIN.identity.adAccountId) {
      throw new Error("Meta returned a different ad account than the LeadFlow allowlist.");
    }
    const business = String((account.business as { id?: unknown } | undefined)?.id ?? "");
    if (business && business !== ADS_BRAIN.identity.businessPortfolioId) {
      throw new Error("Meta returned a different business portfolio than the LeadFlow allowlist.");
    }
    const value: Extract<LeadFlowAdRows, { ok: true }> = { ok: true, generatedAt: now.toISOString(), cached: false, rows: adRowsFrom(ads, insights) };
    cache.set(key, { at: now.getTime(), value });
    return value;
  } catch (error) {
    return { ok: false, reason: "unavailable", detail: error instanceof Error ? error.message : "Meta did not answer." };
  }
}

/** Tests only: forget every cached answer. */
export function resetMetaAdRowsCache(): void {
  cache.clear();
}
