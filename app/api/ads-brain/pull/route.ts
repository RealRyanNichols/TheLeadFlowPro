import { NextResponse } from "next/server";
import { ADS_BRAIN, metaLeadCount, numericMetric, verifyAdsBrainSignature } from "@/lib/adsBrain";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 60;

type GraphPage<T> = { data?: T[]; paging?: { next?: string }; error?: { message?: string; code?: number } };

function signedRequest(request: Request) {
  const url = new URL(request.url);
  return verifyAdsBrainSignature({
    method: request.method,
    pathname: url.pathname,
    workerId: request.headers.get("x-ads-brain-worker"),
    timestamp: request.headers.get("x-ads-brain-timestamp"),
    signature: request.headers.get("x-ads-brain-signature"),
  });
}

async function graphJson<T>(url: URL, token: string): Promise<T> {
  const response = await fetch(url, {
    method: "GET",
    headers: { Authorization: `Bearer ${token}`, Accept: "application/json" },
    cache: "no-store",
    signal: AbortSignal.timeout(20_000),
  });
  const body = (await response.json().catch(() => ({}))) as T & { error?: { message?: string; code?: number } };
  if (!response.ok || body.error) {
    const message = String(body.error?.message ?? `Meta returned HTTP ${response.status}`).slice(0, 300);
    throw new Error(message);
  }
  return body;
}

async function graphObject<T>(path: string, fields: string, token: string): Promise<T> {
  const url = new URL(`https://graph.facebook.com/${ADS_BRAIN.graphVersion}/${path}`);
  url.searchParams.set("fields", fields);
  return graphJson<T>(url, token);
}

async function graphRows<T>(path: string, fields: string, token: string, extra: Record<string, string> = {}): Promise<T[]> {
  const first = new URL(`https://graph.facebook.com/${ADS_BRAIN.graphVersion}/${path}`);
  first.searchParams.set("fields", fields);
  first.searchParams.set("limit", "500");
  for (const [key, value] of Object.entries(extra)) first.searchParams.set(key, value);

  const rows: T[] = [];
  let next: URL | null = first;
  for (let page = 0; next && page < 20; page += 1) {
    const body: GraphPage<T> = await graphJson<GraphPage<T>>(next, token);
    rows.push(...(body.data ?? []));
    next = body.paging?.next ? new URL(body.paging.next) : null;
  }
  return rows;
}

function dateDaysAgo(days: number): string {
  return new Date(Date.now() - days * 86_400_000).toISOString().slice(0, 10);
}

export async function GET(request: Request) {
  const auth = signedRequest(request);
  if (!auth.ok) {
    return NextResponse.json({ error: "Ads Brain authorization failed." }, { status: 401 });
  }

  const adsToken = (process.env.META_ADS_READ_TOKEN || process.env.META_PAGE_ACCESS_TOKEN || "").trim();
  const pageToken = (process.env.META_PAGE_ACCESS_TOKEN || adsToken).trim();
  if (!adsToken) {
    return NextResponse.json(
      { error: "Meta read access is not configured in the LeadFlow production runtime." },
      { status: 503, headers: { "Cache-Control": "no-store" } },
    );
  }

  const accountPath = `act_${ADS_BRAIN.identity.adAccountId}`;
  try {
    const [account, campaigns, ads, insightRows] = await Promise.all([
      graphObject<Record<string, unknown>>(
        accountPath,
        "id,account_id,name,account_status,currency,timezone_name,amount_spent,balance,spend_cap,business",
        adsToken,
      ),
      graphRows<Record<string, unknown>>(
        `${accountPath}/campaigns`,
        "id,name,status,effective_status,objective,buying_type,daily_budget,lifetime_budget,budget_remaining,start_time,stop_time,updated_time",
        adsToken,
      ),
      graphRows<Record<string, unknown>>(
        `${accountPath}/ads`,
        "id,name,status,effective_status,campaign_id,adset_id,updated_time,creative{id,name,thumbnail_url,effective_object_story_id}",
        adsToken,
      ),
      graphRows<Record<string, unknown>>(
        `${accountPath}/insights`,
        "account_id,account_name,account_currency,campaign_id,campaign_name,adset_id,adset_name,ad_id,ad_name,date_start,date_stop,spend,impressions,reach,clicks,inline_link_clicks,actions",
        adsToken,
        {
          level: "ad",
          time_increment: "1",
          time_range: JSON.stringify({ since: dateDaysAgo(35), until: dateDaysAgo(0) }),
        },
      ),
    ]);

    if (String(account.account_id ?? "") !== ADS_BRAIN.identity.adAccountId) {
      throw new Error("Meta returned a different ad account than the LeadFlow allowlist.");
    }
    const returnedBusinessId = String((account.business as { id?: unknown } | undefined)?.id ?? "");
    if (returnedBusinessId && returnedBusinessId !== ADS_BRAIN.identity.businessPortfolioId) {
      throw new Error("Meta returned a different business portfolio than the LeadFlow allowlist.");
    }

    let forms: Record<string, unknown>[] = [];
    let formsError: string | null = null;
    try {
      forms = await graphRows<Record<string, unknown>>(
        `${ADS_BRAIN.identity.pageId}/leadgen_forms`,
        "id,name,status,created_time,locale",
        pageToken,
      );
    } catch (error) {
      formsError = error instanceof Error ? error.message : "Meta Page form reporting is unavailable.";
      console.warn("ads-brain Page form pull limited:", formsError);
    }

    const insights = insightRows.map((row) => ({
      account_id: String(row.account_id ?? ""),
      account_name: String(row.account_name ?? ""),
      currency: String(row.account_currency ?? "USD"),
      campaign_id: String(row.campaign_id ?? ""),
      campaign_name: String(row.campaign_name ?? "Unnamed campaign"),
      adset_id: String(row.adset_id ?? ""),
      adset_name: String(row.adset_name ?? "Unnamed ad set"),
      ad_id: String(row.ad_id ?? ""),
      ad_name: String(row.ad_name ?? "Unnamed ad"),
      date: String(row.date_start ?? ""),
      spend: numericMetric(row.spend),
      impressions: Math.round(numericMetric(row.impressions)),
      reach: Math.round(numericMetric(row.reach)),
      clicks: Math.round(numericMetric(row.clicks)),
      link_clicks: Math.round(numericMetric(row.inline_link_clicks)),
      platform_leads: metaLeadCount(row.actions),
    }));

    return NextResponse.json(
      {
        ok: true,
        generated_at: new Date().toISOString(),
        mode: ADS_BRAIN.mode,
        spend_lock: ADS_BRAIN.spendLock,
        capabilities: {
          read_insights: true,
          read_forms: formsError === null,
          mutate_campaigns: false,
          publish_ads: false,
        },
        identity: ADS_BRAIN.identity,
        account,
        campaigns,
        ads,
        forms,
        form_access: { connected: formsError === null, error: formsError },
        insights,
      },
      { headers: { "Cache-Control": "no-store, max-age=0", "X-Content-Type-Options": "nosniff" } },
    );
  } catch (error) {
    console.error("ads-brain pull failed:", error instanceof Error ? error.message : "unknown");
    return NextResponse.json(
      { error: "Meta aggregate reporting is unavailable.", detail: error instanceof Error ? error.message : "unknown" },
      { status: 502, headers: { "Cache-Control": "no-store" } },
    );
  }
}
