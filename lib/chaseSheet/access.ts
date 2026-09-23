// Who is holding the sheet.
//
// Identity is a signed cookie carrying the buyer's email: an HMAC over the
// payload, so nobody can mint one without the secret, and it reveals nothing
// useful if it leaks. The cookie proves who is asking; whether they are still
// entitled (a paid month, a lifetime purchase, no refund) is decided from the
// database on every request, in lib/chaseSheet/accessServer.ts.
//
// The license key is the same derivation the Pro Kits use (lib/proAccess.ts),
// with this product's own kind, so one key restores the sheet on any device
// whichever plan was bought. Derived, never stored.

import crypto from "node:crypto";
import { isPlausibleEmail, licenseKey, normalizeEmail, normalizeLicenseKey, proAccessSecrets, verifyLicenseKey } from "../proAccess";
import { CHASE_SHEET } from "./product";

export const CHASE_COOKIE = "lfp_chase_sheet";
export const CHASE_COOKIE_MAX_AGE = 60 * 60 * 24 * 365;

export type ChaseIdentity = {
  v: 1;
  /** Buyer email, lowercased. */
  e: string;
  /** Issued at, unix seconds. */
  t: number;
};

/** CHASE_SHEET_SECRET first, then every secret the Pro Kits accept, so rotation never locks a buyer out. */
export function chaseSecrets(): string[] {
  const own = process.env.CHASE_SHEET_SECRET?.trim();
  const rest = proAccessSecrets();
  return own && !rest.includes(own) ? [own, ...rest] : rest;
}

export { isPlausibleEmail, normalizeEmail, normalizeLicenseKey };

const b64url = (buf: Buffer) => buf.toString("base64url");

function hmac(secret: string, message: string): Buffer {
  return crypto.createHmac("sha256", secret).update(message).digest();
}

function timingEqual(a: Buffer, b: Buffer): boolean {
  return a.length === b.length && crypto.timingSafeEqual(a, b);
}

export function signIdentity(identity: ChaseIdentity, secret: string): string {
  const body = b64url(Buffer.from(JSON.stringify(identity), "utf8"));
  return `${body}.${b64url(hmac(secret, `chase:v1:${body}`))}`;
}

export function verifyIdentity(token: string | undefined | null, secrets: string[], now = Math.floor(Date.now() / 1000)): ChaseIdentity | null {
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
  if (!secrets.some((s) => timingEqual(hmac(s, `chase:v1:${body}`), received))) return null;
  try {
    const parsed = JSON.parse(Buffer.from(body, "base64url").toString("utf8")) as ChaseIdentity;
    if (parsed?.v !== 1 || typeof parsed.e !== "string" || typeof parsed.t !== "number") return null;
    const email = normalizeEmail(parsed.e);
    if (!isPlausibleEmail(email)) return null;
    if (parsed.t > now + 60 || now - parsed.t > CHASE_COOKIE_MAX_AGE) return null;
    return { v: 1, e: email, t: parsed.t };
  } catch {
    return null;
  }
}

export function identityFor(email: string, now = Math.floor(Date.now() / 1000)): ChaseIdentity {
  return { v: 1, e: normalizeEmail(email), t: now };
}

/** LFP-XXXX-XXXX-XXXX-XXXX for this buyer. The same for the monthly and the lifetime plan. */
export function chaseLicenseKey(email: string, secret: string): string {
  return licenseKey(email, CHASE_SHEET.accessKind, secret);
}

export function verifyChaseLicenseKey(email: string, key: string, secrets: string[]): boolean {
  return verifyLicenseKey(email, CHASE_SHEET.accessKind, key, secrets);
}

export function chaseCookieOptions() {
  return {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax" as const,
    path: "/",
    maxAge: CHASE_COOKIE_MAX_AGE,
  };
}

/* ------------------------------- stripe sessions ----------------------------- */

export type ChaseCheckoutSession = {
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
};

export type ChasePurchase = {
  plan: "monthly" | "lifetime";
  kind: string;
  email: string;
  sessionId: string;
  customerId: string | null;
  subscriptionId: string | null;
};

function idOf(value: unknown): string | null {
  if (typeof value === "string" && value) return value.slice(0, 200);
  if (value && typeof value === "object" && typeof (value as { id?: unknown }).id === "string") return String((value as { id: string }).id).slice(0, 200);
  return null;
}

/**
 * What a paid Stripe session bought, or null when it is not a Chase Sheet
 * purchase. The mode and the amount are both checked against the plan, so a
 * copied session id for the monthly plan can never claim the lifetime one.
 */
export function purchaseFromSession(session: ChaseCheckoutSession): ChasePurchase | null {
  const meta = session.metadata ?? {};
  const kind = typeof meta.kind === "string" ? meta.kind : "";
  const sessionId = typeof session.id === "string" ? session.id : "";
  if (!/^cs_[A-Za-z0-9_]{8,200}$/.test(sessionId)) return null;
  if (session.currency !== "usd" || session.payment_status !== "paid") return null;
  const total = session.amount_total;
  const subtotal = session.amount_subtotal;
  if (typeof total !== "number" || !Number.isSafeInteger(total) || total < 0) return null;
  const matches = (usd: number) => total === usd * 100 || subtotal === usd * 100;
  const email = normalizeEmail(
    (session.customer_details?.email as string | undefined) || (session.customer_email as string | undefined) || "",
  );
  if (!isPlausibleEmail(email)) return null;

  if (kind === CHASE_SHEET.monthlyKind) {
    if (session.mode !== "subscription" || !matches(CHASE_SHEET.monthlyUsd)) return null;
    return { plan: "monthly", kind, email, sessionId, customerId: idOf(session.customer), subscriptionId: idOf(session.subscription) };
  }
  if (kind === CHASE_SHEET.lifetimeKind) {
    if (session.mode !== "payment" || !matches(CHASE_SHEET.lifetimeUsd)) return null;
    return { plan: "lifetime", kind, email, sessionId, customerId: idOf(session.customer), subscriptionId: null };
  }
  return null;
}
