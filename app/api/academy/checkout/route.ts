import { NextResponse } from "next/server";
import { OPERATOR_ACADEMY } from "@/lib/operatorAcademyCatalog";
import { getStripe } from "@/lib/stripe";

export const runtime = "nodejs";

function validEmail(value: unknown) {
  const email = typeof value === "string" ? value.trim().toLowerCase() : "";
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)
    ? email.slice(0, 254)
    : null;
}

export async function POST(request: Request) {
  try {
    const body = await request.json().catch(() => ({}));
    const email = validEmail(body.email);
    if (!email) {
      return NextResponse.json(
        { error: "Enter a valid email address." },
        { status: 400 },
      );
    }
    const origin = new URL(request.url).origin;
    const session = await getStripe().checkout.sessions.create({
      mode: "payment",
      customer_email: email,
      line_items: [{ price: OPERATOR_ACADEMY.foundingPriceId, quantity: 1 }],
      allow_promotion_codes: true,
      client_reference_id: "OPERATOR-ACADEMY",
      integration_identifier: OPERATOR_ACADEMY.integrationIdentifier,
      metadata: {
        kind: OPERATOR_ACADEMY.allAccessPurchaseKind,
        academy: "operator_academy",
      },
      success_url: `${origin}/academy/welcome?session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${origin}/academy?cancelled=1#pricing`,
    });
    if (!session.url) throw new Error("Stripe returned no Checkout URL");
    return NextResponse.json({ url: session.url });
  } catch (error) {
    console.error(
      "Academy checkout failed:",
      error instanceof Error ? error.message : "unknown checkout error",
    );
    return NextResponse.json(
      { error: "Checkout could not start. Please try again." },
      { status: 502 },
    );
  }
}
