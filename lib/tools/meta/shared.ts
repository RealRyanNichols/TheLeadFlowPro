// Industry sets that repeat across the general business tools.
//
// A missed-call calculator is genuinely useful to a roofer, a dentist and a law
// firm. Listing that out on twenty tools by hand drifts within a week, so the
// common groupings live here and the meta files compose them.

import type { Industry } from "../taxonomy";

/** Businesses where the phone ringing is how work arrives. */
export const PHONE_DRIVEN: Industry[] = [
  "general-contracting", "roofing", "plumbing", "electrical", "hvac", "landscaping",
  "pest-control", "cleaning", "remodeling", "auto-repair", "towing", "moving",
  "medical-practice", "dental-practice", "veterinary", "legal", "real-estate",
  "mortgage-lending", "insurance", "hair-salon", "nail-salon", "barbershop", "spa",
  "restaurant", "private-security", "pet-services", "fitness", "handyman",
];

/** Anyone who quotes a job before doing it. */
export const QUOTE_DRIVEN: Industry[] = [
  "general-contracting", "roofing", "plumbing", "electrical", "hvac", "landscaping",
  "pest-control", "cleaning", "remodeling", "painting", "flooring", "concrete",
  "moving", "photography", "wedding-services", "catering", "printing", "private-security",
  "handyman", "pool-service",
];

/** Businesses that sell time in a chair, a room or a slot. */
export const APPOINTMENT_DRIVEN: Industry[] = [
  "medical-practice", "dental-practice", "veterinary", "behavioral-health", "legal",
  "hair-salon", "nail-salon", "barbershop", "spa", "massage", "fitness", "auto-repair",
  "photography", "tutoring", "consulting",
];

/** Anyone running a business that spends money to get attention. */
export const ADVERTISERS: Industry[] = [
  ...PHONE_DRIVEN, "ecommerce", "retail", "saas", "marketing-agency", "consulting",
  "vacation-rental", "tourism", "auto-dealership", "creator-media",
];

/** The broad "any owner" set, for tools that are about running a business at all. */
export const ANY_BUSINESS: Industry[] = [
  ...PHONE_DRIVEN, "ecommerce", "retail", "saas", "it-services", "marketing-agency",
  "consulting", "accounting", "staffing", "manufacturing", "warehousing", "logistics",
  "trucking", "auto-dealership", "vacation-rental", "hotel", "tourism", "food-truck",
  "catering", "bar", "coffee-shop", "photography", "creator-media", "printing",
  "storage", "franchise", "nonprofit",
];

/** Deduplicate and keep the order stable so diffs stay readable. */
export const merge = (...groups: Industry[][]): Industry[] => {
  const seen = new Set<Industry>();
  const out: Industry[] = [];
  for (const g of groups) for (const i of g) if (!seen.has(i)) { seen.add(i); out.push(i); }
  return out;
};
