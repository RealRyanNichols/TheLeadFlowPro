import { NextRequest, NextResponse } from "next/server";
import { PRO_ACCESS_COOKIE, proAccessSecrets } from "@/lib/proAccess";
import { consumeProPurchaseReceipt, PRO_PURCHASE_RECEIPT_COOKIE, proPurchaseConsumptionRow, proPurchaseReceiptCookieOptions } from "@/lib/proPurchaseReceipt";
import { createServiceClient } from "@/lib/supabase/service";

export async function POST(request: NextRequest) {
  const result = await consumeProPurchaseReceipt({
    request,
    receiptToken: request.cookies.get(PRO_PURCHASE_RECEIPT_COOKIE)?.value,
    accessToken: request.cookies.get(PRO_ACCESS_COOKIE)?.value,
    secrets: proAccessSecrets(),
    claimOnce: async (receipt) => {
      const { error } = await createServiceClient().from("analytics_events").insert(proPurchaseConsumptionRow(receipt));
      if (error?.code === "23505") return false;
      if (error) throw new Error("Receipt consumption could not be recorded");
      return true;
    },
  });
  const headers = { "Cache-Control": "private, no-store", "Referrer-Policy": "no-referrer", "X-Robots-Tag": "noindex" };
  const response = result.event
    ? NextResponse.json(result.event, { status: result.status, headers })
    : new NextResponse(null, { status: result.status, headers });
  if (result.clearCookie) {
    response.cookies.set(PRO_PURCHASE_RECEIPT_COOKIE, "", { ...proPurchaseReceiptCookieOptions(), maxAge: 0 });
  }
  return response;
}
