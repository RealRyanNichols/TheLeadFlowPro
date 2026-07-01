import type { BeforeSendEvent } from "@vercel/analytics/next";

export type LeadFlowAnalyticsStream = "vercel_anonymous" | "supabase_identified";

export type LeadFlowEventDefinition = {
  name: string;
  stream: LeadFlowAnalyticsStream;
  eventType: string;
  description: string;
  allowedProperties: readonly string[];
};

export const LEADFLOW_EVENT_TAXONOMY = [
  {
    name: "lf_page_view",
    stream: "vercel_anonymous",
    eventType: "page_view",
    description: "Anonymous page view or client-side route transition.",
    allowedProperties: ["route", "path", "source_family", "device_type", "viewport_bucket"],
  },
  {
    name: "lf_quiz_started",
    stream: "vercel_anonymous",
    eventType: "quiz_start",
    description: "Visitor starts an intake quiz or problem-solver flow.",
    allowedProperties: ["route", "quiz_key", "vertical", "entry_surface", "utm_source", "utm_medium", "utm_campaign"],
  },
  {
    name: "lf_question_answered",
    stream: "vercel_anonymous",
    eventType: "question_answered",
    description: "Question step completed without raw answer text.",
    allowedProperties: ["quiz_key", "question_key", "question_type", "step_index", "branch_key", "answer_bucket"],
  },
  {
    name: "lf_branch_entered",
    stream: "vercel_anonymous",
    eventType: "branch_entered",
    description: "Visitor enters a quiz branch or vertical path.",
    allowedProperties: ["quiz_key", "branch_key", "vertical", "trigger_question_key", "step_index"],
  },
  {
    name: "lf_dropoff_point",
    stream: "vercel_anonymous",
    eventType: "drop_off_point",
    description: "Visitor abandons or exits at a known step.",
    allowedProperties: ["quiz_key", "step_key", "step_index", "completion_percent", "time_on_step_bucket"],
  },
  {
    name: "lf_consent_viewed",
    stream: "vercel_anonymous",
    eventType: "consent_viewed",
    description: "Consent language becomes visible.",
    allowedProperties: ["quiz_key", "consent_scope", "notice_version", "surface"],
  },
  {
    name: "consent_given",
    stream: "vercel_anonymous",
    eventType: "consent_given",
    description: "Consent action accepted without personal identifiers.",
    allowedProperties: ["quiz_key", "consent_scope", "notice_version", "permission_mode", "seller_count_bucket"],
  },
  {
    name: "lf_seller_selected",
    stream: "vercel_anonymous",
    eventType: "seller_selected",
    description: "A named seller option is selected without revealing the consumer.",
    allowedProperties: ["quiz_key", "vertical", "permission_mode", "seller_category", "seller_count_bucket"],
  },
  {
    name: "lf_form_completed",
    stream: "vercel_anonymous",
    eventType: "form_completed",
    description: "Quiz or lead form completes without PII payload.",
    allowedProperties: ["quiz_key", "vertical", "completion_type", "step_count_bucket", "intent_score_bucket"],
  },
  {
    name: "marketplace_filter_changed",
    stream: "vercel_anonymous",
    eventType: "marketplace_filter_changed",
    description: "Buyer changes a marketplace filter without personal identifiers.",
    allowedProperties: ["page", "filter_key", "filter_value", "visible_count"],
  },
  {
    name: "marketplace_viewed",
    stream: "vercel_anonymous",
    eventType: "marketplace_viewed",
    description: "Buyer views the public lead signal marketplace.",
    allowedProperties: ["page", "listing_count", "featured_count"],
  },
  {
    name: "marketplace_filter_changed",
    stream: "vercel_anonymous",
    eventType: "marketplace_filter_changed",
    description: "Buyer changes a marketplace filter without personal identifiers.",
    allowedProperties: ["page", "filter_key", "filter_value", "visible_count"],
  },
  {
    name: "listing_card_clicked",
    stream: "vercel_anonymous",
    eventType: "listing_card_clicked",
    description: "Buyer opens or focuses a marketplace signal card.",
    allowedProperties: ["page", "signal_id", "signal_title", "category", "lead_score"],
  },
  {
    name: "listing_preview_opened",
    stream: "vercel_anonymous",
    eventType: "listing_preview_opened",
    description: "Buyer views a marketplace listing preview without personal identifiers.",
    allowedProperties: ["page", "listing_id", "category", "vertical", "lead_score", "view_source"],
  },
  {
    name: "listing_preview_opened",
    stream: "vercel_anonymous",
    eventType: "listing_preview_opened",
    description: "Buyer opens the preview modal for a marketplace listing.",
    allowedProperties: ["page", "listing_id", "category", "vertical", "lead_score", "open_source"],
  },
  {
    name: "sample_request_started",
    stream: "vercel_anonymous",
    eventType: "sample_request_started",
    description: "Buyer clicks request sample on a marketplace signal card.",
    allowedProperties: ["page", "signal_id", "signal_title", "category", "request_type", "lead_score"],
  },
  {
    name: "sample_request_submitted",
    stream: "vercel_anonymous",
    eventType: "sample_request_submitted",
    description: "Buyer submits a marketplace sample request without personal identifiers.",
    allowedProperties: ["page", "listing_id", "category", "vertical", "lead_score", "request_type", "persisted"],
  },
  {
    name: "access_request_started",
    stream: "vercel_anonymous",
    eventType: "access_request_started",
    description: "Buyer clicks request access on a marketplace signal card.",
    allowedProperties: ["page", "signal_id", "signal_title", "category", "request_type", "lead_score"],
  },
  {
    name: "access_request_submitted",
    stream: "vercel_anonymous",
    eventType: "access_request_submitted",
    description: "Buyer submits a marketplace access request without personal identifiers.",
    allowedProperties: ["page", "listing_id", "category", "vertical", "lead_score", "request_type", "persisted"],
  },
  {
    name: "watchlist_added",
    stream: "vercel_anonymous",
    eventType: "watchlist_added",
    description: "Buyer adds a listing to the local marketplace watchlist.",
    allowedProperties: ["page", "listing_id", "category", "vertical", "lead_score"],
  },
  {
    name: "lead_profile_tab_click",
    stream: "vercel_anonymous",
    eventType: "lead_profile_tab_click",
    description: "Buyer changes a public lead profile detail tab.",
    allowedProperties: ["page", "signal_id", "category", "lead_score", "tab"],
  },
  {
    name: "lead_profile_cta_click",
    stream: "vercel_anonymous",
    eventType: "lead_profile_cta_click",
    description: "Buyer clicks a public lead profile CTA without personal identifiers.",
    allowedProperties: ["page", "signal_id", "category", "lead_score", "cta"],
  },
  {
    name: "lead_profile_admin_action_click",
    stream: "vercel_anonymous",
    eventType: "lead_profile_admin_action_click",
    description: "Admin opens an action route from a lead profile without sending raw lead data.",
    allowedProperties: ["page", "signal_id", "category", "lead_score", "admin_action"],
  },
  {
    name: "lead_profile_viewed",
    stream: "vercel_anonymous",
    eventType: "lead_profile_viewed",
    description: "Approved buyer or admin views a protected profile without sending raw profile fields to Vercel.",
    allowedProperties: ["page", "signal_id", "category", "lead_score", "role"],
  },
  {
    name: "lead_profile_tab_clicked",
    stream: "vercel_anonymous",
    eventType: "lead_profile_tab_clicked",
    description: "Approved viewer changes a protected lead profile tab.",
    allowedProperties: ["page", "signal_id", "category", "lead_score", "tab"],
  },
  {
    name: "lead_profile_watchlisted",
    stream: "vercel_anonymous",
    eventType: "lead_profile_watchlisted",
    description: "Buyer saves an entitled lead profile to their watchlist.",
    allowedProperties: ["page", "signal_id", "category", "lead_score", "action", "role"],
  },
  {
    name: "lead_profile_issue_reported",
    stream: "vercel_anonymous",
    eventType: "lead_profile_issue_reported",
    description: "Buyer reports an issue or clarification request from a protected profile.",
    allowedProperties: ["page", "signal_id", "category", "lead_score", "action", "role"],
  },
  {
    name: "lead_profile_exported",
    stream: "vercel_anonymous",
    eventType: "lead_profile_exported",
    description: "Approved viewer requests an audited protected profile export.",
    allowedProperties: ["page", "signal_id", "category", "lead_score", "action", "role"],
  },
  {
    name: "lead_profile_contact_marked",
    stream: "vercel_anonymous",
    eventType: "lead_profile_contact_marked",
    description: "Buyer marks an entitled lead profile contacted without sending contact details.",
    allowedProperties: ["page", "signal_id", "category", "lead_score", "action", "role"],
  },
  {
    name: "admin_profile_approved",
    stream: "vercel_anonymous",
    eventType: "admin_profile_approved",
    description: "Admin approves a protected lead profile without sending raw profile data.",
    allowedProperties: ["page", "signal_id", "category", "lead_score", "action", "role"],
  },
  {
    name: "admin_profile_suppressed",
    stream: "vercel_anonymous",
    eventType: "admin_profile_suppressed",
    description: "Admin suppresses a protected lead profile without sending raw profile data.",
    allowedProperties: ["page", "signal_id", "category", "lead_score", "action", "role"],
  },
  {
    name: "admin_profile_rejected",
    stream: "vercel_anonymous",
    eventType: "admin_profile_rejected",
    description: "Admin rejects a protected lead profile without sending raw profile data.",
    allowedProperties: ["page", "signal_id", "category", "lead_score", "action", "role"],
  },
  {
    name: "admin_profile_needs_review",
    stream: "vercel_anonymous",
    eventType: "admin_profile_needs_review",
    description: "Admin marks a protected lead profile as needing review.",
    allowedProperties: ["page", "signal_id", "category", "lead_score", "action", "role"],
  },
  {
    name: "admin_profile_source_proof_added",
    stream: "vercel_anonymous",
    eventType: "admin_profile_source_proof_added",
    description: "Admin starts adding source proof to a protected profile.",
    allowedProperties: ["page", "signal_id", "category", "lead_score", "action", "role"],
  },
  {
    name: "admin_profile_score_updated",
    stream: "vercel_anonymous",
    eventType: "admin_profile_score_updated",
    description: "Admin starts updating the score for a protected profile.",
    allowedProperties: ["page", "signal_id", "category", "lead_score", "action", "role"],
  },
  {
    name: "admin_profile_tag_added",
    stream: "vercel_anonymous",
    eventType: "admin_profile_tag_added",
    description: "Admin starts adding a tag to a protected profile.",
    allowedProperties: ["page", "signal_id", "category", "lead_score", "action", "role"],
  },
  {
    name: "admin_profile_suppression_resolved",
    stream: "vercel_anonymous",
    eventType: "admin_profile_suppression_resolved",
    description: "Admin resolves suppression status on a protected profile.",
    allowedProperties: ["page", "signal_id", "category", "lead_score", "action", "role"],
  },
  {
    name: "admin_profile_access_granted",
    stream: "vercel_anonymous",
    eventType: "admin_profile_access_granted",
    description: "Admin starts granting buyer access to a protected profile.",
    allowedProperties: ["page", "signal_id", "category", "lead_score", "action", "role"],
  },
  {
    name: "admin_profile_access_removed",
    stream: "vercel_anonymous",
    eventType: "admin_profile_access_removed",
    description: "Admin starts removing buyer access to a protected profile.",
    allowedProperties: ["page", "signal_id", "category", "lead_score", "action", "role"],
  },
  {
    name: "source_submission_started",
    stream: "vercel_anonymous",
    eventType: "source_submission_started",
    description: "Visitor starts the structured source submission flow without personal identifiers.",
    allowedProperties: ["page", "step_index", "step_name", "source_type", "risk_level"],
  },
  {
    name: "source_submission_step_completed",
    stream: "vercel_anonymous",
    eventType: "source_submission_step_completed",
    description: "Visitor completes a source submission step without raw sample text or contributor contact fields.",
    allowedProperties: ["page", "step_index", "step_name", "source_type", "risk_level"],
  },
  {
    name: "source_file_uploaded",
    stream: "vercel_anonymous",
    eventType: "source_file_uploaded",
    description: "Visitor attaches a sample file. Only file type and size bucket are tracked anonymously.",
    allowedProperties: ["page", "source_type", "file_type", "file_size_bucket", "risk_level", "storage_status"],
  },
  {
    name: "source_submission_completed",
    stream: "vercel_anonymous",
    eventType: "source_submission_completed",
    description: "Source submission completes without contributor contact fields, raw sample data, or source URLs.",
    allowedProperties: ["page", "source_type", "vertical", "risk_level", "review_status", "persisted"],
  },
  {
    name: "source_submission_flagged",
    stream: "vercel_anonymous",
    eventType: "source_submission_flagged",
    description: "Source submission receives automatic review flags without exposing the raw source.",
    allowedProperties: ["page", "source_type", "risk_level", "flag_count"],
  },
  {
    name: "admin_source_reviewed",
    stream: "vercel_anonymous",
    eventType: "admin_source_reviewed",
    description: "Admin reviews, converts, rejects, suppresses, or marks a source submission without source content.",
    allowedProperties: ["page", "action", "risk_level", "source_type"],
  },
  {
    name: "tool_card_clicked",
    stream: "vercel_anonymous",
    eventType: "tool_card_clicked",
    description: "Visitor starts a public tool card without sending answer text to analytics.",
    allowedProperties: ["page", "tool_id", "tool_name", "lead_category"],
  },
  {
    name: "questionnaire_step_completed",
    stream: "vercel_anonymous",
    eventType: "questionnaire_step_completed",
    description: "Visitor submits a public tool signal form without raw answer text.",
    allowedProperties: ["page", "tool_id", "tool_name", "lead_category", "urgency"],
  },
  {
    name: "questionnaire_completed",
    stream: "vercel_anonymous",
    eventType: "questionnaire_completed",
    description: "Public tool signal saves successfully without personal identifiers.",
    allowedProperties: ["page", "tool_id", "tool_name", "lead_category", "lead_score"],
  },
  {
    name: "questionnaire_error",
    stream: "vercel_anonymous",
    eventType: "questionnaire_error",
    description: "Public tool signal save failed without raw answer text.",
    allowedProperties: ["page", "tool_id", "tool_name", "lead_category"],
  },
  {
    name: "buyer_signup_started",
    stream: "vercel_anonymous",
    eventType: "buyer_signup_started",
    description: "Buyer starts account creation or magic-link login without personal identifiers.",
    allowedProperties: ["page", "method"],
  },
  {
    name: "buyer_signup_completed",
    stream: "vercel_anonymous",
    eventType: "buyer_signup_completed",
    description: "Buyer account creation completes without personal identifiers.",
    allowedProperties: ["page", "method"],
  },
  {
    name: "buyer_login_completed",
    stream: "vercel_anonymous",
    eventType: "buyer_login_completed",
    description: "Buyer login completes without sending identity fields to Vercel.",
    allowedProperties: ["page", "method"],
  },
  {
    name: "buyer_profile_updated",
    stream: "vercel_anonymous",
    eventType: "buyer_profile_updated",
    description: "Buyer saves profile review fields without names, emails, phone numbers, or raw use-case text.",
    allowedProperties: ["page", "buyer_type", "industry", "budget_range", "communication_preference"],
  },
  {
    name: "buyer_request_submitted",
    stream: "supabase_identified",
    eventType: "buyer_request_submitted",
    description: "Authenticated buyer submits a sample or access request for admin review.",
    allowedProperties: ["buyer_account_id", "buyer_request_id", "listing_slug", "request_type"],
  },
  {
    name: "buyer_watchlist_opened",
    stream: "supabase_identified",
    eventType: "buyer_watchlist_opened",
    description: "Authenticated buyer opens or saves buyer watchlist activity.",
    allowedProperties: ["buyer_account_id", "listing_slug", "watchlist_count"],
  },
  {
    name: "buyer_entitlement_viewed",
    stream: "supabase_identified",
    eventType: "buyer_entitlement_viewed",
    description: "Authenticated buyer views entitlement-backed approved access summaries.",
    allowedProperties: ["buyer_account_id", "entitlement_count", "raw_records_returned"],
  },
  {
    name: "lead_reviewed",
    stream: "supabase_identified",
    eventType: "lead_reviewed",
    description: "Authorized partner/admin reviews a lead inside the application.",
    allowedProperties: ["partner_account_id", "actor_user_id", "profile_id", "identity_id", "review_stage", "score_band"],
  },
  {
    name: "lead_exported",
    stream: "supabase_identified",
    eventType: "lead_exported",
    description: "Authorized export of a consented lead or aggregate insight product.",
    allowedProperties: ["partner_account_id", "buyer_partner_account_id", "export_id", "export_type", "row_count", "entitlement_ids"],
  },
  {
    name: "delete_request_submitted",
    stream: "supabase_identified",
    eventType: "delete_request_submitted",
    description: "Consumer submits a deletion/privacy request.",
    allowedProperties: ["partner_account_id", "identity_id", "dsar_request_id", "request_type", "verification_status"],
  },
  {
    name: "admt_opt_out_submitted",
    stream: "supabase_identified",
    eventType: "admt_opt_out_submitted",
    description: "Consumer submits an ADMT opt-out request.",
    allowedProperties: ["partner_account_id", "identity_id", "dsar_request_id", "scope", "verification_status"],
  },
] as const satisfies readonly LeadFlowEventDefinition[];

export type LeadFlowEventName = (typeof LEADFLOW_EVENT_TAXONOMY)[number]["name"];

const ANONYMOUS_VERCEL_EVENT_NAMES: Set<string> = new Set(
  LEADFLOW_EVENT_TAXONOMY.filter((event) => event.stream === "vercel_anonymous").map((event) => event.name),
);

const ALLOWED_QUERY_KEYS = new Set([
  "ref",
  "source",
  "utm_source",
  "utm_medium",
  "utm_campaign",
  "utm_content",
  "utm_term",
]);

const PRESENCE_ONLY_QUERY_KEYS = new Set(["lf_share"]);

const SENSITIVE_QUERY_KEYS = [
  "access_token",
  "auth",
  "code",
  "email",
  "jwt",
  "key",
  "name",
  "order",
  "order_id",
  "phone",
  "secret",
  "session",
  "signature",
  "stripe_session_id",
  "token",
  "user",
  "user_id",
];

const SENSITIVE_ROUTE_PREFIXES = [
  "/admin",
  "/api",
  "/dashboard",
  "/login",
  "/onboarding",
  "/profile",
  "/signup",
];

const TOKEN_LIKE_SEGMENT = /(?:[a-f0-9]{24,}|[a-z0-9_-]{28,})/i;
const EMAIL_LIKE = /[a-z0-9._%+-]+@[a-z0-9.-]+\.[a-z]{2,}/i;
const PHONE_LIKE = /\+?\d[\d().\-\s]{7,}\d/;

function cleanScalar(value: unknown, maxLength = 80) {
  if (typeof value === "number" && Number.isFinite(value)) return value;
  if (typeof value === "boolean") return value;
  if (typeof value !== "string") return undefined;

  const cleaned = value
    .replace(EMAIL_LIKE, "[redacted_email]")
    .replace(PHONE_LIKE, "[redacted_phone]")
    .replace(/\s+/g, " ")
    .trim()
    .slice(0, maxLength);

  return cleaned || undefined;
}

function sanitizePathSegment(segment: string) {
  const decoded = decodeURIComponent(segment);
  if (TOKEN_LIKE_SEGMENT.test(decoded) || EMAIL_LIKE.test(decoded) || PHONE_LIKE.test(decoded)) {
    return "[redacted]";
  }

  return decoded.replace(/[^a-zA-Z0-9._~:-]/g, "").slice(0, 64) || "[redacted]";
}

export function sanitizeAnalyticsPath(pathname: string) {
  if (!pathname || pathname === "/") return "/";

  const normalized = pathname.startsWith("/") ? pathname : `/${pathname}`;
  if (SENSITIVE_ROUTE_PREFIXES.some((prefix) => normalized === prefix || normalized.startsWith(`${prefix}/`))) {
    return normalized.split("/").slice(0, 2).join("/") || "/";
  }

  return normalized
    .split("/")
    .map((segment, index) => (index === 0 ? "" : sanitizePathSegment(segment)))
    .join("/")
    .slice(0, 240);
}

export function sanitizeAnalyticsQuery(query: string | URLSearchParams | null | undefined) {
  const params = query instanceof URLSearchParams ? query : new URLSearchParams((query || "").replace(/^\?/, ""));
  const safe = new URLSearchParams();

  for (const [key, rawValue] of params.entries()) {
    const normalizedKey = key.toLowerCase();
    if (SENSITIVE_QUERY_KEYS.some((sensitive) => normalizedKey.includes(sensitive))) continue;

    if (PRESENCE_ONLY_QUERY_KEYS.has(normalizedKey)) {
      safe.set(normalizedKey, "1");
      continue;
    }

    if (!ALLOWED_QUERY_KEYS.has(normalizedKey)) continue;
    const value = cleanScalar(rawValue, 60);
    if (typeof value === "string") safe.set(normalizedKey, value);
  }

  return safe.toString();
}

export function sanitizeAnalyticsUrl(input: string) {
  try {
    const url = new URL(input, "https://www.theleadflowpro.com");
    const query = sanitizeAnalyticsQuery(url.searchParams);
    const path = sanitizeAnalyticsPath(url.pathname);
    return `${url.origin}${path}${query ? `?${query}` : ""}`;
  } catch {
    return "https://www.theleadflowpro.com/";
  }
}

export function isAnonymousVercelEventName(value: unknown): value is LeadFlowEventName {
  return typeof value === "string" && ANONYMOUS_VERCEL_EVENT_NAMES.has(value);
}

export function sanitizeVercelEventProperties(properties: Record<string, unknown>) {
  const safe: Record<string, string | number | boolean> = {};

  for (const [key, value] of Object.entries(properties)) {
    const normalizedKey = key.toLowerCase();
    if (SENSITIVE_QUERY_KEYS.some((sensitive) => normalizedKey.includes(sensitive))) continue;
    if (/answer|email|name|phone|text|token|url/.test(normalizedKey)) continue;

    const cleaned = cleanScalar(value, 90);
    if (cleaned !== undefined) safe[key.slice(0, 48)] = cleaned;
  }

  return safe;
}

export function leadFlowAnalyticsBeforeSend(event: BeforeSendEvent): BeforeSendEvent | null {
  const redactedUrl = sanitizeAnalyticsUrl(event.url);

  if (redactedUrl.includes("/admin") || redactedUrl.includes("/api")) {
    return null;
  }

  return {
    ...event,
    url: redactedUrl,
  };
}

export type VercelDrainRecord = {
  schema?: string;
  eventType?: string;
  eventName?: string;
  eventData?: string;
  timestamp?: number;
  projectId?: string;
  ownerId?: string;
  sessionId?: number;
  deviceId?: number;
  origin?: string;
  path?: string;
  referrer?: string;
  queryParams?: string;
  route?: string;
  country?: string;
  region?: string;
  city?: string;
  osName?: string;
  clientName?: string;
  clientType?: string;
  deviceType?: string;
  vercelEnvironment?: string;
  deployment?: string;
};

function parseEventData(value: unknown) {
  if (typeof value !== "string") return {};

  try {
    const parsed = JSON.parse(value);
    if (!parsed || typeof parsed !== "object" || Array.isArray(parsed)) return {};
    return sanitizeVercelEventProperties(parsed as Record<string, unknown>);
  } catch {
    return {};
  }
}

export function sanitizeVercelDrainRecord(record: VercelDrainRecord) {
  const eventName = isAnonymousVercelEventName(record.eventName) ? record.eventName : record.eventName ? "noncanonical_event" : undefined;
  const queryParams = sanitizeAnalyticsQuery(record.queryParams);

  return {
    schema: record.schema === "vercel.analytics.v2" ? record.schema : "unknown",
    eventType: record.eventType === "pageview" || record.eventType === "event" ? record.eventType : "unknown",
    eventName,
    eventData: eventName ? parseEventData(record.eventData) : {},
    timestamp: typeof record.timestamp === "number" ? record.timestamp : undefined,
    projectId: cleanScalar(record.projectId, 80),
    ownerId: cleanScalar(record.ownerId, 80),
    sessionId: typeof record.sessionId === "number" ? record.sessionId : undefined,
    deviceId: typeof record.deviceId === "number" ? record.deviceId : undefined,
    origin: cleanScalar(record.origin, 120),
    path: sanitizeAnalyticsPath(record.path || "/"),
    route: sanitizeAnalyticsPath(record.route || record.path || "/"),
    referrer: record.referrer ? sanitizeAnalyticsUrl(record.referrer) : undefined,
    queryParams: queryParams || undefined,
    country: cleanScalar(record.country, 3),
    region: cleanScalar(record.region, 12),
    city: cleanScalar(record.city, 60),
    osName: cleanScalar(record.osName, 40),
    clientName: cleanScalar(record.clientName, 40),
    clientType: cleanScalar(record.clientType, 40),
    deviceType: cleanScalar(record.deviceType, 40),
    vercelEnvironment: cleanScalar(record.vercelEnvironment, 40),
    deployment: cleanScalar(record.deployment, 80),
  };
}
