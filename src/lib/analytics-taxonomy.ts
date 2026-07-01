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
    name: "lf_consent_accepted",
    stream: "vercel_anonymous",
    eventType: "consent_accepted",
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
