// Ad platform adapters. Each takes one client's own token for one client's
// own account and returns daily rows for that workspace. Tokens arrive
// decrypted from hq_connections (encrypted at rest with the HQ key chain),
// are used for the request, and never appear in a result, a log, or a row.
//
// Live calls are off until ADS_LIVE_PROVIDERS is exactly "true" in Vercel.
// Until then every platform answers "disabled" and the sandbox provider is
// the only one that returns rows. Turning it on is a per-client approval
// (docs/engines/7.2-ads-reporting.md).

import { sampleAdsRows } from "./fixtures";
import type { AdPlatform, AdsDailyRow, AdsRange, ProviderResult } from "./types";

export type ProviderInput = {
  workspaceId: string;
  platform: AdPlatform;
  /** The client's ad account id (Meta: act_123..., Google: 123-456-7890). */
  accountId: string;
  /** The client's own access token. Never stored by the caller after use. */
  token: string | null;
  range: AdsRange;
  fetchImpl?: typeof fetch;
  env?: Record<string, string | undefined>;
};

export function liveProvidersEnabled(env: Record<string, string | undefined> = process.env): boolean {
  return env.ADS_LIVE_PROVIDERS === "true";
}

/** Fictional rows for a workspace, so the pipeline can be run end to end with no account. */
export function sandboxProvider(input: Pick<ProviderInput, "workspaceId" | "platform" | "range">): ProviderResult {
  const rows = sampleAdsRows(input.workspaceId).filter((r) => r.platform === input.platform && r.date >= input.range.start && r.date <= input.range.end);
  return { ok: true, rows, fetchedAt: new Date().toISOString() };
}

function toCents(value: unknown): number {
  const n = typeof value === "string" ? Number.parseFloat(value) : typeof value === "number" ? value : 0;
  return Number.isFinite(n) ? Math.round(n * 100) : 0;
}

function toInt(value: unknown): number {
  const n = typeof value === "string" ? Number.parseInt(value, 10) : typeof value === "number" ? value : 0;
  return Number.isFinite(n) ? Math.max(0, Math.trunc(n)) : 0;
}

/** Meta Marketing API insights, one row per campaign per day. */
export async function metaProvider(input: ProviderInput): Promise<ProviderResult> {
  if (!liveProvidersEnabled(input.env)) return { ok: false, code: "disabled", error: "Live ad platform calls are switched off on the server." };
  if (!input.token) return { ok: false, code: "not_configured", error: "No access token is connected for this Meta ad account." };
  const account = input.accountId.startsWith("act_") ? input.accountId : `act_${input.accountId}`;
  const url = new URL(`https://graph.facebook.com/v21.0/${account}/insights`);
  url.searchParams.set("level", "campaign");
  url.searchParams.set("time_increment", "1");
  url.searchParams.set("fields", "campaign_name,spend,impressions,clicks,actions,account_currency,date_start");
  url.searchParams.set("time_range", JSON.stringify({ since: input.range.start, until: input.range.end }));
  url.searchParams.set("limit", "500");
  const doFetch = input.fetchImpl ?? fetch;
  try {
    const rows: AdsDailyRow[] = [];
    let next: string | null = url.toString();
    let pages = 0;
    while (next && pages < 20) {
      const r = await doFetch(next, { headers: { Authorization: `Bearer ${input.token}` }, signal: AbortSignal.timeout(15_000) });
      if (r.status === 401 || r.status === 403) return { ok: false, code: "auth", error: "Meta rejected the token. Reconnect the account." };
      if (!r.ok) return { ok: false, code: "provider", error: `Meta answered ${r.status}.` };
      const body = (await r.json()) as { data?: Record<string, unknown>[]; paging?: { next?: string } };
      for (const d of body.data ?? []) {
        const actions = Array.isArray(d.actions) ? (d.actions as { action_type?: string; value?: unknown }[]) : [];
        const leadAction = actions.find((a) => a.action_type === "lead" || a.action_type === "onsite_conversion.lead_grouped");
        rows.push({
          workspace_id: input.workspaceId,
          platform: "meta",
          account_id: account,
          campaign: String(d.campaign_name ?? "Unnamed campaign"),
          date: String(d.date_start ?? input.range.start),
          spend_cents: toCents(d.spend),
          currency: String(d.account_currency ?? "USD"),
          impressions: toInt(d.impressions),
          clicks: toInt(d.clicks),
          platform_leads: toInt(leadAction?.value),
        });
      }
      next = body.paging?.next ?? null;
      pages += 1;
    }
    return { ok: true, rows, fetchedAt: new Date().toISOString() };
  } catch (error) {
    return { ok: false, code: "provider", error: `Meta request failed: ${error instanceof Error ? error.message : "unknown"}`.slice(0, 200) };
  }
}

/**
 * Google Ads needs a developer token on The LeadFlow Pro's side plus the
 * client's OAuth refresh token and customer id. The developer token is not
 * applied for yet (decision in docs/decisions-needed.md), so this adapter
 * reports not_configured until it exists. The GAQL shape is written so the
 * only change later is the credential.
 */
export async function googleProvider(input: ProviderInput): Promise<ProviderResult> {
  if (!liveProvidersEnabled(input.env)) return { ok: false, code: "disabled", error: "Live ad platform calls are switched off on the server." };
  const developerToken = (input.env ?? process.env).GOOGLE_ADS_DEVELOPER_TOKEN;
  if (!developerToken) return { ok: false, code: "not_configured", error: "Google Ads reporting needs a developer token on the server. Not applied for yet." };
  if (!input.token) return { ok: false, code: "not_configured", error: "No access token is connected for this Google Ads account." };
  const customer = input.accountId.replace(/-/g, "");
  const query = `SELECT campaign.name, segments.date, metrics.cost_micros, metrics.impressions, metrics.clicks, metrics.conversions FROM campaign WHERE segments.date BETWEEN '${input.range.start}' AND '${input.range.end}'`;
  const doFetch = input.fetchImpl ?? fetch;
  try {
    const r = await doFetch(`https://googleads.googleapis.com/v18/customers/${customer}/googleAds:search`, {
      method: "POST",
      headers: { Authorization: `Bearer ${input.token}`, "developer-token": developerToken, "Content-Type": "application/json" },
      body: JSON.stringify({ query, pageSize: 1000 }),
      signal: AbortSignal.timeout(15_000),
    });
    if (r.status === 401 || r.status === 403) return { ok: false, code: "auth", error: "Google rejected the token. Reconnect the account." };
    if (!r.ok) return { ok: false, code: "provider", error: `Google answered ${r.status}.` };
    const body = (await r.json()) as { results?: { campaign?: { name?: string }; segments?: { date?: string }; metrics?: Record<string, unknown> }[] };
    const rows: AdsDailyRow[] = (body.results ?? []).map((x) => ({
      workspace_id: input.workspaceId,
      platform: "google",
      account_id: input.accountId,
      campaign: x.campaign?.name ?? "Unnamed campaign",
      date: x.segments?.date ?? input.range.start,
      spend_cents: Math.round(toInt(x.metrics?.cost_micros) / 10_000),
      currency: "USD",
      impressions: toInt(x.metrics?.impressions),
      clicks: toInt(x.metrics?.clicks),
      platform_leads: Math.round(Number(x.metrics?.conversions ?? 0)),
    }));
    return { ok: true, rows, fetchedAt: new Date().toISOString() };
  } catch (error) {
    return { ok: false, code: "provider", error: `Google request failed: ${error instanceof Error ? error.message : "unknown"}`.slice(0, 200) };
  }
}

export async function fetchAdsDaily(input: ProviderInput): Promise<ProviderResult> {
  return input.platform === "meta" ? metaProvider(input) : googleProvider(input);
}
