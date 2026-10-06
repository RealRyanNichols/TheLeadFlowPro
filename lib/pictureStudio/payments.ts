import Stripe from "stripe";
import { assertCheckoutReady } from "./auth";
import { checkoutUnderLock, packDefinition, recordPayment, stopPayment } from "./store";
import { PictureError, validateProductionBrief } from "./types";

let client: Stripe | undefined;
export function pictureStripe(): Stripe {
  const key = process.env.STRIPE_SECRET_KEY;
  if (!key) throw new PictureError("Payments are not configured.", 503);
  client ??= new Stripe(key, { timeout: 20000, maxNetworkRetries: 1 });
  return client;
}
export async function createPictureCheckout(orderId: string): Promise<{ url: string }> {
  await assertCheckoutReady();
  return checkoutUnderLock(orderId, async (db, order) => {
    if (order.payment_status !== "unpaid" || order.status !== "awaiting_payment") throw new PictureError("This order already has a payment or is not open for checkout.", 409);
    validateProductionBrief(order.brief, order.assets.length);
    if (order.checkout_url && order.checkout_expires_at && new Date(order.checkout_expires_at).getTime() > Date.now() + 60000) return { url: order.checkout_url };
    const pack = packDefinition(order.pack_id, order.quantity), stripe = pictureStripe();
    const actual = await stripe.prices.retrieve(pack.priceId);
    if (!actual.active || actual.currency !== "usd" || actual.type !== "one_time" || actual.unit_amount !== pack.amountCents / pack.quantity || (process.env.NODE_ENV === "production" && !actual.livemode)) throw new PictureError("This pack’s payment setup needs team review.", 503);
    const attempt = order.checkout_attempt + 1;
    const metadata = { studio_order_id: order.id, kind: pack.kind, service: "picture_studio", fulfillment_mode: "automated_reviewed" };
    const session = await stripe.checkout.sessions.create({
      mode: "payment", customer_email: order.email,
      line_items: [{ price: pack.priceId, quantity: pack.quantity }],
      client_reference_id: order.id, metadata, payment_intent_data: { metadata },
      allow_promotion_codes: false,
      success_url: `https://www.theleadflowpro.com/picture-studio/orders/${order.id}?checkout=complete`,
      cancel_url: `https://www.theleadflowpro.com/picture-studio/orders/${order.id}?checkout=cancelled`,
    }, { idempotencyKey: `picture-studio:${order.id}:${attempt}` });
    if (!session.url) throw new PictureError("Stripe did not return a checkout link.", 503);
    await db.query("UPDATE picture_orders SET checkout_session_id=$2,checkout_url=$3,checkout_expires_at=to_timestamp($4),checkout_attempt=$5,updated_at=now() WHERE id=$1", [order.id, session.id, session.url, session.expires_at, attempt]);
    await db.query("INSERT INTO picture_checkout_sessions(id,order_id,attempt,expires_at) VALUES ($1,$2,$3,to_timestamp($4)) ON CONFLICT(id) DO NOTHING", [session.id, order.id, attempt, session.expires_at]);
    return { url: session.url };
  });
}
function idOf(value: string | { id: string } | null | undefined): string | undefined { return typeof value === "string" ? value : value?.id; }
export async function handlePictureStripeEvent(event: Stripe.Event): Promise<void> {
  const stripe = pictureStripe();
  if (["checkout.session.completed", "checkout.session.async_payment_succeeded"].includes(event.type)) {
    const received = event.data.object as Stripe.Checkout.Session;
    if (!received.metadata?.studio_order_id) return;
    // Read authoritative line items rather than trusting customer-editable input or metadata prices.
    const session = await stripe.checkout.sessions.retrieve(received.id, { expand: ["line_items.data.price"] });
    if (session.payment_status !== "paid") return;
    const lineItems = await stripe.checkout.sessions.listLineItems(session.id, { limit: 2 });
    if (lineItems.data.length !== 1 || lineItems.has_more) throw new PictureError("Payment must contain exactly one selected picture pack.");
    const item = lineItems.data[0];
    await recordPayment({ eventId: event.id, orderId: received.metadata.studio_order_id, sessionId: session.id, paymentIntent: idOf(session.payment_intent) || null,
      amountCents: session.amount_total || 0, currency: session.currency || "", paid: session.payment_status === "paid", livemode: session.livemode,
      priceId: item.price?.id || "", quantity: item.quantity || 0 });
  } else if (event.type === "checkout.session.async_payment_failed") {
    const session = event.data.object as Stripe.Checkout.Session;
    if (session.metadata?.studio_order_id) await stopPayment({ eventId: event.id, sessionId: session.id, status: "failed" });
  } else if (event.type === "charge.refunded") {
    const charge = event.data.object as Stripe.Charge;
    if (charge.amount_refunded > 0) await stopPayment({ eventId: event.id, paymentIntent: idOf(charge.payment_intent), status: "refunded" });
  } else if (event.type === "charge.dispute.created") {
    const dispute = event.data.object as Stripe.Dispute;
    let intent = idOf(dispute.payment_intent);
    if (!intent && idOf(dispute.charge)) intent = idOf((await stripe.charges.retrieve(idOf(dispute.charge)!)).payment_intent);
    await stopPayment({ eventId: event.id, paymentIntent: intent, status: "disputed" });
  }
}
