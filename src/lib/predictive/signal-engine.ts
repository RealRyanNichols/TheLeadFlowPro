import "server-only";

import { leadProfileDetails } from "@/lib/lead-profile-detail";
import {
  hasLeadFlowDataApiConfig,
  insertLeadFlowRow,
  selectLeadFlowRows,
} from "@/lib/leadflow-data-api";
import { sanitizeLeadFlowEventProperties } from "@/lib/leadflow-events";
import { getBuyerPortalData, type BuyerPortalData } from "@/lib/buyer-portal";
import { scoreLabelFor, scoreRange, type PredictiveScoreComponent } from "./explain-score";
import {
  buildBuyerRequestFeatures,
  buildLeadProfileFeatures,
  leadProfileDetailToPredictiveRow,
  leadProfileDetailToSourceProofs,
  type BuyerAccountPredictiveRow,
  type BuyerRequestFeatures,
  type BuyerRequestPredictiveRow,
  type EventPredictiveRow,
  type LeadProfileFeatures,
  type LeadProfilePredictiveRow,
  type MarketplaceListingPredictiveRow,
  type PredictiveEntityType,
  type SourceProofPredictiveRow,
} from "./features";
import { actionLabel, recommendNextAction, type PredictiveRecommendedAction } from "./recommend-next-action";
import { scoreBuyerRequestFeatures, scoreLeadProfileFeatures } from "./score-profile";

export const PREDICTIVE_MODEL_NAME = "LeadFlow Predictive Signal Engine";
export const PREDICTIVE_MODEL_VERSION = "phase3.1";

export type PredictiveScoreResult = {
  entityType: PredictiveEntityType;
  entityId: string;
  title: string;
  vertical: string;
  category: string;
  modelName: string;
  modelVersion: string;
  overallScore: number;
  scoreLabel: string;
  recommendedNextAction: PredictiveRecommendedAction;
  recommendedNextActionLabel: string;
  components: PredictiveScoreComponent[];
  explanation: string;
  featuresUsed: string[];
  missingFeatures: string[];
  cautionNotes: string[];
  confidenceLevel: "high" | "medium" | "low" | "unknown";
  stored: boolean;
};

export type PredictiveDashboardData = {
  mode: "live" | "offline";
  loadErrors: string[];
  stats: {
    scoredProfiles: number;
    highValueProfiles: number;
    enrichmentNeeded: number;
    buyerRequestsScored: number;
    complianceWarnings: number;
    averageMarketplaceValue: number;
  };
  highValueProfiles: PredictiveScoreResult[];
  profilesNeedingEnrichment: PredictiveScoreResult[];
  buyerRequestsLikelyToClose: PredictiveScoreResult[];
  marketplaceListingsWithDemand: Array<{
    title: string;
    vertical: string;
    demandScore: number;
    demandLabel: string;
    reason: string;
  }>;
  categoriesGainingInterest: Array<{
    category: string;
    vertical: string;
    signalCount: number;
    reason: string;
  }>;
  toolsGeneratingBestSignals: Array<{
    tool: string;
    averageScore: number;
    signalCount: number;
    reason: string;
  }>;
  complianceWarnings: Array<{
    entityId: string;
    title: string;
    warning: string;
    action: PredictiveRecommendedAction;
  }>;
};

export type BuyerInsightsData = {
  portal: BuyerPortalData;
  mode: "live" | "offline";
  recommendations: PredictiveScoreResult[];
  categoryMatches: Array<{ label: string; score: number; reason: string }>;
  watchlistSuggestions: PredictiveScoreResult[];
  newSignals: PredictiveScoreResult[];
  privacyNotes: string[];
};

const leadProfileSelect = [
  "id",
  "title",
  "vertical",
  "category",
  "buyer_use_case",
  "score",
  "confidence",
  "consent_status",
  "suppression_status",
  "source_proof_status",
  "status",
  "review_status",
  "source_url",
  "source_path",
  "buyer_visible_summary",
  "private_profile",
  "tags",
  "last_verified_at",
  "updated_at",
  "created_at",
].join(",");

const sourceProofSelect = [
  "id",
  "lead_profile_id",
  "proof_type",
  "source_url",
  "source_label",
  "confidence",
  "status",
  "review_status",
  "created_at",
  "updated_at",
].join(",");

const eventSelect = ["id", "event_name", "route", "vertical", "category", "properties", "created_at"].join(",");

const buyerRequestSelect = [
  "id",
  "buyer_account_id",
  "listing_id",
  "listing_slug",
  "marketplace_listing_id",
  "request_type",
  "intended_use",
  "buyer_use_case",
  "budget_range",
  "urgency",
  "vertical",
  "category",
  "status",
  "review_status",
  "filters",
  "metadata",
  "created_at",
  "updated_at",
].join(",");

const buyerAccountSelect = [
  "id",
  "company_name",
  "buyer_type",
  "industry",
  "location_served",
  "budget_range",
  "intended_use",
  "account_status",
  "approved_access_level",
].join(",");

const marketplaceListingSelect = [
  "id",
  "title",
  "vertical",
  "category",
  "buyer_type",
  "listing_status",
  "release_mode",
  "score",
  "confidence",
  "sample_count",
  "price_cents",
  "compliance_status",
  "created_at",
  "updated_at",
].join(",");

function average(values: number[]) {
  const usable = values.filter((value) => Number.isFinite(value));
  if (!usable.length) return 0;
  return Math.round(usable.reduce((sum, value) => sum + value, 0) / usable.length);
}

function looksLikeUuid(value: string) {
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(value);
}

function componentValue(components: PredictiveScoreComponent[], key: PredictiveScoreComponent["key"]) {
  return components.find((component) => component.key === key)?.value ?? 0;
}

function buildScoreResult(input: {
  entityType: PredictiveEntityType;
  entityId: string;
  title: string;
  vertical: string;
  category: string;
  components: PredictiveScoreComponent[];
  recommendedNextAction: PredictiveRecommendedAction;
  stored?: boolean;
}): PredictiveScoreResult {
  const overallScore = average([
    componentValue(input.components, "buyer_intent_score"),
    componentValue(input.components, "urgency_score"),
    componentValue(input.components, "contactability_score"),
    componentValue(input.components, "source_reliability_score"),
    componentValue(input.components, "freshness_score"),
    componentValue(input.components, "buyer_fit_score"),
    componentValue(input.components, "revenue_potential_score"),
    componentValue(input.components, "compliance_readiness_score"),
    componentValue(input.components, "marketplace_value_score"),
  ]);
  const featuresUsed = [...new Set(input.components.flatMap((component) => component.featuresUsed))];
  const missingFeatures = [...new Set(input.components.flatMap((component) => component.missingFeatures))];
  const cautionNotes = input.components.flatMap((component) => component.cautionNote ? [component.cautionNote] : []);
  const confidenceLevel = input.components.some((component) => component.confidenceLevel === "high")
    ? input.components.filter((component) => component.confidenceLevel === "high").length >= 4
      ? "high"
      : "medium"
    : input.components.some((component) => component.confidenceLevel === "medium")
      ? "medium"
      : "low";

  return {
    entityType: input.entityType,
    entityId: input.entityId,
    title: input.title,
    vertical: input.vertical || "General",
    category: input.category || "Uncategorized",
    modelName: PREDICTIVE_MODEL_NAME,
    modelVersion: PREDICTIVE_MODEL_VERSION,
    overallScore,
    scoreLabel: scoreLabelFor(overallScore),
    recommendedNextAction: input.recommendedNextAction,
    recommendedNextActionLabel: actionLabel(input.recommendedNextAction),
    components: input.components,
    explanation: `${PREDICTIVE_MODEL_NAME} scored this ${input.entityType.replace(/_/g, " ")} from declared intent, source proof, freshness, buyer fit, contactability, and compliance readiness. It does not use protected traits, minors, private financial account data, medical data, or private political persuasion targeting.`,
    featuresUsed,
    missingFeatures,
    cautionNotes,
    confidenceLevel,
    stored: Boolean(input.stored),
  };
}

function fallbackLeadProfileRows() {
  return leadProfileDetails.map((profile) => ({
    profile: leadProfileDetailToPredictiveRow(profile),
    sourceProofs: leadProfileDetailToSourceProofs(profile),
    events: fallbackEventsForProfile(profile.id, profile.category, profile.vertical),
  }));
}

function fallbackEventsForProfile(profileId: string, category: string, vertical: string): EventPredictiveRow[] {
  const now = new Date();
  return [
    {
      id: `${profileId}-sample-event`,
      event_name: "sample_request_submitted",
      route: "/marketplace",
      vertical,
      category,
      properties: { profile_id: profileId, score_range: "75-89" },
      created_at: new Date(now.getTime() - 2 * 24 * 60 * 60 * 1000).toISOString(),
    },
    {
      id: `${profileId}-watchlist-event`,
      event_name: "watchlist_added",
      route: "/marketplace",
      vertical,
      category,
      properties: { profile_id: profileId },
      created_at: new Date(now.getTime() - 1 * 24 * 60 * 60 * 1000).toISOString(),
    },
  ];
}

function fallbackBuyerRequests(): Array<{
  request: BuyerRequestPredictiveRow;
  buyerAccount: BuyerAccountPredictiveRow;
  listing: MarketplaceListingPredictiveRow;
}> {
  return [
    {
      request: {
        id: "demo-buyer-request-ecommerce",
        listing_slug: "ecommerce-vendor-signal-pack",
        request_type: "sample",
        intended_use: "Review ecommerce vendor fit before buying shared or exclusive access.",
        budget_range: "$500 to $1,500",
        urgency: "this week",
        vertical: "Ecommerce",
        category: "Vendor signals",
        status: "submitted",
        review_status: "pending",
        created_at: new Date().toISOString(),
      },
      buyerAccount: {
        id: "demo-buyer",
        company_name: "Signal Buyer Co",
        buyer_type: "agency",
        industry: "Ecommerce",
        location_served: "United States",
        budget_range: "$500 to $1,500",
        intended_use: "Buy proof-backed ecommerce vendor signals.",
        account_status: "pending_review",
        approved_access_level: "none",
      },
      listing: {
        id: "demo-listing-ecommerce",
        title: "Ecommerce Vendor Signal Pack",
        vertical: "Ecommerce",
        category: "Vendor signals",
        listing_status: "sample_available",
        release_mode: "review_gated",
        score: 87,
        confidence: 0.82,
        sample_count: 25,
        price_cents: 14900,
        compliance_status: "review_required",
      },
    },
  ];
}

async function loadLeadProfileBundle(profileId: string) {
  if (!hasLeadFlowDataApiConfig()) {
    const fallback = fallbackLeadProfileRows().find((row) => row.profile.id === profileId);
    return fallback || null;
  }

  const [profile] = await selectLeadFlowRows<LeadProfilePredictiveRow>("lead_profiles", {
    select: leadProfileSelect,
    id: `eq.${profileId}`,
    deleted_at: "is.null",
    limit: 1,
  });
  if (!profile) return fallbackLeadProfileRows().find((row) => row.profile.id === profileId) || null;
  const [sourceProofs, events] = await Promise.all([
    selectLeadFlowRows<SourceProofPredictiveRow>("source_proofs", {
      select: sourceProofSelect,
      lead_profile_id: `eq.${profile.id}`,
      order: "created_at.desc",
      limit: 25,
    }).catch(() => []),
    selectLeadFlowRows<EventPredictiveRow>("events", {
      select: eventSelect,
      profile_id: `eq.${profile.id}`,
      order: "created_at.desc",
      limit: 100,
    }).catch(() => []),
  ]);
  return { profile, sourceProofs, events };
}

async function storeLeadProfileScore(result: PredictiveScoreResult, features: LeadProfileFeatures) {
  if (!hasLeadFlowDataApiConfig()) return false;
  if (!looksLikeUuid(result.entityId)) return false;
  const componentRows = result.components
    .filter((component) => component.value !== null)
    .map((component) =>
      insertLeadFlowRow("lead_scores", {
        lead_profile_id: result.entityId,
        score_type: component.key,
        score: component.value,
        confidence: component.confidenceLevel === "high" ? 0.86 : component.confidenceLevel === "medium" ? 0.64 : 0.38,
        model_version: PREDICTIVE_MODEL_VERSION,
        feature_summary: {
          model_name: PREDICTIVE_MODEL_NAME,
          features_used: component.featuresUsed,
          missing_features: component.missingFeatures,
          score_range: scoreRange(component.value),
        },
        explanation: {
          label: component.scoreLabel,
          explanation: component.explanation,
          caution_note: component.cautionNote || null,
          protected_traits_used: false,
          raw_answers_exposed: false,
        },
        status: "active",
        review_status: features.reviewStatus || "pending",
      }).catch(() => null),
    );

  await Promise.all(componentRows);
  await insertLeadFlowRow("predictive_signal_scores", {
    entity_type: "lead_profile",
    entity_id: result.entityId,
    lead_profile_id: result.entityId,
    model_name: PREDICTIVE_MODEL_NAME,
    model_version: PREDICTIVE_MODEL_VERSION,
    overall_score: result.overallScore,
    score_label: result.scoreLabel,
    recommended_next_action: result.recommendedNextAction,
    component_scores: result.components,
    explanation: {
      summary: result.explanation,
      caution_notes: result.cautionNotes,
      protected_traits_used: false,
      raw_answers_exposed: false,
    },
    feature_summary: {
      features_used: result.featuresUsed,
      missing_features: result.missingFeatures,
      score_range: scoreRange(result.overallScore),
    },
    compliance_warnings: result.cautionNotes,
    status: "active",
    review_status: features.reviewStatus || "pending",
  }).catch(() => null);
  await insertLeadFlowRow("audit_log", {
    actor_type: "system",
    action: "predictive.profile_scored",
    object_schema: "leadflow",
    object_table: "lead_profiles",
    object_id: result.entityId,
    lead_profile_id: result.entityId,
    details: {
      model_name: PREDICTIVE_MODEL_NAME,
      model_version: PREDICTIVE_MODEL_VERSION,
      overall_score: result.overallScore,
      recommended_next_action: result.recommendedNextAction,
      raw_answers_exposed: false,
      protected_traits_used: false,
    },
  }).catch(() => null);
  return true;
}

async function storeBuyerRequestScore(result: PredictiveScoreResult, features: BuyerRequestFeatures) {
  if (!hasLeadFlowDataApiConfig()) return false;
  if (!looksLikeUuid(result.entityId)) return false;
  await insertLeadFlowRow("predictive_signal_scores", {
    entity_type: "buyer_request",
    entity_id: result.entityId,
    buyer_request_id: result.entityId,
    buyer_account_id: features.buyerAccountId || null,
    model_name: PREDICTIVE_MODEL_NAME,
    model_version: PREDICTIVE_MODEL_VERSION,
    overall_score: result.overallScore,
    score_label: result.scoreLabel,
    recommended_next_action: result.recommendedNextAction,
    component_scores: result.components,
    explanation: {
      summary: result.explanation,
      caution_notes: result.cautionNotes,
      protected_traits_used: false,
      raw_answers_exposed: false,
    },
    feature_summary: {
      features_used: result.featuresUsed,
      missing_features: result.missingFeatures,
      score_range: scoreRange(result.overallScore),
    },
    compliance_warnings: result.cautionNotes,
    status: "active",
    review_status: features.reviewStatus || "pending",
  }).catch(() => null);
  await insertLeadFlowRow("audit_log", {
    actor_type: "system",
    action: "predictive.buyer_request_scored",
    object_schema: "leadflow",
    object_table: "buyer_requests",
    object_id: result.entityId,
    details: {
      model_name: PREDICTIVE_MODEL_NAME,
      model_version: PREDICTIVE_MODEL_VERSION,
      overall_score: result.overallScore,
      recommended_next_action: result.recommendedNextAction,
      raw_answers_exposed: false,
      protected_traits_used: false,
    },
  }).catch(() => null);
  return true;
}

export async function scoreLeadProfile(profileId: string): Promise<PredictiveScoreResult | null> {
  const bundle = await loadLeadProfileBundle(profileId);
  if (!bundle) return null;
  const features = buildLeadProfileFeatures(bundle);
  const components = scoreLeadProfileFeatures(features);
  const recommendedNextAction = recommendNextAction("lead_profile", features, components);
  const result = buildScoreResult({
    entityType: "lead_profile",
    entityId: features.entityId,
    title: features.title,
    vertical: features.vertical,
    category: features.category,
    components,
    recommendedNextAction,
  });
  const stored = await storeLeadProfileScore(result, features);
  return { ...result, stored };
}

async function loadBuyerRequestBundle(requestId: string) {
  if (!hasLeadFlowDataApiConfig()) {
    return fallbackBuyerRequests().find((row) => row.request.id === requestId) || null;
  }

  const [request] = await selectLeadFlowRows<BuyerRequestPredictiveRow>("buyer_requests", {
    select: buyerRequestSelect,
    id: `eq.${requestId}`,
    limit: 1,
  });
  if (!request) return null;

  const [buyerAccount, listing] = await Promise.all([
    request.buyer_account_id
      ? selectLeadFlowRows<BuyerAccountPredictiveRow>("buyer_accounts", {
          select: buyerAccountSelect,
          id: `eq.${request.buyer_account_id}`,
          limit: 1,
        }).then((rows) => rows[0] || null).catch(() => null)
      : Promise.resolve(null),
    request.listing_id || request.marketplace_listing_id
      ? selectLeadFlowRows<MarketplaceListingPredictiveRow>("marketplace_listings", {
          select: marketplaceListingSelect,
          id: `eq.${request.listing_id || request.marketplace_listing_id}`,
          limit: 1,
        }).then((rows) => rows[0] || null).catch(() => null)
      : Promise.resolve(null),
  ]);
  return { request, buyerAccount, listing };
}

export async function scoreBuyerRequest(requestId: string): Promise<PredictiveScoreResult | null> {
  const bundle = await loadBuyerRequestBundle(requestId);
  if (!bundle) return null;
  const features = buildBuyerRequestFeatures(bundle);
  const components = scoreBuyerRequestFeatures(features);
  const recommendedNextAction = recommendNextAction("buyer_request", features, components);
  const result = buildScoreResult({
    entityType: "buyer_request",
    entityId: features.entityId,
    title: features.title,
    vertical: features.vertical || features.buyerIndustry,
    category: features.category || features.requestType,
    components,
    recommendedNextAction,
  });
  const stored = await storeBuyerRequestScore(result, features);
  return { ...result, stored };
}

async function loadProfileResultsForDashboard() {
  if (!hasLeadFlowDataApiConfig()) {
    const results = await Promise.all(fallbackLeadProfileRows().map((row) => scoreLeadProfile(row.profile.id)));
    return { mode: "offline" as const, results: results.filter(Boolean) as PredictiveScoreResult[], errors: ["LeadFlow Supabase Data API is not configured. Showing safe predictive test rows."] };
  }

  const profiles = await selectLeadFlowRows<LeadProfilePredictiveRow>("lead_profiles", {
    select: leadProfileSelect,
    deleted_at: "is.null",
    order: "updated_at.desc",
    limit: 30,
  });
  const results = await Promise.all(profiles.map((profile) => scoreLeadProfile(profile.id)));
  return { mode: "live" as const, results: results.filter(Boolean) as PredictiveScoreResult[], errors: [] };
}

async function loadBuyerRequestResultsForDashboard() {
  if (!hasLeadFlowDataApiConfig()) {
    const results = await Promise.all(fallbackBuyerRequests().map((row) => scoreBuyerRequest(row.request.id)));
    return results.filter(Boolean) as PredictiveScoreResult[];
  }
  const requests = await selectLeadFlowRows<BuyerRequestPredictiveRow>("buyer_requests", {
    select: "id",
    order: "created_at.desc",
    limit: 25,
  }).catch(() => []);
  const results = await Promise.all(requests.map((request) => scoreBuyerRequest(request.id)));
  return results.filter(Boolean) as PredictiveScoreResult[];
}

function buildDemandListings(results: PredictiveScoreResult[]) {
  return results
    .filter((result) => result.entityType === "lead_profile")
    .slice(0, 8)
    .map((result) => ({
      title: result.title,
      vertical: result.vertical,
      demandScore: componentValue(result.components, "marketplace_value_score"),
      demandLabel: scoreLabelFor(componentValue(result.components, "marketplace_value_score")),
      reason: result.recommendedNextAction === "approve_for_marketplace"
        ? "Strong enough for listing review if compliance and source proof remain clean."
        : "Useful demand signal, but the recommended action should happen before packaging.",
    }));
}

function buildCategoryInterest(results: PredictiveScoreResult[]) {
  const grouped = new Map<string, { vertical: string; count: number; score: number }>();
  for (const result of results) {
    const key = `${result.vertical}:${result.category}`;
    const current = grouped.get(key) || { vertical: result.vertical, count: 0, score: 0 };
    current.count += 1;
    current.score += result.overallScore;
    grouped.set(key, current);
  }
  return [...grouped.entries()]
    .map(([key, value]) => ({
      category: key.split(":").slice(1).join(":") || "Uncategorized",
      vertical: value.vertical,
      signalCount: value.count,
      reason: `Average predictive score ${average([value.score / value.count])}. Use this to decide which segment or product factory path to open next.`,
    }))
    .sort((a, b) => b.signalCount - a.signalCount)
    .slice(0, 8);
}

function buildToolSignals(results: PredictiveScoreResult[]) {
  const rows = [
    { tool: "Lead Leak Audit", filter: "Local", reason: "Best for missed calls, missed texts, weak follow-up, and owner pain." },
    { tool: "Ecommerce Growth Finder", filter: "Ecommerce", reason: "Best for vendor, sourcing, product, and marketplace opportunity signals." },
    { tool: "Mortgage Lead Readiness Tool", filter: "Mortgage", reason: "Best for consent-aware education and refinance interest signals." },
    { tool: "Website Money Leak Checker", filter: "Website", reason: "Best for neglected funnels and build-my-system opportunities." },
  ];
  return rows.map((row) => {
    const matches = results.filter((result) => `${result.vertical} ${result.category} ${result.title}`.includes(row.filter));
    return {
      tool: row.tool,
      averageScore: matches.length ? average(matches.map((match) => match.overallScore)) : average(results.map((result) => result.overallScore)),
      signalCount: matches.length || Math.max(1, Math.round(results.length / 3)),
      reason: row.reason,
    };
  });
}

export async function getPredictiveDashboardData(): Promise<PredictiveDashboardData> {
  let profileLoad = await loadProfileResultsForDashboard().catch((error) => ({
    mode: "offline" as const,
    results: [] as PredictiveScoreResult[],
    errors: [error instanceof Error ? error.message : "Predictive profile load failed."],
  }));
  if (!profileLoad.results.length) {
    const fallbackResults = await Promise.all(fallbackLeadProfileRows().map((row) => scoreLeadProfile(row.profile.id)));
    profileLoad = {
      mode: "offline",
      results: fallbackResults.filter(Boolean) as PredictiveScoreResult[],
      errors: [...profileLoad.errors, "Fell back to safe test profiles."],
    };
  }
  const buyerResults = await loadBuyerRequestResultsForDashboard().catch(() => [] as PredictiveScoreResult[]);
  const allResults = [...profileLoad.results, ...buyerResults];
  const complianceWarnings = allResults.flatMap((result) =>
    result.cautionNotes.map((warning) => ({
      entityId: result.entityId,
      title: result.title,
      warning,
      action: result.recommendedNextAction,
    })),
  );

  await insertLeadFlowRow("events", {
    event_name: "predictive_dashboard_viewed",
    event_type: "server",
    route: "/dashboard/predictive",
    user_role: "admin",
    source_path: "/dashboard/predictive",
    properties: sanitizeLeadFlowEventProperties({
      route: "/dashboard/predictive",
      scored_profiles: profileLoad.results.length,
      buyer_requests: buyerResults.length,
      mode: profileLoad.mode,
    }),
  }).catch(() => null);

  return {
    mode: profileLoad.mode,
    loadErrors: profileLoad.errors,
    stats: {
      scoredProfiles: profileLoad.results.length,
      highValueProfiles: profileLoad.results.filter((result) => result.overallScore >= 80).length,
      enrichmentNeeded: profileLoad.results.filter((result) => ["enrich_profile", "request_more_source_proof"].includes(result.recommendedNextAction)).length,
      buyerRequestsScored: buyerResults.length,
      complianceWarnings: complianceWarnings.length,
      averageMarketplaceValue: average(profileLoad.results.map((result) => componentValue(result.components, "marketplace_value_score"))),
    },
    highValueProfiles: profileLoad.results.filter((result) => result.overallScore >= 75).slice(0, 10),
    profilesNeedingEnrichment: profileLoad.results.filter((result) => ["enrich_profile", "request_more_source_proof"].includes(result.recommendedNextAction)).slice(0, 10),
    buyerRequestsLikelyToClose: buyerResults.filter((result) => result.overallScore >= 60).slice(0, 10),
    marketplaceListingsWithDemand: buildDemandListings(profileLoad.results),
    categoriesGainingInterest: buildCategoryInterest(profileLoad.results),
    toolsGeneratingBestSignals: buildToolSignals(profileLoad.results),
    complianceWarnings: complianceWarnings.slice(0, 12),
  };
}

export async function getBuyerInsightsData(): Promise<BuyerInsightsData> {
  const portal = await getBuyerPortalData();
  const profileResults = (await Promise.all(fallbackLeadProfileRows().map((row) => scoreLeadProfile(row.profile.id)))).filter(Boolean) as PredictiveScoreResult[];
  const account = portal.authenticated ? portal.account : null;
  const buyerIndustry = account?.industry?.toLowerCase() || "";
  const buyerType = account?.buyer_type?.toLowerCase() || "";
  const recommendations = profileResults
    .map((result) => {
      const matchBoost =
        buyerIndustry && `${result.vertical} ${result.category}`.toLowerCase().includes(buyerIndustry)
          ? 8
          : buyerType && result.explanation.toLowerCase().includes(buyerType)
            ? 5
            : 0;
      return { ...result, overallScore: Math.min(100, result.overallScore + matchBoost) };
    })
    .sort((a, b) => b.overallScore - a.overallScore)
    .slice(0, 6);

  const watchlistSuggestions = recommendations.filter((result) => result.recommendedNextAction !== "suppress").slice(0, 3);
  const categoryMatches = recommendations.slice(0, 5).map((result) => ({
    label: result.category,
    score: result.overallScore,
    reason: `Matches ${account?.industry || "your current buyer profile"} with ${result.scoreLabel.toLowerCase()} predictive fit.`,
  }));

  if (portal.authenticated && portal.account) {
    await insertLeadFlowRow("events", {
      event_name: "buyer_insight_viewed",
      event_type: "buyer",
      route: "/buyer/insights",
      user_role: "buyer",
      auth_user_id: portal.user.id,
      source_path: "/buyer/insights",
      properties: sanitizeLeadFlowEventProperties({
        route: "/buyer/insights",
        buyer_account_id: portal.account.id,
        access_level: portal.accessLevel,
        recommendation_count: recommendations.length,
      }),
    }).catch(() => null);
  }

  return {
    portal,
    mode: hasLeadFlowDataApiConfig() ? "live" : "offline",
    recommendations,
    categoryMatches,
    watchlistSuggestions,
    newSignals: recommendations.filter((result) => componentValue(result.components, "freshness_score") >= 70).slice(0, 4),
    privacyNotes: [
      "These recommendations use your buyer profile and approved public listing summaries.",
      "This page does not show another buyer's behavior.",
      "Raw private answers, admin notes, suppressed records, and sensitive inferred data are not exposed here.",
    ],
  };
}
