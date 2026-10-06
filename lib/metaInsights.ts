import "server-only";
import { ADS_BRAIN, metaLeadCount, numericMetric } from "@/lib/adsBrain";
import type { AdInsightRow } from "@/lib/commandCenter";

// Read-only Meta reporting for the LeadFlow ad account, shared by the Ads
// Brain pull (app/api/ads-brain/pull) and the command center's ad panel.
//
// It uses the same read token the Ads Brain already needs in the production
// runtime (META_ADS_READ_TOKEN, falling back to META_PAGE_ACCESS_TOKEN) and
// checks that Meta answered for the allowlisted account and business, the
// same way the pull does. Nothing here can change a campaign, a budget or an
// ad: every call is a GET to the Graph API. Without a token it says so and
// returns; it never throws into a page.

const GRAPH = `https://graph.facebook.com/${ADS_BRAIN.graphVersion}`;

export type GraphPage<T> = { data?: T[]; paging?: { next?: string }; error?: { message?: string; code?: number } };

export async function graphJson<T>(url: URL, token: string, timeoutMs = 20_000): Promise<T> {
  const response = await fetch(url, {
    method: "GET",
    headers: { Authorization: `Bearer ${token}`, Accept: "application/json" },
    cache: "no-store",
    signal: AbortSignal.timeout(timeoutMs),
  });
  const body = (await response.json().catch(() => ({}))) as T & { error?: { message?: string; code?: number } };
  if (!response.ok || body.error) {
    const message = String(body.error?.message ?? `Meta returned HTTP ${response.status}`).slice(0, 300);
    throw new Error(message);
  }
  return body;
}

export async function graphObject<T>(path: string, fields: string, token: string, timeoutMs?: number): Promise<T> {
  const url = new URL(`${GRAPH}/${path}`);
  url.searchParams.set("fields", fields);
  return graphJson<T>(url, token, timeoutMs);
}

export async function graphRows<T>(
  path: string,
  fields: string,
  token: string,
  extra: Record<string, string> = {},
  timeoutMs?: number,
): Promise<T[]> {
  const first = new URL(`${GRAPH}/${path}`);
  first.searchParams.set("fields", fields);
  first.searchParams.set("limit", "500");
  for (const [key, value] of Object.entries(extra)) first.searchParams.set(key, value);

  const rows: T[] = [];
  let next: URL | null = first;
  for (let page = 0; next && page < 20; page += 1) {
    const body: GraphPage<T> = await graphJson<GraphPage<T>>(next, token, timeoutMs);
    rows.push(...(body.data ?? []));
    next = body.paging?.next ? new URL(body.paging.next) : null;
  }
  return rows;
}

export function dateDaysAgo(days: number, now: Date = new Date()): string {
  return new Date(now.getTime() - days * 86_400_000).toISOString().slice(0, 10);
}

/** The token the production runtime holds for read-only Meta reporting, or null. */
export function metaReadToken(env: Record<string, string | undefined> = process.env): string | null {
  const token = (env.META_ADS_READ_TOKEN || env.META_PAGE_ACCESS_TOKEN || "").trim();
  return token || null;
}

export type LeadFlowAdCampaign = {
  id: string;
  name: string;
  status: string;
  /** Meta's effective delivery state: ACTIVE, PAUSED, CAMPAIGN_PAUSED, ... */
  effective_status: string;
  daily_budget_cents: number | null;
  lifetime_budget_cents: number | null;
};

export type LeadFlowAdInsights =
  | {
      ok: true;
      generatedAt: string;
      /** From the cache, not fetched for this request. */
      cached: boolean;
      account: { name: string; currency: string; amountSpentCents: number };
      campaigns: LeadFlowAdCampaign[];
      rows: AdInsightRow[];
    }
  | { ok: false; reason: "not_configured" | "unavailable"; detail: string };

/** How long one answer from Meta serves the board before it is fetched again. */
export const META_INSIGHTS_TTL_MS = 10 * 60_000;

type CacheEntry = { at: number; value: Extract<LeadFlowAdInsights, { ok: true }> };
const cache = new Map<string, CacheEntry>();

function cents(value: unknown): number | null {
  const parsed = Number.parseInt(String(value ?? ""), 10);
  return Number.isFinite(parsed) && parsed >= 0 ? parsed : null;
}

/**
 * Daily, campaign-level spend, impressions, link clicks and platform-counted
 * leads for the LeadFlow ad account over the last `days` reporting days, plus
 * the account's campaigns. Cached in this process for META_INSIGHTS_TTL_MS so
 * the board never hammers Meta. `timeoutMs` bounds each Graph request so a
 * slow Meta answer cannot hold the page.
 */
export async function fetchLeadFlowAdInsights(
  opts: { days?: number; timeoutMs?: number; now?: Date; env?: Record<string, string | undefined> } = {},
): Promise<LeadFlowAdInsights> {
  const token = metaReadToken(opts.env);
  if (!token) {
    return { ok: false, reason: "not_configured", detail: "META_ADS_READ_TOKEN is not set on this server." };
  }
  const days = Math.min(90, Math.max(1, Math.floor(opts.days ?? 35)));
  const now = opts.now ?? new Date();
  const key = `${days}`;
  const hit = cache.get(key);
  if (hit && now.getTime() - hit.at < META_INSIGHTS_TTL_MS) return { ...hit.value, cached: true };

  const accountPath = `act_${ADS_BRAIN.identity.adAccountId}`;
  try {
    const [account, campaigns, insightRows] = await Promise.all([
      graphObject<Record<string, unknown>>(accountPath, "id,account_id,name,currency,amount_spent,business", token, opts.timeoutMs),
      graphRows<Record<string, unknown>>(
        `${accountPath}/campaigns`,
        "id,name,status,effective_status,daily_budget,lifetime_budget",
        token,
        {},
        opts.timeoutMs,
      ),
      graphRows<Record<string, unknown>>(
        `${accountPath}/insights`,
        "campaign_id,campaign_name,date_start,spend,impressions,inline_link_clicks,actions",
        token,
        {
          level: "campaign",
          time_increment: "1",
          time_range: JSON.stringify({ since: dateDaysAgo(days, now), until: dateDaysAgo(0, now) }),
        },
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

    const value: Extract<LeadFlowAdInsights, { ok: true }> = {
      ok: true,
      generatedAt: now.toISOString(),
      cached: false,
      account: {
        name: String(account.name ?? "LeadFlow ad account"),
        currency: String(account.currency ?? "USD"),
        // Meta reports amount_spent in the account currency's minor unit.
        amountSpentCents: Math.round(numericMetric(account.amount_spent)),
      },
      campaigns: campaigns.map((c) => ({
        id: String(c.id ?? ""),
        name: String(c.name ?? "Unnamed campaign"),
        status: String(c.status ?? ""),
        effective_status: String(c.effective_status ?? ""),
        daily_budget_cents: cents(c.daily_budget),
        lifetime_budget_cents: cents(c.lifetime_budget),
      })),
      rows: insightRows.map((row) => ({
        date: String(row.date_start ?? ""),
        campaign_id: String(row.campaign_id ?? ""),
        campaign_name: String(row.campaign_name ?? "Unnamed campaign"),
        spend: numericMetric(row.spend),
        impressions: Math.round(numericMetric(row.impressions)),
        link_clicks: Math.round(numericMetric(row.inline_link_clicks)),
        platform_leads: metaLeadCount(row.actions),
      })),
    };
    cache.set(key, { at: now.getTime(), value });
    return value;
  } catch (error) {
    return { ok: false, reason: "unavailable", detail: error instanceof Error ? error.message : "Meta did not answer." };
  }
}

/** Tests only: forget every cached answer. */
export function resetMetaInsightsCache(): void {
  cache.clear();
}
