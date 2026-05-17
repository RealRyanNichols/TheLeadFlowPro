import type { OfferSlug } from "./offers";

export type OfferCheckoutShape = {
  amountCents: number;
  recurring: "month" | "year" | null;
  intervalCount?: number;
};

export function offerCheckoutShape(slug: OfferSlug): OfferCheckoutShape | null {
  switch (slug) {
    case "quick-look":
      return { amountCents: 4700, recurring: null };
    case "decision-sprint":
      return { amountCents: 9000, recurring: null };
    case "business-audit":
      return { amountCents: 49700, recurring: null };
    case "funnel-flip":
      return { amountCents: 25000, recurring: null };
    case "working-session":
      return { amountCents: 299700, recurring: null };
    case "sprint-4-week":
      return { amountCents: 999700, recurring: null };
    case "light-retainer":
      return { amountCents: 199700, recurring: "month" };
    case "power-bundle":
      return { amountCents: 149700, recurring: "month" };
    case "fb-ads":
      return { amountCents: 149700, recurring: "month" };
    case "monthly-operator":
      return { amountCents: 499700, recurring: "month" };
    case "annual-advisor":
      return { amountCents: 1875000, recurring: "month", intervalCount: 3 };
    default:
      return null;
  }
}

export function isOfferCheckoutEligible(slug: OfferSlug): boolean {
  return offerCheckoutShape(slug) !== null;
}
