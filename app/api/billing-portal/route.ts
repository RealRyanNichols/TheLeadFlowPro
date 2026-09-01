import { NextResponse } from "next/server";

// Creates a Stripe-hosted customer portal from the unguessable Checkout
// Session ID returned to the buyer after payment. The server retrieves the
// customer from Stripe; the browser can never submit an arbitrary customer ID.
export async function POST(request: Request) {
  const key = process.env.STRIPE_SECRET_KEY;
  if (!key) return NextResponse.json({ error: "not_configured" }, { status: 501 });
  const body = await request.json().catch(() => ({}));
  const sessionId = typeof body.session_id === "string" ? body.session_id.trim() : "";
  if (!/^cs_(test|live)_[A-Za-z0-9]+$/.test(sessionId)) {
    return NextResponse.json({ error: "Invalid checkout session" }, { status: 400 });
  }

  const headers = { Authorization: `Bearer ${key}` };
  const checkout = await fetch(
    `https://api.stripe.com/v1/checkout/sessions/${encodeURIComponent(sessionId)}`,
    { headers, cache: "no-store" },
  );
  const session = (await checkout.json().catch(() => ({}))) as {
    customer?: string | { id?: string };
  };
  const customer =
    typeof session.customer === "string"
      ? session.customer
      : typeof session.customer?.id === "string"
        ? session.customer.id
        : "";
  if (!checkout.ok || !customer) {
    return NextResponse.json({ error: "No billing account found for this checkout" }, { status: 404 });
  }

  const params = new URLSearchParams({
    customer,
    return_url: "https://www.theleadflowpro.com/go/tools/manage",
  });
  const portal = await fetch("https://api.stripe.com/v1/billing_portal/sessions", {
    method: "POST",
    headers: {
      ...headers,
      "Content-Type": "application/x-www-form-urlencoded",
    },
    body: params.toString(),
  });
  const result = (await portal.json().catch(() => ({}))) as { url?: string };
  if (!portal.ok || !result.url) {
    return NextResponse.json({ error: "Billing portal is not available yet" }, { status: 502 });
  }
  return NextResponse.json({ url: result.url });
}

