import type { LeadProfileDetail } from "@/lib/lead-profile-detail";

export type PredictiveEntityType = "lead_profile" | "buyer_request";

export type LeadProfilePredictiveRow = {
  id: string;
  title: string;
  vertical: string | null;
  category: string | null;
  buyer_use_case?: string | null;
  score?: number | string | null;
  confidence?: number | string | null;
  consent_status?: string | null;
  suppression_status?: string | null;
  source_proof_status?: string | null;
  status?: string | null;
  review_status?: string | null;
  source_url?: string | null;
  source_path?: string | null;
  buyer_visible_summary?: Record<string, unknown> | null;
  private_profile?: Record<string, unknown> | null;
  tags?: string[] | null;
  last_verified_at?: string | null;
  updated_at?: string | null;
  created_at?: string | null;
};

export type SourceProofPredictiveRow = {
  id: string;
  lead_profile_id?: string | null;
  proof_type?: string | null;
  source_url?: string | null;
  source_label?: string | null;
  confidence?: number | string | null;
  status?: string | null;
  review_status?: string | null;
  created_at?: string | null;
  updated_at?: string | null;
};

export type BuyerRequestPredictiveRow = {
  id: string;
  buyer_account_id?: string | null;
  listing_id?: string | null;
  listing_slug?: string | null;
  marketplace_listing_id?: string | null;
  request_type?: string | null;
  intended_use?: string | null;
  buyer_use_case?: string | null;
  budget_range?: string | null;
  urgency?: string | null;
  vertical?: string | null;
  category?: string | null;
  status?: string | null;
  review_status?: string | null;
  filters?: Record<string, unknown> | null;
  metadata?: Record<string, unknown> | null;
  created_at?: string | null;
  updated_at?: string | null;
};

export type BuyerAccountPredictiveRow = {
  id: string;
  company_name?: string | null;
  buyer_type?: string | null;
  industry?: string | null;
  location_served?: string | null;
  budget_range?: string | null;
  intended_use?: string | null;
  account_status?: string | null;
  approved_access_level?: string | null;
};

export type MarketplaceListingPredictiveRow = {
  id: string;
  title?: string | null;
  vertical?: string | null;
  category?: string | null;
  buyer_type?: string | null;
  listing_status?: string | null;
  release_mode?: string | null;
  score?: number | string | null;
  confidence?: number | string | null;
  sample_count?: number | null;
  price_cents?: number | null;
  compliance_status?: string | null;
  created_at?: string | null;
  updated_at?: string | null;
};

export type EventPredictiveRow = {
  id: string;
  event_name: string;
  route?: string | null;
  vertical?: string | null;
  category?: string | null;
  properties?: Record<string, unknown> | null;
  created_at?: string | null;
};

export type LeadProfileFeatures = {
  entityType: "lead_profile";
  entityId: string;
  title: string;
  vertical: string;
  category: string;
  buyerUseCase: string;
  baseScore: number | null;
  baseConfidence: number | null;
  consentStatus: string;
  suppressionStatus: string;
  sourceProofStatus: string;
  reviewStatus: string;
  lifecycleStatus: string;
  sourceUrl?: string | null;
  sourcePath?: string | null;
  tags: string[];
  sourceProofCount: number;
  approvedSourceProofCount: number;
  sourceProofTypes: string[];
  sourceProofConfidence: number | null;
  lastVerifiedAt?: string | null;
  updatedAt?: string | null;
  createdAt?: string | null;
  requestedSampleCount: number;
  requestedAccessCount: number;
  watchlistCount: number;
  relatedToolClicks: number;
  repeatedCategoryVisits: number;
  hasRecommendedNextAction: boolean;
  hasBusinessContactRoute: boolean;
  hasSubmittedWebsite: boolean;
};

export type BuyerRequestFeatures = {
  entityType: "buyer_request";
  entityId: string;
  buyerAccountId?: string | null;
  title: string;
  requestType: string;
  intendedUse: string;
  budgetRange: string;
  urgency: string;
  vertical: string;
  category: string;
  status: string;
  reviewStatus: string;
  buyerIndustry: string;
  buyerType: string;
  buyerLocation: string;
  buyerBudget: string;
  buyerIntendedUse: string;
  buyerAccountStatus: string;
  approvedAccessLevel: string;
  listingStatus: string;
  listingReleaseMode: string;
  listingPriceCents: number | null;
  listingScore: number | null;
  listingConfidence: number | null;
  createdAt?: string | null;
};

export function asPredictiveNumber(value: number | string | null | undefined) {
  if (typeof value === "number") return Number.isFinite(value) ? value : null;
  if (typeof value === "string" && value.trim()) {
    const parsed = Number(value);
    return Number.isFinite(parsed) ? parsed : null;
  }
  return null;
}

export function normalizeConfidence(value: number | string | null | undefined) {
  const parsed = asPredictiveNumber(value);
  if (parsed === null) return null;
  return parsed <= 1 ? Math.round(parsed * 100) : Math.round(parsed);
}

export function daysSince(value: string | null | undefined) {
  if (!value) return null;
  const timestamp = new Date(value).getTime();
  if (!Number.isFinite(timestamp)) return null;
  return Math.max(0, Math.round((Date.now() - timestamp) / (24 * 60 * 60 * 1000)));
}

export function textIncludesAny(value: string, terms: string[]) {
  const normalized = value.toLowerCase();
  return terms.some((term) => normalized.includes(term.toLowerCase()));
}

export function leadProfileDetailToPredictiveRow(profile: LeadProfileDetail): LeadProfilePredictiveRow {
  return {
    id: profile.id,
    title: profile.title,
    vertical: profile.vertical,
    category: profile.category,
    buyer_use_case: profile.buyerUseCase,
    score: profile.leadScore,
    confidence: profile.confidence === "high" ? 0.84 : profile.confidence === "medium" ? 0.62 : 0.42,
    consent_status: profile.consentStatus,
    suppression_status: profile.suppressionStatus,
    source_proof_status: "sample_available",
    status: "sample_available",
    review_status: "review",
    source_url: profile.sourceProofLinks[0]?.href || null,
    buyer_visible_summary: {
      summary: profile.summary,
      why_this_profile_exists: profile.whyThisProfileExists,
      recommended_next_action: profile.recommendedNextAction,
      contact_route_hints: profile.contactRouteHints,
    },
    tags: profile.tags,
    last_verified_at: profile.lastVerifiedDate,
    updated_at: new Date().toISOString(),
    created_at: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString(),
  };
}

export function leadProfileDetailToSourceProofs(profile: LeadProfileDetail): SourceProofPredictiveRow[] {
  return profile.sourceProofLinks.map((proof, index) => ({
    id: `${profile.id}-proof-${index + 1}`,
    lead_profile_id: profile.id,
    proof_type: proof.type,
    source_url: proof.href,
    source_label: proof.label,
    confidence: proof.status === "verified" ? 0.88 : proof.status === "review" ? 0.62 : 0.48,
    status: proof.status === "verified" ? "approved" : "review",
    review_status: proof.status === "verified" ? "approved" : "pending",
    created_at: new Date(Date.now() - (index + 2) * 24 * 60 * 60 * 1000).toISOString(),
  }));
}

export function buildLeadProfileFeatures(input: {
  profile: LeadProfilePredictiveRow;
  sourceProofs?: SourceProofPredictiveRow[];
  events?: EventPredictiveRow[];
}): LeadProfileFeatures {
  const sourceProofs = input.sourceProofs || [];
  const events = input.events || [];
  const buyerSummary = input.profile.buyer_visible_summary || {};
  const privateSummary = input.profile.private_profile || {};
  const summaryText = JSON.stringify({ buyerSummary, privateSummary }).toLowerCase();
  const eventNames = events.map((event) => event.event_name);
  const sourceProofConfidenceValues = sourceProofs
    .map((proof) => normalizeConfidence(proof.confidence))
    .filter((value): value is number => value !== null);
  const sourceProofConfidence = sourceProofConfidenceValues.length
    ? Math.round(sourceProofConfidenceValues.reduce((sum, value) => sum + value, 0) / sourceProofConfidenceValues.length)
    : null;

  return {
    entityType: "lead_profile",
    entityId: input.profile.id,
    title: input.profile.title,
    vertical: input.profile.vertical || "general",
    category: input.profile.category || "uncategorized",
    buyerUseCase: input.profile.buyer_use_case || String(buyerSummary.buyer_use_case || ""),
    baseScore: asPredictiveNumber(input.profile.score),
    baseConfidence: normalizeConfidence(input.profile.confidence),
    consentStatus: input.profile.consent_status || "unverified",
    suppressionStatus: input.profile.suppression_status || "unchecked",
    sourceProofStatus: input.profile.source_proof_status || "missing",
    reviewStatus: input.profile.review_status || "pending",
    lifecycleStatus: input.profile.status || "draft",
    sourceUrl: input.profile.source_url,
    sourcePath: input.profile.source_path,
    tags: input.profile.tags || [],
    sourceProofCount: sourceProofs.length,
    approvedSourceProofCount: sourceProofs.filter((proof) => ["approved", "verified"].includes(proof.status || "") || proof.review_status === "approved").length,
    sourceProofTypes: [...new Set(sourceProofs.map((proof) => proof.proof_type || "unknown"))],
    sourceProofConfidence,
    lastVerifiedAt: input.profile.last_verified_at,
    updatedAt: input.profile.updated_at,
    createdAt: input.profile.created_at,
    requestedSampleCount: eventNames.filter((event) => event === "sample_request_submitted").length,
    requestedAccessCount: eventNames.filter((event) => event === "access_request_submitted").length,
    watchlistCount: eventNames.filter((event) => event === "watchlist_added").length,
    relatedToolClicks: eventNames.filter((event) => event === "tool_card_clicked" || event === "questionnaire_completed").length,
    repeatedCategoryVisits: eventNames.filter((event) => event === "marketplace_viewed" || event === "listing_card_clicked").length,
    hasRecommendedNextAction: textIncludesAny(summaryText, ["recommended", "next action", "route", "request"]),
    hasBusinessContactRoute: Boolean(input.profile.source_url) || textIncludesAny(summaryText, ["website", "public contact", "business route", "contact route"]),
    hasSubmittedWebsite: textIncludesAny(summaryText, ["website", "url", "domain"]),
  };
}

export function buildBuyerRequestFeatures(input: {
  request: BuyerRequestPredictiveRow;
  buyerAccount?: BuyerAccountPredictiveRow | null;
  listing?: MarketplaceListingPredictiveRow | null;
}): BuyerRequestFeatures {
  const buyer = input.buyerAccount;
  const listing = input.listing;
  return {
    entityType: "buyer_request",
    entityId: input.request.id,
    buyerAccountId: input.request.buyer_account_id || null,
    title: input.request.listing_slug || listing?.title || `${input.request.request_type || "buyer"} request`,
    requestType: input.request.request_type || "access",
    intendedUse: input.request.intended_use || input.request.buyer_use_case || "",
    budgetRange: input.request.budget_range || "",
    urgency: input.request.urgency || String(input.request.metadata?.urgency || ""),
    vertical: input.request.vertical || listing?.vertical || "",
    category: input.request.category || listing?.category || "",
    status: input.request.status || "submitted",
    reviewStatus: input.request.review_status || "pending",
    buyerIndustry: buyer?.industry || "",
    buyerType: buyer?.buyer_type || "",
    buyerLocation: buyer?.location_served || "",
    buyerBudget: buyer?.budget_range || "",
    buyerIntendedUse: buyer?.intended_use || "",
    buyerAccountStatus: buyer?.account_status || "pending_review",
    approvedAccessLevel: buyer?.approved_access_level || "none",
    listingStatus: listing?.listing_status || "review",
    listingReleaseMode: listing?.release_mode || "review_gated",
    listingPriceCents: listing?.price_cents ?? null,
    listingScore: asPredictiveNumber(listing?.score),
    listingConfidence: normalizeConfidence(listing?.confidence),
    createdAt: input.request.created_at,
  };
}
