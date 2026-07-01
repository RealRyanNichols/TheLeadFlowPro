import "server-only";

import {
  hasLeadFlowDataApiConfig,
  insertLeadFlowRow,
  patchLeadFlowRows,
  selectLeadFlowRows,
} from "@/lib/leadflow-data-api";
import { sanitizeLeadFlowEventProperties } from "@/lib/leadflow-events";
import { getSegmentDashboardData, type SegmentDashboardData, type SegmentRecord } from "@/lib/segments/segment-builder";
import type { SegmentCandidate, SegmentPreview, SegmentRiskLevel } from "@/lib/segments/rules";

export const PRODUCT_FACTORY_SOURCE_TYPES = [
  "segment",
  "lead_profiles",
  "submitted_source",
  "questionnaire_result_group",
  "civic_aggregate",
  "manual_selection",
  "predictive_recommendation",
] as const;

export const PRODUCT_FACTORY_ACTIONS = [
  "quality_review",
  "generate_copy",
  "save_draft",
  "send_review",
  "publish_listing",
  "create_sample",
  "create_exclusive_offer",
  "attach_buyer_request",
] as const;

export type ProductFactorySourceType = (typeof PRODUCT_FACTORY_SOURCE_TYPES)[number];
export type ProductFactoryAction = (typeof PRODUCT_FACTORY_ACTIONS)[number];
export type ProductFactoryAccessModel =
  | "shared"
  | "limited_seats"
  | "exclusive_listing"
  | "exclusive_geo"
  | "exclusive_vertical"
  | "exclusive_time_window"
  | "internal_only";

export type ProductFactoryFieldGroup = "public_profile" | "source_proof" | "compliance" | "contact";

export type ProductFactorySourceOption = {
  id: string;
  sourceType: ProductFactorySourceType;
  title: string;
  summary: string;
  vertical: string;
  category: string;
  status: string;
  riskLevel: SegmentRiskLevel;
  complianceStatus: string;
  memberCount: number;
  averageScore: number;
};

export type ProductFactoryQualitySummary = {
  profileCount: number;
  averageScore: number;
  confidenceDistribution: Record<string, number>;
  sourceProofCoverage: number;
  freshness: string;
  suppressionCount: number;
  highRiskCount: number;
  prohibitedCount: number;
  pricingSuggestion: {
    listingPrice: number;
    samplePrice: number;
    reasoning: string;
  };
  riskFlags: string[];
  missingFields: string[];
  exportEligibility: "eligible" | "needs_review" | "blocked";
  selectedMemberIds: string[];
  sampleMembers: Array<Pick<SegmentCandidate, "id" | "title" | "vertical" | "category" | "score" | "confidence" | "sourceType" | "sourceProofStatus" | "riskLevel" | "summary" | "exportEligible">>;
};

export type ProductFactoryBuyerUseCase = {
  bestBuyerType: string;
  industry: string;
  geography: string;
  useCase: string;
  recommendedOutreachPath: string;
  problemSolved: string;
  offerAngle: string;
  buyerWarning: string;
  allowedUse: string;
  restrictedUse: string;
};

export type ProductFactoryListingSettings = {
  title: string;
  description: string;
  category: string;
  vertical: string;
  tags: string[];
  accessModel: ProductFactoryAccessModel;
  price: number;
  samplePrice: number;
  sampleCount: number;
  sampleFields: ProductFactoryFieldGroup[];
  requiresAdminApproval: boolean;
  visibility: "internal" | "buyer_preview" | "buyer_visible" | "archived";
  listingStatus: "draft" | "review" | "sample_available" | "available" | "reserved" | "sold_shared" | "sold_exclusive" | "expired" | "archived" | "suppressed";
};

export type ProductFactoryComplianceChecklist = {
  sourceProofAttached: boolean;
  suppressionChecked: boolean;
  noProhibitedData: boolean;
  noMinors: boolean;
  noProtectedTraitTargeting: boolean;
  consentStatusReviewed: boolean;
  contactFieldsReviewed: boolean;
  civicRestrictionsReviewed: boolean;
  allowedUseWritten: boolean;
  restrictedUseWritten: boolean;
};

export type ProductFactoryComplianceSummary = ProductFactoryComplianceChecklist & {
  blocked: boolean;
  warnings: string[];
  requiredBeforePublish: string[];
};

export type ProductFactoryGeneratedCopy = {
  listingTitle: string;
  shortSummary: string;
  buyerUseCase: string;
  sampleDescription: string;
  proofSummary: string;
  recommendedBuyerCta: string;
  complianceNote: string;
  faq: Array<{ question: string; answer: string }>;
};

export type ProductFactoryRunRecord = {
  id: string;
  source_type: ProductFactorySourceType;
  source_id: string | null;
  attached_buyer_request_id: string | null;
  status: string;
  quality_summary: ProductFactoryQualitySummary | Record<string, unknown>;
  compliance_summary: ProductFactoryComplianceSummary | Record<string, unknown>;
  generated_listing_id: string | null;
  generated_sample_id: string | null;
  generated_copy: ProductFactoryGeneratedCopy | Record<string, unknown>;
  buyer_use_case: ProductFactoryBuyerUseCase | Record<string, unknown>;
  listing_settings: ProductFactoryListingSettings | Record<string, unknown>;
  selected_member_ids: string[] | null;
  created_at: string;
  updated_at: string;
};

export type ProductFactoryBuyerRequestOption = {
  id: string;
  label: string;
  requestType: string;
  vertical: string;
  category: string;
  budgetRange: string;
  intendedUse: string;
  status: string;
  createdAt: string;
};

export type ProductFactoryDashboardData = {
  mode: "live" | "offline";
  loadErrors: string[];
  sources: ProductFactorySourceOption[];
  candidates: SegmentCandidate[];
  segments: SegmentRecord[];
  previewsBySegment: Record<string, SegmentPreview>;
  recentRuns: ProductFactoryRunRecord[];
  buyerRequests: ProductFactoryBuyerRequestOption[];
  stats: {
    sourceOptions: number;
    productRuns: number;
    draftRuns: number;
    reviewRuns: number;
    publishedRuns: number;
    blockedRuns: number;
  };
};

export type ProductFactorySubmission = {
  action: ProductFactoryAction;
  sourceType: ProductFactorySourceType;
  sourceId?: string | null;
  attachedBuyerRequestId?: string | null;
  selectedMemberIds: string[];
  buyerUseCase: ProductFactoryBuyerUseCase;
  listingSettings: ProductFactoryListingSettings;
  complianceChecklist: ProductFactoryComplianceChecklist;
  generatedCopy?: ProductFactoryGeneratedCopy | null;
  confirmed?: boolean;
};

type ProductFactoryResult = {
  ok: boolean;
  persisted: boolean;
  mode: "live" | "missing_supabase_config";
  status: number;
  message: string;
  runId?: string | null;
  listingId?: string | null;
  sampleId?: string | null;
  quality: ProductFactoryQualitySummary;
  compliance: ProductFactoryComplianceSummary;
  generatedCopy: ProductFactoryGeneratedCopy;
};

const proofReadyStatuses = new Set(["approved", "verified", "sample_available", "sampleavailable"]);
const accessModelsNeedingExclusive = new Set<ProductFactoryAccessModel>([
  "exclusive_listing",
  "exclusive_geo",
  "exclusive_vertical",
  "exclusive_time_window",
]);

function nowIso() {
  return new Date().toISOString();
}

function numberValue(value: unknown, fallback = 0) {
  if (typeof value === "number" && Number.isFinite(value)) return value;
  const parsed = Number(String(value ?? "").replace(/[^0-9.-]/g, ""));
  return Number.isFinite(parsed) ? parsed : fallback;
}

function clamp(value: number, min: number, max: number) {
  return Math.max(min, Math.min(max, value));
}

function slugify(value: string) {
  const slug = value
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 70);
  return slug || "leadflow-signal-product";
}

function looksLikeUuid(value: string | null | undefined) {
  return Boolean(value && /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(value));
}

function uuidOrNull(value: string | null | undefined) {
  return looksLikeUuid(value) ? value : null;
}

function safeArray(value: unknown) {
  if (!Array.isArray(value)) return [];
  return value.map((item) => String(item).trim()).filter(Boolean).slice(0, 30);
}

function confidenceNumber(label: string, score: number) {
  const normalized = label.toLowerCase();
  if (normalized === "high") return 0.86;
  if (normalized === "medium") return 0.66;
  if (normalized === "low") return 0.42;
  if (score >= 85) return 0.78;
  if (score >= 65) return 0.62;
  return 0.38;
}

function readAccessReleaseMode(accessModel: ProductFactoryAccessModel) {
  if (accessModelsNeedingExclusive.has(accessModel)) return "exclusive";
  if (accessModel === "internal_only") return "aggregated_only";
  return "review_gated";
}

function sourceTypeLabel(value: ProductFactorySourceType) {
  return value.replace(/_/g, " ");
}

function countBy<T>(rows: T[], getKey: (row: T) => string | null | undefined) {
  return rows.reduce<Record<string, number>>((acc, row) => {
    const key = getKey(row) || "unknown";
    acc[key] = (acc[key] || 0) + 1;
    return acc;
  }, {});
}

function representativeFreshness(members: SegmentCandidate[]) {
  if (!members.length) return "unknown";
  const counts = countBy(members, (member) => member.freshness);
  return Object.entries(counts).sort((a, b) => b[1] - a[1])[0]?.[0]?.replace(/_/g, " ") || "unknown";
}

function riskLevelForMembers(members: SegmentCandidate[]): SegmentRiskLevel {
  if (members.some((member) => member.riskLevel === "prohibited")) return "prohibited";
  if (members.some((member) => member.riskLevel === "high")) return "high";
  if (members.some((member) => member.riskLevel === "medium" || member.suppressionStatus === "suppressed")) return "medium";
  return "low";
}

function pricingSuggestionForMembers(input: {
  profileCount: number;
  averageScore: number;
  proofCoverage: number;
  highRiskCount: number;
  sourceType?: ProductFactorySourceType;
}) {
  const countFactor = input.profileCount >= 250 ? 3 : input.profileCount >= 100 ? 2.2 : input.profileCount >= 25 ? 1.45 : 1;
  const scoreFactor = input.averageScore >= 85 ? 1.45 : input.averageScore >= 75 ? 1.25 : input.averageScore >= 60 ? 1 : 0.75;
  const proofFactor = input.proofCoverage >= 95 ? 1.25 : input.proofCoverage >= 75 ? 1 : 0.72;
  const riskFactor = input.highRiskCount > 0 ? 0.75 : 1;
  const civicFactor = input.sourceType === "civic_aggregate" ? 0.7 : 1;
  const rawListingPrice = 149 * countFactor * scoreFactor * proofFactor * riskFactor * civicFactor;
  const listingPrice = Math.max(49, Math.round(rawListingPrice / 25) * 25 - 1);
  const samplePrice = input.profileCount > 0 ? Math.max(19, Math.min(249, Math.round(listingPrice * 0.28 / 10) * 10 - 1)) : 0;

  return {
    listingPrice,
    samplePrice,
    reasoning: `Based on ${input.profileCount} profiles, average score ${input.averageScore}, ${input.proofCoverage}% proof coverage, and ${input.highRiskCount} high-risk records.`,
  };
}

function sourceOptionFromSegment(segment: SegmentRecord, preview?: SegmentPreview): ProductFactorySourceOption {
  const members = preview?.members || [];
  const averageScore = members.length
    ? Math.round(members.reduce((sum, member) => sum + member.score, 0) / members.length)
    : 0;
  return {
    id: segment.id,
    sourceType: "segment",
    title: segment.name,
    summary: segment.description || "Saved segment ready for product review.",
    vertical: segment.vertical || "General",
    category: segment.category || "All categories",
    status: segment.status,
    riskLevel: segment.riskLevel,
    complianceStatus: segment.complianceStatus,
    memberCount: preview?.estimatedCount ?? segment.memberCount,
    averageScore,
  };
}

function sourceOptionsFromCandidates(candidates: SegmentCandidate[]) {
  const grouped = new Map<ProductFactorySourceType, SegmentCandidate[]>();
  for (const candidate of candidates) {
    if (candidate.segmentType === "lead_profiles") grouped.set("lead_profiles", [...(grouped.get("lead_profiles") || []), candidate]);
    if (candidate.segmentType === "submitted_sources") grouped.set("submitted_source", [...(grouped.get("submitted_source") || []), candidate]);
    if (candidate.segmentType === "questionnaire_responses") grouped.set("questionnaire_result_group", [...(grouped.get("questionnaire_result_group") || []), candidate]);
    if (candidate.segmentType === "aggregate_civic_signals") grouped.set("civic_aggregate", [...(grouped.get("civic_aggregate") || []), candidate]);
  }

  grouped.set("manual_selection", candidates);
  grouped.set("predictive_recommendation", candidates.filter((candidate) => candidate.score >= 75 && candidate.riskLevel !== "prohibited"));

  return Array.from(grouped.entries()).map(([sourceType, members]) => {
    const averageScore = members.length
      ? Math.round(members.reduce((sum, member) => sum + member.score, 0) / members.length)
      : 0;
    const first = members[0];
    return {
      id: sourceType,
      sourceType,
      title: sourceType === "predictive_recommendation"
        ? "Predictive recommended batch"
        : sourceType === "manual_selection"
          ? "Manual profile selection"
          : `${sourceTypeLabel(sourceType)} queue`,
      summary: first?.summary || `Candidate group from ${sourceTypeLabel(sourceType)}.`,
      vertical: first?.vertical || "General",
      category: first?.category || "All categories",
      status: "review",
      riskLevel: riskLevelForMembers(members),
      complianceStatus: members.some((member) => member.complianceStatus === "blocked") ? "blocked" : "needs_review",
      memberCount: members.length,
      averageScore,
    } satisfies ProductFactorySourceOption;
  });
}

function resolveMembers(input: {
  data: Pick<ProductFactoryDashboardData, "candidates" | "segments" | "previewsBySegment">;
  sourceType: ProductFactorySourceType;
  sourceId?: string | null;
  selectedMemberIds: string[];
}) {
  const selected = new Set(input.selectedMemberIds.filter(Boolean));

  if (input.sourceType === "segment" && input.sourceId) {
    const preview = input.data.previewsBySegment[input.sourceId];
    const members = preview?.members || [];
    return selected.size ? members.filter((member) => selected.has(member.id)) : members;
  }

  const typeMap: Record<ProductFactorySourceType, (member: SegmentCandidate) => boolean> = {
    segment: () => true,
    lead_profiles: (member) => member.segmentType === "lead_profiles",
    submitted_source: (member) => member.segmentType === "submitted_sources",
    questionnaire_result_group: (member) => member.segmentType === "questionnaire_responses",
    civic_aggregate: (member) => member.segmentType === "aggregate_civic_signals",
    manual_selection: (member) => selected.has(member.id),
    predictive_recommendation: (member) => member.score >= 75 && member.riskLevel !== "prohibited",
  };

  const filtered = input.data.candidates.filter(typeMap[input.sourceType]);
  if (selected.size && input.sourceType !== "manual_selection") return filtered.filter((member) => selected.has(member.id) || member.id === input.sourceId);
  if (input.sourceId && input.sourceType !== "predictive_recommendation") {
    const exact = filtered.filter((member) => member.id === input.sourceId);
    if (exact.length) return exact;
  }
  return filtered;
}

export function calculateProductFactoryQuality(members: SegmentCandidate[], sourceType?: ProductFactorySourceType): ProductFactoryQualitySummary {
  const profileCount = members.length;
  const averageScore = profileCount
    ? Math.round(members.reduce((sum, member) => sum + member.score, 0) / profileCount)
    : 0;
  const confidenceDistribution = countBy(members, (member) => member.confidence);
  const proofReadyCount = members.filter((member) => proofReadyStatuses.has(member.sourceProofStatus.toLowerCase())).length;
  const sourceProofCoverage = profileCount ? Math.round((proofReadyCount / profileCount) * 100) : 0;
  const suppressionCount = members.filter((member) => member.suppressionStatus === "suppressed").length;
  const highRiskCount = members.filter((member) => member.riskLevel === "high").length;
  const prohibitedCount = members.filter((member) => member.riskLevel === "prohibited").length;
  const missingProofCount = profileCount - proofReadyCount;
  const missingFields = [
    ...(missingProofCount ? ["source proof review"] : []),
    ...(members.some((member) => member.consentStatus === "unverified" || member.consentStatus === "unknown") ? ["consent status"] : []),
    ...(members.some((member) => !member.recommendedNextAction || member.recommendedNextAction === "unknown") ? ["recommended next action"] : []),
    ...(members.some((member) => !member.buyerType || member.buyerType === "unknown") ? ["best buyer type"] : []),
  ];
  const riskFlags = [
    ...(suppressionCount ? [`${suppressionCount} suppressed record${suppressionCount === 1 ? "" : "s"} must be excluded.`] : []),
    ...(highRiskCount ? [`${highRiskCount} high-risk record${highRiskCount === 1 ? "" : "s"} need manual review.`] : []),
    ...(prohibitedCount ? [`${prohibitedCount} prohibited record${prohibitedCount === 1 ? "" : "s"} block product creation.`] : []),
    ...(missingProofCount ? [`${missingProofCount} record${missingProofCount === 1 ? "" : "s"} still need proof coverage.`] : []),
  ];
  const pricingSuggestion = pricingSuggestionForMembers({
    profileCount,
    averageScore,
    proofCoverage: sourceProofCoverage,
    highRiskCount,
    sourceType,
  });

  return {
    profileCount,
    averageScore,
    confidenceDistribution,
    sourceProofCoverage,
    freshness: representativeFreshness(members),
    suppressionCount,
    highRiskCount,
    prohibitedCount,
    pricingSuggestion,
    riskFlags,
    missingFields,
    exportEligibility: prohibitedCount || suppressionCount ? "blocked" : highRiskCount || missingProofCount ? "needs_review" : "eligible",
    selectedMemberIds: members.map((member) => member.id),
    sampleMembers: members.slice(0, 8).map((member) => ({
      id: member.id,
      title: member.title,
      vertical: member.vertical,
      category: member.category,
      score: member.score,
      confidence: member.confidence,
      sourceType: member.sourceType,
      sourceProofStatus: member.sourceProofStatus,
      riskLevel: member.riskLevel,
      summary: member.summary,
      exportEligible: member.exportEligible,
    })),
  };
}

export function buildProductFactoryCompliance(input: {
  sourceType: ProductFactorySourceType;
  quality: ProductFactoryQualitySummary;
  checklist: ProductFactoryComplianceChecklist;
  buyerUseCase: ProductFactoryBuyerUseCase;
  listingSettings: ProductFactoryListingSettings;
}): ProductFactoryComplianceSummary {
  const warnings: string[] = [];
  const requiredBeforePublish: string[] = [];
  const checklist = input.checklist;

  if (input.quality.prohibitedCount > 0) warnings.push("Prohibited records block product creation.");
  if (input.quality.suppressionCount > 0) warnings.push("Suppressed records must be removed before release.");
  if (input.quality.highRiskCount > 0) warnings.push("High-risk records require manual review before publishing.");
  if (input.quality.sourceProofCoverage < 100) warnings.push("Source proof coverage is incomplete.");
  if (input.sourceType === "civic_aggregate" && !checklist.civicRestrictionsReviewed) warnings.push("Civic products must stay aggregate, public-source, consented, and manually reviewed.");
  if (input.listingSettings.sampleFields.includes("contact") && !checklist.contactFieldsReviewed) warnings.push("Contact fields require explicit review before inclusion.");

  const requiredChecks: Array<[keyof ProductFactoryComplianceChecklist, string]> = [
    ["sourceProofAttached", "Source proof attached"],
    ["suppressionChecked", "Suppression checked"],
    ["noProhibitedData", "No prohibited data"],
    ["noMinors", "No minors"],
    ["noProtectedTraitTargeting", "No protected-trait targeting"],
    ["consentStatusReviewed", "Consent status reviewed"],
    ["contactFieldsReviewed", "Contact fields reviewed"],
    ["allowedUseWritten", "Allowed use written"],
    ["restrictedUseWritten", "Restricted use written"],
  ];

  if (input.sourceType === "civic_aggregate") {
    requiredChecks.push(["civicRestrictionsReviewed", "Civic and political restrictions reviewed"]);
  }

  for (const [key, label] of requiredChecks) {
    if (!checklist[key]) requiredBeforePublish.push(label);
  }

  if (!input.buyerUseCase.allowedUse.trim()) requiredBeforePublish.push("Allowed use copy");
  if (!input.buyerUseCase.restrictedUse.trim()) requiredBeforePublish.push("Restricted use copy");

  const blocked =
    input.quality.prohibitedCount > 0 ||
    input.quality.suppressionCount > 0 ||
    !checklist.noProhibitedData ||
    !checklist.noMinors ||
    !checklist.noProtectedTraitTargeting ||
    (input.sourceType === "civic_aggregate" && !checklist.civicRestrictionsReviewed);

  return {
    ...checklist,
    blocked,
    warnings,
    requiredBeforePublish,
  };
}

export function generateProductFactoryCopy(input: {
  sourceType: ProductFactorySourceType;
  quality: ProductFactoryQualitySummary;
  buyerUseCase: ProductFactoryBuyerUseCase;
  listingSettings: ProductFactoryListingSettings;
  compliance: ProductFactoryComplianceSummary;
}): ProductFactoryGeneratedCopy {
  const title = input.listingSettings.title.trim() || `${input.listingSettings.vertical} signal pack`;
  const score = input.quality.averageScore || 0;
  const proof = input.quality.sourceProofCoverage;
  const buyerType = input.buyerUseCase.bestBuyerType || "serious buyer";
  const problem = input.buyerUseCase.problemSolved || "find buyer intent without buying blind lists";
  const outreachPath = input.buyerUseCase.recommendedOutreachPath || "review source proof, request sample access, then route the approved next step";

  return {
    listingTitle: title,
    shortSummary: `${title} packages ${input.quality.profileCount} reviewed signal${input.quality.profileCount === 1 ? "" : "s"} for ${buyerType}. Average score is ${score}, proof coverage is ${proof}%, and release remains review-gated.`,
    buyerUseCase: `Use this product to ${problem}. The strongest path is to ${outreachPath}.`,
    sampleDescription: `A limited sample shows public profile fields, source proof context, compliance notes, score, confidence, and buyer-use fit. Contact fields stay hidden unless specifically approved.`,
    proofSummary: `${proof}% source proof coverage, ${input.quality.suppressionCount} suppressed records, ${input.quality.highRiskCount} high-risk records, and ${input.quality.exportEligibility.replace(/_/g, " ")} export eligibility.`,
    recommendedBuyerCta: input.listingSettings.accessModel.startsWith("exclusive") ? "Request exclusive review" : "Request sample access",
    complianceNote: input.compliance.blocked
      ? "This product is blocked until compliance issues are cleared. Do not publish, export, route, or sell it."
      : "LeadFlow Pro uses public, submitted, permissioned, or consented signal data. Access is review-gated, suppression-aware, and source-backed. No sales, revenue, ROAS, CPL, conversion rate, or lead volume is guaranteed.",
    faq: [
      {
        question: "What am I buying?",
        answer: "You are buying reviewed buyer-signal intelligence with source context, scoring, confidence labels, and allowed-use limits. You are not buying a blind list.",
      },
      {
        question: "Can I see a sample first?",
        answer: "Yes. Samples are limited to approved field groups and do not include suppressed records, raw answers, hidden notes, or prohibited sensitive data.",
      },
      {
        question: "Can I request exclusive access?",
        answer: "Some products can be reviewed for exclusive access by geography, vertical, listing, profile batch, or time window.",
      },
      {
        question: "How is release controlled?",
        answer: "Every product must pass proof, suppression, buyer-use, contact-field, and compliance checks before buyer release.",
      },
    ],
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

async function trackProductFactoryEvent(eventName: string, properties: Record<string, unknown>) {
  if (!hasLeadFlowDataApiConfig()) return;
  const safeProperties = sanitizeLeadFlowEventProperties({
    route: "/dashboard/product-factory",
    user_role: "admin",
    ...properties,
  });
  await insertLeadFlowRow("events", {
    event_name: eventName,
    event_type: "server",
    route: "/dashboard/product-factory",
    source_path: "/dashboard/product-factory",
    user_role: "admin",
    properties: safeProperties,
  }).catch(() => null);
}

async function auditProductFactory(input: {
  adminUserId: string | null;
  action: string;
  runId?: string | null;
  listingId?: string | null;
  sampleId?: string | null;
  details?: Record<string, unknown>;
}) {
  if (!hasLeadFlowDataApiConfig()) return;
  await insertLeadFlowRow("audit_log", {
    actor_user_id: uuidOrNull(input.adminUserId),
    actor_type: "admin",
    action: input.action,
    object_schema: "leadflow",
    object_table: "product_factory_runs",
    object_id: uuidOrNull(input.runId),
    marketplace_listing_id: uuidOrNull(input.listingId),
    details: {
      generated_sample_id: input.sampleId || null,
      raw_records_returned: false,
      admin_only_fields_returned: false,
      ...(input.details || {}),
    },
  }).catch(() => null);
}

function runStatusForAction(action: ProductFactoryAction, compliance: ProductFactoryComplianceSummary) {
  if (compliance.blocked) return "blocked";
  if (action === "send_review") return "review";
  if (action === "publish_listing") return "published";
  if (action === "create_sample") return "sample_created";
  if (action === "create_exclusive_offer") return "exclusive_offer_created";
  if (action === "attach_buyer_request") return "attached_to_buyer_request";
  return "draft";
}

function listingStatusForAction(input: ProductFactorySubmission, compliance: ProductFactoryComplianceSummary) {
  if (compliance.blocked) return "review";
  if (input.action === "create_sample") return "sample_available";
  if (input.action === "create_exclusive_offer") return "reserved";
  return input.listingSettings.listingStatus || "review";
}

function productListingRow(input: {
  runId: string;
  submission: ProductFactorySubmission;
  quality: ProductFactoryQualitySummary;
  compliance: ProductFactoryComplianceSummary;
  copy: ProductFactoryGeneratedCopy;
}) {
  const settings = input.submission.listingSettings;
  const buyerUseCase = input.submission.buyerUseCase;
  const leadProfileIds = input.quality.selectedMemberIds.filter((id) => looksLikeUuid(id));
  const confidenceKey = Object.entries(input.quality.confidenceDistribution).sort((a, b) => b[1] - a[1])[0]?.[0] || "needs_review";
  const title = settings.title.trim() || input.copy.listingTitle;

  return {
    product_factory_run_id: input.runId,
    title,
    slug: `${slugify(title)}-${Date.now().toString(36)}`,
    vertical: settings.vertical || buyerUseCase.industry || "General",
    category: settings.category || "Signal product",
    buyer_type: buyerUseCase.bestBuyerType || "serious_buyer",
    source_type: input.submission.sourceType,
    location_label: buyerUseCase.geography || "United States",
    listing_status: listingStatusForAction(input.submission, input.compliance),
    review_status: input.compliance.blocked ? "review" : settings.listingStatus === "available" ? "approved" : "review",
    release_mode: readAccessReleaseMode(settings.accessModel),
    access_model: settings.accessModel,
    max_buyers: settings.accessModel === "limited_seats" ? 3 : null,
    territory: buyerUseCase.geography || null,
    exclusivity_notes: accessModelsNeedingExclusive.has(settings.accessModel)
      ? `Exclusive review requested for ${buyerUseCase.geography || "the requested market"}.`
      : null,
    score: clamp(input.quality.averageScore, 0, 100),
    confidence: confidenceNumber(confidenceKey, input.quality.averageScore),
    sample_count: settings.sampleCount,
    price_cents: Math.round(Math.max(0, settings.price) * 100),
    freshness_label: input.quality.freshness,
    compliance_status: input.compliance.blocked ? "blocked" : input.quality.exportEligibility === "eligible" ? "ready" : "needs_review",
    buyer_visible_summary: {
      short_summary: input.copy.shortSummary,
      buyer_use_case: input.copy.buyerUseCase,
      recommended_buyer_cta: input.copy.recommendedBuyerCta,
      source_type: input.submission.sourceType,
      quality_summary: {
        profile_count: input.quality.profileCount,
        average_score: input.quality.averageScore,
        source_proof_coverage: input.quality.sourceProofCoverage,
        export_eligibility: input.quality.exportEligibility,
      },
      compliance_note: input.copy.complianceNote,
    },
    source_url: "/dashboard/product-factory",
    sample_enabled: settings.sampleCount > 0,
    sample_price: Math.max(0, settings.samplePrice),
    sample_record_count: Math.max(0, settings.sampleCount),
    sample_field_groups: settings.sampleFields,
    requires_admin_approval: settings.requiresAdminApproval,
    contact_fields_allowed: settings.sampleFields.includes("contact") && input.submission.complianceChecklist.contactFieldsReviewed,
    allowed_use: buyerUseCase.allowedUse || "Review source proof, scoring context, and buyer-use fit before outreach.",
    restricted_use: buyerUseCase.restrictedUse || "Do not use suppressed, outdated, prohibited, raw-answer, or unauthorized contact data.",
    proof_summary: {
      source_proof_coverage: input.quality.sourceProofCoverage,
      freshness: input.quality.freshness,
      risk_flags: input.quality.riskFlags,
      sample_members: input.quality.sampleMembers.map((member) => ({
        title: member.title,
        vertical: member.vertical,
        category: member.category,
        score: member.score,
        confidence: member.confidence,
        source_proof_status: member.sourceProofStatus,
      })),
    },
    source_profile_ids: leadProfileIds,
    tags: safeArray(settings.tags),
    visibility: settings.visibility,
  };
}

async function insertMarketplaceListing(input: {
  runId: string;
  submission: ProductFactorySubmission;
  quality: ProductFactoryQualitySummary;
  compliance: ProductFactoryComplianceSummary;
  copy: ProductFactoryGeneratedCopy;
}) {
  const inserted = await insertLeadFlowRow<{ id: string }>("marketplace_listings", productListingRow(input));
  const listingId = inserted[0]?.id || null;
  if (!listingId) throw new Error("Marketplace listing insert did not return an id.");
  return listingId;
}

async function insertSampleProduct(input: {
  runId: string;
  listingId: string;
  submission: ProductFactorySubmission;
  quality: ProductFactoryQualitySummary;
  copy: ProductFactoryGeneratedCopy;
  adminUserId: string | null;
}) {
  const settings = input.submission.listingSettings;
  const inserted = await insertLeadFlowRow<{ id: string }>("samples", {
    listing_id: input.listingId,
    sample_type: settings.samplePrice > 0 ? "paid_sample" : "free_redacted",
    title: `${settings.title || input.copy.listingTitle} Sample`,
    description: input.copy.sampleDescription,
    price: Math.max(0, settings.samplePrice),
    record_count: Math.max(1, Math.min(500, settings.sampleCount || input.quality.sampleMembers.length || 1)),
    field_groups: settings.sampleFields,
    status: settings.listingStatus === "available" ? "active" : "review",
    contact_fields_allowed: settings.sampleFields.includes("contact") && input.submission.complianceChecklist.contactFieldsReviewed,
    requires_admin_approval: settings.requiresAdminApproval,
    allowed_use: input.submission.buyerUseCase.allowedUse || "Review the sample before requesting full access.",
    restricted_use: input.submission.buyerUseCase.restrictedUse || "Do not use this sample as a blind list or unauthorized outreach file.",
    created_by: uuidOrNull(input.adminUserId),
    metadata: {
      managed_from: "/dashboard/product-factory",
      product_factory_run_id: input.runId,
      generated_listing_id: input.listingId,
      raw_records_returned: false,
      admin_only_fields_returned: false,
    },
  });

  const sampleId = inserted[0]?.id || null;
  if (!sampleId) throw new Error("Sample insert did not return an id.");

  await Promise.all(input.quality.sampleMembers.slice(0, settings.sampleCount || 5).map((member) =>
    insertLeadFlowRow("sample_items", {
      sample_id: sampleId,
      lead_profile_id: uuidOrNull(member.id),
      profile_slug: member.id,
      redacted_record: {
        profile_title: member.title,
        category: member.category,
        vertical: member.vertical,
        summary: member.summary,
        buyer_use_case: input.submission.buyerUseCase.useCase,
        recommended_next_action: input.submission.buyerUseCase.recommendedOutreachPath,
        score: member.score,
        confidence: member.confidence,
        source_proof_status: member.sourceProofStatus,
        allowed_use: input.submission.buyerUseCase.allowedUse,
        restricted_use: input.submission.buyerUseCase.restrictedUse,
      },
      included_field_groups: settings.sampleFields,
      source_proof_summary: {
        source_type: member.sourceType,
        source_title: member.title,
        proof_status: member.sourceProofStatus,
        proof_snippet: "Source proof is summarized and redacted for sample access.",
      },
      score: member.score,
      confidence: member.confidence,
    }).catch(() => null),
  ));

  return sampleId;
}

async function insertFactoryRun(input: {
  adminUserId: string | null;
  submission: ProductFactorySubmission;
  quality: ProductFactoryQualitySummary;
  compliance: ProductFactoryComplianceSummary;
  copy: ProductFactoryGeneratedCopy;
}) {
  const inserted = await insertLeadFlowRow<{ id: string }>("product_factory_runs", {
    source_type: input.submission.sourceType,
    source_id: input.submission.sourceId || null,
    attached_buyer_request_id: uuidOrNull(input.submission.attachedBuyerRequestId),
    created_by: uuidOrNull(input.adminUserId),
    status: runStatusForAction(input.submission.action, input.compliance),
    quality_summary: input.quality,
    compliance_summary: input.compliance,
    generated_copy: input.copy,
    buyer_use_case: input.submission.buyerUseCase,
    listing_settings: input.submission.listingSettings,
    selected_member_ids: input.quality.selectedMemberIds,
  });
  const runId = inserted[0]?.id || null;
  if (!runId) throw new Error("Product Factory run insert did not return an id.");
  return runId;
}

async function updateFactoryRunOutputs(input: {
  runId: string;
  status: string;
  listingId?: string | null;
  sampleId?: string | null;
}) {
  await patchLeadFlowRows("product_factory_runs", { id: `eq.${input.runId}` }, {
    status: input.status,
    generated_listing_id: uuidOrNull(input.listingId),
    generated_sample_id: uuidOrNull(input.sampleId),
  }).catch(() => null);
}

export async function getProductFactoryData(adminEmail?: string): Promise<ProductFactoryDashboardData> {
  const segmentData = await getSegmentDashboardData(adminEmail);
  const errors = [...segmentData.loadErrors];
  const recentRuns = hasLeadFlowDataApiConfig()
    ? await safeSelect<ProductFactoryRunRecord>("product_factory_runs", {
        select: "id,source_type,source_id,attached_buyer_request_id,status,quality_summary,compliance_summary,generated_listing_id,generated_sample_id,generated_copy,buyer_use_case,listing_settings,selected_member_ids,created_at,updated_at",
        deleted_at: "is.null",
        order: "created_at.desc",
        limit: 30,
      }, errors)
    : [];
  const buyerRequests = hasLeadFlowDataApiConfig()
    ? (await safeSelect<{
        id: string;
        request_type: string | null;
        vertical: string | null;
        category: string | null;
        budget_range: string | null;
        intended_use: string | null;
        buyer_use_case: string | null;
        status: string | null;
        created_at: string;
      }>("buyer_requests", {
        select: "id,request_type,vertical,category,budget_range,intended_use,buyer_use_case,status,created_at",
        status: "in.(submitted,pending_review,review,approved)",
        order: "created_at.desc",
        limit: 40,
      }, errors)).map((request) => ({
        id: request.id,
        label: `${request.vertical || "General"} ${request.category || "buyer request"}`,
        requestType: request.request_type || "access",
        vertical: request.vertical || "General",
        category: request.category || "Buyer request",
        budgetRange: request.budget_range || "not provided",
        intendedUse: request.intended_use || request.buyer_use_case || "not provided",
        status: request.status || "submitted",
        createdAt: request.created_at,
      } satisfies ProductFactoryBuyerRequestOption))
    : [];

  const sources = [
    ...segmentData.segments.map((segment) => sourceOptionFromSegment(segment, segmentData.previewsBySegment[segment.id])),
    ...sourceOptionsFromCandidates(segmentData.candidates),
  ];

  await trackProductFactoryEvent("product_factory_opened", {
    source_options: sources.length,
    product_runs: recentRuns.length,
    load_errors: errors.length,
  });

  return {
    mode: hasLeadFlowDataApiConfig() ? "live" : "offline",
    loadErrors: errors.length ? errors : segmentData.mode === "offline" ? ["LeadFlow Supabase Data API is not configured. Showing safe Product Factory test data."] : [],
    sources,
    candidates: segmentData.candidates,
    segments: segmentData.segments,
    previewsBySegment: segmentData.previewsBySegment,
    recentRuns,
    buyerRequests,
    stats: {
      sourceOptions: sources.length,
      productRuns: recentRuns.length,
      draftRuns: recentRuns.filter((run) => run.status === "draft").length,
      reviewRuns: recentRuns.filter((run) => run.status === "review").length,
      publishedRuns: recentRuns.filter((run) => ["published", "listing_created", "sample_created", "exclusive_offer_created", "attached_to_buyer_request"].includes(run.status)).length,
      blockedRuns: recentRuns.filter((run) => run.status === "blocked").length,
    },
  };
}

export async function handleProductFactorySubmission(input: {
  adminUserId: string | null;
  adminEmail: string;
  submission: ProductFactorySubmission;
}): Promise<ProductFactoryResult> {
  const data = await getProductFactoryData(input.adminEmail);
  const members = resolveMembers({
    data,
    sourceType: input.submission.sourceType,
    sourceId: input.submission.sourceId,
    selectedMemberIds: input.submission.selectedMemberIds,
  });
  const quality = calculateProductFactoryQuality(members, input.submission.sourceType);
  const compliance = buildProductFactoryCompliance({
    sourceType: input.submission.sourceType,
    quality,
    checklist: input.submission.complianceChecklist,
    buyerUseCase: input.submission.buyerUseCase,
    listingSettings: input.submission.listingSettings,
  });
  const generatedCopy = input.submission.generatedCopy || generateProductFactoryCopy({
    sourceType: input.submission.sourceType,
    quality,
    buyerUseCase: input.submission.buyerUseCase,
    listingSettings: input.submission.listingSettings,
    compliance,
  });

  if (input.submission.action === "quality_review") {
    await trackProductFactoryEvent("product_factory_quality_reviewed", {
      source_type: input.submission.sourceType,
      profile_count: quality.profileCount,
      status: quality.exportEligibility,
    });
    return {
      ok: true,
      persisted: false,
      mode: hasLeadFlowDataApiConfig() ? "live" : "missing_supabase_config",
      status: 200,
      message: "Quality review generated.",
      quality,
      compliance,
      generatedCopy,
    };
  }

  if (input.submission.action === "generate_copy") {
    await trackProductFactoryEvent("product_factory_listing_generated", {
      source_type: input.submission.sourceType,
      vertical: input.submission.listingSettings.vertical,
      category: input.submission.listingSettings.category,
    });
    return {
      ok: true,
      persisted: false,
      mode: hasLeadFlowDataApiConfig() ? "live" : "missing_supabase_config",
      status: 200,
      message: "Listing copy generated.",
      quality,
      compliance,
      generatedCopy,
    };
  }

  if (compliance.blocked || input.submission.action === "publish_listing" && compliance.requiredBeforePublish.length > 0) {
    await trackProductFactoryEvent("product_factory_blocked_by_compliance", {
      source_type: input.submission.sourceType,
      vertical: input.submission.listingSettings.vertical,
      category: input.submission.listingSettings.category,
      status: "blocked",
    });
    return {
      ok: false,
      persisted: false,
      mode: hasLeadFlowDataApiConfig() ? "live" : "missing_supabase_config",
      status: 400,
      message: compliance.blocked
        ? compliance.warnings.join(" ") || "Compliance gate blocked this Product Factory run."
        : `Publish blocked until checked: ${compliance.requiredBeforePublish.join(", ")}.`,
      quality,
      compliance,
      generatedCopy,
    };
  }

  if (["publish_listing", "create_sample", "create_exclusive_offer", "attach_buyer_request"].includes(input.submission.action) && !input.submission.confirmed) {
    return {
      ok: false,
      persisted: false,
      mode: hasLeadFlowDataApiConfig() ? "live" : "missing_supabase_config",
      status: 400,
      message: "Confirmation required for this Product Factory action.",
      quality,
      compliance,
      generatedCopy,
    };
  }

  if (input.submission.action === "attach_buyer_request" && !uuidOrNull(input.submission.attachedBuyerRequestId)) {
    return {
      ok: false,
      persisted: false,
      mode: hasLeadFlowDataApiConfig() ? "live" : "missing_supabase_config",
      status: 400,
      message: "Choose a buyer request before attaching this Product Factory run.",
      quality,
      compliance,
      generatedCopy,
    };
  }

  if (!hasLeadFlowDataApiConfig()) {
    await trackProductFactoryEvent(input.submission.action === "publish_listing" ? "product_factory_listing_published" : "product_factory_listing_generated", {
      source_type: input.submission.sourceType,
      status: "missing_supabase_config",
    });
    return {
      ok: true,
      persisted: false,
      mode: "missing_supabase_config",
      status: 200,
      message: "Product Factory output prepared. Supabase service env is not configured, so nothing was persisted.",
      runId: `demo-${Date.now()}`,
      quality,
      compliance,
      generatedCopy,
    };
  }

  const runId = await insertFactoryRun({
    adminUserId: input.adminUserId,
    submission: input.submission,
    quality,
    compliance,
    copy: generatedCopy,
  });

  let listingId: string | null = null;
  let sampleId: string | null = null;

  if (["publish_listing", "create_sample", "create_exclusive_offer"].includes(input.submission.action)) {
    listingId = await insertMarketplaceListing({
      runId,
      submission: input.submission,
      quality,
      compliance,
      copy: generatedCopy,
    });
  }

  if (input.submission.action === "create_sample" && listingId) {
    sampleId = await insertSampleProduct({
      runId,
      listingId,
      submission: input.submission,
      quality,
      copy: generatedCopy,
      adminUserId: input.adminUserId,
    });
  }

  await updateFactoryRunOutputs({
    runId,
    status: runStatusForAction(input.submission.action, compliance),
    listingId,
    sampleId,
  });

  const eventName =
    input.submission.action === "publish_listing" ? "product_factory_listing_published" :
    input.submission.action === "create_sample" ? "product_factory_listing_generated" :
    input.submission.action === "create_exclusive_offer" ? "product_factory_listing_generated" :
    "product_factory_listing_generated";

  await trackProductFactoryEvent(eventName, {
    product_factory_run_id: runId,
    listing_id: listingId,
    source_type: input.submission.sourceType,
    vertical: input.submission.listingSettings.vertical,
    category: input.submission.listingSettings.category,
    status: runStatusForAction(input.submission.action, compliance),
  });

  await auditProductFactory({
    adminUserId: input.adminUserId,
    action: `product_factory.${input.submission.action}`,
    runId,
    listingId,
    sampleId,
    details: {
      source_type: input.submission.sourceType,
      source_id: input.submission.sourceId || null,
      attached_buyer_request_id: input.submission.attachedBuyerRequestId || null,
      profile_count: quality.profileCount,
      average_score: quality.averageScore,
      source_proof_coverage: quality.sourceProofCoverage,
      compliance_blocked: compliance.blocked,
      action_confirmed: Boolean(input.submission.confirmed),
    },
  });

  return {
    ok: true,
    persisted: true,
    mode: "live",
    status: 200,
    message: listingId
      ? sampleId
        ? "Factory run, marketplace listing, and sample were created and audited."
        : "Factory run and marketplace listing were created and audited."
      : "Factory run was saved and audited.",
    runId,
    listingId,
    sampleId,
    quality,
    compliance,
    generatedCopy,
  };
}
