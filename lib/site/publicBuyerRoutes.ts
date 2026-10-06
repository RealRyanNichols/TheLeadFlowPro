import { CONSULTATION } from "./consultation";

export type BuyerQuery = Record<string, string | string[] | undefined>;

// Carry campaign attribution and scope choices, never answers from an old
// native-GET form. Keeping arbitrary query keys would perpetuate leaked PII.
const FORWARDED_KEYS = [
  "utm_source",
  "utm_medium",
  "utm_campaign",
  "utm_content",
  "utm_term",
  "gclid",
  "gbraid",
  "wbraid",
  "fbclid",
  "msclkid",
  "ttclid",
  "ref",
  "source",
  "campaign",
  "plan",
  "service",
  "interest",
] as const;

export function buyerHref(
  destination: string,
  incoming: BuyerQuery = {},
): string {
  const url = new URL(destination, "https://www.theleadflowpro.com");
  for (const key of FORWARDED_KEYS) {
    // A destination's deliberate scope selection takes precedence over an
    // older URL's selection. Repeated UTM values remain ordered.
    if (url.searchParams.has(key)) continue;
    const values = Array.isArray(incoming[key])
      ? incoming[key]
      : [incoming[key]];
    for (const value of values ?? []) {
      if (typeof value === "string" && value.trim())
        url.searchParams.append(key, value.trim().slice(0, 1000));
    }
  }
  return `${url.pathname}${url.search}${url.hash}`;
}

export function retiredBuyerDestination(
  route: "/book" | "/go/time-back" | "/go/lead-follow-up" | "/problem-intake",
  incoming: BuyerQuery = {},
): string {
  if (route === "/go/time-back") return buyerHref("/agency/content", incoming);
  if (route === "/go/lead-follow-up")
    return buyerHref("/agency/automation", incoming);
  if (route === "/problem-intake") return buyerHref("/diagnostic", incoming);
  if (incoming.interest === "workshop_founding")
    return buyerHref("/events#next-workshop", incoming);
  if (incoming.interest === "training_platform")
    return buyerHref("/add-ons?module=courses#build-request", incoming);
  return buyerHref(CONSULTATION.href, incoming);
}
