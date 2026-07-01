import { leadProfileDetails } from "@/lib/lead-profile-detail";
import {
  hasLeadFlowDataApiConfig,
  insertLeadFlowRow,
  patchLeadFlowRows,
  selectLeadFlowRows,
} from "@/lib/leadflow-data-api";
import { sanitizeLeadFlowEventProperties } from "@/lib/leadflow-events";
import { getBuyerAuthState, type SupabaseBuyerUser } from "@/lib/supabase-buyer-auth";

export type BuyerAccountStatus =
  | "pending_review"
  | "approved_basic"
  | "approved_partner"
  | "approved_premium"
  | "suspended"
  | "denied";

export type BuyerAccount = {
  id: string;
  auth_user_id: string;
  name: string | null;
  email: string;
  phone: string | null;
  company_name: string | null;
  website: string | null;
  buyer_type: string | null;
  industry: string | null;
  location_served: string | null;
  budget_range: string | null;
  intended_use: string | null;
  account_status: BuyerAccountStatus;
  approved_access_level: string;
  communication_preference: string | null;
  consent_status: string;
  created_at: string;
  updated_at: string;
  last_login_at: string | null;
};

export type BuyerRequest = {
  id: string;
  buyer_account_id: string;
  listing_id: string | null;
  listing_slug: string | null;
  request_type: string;
  message: string | null;
  intended_use: string | null;
  budget_range: string | null;
  urgency: string | null;
  status: string;
  reviewed_by: string | null;
  reviewed_at: string | null;
  admin_notes: string | null;
  admin_notes_visible: boolean;
  created_at: string;
  updated_at: string;
  metadata?: Record<string, unknown>;
};

export type BuyerEntitlement = {
  id: string;
  buyer_account_id: string;
  listing_id: string | null;
  listing_slug: string | null;
  lead_profile_id: string | null;
  access_level: string;
  starts_at: string;
  expires_at: string | null;
  status: string;
  created_at: string;
  updated_at: string;
  metadata?: Record<string, unknown>;
};

export type BuyerWatchlistItem = {
  id: string;
  buyer_account_id: string;
  listing_id: string | null;
  listing_slug: string;
  title: string;
  category: string;
  created_at: string;
};

export type BuyerListingSummary = {
  slug: string;
  title: string;
  category: string;
  vertical: string;
  score: number;
  confidence: string;
  sourceType: string;
  releaseMode: string;
  summary: string;
  restricted: boolean;
};

export type BuyerPortalData =
  | {
      authenticated: false;
      reason: "missing_config" | "missing_session" | "invalid_session";
    }
  | {
      authenticated: true;
      user: SupabaseBuyerUser;
      account: BuyerAccount | null;
      profileComplete: boolean;
      requests: BuyerRequest[];
      watchlist: BuyerWatchlistItem[];
      entitlements: BuyerEntitlement[];
      approvedListings: BuyerListingSummary[];
      pendingRequestCount: number;
      watchlistCount: number;
      accessLevel: string;
      accountStatus: BuyerAccountStatus;
    };

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

const buyerRequestSelect = [
  "id",
  "buyer_account_id",
  "listing_id",
  "listing_slug",
  "request_type",
  "message",
  "intended_use",
  "budget_range",
  "urgency",
  "status",
  "reviewed_by",
  "reviewed_at",
  "admin_notes",
  "admin_notes_visible",
  "created_at",
  "updated_at",
  "metadata",
].join(",");

const entitlementSelect = [
  "id",
  "buyer_account_id",
  "listing_id",
  "listing_slug",
  "lead_profile_id",
  "access_level",
  "starts_at",
  "expires_at",
  "status",
  "created_at",
  "updated_at",
  "metadata",
].join(",");

const watchlistSelect = [
  "id",
  "buyer_account_id",
  "listing_id",
  "listing_slug",
  "title",
  "category",
  "created_at",
].join(",");

function fallbackListingBySlug(slug: string): BuyerListingSummary {
  const profile = leadProfileDetails.find((item) => item.id === slug);
  return {
    slug,
    title: profile?.title || slug.replace(/-/g, " "),
    category: profile?.category || "Marketplace",
    vertical: profile?.vertical || "Lead signal",
    score: profile?.leadScore || 0,
    confidence: profile?.confidence || "review",
    sourceType: profile?.sourceType || "Review gated",
    releaseMode: profile?.releaseMode || "Review gated",
    summary: profile?.summary || "Approved lead signal access is gated by buyer entitlement.",
    restricted: true,
  };
}

function profileComplete(account: BuyerAccount | null) {
  return Boolean(
    account?.name &&
      account.email &&
      account.company_name &&
      account.buyer_type &&
      account.industry &&
      account.location_served &&
      account.budget_range &&
      account.intended_use,
  );
}

export function buyerCtaForPortal(data: BuyerPortalData) {
  if (!data.authenticated) return { href: "/login?mode=buyer&next=/buyer", label: "Log in as Buyer" };
  if (!data.profileComplete) return { href: "/buyer/settings", label: "Complete Buyer Profile" };
  if (data.entitlements.length > 0 && data.accountStatus !== "suspended" && data.accountStatus !== "denied") {
    return { href: "/buyer/access", label: "View Approved Signals" };
  }
  if (data.pendingRequestCount > 0) return { href: "/buyer/requests", label: "View Pending Requests" };
  return { href: "/marketplace", label: "Browse Marketplace" };
}

export function buyerAccountIsRestricted(account: BuyerAccount | null) {
  return account?.account_status === "suspended" || account?.account_status === "denied";
}

export async function getBuyerAccountByAuthUserId(authUserId: string) {
  if (!hasLeadFlowDataApiConfig()) return null;
  const rows = await selectLeadFlowRows<BuyerAccount>("buyer_accounts", {
    select: buyerAccountSelect,
    auth_user_id: `eq.${authUserId}`,
    deleted_at: "is.null",
    limit: 1,
  });
  return rows[0] || null;
}

export async function ensureBuyerAccountForUser(user: SupabaseBuyerUser) {
  const existing = await getBuyerAccountByAuthUserId(user.id);
  if (existing) return existing;

  const name = typeof user.user_metadata?.name === "string" ? user.user_metadata.name : null;
  const company = typeof user.user_metadata?.company_name === "string" ? user.user_metadata.company_name : null;
  const inserted = await insertLeadFlowRow<BuyerAccount>("buyer_accounts", {
    auth_user_id: user.id,
    owner_user_id: user.id,
    name: name || user.email,
    email: user.email,
    company_name: company,
    account_status: "pending_review",
    approved_access_level: "none",
    consent_status: "not_requested",
    status: "pending",
    review_status: "pending",
    metadata: { source: "buyer_auth_session" },
  });
  return inserted[0] || null;
}

export async function getBuyerPortalData(): Promise<BuyerPortalData> {
  const authState = await getBuyerAuthState();
  if (!authState.authenticated) return authState;

  if (!hasLeadFlowDataApiConfig()) {
    return {
      authenticated: true,
      user: authState.user,
      account: null,
      profileComplete: false,
      requests: [],
      watchlist: [],
      entitlements: [],
      approvedListings: [],
      pendingRequestCount: 0,
      watchlistCount: 0,
      accessLevel: "none",
      accountStatus: "pending_review",
    };
  }

  const account = await getBuyerAccountByAuthUserId(authState.user.id);
  if (!account) {
    return {
      authenticated: true,
      user: authState.user,
      account: null,
      profileComplete: false,
      requests: [],
      watchlist: [],
      entitlements: [],
      approvedListings: [],
      pendingRequestCount: 0,
      watchlistCount: 0,
      accessLevel: "none",
      accountStatus: "pending_review",
    };
  }

  const [requests, watchlist, entitlements] = await Promise.all([
    selectLeadFlowRows<BuyerRequest>("buyer_requests", {
      select: buyerRequestSelect,
      buyer_account_id: `eq.${account.id}`,
      order: "created_at.desc",
    }).catch(() => []),
    selectLeadFlowRows<BuyerWatchlistItem>("buyer_watchlist", {
      select: watchlistSelect,
      buyer_account_id: `eq.${account.id}`,
      order: "created_at.desc",
    }).catch(() => []),
    selectLeadFlowRows<BuyerEntitlement>("buyer_entitlements", {
      select: entitlementSelect,
      buyer_account_id: `eq.${account.id}`,
      status: "eq.active",
      order: "created_at.desc",
    }).catch(() => []),
  ]);

  const restricted = buyerAccountIsRestricted(account);
  const approvedListings = restricted
    ? []
    : entitlements.map((entitlement) => fallbackListingBySlug(entitlement.listing_slug || entitlement.lead_profile_id || entitlement.listing_id || "approved-signal"));

  return {
    authenticated: true,
    user: authState.user,
    account,
    profileComplete: profileComplete(account),
    requests,
    watchlist,
    entitlements: restricted ? [] : entitlements,
    approvedListings,
    pendingRequestCount: requests.filter((request) => ["submitted", "review", "pending_review"].includes(request.status)).length,
    watchlistCount: watchlist.length,
    accessLevel: account.approved_access_level || "none",
    accountStatus: account.account_status || "pending_review",
  };
}

export async function updateBuyerAccount(user: SupabaseBuyerUser, patch: Partial<BuyerAccount>) {
  if (!hasLeadFlowDataApiConfig()) throw new Error("LeadFlow Data API is not configured.");
  const account = await ensureBuyerAccountForUser(user);
  if (!account) throw new Error("Buyer account could not be created.");
  const updated = await patchLeadFlowRows<BuyerAccount>(
    "buyer_accounts",
    { id: `eq.${account.id}` },
    {
      ...patch,
      owner_user_id: user.id,
      auth_user_id: user.id,
      email: user.email,
      updated_at: new Date().toISOString(),
      website_url: patch.website || undefined,
    },
  );
  return updated[0] || account;
}

export async function trackBuyerEvent(eventName: string, properties: Record<string, unknown> = {}) {
  if (!hasLeadFlowDataApiConfig()) return { skipped: true };
  const safeProperties = sanitizeLeadFlowEventProperties(properties);
  await insertLeadFlowRow("events", {
    event_name: eventName,
    event_type: "buyer",
    tool_slug: "buyer_portal",
    route: typeof safeProperties.route === "string" ? safeProperties.route : "/buyer",
    auth_user_id: typeof safeProperties.auth_user_id === "string" ? safeProperties.auth_user_id : null,
    user_role: "buyer",
    source_path: "/buyer",
    properties: {
      ...safeProperties,
      user_role: "buyer",
    },
  });
  return { skipped: false };
}

export async function auditBuyerAccessView(input: {
  actorUserId: string;
  buyerAccountId: string;
  entitlementIds: string[];
  sourcePath: string;
}) {
  if (!hasLeadFlowDataApiConfig() || input.entitlementIds.length === 0) return { skipped: true };
  await insertLeadFlowRow("audit_log", {
    actor_user_id: input.actorUserId,
    actor_type: "buyer",
    action: "buyer_access.summary_viewed",
    object_schema: "leadflow",
    object_table: "buyer_entitlements",
    buyer_account_id: input.buyerAccountId,
    details: {
      source_path: input.sourcePath,
      entitlement_count: input.entitlementIds.length,
      entitlement_ids: input.entitlementIds,
      raw_records_returned: false,
    },
  });
  return { skipped: false };
}
