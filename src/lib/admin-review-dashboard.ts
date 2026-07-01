import "server-only";

import { hasLeadFlowDataApiConfig, insertLeadFlowRow, selectLeadFlowRows } from "@/lib/leadflow-data-api";

export type AdminLeadProfileRow = {
  id: string;
  title: string;
  vertical: string;
  category: string | null;
  score: number | string | null;
  confidence: number | string | null;
  source_proof_status: string;
  suppression_status: string;
  review_status: string;
  status: string;
  created_at: string;
  updated_at: string;
};

export type AdminMarketplaceListingRow = {
  id: string;
  title: string;
  vertical: string;
  category: string | null;
  listing_status: string;
  review_status: string;
  release_mode: string;
  sample_count: number | null;
  price_cents: number | null;
  created_at: string;
  updated_at: string;
};

export type AdminSubmittedSourceRow = {
  id: string;
  contributor_id: string | null;
  source_name: string;
  source_type: string;
  origin_type: string;
  risk_level: string;
  review_status: string;
  vertical: string;
  categories: string[];
  created_at: string;
};

export type AdminBuyerRequestRow = {
  id: string;
  buyer_account_id: string | null;
  listing_id: string | null;
  listing_slug: string | null;
  request_type: string;
  intended_use: string | null;
  budget_range: string | null;
  status: string;
  review_status: string;
  created_at: string;
};

export type AdminBuyerAccountRow = {
  id: string;
  name: string | null;
  email: string;
  company_name: string | null;
};

export type AdminContributorAccountRow = {
  id: string;
  name: string;
  company_name: string | null;
};

export type AdminSourceProofRow = {
  id: string;
  lead_profile_id: string | null;
  submitted_source_id?: string | null;
  proof_type: string;
  source_label: string | null;
  status: string;
  review_status: string;
  confidence: number | string | null;
  created_at: string;
};

export type AdminSuppressionRow = {
  id: string;
  identity_id: string | null;
  lead_profile_id: string | null;
  suppression_type: string;
  reason: string | null;
  status: string;
  created_at: string;
};

export type AdminExportRow = {
  id: string;
  buyer_account_id: string | null;
  marketplace_listing_id: string | null;
  lead_profile_id: string | null;
  export_type: string;
  export_status: string;
  row_count: number;
  raw_answers_included: boolean;
  storage_path: string | null;
  created_by_user_id: string | null;
  created_at: string;
};

export type AdminAuditRow = {
  id: string;
  actor_type: string;
  action: string;
  object_table: string;
  object_id: string | null;
  buyer_account_id: string | null;
  lead_profile_id: string | null;
  marketplace_listing_id: string | null;
  created_at: string;
};

export type AdminEventRow = {
  id: string;
  event_name: string;
  event_type: string;
  vertical: string | null;
  category: string | null;
  source_path: string | null;
  created_at: string;
};

export type AdminReviewDashboardData = {
  mode: "live" | "offline";
  loadErrors: string[];
  profiles: AdminLeadProfileRow[];
  listings: AdminMarketplaceListingRow[];
  sources: AdminSubmittedSourceRow[];
  buyerRequests: AdminBuyerRequestRow[];
  buyerAccounts: AdminBuyerAccountRow[];
  contributorAccounts: AdminContributorAccountRow[];
  sourceProofs: AdminSourceProofRow[];
  suppressions: AdminSuppressionRow[];
  exports: AdminExportRow[];
  auditLog: AdminAuditRow[];
  events: AdminEventRow[];
  stats: {
    newSourceSubmissions: number;
    profilesNeedingReview: number;
    buyerAccessRequests: number;
    suppressionRequests: number;
    approvedMarketplaceListings: number;
    recentExports: number;
    highScoreProfiles: number;
    flaggedRiskItems: number;
    averageConfidenceScore: number;
    profilesCreatedThisWeek: number;
    sourcesSubmittedThisWeek: number;
    profilesByStatus: Record<string, number>;
    requestsByStatus: Record<string, number>;
    listingsByVertical: Record<string, number>;
  };
};

const now = new Date();
const day = 24 * 60 * 60 * 1000;
const iso = (daysAgo: number) => new Date(now.getTime() - daysAgo * day).toISOString();

const fallbackData = {
  profiles: [
    {
      id: "demo-profile-ecommerce",
      title: "Ecommerce Vendor Signal Pack",
      vertical: "Ecommerce",
      category: "Vendor signals",
      score: 87,
      confidence: 0.82,
      source_proof_status: "review",
      suppression_status: "unchecked",
      review_status: "review",
      status: "sample_available",
      created_at: iso(1),
      updated_at: iso(0),
    },
    {
      id: "demo-profile-contractor",
      title: "Local Contractor Website Leak Batch",
      vertical: "Home services",
      category: "Contractors",
      score: 79,
      confidence: 0.68,
      source_proof_status: "submitted",
      suppression_status: "unchecked",
      review_status: "pending",
      status: "draft",
      created_at: iso(4),
      updated_at: iso(2),
    },
  ] satisfies AdminLeadProfileRow[],
  listings: [
    {
      id: "demo-listing-ecommerce",
      title: "Ecommerce Vendor Signal Pack",
      vertical: "Ecommerce",
      category: "Vendor signals",
      listing_status: "sample_available",
      review_status: "approved",
      release_mode: "review_gated",
      sample_count: 25,
      price_cents: 14900,
      created_at: iso(2),
      updated_at: iso(0),
    },
  ] satisfies AdminMarketplaceListingRow[],
  sources: [
    {
      id: "demo-source-directory",
      contributor_id: "demo-contributor",
      source_name: "East Texas Contractor Directory",
      source_type: "website_directory",
      origin_type: "public_website",
      risk_level: "medium",
      review_status: "submitted",
      vertical: "Home services",
      categories: ["Public directory", "Local route"],
      created_at: iso(0),
    },
  ] satisfies AdminSubmittedSourceRow[],
  buyerRequests: [
    {
      id: "demo-buyer-request",
      buyer_account_id: "demo-buyer",
      listing_id: "demo-listing-ecommerce",
      listing_slug: "ecommerce-vendor-signal-pack",
      request_type: "sample",
      intended_use: "Review ecommerce vendor fit before buying access.",
      budget_range: "$100 to $500",
      status: "submitted",
      review_status: "pending",
      created_at: iso(1),
    },
  ] satisfies AdminBuyerRequestRow[],
  buyerAccounts: [
    {
      id: "demo-buyer",
      name: "Review Buyer",
      email: "redacted@example.com",
      company_name: "Signal Buyer Co",
    },
  ] satisfies AdminBuyerAccountRow[],
  contributorAccounts: [
    {
      id: "demo-contributor",
      name: "Source Contributor",
      company_name: "Local Operator",
    },
  ] satisfies AdminContributorAccountRow[],
  sourceProofs: [
    {
      id: "demo-proof",
      lead_profile_id: "demo-profile-ecommerce",
      submitted_source_id: null,
      proof_type: "public_marketplace",
      source_label: "Public category and platform clue",
      status: "review",
      review_status: "pending",
      confidence: 0.72,
      created_at: iso(2),
    },
  ] satisfies AdminSourceProofRow[],
  suppressions: [
    {
      id: "demo-suppression",
      identity_id: null,
      lead_profile_id: "demo-profile-contractor",
      suppression_type: "do_not_contact",
      reason: "Demo suppression review item",
      status: "active",
      created_at: iso(3),
    },
  ] satisfies AdminSuppressionRow[],
  exports: [
    {
      id: "demo-export",
      buyer_account_id: "demo-buyer",
      marketplace_listing_id: "demo-listing-ecommerce",
      lead_profile_id: null,
      export_type: "sample",
      export_status: "queued",
      row_count: 25,
      raw_answers_included: false,
      storage_path: null,
      created_by_user_id: null,
      created_at: iso(2),
    },
  ] satisfies AdminExportRow[],
  auditLog: [
    {
      id: "demo-audit",
      actor_type: "system",
      action: "source_submission.submitted",
      object_table: "submitted_sources",
      object_id: "demo-source-directory",
      buyer_account_id: null,
      lead_profile_id: null,
      marketplace_listing_id: null,
      created_at: iso(0),
    },
  ] satisfies AdminAuditRow[],
  events: [
    {
      id: "demo-event",
      event_name: "source_submission_completed",
      event_type: "server",
      vertical: "Home services",
      category: "Public directory",
      source_path: "/submit-source",
      created_at: iso(0),
    },
  ] satisfies AdminEventRow[],
};

function asNumber(value: number | string | null | undefined) {
  if (typeof value === "number") return Number.isFinite(value) ? value : 0;
  if (typeof value === "string") {
    const parsed = Number(value);
    return Number.isFinite(parsed) ? parsed : 0;
  }
  return 0;
}

function countBy<T>(rows: T[], key: (row: T) => string | null | undefined) {
  return rows.reduce<Record<string, number>>((acc, row) => {
    const value = key(row) || "unknown";
    acc[value] = (acc[value] || 0) + 1;
    return acc;
  }, {});
}

function isThisWeek(value: string) {
  const date = new Date(value).getTime();
  return Number.isFinite(date) && date >= now.getTime() - 7 * day;
}

function buildStats(input: Omit<AdminReviewDashboardData, "mode" | "loadErrors" | "stats">): AdminReviewDashboardData["stats"] {
  const confidenceValues = input.profiles.map((row) => asNumber(row.confidence)).filter((value) => value > 0);
  const confidenceAverage = confidenceValues.length
    ? confidenceValues.reduce((sum, value) => sum + value, 0) / confidenceValues.length
    : 0;
  const confidenceScale = confidenceAverage <= 1 ? confidenceAverage * 100 : confidenceAverage;

  return {
    newSourceSubmissions: input.sources.filter((row) => ["submitted", "needs_review", "needs_permission"].includes(row.review_status)).length,
    profilesNeedingReview: input.profiles.filter((row) => ["pending", "review"].includes(row.review_status)).length,
    buyerAccessRequests: input.buyerRequests.filter((row) => ["submitted", "pending_review", "review"].includes(row.status)).length,
    suppressionRequests: input.suppressions.filter((row) => !["resolved", "denied", "duplicate"].includes(row.status)).length,
    approvedMarketplaceListings: input.listings.filter((row) => row.review_status === "approved").length,
    recentExports: input.exports.filter((row) => isThisWeek(row.created_at)).length,
    highScoreProfiles: input.profiles.filter((row) => asNumber(row.score) >= 80).length,
    flaggedRiskItems: input.sources.filter((row) => ["high", "prohibited"].includes(row.risk_level)).length,
    averageConfidenceScore: Math.round(confidenceScale),
    profilesCreatedThisWeek: input.profiles.filter((row) => isThisWeek(row.created_at)).length,
    sourcesSubmittedThisWeek: input.sources.filter((row) => isThisWeek(row.created_at)).length,
    profilesByStatus: countBy(input.profiles, (row) => row.review_status),
    requestsByStatus: countBy(input.buyerRequests, (row) => row.status),
    listingsByVertical: countBy(input.listings, (row) => row.vertical),
  };
}

async function safeSelect<T>(
  table: string,
  params: Record<string, string | number | boolean | null | undefined>,
  errors: string[],
) {
  try {
    return await selectLeadFlowRows<T>(table, params);
  } catch (error) {
    errors.push(`${table}: ${error instanceof Error ? error.message : "query failed"}`);
    return [];
  }
}

export async function getAdminReviewDashboardData(adminEmail: string): Promise<AdminReviewDashboardData> {
  if (!hasLeadFlowDataApiConfig()) {
    const offline = { ...fallbackData };
    return {
      mode: "offline",
      loadErrors: ["LeadFlow Supabase Data API is not configured. Showing safe test rows."],
      ...offline,
      stats: buildStats(offline),
    };
  }

  const loadErrors: string[] = [];
  const [
    profiles,
    listings,
    sources,
    buyerRequests,
    buyerAccounts,
    contributorAccounts,
    sourceProofs,
    suppressions,
    exports,
    auditLog,
    events,
  ] = await Promise.all([
    safeSelect<AdminLeadProfileRow>("lead_profiles", {
      select: "id,title,vertical,category,score,confidence,source_proof_status,suppression_status,review_status,status,created_at,updated_at",
      deleted_at: "is.null",
      order: "updated_at.desc",
      limit: 75,
    }, loadErrors),
    safeSelect<AdminMarketplaceListingRow>("marketplace_listings", {
      select: "id,title,vertical,category,listing_status,review_status,release_mode,sample_count,price_cents,created_at,updated_at",
      deleted_at: "is.null",
      order: "updated_at.desc",
      limit: 75,
    }, loadErrors),
    safeSelect<AdminSubmittedSourceRow>("submitted_sources", {
      select: "id,contributor_id,source_name,source_type,origin_type,risk_level,review_status,vertical,categories,created_at",
      deleted_at: "is.null",
      order: "created_at.desc",
      limit: 75,
    }, loadErrors),
    safeSelect<AdminBuyerRequestRow>("buyer_requests", {
      select: "id,buyer_account_id,listing_id,listing_slug,request_type,intended_use,budget_range,status,review_status,created_at",
      order: "created_at.desc",
      limit: 75,
    }, loadErrors),
    safeSelect<AdminBuyerAccountRow>("buyer_accounts", {
      select: "id,name,email,company_name",
      deleted_at: "is.null",
      order: "created_at.desc",
      limit: 100,
    }, loadErrors),
    safeSelect<AdminContributorAccountRow>("contributor_accounts", {
      select: "id,name,company_name",
      order: "created_at.desc",
      limit: 100,
    }, loadErrors),
    safeSelect<AdminSourceProofRow>("source_proofs", {
      select: "id,lead_profile_id,submitted_source_id,proof_type,source_label,status,review_status,confidence,created_at",
      order: "created_at.desc",
      limit: 75,
    }, loadErrors),
    safeSelect<AdminSuppressionRow>("suppression_requests", {
      select: "id,identity_id,lead_profile_id,suppression_type,reason,status,created_at",
      deleted_at: "is.null",
      order: "created_at.desc",
      limit: 75,
    }, loadErrors),
    safeSelect<AdminExportRow>("exports", {
      select: "id,buyer_account_id,marketplace_listing_id,lead_profile_id,export_type,export_status,row_count,raw_answers_included,storage_path,created_by_user_id,created_at",
      deleted_at: "is.null",
      order: "created_at.desc",
      limit: 75,
    }, loadErrors),
    safeSelect<AdminAuditRow>("audit_log", {
      select: "id,actor_type,action,object_table,object_id,buyer_account_id,lead_profile_id,marketplace_listing_id,created_at",
      order: "created_at.desc",
      limit: 100,
    }, loadErrors),
    safeSelect<AdminEventRow>("events", {
      select: "id,event_name,event_type,vertical,category,source_path,created_at",
      order: "created_at.desc",
      limit: 100,
    }, loadErrors),
  ]);

  await insertLeadFlowRow("events", {
    event_name: "admin_dashboard_viewed",
    event_type: "server",
    route: "/dashboard",
    user_role: "admin",
    source_path: "/dashboard",
    properties: {
      user_role: "admin",
      admin_allowlist_match: Boolean(adminEmail),
      load_errors: loadErrors.length,
    },
  }).catch(() => null);

  const live = {
    profiles,
    listings,
    sources,
    buyerRequests,
    buyerAccounts,
    contributorAccounts,
    sourceProofs,
    suppressions,
    exports,
    auditLog,
    events,
  };

  return {
    mode: "live",
    loadErrors,
    ...live,
    stats: buildStats(live),
  };
}
