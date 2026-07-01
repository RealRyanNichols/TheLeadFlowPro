export const SEGMENT_TYPES = [
  "lead_profiles",
  "buyer_requests",
  "marketplace_listings",
  "submitted_sources",
  "questionnaire_responses",
  "aggregate_civic_signals",
] as const;

export const SEGMENT_RULE_FIELDS = [
  "vertical",
  "category",
  "score_range",
  "confidence",
  "source_type",
  "freshness",
  "review_status",
  "compliance_status",
  "suppression_status",
  "location",
  "buyer_type",
  "budget_range",
  "tool_slug",
  "consent_status",
  "source_proof_status",
  "recommended_next_action",
  "marketplace_status",
] as const;

export const SEGMENT_OPERATORS = [
  "equals",
  "not_equals",
  "contains",
  "greater_than",
  "less_than",
  "between",
  "in",
  "not_in",
  "exists",
  "not_exists",
] as const;

export const SEGMENT_STATUSES = ["draft", "review", "active", "blocked", "archived"] as const;
export const SEGMENT_VISIBILITIES = ["internal", "buyer_preview", "buyer_visible"] as const;
export const SEGMENT_RISK_LEVELS = ["low", "medium", "high", "prohibited"] as const;
export const SEGMENT_COMPLIANCE_STATUSES = ["ready", "needs_review", "blocked", "aggregate_only"] as const;

export type SegmentType = (typeof SEGMENT_TYPES)[number];
export type SegmentRuleField = (typeof SEGMENT_RULE_FIELDS)[number];
export type SegmentOperator = (typeof SEGMENT_OPERATORS)[number];
export type SegmentStatus = (typeof SEGMENT_STATUSES)[number];
export type SegmentVisibility = (typeof SEGMENT_VISIBILITIES)[number];
export type SegmentRiskLevel = (typeof SEGMENT_RISK_LEVELS)[number];
export type SegmentComplianceStatus = (typeof SEGMENT_COMPLIANCE_STATUSES)[number];
export type SegmentRuleGroup = "and" | "or";
export type SegmentRuleValue = string | number | boolean | string[] | number[] | null;

export type SegmentRule = {
  id: string;
  field: SegmentRuleField;
  operator: SegmentOperator;
  value: SegmentRuleValue;
  rule_group: SegmentRuleGroup;
};

export type SegmentCandidate = {
  id: string;
  title: string;
  segmentType: SegmentType;
  vertical: string;
  category: string;
  score: number;
  confidence: string;
  sourceType: string;
  freshness: string;
  reviewStatus: string;
  complianceStatus: string;
  suppressionStatus: string;
  location: string;
  buyerType: string;
  budgetRange: string;
  toolSlug: string;
  consentStatus: string;
  sourceProofStatus: string;
  recommendedNextAction: string;
  marketplaceStatus: string;
  riskLevel: SegmentRiskLevel;
  summary: string;
  exportEligible: boolean;
};

export type SegmentInput = {
  name: string;
  description: string;
  segmentType: SegmentType;
  vertical: string;
  category: string;
  status: SegmentStatus;
  visibility: SegmentVisibility;
};

export type SegmentSafetyResult = {
  blocked: boolean;
  warnings: string[];
  reasons: string[];
};

export type SegmentPreview = {
  estimatedCount: number;
  members: SegmentCandidate[];
  sampleMembers: SegmentCandidate[];
  suppressionCount: number;
  highRiskCount: number;
  prohibitedCount: number;
  missingSourceProofCount: number;
  riskWarnings: string[];
  complianceWarnings: string[];
  sourceProofWarnings: string[];
  safety: SegmentSafetyResult;
  exportEligible: boolean;
  scoreDistribution: Record<string, number>;
  categoryDistribution: Record<string, number>;
  sourceTypeDistribution: Record<string, number>;
};

export const SEGMENT_FIELD_LABELS: Record<SegmentRuleField, string> = {
  vertical: "Vertical",
  category: "Category",
  score_range: "Score range",
  confidence: "Confidence",
  source_type: "Source type",
  freshness: "Freshness",
  review_status: "Review status",
  compliance_status: "Compliance status",
  suppression_status: "Suppression status",
  location: "Location",
  buyer_type: "Buyer type",
  budget_range: "Budget range",
  tool_slug: "Tool slug",
  consent_status: "Consent status",
  source_proof_status: "Source proof status",
  recommended_next_action: "Recommended next action",
  marketplace_status: "Marketplace status",
};

export const SEGMENT_OPERATOR_LABELS: Record<SegmentOperator, string> = {
  equals: "Equals",
  not_equals: "Does not equal",
  contains: "Contains",
  greater_than: "Greater than",
  less_than: "Less than",
  between: "Between",
  in: "In list",
  not_in: "Not in list",
  exists: "Exists",
  not_exists: "Does not exist",
};

const prohibitedRuleWords = [
  "race",
  "religion",
  "medical",
  "health",
  "diagnosis",
  "sexual orientation",
  "minor",
  "child",
  "children",
  "protected trait",
  "bank account",
  "credit card",
  "ssn",
  "social security",
  "password",
  "login-only",
  "hacked",
  "leaked",
  "private voter",
  "individual political persuasion",
  "political persuasion profile",
  "private political identity",
];

const allowedFields = new Set<string>(SEGMENT_RULE_FIELDS);
const allowedOperators = new Set<string>(SEGMENT_OPERATORS);
const allowedTypes = new Set<string>(SEGMENT_TYPES);

function normalize(value: unknown) {
  return String(value ?? "").trim().toLowerCase();
}

function isEmptyValue(value: SegmentRuleValue | undefined) {
  if (value === null || value === undefined) return true;
  if (Array.isArray(value)) return value.length === 0;
  return String(value).trim().length === 0;
}

function valueList(value: SegmentRuleValue | undefined) {
  if (Array.isArray(value)) return value.map((item) => normalize(item)).filter(Boolean);
  return String(value ?? "")
    .split(",")
    .map((item) => normalize(item))
    .filter(Boolean);
}

function numberFrom(value: unknown) {
  if (typeof value === "number") return Number.isFinite(value) ? value : null;
  const parsed = Number(String(value ?? "").replace(/[^0-9.-]/g, ""));
  return Number.isFinite(parsed) ? parsed : null;
}

function betweenValues(value: SegmentRuleValue | undefined): [number, number] | null {
  if (Array.isArray(value) && value.length >= 2) {
    const min = numberFrom(value[0]);
    const max = numberFrom(value[1]);
    return min !== null && max !== null ? [Math.min(min, max), Math.max(min, max)] : null;
  }
  const parts = String(value ?? "").split(/(?:to|-|,)/i);
  if (parts.length < 2) return null;
  const min = numberFrom(parts[0]);
  const max = numberFrom(parts[1]);
  return min !== null && max !== null ? [Math.min(min, max), Math.max(min, max)] : null;
}

export function scoreRangeFor(score: number) {
  if (score >= 90) return "90-100";
  if (score >= 75) return "75-89";
  if (score >= 50) return "50-74";
  if (score > 0) return "1-49";
  return "unknown";
}

export function segmentScoreLabel(score: number) {
  if (score >= 80) return "high";
  if (score >= 60) return "medium";
  if (score > 0) return "low";
  return "unknown";
}

function candidateValue(candidate: SegmentCandidate, field: SegmentRuleField): string | number | boolean | null {
  switch (field) {
    case "vertical": return candidate.vertical;
    case "category": return candidate.category;
    case "score_range": return scoreRangeFor(candidate.score);
    case "confidence": return candidate.confidence;
    case "source_type": return candidate.sourceType;
    case "freshness": return candidate.freshness;
    case "review_status": return candidate.reviewStatus;
    case "compliance_status": return candidate.complianceStatus;
    case "suppression_status": return candidate.suppressionStatus;
    case "location": return candidate.location;
    case "buyer_type": return candidate.buyerType;
    case "budget_range": return candidate.budgetRange;
    case "tool_slug": return candidate.toolSlug;
    case "consent_status": return candidate.consentStatus;
    case "source_proof_status": return candidate.sourceProofStatus;
    case "recommended_next_action": return candidate.recommendedNextAction;
    case "marketplace_status": return candidate.marketplaceStatus;
    default: return null;
  }
}

export function segmentCandidateMatchesRule(candidate: SegmentCandidate, rule: SegmentRule) {
  if (!allowedFields.has(rule.field) || !allowedOperators.has(rule.operator)) return false;

  const rawCandidateValue = candidateValue(candidate, rule.field);
  const candidateText = normalize(rawCandidateValue);
  const ruleText = normalize(rule.value);
  const candidateNumber = rule.field === "score_range" ? candidate.score : numberFrom(rawCandidateValue);

  if (rule.operator === "exists") return candidateText.length > 0 && candidateText !== "unknown";
  if (rule.operator === "not_exists") return !candidateText || candidateText === "unknown";
  if (isEmptyValue(rule.value)) return false;

  if (rule.operator === "equals") return candidateText === ruleText;
  if (rule.operator === "not_equals") return candidateText !== ruleText;
  if (rule.operator === "contains") return candidateText.includes(ruleText);
  if (rule.operator === "in") return valueList(rule.value).includes(candidateText);
  if (rule.operator === "not_in") return !valueList(rule.value).includes(candidateText);

  if (rule.operator === "greater_than") {
    const threshold = numberFrom(rule.value);
    return candidateNumber !== null && threshold !== null && candidateNumber > threshold;
  }

  if (rule.operator === "less_than") {
    const threshold = numberFrom(rule.value);
    return candidateNumber !== null && threshold !== null && candidateNumber < threshold;
  }

  if (rule.operator === "between") {
    const range = betweenValues(rule.value);
    return candidateNumber !== null && range !== null && candidateNumber >= range[0] && candidateNumber <= range[1];
  }

  return false;
}

export function segmentCandidateMatchesRules(candidate: SegmentCandidate, rules: SegmentRule[]) {
  if (!rules.length) return true;

  const andRules = rules.filter((rule) => rule.rule_group !== "or");
  const orRules = rules.filter((rule) => rule.rule_group === "or");
  const andPassed = andRules.every((rule) => segmentCandidateMatchesRule(candidate, rule));
  const orPassed = !orRules.length || orRules.some((rule) => segmentCandidateMatchesRule(candidate, rule));

  return andPassed && orPassed;
}

function countBy<T>(rows: T[], getKey: (row: T) => string | null | undefined) {
  return rows.reduce<Record<string, number>>((acc, row) => {
    const key = getKey(row) || "unknown";
    acc[key] = (acc[key] || 0) + 1;
    return acc;
  }, {});
}

function hasProhibitedPattern(value: unknown) {
  const text = normalize(value);
  return prohibitedRuleWords.some((word) => text.includes(word));
}

export function sanitizeSegmentRules(rules: SegmentRule[]): SegmentRule[] {
  return rules
    .map((rule, index): SegmentRule => {
      const field = allowedFields.has(rule.field) ? rule.field : "vertical";
      const operator = allowedOperators.has(rule.operator) ? rule.operator : "equals";
      const value = Array.isArray(rule.value)
        ? rule.value.map((item) => String(item).trim()).filter(Boolean)
        : typeof rule.value === "number" || typeof rule.value === "boolean"
          ? rule.value
          : String(rule.value ?? "").trim();
      return {
        id: rule.id || `rule-${index + 1}`,
        field,
        operator,
        value,
        rule_group: rule.rule_group === "or" ? "or" : "and",
      };
    })
    .filter((rule) => rule.operator === "exists" || rule.operator === "not_exists" || !isEmptyValue(rule.value));
}

export function validateSegmentSafety(input: {
  segment: SegmentInput;
  rules: SegmentRule[];
  matchedCandidates?: SegmentCandidate[];
}): SegmentSafetyResult {
  const warnings: string[] = [];
  const reasons: string[] = [];

  if (!allowedTypes.has(input.segment.segmentType)) {
    reasons.push("Unsupported segment type.");
  }

  if (input.segment.visibility === "buyer_visible" && input.segment.status !== "active") {
    warnings.push("Buyer-visible segments should not be exposed until they are active and reviewed.");
  }

  if (hasProhibitedPattern(input.segment.name) || hasProhibitedPattern(input.segment.description)) {
    reasons.push("Segment name or description appears to reference prohibited sensitive data.");
  }

  for (const rule of input.rules) {
    if (!allowedFields.has(rule.field)) reasons.push(`Rule field ${rule.field} is not allowed.`);
    if (!allowedOperators.has(rule.operator)) reasons.push(`Rule operator ${rule.operator} is not allowed.`);
    if (hasProhibitedPattern(rule.value)) reasons.push(`Rule value for ${rule.field} references prohibited sensitive data.`);
  }

  const matched = input.matchedCandidates || [];
  const prohibitedCount = matched.filter((candidate) => candidate.riskLevel === "prohibited").length;
  const highRiskCount = matched.filter((candidate) => candidate.riskLevel === "high").length;
  const suppressionCount = matched.filter((candidate) => candidate.suppressionStatus === "suppressed").length;
  const politicalIndividualPattern = input.segment.segmentType !== "aggregate_civic_signals"
    && matched.some((candidate) => /political|civic|campaign/i.test(`${candidate.vertical} ${candidate.category}`));

  if (prohibitedCount > 0) reasons.push(`${prohibitedCount} matched record${prohibitedCount === 1 ? "" : "s"} are prohibited and cannot be segmented.`);
  if (highRiskCount > 0) warnings.push(`${highRiskCount} matched record${highRiskCount === 1 ? "" : "s"} need admin review before packaging.`);
  if (suppressionCount > 0) warnings.push(`${suppressionCount} suppressed record${suppressionCount === 1 ? "" : "s"} must be excluded before marketplace use or export.`);
  if (politicalIndividualPattern) reasons.push("Civic or political signals must stay aggregate, public-source, or explicitly consented. Individual persuasion segments are blocked.");

  return {
    blocked: reasons.length > 0,
    warnings,
    reasons,
  };
}

export function runSegmentPreview(input: {
  segment: SegmentInput;
  rules: SegmentRule[];
  candidates: SegmentCandidate[];
}): SegmentPreview {
  const rules = sanitizeSegmentRules(input.rules);
  const typeCandidates = input.candidates.filter((candidate) => candidate.segmentType === input.segment.segmentType);
  const members = typeCandidates.filter((candidate) => segmentCandidateMatchesRules(candidate, rules));
  const suppressionCount = members.filter((candidate) => candidate.suppressionStatus === "suppressed").length;
  const highRiskCount = members.filter((candidate) => candidate.riskLevel === "high").length;
  const prohibitedCount = members.filter((candidate) => candidate.riskLevel === "prohibited").length;
  const missingSourceProofCount = members.filter((candidate) => !["approved", "verified", "sample_available", "sampleAvailable"].includes(candidate.sourceProofStatus)).length;
  const safety = validateSegmentSafety({ segment: input.segment, rules, matchedCandidates: members });

  const sourceProofWarnings = missingSourceProofCount
    ? [`${missingSourceProofCount} matched record${missingSourceProofCount === 1 ? "" : "s"} need source proof review.`]
    : [];
  const riskWarnings = [
    ...(highRiskCount ? [`${highRiskCount} high-risk record${highRiskCount === 1 ? "" : "s"} need manual review.`] : []),
    ...(prohibitedCount ? [`${prohibitedCount} prohibited record${prohibitedCount === 1 ? "" : "s"} blocked this segment.`] : []),
  ];
  const complianceWarnings = [
    ...safety.warnings,
    ...safety.reasons,
    ...(suppressionCount ? [`${suppressionCount} suppressed record${suppressionCount === 1 ? "" : "s"} matched this rule set.`] : []),
  ];

  return {
    estimatedCount: members.length,
    members,
    sampleMembers: members.slice(0, 5),
    suppressionCount,
    highRiskCount,
    prohibitedCount,
    missingSourceProofCount,
    riskWarnings,
    complianceWarnings,
    sourceProofWarnings,
    safety,
    exportEligible: !safety.blocked && suppressionCount === 0 && highRiskCount === 0 && prohibitedCount === 0 && missingSourceProofCount === 0,
    scoreDistribution: countBy(members, (candidate) => segmentScoreLabel(candidate.score)),
    categoryDistribution: countBy(members, (candidate) => candidate.category),
    sourceTypeDistribution: countBy(members, (candidate) => candidate.sourceType),
  };
}
