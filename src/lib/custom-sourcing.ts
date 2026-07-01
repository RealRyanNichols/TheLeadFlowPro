import "server-only";

import {
  getBuyerPortalData,
  type BuyerAccount,
} from "@/lib/buyer-portal";
import {
  hasLeadFlowDataApiConfig,
  insertLeadFlowRow,
  patchLeadFlowRows,
  selectLeadFlowRows,
} from "@/lib/leadflow-data-api";
import { sanitizeLeadFlowEventProperties } from "@/lib/leadflow-events";

export const CUSTOM_SOURCING_STATUSES = [
  "submitted",
  "needs_review",
  "feasible",
  "not_feasible",
  "needs_more_info",
  "quoted",
  "accepted",
  "rejected",
  "in_progress",
  "completed",
  "archived",
] as const;

export const CUSTOM_SOURCING_ADMIN_ACTIONS = [
  "review",
  "rescore",
  "quote",
  "attach_segment",
  "create_product_factory_run",
  "convert_to_marketplace_listing",
  "request_more_info",
  "reject",
  "mark_in_progress",
  "mark_completed",
  "archive",
  "accept",
] as const;

export type CustomSourcingStatus = (typeof CUSTOM_SOURCING_STATUSES)[number];
export type CustomSourcingAdminAction = (typeof CUSTOM_SOURCING_ADMIN_ACTIONS)[number];

export type CustomSourcingSubmission = {
  industry: string;
  vertical: string;
  leadType: string;
  buyerType: string;
  geography: string;
  sourcePreference: string;
  offer: string;
  targetCustomer: string;
  problemSolved: string;
  idealLead: string;
  badFitLead: string;
  urgency: string;
  desiredFields: string[];
  intendedUse: string[];
  budgetRange: string;
  desiredVolume: string;
  accessPreference: string;
  timeline: string;
  sampleFirst: boolean;
  notes: string;
  name: string;
  email: string;
  phone: string;
  company: string;
  website: string;
  consentToContact: boolean;
  reviewGatedAccepted: boolean;
  sourcePath: string;
};

export type FeasibilityBreakdown = {
  clearIndustry: number;
  clearBuyerType: number;
  clearGeography: number;
  sourceLikelihood: number;
  budgetFit: number;
  timelineFit: number;
  complianceRisk: number;
  desiredFieldsAvailability: number;
  exclusivityComplexity: number;
};

export type FeasibilityResult = {
  score: number;
  label: "Strong candidate" | "Feasible" | "Needs review" | "High friction";
  breakdown: FeasibilityBreakdown;
  reasons: string[];
  warnings: string[];
  nextAction: string;
};

export type CustomSourcingRequestRow = {
  id: string;
  buyer_account_id: string | null;
  buyer_request_id: string | null;
  product_factory_run_id: string | null;
  marketplace_listing_id: string | null;
  attached_segment_id: string | null;
  name: string;
  email: string;
  phone: string | null;
  company: string;
  website: string | null;
  industry: string;
  vertical: string;
  lead_type: string;
  buyer_type: string;
  geography: string;
  source_preference: string;
  offer: string;
  target_customer: string;
  problem_solved: string;
  ideal_lead: string;
  bad_fit_lead: string | null;
  urgency: string | null;
  intended_use: string[];
  desired_fields: string[];
  budget_range: string;
  desired_volume: string | null;
  access_preference: string;
  timeline: string;
  sample_first: boolean;
  notes: string | null;
  status: CustomSourcingStatus;
  admin_notes: string | null;
  quote_amount: number | null;
  quote_notes: string | null;
  feasibility_score: number;
  feasibility_breakdown: FeasibilityBreakdown | Record<string, unknown>;
  source_url: string | null;
  source_path: string | null;
  utm_source: string | null;
  utm_medium: string | null;
  utm_campaign: string | null;
  created_at: string;
  updated_at: string;
  metadata: Record<string, unknown>;
};

export type BuyerCustomRequestsData =
  | Extract<Awaited<ReturnType<typeof getBuyerPortalData>>, { authenticated: false }>
  | {
      authenticated: true;
      portal: Extract<Awaited<ReturnType<typeof getBuyerPortalData>>, { authenticated: true }>;
      mode: "live" | "offline";
      loadErrors: string[];
      requests: CustomSourcingRequestRow[];
      stats: {
        total: number;
        active: number;
        quoted: number;
        completed: number;
      };
    };

export type AdminCustomRequestsData = {
  mode: "live" | "offline";
  loadErrors: string[];
  requests: CustomSourcingRequestRow[];
  stats: {
    total: number;
    needsReview: number;
    feasible: number;
    quoted: number;
    inProgress: number;
    completed: number;
    averageFeasibility: number;
  };
};

const requestSelect = [
  "id",
  "buyer_account_id",
  "buyer_request_id",
  "product_factory_run_id",
  "marketplace_listing_id",
  "attached_segment_id",
  "name",
  "email",
  "phone",
  "company",
  "website",
  "industry",
  "vertical",
  "lead_type",
  "buyer_type",
  "geography",
  "source_preference",
  "offer",
  "target_customer",
  "problem_solved",
  "ideal_lead",
  "bad_fit_lead",
  "urgency",
  "intended_use",
  "desired_fields",
  "budget_range",
  "desired_volume",
  "access_preference",
  "timeline",
  "sample_first",
  "notes",
  "status",
  "admin_notes",
  "quote_amount",
  "quote_notes",
  "feasibility_score",
  "feasibility_breakdown",
  "source_url",
  "source_path",
  "utm_source",
  "utm_medium",
  "utm_campaign",
  "created_at",
  "updated_at",
  "metadata",
].join(",");

function clamp(value: number) {
  return Math.max(0, Math.min(100, Math.round(value)));
}

function clean(value: unknown) {
  return typeof value === "string" ? value.trim() : "";
}

function numberFromText(value: string) {
  const numbers = [...value.matchAll(/([0-9][0-9,]*)/g)]
    .map((match) => Number(match[1].replace(/,/g, "")))
    .filter(Number.isFinite);
  return numbers.length ? Math.max(...numbers) : 0;
}

function hasUsefulText(value: string, min = 3) {
  return clean(value).length >= min;
}

function includesAny(value: string, terms: string[]) {
  const text = value.toLowerCase();
  return terms.some((term) => text.includes(term));
}

function compactArray(value: string[]) {
  return Array.from(new Set(value.map((item) => item.trim()).filter(Boolean))).slice(0, 24);
}

function labelForScore(score: number): FeasibilityResult["label"] {
  if (score >= 82) return "Strong candidate";
  if (score >= 68) return "Feasible";
  if (score >= 48) return "Needs review";
  return "High friction";
}

export function scoreCustomSourcingFeasibility(input: Pick<
  CustomSourcingSubmission,
  | "industry"
  | "vertical"
  | "leadType"
  | "buyerType"
  | "geography"
  | "sourcePreference"
  | "budgetRange"
  | "timeline"
  | "desiredFields"
  | "accessPreference"
  | "intendedUse"
>): FeasibilityResult {
  const budget = numberFromText(input.budgetRange);
  const source = `${input.sourcePreference} ${input.industry} ${input.vertical}`;
  const civic = includesAny(source, ["political", "civic", "campaign", "voter", "district"]);
  const unknownSource = includesAny(input.sourcePreference, ["unknown", "purchased"]);
  const permissionedSource = includesAny(input.sourcePreference, ["public", "permission", "partner", "owned", "submitted", "directory", "website"]);
  const exclusive = includesAny(input.accessPreference, ["exclusive"]);
  const requestedContactFields = input.desiredFields.some((field) => ["phone", "email", "name"].includes(field));
  const proofRequested = input.desiredFields.includes("public_source_proof") || input.desiredFields.includes("website");

  const breakdown: FeasibilityBreakdown = {
    clearIndustry: hasUsefulText(input.industry) && hasUsefulText(input.vertical) && hasUsefulText(input.leadType) ? 12 : hasUsefulText(input.industry) ? 7 : 0,
    clearBuyerType: hasUsefulText(input.buyerType) ? 10 : 0,
    clearGeography: hasUsefulText(input.geography) ? 10 : 0,
    sourceLikelihood: permissionedSource ? 14 : unknownSource ? 4 : hasUsefulText(input.sourcePreference) ? 9 : 0,
    budgetFit: budget >= 5000 ? 12 : budget >= 1500 ? 9 : budget >= 500 ? 6 : budget > 0 ? 3 : 0,
    timelineFit: includesAny(input.timeline, ["asap", "today", "this week"]) ? 6 : hasUsefulText(input.timeline) ? 8 : 0,
    complianceRisk: civic ? 4 : unknownSource ? 5 : requestedContactFields && !proofRequested ? 7 : 14,
    desiredFieldsAvailability: proofRequested ? 10 : input.desiredFields.length >= 4 ? 8 : input.desiredFields.length ? 5 : 0,
    exclusivityComplexity: exclusive ? 5 : hasUsefulText(input.accessPreference) ? 8 : 0,
  };

  const score = clamp(Object.values(breakdown).reduce((sum, value) => sum + value, 0));
  const warnings = [
    civic ? "Civic or political-style demand requires aggregate, consented, public-source, or legal-reviewed handling." : "",
    unknownSource ? "Unknown or purchased source preference raises review friction." : "",
    requestedContactFields && !proofRequested ? "Contact fields without source proof make delivery harder." : "",
    exclusive ? "Exclusive access increases pricing, territory, and conflict review." : "",
  ].filter(Boolean);

  const reasons = [
    breakdown.clearIndustry >= 10 ? "Industry, vertical, and lead type are clear." : "Industry or lead type needs sharpening.",
    breakdown.clearBuyerType >= 10 ? "Buyer type is defined." : "Buyer type is missing.",
    breakdown.clearGeography >= 10 ? "Geography is defined." : "Geography needs a market boundary.",
    breakdown.sourceLikelihood >= 12 ? "A public or permissioned source path looks plausible." : "Source path needs review.",
    breakdown.budgetFit >= 9 ? "Budget appears aligned with custom sourcing work." : "Budget may limit custom research depth.",
  ];

  return {
    score,
    label: labelForScore(score),
    breakdown,
    reasons,
    warnings,
    nextAction: score >= 68 ? "Admin should review source proof and prepare a quote or product factory run." : "Admin should request more detail before quoting.",
  };
}

function uuidOrNull(value: string | null | undefined) {
  return value && /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(value) ? value : null;
}

function slugify(value: string) {
  return value
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)/g, "")
    .slice(0, 72) || "custom-signal-pack";
}

function sourceUrl(path: string) {
  const safePath = path.startsWith("/") ? path.slice(0, 260) : "/custom-sourcing";
  return `https://www.theleadflowpro.com${safePath}`;
}

function utmFromPath(path: string) {
  const url = new URL(path.startsWith("/") ? path : "/custom-sourcing", "https://www.theleadflowpro.com");
  return {
    utm_source: url.searchParams.get("utm_source")?.slice(0, 120) || null,
    utm_medium: url.searchParams.get("utm_medium")?.slice(0, 120) || null,
    utm_campaign: url.searchParams.get("utm_campaign")?.slice(0, 160) || null,
  };
}

async function trackCustomSourcingEvent(eventName: string, properties: Record<string, unknown>) {
  if (!hasLeadFlowDataApiConfig()) return;
  await insertLeadFlowRow("events", {
    event_name: eventName,
    event_type: "server",
    route: typeof properties.route === "string" ? properties.route : "/custom-sourcing",
    user_role: typeof properties.user_role === "string" ? properties.user_role : "system",
    source_path: typeof properties.route === "string" ? properties.route : "/custom-sourcing",
    properties: sanitizeLeadFlowEventProperties(properties),
  }).catch(() => null);
}

async function auditCustomSourcing(input: {
  actorType: "anonymous" | "buyer" | "admin" | "system";
  actorUserId?: string | null;
  buyerAccountId?: string | null;
  action: string;
  objectId?: string | null;
  details?: Record<string, unknown>;
}) {
  if (!hasLeadFlowDataApiConfig()) return;
  await insertLeadFlowRow("audit_log", {
    actor_user_id: uuidOrNull(input.actorUserId || undefined),
    actor_type: input.actorType,
    action: input.action,
    object_schema: "leadflow",
    object_table: "custom_sourcing_requests",
    object_id: uuidOrNull(input.objectId || undefined),
    buyer_account_id: uuidOrNull(input.buyerAccountId || undefined),
    details: {
      ...(input.details || {}),
      raw_records_returned: false,
    },
  }).catch(() => null);
}

export async function createCustomSourcingRequest(input: {
  submission: CustomSourcingSubmission;
  buyerAccount?: BuyerAccount | null;
  authUserId?: string | null;
}) {
  const submission = input.submission;
  const feasibility = scoreCustomSourcingFeasibility(submission);
  const intendedUse = compactArray(submission.intendedUse);
  const desiredFields = compactArray(submission.desiredFields);
  const sourcePath = submission.sourcePath?.startsWith("/") ? submission.sourcePath.slice(0, 260) : "/custom-sourcing";
  const utm = utmFromPath(sourcePath);

  if (!hasLeadFlowDataApiConfig()) {
    return {
      ok: true,
      persisted: false,
      requestId: `local-${Date.now()}`,
      feasibility,
      message: "Custom sourcing request captured locally. Supabase service env is not configured.",
    };
  }

  const row = {
    buyer_account_id: uuidOrNull(input.buyerAccount?.id || undefined),
    name: submission.name,
    email: submission.email,
    phone: submission.phone || null,
    company: submission.company,
    website: submission.website || null,
    industry: submission.industry,
    vertical: submission.vertical,
    lead_type: submission.leadType,
    buyer_type: submission.buyerType,
    geography: submission.geography,
    source_preference: submission.sourcePreference,
    offer: submission.offer,
    target_customer: submission.targetCustomer,
    problem_solved: submission.problemSolved,
    ideal_lead: submission.idealLead,
    bad_fit_lead: submission.badFitLead || null,
    urgency: submission.urgency || null,
    intended_use: intendedUse,
    desired_fields: desiredFields,
    budget_range: submission.budgetRange,
    desired_volume: submission.desiredVolume || null,
    access_preference: submission.accessPreference,
    timeline: submission.timeline,
    sample_first: submission.sampleFirst,
    notes: submission.notes || null,
    status: feasibility.score >= 68 ? "needs_review" : "submitted",
    feasibility_score: feasibility.score,
    feasibility_breakdown: feasibility.breakdown,
    source_url: sourceUrl(sourcePath),
    source_path: sourcePath,
    ...utm,
    metadata: {
      feasibility_label: feasibility.label,
      feasibility_reasons: feasibility.reasons,
      feasibility_warnings: feasibility.warnings,
      consent: {
        contact: submission.consentToContact,
        review_gated: submission.reviewGatedAccepted,
        consent_version: "custom-sourcing-v1",
      },
      public_preview_only: true,
      source_backed_required: true,
      no_guarantees: true,
    },
  };

  const inserted = await insertLeadFlowRow<CustomSourcingRequestRow>("custom_sourcing_requests", row);
  const request = inserted[0];
  if (!request?.id) throw new Error("Custom sourcing request insert did not return an id.");

  const buyerRequestInserted = await insertLeadFlowRow<{ id: string }>("buyer_requests", {
    buyer_account_id: uuidOrNull(input.buyerAccount?.id || undefined),
    request_type: "custom_pack",
    vertical: submission.vertical,
    category: submission.leadType,
    buyer_use_case: submission.problemSolved || submission.offer,
    intended_use: intendedUse.join(", "),
    budget_range: submission.budgetRange,
    urgency: submission.urgency || submission.timeline,
    status: "submitted",
    review_status: "pending",
    source_url: sourceUrl(sourcePath),
    source_path: sourcePath,
    ...utm,
    metadata: {
      custom_sourcing_request_id: request.id,
      desired_fields: desiredFields,
      access_preference: submission.accessPreference,
      source_preference: submission.sourcePreference,
      feasibility_score: feasibility.score,
      raw_records_returned: false,
    },
  }).catch(() => []);

  const buyerRequestId = buyerRequestInserted[0]?.id || null;
  if (buyerRequestId) {
    await patchLeadFlowRows("custom_sourcing_requests", { id: `eq.${request.id}` }, { buyer_request_id: buyerRequestId }).catch(() => null);
  }

  await Promise.all([
    trackCustomSourcingEvent("custom_sourcing_submitted", {
      route: sourcePath,
      user_role: input.buyerAccount ? "buyer" : "anonymous",
      source_id: request.id,
      vertical: submission.vertical,
      category: submission.leadType,
      status: request.status,
      score_range: feasibility.score >= 80 ? "high" : feasibility.score >= 60 ? "medium" : "low",
    }),
    auditCustomSourcing({
      actorType: input.buyerAccount ? "buyer" : "anonymous",
      actorUserId: input.authUserId || null,
      buyerAccountId: input.buyerAccount?.id || null,
      action: "custom_sourcing.submitted",
      objectId: request.id,
      details: {
        buyer_request_id: buyerRequestId,
        feasibility_score: feasibility.score,
        status: request.status,
      },
    }),
  ]);

  return {
    ok: true,
    persisted: true,
    requestId: request.id,
    buyerRequestId,
    feasibility,
    message: "Custom sourcing request submitted for review.",
  };
}

export async function getBuyerCustomRequestsData(): Promise<BuyerCustomRequestsData> {
  const portal = await getBuyerPortalData();
  if (!portal.authenticated) return portal;

  const loadErrors: string[] = [];
  if (!portal.account || !hasLeadFlowDataApiConfig()) {
    return {
      authenticated: true,
      portal,
      mode: "offline",
      loadErrors: hasLeadFlowDataApiConfig() ? [] : ["Supabase service env is not configured."],
      requests: [],
      stats: { total: 0, active: 0, quoted: 0, completed: 0 },
    };
  }

  const requests = await selectLeadFlowRows<CustomSourcingRequestRow>("custom_sourcing_requests", {
    select: requestSelect,
    buyer_account_id: `eq.${portal.account.id}`,
    order: "created_at.desc",
    limit: 60,
  }).catch((error) => {
    loadErrors.push(error instanceof Error ? error.message : "Could not load custom sourcing requests.");
    return [];
  });

  return {
    authenticated: true,
    portal,
    mode: loadErrors.length ? "offline" : "live",
    loadErrors,
    requests,
    stats: {
      total: requests.length,
      active: requests.filter((request) => ["submitted", "needs_review", "feasible", "quoted", "accepted", "in_progress"].includes(request.status)).length,
      quoted: requests.filter((request) => request.status === "quoted").length,
      completed: requests.filter((request) => request.status === "completed").length,
    },
  };
}

export async function getAdminCustomRequestsData(): Promise<AdminCustomRequestsData> {
  const loadErrors: string[] = [];
  if (!hasLeadFlowDataApiConfig()) {
    const demo: CustomSourcingRequestRow = {
      id: "demo-custom-request",
      buyer_account_id: null,
      buyer_request_id: null,
      product_factory_run_id: null,
      marketplace_listing_id: null,
      attached_segment_id: null,
      name: "Demo buyer",
      email: "demo@example.com",
      phone: null,
      company: "Signal Buyer Co",
      website: null,
      industry: "Home services",
      vertical: "Contractor leads",
      lead_type: "Local contractors with weak websites",
      buyer_type: "Agency",
      geography: "East Texas",
      source_preference: "Public websites and directories",
      offer: "Website and missed-call follow-up build",
      target_customer: "Contractors missing quote requests",
      problem_solved: "Find contractors with demand but weak capture.",
      ideal_lead: "Local contractor with no clear quote path.",
      bad_fit_lead: "National franchise with locked systems.",
      urgency: "This month",
      intended_use: ["outreach", "market_analysis"],
      desired_fields: ["business_name", "website", "category", "location", "public_source_proof"],
      budget_range: "$1,500 to $5,000",
      desired_volume: "250 records",
      access_preference: "shared",
      timeline: "this month",
      sample_first: true,
      notes: null,
      status: "needs_review",
      admin_notes: "Safe demo request.",
      quote_amount: null,
      quote_notes: null,
      feasibility_score: 78,
      feasibility_breakdown: {},
      source_url: "/custom-sourcing",
      source_path: "/custom-sourcing",
      utm_source: null,
      utm_medium: null,
      utm_campaign: null,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
      metadata: {},
    };
    return {
      mode: "offline",
      loadErrors: ["Supabase service env is not configured."],
      requests: [demo],
      stats: { total: 1, needsReview: 1, feasible: 0, quoted: 0, inProgress: 0, completed: 0, averageFeasibility: 78 },
    };
  }

  const requests = await selectLeadFlowRows<CustomSourcingRequestRow>("custom_sourcing_requests", {
    select: requestSelect,
    order: "created_at.desc",
    limit: 120,
  }).catch((error) => {
    loadErrors.push(error instanceof Error ? error.message : "Could not load custom sourcing requests.");
    return [];
  });
  const totalScore = requests.reduce((sum, request) => sum + Number(request.feasibility_score || 0), 0);

  await trackCustomSourcingEvent("custom_sourcing_reviewed", {
    route: "/dashboard/custom-requests",
    user_role: "admin",
    status: "viewed",
    request_count: requests.length,
  });

  return {
    mode: loadErrors.length ? "offline" : "live",
    loadErrors,
    requests,
    stats: {
      total: requests.length,
      needsReview: requests.filter((request) => ["submitted", "needs_review", "needs_more_info"].includes(request.status)).length,
      feasible: requests.filter((request) => request.status === "feasible").length,
      quoted: requests.filter((request) => request.status === "quoted").length,
      inProgress: requests.filter((request) => request.status === "in_progress").length,
      completed: requests.filter((request) => request.status === "completed").length,
      averageFeasibility: requests.length ? clamp(totalScore / requests.length) : 0,
    },
  };
}

function nextStatusForAction(action: CustomSourcingAdminAction): CustomSourcingStatus {
  if (action === "review" || action === "rescore") return "needs_review";
  if (action === "quote") return "quoted";
  if (action === "attach_segment" || action === "create_product_factory_run" || action === "convert_to_marketplace_listing") return "feasible";
  if (action === "request_more_info") return "needs_more_info";
  if (action === "reject") return "rejected";
  if (action === "mark_in_progress") return "in_progress";
  if (action === "mark_completed") return "completed";
  if (action === "archive") return "archived";
  if (action === "accept") return "accepted";
  return "needs_review";
}

function accessModelForRequest(request: Pick<CustomSourcingRequestRow, "access_preference">) {
  const preference = request.access_preference.toLowerCase();
  if (preference.includes("exclusive")) return "exclusive_listing";
  if (preference.includes("limited")) return "limited_seats";
  return "shared";
}

function releaseModeForAccessModel(accessModel: string) {
  return accessModel.includes("exclusive") ? "exclusive" : "review_gated";
}

function confidenceFromFeasibility(score: number) {
  if (score >= 82) return 0.74;
  if (score >= 68) return 0.62;
  if (score >= 48) return 0.46;
  return 0.32;
}

async function createMarketplaceDraftFromCustomRequest(input: {
  request: CustomSourcingRequestRow;
  feasibility: FeasibilityResult;
  productFactoryRunId: string | null;
  quoteAmount?: number | null;
}) {
  const request = input.request;
  if (request.marketplace_listing_id) return request.marketplace_listing_id;

  const title = `${request.vertical || request.industry} custom signal pack`;
  const accessModel = accessModelForRequest(request);
  const quoteAmount = Math.max(0, Number(input.quoteAmount || request.quote_amount || 0));
  const sampleEnabled = Boolean(request.sample_first);

  const inserted = await insertLeadFlowRow<{ id: string }>("marketplace_listings", {
    product_factory_run_id: uuidOrNull(input.productFactoryRunId || undefined),
    title,
    slug: `${slugify(title)}-${Date.now().toString(36)}`,
    vertical: request.vertical || request.industry || "General",
    category: request.lead_type || "Custom sourcing",
    buyer_type: request.buyer_type || "serious_buyer",
    source_type: request.source_preference || "custom_sourcing_request",
    location_label: request.geography || "United States",
    listing_status: "draft",
    review_status: "review",
    release_mode: releaseModeForAccessModel(accessModel),
    access_model: accessModel,
    max_buyers: accessModel === "limited_seats" ? 3 : null,
    territory: request.geography || null,
    exclusivity_notes: accessModel === "shared"
      ? null
      : `Exclusive review requested for ${request.geography || "the requested market"}.`,
    score: input.feasibility.score,
    confidence: confidenceFromFeasibility(input.feasibility.score),
    sample_count: 0,
    price_cents: quoteAmount ? Math.round(quoteAmount * 100) : null,
    freshness_label: "custom request",
    compliance_status: input.feasibility.warnings.length ? "needs_review" : "review_required",
    buyer_visible_summary: {
      short_summary: request.problem_solved || request.offer,
      buyer_use_case: request.offer,
      recommended_buyer_cta: "Request source review",
      custom_request_id: request.id,
      requested_fields: request.desired_fields,
      intended_use: request.intended_use,
      feasibility_score: input.feasibility.score,
      feasibility_label: input.feasibility.label,
      compliance_note: "Draft listing created from a custom sourcing request. It cannot be released until source proof, suppression, allowed-use, and prohibited-data review are complete.",
    },
    source_url: "/dashboard/custom-requests",
    sample_enabled: sampleEnabled,
    sample_price: 0,
    sample_record_count: 0,
    sample_field_groups: ["public_profile", "source_proof", "compliance"],
    requires_admin_approval: true,
    contact_fields_allowed: false,
    full_access_price: quoteAmount || 149,
    exclusive_deposit_amount: accessModel === "shared" ? 497 : Math.max(497, Math.round((quoteAmount || 149) * 0.25)),
    auto_fulfill_enabled: false,
    checkout_requires_admin_approval: true,
    contact_fields_release_approved: false,
    checkout_notes: "Custom sourcing draft. Manual review required before buyer access or payment fulfillment.",
    allowed_use: "Review as a custom sourcing opportunity only until source proof, suppression, and allowed-use review are complete.",
    restricted_use: "Do not use, sell, export, route, or contact from this draft until source proof, permission, suppression, and prohibited-data checks pass.",
    proof_summary: {
      source_request_id: request.id,
      source_preference: request.source_preference,
      source_proof_coverage: 0,
      freshness: "custom request",
      risk_flags: input.feasibility.warnings,
      missing_fields: input.feasibility.score >= 68 ? ["source proof", "sample records", "suppression check"] : ["source proof", "sample records", "suppression check", "buyer fit detail"],
    },
    source_profile_ids: [],
    tags: [request.industry, request.geography, request.lead_type, request.source_preference]
      .map((value) => value?.trim())
      .filter(Boolean)
      .slice(0, 12),
    visibility: "internal",
  });

  const listingId = inserted[0]?.id || null;
  if (!listingId) throw new Error("Marketplace draft insert did not return an id.");
  return listingId;
}

export async function handleCustomSourcingAdminAction(input: {
  adminUserId: string | null;
  adminEmail: string;
  requestId: string;
  action: CustomSourcingAdminAction;
  adminNotes?: string;
  quoteAmount?: number | null;
  quoteNotes?: string;
  segmentId?: string | null;
}) {
  if (!hasLeadFlowDataApiConfig()) {
    return { ok: false as const, status: 503, message: "Supabase service env is not configured." };
  }

  const [request] = await selectLeadFlowRows<CustomSourcingRequestRow>("custom_sourcing_requests", {
    select: requestSelect,
    id: `eq.${input.requestId}`,
    limit: 1,
  });
  if (!request) return { ok: false as const, status: 404, message: "Custom sourcing request not found." };

  const feasibility = scoreCustomSourcingFeasibility({
    industry: request.industry,
    vertical: request.vertical,
    leadType: request.lead_type,
    buyerType: request.buyer_type,
    geography: request.geography,
    sourcePreference: request.source_preference,
    budgetRange: request.budget_range,
    timeline: request.timeline,
    desiredFields: request.desired_fields || [],
    accessPreference: request.access_preference,
    intendedUse: request.intended_use || [],
  });

  let productFactoryRunId: string | null = request.product_factory_run_id;
  let marketplaceListingId: string | null = request.marketplace_listing_id;
  if (input.action === "create_product_factory_run") {
    const inserted = await insertLeadFlowRow<{ id: string }>("product_factory_runs", {
      source_type: "predictive_recommendation",
      source_id: request.id,
      attached_buyer_request_id: uuidOrNull(request.buyer_request_id || undefined),
      created_by: uuidOrNull(input.adminUserId || undefined),
      status: "draft",
      quality_summary: {
        profileCount: 0,
        averageScore: feasibility.score,
        sourceProofCoverage: 0,
        suppressionCount: 0,
        riskFlags: feasibility.warnings,
        missingFields: feasibility.score >= 68 ? [] : ["source proof", "sample records"],
        exportEligibility: "needs_review",
        source_request_id: request.id,
      },
      compliance_summary: {
        sourceProofAttached: false,
        suppressionChecked: false,
        noProhibitedData: true,
        noMinors: true,
        noProtectedTraitTargeting: true,
        consentStatusReviewed: false,
        contactFieldsReviewed: false,
        civicRestrictionsReviewed: !/political|civic|campaign/i.test(`${request.industry} ${request.vertical}`),
        allowedUseWritten: false,
        restrictedUseWritten: false,
        blocked: false,
        warnings: feasibility.warnings,
      },
      generated_copy: {
        listingTitle: `${request.vertical || request.industry} custom signal pack`,
        shortSummary: request.problem_solved,
        buyerUseCase: request.offer,
        sampleDescription: "Sample can be created after source proof and suppression review.",
        proofSummary: "Source proof has not been attached yet.",
        recommendedBuyerCta: "Request custom source review",
        complianceNote: "Custom sourcing must clear source proof, suppression, allowed-use, and prohibited-data review before release.",
        faq: [],
      },
      buyer_use_case: {
        bestBuyerType: request.buyer_type,
        industry: request.industry,
        geography: request.geography,
        useCase: request.problem_solved,
        recommendedOutreachPath: request.intended_use.join(", "),
        problemSolved: request.problem_solved,
        offerAngle: request.offer,
        buyerWarning: "Custom sourcing is not a guarantee of volume, sales, ROAS, CPL, or conversion.",
        allowedUse: "Use only after source proof, suppression, and allowed-use review.",
        restrictedUse: "Do not use suppressed, private, hacked, leaked, sensitive, or unclear-permission data.",
      },
      listing_settings: {
        title: `${request.vertical || request.industry} custom signal pack`,
        description: request.problem_solved,
        category: request.lead_type,
        vertical: request.vertical,
        tags: [request.industry, request.geography, request.source_preference].filter(Boolean),
        accessModel: request.access_preference.includes("exclusive") ? "exclusive_listing" : "shared",
        price: Number(input.quoteAmount || request.quote_amount || 0),
        samplePrice: 0,
        sampleCount: 0,
        sampleFields: ["public_profile", "source_proof", "compliance"],
        requiresAdminApproval: true,
        visibility: "internal",
        listingStatus: "draft",
      },
      selected_member_ids: [],
    });
    productFactoryRunId = inserted[0]?.id || null;
  }

  if (input.action === "convert_to_marketplace_listing") {
    marketplaceListingId = await createMarketplaceDraftFromCustomRequest({
      request,
      feasibility,
      productFactoryRunId,
      quoteAmount: input.quoteAmount,
    });
  }

  const patch: Record<string, unknown> = {
    status: nextStatusForAction(input.action),
    feasibility_score: feasibility.score,
    feasibility_breakdown: feasibility.breakdown,
    admin_notes: input.adminNotes || request.admin_notes,
    updated_at: new Date().toISOString(),
  };
  if (typeof input.quoteAmount === "number" && Number.isFinite(input.quoteAmount)) patch.quote_amount = input.quoteAmount;
  if (input.quoteNotes !== undefined) patch.quote_notes = input.quoteNotes || null;
  if (input.segmentId) patch.attached_segment_id = uuidOrNull(input.segmentId);
  if (productFactoryRunId) patch.product_factory_run_id = productFactoryRunId;
  if (marketplaceListingId) patch.marketplace_listing_id = marketplaceListingId;

  const [updated] = await patchLeadFlowRows<CustomSourcingRequestRow>("custom_sourcing_requests", { id: `eq.${request.id}` }, patch);

  await Promise.all([
    trackCustomSourcingEvent(
      input.action === "quote" ? "custom_sourcing_quoted" : input.action === "accept" ? "custom_sourcing_accepted" : "custom_sourcing_reviewed",
      {
        route: "/dashboard/custom-requests",
        user_role: "admin",
        source_id: request.id,
        status: patch.status,
        vertical: request.vertical,
        category: request.lead_type,
        score_range: feasibility.score >= 80 ? "high" : feasibility.score >= 60 ? "medium" : "low",
        action: input.action,
      },
    ),
    auditCustomSourcing({
      actorType: "admin",
      actorUserId: input.adminUserId,
      action: `custom_sourcing.${input.action}`,
      objectId: request.id,
      buyerAccountId: request.buyer_account_id,
      details: {
        status: patch.status,
        feasibility_score: feasibility.score,
        product_factory_run_id: productFactoryRunId,
        marketplace_listing_id: marketplaceListingId,
        quote_amount: patch.quote_amount,
      },
    }),
  ]);

  return {
    ok: true as const,
    status: 200,
    request: updated || request,
    productFactoryRunId,
    marketplaceListingId,
    message: "Custom sourcing request updated.",
  };
}
