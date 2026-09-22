export const STARTS_AT = "2026-09-22T23:00:00Z";
export const ENDS_AT = "2026-09-24T23:00:00Z";
export const PURCHASE_KIND = "september_special_2026";
export const PRICE_CENTS = PRICES.septemberSpecialTotal * 100;
export const ADS_CENTS = PRICES.septemberSpecialAds * 100;
export const SERVICE_CENTS = PRICE_CENTS - ADS_CENTS;
export const CAPACITY = 5;
export const CHECKOUT_HOLD_SECONDS = 1800;

export type SpecialStatus = "upcoming" | "open" | "sold_out" | "expired" | "unavailable";

export function specialStatus(now: number, availableSpots: number): SpecialStatus {
  if (now < Date.parse(STARTS_AT)) return "upcoming";
  if (now >= Date.parse(ENDS_AT)) return "expired";
  return availableSpots > 0 ? "open" : "sold_out";
}

export type SpecialProspect = {
  request_id: string;
  full_name: string;
  email: string;
  phone: string;
  business_name: string;
  business_city: string;
  website_url: string | null;
  marketing_email_consent: boolean;
  offer_terms_accepted: true;
  within_service_area: true;
  utm_source: string | null;
  utm_medium: string | null;
  utm_campaign: string | null;
};

export const UUID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

function field(value: unknown, max: number) {
  return typeof value === "string" && value.trim().length <= max
    ? value.trim().replace(/[\u0000-\u001f\u007f]/g, "")
    : "";
}

export function parseSpecialProspect(value: unknown): SpecialProspect | null {
  if (!value || typeof value !== "object" || Array.isArray(value)) return null;
  const body = value as Record<string, unknown>;
  const requestId = field(body.request_id, 36);
  const fullName = field(body.full_name, 160);
  const email = field(body.email, 254).toLowerCase();
  const phone = field(body.phone, 50);
  const businessName = field(body.business_name, 200);
  const city = field(body.business_city, 160);
  if (!UUID_PATTERN.test(requestId) || !fullName || !businessName || !city ||
      !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email) ||
      phone.replace(/\D/g, "").length < 10 || body.offer_terms_accepted !== true ||
      body.within_service_area !== true) return null;

  const website = field(body.website_url, 500);
  if (website) {
    try {
      if (!["http:", "https:"].includes(new URL(website).protocol)) return null;
    } catch { return null; }
  }
  return {
    request_id: requestId, full_name: fullName, email, phone,
    business_name: businessName, business_city: city, website_url: website || null,
    marketing_email_consent: body.marketing_email_consent === true,
    offer_terms_accepted: true,
    within_service_area: true,
    utm_source: field(body.utm_source, 120) || null,
    utm_medium: field(body.utm_medium, 120) || null,
    utm_campaign: field(body.utm_campaign, 160) || null,
  };
}

export type SpecialSession = {
  id?: unknown;
  mode?: unknown;
  status?: unknown;
  payment_status?: unknown;
  amount_total?: unknown;
  currency?: unknown;
  metadata?: Record<string, unknown> | null;
};

/** A signed event still must match the exact product, amount and reservation. */
export function paidSpecialReservation(session: SpecialSession): string | null {
  const id = session.metadata?.reservation_id;
  return session.metadata?.kind === PURCHASE_KIND && typeof id === "string" &&
    UUID_PATTERN.test(id) && typeof session.id === "string" &&
    session.id.startsWith("cs_") && session.mode === "payment" &&
    session.status === "complete" && session.payment_status === "paid" &&
    session.amount_total === PRICE_CENTS && session.currency === "usd" ? id : null;
}

export function canReleaseFailedSpecialPayment(
  session: SpecialSession,
  intent: { status: string; last_payment_error?: unknown } | null,
) {
  return session.metadata?.kind === PURCHASE_KIND && session.status === "complete" &&
    session.payment_status === "unpaid" && !!intent &&
    (intent.status === "canceled" || (intent.status === "requires_payment_method" && !!intent.last_payment_error));
}
import { PRICES } from "@/lib/site/prices";
