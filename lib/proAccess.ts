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
