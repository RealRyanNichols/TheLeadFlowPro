import { NextRequest, NextResponse } from "next/server";
import { proAccessSecrets } from "@/lib/proAccess";
import { EVENT_PURCHASE_COOKIE, verifyEventPurchaseReceipt } from "@/lib/eventPurchaseReceipt";
export async function GET(request: NextRequest) {
    const receipt = verifyEventPurchaseReceipt(request.cookies.get(EVENT_PURCHASE_COOKIE)?.value, proAccessSecrets());
    const path = receipt ? `/events/${receipt.sku}/confirmed?t=${encodeURIComponent(receipt.registrationToken)}` : "/events";
    return NextResponse.redirect(`https://www.theleadflowpro.com${path}`, { status: 303, headers: { "Cache-Control": "private, no-store", "Referrer-Policy": "no-referrer", "X-Robots-Tag": "noindex" } });
}
