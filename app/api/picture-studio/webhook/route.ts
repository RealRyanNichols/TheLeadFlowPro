import { NextResponse } from "next/server";
import { apiError, boundedBody, secureHeaders } from "@/lib/pictureStudio/auth";
import { handlePictureStripeEvent, pictureStripe } from "@/lib/pictureStudio/payments";
import { PictureError } from "@/lib/pictureStudio/types";
export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export async function POST(request: Request) {
  try {
    const secret = process.env.PICTURE_STRIPE_WEBHOOK_SECRET;
    if (!secret) throw new PictureError("Webhook is not configured.", 503);
    const signature = request.headers.get("stripe-signature");
    if (!signature) throw new PictureError("Webhook signature is required.", 400);
    const payload = new TextDecoder().decode(await boundedBody(request, 1024 * 1024));
    let event;
    try { event = pictureStripe().webhooks.constructEvent(payload, signature, secret); }
    catch { throw new PictureError("Webhook signature is invalid.", 400); }
    await handlePictureStripeEvent(event);
    return NextResponse.json({ received: true }, { headers: secureHeaders });
  } catch (error) { return apiError(error); }
}
