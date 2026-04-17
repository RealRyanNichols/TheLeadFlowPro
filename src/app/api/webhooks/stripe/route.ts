import { NextRequest, NextResponse } from "next/server";
import { stripe } from "@/lib/stripe";

export const runtime = "nodejs";

// Stripe webhook receiver.
// In Stripe Dashboard → Developers → Webhooks, add:
//   https://www.theleadflowpro.com/api/webhooks/stripe
// Subscribe to: checkout.session.completed, customer.subscription.updated,
//               customer.subscription.deleted, invoice.payment_failed
// Put the signing secret in STRIPE_WEBHOOK_SECRET.
export async function POST(req: NextRequest) {
  const sig = req.headers.get("stripe-signature");
  const secret = process.env.STRIPE_WEBHOOK_SECRET;
  if (!sig || !secret) {
    return NextResponse.json({ error: "Missing signature or secret" }, { status: 400 });
  }

  const raw = await req.text();
  let event;
  try {
    event = stripe().webhooks.constructEvent(raw, sig, secret);
  } catch (err: any) {
    return NextResponse.json({ error: `Invalid signature: ${err.message}` }, { status: 400 });
  }

  // Handlers — flesh these out once auth + DB are wired.
  // For each event, look up the customer by email/metadata, then update
  // the user's plan + booster credits in Postgres.
  switch (event.type) {
    case "checkout.session.completed": {
      // const session = event.data.object as Stripe.Checkout.Session;
      // const { key, kind } = session.metadata ?? {};
      // if (kind === "booster") await grantBooster(session.customer_email!, key);
      // else await activatePlan(session.customer_email!, key);
      break;
    }
    case "customer.subscription.updated":
    case "customer.subscription.deleted":
    case "invoice.payment_failed":
      // await syncSubscription(event.data.object);
      break;
  }

  return NextResponse.json({ received: true });
}
