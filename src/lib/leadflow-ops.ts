import "server-only";

import {
  hasLeadFlowDataApiConfig,
  insertLeadFlowRow,
  selectLeadFlowRows,
} from "@/lib/leadflow-data-api";
import { sanitizeLeadFlowEventProperties } from "@/lib/leadflow-events";

export type LeadFlowOpsRange = "today" | "7d" | "30d" | "month" | "custom";

export type LeadFlowOpsFilters = {
  range: LeadFlowOpsRange;
  start?: string;
  end?: string;
  vertical?: string;
  category?: string;
  sourceType?: string;
};

type JsonRecord = Record<string, unknown>;

type OpsEventRow = {
  id: string;
  event_name: string;
  route: string | null;
  source_path?: string | null;
  vertical: string | null;
  category: string | null;
  user_role: string | null;
  properties: JsonRecord | null;
  created_at: string;
};

type OpsLeadProfileRow = {
  id: string;
  title: string | null;
  vertical: string | null;
  category: string | null;
  score: number | string | null;
  confidence: number | string | null;
  source_type: string | null;
  source_proof_status: string | null;
  suppression_status: string | null;
  compliance_status: string | null;
  review_status: string | null;
  status?: string | null;
  created_at: string;
  updated_at?: string | null;
};

type OpsMarketplaceListingRow = {
  id: string;
  title: string | null;
  slug?: string | null;
  vertical: string | null;
  category: string | null;
  source_type: string | null;
  listing_status: string | null;
  review_status: string | null;
  compliance_status: string | null;
  access_model?: string | null;
  sample_enabled?: boolean | null;
  allowed_use?: string | null;
  buyer_visible_summary?: JsonRecord | null;
  created_at?: string | null;
  updated_at?: string | null;
};

type OpsResponseRow = {
  id: string;
  tool_slug: string | null;
  vertical: string | null;
  category?: string | null;
  score?: number | string | null;
  tags?: string[] | null;
  created_at: string;
};

type OpsBuyerRequestRow = {
  id: string;
  request_type: string | null;
  vertical: string | null;
  category: string | null;
  buyer_type?: string | null;
  budget_range?: string | null;
  urgency?: string | null;
  status: string | null;
  review_status?: string | null;
  filters?: JsonRecord | null;
  metadata?: JsonRecord | null;
  created_at: string;
};

type OpsSubmittedSourceRow = {
  id: string;
  source_name: string | null;
  source_type: string | null;
  origin_type: string | null;
  vertical: string | null;
  categories?: string[] | null;
  review_status: string | null;
  risk_level: string | null;
  created_at: string;
  updated_at?: string | null;
};

type OpsSampleRow = {
  id: string;
  listing_id: string | null;
  sample_type: string | null;
  title: string | null;
  price: number | string | null;
  status: string | null;
  created_at: string;
};

type OpsOrderRow = {
  id: string;
  order_type: string | null;
  listing_id: string | null;
  sample_id: string | null;
  amount: number | string | null;
  currency: string | null;
  status: string | null;
  created_at: string;
  paid_at?: string | null;
};

type OpsExportRow = {
  id: string;
  export_type: string | null;
  export_status: string | null;
  row_count?: number | string | null;
  marketplace_listing_id?: string | null;
  listing_id?: string | null;
  created_at: string;
};

type OpsSuppressionRow = {
  id: string;
  request_type: string | null;
  status: string | null;
  reason?: string | null;
  created_at: string;
};

type OpsPartnerEarningRow = {
  id: string;
  earning_type: string | null;
  amount: number | string | null;
  status: string | null;
  created_at: string;
};

type OpsCustomSourcingRow = {
  id: string;
  industry: string | null;
  vertical: string | null;
  buyer_type: string | null;
  geography: string | null;
  budget_range: string | null;
  status: string | null;
  feasibility_score?: number | string | null;
  created_at: string;
};

type OpsMatchResultRow = {
  id: string;
  buyer_request_id: string | null;
  matched_entity_type: string | null;
  matched_entity_id: string | null;
  listing_id?: string | null;
  match_score: number | string | null;
  recommended_action: string | null;
  created_at: string;
};

export type OpsMetric = {
  key: string;
  label: string;
  value: number;
  hint: string;
  href?: string;
  tone?: "neutral" | "good" | "warning" | "danger" | "premium";
};

export type OpsFunnelStep = {
  key: string;
  label: string;
  count: number;
  eventNames: string[];
};

export type OpsToolPerformanceRow = {
  toolName: string;
  toolSlug: string;
  views: number;
  starts: number;
  completions: number;
  completionRate: number;
  averageScore: number | null;
  profilesCreated: number;
  topTags: string[];
};

export type OpsMarketplacePerformanceRow = {
  listingId: string;
  title: string;
  vertical: string;
  views: number;
  sampleRequests: number;
  accessRequests: number;
  paidSamples: number;
  orders: number;
  exports: number;
  buyerMatchCount: number;
};

export type OpsRankRow = {
  label: string;
  count: number;
};

export type OpsComplianceWatch = {
  label: string;
  count: number;
  severity: "low" | "medium" | "high";
  href: string;
  note: string;
};

export type OpsRevenueRow = {
  label: string;
  amount: number;
  count: number;
};

export type LeadFlowOpsData = {
  mode: "live" | "offline";
  filters: Required<Pick<LeadFlowOpsFilters, "range">> & Omit<LeadFlowOpsFilters, "range">;
  rangeLabel: string;
  startedAt: string;
  endedAt: string;
  loadErrors: string[];
  today: OpsMetric[];
  funnel: OpsFunnelStep[];
  tools: OpsToolPerformanceRow[];
  marketplace: OpsMarketplacePerformanceRow[];
  buyerDemand: {
    industries: OpsRankRow[];
    geographies: OpsRankRow[];
    buyerTypes: OpsRankRow[];
    budgetRanges: OpsRankRow[];
    customSourcingRequests: number;
    unmatchedDemand: number;
  };
  sourceSupply: OpsMetric[];
  compliance: OpsComplianceWatch[];
  revenue: OpsRevenueRow[];
  actions: Array<{ label: string; href: string; eventKey: string; note: string }>;
};

const oneDayMs = 24 * 60 * 60 * 1000;

const eventSelect = "id,event_name,route,source_path,vertical,category,user_role,properties,created_at";
const profileSelect = "id,title,vertical,category,score,confidence,source_type,source_proof_status,suppression_status,compliance_status,review_status,status,created_at,updated_at";
const listingSelect = "id,title,slug,vertical,category,source_type,listing_status,review_status,compliance_status,access_model,sample_enabled,allowed_use,buyer_visible_summary,created_at,updated_at";
const responseSelect = "id,tool_slug,vertical,category,score,tags,created_at";
const buyerRequestSelect = "id,request_type,vertical,category,buyer_type,budget_range,urgency,status,review_status,filters,metadata,created_at";
const submittedSourceSelect = "id,source_name,source_type,origin_type,vertical,categories,review_status,risk_level,created_at,updated_at";
const sampleSelect = "id,listing_id,sample_type,title,price,status,created_at";
const orderSelect = "id,order_type,listing_id,sample_id,amount,currency,status,created_at,paid_at";
const exportSelect = "id,export_type,export_status,row_count,marketplace_listing_id,listing_id,created_at";
const suppressionSelect = "id,request_type,status,reason,created_at";
const partnerEarningSelect = "id,earning_type,amount,status,created_at";
const customSourcingSelect = "id,industry,vertical,buyer_type,geography,budget_range,status,feasibility_score,created_at";
const matchSelect = "id,buyer_request_id,matched_entity_type,matched_entity_id,listing_id,match_score,recommended_action,created_at";

const funnelDefinitions: Array<Omit<OpsFunnelStep, "count">> = [
  { key: "homepage_visits", label: "Homepage visits", eventNames: ["homepage_viewed"] },
  { key: "marketplace_visits", label: "Marketplace visits", eventNames: ["marketplace_viewed"] },
  { key: "listing_previews", label: "Listing previews", eventNames: ["listing_preview_opened", "listing_card_clicked"] },
  { key: "sample_requests", label: "Sample requests", eventNames: ["sample_request_started", "sample_request_submitted", "sample_requested"] },
  { key: "access_requests", label: "Access requests", eventNames: ["access_request_started", "access_request_submitted", "buyer_request_submitted"] },
  { key: "buyer_signups", label: "Buyer signups", eventNames: ["buyer_signup_completed", "buyer_login_completed"] },
  { key: "buyer_approvals", label: "Buyer approvals", eventNames: ["admin_buyer_request_reviewed"] },
  { key: "paid_samples", label: "Paid samples", eventNames: ["sample_payment_completed", "sample_access_granted"] },
  { key: "full_access_purchases", label: "Full access purchases", eventNames: ["checkout_completed", "order_paid"] },
  { key: "exports", label: "Exports", eventNames: ["buyer_export_completed", "admin_export_created", "admin_export_completed"] },
];

function now() {
  return new Date();
}

function startOfToday(date = now()) {
  return new Date(date.getFullYear(), date.getMonth(), date.getDate());
}

function startOfMonth(date = now()) {
  return new Date(date.getFullYear(), date.getMonth(), 1);
}

function parseDate(value: string | undefined) {
  if (!value) return null;
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? null : date;
}

function normalizeRange(value: string | undefined): LeadFlowOpsRange {
  if (value === "today" || value === "7d" || value === "30d" || value === "month" || value === "custom") return value;
  return "7d";
}

export function normalizeLeadFlowOpsFilters(input: Record<string, string | string[] | undefined> = {}): LeadFlowOpsFilters {
  const first = (value: string | string[] | undefined) => Array.isArray(value) ? value[0] : value;
  const range = normalizeRange(first(input.range));
  return {
    range,
    start: first(input.start)?.slice(0, 40),
    end: first(input.end)?.slice(0, 40),
    vertical: cleanDimension(first(input.vertical)),
    category: cleanDimension(first(input.category)),
    sourceType: cleanDimension(first(input.source_type) || first(input.sourceType)),
  };
}

function cleanDimension(value: string | undefined) {
  if (!value || value === "all") return undefined;
  const clean = value.replace(/[^\w\s:/.-]/g, "").trim().slice(0, 80);
  return clean || undefined;
}

function resolveRange(filters: LeadFlowOpsFilters) {
  const current = now();
  let start = new Date(current.getTime() - 7 * oneDayMs);
  if (filters.range === "today") start = startOfToday(current);
  if (filters.range === "30d") start = new Date(current.getTime() - 30 * oneDayMs);
  if (filters.range === "month") start = startOfMonth(current);
  if (filters.range === "custom") start = parseDate(filters.start) || start;
  const end = filters.range === "custom" ? parseDate(filters.end) || current : current;
  return { start, end: end > start ? end : current };
}

function rangeLabel(filters: LeadFlowOpsFilters, start: Date, end: Date) {
  if (filters.range === "today") return "Today";
  if (filters.range === "7d") return "Last 7 days";
  if (filters.range === "30d") return "Last 30 days";
  if (filters.range === "month") return "This month";
  return `${shortDate(start.toISOString())} to ${shortDate(end.toISOString())}`;
}

function shortDate(value: string) {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  return new Intl.DateTimeFormat("en-US", { month: "short", day: "numeric" }).format(date);
}

function inRange(value: string | null | undefined, start: Date, end: Date) {
  if (!value) return false;
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return false;
  return date >= start && date <= end;
}

function text(value: unknown) {
  return typeof value === "string" ? value.trim() : "";
}

function lower(value: unknown) {
  return text(value).toLowerCase();
}

function record(value: unknown): JsonRecord {
  return value && typeof value === "object" && !Array.isArray(value) ? value as JsonRecord : {};
}

function prop(row: { properties?: JsonRecord | null }, key: string) {
  const value = row.properties?.[key];
  return typeof value === "string" ? value.trim() : "";
}

function numberValue(value: unknown) {
  if (typeof value === "number" && Number.isFinite(value)) return value;
  if (typeof value === "string") {
    const parsed = Number(value.replace(/[^0-9.-]/g, ""));
    return Number.isFinite(parsed) ? parsed : 0;
  }
  return 0;
}

function safePercent(numerator: number, denominator: number) {
  return denominator > 0 ? Math.round((numerator / denominator) * 100) : 0;
}

function scoreFromRange(value: string) {
  if (value === "high") return 85;
  if (value === "medium") return 62;
  if (value === "low") return 38;
  return 0;
}

function dimensionMatches(value: unknown, filter: string | undefined) {
  if (!filter) return true;
  return lower(value) === filter.toLowerCase();
}

function eventMatchesFilters(row: OpsEventRow, filters: LeadFlowOpsFilters) {
  const props = row.properties || {};
  return (
    dimensionMatches(row.vertical || props.vertical, filters.vertical) &&
    dimensionMatches(row.category || props.category, filters.category) &&
    dimensionMatches(props.source_type || props.sourceType, filters.sourceType)
  );
}

function rowMatchesFilters(row: { vertical?: string | null; category?: string | null; source_type?: string | null }, filters: LeadFlowOpsFilters) {
  return (
    dimensionMatches(row.vertical, filters.vertical) &&
    dimensionMatches(row.category, filters.category) &&
    dimensionMatches(row.source_type, filters.sourceType)
  );
}

function countEvents(events: OpsEventRow[], names: string[]) {
  const set = new Set(names);
  return events.filter((event) => set.has(event.event_name)).length;
}

function countBy<T>(rows: T[], labelFor: (row: T) => string | null | undefined, limit = 6): OpsRankRow[] {
  const map = new Map<string, number>();
  for (const row of rows) {
    const label = text(labelFor(row)) || "Unknown";
    map.set(label, (map.get(label) || 0) + 1);
  }
  return [...map.entries()]
    .sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0]))
    .slice(0, limit)
    .map(([label, count]) => ({ label, count }));
}

function topTags(tags: string[]) {
  return [...countBy(tags, (tag) => tag, 4).map((row) => row.label)];
}

function displayToolName(slug: string) {
  if (!slug || slug === "unknown") return "Unknown tool";
  return slug.replace(/[-_]+/g, " ").replace(/\b\w/g, (char) => char.toUpperCase());
}

function listingIdFromEvent(event: OpsEventRow) {
  return prop(event, "listing_id") || prop(event, "listing") || "unknown";
}

function scoreBucket(value: unknown) {
  const score = numberValue(value);
  if (score >= 80) return "high";
  if (score >= 60) return "medium";
  if (score > 0) return "low";
  return "unknown";
}

async function safeSelect<T>(
  table: string,
  params: Record<string, string | number | boolean | null | undefined>,
  loadErrors: string[],
) {
  if (!hasLeadFlowDataApiConfig()) return [] as T[];
  return selectLeadFlowRows<T>(table, params).catch((error) => {
    const message = error instanceof Error ? error.message : `Could not load ${table}.`;
    loadErrors.push(message);
    return [] as T[];
  });
}

function offlineData(filters: LeadFlowOpsFilters, startedAt: string, endedAt: string, loadErrors: string[]): LeadFlowOpsData {
  return {
    mode: "offline",
    filters: { range: filters.range, start: filters.start, end: filters.end, vertical: filters.vertical, category: filters.category, sourceType: filters.sourceType },
    rangeLabel: "Safe fallback sample",
    startedAt,
    endedAt,
    loadErrors,
    today: [
      { key: "site_visits", label: "Site visits", value: 38, hint: "Demo traffic count from sanitized events", href: "/dashboard/analytics" },
      { key: "tool_starts", label: "Tool starts", value: 11, hint: "Demo quiz and widget starts", href: "/tools", tone: "good" },
      { key: "new_buyer_requests", label: "Buyer requests", value: 4, hint: "Demo buyer demand queue", href: "/dashboard/buyer-matching", tone: "premium" },
      { key: "suppression_requests", label: "Suppression", value: 1, hint: "Demo compliance queue", href: "/dashboard#suppression", tone: "warning" },
    ],
    funnel: funnelDefinitions.map((step, index) => ({ ...step, count: [38, 21, 13, 5, 4, 3, 2, 1, 1, 1][index] || 0 })),
    tools: [
      { toolName: "Website Money Leak Checker", toolSlug: "website-money-leak-checker", views: 14, starts: 9, completions: 5, completionRate: 56, averageScore: 74, profilesCreated: 3, topTags: ["website_gap", "follow_up", "local"] },
      { toolName: "AI Automation Readiness Score", toolSlug: "ai-automation-readiness-score", views: 10, starts: 6, completions: 4, completionRate: 67, averageScore: 69, profilesCreated: 2, topTags: ["ai_agent", "missed_calls"] },
    ],
    marketplace: [
      { listingId: "demo-ecommerce", title: "Ecommerce vendor signal pack", vertical: "Ecommerce", views: 12, sampleRequests: 4, accessRequests: 2, paidSamples: 1, orders: 1, exports: 0, buyerMatchCount: 3 },
      { listingId: "demo-local", title: "Local service route signal", vertical: "Home services", views: 9, sampleRequests: 2, accessRequests: 1, paidSamples: 0, orders: 0, exports: 0, buyerMatchCount: 2 },
    ],
    buyerDemand: {
      industries: [{ label: "Home services", count: 3 }, { label: "Ecommerce", count: 2 }],
      geographies: [{ label: "East Texas", count: 2 }, { label: "United States", count: 2 }],
      buyerTypes: [{ label: "Agency", count: 3 }, { label: "Operator", count: 1 }],
      budgetRanges: [{ label: "$1,500 to $5,000", count: 3 }, { label: "$5,000+", count: 1 }],
      customSourcingRequests: 2,
      unmatchedDemand: 1,
    },
    sourceSupply: [
      { key: "new_sources", label: "New submitted sources", value: 5, hint: "Demo source submissions", href: "/dashboard/source-submissions" },
      { key: "approved_sources", label: "Approved sources", value: 2, hint: "Demo approved for research or marketplace", href: "/dashboard/source-submissions", tone: "good" },
      { key: "high_risk_sources", label: "High-risk sources", value: 1, hint: "Demo needs permission or risk review", href: "/dashboard/source-submissions", tone: "warning" },
    ],
    compliance: [
      { label: "Suppression requests", count: 1, severity: "medium", href: "/dashboard#suppression", note: "Resolve before any export or buyer delivery." },
      { label: "Profiles needing source proof", count: 3, severity: "medium", href: "/dashboard#lead-profiles", note: "Attach proof before release." },
    ],
    revenue: [
      { label: "Paid samples", amount: 49, count: 1 },
      { label: "Listing access", amount: 149, count: 1 },
      { label: "Estimated partner earnings", amount: 25, count: 1 },
    ],
    actions: opsActions,
  };
}

const opsActions = [
  { label: "Review buyer requests", href: "/dashboard/buyer-matching", eventKey: "review_buyer_requests", note: "Route demand to listings, segments, samples, or custom sourcing." },
  { label: "Review source submissions", href: "/dashboard/source-submissions", eventKey: "review_source_submissions", note: "Clear proof, permission, risk, and marketplace readiness." },
  { label: "Open Product Factory", href: "/dashboard/product-factory", eventKey: "open_product_factory", note: "Turn reviewed segments and profiles into products." },
  { label: "Open Segment Builder", href: "/dashboard/segments", eventKey: "open_segment_builder", note: "Build sellable groups from reviewed, permissioned signals." },
  { label: "Open compliance queue", href: "/dashboard#suppression", eventKey: "open_compliance_queue", note: "Check suppression, source proof, and export blocks." },
  { label: "Create SEO page idea", href: "/industries", eventKey: "create_seo_page_idea", note: "Find vertical demand that deserves a traffic page." },
  { label: "Create new tool idea", href: "/builder/new", eventKey: "create_new_tool_idea", note: "Turn recurring buyer questions into a questionnaire." },
];

async function trackOpsDashboardView(filters: LeadFlowOpsFilters, totalEvents: number) {
  if (!hasLeadFlowDataApiConfig()) return;
  await insertLeadFlowRow("events", {
    event_name: "ops_dashboard_viewed",
    event_type: "server",
    route: "/dashboard/ops",
    user_role: "admin",
    properties: sanitizeLeadFlowEventProperties({
      route: "/dashboard/ops",
      range: filters.range,
      vertical: filters.vertical || "all",
      category: filters.category || "all",
      source_type: filters.sourceType || "all",
      event_count: totalEvents,
    }),
  }).catch(() => null);
}

export async function getLeadFlowOpsData(filtersInput: LeadFlowOpsFilters): Promise<LeadFlowOpsData> {
  const filters = { ...filtersInput, range: filtersInput.range || "7d" };
  const { start, end } = resolveRange(filters);
  const startedAt = start.toISOString();
  const endedAt = end.toISOString();
  const loadErrors: string[] = [];

  if (!hasLeadFlowDataApiConfig()) {
    return offlineData(filters, startedAt, endedAt, ["LeadFlow Supabase Data API is not configured. Ops dashboard is showing safe fallback sample data."]);
  }

  const commonParams = {
    created_at: `gte.${startedAt}`,
    order: "created_at.desc",
    limit: 5000,
  };

  const [
    rawEvents,
    rawProfiles,
    rawListings,
    rawResponses,
    rawBuyerRequests,
    rawSubmittedSources,
    rawSamples,
    rawOrders,
    rawExports,
    rawSuppressions,
    rawPartnerEarnings,
    rawCustomSourcing,
    rawMatches,
  ] = await Promise.all([
    safeSelect<OpsEventRow>("events", { select: eventSelect, ...commonParams }, loadErrors),
    safeSelect<OpsLeadProfileRow>("lead_profiles", { select: profileSelect, ...commonParams, limit: 2000 }, loadErrors),
    safeSelect<OpsMarketplaceListingRow>("marketplace_listings", { select: listingSelect, order: "updated_at.desc", limit: 600 }, loadErrors),
    safeSelect<OpsResponseRow>("responses", { select: responseSelect, ...commonParams, limit: 3000 }, loadErrors),
    safeSelect<OpsBuyerRequestRow>("buyer_requests", { select: buyerRequestSelect, ...commonParams, limit: 1000 }, loadErrors),
    safeSelect<OpsSubmittedSourceRow>("submitted_sources", { select: submittedSourceSelect, ...commonParams, limit: 1000 }, loadErrors),
    safeSelect<OpsSampleRow>("samples", { select: sampleSelect, ...commonParams, limit: 700 }, loadErrors),
    safeSelect<OpsOrderRow>("orders", { select: orderSelect, ...commonParams, limit: 1000 }, loadErrors),
    safeSelect<OpsExportRow>("exports", { select: exportSelect, ...commonParams, limit: 1000 }, loadErrors),
    safeSelect<OpsSuppressionRow>("suppression_requests", { select: suppressionSelect, ...commonParams, limit: 600 }, loadErrors),
    safeSelect<OpsPartnerEarningRow>("partner_earnings", { select: partnerEarningSelect, ...commonParams, limit: 800 }, loadErrors),
    safeSelect<OpsCustomSourcingRow>("custom_sourcing_requests", { select: customSourcingSelect, ...commonParams, limit: 1000 }, loadErrors),
    safeSelect<OpsMatchResultRow>("buyer_match_results", { select: matchSelect, ...commonParams, limit: 1500 }, loadErrors),
  ]);

  const events = rawEvents.filter((row) => inRange(row.created_at, start, end) && eventMatchesFilters(row, filters));
  const profiles = rawProfiles.filter((row) => inRange(row.created_at, start, end) && rowMatchesFilters(row, filters));
  const listings = rawListings.filter((row) => rowMatchesFilters(row, filters));
  const responses = rawResponses.filter((row) => inRange(row.created_at, start, end) && rowMatchesFilters(row, filters));
  const buyerRequests = rawBuyerRequests.filter((row) => inRange(row.created_at, start, end) && rowMatchesFilters(row, filters));
  const submittedSources = rawSubmittedSources.filter((row) => inRange(row.created_at, start, end) && rowMatchesFilters(row, filters));
  const samples = rawSamples.filter((row) => inRange(row.created_at, start, end));
  const orders = rawOrders.filter((row) => inRange(row.created_at, start, end));
  const exports = rawExports.filter((row) => inRange(row.created_at, start, end));
  const suppressions = rawSuppressions.filter((row) => inRange(row.created_at, start, end));
  const partnerEarnings = rawPartnerEarnings.filter((row) => inRange(row.created_at, start, end));
  const customSourcing = rawCustomSourcing.filter((row) => inRange(row.created_at, start, end) && dimensionMatches(row.vertical || row.industry, filters.vertical));
  const matches = rawMatches.filter((row) => inRange(row.created_at, start, end));

  await trackOpsDashboardView(filters, events.length);

  const funnel = funnelDefinitions.map((step) => ({
    ...step,
    count: countEvents(events, step.eventNames),
  }));

  const todayMetrics: OpsMetric[] = [
    { key: "site_visits", label: "Site visits", value: countEvents(events, ["homepage_viewed", "marketplace_viewed", "tools_hub_viewed", "submit_source_viewed", "custom_sourcing_page_viewed", "widget_loaded"]), hint: "Sanitized page and widget events", href: "/dashboard/analytics" },
    { key: "tool_starts", label: "Tool starts", value: countEvents(events, ["tool_card_clicked", "questionnaire_started", "widget_started", "civic_survey_started"]), hint: "Questionnaire and widget starts", href: "/tools", tone: "good" },
    { key: "tool_completions", label: "Tool completions", value: countEvents(events, ["questionnaire_completed", "widget_completed", "civic_survey_completed", "result_viewed"]), hint: "Finished tools and viewed results", href: "/dashboard/analytics", tone: "good" },
    { key: "new_profiles", label: "New profiles", value: profiles.length, hint: "Lead profiles created in range", href: "/dashboard#lead-profiles" },
    { key: "new_buyer_requests", label: "Buyer requests", value: buyerRequests.length, hint: "Marketplace and custom demand", href: "/dashboard/buyer-matching", tone: "premium" },
    { key: "new_source_submissions", label: "Source submissions", value: submittedSources.length, hint: "Sources needing review", href: "/dashboard/source-submissions" },
    { key: "sample_requests", label: "Sample requests", value: countEvents(events, ["sample_request_started", "sample_request_submitted", "sample_requested"]) || samples.length, hint: "Free, paid, and review-gated sample activity", href: "/dashboard/samples", tone: "premium" },
    { key: "orders", label: "Orders", value: orders.length, hint: "Checkout records in range", href: "/dashboard/orders", tone: "premium" },
    { key: "exports", label: "Exports", value: exports.length || countEvents(events, ["buyer_export_completed", "admin_export_created"]), hint: "Permissioned delivery events", href: "/dashboard/exports" },
    { key: "suppression_requests", label: "Suppression", value: suppressions.length, hint: "Must clear before release", href: "/dashboard#suppression", tone: suppressions.length ? "warning" : "good" },
  ];

  const tools = buildToolRows(events, responses, profiles);
  const marketplace = buildMarketplaceRows(events, listings, orders, exports, matches);
  const sourceSupply = buildSourceSupply(submittedSources);
  const compliance = buildComplianceWatch({ suppressions, profiles, submittedSources, listings, events });
  const revenue = buildRevenueRows(orders, partnerEarnings);

  const noRowsLoaded =
    events.length + profiles.length + listings.length + responses.length + buyerRequests.length + submittedSources.length + samples.length + orders.length + exports.length + suppressions.length + customSourcing.length === 0;

  if (noRowsLoaded && loadErrors.length) {
    return offlineData(filters, startedAt, endedAt, loadErrors.slice(0, 4));
  }

  return {
    mode: loadErrors.length ? "offline" : "live",
    filters: { range: filters.range, start: filters.start, end: filters.end, vertical: filters.vertical, category: filters.category, sourceType: filters.sourceType },
    rangeLabel: rangeLabel(filters, start, end),
    startedAt,
    endedAt,
    loadErrors: loadErrors.slice(0, 4),
    today: todayMetrics,
    funnel,
    tools,
    marketplace,
    buyerDemand: {
      industries: countBy([...buyerRequests, ...customSourcing], (row) => "industry" in row ? row.industry || row.vertical : row.vertical || row.category),
      geographies: countBy(customSourcing, (row) => row.geography),
      buyerTypes: countBy([...buyerRequests, ...customSourcing], (row) => "buyer_type" in row ? row.buyer_type : null),
      budgetRanges: countBy([...buyerRequests, ...customSourcing], (row) => "budget_range" in row ? row.budget_range : null),
      customSourcingRequests: customSourcing.length,
      unmatchedDemand: buyerRequests.filter((row) => lower(row.status).includes("unmatched") || lower(row.review_status).includes("needs") || lower(row.metadata?.recommended_action).includes("custom_sourcing")).length,
    },
    sourceSupply,
    compliance,
    revenue,
    actions: opsActions,
  };
}

function buildToolRows(events: OpsEventRow[], responses: OpsResponseRow[], profiles: OpsLeadProfileRow[]): OpsToolPerformanceRow[] {
  const toolSlugs = new Set<string>();
  for (const event of events) {
    const slug = prop(event, "tool_slug") || prop(event, "tool") || prop(event, "widget_type");
    if (slug) toolSlugs.add(slug);
  }
  for (const response of responses) {
    if (response.tool_slug) toolSlugs.add(response.tool_slug);
  }

  return [...toolSlugs].slice(0, 12).map((slug) => {
    const toolEvents = events.filter((event) => [prop(event, "tool_slug"), prop(event, "tool"), prop(event, "widget_type")].includes(slug));
    const toolResponses = responses.filter((response) => response.tool_slug === slug);
    const views = countEvents(toolEvents, ["tool_card_clicked", "widget_loaded"]);
    const starts = countEvents(toolEvents, ["questionnaire_started", "widget_started", "civic_survey_started"]);
    const completions = countEvents(toolEvents, ["questionnaire_completed", "widget_completed", "civic_survey_completed", "result_viewed"]);
    const scores = [
      ...toolResponses.map((response) => numberValue(response.score)).filter(Boolean),
      ...toolEvents.map((event) => numberValue(event.properties?.score) || scoreFromRange(prop(event, "score_range"))).filter(Boolean),
    ];
    const tags = [
      ...toolResponses.flatMap((response) => Array.isArray(response.tags) ? response.tags : []),
      ...toolEvents.map((event) => prop(event, "tag") || prop(event, "category")).filter(Boolean),
    ];
    return {
      toolName: displayToolName(slug),
      toolSlug: slug,
      views,
      starts,
      completions,
      completionRate: safePercent(completions, starts || views),
      averageScore: scores.length ? Math.round(scores.reduce((sum, score) => sum + score, 0) / scores.length) : null,
      profilesCreated: profiles.filter((profile) => lower(profile.title).includes(slug.replace(/-/g, " "))).length,
      topTags: topTags(tags),
    };
  }).sort((a, b) => b.starts + b.completions - (a.starts + a.completions));
}

function buildMarketplaceRows(
  events: OpsEventRow[],
  listings: OpsMarketplaceListingRow[],
  orders: OpsOrderRow[],
  exports: OpsExportRow[],
  matches: OpsMatchResultRow[],
): OpsMarketplacePerformanceRow[] {
  const titles = new Map<string, OpsMarketplaceListingRow>();
  for (const listing of listings) titles.set(listing.id, listing);
  const ids = new Set<string>(listings.map((listing) => listing.id));
  for (const event of events) {
    const id = listingIdFromEvent(event);
    if (id !== "unknown") ids.add(id);
  }
  for (const order of orders) if (order.listing_id) ids.add(order.listing_id);
  for (const item of exports) if (item.marketplace_listing_id || item.listing_id) ids.add(item.marketplace_listing_id || item.listing_id || "");
  for (const match of matches) if (match.listing_id || match.matched_entity_id) ids.add(match.listing_id || match.matched_entity_id || "");

  return [...ids].filter(Boolean).slice(0, 14).map((id) => {
    const listing = titles.get(id);
    const listingEvents = events.filter((event) => listingIdFromEvent(event) === id);
    return {
      listingId: id,
      title: listing?.title || `Listing ${id.slice(0, 8)}`,
      vertical: listing?.vertical || "Unknown",
      views: countEvents(listingEvents, ["listing_card_clicked", "listing_preview_opened", "sample_page_viewed"]),
      sampleRequests: countEvents(listingEvents, ["sample_request_started", "sample_request_submitted", "sample_requested"]),
      accessRequests: countEvents(listingEvents, ["access_request_started", "access_request_submitted"]),
      paidSamples: countEvents(listingEvents, ["sample_payment_completed", "sample_access_granted"]),
      orders: orders.filter((order) => order.listing_id === id).length,
      exports: exports.filter((item) => item.marketplace_listing_id === id || item.listing_id === id).length,
      buyerMatchCount: matches.filter((match) => match.listing_id === id || match.matched_entity_id === id).length,
    };
  }).sort((a, b) => b.views + b.sampleRequests + b.accessRequests + b.orders - (a.views + a.sampleRequests + a.accessRequests + a.orders));
}

function buildSourceSupply(rows: OpsSubmittedSourceRow[]): OpsMetric[] {
  const approved = rows.filter((row) => ["approved_for_research", "approved_for_marketplace"].includes(row.review_status || "")).length;
  const rejected = rows.filter((row) => row.review_status === "rejected").length;
  const highRisk = rows.filter((row) => ["high", "prohibited"].includes(row.risk_level || "")).length;
  const converted = rows.filter((row) => row.review_status === "approved_for_marketplace").length;
  return [
    { key: "new_sources", label: "New submitted sources", value: rows.length, hint: "Sources submitted in range", href: "/dashboard/source-submissions" },
    { key: "approved_sources", label: "Approved sources", value: approved, hint: "Approved for research or marketplace", href: "/dashboard/source-submissions", tone: "good" },
    { key: "rejected_sources", label: "Rejected sources", value: rejected, hint: "Rejected after review", href: "/dashboard/source-submissions", tone: rejected ? "warning" : "neutral" },
    { key: "high_risk_sources", label: "High-risk sources", value: highRisk, hint: "High-risk or prohibited source submissions", href: "/dashboard/source-submissions", tone: highRisk ? "danger" : "good" },
    { key: "converted_sources", label: "Converted to listings", value: converted, hint: "Approved for marketplace release", href: "/dashboard/product-factory", tone: "premium" },
  ];
}

function buildComplianceWatch(input: {
  suppressions: OpsSuppressionRow[];
  profiles: OpsLeadProfileRow[];
  submittedSources: OpsSubmittedSourceRow[];
  listings: OpsMarketplaceListingRow[];
  events: OpsEventRow[];
}): OpsComplianceWatch[] {
  const highRiskRecords = input.submittedSources.filter((row) => ["high", "prohibited"].includes(row.risk_level || "")).length;
  const profilesMissingProof = input.profiles.filter((row) => !["approved", "verified"].includes(lower(row.source_proof_status))).length;
  const listingsMissingAllowedUse = input.listings.filter((row) => {
    const summary = record(row.buyer_visible_summary);
    return !text(row.allowed_use) && !text(summary.allowed_use);
  }).length;
  const exportBlocks = countEvents(input.events, ["buyer_export_blocked", "admin_export_blocked"]);
  const civicReviewItems = input.events.filter((event) => event.event_name.startsWith("civic_") && (lower(event.category).includes("political") || lower(event.vertical).includes("civic") || lower(event.properties?.status).includes("flagged"))).length;

  return [
    { label: "Suppression requests", count: input.suppressions.length, severity: input.suppressions.length ? "medium" : "low", href: "/dashboard#suppression", note: "Resolve before buyer delivery." },
    { label: "High-risk records", count: highRiskRecords, severity: highRiskRecords ? "high" : "low", href: "/dashboard/source-submissions", note: "Block prohibited, unclear, leaked, minor, protected-trait, or sensitive records." },
    { label: "Profiles needing source proof", count: profilesMissingProof, severity: profilesMissingProof ? "medium" : "low", href: "/dashboard#lead-profiles", note: "No profile should release without proof status." },
    { label: "Listings missing allowed use", count: listingsMissingAllowedUse, severity: listingsMissingAllowedUse ? "medium" : "low", href: "/dashboard/product-factory", note: "Write allowed and restricted use before selling access." },
    { label: "Export blocks", count: exportBlocks, severity: exportBlocks ? "high" : "low", href: "/dashboard/exports", note: "Blocked exports show entitlement, suppression, or risk controls firing." },
    { label: "Civic review items", count: civicReviewItems, severity: civicReviewItems ? "high" : "low", href: "/dashboard/civic", note: "Keep civic data aggregate, public-source, or explicit-consent only." },
  ];
}

function buildRevenueRows(orders: OpsOrderRow[], partnerEarnings: OpsPartnerEarningRow[]): OpsRevenueRow[] {
  const paidOrders = orders.filter((order) => ["paid", "fulfilled"].includes(order.status || ""));
  const byType = (type: string) => paidOrders.filter((order) => order.order_type === type);
  const sum = (rows: Array<{ amount: number | string | null }>) => rows.reduce((total, row) => total + numberValue(row.amount), 0);
  const refunds = orders.filter((order) => order.status === "refunded");
  const partnerEstimated = partnerEarnings.filter((earning) => ["estimated", "pending", "approved"].includes(earning.status || ""));
  return [
    { label: "Paid samples", amount: sum(byType("sample")), count: byType("sample").length },
    { label: "Listing access", amount: sum(byType("listing_access")), count: byType("listing_access").length },
    { label: "Exclusive deposits", amount: sum(byType("exclusive_deposit")), count: byType("exclusive_deposit").length },
    { label: "Custom sourcing payments", amount: sum(byType("custom_signal_request")), count: byType("custom_signal_request").length },
    { label: "Estimated partner earnings", amount: sum(partnerEstimated), count: partnerEstimated.length },
    { label: "Refunds", amount: sum(refunds), count: refunds.length },
  ];
}
