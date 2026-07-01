import "server-only";

import { auth } from "@/lib/auth";
import { isAdminEmail } from "@/lib/admin-identity";
import { getBuyerAuthState } from "@/lib/supabase-buyer-auth";
import {
  hasLeadFlowDataApiConfig,
  insertLeadFlowRow,
  patchLeadFlowRows,
  selectLeadFlowRows,
} from "@/lib/leadflow-data-api";
import { LEADFLOW_WIDGET_CATALOG, WIDGET_CONSENT_VERSION } from "@/lib/leadflow-widget-definitions";
import type { QuestionnaireDefinition, QuestionnaireQuestion, QuestionnaireQuestionType } from "@/lib/questionnaire-engine";

type JsonRecord = Record<string, unknown>;

export type BuilderAccessRole = "admin" | "buyer" | "partner" | "public";
export type BuilderAction = "create" | "save_draft" | "publish" | "clone" | "archive";
export type BuilderOwnerType = "platform" | "buyer" | "partner";

export type BuilderAccess = {
  allowed: boolean;
  role: BuilderAccessRole;
  reason: string;
  userId?: string | null;
  email?: string | null;
  ownerAccountId?: string | null;
  ownerAccountType?: BuilderOwnerType;
};

export type BuilderResultPage = {
  resultKey: string;
  minScore: number;
  maxScore: number;
  title: string;
  summary: string;
  recommendedNextAction: string;
  ctaLabel: string;
  ctaUrl: string;
};

export type BuilderConsentModule = {
  moduleType: "tool_answers_only" | "contact_me" | "single_seller" | "selected_sellers" | "anonymous_insights" | "submit_source_review" | "buyer_request_access" | "do_not_contact" | "delete_my_data";
  label: string;
  body: string;
  required: boolean;
  consentScope: string;
};

export type BuilderTheme = {
  accent: string;
  background: string;
  surface: string;
  button: string;
};

export type BuilderQuestionnaireDraft = {
  id?: string;
  templateSlug?: string;
  title: string;
  slug: string;
  description: string;
  vertical: string;
  status: "draft" | "review" | "published" | "archived";
  visibility: "internal" | "private" | "unlisted" | "public";
  definition: QuestionnaireDefinition;
  resultPages: BuilderResultPage[];
  consentModules: BuilderConsentModule[];
  theme: BuilderTheme;
  publishedRoute?: string | null;
  shareUrl?: string | null;
  embedWidgetId?: string | null;
  updatedAt?: string;
};

export type BuilderTemplate = BuilderQuestionnaireDraft & {
  templateSlug: string;
  audience: string;
  dataUse: string;
};

export type BuilderDashboardData = {
  access: BuilderAccess;
  mode: "live" | "offline";
  templates: BuilderTemplate[];
  questionnaires: BuilderQuestionnaireDraft[];
  current: BuilderQuestionnaireDraft | null;
  loadErrors: string[];
};

export type BuilderSaveInput = {
  action: BuilderAction;
  questionnaireId?: string | null;
  templateSlug?: string | null;
  draft?: BuilderQuestionnaireDraft;
  adminUserId?: string | null;
};

type QuestionnaireRow = {
  id: string;
  slug: string;
  title: string;
  description: string | null;
  vertical: string;
  status: string;
  visibility?: BuilderQuestionnaireDraft["visibility"];
  owner_account_id?: string | null;
  owner_account_type?: BuilderOwnerType;
  active_version_id?: string | null;
  published_route?: string | null;
  share_url?: string | null;
  embed_widget_id?: string | null;
  metadata: JsonRecord;
  updated_at: string;
};

type QuestionnaireVersionRow = {
  id: string;
  questionnaire_id: string;
  version_number: number;
  consent_version: string;
  status: string;
  question_schema: JsonRecord;
  result_snapshot?: JsonRecord;
  consent_snapshot?: JsonRecord;
  safety_status?: string;
  validation_errors?: string[] | null;
  created_at: string;
  updated_at: string;
};

type AccountRow = {
  id: string;
  auth_user_id?: string | null;
  owner_user_id?: string | null;
  email?: string | null;
  account_status?: string | null;
  status?: string | null;
};

const SITE_URL = (process.env.NEXT_PUBLIC_SITE_URL || "https://www.theleadflowpro.com").replace(/\/$/, "");
const CONSENT_VERSION = "leadflow-questionnaire-builder-v1";
const PROHIBITED_QUESTION_RE =
  /\b(minor|under 18|medical diagnosis|medical record|protected trait|religion|race|ethnicity|sexual orientation|private political identity|political persuasion|ssn|social security|bank account|credit card|password|hidden sensitive|voter file|hacked|leaked)\b/i;

const QUESTION_TYPES: QuestionnaireQuestionType[] = [
  "single_select",
  "multi_select",
  "short_text",
  "long_text",
  "number",
  "range",
  "number_range",
  "budget_range",
  "industry",
  "location",
  "url",
  "phone",
  "email",
  "rating_scale",
  "ranking",
  "yes_no",
  "file_upload",
  "consent_checkbox",
  "seller_selection",
  "calendar_intent",
  "custom_hidden",
];

function cleanSlug(value: string) {
  return (value || "questionnaire")
    .toLowerCase()
    .replace(/[^a-z0-9-]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 88) || "questionnaire";
}

function cleanText(value: string | null | undefined, max = 700) {
  return (value || "").replace(/\s+/g, " ").trim().slice(0, max);
}

function defaultTheme(): BuilderTheme {
  return {
    accent: "#67e8f9",
    background: "#050711",
    surface: "#07101b",
    button: "#f7b733",
  };
}

function resultPagesFor(title: string): BuilderResultPage[] {
  return [
    {
      resultKey: "high",
      minScore: 80,
      maxScore: 100,
      title: `${title}: strong signal`,
      summary: "This response has clear intent, enough context, and a practical next step.",
      recommendedNextAction: "Route to review, show the plan, and ask for contact permission.",
      ctaLabel: "Show the next move",
      ctaUrl: "/build-my-system",
    },
    {
      resultKey: "medium",
      minScore: 45,
      maxScore: 79,
      title: `${title}: useful signal`,
      summary: "This response has usable context but needs one more answer before routing or selling access.",
      recommendedNextAction: "Show a useful result first, then ask the missing follow-up question.",
      ctaLabel: "Get the clearer path",
      ctaUrl: "/tools",
    },
    {
      resultKey: "low",
      minScore: 0,
      maxScore: 44,
      title: `${title}: early signal`,
      summary: "This response is useful for aggregate insight, but it needs more context before any buyer route.",
      recommendedNextAction: "Give a simple recommendation and keep the response aggregate unless more permission is granted.",
      ctaLabel: "See related tools",
      ctaUrl: "/tools",
    },
  ];
}

function defaultConsentModules(): BuilderConsentModule[] {
  return [
    {
      moduleType: "tool_answers_only",
      label: "Save my answers and show my result.",
      body: "Used to calculate this result and build an internal first-party signal profile.",
      required: true,
      consentScope: "tool_answers_only",
    },
    {
      moduleType: "contact_me",
      label: "Contact me about this result.",
      body: "Optional. This does not approve seller routing, public display, or resale.",
      required: false,
      consentScope: "contact_about_result",
    },
    {
      moduleType: "anonymous_insights",
      label: "Use my answers in anonymous aggregate insights.",
      body: "Optional. Aggregate insights do not include names, email, phone, or raw free-text answers.",
      required: false,
      consentScope: "anonymous_insights",
    },
  ];
}

function templateFromCatalog(slug: string, audience: string, dataUse: string): BuilderTemplate {
  const catalog = LEADFLOW_WIDGET_CATALOG.find((item) => item.slug === slug) || LEADFLOW_WIDGET_CATALOG[0];
  return {
    templateSlug: catalog.slug,
    title: catalog.name,
    slug: catalog.slug,
    description: catalog.shortDescription,
    vertical: catalog.definition.vertical,
    status: "draft",
    visibility: "private",
    definition: catalog.definition,
    resultPages: resultPagesFor(catalog.name),
    consentModules: defaultConsentModules(),
    theme: defaultTheme(),
    audience,
    dataUse,
  };
}

function customDefinition(input: {
  toolSlug: string;
  vertical: string;
  title: string;
  description: string;
  valuePreview: string;
  defaultTags: string[];
  questions: QuestionnaireQuestion[];
}): QuestionnaireDefinition {
  return {
    toolSlug: input.toolSlug,
    toolType: "white_label_builder",
    vertical: input.vertical,
    title: input.title,
    description: input.description,
    valuePreview: input.valuePreview,
    defaultTags: input.defaultTags,
    recommendedActions: [
      { minScore: 80, action: "show_result_and_offer_fit_call" },
      { minScore: 55, action: "show_plan_and_capture_contact_permission" },
      { minScore: 0, action: "show_education_result" },
    ],
    steps: [
      {
        id: "fit",
        title: "Fit",
        questions: input.questions,
      },
    ],
  };
}

const customTemplates: BuilderTemplate[] = [
  {
    templateSlug: "real-estate-lead-fit",
    title: "Real Estate Lead Fit",
    slug: "real-estate-lead-fit",
    description: "Qualifies real estate lead intent, timeline, location, and follow-up path.",
    vertical: "real_estate",
    status: "draft",
    visibility: "private",
    definition: customDefinition({
      toolSlug: "real-estate-lead-fit",
      vertical: "real_estate",
      title: "Real Estate Lead Fit",
      description: "Find whether someone is researching, actively moving, or ready for a clear next step.",
      valuePreview: "A lead fit score, timeline label, and follow-up path.",
      defaultTags: ["real_estate", "buyer_intent"],
      questions: [
        { id: "timeline", type: "single_select", label: "When do you want to make a move?", required: true, options: [
          { id: "now", label: "Now", score: 18, tags: ["urgent"] },
          { id: "90_days", label: "Next 90 days", score: 12, tags: ["active"] },
          { id: "research", label: "Researching", score: 5, tags: ["education"] },
        ] },
        { id: "area", type: "location", label: "What city or area are you focused on?", required: true, tags: ["location"] },
        { id: "need", type: "single_select", label: "What do you need most?", required: true, options: [
          { id: "buy", label: "Buying help", tags: ["buyer"] },
          { id: "sell", label: "Selling help", tags: ["seller"] },
          { id: "value", label: "Property value clarity", tags: ["valuation"] },
        ] },
      ],
    }),
    resultPages: resultPagesFor("Real Estate Lead Fit"),
    consentModules: defaultConsentModules(),
    theme: defaultTheme(),
    audience: "Real estate teams and local agents",
    dataUse: "Timeline, location, service need, and contact permission.",
  },
  {
    templateSlug: "contractor-quote-readiness",
    title: "Contractor Quote Readiness",
    slug: "contractor-quote-readiness",
    description: "Qualifies service need, urgency, project type, area served, and quote readiness.",
    vertical: "home_services",
    status: "draft",
    visibility: "private",
    definition: customDefinition({
      toolSlug: "contractor-quote-readiness",
      vertical: "home_services",
      title: "Contractor Quote Readiness",
      description: "Sort quote-ready jobs from vague research before the phone rings.",
      valuePreview: "A quote-readiness score and next scheduling path.",
      defaultTags: ["contractor", "quote_request"],
      questions: [
        { id: "service", type: "short_text", label: "What job do you need done?", required: true, tags: ["service_need"] },
        { id: "timeline", type: "single_select", label: "How soon do you need help?", required: true, options: [
          { id: "emergency", label: "Emergency or this week", score: 18, tags: ["urgent"] },
          { id: "month", label: "This month", score: 12, tags: ["active"] },
          { id: "planning", label: "Planning", score: 5, tags: ["planning"] },
        ] },
        { id: "budget", type: "budget_range", label: "What budget range feels realistic?", required: false, tags: ["budget_range"] },
      ],
    }),
    resultPages: resultPagesFor("Contractor Quote Readiness"),
    consentModules: defaultConsentModules(),
    theme: defaultTheme(),
    audience: "Contractors and home service operators",
    dataUse: "Service need, urgency, budget range, and scheduling intent.",
  },
  {
    templateSlug: "dental-marketing-readiness",
    title: "Dental Marketing Readiness",
    slug: "dental-marketing-readiness",
    description: "Finds whether a dental practice needs ads, website fixes, booking flow, or follow-up automation.",
    vertical: "local_business",
    status: "draft",
    visibility: "private",
    definition: customDefinition({
      toolSlug: "dental-marketing-readiness",
      vertical: "local_business",
      title: "Dental Marketing Readiness",
      description: "Score a dental practice lead flow before selling ads or automation.",
      valuePreview: "A readiness score and the first marketing system to fix.",
      defaultTags: ["dental", "marketing_readiness"],
      questions: [
        { id: "monthly_new_patients", type: "number_range", label: "How many new patient inquiries come in monthly?", required: true, min: 0, max: 300, scoreWeight: 10 },
        { id: "booking_gap", type: "single_select", label: "Where does the booking path break?", required: true, options: [
          { id: "calls", label: "Missed calls", score: 14, tags: ["missed_calls"] },
          { id: "forms", label: "Forms go nowhere", score: 12, tags: ["form_gap"] },
          { id: "ads", label: "Ads do not convert", score: 10, tags: ["ads_gap"] },
        ] },
        { id: "website", type: "url", label: "Practice website", required: false, tags: ["website"] },
      ],
    }),
    resultPages: resultPagesFor("Dental Marketing Readiness"),
    consentModules: defaultConsentModules(),
    theme: defaultTheme(),
    audience: "Dental practices and dental marketing teams",
    dataUse: "Booking gap, site path, lead flow pain, and follow-up readiness.",
  },
  {
    templateSlug: "civic-issue-pulse",
    title: "Civic Issue Pulse",
    slug: "civic-issue-pulse",
    description: "Collects consented civic issue priorities for aggregate dashboards and public-source review.",
    vertical: "civic",
    status: "draft",
    visibility: "private",
    definition: customDefinition({
      toolSlug: "civic-issue-pulse",
      vertical: "civic",
      title: "Civic Issue Pulse",
      description: "Collect issue priorities without building individual political persuasion profiles.",
      valuePreview: "An aggregate issue label, urgency score, and civic review path.",
      defaultTags: ["civic", "aggregate_only"],
      questions: [
        { id: "location", type: "location", label: "Where is this issue happening?", required: true, tags: ["location"] },
        { id: "issue_priority", type: "short_text", label: "What issue should leaders address first?", required: true, tags: ["issue_priority"] },
        { id: "urgency", type: "rating_scale", label: "How urgent is it?", required: true, min: 1, max: 5, scoreWeight: 10, tags: ["urgency"] },
        { id: "anonymous", type: "consent_checkbox", label: "Keep my response anonymous in public displays.", required: false, tags: ["anonymous"] },
      ],
    }),
    resultPages: resultPagesFor("Civic Issue Pulse"),
    consentModules: [
      {
        moduleType: "tool_answers_only",
        label: "Save my civic survey response.",
        body: "Used for aggregate civic issue pulse analysis. Not used for individual political persuasion targeting.",
        required: true,
        consentScope: "save_civic_survey_response",
      },
      {
        moduleType: "anonymous_insights",
        label: "Use my response in aggregate issue dashboards.",
        body: "Aggregate dashboards do not include private contact information or individual targeting labels.",
        required: false,
        consentScope: "aggregate_civic_insights",
      },
    ],
    theme: defaultTheme(),
    audience: "Civic groups, local operators, and public accountability teams",
    dataUse: "Aggregate issue priorities, public-source review, and consented survey responses.",
  },
];

export const QUESTIONNAIRE_BUILDER_TEMPLATES: BuilderTemplate[] = [
  templateFromCatalog("lead-leak-audit", "Local businesses and agencies", "Lead flow pain, follow-up gaps, and urgency."),
  templateFromCatalog("website-money-leak-checker", "Businesses with traffic but weak conversion", "Website URL, CTA clarity, proof gaps, and conversion path."),
  templateFromCatalog("ai-automation-readiness", "Owners with repeatable intake or follow-up work", "Task volume, automation need, timeline, and budget range."),
  templateFromCatalog("mortgage-lead-readiness", "Mortgage and refi teams", "Loan interest category, timing, and consented contact path."),
  templateFromCatalog("ecommerce-growth-finder", "Ecommerce operators and product teams", "Platform, product type, pain, and growth bottleneck."),
  templateFromCatalog("local-demand-finder", "Local operators and agencies", "City, service need, local demand signal, and category."),
  ...customTemplates,
];

function sanitizeQuestion(question: QuestionnaireQuestion, index: number): QuestionnaireQuestion {
  const type = QUESTION_TYPES.includes(question.type) ? question.type : "short_text";
  const id = cleanSlug(question.id || question.label || `question-${index + 1}`).replace(/-/g, "_");
  return {
    ...question,
    id,
    type,
    label: cleanText(question.label, 220) || `Question ${index + 1}`,
    helperText: cleanText(question.helperText, 500) || undefined,
    placeholder: cleanText(question.placeholder, 180) || undefined,
    options: (question.options || []).slice(0, 16).map((option, optionIndex) => ({
      ...option,
      id: cleanSlug(option.id || option.label || `option-${optionIndex + 1}`).replace(/-/g, "_"),
      label: cleanText(option.label, 160) || `Option ${optionIndex + 1}`,
      tags: (option.tags || []).map((tag) => cleanSlug(tag).replace(/-/g, "_")).slice(0, 12),
      score: Number.isFinite(Number(option.score)) ? Number(option.score) : 0,
    })),
    tags: (question.tags || []).map((tag) => cleanSlug(tag).replace(/-/g, "_")).slice(0, 16),
    scoreWeight: Number.isFinite(Number(question.scoreWeight)) ? Number(question.scoreWeight) : 0,
  };
}

function sanitizeDefinition(definition: QuestionnaireDefinition, draft: Pick<BuilderQuestionnaireDraft, "title" | "slug" | "vertical" | "description">): QuestionnaireDefinition {
  return {
    toolSlug: cleanSlug(definition.toolSlug || draft.slug),
    toolType: cleanText(definition.toolType, 80) || "white_label_builder",
    vertical: cleanSlug(definition.vertical || draft.vertical || "general").replace(/-/g, "_"),
    title: cleanText(definition.title || draft.title, 180) || "Questionnaire",
    description: cleanText(definition.description || draft.description, 700),
    valuePreview: cleanText(definition.valuePreview, 500) || "A score, a clear next step, and a private signal profile.",
    defaultTags: (definition.defaultTags || []).map((tag) => cleanSlug(tag).replace(/-/g, "_")).slice(0, 20),
    recommendedActions: (definition.recommendedActions || []).slice(0, 8).map((action) => ({
      minScore: Math.max(0, Math.min(100, Number(action.minScore) || 0)),
      action: cleanSlug(action.action).replace(/-/g, "_"),
    })),
    steps: (definition.steps || []).slice(0, 12).map((step, stepIndex) => ({
      id: cleanSlug(step.id || step.title || `step-${stepIndex + 1}`),
      title: cleanText(step.title, 180) || `Step ${stepIndex + 1}`,
      description: cleanText(step.description, 500) || undefined,
      questions: (step.questions || []).slice(0, 20).map((question, questionIndex) => sanitizeQuestion(question, questionIndex)),
    })),
  };
}

function sanitizeDraft(input: BuilderQuestionnaireDraft): BuilderQuestionnaireDraft {
  const title = cleanText(input.title, 180) || "Untitled Questionnaire";
  const slug = cleanSlug(input.slug || title);
  const vertical = cleanSlug(input.vertical || input.definition?.vertical || "general").replace(/-/g, "_");
  const definition = sanitizeDefinition(input.definition || QUESTIONNAIRE_BUILDER_TEMPLATES[0].definition, {
    title,
    slug,
    vertical,
    description: input.description,
  });
  return {
    id: input.id,
    templateSlug: input.templateSlug,
    title,
    slug,
    description: cleanText(input.description, 700) || definition.description,
    vertical,
    status: input.status || "draft",
    visibility: input.visibility || "private",
    definition,
    resultPages: (input.resultPages?.length ? input.resultPages : resultPagesFor(title)).slice(0, 8).map((page, index) => ({
      resultKey: cleanSlug(page.resultKey || `result-${index + 1}`).replace(/-/g, "_"),
      minScore: Math.max(0, Math.min(100, Number(page.minScore) || 0)),
      maxScore: Math.max(0, Math.min(100, Number(page.maxScore) || 100)),
      title: cleanText(page.title, 180) || `${title} result`,
      summary: cleanText(page.summary, 800) || "A useful result with the next step.",
      recommendedNextAction: cleanText(page.recommendedNextAction, 300) || "show_relevant_next_step",
      ctaLabel: cleanText(page.ctaLabel, 80) || "Continue",
      ctaUrl: cleanText(page.ctaUrl, 400) || "/tools",
    })),
    consentModules: (input.consentModules?.length ? input.consentModules : defaultConsentModules()).slice(0, 8).map((module) => ({
      moduleType: module.moduleType,
      label: cleanText(module.label, 180),
      body: cleanText(module.body, 700),
      required: Boolean(module.required),
      consentScope: cleanSlug(module.consentScope).replace(/-/g, "_"),
    })),
    theme: input.theme || defaultTheme(),
    publishedRoute: input.publishedRoute || null,
    shareUrl: input.shareUrl || null,
    embedWidgetId: input.embedWidgetId || null,
    updatedAt: input.updatedAt,
  };
}

export function validateQuestionnaireSafety(draft: BuilderQuestionnaireDraft, publishing = false) {
  const errors: string[] = [];
  const warnings: string[] = [];
  const text = [
    draft.title,
    draft.description,
    draft.definition.title,
    draft.definition.description,
    ...draft.definition.steps.flatMap((step) => [
      step.title,
      step.description || "",
      ...step.questions.flatMap((question) => [
        question.id,
        question.label,
        question.helperText || "",
        question.placeholder || "",
        ...(question.options || []).map((option) => option.label),
      ]),
    ]),
  ].join(" ");
  if (PROHIBITED_QUESTION_RE.test(text)) {
    errors.push("Remove prohibited sensitive-data questions before saving or publishing.");
  }
  if (!draft.definition.steps.length || draft.definition.steps.every((step) => !step.questions.length)) {
    errors.push("Add at least one step with one question.");
  }
  for (const step of draft.definition.steps) {
    for (const question of step.questions) {
      if (question.type === "custom_hidden" && question.required) errors.push("Custom hidden fields cannot be required.");
      if (question.type === "file_upload") warnings.push("File uploads require hosted full-page questionnaire review before public use.");
      if (!question.label.trim()) errors.push("Every question needs a clear label.");
    }
  }
  if (publishing && !draft.consentModules.some((module) => module.required && module.moduleType === "tool_answers_only")) {
    errors.push("Publishing requires a required tool-answers consent module.");
  }
  if (publishing && !draft.resultPages.length) {
    errors.push("Publishing requires at least one result page.");
  }
  return {
    ok: errors.length === 0,
    errors,
    warnings,
    safetyStatus: errors.length ? "blocked" : warnings.length ? "warning" : "clear",
  };
}

async function resolveBuilderAccess(): Promise<BuilderAccess> {
  const session = await auth().catch(() => null);
  if (session?.user?.email && isAdminEmail(session.user.email)) {
    return {
      allowed: true,
      role: "admin",
      reason: "Admin builder access.",
      userId: session.user.id || null,
      email: session.user.email,
      ownerAccountId: null,
      ownerAccountType: "platform",
    };
  }

  const buyerAuth = await getBuyerAuthState().catch(() => null);
  if (!buyerAuth?.authenticated) {
    return { allowed: false, role: "public", reason: "Sign in with an approved buyer or partner account to build questionnaires." };
  }
  if (!hasLeadFlowDataApiConfig()) {
    return { allowed: false, role: "public", reason: "Supabase is not configured, so non-admin builder access cannot be verified." };
  }

  const role = typeof buyerAuth.user.user_metadata?.leadflow_role === "string" ? buyerAuth.user.user_metadata.leadflow_role : "buyer";
  if (role === "partner") {
    const partners = await selectLeadFlowRows<AccountRow>("partner_accounts", {
      select: "id,auth_user_id,owner_user_id,email,status",
      auth_user_id: `eq.${buyerAuth.user.id}`,
      limit: 1,
    }).catch(() => []);
    const partner = partners[0];
    if (partner && ["approved", "restricted"].includes(String(partner.status))) {
      return {
        allowed: true,
        role: "partner",
        reason: "Approved partner builder access.",
        userId: buyerAuth.user.id,
        email: buyerAuth.user.email,
        ownerAccountId: partner.id,
        ownerAccountType: "partner",
      };
    }
  }

  const buyers = await selectLeadFlowRows<AccountRow>("buyer_accounts", {
    select: "id,auth_user_id,owner_user_id,email,account_status,status",
    auth_user_id: `eq.${buyerAuth.user.id}`,
    limit: 1,
  }).catch(() => []);
  const buyer = buyers[0];
  const status = String(buyer?.account_status || buyer?.status || "");
  if (buyer && ["approved_basic", "approved_partner", "approved_premium", "approved", "active"].includes(status)) {
    return {
      allowed: true,
      role: "buyer",
      reason: "Approved buyer builder access.",
      userId: buyerAuth.user.id,
      email: buyerAuth.user.email,
      ownerAccountId: buyer.id,
      ownerAccountType: "buyer",
    };
  }

  return { allowed: false, role: "public", reason: "Your account must be approved before building questionnaires." };
}

async function canModifyQuestionnaire(questionnaireId: string, access: BuilderAccess) {
  if (access.role === "admin") return true;
  if (!access.ownerAccountId || !access.ownerAccountType) return false;

  const rows = await selectLeadFlowRows<Pick<QuestionnaireRow, "id" | "owner_account_id" | "owner_account_type">>("questionnaires", {
    select: "id,owner_account_id,owner_account_type",
    id: `eq.${questionnaireId}`,
    deleted_at: "is.null",
    limit: 1,
  }).catch(() => []);
  const row = rows[0];
  return Boolean(row && row.owner_account_id === access.ownerAccountId && row.owner_account_type === access.ownerAccountType);
}

function draftFromRows(row: QuestionnaireRow, version?: QuestionnaireVersionRow): BuilderQuestionnaireDraft {
  const schema = version?.question_schema as unknown as QuestionnaireDefinition | undefined;
  const metadata = (row.metadata || {}) as { builder?: Partial<BuilderQuestionnaireDraft>; resultPages?: BuilderResultPage[]; consentModules?: BuilderConsentModule[]; theme?: BuilderTheme };
  const fallbackTemplate = QUESTIONNAIRE_BUILDER_TEMPLATES.find((template) => template.slug === row.slug) || QUESTIONNAIRE_BUILDER_TEMPLATES[0];
  const draft = sanitizeDraft({
    id: row.id,
    templateSlug: String(metadata.builder?.templateSlug || row.slug),
    title: row.title,
    slug: row.slug,
    description: row.description || fallbackTemplate.description,
    vertical: row.vertical || fallbackTemplate.vertical,
    status: ["draft", "review", "published", "archived"].includes(row.status) ? row.status as BuilderQuestionnaireDraft["status"] : "draft",
    visibility: row.visibility || "private",
    definition: schema?.steps?.length ? schema : fallbackTemplate.definition,
    resultPages: (version?.result_snapshot as { resultPages?: BuilderResultPage[] } | undefined)?.resultPages || metadata.resultPages || fallbackTemplate.resultPages,
    consentModules: (version?.consent_snapshot as { consentModules?: BuilderConsentModule[] } | undefined)?.consentModules || metadata.consentModules || fallbackTemplate.consentModules,
    theme: metadata.theme || fallbackTemplate.theme,
    publishedRoute: row.published_route,
    shareUrl: row.share_url,
    embedWidgetId: row.embed_widget_id,
    updatedAt: row.updated_at,
  });
  return draft;
}

export async function getQuestionnaireBuilderDashboard(questionnaireId?: string | null): Promise<BuilderDashboardData> {
  const access = await resolveBuilderAccess();
  const loadErrors: string[] = [];
  if (!access.allowed || !hasLeadFlowDataApiConfig()) {
    if (!hasLeadFlowDataApiConfig()) loadErrors.push("Supabase Data API is not configured. Showing template mode.");
    const currentTemplate = questionnaireId
      ? QUESTIONNAIRE_BUILDER_TEMPLATES.find((template) => template.templateSlug === questionnaireId || template.slug === questionnaireId) || null
      : null;
    return {
      access,
      mode: "offline",
      templates: QUESTIONNAIRE_BUILDER_TEMPLATES,
      questionnaires: QUESTIONNAIRE_BUILDER_TEMPLATES.slice(0, 4),
      current: currentTemplate,
      loadErrors,
    };
  }

  const params: Record<string, string | number | boolean | null | undefined> = {
    select: "*",
    deleted_at: "is.null",
    order: "updated_at.desc",
    limit: 120,
  };
  if (access.role !== "admin" && access.ownerAccountId) {
    params.owner_account_type = `eq.${access.ownerAccountType}`;
    params.owner_account_id = `eq.${access.ownerAccountId}`;
  }
  const rows = await selectLeadFlowRows<QuestionnaireRow>("questionnaires", params).catch((error) => {
    loadErrors.push(error instanceof Error ? error.message : "Unable to load questionnaires.");
    return [];
  });
  const ids = rows.map((row) => row.id).filter(Boolean);
  const versions = ids.length
    ? await selectLeadFlowRows<QuestionnaireVersionRow>("questionnaire_versions", {
      select: "*",
      questionnaire_id: `in.(${ids.join(",")})`,
      order: "version_number.desc",
      limit: 250,
    }).catch(() => [])
    : [];
  const versionByQuestionnaire = new Map<string, QuestionnaireVersionRow>();
  for (const version of versions) {
    if (!versionByQuestionnaire.has(version.questionnaire_id)) versionByQuestionnaire.set(version.questionnaire_id, version);
  }
  const questionnaires = rows.map((row) => draftFromRows(row, versionByQuestionnaire.get(row.id)));
  const current =
    questionnaireId
      ? questionnaires.find((item) => item.id === questionnaireId || item.slug === questionnaireId) ||
        QUESTIONNAIRE_BUILDER_TEMPLATES.find((template) => template.templateSlug === questionnaireId || template.slug === questionnaireId) ||
        null
      : questionnaires[0] || null;

  return {
    access,
    mode: loadErrors.length ? "offline" : "live",
    templates: QUESTIONNAIRE_BUILDER_TEMPLATES,
    questionnaires,
    current,
    loadErrors,
  };
}

async function nextVersionNumber(questionnaireId: string) {
  const versions = await selectLeadFlowRows<{ version_number: number }>("questionnaire_versions", {
    select: "version_number",
    questionnaire_id: `eq.${questionnaireId}`,
    order: "version_number.desc",
    limit: 1,
  }).catch(() => []);
  return Number(versions[0]?.version_number || 0) + 1;
}

async function insertQuestionRows(versionId: string, definition: QuestionnaireDefinition) {
  for (const [stepIndex, step] of definition.steps.entries()) {
    for (const [questionIndex, question] of step.questions.entries()) {
      const questionRows = await insertLeadFlowRow<{ id: string }>("questions", {
        questionnaire_version_id: versionId,
        question_key: question.id,
        field_key: question.id,
        question_type: question.type,
        label: question.label,
        help_text: question.helperText || null,
        helper_text: question.helperText || null,
        options: question.options || [],
        tags: question.tags || [],
        score_weight: question.scoreWeight || 0,
        required: Boolean(question.required),
        display_order: questionIndex,
        step_number: stepIndex + 1,
        question_order: questionIndex,
        validation_rules: {
          min: question.min,
          max: question.max,
          step: question.step,
          showIf: question.showIf,
        },
        review_status: "approved",
      }).catch(() => []);
      const questionId = questionRows[0]?.id;
      if (!questionId) continue;
      for (const [optionIndex, option] of (question.options || []).entries()) {
        await insertLeadFlowRow("question_options", {
          question_id: questionId,
          option_order: optionIndex,
          option_key: option.id,
          label: option.label,
          value: option.value ?? option.id,
          score_delta: option.score || 0,
          tags_to_add: option.tags || [],
        }).catch(() => null);
      }
      if (question.options?.length || question.scoreWeight) {
        await insertLeadFlowRow("scoring_rules", {
          questionnaire_version_id: versionId,
          question_id: questionId,
          answer_match: { question_id: question.id },
          score_delta: question.scoreWeight || 0,
          tags_to_add: question.tags || [],
          recommended_action: null,
        }).catch(() => null);
      }
    }
  }
}

async function persistVersion(questionnaireId: string, draft: BuilderQuestionnaireDraft, access: BuilderAccess, action: BuilderAction) {
  const safety = validateQuestionnaireSafety(draft, action === "publish");
  if (!safety.ok) return { ok: false as const, status: 400, error: safety.errors[0] || "Questionnaire failed safety validation." };

  const versionNumber = await nextVersionNumber(questionnaireId);
  const versionRows = await insertLeadFlowRow<QuestionnaireVersionRow>("questionnaire_versions", {
    questionnaire_id: questionnaireId,
    version_number: versionNumber,
    version_label: action === "publish" ? `Published ${versionNumber}` : `Draft ${versionNumber}`,
    consent_version: CONSENT_VERSION,
    status: action === "publish" ? "published" : "draft",
    review_status: "approved",
    safety_status: safety.safetyStatus,
    validation_errors: [...safety.errors, ...safety.warnings],
    question_schema: draft.definition,
    disclosure_snapshot: {
      consentModules: draft.consentModules,
      consentVersion: CONSENT_VERSION,
    },
    scoring_snapshot: {
      recommendedActions: draft.definition.recommendedActions || [],
    },
    result_snapshot: {
      resultPages: draft.resultPages,
    },
    consent_snapshot: {
      consentModules: draft.consentModules,
    },
    created_by: access.userId || null,
    published_at: action === "publish" ? new Date().toISOString() : null,
  }).catch(() => []);
  const version = versionRows[0];
  if (!version?.id) return { ok: false as const, status: 500, error: "Questionnaire version save failed." };

  await insertQuestionRows(version.id, draft.definition);
  for (const result of draft.resultPages) {
    await insertLeadFlowRow("result_pages", {
      questionnaire_version_id: version.id,
      result_key: result.resultKey,
      min_score: result.minScore,
      max_score: result.maxScore,
      title: result.title,
      summary: result.summary,
      recommended_next_action: result.recommendedNextAction,
      cta_label: result.ctaLabel,
      cta_url: result.ctaUrl,
    }).catch(() => null);
  }
  for (const [index, module] of draft.consentModules.entries()) {
    await insertLeadFlowRow("consent_modules", {
      questionnaire_id: questionnaireId,
      questionnaire_version_id: version.id,
      module_type: module.moduleType,
      label: module.label,
      body: module.body,
      required: module.required,
      consent_scope: module.consentScope,
      consent_version: CONSENT_VERSION,
      display_order: index,
      status: "active",
    }).catch(() => null);
  }

  return { ok: true as const, version };
}

async function publishArtifacts(questionnaireId: string, versionId: string, draft: BuilderQuestionnaireDraft, access: BuilderAccess) {
  const routePath = `/q/${draft.slug}`;
  const shareUrl = `${SITE_URL}${routePath}`;
  await insertLeadFlowRow("questionnaire_routes", {
    questionnaire_id: questionnaireId,
    questionnaire_version_id: versionId,
    route_path: routePath,
    status: "published",
    embed_enabled: true,
  }).catch(() => null);
  const widgetRows = await insertLeadFlowRow<{ id: string }>("widgets", {
    widget_type: "custom_questionnaire",
    name: draft.title,
    slug: draft.slug,
    status: "active",
    allowed_domains: ["*"],
    theme: draft.theme,
    questionnaire_id: questionnaireId,
    questionnaire_version_id: versionId,
    redirect_url: shareUrl,
    completion_message: "Your result is ready. Use it to decide the next move.",
    consent_required: true,
    builder_source: "questionnaire_builder",
    settings: {
      consent_version: WIDGET_CONSENT_VERSION,
      builder_questionnaire_id: questionnaireId,
    },
  }).catch(() => []);
  const widgetId = widgetRows[0]?.id || null;
  await patchLeadFlowRows("questionnaires", { id: `eq.${questionnaireId}` }, {
    status: "published",
    review_status: "approved",
    active_version_id: versionId,
    published_route: routePath,
    share_url: shareUrl,
    embed_widget_id: widgetId,
    visibility: draft.visibility === "private" ? "unlisted" : draft.visibility,
  }).catch(() => []);

  await insertLeadFlowRow("audit_log", {
    actor_user_id: access.userId || null,
    actor_type: access.role,
    action: "questionnaire_published",
    object_table: "questionnaires",
    object_id: questionnaireId,
    after_redacted: {
      slug: draft.slug,
      route_path: routePath,
      embed_widget_id: widgetId,
    },
    details: {
      no_prohibited_questions: true,
      consent_version: CONSENT_VERSION,
    },
  }).catch(() => null);

  return { routePath, shareUrl, widgetId };
}

export async function saveQuestionnaireBuilder(input: BuilderSaveInput) {
  const access = await resolveBuilderAccess();
  if (!access.allowed) return { ok: false as const, status: 401, error: access.reason };
  if (!hasLeadFlowDataApiConfig()) return { ok: false as const, status: 503, error: "Supabase Data API is not configured." };

  if (input.action === "archive") {
    if (!input.questionnaireId) return { ok: false as const, status: 400, error: "Missing questionnaire id." };
    if (!(await canModifyQuestionnaire(input.questionnaireId, access))) {
      return { ok: false as const, status: 403, error: "You can only archive questionnaires owned by your account." };
    }
    await patchLeadFlowRows("questionnaires", { id: `eq.${input.questionnaireId}` }, {
      status: "archived",
      archived_at: new Date().toISOString(),
    });
    await insertLeadFlowRow("audit_log", {
      actor_user_id: access.userId || null,
      actor_type: access.role,
      action: "questionnaire_archived",
      object_table: "questionnaires",
      object_id: input.questionnaireId,
    }).catch(() => null);
    return { ok: true as const, status: 200, questionnaireId: input.questionnaireId };
  }

  let draft = input.draft ? sanitizeDraft(input.draft) : null;
  if (!draft) {
    const template = QUESTIONNAIRE_BUILDER_TEMPLATES.find((item) => item.templateSlug === input.templateSlug || item.slug === input.templateSlug) || QUESTIONNAIRE_BUILDER_TEMPLATES[0];
    draft = sanitizeDraft(template);
  }
  if (input.action === "clone") {
    draft = sanitizeDraft({
      ...draft,
      id: undefined,
      title: `Copy of ${draft.title}`.slice(0, 180),
      slug: `${draft.slug}-copy-${Date.now().toString(36)}`,
      status: "draft",
      publishedRoute: null,
      shareUrl: null,
      embedWidgetId: null,
    });
  }

  const safety = validateQuestionnaireSafety(draft, input.action === "publish");
  if (!safety.ok) return { ok: false as const, status: 400, error: safety.errors[0] || "Questionnaire failed safety validation." };

  const questionnaireId = input.action === "create" || input.action === "clone" || !input.questionnaireId
    ? null
    : input.questionnaireId;
  if (questionnaireId && !(await canModifyQuestionnaire(questionnaireId, access))) {
    return { ok: false as const, status: 403, error: "You can only edit questionnaires owned by your account." };
  }
  const row = {
    title: draft.title,
    slug: draft.slug,
    description: draft.description,
    vertical: draft.vertical,
    category: "white_label_questionnaire",
    status: input.action === "publish" ? "review" : "draft",
    review_status: input.action === "publish" ? "review" : "pending",
    default_consent_version: CONSENT_VERSION,
    owner_account_id: access.ownerAccountId || null,
    owner_account_type: access.ownerAccountType || "platform",
    visibility: draft.visibility,
    plan_required: access.role === "admin" ? "admin" : "approved_builder",
    metadata: {
      builder: {
        templateSlug: draft.templateSlug || draft.slug,
        ownerRole: access.role,
        safetyStatus: safety.safetyStatus,
        warnings: safety.warnings,
      },
      resultPages: draft.resultPages,
      consentModules: draft.consentModules,
      theme: draft.theme,
    },
  };

  const savedRows = questionnaireId
    ? await patchLeadFlowRows<QuestionnaireRow>("questionnaires", { id: `eq.${questionnaireId}` }, row).catch(() => [])
    : await insertLeadFlowRow<QuestionnaireRow>("questionnaires", row).catch(() => []);
  const questionnaire = savedRows[0];
  if (!questionnaire?.id) return { ok: false as const, status: 500, error: "Questionnaire save failed." };

  const versionResult = await persistVersion(questionnaire.id, draft, access, input.action);
  if (!versionResult.ok) return versionResult;

  let publishResult: { routePath?: string; shareUrl?: string; widgetId?: string | null } = {};
  if (input.action === "publish") {
    publishResult = await publishArtifacts(questionnaire.id, versionResult.version.id, draft, access);
  } else {
    await patchLeadFlowRows("questionnaires", { id: `eq.${questionnaire.id}` }, {
      active_version_id: versionResult.version.id,
    }).catch(() => null);
  }

  await insertLeadFlowRow("audit_log", {
    actor_user_id: access.userId || null,
    actor_type: access.role,
    action: input.action === "publish" ? "questionnaire_publish_requested" : input.action === "clone" ? "questionnaire_cloned" : "questionnaire_saved",
    object_table: "questionnaires",
    object_id: questionnaire.id,
    after_redacted: {
      title: draft.title,
      slug: draft.slug,
      vertical: draft.vertical,
      question_count: draft.definition.steps.reduce((sum, step) => sum + step.questions.length, 0),
      safety_status: safety.safetyStatus,
    },
    details: {
      consent_version: CONSENT_VERSION,
      warnings: safety.warnings,
    },
  }).catch(() => null);

  return {
    ok: true as const,
    status: 200,
    questionnaireId: questionnaire.id,
    versionId: versionResult.version.id,
    routePath: publishResult.routePath || draft.publishedRoute || null,
    shareUrl: publishResult.shareUrl || draft.shareUrl || null,
    embedWidgetId: publishResult.widgetId || draft.embedWidgetId || null,
    warnings: safety.warnings,
  };
}

export async function getPublishedQuestionnaire(slugOrRoute: string) {
  const slug = cleanSlug(slugOrRoute.replace(/^\/q\//, ""));
  const template = QUESTIONNAIRE_BUILDER_TEMPLATES.find((item) => item.slug === slug || item.templateSlug === slug);
  if (!hasLeadFlowDataApiConfig()) return template || null;

  const routes = await selectLeadFlowRows<{ questionnaire_id: string; questionnaire_version_id: string | null; route_path: string }>("questionnaire_routes", {
    select: "questionnaire_id,questionnaire_version_id,route_path",
    route_path: `eq./q/${slug}`,
    status: "eq.published",
    limit: 1,
  }).catch(() => []);
  const route = routes[0];
  if (!route) return template || null;

  const [questionnaires, versions] = await Promise.all([
    selectLeadFlowRows<QuestionnaireRow>("questionnaires", {
      select: "*",
      id: `eq.${route.questionnaire_id}`,
      deleted_at: "is.null",
      limit: 1,
    }).catch(() => []),
    selectLeadFlowRows<QuestionnaireVersionRow>("questionnaire_versions", {
      select: "*",
      id: route.questionnaire_version_id ? `eq.${route.questionnaire_version_id}` : undefined,
      status: "eq.published",
      limit: 1,
    }).catch(() => []),
  ]);
  if (!questionnaires[0]) return template || null;
  return draftFromRows(questionnaires[0], versions[0]);
}
