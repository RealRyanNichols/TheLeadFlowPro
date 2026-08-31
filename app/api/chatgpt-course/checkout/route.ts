import { NextResponse } from "next/server";
import { CHATGPT_OPERATOR } from "@/lib/chatgptOperatorCourse";
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
      line_items: [{ price: CHATGPT_OPERATOR.foundingPriceId, quantity: 1 }],
      allow_promotion_codes: true,
      client_reference_id: CHATGPT_OPERATOR.code,
      integration_identifier: CHATGPT_OPERATOR.integrationIdentifier,
      metadata: {
        kind: CHATGPT_OPERATOR.purchaseKind,
        course: CHATGPT_OPERATOR.slug,
      },
      success_url: `${origin}/chatgpt/welcome?session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${origin}/chatgpt?cancelled=1#enroll`,
    });

    if (!session.url) throw new Error("Stripe returned no Checkout URL");
    return NextResponse.json({ url: session.url });
  } catch (error) {
    console.error(
      "ChatGPT Operator checkout failed:",
      error instanceof Error ? error.message : "unknown checkout error",
    );
    return NextResponse.json(
      { error: "Checkout could not start. Please try again." },
      { status: 502 },
    );
  }
}
