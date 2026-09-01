export const WEBSITE_LAUNCH_DEPOSIT_CENTS = 50000;
export const WEBSITE_LAUNCH_PURCHASE_KIND = "package_deposit";
// Public, non-secret Payment Link resource ID for the approved checkout URL in
// lib/offers.ts. Keep the metadata match below as the portable identifier and
// this ID as the exact fallback for existing shared links.
export const WEBSITE_LAUNCH_PAYMENT_LINK_ID = "plink_1U5atHBHH7tuNwAA8GVDFUBJ";

export type StripeCheckoutSession = {
  id?: unknown;
  amount_total?: unknown;
  customer_email?: unknown;
  customer_details?: {
    email?: unknown;
    name?: unknown;
    phone?: unknown;
  } | null;
  metadata?: Record<string, unknown> | null;
  payment_intent?: unknown;
  payment_link?: unknown;
  payment_status?: unknown;
};

function cleanString(value: unknown, max = 200) {
  return typeof value === "string" ? value.trim().slice(0, max) : "";
}

export function stripePaymentLinkId(session: StripeCheckoutSession) {
  if (typeof session.payment_link === "string") return session.payment_link;
  if (
    session.payment_link &&
    typeof session.payment_link === "object" &&
    "id" in session.payment_link
  ) {
    return cleanString((session.payment_link as { id?: unknown }).id, 200);
  }
  return "";
}

function hasWebsiteLaunchMetadata(session: StripeCheckoutSession) {
  const kind = cleanString(session.metadata?.kind, 64).toLowerCase();
  const packageId = cleanString(session.metadata?.package, 64).toLowerCase();
  const slug = cleanString(session.metadata?.slug, 80).toLowerCase();
  const phase = cleanString(session.metadata?.phase, 40).toLowerCase();
  const app = cleanString(session.metadata?.app, 80).toLowerCase();

  return (
    ((kind === "package_deposit" || kind === "website_launch_deposit") &&
      (packageId === "launch" || packageId === "website-launch")) ||
    kind === "website_launch" ||
    (slug === "website-launch-deposit" &&
      phase === "deposit" &&
      app === "leadflowpro-offers")
  );
}

/**
 * Direct Stripe Payment Links do not pass through /api/checkout, so their
 * Checkout Sessions may not contain our package metadata. The configured
 * Payment Link ID is the authoritative fallback; amount is a second guard so
 * another product can never be promoted into the approved Website Launch
 * offer merely because its link ID was copied incorrectly.
 */
export function isWebsiteLaunchDeposit(
  session: StripeCheckoutSession,
  websiteLaunchPaymentLinkId = WEBSITE_LAUNCH_PAYMENT_LINK_ID,
) {
  if (Number(session.amount_total) !== WEBSITE_LAUNCH_DEPOSIT_CENTS) return false;
  if (hasWebsiteLaunchMetadata(session)) return true;

  const expected = cleanString(websiteLaunchPaymentLinkId, 200);
  return !!expected && stripePaymentLinkId(session) === expected;
}

export function isUnmappedWebsiteLaunchPaymentLinkCandidate(
  session: StripeCheckoutSession,
  websiteLaunchPaymentLinkId = WEBSITE_LAUNCH_PAYMENT_LINK_ID,
) {
  const linkId = stripePaymentLinkId(session);
  const expected = cleanString(websiteLaunchPaymentLinkId, 200);
  return (
    Number(session.amount_total) === WEBSITE_LAUNCH_DEPOSIT_CENTS &&
    !!linkId &&
    !hasWebsiteLaunchMetadata(session) &&
    linkId !== expected
  );
}

export function websiteLaunchCustomer(session: StripeCheckoutSession) {
  const email = cleanString(
    session.customer_details?.email || session.customer_email,
  ).toLowerCase();
  const suppliedName = cleanString(session.customer_details?.name);
  const phone = cleanString(session.customer_details?.phone, 50) || null;
  const emailName = email
    .split("@")[0]
    ?.replace(/[._+-]+/g, " ")
    .replace(/\b\w/g, (letter) => letter.toUpperCase())
    .trim();

  return {
    email,
    fullName: suppliedName || emailName || "Website Launch customer",
    phone,
  };
}

export function safeStripeKind(session: StripeCheckoutSession) {
  const kind = cleanString(session.metadata?.kind, 64).toLowerCase();
  return /^[a-z0-9_-]{1,64}$/.test(kind) ? kind : "unknown";
}
