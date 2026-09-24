// Post Creator: who is holding the app.
//
// Identity is a signed cookie carrying the buyer's email and the account's
// access epoch: an HMAC over the payload, so nobody can mint one without the
// secret, and it reveals nothing useful if it leaks. The epoch is the account's
// access_epoch at signing time. Any later checkout on the same email bumps it
// in the database, which signs every device out at once; the emailed key opens
// the app again. Whether the account is still entitled is decided from the
// database on every request, in lib/postCreator/accessServer.ts.
//
// The license key is the Pro Kit derivation (lib/proAccess.ts) with this
// product's own kind, so it can never open Chase Sheet or a Pro Kit, and one
// key opens Post Creator on any device whichever plan was bought. Derived,
// never stored. The account's key_version is part of the kind, so raising it
// revokes a leaked key without touching anyone else's.
//
// Nothing here talks to a database or reads a cookie. Pure apart from
// process.env in postCreatorSecrets and the cookie's secure flag.

import { createHash, createHmac, timingSafeEqual } from "node:crypto";
import { isPlausibleEmail, licenseKey, normalizeEmail, proAccessSecrets, verifyLicenseKey } from "../proAccess";
import { POST_CREATOR } from "./product";
import type { PostCreatorPlan } from "./types";

export { isPlausibleEmail, normalizeEmail, normalizeLicenseKey } from "../proAccess";

export const POST_CREATOR_COOKIE = "lfp_post_creator";
export const POST_CREATOR_COOKIE_MAX_AGE = 31_536_000;

export type PostCreatorIdentity = {
  v: 1;
  /** Buyer email, lowercased. */
  e: string;
  /** Issued at, unix seconds. */
  t: number;
  /** The account's access_epoch when this cookie was signed. */
  n: number;
};

/** POST_CREATOR_SECRET first, then every secret the Pro Kits accept, so rotation never locks a buyer out. */
export function postCreatorSecrets(): string[] {
  const own = process.env.POST_CREATOR_SECRET?.trim();
  const rest = proAccessSecrets();
  return own && !rest.includes(own) ? [own, ...rest] : rest;
}

// The HMAC domain. Chase Sheet signs "chase:v1:" and the Pro Kits "access:",
// so a cookie from one product never verifies as another.
const DOMAIN = "post-creator:v1:";

const b64url = (buf: Buffer) => buf.toString("base64url");

function hmac(secret: string, message: string): Buffer {
  return createHmac("sha256", secret).update(message).digest();
}

function timingEqual(a: Buffer, b: Buffer): boolean {
  return a.length === b.length && timingSafeEqual(a, b);
}

export function signIdentity(identity: PostCreatorIdentity, secret: string): string {
  const body = b64url(Buffer.from(JSON.stringify(identity), "utf8"));
  return `${body}.${b64url(hmac(secret, `${DOMAIN}${body}`))}`;
}

/**
 * The identity if the token was signed by any known secret, is not dated more
 * than a minute ahead or older than the cookie's max age, and carries a whole,
 * non-negative epoch. Otherwise null.
 */
export function verifyIdentity(
  token: string | undefined | null,
  secrets: string[],
  now = Math.floor(Date.now() / 1000),
): PostCreatorIdentity | null {
  if (!token || typeof token !== "string" || token.length > 2048) return null;
  const dot = token.indexOf(".");
  if (dot <= 0) return null;
  const body = token.slice(0, dot);
  let received: Buffer;
  try {
    received = Buffer.from(token.slice(dot + 1), "base64url");
  } catch {
    return null;
  }
  if (!secrets.some((s) => timingEqual(hmac(s, `${DOMAIN}${body}`), received))) return null;
  try {
    const parsed = JSON.parse(Buffer.from(body, "base64url").toString("utf8")) as PostCreatorIdentity;
    if (parsed?.v !== 1 || typeof parsed.e !== "string" || typeof parsed.t !== "number") return null;
    if (typeof parsed.n !== "number" || !Number.isInteger(parsed.n) || parsed.n < 0) return null;
    const email = normalizeEmail(parsed.e);
    if (!isPlausibleEmail(email)) return null;
    if (parsed.t > now + 60 || now - parsed.t > POST_CREATOR_COOKIE_MAX_AGE) return null;
    return { v: 1, e: email, t: parsed.t, n: parsed.n };
  } catch {
    return null;
  }
}

export function identityFor(email: string, epoch: number, now = Math.floor(Date.now() / 1000)): PostCreatorIdentity {
  return { v: 1, e: normalizeEmail(email), t: now, n: epoch };
}

/**
 * The kind a key is derived from. Version 0 is the original key, so every key
 * already emailed keeps working; each later version (the account's
 * key_version, raised by hand to revoke a leaked key) is a new key, and the
 * old one stops matching. Null for a version that is not a whole number, 0 or
 * more, so an unreadable version opens nothing.
 */
function keyKind(version: number): string | null {
  if (!Number.isInteger(version) || version < 0) return null;
  return version === 0 ? POST_CREATOR.accessKind : `${POST_CREATOR.accessKind}:v${version}`;
}

/** LFP-XXXX-XXXX-XXXX-XXXX for this buyer at the account's key version. The same for the monthly and the one payment plan. */
export function postCreatorLicenseKey(email: string, secret: string, version = 0): string {
  const kind = keyKind(version);
  if (!kind) throw new Error("Post Creator key version must be a whole number, 0 or more");
  return licenseKey(email, kind, secret);
}

export function verifyPostCreatorLicenseKey(email: string, key: string, secrets: string[], version = 0): boolean {
  const kind = keyKind(version);
  return kind !== null && verifyLicenseKey(email, kind, key, secrets);
}

/** A year by default; pass 0 to clear the cookie. */
export function postCreatorCookieOptions(maxAge: number = POST_CREATOR_COOKIE_MAX_AGE) {
  return {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax" as const,
    path: "/",
    maxAge,
  };
}

/* ------------------------------- stripe sessions ----------------------------- */

export type PostCreatorCheckoutSession = {
  id?: unknown;
  mode?: unknown;
  status?: unknown;
  payment_status?: unknown;
  currency?: unknown;
  amount_total?: unknown;
  amount_subtotal?: unknown;
  metadata?: Record<string, unknown> | null;
  customer?: unknown;
  subscription?: unknown;
  customer_details?: { email?: unknown } | null;
  customer_email?: unknown;
  /** Unix seconds. The claim route's 24 hour window is measured from here. */
  created?: unknown;
};

export type PostCreatorPurchase = {
  plan: PostCreatorPlan;
  kind: string;
  email: string;
  sessionId: string;
  customerId: string | null;
  subscriptionId: string | null;
  /** When Stripe created the checkout, unix seconds, or null when the session did not say. */
  createdAt: number | null;
};

function idOf(value: unknown): string | null {
  if (typeof value === "string" && value) return value.slice(0, 200);
  if (value && typeof value === "object" && typeof (value as { id?: unknown }).id === "string") return String((value as { id: string }).id).slice(0, 200);
  return null;
}

function createdOf(value: unknown): number | null {
  return typeof value === "number" && Number.isSafeInteger(value) && value > 0 ? value : null;
}

/**
 * What a paid Stripe session bought, or null when it is not a Post Creator
 * purchase. The mode and the amount are both checked against the plan, so a
 * copied session id for the monthly plan can never claim the one payment plan.
 * The amount paid must be the full price: checkout offers no promotion code
 * for Post Creator, so a discounted session is not one this site made
 * (decision 96) and waits for review instead of unlocking the full plan.
 */
export function purchaseFromSession(session: PostCreatorCheckoutSession): PostCreatorPurchase | null {
  const meta = session.metadata ?? {};
  const kind = typeof meta.kind === "string" ? meta.kind : "";
  const sessionId = typeof session.id === "string" ? session.id : "";
  if (!/^cs_[A-Za-z0-9_]{8,200}$/.test(sessionId)) return null;
  if (session.currency !== "usd" || session.payment_status !== "paid") return null;
  const total = session.amount_total;
  if (typeof total !== "number" || !Number.isSafeInteger(total) || total < 0) return null;
  const matches = (usd: number) => total === usd * 100;
  const email = normalizeEmail(
    (session.customer_details?.email as string | undefined) || (session.customer_email as string | undefined) || "",
  );
  if (!isPlausibleEmail(email)) return null;
  const common = { kind, email, sessionId, customerId: idOf(session.customer), createdAt: createdOf(session.created) };

  if (kind === POST_CREATOR.monthlyKind) {
    if (session.mode !== "subscription" || !matches(POST_CREATOR.monthlyUsd)) return null;
    return { plan: "monthly", ...common, subscriptionId: idOf(session.subscription) };
  }
  if (kind === POST_CREATOR.lifetimeKind) {
    if (session.mode !== "payment" || !matches(POST_CREATOR.lifetimeUsd)) return null;
    return { plan: "lifetime", ...common, subscriptionId: null };
  }
  return null;
}

/* -------------------------------- rate limits -------------------------------- */

/**
 * The key a durable rate limit counts under: sha256 hex, so the table never
 * holds an email or an IP address in the clear.
 */
export function bucketFor(purpose: string, subject: string): string {
  return createHash("sha256").update(`post-creator:${purpose}:${subject}`).digest("hex");
}
