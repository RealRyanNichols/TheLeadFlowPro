import { NextResponse } from "next/server";
import { CONTENT_ENGINE } from "@/lib/contentEngineCourse";
import { getStripe } from "@/lib/stripe";

export const runtime = "nodejs";

function validEmail(value: unknown) {
  const email = typeof value === "string" ? value.trim().toLowerCase() : "";
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email) ? email.slice(0, 254) : null;
}

export async function POST(request: Request) {
  try {
    const body = await request.json().catch(() => ({}));
    const email = validEmail(body.email);
    if (!email) {
      return NextResponse.json({ error: "Enter a valid email address." }, { status: 400 });
    }

    const origin = new URL(request.url).origin;
    const session = await getStripe().checkout.sessions.create({
      mode: "payment",
      customer_email: email,
      line_items: [{ price: CONTENT_ENGINE.foundingPriceId, quantity: 1 }],
      allow_promotion_codes: true,
      client_reference_id: CONTENT_ENGINE.code,
      metadata: {
        kind: CONTENT_ENGINE.purchaseKind,
        course: CONTENT_ENGINE.slug,
        integration_identifier: CONTENT_ENGINE.integrationIdentifier,
      },
      success_url: `${origin}/operator-academy/content-engine/welcome?session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${origin}/operator-academy/content-engine?cancelled=1`,
    });

    if (!session.url) throw new Error("Stripe returned no Checkout URL");
    return NextResponse.json({ url: session.url });
  } catch (error) {
    console.error(
      "Content Engine checkout failed:",
      error instanceof Error ? error.message : "unknown checkout error",
    );
    return NextResponse.json(
      { error: "Checkout could not start. Please try again." },
      { status: 502 },
    );
  }
}
