import "server-only";

import { leadProfileDetails } from "@/lib/lead-profile-detail";
import {
  hasLeadFlowDataApiConfig,
  insertLeadFlowRow,
  selectLeadFlowRows,
} from "@/lib/leadflow-data-api";
import {
  runSegmentPreview,
  sanitizeSegmentRules,
  type SegmentCandidate,
  type SegmentComplianceStatus,
  type SegmentInput,
  type SegmentPreview,
  type SegmentRiskLevel,
  type SegmentRule,
  type SegmentStatus,
  type SegmentType,
  type SegmentVisibility,
} from "@/lib/segments/rules";

export type SegmentRecord = SegmentInput & {
  id: string;
  createdBy: string | null;
  createdAt: string;
  updatedAt: string;
  lastRunAt: string | null;
  memberCount: number;
  riskLevel: SegmentRiskLevel;
  complianceStatus: SegmentComplianceStatus;
};

export type SegmentRunRecord = {
  id: string;
  segmentId: string;
  status: string;
  estimatedCount: number;
  memberCount: number;
  suppressionCount: number;
  highRiskCount: number;
  missingSourceProofCount: number;
  createdAt: string;
};

export type SegmentDashboardData = {
  mode: "live" | "offline";
  loadErrors: string[];
  segments: SegmentRecord[];
  rulesBySegment: Record<string, SegmentRule[]>;
  previewsBySegment: Record<string, SegmentPreview>;
  candidates: SegmentCandidate[];
  recentRuns: SegmentRunRecord[];
  stats: {
    totalSegments: number;
    activeSegments: number;
    reviewSegments: number;
    blockedSegments: number;
    exportReadySegments: number;
    totalMembers: number;
  };
};

export type SegmentDetailData = SegmentDashboardData & {
  segment: SegmentRecord;
  rules: SegmentRule[];
  preview: SegmentPreview;
};

type DbSegmentRow = {
  id: string;
  name: string;
  description: string | null;
  segment_type: SegmentType;
  vertical: string | null;
  category: string | null;
  status: SegmentStatus;
  visibility: SegmentVisibility;
  created_by: string | null;
  created_at: string;
  updated_at: string;
  last_run_at: string | null;
  member_count: number | null;
  risk_level: SegmentRiskLevel;
  compliance_status: SegmentComplianceStatus;
};

type DbSegmentRuleRow = {
  id: string;
  segment_id: string;
  field: SegmentRule["field"];
  operator: SegmentRule["operator"];
  value: SegmentRule["value"];
  rule_group: SegmentRule["rule_group"];
};

type DbSegmentRunRow = {
  id: string;
  segment_id: string;
  status: string;
  estimated_count: number | null;
  member_count: number | null;
  suppression_count: number | null;
  high_risk_count: number | null;
  missing_source_proof_count: number | null;
  created_at: string;
};

type DbLeadProfileRow = {
  id: string;
  title: string;
  vertical: string | null;
  category: string | null;
  score: number | string | null;
  confidence: number | string | null;
  source_type?: string | null;
  source_proof_status: string | null;
  suppression_status: string | null;
  review_status: string | null;
  compliance_status?: string | null;
  consent_status?: string | null;
  buyer_use_case?: string | null;
  recommended_next_action?: string | null;
  status?: string | null;
  updated_at: string;
};

type DbBuyerRequestRow = {
  id: string;
  request_type: string;
  vertical: string | null;
  category: string | null;
  budget_range: string | null;
  urgency: string | null;
  intended_use: string | null;
  buyer_use_case?: string | null;
  status: string | null;
  review_status: string | null;
  created_at: string;
};

type DbMarketplaceListingRow = {
  id: string;
  title: string;
  vertical: string | null;
  category: string | null;
  buyer_type?: string | null;
  listing_status: string | null;
  review_status: string | null;
  release_mode?: string | null;
  score?: number | string | null;
  confidence?: number | string | null;
  compliance_status?: string | null;
  source_proof_status?: string | null;
  updated_at: string;
};

type DbSubmittedSourceRow = {
  id: string;
  source_name: string;
  source_type: string;
  origin_type: string;
  risk_level: SegmentRiskLevel | string | null;
  review_status: string | null;
  vertical: string | null;
  categories: string[] | null;
  geography: string | null;
  buyer_type: string | null;
  best_use_case: string | null;
  resale_claim?: string | null;
  outreach_claim?: string | null;
  created_at: string;
};

const now = new Date();
const dayMs = 24 * 60 * 60 * 1000;
const iso = (daysAgo: number) => new Date(now.getTime() - daysAgo * dayMs).toISOString();

function asNumber(value: number | string | null | undefined) {
  if (typeof value === "number") return Number.isFinite(value) ? value : 0;
  if (typeof value === "string") {
    const parsed = Number(value);
    return Number.isFinite(parsed) ? parsed : 0;
  }
  return 0;
}

function confidenceLabel(value: number | string | null | undefined) {
  if (typeof value === "string" && value && Number.isNaN(Number(value))) return value.toLowerCase();
  const number = asNumber(value);
  const normalized = number <= 1 && number > 0 ? number * 100 : number;
  if (normalized >= 80) return "high";
  if (normalized >= 55) return "medium";
  if (normalized > 0) return "low";
  return "needs_review";
}

function freshnessLabel(value: string | null | undefined) {
  const date = value ? new Date(value).getTime() : 0;
  if (!Number.isFinite(date) || date <= 0) return "unknown";
  const days = Math.floor((Date.now() - date) / dayMs);
  if (days <= 7) return "this_week";
  if (days <= 30) return "last_30_days";
  if (days <= 90) return "last_90_days";
  return "stale";
}

function riskLevel(value: unknown): SegmentRiskLevel {
  return value === "low" || value === "medium" || value === "high" || value === "prohibited" ? value : "medium";
}

function normalizeVertical(value: string | null | undefined) {
  if (!value) return "General";
  if (/ecommerce/i.test(value)) return "Ecommerce";
  if (/home|contractor|service/i.test(value)) return "Home services";
  if (/mortgage|refi|va/i.test(value)) return "Mortgage";
  if (/real estate|agent/i.test(value)) return "Real estate";
  if (/civic|political|issue/i.test(value)) return "Civic";
  return value;
}

function segmentFromRow(row: DbSegmentRow): SegmentRecord {
  return {
    id: row.id,
    name: row.name,
    description: row.description || "",
    segmentType: row.segment_type,
    vertical: row.vertical || "General",
    category: row.category || "All categories",
    status: row.status,
    visibility: row.visibility,
    createdBy: row.created_by,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
    lastRunAt: row.last_run_at,
    memberCount: row.member_count || 0,
    riskLevel: row.risk_level,
    complianceStatus: row.compliance_status,
  };
}

function fallbackCandidates(): SegmentCandidate[] {
  const profileCandidates = leadProfileDetails.map((profile): SegmentCandidate => ({
    id: profile.id,
    title: profile.title,
    segmentType: "lead_profiles",
    vertical: normalizeVertical(profile.vertical),
    category: profile.category,
    score: profile.leadScore,
    confidence: profile.confidence,
    sourceType: profile.sourceType,
    freshness: freshnessLabel(profile.lastVerifiedDate),
    reviewStatus: "review",
    complianceStatus: "needs_review",
    suppressionStatus: profile.suppressionStatus === "suppressed" ? "suppressed" : "unchecked",
    location: "United States",
    buyerType: profile.bestBuyerType,
    budgetRange: profile.priceBand,
    toolSlug: "marketplace-profile",
    consentStatus: profile.consentStatus,
    sourceProofStatus: profile.sourceProofLinks.some((proof) => proof.status === "verified") ? "verified" : "review",
    recommendedNextAction: profile.recommendedNextAction,
    marketplaceStatus: profile.releaseMode,
    riskLevel: "low",
    summary: profile.summary,
    exportEligible: profile.suppressionStatus !== "suppressed",
  }));

  return [
    ...profileCandidates,
    {
      id: "demo-contractor-weak-websites",
      title: "Local contractors with weak websites",
      segmentType: "lead_profiles",
      vertical: "Home services",
      category: "Contractor leads",
      score: 82,
      confidence: "medium",
      sourceType: "public_website_review",
      freshness: "this_week",
      reviewStatus: "review",
      complianceStatus: "needs_review",
      suppressionStatus: "unchecked",
      location: "East Texas",
      buyerType: "agency_partner",
      budgetRange: "$1,500 to $5,000",
      toolSlug: "website-money-leak-checker",
      consentStatus: "source_backed",
      sourceProofStatus: "review",
      recommendedNextAction: "add_source_proof",
      marketplaceStatus: "draft",
      riskLevel: "medium",
      summary: "A review queue of contractors with visible website and follow-up gaps.",
      exportEligible: false,
    },
    {
      id: "demo-va-irrrl-education-interest",
      title: "VA IRRRL education interest",
      segmentType: "questionnaire_responses",
      vertical: "Mortgage",
      category: "VA IRRRL",
      score: 78,
      confidence: "medium",
      sourceType: "consented_questionnaire",
      freshness: "last_30_days",
      reviewStatus: "review",
      complianceStatus: "needs_review",
      suppressionStatus: "unchecked",
      location: "Texas",
      buyerType: "mortgage_team",
      budgetRange: "$500 to $1,500",
      toolSlug: "mortgage-lead-readiness",
      consentStatus: "tool_answers_only",
      sourceProofStatus: "sample_available",
      recommendedNextAction: "review_contact_consent",
      marketplaceStatus: "internal_only",
      riskLevel: "medium",
      summary: "Consented education-interest responses that need mortgage compliance review before routing.",
      exportEligible: false,
    },
    {
      id: "demo-ecommerce-buyer-request",
      title: "Buyer requests with budget above 1500",
      segmentType: "buyer_requests",
      vertical: "Ecommerce",
      category: "Vendor signals",
      score: 76,
      confidence: "medium",
      sourceType: "buyer_request",
      freshness: "this_week",
      reviewStatus: "pending",
      complianceStatus: "ready",
      suppressionStatus: "not_applicable",
      location: "United States",
      buyerType: "agency",
      budgetRange: "$1,500 to $5,000",
      toolSlug: "buyer-intake",
      consentStatus: "buyer_request_access",
      sourceProofStatus: "not_applicable",
      recommendedNextAction: "match_to_listing",
      marketplaceStatus: "request_open",
      riskLevel: "low",
      summary: "Buyer demand that may justify a new product factory run.",
      exportEligible: true,
    },
    {
      id: "demo-civic-aggregate-district",
      title: "District issue pulse aggregate",
      segmentType: "aggregate_civic_signals",
      vertical: "Civic",
      category: "Issue pulse",
      score: 71,
      confidence: "medium",
      sourceType: "aggregate_survey",
      freshness: "last_30_days",
      reviewStatus: "approved",
      complianceStatus: "aggregate_only",
      suppressionStatus: "not_applicable",
      location: "District level",
      buyerType: "civic_organization",
      budgetRange: "research_only",
      toolSlug: "political-issue-pulse",
      consentStatus: "aggregate_only",
      sourceProofStatus: "approved",
      recommendedNextAction: "publish_aggregate_dashboard",
      marketplaceStatus: "internal_only",
      riskLevel: "low",
      summary: "Aggregate civic issue counts with no person-level targeting label.",
      exportEligible: true,
    },
  ];
}

function fallbackSegments(): SegmentRecord[] {
  return [
    {
      id: "demo-segment-ecommerce-high-score",
      name: "High-score ecommerce vendor signals",
      description: "Reviewed ecommerce profiles with strong score ranges and source proof ready for product packaging.",
      segmentType: "lead_profiles",
      vertical: "Ecommerce",
      category: "Vendor signals",
      status: "review",
      visibility: "internal",
      createdBy: "system",
      createdAt: iso(3),
      updatedAt: iso(1),
      lastRunAt: iso(1),
      memberCount: 1,
      riskLevel: "low",
      complianceStatus: "needs_review",
    },
    {
      id: "demo-segment-buyer-budget",
      name: "Buyer requests over 1500",
      description: "Buyer requests with enough budget clarity to route into matching or custom sourcing.",
      segmentType: "buyer_requests",
      vertical: "Ecommerce",
      category: "Buyer demand",
      status: "active",
      visibility: "internal",
      createdBy: "system",
      createdAt: iso(2),
      updatedAt: iso(0),
      lastRunAt: iso(0),
      memberCount: 1,
      riskLevel: "low",
      complianceStatus: "ready",
    },
    {
      id: "demo-segment-civic-aggregate",
      name: "Civic issue pulse aggregate",
      description: "Aggregate issue-level civic signals only. No person-level persuasion labels.",
      segmentType: "aggregate_civic_signals",
      vertical: "Civic",
      category: "Issue pulse",
      status: "review",
      visibility: "internal",
      createdBy: "system",
      createdAt: iso(1),
      updatedAt: iso(0),
      lastRunAt: null,
      memberCount: 1,
      riskLevel: "low",
      complianceStatus: "aggregate_only",
    },
  ];
}

function fallbackRules(): Record<string, SegmentRule[]> {
  return {
    "demo-segment-ecommerce-high-score": [
      { id: "demo-rule-ecommerce-vertical", field: "vertical", operator: "equals", value: "Ecommerce", rule_group: "and" },
      { id: "demo-rule-ecommerce-score", field: "score_range", operator: "in", value: ["75-89", "90-100"], rule_group: "and" },
      { id: "demo-rule-ecommerce-proof", field: "source_proof_status", operator: "exists", value: "", rule_group: "and" },
    ],
    "demo-segment-buyer-budget": [
      { id: "demo-rule-buyer-vertical", field: "vertical", operator: "equals", value: "Ecommerce", rule_group: "and" },
      { id: "demo-rule-buyer-budget", field: "budget_range", operator: "contains", value: "$1,500", rule_group: "and" },
    ],
    "demo-segment-civic-aggregate": [
      { id: "demo-rule-civic-vertical", field: "vertical", operator: "equals", value: "Civic", rule_group: "and" },
      { id: "demo-rule-civic-compliance", field: "compliance_status", operator: "equals", value: "aggregate_only", rule_group: "and" },
    ],
  };
}

function buildStats(segments: SegmentRecord[], previews: Record<string, SegmentPreview>) {
  return {
    totalSegments: segments.length,
    activeSegments: segments.filter((segment) => segment.status === "active").length,
    reviewSegments: segments.filter((segment) => segment.status === "review").length,
    blockedSegments: segments.filter((segment) => segment.status === "blocked").length,
    exportReadySegments: Object.values(previews).filter((preview) => preview.exportEligible).length,
    totalMembers: Object.values(previews).reduce((sum, preview) => sum + preview.estimatedCount, 0),
  };
}

function rulesBySegment(rows: DbSegmentRuleRow[]) {
  return rows.reduce<Record<string, SegmentRule[]>>((acc, row) => {
    const rule = {
      id: row.id,
      field: row.field,
      operator: row.operator,
      value: row.value,
      rule_group: row.rule_group,
    };
    acc[row.segment_id] = [...(acc[row.segment_id] || []), rule];
    return acc;
  }, {});
}

function buildPreviews(segments: SegmentRecord[], rules: Record<string, SegmentRule[]>, candidates: SegmentCandidate[]) {
  return segments.reduce<Record<string, SegmentPreview>>((acc, segment) => {
    acc[segment.id] = runSegmentPreview({
      segment,
      rules: rules[segment.id] || [],
      candidates,
    });
    return acc;
  }, {});
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

async function loadLiveCandidates(errors: string[]): Promise<SegmentCandidate[]> {
  const [profiles, buyerRequests, listings, sources] = await Promise.all([
    safeSelect<DbLeadProfileRow>("lead_profiles", {
      select: "id,title,vertical,category,score,confidence,source_type,source_proof_status,suppression_status,review_status,compliance_status,consent_status,buyer_use_case,recommended_next_action,status,updated_at",
      deleted_at: "is.null",
      order: "updated_at.desc",
      limit: 150,
    }, errors),
    safeSelect<DbBuyerRequestRow>("buyer_requests", {
      select: "id,request_type,vertical,category,budget_range,urgency,intended_use,buyer_use_case,status,review_status,created_at",
      order: "created_at.desc",
      limit: 150,
    }, errors),
    safeSelect<DbMarketplaceListingRow>("marketplace_listings", {
      select: "id,title,vertical,category,buyer_type,listing_status,review_status,release_mode,score,confidence,compliance_status,source_proof_status,updated_at",
      deleted_at: "is.null",
      order: "updated_at.desc",
      limit: 150,
    }, errors),
    safeSelect<DbSubmittedSourceRow>("submitted_sources", {
      select: "id,source_name,source_type,origin_type,risk_level,review_status,vertical,categories,geography,buyer_type,best_use_case,resale_claim,outreach_claim,created_at",
      deleted_at: "is.null",
      order: "created_at.desc",
      limit: 150,
    }, errors),
  ]);

  return [
    ...profiles.map((profile): SegmentCandidate => ({
      id: profile.id,
      title: profile.title,
      segmentType: "lead_profiles",
      vertical: normalizeVertical(profile.vertical),
      category: profile.category || "Uncategorized",
      score: asNumber(profile.score),
      confidence: confidenceLabel(profile.confidence),
      sourceType: profile.source_type || "source_backed_profile",
      freshness: freshnessLabel(profile.updated_at),
      reviewStatus: profile.review_status || "pending",
      complianceStatus: profile.compliance_status || "needs_review",
      suppressionStatus: profile.suppression_status || "unchecked",
      location: "unknown",
      buyerType: profile.buyer_use_case || "unknown",
      budgetRange: "unknown",
      toolSlug: "lead-profile",
      consentStatus: profile.consent_status || "source_backed",
      sourceProofStatus: profile.source_proof_status || "review",
      recommendedNextAction: profile.recommended_next_action || "review_profile",
      marketplaceStatus: profile.status || "draft",
      riskLevel: profile.suppression_status === "suppressed" ? "high" : "medium",
      summary: profile.buyer_use_case || "Reviewed lead profile candidate.",
      exportEligible: profile.suppression_status !== "suppressed" && profile.review_status === "approved",
    })),
    ...buyerRequests.map((request): SegmentCandidate => ({
      id: request.id,
      title: request.intended_use || `${request.request_type} buyer request`,
      segmentType: "buyer_requests",
      vertical: normalizeVertical(request.vertical),
      category: request.category || request.request_type,
      score: request.status === "approved" ? 80 : request.status === "submitted" ? 66 : 50,
      confidence: request.review_status === "approved" ? "high" : "medium",
      sourceType: "buyer_request",
      freshness: freshnessLabel(request.created_at),
      reviewStatus: request.review_status || "pending",
      complianceStatus: "ready",
      suppressionStatus: "not_applicable",
      location: "unknown",
      buyerType: request.buyer_use_case || "unknown",
      budgetRange: request.budget_range || "unknown",
      toolSlug: "buyer-intake",
      consentStatus: "buyer_request_access",
      sourceProofStatus: "not_applicable",
      recommendedNextAction: "match_to_listing",
      marketplaceStatus: request.status || "submitted",
      riskLevel: "low",
      summary: request.intended_use || "Buyer request candidate.",
      exportEligible: true,
    })),
    ...listings.map((listing): SegmentCandidate => ({
      id: listing.id,
      title: listing.title,
      segmentType: "marketplace_listings",
      vertical: normalizeVertical(listing.vertical),
      category: listing.category || "Marketplace listing",
      score: asNumber(listing.score),
      confidence: confidenceLabel(listing.confidence),
      sourceType: listing.release_mode || "marketplace_listing",
      freshness: freshnessLabel(listing.updated_at),
      reviewStatus: listing.review_status || "pending",
      complianceStatus: listing.compliance_status || "needs_review",
      suppressionStatus: listing.listing_status === "suppressed" ? "suppressed" : "not_applicable",
      location: "unknown",
      buyerType: listing.buyer_type || "unknown",
      budgetRange: "unknown",
      toolSlug: "marketplace",
      consentStatus: "review_gated",
      sourceProofStatus: listing.source_proof_status || "review",
      recommendedNextAction: "request_access",
      marketplaceStatus: listing.listing_status || "draft",
      riskLevel: listing.listing_status === "suppressed" ? "prohibited" : "low",
      summary: "Marketplace listing candidate.",
      exportEligible: listing.review_status === "approved" && listing.listing_status !== "suppressed",
    })),
    ...sources.map((source): SegmentCandidate => ({
      id: source.id,
      title: source.source_name,
      segmentType: "submitted_sources",
      vertical: normalizeVertical(source.vertical),
      category: source.categories?.[0] || "Submitted source",
      score: source.review_status === "approved_for_marketplace" ? 82 : source.review_status === "approved_for_research" ? 72 : 50,
      confidence: source.review_status?.includes("approved") ? "high" : "medium",
      sourceType: source.source_type || source.origin_type,
      freshness: freshnessLabel(source.created_at),
      reviewStatus: source.review_status || "submitted",
      complianceStatus: source.review_status?.includes("approved") ? "ready" : "needs_review",
      suppressionStatus: "unchecked",
      location: source.geography || "unknown",
      buyerType: source.buyer_type || "unknown",
      budgetRange: "unknown",
      toolSlug: "submit-source",
      consentStatus: source.resale_claim === "yes" ? "source_submission_marketplace" : "research_only",
      sourceProofStatus: source.review_status?.includes("approved") ? "approved" : "review",
      recommendedNextAction: source.review_status === "approved_for_marketplace" ? "create_marketplace_listing" : "review_source",
      marketplaceStatus: source.review_status || "submitted",
      riskLevel: riskLevel(source.risk_level),
      summary: source.best_use_case || "Submitted source candidate.",
      exportEligible: source.review_status === "approved_for_marketplace" && source.risk_level !== "high" && source.risk_level !== "prohibited",
    })),
  ];
}

async function loadDashboardData(): Promise<SegmentDashboardData> {
  if (!hasLeadFlowDataApiConfig()) {
    const segments = fallbackSegments();
    const rules = fallbackRules();
    const candidates = fallbackCandidates();
    const previews = buildPreviews(segments, rules, candidates);
    return {
      mode: "offline",
      loadErrors: ["LeadFlow Supabase Data API is not configured. Showing safe segment test data."],
      segments,
      rulesBySegment: rules,
      previewsBySegment: previews,
      candidates,
      recentRuns: [],
      stats: buildStats(segments, previews),
    };
  }

  const errors: string[] = [];
  const [segmentRows, ruleRows, runRows, candidates] = await Promise.all([
    safeSelect<DbSegmentRow>("segments", {
      select: "id,name,description,segment_type,vertical,category,status,visibility,created_by,created_at,updated_at,last_run_at,member_count,risk_level,compliance_status",
      deleted_at: "is.null",
      order: "updated_at.desc",
      limit: 100,
    }, errors),
    safeSelect<DbSegmentRuleRow>("segment_rules", {
      select: "id,segment_id,field,operator,value,rule_group",
      order: "created_at.asc",
      limit: 500,
    }, errors),
    safeSelect<DbSegmentRunRow>("segment_runs", {
      select: "id,segment_id,status,estimated_count,member_count,suppression_count,high_risk_count,missing_source_proof_count,created_at",
      order: "created_at.desc",
      limit: 25,
    }, errors),
    loadLiveCandidates(errors),
  ]);

  const liveSegments = segmentRows.map(segmentFromRow);
  const segments = liveSegments.length ? liveSegments : fallbackSegments();
  const rules = liveSegments.length ? rulesBySegment(ruleRows) : fallbackRules();
  const allCandidates = candidates.length ? candidates : fallbackCandidates();
  const previews = buildPreviews(segments, rules, allCandidates);

  return {
    mode: "live",
    loadErrors: errors,
    segments,
    rulesBySegment: rules,
    previewsBySegment: previews,
    candidates: allCandidates,
    recentRuns: runRows.map((row) => ({
      id: row.id,
      segmentId: row.segment_id,
      status: row.status,
      estimatedCount: row.estimated_count || 0,
      memberCount: row.member_count || 0,
      suppressionCount: row.suppression_count || 0,
      highRiskCount: row.high_risk_count || 0,
      missingSourceProofCount: row.missing_source_proof_count || 0,
      createdAt: row.created_at,
    })),
    stats: buildStats(segments, previews),
  };
}

export async function getSegmentDashboardData(adminEmail?: string): Promise<SegmentDashboardData> {
  const data = await loadDashboardData();
  if (hasLeadFlowDataApiConfig()) {
    await insertLeadFlowRow("events", {
      event_name: "segment_builder_viewed",
      event_type: "server",
      route: "/dashboard/segments",
      user_role: "admin",
      source_path: "/dashboard/segments",
      properties: {
        user_role: "admin",
        load_errors: data.loadErrors.length,
        admin_allowlist_match: Boolean(adminEmail),
      },
    }).catch(() => null);
  }
  return data;
}

export async function getSegmentDetailData(segmentId: string): Promise<SegmentDetailData | null> {
  const data = await loadDashboardData();
  const segment = data.segments.find((item) => item.id === segmentId);
  if (!segment) return null;
  const rules = sanitizeSegmentRules(data.rulesBySegment[segment.id] || []);
  const preview = data.previewsBySegment[segment.id] || runSegmentPreview({ segment, rules, candidates: data.candidates });
  return {
    ...data,
    segment,
    rules,
    preview,
  };
}
