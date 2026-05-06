// src/lib/meta-insights.ts
//
// Server-only Meta Graph API helpers. These never expose tokens to the client.
// They fetch what Meta exposes through Graph API for Pages / professional
// assets. Some Professional Mode personal-profile analytics visible in the
// Meta UI may not be available through Graph API; unsupported metrics are
// reported instead of faked.

const DEFAULT_GRAPH_VERSION = "v25.0";

export type MetaMetricKey =
  | "views"
  | "threeSecondViews"
  | "oneMinuteViews"
  | "watchTime"
  | "interactions"
  | "reactions"
  | "comments"
  | "shares"
  | "profileVisits"
  | "follows"
  | "impressions"
  | "reach";

export type MetaMetricResult = {
  metric: string;
  ok: boolean;
  total: number | null;
  reason?: string;
};

export type MetaPageInsightSnapshot = {
  ok: boolean;
  source: "meta_graph_api" | "not_configured" | "error";
  graphVersion: string;
  pageId: string | null;
  pageName: string | null;
  pageLink: string | null;
  fanCount: number | null;
  followerCount: number | null;
  period: {
    since: string;
    until: string;
  };
  totals: Record<MetaMetricKey, number | null>;
  metrics: MetaMetricResult[];
  unsupportedMetrics: string[];
  notes: string[];
};

const METRIC_CANDIDATES: Record<MetaMetricKey, string[]> = {
  // Meta has changed naming around views/impressions. Try the newest/common
  // candidates individually so one deprecated metric does not kill the report.
  views: ["page_media_views", "page_media_view", "page_impressions"],
  threeSecondViews: ["page_video_views"],
  oneMinuteViews: ["page_video_view_time"],
  watchTime: ["page_video_view_time"],
  interactions: ["page_post_engagements"],
  reactions: ["page_actions_post_reactions_total"],
  comments: ["page_comments"],
  shares: ["page_shares"],
  profileVisits: ["page_views_total"],
  follows: ["page_follows", "page_fan_adds_unique", "page_fan_adds"],
  impressions: ["page_impressions", "page_posts_impressions"],
  reach: ["page_impressions_unique", "page_posts_impressions_unique"],
};

function graphVersion(): string {
  return process.env.META_GRAPH_VERSION || DEFAULT_GRAPH_VERSION;
}

function graphBase(): string {
  return `https://graph.facebook.com/${graphVersion()}`;
}

function metaToken(): string | null {
  return process.env.FB_PAGE_ACCESS_TOKEN || process.env.META_ACCESS_TOKEN || null;
}

function normalizePageId(input?: string | null): string | null {
  const raw = (process.env.FB_PAGE_ID || input || "").trim();
  if (!raw) return null;
  return raw
    .replace(/^https?:\/\/(www\.)?facebook\.com\//i, "")
    .replace(/\/+$/, "")
    .trim();
}

function isoDate(date: Date): string {
  return date.toISOString().slice(0, 10);
}

function defaultSince(): string {
  // Ryan's public comeback posting starts Jan 21, 2025 after the Jan 20 pardon.
  return "2025-01-21";
}

function defaultUntil(): string {
  return isoDate(new Date());
}

function valueToNumber(value: unknown): number {
  if (typeof value === "number" && Number.isFinite(value)) return value;
  if (typeof value === "string") {
    const n = Number(value.replace(/,/g, ""));
    return Number.isFinite(n) ? n : 0;
  }
  if (Array.isArray(value)) {
    return value.reduce<number>((sum, item) => sum + valueToNumber(item), 0);
  }
  if (value && typeof value === "object") {
    return Object.values(value as Record<string, unknown>).reduce<number>(
      (sum, item) => sum + valueToNumber(item),
      0,
    );
  }
  return 0;
}

function sumInsightValues(data: unknown): number {
  const rows = (data as { data?: Array<{ values?: Array<{ value?: unknown }> }> }).data ?? [];
  return rows.reduce((metricSum, row) => {
    const values = row.values ?? [];
    return metricSum + values.reduce((sum, point) => sum + valueToNumber(point.value), 0);
  }, 0);
}

async function graphFetchJson(url: URL): Promise<{ ok: true; data: unknown } | { ok: false; reason: string }> {
  let res: Response;
  try {
    res = await fetch(url, { next: { revalidate: 3600 } });
  } catch (err) {
    return { ok: false, reason: (err as Error).message };
  }
  if (!res.ok) {
    const body = await res.text().catch(() => "");
    return { ok: false, reason: `Meta API ${res.status}: ${body.slice(0, 240)}` };
  }
  return { ok: true, data: await res.json() };
}

async function fetchPageInfo(pageId: string, token: string) {
  const fieldSets = [
    "id,name,link,fan_count,followers_count",
    "id,name,link,followers_count",
    "id,name,link",
  ];

  let lastError = "Meta page lookup failed";
  for (const fields of fieldSets) {
    const url = new URL(`${graphBase()}/${encodeURIComponent(pageId)}`);
    url.searchParams.set("fields", fields);
    url.searchParams.set("access_token", token);
    const result = await graphFetchJson(url);
    if (result.ok) return result;
    lastError = result.reason;
  }
  return { ok: false as const, reason: lastError };
}

async function fetchInsightMetric(
  pageId: string,
  token: string,
  metric: string,
  since: string,
  until: string,
): Promise<MetaMetricResult> {
  const url = new URL(`${graphBase()}/${encodeURIComponent(pageId)}/insights/${metric}`);
  url.searchParams.set("period", "day");
  url.searchParams.set("since", since);
  url.searchParams.set("until", until);
  url.searchParams.set("access_token", token);

  const result = await graphFetchJson(url);
  if (!result.ok) {
    return { metric, ok: false, total: null, reason: result.reason };
  }
  return { metric, ok: true, total: sumInsightValues(result.data) };
}

async function firstSupportedMetric(
  pageId: string,
  token: string,
  candidates: string[],
  since: string,
  until: string,
): Promise<{ total: number | null; attempts: MetaMetricResult[] }> {
  const attempts: MetaMetricResult[] = [];
  for (const metric of candidates) {
    const attempt = await fetchInsightMetric(pageId, token, metric, since, until);
    attempts.push(attempt);
    if (attempt.ok && attempt.total !== null) {
      return { total: attempt.total, attempts };
    }
  }
  return { total: null, attempts };
}

export async function getMetaPageInsightSnapshot(options: {
  pageId?: string | null;
  since?: string | null;
  until?: string | null;
} = {}): Promise<MetaPageInsightSnapshot> {
  const token = metaToken();
  const pageId = normalizePageId(options.pageId);
  const since = options.since || defaultSince();
  const until = options.until || defaultUntil();

  const emptyTotals = Object.fromEntries(
    Object.keys(METRIC_CANDIDATES).map((key) => [key, null]),
  ) as Record<MetaMetricKey, number | null>;

  if (!token || !pageId) {
    return {
      ok: false,
      source: "not_configured",
      graphVersion: graphVersion(),
      pageId,
      pageName: null,
      pageLink: null,
      fanCount: null,
      followerCount: null,
      period: { since, until },
      totals: emptyTotals,
      metrics: [],
      unsupportedMetrics: [],
      notes: [
        "Set FB_PAGE_ID and FB_PAGE_ACCESS_TOKEN in Vercel to pull live Meta data.",
        "The token must be authorized for the Page/professional asset and include the relevant insights permissions.",
      ],
    };
  }

  const pageInfo = await fetchPageInfo(pageId, token);
  if (!pageInfo.ok) {
    return {
      ok: false,
      source: "error",
      graphVersion: graphVersion(),
      pageId,
      pageName: null,
      pageLink: null,
      fanCount: null,
      followerCount: null,
      period: { since, until },
      totals: emptyTotals,
      metrics: [],
      unsupportedMetrics: [],
      notes: [pageInfo.reason],
    };
  }

  const info = pageInfo.data as {
    id?: string;
    name?: string;
    link?: string;
    fan_count?: number;
    followers_count?: number;
  };

  const totals = { ...emptyTotals };
  const metrics: MetaMetricResult[] = [];
  const unsupportedMetrics: string[] = [];

  for (const [key, candidates] of Object.entries(METRIC_CANDIDATES) as Array<[MetaMetricKey, string[]]>) {
    const result = await firstSupportedMetric(pageId, token, candidates, since, until);
    totals[key] = result.total;
    metrics.push(...result.attempts);
    if (result.total === null) unsupportedMetrics.push(key);
  }

  return {
    ok: true,
    source: "meta_graph_api",
    graphVersion: graphVersion(),
    pageId: info.id || pageId,
    pageName: info.name || null,
    pageLink: info.link || null,
    fanCount: info.fan_count ?? null,
    followerCount: info.followers_count ?? null,
    period: { since, until },
    totals,
    metrics,
    unsupportedMetrics,
    notes: [
      "Metrics are pulled live from Meta Graph API where Meta exposes them for this asset.",
      "Unsupported metrics are reported as null instead of estimated.",
      "Professional Mode personal-profile earnings may need a manual export/import fallback if Meta does not expose them through Graph API.",
    ],
  };
}
