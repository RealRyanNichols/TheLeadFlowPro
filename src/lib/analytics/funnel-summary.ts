import "server-only";

import { hasLeadFlowDataApiConfig, selectLeadFlowRows } from "@/lib/leadflow-data-api";

type EventProperties = Record<string, unknown>;

export type LeadFlowFunnelEventRow = {
  id: string;
  event_name: string;
  route: string | null;
  source_path: string | null;
  vertical: string | null;
  category: string | null;
  user_role: string | null;
  properties: EventProperties | null;
  created_at: string;
};

export type LeadFlowFunnelMetric = {
  key: string;
  label: string;
  count: number;
  eventNames: string[];
};

export type LeadFlowFunnelSummary = {
  mode: "live" | "offline";
  rangeDays: number;
  loadErrors: string[];
  metrics: LeadFlowFunnelMetric[];
  topRoutes: Array<{ route: string; count: number }>;
  topVerticals: Array<{ vertical: string; count: number }>;
  topCtas: Array<{ cta: string; count: number }>;
  recentEvents: LeadFlowFunnelEventRow[];
};

const metricDefinitions: Array<Omit<LeadFlowFunnelMetric, "count">> = [
  {
    key: "homepage_cta_clicks",
    label: "Homepage CTA clicks",
    eventNames: ["hero_cta_clicked", "buyer_lane_clicked", "system_lane_clicked", "submit_source_lane_clicked"],
  },
  {
    key: "marketplace_listing_views",
    label: "Marketplace listing views",
    eventNames: ["listing_card_clicked", "listing_preview_opened"],
  },
  {
    key: "sample_requests",
    label: "Sample requests",
    eventNames: ["sample_request_started", "sample_request_submitted"],
  },
  {
    key: "access_requests",
    label: "Access requests",
    eventNames: ["access_request_started", "access_request_submitted"],
  },
  {
    key: "tool_starts",
    label: "Tool starts",
    eventNames: ["tool_card_clicked", "questionnaire_started"],
  },
  {
    key: "tool_completions",
    label: "Tool completions",
    eventNames: ["questionnaire_completed", "result_viewed"],
  },
  {
    key: "source_submissions",
    label: "Source submissions",
    eventNames: ["source_submission_started", "source_submission_completed"],
  },
  {
    key: "buyer_signups",
    label: "Buyer signups and logins",
    eventNames: ["buyer_login_started", "buyer_login_completed", "buyer_signup_started", "buyer_signup_completed"],
  },
  {
    key: "buyer_approvals",
    label: "Buyer approvals",
    eventNames: ["admin_buyer_request_reviewed"],
  },
  {
    key: "exports",
    label: "Exports",
    eventNames: ["buyer_export_completed", "admin_export_created", "admin_export_completed"],
  },
];

function sinceIso(days: number) {
  return new Date(Date.now() - days * 24 * 60 * 60 * 1000).toISOString();
}

function countBy(rows: LeadFlowFunnelEventRow[], valueFor: (row: LeadFlowFunnelEventRow) => string | null | undefined) {
  const counts = new Map<string, number>();
  for (const row of rows) {
    const value = valueFor(row);
    if (!value) continue;
    counts.set(value, (counts.get(value) || 0) + 1);
  }
  return Array.from(counts.entries())
    .sort((a, b) => b[1] - a[1])
    .slice(0, 8)
    .map(([value, count]) => ({ value, count }));
}

function ctaFor(row: LeadFlowFunnelEventRow) {
  const cta = row.properties?.cta;
  return typeof cta === "string" ? cta : null;
}

export async function getLeadFlowFunnelSummary(rangeDays = 30): Promise<LeadFlowFunnelSummary> {
  if (!hasLeadFlowDataApiConfig()) {
    return {
      mode: "offline",
      rangeDays,
      loadErrors: ["LeadFlow Supabase Data API is not configured. Funnel dashboard is showing empty live counts."],
      metrics: metricDefinitions.map((metric) => ({ ...metric, count: 0 })),
      topRoutes: [],
      topVerticals: [],
      topCtas: [],
      recentEvents: [],
    };
  }

  const loadErrors: string[] = [];
  const events = await selectLeadFlowRows<LeadFlowFunnelEventRow>("events", {
    select: "id,event_name,route,source_path,vertical,category,user_role,properties,created_at",
    created_at: `gte.${sinceIso(rangeDays)}`,
    order: "created_at.desc",
    limit: 5000,
  }).catch((error) => {
    loadErrors.push(error instanceof Error ? error.message : "Could not load events.");
    return [];
  });

  const metrics = metricDefinitions.map((metric) => ({
    ...metric,
    count: events.filter((event) => metric.eventNames.includes(event.event_name)).length,
  }));

  return {
    mode: "live",
    rangeDays,
    loadErrors,
    metrics,
    topRoutes: countBy(events, (row) => row.route || row.source_path || null).map(({ value, count }) => ({ route: value, count })),
    topVerticals: countBy(events, (row) => row.vertical).map(({ value, count }) => ({ vertical: value, count })),
    topCtas: countBy(events, ctaFor).map(({ value, count }) => ({ cta: value, count })),
    recentEvents: events.slice(0, 50),
  };
}
