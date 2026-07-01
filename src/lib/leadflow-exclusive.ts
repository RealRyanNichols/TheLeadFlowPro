import "server-only";

import { getFallbackLeadProfileDetail, leadProfileDetails, type LeadProfileDetail } from "@/lib/lead-profile-detail";
import {
  buyerAccountIsRestricted,
  ensureBuyerAccountForUser,
  getBuyerPortalData,
  type BuyerAccount,
  type BuyerPortalData,
} from "@/lib/buyer-portal";
import {
  hasLeadFlowDataApiConfig,
  insertLeadFlowRow,
  patchLeadFlowRows,
  selectLeadFlowRows,
} from "@/lib/leadflow-data-api";
import { sanitizeLeadFlowEventProperties } from "@/lib/leadflow-events";
import { getBuyerAuthState } from "@/lib/supabase-buyer-auth";

export const ACCESS_MODELS = [
  "shared",
  "limited_seats",
  "exclusive_listing",
  "exclusive_geo",
  "exclusive_vertical",
  "exclusive_time_window",
  "internal_only",
] as const;

export const EXCLUSIVE_REQUEST_MODELS = [
  "exclusive_listing",
  "exclusive_geo",
  "exclusive_vertical",
  "exclusive_time_window",
] as const;

export type ListingAccessModel = (typeof ACCESS_MODELS)[number];
export type ExclusiveRequestAccessModel = (typeof EXCLUSIVE_REQUEST_MODELS)[number];

export type ListingStatus =
  | "draft"
  | "review"
  | "sample_available"
  | "available"
  | "reserved"
  | "sold_shared"
  | "sold_exclusive"
  | "expired"
  | "archived"
  | "suppressed";

export type ExclusiveRequestStatus =
  | "submitted"
  | "needs_review"
  | "needs_more_info"
  | "approved"
  | "denied"
  | "reserved"
  | "granted"
  | "expired"
  | "revoked"
  | "archived";

type MarketplaceExclusiveListingRow = {
  id: string;
  slug: string | null;
  lead_profile_id: string | null;
  title: string;
  vertical: string;
  category: string | null;
  buyer_type: string | null;
  source_type: string | null;
  listing_status: ListingStatus;
  review_status: string;
  release_mode: string | null;
  compliance_status: string;
  source_url: string | null;
  buyer_visible_summary: Record<string, unknown>;
  score: number | string | null;
  confidence: number | string | null;
  access_model: ListingAccessModel;
  max_buyers: number | string | null;
  current_buyer_count: number | string | null;
  exclusive_buyer_id: string | null;
  exclusive_starts_at: string | null;
  exclusive_ends_at: string | null;
  territory: string | null;
  exclusivity_notes: string | null;
  updated_at: string;
};

type BuyerAccountRow = BuyerAccount & {
  owner_user_id?: string | null;
  status?: string | null;
};

export type ExclusiveListingView = {
  id: string;
  slug: string;
  title: string;
  category: string;
  vertical: string;
  buyerType: string;
  sourceType: string;
  status: ListingStatus;
  reviewStatus: string;
  complianceStatus: string;
  summary: string;
  buyerUseCase: string;
  score: number;
  confidence: string;
  accessModel: ListingAccessModel;
  maxBuyers: number | null;
  currentBuyerCount: number;
  exclusiveBuyerId: string | null;
  exclusiveStartsAt: string | null;
  exclusiveEndsAt: string | null;
  territory: string | null;
  exclusivityNotes: string | null;
  sourceUrl: string | null;
  leadProfileId: string | null;
  updatedAt: string;
};

export type ExclusiveAvailability = {
  label: string;
  ctaLabel: string;
  canRequest: boolean;
  reason: string;
  warning?: string;
};

export type ExclusiveRequestRecord = {
  id: string;
  buyer_account_id: string;
  listing_id: string | null;
  listing_slug: string | null;
  requested_access_model: ExclusiveRequestAccessModel;
  requested_territory: string | null;
  requested_vertical: string | null;
  requested_start: string | null;
  requested_end: string | null;
  budget_range: string | null;
  intended_use: string;
  urgency: string | null;
  request_notes: string | null;
  status: ExclusiveRequestStatus;
  reviewed_by: string | null;
  reviewed_at: string | null;
  admin_notes: string | null;
  admin_notes_visible: boolean;
  created_at: string;
  updated_at: string;
  metadata?: Record<string, unknown>;
};

export type AdminExclusivePageData = {
  mode: "live" | "offline";
  requests: Array<ExclusiveRequestRecord & { buyerName: string; buyerCompany: string; listingTitle: string }>;
  listings: ExclusiveListingView[];
  stats: {
    requests: number;
    pending: number;
    reserved: number;
    granted: number;
    soldExclusive: number;
    limitedSeatsFull: number;
  };
  loadErrors: string[];
};

export type ExclusiveLandingPageData = {
  mode: "live" | "offline";
  listing: ExclusiveListingView;
  availability: ExclusiveAvailability;
  buyerData: BuyerPortalData;
  recentRequests: ExclusiveRequestRecord[];
  loadErrors: string[];
};

const listingSelect = [
  "id",
  "slug",
  "lead_profile_id",
  "title",
  "vertical",
  "category",
  "buyer_type",
  "source_type",
  "listing_status",
  "review_status",
  "release_mode",
  "compliance_status",
  "source_url",
  "buyer_visible_summary",
  "score",
  "confidence",
  "access_model",
  "max_buyers",
  "current_buyer_count",
  "exclusive_buyer_id",
  "exclusive_starts_at",
  "exclusive_ends_at",
  "territory",
  "exclusivity_notes",
  "updated_at",
].join(",");

const exclusiveRequestSelect = [
  "id",
  "buyer_account_id",
  "listing_id",
  "listing_slug",
  "requested_access_model",
  "requested_territory",
  "requested_vertical",
  "requested_start",
  "requested_end",
  "budget_range",
  "intended_use",
  "urgency",
  "request_notes",
  "status",
  "reviewed_by",
  "reviewed_at",
  "admin_notes",
  "admin_notes_visible",
  "created_at",
  "updated_at",
  "metadata",
].join(",");

const buyerAccountSelect = [
  "id",
  "auth_user_id",
  "name",
  "email",
  "phone",
  "company_name",
  "website",
  "buyer_type",
  "industry",
  "location_served",
  "budget_range",
  "intended_use",
  "account_status",
  "approved_access_level",
  "communication_preference",
  "consent_status",
  "created_at",
  "updated_at",
  "last_login_at",
].join(",");

function nowIso() {
  return new Date().toISOString();
}

function textValue(value: unknown, fallback = "") {
  return typeof value === "string" && value.trim() ? value.trim() : fallback;
}

function numberValue(value: unknown, fallback = 0) {
  if (typeof value === "number" && Number.isFinite(value)) return value;
  if (typeof value === "string") {
    const parsed = Number(value);
    return Number.isFinite(parsed) ? parsed : fallback;
  }
  return fallback;
}

function integerValue(value: unknown, fallback = 0) {
  return Math.round(numberValue(value, fallback));
}

function uuidOrNull(value: string | null | undefined) {
  return value && /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{12}$/i.test(value) ? value : null;
}

function isoOrNull(value: string | null | undefined) {
  if (!value) return null;
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? null : date.toISOString();
}

function fallbackProfile(idOrSlug: string | null | undefined): LeadProfileDetail {
  return getFallbackLeadProfileDetail(idOrSlug);
}

function accessModelFromProfile(profile: LeadProfileDetail): ListingAccessModel {
  const release = `${profile.releaseMode} ${profile.category}`.toLowerCase();
  if (release.includes("aggregate") || release.includes("civic")) return "internal_only";
  if (release.includes("exclusive") || release.includes("territory")) return "exclusive_listing";
  if (release.includes("named")) return "exclusive_time_window";
  return "shared";
}

function normalizeListingStatus(value: string | null | undefined, accessModel: ListingAccessModel): ListingStatus {
  if (value === "paused") return "review";
  if (value === "sold") return accessModel === "exclusive_listing" ? "sold_exclusive" : "sold_shared";
  if (
    value === "draft" ||
    value === "review" ||
    value === "sample_available" ||
    value === "available" ||
    value === "reserved" ||
    value === "sold_shared" ||
    value === "sold_exclusive" ||
    value === "expired" ||
    value === "archived" ||
    value === "suppressed"
  ) {
    return value;
  }
  return "available";
}

function confidenceLabel(value: unknown) {
  if (typeof value === "string" && !/^\d/.test(value)) return value;
  const numeric = numberValue(value, 0);
  const scaled = numeric <= 1 ? Math.round(numeric * 100) : Math.round(numeric);
  if (scaled >= 75) return "high";
  if (scaled >= 45) return "medium";
  if (scaled > 0) return "low";
  return "needs_review";
}

function fallbackListing(idOrSlug: string): ExclusiveListingView {
  const profile = fallbackProfile(idOrSlug);
  const accessModel = accessModelFromProfile(profile);
  return {
    id: profile.id,
    slug: profile.id,
    title: profile.title,
    category: profile.category,
    vertical: profile.vertical,
    buyerType: profile.bestBuyerType,
    sourceType: profile.sourceType,
    status: accessModel === "internal_only" ? "review" : "sample_available",
    reviewStatus: "approved",
    complianceStatus: profile.complianceChecks.some((check) => check.status === "approved") ? "source_reviewed" : "review",
    summary: profile.summary,
    buyerUseCase: profile.buyerUseCase,
    score: profile.leadScore,
    confidence: profile.confidence,
    accessModel,
    maxBuyers: accessModel === "limited_seats" ? 3 : null,
    currentBuyerCount: 0,
    exclusiveBuyerId: null,
    exclusiveStartsAt: null,
    exclusiveEndsAt: null,
    territory: null,
    exclusivityNotes: "Exclusive requests are manually reviewed against source rights, suppression state, category, geography, and buyer use case.",
    sourceUrl: profile.sourceProofLinks[0]?.href || null,
    leadProfileId: profile.id,
    updatedAt: nowIso(),
  };
}

function listingView(row: MarketplaceExclusiveListingRow): ExclusiveListingView {
  const summary = row.buyer_visible_summary || {};
  const accessModel = ACCESS_MODELS.includes(row.access_model) ? row.access_model : "shared";
  return {
    id: row.id,
    slug: row.slug || row.id,
    title: row.title,
    category: row.category || "Marketplace",
    vertical: row.vertical,
    buyerType: row.buyer_type || textValue(summary.best_buyer_type, "Approved buyer"),
    sourceType: row.source_type || textValue(summary.source_type, "Source-backed signal"),
    status: normalizeListingStatus(row.listing_status, accessModel),
    reviewStatus: row.review_status,
    complianceStatus: row.compliance_status,
    summary: textValue(summary.summary, textValue(summary.description, "Reviewed lead signal listing.")),
    buyerUseCase: textValue(summary.buyer_use_case, "Request reviewed access if the source, territory, and use case fit."),
    score: integerValue(row.score, 0),
    confidence: confidenceLabel(row.confidence),
    accessModel,
    maxBuyers: row.max_buyers === null ? null : integerValue(row.max_buyers, 0),
    currentBuyerCount: integerValue(row.current_buyer_count, 0),
    exclusiveBuyerId: row.exclusive_buyer_id,
    exclusiveStartsAt: row.exclusive_starts_at,
    exclusiveEndsAt: row.exclusive_ends_at,
    territory: row.territory,
    exclusivityNotes: row.exclusivity_notes,
    sourceUrl: row.source_url,
    leadProfileId: row.lead_profile_id,
    updatedAt: row.updated_at,
  };
}

export function accessModelLabel(accessModel: ListingAccessModel) {
  const labels: Record<ListingAccessModel, string> = {
    shared: "Shared access available",
    limited_seats: "Limited seats available",
    exclusive_listing: "Exclusive available",
    exclusive_geo: "Exclusive territory available",
    exclusive_vertical: "Exclusive vertical available",
    exclusive_time_window: "Exclusive time window available",
    internal_only: "Internal review only",
  };
  return labels[accessModel];
}

export function availabilityForListing(listing: ExclusiveListingView): ExclusiveAvailability {
  const windowExpired = listing.exclusiveEndsAt ? new Date(listing.exclusiveEndsAt).getTime() <= Date.now() : false;
  if (listing.status === "suppressed") {
    return { label: "Suppressed", ctaLabel: "Unavailable", canRequest: false, reason: "This listing is suppressed and cannot be sold or reserved." };
  }
  if (listing.status === "archived") {
    return { label: "Archived", ctaLabel: "Unavailable", canRequest: false, reason: "This listing is archived." };
  }
  if (listing.accessModel === "internal_only") {
    return { label: "Internal only", ctaLabel: "Review only", canRequest: false, reason: "This listing is not buyer-facing until admin review changes the access model." };
  }
  if (listing.status === "sold_exclusive" && !windowExpired) {
    return { label: "Sold exclusive", ctaLabel: "Join waitlist", canRequest: false, reason: "Active exclusive access already exists for this listing." };
  }
  if (listing.status === "reserved" && !windowExpired) {
    return { label: "Reserved", ctaLabel: "Request review", canRequest: true, reason: "This listing is reserved, but a reviewed backup request can be submitted." };
  }
  if (listing.accessModel === "limited_seats" && listing.maxBuyers !== null && listing.currentBuyerCount >= listing.maxBuyers) {
    return { label: "Limited seats full", ctaLabel: "Join waitlist", canRequest: true, reason: "Seats are full. Admin can review waitlist or exclusive conversion requests." };
  }
  if (listing.accessModel === "shared") {
    return { label: "Shared access available", ctaLabel: "Request exclusive access", canRequest: true, reason: "This listing can be shared, or admin can review a buyer-specific exclusive request." };
  }
  return {
    label: accessModelLabel(listing.accessModel),
    ctaLabel: "Request exclusive access",
    canRequest: true,
    reason: "Exclusive access is reviewed manually before any buyer blocks the listing for others.",
    warning: "Granting exclusive access can block other buyers during the active exclusivity window.",
  };
}

async function trackExclusiveEvent(eventName: string, properties: Record<string, unknown>) {
  if (!hasLeadFlowDataApiConfig()) return;
  const safeProperties = sanitizeLeadFlowEventProperties(properties);
  const route = typeof safeProperties.route === "string" ? safeProperties.route : "/marketplace/exclusive";
  await insertLeadFlowRow("events", {
    event_name: eventName,
    event_type: "exclusive",
    tool_slug: "leadflow_exclusive_access",
    route,
    source_path: route,
    user_role: typeof safeProperties.user_role === "string" ? safeProperties.user_role : "system",
    properties: safeProperties,
  }).catch(() => null);
}

async function auditExclusive(input: {
  actor: "admin" | "buyer" | "system";
  actorUserId?: string | null;
  action: string;
  objectTable: "exclusive_requests" | "marketplace_listings" | "buyer_entitlements";
  objectId?: string | null;
  buyerAccountId?: string | null;
  listingId?: string | null;
  leadProfileId?: string | null;
  details?: Record<string, unknown>;
}) {
  if (!hasLeadFlowDataApiConfig()) return;
  await insertLeadFlowRow("audit_log", {
    actor_user_id: uuidOrNull(input.actorUserId),
    actor_type: input.actor,
    action: input.action,
    object_schema: "leadflow",
    object_table: input.objectTable,
    object_id: uuidOrNull(input.objectId),
    buyer_account_id: uuidOrNull(input.buyerAccountId),
    marketplace_listing_id: uuidOrNull(input.listingId),
    lead_profile_id: uuidOrNull(input.leadProfileId),
    details: {
      raw_records_returned: false,
      exclusive_access_action: true,
      ...(input.details || {}),
    },
  }).catch(() => null);
}

export async function loadExclusiveListing(idOrSlug: string): Promise<ExclusiveListingView> {
  if (!hasLeadFlowDataApiConfig()) return fallbackListing(idOrSlug);

  const byId = uuidOrNull(idOrSlug)
    ? await selectLeadFlowRows<MarketplaceExclusiveListingRow>("marketplace_listings", {
        select: listingSelect,
        id: `eq.${idOrSlug}`,
        deleted_at: "is.null",
        limit: 1,
      }).catch(() => [])
    : [];
  const row = byId[0] || (await selectLeadFlowRows<MarketplaceExclusiveListingRow>("marketplace_listings", {
    select: listingSelect,
    slug: `eq.${idOrSlug}`,
    deleted_at: "is.null",
    limit: 1,
  }).catch(() => []))[0];

  return row ? listingView(row) : fallbackListing(idOrSlug);
}

async function activeExclusiveEntitlementExists(listingId: string | null) {
  if (!hasLeadFlowDataApiConfig() || !uuidOrNull(listingId)) return false;
  const rows = await selectLeadFlowRows<{ id: string }>("buyer_entitlements", {
    select: "id",
    listing_id: `eq.${listingId}`,
    access_level: "eq.exclusive",
    status: "eq.active",
    starts_at: `lte.${nowIso()}`,
    limit: 1,
  }).catch(() => []);
  return rows.some((row) => Boolean(row.id));
}

async function buyerRowsById(ids: string[]) {
  if (!hasLeadFlowDataApiConfig() || ids.length === 0) return new Map<string, BuyerAccountRow>();
  const rows = await selectLeadFlowRows<BuyerAccountRow>("buyer_accounts", {
    select: buyerAccountSelect,
    id: `in.(${ids.map((id) => `"${id}"`).join(",")})`,
    deleted_at: "is.null",
    limit: 200,
  }).catch(() => []);
  return new Map(rows.map((row) => [row.id, row]));
}

export async function getExclusiveLandingPageData(listingId: string): Promise<ExclusiveLandingPageData> {
  const buyerData = await getBuyerPortalData();
  const loadErrors: string[] = [];
  let mode: "live" | "offline" = hasLeadFlowDataApiConfig() ? "live" : "offline";
  let listing: ExclusiveListingView;
  try {
    listing = await loadExclusiveListing(listingId);
  } catch (error) {
    mode = "offline";
    loadErrors.push(error instanceof Error ? error.message : "Exclusive listing load failed.");
    listing = fallbackListing(listingId);
  }

  let recentRequests: ExclusiveRequestRecord[] = [];
  if (hasLeadFlowDataApiConfig() && buyerData.authenticated && buyerData.account) {
    recentRequests = await selectLeadFlowRows<ExclusiveRequestRecord>("exclusive_requests", {
      select: exclusiveRequestSelect,
      buyer_account_id: `eq.${buyerData.account.id}`,
      listing_slug: `eq.${listing.slug}`,
      deleted_at: "is.null",
      order: "created_at.desc",
      limit: 5,
    }).catch(() => []);
  }

  return {
    mode,
    listing,
    availability: availabilityForListing(listing),
    buyerData,
    recentRequests,
    loadErrors,
  };
}

export async function createExclusiveRequest(input: {
  listingId: string;
  buyerName: string;
  company: string;
  email: string;
  phone?: string;
  website?: string;
  requestedAccessModel: ExclusiveRequestAccessModel;
  requestedTerritory?: string;
  requestedVertical?: string;
  requestedStart?: string | null;
  requestedEnd?: string | null;
  budgetRange: string;
  intendedUse: string;
  urgency: string;
  notes?: string;
  consentAccepted: boolean;
}) {
  if (!input.consentAccepted) {
    return { ok: false as const, status: 400, error: "Confirm exclusive access review terms before submitting." };
  }
  if (!hasLeadFlowDataApiConfig()) {
    return { ok: false as const, status: 503, error: "LeadFlow Supabase Data API is not configured for exclusive requests." };
  }

  const auth = await getBuyerAuthState();
  if (!auth.authenticated) {
    return { ok: false as const, status: auth.reason === "missing_config" ? 503 : 401, error: "Buyer login required before requesting exclusive access." };
  }
  const account = await ensureBuyerAccountForUser(auth.user);
  if (!account) return { ok: false as const, status: 403, error: "Buyer account could not be created." };
  if (buyerAccountIsRestricted(account)) {
    return { ok: false as const, status: 403, error: "This buyer account cannot request exclusive access." };
  }

  const listing = await loadExclusiveListing(input.listingId);
  const availability = availabilityForListing(listing);
  if (!availability.canRequest) {
    return { ok: false as const, status: 409, error: availability.reason };
  }
  if (await activeExclusiveEntitlementExists(uuidOrNull(listing.id))) {
    return { ok: false as const, status: 409, error: "Active exclusive entitlement already exists for this listing." };
  }
  if (listing.accessModel === "limited_seats" && listing.maxBuyers !== null && listing.currentBuyerCount >= listing.maxBuyers) {
    return { ok: false as const, status: 409, error: "This limited-seat listing is full. Admin can review a waitlist request from the dashboard." };
  }
  if (listing.status === "suppressed" || listing.complianceStatus === "suppressed" || listing.complianceStatus === "prohibited") {
    return { ok: false as const, status: 409, error: "Exclusive request blocked because this listing is suppressed or prohibited." };
  }

  await patchLeadFlowRows<BuyerAccount>("buyer_accounts", { id: `eq.${account.id}` }, {
    name: input.buyerName || account.name,
    phone: input.phone || account.phone,
    company_name: input.company || account.company_name,
    website: input.website || account.website,
    budget_range: input.budgetRange || account.budget_range,
    intended_use: input.intendedUse || account.intended_use,
    updated_at: nowIso(),
  }).catch(() => null);

  const requestRows = await insertLeadFlowRow<ExclusiveRequestRecord>("exclusive_requests", {
    buyer_account_id: account.id,
    listing_id: uuidOrNull(listing.id),
    listing_slug: listing.slug,
    requested_access_model: input.requestedAccessModel,
    requested_territory: input.requestedTerritory || listing.territory || null,
    requested_vertical: input.requestedVertical || listing.vertical,
    requested_start: isoOrNull(input.requestedStart),
    requested_end: isoOrNull(input.requestedEnd),
    budget_range: input.budgetRange,
    intended_use: input.intendedUse,
    urgency: input.urgency,
    request_notes: input.notes || null,
    status: "submitted",
    metadata: {
      listing_title: listing.title,
      buyer_email_matches_account: input.email.trim().toLowerCase() === account.email.trim().toLowerCase(),
      requested_from: `/marketplace/${listing.slug}/exclusive`,
      consent_accepted: true,
      access_model_before_request: listing.accessModel,
      listing_status_before_request: listing.status,
    },
  });
  const request = requestRows[0];
  if (!request) return { ok: false as const, status: 500, error: "Exclusive request could not be saved." };

  await Promise.all([
    trackExclusiveEvent("exclusive_request_submitted", {
      route: `/marketplace/${listing.slug}/exclusive`,
      listing_id: listing.id,
      exclusive_request_id: request.id,
      requested_access_model: request.requested_access_model,
      vertical: listing.vertical,
      category: listing.category,
      user_role: "buyer",
    }),
    auditExclusive({
      actor: "buyer",
      actorUserId: auth.user.id,
      action: "exclusive_request.created",
      objectTable: "exclusive_requests",
      objectId: request.id,
      buyerAccountId: account.id,
      listingId: uuidOrNull(listing.id),
      leadProfileId: listing.leadProfileId,
      details: {
        requested_access_model: request.requested_access_model,
        budget_range: request.budget_range,
        requested_territory: request.requested_territory,
        requested_vertical: request.requested_vertical,
      },
    }),
  ]);

  return { ok: true as const, request, listing };
}

export async function getAdminExclusivePageData(): Promise<AdminExclusivePageData> {
  if (!hasLeadFlowDataApiConfig()) {
    const listings = leadProfileDetails.slice(0, 6).map((profile) => fallbackListing(profile.id));
    return {
      mode: "offline",
      requests: [],
      listings,
      stats: { requests: 0, pending: 0, reserved: 0, granted: 0, soldExclusive: 0, limitedSeatsFull: 0 },
      loadErrors: ["LeadFlow Supabase Data API is not configured. Showing safe listing examples."],
    };
  }

  const loadErrors: string[] = [];
  const safe = async <T>(table: string, params: Record<string, string | number | boolean | null | undefined>) => {
    try {
      return await selectLeadFlowRows<T>(table, params);
    } catch (error) {
      loadErrors.push(`${table}: ${error instanceof Error ? error.message : "query failed"}`);
      return [];
    }
  };

  const [requestRows, listingRows] = await Promise.all([
    safe<ExclusiveRequestRecord>("exclusive_requests", { select: exclusiveRequestSelect, deleted_at: "is.null", order: "created_at.desc", limit: 120 }),
    safe<MarketplaceExclusiveListingRow>("marketplace_listings", { select: listingSelect, deleted_at: "is.null", order: "updated_at.desc", limit: 140 }),
  ]);
  const listings = listingRows.map(listingView);
  const buyerMap = await buyerRowsById(Array.from(new Set(requestRows.map((request) => request.buyer_account_id))));

  const requests = requestRows.map((request) => {
    const buyer = buyerMap.get(request.buyer_account_id);
    const listing = listings.find((item) => item.id === request.listing_id || item.slug === request.listing_slug);
    return {
      ...request,
      buyerName: buyer?.name || request.buyer_account_id.slice(0, 8),
      buyerCompany: buyer?.company_name || "Buyer account",
      listingTitle: listing?.title || textValue(request.metadata?.listing_title, request.listing_slug || "Marketplace listing"),
    };
  });

  return {
    mode: "live",
    requests,
    listings,
    stats: {
      requests: requests.length,
      pending: requests.filter((request) => ["submitted", "needs_review", "needs_more_info"].includes(request.status)).length,
      reserved: requests.filter((request) => request.status === "reserved").length,
      granted: requests.filter((request) => request.status === "granted" || request.status === "approved").length,
      soldExclusive: listings.filter((listing) => listing.status === "sold_exclusive").length,
      limitedSeatsFull: listings.filter((listing) => listing.accessModel === "limited_seats" && listing.maxBuyers !== null && listing.currentBuyerCount >= listing.maxBuyers).length,
    },
    loadErrors,
  };
}

async function buyerAccountById(id: string) {
  const rows = await selectLeadFlowRows<BuyerAccountRow>("buyer_accounts", {
    select: buyerAccountSelect,
    id: `eq.${id}`,
    deleted_at: "is.null",
    limit: 1,
  }).catch(() => []);
  return rows[0] || null;
}

async function requestById(id: string) {
  const rows = await selectLeadFlowRows<ExclusiveRequestRecord>("exclusive_requests", {
    select: exclusiveRequestSelect,
    id: `eq.${id}`,
    deleted_at: "is.null",
    limit: 1,
  });
  return rows[0] || null;
}

async function grantExclusiveEntitlement(input: {
  request: ExclusiveRequestRecord;
  account: BuyerAccount;
  listing: ExclusiveListingView;
  adminUserId?: string | null;
  adminNotes?: string | null;
}) {
  const startsAt = input.request.requested_start || nowIso();
  const expiresAt = input.request.requested_end || null;
  const existing = await selectLeadFlowRows<{ id: string }>("buyer_entitlements", {
    select: "id",
    buyer_account_id: `eq.${input.account.id}`,
    listing_id: uuidOrNull(input.listing.id) ? `eq.${input.listing.id}` : undefined,
    listing_slug: `eq.${input.listing.slug}`,
    access_level: "eq.exclusive",
    status: "eq.active",
    limit: 1,
  }).catch(() => []);
  if (existing[0]) return existing[0].id;

  const inserted = await insertLeadFlowRow<{ id: string }>("buyer_entitlements", {
    buyer_account_id: input.account.id,
    listing_id: uuidOrNull(input.listing.id),
    listing_slug: input.listing.slug,
    lead_profile_id: uuidOrNull(input.listing.leadProfileId || undefined),
    exclusive_request_id: input.request.id,
    access_level: "exclusive",
    access_model: input.request.requested_access_model,
    territory: input.request.requested_territory || input.listing.territory,
    exclusive_starts_at: startsAt,
    exclusive_ends_at: expiresAt,
    exclusivity_notes: input.adminNotes || input.listing.exclusivityNotes,
    starts_at: startsAt,
    expires_at: expiresAt,
    status: "active",
    created_by: uuidOrNull(input.adminUserId),
    metadata: {
      source: "exclusive_request",
      exclusive_request_id: input.request.id,
      requested_access_model: input.request.requested_access_model,
      requested_vertical: input.request.requested_vertical,
      requested_territory: input.request.requested_territory,
      admin_confirmation: "Granting exclusive access blocks other buyers during the active exclusivity window.",
    },
  });
  return inserted[0]?.id || null;
}

export async function adminUpdateExclusive(input: {
  action:
    | "approve"
    | "deny"
    | "request_more_info"
    | "reserve"
    | "grant_entitlement"
    | "remove_exclusivity"
    | "convert_to_exclusive"
    | "convert_to_shared";
  requestId?: string | null;
  listingId?: string | null;
  accessModel?: ListingAccessModel;
  territory?: string | null;
  startsAt?: string | null;
  endsAt?: string | null;
  adminNotes?: string | null;
  adminUserId?: string | null;
  confirmedImpact?: boolean;
}) {
  if (!hasLeadFlowDataApiConfig()) return { ok: false as const, status: 503, error: "LeadFlow Data API is not configured." };

  if (input.action === "convert_to_shared" || input.action === "remove_exclusivity") {
    const listing = await loadExclusiveListing(input.listingId || "");
    if (!uuidOrNull(listing.id)) return { ok: false as const, status: 404, error: "Listing not found." };
    const updated = await patchLeadFlowRows<MarketplaceExclusiveListingRow>("marketplace_listings", { id: `eq.${listing.id}` }, {
      access_model: "shared",
      exclusive_buyer_id: null,
      exclusive_starts_at: null,
      exclusive_ends_at: null,
      territory: input.territory || listing.territory,
      exclusivity_notes: input.adminNotes || null,
      listing_status: "available",
      current_buyer_count: 0,
    });
    await auditExclusive({
      actor: "admin",
      actorUserId: input.adminUserId,
      action: input.action === "remove_exclusivity" ? "listing.exclusivity_removed" : "listing.converted_shared",
      objectTable: "marketplace_listings",
      objectId: listing.id,
      listingId: listing.id,
      leadProfileId: listing.leadProfileId,
      details: { admin_notes_added: Boolean(input.adminNotes) },
    });
    return { ok: true as const, listing: updated[0] ? listingView(updated[0]) : listing };
  }

  if (input.action === "convert_to_exclusive") {
    const listing = await loadExclusiveListing(input.listingId || "");
    if (!uuidOrNull(listing.id)) return { ok: false as const, status: 404, error: "Listing not found." };
    const accessModel = input.accessModel && EXCLUSIVE_REQUEST_MODELS.includes(input.accessModel as ExclusiveRequestAccessModel)
      ? input.accessModel
      : "exclusive_listing";
    const updated = await patchLeadFlowRows<MarketplaceExclusiveListingRow>("marketplace_listings", { id: `eq.${listing.id}` }, {
      access_model: accessModel,
      territory: input.territory || listing.territory,
      exclusive_starts_at: isoOrNull(input.startsAt),
      exclusive_ends_at: isoOrNull(input.endsAt),
      exclusivity_notes: input.adminNotes || "Exclusive access available after manual review.",
      listing_status: listing.status === "draft" || listing.status === "review" ? "available" : listing.status,
    });
    await auditExclusive({
      actor: "admin",
      actorUserId: input.adminUserId,
      action: "listing.converted_exclusive",
      objectTable: "marketplace_listings",
      objectId: listing.id,
      listingId: listing.id,
      leadProfileId: listing.leadProfileId,
      details: { access_model: accessModel, territory: input.territory || listing.territory },
    });
    return { ok: true as const, listing: updated[0] ? listingView(updated[0]) : listing };
  }

  const request = await requestById(input.requestId || "");
  if (!request) return { ok: false as const, status: 404, error: "Exclusive request not found." };
  const account = await buyerAccountById(request.buyer_account_id);
  if (!account) return { ok: false as const, status: 404, error: "Buyer account not found." };
  const listing = await loadExclusiveListing(request.listing_id || request.listing_slug || "");
  if (!uuidOrNull(listing.id)) return { ok: false as const, status: 404, error: "Listing not found." };

  if (input.action === "approve" || input.action === "grant_entitlement" || input.action === "reserve") {
    if (!input.confirmedImpact) {
      return { ok: false as const, status: 400, error: "Confirm that exclusive access can block other buyers during the active window." };
    }
    if (listing.status === "suppressed" || listing.complianceStatus === "suppressed" || listing.complianceStatus === "prohibited") {
      return { ok: false as const, status: 409, error: "Suppressed or prohibited listings cannot receive exclusive access." };
    }
    if (await activeExclusiveEntitlementExists(listing.id)) {
      return { ok: false as const, status: 409, error: "Active exclusive entitlement already exists for this listing." };
    }
  }

  if (input.action === "deny" || input.action === "request_more_info") {
    const nextStatus: ExclusiveRequestStatus = input.action === "deny" ? "denied" : "needs_more_info";
    const rows = await patchLeadFlowRows<ExclusiveRequestRecord>("exclusive_requests", { id: `eq.${request.id}` }, {
      status: nextStatus,
      reviewed_by: uuidOrNull(input.adminUserId),
      reviewed_at: nowIso(),
      admin_notes: input.adminNotes || request.admin_notes,
      admin_notes_visible: input.action === "request_more_info",
    });
    await Promise.all([
      trackExclusiveEvent("exclusive_request_reviewed", {
        route: "/dashboard/exclusive",
        exclusive_request_id: request.id,
        listing_id: listing.id,
        status: nextStatus,
        user_role: "admin",
      }),
      auditExclusive({
        actor: "admin",
        actorUserId: input.adminUserId,
        action: `exclusive_request.${input.action}`,
        objectTable: "exclusive_requests",
        objectId: request.id,
        buyerAccountId: request.buyer_account_id,
        listingId: listing.id,
        leadProfileId: listing.leadProfileId,
      }),
    ]);
    return { ok: true as const, request: rows[0] || request };
  }

  const entitlementId = input.action === "grant_entitlement" || input.action === "approve"
    ? await grantExclusiveEntitlement({ request, account, listing, adminUserId: input.adminUserId, adminNotes: input.adminNotes })
    : null;
  const nextStatus: ExclusiveRequestStatus =
    input.action === "reserve" ? "reserved" : entitlementId ? "granted" : "approved";
  const listingStatus: ListingStatus = input.action === "reserve" ? "reserved" : entitlementId ? "sold_exclusive" : "reserved";

  const [updatedRequestRows, updatedListingRows] = await Promise.all([
    patchLeadFlowRows<ExclusiveRequestRecord>("exclusive_requests", { id: `eq.${request.id}` }, {
      status: nextStatus,
      reviewed_by: uuidOrNull(input.adminUserId),
      reviewed_at: nowIso(),
      admin_notes: input.adminNotes || request.admin_notes,
      admin_notes_visible: Boolean(input.adminNotes),
    }),
    patchLeadFlowRows<MarketplaceExclusiveListingRow>("marketplace_listings", { id: `eq.${listing.id}` }, {
      access_model: request.requested_access_model,
      exclusive_buyer_id: account.id,
      exclusive_starts_at: request.requested_start || nowIso(),
      exclusive_ends_at: request.requested_end,
      territory: request.requested_territory || listing.territory,
      exclusivity_notes: input.adminNotes || listing.exclusivityNotes || "Exclusive access reviewed and approved.",
      listing_status: listingStatus,
      current_buyer_count: entitlementId ? Math.max(1, listing.currentBuyerCount) : listing.currentBuyerCount,
    }),
  ]);

  await Promise.all([
    trackExclusiveEvent("exclusive_request_reviewed", {
      route: "/dashboard/exclusive",
      exclusive_request_id: request.id,
      listing_id: listing.id,
      status: nextStatus,
      user_role: "admin",
    }),
    entitlementId
      ? trackExclusiveEvent("exclusive_access_granted", {
          route: "/dashboard/exclusive",
          exclusive_request_id: request.id,
          entitlement_id: entitlementId,
          listing_id: listing.id,
          user_role: "admin",
        })
      : Promise.resolve(),
    listingStatus === "reserved"
      ? trackExclusiveEvent("listing_reserved", {
          route: "/dashboard/exclusive",
          exclusive_request_id: request.id,
          listing_id: listing.id,
          user_role: "admin",
        })
      : Promise.resolve(),
    listingStatus === "sold_exclusive"
      ? trackExclusiveEvent("listing_sold_exclusive", {
          route: "/dashboard/exclusive",
          exclusive_request_id: request.id,
          listing_id: listing.id,
          user_role: "admin",
        })
      : Promise.resolve(),
    auditExclusive({
      actor: "admin",
      actorUserId: input.adminUserId,
      action: `exclusive_request.${input.action}`,
      objectTable: entitlementId ? "buyer_entitlements" : "exclusive_requests",
      objectId: entitlementId || request.id,
      buyerAccountId: request.buyer_account_id,
      listingId: listing.id,
      leadProfileId: listing.leadProfileId,
      details: {
        exclusive_request_id: request.id,
        listing_status: listingStatus,
        entitlement_id: entitlementId,
        confirmed_impact: Boolean(input.confirmedImpact),
      },
    }),
  ]);

  return {
    ok: true as const,
    request: updatedRequestRows[0] || request,
    listing: updatedListingRows[0] ? listingView(updatedListingRows[0]) : listing,
    entitlementId,
  };
}
