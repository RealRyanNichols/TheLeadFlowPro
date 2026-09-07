import { createHmac, timingSafeEqual } from "node:crypto";
import { stripePurchaseEventId } from "./stripeSession";
import { validateEventPayment } from "./eventPayments";
import { PRO_PURCHASE_SESSION_WINDOW, proPurchaseConsumptionRow, type ProPurchaseReceipt } from "./proPurchaseReceipt";
export const EVENT_PURCHASE_COOKIE = "lfp_event_purchase";
export const EVENT_RECEIPT_TTL = 10 * 60;
export type EventPurchaseReceipt = ProPurchaseReceipt & {
    registrationToken: string;
};
export const eventReceiptCookieOptions = () => ({ httpOnly: true, secure: process.env.NODE_ENV === "production", sameSite: "lax" as const, path: "/api/events", maxAge: EVENT_RECEIPT_TTL });
export function eventThanksPath(slug: string) { return `/events/${slug}/thanks`; }
export function createEventPurchaseReceipt(session: Parameters<typeof validateEventPayment>[0] & {
    created?: unknown;
    payment_status?: unknown;
}, registration: Parameters<typeof validateEventPayment>[1] & {
    access_token: string;
    event_slug: string;
}, now = Math.floor(Date.now() / 1000)): EventPurchaseReceipt | null {
    if (session.payment_status !== "paid" || session.metadata?.kind !== "event" || !/^cs_[A-Za-z0-9_]{8,200}$/.test(String(session.id)) ||
        !["paid", "attended", "no_show"].includes(registration.status) || !/^[a-f0-9]{48}$/.test(registration.access_token) ||
        !/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(registration.event_slug) || registration.event_slug.length > 80 ||
        typeof session.created !== "number" || !Number.isSafeInteger(session.created) || session.created > now + 30 || now - session.created > PRO_PURCHASE_SESSION_WINDOW)
        return null;
    try {
        validateEventPayment(session, registration);
    }
    catch {
        return null;
    }
    return { v: 1, eventId: stripePurchaseEventId(String(session.id)), amountCents: Number(session.amount_total), currency: "USD", sku: registration.event_slug, registrationToken: registration.access_token, issuedAt: now, expiresAt: now + EVENT_RECEIPT_TTL };
}
function signature(body: string, secret: string) { return createHmac("sha256", secret).update(`event-purchase:${body}`).digest(); }
export function signEventPurchaseReceipt(receipt: EventPurchaseReceipt, secret: string) { const body = Buffer.from(JSON.stringify(receipt)).toString("base64url"); return `${body}.${signature(body, secret).toString("base64url")}`; }
export function verifyEventPurchaseReceipt(token: string | undefined, secrets: string[], now = Math.floor(Date.now() / 1000)): EventPurchaseReceipt | null {
    if (!token || token.length > 2048 || !/^[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+$/.test(token))
        return null;
    const [body, sig] = token.split(".");
    const supplied = Buffer.from(sig, "base64url");
    if (!secrets.some(secret => { const expected = signature(body, secret); return supplied.length === expected.length && timingSafeEqual(supplied, expected); }))
        return null;
    try {
        const r = JSON.parse(Buffer.from(body, "base64url").toString()) as EventPurchaseReceipt;
        if (r.v !== 1 || !/^purchase_[a-f0-9]{64}$/.test(r.eventId) || !/^[a-f0-9]{48}$/.test(r.registrationToken) ||
            !/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(r.sku) || r.sku.length > 80 || r.currency !== "USD" || !Number.isSafeInteger(r.amountCents) || r.amountCents <= 0 ||
            !Number.isSafeInteger(r.issuedAt) || !Number.isSafeInteger(r.expiresAt) || r.issuedAt > now + 30 || r.expiresAt <= now || r.expiresAt - r.issuedAt !== EVENT_RECEIPT_TTL)
            return null;
        return r;
    }
    catch {
        return null;
    }
}
export function eventConsumptionRow(receipt: EventPurchaseReceipt) {
    return { ...proPurchaseConsumptionRow(receipt), event_name: "event_purchase_receipt_consumed", path: eventThanksPath(receipt.sku), tool_slug: null };
}
export function eventReceiptRequestAllowed(request: Request, receipt: EventPurchaseReceipt) {
    const origin = new URL(request.url).origin;
    if (request.method !== "POST" || request.headers.get("origin") !== origin || request.headers.get("x-leadflow-receipt") !== "1" ||
        (request.headers.get("sec-fetch-site") && request.headers.get("sec-fetch-site") !== "same-origin"))
        return false;
    try {
        const from = new URL(request.headers.get("referer") ?? "");
        return from.origin === origin && from.pathname === eventThanksPath(receipt.sku) && !from.search && !from.hash;
    }
    catch {
        return false;
    }
}
