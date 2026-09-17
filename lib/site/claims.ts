// Approved public claims: every number the site shows about itself or about a
// business it runs, with the business it belongs to, where it came from, what
// it means, when it was measured, and when it must be checked again.
//
// Rules (from the project instructions):
//   - No invented testimonials, client counts, revenue, ROAS, rankings,
//     guarantees, or superlatives. Ever.
//   - Every public metric names a business, a source, a date range, and a
//     definition. Illustrative figures say "illustrative".
//   - Lead records are not unique people and not customers.
//   - A claim that is not `approved` renders nothing. A claim past its review
//     date still renders, with its as-of date, until Ryan retires or refreshes
//     it; `stale` lets a component say so.
//
// `scripts/refresh-claims.ts` refreshes the values it can read from public
// aggregate feeds and rewrites `asOf`. Values it cannot read stay manual.

export type ClaimBusiness = "leadflow" | "premier" | "realryannichols" | "lonestar";
export type ClaimStatus = "approved" | "needs_review" | "retired";

export type Claim = {
  id: string;
  /** The figure as displayed, e.g. "261" or "1,568+". */
  value: string;
  label: string;
  business: ClaimBusiness;
  /** Where the number was read from. */
  source: string;
  /** What is and is not being counted. */
  definition: string;
  /** Measurement window, e.g. "30 days ending 2026-09-01" or "current total". */
  window: string;
  /** YYYY-MM-DD, America/Chicago. */
  asOf: string;
  /** YYYY-MM-DD. After this date the claim is stale until refreshed. */
  reviewBy: string;
  status: ClaimStatus;
  /** Printed with the figure when present. */
  disclosure?: string;
  /** Set when a script can refresh the value from a public aggregate feed. */
  refresh?: { feed: "scoreboard"; business: string; metric: "leads" | "views"; days: 30 };
};

export const PREMIER_COMMON_OWNERSHIP =
  "Premier Dental Academy and The LeadFlow Pro share common ownership; this is an operating example, not an independent client testimonial or a promise of your results.";

export const LEAD_RECORD_DEFINITION =
  "Lead records can include inquiries and manually logged contacts; they are not unique customers or completed sales.";

export const CLAIMS: readonly Claim[] = [
  // ------------------------------------------------ Premier snapshot (PDA) --
  {
    id: "pda_leads_30d",
    value: "261",
    label: "Leads recorded · last 30 days",
    business: "premier",
    source: "Premier Dental Academy KPI Cockpit (Supabase), public-safe dashboard crop",
    definition: "Lead records created in the academy's own database over the window. Not unique people, not enrollments.",
    window: "30 days ending 2026-09-01",
    asOf: "2026-09-01",
    reviewBy: "2026-10-01",
    status: "approved",
    disclosure: PREMIER_COMMON_OWNERSHIP,
    refresh: { feed: "scoreboard", business: "premier-dental-academy-of-longview", metric: "leads", days: 30 },
  },
  {
    id: "pda_meta_leads_30d",
    value: "43",
    label: "From Facebook lead ads · last 30 days",
    business: "premier",
    source: "Premier Dental Academy KPI Cockpit, lead-source breakdown",
    definition: "Lead records whose source is a Meta lead ad form. Counted inside the 30-day lead figure.",
    window: "30 days ending 2026-09-01",
    asOf: "2026-09-01",
    reviewBy: "2026-10-01",
    status: "approved",
    disclosure: PREMIER_COMMON_OWNERSHIP,
  },
  {
    id: "pda_enrolled_students",
    value: "47",
    label: "Enrolled students · current database",
    business: "premier",
    source: "Premier Dental Academy student records (Supabase)",
    definition: "Student rows with an enrolled status at capture time. A current total, not a 30-day figure.",
    window: "current total at capture",
    asOf: "2026-09-01",
    reviewBy: "2026-10-01",
    status: "approved",
    disclosure: PREMIER_COMMON_OWNERSHIP,
  },
  {
    id: "pda_email_subscribers",
    value: "853",
    label: "Email subscribers · current list",
    business: "premier",
    source: "Premier Dental Academy email list count",
    definition: "Subscribed addresses on the academy's own list at capture time.",
    window: "current total at capture",
    asOf: "2026-09-01",
    reviewBy: "2026-10-01",
    status: "approved",
    disclosure: PREMIER_COMMON_OWNERSHIP,
  },
  {
    id: "pda_pageviews_30d",
    value: "3,211",
    label: "First-party pageviews · last 30 days",
    business: "premier",
    source: "Premier Dental Academy first-party analytics",
    definition: "Page views recorded by the academy's own analytics over the window.",
    window: "30 days ending 2026-09-01",
    asOf: "2026-09-01",
    reviewBy: "2026-10-01",
    status: "approved",
    disclosure: PREMIER_COMMON_OWNERSHIP,
    refresh: { feed: "scoreboard", business: "premier-dental-academy-of-longview", metric: "views", days: 30 },
  },
  {
    id: "pda_revenue_logged",
    value: "$2,642*",
    label: "Revenue logged · Supabase snapshot",
    business: "premier",
    source: "Premier Dental Academy Supabase revenue subtotal",
    definition: "*Revenue logged in the academy's database at capture. Square remains the academy's payment source of truth.",
    window: "logged total at capture",
    asOf: "2026-09-01",
    reviewBy: "2026-10-01",
    status: "approved",
    disclosure: PREMIER_COMMON_OWNERSHIP,
  },

  // ------------------------------------------------------ LeadFlow counts --
  {
    id: "lfp_live_systems",
    value: "8",
    label: "live systems shipped and running right now",
    business: "leadflow",
    source: "Repository portfolio: publicly inspectable sites and products (lib/siteContent.ts, /portfolio)",
    definition: "Publicly reachable systems built or run by The LeadFlow Pro. Counted by hand from the portfolio.",
    window: "current count",
    asOf: "2026-09-06",
    reviewBy: "2026-10-06",
    status: "approved",
  },
  {
    id: "lfp_industries",
    value: "6",
    label: "industries represented, from local service to software",
    business: "leadflow",
    source: "Repository portfolio (lib/siteContent.ts)",
    definition: "Distinct industries across the portfolio entries.",
    window: "current count",
    asOf: "2026-09-06",
    reviewBy: "2026-10-06",
    status: "approved",
  },
  {
    id: "lfp_software_products",
    value: "4",
    label: "real software products running on the owned stack",
    business: "leadflow",
    source: "Repository: tools library, Pro Kits, SellerProof, the Plugin",
    definition: "Products with their own checkout or access path in this repository.",
    window: "current count",
    asOf: "2026-09-16",
    reviewBy: "2026-10-16",
    status: "approved",
  },
  {
    id: "lfp_owned_accounts",
    value: "100%",
    label: "built in accounts the client controls",
    business: "leadflow",
    source: "Engagement terms (/free-build, /packages)",
    definition: "Every client build is deployed in accounts the client owns. A policy statement, not a measurement.",
    window: "policy",
    asOf: "2026-09-06",
    reviewBy: "2026-12-01",
    status: "approved",
  },

  // ---------------------------------------------------- RealRyanNichols --
  {
    id: "rrn_case_profiles",
    value: "1,568+",
    label: "case profiles in the searchable archive",
    business: "realryannichols",
    source: "RealRyanNichols.com archive count",
    definition: "Published profile records in the site's own database at capture.",
    window: "current total at capture",
    asOf: "2026-09-06",
    reviewBy: "2026-10-06",
    status: "approved",
  },

  // ----------------------------------------------------- vendor pricing --
  {
    id: "vendor_reference_prices",
    value: "checked",
    label: "Reference prices checked",
    business: "leadflow",
    source: "Vendor public pricing pages linked beside each figure",
    definition: "Published list prices for comparison only. Vendors change plans and usage fees.",
    window: "spot check",
    asOf: "2026-09-01",
    reviewBy: "2026-10-01",
    status: "approved",
  },
];

export type ResolvedClaim = Claim & { stale: boolean; asOfLabel: string };

function isoDay(now: Date): string {
  const f = new Intl.DateTimeFormat("en-CA", {
    timeZone: "America/Chicago",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  });
  return f.format(now);
}

/** "September 1, 2026" */
export function claimDateLabel(iso: string): string {
  const [y, m, d] = iso.split("-").map(Number);
  return new Date(Date.UTC(y, m - 1, d, 12)).toLocaleDateString("en-US", {
    timeZone: "UTC",
    month: "long",
    day: "numeric",
    year: "numeric",
  });
}

/** An approved claim, or null. Never a placeholder. */
export function approvedClaim(id: string, now = new Date()): ResolvedClaim | null {
  const claim = CLAIMS.find((c) => c.id === id);
  if (!claim || claim.status !== "approved") return null;
  return { ...claim, stale: isoDay(now) > claim.reviewBy, asOfLabel: claimDateLabel(claim.asOf) };
}

/** Every approved claim for a business, in declaration order. */
export function approvedClaims(business: ClaimBusiness, now = new Date()): ResolvedClaim[] {
  return CLAIMS.filter((c) => c.business === business && c.status === "approved").map(
    (c) => approvedClaim(c.id, now) as ResolvedClaim,
  );
}
