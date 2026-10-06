import type { Inquiry } from "./engine.ts";

export type InquiryRequestDetails = Omit<
  Inquiry,
  "requestId" | "contactConsent"
> & {
  contactConsent: boolean;
};
export type InquiryAttempt = { requestId: string; fingerprint: string };

// Match the API's text normalization and the SQL dedup semantics. Coverage
// sets are unordered, and a radius has no meaning for state/national requests.
export function inquiryRequestFingerprint(
  details: InquiryRequestDetails,
): string {
  return JSON.stringify({
    name: details.name.trim(),
    email: details.email.trim().toLowerCase(),
    business: details.business.trim(),
    industry: details.industry,
    services: [...new Set(details.services)].sort(),
    market: details.market.trim().toLowerCase(),
    scope: details.scope,
    states:
      details.scope === "states" ? [...new Set(details.states)].sort() : [],
    miles: details.scope === "local" ? details.miles : null,
    publicConsent: details.publicConsent,
    contactConsent: details.contactConsent,
  });
}

export function inquiryAttempt(
  details: InquiryRequestDetails,
  previous: InquiryAttempt | null,
  createId: () => string,
): InquiryAttempt {
  const fingerprint = inquiryRequestFingerprint(details);
  return previous?.fingerprint === fingerprint
    ? previous
    : { requestId: createId(), fingerprint };
}
