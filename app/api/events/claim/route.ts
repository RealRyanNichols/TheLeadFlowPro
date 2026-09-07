import { NextResponse } from "next/server";
import { createServiceClient } from "@/lib/supabase/service";
import { proAccessSecrets } from "@/lib/proAccess";
import { ensureEventSeatPaid } from "@/lib/eventSeatFulfillment";
import { validateEventPayment } from "@/lib/eventPayments";
import { createEventPurchaseReceipt, EVENT_PURCHASE_COOKIE, eventReceiptCookieOptions, eventThanksPath, signEventPurchaseReceipt } from "@/lib/eventPurchaseReceipt";
const SITE = "https://www.theleadflowpro.com";
const redirect = (path: string) => NextResponse.redirect(`${SITE}${path}`, { status: 303, headers: { "Cache-Control": "private, no-store", "Referrer-Policy": "no-referrer", "X-Robots-Tag": "noindex" } });
export async function GET(request: Request) {
    const params = new URL(request.url).searchParams;
    const token = params.get("t") ?? "";
    const sessionId = params.get("session_id") ?? "";
    if (!/^[a-f0-9]{48}$/.test(token) || !/^cs_[A-Za-z0-9_]{8,200}$/.test(sessionId))
        return redirect("/events");
    let privatePath = "/events";
    try {
        const db = createServiceClient();
        const load = () => db.from("event_registrations").select("id,event_id,status,stripe_session_id,access_token,events(slug)").eq("access_token", token).single();
        const before = await load();
        if (before.error || !before.data)
            return redirect(privatePath);
        const event = Array.isArray(before.data.events) ? before.data.events[0] : before.data.events;
        if (!event?.slug || !/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(event.slug))
            return redirect(privatePath);
        privatePath = `/events/${event.slug}/confirmed?t=${encodeURIComponent(token)}`;
        const secrets = proAccessSecrets();
        const key = process.env.STRIPE_SECRET_KEY;
        if (!key || !secrets.length)
            return redirect(privatePath);
        const response = await fetch(`https://api.stripe.com/v1/checkout/sessions/${encodeURIComponent(sessionId)}`, { headers: { Authorization: `Bearer ${key}` }, cache: "no-store" });
        const session = response.ok ? await response.json() : null;
        if (!session || session.id !== sessionId || session.payment_status !== "paid")
            return redirect(privatePath);
        validateEventPayment(session, before.data);
        // Instant verified seat access, even before Stripe's webhook arrives. A
        // failed confirmation delivery remains retryable through the webhook.
        try {
            await ensureEventSeatPaid(db, session);
        }
        catch { /* Re-read the authoritative seat below. */ }
        const after = await load();
        if (after.error || !after.data)
            return redirect(privatePath);
        const receipt = createEventPurchaseReceipt(session, { ...after.data, event_slug: event.slug });
        if (!receipt)
            return redirect(privatePath);
        const result = redirect(eventThanksPath(receipt.sku));
        result.cookies.set(EVENT_PURCHASE_COOKIE, signEventPurchaseReceipt(receipt, secrets[0]), eventReceiptCookieOptions());
        return result;
    }
    catch {
        return redirect(privatePath);
    }
}
