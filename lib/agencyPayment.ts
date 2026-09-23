// Agency payments: a client pays the number in a written scope, one time or
// monthly, against one of the six agency services.
//
// The browser never sets a product. It sends a service slug, a billing
// choice, a scope reference, and (until Ryan publishes a price for that
// service in lib/site/offers.ts) the whole-dollar amount from the scope. The
// server rebuilds the charge here, so an edited request can neither invent a
// service nor pay a live-priced service for less than its price.
//
// When an agency offer goes live with a number, that number is charged and
// the browser amount is ignored. Until then the amount is the one Ryan wrote
// down, clamped to the same window the custom build deposit uses.
//
// Leaf module: no Next.js, no Stripe SDK, so the unit tests run it directly.

import { AGENCY_SERVICES, agencyOffer, agencyService, type AgencyService } from "@/lib/site/agency";
import { BUSINESS } from "@/lib/site/business";

export const AGENCY_PAYMENT = {
  kind: "agency_payment",
  /** Whole dollars. Same window as the custom build deposit (/deposit/custom). */
  minUsd: 250,
  maxUsd: 25000,
  payPath: "/agency/pay",
  paidPath: "/agency/paid",
  /** The Stripe line-item suffix, so the receipt names the business. */
  brand: BUSINESS.name,
} as const;

export type AgencyBilling = "one_time" | "monthly";

export const AGENCY_BILLING: readonly { id: AgencyBilling; label: string; note: string }[] = [
  {
    id: "one_time",
    label: "One-time",
    note: "A setup, a build, a shoot, or a fixed project from the scope.",
  },
  {
    id: "monthly",
    label: "Monthly",
    note: "A management or retainer fee from the scope. Renews on the same date each month until you cancel.",
  },
];

export type AgencyPaymentRequest = {
  service?: unknown;
  billing?: unknown;
  amount_usd?: unknown;
  reference?: unknown;
  email?: unknown;
  /** The lead Ryan put on the pay link (/agency/pay?lead=<id>), so the payment lands on that record. */
  lead_id?: unknown;
};

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export type AgencyCharge = {
  service: AgencyService;
  billing: AgencyBilling;
  /** Whole dollars actually charged. */
  amountUsd: number;
  amountCents: number;
  /** True when the amount came from the published offer, not the browser. */
  fixedPrice: boolean;
  reference: string;
  email: string;
  /** Stripe line-item name. */
  name: string;
  /** Session and subscription metadata, all strings. */
  metadata: Record<string, string>;
};

type Result = { ok: true; charge: AgencyCharge } | { ok: false; error: string };

function clean(value: unknown, max: number): string {
  return typeof value === "string" ? value.trim().slice(0, max) : "";
}

/** The live price for a service, in whole dollars, or null while it is TBD. */
export function agencyFixedPriceUsd(service: AgencyService): number | null {
  const offer = agencyOffer(service);
  if (offer.status !== "live") return null;
  if (typeof offer.priceUsd !== "number" || !Number.isFinite(offer.priceUsd) || offer.priceUsd <= 0) return null;
  // The websites lane reuses the Website Launch offer, which is paid through
  // its own deposit link and page, never through this route.
  if (service.slug === "websites") return null;
  return Math.round(offer.priceUsd);
}

/**
 * The cadence a published price is sold at. The registry prints "$49/mo"
 * for a monthly offer (lib/site/prices.ts usdPerMonth) and a plain "$497"
 * for one-time, so a live price also fixes the cadence: the browser's
 * billing choice only applies while a service is TBD and the amount comes
 * from the written scope.
 */
export function agencyFixedBilling(service: AgencyService): AgencyBilling | null {
  if (agencyFixedPriceUsd(service) === null) return null;
  return /\/mo\b/.test(agencyOffer(service).priceLabel) ? "monthly" : "one_time";
}

/** Services this route can take a payment for. Websites has its own door. */
export function payableAgencyServices(): AgencyService[] {
  return AGENCY_SERVICES.filter((s) => s.slug !== "websites");
}

export function resolveAgencyCharge(body: AgencyPaymentRequest): Result {
  const slug = clean(body.service, 40);
  return resolveAgencyChargeFor(slug ? agencyService(slug) : null, body);
}

/** The same resolution for an already-looked-up service (tests pass a substituted offer). */
export function resolveAgencyChargeFor(service: AgencyService | null, body: AgencyPaymentRequest): Result {
  if (!service || service.slug === "websites") {
    return { ok: false, error: "Pick the agency service this payment is for." };
  }

  const billingRaw = clean(body.billing, 20);
  const chosen: AgencyBilling | null =
    billingRaw === "one_time" || billingRaw === "monthly" ? billingRaw : null;
  // A published price carries its own cadence; the browser cannot turn a
  // one-time price into a subscription or a monthly fee into a single charge.
  const billing = agencyFixedBilling(service) ?? chosen;
  if (!billing) return { ok: false, error: "Choose one-time or monthly." };

  const reference = clean(body.reference, 120);
  if (!reference) {
    return { ok: false, error: "Add the business name or the reference printed on your written scope." };
  }

  const email = clean(body.email, 200);
  if (email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    return { ok: false, error: "Enter a valid email for the receipt." };
  }

  const fixed = agencyFixedPriceUsd(service);
  let amountUsd: number;
  if (fixed !== null) {
    amountUsd = fixed;
  } else {
    const requested = Math.round(Number(body.amount_usd));
    if (!Number.isFinite(requested)) {
      return { ok: false, error: "Enter the amount shown in your written scope." };
    }
    if (requested < AGENCY_PAYMENT.minUsd || requested > AGENCY_PAYMENT.maxUsd) {
      return {
        ok: false,
        error: `Enter the amount from your written scope, between $${AGENCY_PAYMENT.minUsd.toLocaleString("en-US")} and $${AGENCY_PAYMENT.maxUsd.toLocaleString("en-US")}.`,
      };
    }
    amountUsd = requested;
  }

  const cadence = billing === "monthly" ? "monthly" : "one-time";
  const name = `${service.name}, ${cadence} | ${AGENCY_PAYMENT.brand}`;
  const metadata: Record<string, string> = {
    kind: AGENCY_PAYMENT.kind,
    service: service.slug,
    service_name: service.name,
    billing,
    scope_usd: String(amountUsd),
    fixed_price: fixed !== null ? "yes" : "no",
    reference,
  };
  // Only a well-formed id rides along; anything else is dropped, never guessed.
  const leadId = clean(body.lead_id, 64);
  if (leadId && UUID.test(leadId)) metadata.lead_id = leadId.toLowerCase();

  return {
    ok: true,
    charge: {
      service,
      billing,
      amountUsd,
      amountCents: amountUsd * 100,
      fixedPrice: fixed !== null,
      reference,
      email,
      name,
      metadata,
    },
  };
}

/** What a paid session's metadata says, for the webhook and the paid page. */
export function agencyPaymentFromMetadata(metadata: Record<string, unknown> | null | undefined): {
  service: AgencyService | null;
  billing: AgencyBilling | null;
  reference: string;
  scopeUsd: number | null;
} {
  const m = metadata ?? {};
  const slug = clean(m.service, 40);
  const billingRaw = clean(m.billing, 20);
  const scope = Number(clean(m.scope_usd, 12));
  return {
    service: slug ? agencyService(slug) : null,
    billing: billingRaw === "one_time" || billingRaw === "monthly" ? billingRaw : null,
    reference: clean(m.reference, 120),
    scopeUsd: Number.isFinite(scope) && scope > 0 ? scope : null,
  };
}

/** Public pay URL for a service, with the service preselected and, when Ryan sends it from a lead, that lead attached. */
export function agencyPayHref(slug?: string | null, leadId?: string | null): string {
  const params = new URLSearchParams();
  if (slug && slug !== "websites") params.set("service", slug);
  if (leadId && UUID.test(leadId)) params.set("lead", leadId.toLowerCase());
  const query = params.toString();
  return query ? `${AGENCY_PAYMENT.payPath}?${query}` : AGENCY_PAYMENT.payPath;
}
