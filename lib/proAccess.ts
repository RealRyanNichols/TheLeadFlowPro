// Who has unlocked which pro kits.
//
// A pro kit is mailbox money: somebody pays $19 through Stripe and the kit
// unlocks on the spot, with no account to create and nobody to fulfil it. That
// needs three things that all live here, pure and testable:
//
//   1. A signed access token. After Stripe reports the session paid, the claim
//      route writes an httpOnly cookie carrying the buyer's email and the kinds
//      they own. The cookie is an HMAC over that payload, so nobody can mint
//      one without the secret, and it reveals nothing useful if it leaks.
//   2. A license key. The same HMAC, over the email and the kind, folded into a
//      short LFP-XXXX-XXXX-XXXX-XXXX string that goes in the receipt email. It
//      restores access on any device by retyping it with the email. It is
//      derived, not stored, so there is no key table to lose.
//   3. The rule that decides what a paid Stripe session actually bought,
//      checked against the catalog price so a copied session id for a $10 kit
//      can never unlock a $29 one.
//
// Nothing here talks to a database. lib/proAccessServer.ts reads and writes
// the cookie; app/api/pro/* call these with real requests.

import crypto from "node:crypto";
import { PRO_BUNDLE, PRO_TOOL_KIND_PREFIX } from "./tools/pro";

export const PRO_ACCESS_COOKIE = "lfp_pro_access";
export const PRO_ACCESS_MAX_AGE = 60 * 60 * 24 * 365;

export type ProAccess = {
  v: 1;
  /** Buyer email, lowercased. */
  e: string;
  /** Kinds owned: pro_bundle and/or pro_tool:<slug>. */
  k: string[];
  /** Issued at, unix seconds. */
  t: number;
};

/* --------------------------------- secrets -------------------------------- */

/**
 * Every secret a token or key might have been signed with, newest first.
 * Signing uses the first; verifying accepts any. PRO_TOOLS_SECRET is the one
 * to set in Vercel; the fallbacks keep the feature working before it exists.
 */
export function proAccessSecrets(): string[] {
  const out: string[] = [];
  for (const raw of [
    process.env.PRO_TOOLS_SECRET,
    process.env.UNSUBSCRIBE_SECRET,
    process.env.SUPABASE_SERVICE_ROLE_KEY,
  ]) {
    const s = raw?.trim();
    if (s && !out.includes(s)) out.push(s);
  }
  return out;
}

/* ---------------------------------- kinds --------------------------------- */

export function isProKind(kind: string): boolean {
  return kind === PRO_BUNDLE.kind || kind.startsWith(PRO_TOOL_KIND_PREFIX);
}

export function proKindSlug(kind: string): string | null {
  if (!kind.startsWith(PRO_TOOL_KIND_PREFIX)) return null;
  const slug = kind.slice(PRO_TOOL_KIND_PREFIX.length);
  return /^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(slug) ? slug : null;
}

/** The bundle unlocks everything, including kits added after the purchase. */
export function hasProAccess(kinds: Iterable<string>, slug: string): boolean {
  for (const k of kinds) {
    if (k === PRO_BUNDLE.kind) return true;
    if (k === `${PRO_TOOL_KIND_PREFIX}${slug}`) return true;
  }
  return false;
}

export function normalizeEmail(email: unknown): string {
  return typeof email === "string" ? email.trim().toLowerCase().slice(0, 200) : "";
}

export function isPlausibleEmail(email: string): boolean {
  return email.length >= 3 && email.length <= 200 && /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
}

/* ---------------------------------- token --------------------------------- */

const b64url = (buf: Buffer) => buf.toString("base64url");

function hmac(secret: string, message: string): Buffer {
  return crypto.createHmac("sha256", secret).update(message).digest();
}

function timingEqual(a: Buffer, b: Buffer): boolean {
  return a.length === b.length && crypto.timingSafeEqual(a, b);
}

export function signProAccess(payload: ProAccess, secret: string): string {
  const body = b64url(Buffer.from(JSON.stringify(payload), "utf8"));
  const sig = b64url(hmac(secret, `access:${body}`));
  return `${body}.${sig}`;
}

/** The payload if the token was signed by any known secret, else null. */
export function verifyProAccess(token: string | undefined | null, secrets: string[]): ProAccess | null {
  if (!token || typeof token !== "string" || token.length > 4096) return null;
  const dot = token.indexOf(".");
  if (dot <= 0) return null;
  const body = token.slice(0, dot);
  const sig = token.slice(dot + 1);
  let received: Buffer;
  try {
    received = Buffer.from(sig, "base64url");
  } catch {
    return null;
  }
  const ok = secrets.some((s) => timingEqual(hmac(s, `access:${body}`), received));
  if (!ok) return null;
  try {
    const parsed = JSON.parse(Buffer.from(body, "base64url").toString("utf8")) as ProAccess;
    if (parsed?.v !== 1 || typeof parsed.e !== "string" || !Array.isArray(parsed.k)) return null;
    const kinds = parsed.k.filter((k): k is string => typeof k === "string" && isProKind(k));
    return { v: 1, e: normalizeEmail(parsed.e), k: [...new Set(kinds)], t: Number(parsed.t) || 0 };
  } catch {
    return null;
  }
}

/**
 * Fold a new purchase into whatever the cookie already held. A second kit
 * bought on the same phone adds to the list instead of replacing it. When the
 * email changes (a second buyer on a shared device) the newer email wins and
 * the older kinds stay, which is the harmless direction for that to fall.
 */
export function mergeProAccess(
  existing: ProAccess | null,
  email: string,
  kinds: string[],
  now: number = Math.floor(Date.now() / 1000),
): ProAccess {
  const merged = new Set<string>(existing?.k ?? []);
  for (const k of kinds) if (isProKind(k)) merged.add(k);
  return { v: 1, e: normalizeEmail(email) || existing?.e || "", k: [...merged], t: now };
}

/* ------------------------------- license key ------------------------------ */

/** Crockford-style alphabet: no 0/O or 1/I ambiguity when read off a phone. */
const KEY_ALPHABET = "ABCDEFGHJKMNPQRSTVWXYZ23456789";

/**
 * LFP-XXXX-XXXX-XXXX-XXXX. Derived from the secret, the email and the kind, so
 * the same purchase always produces the same key and nothing has to be stored.
 */
export function licenseKey(email: string, kind: string, secret: string): string {
  const digest = hmac(secret, `key:${normalizeEmail(email)}:${kind}`);
  let out = "";
  for (let i = 0; i < 16; i++) out += KEY_ALPHABET[digest[i] % KEY_ALPHABET.length];
  return `LFP-${out.slice(0, 4)}-${out.slice(4, 8)}-${out.slice(8, 12)}-${out.slice(12, 16)}`;
}

/** Whatever somebody typed, in the shape licenseKey() produces. */
export function normalizeLicenseKey(input: unknown): string {
  if (typeof input !== "string") return "";
  const raw = input.toUpperCase().replace(/[^A-Z0-9]/g, "");
  const body = raw.startsWith("LFP") ? raw.slice(3) : raw;
  if (body.length !== 16) return "";
  return `LFP-${body.slice(0, 4)}-${body.slice(4, 8)}-${body.slice(8, 12)}-${body.slice(12, 16)}`;
}

export function verifyLicenseKey(email: string, kind: string, key: string, secrets: string[]): boolean {
  const wanted = normalizeLicenseKey(key);
  if (!wanted) return false;
  const b = Buffer.from(wanted);
  return secrets.some((s) => timingEqual(Buffer.from(licenseKey(email, kind, s)), b));
}

/* ----------------------------- stripe sessions ---------------------------- */

export type ProCheckoutSession = {
  amount_total?: unknown;
  amount_subtotal?: unknown;
  metadata?: Record<string, unknown> | null;
};

export type ProCatalogLike = readonly { slug: string; priceUsd: number }[];

/**
 * The kind a paid session bought, or null when it is not a pro purchase.
 *
 * The amount is checked against the catalog (before any promotion code, then
 * after) so a session for the $10 kit can never claim the $29 one, and a stray
 * session with pro metadata but the wrong total is left alone for a human.
 */
export function proKindFromSession(
  session: ProCheckoutSession,
  catalog: ProCatalogLike,
  bundlePriceUsd: number = PRO_BUNDLE.priceUsd,
): string | null {
  const meta = session.metadata ?? {};
  const kind = typeof meta.kind === "string" ? meta.kind : "";
  const total = Number(session.amount_total);
  const subtotal = Number(session.amount_subtotal);
  const matches = (usd: number) => total === usd * 100 || subtotal === usd * 100;

  if (kind === PRO_BUNDLE.kind) {
    return matches(bundlePriceUsd) ? PRO_BUNDLE.kind : null;
  }
  if (kind === "pro_tool") {
    const slug = typeof meta.pro_slug === "string" ? meta.pro_slug : "";
    const entry = catalog.find((c) => c.slug === slug);
    if (!entry) return null;
    return matches(entry.priceUsd) ? `${PRO_TOOL_KIND_PREFIX}${slug}` : null;
  }
  return null;
}

/* ------------------------------- white label ------------------------------- */

/**
 * White-label embeds. A buyer of the embeds kit gets iframe URLs whose brand
 * payload is signed, so the public embed route can strip the LeadFlow credit
 * line and render their brand bar instead, and nobody can mint that URL
 * without having bought the kit.
 *
 * The payload is a base64url JSON object; the signature covers the payload
 * byte for byte, so editing the brand (or pointing the CTA somewhere new)
 * invalidates it. The whole thing lives in the URL, works on any site, and
 * expires never, which is the promise the kit makes.
 */

export type WhiteLabelBrand = {
  /** Business name shown in the bar. */
  n: string;
  /** Phone, digits only, rendered as a tel: link. */
  p?: string;
  /** Six digit hex accent for the bar. */
  c?: string;
  /** CTA button text. */
  t?: string;
  /** CTA link, http(s) only. */
  u?: string;
};

export function encodeWhiteLabelBrand(brand: WhiteLabelBrand): string {
  return Buffer.from(JSON.stringify(brand), "utf8").toString("base64url");
}

export function signWhiteLabel(payloadB64: string, secret: string): string {
  return crypto
    .createHmac("sha256", secret)
    .update(`wl:${payloadB64}`)
    .digest("base64url")
    .slice(0, 32);
}

/**
 * The brand if the payload is well formed AND the signature matches under any
 * known secret. Every field is revalidated here because the payload rides in
 * a public URL: a valid signature proves a buyer created it, not that the
 * content is safe to render, so the same strict rules apply either way.
 */
export function verifyWhiteLabel(
  payloadB64: string | undefined | null,
  signature: string | undefined | null,
  secrets: string[],
): WhiteLabelBrand | null {
  if (!payloadB64 || !signature) return null;
  if (typeof payloadB64 !== "string" || payloadB64.length > 2000) return null;
  if (typeof signature !== "string" || signature.length > 64) return null;

  const sigBuffer = Buffer.from(signature);
  const ok = secrets.some((s) => {
    const expected = Buffer.from(signWhiteLabel(payloadB64, s));
    return expected.length === sigBuffer.length && crypto.timingSafeEqual(expected, sigBuffer);
  });
  if (!ok) return null;

  let parsed: WhiteLabelBrand;
  try {
    parsed = JSON.parse(Buffer.from(payloadB64, "base64url").toString("utf8"));
  } catch {
    return null;
  }
  if (!parsed || typeof parsed !== "object") return null;

  const name = typeof parsed.n === "string" ? parsed.n.trim().slice(0, 80) : "";
  if (!name) return null;

  const digits = typeof parsed.p === "string" ? parsed.p.replace(/\D/g, "") : "";
  const phone = digits.length >= 10 && digits.length <= 15 ? digits : undefined;

  const color =
    typeof parsed.c === "string" && /^#[0-9a-fA-F]{6}$/.test(parsed.c) ? parsed.c : undefined;

  const ctaText = typeof parsed.t === "string" ? parsed.t.trim().slice(0, 48) : "";

  let ctaUrl: string | undefined;
  if (typeof parsed.u === "string" && parsed.u.trim()) {
    try {
      const url = new URL(parsed.u.trim());
      if (url.protocol === "http:" || url.protocol === "https:") ctaUrl = url.toString().slice(0, 300);
    } catch {
      /* an unusable CTA link just drops the button */
    }
  }

  return {
    n: name,
    ...(phone ? { p: phone } : {}),
    ...(color ? { c: color } : {}),
    ...(ctaText && ctaUrl ? { t: ctaText, u: ctaUrl } : {}),
  };
}

/**
 * The placeholder a kit's run() leaves where a signature belongs, since run()
 * is pure and holds no secrets. The render layer fills these in, and only on
 * an unlocked render, so a locked preview can never leak a signable string.
 */
export const WL_SIGN_PATTERN = /\{\{WL_SIGN:([A-Za-z0-9_-]{1,2000})\}\}/g;

export function fillWhiteLabelSignatures(body: string, secrets: string[]): string {
  return body.replace(WL_SIGN_PATTERN, (_, payload: string) =>
    secrets.length ? signWhiteLabel(payload, secrets[0]) : "CONFIGURE-PRO-TOOLS-SECRET",
  );
}
