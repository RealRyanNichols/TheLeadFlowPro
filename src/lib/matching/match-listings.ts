import { leadProfileDetails } from "@/lib/lead-profile-detail";
import { signalProducts } from "@/lib/leadflow-sections";
import { scoreCandidate, sortedMatches } from "./scoring";
import type { BuyerDemandInput, BuyerMatchCandidate, BuyerMatchResult } from "./types";

export type MarketplaceListingMatchRow = {
  id: string;
  slug?: string | null;
  lead_profile_id?: string | null;
  title: string;
  vertical?: string | null;
  category?: string | null;
  buyer_type?: string | null;
  source_type?: string | null;
  location_label?: string | null;
  listing_status?: string | null;
  review_status?: string | null;
  release_mode?: string | null;
  access_model?: string | null;
  territory?: string | null;
  score?: number | string | null;
  confidence?: number | string | null;
  price_cents?: number | string | null;
  sample_enabled?: boolean | null;
  sample_price?: number | string | null;
  sample_count?: number | string | null;
  sample_record_count?: number | string | null;
  compliance_status?: string | null;
  source_proof_status?: string | null;
  buyer_visible_summary?: Record<string, unknown> | null;
  freshness_label?: string | null;
  updated_at?: string;
};

function numberValue(value: unknown, fallback = 0) {
  if (typeof value === "number" && Number.isFinite(value)) return value;
  const parsed = Number(String(value ?? "").replace(/[^0-9.-]/g, ""));
  return Number.isFinite(parsed) ? parsed : fallback;
}

function summaryFromListing(row: MarketplaceListingMatchRow) {
  const summary = row.buyer_visible_summary;
  if (summary && typeof summary.summary === "string") return summary.summary;
  if (summary && typeof summary.short_summary === "string") return summary.short_summary;
  if (summary && typeof summary.buyerUseCase === "string") return summary.buyerUseCase;
  return "Review-gated marketplace signal product with buyer-safe summary fields only.";
}

function buyerUseCaseFromListing(row: MarketplaceListingMatchRow) {
  const summary = row.buyer_visible_summary;
  if (summary && typeof summary.buyer_use_case === "string") return summary.buyer_use_case;
  if (summary && typeof summary.buyerUseCase === "string") return summary.buyerUseCase;
  if (summary && typeof summary.bestBuyer === "string") return summary.bestBuyer;
  return row.buyer_type || "Serious buyer looking for source-backed lead signals.";
}

export function listingCandidateFromRow(row: MarketplaceListingMatchRow): BuyerMatchCandidate {
  const id = row.slug || row.id;
  return {
    id,
    entityType: "marketplace_listing",
    title: row.title,
    category: row.category || "Marketplace",
    vertical: row.vertical || row.category || "Lead signals",
    summary: summaryFromListing(row),
    buyerUseCase: buyerUseCaseFromListing(row),
    buyerType: row.buyer_type,
    geography: row.territory || row.location_label || "United States",
    accessModel: row.access_model || row.release_mode || "review_gated",
    sourceType: row.source_type || "source-backed review",
    confidence: row.confidence,
    score: row.score,
    complianceStatus: row.compliance_status || row.review_status || "needs_review",
    availabilityStatus: row.listing_status || row.review_status || "review",
    sourceProofStatus: row.source_proof_status || "review",
    sampleEnabled: Boolean(row.sample_enabled || Number(row.sample_count || row.sample_record_count || 0) > 0),
    samplePrice: numberValue(row.sample_price, numberValue(row.price_cents) / 100),
    href: "/marketplace",
  };
}

export function sampleCandidateFromListing(row: MarketplaceListingMatchRow): BuyerMatchCandidate | null {
  if (!row.sample_enabled && !row.sample_count && !row.sample_record_count) return null;
  const base = listingCandidateFromRow(row);
  return {
    ...base,
    id: row.slug || row.id,
    entityType: "sample",
    title: `${row.title} sample`,
    summary: `Limited sample access for ${row.title}. Contact fields remain hidden unless listing rules and entitlement allow them.`,
    accessModel: "sample",
    sampleEnabled: true,
    href: `/marketplace/${encodeURIComponent(row.slug || row.id)}/sample`,
  };
}

export function fallbackMarketplaceListingCandidates(): BuyerMatchCandidate[] {
  const productCandidates = signalProducts.map((product): BuyerMatchCandidate => ({
    id: product.title.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, ""),
    entityType: "marketplace_listing",
    title: product.title,
    category: product.category,
    vertical: product.category,
    summary: `${product.sourceProof}. ${product.suppression}.`,
    buyerUseCase: product.buyerUseCase,
    buyerType: product.buyerUseCase,
    geography: product.location,
    budgetRange: product.priceBand,
    accessModel: product.releaseMode,
    sourceType: product.sourceProof,
    confidence: product.confidence,
    score: product.score,
    complianceStatus: "needs_review",
    availabilityStatus: "sample_available",
    sourceProofStatus: "review",
    sampleEnabled: true,
    samplePrice: Number(product.priceBand.replace(/[^0-9.]/g, "")) || 49,
    href: "/marketplace",
  }));

  const profileCandidates = leadProfileDetails.map((profile): BuyerMatchCandidate => ({
    id: profile.id,
    entityType: "lead_profile",
    title: profile.title,
    category: profile.category,
    vertical: profile.vertical,
    summary: profile.summary,
    buyerUseCase: profile.buyerUseCase,
    buyerType: profile.bestBuyerType,
    geography: "United States",
    budgetRange: profile.priceBand,
    accessModel: profile.releaseMode,
    sourceType: profile.sourceType,
    confidence: profile.confidence,
    score: profile.leadScore,
    complianceStatus: profile.consentStatus,
    availabilityStatus: profile.suppressionStatus,
    sourceProofStatus: profile.sourceProofLinks.some((proof) => proof.status === "verified") ? "verified" : "review",
    sampleEnabled: profile.sampleCount !== "0",
    samplePrice: Number(profile.priceBand.replace(/[^0-9.]/g, "")) || 49,
    href: `/lead-profile/${profile.id}`,
  }));

  return [...productCandidates, ...profileCandidates];
}

export function matchListings(input: BuyerDemandInput, listings: MarketplaceListingMatchRow[], limit = 5): BuyerMatchResult[] {
  const candidates = listings.length ? listings.map(listingCandidateFromRow) : fallbackMarketplaceListingCandidates();
  return sortedMatches(candidates.map((candidate) => scoreCandidate(input, candidate)), limit);
}

export function matchSamples(input: BuyerDemandInput, listings: MarketplaceListingMatchRow[], limit = 3): BuyerMatchResult[] {
  const sampleCandidates = listings
    .map(sampleCandidateFromListing)
    .filter(Boolean) as BuyerMatchCandidate[];
  const candidates = sampleCandidates.length
    ? sampleCandidates
    : fallbackMarketplaceListingCandidates()
        .filter((candidate) => candidate.sampleEnabled)
        .map((candidate) => ({ ...candidate, entityType: "sample" as const, title: `${candidate.title} sample` }));
  return sortedMatches(candidates.map((candidate) => scoreCandidate(input, candidate)), limit);
}

export function matchLeadProfiles(input: BuyerDemandInput, profiles: MarketplaceListingMatchRow[], limit = 4): BuyerMatchResult[] {
  const liveCandidates = profiles.map((row): BuyerMatchCandidate => ({
    ...listingCandidateFromRow(row),
    entityType: "lead_profile",
    href: `/lead-profile/${row.slug || row.id}`,
  }));
  const candidates = liveCandidates.length ? liveCandidates : fallbackMarketplaceListingCandidates().filter((candidate) => candidate.entityType === "lead_profile");
  return sortedMatches(candidates.map((candidate) => scoreCandidate(input, candidate)), limit);
}
