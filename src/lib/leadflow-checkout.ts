import "server-only";

import type Stripe from "stripe";
import { leadProfileDetails } from "@/lib/lead-profile-detail";
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
import { stripe } from "@/lib/stripe";

export const CHECKOUT_TYPES = [
  "sample",
  "listing_access",
  "exclusive_deposit",
  "custom_signal_request",
  "subscription_placeholder",
] as const;

export type LeadFlowCheckoutType = (typeof CHECKOUT_TYPES)[number];
export type LeadFlowOrderStatus =
  | "draft"
  | "pending_payment"
  | "paid"
  | "failed"
  | "canceled"
  | "refunded"
  | "fulfilled"
  | "manual_review";

type CheckoutListingRow = {
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
  score: number | string | null;
  confidence: number | string | null;
  sample_enabled?: boolean | null;
  sample_price?: number | string | null;
  sample_record_count?: number | string | null;
  sample_field_groups?: string[] | null;
  requires_admin_approval?: boolean | null;
  contact_fields_allowed?: boolean | null;
  sample_expiration_days?: number | string | null;
  access_model?: string | null;
  max_buyers?: number | string | null;
  current_buyer_count?: number | string | null;
  full_access_price?: number | string | null;
  exclusive_deposit_amount?: number | string | null;
  checkout_enabled?: boolean | null;
  auto_fulfill_enabled?: boolean | null;
  checkout_requires_admin_approval?: boolean | null;
  contact_fields_release_approved?: boolean | null;
  checkout_notes?: string | null;
  updated_at: string;
};

type CheckoutSampleRow = {
  id: string;
  listing_id: string | null;
  sample_type: string;
  title: string;
  description: string | null;
  price: number | string;
  record_count: number | string;
  field_groups: string[] | null;
  status: string;
  contact_fields_allowed: boolean;
  requires_admin_approval: boolean;
  allowed_use: string;
  restricted_use: string;
  expires_at: string | null;
  metadata?: Record<string, unknown>;
};

export type LeadFlowOrderRecord = {
  id: string;
  buyer_account_id: string | null;
  order_type: LeadFlowCheckoutType;
  listing_id: string | null;
  listing_slug: string | null;
  sample_id: string | null;
  sample_request_id?: string | null;
  exclusive_request_id: string | null;
  amount: number | string;
  currency: string;
  status: LeadFlowOrderStatus;
  payment_provider: string;
  payment_session_id: string | null;
  payment_intent_id: string | null;
  receipt_url?: string | null;
  field_groups?: string[] | null;
  access_level: string;
  requires_manual_review: boolean;
  auto_fulfillable: boolean;
  allowed_use_confirmed: boolean;
  reason: string | null;
  created_at: string;
  updated_at: string;
  paid_at: string | null;
  canceled_at: string | null;
  fulfilled_at?: string | null;
  expires_at?: string | null;
  metadata?: Record<string, unknown>;
};

type PaymentRecord = {
  id: string;
  payment_provider: string;
  buyer_account_id: string | null;
  listing_id: string | null;
  sample_id: string | null;
  sample_request_id?: string | null;
  order_id?: string | null;
  order_type?: string | null;
  amount: number | string;
  currency: string;
  status: string;
  payment_session_id: string | null;
  payment_intent_id: string | null;
  receipt_url?: string | null;
  failure_code?: string | null;
  failure_message?: string | null;
  metadata?: Record<string, unknown>;
  created_at: string;
  updated_at: string;
  paid_at: string | null;
  refunded_at: string | null;
};

type BuyerEntitlementRow = {
  id: string;
  buyer_account_id: string;
  listing_id: string | null;
  listing_slug: string | null;
  lead_profile_id: string | null;
  access_level: string;
  status: string;
  starts_at: string;
  expires_at: string | null;
};

export type CheckoutProduct = {
  id: string;
  type: LeadFlowCheckoutType;
  title: string;
  description: string;
  amount: number;
  currency: "usd";
  checkoutEnabled: boolean;
  stripeConfigured: boolean;
  requiresManualReview: boolean;
  autoFulfillable: boolean;
  accessLevel: "sample" | "summary" | "full_profile" | "exclusive" | "aggregate";
  fieldGroups: string[];
  listingId: string | null;
  listingSlug: string | null;
  leadProfileId: string | null;
  sampleId: string | null;
  exclusiveRequestId: string | null;
  status: string;
  reviewStatus: string;
  complianceStatus: string;
  accessModel: string;
  currentBuyerCount: number;
  maxBuyers: number | null;
  allowedUse: string;
  restrictedUse: string;
  buyerWarning: string;
  nextAction: string;
};

export type CheckoutPageData = {
  mode: "live" | "offline";
  product: CheckoutProduct;
  buyerData: BuyerPortalData;
  loadErrors: string[];
};

export type BuyerOrdersPageData =
  | Extract<BuyerPortalData, { authenticated: false }>
  | {
      authenticated: true;
      account: BuyerAccount | null;
      restricted: boolean;
      orders: Array<LeadFlowOrderRecord & { productTitle: string; productPath: string; accessStatus: string; nextAction: string }>;
      loadErrors: string[];
    };

export type AdminOrdersPageData = {
  mode: "live" | "offline";
  authorized: boolean;
  orders: Array<LeadFlowOrderRecord & { buyerName: string; buyerCompany: string; productTitle: string }>;
  payments: PaymentRecord[];
  stats: {
    totalOrders: number;
    pendingPayment: number;
    manualReview: number;
    paid: number;
    fulfilled: number;
    failed: number;
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
  "score",
  "confidence",
  "sample_enabled",
  "sample_price",
  "sample_record_count",
  "sample_field_groups",
  "requires_admin_approval",
  "contact_fields_allowed",
  "sample_expiration_days",
  "access_model",
  "max_buyers",
  "current_buyer_count",
  "full_access_price",
  "exclusive_deposit_amount",
  "checkout_enabled",
  "auto_fulfill_enabled",
  "checkout_requires_admin_approval",
  "contact_fields_release_approved",
  "checkout_notes",
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
  "expires_at",
  "metadata",
].join(",");

const orderSelect = [
  "id",
  "buyer_account_id",
  "order_type",
  "listing_id",
  "listing_slug",
  "sample_id",
  "sample_request_id",
  "exclusive_request_id",
  "amount",
  "currency",
  "status",
  "payment_provider",
  "payment_session_id",
  "payment_intent_id",
  "receipt_url",
  "field_groups",
  "access_level",
  "requires_manual_review",
  "auto_fulfillable",
  "allowed_use_confirmed",
  "reason",
  "created_at",
  "updated_at",
  "paid_at",
  "canceled_at",
  "fulfilled_at",
  "expires_at",
  "metadata",
].join(",");

const paymentSelect = [
  "id",
  "payment_provider",
  "buyer_account_id",
  "listing_id",
  "sample_id",
  "sample_request_id",
  "order_id",
  "order_type",
  "amount",
  "currency",
  "status",
  "payment_session_id",
  "payment_intent_id",
  "receipt_url",
  "failure_code",
  "failure_message",
  "metadata",
  "created_at",
  "updated_at",
  "paid_at",
  "refunded_at",
].join(",");

function nowIso() {
  return new Date().toISOString();
}

function expiresIn(days: number) {
  const date = new Date();
  date.setDate(date.getDate() + Math.max(1, Math.min(365, days)));
  return date.toISOString();
}

function uuidOrNull(value: string | null | undefined) {
  return value && /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{12}$/i.test(value) ? value : null;
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

function stripeConfigured() {
  return Boolean(process.env.STRIPE_SECRET_KEY);
}

function siteUrl(origin?: string | null) {
  return (origin || process.env.NEXT_PUBLIC_SITE_URL || "https://www.theleadflowpro.com").replace(/\/$/, "");
}

function fallbackListing(idOrSlug: string): CheckoutListingRow {
  const profile = leadProfileDetails.find((item) => item.id === idOrSlug) || leadProfileDetails[0];
  const priceMatch = profile.priceBand.match(/\$(\d+)/);
  const price = priceMatch ? Number(priceMatch[1]) : 149;
  return {
    id: profile.id,
    slug: profile.id,
    lead_profile_id: profile.id,
    title: profile.title,
    vertical: profile.vertical,
    category: profile.category,
    buyer_type: profile.bestBuyerType,
    source_type: profile.sourceType,
    listing_status: "sample_available",
    review_status: "approved",
    release_mode: profile.releaseMode,
    compliance_status: "source_reviewed",
    source_url: profile.sourceProofLinks[0]?.href || null,
    buyer_visible_summary: {
      summary: profile.summary,
      buyer_use_case: profile.buyerUseCase,
    },
    score: profile.leadScore,
    confidence: profile.confidence === "high" ? 0.9 : profile.confidence === "medium" ? 0.62 : 0.35,
    sample_enabled: true,
    sample_price: 49,
    sample_record_count: 5,
    sample_field_groups: ["public_profile", "source_proof", "compliance"],
    requires_admin_approval: true,
    contact_fields_allowed: false,
    sample_expiration_days: 7,
    access_model: profile.releaseMode.toLowerCase().includes("exclusive") ? "exclusive_listing" : "shared",
    max_buyers: null,
    current_buyer_count: 0,
    full_access_price: price,
    exclusive_deposit_amount: 497,
    checkout_enabled: true,
    auto_fulfill_enabled: false,
    checkout_requires_admin_approval: true,
    contact_fields_release_approved: false,
    checkout_notes: "Fallback preview. Connect Supabase migrations before live fulfillment.",
    updated_at: nowIso(),
  };
}

function fallbackSampleForListing(listing: CheckoutListingRow): CheckoutSampleRow {
  return {
    id: `${listing.slug || listing.id}-sample`,
    listing_id: uuidOrNull(listing.id),
    sample_type: numberValue(listing.sample_price, 49) > 0 ? "paid_sample" : "free_redacted",
    title: `${listing.title} Sample`,
    description: "Small proof-backed sample for review before full access.",
    price: numberValue(listing.sample_price, 49),
    record_count: integerValue(listing.sample_record_count, 5),
    field_groups: listing.sample_field_groups || ["public_profile", "source_proof", "compliance"],
    status: "active",
    contact_fields_allowed: Boolean(listing.contact_fields_allowed),
    requires_admin_approval: Boolean(listing.requires_admin_approval ?? true),
    allowed_use: "Review source proof, scoring context, and buyer-use fit before requesting full access.",
    restricted_use: "Do not use as a blind list, suppressed outreach list, raw identity dossier, or guaranteed sales source.",
    expires_at: null,
    metadata: { fallback: true, listing_slug: listing.slug || listing.id },
  };
}

async function loadListing(idOrSlug: string): Promise<CheckoutListingRow> {
  if (!hasLeadFlowDataApiConfig()) return fallbackListing(idOrSlug);
  const byId = uuidOrNull(idOrSlug)
    ? await selectLeadFlowRows<CheckoutListingRow>("marketplace_listings", {
        select: listingSelect,
        id: `eq.${idOrSlug}`,
        deleted_at: "is.null",
        limit: 1,
      }).catch(() => [])
    : [];
  const row = byId[0] || (await selectLeadFlowRows<CheckoutListingRow>("marketplace_listings", {
    select: listingSelect,
    slug: `eq.${idOrSlug}`,
    deleted_at: "is.null",
    limit: 1,
  }).catch(() => []))[0];
  return row || fallbackListing(idOrSlug);
}

async function loadSample(idOrSlug: string): Promise<{ sample: CheckoutSampleRow; listing: CheckoutListingRow }> {
  if (!hasLeadFlowDataApiConfig()) {
    const listing = fallbackListing(idOrSlug);
    return { sample: fallbackSampleForListing(listing), listing };
  }

  const byId = uuidOrNull(idOrSlug)
    ? await selectLeadFlowRows<CheckoutSampleRow>("samples", {
        select: sampleSelect,
        id: `eq.${idOrSlug}`,
        status: "neq.revoked",
        limit: 1,
      }).catch(() => [])
    : [];
  const sample = byId[0];
  if (sample) {
    const listing = sample.listing_id ? await loadListing(sample.listing_id) : fallbackListing(textValue(sample.metadata?.listing_slug, idOrSlug));
    return { sample, listing };
  }

  const listing = await loadListing(idOrSlug);
  const sampleRows = uuidOrNull(listing.id)
    ? await selectLeadFlowRows<CheckoutSampleRow>("samples", {
        select: sampleSelect,
        listing_id: `eq.${listing.id}`,
        status: "neq.revoked",
        order: "created_at.desc",
        limit: 1,
      }).catch(() => [])
    : [];
  return { sample: sampleRows[0] || fallbackSampleForListing(listing), listing };
}

function productFromListing(type: LeadFlowCheckoutType, id: string, listing: CheckoutListingRow, sample?: CheckoutSampleRow): CheckoutProduct {
  const summary = listing.buyer_visible_summary || {};
  const listingSlug = listing.slug || listing.id;
  const accessModel = textValue(listing.access_model, "shared");
  const samplePrice = numberValue(sample?.price, numberValue(listing.sample_price, 49));
  const fullPrice = numberValue(listing.full_access_price, numberValue((listing as { price_cents?: unknown }).price_cents, 0) / 100 || 149);
  const exclusiveDeposit = numberValue(listing.exclusive_deposit_amount, 497);
  const baseFieldGroups = sample?.field_groups || listing.sample_field_groups || ["public_profile", "source_proof", "compliance"];
  const contactAllowed = type === "sample" ? Boolean(sample?.contact_fields_allowed && listing.contact_fields_allowed) : Boolean(listing.contact_fields_release_approved);
  const fieldGroups = Array.from(new Set(baseFieldGroups.filter((group) => group !== "contact" || contactAllowed)));
  const checkoutEnabled = Boolean(listing.checkout_enabled ?? true);
  const listingStatus = listing.listing_status || "review";
  const complianceStatus = listing.compliance_status || "review_required";
  const reviewStatus = listing.review_status || "pending";

  const common = {
    id,
    type,
    currency: "usd" as const,
    checkoutEnabled,
    stripeConfigured: stripeConfigured(),
    listingId: uuidOrNull(listing.id),
    listingSlug,
    leadProfileId: uuidOrNull(listing.lead_profile_id || undefined),
    sampleId: sample ? uuidOrNull(sample.id) : null,
    exclusiveRequestId: null,
    status: listingStatus,
    reviewStatus,
    complianceStatus,
    accessModel,
    currentBuyerCount: integerValue(listing.current_buyer_count, 0),
    maxBuyers: listing.max_buyers === null || listing.max_buyers === undefined ? null : integerValue(listing.max_buyers, 0),
    fieldGroups,
    allowedUse: textValue(summary.allowed_use, "Use this only for the approved buyer use case tied to your order and entitlement."),
    restrictedUse: textValue(summary.restricted_use, "Do not resell raw data, contact suppressed records, use outdated data, or treat signals as guaranteed results."),
    buyerWarning: textValue(listing.checkout_notes, "Access is reviewed against source proof, suppression, availability, buyer fit, and compliance status before release."),
  };

  if (type === "sample") {
    const requiresReview = Boolean(sample?.requires_admin_approval ?? listing.requires_admin_approval ?? true);
    return {
      ...common,
      title: sample?.title || `${listing.title} Sample`,
      description: sample?.description || "Limited reviewed sample access with approved field groups only.",
      amount: samplePrice,
      requiresManualReview: requiresReview,
      autoFulfillable: !requiresReview && samplePrice <= 250,
      accessLevel: "sample",
      allowedUse: sample?.allowed_use || common.allowedUse,
      restrictedUse: sample?.restricted_use || common.restrictedUse,
      nextAction: samplePrice > 0 ? "Pay for reviewed sample access" : "Request reviewed sample access",
    };
  }

  if (type === "exclusive_deposit") {
    return {
      ...common,
      title: `${listing.title} Exclusive Access Deposit`,
      description: "Deposit for manual review of exclusive access. Payment does not automatically grant exclusive rights.",
      amount: exclusiveDeposit,
      requiresManualReview: true,
      autoFulfillable: false,
      accessLevel: "exclusive",
      nextAction: "Submit deposit for manual exclusive review",
    };
  }

  return {
    ...common,
    title: `${listing.title} Access`,
    description: textValue(summary.summary, "Reviewed source-backed marketplace access for this lead signal product."),
    amount: fullPrice,
    requiresManualReview: Boolean(listing.checkout_requires_admin_approval ?? true),
    autoFulfillable: Boolean(listing.auto_fulfill_enabled) && fullPrice < 1000,
    accessLevel: contactAllowed ? "full_profile" : "summary",
    nextAction: "Start reviewed checkout",
  };
}

function customProduct(type: LeadFlowCheckoutType, id: string): CheckoutProduct {
  const subscription = type === "subscription_placeholder";
  return {
    id,
    type,
    title: subscription ? "LeadFlow subscription placeholder" : "Custom signal sourcing deposit",
    description: subscription
      ? "Subscription access will be reviewed before release. This placeholder keeps the product path ready without billing automatically."
      : "Deposit for a custom source-backed signal pack review. Sourcing is reviewed before any data product is built.",
    amount: subscription ? 0 : 497,
    currency: "usd",
    checkoutEnabled: !subscription,
    stripeConfigured: stripeConfigured(),
    requiresManualReview: true,
    autoFulfillable: false,
    accessLevel: "summary",
    fieldGroups: ["public_profile", "source_proof", "compliance"],
    listingId: null,
    listingSlug: null,
    leadProfileId: null,
    sampleId: null,
    exclusiveRequestId: null,
    status: subscription ? "placeholder" : "available",
    reviewStatus: "manual_review",
    complianceStatus: "review_required",
    accessModel: "review_gated",
    currentBuyerCount: 0,
    maxBuyers: null,
    allowedUse: "Use this request only for reviewed custom sourcing or planning.",
    restrictedUse: "Do not request hacked, leaked, private, suppressed, minors, protected-trait, or sensitive data.",
    buyerWarning: subscription
      ? "Subscription checkout is not live yet. Admin review is required before recurring billing is enabled."
      : "Custom sourcing is review-gated. We may decline or narrow the request if source rights, suppression, or compliance do not clear.",
    nextAction: subscription ? "Request subscription review" : "Start custom sourcing deposit",
  };
}

export async function resolveCheckoutProduct(type: LeadFlowCheckoutType, id: string): Promise<CheckoutProduct> {
  if (type === "custom_signal_request" || type === "subscription_placeholder") return customProduct(type, id);
  if (type === "sample") {
    const { sample, listing } = await loadSample(id);
    return productFromListing(type, id, listing, sample);
  }
  const listing = await loadListing(id);
  return productFromListing(type, id, listing);
}

export async function getCheckoutPageData(type: LeadFlowCheckoutType, id: string): Promise<CheckoutPageData> {
  const buyerData = await getBuyerPortalData();
  const loadErrors: string[] = [];
  let mode: "live" | "offline" = hasLeadFlowDataApiConfig() ? "live" : "offline";
  let product: CheckoutProduct;
  try {
    product = await resolveCheckoutProduct(type, id);
  } catch (error) {
    loadErrors.push(error instanceof Error ? error.message : "Checkout product load failed.");
    mode = "offline";
    product = customProduct(type, id);
  }
  return { mode, product, buyerData, loadErrors };
}

function profileSafeForCheckout(product: CheckoutProduct) {
  if (["suppressed", "prohibited"].includes(product.complianceStatus)) return false;
  if (["suppressed", "archived", "sold_exclusive"].includes(product.status)) return false;
  if (product.accessModel === "internal_only") return false;
  if (product.type !== "exclusive_deposit" && product.status === "reserved") return false;
  if (product.type === "listing_access" && product.accessModel === "exclusive_listing" && product.currentBuyerCount > 0) return false;
  if (product.type === "listing_access" && product.accessModel === "limited_seats" && product.maxBuyers !== null && product.currentBuyerCount >= product.maxBuyers) return false;
  return true;
}

function accountApprovedForInstantAccess(account: BuyerAccount) {
  return ["approved_basic", "approved_partner", "approved_premium"].includes(account.account_status);
}

function manualReviewReason(product: CheckoutProduct, account: BuyerAccount) {
  const reasons: string[] = [];
  if (product.requiresManualReview) reasons.push("product_requires_admin_review");
  if (!accountApprovedForInstantAccess(account)) reasons.push("buyer_account_not_approved");
  if (product.amount >= 1000) reasons.push("high_value_order");
  if (product.type === "exclusive_deposit") reasons.push("exclusive_access_manual_review");
  if (product.type === "custom_signal_request") reasons.push("custom_signal_request_manual_review");
  if (product.type === "subscription_placeholder") reasons.push("subscription_placeholder_not_live");
  if (/civic|political/i.test(`${product.title} ${product.description} ${product.complianceStatus}`)) reasons.push("civic_or_political_review_required");
  if (product.fieldGroups.includes("contact")) reasons.push("contact_fields_requested");
  return reasons;
}

async function trackCheckoutEvent(eventName: string, properties: Record<string, unknown>) {
  if (!hasLeadFlowDataApiConfig()) return;
  const safeProperties = sanitizeLeadFlowEventProperties(properties);
  const route = typeof safeProperties.route === "string" ? safeProperties.route : "/checkout";
  await insertLeadFlowRow("events", {
    event_name: eventName,
    event_type: "checkout",
    tool_slug: "leadflow_checkout",
    route,
    source_path: route,
    user_role: typeof safeProperties.user_role === "string" ? safeProperties.user_role : "system",
    properties: safeProperties,
  }).catch(() => null);
}

async function auditCheckout(input: {
  actor: "buyer" | "admin" | "webhook" | "system";
  actorUserId?: string | null;
  action: string;
  objectTable: "orders" | "payments" | "buyer_entitlements";
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

async function ensureSampleRequest(input: {
  product: CheckoutProduct;
  account: BuyerAccount;
  intendedUse: string;
  orderStatus: LeadFlowOrderStatus;
}) {
  if (input.product.type !== "sample" || !input.product.sampleId) return null;
  const existing = await selectLeadFlowRows<{ id: string }>("sample_requests", {
    select: "id",
    buyer_account_id: `eq.${input.account.id}`,
    sample_id: `eq.${input.product.sampleId}`,
    payment_status: "in.(pending,manual_review,paid)",
    deleted_at: "is.null",
    order: "created_at.desc",
    limit: 1,
  }).catch(() => []);
  if (existing[0]?.id) return existing[0].id;

  const inserted = await insertLeadFlowRow<{ id: string }>("sample_requests", {
    buyer_account_id: input.account.id,
    listing_id: input.product.listingId,
    sample_id: input.product.sampleId,
    request_status: input.product.amount > 0 ? "pending_payment" : input.product.requiresManualReview ? "pending_review" : "fulfilled",
    payment_status: input.product.amount > 0 ? (input.orderStatus === "manual_review" ? "manual_review" : "pending") : "not_required",
    intended_use: input.intendedUse,
    amount: input.product.amount,
    currency: input.product.currency,
    payment_provider: input.product.amount > 0 ? "stripe" : "none",
    metadata: {
      created_from: "checkout_order",
      listing_slug: input.product.listingSlug,
      allowed_use_confirmed: true,
      field_groups: input.product.fieldGroups,
    },
  });
  return inserted[0]?.id || null;
}

async function grantOrderEntitlement(input: {
  order: LeadFlowOrderRecord;
  actor: "admin" | "webhook" | "system";
  actorUserId?: string | null;
}) {
  if (!hasLeadFlowDataApiConfig() || !input.order.buyer_account_id) return null;
  const listingId = uuidOrNull(input.order.listing_id || undefined);
  const listingSlug = input.order.listing_slug || input.order.metadata?.listing_slug as string | null | undefined;
  const accessLevel = input.order.access_level || (input.order.order_type === "sample" ? "sample" : "summary");
  const existing = await selectLeadFlowRows<BuyerEntitlementRow>("buyer_entitlements", {
    select: "id,buyer_account_id,listing_id,listing_slug,lead_profile_id,access_level,status,starts_at,expires_at",
    buyer_account_id: `eq.${input.order.buyer_account_id}`,
    listing_id: listingId ? `eq.${listingId}` : undefined,
    listing_slug: listingSlug ? `eq.${listingSlug}` : undefined,
    access_level: `eq.${accessLevel}`,
    status: "eq.active",
    limit: 1,
  }).catch(() => []);
  if (existing[0]?.id) return existing[0].id;

  const expiresAt = input.order.order_type === "sample" ? expiresIn(7) : input.order.order_type === "exclusive_deposit" ? null : expiresIn(365);
  const inserted = await insertLeadFlowRow<{ id: string }>("buyer_entitlements", {
    buyer_account_id: input.order.buyer_account_id,
    listing_id: listingId,
    listing_slug: listingSlug || null,
    lead_profile_id: uuidOrNull((input.order.metadata?.lead_profile_id as string | undefined) || undefined),
    access_level: accessLevel,
    starts_at: nowIso(),
    expires_at: expiresAt,
    status: "active",
    created_by: uuidOrNull(input.actorUserId),
    exclusive_request_id: uuidOrNull(input.order.exclusive_request_id || undefined),
    access_model: input.order.metadata?.access_model || null,
    metadata: {
      source: "checkout_order",
      order_id: input.order.id,
      order_type: input.order.order_type,
      field_groups: input.order.field_groups || [],
      contact_fields_allowed: (input.order.field_groups || []).includes("contact"),
    },
  });
  const entitlementId = inserted[0]?.id || null;
  await auditCheckout({
    actor: input.actor,
    actorUserId: input.actorUserId,
    action: "entitlement.granted_after_payment",
    objectTable: "buyer_entitlements",
    objectId: entitlementId,
    buyerAccountId: input.order.buyer_account_id,
    listingId,
    details: { order_id: input.order.id, access_level: accessLevel },
  });
  await trackCheckoutEvent("entitlement_granted_after_payment", {
    route: "/api/webhooks/stripe",
    order_id: input.order.id,
    listing_id: listingId || "",
    status: "active",
    user_role: input.actor,
  });
  return entitlementId;
}

export type CreateCheckoutOrderResult =
  | {
      ok: true;
      order: LeadFlowOrderRecord;
      checkoutUrl?: string | null;
      manualReview: boolean;
      paymentTodo?: string | null;
    }
  | {
      ok: false;
      status: number;
      error: string;
      reason: string;
    };

export async function createCheckoutOrder(input: {
  type: LeadFlowCheckoutType;
  id: string;
  intendedUse: string;
  confirmedAllowedUse: boolean;
  origin?: string | null;
}): Promise<CreateCheckoutOrderResult> {
  if (!input.confirmedAllowedUse) {
    return { ok: false, status: 400, error: "Confirm the allowed-use terms before checkout.", reason: "allowed_use_not_confirmed" };
  }
  if (!hasLeadFlowDataApiConfig()) {
    return { ok: false, status: 503, error: "LeadFlow Supabase Data API is not configured for checkout orders.", reason: "missing_data_api" };
  }

  const auth = await getBuyerAuthState();
  if (!auth.authenticated) {
    return { ok: false, status: auth.reason === "missing_config" ? 503 : 401, error: "Buyer login required before checkout.", reason: auth.reason };
  }
  const account = await ensureBuyerAccountForUser(auth.user);
  if (!account) return { ok: false, status: 403, error: "Buyer account could not be created.", reason: "buyer_account_missing" };
  if (buyerAccountIsRestricted(account)) {
    return { ok: false, status: 403, error: "This buyer account cannot start checkout.", reason: "buyer_restricted" };
  }

  const product = await resolveCheckoutProduct(input.type, input.id);
  if (!product.checkoutEnabled) {
    return { ok: false, status: 409, error: "Checkout is not enabled for this product.", reason: "checkout_disabled" };
  }
  if (!profileSafeForCheckout(product)) {
    await trackCheckoutEvent("checkout_failed", { route: `/checkout/${input.type}/${input.id}`, checkout_type: input.type, status: "blocked" });
    return { ok: false, status: 409, error: "Checkout is blocked by review, suppression, exclusivity, or availability rules.", reason: "product_blocked" };
  }

  const reviewReasons = manualReviewReason(product, account);
  const requiresManualReview = reviewReasons.length > 0;
  const autoFulfillable = Boolean(product.autoFulfillable && !requiresManualReview && product.type !== "exclusive_deposit");
  const amount = Math.max(0, product.amount);
  const initialStatus: LeadFlowOrderStatus = amount > 0 ? (stripeConfigured() ? "pending_payment" : "manual_review") : requiresManualReview ? "manual_review" : autoFulfillable ? "fulfilled" : "manual_review";
  const sampleRequestId = await ensureSampleRequest({ product, account, intendedUse: input.intendedUse, orderStatus: initialStatus });
  const orderRows = await insertLeadFlowRow<LeadFlowOrderRecord>("orders", {
    buyer_account_id: account.id,
    order_type: product.type,
    listing_id: product.listingId,
    listing_slug: product.listingSlug,
    sample_id: product.sampleId,
    sample_request_id: sampleRequestId,
    exclusive_request_id: product.exclusiveRequestId,
    amount,
    currency: product.currency,
    status: initialStatus,
    payment_provider: amount > 0 ? "stripe" : "none",
    field_groups: product.fieldGroups,
    access_level: product.accessLevel,
    requires_manual_review: requiresManualReview,
    auto_fulfillable: autoFulfillable,
    allowed_use_confirmed: true,
    reason: reviewReasons.join(",") || null,
    created_by: uuidOrNull(account.auth_user_id),
    fulfilled_at: initialStatus === "fulfilled" ? nowIso() : null,
    metadata: {
      product_title: product.title,
      product_id: input.id,
      access_model: product.accessModel,
      lead_profile_id: product.leadProfileId,
      intended_use_summary: input.intendedUse.slice(0, 180),
      manual_review_reasons: reviewReasons,
      raw_records_returned: false,
    },
  });
  const order = orderRows[0];
  if (!order) return { ok: false, status: 500, error: "Checkout order could not be created.", reason: "insert_failed" };

  await Promise.all([
    insertLeadFlowRow("order_items", {
      order_id: order.id,
      listing_id: product.listingId,
      sample_id: product.sampleId,
      lead_profile_id: product.leadProfileId,
      item_type: product.type === "sample" ? "sample" : product.type === "exclusive_deposit" ? "exclusive_deposit" : product.type === "custom_signal_request" ? "custom_signal_request" : "listing",
      included_fields: product.fieldGroups,
      quantity: 1,
      unit_amount: amount,
      metadata: { product_title: product.title, access_model: product.accessModel },
    }).catch(() => null),
    trackCheckoutEvent("order_created", {
      route: `/checkout/${input.type}/${input.id}`,
      checkout_type: input.type,
      order_id: order.id,
      listing_id: product.listingId || "",
      status: initialStatus,
      user_role: "buyer",
    }),
    auditCheckout({
      actor: "buyer",
      actorUserId: account.auth_user_id,
      action: "order.created",
      objectTable: "orders",
      objectId: order.id,
      buyerAccountId: account.id,
      listingId: product.listingId,
      leadProfileId: product.leadProfileId,
      details: { order_type: product.type, amount, status: initialStatus, manual_review_reasons: reviewReasons },
    }),
  ]);

  if (initialStatus === "fulfilled") {
    await grantOrderEntitlement({ order, actor: "system", actorUserId: account.auth_user_id });
    return { ok: true, order, manualReview: false };
  }

  if (amount <= 0 || !stripeConfigured()) {
    await insertLeadFlowRow<PaymentRecord>("payments", {
      payment_provider: amount > 0 ? "stripe" : "none",
      buyer_account_id: account.id,
      listing_id: product.listingId,
      sample_id: product.sampleId,
      sample_request_id: sampleRequestId,
      order_id: order.id,
      order_type: product.type,
      amount,
      currency: product.currency,
      status: amount > 0 ? "manual_review" : "manual_review",
      metadata: {
        todo: amount > 0 ? "Set STRIPE_SECRET_KEY and STRIPE_WEBHOOK_SECRET to enable Stripe Checkout for LeadFlow orders." : "No Stripe charge was created for this review-gated placeholder order.",
        order_id: order.id,
      },
    }).catch(() => []);
    await trackCheckoutEvent("order_manual_review_required", {
      route: `/checkout/${input.type}/${input.id}`,
      order_id: order.id,
      checkout_type: input.type,
      status: "manual_review",
      user_role: "buyer",
    });
    return {
      ok: true,
      order,
      manualReview: true,
      paymentTodo: amount > 0 ? "Stripe is not configured. The order was saved for manual review." : "This product is review-gated and no payment session was created.",
    };
  }

  const origin = siteUrl(input.origin);
  const checkout = await stripe().checkout.sessions.create({
    mode: "payment",
    customer_email: account.email,
    client_reference_id: account.auth_user_id || account.id,
    line_items: [
      {
        quantity: 1,
        price_data: {
          currency: product.currency,
          unit_amount: Math.round(amount * 100),
          product_data: {
            name: `LeadFlow: ${product.title}`.slice(0, 250),
            description: product.description.slice(0, 500),
            metadata: {
              kind: "leadflow_checkout_order",
              orderId: order.id,
              orderType: product.type,
            },
          },
        },
      },
    ],
    success_url: `${origin}/buyer/orders?checkout=success&order=${order.id}`,
    cancel_url: `${origin}/checkout/${input.type}/${encodeURIComponent(input.id)}?checkout=cancelled&order=${order.id}`,
    allow_promotion_codes: false,
    metadata: {
      kind: "leadflow_checkout_order",
      orderId: order.id,
      orderType: product.type,
      buyerAccountId: account.id,
      listingId: product.listingId || "",
      listingSlug: product.listingSlug || "",
      sampleId: product.sampleId || "",
      requiresManualReview: requiresManualReview ? "true" : "false",
      autoFulfillable: autoFulfillable ? "true" : "false",
    },
    payment_intent_data: {
      metadata: {
        kind: "leadflow_checkout_order",
        orderId: order.id,
        orderType: product.type,
        buyerAccountId: account.id,
        listingId: product.listingId || "",
      },
    },
  });

  const patched = await patchLeadFlowRows<LeadFlowOrderRecord>("orders", { id: `eq.${order.id}` }, {
    payment_session_id: checkout.id,
    status: "pending_payment",
  }).catch(() => []);
  const updatedOrder = patched[0] || { ...order, payment_session_id: checkout.id, status: "pending_payment" as LeadFlowOrderStatus };

  await Promise.all([
    insertLeadFlowRow<PaymentRecord>("payments", {
      payment_provider: "stripe",
      buyer_account_id: account.id,
      listing_id: product.listingId,
      sample_id: product.sampleId,
      sample_request_id: sampleRequestId,
      order_id: order.id,
      order_type: product.type,
      amount,
      currency: product.currency,
      status: "pending",
      payment_session_id: checkout.id,
      metadata: { checkout_url_created: true, order_id: order.id },
    }).catch(() => []),
    sampleRequestId ? patchLeadFlowRows("sample_requests", { id: `eq.${sampleRequestId}` }, { payment_session_id: checkout.id, payment_status: "pending" }).catch(() => null) : Promise.resolve(null),
    trackCheckoutEvent("checkout_started", {
      route: `/checkout/${input.type}/${input.id}`,
      checkout_type: input.type,
      order_id: order.id,
      listing_id: product.listingId || "",
      user_role: "buyer",
    }),
  ]);

  return {
    ok: true,
    order: updatedOrder,
    checkoutUrl: checkout.url,
    manualReview: requiresManualReview,
  };
}

async function loadOrder(orderId: string) {
  if (!hasLeadFlowDataApiConfig()) return null;
  const rows = await selectLeadFlowRows<LeadFlowOrderRecord>("orders", {
    select: orderSelect,
    id: `eq.${orderId}`,
    deleted_at: "is.null",
    limit: 1,
  }).catch(() => []);
  return rows[0] || null;
}

async function patchOrderPayment(input: {
  order: LeadFlowOrderRecord;
  status: LeadFlowOrderStatus;
  paymentIntentId?: string | null;
  sessionId?: string | null;
  paidAt?: string | null;
  failure?: { code?: string | null; message?: string | null };
}) {
  const patch: Record<string, unknown> = {
    status: input.status,
    payment_intent_id: input.paymentIntentId || input.order.payment_intent_id,
    payment_session_id: input.sessionId || input.order.payment_session_id,
  };
  if (input.status === "paid" || input.status === "fulfilled" || input.status === "manual_review") patch.paid_at = input.paidAt || nowIso();
  if (input.status === "canceled") patch.canceled_at = nowIso();
  if (input.status === "fulfilled") patch.fulfilled_at = nowIso();
  if (input.status === "failed") patch.reason = input.failure?.message || input.failure?.code || "payment_failed";
  const rows = await patchLeadFlowRows<LeadFlowOrderRecord>("orders", { id: `eq.${input.order.id}` }, patch).catch(() => []);
  return rows[0] || { ...input.order, ...patch };
}

export async function fulfillLeadFlowOrderCheckout(session: Stripe.Checkout.Session) {
  if (session.metadata?.kind !== "leadflow_checkout_order") return false;
  if (!hasLeadFlowDataApiConfig()) {
    console.warn("LeadFlow checkout webhook skipped: Supabase Data API not configured.");
    return true;
  }

  const orderId = session.metadata.orderId;
  if (!orderId) return true;
  const order = await loadOrder(orderId);
  if (!order) return true;

  const paymentIntentId = typeof session.payment_intent === "string" ? session.payment_intent : session.payment_intent?.id || null;
  const paidAt = new Date((session.created || Math.floor(Date.now() / 1000)) * 1000).toISOString();
  const finalStatus: LeadFlowOrderStatus = order.auto_fulfillable && !order.requires_manual_review ? "fulfilled" : "manual_review";
  const updatedOrder = await patchOrderPayment({
    order,
    status: finalStatus,
    paymentIntentId,
    sessionId: session.id,
    paidAt,
  });

  await Promise.all([
    insertLeadFlowRow<PaymentRecord>("payments", {
      payment_provider: "stripe",
      buyer_account_id: order.buyer_account_id,
      listing_id: order.listing_id,
      sample_id: order.sample_id,
      sample_request_id: order.sample_request_id || null,
      order_id: order.id,
      order_type: order.order_type,
      amount: typeof session.amount_total === "number" ? session.amount_total / 100 : numberValue(order.amount, 0),
      currency: session.currency || order.currency || "usd",
      status: "paid",
      payment_session_id: session.id,
      payment_intent_id: paymentIntentId,
      paid_at: paidAt,
      metadata: { kind: "leadflow_checkout_order", checkout_session_completed: true },
    }).catch(() => []),
    order.sample_request_id ? patchLeadFlowRows("sample_requests", { id: `eq.${order.sample_request_id}` }, {
      request_status: finalStatus === "fulfilled" ? "fulfilled" : "paid_pending_review",
      payment_status: "paid",
      payment_session_id: session.id,
      payment_intent_id: paymentIntentId,
      expires_at: finalStatus === "fulfilled" ? expiresIn(7) : order.expires_at || null,
    }).catch(() => null) : Promise.resolve(null),
    trackCheckoutEvent("order_paid", {
      route: "/api/webhooks/stripe",
      order_id: order.id,
      checkout_type: order.order_type,
      status: finalStatus,
      user_role: "webhook",
    }),
    auditCheckout({
      actor: "webhook",
      action: "order.paid",
      objectTable: "orders",
      objectId: order.id,
      buyerAccountId: order.buyer_account_id,
      listingId: order.listing_id,
      details: { final_status: finalStatus, payment_intent_id: paymentIntentId },
    }),
  ]);

  if (finalStatus === "fulfilled") {
    await grantOrderEntitlement({ order: updatedOrder, actor: "webhook" });
  } else {
    await trackCheckoutEvent("order_manual_review_required", {
      route: "/api/webhooks/stripe",
      order_id: order.id,
      checkout_type: order.order_type,
      status: finalStatus,
      user_role: "webhook",
    });
  }
  return true;
}

export async function handleLeadFlowOrderPaymentIntentSucceeded(intent: Stripe.PaymentIntent) {
  if (intent.metadata?.kind !== "leadflow_checkout_order") return false;
  const orderId = intent.metadata.orderId;
  if (!orderId || !hasLeadFlowDataApiConfig()) return true;
  const order = await loadOrder(orderId);
  if (!order) return true;
  await Promise.all([
    patchLeadFlowRows("orders", { id: `eq.${order.id}` }, { payment_intent_id: intent.id }).catch(() => null),
    patchLeadFlowRows("payments", { order_id: `eq.${order.id}` }, { payment_intent_id: intent.id }).catch(() => null),
  ]);
  return true;
}

export async function handleLeadFlowOrderPaymentIntentFailed(intent: Stripe.PaymentIntent) {
  if (intent.metadata?.kind !== "leadflow_checkout_order") return false;
  const orderId = intent.metadata.orderId;
  if (!orderId || !hasLeadFlowDataApiConfig()) return true;
  const order = await loadOrder(orderId);
  if (!order) return true;
  const lastError = intent.last_payment_error;
  await Promise.all([
    patchOrderPayment({
      order,
      status: "failed",
      paymentIntentId: intent.id,
      failure: { code: lastError?.code || null, message: lastError?.message || null },
    }),
    insertLeadFlowRow<PaymentRecord>("payments", {
      payment_provider: "stripe",
      buyer_account_id: order.buyer_account_id,
      listing_id: order.listing_id,
      sample_id: order.sample_id,
      sample_request_id: order.sample_request_id || null,
      order_id: order.id,
      order_type: order.order_type,
      amount: numberValue(order.amount, 0),
      currency: order.currency || "usd",
      status: "failed",
      payment_intent_id: intent.id,
      failure_code: lastError?.code || null,
      failure_message: lastError?.message || null,
      metadata: { kind: "leadflow_checkout_order", payment_intent_failed: true },
    }).catch(() => []),
    trackCheckoutEvent("checkout_failed", {
      route: "/api/webhooks/stripe",
      order_id: order.id,
      checkout_type: order.order_type,
      status: "failed",
      user_role: "webhook",
    }),
  ]);
  return true;
}

async function orderProductTitle(order: LeadFlowOrderRecord) {
  if (typeof order.metadata?.product_title === "string") return order.metadata.product_title;
  if (order.listing_slug || order.listing_id) {
    const listing = await loadListing(order.listing_slug || order.listing_id || "").catch(() => null);
    if (listing) return listing.title;
  }
  if (order.order_type === "custom_signal_request") return "Custom signal sourcing deposit";
  if (order.order_type === "subscription_placeholder") return "LeadFlow subscription placeholder";
  return order.order_type.replace(/_/g, " ");
}

function orderNextAction(order: LeadFlowOrderRecord) {
  if (order.status === "pending_payment") return "Finish payment";
  if (order.status === "manual_review") return "Wait for admin review";
  if (order.status === "fulfilled") return order.order_type === "sample" ? "Open approved sample" : "View approved access";
  if (order.status === "failed") return "Restart checkout";
  if (order.status === "refunded") return "Contact support";
  return "Review order";
}

export async function getBuyerOrdersPageData(): Promise<BuyerOrdersPageData> {
  const data = await getBuyerPortalData();
  if (!data.authenticated) return data;
  const restricted = buyerAccountIsRestricted(data.account);
  if (!hasLeadFlowDataApiConfig() || !data.account) {
    return {
      authenticated: true,
      account: data.account,
      restricted,
      orders: [],
      loadErrors: hasLeadFlowDataApiConfig() ? [] : ["LeadFlow Supabase Data API is not configured."],
    };
  }

  const loadErrors: string[] = [];
  const orders = await selectLeadFlowRows<LeadFlowOrderRecord>("orders", {
    select: orderSelect,
    buyer_account_id: `eq.${data.account.id}`,
    deleted_at: "is.null",
    order: "created_at.desc",
    limit: 100,
  }).catch((error) => {
    loadErrors.push(error instanceof Error ? error.message : "Orders query failed.");
    return [];
  });

  const enriched = await Promise.all(orders.map(async (order) => ({
    ...order,
    productTitle: await orderProductTitle(order),
    productPath: order.order_type === "sample" && order.sample_id ? `/buyer/samples/${order.sample_id}` : order.listing_slug ? `/marketplace/${order.listing_slug}` : "/marketplace",
    accessStatus: order.status === "fulfilled" ? "access granted" : order.status.replace(/_/g, " "),
    nextAction: orderNextAction(order),
  })));

  return { authenticated: true, account: data.account, restricted, orders: enriched, loadErrors };
}

export async function getAdminOrdersPageData(authorized: boolean): Promise<AdminOrdersPageData> {
  if (!authorized) {
    return { mode: "offline", authorized: false, orders: [], payments: [], stats: { totalOrders: 0, pendingPayment: 0, manualReview: 0, paid: 0, fulfilled: 0, failed: 0, revenue: 0 }, loadErrors: ["Admin access required."] };
  }
  if (!hasLeadFlowDataApiConfig()) {
    return { mode: "offline", authorized: true, orders: [], payments: [], stats: { totalOrders: 0, pendingPayment: 0, manualReview: 0, paid: 0, fulfilled: 0, failed: 0, revenue: 0 }, loadErrors: ["LeadFlow Supabase Data API is not configured."] };
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
  const [orders, payments, buyers] = await Promise.all([
    safe<LeadFlowOrderRecord>("orders", { select: orderSelect, deleted_at: "is.null", order: "created_at.desc", limit: 200 }),
    safe<PaymentRecord>("payments", { select: paymentSelect, order: "created_at.desc", limit: 200 }),
    safe<BuyerAccount>("buyer_accounts", { select: "id,name,email,company_name,auth_user_id,phone,website,buyer_type,industry,location_served,budget_range,intended_use,account_status,approved_access_level,communication_preference,consent_status,created_at,updated_at,last_login_at", deleted_at: "is.null", limit: 500 }),
  ]);
  const buyerMap = new Map(buyers.map((buyer) => [buyer.id, buyer]));
  const enriched = await Promise.all(orders.map(async (order) => {
    const buyer = order.buyer_account_id ? buyerMap.get(order.buyer_account_id) : null;
    return {
      ...order,
      buyerName: buyer?.name || buyer?.email || (order.buyer_account_id || "unknown").slice(0, 8),
      buyerCompany: buyer?.company_name || "Buyer account",
      productTitle: await orderProductTitle(order),
    };
  }));
  const paidRevenue = orders
    .filter((order) => ["paid", "fulfilled", "manual_review"].includes(order.status) && order.paid_at)
    .reduce((total, order) => total + numberValue(order.amount, 0), 0);
  return {
    mode: "live",
    authorized: true,
    orders: enriched,
    payments,
    stats: {
      totalOrders: orders.length,
      pendingPayment: orders.filter((order) => order.status === "pending_payment").length,
      manualReview: orders.filter((order) => order.status === "manual_review").length,
      paid: orders.filter((order) => order.status === "paid").length,
      fulfilled: orders.filter((order) => order.status === "fulfilled").length,
      failed: orders.filter((order) => order.status === "failed").length,
      revenue: paidRevenue,
    },
    loadErrors,
  };
}

export async function adminUpdateOrder(input: {
  orderId: string;
  action: "approve_manual_review" | "grant_entitlement" | "revoke_entitlement" | "mark_fulfilled" | "mark_refunded";
  adminUserId?: string | null;
  adminNotes?: string | null;
  confirmedImpact?: boolean;
}) {
  if (!hasLeadFlowDataApiConfig()) return { ok: false as const, status: 503, error: "LeadFlow Supabase Data API is not configured." };
  const order = await loadOrder(input.orderId);
  if (!order) return { ok: false as const, status: 404, error: "Order not found." };
  if (["grant_entitlement", "revoke_entitlement", "mark_refunded"].includes(input.action) && !input.confirmedImpact) {
    return { ok: false as const, status: 400, error: "Confirm the impact before changing entitlement or refund state." };
  }

  if (input.action === "approve_manual_review") {
    const rows = await patchLeadFlowRows<LeadFlowOrderRecord>("orders", { id: `eq.${order.id}` }, {
      status: order.paid_at ? "paid" : "manual_review",
      reason: input.adminNotes || order.reason,
      metadata: { ...(order.metadata || {}), admin_review_approved: true, admin_notes_added: Boolean(input.adminNotes) },
    });
    await auditCheckout({ actor: "admin", actorUserId: input.adminUserId, action: "order.manual_review_approved", objectTable: "orders", objectId: order.id, buyerAccountId: order.buyer_account_id, listingId: order.listing_id, details: { admin_notes_added: Boolean(input.adminNotes) } });
    return { ok: true as const, order: rows[0] || order };
  }

  if (input.action === "grant_entitlement") {
    const entitlementId = await grantOrderEntitlement({ order, actor: "admin", actorUserId: input.adminUserId });
    const rows = await patchLeadFlowRows<LeadFlowOrderRecord>("orders", { id: `eq.${order.id}` }, { status: "fulfilled", fulfilled_by: uuidOrNull(input.adminUserId), fulfilled_at: nowIso() });
    return { ok: true as const, order: rows[0] || order, entitlementId };
  }

  if (input.action === "revoke_entitlement") {
    if (!order.listing_id && !order.listing_slug) {
      return { ok: false as const, status: 409, error: "Order does not identify a listing entitlement to revoke." };
    }
    await patchLeadFlowRows("buyer_entitlements", {
      buyer_account_id: order.buyer_account_id ? `eq.${order.buyer_account_id}` : undefined,
      listing_id: order.listing_id ? `eq.${order.listing_id}` : undefined,
      listing_slug: order.listing_slug ? `eq.${order.listing_slug}` : undefined,
      status: "eq.active",
    }, {
      status: "revoked",
      metadata: { revoked_from_order_id: order.id, admin_notes: input.adminNotes || null },
    }).catch(() => null);
    await auditCheckout({ actor: "admin", actorUserId: input.adminUserId, action: "entitlement.revoked_from_order", objectTable: "buyer_entitlements", buyerAccountId: order.buyer_account_id, listingId: order.listing_id, details: { order_id: order.id } });
    return { ok: true as const, order };
  }

  if (input.action === "mark_fulfilled") {
    const rows = await patchLeadFlowRows<LeadFlowOrderRecord>("orders", { id: `eq.${order.id}` }, { status: "fulfilled", fulfilled_by: uuidOrNull(input.adminUserId), fulfilled_at: nowIso() });
    await auditCheckout({ actor: "admin", actorUserId: input.adminUserId, action: "order.marked_fulfilled", objectTable: "orders", objectId: order.id, buyerAccountId: order.buyer_account_id, listingId: order.listing_id });
    return { ok: true as const, order: rows[0] || order };
  }

  const rows = await patchLeadFlowRows<LeadFlowOrderRecord>("orders", { id: `eq.${order.id}` }, { status: "refunded", reason: input.adminNotes || "marked_refunded_manually" });
  await auditCheckout({ actor: "admin", actorUserId: input.adminUserId, action: "order.marked_refunded", objectTable: "orders", objectId: order.id, buyerAccountId: order.buyer_account_id, listingId: order.listing_id });
  return { ok: true as const, order: rows[0] || order };
}
