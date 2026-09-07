import { NextRequest, NextResponse } from "next/server";
import { createServiceClient } from "@/lib/supabase/service";
import { proAccessSecrets } from "@/lib/proAccess";
import { stripePurchaseEventId } from "@/lib/stripeSession";
import { EVENT_PURCHASE_COOKIE, eventConsumptionRow, eventReceiptRequestAllowed, verifyEventPurchaseReceipt } from "@/lib/eventPurchaseReceipt";
const headers = { "Cache-Control": "private, no-store", "Referrer-Policy": "no-referrer", "X-Robots-Tag": "noindex" };
export async function POST(request: NextRequest) {
    const receipt = verifyEventPurchaseReceipt(request.cookies.get(EVENT_PURCHASE_COOKIE)?.value, proAccessSecrets());
    if (!receipt)
        return new NextResponse(null, { status: 204, headers });
    if (!eventReceiptRequestAllowed(request, receipt))
        return new NextResponse(null, { status: 403, headers });
    try {
        const db = createServiceClient();
        const loaded = await db.from("event_registrations").select("status,stripe_session_id,amount_paid_cents,events(slug)").eq("access_token", receipt.registrationToken).single();
        if (loaded.error)
            throw new Error("Seat lookup unavailable");
        const row = loaded.data;
        const event = Array.isArray(row?.events) ? row.events[0] : row?.events;
        if (!row || !["paid", "attended", "no_show"].includes(row.status) || !row.stripe_session_id || event?.slug !== receipt.sku ||
            stripePurchaseEventId(row.stripe_session_id) !== receipt.eventId || row.amount_paid_cents !== receipt.amountCents)
            return new NextResponse(null, { status: 204, headers });
        const claimed = await db.from("analytics_events").insert(eventConsumptionRow(receipt));
        if (claimed.error?.code === "23505")
            return new NextResponse(null, { status: 204, headers });
        if (claimed.error)
            throw new Error("Receipt consumption unavailable");
        // No private token, Stripe credential, contact details or seat data leaves this endpoint.
        return NextResponse.json({ eventId: receipt.eventId, value: receipt.amountCents / 100, currency: "USD", sku: receipt.sku }, { headers });
    }
    catch {
        return new NextResponse(null, { status: 503, headers });
    }
}
