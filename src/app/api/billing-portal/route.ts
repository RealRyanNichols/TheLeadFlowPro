import { NextRequest, NextResponse } from "next/server";
import { stripe } from "@/lib/stripe";

export const runtime = "nodejs";

// Opens a Stripe-hosted billing portal for the signed-in customer.
// When auth is wired, pull the customer ID from the session.
// For now, POST with { customerId } from the client.
export async function POST(req: NextRequest) {
  try {
    const { customerId } = await req.json();
    if (!customerId) {
      return NextResponse.json({ error: "Missing customerId" }, { status: 400 });
    }
    const origin = req.headers.get("origin") || process.env.NEXTAUTH_URL || "https://www.theleadflowpro.com";
    const portal = await stripe().billingPortal.sessions.create({
      customer: customerId,
      return_url: `${origin}/dashboard/billing`
    });
    return NextResponse.json({ url: portal.url });
  } catch (err: any) {
    return NextResponse.json({ error: err.message || "Stripe error" }, { status: 500 });
  }
}
