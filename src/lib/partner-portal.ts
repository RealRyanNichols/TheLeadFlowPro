import "server-only";

import {
  hasLeadFlowDataApiConfig,
  insertLeadFlowRow,
  patchLeadFlowRows,
  selectLeadFlowRows,
} from "@/lib/leadflow-data-api";
import { sanitizeLeadFlowEventProperties } from "@/lib/leadflow-events";
import { getBuyerAuthState, type SupabaseBuyerUser } from "@/lib/supabase-buyer-auth";

export type PartnerType =
  | "source_contributor"
  | "agency_partner"
  | "creator_partner"
  | "local_operator"
  | "research_partner"
  | "referral_partner"
  | "data_partner"
  | "client_partner";

export type PartnerStatus = "pending_review" | "approved" | "restricted" | "suspended" | "denied";

export type PartnerAccount = {
  id: string;
  auth_user_id: string | null;
  owner_user_id: string | null;
  name: string;
  email: string | null;
  phone: string | null;
  company: string | null;
  legal_name?: string | null;
  company_name?: string | null;
  website: string | null;
  website_url?: string | null;
  partner_type: PartnerType;
  payout_preference: string | null;
  status: PartnerStatus;
  admin_notes: string | null;
  admin_notes_visible: boolean;
  compliance_confirmations: Record<string, unknown>;
  created_at: string;
  updated_at: string;
  last_login_at: string | null;
  metadata?: Record<string, unknown>;
};

export type PartnerSource = {
  id: string;
  partner_account_id: string;
  submitted_source_id: string | null;
  marketplace_listing_id: string | null;
  source_name: string;
  source_type: string;
  source_url: string | null;
  review_result: string | null;
  risk_level: string;
  source_status: string;
  marketplace_status: string;
  buyer_requests_generated: number;
  estimated_earnings: number | string;
  partner_visible_admin_notes: string | null;
  created_at: string;
  updated_at: string;
};

export type PartnerEarning = {
  id: string;
  partner_account_id: string;
  source_id: string | null;
  listing_id: string | null;
  buyer_request_id: string | null;
  earning_type: string;
  amount: number | string;
  status: string;
  calculation_note: string | null;
  created_at: string;
  approved_at: string | null;
  paid_at: string | null;
};

export type PartnerPayout = {
  id: string;
  partner_account_id: string;
  payout_preference: string | null;
  amount: number | string;
  status: string;
  period_start: string | null;
  period_end: string | null;
  admin_notes: string | null;
  approved_at: string | null;
  paid_at: string | null;
  created_at: string;
};

export type PartnerPortalData =
  | {
      authenticated: false;
      reason: "missing_config" | "missing_session" | "invalid_session";
      loadErrors?: string[];
    }
  | {
      authenticated: true;
      user: SupabaseBuyerUser;
      account: PartnerAccount | null;
      profileComplete: boolean;
      sources: PartnerSource[];
      submissions: PartnerSource[];
      earnings: PartnerEarning[];
      payouts: PartnerPayout[];
      status: PartnerStatus;
      sourceCount: number;
      marketplaceCount: number;
      buyerInterestCount: number;
      earningsSummary: PartnerEarningsSummary;
      loadErrors: string[];
    };

export type PartnerEarningsSummary = {
  totalEstimated: number;
  approved: number;
  pending: number;
  paid: number;
  sourceBased: number;
  referral: number;
  listingBased: number;
};

export type AdminPartnerDashboardData = {
  mode: "live" | "offline";
  loadErrors: string[];
  partners: PartnerAccount[];
  sources: PartnerSource[];
  earnings: PartnerEarning[];
  payouts: PartnerPayout[];
  stats: {
    pendingApplications: number;
    approvedPartners: number;
    restrictedPartners: number;
    suspendedPartners: number;
    sourcesNeedingReview: number;
    estimatedEarnings: number;
    approvedEarnings: number;
    paidEarnings: number;
  };
};

const partnerAccountSelect = [
  "id",
  "auth_user_id",
  "owner_user_id",
  "name",
  "email",
  "phone",
  "company",
  "legal_name",
  "website",
  "website_url",
  "partner_type",
  "payout_preference",
  "status",
  "admin_notes",
  "admin_notes_visible",
  "compliance_confirmations",
  "created_at",
  "updated_at",
  "last_login_at",
  "metadata",
].join(",");

const partnerSourceSelect = [
  "id",
  "partner_account_id",
  "submitted_source_id",
  "marketplace_listing_id",
  "source_name",
  "source_type",
  "source_url",
  "review_result",
  "risk_level",
  "source_status",
  "marketplace_status",
  "buyer_requests_generated",
  "estimated_earnings",
  "partner_visible_admin_notes",
  "created_at",
  "updated_at",
].join(",");

const partnerEarningSelect = [
  "id",
  "partner_account_id",
  "source_id",
  "listing_id",
  "buyer_request_id",
  "earning_type",
  "amount",
  "status",
  "calculation_note",
  "created_at",
  "approved_at",
  "paid_at",
].join(",");

const partnerPayoutSelect = [
  "id",
  "partner_account_id",
  "payout_preference",
  "amount",
  "status",
  "period_start",
  "period_end",
  "admin_notes",
  "approved_at",
  "paid_at",
  "created_at",
].join(",");

const demoNow = new Date();
const demoIso = (daysAgo: number) => new Date(demoNow.getTime() - daysAgo * 24 * 60 * 60 * 1000).toISOString();

const fallbackPartner: PartnerAccount = {
  id: "demo-partner",
  auth_user_id: null,
  owner_user_id: null,
  name: "Demo Source Partner",
  email: "partner-demo@example.com",
  phone: null,
  company: "Demo Partner Co",
  website: "https://example.com",
  partner_type: "source_contributor",
  payout_preference: "Manual review",
  status: "pending_review",
  admin_notes: "Safe demo partner. Connect Supabase to load live partner records.",
  admin_notes_visible: true,
  compliance_confirmations: {
    rights_to_submit: true,
    no_prohibited_data: true,
    review_gated: true,
    no_guaranteed_payment: true,
  },
  created_at: demoIso(5),
  updated_at: demoIso(1),
  last_login_at: null,
};

const fallbackSources: PartnerSource[] = [
  {
    id: "demo-partner-source",
    partner_account_id: "demo-partner",
    submitted_source_id: null,
    marketplace_listing_id: null,
    source_name: "Demo local service route",
    source_type: "local_service_route",
    source_url: "https://example.com/demo-route",
    review_result: "Needs source proof review before marketplace release.",
    risk_level: "medium",
    source_status: "needs_review",
    marketplace_status: "not_listed",
    buyer_requests_generated: 2,
    estimated_earnings: 125,
    partner_visible_admin_notes: "Demo note visible to the partner.",
    created_at: demoIso(4),
    updated_at: demoIso(1),
  },
];

const fallbackEarnings: PartnerEarning[] = [
  {
    id: "demo-partner-earning",
    partner_account_id: "demo-partner",
    source_id: "demo-partner-source",
    listing_id: null,
    buyer_request_id: null,
    earning_type: "source_submission_bonus",
    amount: 25,
    status: "estimated",
    calculation_note: "Demo estimate only. Partner earnings are review-gated and not guaranteed.",
    created_at: demoIso(3),
    approved_at: null,
    paid_at: null,
  },
];

function asNumber(value: number | string | null | undefined) {
  if (typeof value === "number") return Number.isFinite(value) ? value : 0;
  if (typeof value === "string") {
    const parsed = Number(value);
    return Number.isFinite(parsed) ? parsed : 0;
  }
  return 0;
}

function normalizePartnerAccount(row: PartnerAccount): PartnerAccount {
  return {
    ...row,
    email: row.email || null,
    company: row.company || row.legal_name || row.company_name || null,
    website: row.website || row.website_url || null,
    partner_type: row.partner_type || "source_contributor",
    status: row.status || "pending_review",
    admin_notes_visible: Boolean(row.admin_notes_visible),
    compliance_confirmations: row.compliance_confirmations || {},
  };
}

export function partnerProfileComplete(account: PartnerAccount | null) {
  return Boolean(
    account?.name &&
      account.email &&
      account.company &&
      account.partner_type &&
      account.payout_preference &&
      account.compliance_confirmations?.rights_to_submit &&
      account.compliance_confirmations?.no_prohibited_data &&
      account.compliance_confirmations?.review_gated &&
      account.compliance_confirmations?.no_guaranteed_payment,
  );
}

export function summarizePartnerEarnings(earnings: PartnerEarning[]): PartnerEarningsSummary {
  return earnings.reduce<PartnerEarningsSummary>(
    (acc, earning) => {
      const amount = asNumber(earning.amount);
      if (earning.status === "estimated") acc.totalEstimated += amount;
      if (earning.status === "approved") acc.approved += amount;
      if (earning.status === "pending") acc.pending += amount;
      if (earning.status === "paid") acc.paid += amount;
      if (["source_submission_bonus", "manual_adjustment"].includes(earning.earning_type)) acc.sourceBased += amount;
      if (earning.earning_type === "referral_commission") acc.referral += amount;
      if (["marketplace_sale_share", "exclusive_listing_bonus"].includes(earning.earning_type)) acc.listingBased += amount;
      return acc;
    },
    {
      totalEstimated: 0,
      approved: 0,
      pending: 0,
      paid: 0,
      sourceBased: 0,
      referral: 0,
      listingBased: 0,
    },
  );
}

export function partnerCtaForPortal(data: PartnerPortalData) {
  if (!data.authenticated) return { href: "/partner/login?next=/partner", label: "Partner login" };
  if (!data.profileComplete) return { href: "/partner/settings", label: "Complete Partner Profile" };
  if (data.sources.length === 0) return { href: "/submit-source", label: "Submit Source" };
  if (data.earnings.length > 0) return { href: "/partner/earnings", label: "View Earnings" };
  return { href: "/partner/sources", label: "Review Sources" };
}

export function partnerAccountIsRestricted(account: PartnerAccount | null) {
  return account?.status === "suspended" || account?.status === "denied";
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

export async function getPartnerAccountByAuthUserId(authUserId: string, errors: string[] = []) {
  if (!hasLeadFlowDataApiConfig()) return null;
  const rows = await safeSelect<PartnerAccount>(
    "partner_accounts",
    {
      select: partnerAccountSelect,
      auth_user_id: `eq.${authUserId}`,
      deleted_at: "is.null",
      limit: 1,
    },
    errors,
  );
  return rows[0] ? normalizePartnerAccount(rows[0]) : null;
}

export async function ensurePartnerAccountForUser(user: SupabaseBuyerUser) {
  if (!hasLeadFlowDataApiConfig()) return null;
  const errors: string[] = [];
  const existing = await getPartnerAccountByAuthUserId(user.id, errors);
  if (existing) return existing;

  const name = typeof user.user_metadata?.name === "string" ? user.user_metadata.name : user.email;
  const company = typeof user.user_metadata?.company_name === "string" ? user.user_metadata.company_name : null;
  const inserted = await insertLeadFlowRow<PartnerAccount>("partner_accounts", {
    auth_user_id: user.id,
    owner_user_id: user.id,
    name,
    email: user.email,
    company,
    legal_name: company,
    partner_type: "source_contributor",
    payout_preference: "manual_review",
    status: "pending_review",
    lifecycle_stage: "known",
    vertical: "general",
    metadata: { source: "partner_auth_session" },
  });
  return inserted[0] ? normalizePartnerAccount(inserted[0]) : null;
}

export async function getPartnerPortalData(): Promise<PartnerPortalData> {
  const authState = await getBuyerAuthState();
  if (!authState.authenticated) return authState;

  const loadErrors: string[] = [];
  if (!hasLeadFlowDataApiConfig()) {
    return {
      authenticated: true,
      user: authState.user,
      account: fallbackPartner,
      profileComplete: false,
      sources: fallbackSources,
      submissions: fallbackSources,
      earnings: fallbackEarnings,
      payouts: [],
      status: "pending_review",
      sourceCount: fallbackSources.length,
      marketplaceCount: 0,
      buyerInterestCount: fallbackSources.reduce((sum, source) => sum + source.buyer_requests_generated, 0),
      earningsSummary: summarizePartnerEarnings(fallbackEarnings),
      loadErrors: ["LeadFlow Supabase Data API is not configured. Showing safe partner preview data."],
    };
  }

  const account = await getPartnerAccountByAuthUserId(authState.user.id, loadErrors);
  if (!account) {
    return {
      authenticated: true,
      user: authState.user,
      account: null,
      profileComplete: false,
      sources: [],
      submissions: [],
      earnings: [],
      payouts: [],
      status: "pending_review",
      sourceCount: 0,
      marketplaceCount: 0,
      buyerInterestCount: 0,
      earningsSummary: summarizePartnerEarnings([]),
      loadErrors,
    };
  }

  const [sources, earnings, payouts] = await Promise.all([
    safeSelect<PartnerSource>("partner_sources", {
      select: partnerSourceSelect,
      partner_account_id: `eq.${account.id}`,
      deleted_at: "is.null",
      order: "updated_at.desc",
    }, loadErrors),
    safeSelect<PartnerEarning>("partner_earnings", {
      select: partnerEarningSelect,
      partner_account_id: `eq.${account.id}`,
      deleted_at: "is.null",
      order: "created_at.desc",
    }, loadErrors),
    safeSelect<PartnerPayout>("partner_payouts", {
      select: partnerPayoutSelect,
      partner_account_id: `eq.${account.id}`,
      deleted_at: "is.null",
      order: "created_at.desc",
    }, loadErrors),
  ]);

  const restricted = partnerAccountIsRestricted(account);
  const visibleSources = restricted ? [] : sources;
  const visibleEarnings = restricted ? [] : earnings;

  return {
    authenticated: true,
    user: authState.user,
    account,
    profileComplete: partnerProfileComplete(account),
    sources: visibleSources,
    submissions: visibleSources,
    earnings: visibleEarnings,
    payouts: restricted ? [] : payouts,
    status: account.status,
    sourceCount: visibleSources.length,
    marketplaceCount: visibleSources.filter((source) => source.marketplace_status !== "not_listed").length,
    buyerInterestCount: visibleSources.reduce((sum, source) => sum + Number(source.buyer_requests_generated || 0), 0),
    earningsSummary: summarizePartnerEarnings(visibleEarnings),
    loadErrors,
  };
}

export async function updatePartnerAccount(user: SupabaseBuyerUser, patch: Partial<PartnerAccount>) {
  if (!hasLeadFlowDataApiConfig()) throw new Error("LeadFlow Data API is not configured.");
  const account = await ensurePartnerAccountForUser(user);
  if (!account) throw new Error("Partner account could not be created.");

  const updated = await patchLeadFlowRows<PartnerAccount>(
    "partner_accounts",
    { id: `eq.${account.id}` },
    {
      name: patch.name,
      phone: patch.phone || null,
      company: patch.company || null,
      legal_name: patch.company || account.legal_name || null,
      website: patch.website || null,
      website_url: patch.website || account.website_url || null,
      partner_type: patch.partner_type || account.partner_type,
      payout_preference: patch.payout_preference || null,
      compliance_confirmations: patch.compliance_confirmations || account.compliance_confirmations || {},
      email: user.email,
      auth_user_id: user.id,
      owner_user_id: account.owner_user_id || user.id,
      updated_at: new Date().toISOString(),
    },
  );
  return updated[0] ? normalizePartnerAccount(updated[0]) : account;
}

export async function trackPartnerEvent(eventName: string, properties: Record<string, unknown> = {}) {
  if (!hasLeadFlowDataApiConfig()) return { skipped: true };
  const safeProperties = sanitizeLeadFlowEventProperties(properties);
  await insertLeadFlowRow("events", {
    event_name: eventName,
    event_type: "partner",
    tool_slug: "partner_portal",
    route: typeof safeProperties.route === "string" ? safeProperties.route : "/partner",
    auth_user_id: typeof safeProperties.auth_user_id === "string" ? safeProperties.auth_user_id : null,
    user_role: "partner",
    source_path: "/partner",
    properties: {
      ...safeProperties,
      user_role: "partner",
    },
  }).catch(() => null);
  return { skipped: false };
}

function buildAdminStats(input: Pick<AdminPartnerDashboardData, "partners" | "sources" | "earnings">): AdminPartnerDashboardData["stats"] {
  return {
    pendingApplications: input.partners.filter((partner) => partner.status === "pending_review").length,
    approvedPartners: input.partners.filter((partner) => partner.status === "approved").length,
    restrictedPartners: input.partners.filter((partner) => partner.status === "restricted").length,
    suspendedPartners: input.partners.filter((partner) => partner.status === "suspended").length,
    sourcesNeedingReview: input.sources.filter((source) => ["submitted", "needs_review", "needs_permission"].includes(source.source_status)).length,
    estimatedEarnings: input.earnings.filter((earning) => earning.status === "estimated").reduce((sum, earning) => sum + asNumber(earning.amount), 0),
    approvedEarnings: input.earnings.filter((earning) => earning.status === "approved").reduce((sum, earning) => sum + asNumber(earning.amount), 0),
    paidEarnings: input.earnings.filter((earning) => earning.status === "paid").reduce((sum, earning) => sum + asNumber(earning.amount), 0),
  };
}

export async function getAdminPartnerDashboardData(adminEmail?: string): Promise<AdminPartnerDashboardData> {
  if (!hasLeadFlowDataApiConfig()) {
    const offline = {
      partners: [fallbackPartner],
      sources: fallbackSources,
      earnings: fallbackEarnings,
      payouts: [] as PartnerPayout[],
    };
    return {
      mode: "offline",
      loadErrors: ["LeadFlow Supabase Data API is not configured. Showing safe partner preview data."],
      ...offline,
      stats: buildAdminStats(offline),
    };
  }

  const loadErrors: string[] = [];
  const [partners, sources, earnings, payouts] = await Promise.all([
    safeSelect<PartnerAccount>("partner_accounts", {
      select: partnerAccountSelect,
      deleted_at: "is.null",
      order: "updated_at.desc",
      limit: 100,
    }, loadErrors),
    safeSelect<PartnerSource>("partner_sources", {
      select: partnerSourceSelect,
      deleted_at: "is.null",
      order: "updated_at.desc",
      limit: 200,
    }, loadErrors),
    safeSelect<PartnerEarning>("partner_earnings", {
      select: partnerEarningSelect,
      deleted_at: "is.null",
      order: "created_at.desc",
      limit: 200,
    }, loadErrors),
    safeSelect<PartnerPayout>("partner_payouts", {
      select: partnerPayoutSelect,
      deleted_at: "is.null",
      order: "created_at.desc",
      limit: 100,
    }, loadErrors),
  ]);

  await insertLeadFlowRow("events", {
    event_name: "admin_partner_reviewed",
    event_type: "server",
    route: "/dashboard/partners",
    user_role: "admin",
    source_path: "/dashboard/partners",
    properties: {
      admin_allowlist_match: Boolean(adminEmail),
      partner_rows: partners.length,
      load_errors: loadErrors.length,
    },
  }).catch(() => null);

  const normalized = {
    partners: partners.map(normalizePartnerAccount),
    sources,
    earnings,
    payouts,
  };

  return {
    mode: "live",
    loadErrors,
    ...normalized,
    stats: buildAdminStats(normalized),
  };
}

export function partnerStatusLabel(status: PartnerStatus) {
  return status.replace(/_/g, " ");
}

export function partnerTypeLabel(type: PartnerType | string) {
  return type.replace(/_/g, " ");
}
