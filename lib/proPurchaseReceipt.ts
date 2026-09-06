import { createHash, createHmac, timingSafeEqual } from "node:crypto";
import { hasProAccess, proKindFromSession, proKindSlug, verifyProAccess, type ProCatalogLike, type ProCheckoutSession } from "./proAccess";
import { stripePurchaseEventId } from "./stripeSession";

export const PRO_PURCHASE_RECEIPT_COOKIE = "lfp_pro_purchase_receipt";
export const PRO_PURCHASE_RECEIPT_PATH = "/api/pro/purchase-receipt";
export const PRO_PURCHASE_RECEIPT_TTL = 10 * 60;
// The existing analytics purge retains at least 30 days. An old checkout must
// not mint a new conversion after its one-time consumption row can be purged.
export const PRO_PURCHASE_SESSION_WINDOW = 30 * 24 * 60 * 60 - PRO_PURCHASE_RECEIPT_TTL - 30;

export type ProPurchaseReceipt = {
  v: 1;
  eventId: string;
  amountCents: number;
  currency: "USD";
  sku: string;
  issuedAt: number;
  expiresAt: number;
};

export type ProPurchaseEvent = {
  eventId: string;
  value: number;
  currency: "USD";
  sku: string;
};

type ProviderSession = ProCheckoutSession & { id?: unknown; created?: unknown; payment_status?: unknown; currency?: unknown };

export function proPurchasePath(sku: string): string {
  return sku === "pro_bundle" ? "/tools/pro" : `/tools/pro/${sku}`;
}

function validSku(sku: unknown): sku is string {
  return typeof sku === "string" && (sku === "pro_bundle" || /^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(sku)) && sku.length <= 80;
}

/** No receipt for an unpaid/free checkout, mismatched session, or unknown product. */
export function createProPurchaseReceipt(
  sessionId: string,
  session: ProviderSession,
  catalog: ProCatalogLike,
  now = Math.floor(Date.now() / 1000),
): ProPurchaseReceipt | null {
  if (!/^cs_[A-Za-z0-9_]{8,200}$/.test(sessionId) || session.id !== sessionId ||
    session.payment_status !== "paid" || session.currency !== "usd" ||
    typeof session.amount_total !== "number" || !Number.isSafeInteger(session.amount_total) || session.amount_total <= 0 ||
    typeof session.created !== "number" || !Number.isSafeInteger(session.created) ||
    session.created > now + 30 || now - session.created > PRO_PURCHASE_SESSION_WINDOW) return null;
  const kind = proKindFromSession(session, catalog);
  const sku = kind === "pro_bundle" ? kind : kind ? proKindSlug(kind) : null;
  if (!validSku(sku)) return null;
  return {
    v: 1, eventId: stripePurchaseEventId(sessionId), amountCents: session.amount_total,
    currency: "USD", sku, issuedAt: now, expiresAt: now + PRO_PURCHASE_RECEIPT_TTL,
  };
}

function signature(body: string, secret: string) {
  return createHmac("sha256", secret).update(`pro-purchase-receipt:${body}`).digest();
}

export function signProPurchaseReceipt(receipt: ProPurchaseReceipt, secret: string): string {
  const body = Buffer.from(JSON.stringify(receipt)).toString("base64url");
  return `${body}.${signature(body, secret).toString("base64url")}`;
}

export function verifyProPurchaseReceipt(
  token: string | undefined,
  secrets: string[],
  now = Math.floor(Date.now() / 1000),
): ProPurchaseReceipt | null {
  if (!token || token.length > 2048 || !/^[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+$/.test(token)) return null;
  const [body, encodedSignature] = token.split(".");
  const supplied = Buffer.from(encodedSignature, "base64url");
  if (!secrets.some((secret) => {
    const expected = signature(body, secret);
    return supplied.length === expected.length && timingSafeEqual(supplied, expected);
  })) return null;
  try {
    const value = JSON.parse(Buffer.from(body, "base64url").toString("utf8")) as ProPurchaseReceipt;
    if (value?.v !== 1 || typeof value.eventId !== "string" || !/^purchase_[a-f0-9]{64}$/.test(value.eventId) ||
      value.currency !== "USD" || !validSku(value.sku) ||
      !Number.isSafeInteger(value.amountCents) || value.amountCents <= 0 ||
      !Number.isSafeInteger(value.issuedAt) || !Number.isSafeInteger(value.expiresAt) ||
      value.issuedAt > now + 30 || value.expiresAt <= now ||
      value.expiresAt - value.issuedAt !== PRO_PURCHASE_RECEIPT_TTL) return null;
    return {
      v: 1, eventId: value.eventId, amountCents: value.amountCents, currency: "USD",
      sku: value.sku, issuedAt: value.issuedAt, expiresAt: value.expiresAt,
    };
  } catch { return null; }
}

export function proPurchaseReceiptCookieOptions() {
  return {
    httpOnly: true, secure: process.env.NODE_ENV === "production", sameSite: "lax" as const,
    path: PRO_PURCHASE_RECEIPT_PATH, maxAge: PRO_PURCHASE_RECEIPT_TTL,
  };
}

/** Existing analytics_events.client_id UNIQUE makes consumption atomic across requests/deploys. */
export function proPurchaseConsumptionRow(receipt: ProPurchaseReceipt) {
  const digest = createHash("sha256").update(`pro-receipt-consumed:${receipt.eventId}`).digest("hex");
  const clientId = `${digest.slice(0, 8)}-${digest.slice(8, 12)}-5${digest.slice(13, 16)}-a${digest.slice(17, 20)}-${digest.slice(20, 32)}`;
  return {
    client_id: clientId,
    event_name: "pro_purchase_receipt_consumed",
    path: proPurchasePath(receipt.sku),
    label: receipt.sku,
    tool_slug: receipt.sku === "pro_bundle" ? null : receipt.sku,
    meta: { receipt_event_id: receipt.eventId, amount_usd: receipt.amountCents / 100, currency: "USD" },
  };
}

export async function consumeProPurchaseReceipt(input: {
  request: Request;
  receiptToken?: string;
  accessToken?: string;
  secrets: string[];
  claimOnce: (receipt: ProPurchaseReceipt) => Promise<boolean>;
  now?: number;
}): Promise<{ status: number; clearCookie: boolean; event: ProPurchaseEvent | null }> {
  const origin = new URL(input.request.url).origin;
  const fetchSite = input.request.headers.get("sec-fetch-site");
  if (input.request.method !== "POST" || input.request.headers.get("origin") !== origin ||
    input.request.headers.get("x-leadflow-receipt") !== "1" || (fetchSite && fetchSite !== "same-origin")) {
    return { status: 403, clearCookie: false, event: null };
  }
  const receipt = verifyProPurchaseReceipt(input.receiptToken, input.secrets, input.now);
  const access = verifyProAccess(input.accessToken, input.secrets);
  const ownsSku = receipt && access && (receipt.sku === "pro_bundle"
    ? access.k.includes("pro_bundle") : hasProAccess(access.k, receipt.sku));
  if (!receipt || !ownsSku) return { status: 204, clearCookie: Boolean(input.receiptToken), event: null };
  try {
    const referrer = new URL(input.request.headers.get("referer") ?? "");
    if (referrer.origin !== origin || referrer.pathname !== proPurchasePath(receipt.sku) || referrer.search || referrer.hash) {
      return { status: 204, clearCookie: false, event: null };
    }
  } catch { return { status: 204, clearCookie: false, event: null }; }
  try {
    if (!await input.claimOnce(receipt)) return { status: 204, clearCookie: true, event: null };
    return {
      status: 200, clearCookie: true,
      event: { eventId: receipt.eventId, value: receipt.amountCents / 100, currency: "USD", sku: receipt.sku },
    };
  } catch {
    // Keep the signed receipt for a retry. Measurement can never block kit access.
    return { status: 503, clearCookie: false, event: null };
  }
}
