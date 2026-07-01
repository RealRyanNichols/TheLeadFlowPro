import "server-only";

import crypto from "crypto";
import {
  answerScoreForQuestion,
  answerTagsForQuestion,
  createExportProfile,
  normalizeAnswerText,
  scoreQuestionnaire,
  type QuestionnaireAnswerMap,
  type QuestionnaireAnswerValue,
  type QuestionnaireConsent,
  type QuestionnaireDefinition,
} from "@/lib/questionnaire-engine";
import {
  defaultWidgetConfig,
  LEADFLOW_WIDGET_CATALOG,
  LEADFLOW_WIDGET_EVENT_NAMES,
  LEADFLOW_WIDGET_TYPES,
  WIDGET_CONSENT_VERSION,
  type LeadFlowWidgetEventName,
  type LeadFlowWidgetPublicConfig,
  type LeadFlowWidgetType,
  type WidgetStatus,
} from "@/lib/leadflow-widget-definitions";
import {
  hasLeadFlowDataApiConfig,
  insertLeadFlowRow,
  patchLeadFlowRows,
  selectLeadFlowRows,
} from "@/lib/leadflow-data-api";
import { sanitizeLeadFlowEventProperties } from "@/lib/leadflow-events";

type JsonRecord = Record<string, unknown>;

export type LeadFlowWidgetRow = {
  id: string;
  owner_account_id: string | null;
  widget_type: LeadFlowWidgetType;
  name: string;
  slug: string;
  status: WidgetStatus;
  allowed_domains: string[];
  theme: JsonRecord;
  questionnaire_id: string | null;
  questionnaire_version_id?: string | null;
  redirect_url: string | null;
  completion_message: string | null;
  consent_required: boolean;
  settings?: JsonRecord;
  created_at: string;
  updated_at: string;
  deleted_at?: string | null;
};

export type WidgetSubmissionRow = {
  id: string;
  widget_id: string;
  domain: string | null;
  response_id: string | null;
  anonymous_session_id: string | null;
  identity_id: string | null;
  score: number | string | null;
  tags: string[] | null;
  source_url?: string | null;
  page_url?: string | null;
  created_at: string;
};

export type WidgetEventRow = {
  id: string;
  widget_id: string;
  event_name: LeadFlowWidgetEventName;
  domain: string | null;
  page_url: string | null;
  anonymous_session_id: string | null;
  properties: JsonRecord;
  created_at: string;
};

export type WidgetAdminSummary = {
  widget: LeadFlowWidgetRow;
  loads: number;
  starts: number;
  completions: number;
  contacts: number;
  conversionRate: number;
  averageScore: number;
  topTags: string[];
  topDomains: string[];
};

export type WidgetAdminDashboardData = {
  mode: "live" | "offline";
  widgets: WidgetAdminSummary[];
  catalog: typeof LEADFLOW_WIDGET_CATALOG;
  totals: {
    widgets: number;
    active: number;
    loads: number;
    starts: number;
    completions: number;
    contacts: number;
    averageScore: number;
  };
  loadErrors: string[];
};

export type WidgetDetailData = WidgetAdminDashboardData & {
  currentWidget: WidgetAdminSummary | null;
  events: WidgetEventRow[];
  submissions: WidgetSubmissionRow[];
  embedCode: string;
};

export type WidgetSubmitInput = {
  widgetId: string;
  anonymousUserId: string;
  answers: QuestionnaireAnswerMap;
  consent: {
    saveAnswers: boolean;
    contactMe: boolean;
    routeOrShare: boolean;
  };
  sourceDomain: string;
  pageUrl: string;
  sourceUrl?: string;
  userAgent?: string | null;
  ipAddress?: string | null;
};

export type WidgetEventInput = {
  widgetId: string;
  eventName: LeadFlowWidgetEventName;
  anonymousUserId?: string;
  sourceDomain: string;
  pageUrl: string;
  properties?: JsonRecord;
  userAgent?: string | null;
  ipAddress?: string | null;
};

export type AdminSaveWidgetInput = {
  action: "create" | "update" | "pause" | "activate" | "archive" | "delete";
  widgetId?: string | null;
  widgetType?: LeadFlowWidgetType;
  name?: string;
  slug?: string;
  status?: WidgetStatus;
  allowedDomains?: string[];
  theme?: JsonRecord;
  questionnaireId?: string | null;
  questionnaireVersionId?: string | null;
  redirectUrl?: string | null;
  completionMessage?: string;
  consentRequired?: boolean;
  adminUserId?: string | null;
};

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
const FORBIDDEN_ANSWER_RE =
  /\b(ssn|social security|driver'?s license|bank account|routing number|credit card|medical|diagnosis|minor|under 18|race|ethnicity|religion|sexual orientation|private political|password|login|hacked|leaked)\b/i;
const SAFE_WIDGET_QUERY_KEYS = new Set(["utm_source", "utm_medium", "utm_campaign", "utm_content", "utm_term"]);

function cleanWidgetId(value: string) {
  return value.replace(/\.js$/i, "").replace(/[^a-zA-Z0-9_.:-]/g, "").slice(0, 120);
}

function cleanSlug(value: string) {
  return value
    .toLowerCase()
    .replace(/[^a-z0-9-]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 90);
}

function cleanDomain(input: string) {
  const value = (input || "").trim().toLowerCase();
  if (!value) return "";
  try {
    const url = new URL(value.includes("://") ? value : `https://${value}`);
    return url.hostname.replace(/^www\./, "").slice(0, 180);
  } catch {
    return value.replace(/^www\./, "").replace(/[^a-z0-9.-]/g, "").slice(0, 180);
  }
}

function safeUrl(input: string, fallback = "https://www.theleadflowpro.com/widgets") {
  try {
    const url = new URL(input || fallback);
    const safeParams = new URLSearchParams();
    for (const [key, value] of url.searchParams.entries()) {
      if (SAFE_WIDGET_QUERY_KEYS.has(key)) safeParams.set(key, value.slice(0, 160));
    }
    url.search = safeParams.toString();
    url.hash = "";
    return url.toString().slice(0, 900);
  } catch {
    return fallback;
  }
}

function hashValue(value: string | null | undefined) {
  if (!value) return null;
  const salt = process.env.CONSENT_HASH_SALT || process.env.NEXTAUTH_SECRET || "leadflow-widget-local-salt";
  return crypto.createHash("sha256").update(`${salt}:${value}`).digest("hex");
}

function confidenceToNumber(level: "low" | "medium" | "high") {
  if (level === "high") return 0.86;
  if (level === "medium") return 0.62;
  return 0.34;
}

function isWidgetEventName(value: string): value is LeadFlowWidgetEventName {
  return LEADFLOW_WIDGET_EVENT_NAMES.includes(value as LeadFlowWidgetEventName);
}

function isWidgetType(value: string): value is LeadFlowWidgetType {
  return LEADFLOW_WIDGET_TYPES.includes(value as LeadFlowWidgetType);
}

type QuestionnaireVersionRow = {
  id: string;
  questionnaire_id: string;
  question_schema: Record<string, unknown>;
  status: string;
};

function isQuestionnaireDefinition(value: unknown): value is QuestionnaireDefinition {
  return Boolean(
    value &&
      typeof value === "object" &&
      Array.isArray((value as QuestionnaireDefinition).steps) &&
      typeof (value as QuestionnaireDefinition).toolSlug === "string",
  );
}

async function definitionForQuestionnaire(row: LeadFlowWidgetRow) {
  if (!row.questionnaire_id || !hasLeadFlowDataApiConfig()) return null;
  const params: Record<string, string | number | boolean | null | undefined> = {
    select: "id,questionnaire_id,question_schema,status",
    questionnaire_id: `eq.${row.questionnaire_id}`,
    status: "eq.published",
    order: "version_number.desc",
    limit: 1,
  };
  if (row.questionnaire_version_id) {
    params.id = `eq.${row.questionnaire_version_id}`;
    delete params.questionnaire_id;
  }
  const versions = await selectLeadFlowRows<QuestionnaireVersionRow>("questionnaire_versions", params).catch(() => []);
  const schema = versions[0]?.question_schema;
  return isQuestionnaireDefinition(schema) ? schema : null;
}

function rowToPublicConfig(row: LeadFlowWidgetRow, definitionOverride?: QuestionnaireDefinition | null): LeadFlowWidgetPublicConfig {
  const fallback = defaultWidgetConfig(row.slug) || defaultWidgetConfig(row.widget_type) || defaultWidgetConfig("custom-questionnaire");
  const definition = definitionOverride || fallback?.definition || LEADFLOW_WIDGET_CATALOG[LEADFLOW_WIDGET_CATALOG.length - 1].definition;
  return {
    id: row.id,
    slug: row.slug,
    widget_type: row.widget_type,
    name: row.name,
    status: row.status,
    allowed_domains: row.allowed_domains || [],
    theme: row.theme || {},
    questionnaire_id: row.questionnaire_id,
    redirect_url: row.redirect_url,
    completion_message: row.completion_message || fallback?.completion_message || "Your signal score is ready.",
    consent_required: row.consent_required,
    definition,
  };
}

function fallbackRow(config: LeadFlowWidgetPublicConfig): LeadFlowWidgetRow {
  return {
    id: config.id,
    owner_account_id: null,
    widget_type: config.widget_type,
    name: config.name,
    slug: config.slug,
    status: config.status,
    allowed_domains: config.allowed_domains,
    theme: config.theme,
    questionnaire_id: config.questionnaire_id,
    redirect_url: config.redirect_url,
    completion_message: config.completion_message,
    consent_required: config.consent_required,
    settings: {},
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
    deleted_at: null,
  };
}

function domainAllowed(config: LeadFlowWidgetPublicConfig, sourceDomain: string) {
  const domain = cleanDomain(sourceDomain);
  const allowed = (config.allowed_domains || []).map(cleanDomain).filter(Boolean);
  if (!allowed.length || allowed.includes("*")) return true;
  return allowed.some((entry) => {
    if (entry === domain) return true;
    if (entry.startsWith(".")) return domain.endsWith(entry);
    return domain === entry || domain.endsWith(`.${entry}`);
  });
}

function safeAnswers(definition: LeadFlowWidgetPublicConfig["definition"], answers: QuestionnaireAnswerMap) {
  const allowedQuestionIds = new Set(definition.steps.flatMap((step) => step.questions.map((question) => question.id)));
  const cleaned: QuestionnaireAnswerMap = {};
  const blocked: string[] = [];

  for (const [key, value] of Object.entries(answers || {})) {
    if (!allowedQuestionIds.has(key)) continue;
    if (Array.isArray(value)) {
      const safeValues = value
        .filter((item) => typeof item === "string" || (typeof item === "object" && item !== null))
        .slice(0, 12) as QuestionnaireAnswerValue;
      cleaned[key] = safeValues;
      continue;
    }
    if (typeof value === "string") {
      const compact = value.replace(/\s+/g, " ").trim().slice(0, 1200);
      if (FORBIDDEN_ANSWER_RE.test(compact)) blocked.push(key);
      cleaned[key] = compact;
      continue;
    }
    if (typeof value === "number" && Number.isFinite(value)) {
      cleaned[key] = value;
      continue;
    }
    if (typeof value === "boolean") {
      cleaned[key] = value;
    }
  }

  return { answers: cleaned, blocked };
}

async function getWidgetRowFromDb(widgetId: string) {
  if (!hasLeadFlowDataApiConfig()) return null;
  const cleanId = cleanWidgetId(widgetId);
  const candidates: LeadFlowWidgetRow[] = [];

  if (UUID_RE.test(cleanId)) {
    const byId = await selectLeadFlowRows<LeadFlowWidgetRow>("widgets", {
      select: "*",
      id: `eq.${cleanId}`,
      deleted_at: "is.null",
      limit: 1,
    }).catch(() => []);
    candidates.push(...byId);
  }

  const bySlug = await selectLeadFlowRows<LeadFlowWidgetRow>("widgets", {
    select: "*",
    slug: `eq.${cleanSlug(cleanId)}`,
    deleted_at: "is.null",
    limit: 1,
  }).catch(() => []);
  candidates.push(...bySlug);

  return candidates[0] || null;
}

export async function getPublicWidgetConfig(widgetId: string) {
  const cleanId = cleanWidgetId(widgetId);
  const row = await getWidgetRowFromDb(cleanId);
  if (row) return rowToPublicConfig(row, await definitionForQuestionnaire(row));
  return defaultWidgetConfig(cleanId);
}

async function ensureAnonymousSession(input: {
  anonymousUserId: string;
  sourceUrl: string;
  sourceDomain: string;
  userAgent?: string | null;
  ipAddress?: string | null;
}) {
  if (!hasLeadFlowDataApiConfig()) return null;
  const anonymousUserId = input.anonymousUserId.replace(/[^a-zA-Z0-9_.:-]/g, "").slice(0, 120);
  if (!anonymousUserId) return null;

  const existing = await selectLeadFlowRows<{ id: string }>("anonymous_sessions", {
    select: "id",
    anonymous_user_id: `eq.${anonymousUserId}`,
    limit: 1,
  }).catch(() => []);
  if (existing[0]?.id) return existing[0].id;

  const inserted = await insertLeadFlowRow<{ id: string }>("anonymous_sessions", {
    anonymous_user_id: anonymousUserId,
    source_url: input.sourceUrl,
    source_path: "/embedded-widget",
    landing_page: input.sourceUrl,
    user_agent_hash: hashValue(input.userAgent),
    ip_hash: hashValue(input.ipAddress),
    metadata: {
      source: "embedded_widget",
      source_domain: cleanDomain(input.sourceDomain),
    },
  }).catch(() => []);
  return inserted[0]?.id || null;
}

async function rateLimitWidget(widgetId: string, domain: string) {
  if (!hasLeadFlowDataApiConfig()) return { ok: true as const };
  const since = new Date(Date.now() - 15 * 60 * 1000).toISOString();
  const recent = await selectLeadFlowRows<{ id: string }>("widget_events", {
    select: "id",
    widget_id: `eq.${widgetId}`,
    domain: `eq.${cleanDomain(domain)}`,
    event_name: "in.(widget_completed,widget_contact_submitted)",
    created_at: `gte.${since}`,
    limit: 61,
  }).catch(() => []);
  if (recent.length > 60) {
    return { ok: false as const, error: "Too many widget submissions from this domain. Try again later." };
  }
  return { ok: true as const };
}

export async function recordWidgetEvent(input: WidgetEventInput) {
  const widget = await getPublicWidgetConfig(input.widgetId);
  if (!widget) return { ok: false, status: 404, error: "Widget not found." };
  if (widget.status !== "active") return { ok: false, status: 403, error: "Widget is not active." };
  if (!isWidgetEventName(input.eventName)) return { ok: false, status: 400, error: "Invalid widget event." };
  if (!domainAllowed(widget, input.sourceDomain)) return { ok: false, status: 403, error: "This widget is not allowed on that domain." };

  const anonymousSessionId = await ensureAnonymousSession({
    anonymousUserId: input.anonymousUserId || "",
    sourceUrl: safeUrl(input.pageUrl),
    sourceDomain: input.sourceDomain,
    userAgent: input.userAgent,
    ipAddress: input.ipAddress,
  });
  const properties = sanitizeLeadFlowEventProperties({
    ...input.properties,
    widget_id: widget.id,
    widget_slug: widget.slug,
    tool_slug: widget.definition.toolSlug,
    vertical: widget.definition.vertical,
  });

  if (hasLeadFlowDataApiConfig()) {
    await insertLeadFlowRow("widget_events", {
      widget_id: widget.id,
      event_name: input.eventName,
      domain: cleanDomain(input.sourceDomain),
      page_url: safeUrl(input.pageUrl),
      anonymous_session_id: anonymousSessionId,
      properties,
    }).catch(() => null);

    await insertLeadFlowRow("events", {
      anonymous_session_id: anonymousSessionId,
      event_name: input.eventName,
      event_type: "embedded_widget",
      tool_slug: widget.definition.toolSlug,
      vertical: widget.definition.vertical,
      category: widget.widget_type,
      source_url: safeUrl(input.pageUrl),
      source_path: "/embedded-widget",
      properties,
    }).catch(() => null);
  }

  return { ok: true, status: 200, persisted: hasLeadFlowDataApiConfig() };
}

export async function submitWidgetResponse(input: WidgetSubmitInput) {
  const widget = await getPublicWidgetConfig(input.widgetId);
  if (!widget) return { ok: false, status: 404, error: "Widget not found." };
  if (widget.status !== "active") return { ok: false, status: 403, error: "Widget is not active." };
  if (!domainAllowed(widget, input.sourceDomain)) return { ok: false, status: 403, error: "This widget is not allowed on that domain." };
  if (widget.consent_required && !input.consent.saveAnswers) {
    return { ok: false, status: 400, error: "Consent is required before saving this widget response." };
  }

  const rate = await rateLimitWidget(widget.id, input.sourceDomain);
  if (!rate.ok) return { ok: false, status: 429, error: rate.error };

  const cleaned = safeAnswers(widget.definition, input.answers);
  if (cleaned.blocked.length) {
    await recordWidgetEvent({
      widgetId: widget.id,
      eventName: "widget_completed",
      anonymousUserId: input.anonymousUserId,
      sourceDomain: input.sourceDomain,
      pageUrl: input.pageUrl,
      properties: { status: "blocked_sensitive_answer", blocked_count: cleaned.blocked.length },
      userAgent: input.userAgent,
      ipAddress: input.ipAddress,
    });
    return {
      ok: false,
      status: 400,
      error: "This tool cannot accept minors, protected traits, medical, private financial, login-only, hacked, or leaked data.",
    };
  }

  const score = scoreQuestionnaire(widget.definition, cleaned.answers);
  const sourceUrl = safeUrl(input.sourceUrl || input.pageUrl);
  const anonymousSessionId = await ensureAnonymousSession({
    anonymousUserId: input.anonymousUserId,
    sourceUrl,
    sourceDomain: input.sourceDomain,
    userAgent: input.userAgent,
    ipAddress: input.ipAddress,
  });

  let responseId: string | null = null;
  let leadProfileId: string | null = null;
  const confidenceNumber = confidenceToNumber(score.confidence);
  const consentStatus = input.consent.saveAnswers ? "accepted" : "declined";
  const exportProfile = createExportProfile({
    responseId: "pending",
    anonymousUserId: input.anonymousUserId,
    definition: widget.definition,
    attribution: {
      sourceUrl,
      sourcePath: "/embedded-widget",
    },
    consent: {
      status: input.consent.routeOrShare ? "aggregate_only" : "anonymous_only",
      routeData: input.consent.routeOrShare,
      noticeVersion: WIDGET_CONSENT_VERSION,
    } satisfies QuestionnaireConsent,
    score,
  });

  if (hasLeadFlowDataApiConfig()) {
    const responses = await insertLeadFlowRow<{ id: string }>("responses", {
      anonymous_session_id: anonymousSessionId,
      questionnaire_id: widget.questionnaire_id,
      questionnaire_version_id: null,
      tool_slug: widget.definition.toolSlug,
      vertical: widget.definition.vertical,
      category: widget.widget_type,
      status: "completed",
      review_status: score.suppressionStatus === "needs_review" ? "review" : "pending",
      consent_status: consentStatus,
      consent_version: WIDGET_CONSENT_VERSION,
      suppression_status: score.suppressionStatus === "needs_review" ? "unchecked" : "clear",
      tags: score.tags,
      score: score.score,
      confidence: confidenceNumber,
      recommended_next_action: score.recommendedNextAction,
      source_url: sourceUrl,
      source_path: "/embedded-widget",
      metadata: {
        source: "embedded_widget",
        widget_id: widget.id,
        widget_slug: widget.slug,
        source_domain: cleanDomain(input.sourceDomain),
        page_url: safeUrl(input.pageUrl),
      },
      export_ready_profile: { ...exportProfile, response_id: "pending" },
      completed_at: new Date().toISOString(),
    }).catch(() => []);
    responseId = responses[0]?.id || null;

    if (responseId) {
      const answerRows = widget.definition.steps.flatMap((step) =>
        step.questions.flatMap((question) => {
          const value = cleaned.answers[question.id];
          if (value === undefined || value === null || value === "" || (Array.isArray(value) && value.length === 0)) return [];
          const text = normalizeAnswerText(value);
          return [{
            response_id: responseId,
            question_key: question.id,
            raw_answer: { value },
            normalized_answer: { text, type: question.type },
            answer_text: text,
            answer_sha256: hashValue(text),
            answer_tags: answerTagsForQuestion(question, value),
            approved_for_buyer: false,
            review_status: "pending",
            source_url: sourceUrl,
            metadata: {
              answer_score: answerScoreForQuestion(question, value),
            },
          }];
        }),
      );
      await Promise.all(answerRows.map((row) => insertLeadFlowRow("answers", row).catch(() => null)));

      await patchLeadFlowRows("responses", { id: `eq.${responseId}` }, {
        export_ready_profile: {
          ...exportProfile,
          response_id: responseId,
        },
      }).catch(() => null);

      if (input.consent.saveAnswers) {
        await insertLeadFlowRow("consent_ledger", {
          anonymous_session_id: anonymousSessionId,
          response_id: responseId,
          identity_id: null,
          scope: "profile_personalization",
          consent_scope: "tool_answers_only",
          consent_type: "embedded_widget_response",
          granted: true,
          consent_status: "accepted",
          consent_version: WIDGET_CONSENT_VERSION,
          notice_version: WIDGET_CONSENT_VERSION,
          consent_text:
            "I agree to save my answers for this LeadFlow widget result. I understand separate permission is required before contacting me, sharing with a seller, routing to a CRM, or selling/routing identified data.",
          disclosure_text:
            "Embedded widget responses are saved with source domain, page URL, timestamp, consent version, and anonymous session ID for review-gated scoring.",
          sales_channel: "embedded_widget",
          vertical: widget.definition.vertical,
          source_url: sourceUrl,
          source_path: "/embedded-widget",
          capture_url: safeUrl(input.pageUrl),
          tool_slug: widget.definition.toolSlug,
          ip_hash: hashValue(input.ipAddress),
          user_agent_hash: hashValue(input.userAgent),
          metadata: {
            widget_id: widget.id,
            widget_slug: widget.slug,
            contact_me: input.consent.contactMe,
            route_or_share: input.consent.routeOrShare,
          },
          accepted_at: new Date().toISOString(),
        }).catch(() => null);
      }

      const profileRows = await insertLeadFlowRow<{ id: string }>("lead_profiles", {
        anonymous_session_id: anonymousSessionId,
        response_id: responseId,
        title: `${widget.name} response from ${cleanDomain(input.sourceDomain) || "embedded site"}`,
        vertical: widget.definition.vertical,
        category: widget.widget_type,
        buyer_use_case: "Review-gated first-party widget response with consent status, score, tags, and source page attached.",
        tags: score.tags,
        score: score.score,
        confidence: confidenceNumber,
        consent_status: consentStatus,
        suppression_status: score.suppressionStatus,
        source_proof_status: "submitted",
        status: "draft",
        review_status: score.suppressionStatus === "needs_review" ? "review" : "pending",
        source_url: sourceUrl,
        source_path: "/embedded-widget",
        consent_version: WIDGET_CONSENT_VERSION,
        buyer_visible_summary: {
          widget: widget.name,
          score: score.score,
          confidence: score.confidence,
          tags: score.tags.slice(0, 12),
          recommended_next_action: score.recommendedNextAction,
          source_domain: cleanDomain(input.sourceDomain),
        },
        private_profile: {
          source: "embedded_widget",
          widget_id: widget.id,
          page_url: safeUrl(input.pageUrl),
          route_or_share_consent: input.consent.routeOrShare,
          contact_consent: input.consent.contactMe,
        },
        last_scored_at: new Date().toISOString(),
        last_verified_at: new Date().toISOString(),
      }).catch(() => []);
      leadProfileId = profileRows[0]?.id || null;

      await insertLeadFlowRow("widget_submissions", {
        widget_id: widget.id,
        domain: cleanDomain(input.sourceDomain),
        response_id: responseId,
        anonymous_session_id: anonymousSessionId,
        identity_id: null,
        score: score.score,
        tags: score.tags,
        source_url: sourceUrl,
        page_url: safeUrl(input.pageUrl),
        consent_version: WIDGET_CONSENT_VERSION,
      }).catch(() => null);

      await insertLeadFlowRow("audit_log", {
        actor_type: "consumer",
        action: "widget_response_saved",
        object_table: "responses",
        object_id: responseId,
        lead_profile_id: leadProfileId,
        after_redacted: {
          widget_id: widget.id,
          score: score.score,
          tags: score.tags.slice(0, 12),
          source_domain: cleanDomain(input.sourceDomain),
        },
        details: {
          source: "embedded_widget",
          consent_version: WIDGET_CONSENT_VERSION,
        },
        ip_hash: hashValue(input.ipAddress),
        user_agent_hash: hashValue(input.userAgent),
      }).catch(() => null);
    }
  }

  await recordWidgetEvent({
    widgetId: widget.id,
    eventName: "widget_completed",
    anonymousUserId: input.anonymousUserId,
    sourceDomain: input.sourceDomain,
    pageUrl: input.pageUrl,
    properties: {
      status: "completed",
      score_range: score.score >= 80 ? "high" : score.score >= 60 ? "medium" : "low",
      confidence: score.confidence,
    },
    userAgent: input.userAgent,
    ipAddress: input.ipAddress,
  });

  if (input.consent.contactMe) {
    await recordWidgetEvent({
      widgetId: widget.id,
      eventName: "widget_contact_submitted",
      anonymousUserId: input.anonymousUserId,
      sourceDomain: input.sourceDomain,
      pageUrl: input.pageUrl,
      properties: {
        status: "contact_permission_given",
        tool_slug: widget.definition.toolSlug,
      },
      userAgent: input.userAgent,
      ipAddress: input.ipAddress,
    });
  }

  return {
    ok: true,
    status: 200,
    responseId,
    leadProfileId,
    result: {
      score: score.score,
      confidence: score.confidence,
      tags: score.tags,
      recommendedNextAction: score.recommendedNextAction,
      message: widget.completion_message,
    },
    persisted: hasLeadFlowDataApiConfig() && Boolean(responseId),
  };
}

function countEvents(events: WidgetEventRow[], name: LeadFlowWidgetEventName) {
  return events.filter((event) => event.event_name === name).length;
}

function topList(values: string[]) {
  const counts = new Map<string, number>();
  for (const value of values.filter(Boolean)) counts.set(value, (counts.get(value) || 0) + 1);
  return Array.from(counts.entries()).sort((a, b) => b[1] - a[1]).slice(0, 5).map(([value]) => value);
}

function summarizeWidget(widget: LeadFlowWidgetRow, events: WidgetEventRow[], submissions: WidgetSubmissionRow[]): WidgetAdminSummary {
  const widgetEvents = events.filter((event) => event.widget_id === widget.id);
  const widgetSubmissions = submissions.filter((submission) => submission.widget_id === widget.id);
  const loads = countEvents(widgetEvents, "widget_loaded");
  const starts = countEvents(widgetEvents, "widget_started");
  const completions = countEvents(widgetEvents, "widget_completed");
  const contacts = countEvents(widgetEvents, "widget_contact_submitted");
  const scores = widgetSubmissions.map((submission) => Number(submission.score || 0)).filter((score) => score > 0);
  return {
    widget,
    loads,
    starts,
    completions,
    contacts,
    conversionRate: starts ? Math.round((completions / starts) * 100) : 0,
    averageScore: scores.length ? Math.round(scores.reduce((sum, score) => sum + score, 0) / scores.length) : 0,
    topTags: topList(widgetSubmissions.flatMap((submission) => submission.tags || [])),
    topDomains: topList(widgetEvents.map((event) => event.domain || "")),
  };
}

export async function getAdminWidgetsDashboardData(): Promise<WidgetAdminDashboardData> {
  if (!hasLeadFlowDataApiConfig()) {
    const widgets = LEADFLOW_WIDGET_CATALOG.slice(0, 4).map((item) => summarizeWidget(fallbackRow(defaultWidgetConfig(item.slug)!), [], []));
    return {
      mode: "offline",
      widgets,
      catalog: LEADFLOW_WIDGET_CATALOG,
      totals: {
        widgets: widgets.length,
        active: widgets.length,
        loads: 0,
        starts: 0,
        completions: 0,
        contacts: 0,
        averageScore: 0,
      },
      loadErrors: ["Supabase Data API is not configured. Showing safe widget templates only."],
    };
  }

  const loadErrors: string[] = [];
  const widgets = await selectLeadFlowRows<LeadFlowWidgetRow>("widgets", {
    select: "*",
    deleted_at: "is.null",
    order: "updated_at.desc",
    limit: 100,
  }).catch((error) => {
    loadErrors.push(error instanceof Error ? error.message : "Unable to load widgets.");
    return [];
  });
  const events = await selectLeadFlowRows<WidgetEventRow>("widget_events", {
    select: "*",
    order: "created_at.desc",
    limit: 500,
  }).catch(() => []);
  const submissions = await selectLeadFlowRows<WidgetSubmissionRow>("widget_submissions", {
    select: "*",
    order: "created_at.desc",
    limit: 500,
  }).catch(() => []);

  const summaries = widgets.map((widget) => summarizeWidget(widget, events, submissions));
  const scored = summaries.map((summary) => summary.averageScore).filter(Boolean);
  return {
    mode: loadErrors.length ? "offline" : "live",
    widgets: summaries,
    catalog: LEADFLOW_WIDGET_CATALOG,
    totals: {
      widgets: summaries.length,
      active: summaries.filter((summary) => summary.widget.status === "active").length,
      loads: summaries.reduce((sum, summary) => sum + summary.loads, 0),
      starts: summaries.reduce((sum, summary) => sum + summary.starts, 0),
      completions: summaries.reduce((sum, summary) => sum + summary.completions, 0),
      contacts: summaries.reduce((sum, summary) => sum + summary.contacts, 0),
      averageScore: scored.length ? Math.round(scored.reduce((sum, score) => sum + score, 0) / scored.length) : 0,
    },
    loadErrors,
  };
}

export async function getAdminWidgetDetailData(widgetId: string): Promise<WidgetDetailData> {
  const dashboard = await getAdminWidgetsDashboardData();
  const cleanId = cleanWidgetId(widgetId);
  const currentWidget =
    dashboard.widgets.find((summary) => summary.widget.id === cleanId || summary.widget.slug === cleanSlug(cleanId)) || null;
  const widgetKey = currentWidget?.widget.id || cleanId;
  const [events, submissions] = hasLeadFlowDataApiConfig()
    ? await Promise.all([
        selectLeadFlowRows<WidgetEventRow>("widget_events", {
          select: "*",
          widget_id: `eq.${widgetKey}`,
          order: "created_at.desc",
          limit: 250,
        }).catch(() => []),
        selectLeadFlowRows<WidgetSubmissionRow>("widget_submissions", {
          select: "*",
          widget_id: `eq.${widgetKey}`,
          order: "created_at.desc",
          limit: 250,
        }).catch(() => []),
      ])
    : [[], []];

  const publicId = currentWidget?.widget.slug || cleanSlug(cleanId) || cleanId;
  const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || "https://www.theleadflowpro.com";
  return {
    ...dashboard,
    currentWidget,
    events,
    submissions,
    embedCode: `<script src="${siteUrl.replace(/\/$/, "")}/api/widget-script/${publicId}.js"></script>\n<div id="leadflow-widget-${publicId}"></div>`,
  };
}

export async function adminSaveWidget(input: AdminSaveWidgetInput) {
  if (!hasLeadFlowDataApiConfig()) {
    return { ok: false as const, status: 503, error: "Supabase Data API is not configured." };
  }

  const action = input.action;
  const widgetId = input.widgetId ? cleanWidgetId(input.widgetId) : null;
  const existing = widgetId ? await getWidgetRowFromDb(widgetId) : null;

  if (["pause", "activate", "archive", "delete"].includes(action)) {
    if (!existing) return { ok: false as const, status: 404, error: "Widget not found." };
    const status: WidgetStatus =
      action === "pause" ? "paused" : action === "activate" ? "active" : action === "archive" ? "archived" : "deleted";
    const updated = await patchLeadFlowRows<LeadFlowWidgetRow>("widgets", { id: `eq.${existing.id}` }, {
      status,
      deleted_at: action === "delete" ? new Date().toISOString() : null,
    }).catch(() => []);
    await insertLeadFlowRow("audit_log", {
      actor_user_id: input.adminUserId || null,
      actor_type: "admin",
      action: `widget_${action}`,
      object_table: "widgets",
      object_id: existing.id,
      before_redacted: { status: existing.status },
      after_redacted: { status },
      details: { widget_slug: existing.slug },
    }).catch(() => null);
    return { ok: true as const, status: 200, widget: updated[0] || { ...existing, status } };
  }

  const widgetType = input.widgetType && isWidgetType(input.widgetType) ? input.widgetType : "lead_leak_audit";
  const catalog = LEADFLOW_WIDGET_CATALOG.find((item) => item.type === widgetType) || LEADFLOW_WIDGET_CATALOG[0];
  const slug = cleanSlug(input.slug || catalog.slug);
  const allowedDomains = (input.allowedDomains || ["*"]).map(cleanDomain).filter(Boolean).slice(0, 25);
  const row = {
    widget_type: widgetType,
    name: (input.name || catalog.name).trim().slice(0, 160),
    slug,
    status: input.status || "active",
    allowed_domains: allowedDomains.length ? allowedDomains : ["*"],
    theme: input.theme || {},
    questionnaire_id: input.questionnaireId || null,
    questionnaire_version_id: input.questionnaireVersionId || null,
    redirect_url: input.redirectUrl || null,
    completion_message: (input.completionMessage || "Your signal score is ready.").slice(0, 500),
    consent_required: input.consentRequired ?? true,
    settings: {
      catalog_slug: catalog.slug,
      consent_version: WIDGET_CONSENT_VERSION,
    },
  };

  const saved =
    action === "update" && existing
      ? await patchLeadFlowRows<LeadFlowWidgetRow>("widgets", { id: `eq.${existing.id}` }, row).catch(() => [])
      : await insertLeadFlowRow<LeadFlowWidgetRow>("widgets", row).catch(() => []);
  const widget = saved[0] || existing;
  if (!widget) return { ok: false as const, status: 500, error: "Widget save failed." };

  await insertLeadFlowRow("audit_log", {
    actor_user_id: input.adminUserId || null,
    actor_type: "admin",
    action: action === "update" ? "widget_updated" : "widget_created",
    object_table: "widgets",
    object_id: widget.id,
    after_redacted: {
      widget_type: widget.widget_type,
      slug: widget.slug,
      status: widget.status,
      allowed_domains: widget.allowed_domains,
    },
    details: { consent_version: WIDGET_CONSENT_VERSION },
  }).catch(() => null);

  return { ok: true as const, status: 200, widget };
}
