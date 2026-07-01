export const SOURCE_SUBMISSION_VERSION = "source-submission-v1";

export const sourceSubmissionTypes = [
  { id: "website_directory", label: "Website or directory" },
  { id: "business_list", label: "Business list" },
  { id: "local_service_route", label: "Local service route" },
  { id: "ecommerce_vendor_source", label: "Ecommerce vendor source" },
  { id: "real_estate_source", label: "Real estate source" },
  { id: "mortgage_refi_source", label: "Mortgage/refi source" },
  { id: "political_civic_issue_source", label: "Political/civic issue source" },
  { id: "creator_audience", label: "Creator audience" },
  { id: "tool_quiz_idea", label: "Tool or quiz idea" },
  { id: "other", label: "Other" },
] as const;

export const sourceVerticals = [
  "Local business",
  "Home services",
  "Real estate",
  "Mortgage/refi",
  "Ecommerce",
  "B2B SaaS",
  "AI tools",
  "Creator economy",
  "Consumer shopping",
  "Political/civic issue signals",
  "Legal",
  "Dental",
  "Other",
] as const;

export const sourceCategories = [
  "Public directory",
  "Service need",
  "Buyer intent",
  "Vendor list",
  "Website gap",
  "Audience demand",
  "Local route",
  "Pricing clue",
  "Launch signal",
  "Tool idea",
  "Review signal",
  "Referral network",
] as const;

export const sourceDataFieldOptions = [
  { id: "names", label: "Names" },
  { id: "business_names", label: "Business names" },
  { id: "websites", label: "Websites" },
  { id: "phone_numbers", label: "Phone numbers" },
  { id: "emails", label: "Emails" },
  { id: "public_profiles", label: "Public profiles" },
  { id: "issue_preferences", label: "Issue preferences" },
  { id: "purchase_intent", label: "Purchase intent" },
  { id: "service_need", label: "Service need" },
  { id: "location", label: "Location" },
  { id: "budget_range", label: "Budget range" },
  { id: "other", label: "Other" },
] as const;

export const sourceOriginOptions = [
  { id: "public_website", label: "Public website" },
  { id: "user_submitted", label: "User-submitted" },
  { id: "partner_owned", label: "Partner-owned" },
  { id: "scraped_public_source", label: "Scraped public source" },
  { id: "customer_provided", label: "Customer provided" },
  { id: "purchased_list", label: "Purchased list" },
  { id: "unknown", label: "Unknown" },
  { id: "other", label: "Other" },
] as const;

export const reviewStatuses = [
  "submitted",
  "needs_review",
  "approved_for_research",
  "approved_for_marketplace",
  "rejected",
  "suppressed",
  "needs_permission",
  "duplicate",
  "archived",
] as const;

export type SourceReviewStatus = (typeof reviewStatuses)[number];
export type SourceRiskLevel = "low" | "medium" | "high" | "prohibited";

export type SourcePermissionAnswers = {
  ownsData: boolean;
  publiclyAvailable: boolean;
  permissionToShare: boolean;
  hasRestrictions: boolean;
  includesMinors: boolean;
  includesSensitiveData: boolean;
  includesMedicalData: boolean;
  includesPrivateFinancialData: boolean;
  includesProtectedTraitData: boolean;
  includesSensitivePoliticalIdentity: boolean;
  includesLoginOnlySource: boolean;
  includesLeakedOrHackedData: boolean;
  canBeResold: boolean;
  canBeUsedForOutreach: boolean;
  researchOnly: boolean;
};

export type SourceRiskInput = {
  sourceType: string;
  originType: string;
  dataFieldsPresent: string[];
  permission: SourcePermissionAnswers;
  restrictions?: string;
  sourceUrl?: string;
};

export type SourceRiskResult = {
  riskLevel: SourceRiskLevel;
  reviewStatus: SourceReviewStatus;
  sensitiveDataFlag: boolean;
  minorsFlag: boolean;
  flags: string[];
  warnings: string[];
  blockedSampleStorage: boolean;
};

export function labelForSourceOption<T extends readonly { id: string; label: string }[]>(options: T, id: string) {
  return options.find((item) => item.id === id)?.label ?? id.replace(/_/g, " ");
}

export function emptyPermissionAnswers(): SourcePermissionAnswers {
  return {
    ownsData: false,
    publiclyAvailable: false,
    permissionToShare: false,
    hasRestrictions: false,
    includesMinors: false,
    includesSensitiveData: false,
    includesMedicalData: false,
    includesPrivateFinancialData: false,
    includesProtectedTraitData: false,
    includesSensitivePoliticalIdentity: false,
    includesLoginOnlySource: false,
    includesLeakedOrHackedData: false,
    canBeResold: false,
    canBeUsedForOutreach: false,
    researchOnly: false,
  };
}

export function evaluateSourceRisk(input: SourceRiskInput): SourceRiskResult {
  const flags = new Set<string>();
  const warnings = new Set<string>();
  let riskScore = 0;
  let prohibited = false;

  const hasContactData = input.dataFieldsPresent.some((field) =>
    ["names", "phone_numbers", "emails", "public_profiles"].includes(field),
  );

  function flag(id: string, warning: string, points: number, isProhibited = false) {
    flags.add(id);
    warnings.add(warning);
    riskScore += points;
    if (isProhibited) prohibited = true;
  }

  if (input.permission.includesMinors) {
    flag("minors", "Sources involving minors are not accepted into automated processing.", 100, true);
  }
  if (input.permission.includesMedicalData) {
    flag("medical_data", "Medical or health data is prohibited in the general source intake.", 100, true);
  }
  if (input.permission.includesPrivateFinancialData) {
    flag("private_financial_data", "Private financial-account data is prohibited.", 100, true);
  }
  if (input.permission.includesProtectedTraitData) {
    flag("protected_traits", "Protected-trait data cannot be used for targeting or resale.", 100, true);
  }
  if (input.permission.includesSensitivePoliticalIdentity) {
    flag("sensitive_political_identity", "Private political identity is not accepted. Civic issue work must stay aggregate or explicit-consent only.", 100, true);
  }
  if (input.permission.includesLoginOnlySource) {
    flag("login_only_source", "Login-only or access-restricted sources need admin review and are not processed automatically.", 80, true);
  }
  if (input.permission.includesLeakedOrHackedData) {
    flag("leaked_or_hacked_data", "Leaked, hacked, hidden, or stolen data is not accepted.", 100, true);
  }

  if (input.permission.includesSensitiveData) {
    flag("sensitive_data_claimed", "Sensitive data was disclosed, so this must stay in admin review.", 60);
  }
  if (!input.permission.publiclyAvailable && !input.permission.permissionToShare && !input.permission.ownsData) {
    flag("unclear_permission", "Permission is unclear. The source needs proof before it can move forward.", 45);
  }
  if (input.originType === "unknown") {
    flag("unknown_origin", "Unknown origin sources need proof before they can be used.", 35);
  }
  if (input.originType === "purchased_list") {
    flag("purchased_list", "Purchased lists need origin, permission, and suppression review before use.", 40);
  }
  if (input.originType === "purchased_list" && !input.permission.permissionToShare) {
    flag("purchased_unknown_permission", "Purchased lists without permission proof cannot be released.", 55);
  }
  if (input.permission.hasRestrictions || input.permission.researchOnly || input.restrictions?.trim()) {
    flag("restricted_use", "Usage restrictions were disclosed. Review must preserve those limits.", 25);
  }
  if (input.sourceType === "political_civic_issue_source" && hasContactData) {
    flag("civic_contact_data", "Civic issue sources with contact data must stay aggregate or explicit-consent only.", 50);
  }
  if (!input.sourceUrl && ["public_website", "scraped_public_source"].includes(input.originType)) {
    flag("missing_source_url", "Public-source submissions need a URL or proof path.", 20);
  }
  if (hasContactData && !input.permission.canBeUsedForOutreach) {
    flag("contact_data_no_outreach_claim", "Contact fields are present, but outreach rights were not confirmed.", 35);
  }

  const riskLevel: SourceRiskLevel = prohibited
    ? "prohibited"
    : riskScore >= 75
      ? "high"
      : riskScore >= 30
        ? "medium"
        : "low";

  const reviewStatus: SourceReviewStatus = prohibited
    ? "needs_review"
    : flags.has("unclear_permission") || flags.has("purchased_unknown_permission")
      ? "needs_permission"
      : riskLevel === "high"
        ? "needs_review"
        : "submitted";

  return {
    riskLevel,
    reviewStatus,
    sensitiveDataFlag:
      input.permission.includesSensitiveData ||
      input.permission.includesMedicalData ||
      input.permission.includesPrivateFinancialData ||
      input.permission.includesProtectedTraitData ||
      input.permission.includesSensitivePoliticalIdentity,
    minorsFlag: input.permission.includesMinors,
    flags: [...flags],
    warnings: [...warnings],
    blockedSampleStorage: riskLevel === "prohibited" || flags.has("leaked_or_hacked_data") || flags.has("login_only_source"),
  };
}

export function sourceReviewStatusLabel(status: string) {
  return status.replace(/_/g, " ");
}
