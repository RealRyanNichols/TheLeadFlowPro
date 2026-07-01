import "server-only";

import {
  buyerAccountIsRestricted,
  getBuyerPortalData,
  type BuyerAccount,
} from "@/lib/buyer-portal";
import {
  hasLeadFlowDataApiConfig,
  insertLeadFlowRow,
  leadflowDataApi,
  patchLeadFlowRows,
  selectLeadFlowRows,
} from "@/lib/leadflow-data-api";
import { sanitizeLeadFlowEventProperties } from "@/lib/leadflow-events";
import { scoreCandidate, sortedMatches } from "./scoring";
import {
  fallbackMarketplaceListingCandidates,
  matchLeadProfiles,
  matchListings,
  matchSamples,
  type MarketplaceListingMatchRow,
} from "./match-listings";
import { matchSegments, type SegmentMatchRow } from "./match-segments";
import { matchTools } from "./match-tools";
import type {
  BuyerDemandInput,
  BuyerMatchingRunResult,
  BuyerMatchResult,
  MatchRecommendedAction,
  MatchedEntityType,
  StoredBuyerMatchResult,
} from "./types";

export type BuyerMatchingRequestRow = {
  id: string;
  buyer_account_id: string | null;
  listing_id?: string | null;
  marketplace_listing_id?: string | null;
  listing_slug?: string | null;
  request_type: string;
  vertical: string | null;
  category: string | null;
  buyer_use_case?: string | null;
  intended_use?: string | null;
  budget_range?: string | null;
  urgency?: string | null;
  filters?: Record<string, unknown> | null;
  status: string | null;
  review_status: string | null;
  metadata?: Record<string, unknown> | null;
  created_at: string;
  updated_at?: string;
};

export type BuyerRecommendationsData =
  | Extract<Awaited<ReturnType<typeof getBuyerPortalData>>, { authenticated: false }>
  | {
      authenticated: true;
      portal: Extract<Awaited<ReturnType<typeof getBuyerPortalData>>, { authenticated: true }>;
      mode: "live" | "offline";
      loadErrors: string[];
      bestMatches: BuyerMatchResult[];
      sampleMatches: BuyerMatchResult[];
      exclusiveMatches: BuyerMatchResult[];
      toolMatches: BuyerMatchResult[];
      customSourcingRecommended: boolean;
      latestRequest: BuyerMatchingRequestRow | null;
    };

export type AdminBuyerMatchingData = {
  mode: "live" | "offline";
  loadErrors: string[];
  requests: BuyerMatchingRequestRow[];
  results: StoredBuyerMatchResult[];
  requestSummaries: Array<{
    request: BuyerMatchingRequestRow;
    buyer: { name: string; company: string; status: string } | null;
    topMatches: BuyerMatchResult[];
    storedCount: number;
    recommendedAction: MatchRecommendedAction;
    status: "matched" | "unmatched" | "custom_sourcing" | "needs_profile";
  }>;
  stats: {
    totalRequests: number;
    unmatchedRequests: number;
    highValueRequests: number;
    requestsWithListings: number;
    customSourcingNeeded: number;
    storedMatches: number;
  };
};

type MatchSources = {
  listings: MarketplaceListingMatchRow[];
  segments: SegmentMatchRow[];
  leadProfiles: MarketplaceListingMatchRow[];
};

type BuyerAccountRow = Pick<BuyerAccount, "id" | "name" | "company_name" | "buyer_type" | "industry" | "location_served" | "budget_range" | "intended_use" | "account_status" | "approved_access_level">;

const requestSelect = [
  "id",
  "buyer_account_id",
  "listing_id",
  "marketplace_listing_id",
  "listing_slug",
  "request_type",
  "vertical",
  "category",
  "buyer_use_case",
  "intended_use",
  "budget_range",
  "urgency",
  "filters",
  "status",
  "review_status",
  "metadata",
  "created_at",
  "updated_at",
].join(",");

const buyerAccountSelect = [
  "id",
  "name",
  "company_name",
  "buyer_type",
  "industry",
  "location_served",
  "budget_range",
  "intended_use",
  "account_status",
  "approved_access_level",
].join(",");

const matchResultSelect = [
  "id",
  "buyer_request_id",
  "buyer_account_id",
  "matched_entity_type",
  "matched_entity_id",
  "listing_id",
  "segment_id",
  "lead_profile_id",
  "sample_id",
  "tool_slug",
  "match_score",
  "match_label",
  "match_reasons",
  "score_components",
  "recommended_action",
  "missing_buyer_info",
  "caution_note",
  "status",
  "created_at",
  "updated_at",
  "metadata",
].join(",");

const listingSelect = [
  "id",
  "slug",
  "lead_profile_id",
  "title",
  "vertical",
  "category",
  "buyer_type",
  "source_type",
  "location_label",
  "listing_status",
  "review_status",
  "release_mode",
  "access_model",
  "territory",
  "score",
  "confidence",
  "price_cents",
  "sample_enabled",
  "sample_price",
  "sample_count",
  "sample_record_count",
  "compliance_status",
  "source_proof_status",
  "buyer_visible_summary",
  "freshness_label",
  "updated_at",
].join(",");

const profileSelect = [
  "id",
  "slug",
  "title",
  "vertical",
  "category",
  "buyer_type",
  "source_type",
  "score",
  "confidence",
  "compliance_status",
  "source_proof_status",
  "suppression_status",
  "review_status",
  "buyer_visible_summary",
  "updated_at",
].join(",");

const segmentSelect = [
  "id",
  "name",
  "description",
  "segment_type",
  "vertical",
  "category",
  "status",
  "visibility",
  "member_count",
  "risk_level",
  "compliance_status",
  "quality_summary",
  "updated_at",
].join(",");

function text(value: unknown) {
  return typeof value === "string" ? value.trim() : "";
}

function fromRecord(record: Record<string, unknown> | null | undefined, key: string) {
  return record && typeof record[key] === "string" ? String(record[key]) : "";
}

function filtersFromRequest(request: BuyerMatchingRequestRow) {
  return request.filters && typeof request.filters === "object" ? request.filters : {};
}

function metadataFromRequest(request: BuyerMatchingRequestRow) {
  return request.metadata && typeof request.metadata === "object" ? request.metadata : {};
}

function deriveDemandInput(request: BuyerMatchingRequestRow, account?: BuyerAccountRow | BuyerAccount | null): BuyerDemandInput {
  const filters = filtersFromRequest(request);
  const metadata = metadataFromRequest(request);
  return {
    buyerAccountId: request.buyer_account_id || account?.id || null,
    buyerRequestId: request.id,
    buyerType: account?.buyer_type || fromRecord(metadata, "buyer_type") || fromRecord(filters, "buyerType") || null,
    industry:
      account?.industry ||
      request.vertical ||
      request.category ||
      fromRecord(metadata, "industry") ||
      fromRecord(metadata, "industry_served") ||
      fromRecord(filters, "industry") ||
      fromRecord(filters, "industryServed") ||
      null,
    geography:
      account?.location_served ||
      fromRecord(metadata, "geography_served") ||
      fromRecord(filters, "geographyServed") ||
      fromRecord(filters, "location") ||
      null,
    budgetRange:
      request.budget_range ||
      account?.budget_range ||
      fromRecord(metadata, "monthly_budget_range") ||
      fromRecord(filters, "monthlyBudgetRange") ||
      null,
    desiredLeadType: request.category || request.listing_slug || fromRecord(metadata, "listing_title") || null,
    urgency: request.urgency || fromRecord(metadata, "speed") || fromRecord(filters, "urgency") || null,
    intendedUse: request.intended_use || request.buyer_use_case || account?.intended_use || fromRecord(metadata, "notes") || null,
    accessPreference: fromRecord(metadata, "access_preference") || fromRecord(filters, "accessPreference") || null,
    sourcePreference: fromRecord(filters, "sourceType") || fromRecord(metadata, "source_type") || null,
    confidenceRequirement: fromRecord(filters, "confidence") || null,
    listingSlug: request.listing_slug || fromRecord(metadata, "listing_id") || null,
    listingTitle: fromRecord(metadata, "listing_title") || null,
  };
}

function uuidOrNull(value: string | null | undefined) {
  return value && /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(value) ? value : null;
}

function recordArray(value: unknown): string[] {
  if (Array.isArray(value)) return value.map((item) => String(item)).filter(Boolean);
  return [];
}

function entityUuid(result: BuyerMatchResult, type: MatchedEntityType) {
  return result.matchedEntityType === type ? uuidOrNull(result.matchedEntityId) : null;
}

function resultFromStored(row: StoredBuyerMatchResult): BuyerMatchResult {
  const metadata = row.metadata || {};
  return {
    buyerRequestId: row.buyer_request_id,
    buyerAccountId: row.buyer_account_id,
    matchedEntityType: row.matched_entity_type,
    matchedEntityId: row.matched_entity_id,
    title: text(metadata.title) || row.matched_entity_id.replace(/-/g, " "),
    category: text(metadata.category) || "Lead signals",
    vertical: text(metadata.vertical) || "Lead signals",
    summary: text(metadata.summary) || "Stored buyer-safe match summary.",
    matchScore: Number(row.match_score) || 0,
    matchLabel: row.match_label,
    matchReasons: recordArray(row.match_reasons),
    scoreComponents: row.score_components as BuyerMatchResult["scoreComponents"],
    recommendedAction: row.recommended_action,
    missingBuyerInfo: recordArray(row.missing_buyer_info),
    cautionNote: row.caution_note || "Access remains review-gated.",
    href: text(metadata.href) || "/marketplace",
  };
}

async function trackMatchingEvent(eventName: string, properties: Record<string, unknown>) {
  if (!hasLeadFlowDataApiConfig()) return;
  await insertLeadFlowRow("events", {
    event_name: eventName,
    event_type: "server",
    route: "/buyer/recommendations",
    user_role: properties.user_role === "admin" ? "admin" : properties.user_role === "buyer" ? "buyer" : "system",
    source_path: typeof properties.route === "string" ? properties.route : "/buyer/recommendations",
    properties: sanitizeLeadFlowEventProperties(properties),
  }).catch(() => null);
}

async function auditMatchingRun(input: {
  buyerRequestId: string;
  buyerAccountId: string | null;
  resultCount: number;
  customSourcingRecommended: boolean;
}) {
  if (!hasLeadFlowDataApiConfig()) return;
  await insertLeadFlowRow("audit_log", {
    actor_type: "system",
    action: "buyer_matching.run",
    object_schema: "leadflow",
    object_table: "buyer_requests",
    object_id: uuidOrNull(input.buyerRequestId),
    buyer_account_id: uuidOrNull(input.buyerAccountId || undefined),
    details: {
      result_count: input.resultCount,
      custom_sourcing_recommended: input.customSourcingRecommended,
      raw_records_returned: false,
    },
  }).catch(() => null);
}

async function loadSources(): Promise<{ sources: MatchSources; errors: string[]; mode: "live" | "offline" }> {
  if (!hasLeadFlowDataApiConfig()) {
    return { sources: { listings: [], leadProfiles: [], segments: [] }, errors: ["Supabase service env is not configured."], mode: "offline" };
  }

  const errors: string[] = [];
  const [listings, profiles, segments] = await Promise.all([
    selectLeadFlowRows<MarketplaceListingMatchRow>("marketplace_listings", {
      select: listingSelect,
      deleted_at: "is.null",
      order: "updated_at.desc",
      limit: 80,
    }).catch((error) => {
      errors.push(error instanceof Error ? error.message : "Could not load marketplace listings.");
      return [];
    }),
    selectLeadFlowRows<MarketplaceListingMatchRow>("lead_profiles", {
      select: profileSelect,
      deleted_at: "is.null",
      order: "updated_at.desc",
      limit: 80,
    }).catch((error) => {
      errors.push(error instanceof Error ? error.message : "Could not load lead profiles.");
      return [];
    }),
    selectLeadFlowRows<SegmentMatchRow>("segments", {
      select: segmentSelect,
      deleted_at: "is.null",
      order: "updated_at.desc",
      limit: 80,
    }).catch((error) => {
      errors.push(error instanceof Error ? error.message : "Could not load segments.");
      return [];
    }),
  ]);

  return { sources: { listings, leadProfiles: profiles, segments }, errors, mode: errors.length === 3 ? "offline" : "live" };
}

function buildResults(input: BuyerDemandInput, sources: MatchSources) {
  const listings = matchListings(input, sources.listings, 6);
  const samples = matchSamples(input, sources.listings, 3);
  const segments = matchSegments(input, sources.segments, 4);
  const profiles = matchLeadProfiles(input, sources.leadProfiles, 4);
  const tools = matchTools(input, 4);
  const all = sortedMatches([...listings, ...samples, ...segments, ...profiles, ...tools], 12);
  const customSourcingRecommended = all.length === 0 || all[0].matchScore < 58 || all.some((result) => result.recommendedAction === "request_custom_sourcing");

  if (customSourcingRecommended && !all.some((result) => result.matchedEntityType === "custom_sourcing")) {
    const custom = scoreCandidate(input, {
      id: "custom-sourcing-review",
      entityType: "custom_sourcing",
      title: "Custom sourcing review",
      category: input.industry || "Custom demand",
      vertical: input.industry || "Custom sourcing",
      summary: "No exact marketplace match is strong enough yet. A custom sourcing request can define the industry, geography, proof type, and review path.",
      buyerUseCase: input.intendedUse || "Buyer needs a signal pack not currently listed.",
      buyerType: input.buyerType || "Buyer",
      geography: input.geography || "Buyer-defined",
      budgetRange: input.budgetRange || null,
      accessModel: input.accessPreference || "review_gated",
      sourceType: input.sourcePreference || "manual_research",
      confidence: "needs_review",
      score: 62,
      complianceStatus: "needs_review",
      availabilityStatus: "available",
      sourceProofStatus: "review",
      href: "/custom-sourcing",
    });
    custom.recommendedAction = "request_custom_sourcing";
    all.push(custom);
  }

  return sortedMatches(all, 12);
}

async function persistMatchResults(input: {
  buyerRequestId: string;
  buyerAccountId: string | null;
  results: BuyerMatchResult[];
}) {
  if (!hasLeadFlowDataApiConfig()) return false;

  await patchLeadFlowRows<StoredBuyerMatchResult>(
    "buyer_match_results",
    { buyer_request_id: `eq.${input.buyerRequestId}`, status: "eq.active" },
    { status: "archived" },
  ).catch(() => null);

  const rows = input.results.slice(0, 12).map((result) => ({
      buyer_request_id: input.buyerRequestId,
      buyer_account_id: input.buyerAccountId,
      matched_entity_type: result.matchedEntityType,
      matched_entity_id: result.matchedEntityId,
      listing_id: entityUuid(result, "marketplace_listing"),
      segment_id: entityUuid(result, "segment"),
      lead_profile_id: entityUuid(result, "lead_profile"),
      sample_id: entityUuid(result, "sample"),
      tool_slug: result.matchedEntityType === "tool" ? result.matchedEntityId : null,
      match_score: result.matchScore,
      match_label: result.matchLabel,
      match_reasons: result.matchReasons,
      score_components: result.scoreComponents,
      recommended_action: result.recommendedAction,
      missing_buyer_info: result.missingBuyerInfo,
      caution_note: result.cautionNote,
      status: "active",
      metadata: {
        title: result.title,
        category: result.category,
        vertical: result.vertical,
        summary: result.summary,
        href: result.href,
        raw_records_returned: false,
      },
    }));

  await Promise.all(rows.map((row) =>
    leadflowDataApi<StoredBuyerMatchResult[]>("buyer_match_results", {
      method: "POST",
      query: "on_conflict=buyer_request_id,matched_entity_type,matched_entity_id",
      headers: { prefer: "resolution=merge-duplicates,return=representation" },
      body: JSON.stringify(row),
    }).catch(() => null),
  ));
  return true;
}

export async function runBuyerDemandMatching(input: {
  request: BuyerMatchingRequestRow;
  buyerAccount?: BuyerAccountRow | BuyerAccount | null;
  persist?: boolean;
}): Promise<BuyerMatchingRunResult> {
  const demand = deriveDemandInput(input.request, input.buyerAccount);
  const sourceLoad = await loadSources();
  const results = buildResults(demand, sourceLoad.sources);
  const customSourcingRecommended = results.some((result) => result.recommendedAction === "request_custom_sourcing");
  const persisted = input.persist
    ? await persistMatchResults({
        buyerRequestId: input.request.id,
        buyerAccountId: demand.buyerAccountId || null,
        results,
      })
    : false;

  if (input.persist) {
    await Promise.all([
      auditMatchingRun({
        buyerRequestId: input.request.id,
        buyerAccountId: demand.buyerAccountId || null,
        resultCount: results.length,
        customSourcingRecommended,
      }),
      trackMatchingEvent("buyer_matching_run", {
        route: "/api/buyer/requests",
        buyer_request_id: input.request.id,
        user_role: demand.buyerAccountId ? "buyer" : "system",
        result_count: results.length,
        custom_sourcing: customSourcingRecommended,
      }),
      customSourcingRecommended
        ? trackMatchingEvent("custom_sourcing_recommended", {
            route: "/api/buyer/requests",
            buyer_request_id: input.request.id,
            user_role: demand.buyerAccountId ? "buyer" : "system",
          })
        : Promise.resolve(),
    ]);
  }

  return {
    ok: true,
    persisted,
    mode: sourceLoad.mode === "live" ? "live" : input.persist ? "missing_supabase_config" : "offline",
    buyerRequestId: input.request.id,
    buyerAccountId: demand.buyerAccountId || null,
    results,
    customSourcingRecommended,
    message: persisted ? "Buyer demand match results were stored." : "Buyer demand match results were generated but not persisted.",
  };
}

export async function runAndStoreBuyerRequestMatch(input: {
  buyerRequestId: string;
  buyerAccountId?: string | null;
}) {
  if (!hasLeadFlowDataApiConfig()) {
    return {
      ok: true,
      persisted: false,
      mode: "missing_supabase_config" as const,
      buyerRequestId: input.buyerRequestId,
      buyerAccountId: input.buyerAccountId || null,
      results: [],
      customSourcingRecommended: false,
      message: "Supabase service env is not configured.",
    };
  }

  const [request] = await selectLeadFlowRows<BuyerMatchingRequestRow>("buyer_requests", {
    select: requestSelect,
    id: `eq.${input.buyerRequestId}`,
    limit: 1,
  });
  if (!request) throw new Error("Buyer request not found for matching.");

  const [account] = request.buyer_account_id
    ? await selectLeadFlowRows<BuyerAccountRow>("buyer_accounts", {
        select: buyerAccountSelect,
        id: `eq.${request.buyer_account_id}`,
        limit: 1,
      }).catch(() => [])
    : [];

  return runBuyerDemandMatching({ request, buyerAccount: account || null, persist: true });
}

export async function getBuyerRecommendationsData(): Promise<BuyerRecommendationsData> {
  const portal = await getBuyerPortalData();
  if (!portal.authenticated) return portal;

  const loadErrors: string[] = [];
  if (!portal.account || buyerAccountIsRestricted(portal.account)) {
    return {
      authenticated: true,
      portal,
      mode: "offline",
      loadErrors,
      bestMatches: [],
      sampleMatches: [],
      exclusiveMatches: [],
      toolMatches: [],
      customSourcingRecommended: false,
      latestRequest: null,
    };
  }

  if (!hasLeadFlowDataApiConfig()) {
    const fallbackRequest: BuyerMatchingRequestRow = {
      id: "offline-buyer-profile",
      buyer_account_id: portal.account.id,
      request_type: "access",
      vertical: portal.account.industry,
      category: portal.account.industry,
      buyer_use_case: portal.account.intended_use,
      intended_use: portal.account.intended_use,
      budget_range: portal.account.budget_range,
      urgency: "review",
      filters: {},
      status: "submitted",
      review_status: "pending",
      metadata: {},
      created_at: new Date().toISOString(),
    };
    const offline = await runBuyerDemandMatching({ request: fallbackRequest, buyerAccount: portal.account, persist: false });
    return {
      authenticated: true,
      portal,
      mode: "offline",
      loadErrors: ["Supabase service env is not configured."],
      bestMatches: offline.results.slice(0, 6),
      sampleMatches: offline.results.filter((result) => result.recommendedAction === "request_sample").slice(0, 3),
      exclusiveMatches: offline.results.filter((result) => result.recommendedAction === "request_exclusive").slice(0, 3),
      toolMatches: offline.results.filter((result) => result.matchedEntityType === "tool").slice(0, 3),
      customSourcingRecommended: offline.customSourcingRecommended,
      latestRequest: fallbackRequest,
    };
  }

  const requests = await selectLeadFlowRows<BuyerMatchingRequestRow>("buyer_requests", {
    select: requestSelect,
    buyer_account_id: `eq.${portal.account.id}`,
    order: "created_at.desc",
    limit: 5,
  }).catch((error) => {
    loadErrors.push(error instanceof Error ? error.message : "Could not load buyer requests.");
    return [];
  });
  const latestRequest = requests[0] || null;

  let stored = await selectLeadFlowRows<StoredBuyerMatchResult>("buyer_match_results", {
    select: matchResultSelect,
    buyer_account_id: `eq.${portal.account.id}`,
    status: "eq.active",
    order: "match_score.desc",
    limit: 40,
  }).catch((error) => {
    loadErrors.push(error instanceof Error ? error.message : "Could not load match results.");
    return [];
  });

  if (latestRequest && stored.filter((row) => row.buyer_request_id === latestRequest.id).length === 0) {
    const run = await runBuyerDemandMatching({ request: latestRequest, buyerAccount: portal.account, persist: true }).catch((error) => {
      loadErrors.push(error instanceof Error ? error.message : "Could not run buyer matching.");
      return null;
    });
    if (run?.results?.length) {
      stored = await selectLeadFlowRows<StoredBuyerMatchResult>("buyer_match_results", {
        select: matchResultSelect,
        buyer_account_id: `eq.${portal.account.id}`,
        status: "eq.active",
        order: "match_score.desc",
        limit: 40,
      }).catch(() => stored);
    }
  }

  let bestMatches = stored.map(resultFromStored);
  if (bestMatches.length === 0) {
    const syntheticRequest: BuyerMatchingRequestRow = {
      id: "buyer-profile-demand",
      buyer_account_id: portal.account.id,
      request_type: "access",
      vertical: portal.account.industry,
      category: portal.account.industry,
      buyer_use_case: portal.account.intended_use,
      intended_use: portal.account.intended_use,
      budget_range: portal.account.budget_range,
      urgency: "review",
      filters: {},
      status: "submitted",
      review_status: "pending",
      metadata: {},
      created_at: new Date().toISOString(),
    };
    bestMatches = (await runBuyerDemandMatching({ request: syntheticRequest, buyerAccount: portal.account, persist: false })).results;
  }

  await trackMatchingEvent("buyer_match_viewed", {
    route: "/buyer/recommendations",
    buyer_account_id: portal.account.id,
    user_role: "buyer",
    result_count: bestMatches.length,
  });

  return {
    authenticated: true,
    portal,
    mode: loadErrors.length ? "offline" : "live",
    loadErrors,
    bestMatches: bestMatches.slice(0, 8),
    sampleMatches: bestMatches.filter((result) => result.recommendedAction === "request_sample").slice(0, 4),
    exclusiveMatches: bestMatches.filter((result) => result.recommendedAction === "request_exclusive").slice(0, 4),
    toolMatches: bestMatches.filter((result) => result.matchedEntityType === "tool" || result.recommendedAction === "start_tool").slice(0, 4),
    customSourcingRecommended: bestMatches.some((result) => result.recommendedAction === "request_custom_sourcing"),
    latestRequest,
  };
}

export async function getAdminBuyerMatchingData(): Promise<AdminBuyerMatchingData> {
  const loadErrors: string[] = [];
  if (!hasLeadFlowDataApiConfig()) {
    const fallbackRequest: BuyerMatchingRequestRow = {
      id: "demo-buyer-request",
      buyer_account_id: "demo-buyer",
      request_type: "access",
      vertical: "Ecommerce",
      category: "Vendor signals",
      buyer_use_case: "Find ecommerce vendor signal products with sample access first.",
      intended_use: "Find ecommerce vendor signal products with sample access first.",
      budget_range: "$500 to $1,500",
      urgency: "this week",
      filters: {},
      status: "submitted",
      review_status: "pending",
      metadata: {},
      created_at: new Date().toISOString(),
    };
    const offline = await runBuyerDemandMatching({ request: fallbackRequest, buyerAccount: null, persist: false });
    return {
      mode: "offline",
      loadErrors: ["Supabase service env is not configured."],
      requests: [fallbackRequest],
      results: [],
      requestSummaries: [{
        request: fallbackRequest,
        buyer: { name: "Demo buyer", company: "Signal Buyer Co", status: "pending_review" },
        topMatches: offline.results.slice(0, 5),
        storedCount: 0,
        recommendedAction: offline.results[0]?.recommendedAction || "request_custom_sourcing",
        status: offline.customSourcingRecommended ? "custom_sourcing" : "matched",
      }],
      stats: {
        totalRequests: 1,
        unmatchedRequests: 0,
        highValueRequests: 1,
        requestsWithListings: 1,
        customSourcingNeeded: offline.customSourcingRecommended ? 1 : 0,
        storedMatches: 0,
      },
    };
  }

  const [requests, accounts, stored] = await Promise.all([
    selectLeadFlowRows<BuyerMatchingRequestRow>("buyer_requests", {
      select: requestSelect,
      order: "created_at.desc",
      limit: 40,
    }).catch((error) => {
      loadErrors.push(error instanceof Error ? error.message : "Could not load buyer requests.");
      return [];
    }),
    selectLeadFlowRows<BuyerAccountRow>("buyer_accounts", {
      select: buyerAccountSelect,
      order: "created_at.desc",
      limit: 80,
    }).catch((error) => {
      loadErrors.push(error instanceof Error ? error.message : "Could not load buyer accounts.");
      return [];
    }),
    selectLeadFlowRows<StoredBuyerMatchResult>("buyer_match_results", {
      select: matchResultSelect,
      order: "created_at.desc",
      limit: 200,
    }).catch((error) => {
      loadErrors.push(error instanceof Error ? error.message : "Could not load buyer match results.");
      return [];
    }),
  ]);

  const accountById = new Map(accounts.map((account) => [account.id, account]));
  const storedByRequest = new Map<string, StoredBuyerMatchResult[]>();
  for (const result of stored) {
    const list = storedByRequest.get(result.buyer_request_id) || [];
    list.push(result);
    storedByRequest.set(result.buyer_request_id, list);
  }

  const summaries = await Promise.all(requests.slice(0, 20).map(async (request) => {
    const buyer = request.buyer_account_id ? accountById.get(request.buyer_account_id) || null : null;
    const existing = storedByRequest.get(request.id) || [];
    const topMatches = existing.length
      ? existing.map(resultFromStored).sort((a, b) => b.matchScore - a.matchScore).slice(0, 5)
      : (await runBuyerDemandMatching({ request, buyerAccount: buyer, persist: false })).results.slice(0, 5);
    const top = topMatches[0];
    const status: "matched" | "unmatched" | "custom_sourcing" | "needs_profile" =
      !top ? "unmatched" :
      top.recommendedAction === "complete_buyer_profile" ? "needs_profile" :
      top.recommendedAction === "request_custom_sourcing" ? "custom_sourcing" :
      "matched";
    return {
      request,
      buyer: buyer ? {
        name: buyer.name || "Buyer",
        company: buyer.company_name || "Company not set",
        status: buyer.account_status,
      } : null,
      topMatches,
      storedCount: existing.length,
      recommendedAction: top?.recommendedAction || "request_custom_sourcing",
      status,
    };
  }));

  await trackMatchingEvent("admin_buyer_match_reviewed", {
    route: "/dashboard/buyer-matching",
    user_role: "admin",
    request_count: requests.length,
    stored_matches: stored.length,
  });

  return {
    mode: loadErrors.length ? "offline" : "live",
    loadErrors,
    requests,
    results: stored,
    requestSummaries: summaries,
    stats: {
      totalRequests: requests.length,
      unmatchedRequests: summaries.filter((summary) => summary.status === "unmatched").length,
      highValueRequests: summaries.filter((summary) => summary.topMatches[0]?.matchScore >= 80).length,
      requestsWithListings: summaries.filter((summary) => summary.topMatches.some((match) => match.matchedEntityType === "marketplace_listing")).length,
      customSourcingNeeded: summaries.filter((summary) => summary.status === "custom_sourcing").length,
      storedMatches: stored.length,
    },
  };
}

export function fallbackMatchesForInput(input: BuyerDemandInput) {
  return sortedMatches(fallbackMarketplaceListingCandidates().map((candidate) => scoreCandidate(input, candidate)), 8);
}
