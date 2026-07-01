import "server-only";

import crypto from "crypto";
import {
  hasLeadFlowDataApiConfig,
  insertLeadFlowRow,
  patchLeadFlowRows,
  selectLeadFlowRows,
} from "@/lib/leadflow-data-api";
import { sanitizeLeadFlowEventProperties } from "@/lib/leadflow-events";

export const CIVIC_CONSENT_VERSION = "leadflow-civic-consent-v1";

export const CIVIC_ISSUE_CATEGORIES = [
  "taxes",
  "roads",
  "schools",
  "crime",
  "courts",
  "police",
  "housing",
  "business",
  "property_rights",
  "healthcare",
  "local_government",
  "elections",
  "transparency",
  "corruption_concerns",
  "family_issues",
  "veteran_issues",
  "other",
] as const;

export type CivicIssueCategory = (typeof CIVIC_ISSUE_CATEGORIES)[number];
export type CivicReviewStatus = "pending" | "review" | "approved" | "rejected" | "suppressed" | "public_display_approved";
export type CivicRiskLevel = "low" | "medium" | "high" | "prohibited";

export type CivicAggregateRow = {
  id: string;
  geography: string;
  district: string | null;
  issue_category: CivicIssueCategory | string;
  response_count: number | string;
  urgency_average: number | string;
  top_concerns: string[] | null;
  source_type: string;
  time_period: string;
  public_visible: boolean;
  created_at: string;
  updated_at: string;
};

export type CivicDistrictRow = {
  id: string;
  geography: string;
  district: string;
  district_type: string;
  state: string | null;
  source_url: string | null;
  status: string;
  created_at: string;
  updated_at: string;
};

export type CivicSourceRow = {
  id: string;
  source_type: string;
  title: string;
  source_url: string | null;
  geography: string | null;
  district: string | null;
  issue_category: string | null;
  source_summary: string | null;
  status: string;
  review_status: string;
  risk_level: CivicRiskLevel;
  public_visible: boolean;
  found_at: string | null;
  verified_at: string | null;
  created_at: string;
  updated_at: string;
};

export type CivicSurveyRow = {
  id: string;
  anonymous_session_id: string | null;
  location: string;
  district: string | null;
  issue_priority: string;
  concern_category: CivicIssueCategory | string;
  urgency: number;
  personal_story: string | null;
  contact_email: string | null;
  save_response_consent: boolean;
  contact_consent: boolean;
  public_display_consent: boolean;
  share_with_civic_org_consent: boolean;
  anonymous_allowed: boolean;
  consent_version: string;
  review_status: CivicReviewStatus;
  risk_level: CivicRiskLevel;
  source_url: string | null;
  source_path: string | null;
  created_at: string;
  updated_at: string;
};

export type CivicSubmissionRow = {
  id: string;
  survey_id: string | null;
  submission_type: string;
  title: string;
  body: string | null;
  location: string | null;
  district: string | null;
  issue_category: string | null;
  source_url: string | null;
  public_display_consent: boolean;
  public_display_approved: boolean;
  contact_consent: boolean;
  share_with_civic_org_consent: boolean;
  anonymous_allowed: boolean;
  review_status: CivicReviewStatus;
  risk_level: CivicRiskLevel;
  created_at: string;
  updated_at: string;
};

export type CivicSurveyInput = {
  location: string;
  district?: string;
  issuePriority: string;
  concernCategory: CivicIssueCategory;
  urgency: number;
  personalStory?: string;
  contactEmail?: string;
  consents: {
    saveResponse: boolean;
    contactMe: boolean;
    publicDisplay: boolean;
    shareWithCivicOrg: boolean;
    keepAnonymous: boolean;
  };
  anonymousUserId?: string;
  sourceUrl?: string;
  sourcePath?: string;
  userAgent?: string | null;
  ipAddress?: string | null;
};

export type CivicPublicData = {
  mode: "live" | "offline";
  aggregates: CivicAggregateRow[];
  districts: CivicDistrictRow[];
  sources: CivicSourceRow[];
  publicSubmissions: CivicSubmissionRow[];
  issueCategories: Array<{ id: CivicIssueCategory; label: string }>;
  tools: Array<{ title: string; body: string; href: string; status: string }>;
  loadErrors: string[];
};

export type CivicDashboardData = CivicPublicData & {
  surveys: CivicSurveyRow[];
  allSubmissions: CivicSubmissionRow[];
  stats: {
    surveyResponses: number;
    districtLevelCounts: number;
    publicSourceCounts: number;
    concernsNeedingReview: number;
    submissionsFlaggedForRisk: number;
    optInContacts: number;
    publicDisplayApprovals: number;
    topIssues: Array<{ issue: string; count: number; urgency: number }>;
  };
};

export const CIVIC_TOOLS = [
  {
    title: "Issue Pulse Survey",
    body: "Collect consented issue priorities, urgency, and public-display permission.",
    href: "/civic/surveys",
    status: "live",
  },
  {
    title: "Local Government Watchlist",
    body: "Monitor public meeting agendas, public pages, and local accountability signals.",
    href: "/civic/districts",
    status: "framework",
  },
  {
    title: "Candidate Page Checker",
    body: "Review public candidate pages for source-backed public information gaps.",
    href: "/civic",
    status: "framework",
  },
  {
    title: "Public Meeting Signal Tracker",
    body: "Track agenda topics, public comment themes, and repeated community concerns.",
    href: "/civic/issue-pulse",
    status: "framework",
  },
  {
    title: "District Concern Map",
    body: "Show aggregate issue counts by geography and district without individual targeting labels.",
    href: "/civic/districts",
    status: "live",
  },
  {
    title: "Policy Priority Poll",
    body: "Ask which local topics people want leaders to address first.",
    href: "/civic/surveys",
    status: "live",
  },
  {
    title: "Local Accountability Submission Form",
    body: "Accept voluntary concerns for review before any public display.",
    href: "/civic/surveys",
    status: "live",
  },
  {
    title: "Rep Profile Builder",
    body: "Build representative profiles only from public sources and reviewed records.",
    href: "/civic",
    status: "framework",
  },
];

export const CIVIC_RESTRICTED_RULES = [
  "No individual political persuasion profiles.",
  "No inferred private political beliefs.",
  "No protected-trait targeting.",
  "No minors, private messages, hacked lists, leaked lists, or unclear-permission data.",
  "No automatic entry into commercial lead marketplace products.",
];

export const CIVIC_ALLOWED_SOURCE_TYPES = [
  "public meeting agendas",
  "public comments",
  "public government pages",
  "public candidate websites",
  "public campaign finance links",
  "public survey results",
  "consented issue surveys",
  "aggregated issue priorities",
  "district-level topic counts",
  "public civic events",
  "voluntarily submitted concerns",
];

const CATEGORY_LABELS: Record<CivicIssueCategory, string> = {
  taxes: "Taxes",
  roads: "Roads",
  schools: "Schools",
  crime: "Crime",
  courts: "Courts",
  police: "Police",
  housing: "Housing",
  business: "Business",
  property_rights: "Property rights",
  healthcare: "Healthcare",
  local_government: "Local government",
  elections: "Elections",
  transparency: "Transparency",
  corruption_concerns: "Corruption concerns",
  family_issues: "Family issues",
  veteran_issues: "Veteran issues",
  other: "Other",
};

const PROHIBITED_PATTERN =
  /\b(minor|under 18|child's name|ssn|social security|medical record|diagnosis|patient record|bank account|credit card|race|ethnicity|religion|sexual orientation|private political belief|private political identity|voter file|hacked|leaked|private message|login-only|password)\b/i;

const now = new Date();
const day = 24 * 60 * 60 * 1000;
const iso = (daysAgo: number) => new Date(now.getTime() - daysAgo * day).toISOString();

const fallbackAggregates: CivicAggregateRow[] = [
  {
    id: "demo-civic-roads",
    geography: "Longview, Texas",
    district: "Longview City Council",
    issue_category: "roads",
    response_count: 18,
    urgency_average: 4.1,
    top_concerns: ["potholes", "drainage", "traffic timing"],
    source_type: "seeded_public_demo",
    time_period: "rolling_30_days",
    public_visible: true,
    created_at: iso(6),
    updated_at: iso(0),
  },
  {
    id: "demo-civic-transparency",
    geography: "Gregg County, Texas",
    district: "Gregg County",
    issue_category: "transparency",
    response_count: 11,
    urgency_average: 4.4,
    top_concerns: ["open records", "meeting visibility", "budget clarity"],
    source_type: "seeded_public_demo",
    time_period: "rolling_30_days",
    public_visible: true,
    created_at: iso(5),
    updated_at: iso(0),
  },
  {
    id: "demo-civic-veteran",
    geography: "East Texas",
    district: "Regional civic watch",
    issue_category: "veteran_issues",
    response_count: 9,
    urgency_average: 3.8,
    top_concerns: ["benefit navigation", "transportation", "local support"],
    source_type: "seeded_public_demo",
    time_period: "rolling_30_days",
    public_visible: true,
    created_at: iso(4),
    updated_at: iso(0),
  },
];

const fallbackDistricts: CivicDistrictRow[] = [
  {
    id: "demo-district-longview",
    geography: "Longview, Texas",
    district: "Longview City Council",
    district_type: "city",
    state: "TX",
    source_url: "https://www.longviewtexas.gov/",
    status: "active",
    created_at: iso(10),
    updated_at: iso(1),
  },
  {
    id: "demo-district-gregg",
    geography: "Gregg County, Texas",
    district: "Gregg County",
    district_type: "county",
    state: "TX",
    source_url: "https://www.co.gregg.tx.us/",
    status: "active",
    created_at: iso(10),
    updated_at: iso(1),
  },
];

const fallbackSources: CivicSourceRow[] = [
  {
    id: "demo-source-longview",
    source_type: "government_page",
    title: "Longview public meeting and agenda pages",
    source_url: "https://www.longviewtexas.gov/",
    geography: "Longview, Texas",
    district: "Longview City Council",
    issue_category: "local_government",
    source_summary: "Public government pages can support meeting, agenda, and comment signal monitoring.",
    status: "approved",
    review_status: "approved",
    risk_level: "low",
    public_visible: true,
    found_at: iso(8),
    verified_at: iso(1),
    created_at: iso(8),
    updated_at: iso(1),
  },
];

const fallbackSubmissions: CivicSubmissionRow[] = [
  {
    id: "demo-submission-public",
    survey_id: null,
    submission_type: "issue_concern",
    title: "More visible public meeting summaries",
    body: "Residents need plain-English summaries of what was voted on and what changed after the meeting.",
    location: "Longview, Texas",
    district: "Longview City Council",
    issue_category: "transparency",
    source_url: null,
    public_display_consent: true,
    public_display_approved: true,
    contact_consent: false,
    share_with_civic_org_consent: false,
    anonymous_allowed: true,
    review_status: "public_display_approved",
    risk_level: "low",
    created_at: iso(2),
    updated_at: iso(1),
  },
];

export function civicIssueLabel(category: string) {
  return CATEGORY_LABELS[category as CivicIssueCategory] || category.replace(/_/g, " ");
}

export function civicIssueOptions() {
  return CIVIC_ISSUE_CATEGORIES.map((id) => ({ id, label: civicIssueLabel(id) }));
}

function cleanText(value: string | undefined, max = 500) {
  return (value || "").replace(/\s+/g, " ").trim().slice(0, max);
}

function hashValue(value: string | null | undefined) {
  if (!value) return null;
  const salt = process.env.CONSENT_HASH_SALT || process.env.NEXTAUTH_SECRET || "leadflow-civic-local-salt";
  return crypto.createHash("sha256").update(`${salt}:${value}`).digest("hex");
}

function safeUrl(input: string | undefined, fallback = "https://www.theleadflowpro.com/civic/surveys") {
  try {
    const url = new URL(input || fallback, "https://www.theleadflowpro.com");
    url.hash = "";
    return url.toString().slice(0, 900);
  } catch {
    return fallback;
  }
}

function safePath(input: string | undefined) {
  try {
    const url = new URL(input || "/civic/surveys", "https://www.theleadflowpro.com");
    if (!url.pathname.startsWith("/civic")) return "/civic/surveys";
    return `${url.pathname}${url.search}`.slice(0, 700);
  } catch {
    return "/civic/surveys";
  }
}

function riskForSurvey(input: CivicSurveyInput): { risk: CivicRiskLevel; blocked: boolean; reason?: string } {
  const story = cleanText(input.personalStory, 4000);
  const combined = `${story} ${input.issuePriority} ${input.location} ${input.district || ""}`;
  if (PROHIBITED_PATTERN.test(combined)) {
    return {
      risk: "prohibited",
      blocked: true,
      reason:
        "This civic tool cannot accept minors, protected-trait targeting, private political identity, hacked/leaked lists, private messages, medical records, or private financial data.",
    };
  }
  if (story.length > 1200 || /corruption|threat|retaliation|lawsuit|criminal/i.test(story)) return { risk: "medium", blocked: false };
  return { risk: "low", blocked: false };
}

async function ensureAnonymousSession(input: {
  anonymousUserId?: string;
  sourceUrl: string;
  sourcePath: string;
  userAgent?: string | null;
  ipAddress?: string | null;
}) {
  if (!hasLeadFlowDataApiConfig()) return null;
  const anonymousUserId = (input.anonymousUserId || `civic_${crypto.randomUUID()}`).replace(/[^a-zA-Z0-9_.:-]/g, "").slice(0, 120);
  const existing = await selectLeadFlowRows<{ id: string }>("anonymous_sessions", {
    select: "id",
    anonymous_user_id: `eq.${anonymousUserId}`,
    limit: 1,
  }).catch(() => []);
  if (existing[0]?.id) return existing[0].id;

  const inserted = await insertLeadFlowRow<{ id: string }>("anonymous_sessions", {
    anonymous_user_id: anonymousUserId,
    source_url: input.sourceUrl,
    source_path: input.sourcePath,
    landing_page: input.sourcePath,
    user_agent_hash: hashValue(input.userAgent),
    ip_hash: hashValue(input.ipAddress),
    metadata: { source: "civic_issue_pulse" },
  }).catch(() => []);
  return inserted[0]?.id || null;
}

async function insertCivicEvent(eventName: string, properties: Record<string, unknown>, anonymousSessionId?: string | null) {
  if (!hasLeadFlowDataApiConfig()) return;
  const safe = sanitizeLeadFlowEventProperties(properties);
  await insertLeadFlowRow("events", {
    anonymous_session_id: anonymousSessionId || null,
    event_name: eventName,
    event_type: "civic",
    tool_slug: "civic_issue_pulse",
    vertical: "civic",
    category: typeof safe.category === "string" ? safe.category : null,
    source_url: "https://www.theleadflowpro.com/civic",
    source_path: typeof safe.route === "string" ? safe.route : "/civic",
    properties: {
      ...safe,
      civic_marketplace_boundary: "aggregate_review_only",
    },
  }).catch(() => null);
}

async function writeConsentRows(input: CivicSurveyInput, surveyId: string, anonymousSessionId: string | null) {
  if (!hasLeadFlowDataApiConfig()) return;
  const sourceUrl = safeUrl(input.sourceUrl);
  const sourcePath = safePath(input.sourcePath);
  const base = {
    anonymous_session_id: anonymousSessionId,
    response_id: null,
    identity_id: null,
    granted: true,
    sales_channel: "web_quiz",
    vertical: "general",
    consent_status: "accepted",
    consent_version: CIVIC_CONSENT_VERSION,
    notice_version: CIVIC_CONSENT_VERSION,
    source_url: sourceUrl,
    source_path: sourcePath,
    capture_url: sourceUrl,
    tool_slug: "civic_issue_pulse",
    ip_hash: hashValue(input.ipAddress),
    user_agent_hash: hashValue(input.userAgent),
    metadata: { civic_survey_id: surveyId, civic_context: "aggregate_or_consent_only" },
    accepted_at: new Date().toISOString(),
  };

  const consentRows = [
    input.consents.saveResponse && {
      ...base,
      scope: "aggregated_insights",
      consent_scope: "save_civic_survey_response",
      consent_type: "save_my_survey_response",
      consent_text: "Save my civic issue survey response for aggregate issue pulse analysis.",
      disclosure_text: "LeadFlow may use this response in aggregate civic issue dashboards after review.",
    },
    input.consents.contactMe && {
      ...base,
      scope: "email_contact",
      consent_scope: "contact_about_civic_issue",
      consent_type: "contact_me_about_this_issue",
      consent_text: "Contact me about this civic issue or issue update.",
      disclosure_text: "Contact permission is separate from public display, sharing, and marketplace use.",
    },
    input.consents.publicDisplay && {
      ...base,
      scope: "aggregated_insights",
      consent_scope: "public_display_civic_comment",
      consent_type: "display_my_comment_publicly",
      consent_text: "Review my comment for possible public display.",
      disclosure_text: "Public display requires admin approval and does not include private contact info.",
    },
    input.consents.shareWithCivicOrg && {
      ...base,
      scope: "data_export",
      consent_scope: "share_with_civic_organization_or_campaign",
      consent_type: "share_my_concern_with_civic_org",
      consent_text: "Share my concern with a civic organization or campaign after review.",
      disclosure_text: "Sharing civic concerns requires manual review and must match the stated issue purpose.",
    },
    input.consents.keepAnonymous && {
      ...base,
      scope: "aggregated_insights",
      consent_scope: "keep_response_anonymous",
      consent_type: "keep_my_response_anonymous",
      consent_text: "Keep my response anonymous in public civic displays.",
      disclosure_text: "Anonymous public display removes private contact information and individual targeting labels.",
    },
  ].filter(Boolean);

  await Promise.all(consentRows.map((row) => insertLeadFlowRow("consent_ledger", row as Record<string, unknown>).catch(() => null)));
}

async function updateAggregate(input: CivicSurveyInput) {
  if (!hasLeadFlowDataApiConfig()) return;
  const geography = cleanText(input.location, 180);
  const district = cleanText(input.district, 180) || null;
  const existing = await selectLeadFlowRows<CivicAggregateRow>("civic_aggregates", {
    select: "*",
    geography: `eq.${geography}`,
    district: district ? `eq.${district}` : "is.null",
    issue_category: `eq.${input.concernCategory}`,
    time_period: "eq.rolling_30_days",
    limit: 1,
  }).catch(() => []);
  const current = existing[0];
  if (!current) {
    await insertLeadFlowRow("civic_aggregates", {
      geography,
      district,
      issue_category: input.concernCategory,
      response_count: 1,
      urgency_average: input.urgency,
      top_concerns: [cleanText(input.issuePriority, 80)].filter(Boolean),
      source_type: "consented_issue_survey",
      time_period: "rolling_30_days",
      public_visible: true,
    }).catch(() => null);
    return;
  }
  const oldCount = Number(current.response_count || 0);
  const oldAverage = Number(current.urgency_average || 0);
  const newCount = oldCount + 1;
  const newAverage = Number((((oldAverage * oldCount) + input.urgency) / newCount).toFixed(2));
  const concerns = Array.from(new Set([...(current.top_concerns || []), cleanText(input.issuePriority, 80)].filter(Boolean))).slice(0, 8);
  await patchLeadFlowRows("civic_aggregates", { id: `eq.${current.id}` }, {
    response_count: newCount,
    urgency_average: newAverage,
    top_concerns: concerns,
    updated_at: new Date().toISOString(),
  }).catch(() => null);
}

export async function submitCivicSurvey(input: CivicSurveyInput) {
  if (!input.consents.saveResponse) {
    return { ok: false as const, status: 400, error: "Check the save-response consent box before submitting." };
  }
  if (input.contactEmail && !input.consents.contactMe) {
    return { ok: false as const, status: 400, error: "Email updates require the contact consent box." };
  }
  const risk = riskForSurvey(input);
  if (risk.blocked) {
    await insertCivicEvent("civic_submission_flagged", {
      route: "/civic/surveys",
      category: input.concernCategory,
      status: "blocked",
      risk_level: risk.risk,
    });
    return { ok: false as const, status: 400, error: risk.reason || "This civic submission cannot be accepted." };
  }

  const sourceUrl = safeUrl(input.sourceUrl);
  const sourcePath = safePath(input.sourcePath);
  const anonymousSessionId = await ensureAnonymousSession({
    anonymousUserId: input.anonymousUserId,
    sourceUrl,
    sourcePath,
    userAgent: input.userAgent,
    ipAddress: input.ipAddress,
  });

  let surveyId: string | null = null;
  let submissionId: string | null = null;

  if (hasLeadFlowDataApiConfig()) {
    const email = cleanText(input.contactEmail, 220).toLowerCase();
    const insertedSurvey = await insertLeadFlowRow<{ id: string }>("civic_surveys", {
      anonymous_session_id: anonymousSessionId,
      location: cleanText(input.location, 180),
      district: cleanText(input.district, 180) || null,
      issue_priority: cleanText(input.issuePriority, 600),
      concern_category: input.concernCategory,
      urgency: input.urgency,
      personal_story: cleanText(input.personalStory, 3000) || null,
      contact_email: email || null,
      contact_email_sha256: hashValue(email),
      save_response_consent: input.consents.saveResponse,
      contact_consent: input.consents.contactMe,
      public_display_consent: input.consents.publicDisplay,
      share_with_civic_org_consent: input.consents.shareWithCivicOrg,
      anonymous_allowed: input.consents.keepAnonymous,
      consent_version: CIVIC_CONSENT_VERSION,
      review_status: risk.risk === "medium" ? "review" : "pending",
      risk_level: risk.risk,
      source_url: sourceUrl,
      source_path: sourcePath,
      ip_hash: hashValue(input.ipAddress),
      user_agent_hash: hashValue(input.userAgent),
      metadata: {
        civic_boundary: "not_commercial_marketplace",
        public_display_requires_admin_approval: true,
      },
    }).catch(() => []);
    surveyId = insertedSurvey[0]?.id || null;

    if (surveyId && (input.personalStory || input.issuePriority)) {
      const insertedSubmission = await insertLeadFlowRow<{ id: string }>("civic_submissions", {
        survey_id: surveyId,
        submission_type: "issue_concern",
        title: cleanText(input.issuePriority, 160),
        body: cleanText(input.personalStory, 3000) || null,
        location: cleanText(input.location, 180),
        district: cleanText(input.district, 180) || null,
        issue_category: input.concernCategory,
        public_display_consent: input.consents.publicDisplay,
        public_display_approved: false,
        contact_consent: input.consents.contactMe,
        share_with_civic_org_consent: input.consents.shareWithCivicOrg,
        anonymous_allowed: input.consents.keepAnonymous,
        review_status: input.consents.publicDisplay ? "review" : "pending",
        risk_level: risk.risk,
        metadata: {
          civic_boundary: "review_before_public_display",
          no_individual_persuasion_profile: true,
        },
      }).catch(() => []);
      submissionId = insertedSubmission[0]?.id || null;
    }

    if (surveyId) {
      await writeConsentRows(input, surveyId, anonymousSessionId);
      await updateAggregate(input);
      await insertLeadFlowRow("audit_log", {
        actor_type: "consumer",
        action: "civic_survey_submitted",
        object_table: "civic_surveys",
        object_id: surveyId,
        after_redacted: {
          concern_category: input.concernCategory,
          urgency: input.urgency,
          location: cleanText(input.location, 180),
          public_display_consent: input.consents.publicDisplay,
          share_with_civic_org_consent: input.consents.shareWithCivicOrg,
        },
        details: {
          civic_boundary: "aggregate_or_manual_review_only",
          consent_version: CIVIC_CONSENT_VERSION,
        },
        ip_hash: hashValue(input.ipAddress),
        user_agent_hash: hashValue(input.userAgent),
      }).catch(() => null);
    }
  }

  await insertCivicEvent("civic_survey_completed", {
    route: "/civic/surveys",
    category: input.concernCategory,
    status: "submitted",
    urgency: input.urgency,
    risk_level: risk.risk,
    public_display_requested: input.consents.publicDisplay,
  }, anonymousSessionId);

  return {
    ok: true as const,
    status: 200,
    surveyId,
    submissionId,
    persisted: hasLeadFlowDataApiConfig() && Boolean(surveyId),
    message:
      "Your issue signal was submitted for aggregate review. Public display and sharing require the permissions you selected plus manual review.",
  };
}

export async function getCivicPublicData(): Promise<CivicPublicData> {
  if (!hasLeadFlowDataApiConfig()) {
    return {
      mode: "offline",
      aggregates: fallbackAggregates,
      districts: fallbackDistricts,
      sources: fallbackSources,
      publicSubmissions: fallbackSubmissions,
      issueCategories: civicIssueOptions(),
      tools: CIVIC_TOOLS,
      loadErrors: ["Supabase Data API is not configured. Showing safe civic demo data."],
    };
  }

  const loadErrors: string[] = [];
  const [aggregates, districts, sources, publicSubmissions] = await Promise.all([
    selectLeadFlowRows<CivicAggregateRow>("civic_aggregates", {
      select: "*",
      public_visible: "eq.true",
      order: "response_count.desc",
      limit: 100,
    }).catch((error) => {
      loadErrors.push(error instanceof Error ? error.message : "Unable to load civic aggregates.");
      return fallbackAggregates;
    }),
    selectLeadFlowRows<CivicDistrictRow>("civic_districts", {
      select: "*",
      status: "eq.active",
      deleted_at: "is.null",
      order: "geography.asc",
      limit: 100,
    }).catch(() => fallbackDistricts),
    selectLeadFlowRows<CivicSourceRow>("civic_sources", {
      select: "*",
      public_visible: "eq.true",
      status: "eq.approved",
      deleted_at: "is.null",
      order: "verified_at.desc",
      limit: 50,
    }).catch(() => fallbackSources),
    selectLeadFlowRows<CivicSubmissionRow>("civic_submissions", {
      select: "*",
      public_display_approved: "eq.true",
      review_status: "eq.public_display_approved",
      deleted_at: "is.null",
      order: "created_at.desc",
      limit: 30,
    }).catch(() => fallbackSubmissions),
  ]);

  return {
    mode: loadErrors.length ? "offline" : "live",
    aggregates,
    districts,
    sources,
    publicSubmissions,
    issueCategories: civicIssueOptions(),
    tools: CIVIC_TOOLS,
    loadErrors,
  };
}

function topIssues(aggregates: CivicAggregateRow[]) {
  const byIssue = new Map<string, { count: number; urgencyTotal: number; rows: number }>();
  for (const aggregate of aggregates) {
    const key = String(aggregate.issue_category);
    const existing = byIssue.get(key) || { count: 0, urgencyTotal: 0, rows: 0 };
    existing.count += Number(aggregate.response_count || 0);
    existing.urgencyTotal += Number(aggregate.urgency_average || 0);
    existing.rows += 1;
    byIssue.set(key, existing);
  }
  return Array.from(byIssue.entries())
    .map(([issue, value]) => ({
      issue,
      count: value.count,
      urgency: value.rows ? Number((value.urgencyTotal / value.rows).toFixed(2)) : 0,
    }))
    .sort((a, b) => b.count - a.count)
    .slice(0, 8);
}

export async function getCivicDashboardData(): Promise<CivicDashboardData> {
  const publicData = await getCivicPublicData();
  if (!hasLeadFlowDataApiConfig()) {
    const surveys: CivicSurveyRow[] = [];
    return {
      ...publicData,
      surveys,
      allSubmissions: fallbackSubmissions,
      stats: {
        surveyResponses: publicData.aggregates.reduce((sum, row) => sum + Number(row.response_count || 0), 0),
        districtLevelCounts: publicData.districts.length,
        publicSourceCounts: publicData.sources.length,
        concernsNeedingReview: 0,
        submissionsFlaggedForRisk: 0,
        optInContacts: 0,
        publicDisplayApprovals: publicData.publicSubmissions.length,
        topIssues: topIssues(publicData.aggregates),
      },
    };
  }

  const [surveys, allSubmissions, allSources] = await Promise.all([
    selectLeadFlowRows<CivicSurveyRow>("civic_surveys", {
      select: "*",
      deleted_at: "is.null",
      order: "created_at.desc",
      limit: 250,
    }).catch(() => []),
    selectLeadFlowRows<CivicSubmissionRow>("civic_submissions", {
      select: "*",
      deleted_at: "is.null",
      order: "created_at.desc",
      limit: 250,
    }).catch(() => []),
    selectLeadFlowRows<CivicSourceRow>("civic_sources", {
      select: "*",
      deleted_at: "is.null",
      order: "created_at.desc",
      limit: 250,
    }).catch(() => publicData.sources),
  ]);

  return {
    ...publicData,
    sources: allSources,
    surveys,
    allSubmissions,
    stats: {
      surveyResponses: surveys.length || publicData.aggregates.reduce((sum, row) => sum + Number(row.response_count || 0), 0),
      districtLevelCounts: publicData.districts.length,
      publicSourceCounts: allSources.filter((source) => source.public_visible).length,
      concernsNeedingReview: surveys.filter((survey) => survey.review_status === "review" || survey.review_status === "pending").length,
      submissionsFlaggedForRisk: surveys.filter((survey) => survey.risk_level === "medium" || survey.risk_level === "high" || survey.risk_level === "prohibited").length,
      optInContacts: surveys.filter((survey) => survey.contact_consent).length,
      publicDisplayApprovals: allSubmissions.filter((submission) => submission.public_display_approved).length,
      topIssues: topIssues(publicData.aggregates),
    },
  };
}

export async function adminReviewCivicRecord(input: {
  recordType: "survey" | "submission" | "source";
  id: string;
  action: "approve_public_display" | "mark_reviewed" | "reject" | "suppress" | "flag_risk";
  adminUserId?: string | null;
}) {
  if (!hasLeadFlowDataApiConfig()) {
    return { ok: false as const, status: 503, error: "Supabase Data API is not configured." };
  }
  const table =
    input.recordType === "survey" ? "civic_surveys" : input.recordType === "source" ? "civic_sources" : "civic_submissions";
  const basePatch =
    input.action === "approve_public_display"
      ? { review_status: "public_display_approved", risk_level: "low" }
      : input.action === "mark_reviewed"
        ? { review_status: "approved" }
        : input.action === "reject"
          ? { review_status: "rejected" }
          : input.action === "suppress"
            ? { review_status: "suppressed", risk_level: "high" }
            : { review_status: "review", risk_level: "high" };
  const patch =
    input.action === "approve_public_display" && input.recordType === "submission"
      ? { ...basePatch, public_display_approved: true }
      : input.action === "approve_public_display" && input.recordType === "source"
        ? { status: "approved", review_status: "approved", public_visible: true, risk_level: "low" }
        : basePatch;

  const updated = await patchLeadFlowRows(table, { id: `eq.${input.id}` }, patch).catch(() => []);
  await insertLeadFlowRow("audit_log", {
    actor_user_id: input.adminUserId || null,
    actor_type: "admin",
    action: `civic_${input.action}`,
    object_table: table,
    object_id: input.id,
    after_redacted: patch,
    details: {
      civic_boundary: "manual_review_required",
      no_marketplace_auto_release: true,
    },
  }).catch(() => null);

  await insertCivicEvent(input.action === "flag_risk" ? "civic_submission_flagged" : "civic_dashboard_viewed", {
    route: "/dashboard/civic",
    status: input.action,
    record_type: input.recordType,
    user_role: "admin",
  });

  return { ok: true as const, status: 200, record: updated[0] || null };
}
