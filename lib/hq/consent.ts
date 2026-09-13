import { hqSecrets, signPayload, verifyPayload } from "./crypto";

// The consent form's proof that the person who approved is the person who
// saw the page: an HMAC over the signed-in user, the client, the redirect,
// the PKCE challenge, and the scope, with a ten minute expiry.

export type ConsentBinding = { userId: string; clientId: string; redirectUri: string; codeChallenge: string; scope: string };

const TTL_MS = 10 * 60_000;

function payload(b: ConsentBinding, exp: number): string {
  return [b.userId, b.clientId, b.redirectUri, b.codeChallenge, b.scope, String(exp)].join("\n");
}

export function consentNonce(b: ConsentBinding, now = Date.now(), secrets = hqSecrets()): string {
  const exp = now + TTL_MS;
  if (secrets.length === 0) throw new Error("No signing secret is configured");
  return `${exp}.${signPayload(payload(b, exp), secrets[0])}`;
}

export function verifyConsentNonce(nonce: string, b: ConsentBinding, now = Date.now(), secrets = hqSecrets()): boolean {
  const dot = nonce.indexOf(".");
  if (dot <= 0) return false;
  const exp = Number(nonce.slice(0, dot));
  const sig = nonce.slice(dot + 1);
  if (!Number.isFinite(exp) || exp < now || exp > now + TTL_MS + 60_000) return false;
  return verifyPayload(payload(b, exp), sig, secrets);
}

/** The site whose subdomains count as our own for a same-site post. */
const SITE_HOST = "theleadflowpro.com";

/**
 * Does this approval POST clearly come from another site?
 *
 * Browsers say so in two ways. Sec-Fetch-Site is the one every current
 * browser sends and referrer policy does not touch it. Origin is older, and
 * under this site's no-referrer policy a same-origin form post carries the
 * literal "Origin: null" (a fetch() from the same page does not), so "null"
 * proves nothing either way, and a missing header is an old browser, not an
 * attack. The nonce in the form is the real proof that the person who
 * approved is the person who saw the page; this only turns away a request
 * the browser itself has labelled foreign.
 *
 * `own` is the origin the request arrived at (so a preview deployment and
 * local dev accept their own form), `trusted` the production origins.
 */
export function crossSiteApproval(headers: Pick<Headers, "get">, opts: { own: string; trusted?: string[] }): boolean {
  const fetchSite = (headers.get("sec-fetch-site") ?? "").trim().toLowerCase();
  if (fetchSite === "same-origin" || fetchSite === "none") return false;
  if (fetchSite === "cross-site") return true;
  if (fetchSite === "same-site") {
    const host = safeHost(opts.own);
    return !(host === SITE_HOST || host.endsWith(`.${SITE_HOST}`));
  }
  // No usable Sec-Fetch-Site: fall back to Origin, which only decides when
  // it names a real origin.
  const origin = (headers.get("origin") ?? "").trim().toLowerCase();
  if (!origin || origin === "null") return false;
  if (/^http:\/\/localhost(:\d+)?$/.test(origin)) return false;
  const allowed = new Set([opts.own, ...(opts.trusted ?? [])].map((o) => o.toLowerCase()));
  return !allowed.has(origin);
}

function safeHost(origin: string): string {
  try {
    return new URL(origin).hostname.toLowerCase();
  } catch {
    return "";
  }
}
