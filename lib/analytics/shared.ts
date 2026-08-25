// Shared analytics logic used by the client tracker, the /api/track route,
// and both dashboards. Pure functions only — everything here is unit-tested
// in tests/analytics.test.ts.

/** Canonical first-party event names. Only these are accepted server-side. */
export const EVENT_NAMES = [
  "page_view",
  "session_start",
  "engaged_session",
  "page_engagement",
  "scroll_depth",
  "navigation_click",
  "cta_click",
  "outbound_click",
  "phone_click",
  "sms_click",
  "email_click",
  "form_view",
  "form_start",
  "form_submit",
  "booking_start",
  "booking_complete",
  "registration_start",
  "registration_complete",
  "checkout_start",
  "payment_complete",
  "tool_view",
  "tool_card_open",
  "tool_start",
  "tool_complete",
  "tool_action",
  "download",
  "lead_created",
] as const;

export type EventName = (typeof EVENT_NAMES)[number];

const EVENT_NAME_SET = new Set<string>(EVENT_NAMES);

/** Meta keys that must never ride along on an analytics event. */
const BLOCKED_META_KEYS = [
  "email", "phone", "name", "first_name", "last_name", "full_name",
  "address", "street", "message", "notes", "answer", "raw_answer",
  "value_text", "query_string", "password", "token", "ip", "ip_address",
  "user_id", "lead_id", "credit_card", "ssn", "dob",
];

const MAX_META_STRING = 120;
const MAX_META_KEYS = 12;

export type IncomingEvent = {
  client_id?: string;
  event_name: string;
  path?: string;
  page_title?: string;
  label?: string;
  target_host?: string;
  tool_slug?: string;
  referrer?: string;
  utm_source?: string;
  utm_medium?: string;
  utm_campaign?: string;
  utm_content?: string;
  visitor_id?: string;
  session_id?: string;
  visitor_type?: string;
  meta?: Record<string, string | number | boolean>;
};

/**
 * Strips blocked keys, non-scalar values, and oversized strings. Values that
 * merely LOOK like contact details (an @, a 10-digit run) are dropped too, so
 * a future caller cannot pipe a typed answer through an allowed key.
 */
export function sanitizeMeta(
  meta: Record<string, unknown> | undefined | null
): Record<string, string | number | boolean> {
  const out: Record<string, string | number | boolean> = {};
  if (!meta || typeof meta !== "object") return out;
  let kept = 0;
  for (const [key, value] of Object.entries(meta)) {
    if (kept >= MAX_META_KEYS) break;
    const k = key.toLowerCase().slice(0, 40);
    if (BLOCKED_META_KEYS.some((b) => k === b || k.includes(b))) continue;
    if (typeof value === "number" && Number.isFinite(value)) {
      out[k] = value;
      kept++;
    } else if (typeof value === "boolean") {
      out[k] = value;
      kept++;
    } else if (typeof value === "string") {
      const v = value.slice(0, MAX_META_STRING);
      if (v.includes("@")) continue; // email-shaped
      if (/\d[\d\s().-]{8,}\d/.test(v)) continue; // phone/card-shaped
      out[k] = v;
      kept++;
    }
  }
  return out;
}

const NAME_RE = /^[a-z][a-z0-9_]{1,63}$/;

/**
 * Validates and normalizes one incoming event. Returns null when the event
 * must be dropped rather than stored.
 */
export function validateEvent(raw: unknown): IncomingEvent | null {
  if (!raw || typeof raw !== "object") return null;
  const e = raw as Record<string, unknown>;
  const name = typeof e.event_name === "string" ? e.event_name : "";
  if (!EVENT_NAME_SET.has(name) || !NAME_RE.test(name)) return null;

  const str = (v: unknown, max: number): string | undefined => {
    if (typeof v !== "string") return undefined;
    const s = v.trim();
    return s ? s.slice(0, max) : undefined;
  };

  let path = str(e.path, 300) ?? "/";
  if (!path.startsWith("/")) path = "/";
  // Query strings can carry emails and tokens; keep the pathname only.
  path = path.split("?")[0].split("#")[0] || "/";
  if (/(email|token|password|secret|credit|ssn)/i.test(path)) return null;

  const visitorType = str(e.visitor_type, 12);
  return {
    client_id:
      typeof e.client_id === "string" && /^[0-9a-f-]{36}$/i.test(e.client_id)
        ? e.client_id
        : undefined,
    event_name: name,
    path,
    page_title: str(e.page_title, 200),
    label: str(e.label, 120),
    target_host: str(e.target_host, 120)?.toLowerCase(),
    tool_slug: str(e.tool_slug, 80),
    referrer: str(e.referrer, 500),
    utm_source: str(e.utm_source, 100),
    utm_medium: str(e.utm_medium, 100),
    utm_campaign: str(e.utm_campaign, 100),
    utm_content: str(e.utm_content, 100),
    visitor_id: str(e.visitor_id, 100),
    session_id: str(e.session_id, 100),
    visitor_type:
      visitorType === "new" || visitorType === "returning" ? visitorType : undefined,
    meta: sanitizeMeta(e.meta as Record<string, unknown>),
  };
}

/** Mirrors public.analytics_source_family in the database. */
export function classifySourceFamily(
  utmSource: string | null | undefined,
  utmMedium: string | null | undefined,
  referrerHost: string | null | undefined
): string {
  const medium = (utmMedium ?? "").toLowerCase();
  const source = (utmSource ?? "").toLowerCase();
  const host = (referrerHost ?? "").toLowerCase();

  if (medium.includes("paid") || ["cpc", "ppc", "cpm", "ads"].includes(medium)) return "paid";
  if (source) {
    if (source.includes("facebook") || source.startsWith("fb")) return "facebook";
    if (source.includes("instagram") || source.startsWith("ig")) return "instagram";
    if (source.includes("tiktok")) return "tiktok";
    if (source.includes("linkedin")) return "linkedin";
    if (source.includes("youtube")) return "youtube";
    if (source === "x" || source === "twitter" || source.includes("twitter")) return "x";
    if (source.includes("google")) return "google";
    if (source.includes("email") || medium === "email") return "email";
    return "campaign";
  }
  if (!host) return "direct";
  if (host.includes("google.")) return "google";
  if (
    host.includes("bing.") || host.includes("duckduckgo.") ||
    host.includes("yahoo.") || host.includes("ecosia.") || host.includes("brave.")
  ) return "search_other";
  if (host.includes("facebook.") || host.includes("fb.")) return "facebook";
  if (host.includes("instagram.")) return "instagram";
  if (host === "t.co" || host.includes("twitter.") || host === "x.com" || host.endsWith(".x.com")) return "x";
  if (host.includes("linkedin.") || host === "lnkd.in") return "linkedin";
  if (host.includes("youtube.") || host === "youtu.be") return "youtube";
  if (host.includes("tiktok.")) return "tiktok";
  if (host.endsWith("theleadflowpro.com")) return "internal";
  return "referral";
}

export function referrerHostOf(referrer: string | null | undefined): string | null {
  if (!referrer) return null;
  try {
    return new URL(referrer).hostname.toLowerCase() || null;
  } catch {
    return null;
  }
}

const BOT_RE =
  /bot|crawl|spider|slurp|bingpreview|facebookexternalhit|headless|lighthouse|pingdom|pagespeed|gtmetrix|dataminr|semrush|ahrefs|mj12|petalbot|bytespider|python-requests|curl\/|wget\//i;

export function isBotUserAgent(ua: string | null | undefined): boolean {
  if (!ua || ua.length < 10) return true;
  return BOT_RE.test(ua);
}

export function deviceFromUserAgent(ua: string | null | undefined): "mobile" | "tablet" | "desktop" {
  const s = ua ?? "";
  if (/ipad|tablet|(android(?!.*mobile))/i.test(s)) return "tablet";
  if (/mobi|iphone|ipod|android/i.test(s)) return "mobile";
  return "desktop";
}

export function browserFromUserAgent(ua: string | null | undefined): string {
  const s = ua ?? "";
  if (/edg\//i.test(s)) return "edge";
  if (/opr\/|opera/i.test(s)) return "opera";
  if (/samsungbrowser/i.test(s)) return "samsung";
  if (/firefox\//i.test(s)) return "firefox";
  if (/chrome\/|crios\//i.test(s)) return "chrome";
  if (/safari\//i.test(s)) return "safari";
  return "other";
}

// ---------------------------------------------------------------------------
// Trend math. Direction semantics matter: a falling Google position number is
// GOOD, a rising abandonment rate is BAD. The caller declares which way "up"
// points for the metric and this returns the visual tone.
// ---------------------------------------------------------------------------

export type TrendDirection = "up_good" | "down_good" | "neutral";
export type TrendTone = "positive" | "negative" | "neutral";

export type Trend = {
  diff: number;
  pct: number | null; // null when the previous period had no data
  tone: TrendTone;
  arrow: "up" | "down" | "flat";
};

export function trend(
  current: number,
  previous: number,
  direction: TrendDirection = "up_good"
): Trend {
  const diff = current - previous;
  const pct = previous !== 0 ? diff / Math.abs(previous) : null;
  const arrow: Trend["arrow"] = diff > 0 ? "up" : diff < 0 ? "down" : "flat";
  let tone: TrendTone = "neutral";
  if (diff !== 0 && direction !== "neutral") {
    const improved = direction === "up_good" ? diff > 0 : diff < 0;
    tone = improved ? "positive" : "negative";
  }
  return { diff, pct, tone, arrow };
}

/**
 * Google position trend: position 3 beats position 8, so a NEGATIVE diff is
 * an improvement. Returns null when either period lacks data — never guess.
 */
export function positionTrend(
  current: number | null | undefined,
  previous: number | null | undefined
): Trend | null {
  if (
    current == null || previous == null ||
    !Number.isFinite(current) || !Number.isFinite(previous)
  ) {
    return null;
  }
  return trend(current, previous, "down_good");
}

// ---------------------------------------------------------------------------
// Public feed presentation. Turns a sanitized feed row into a human sentence
// with zero identifying detail.
// ---------------------------------------------------------------------------

export type PublicFeedItem = {
  at: string;
  kind: string;
  path?: string | null;
  tool?: string | null;
  device?: string | null;
  source?: string | null;
};

const PAGE_LABELS: Array<[RegExp, string]> = [
  [/^\/$/, "the homepage"],
  [/^\/tools\/collections/, "a tool collection"],
  [/^\/tools\/[^/]+/, "a free business tool"],
  [/^\/tools$/, "the free tools directory"],
  [/^\/free-build/, "the Free Build offer"],
  [/^\/pricing/, "the packages page"],
  [/^\/start/, "the Map My Company flow"],
  [/^\/book/, "the booking page"],
  [/^\/contact/, "the contact page"],
  [/^\/about/, "the About Ryan page"],
  [/^\/portfolio/, "the portfolio"],
  [/^\/articles/, "an article"],
  [/^\/system/, "a system stage page"],
  [/^\/events/, "the events page"],
  [/^\/live/, "the live dashboard"],
  [/^\/showcase/, "the showcase"],
  [/^\/packages/, "a package page"],
  [/^\/add-ons/, "the add-ons menu"],
];

export function publicPageLabel(path: string | null | undefined): string {
  if (!path) return "the site";
  for (const [re, label] of PAGE_LABELS) {
    if (re.test(path)) return label;
  }
  return "the site";
}

const SOURCE_LABELS: Record<string, string> = {
  google: "Google",
  search_other: "a search engine",
  facebook: "Facebook",
  instagram: "Instagram",
  x: "X",
  linkedin: "LinkedIn",
  youtube: "YouTube",
  tiktok: "TikTok",
  email: "email",
  paid: "a paid campaign",
  campaign: "a campaign link",
};

export function publicFeedSentence(item: PublicFeedItem): string {
  const page = publicPageLabel(item.path);
  switch (item.kind) {
    case "tool_view":
      return "A visitor opened a free business tool";
    case "tool_start":
      return "A visitor started using a business tool";
    case "tool_complete":
      return "A visitor completed a business tool";
    case "cta_click":
      return `A visitor took action on ${page}`;
    case "form_start":
      return "A visitor started a contact form";
    case "form_submit":
      return "A visitor sent a message through the system";
    case "booking_start":
      return "A visitor opened the consultation calendar";
    case "booking_complete":
      return "A consultation was booked";
    case "phone_click":
      return "A visitor clicked to call";
    case "sms_click":
      return "A visitor clicked to text";
    case "email_click":
      return "A visitor clicked to email";
    case "session_start": {
      const src = item.source ? SOURCE_LABELS[item.source] : undefined;
      return src ? `A visitor arrived from ${src}` : "A new visitor arrived";
    }
    default:
      return `Activity on ${page}`;
  }
}

/** Compact relative time for feeds: 42s, 7m, 3h, 2d. */
export function relativeTime(iso: string, now: Date = new Date()): string {
  const then = new Date(iso).getTime();
  if (!Number.isFinite(then)) return "";
  const s = Math.max(0, Math.round((now.getTime() - then) / 1000));
  if (s < 60) return `${s}s ago`;
  const m = Math.round(s / 60);
  if (m < 60) return `${m}m ago`;
  const h = Math.round(m / 60);
  if (h < 24) return `${h}h ago`;
  return `${Math.round(h / 24)}d ago`;
}

/** Formats counts the dashboard way: 12, 1.2K, 30.5K, 1.1M. */
export function compactNumber(n: number | null | undefined): string {
  if (n == null || !Number.isFinite(n)) return "—";
  if (Math.abs(n) < 1000) return String(Math.round(n));
  if (Math.abs(n) < 1_000_000) return `${(n / 1000).toFixed(n % 1000 === 0 ? 0 : 1)}K`;
  return `${(n / 1_000_000).toFixed(1)}M`;
}
