import "server-only";

import crypto from "crypto";
import {
  buyerAccountIsRestricted,
  getBuyerPortalData,
  type BuyerAccount,
  type BuyerEntitlement,
} from "@/lib/buyer-portal";
import { leadProfileDetails, type LeadProfileDetail } from "@/lib/lead-profile-detail";
import {
  hasLeadFlowDataApiConfig,
  insertLeadFlowRow,
  patchLeadFlowRows,
  selectLeadFlowRows,
} from "@/lib/leadflow-data-api";
import { sanitizeLeadFlowEventProperties } from "@/lib/leadflow-events";

export const EXPORT_FIELD_GROUPS = [
  "public_profile",
  "contact",
  "source_proof",
  "compliance",
  "admin",
] as const;

export const EXPORT_FORMATS = ["csv", "json"] as const;

export type ExportFieldGroup = (typeof EXPORT_FIELD_GROUPS)[number];
export type ExportFormat = (typeof EXPORT_FORMATS)[number];
export type ExportActor = "buyer" | "admin";

export type LeadFlowExportRecord = {
  id: string;
  buyer_account_id: string | null;
  lead_profile_id: string | null;
  marketplace_listing_id: string | null;
  export_type: string;
  export_status: string;
  row_count: number;
  raw_answers_included: boolean;
  filter_summary: Record<string, unknown>;
  storage_path: string | null;
  checksum_sha256: string | null;
  created_by_user_id: string | null;
  generated_at: string | null;
  exported_at: string | null;
  downloaded_at: string | null;
  expires_at: string | null;
  created_at: string;
};

type LeadProfileRow = {
  id: string;
  slug?: string | null;
  title: string;
  vertical: string;
  category: string | null;
  buyer_use_case: string | null;
  tags: string[];
  score: number | string | null;
  confidence: number | string | null;
  consent_status: string;
  suppression_status: string;
  source_proof_status: string;
  status: string;
  review_status: string;
  source_url: string | null;
  buyer_visible_summary: Record<string, unknown>;
  private_profile: Record<string, unknown>;
  last_verified_at: string | null;
  updated_at: string;
  created_at: string;
};

type MarketplaceListingRow = {
  id: string;
  slug?: string | null;
  lead_profile_id: string | null;
  title: string;
  vertical: string;
  category: string | null;
  buyer_type: string | null;
  source_type: string | null;
  listing_status: string;
  review_status: string;
  release_mode: string;
  compliance_status: string;
  source_url: string | null;
  buyer_visible_summary: Record<string, unknown>;
  updated_at: string;
};

export type ExportableProduct = {
  entitlementId: string;
  listingId: string | null;
  listingSlug: string | null;
  leadProfileId: string | null;
  accessLevel: string;
  title: string;
  category: string;
  vertical: string;
  allowedFieldGroups: ExportFieldGroup[];
  status: string;
  expiresAt: string | null;
};

export type BuyerExportPageData =
  | {
      authenticated: false;
      reason: "missing_config" | "missing_session" | "invalid_session";
    }
  | {
      authenticated: true;
      account: BuyerAccount | null;
      restricted: boolean;
      exports: LeadFlowExportRecord[];
      products: ExportableProduct[];
      loadErrors: string[];
    };

export type AdminExportPageData = {
  mode: "live" | "offline";
  exports: LeadFlowExportRecord[];
  listings: MarketplaceListingRow[];
  profiles: LeadProfileRow[];
  loadErrors: string[];
};

export type CreateLeadFlowExportInput = {
  actor: ExportActor;
  actorUserId?: string | null;
  buyerAccount?: BuyerAccount | null;
  entitlement?: BuyerEntitlement | null;
  exportType: string;
  format: ExportFormat;
  fieldGroups: ExportFieldGroup[];
  listingId?: string | null;
  listingSlug?: string | null;
  leadProfileId?: string | null;
  reason: string;
  confirmedAllowedUse: boolean;
  adminOverrideHighRisk?: boolean;
};

export type CreateLeadFlowExportResult =
  | {
      ok: true;
      exportRecord: LeadFlowExportRecord;
      downloadUrl: string;
      blockedCount: number;
    }
  | {
      ok: false;
      status: number;
      error: string;
      reason: string;
    };

const fallbackExports: LeadFlowExportRecord[] = [
  {
    id: "sample-export-ecommerce",
    buyer_account_id: null,
    lead_profile_id: "ecommerce-vendor-signal-pack",
    marketplace_listing_id: null,
    export_type: "report_only",
    export_status: "sample_ready",
    row_count: 1,
    raw_answers_included: false,
    filter_summary: {
      format: "csv",
      field_groups: ["public_profile", "source_proof", "compliance"],
      allowed_use_confirmed: true,
    },
    storage_path: "/api/leadflow/exports/sample-export-ecommerce/download",
    checksum_sha256: null,
    created_by_user_id: null,
    generated_at: new Date().toISOString(),
    exported_at: null,
    downloaded_at: null,
    expires_at: null,
    created_at: new Date().toISOString(),
  },
];

function nowIso() {
  return new Date().toISOString();
}

function expiresIn(days: number) {
  const date = new Date();
  date.setDate(date.getDate() + days);
  return date.toISOString();
}

function normalizeFieldGroups(groups: unknown, actor: ExportActor, accessLevel?: string | null): ExportFieldGroup[] {
  const input = Array.isArray(groups) ? groups : [];
  const requested = input.filter((item): item is ExportFieldGroup => EXPORT_FIELD_GROUPS.includes(item as ExportFieldGroup));
  const base: ExportFieldGroup[] = requested.length ? requested : ["public_profile", "source_proof", "compliance"];
  const allowed = allowedFieldGroupsFor(actor, accessLevel);
  return Array.from(new Set(base.filter((group) => allowed.includes(group))));
}

export function normalizeFieldGroupsForRequest(groups: unknown, actor: ExportActor, accessLevel?: string | null): ExportFieldGroup[] {
  return normalizeFieldGroups(groups, actor, accessLevel);
}

export function allowedFieldGroupsFor(actor: ExportActor, accessLevel?: string | null): ExportFieldGroup[] {
  if (actor === "admin") return ["public_profile", "contact", "source_proof", "compliance", "admin"];
  const contactAllowed = ["full_profile", "raw_export", "exclusive"].includes(accessLevel || "");
  return contactAllowed
    ? ["public_profile", "contact", "source_proof", "compliance"]
    : ["public_profile", "source_proof", "compliance"];
}

export function normalizeExportFormat(value: unknown): ExportFormat {
  return value === "json" ? "json" : "csv";
}

function textValue(value: unknown, fallback = "") {
  return typeof value === "string" && value.trim() ? value.trim() : fallback;
}

function numberScore(value: unknown) {
  if (typeof value === "number") return Math.round(value);
  if (typeof value === "string") return Math.round(Number(value) || 0);
  return 0;
}

function confidenceLabel(value: unknown) {
  if (typeof value === "string" && !/^\d/.test(value)) return value;
  const numeric = numberScore(value);
  const scaled = numeric <= 1 ? Math.round(numeric * 100) : numeric;
  if (scaled >= 75) return "high";
  if (scaled >= 45) return "medium";
  if (scaled > 0) return "low";
  return "needs_review";
}

function fallbackProfileRow(profile: LeadProfileDetail): LeadProfileRow {
  return {
    id: profile.id,
    slug: profile.id,
    title: profile.title,
    vertical: profile.vertical,
    category: profile.category,
    buyer_use_case: profile.buyerUseCase,
    tags: profile.tags,
    score: profile.leadScore,
    confidence: profile.confidence,
    consent_status: profile.consentStatus,
    suppression_status: profile.suppressionStatus,
    source_proof_status: profile.sourceProofLinks.some((proof) => proof.status === "verified") ? "approved" : "review",
    status: "sample_available",
    review_status: "approved",
    source_url: profile.sourceProofLinks[0]?.href || null,
    buyer_visible_summary: {
      summary: profile.summary,
      why_this_profile_exists: profile.whyThisProfileExists,
      source_type: profile.sourceType,
      best_buyer_type: profile.bestBuyerType,
      recommended_next_action: profile.recommendedNextAction,
      freshness: profile.lastVerifiedDate,
      allowed_use: profile.buyerUseCase,
      restricted_use: "Do not use as a blind list, suppressed outreach list, or raw identity dossier.",
    },
    private_profile: {
      business_name: profile.title,
      contact_page: profile.sourceProofLinks[0]?.href || "/profile-model",
      risk_level: "low",
      internal_notes: "Fallback sample row generated from checked-in profile model.",
    },
    last_verified_at: profile.lastVerifiedDate,
    created_at: nowIso(),
    updated_at: nowIso(),
  };
}

function fallbackProfileById(id: string | null | undefined) {
  if (!id) return null;
  const detail = leadProfileDetails.find((profile) => profile.id === id);
  return detail ? fallbackProfileRow(detail) : null;
}

function exportRecordSelect() {
  return [
    "id",
    "buyer_account_id",
    "lead_profile_id",
    "marketplace_listing_id",
    "export_type",
    "export_status",
    "row_count",
    "raw_answers_included",
    "filter_summary",
    "storage_path",
    "checksum_sha256",
    "created_by_user_id",
    "generated_at",
    "exported_at",
    "downloaded_at",
    "expires_at",
    "created_at",
  ].join(",");
}

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
  "updated_at",
].join(",");

const profileSelect = [
  "id",
  "slug",
  "title",
  "vertical",
  "category",
  "buyer_use_case",
  "tags",
  "score",
  "confidence",
  "consent_status",
  "suppression_status",
  "source_proof_status",
  "status",
  "review_status",
  "source_url",
  "buyer_visible_summary",
  "private_profile",
  "last_verified_at",
  "created_at",
  "updated_at",
].join(",");

async function trackExportEvent(eventName: string, properties: Record<string, unknown>) {
  if (!hasLeadFlowDataApiConfig()) return;
  const safeProperties = sanitizeLeadFlowEventProperties(properties);
  const route = typeof safeProperties.route === "string" ? safeProperties.route : "/exports";
  const actor = typeof safeProperties.actor === "string" ? safeProperties.actor : "export";
  await insertLeadFlowRow("events", {
    event_name: eventName,
    event_type: actor,
    route,
    user_role: actor === "admin" ? "admin" : actor === "buyer" ? "buyer" : "system",
    source_path: route,
    properties: safeProperties,
  }).catch(() => null);
}

async function auditExport(input: {
  actor: ExportActor;
  actorUserId?: string | null;
  action: string;
  exportId?: string | null;
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
    object_table: "exports",
    object_id: uuidOrNull(input.exportId),
    buyer_account_id: uuidOrNull(input.buyerAccountId),
    lead_profile_id: uuidOrNull(input.leadProfileId),
    marketplace_listing_id: uuidOrNull(input.listingId),
    details: {
      raw_records_returned: false,
      ...(input.details || {}),
    },
  }).catch(() => null);
}

function uuidOrNull(value: string | null | undefined) {
  return value && /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{12}$/i.test(value) ? value : null;
}

function entitlementActive(entitlement: BuyerEntitlement) {
  return entitlement.status === "active" && (!entitlement.expires_at || new Date(entitlement.expires_at).getTime() > Date.now());
}

function productFromEntitlement(entitlement: BuyerEntitlement): ExportableProduct {
  const profileId = entitlement.lead_profile_id || entitlement.listing_slug || entitlement.listing_id || "";
  const fallback = fallbackProfileById(profileId);
  return {
    entitlementId: entitlement.id,
    listingId: entitlement.listing_id,
    listingSlug: entitlement.listing_slug,
    leadProfileId: entitlement.lead_profile_id,
    accessLevel: entitlement.access_level,
    title: fallback?.title || entitlement.listing_slug?.replace(/-/g, " ") || "Approved lead signal product",
    category: fallback?.category || "Marketplace",
    vertical: fallback?.vertical || "Lead signal",
    allowedFieldGroups: allowedFieldGroupsFor("buyer", entitlement.access_level),
    status: entitlement.status,
    expiresAt: entitlement.expires_at,
  };
}

export async function getBuyerExportPageData(): Promise<BuyerExportPageData> {
  const data = await getBuyerPortalData();
  if (!data.authenticated) return data;

  const restricted = buyerAccountIsRestricted(data.account);
  if (!hasLeadFlowDataApiConfig() || !data.account) {
    return {
      authenticated: true,
      account: data.account,
      restricted,
      exports: [],
      products: data.entitlements.filter(entitlementActive).map(productFromEntitlement),
      loadErrors: hasLeadFlowDataApiConfig() ? [] : ["LeadFlow Supabase Data API is not configured."],
    };
  }

  const exports = await selectLeadFlowRows<LeadFlowExportRecord>("exports", {
    select: exportRecordSelect(),
    buyer_account_id: `eq.${data.account.id}`,
    deleted_at: "is.null",
    order: "created_at.desc",
    limit: 100,
  }).catch(() => []);

  return {
    authenticated: true,
    account: data.account,
    restricted,
    exports,
    products: restricted ? [] : data.entitlements.filter(entitlementActive).map(productFromEntitlement),
    loadErrors: [],
  };
}

export async function getAdminExportPageData(): Promise<AdminExportPageData> {
  if (!hasLeadFlowDataApiConfig()) {
    return {
      mode: "offline",
      exports: fallbackExports,
      listings: [],
      profiles: leadProfileDetails.slice(0, 6).map(fallbackProfileRow),
      loadErrors: ["LeadFlow Supabase Data API is not configured. Showing export-safe test rows."],
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

  const [exports, listings, profiles] = await Promise.all([
    safe<LeadFlowExportRecord>("exports", {
      select: exportRecordSelect(),
      deleted_at: "is.null",
      order: "created_at.desc",
      limit: 100,
    }),
    safe<MarketplaceListingRow>("marketplace_listings", {
      select: listingSelect,
      deleted_at: "is.null",
      order: "updated_at.desc",
      limit: 100,
    }),
    safe<LeadProfileRow>("lead_profiles", {
      select: profileSelect,
      deleted_at: "is.null",
      order: "updated_at.desc",
      limit: 100,
    }),
  ]);

  return { mode: "live", exports, listings, profiles, loadErrors };
}

async function loadListing(idOrSlug: string | null | undefined) {
  if (!idOrSlug || !hasLeadFlowDataApiConfig()) return null;
  const idRows = uuidOrNull(idOrSlug)
    ? await selectLeadFlowRows<MarketplaceListingRow>("marketplace_listings", {
        select: listingSelect,
        id: `eq.${idOrSlug}`,
        deleted_at: "is.null",
        limit: 1,
      }).catch(() => [])
    : [];
  if (idRows[0]) return idRows[0];
  const slugRows = await selectLeadFlowRows<MarketplaceListingRow>("marketplace_listings", {
    select: listingSelect,
    slug: `eq.${idOrSlug}`,
    deleted_at: "is.null",
    limit: 1,
  }).catch(() => []);
  return slugRows[0] || null;
}

async function loadProfile(idOrSlug: string | null | undefined) {
  if (!idOrSlug) return null;
  if (!hasLeadFlowDataApiConfig()) return fallbackProfileById(idOrSlug);
  const idRows = uuidOrNull(idOrSlug)
    ? await selectLeadFlowRows<LeadProfileRow>("lead_profiles", {
        select: profileSelect,
        id: `eq.${idOrSlug}`,
        deleted_at: "is.null",
        limit: 1,
      }).catch(() => [])
    : [];
  if (idRows[0]) return idRows[0];
  const slugRows = await selectLeadFlowRows<LeadProfileRow>("lead_profiles", {
    select: profileSelect,
    slug: `eq.${idOrSlug}`,
    deleted_at: "is.null",
    limit: 1,
  }).catch(() => []);
  return slugRows[0] || fallbackProfileById(idOrSlug);
}

async function resolveProfilesForExport(input: CreateLeadFlowExportInput) {
  const profiles: LeadProfileRow[] = [];
  const blocked: Array<{ id: string; reason: string }> = [];
  const listing = await loadListing(input.listingId || input.listingSlug || input.entitlement?.listing_id || input.entitlement?.listing_slug);
  const profileIds = new Set<string>();

  if (input.leadProfileId) profileIds.add(input.leadProfileId);
  if (input.entitlement?.lead_profile_id) profileIds.add(input.entitlement.lead_profile_id);
  if (listing?.lead_profile_id) profileIds.add(listing.lead_profile_id);
  if (!profileIds.size && input.entitlement?.listing_slug) profileIds.add(input.entitlement.listing_slug);
  if (!profileIds.size && input.listingSlug) profileIds.add(input.listingSlug);

  for (const profileId of profileIds) {
    const profile = await loadProfile(profileId);
    if (!profile) {
      blocked.push({ id: profileId, reason: "profile_not_found" });
      continue;
    }
    const risk = textValue(profile.private_profile?.risk_level, "low");
    if (profile.suppression_status && ["suppressed", "do_not_contact", "delete_requested"].includes(profile.suppression_status)) {
      blocked.push({ id: profile.id, reason: "suppressed" });
      continue;
    }
    if (input.actor === "buyer" && profile.review_status && profile.review_status !== "approved") {
      blocked.push({ id: profile.id, reason: "not_approved" });
      continue;
    }
    if (["high", "prohibited"].includes(risk) && !input.adminOverrideHighRisk) {
      blocked.push({ id: profile.id, reason: `risk_${risk}` });
      continue;
    }
    profiles.push(profile);
  }

  return { profiles, blocked, listing };
}

function profileExportRow(profile: LeadProfileRow, groups: ExportFieldGroup[]) {
  const summary = profile.buyer_visible_summary || {};
  const privateProfile = profile.private_profile || {};
  const row: Record<string, string | number | boolean | null> = {};

  if (groups.includes("public_profile")) {
    row.profile_id = profile.slug || profile.id;
    row.profile_title = profile.title;
    row.category = profile.category || "";
    row.vertical = profile.vertical;
    row.summary = textValue(summary.summary, textValue(summary.description, ""));
    row.score = numberScore(profile.score);
    row.confidence = confidenceLabel(profile.confidence);
    row.buyer_use_case = profile.buyer_use_case || textValue(summary.buyer_use_case, "");
    row.source_type = textValue(summary.source_type, textValue(privateProfile.source_type, ""));
    row.freshness = textValue(summary.freshness, profile.last_verified_at || profile.updated_at);
    row.source_proof_status = profile.source_proof_status;
  }

  if (groups.includes("contact")) {
    row.name = textValue(privateProfile.name, "");
    row.business_name = textValue(privateProfile.business_name, profile.title);
    row.website = textValue(privateProfile.website, profile.source_url || "");
    row.business_phone = textValue(privateProfile.business_phone, "");
    row.business_email = textValue(privateProfile.business_email, "");
    row.public_contact_page = textValue(privateProfile.contact_page, profile.source_url || "");
  }

  if (groups.includes("source_proof")) {
    row.source_url = profile.source_url || "";
    row.source_title = textValue(summary.source_title, profile.title);
    row.source_snippet = textValue(summary.source_snippet, textValue(summary.why_this_profile_exists, ""));
    row.verified_date = profile.last_verified_at || profile.updated_at;
    row.source_type = row.source_type || textValue(summary.source_type, "");
  }

  if (groups.includes("compliance")) {
    row.consent_status = profile.consent_status;
    row.suppression_status = profile.suppression_status;
    row.allowed_use = textValue(summary.allowed_use, profile.buyer_use_case || "");
    row.restricted_use = textValue(summary.restricted_use, "No suppressed, outdated, prohibited, or unapproved use.");
    row.last_reviewed_date = profile.last_verified_at || profile.updated_at;
  }

  if (groups.includes("admin")) {
    row.internal_notes = textValue(privateProfile.internal_notes, "");
    row.risk_flags = Array.isArray(privateProfile.risk_flags) ? privateProfile.risk_flags.join("; ") : textValue(privateProfile.risk_flags, "");
    row.reviewer_notes = textValue(privateProfile.reviewer_notes, "");
    row.hidden_source_notes = textValue(privateProfile.hidden_source_notes, "");
  }

  return row;
}

function csvEscape(value: unknown) {
  if (value === null || value === undefined) return "";
  const text = String(value);
  return /[",\n\r]/.test(text) ? `"${text.replace(/"/g, '""')}"` : text;
}

export function exportRowsToCsv(rows: Record<string, unknown>[]) {
  if (!rows.length) return "";
  const headers = Array.from(rows.reduce((set, row) => {
    Object.keys(row).forEach((key) => set.add(key));
    return set;
  }, new Set<string>()));
  return [headers.join(","), ...rows.map((row) => headers.map((header) => csvEscape(row[header])).join(","))].join("\n");
}

export function renderExportFile(rows: Record<string, unknown>[], format: ExportFormat) {
  if (format === "json") {
    const body = JSON.stringify({ generated_at: nowIso(), records: rows }, null, 2);
    return {
      body,
      contentType: "application/json; charset=utf-8",
      extension: "json",
    };
  }
  return {
    body: exportRowsToCsv(rows),
    contentType: "text/csv; charset=utf-8",
    extension: "csv",
  };
}

export async function createLeadFlowExport(input: CreateLeadFlowExportInput): Promise<CreateLeadFlowExportResult> {
  if (!hasLeadFlowDataApiConfig()) {
    return { ok: false, status: 503, error: "LeadFlow Supabase Data API is not configured.", reason: "missing_data_api" };
  }
  if (!input.confirmedAllowedUse) {
    await trackExportEvent(input.actor === "admin" ? "admin_export_blocked" : "buyer_export_blocked", {
      actor: input.actor,
      reason: "allowed_use_not_confirmed",
      route: input.actor === "admin" ? "/dashboard/exports" : "/buyer/exports",
    });
    return { ok: false, status: 400, error: "Confirm the allowed use before creating an export.", reason: "allowed_use_not_confirmed" };
  }
  if (input.actor === "buyer") {
    if (!input.buyerAccount || buyerAccountIsRestricted(input.buyerAccount)) {
      return { ok: false, status: 403, error: "Buyer account is not allowed to export.", reason: "buyer_restricted" };
    }
    if (input.format !== "csv") {
      return { ok: false, status: 403, error: "Buyer exports are CSV-only. JSON is admin-only.", reason: "buyer_json_forbidden" };
    }
    if (!input.entitlement || !entitlementActive(input.entitlement)) {
      return { ok: false, status: 403, error: "Active entitlement required before export.", reason: "inactive_entitlement" };
    }
    if (input.fieldGroups.includes("admin")) {
      return { ok: false, status: 403, error: "Admin-only fields cannot be included in buyer exports.", reason: "admin_fields_forbidden" };
    }
  }
  if (input.actor === "admin" && input.fieldGroups.includes("admin") && input.exportType !== "admin_internal") {
    return { ok: false, status: 400, error: "Admin-only fields require an admin internal export type.", reason: "admin_group_wrong_export_type" };
  }

  const { profiles, blocked, listing } = await resolveProfilesForExport(input);
  if (!profiles.length) {
    await trackExportEvent(input.actor === "admin" ? "admin_export_blocked" : "buyer_export_blocked", {
      actor: input.actor,
      reason: blocked[0]?.reason || "no_exportable_profiles",
      route: input.actor === "admin" ? "/dashboard/exports" : "/buyer/exports",
    });
    return {
      ok: false,
      status: 409,
      error: "No exportable profiles passed suppression, review, and risk checks.",
      reason: blocked[0]?.reason || "no_exportable_profiles",
    };
  }

  const rows = profiles.map((profile) => profileExportRow(profile, input.fieldGroups));
  const file = renderExportFile(rows, input.format);
  const checksum = crypto.createHash("sha256").update(file.body).digest("hex");
  const expiresAt = expiresIn(input.actor === "admin" ? 3 : 7);
  const rawAnswersIncluded = input.actor === "admin" && input.fieldGroups.includes("admin") && input.exportType === "admin_internal";
  const leadProfileId = uuidOrNull(profiles[0]?.id);
  const listingId = uuidOrNull(input.listingId || input.entitlement?.listing_id || listing?.id);

  const inserted = await insertLeadFlowRow<LeadFlowExportRecord>("exports", {
    buyer_account_id: uuidOrNull(input.buyerAccount?.id),
    lead_profile_id: leadProfileId,
    marketplace_listing_id: listingId,
    export_type: input.exportType,
    export_status: "generated",
    row_count: rows.length,
    raw_answers_included: rawAnswersIncluded,
    filter_summary: {
      format: input.format,
      extension: file.extension,
      field_groups: input.fieldGroups,
      reason: input.reason,
      actor: input.actor,
      entitlement_id: input.entitlement?.id || null,
      access_level: input.entitlement?.access_level || null,
      listing_slug: input.listingSlug || input.entitlement?.listing_slug || listing?.slug || null,
      blocked,
      allowed_use_confirmed: input.confirmedAllowedUse,
      generated_server_side: true,
      download_requires_auth: true,
    },
    storage_path: "pending",
    checksum_sha256: checksum,
    created_by_user_id: uuidOrNull(input.actorUserId),
    generated_at: nowIso(),
    exported_at: nowIso(),
    expires_at: expiresAt,
  });
  const exportRecord = inserted[0];
  if (!exportRecord) {
    return { ok: false, status: 500, error: "Export record could not be created.", reason: "insert_failed" };
  }

  const downloadUrl = `/api/leadflow/exports/${exportRecord.id}/download`;
  await patchLeadFlowRows<LeadFlowExportRecord>("exports", { id: `eq.${exportRecord.id}` }, { storage_path: downloadUrl }).catch(() => null);
  const finalRecord = { ...exportRecord, storage_path: downloadUrl };

  for (const profile of profiles) {
    await insertLeadFlowRow("export_items", {
      export_id: exportRecord.id,
      lead_profile_id: uuidOrNull(profile.id),
      included_fields: input.fieldGroups,
    }).catch(() => null);
  }

  await Promise.all([
    auditExport({
      actor: input.actor,
      actorUserId: input.actorUserId,
      action: `${input.actor}_export.created`,
      exportId: exportRecord.id,
      buyerAccountId: input.buyerAccount?.id || null,
      listingId,
      leadProfileId,
      details: {
        export_type: input.exportType,
        format: input.format,
        field_groups: input.fieldGroups,
        row_count: rows.length,
        blocked_count: blocked.length,
        raw_answers_included: rawAnswersIncluded,
      },
    }),
    trackExportEvent(input.actor === "admin" ? "admin_export_completed" : "buyer_export_completed", {
      actor: input.actor,
      route: input.actor === "admin" ? "/dashboard/exports" : "/buyer/exports",
      export_id: exportRecord.id,
      export_type: input.exportType,
      format: input.format,
      row_count: rows.length,
      field_groups: input.fieldGroups.join(","),
      status: "generated",
    }),
  ]);

  return { ok: true, exportRecord: finalRecord, downloadUrl, blockedCount: blocked.length };
}

async function getExportById(exportId: string) {
  if (!hasLeadFlowDataApiConfig()) return null;
  const rows = await selectLeadFlowRows<LeadFlowExportRecord>("exports", {
    select: exportRecordSelect(),
    id: `eq.${exportId}`,
    deleted_at: "is.null",
    limit: 1,
  });
  return rows[0] || null;
}

export async function buildDownloadForExport(input: {
  exportId: string;
  actor: ExportActor;
  actorUserId?: string | null;
  buyerAccount?: BuyerAccount | null;
  buyerEntitlements?: BuyerEntitlement[];
}) {
  const record = await getExportById(input.exportId);
  if (!record) return { ok: false as const, status: 404, error: "Export not found." };
  const summary = record.filter_summary || {};
  const format = normalizeExportFormat(summary.format);
  let activeBuyerEntitlement: BuyerEntitlement | null = null;
  if (record.expires_at && new Date(record.expires_at).getTime() <= Date.now()) {
    await trackExportEvent(input.actor === "admin" ? "admin_export_blocked" : "buyer_export_blocked", {
      actor: input.actor,
      export_id: record.id,
      reason: "expired",
    });
    return { ok: false as const, status: 410, error: "Export link expired." };
  }
  if (input.actor === "buyer") {
    if (!input.buyerAccount || record.buyer_account_id !== input.buyerAccount.id) {
      return { ok: false as const, status: 403, error: "This export is not available to this buyer account." };
    }
    if (format !== "csv") {
      return { ok: false as const, status: 403, error: "Buyer downloads are CSV-only. JSON is admin-only." };
    }
    if (record.raw_answers_included) {
      return { ok: false as const, status: 403, error: "Buyer downloads cannot include raw or admin-only data." };
    }
    activeBuyerEntitlement = input.buyerEntitlements?.find((entitlement) => {
      if (!entitlementActive(entitlement)) return false;
      const summaryEntitlementId = textValue(summary.entitlement_id, "");
      const listingSlug = textValue(summary.listing_slug, "");
      return Boolean(
        (summaryEntitlementId && entitlement.id === summaryEntitlementId) ||
          (record.marketplace_listing_id && entitlement.listing_id === record.marketplace_listing_id) ||
          (listingSlug && entitlement.listing_slug === listingSlug) ||
          (record.lead_profile_id && entitlement.lead_profile_id === record.lead_profile_id),
      );
    }) || null;
    if (!activeBuyerEntitlement) {
      return { ok: false as const, status: 403, error: "Active entitlement required before downloading this export." };
    }
  }

  const groups = normalizeFieldGroups(summary.field_groups, input.actor, input.actor === "buyer" ? activeBuyerEntitlement?.access_level : "raw_export");
  const profileId = record.lead_profile_id || textValue(summary.profile_slug, "");
  const listingId = record.marketplace_listing_id || textValue(summary.listing_slug, "");
  const { profiles } = await resolveProfilesForExport({
    actor: input.actor,
    actorUserId: input.actorUserId,
    buyerAccount: input.buyerAccount,
    exportType: record.export_type,
    format,
    fieldGroups: groups,
    listingId,
    leadProfileId: profileId,
    reason: textValue(summary.reason, "download existing export"),
    confirmedAllowedUse: true,
    adminOverrideHighRisk: input.actor === "admin",
  });
  const rows = profiles.map((profile) => profileExportRow(profile, groups.filter((group) => input.actor === "admin" || group !== "admin")));
  const file = renderExportFile(rows, format);
  const checksum = crypto.createHash("sha256").update(file.body).digest("hex");

  await Promise.all([
    patchLeadFlowRows<LeadFlowExportRecord>("exports", { id: `eq.${record.id}` }, {
      downloaded_at: nowIso(),
      checksum_sha256: checksum,
    }).catch(() => null),
    auditExport({
      actor: input.actor,
      actorUserId: input.actorUserId,
      action: `${input.actor}_export.downloaded`,
      exportId: record.id,
      buyerAccountId: input.buyerAccount?.id || record.buyer_account_id,
      listingId: record.marketplace_listing_id,
      leadProfileId: record.lead_profile_id,
      details: {
        format,
        field_groups: groups,
        row_count: rows.length,
        raw_answers_included: input.actor === "admin" && groups.includes("admin"),
      },
    }),
  ]);

  return {
    ok: true as const,
    record,
    body: file.body,
    contentType: file.contentType,
    filename: `leadflow-export-${record.id.slice(0, 8)}.${file.extension}`,
  };
}

export function exportStatusLabel(record: LeadFlowExportRecord) {
  if (record.expires_at && new Date(record.expires_at).getTime() <= Date.now()) return "expired";
  return record.export_status;
}
