import "server-only";

import type Stripe from "stripe";
import { leadProfileDetails, type LeadProfileDetail } from "@/lib/lead-profile-detail";
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
import { exportRowsToCsv } from "@/lib/leadflow-export";
import { getBuyerAuthState } from "@/lib/supabase-buyer-auth";
import { stripe } from "@/lib/stripe";

export const SAMPLE_FIELD_GROUPS = ["public_profile", "source_proof", "compliance", "contact"] as const;
export type SampleFieldGroup = (typeof SAMPLE_FIELD_GROUPS)[number];

export type SampleAccessType =
  | "free_redacted"
  | "paid_sample"
  | "buyer_approved"
  | "admin_created"
  | "report_only";

export type SampleRequestStatus =
  | "submitted"
  | "pending_payment"
  | "paid_pending_review"
  | "pending_review"
  | "approved"
  | "denied"
  | "revoked"
  | "expired"
  | "fulfilled";

export type SamplePaymentStatus =
  | "not_required"
  | "pending"
  | "paid"
  | "failed"
  | "refunded"
  | "comped"
  | "manual_review";

type MarketplaceSampleListingRow = {
  id: string;
  slug: string | null;
  lead_profile_id: string | null;
  title: string;
  vertical: string;
  category: string | null;
  buyer_type: string | null;
  source_type: string | null;
  listing_status: string;
  review_status: string;
  release_mode: string | null;
  compliance_status: string;
  source_url: string | null;
  buyer_visible_summary: Record<string, unknown>;
  sample_enabled: boolean;
  sample_price: number | string | null;
  sample_record_count: number | string | null;
  sample_field_groups: string[] | null;
  requires_admin_approval: boolean;
  contact_fields_allowed: boolean;
  sample_expiration_days: number | string | null;
  updated_at: string;
};

type LeadProfileSampleRow = {
  id: string;
  slug?: string | null;
  title: string;
  vertical: string;
  category: string | null;
  buyer_use_case: string | null;
  score: number | string | null;
  confidence: number | string | null;
  consent_status: string;
  suppression_status: string;
  source_proof_status: string;
  review_status: string;
  source_url: string | null;
  buyer_visible_summary: Record<string, unknown>;
  private_profile?: Record<string, unknown>;
  last_verified_at: string | null;
  updated_at: string;
};

export type LeadFlowSampleRecord = {
  id: string;
  listing_id: string | null;
  sample_type: SampleAccessType;
  title: string;
  description: string | null;
  price: number | string;
  record_count: number;
  field_groups: SampleFieldGroup[];
  status: string;
  contact_fields_allowed: boolean;
  requires_admin_approval: boolean;
  allowed_use: string;
  restricted_use: string;
  created_by: string | null;
  created_at: string;
  updated_at: string;
  expires_at: string | null;
  metadata?: Record<string, unknown>;
};

export type LeadFlowSampleItem = {
  id: string;
  sample_id: string;
  lead_profile_id: string | null;
  profile_slug: string | null;
  redacted_record: Record<string, unknown>;
  included_field_groups: SampleFieldGroup[];
  source_proof_summary: Record<string, unknown>;
  score: number | string | null;
  confidence: string;
  created_at: string;
};

export type LeadFlowSampleRequest = {
  id: string;
  buyer_account_id: string;
  listing_id: string | null;
  sample_id: string | null;
  request_status: SampleRequestStatus;
  payment_status: SamplePaymentStatus;
  intended_use: string | null;
  amount: number | string;
  currency: string;
  payment_provider: string | null;
  payment_session_id: string | null;
  payment_intent_id: string | null;
  reviewed_by: string | null;
  reviewed_at: string | null;
  admin_notes: string | null;
  admin_notes_visible: boolean;
  expires_at: string | null;
  created_at: string;
  updated_at: string;
  metadata?: Record<string, unknown>;
};

export type LeadFlowPaymentRecord = {
  id: string;
  payment_provider: string;
  buyer_account_id: string | null;
  listing_id: string | null;
  sample_id: string | null;
  sample_request_id: string | null;
  amount: number | string;
  currency: string;
  status: string;
  payment_session_id: string | null;
  payment_intent_id: string | null;
  metadata?: Record<string, unknown>;
  created_at: string;
  updated_at: string;
  paid_at: string | null;
  refunded_at: string | null;
};

export type SampleListingView = {
  id: string;
  slug: string;
  title: string;
  category: string;
  vertical: string;
  sourceType: string;
  status: string;
  reviewStatus: string;
  complianceStatus: string;
  summary: string;
  buyerUseCase: string;
  sampleEnabled: boolean;
  samplePrice: number;
  sampleRecordCount: number;
  sampleFieldGroups: SampleFieldGroup[];
  requiresAdminApproval: boolean;
  contactFieldsAllowed: boolean;
  expirationDays: number;
  sourceUrl: string | null;
  leadProfileId: string | null;
  updatedAt: string;
};

export type SampleItemView = {
  id: string;
  leadProfileId: string | null;
  title: string;
  category: string;
  vertical: string;
  summary: string;
  buyerUseCase: string;
  recommendedNextAction: string;
  score: number;
  confidence: string;
  sourceProofStatus: string;
  sourceProofLinks: Array<{ label: string; href: string; status: string; description: string }>;
  allowedUse: string;
  restrictedUse: string;
  fieldsIncluded: SampleFieldGroup[];
  contact: {
    website?: string;
    publicContactPage?: string;
  } | null;
  redacted: boolean;
};

export type SampleLandingPageData = {
  mode: "live" | "offline";
  listing: SampleListingView;
  sample: LeadFlowSampleRecord;
  previewItems: SampleItemView[];
  buyerData: BuyerPortalData;
  stripeConfigured: boolean;
  loadErrors: string[];
};

export type BuyerSamplesPageData =
  | Extract<BuyerPortalData, { authenticated: false }>
  | {
      authenticated: true;
      account: BuyerAccount | null;
      restricted: boolean;
      requests: Array<LeadFlowSampleRequest & { sampleTitle: string; listingTitle: string }>;
      accessibleSamples: Array<LeadFlowSampleRecord & { listingTitle: string }>;
      loadErrors: string[];
    };

export type BuyerSampleViewerData =
  | Extract<BuyerPortalData, { authenticated: false }>
  | {
      authenticated: true;
      account: BuyerAccount | null;
      allowed: boolean;
      reason?: string;
      sample: LeadFlowSampleRecord | null;
      request: LeadFlowSampleRequest | null;
      listing: SampleListingView | null;
      items: SampleItemView[];
      loadErrors: string[];
    };

export type AdminSamplesPageData = {
  mode: "live" | "offline";
  samples: Array<LeadFlowSampleRecord & { listingTitle: string }>;
  requests: Array<LeadFlowSampleRequest & { buyerName: string; buyerCompany: string; sampleTitle: string; listingTitle: string }>;
  payments: LeadFlowPaymentRecord[];
  listings: SampleListingView[];
  stats: {
    samples: number;
    requests: number;
    pending: number;
    paid: number;
    approved: number;
    revenue: number;
  };
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
  "sample_enabled",
  "sample_price",
  "sample_record_count",
  "sample_field_groups",
  "requires_admin_approval",
  "contact_fields_allowed",
  "sample_expiration_days",
  "updated_at",
].join(",");

const sampleSelect = [
  "id",
  "listing_id",
  "sample_type",
  "title",
  "description",
  "price",
  "record_count",
  "field_groups",
  "status",
  "contact_fields_allowed",
  "requires_admin_approval",
  "allowed_use",
  "restricted_use",
  "created_by",
  "created_at",
  "updated_at",
  "expires_at",
  "metadata",
].join(",");

const sampleItemSelect = [
  "id",
  "sample_id",
  "lead_profile_id",
  "profile_slug",
  "redacted_record",
  "included_field_groups",
  "source_proof_summary",
  "score",
  "confidence",
  "created_at",
].join(",");

const sampleRequestSelect = [
  "id",
  "buyer_account_id",
  "listing_id",
  "sample_id",
  "request_status",
  "payment_status",
  "intended_use",
  "amount",
  "currency",
  "payment_provider",
  "payment_session_id",
  "payment_intent_id",
  "reviewed_by",
  "reviewed_at",
  "admin_notes",
  "admin_notes_visible",
  "expires_at",
  "created_at",
  "updated_at",
  "metadata",
].join(",");

const paymentSelect = [
  "id",
  "payment_provider",
  "buyer_account_id",
  "listing_id",
  "sample_id",
  "sample_request_id",
  "amount",
  "currency",
  "status",
  "payment_session_id",
  "payment_intent_id",
  "metadata",
  "created_at",
  "updated_at",
  "paid_at",
  "refunded_at",
].join(",");

const profileSelect = [
  "id",
  "slug",
  "title",
  "vertical",
  "category",
  "buyer_use_case",
  "score",
  "confidence",
  "consent_status",
  "suppression_status",
  "source_proof_status",
  "review_status",
  "source_url",
  "buyer_visible_summary",
  "private_profile",
  "last_verified_at",
  "updated_at",
].join(",");

function nowIso() {
  return new Date().toISOString();
}

function expiresIn(days: number) {
  const date = new Date();
  date.setDate(date.getDate() + Math.max(1, Math.min(90, days)));
  return date.toISOString();
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

function textValue(value: unknown, fallback = "") {
  return typeof value === "string" && value.trim() ? value.trim() : fallback;
}

function uuidOrNull(value: string | null | undefined) {
  return value && /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{12}$/i.test(value) ? value : null;
}

function stripeConfigured() {
  return Boolean(process.env.STRIPE_SECRET_KEY);
}

function siteUrl(origin?: string | null) {
  return (origin || process.env.NEXT_PUBLIC_SITE_URL || "https://www.theleadflowpro.com").replace(/\/$/, "");
}

function normalizeSampleFieldGroups(groups: unknown, contactAllowed: boolean): SampleFieldGroup[] {
  const input = Array.isArray(groups) ? groups : [];
  const normalized = input.filter((item): item is SampleFieldGroup => SAMPLE_FIELD_GROUPS.includes(item as SampleFieldGroup));
  const base: SampleFieldGroup[] = normalized.length ? normalized : ["public_profile", "source_proof", "compliance"];
  const filtered = base.filter((group) => group !== "contact" || contactAllowed);
  const fallback: SampleFieldGroup[] = ["public_profile", "source_proof", "compliance"];
  return Array.from(new Set<SampleFieldGroup>(filtered.length ? filtered : fallback));
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

function fallbackProfile(idOrSlug: string | null | undefined): LeadProfileDetail {
  return leadProfileDetails.find((profile) => profile.id === idOrSlug) || leadProfileDetails[0];
}

function fallbackListing(idOrSlug: string): SampleListingView {
  const profile = fallbackProfile(idOrSlug);
  return {
    id: profile.id,
    slug: profile.id,
    title: profile.title,
    category: profile.category,
    vertical: profile.vertical,
    sourceType: profile.sourceType,
    status: "sample_available",
    reviewStatus: "approved",
    complianceStatus: "source_reviewed",
    summary: profile.summary,
    buyerUseCase: profile.buyerUseCase,
    sampleEnabled: true,
    samplePrice: profile.priceBand.includes("$") ? 49 : 0,
    sampleRecordCount: 5,
    sampleFieldGroups: ["public_profile", "source_proof", "compliance"],
    requiresAdminApproval: true,
    contactFieldsAllowed: false,
    expirationDays: 7,
    sourceUrl: profile.sourceProofLinks[0]?.href || null,
    leadProfileId: profile.id,
    updatedAt: nowIso(),
  };
}

function listingView(row: MarketplaceSampleListingRow): SampleListingView {
  const summary = row.buyer_visible_summary || {};
  return {
    id: row.id,
    slug: row.slug || row.id,
    title: row.title,
    category: row.category || "Marketplace",
    vertical: row.vertical,
    sourceType: row.source_type || textValue(summary.source_type, "Source-backed signal"),
    status: row.listing_status,
    reviewStatus: row.review_status,
    complianceStatus: row.compliance_status,
    summary: textValue(summary.summary, textValue(summary.description, "Reviewed lead signal sample.")),
    buyerUseCase: textValue(summary.buyer_use_case, "Review source proof and score context before requesting full access."),
    sampleEnabled: Boolean(row.sample_enabled),
    samplePrice: numberValue(row.sample_price, 0),
    sampleRecordCount: integerValue(row.sample_record_count, 5),
    sampleFieldGroups: normalizeSampleFieldGroups(row.sample_field_groups, Boolean(row.contact_fields_allowed)),
    requiresAdminApproval: Boolean(row.requires_admin_approval),
    contactFieldsAllowed: Boolean(row.contact_fields_allowed),
    expirationDays: integerValue(row.sample_expiration_days, 7),
    sourceUrl: row.source_url,
    leadProfileId: row.lead_profile_id,
    updatedAt: row.updated_at,
  };
}

function fallbackSampleForListing(listing: SampleListingView): LeadFlowSampleRecord {
  return {
    id: listing.slug,
    listing_id: uuidOrNull(listing.id),
    sample_type: listing.samplePrice > 0 ? "paid_sample" : "free_redacted",
    title: `${listing.title} Sample`,
    description: "Small proof-backed sample for review before full access.",
    price: listing.samplePrice,
    record_count: listing.sampleRecordCount || 5,
    field_groups: listing.sampleFieldGroups,
    status: "active",
    contact_fields_allowed: listing.contactFieldsAllowed,
    requires_admin_approval: listing.requiresAdminApproval,
    allowed_use: "Review source proof, scoring context, and buyer-use fit before requesting full access.",
    restricted_use: "Do not use as a blind list, suppressed outreach list, raw identity dossier, or guaranteed sales source.",
    created_by: null,
    created_at: nowIso(),
    updated_at: nowIso(),
    expires_at: null,
    metadata: { fallback: true, listing_slug: listing.slug },
  };
}

function profileRowFromDetail(profile: LeadProfileDetail): LeadProfileSampleRow {
  return {
    id: profile.id,
    slug: profile.id,
    title: profile.title,
    vertical: profile.vertical,
    category: profile.category,
    buyer_use_case: profile.buyerUseCase,
    score: profile.leadScore,
    confidence: profile.confidence,
    consent_status: profile.consentStatus,
    suppression_status: profile.suppressionStatus,
    source_proof_status: profile.sourceProofLinks.some((proof) => proof.status === "verified") ? "approved" : "sample_available",
    review_status: "approved",
    source_url: profile.sourceProofLinks[0]?.href || null,
    buyer_visible_summary: {
      summary: profile.summary,
      buyer_use_case: profile.buyerUseCase,
      recommended_next_action: profile.recommendedNextAction,
      source_proof_links: profile.sourceProofLinks.map((proof) => ({
        label: proof.label,
        href: proof.href,
        status: proof.status,
        description: proof.description,
      })),
      allowed_use: profile.buyerUseCase,
      restricted_use: "No blind-list blasting, suppressed outreach, raw data resale, or guaranteed-result claims.",
    },
    private_profile: {
      business_name: profile.title,
      public_contact_page: profile.sourceProofLinks[0]?.href || "/profile-model",
      risk_level: "low",
    },
    last_verified_at: profile.lastVerifiedDate,
    updated_at: nowIso(),
  };
}

function itemViewFromProfile(profile: LeadProfileSampleRow, sample: LeadFlowSampleRecord, groups: SampleFieldGroup[]): SampleItemView {
  const summary = profile.buyer_visible_summary || {};
  const privateProfile = profile.private_profile || {};
  const contactAllowed = groups.includes("contact") && sample.contact_fields_allowed;
  const sourceProofLinks = Array.isArray(summary.source_proof_links)
    ? summary.source_proof_links
        .map((proof) => ({
          label: textValue((proof as Record<string, unknown>).label, profile.title),
          href: textValue((proof as Record<string, unknown>).href, profile.source_url || "/profile-model"),
          status: textValue((proof as Record<string, unknown>).status, profile.source_proof_status),
          description: textValue((proof as Record<string, unknown>).description, "Source proof attached."),
        }))
        .slice(0, 4)
    : [
        {
          label: textValue(summary.source_title, profile.title),
          href: profile.source_url || "/profile-model",
          status: profile.source_proof_status,
          description: textValue(summary.source_snippet, "Source proof is reviewed before full release."),
        },
      ];

  return {
    id: profile.slug || profile.id,
    leadProfileId: profile.id,
    title: profile.title,
    category: profile.category || "Marketplace",
    vertical: profile.vertical,
    summary: textValue(summary.summary, "Redacted reviewed profile sample."),
    buyerUseCase: profile.buyer_use_case || textValue(summary.buyer_use_case, sample.allowed_use),
    recommendedNextAction: textValue(summary.recommended_next_action, "Request full access if the sample fits your buyer use case."),
    score: integerValue(profile.score, 0),
    confidence: confidenceLabel(profile.confidence),
    sourceProofStatus: profile.source_proof_status,
    sourceProofLinks,
    allowedUse: textValue(summary.allowed_use, sample.allowed_use),
    restrictedUse: textValue(summary.restricted_use, sample.restricted_use),
    fieldsIncluded: groups,
    contact: contactAllowed
      ? {
          website: textValue(privateProfile.website, profile.source_url || undefined),
          publicContactPage: textValue(privateProfile.public_contact_page, profile.source_url || undefined),
        }
      : null,
    redacted: !contactAllowed,
  };
}

function itemViewFromSampleItem(item: LeadFlowSampleItem, sample: LeadFlowSampleRecord): SampleItemView {
  const record = item.redacted_record || {};
  const proof = item.source_proof_summary || {};
  const groups = normalizeSampleFieldGroups(item.included_field_groups, sample.contact_fields_allowed);
  return {
    id: item.profile_slug || item.lead_profile_id || item.id,
    leadProfileId: item.lead_profile_id,
    title: textValue(record.profile_title, textValue(record.title, "Redacted sample profile")),
    category: textValue(record.category, "Marketplace"),
    vertical: textValue(record.vertical, "Lead signal"),
    summary: textValue(record.summary, "Reviewed, redacted sample row."),
    buyerUseCase: textValue(record.buyer_use_case, sample.allowed_use),
    recommendedNextAction: textValue(record.recommended_next_action, "Request full access if this sample fits your buyer use case."),
    score: integerValue(item.score || record.score, 0),
    confidence: confidenceLabel(item.confidence || record.confidence),
    sourceProofStatus: textValue(proof.proof_status, textValue(record.source_proof_status, "sample")),
    sourceProofLinks: [
      {
        label: textValue(proof.source_title, textValue(record.source_title, "Source proof")),
        href: textValue(proof.source_url, textValue(record.source_url, "/profile-model")),
        status: textValue(proof.proof_status, "sample"),
        description: textValue(proof.source_snippet, "Source proof summary is redacted for sample access."),
      },
    ],
    allowedUse: textValue(record.allowed_use, sample.allowed_use),
    restrictedUse: textValue(record.restricted_use, sample.restricted_use),
    fieldsIncluded: groups,
    contact: groups.includes("contact") && sample.contact_fields_allowed
      ? {
          website: textValue(record.website, undefined),
          publicContactPage: textValue(record.public_contact_page, undefined),
        }
      : null,
    redacted: !(groups.includes("contact") && sample.contact_fields_allowed),
  };
}

function sampleAccessActive(request: LeadFlowSampleRequest) {
  if (request.expires_at && new Date(request.expires_at).getTime() <= Date.now()) return false;
  return (
    ["approved", "fulfilled"].includes(request.request_status) &&
    ["paid", "not_required", "comped"].includes(request.payment_status)
  );
}

async function trackSampleEvent(eventName: string, properties: Record<string, unknown>) {
  if (!hasLeadFlowDataApiConfig()) return;
  const safeProperties = sanitizeLeadFlowEventProperties(properties);
  const route = typeof safeProperties.route === "string" ? safeProperties.route : "/samples";
  await insertLeadFlowRow("events", {
    event_name: eventName,
    event_type: "sample",
    tool_slug: "leadflow_samples",
    route,
    source_path: route,
    user_role: typeof safeProperties.user_role === "string" ? safeProperties.user_role : "system",
    properties: safeProperties,
  }).catch(() => null);
}

async function auditSample(input: {
  actor: "admin" | "consumer" | "webhook" | "system";
  actorUserId?: string | null;
  action: string;
  objectTable: "samples" | "sample_requests" | "payments" | "buyer_entitlements";
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
      admin_only_fields_returned: false,
      ...(input.details || {}),
    },
  }).catch(() => null);
}

async function loadListing(idOrSlug: string): Promise<SampleListingView> {
  if (!hasLeadFlowDataApiConfig()) return fallbackListing(idOrSlug);

  const byId = uuidOrNull(idOrSlug)
    ? await selectLeadFlowRows<MarketplaceSampleListingRow>("marketplace_listings", {
        select: listingSelect,
        id: `eq.${idOrSlug}`,
        deleted_at: "is.null",
        limit: 1,
      }).catch(() => [])
    : [];
  const row = byId[0] || (await selectLeadFlowRows<MarketplaceSampleListingRow>("marketplace_listings", {
    select: listingSelect,
    slug: `eq.${idOrSlug}`,
    deleted_at: "is.null",
    limit: 1,
  }).catch(() => []))[0];

  return row ? listingView(row) : fallbackListing(idOrSlug);
}

async function loadSampleForListing(listing: SampleListingView): Promise<LeadFlowSampleRecord> {
  if (!hasLeadFlowDataApiConfig() || !uuidOrNull(listing.id)) return fallbackSampleForListing(listing);
  const rows = await selectLeadFlowRows<LeadFlowSampleRecord>("samples", {
    select: sampleSelect,
    listing_id: `eq.${listing.id}`,
    deleted_at: "is.null",
    order: "created_at.desc",
    limit: 1,
  }).catch(() => []);
  return rows[0] ? normalizeSample(rows[0], listing) : fallbackSampleForListing(listing);
}

async function loadSample(sampleId: string): Promise<LeadFlowSampleRecord | null> {
  if (!hasLeadFlowDataApiConfig()) {
    const listing = fallbackListing(sampleId);
    return fallbackSampleForListing(listing);
  }
  const rows = await selectLeadFlowRows<LeadFlowSampleRecord>("samples", {
    select: sampleSelect,
    id: `eq.${sampleId}`,
    deleted_at: "is.null",
    limit: 1,
  }).catch(() => []);
  return rows[0] ? normalizeSample(rows[0]) : null;
}

function normalizeSample(sample: LeadFlowSampleRecord, listing?: SampleListingView): LeadFlowSampleRecord {
  const contactAllowed = Boolean(sample.contact_fields_allowed && (listing?.contactFieldsAllowed ?? true));
  return {
    ...sample,
    price: numberValue(sample.price, listing?.samplePrice || 0),
    record_count: integerValue(sample.record_count, listing?.sampleRecordCount || 5),
    field_groups: normalizeSampleFieldGroups(sample.field_groups, contactAllowed),
    contact_fields_allowed: contactAllowed,
    requires_admin_approval: Boolean(sample.requires_admin_approval),
  };
}

async function loadSampleItems(sample: LeadFlowSampleRecord, listing: SampleListingView): Promise<SampleItemView[]> {
  if (hasLeadFlowDataApiConfig() && uuidOrNull(sample.id)) {
    const items = await selectLeadFlowRows<LeadFlowSampleItem>("sample_items", {
      select: sampleItemSelect,
      sample_id: `eq.${sample.id}`,
      order: "created_at.asc",
      limit: Math.max(1, Math.min(100, sample.record_count || listing.sampleRecordCount || 5)),
    }).catch(() => []);
    if (items.length) return items.map((item) => itemViewFromSampleItem(item, sample));
  }

  const profile = listing.leadProfileId
    ? fallbackProfile(listing.leadProfileId)
    : fallbackProfile(listing.slug);
  return [itemViewFromProfile(profileRowFromDetail(profile), sample, sample.field_groups)];
}

async function loadProfileForSample(listing: SampleListingView): Promise<LeadProfileSampleRow | null> {
  if (!hasLeadFlowDataApiConfig()) {
    return profileRowFromDetail(fallbackProfile(listing.leadProfileId || listing.slug));
  }
  const target = listing.leadProfileId || listing.slug;
  const idRows = uuidOrNull(target)
    ? await selectLeadFlowRows<LeadProfileSampleRow>("lead_profiles", {
        select: profileSelect,
        id: `eq.${target}`,
        deleted_at: "is.null",
        limit: 1,
      }).catch(() => [])
    : [];
  if (idRows[0]) return idRows[0];
  const slugRows = await selectLeadFlowRows<LeadProfileSampleRow>("lead_profiles", {
    select: profileSelect,
    slug: `eq.${target}`,
    deleted_at: "is.null",
    limit: 1,
  }).catch(() => []);
  return slugRows[0] || profileRowFromDetail(fallbackProfile(target));
}

function profileIsSampleSafe(profile: LeadProfileSampleRow | null) {
  if (!profile) return true;
  const risk = textValue(profile.private_profile?.risk_level, "low");
  if (["suppressed", "do_not_contact", "delete_requested"].includes(profile.suppression_status)) return false;
  if (["high", "prohibited"].includes(risk)) return false;
  if (profile.review_status && !["approved", "review"].includes(profile.review_status)) return false;
  return true;
}

async function ensurePersistedSample(listing: SampleListingView): Promise<LeadFlowSampleRecord> {
  const existing = await loadSampleForListing(listing);
  if (hasLeadFlowDataApiConfig() && uuidOrNull(existing.id)) return existing;
  if (!hasLeadFlowDataApiConfig() || !uuidOrNull(listing.id)) return existing;

  const sampleType: SampleAccessType = listing.samplePrice > 0 ? "paid_sample" : "free_redacted";
  const inserted = await insertLeadFlowRow<LeadFlowSampleRecord>("samples", {
    listing_id: listing.id,
    sample_type: sampleType,
    title: `${listing.title} Sample`,
    description: "Small proof-backed sample for review before full access.",
    price: listing.samplePrice,
    record_count: Math.max(1, listing.sampleRecordCount || 5),
    field_groups: listing.sampleFieldGroups,
    status: "active",
    contact_fields_allowed: listing.contactFieldsAllowed,
    requires_admin_approval: listing.requiresAdminApproval,
    allowed_use: "Review source proof, scoring context, and buyer-use fit before requesting full access.",
    restricted_use: "Do not use as a blind list, suppressed outreach list, raw identity dossier, or guaranteed sales source.",
    metadata: {
      created_by: "sample_request_workflow",
      listing_slug: listing.slug,
    },
  });
  const sample = normalizeSample(inserted[0] || existing, listing);
  const profile = await loadProfileForSample(listing);
  if (profile && profileIsSampleSafe(profile)) {
    const item = itemViewFromProfile(profile, sample, sample.field_groups);
    await insertLeadFlowRow("sample_items", {
      sample_id: sample.id,
      lead_profile_id: uuidOrNull(profile.id),
      profile_slug: profile.slug || listing.slug,
      redacted_record: {
        profile_title: item.title,
        category: item.category,
        vertical: item.vertical,
        summary: item.summary,
        buyer_use_case: item.buyerUseCase,
        recommended_next_action: item.recommendedNextAction,
        score: item.score,
        confidence: item.confidence,
        source_proof_status: item.sourceProofStatus,
        allowed_use: item.allowedUse,
        restricted_use: item.restrictedUse,
      },
      included_field_groups: item.fieldsIncluded,
      source_proof_summary: {
        source_url: item.sourceProofLinks[0]?.href || listing.sourceUrl,
        source_title: item.sourceProofLinks[0]?.label || item.title,
        source_snippet: item.sourceProofLinks[0]?.description || "Source proof summary redacted for sample.",
        proof_status: item.sourceProofStatus,
      },
      score: item.score,
      confidence: item.confidence,
    }).catch(() => null);
  }
  return sample;
}

export async function getSampleLandingPageData(listingId: string): Promise<SampleLandingPageData> {
  const buyerData = await getBuyerPortalData();
  const loadErrors: string[] = [];
  let mode: "live" | "offline" = hasLeadFlowDataApiConfig() ? "live" : "offline";
  let listing: SampleListingView;
  try {
    listing = await loadListing(listingId);
  } catch (error) {
    loadErrors.push(error instanceof Error ? error.message : "Listing load failed.");
    mode = "offline";
    listing = fallbackListing(listingId);
  }
  let sample: LeadFlowSampleRecord;
  try {
    sample = await loadSampleForListing(listing);
  } catch (error) {
    loadErrors.push(error instanceof Error ? error.message : "Sample load failed.");
    sample = fallbackSampleForListing(listing);
  }
  const previewItems = await loadSampleItems(sample, listing);
  return { mode, listing, sample, previewItems, buyerData, stripeConfigured: stripeConfigured(), loadErrors };
}

export async function getBuyerSamplesPageData(): Promise<BuyerSamplesPageData> {
  const data = await getBuyerPortalData();
  if (!data.authenticated) return data;
  const restricted = buyerAccountIsRestricted(data.account);
  if (!hasLeadFlowDataApiConfig() || !data.account) {
    return {
      authenticated: true,
      account: data.account,
      restricted,
      requests: [],
      accessibleSamples: [],
      loadErrors: hasLeadFlowDataApiConfig() ? [] : ["LeadFlow Supabase Data API is not configured."],
    };
  }

  const loadErrors: string[] = [];
  const requests = await selectLeadFlowRows<LeadFlowSampleRequest>("sample_requests", {
    select: sampleRequestSelect,
    buyer_account_id: `eq.${data.account.id}`,
    deleted_at: "is.null",
    order: "created_at.desc",
    limit: 100,
  }).catch((error) => {
    loadErrors.push(error instanceof Error ? error.message : "Sample requests query failed.");
    return [];
  });

  const enriched = await Promise.all(requests.map(async (request) => {
    const sample = request.sample_id ? await loadSample(request.sample_id) : null;
    const listing = request.listing_id ? await loadListing(request.listing_id).catch(() => null) : null;
    return {
      ...request,
      sampleTitle: sample?.title || "Sample request",
      listingTitle: listing?.title || "Marketplace listing",
    };
  }));

  const accessibleSamples = enriched
    .filter((request) => sampleAccessActive(request) && request.sample_id)
    .map((request) => request.sample_id as string);
  const uniqueSampleIds = Array.from(new Set(accessibleSamples));
  const sampleCards = await Promise.all(uniqueSampleIds.map(async (sampleId) => {
    const sample = await loadSample(sampleId);
    const request = enriched.find((item) => item.sample_id === sampleId);
    return sample
      ? {
          ...sample,
          listingTitle: request?.listingTitle || "Marketplace listing",
        }
      : null;
  }));

  return {
    authenticated: true,
    account: data.account,
    restricted,
    requests: enriched,
    accessibleSamples: sampleCards.filter((item): item is LeadFlowSampleRecord & { listingTitle: string } => Boolean(item)),
    loadErrors,
  };
}

export async function getBuyerSampleViewerData(sampleId: string): Promise<BuyerSampleViewerData> {
  const data = await getBuyerPortalData();
  if (!data.authenticated) return data;
  const restricted = buyerAccountIsRestricted(data.account);
  const loadErrors: string[] = [];
  if (!data.account || restricted) {
    return {
      authenticated: true,
      account: data.account,
      allowed: false,
      reason: restricted ? "Buyer account is suspended or denied." : "Complete buyer profile before viewing samples.",
      sample: null,
      request: null,
      listing: null,
      items: [],
      loadErrors,
    };
  }

  const sample = await loadSample(sampleId).catch((error) => {
    loadErrors.push(error instanceof Error ? error.message : "Sample load failed.");
    return null;
  });
  if (!sample) {
    return { authenticated: true, account: data.account, allowed: false, reason: "Sample not found.", sample: null, request: null, listing: null, items: [], loadErrors };
  }

  const requests = hasLeadFlowDataApiConfig()
    ? await selectLeadFlowRows<LeadFlowSampleRequest>("sample_requests", {
        select: sampleRequestSelect,
        buyer_account_id: `eq.${data.account.id}`,
        sample_id: `eq.${sample.id}`,
        deleted_at: "is.null",
        order: "created_at.desc",
        limit: 1,
      }).catch((error) => {
        loadErrors.push(error instanceof Error ? error.message : "Sample access query failed.");
        return [];
      })
    : [];
  const request = requests[0] || null;
  const allowed = request ? sampleAccessActive(request) : !hasLeadFlowDataApiConfig();
  const listing = sample.listing_id ? await loadListing(sample.listing_id).catch(() => null) : null;
  const effectiveListing = listing || fallbackListing(textValue(sample.metadata?.listing_slug, sample.id));
  const items = allowed ? await loadSampleItems(sample, effectiveListing) : [];

  if (allowed && request) {
    await Promise.all([
      trackSampleEvent("sample_viewed", {
        route: `/buyer/samples/${sample.id}`,
        sample_id: sample.id,
        sample_request_id: request.id,
        listing_id: sample.listing_id,
        user_role: "buyer",
      }),
      auditSample({
        actor: "consumer",
        action: "sample.viewed",
        objectTable: "samples",
        objectId: sample.id,
        buyerAccountId: data.account.id,
        listingId: sample.listing_id,
        details: { sample_request_id: request.id, field_groups: sample.field_groups },
      }),
    ]);
  }

  return {
    authenticated: true,
    account: data.account,
    allowed,
    reason: allowed ? undefined : "Approved or paid sample access is required before viewing this sample.",
    sample,
    request,
    listing: effectiveListing,
    items,
    loadErrors,
  };
}

export async function getAdminSamplesPageData(): Promise<AdminSamplesPageData> {
  if (!hasLeadFlowDataApiConfig()) {
    const listing = fallbackListing("ecommerce-vendor-signal-pack");
    const sample = fallbackSampleForListing(listing);
    return {
      mode: "offline",
      samples: [{ ...sample, listingTitle: listing.title }],
      requests: [],
      payments: [],
      listings: leadProfileDetails.slice(0, 5).map((profile) => fallbackListing(profile.id)),
      stats: { samples: 1, requests: 0, pending: 0, paid: 0, approved: 0, revenue: 0 },
      loadErrors: ["LeadFlow Supabase Data API is not configured. Showing safe test sample data."],
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

  const [samples, requests, payments, listingRows] = await Promise.all([
    safe<LeadFlowSampleRecord>("samples", { select: sampleSelect, deleted_at: "is.null", order: "created_at.desc", limit: 100 }),
    safe<LeadFlowSampleRequest>("sample_requests", { select: sampleRequestSelect, deleted_at: "is.null", order: "created_at.desc", limit: 100 }),
    safe<LeadFlowPaymentRecord>("payments", { select: paymentSelect, order: "created_at.desc", limit: 100 }),
    safe<MarketplaceSampleListingRow>("marketplace_listings", { select: listingSelect, deleted_at: "is.null", order: "updated_at.desc", limit: 100 }),
  ]);
  const listings = listingRows.map(listingView);

  const sampleTitle = (sampleId: string | null) => samples.find((sample) => sample.id === sampleId)?.title || "Sample";
  const listingTitle = (listingId: string | null) => listings.find((listing) => listing.id === listingId)?.title || "Marketplace listing";

  const enrichedSamples = samples.map((sample) => ({
    ...normalizeSample(sample, listings.find((listing) => listing.id === sample.listing_id)),
    listingTitle: listingTitle(sample.listing_id),
  }));

  const enrichedRequests = requests.map((request) => ({
    ...request,
    buyerName: textValue(request.metadata?.buyer_name, request.buyer_account_id.slice(0, 8)),
    buyerCompany: textValue(request.metadata?.buyer_company, "Buyer account"),
    sampleTitle: sampleTitle(request.sample_id),
    listingTitle: listingTitle(request.listing_id),
  }));

  const paidRevenue = payments
    .filter((payment) => payment.status === "paid")
    .reduce((total, payment) => total + numberValue(payment.amount, 0), 0);

  return {
    mode: "live",
    samples: enrichedSamples,
    requests: enrichedRequests,
    payments,
    listings,
    stats: {
      samples: samples.length,
      requests: requests.length,
      pending: requests.filter((request) => ["submitted", "pending_payment", "paid_pending_review", "pending_review"].includes(request.request_status)).length,
      paid: requests.filter((request) => request.payment_status === "paid").length,
      approved: requests.filter((request) => ["approved", "fulfilled"].includes(request.request_status)).length,
      revenue: paidRevenue,
    },
    loadErrors,
  };
}

async function grantSampleEntitlement(input: {
  account: BuyerAccount;
  listing: SampleListingView;
  sample: LeadFlowSampleRecord;
  request: LeadFlowSampleRequest;
  actor: "admin" | "webhook" | "system";
}) {
  if (!hasLeadFlowDataApiConfig()) return null;
  const existing = await selectLeadFlowRows<{ id: string }>("buyer_entitlements", {
    select: "id",
    buyer_account_id: `eq.${input.account.id}`,
    listing_id: uuidOrNull(input.listing.id) ? `eq.${input.listing.id}` : undefined,
    listing_slug: `eq.${input.listing.slug}`,
    access_level: "eq.sample",
    status: "eq.active",
    limit: 1,
  }).catch(() => []);
  if (existing[0]) return existing[0].id;

  const inserted = await insertLeadFlowRow<{ id: string }>("buyer_entitlements", {
    buyer_account_id: input.account.id,
    listing_id: uuidOrNull(input.listing.id),
    listing_slug: input.listing.slug,
    lead_profile_id: uuidOrNull(input.listing.leadProfileId || undefined),
    access_level: "sample",
    starts_at: nowIso(),
    expires_at: expiresIn(input.listing.expirationDays),
    status: "active",
    metadata: {
      source: "sample_request",
      sample_id: input.sample.id,
      sample_request_id: input.request.id,
      field_groups: input.sample.field_groups,
      contact_fields_allowed: input.sample.contact_fields_allowed,
    },
  });
  const entitlementId = inserted[0]?.id || null;
  await auditSample({
    actor: input.actor,
    action: "sample_access.granted",
    objectTable: "buyer_entitlements",
    objectId: entitlementId,
    buyerAccountId: input.account.id,
    listingId: uuidOrNull(input.listing.id),
    leadProfileId: input.listing.leadProfileId,
    details: {
      sample_id: input.sample.id,
      sample_request_id: input.request.id,
      field_groups: input.sample.field_groups,
    },
  });
  return entitlementId;
}

export type CreateSampleRequestResult =
  | {
      ok: true;
      requestId: string;
      sampleId: string;
      status: SampleRequestStatus;
      paymentStatus: SamplePaymentStatus;
      checkoutUrl?: string | null;
      paymentTodo?: string | null;
    }
  | {
      ok: false;
      status: number;
      error: string;
      reason: string;
    };

export async function createSampleRequest(input: {
  listingId: string;
  intendedUse: string;
  confirmedAllowedUse: boolean;
  origin?: string | null;
}): Promise<CreateSampleRequestResult> {
  if (!input.confirmedAllowedUse) {
    return { ok: false, status: 400, error: "Confirm the sample allowed-use terms before requesting access.", reason: "allowed_use_not_confirmed" };
  }
  if (!hasLeadFlowDataApiConfig()) {
    return { ok: false, status: 503, error: "LeadFlow Supabase Data API is not configured for sample requests.", reason: "missing_data_api" };
  }

  const auth = await getBuyerAuthState();
  if (!auth.authenticated) {
    return { ok: false, status: auth.reason === "missing_config" ? 503 : 401, error: "Buyer login required before requesting a sample.", reason: auth.reason };
  }
  const account = await ensureBuyerAccountForUser(auth.user);
  if (!account) return { ok: false, status: 403, error: "Buyer account could not be created.", reason: "buyer_account_missing" };
  if (buyerAccountIsRestricted(account)) {
    return { ok: false, status: 403, error: "This buyer account cannot request samples.", reason: "buyer_restricted" };
  }

  const listing = await loadListing(input.listingId);
  if (!listing.sampleEnabled) return { ok: false, status: 403, error: "This listing does not offer sample access yet.", reason: "sample_disabled" };
  if (["suppressed", "prohibited"].includes(listing.complianceStatus) || ["suppressed", "archived"].includes(listing.status)) {
    return { ok: false, status: 409, error: "Sample access is blocked for this listing.", reason: "listing_blocked" };
  }
  const profile = await loadProfileForSample(listing);
  if (!profileIsSampleSafe(profile)) {
    await trackSampleEvent("sample_access_granted", { route: `/marketplace/${listing.slug}/sample`, listing_id: listing.id, status: "blocked" });
    return { ok: false, status: 409, error: "No sample-safe profiles passed suppression, review, and risk checks.", reason: "no_safe_profiles" };
  }

  const sample = await ensurePersistedSample(listing);
  const amount = numberValue(sample.price, listing.samplePrice);
  const requestStatus: SampleRequestStatus = amount > 0 ? "pending_payment" : sample.requires_admin_approval ? "pending_review" : "fulfilled";
  const paymentStatus: SamplePaymentStatus = amount > 0 ? "pending" : "not_required";
  const expiresAt = requestStatus === "fulfilled" ? expiresIn(listing.expirationDays) : null;
  const requestRows = await insertLeadFlowRow<LeadFlowSampleRequest>("sample_requests", {
    buyer_account_id: account.id,
    listing_id: uuidOrNull(listing.id),
    sample_id: uuidOrNull(sample.id),
    request_status: requestStatus,
    payment_status: paymentStatus,
    intended_use: input.intendedUse,
    amount,
    currency: "usd",
    payment_provider: amount > 0 ? "stripe" : "none",
    expires_at: expiresAt,
    metadata: {
      listing_slug: listing.slug,
      sample_type: sample.sample_type,
      buyer_name: account.name,
      buyer_company: account.company_name,
      field_groups: sample.field_groups,
      contact_fields_allowed: sample.contact_fields_allowed,
      allowed_use_confirmed: true,
      requested_from: `/marketplace/${listing.slug}/sample`,
    },
  });
  const request = requestRows[0];
  if (!request) return { ok: false, status: 500, error: "Sample request could not be created.", reason: "insert_failed" };

  await Promise.all([
    trackSampleEvent("sample_requested", {
      route: `/marketplace/${listing.slug}/sample`,
      sample_id: sample.id,
      sample_request_id: request.id,
      listing_id: listing.id,
      status: request.request_status,
      payment_status: request.payment_status,
      price: amount,
      user_role: "buyer",
    }),
    auditSample({
      actor: "consumer",
      action: "sample_request.created",
      objectTable: "sample_requests",
      objectId: request.id,
      buyerAccountId: account.id,
      listingId: uuidOrNull(listing.id),
      leadProfileId: listing.leadProfileId,
      details: {
        sample_id: sample.id,
        amount,
        payment_status: paymentStatus,
        request_status: requestStatus,
        raw_records_returned: false,
      },
    }),
  ]);

  if (amount <= 0 && requestStatus === "fulfilled") {
    await grantSampleEntitlement({ account, listing, sample, request, actor: "system" });
    return { ok: true, requestId: request.id, sampleId: sample.id, status: "fulfilled", paymentStatus: "not_required" };
  }

  if (amount <= 0) {
    return { ok: true, requestId: request.id, sampleId: sample.id, status: requestStatus, paymentStatus };
  }

  if (!stripeConfigured()) {
    await insertLeadFlowRow<LeadFlowPaymentRecord>("payments", {
      payment_provider: "stripe",
      buyer_account_id: account.id,
      listing_id: uuidOrNull(listing.id),
      sample_id: uuidOrNull(sample.id),
      sample_request_id: request.id,
      amount,
      currency: "usd",
      status: "manual_review",
      metadata: {
        todo: "Set STRIPE_SECRET_KEY and STRIPE_WEBHOOK_SECRET, then create Stripe Checkout sessions for paid samples.",
        sample_request_id: request.id,
      },
    }).catch(() => []);
    await patchLeadFlowRows<LeadFlowSampleRequest>("sample_requests", { id: `eq.${request.id}` }, { payment_status: "manual_review" }).catch(() => null);
    return {
      ok: true,
      requestId: request.id,
      sampleId: sample.id,
      status: requestStatus,
      paymentStatus: "manual_review",
      paymentTodo: "Stripe is not configured. The paid sample request was saved for admin review.",
    };
  }

  const checkout = await stripe().checkout.sessions.create({
    mode: "payment",
    customer_email: account.email,
    client_reference_id: account.auth_user_id || account.id,
    line_items: [
      {
        quantity: 1,
        price_data: {
          currency: "usd",
          unit_amount: Math.round(amount * 100),
          product_data: {
            name: `LeadFlow sample: ${sample.title}`.slice(0, 250),
            description: (sample.description || "Proof-backed lead signal sample.").slice(0, 500),
            metadata: {
              kind: "leadflow_paid_sample",
              sampleId: sample.id,
              listingSlug: listing.slug,
            },
          },
        },
      },
    ],
    success_url: `${siteUrl(input.origin)}/buyer/samples/${sample.id}?checkout=success&request=${request.id}`,
    cancel_url: `${siteUrl(input.origin)}/marketplace/${listing.slug}/sample?checkout=cancelled`,
    allow_promotion_codes: false,
    metadata: {
      kind: "leadflow_paid_sample",
      sampleRequestId: request.id,
      sampleId: sample.id,
      listingId: uuidOrNull(listing.id) || "",
      listingSlug: listing.slug,
      buyerAccountId: account.id,
      requiresAdminApproval: sample.requires_admin_approval ? "true" : "false",
    },
    payment_intent_data: {
      metadata: {
        kind: "leadflow_paid_sample",
        sampleRequestId: request.id,
        sampleId: sample.id,
        listingSlug: listing.slug,
        buyerAccountId: account.id,
      },
    },
  });

  await Promise.all([
    patchLeadFlowRows<LeadFlowSampleRequest>("sample_requests", { id: `eq.${request.id}` }, {
      payment_session_id: checkout.id,
      payment_status: "pending",
    }).catch(() => null),
    insertLeadFlowRow<LeadFlowPaymentRecord>("payments", {
      payment_provider: "stripe",
      buyer_account_id: account.id,
      listing_id: uuidOrNull(listing.id),
      sample_id: uuidOrNull(sample.id),
      sample_request_id: request.id,
      amount,
      currency: "usd",
      status: "pending",
      payment_session_id: checkout.id,
      metadata: {
        checkout_url_created: true,
        sample_request_id: request.id,
      },
    }).catch(() => []),
    trackSampleEvent("sample_checkout_started", {
      route: `/marketplace/${listing.slug}/sample`,
      sample_id: sample.id,
      sample_request_id: request.id,
      listing_id: listing.id,
      price: amount,
      user_role: "buyer",
    }),
  ]);

  return {
    ok: true,
    requestId: request.id,
    sampleId: sample.id,
    status: "pending_payment",
    paymentStatus: "pending",
    checkoutUrl: checkout.url,
  };
}

export async function fulfillLeadFlowSampleCheckout(session: Stripe.Checkout.Session) {
  if (session.metadata?.kind !== "leadflow_paid_sample") return false;
  if (!hasLeadFlowDataApiConfig()) {
    console.warn("LeadFlow sample webhook skipped: Supabase Data API not configured.");
    return true;
  }

  const requestId = session.metadata.sampleRequestId;
  if (!requestId) return true;
  const requests = await selectLeadFlowRows<LeadFlowSampleRequest>("sample_requests", {
    select: sampleRequestSelect,
    id: `eq.${requestId}`,
    deleted_at: "is.null",
    limit: 1,
  }).catch(() => []);
  const request = requests[0];
  if (!request) return true;

  const sample = request.sample_id ? await loadSample(request.sample_id) : null;
  const listing = request.listing_id ? await loadListing(request.listing_id).catch(() => null) : null;
  const buyerRows = await selectLeadFlowRows<BuyerAccount>("buyer_accounts", {
    select: "id,auth_user_id,name,email,phone,company_name,website,buyer_type,industry,location_served,budget_range,intended_use,account_status,approved_access_level,communication_preference,consent_status,created_at,updated_at,last_login_at",
    id: `eq.${request.buyer_account_id}`,
    deleted_at: "is.null",
    limit: 1,
  }).catch(() => []);
  const account = buyerRows[0] || null;
  const paymentIntentId = typeof session.payment_intent === "string" ? session.payment_intent : session.payment_intent?.id || null;
  const amount = typeof session.amount_total === "number" ? session.amount_total / 100 : numberValue(request.amount, 0);
  const paidAt = new Date((session.created || Math.floor(Date.now() / 1000)) * 1000).toISOString();

  const shouldAutoGrant = Boolean(sample && listing && account && !sample.requires_admin_approval && !buyerAccountIsRestricted(account));
  const nextStatus: SampleRequestStatus = shouldAutoGrant ? "fulfilled" : "paid_pending_review";
  const expiresAt = shouldAutoGrant && listing ? expiresIn(listing.expirationDays) : request.expires_at;

  await Promise.all([
    patchLeadFlowRows<LeadFlowSampleRequest>("sample_requests", { id: `eq.${request.id}` }, {
      request_status: nextStatus,
      payment_status: "paid",
      payment_session_id: session.id,
      payment_intent_id: paymentIntentId,
      expires_at: expiresAt,
      metadata: {
        ...(request.metadata || {}),
        stripe_payment_confirmed: true,
        auto_granted: shouldAutoGrant,
      },
    }).catch(() => null),
    insertLeadFlowRow<LeadFlowPaymentRecord>("payments", {
      payment_provider: "stripe",
      buyer_account_id: request.buyer_account_id,
      listing_id: request.listing_id,
      sample_id: request.sample_id,
      sample_request_id: request.id,
      amount,
      currency: session.currency || request.currency || "usd",
      status: "paid",
      payment_session_id: session.id,
      payment_intent_id: paymentIntentId,
      paid_at: paidAt,
      metadata: {
        kind: "leadflow_paid_sample",
        checkout_session_completed: true,
      },
    }).catch(() => []),
    trackSampleEvent("sample_payment_completed", {
      route: "/api/webhooks/stripe",
      sample_id: request.sample_id || "",
      sample_request_id: request.id,
      status: nextStatus,
      user_role: "webhook",
    }),
  ]);

  if (shouldAutoGrant && sample && listing && account) {
    await grantSampleEntitlement({ account, listing, sample, request: { ...request, request_status: nextStatus, payment_status: "paid", expires_at: expiresAt }, actor: "webhook" });
    await trackSampleEvent("sample_access_granted", {
      route: "/api/webhooks/stripe",
      sample_id: sample.id,
      sample_request_id: request.id,
      listing_id: listing.id,
      status: "fulfilled",
      user_role: "webhook",
    });
  }

  await auditSample({
    actor: "webhook",
    action: "sample_payment.completed",
    objectTable: "sample_requests",
    objectId: request.id,
    buyerAccountId: request.buyer_account_id,
    listingId: request.listing_id,
    details: {
      sample_id: request.sample_id,
      payment_session_id: session.id,
      payment_intent_id: paymentIntentId,
      auto_granted: shouldAutoGrant,
    },
  });

  return true;
}

export async function adminUpdateSampleRequest(input: {
  requestId: string;
  action: "approve" | "deny" | "revoke" | "extend";
  adminUserId?: string | null;
  adminNotes?: string | null;
}) {
  if (!hasLeadFlowDataApiConfig()) return { ok: false as const, status: 503, error: "LeadFlow Data API is not configured." };
  const rows = await selectLeadFlowRows<LeadFlowSampleRequest>("sample_requests", {
    select: sampleRequestSelect,
    id: `eq.${input.requestId}`,
    deleted_at: "is.null",
    limit: 1,
  });
  const request = rows[0];
  if (!request) return { ok: false as const, status: 404, error: "Sample request not found." };
  const sample = request.sample_id ? await loadSample(request.sample_id) : null;
  const listing = request.listing_id ? await loadListing(request.listing_id) : null;
  const buyerRows = await selectLeadFlowRows<BuyerAccount>("buyer_accounts", {
    select: "id,auth_user_id,name,email,phone,company_name,website,buyer_type,industry,location_served,budget_range,intended_use,account_status,approved_access_level,communication_preference,consent_status,created_at,updated_at,last_login_at",
    id: `eq.${request.buyer_account_id}`,
    deleted_at: "is.null",
    limit: 1,
  }).catch(() => []);
  const account = buyerRows[0] || null;

  let patch: Record<string, unknown> = {
    reviewed_by: uuidOrNull(input.adminUserId),
    reviewed_at: nowIso(),
    admin_notes: input.adminNotes || request.admin_notes,
  };
  if (input.action === "approve") {
    if (!sample || !listing || !account) return { ok: false as const, status: 409, error: "Sample, listing, or buyer account is missing." };
    if (buyerAccountIsRestricted(account)) return { ok: false as const, status: 403, error: "Restricted buyer cannot receive sample access." };
    patch = { ...patch, request_status: "fulfilled", payment_status: request.payment_status === "pending" ? "manual_review" : request.payment_status, expires_at: expiresIn(listing.expirationDays) };
  }
  if (input.action === "deny") patch = { ...patch, request_status: "denied" };
  if (input.action === "revoke") patch = { ...patch, request_status: "revoked" };
  if (input.action === "extend") {
    if (!listing) return { ok: false as const, status: 409, error: "Listing is missing." };
    patch = { ...patch, request_status: request.request_status, expires_at: expiresIn(listing.expirationDays) };
  }

  const updated = await patchLeadFlowRows<LeadFlowSampleRequest>("sample_requests", { id: `eq.${request.id}` }, patch);
  const finalRequest = updated[0] || request;
  if (input.action === "approve" && sample && listing && account) {
    await grantSampleEntitlement({ account, listing, sample, request: finalRequest, actor: "admin" });
    await trackSampleEvent("sample_access_granted", {
      route: "/dashboard/samples",
      sample_id: sample.id,
      sample_request_id: request.id,
      status: "fulfilled",
      user_role: "admin",
    });
  }
  await auditSample({
    actor: "admin",
    actorUserId: input.adminUserId,
    action: `sample_request.${input.action}`,
    objectTable: "sample_requests",
    objectId: request.id,
    buyerAccountId: request.buyer_account_id,
    listingId: request.listing_id,
    details: { sample_id: request.sample_id, admin_notes_added: Boolean(input.adminNotes) },
  });
  return { ok: true as const, request: finalRequest };
}

export async function adminCreateOrUpdateSample(input: {
  action: "create_sample" | "update_sample";
  sampleId?: string | null;
  listingId: string;
  sampleType: SampleAccessType;
  title: string;
  description?: string | null;
  price: number;
  recordCount: number;
  fieldGroups: SampleFieldGroup[];
  status: string;
  contactFieldsAllowed: boolean;
  requiresAdminApproval: boolean;
  allowedUse: string;
  restrictedUse: string;
  adminUserId?: string | null;
}) {
  if (!hasLeadFlowDataApiConfig()) return { ok: false as const, status: 503, error: "LeadFlow Data API is not configured." };
  const listing = await loadListing(input.listingId);
  if (!uuidOrNull(listing.id)) return { ok: false as const, status: 404, error: "Listing must exist in Supabase before a sample can be created." };
  const groups = normalizeSampleFieldGroups(input.fieldGroups, input.contactFieldsAllowed && listing.contactFieldsAllowed);
  const patch = {
    listing_id: listing.id,
    sample_type: input.sampleType,
    title: input.title,
    description: input.description || null,
    price: Math.max(0, input.price),
    record_count: Math.max(1, Math.min(500, Math.round(input.recordCount))),
    field_groups: groups,
    status: input.status,
    contact_fields_allowed: Boolean(input.contactFieldsAllowed && listing.contactFieldsAllowed),
    requires_admin_approval: input.requiresAdminApproval,
    allowed_use: input.allowedUse,
    restricted_use: input.restrictedUse,
    metadata: {
      managed_from: "/dashboard/samples",
      listing_slug: listing.slug,
      contact_fields_blocked_by_listing: Boolean(input.contactFieldsAllowed && !listing.contactFieldsAllowed),
    },
  };

  const rows =
    input.action === "update_sample" && input.sampleId
      ? await patchLeadFlowRows<LeadFlowSampleRecord>("samples", { id: `eq.${input.sampleId}` }, patch)
      : await insertLeadFlowRow<LeadFlowSampleRecord>("samples", patch);
  const saved = rows[0];
  if (!saved) return { ok: false as const, status: 500, error: "Sample could not be saved." };
  const sample = normalizeSample(saved, listing);

  await patchLeadFlowRows("marketplace_listings", { id: `eq.${listing.id}` }, {
    sample_enabled: sample.status === "active",
    sample_price: numberValue(sample.price, 0),
    sample_record_count: sample.record_count,
    sample_field_groups: sample.field_groups,
    requires_admin_approval: sample.requires_admin_approval,
    contact_fields_allowed: sample.contact_fields_allowed,
    sample_expiration_days: listing.expirationDays,
  }).catch(() => null);

  const existingItems = await selectLeadFlowRows<{ id: string }>("sample_items", {
    select: "id",
    sample_id: `eq.${sample.id}`,
    limit: 1,
  }).catch(() => []);
  if (!existingItems.length) {
    const profile = await loadProfileForSample(listing);
    if (profile && profileIsSampleSafe(profile)) {
      const item = itemViewFromProfile(profile, sample, sample.field_groups);
      await insertLeadFlowRow("sample_items", {
        sample_id: sample.id,
        lead_profile_id: uuidOrNull(profile.id),
        profile_slug: profile.slug || listing.slug,
        redacted_record: {
          profile_title: item.title,
          category: item.category,
          vertical: item.vertical,
          summary: item.summary,
          buyer_use_case: item.buyerUseCase,
          recommended_next_action: item.recommendedNextAction,
          score: item.score,
          confidence: item.confidence,
          source_proof_status: item.sourceProofStatus,
          allowed_use: item.allowedUse,
          restricted_use: item.restrictedUse,
        },
        included_field_groups: item.fieldsIncluded,
        source_proof_summary: {
          source_url: item.sourceProofLinks[0]?.href || listing.sourceUrl,
          source_title: item.sourceProofLinks[0]?.label || item.title,
          source_snippet: item.sourceProofLinks[0]?.description || "Source proof summary redacted for sample.",
          proof_status: item.sourceProofStatus,
        },
        score: item.score,
        confidence: item.confidence,
      }).catch(() => null);
    }
  }

  await auditSample({
    actor: "admin",
    actorUserId: input.adminUserId,
    action: `sample.${input.action === "create_sample" ? "created" : "updated"}`,
    objectTable: "samples",
    objectId: sample.id,
    listingId: listing.id,
    leadProfileId: listing.leadProfileId,
    details: {
      sample_type: sample.sample_type,
      price: numberValue(sample.price, 0),
      field_groups: sample.field_groups,
      contact_fields_allowed: sample.contact_fields_allowed,
      requires_admin_approval: sample.requires_admin_approval,
    },
  });

  return { ok: true as const, sample };
}

export async function buildSampleDownload(sampleId: string) {
  const viewer = await getBuyerSampleViewerData(sampleId);
  if (!viewer.authenticated) return { ok: false as const, status: 401, error: "Buyer login required." };
  if (!viewer.allowed || !viewer.sample || !viewer.request) {
    return { ok: false as const, status: 403, error: viewer.reason || "Sample access is not approved." };
  }
  const rows = viewer.items.map((item) => {
    const row: Record<string, unknown> = {
      profile_title: item.title,
      category: item.category,
      vertical: item.vertical,
      summary: item.summary,
      score: item.score,
      confidence: item.confidence,
      buyer_use_case: item.buyerUseCase,
      recommended_next_action: item.recommendedNextAction,
      source_proof_status: item.sourceProofStatus,
      source_url: item.sourceProofLinks[0]?.href || "",
      allowed_use: item.allowedUse,
      restricted_use: item.restrictedUse,
      redacted: item.redacted,
    };
    if (item.contact && viewer.sample?.contact_fields_allowed) {
      row.website = item.contact.website || "";
      row.public_contact_page = item.contact.publicContactPage || "";
    }
    return row;
  });
  await Promise.all([
    trackSampleEvent("sample_downloaded", {
      route: `/buyer/samples/${viewer.sample.id}`,
      sample_id: viewer.sample.id,
      sample_request_id: viewer.request.id,
      user_role: "buyer",
    }),
    auditSample({
      actor: "consumer",
      action: "sample.downloaded",
      objectTable: "samples",
      objectId: viewer.sample.id,
      buyerAccountId: viewer.account?.id,
      listingId: viewer.sample.listing_id,
      details: {
        sample_request_id: viewer.request.id,
        row_count: rows.length,
        field_groups: viewer.sample.field_groups,
      },
    }),
  ]);
  return {
    ok: true as const,
    body: exportRowsToCsv(rows),
    contentType: "text/csv; charset=utf-8",
    filename: `leadflow-sample-${viewer.sample.id.slice(0, 8)}.csv`,
  };
}
