type StripeObject = Record<string, unknown>;
function object(value: unknown): StripeObject | null {
  return value && typeof value === "object" && !Array.isArray(value) ? value as StripeObject : null;
}
export function isPictureStudioStripeObject(value: unknown): boolean {
  const metadata = object(object(value)?.metadata);
  return metadata?.service === "picture_studio" && metadata.fulfillment_mode === "automated_reviewed"
    && typeof metadata.studio_order_id === "string"
    && /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(metadata.studio_order_id);
}

/** Called only after the receiving endpoint verifies its Stripe signature. */
export async function isDedicatedPictureStripeEvent(
  event: { type?: unknown; data?: { object?: unknown } },
  readCharge: (id: string) => Promise<unknown>,
): Promise<boolean> {
  if (typeof event.type !== "string") return false;
  const value = object(event.data?.object);
  if (!value) return false;
  if (event.type.startsWith("charge.dispute.")) {
    const charge = value.charge;
    // Dispute metadata does not inherit PaymentIntent metadata. Read its Charge.
    if (typeof charge === "string" && /^ch_[a-zA-Z0-9]+$/.test(charge)) {
      return isPictureStudioStripeObject(await readCharge(charge));
    }
    return isPictureStudioStripeObject(charge);
  }
  return (event.type.startsWith("checkout.session.") || event.type.startsWith("charge."))
    && isPictureStudioStripeObject(value);
}
