const BASE = "https://www.theleadflowpro.com";
const PRIVATE_PATH = /^\/(?:admin|dashboard|login|logout|auth|training|api|sales|account|settings|workspace|portal)(?:\/|$)/i;
const PRIVATE_EVENT = /^\/events\/[^/]+\/confirmed(?:\/|$)/i;
const CREDENTIAL_KEY = /^(?:t|.*token.*|.*secret.*|.*password.*|.*signature.*|session|session_id|checkout_session_id|code|email|email_address|authorization|key)$/i;

function parseUrl(value: string): URL | null {
  try {
    const url = new URL(value, BASE);
    return ["https:", "http:"].includes(url.protocol) && !url.username && !url.password ? url : null;
  } catch {
    return null;
  }
}

function isLocalAnalyticsHost(hostname: string): boolean {
  const host = hostname.toLowerCase().replace(/^\[|\]$/g, "").replace(/\.$/, "");
  if (host === "localhost" || host.endsWith(".localhost") || host.endsWith(".local")) return true;
  if (host === "::" || host === "::1" || /^(?:f[cd][0-9a-f]{2}|fe[89ab][0-9a-f]):/.test(host)) return true;
  // IPv4-mapped IPv6 literals are development/network addresses for this site.
  if (host.startsWith("::ffff:")) return true;
  if (!/^\d+\.\d+\.\d+\.\d+$/.test(host)) return false;
  const [first, second] = host.split(".").map(Number);
  return first === 0 || first === 10 || first === 127 ||
    (first === 169 && second === 254) || (first === 172 && second >= 16 && second <= 31) ||
    (first === 192 && second === 168) || (first === 100 && second >= 64 && second <= 127);
}

/** A capability URL is an access credential, regardless of the route name. */
export function isPublicAnalyticsUrl(value: string): boolean {
  const url = parseUrl(value);
  if (!url || isLocalAnalyticsHost(url.hostname)) return false;
  const path = decodeURIComponentSafely(url.pathname);
  if (PRIVATE_PATH.test(path) || PRIVATE_EVENT.test(path)) return false;
  if (/(?:^|\/)(?:cs_(?:live|test)_[^/]+|[a-f0-9]{32,}|eyJ[^/]{20,})(?:\/|$)/i.test(path)) return false;
  if (path.includes("@")) return false;
  for (const key of url.searchParams.keys()) if (CREDENTIAL_KEY.test(key)) return false;
  const hash = new URLSearchParams(url.hash.replace(/^#/, ""));
  for (const key of hash.keys()) if (CREDENTIAL_KEY.test(key)) return false;
  return true;
}

function decodeURIComponentSafely(value: string): string {
  try { return decodeURIComponent(value); } catch { return value; }
}

/** Query strings and fragments never enter an analytics payload. */
export function safeAnalyticsUrl(value: string): string | undefined {
  if (!isPublicAnalyticsUrl(value)) return undefined;
  const url = parseUrl(value)!;
  return `${url.origin}${url.pathname}`;
}

export function safeAnalyticsPath(value: string): string | undefined {
  const clean = safeAnalyticsUrl(value);
  return clean ? new URL(clean).pathname : undefined;
}

export function safeAnalyticsReferrer(value: string): string | undefined {
  return value ? safeAnalyticsUrl(value) : undefined;
}

/**
 * Vendor SDKs can read document.referrer internally and do not all expose a
 * referrer filter. Do not load/send them for a document with a query-bearing
 * or private referrer. Our own tracker can instead sanitize its payload.
 */
export function thirdPartyAnalyticsAllowed(location: string, referrer = ""): boolean {
  if (!isPublicAnalyticsUrl(location)) return false;
  if (!referrer) return true;
  const from = parseUrl(referrer);
  return Boolean(from && !from.search && !from.hash && isPublicAnalyticsUrl(referrer));
}

export function filterVendorAnalyticsEvent<T extends { url: string }>(
  event: T,
  location: string,
  referrer = "",
): T | null {
  if (!thirdPartyAnalyticsAllowed(location, referrer)) return null;
  const url = safeAnalyticsUrl(event.url);
  return url ? { ...event, url } : null;
}
