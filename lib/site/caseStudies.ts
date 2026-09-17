// Case studies for the agency and results pages.
//
// The rule: a case study renders only when `approved` is true and every
// metric on it is an approved claim (lib/site/claims.ts). An empty list
// renders nothing at all. No placeholder logos, no invented results, no
// testimonials. Facts here are the same ones lib/siteContent.ts FEATURED
// already publishes; nothing new is asserted.

import { approvedClaim, PREMIER_COMMON_OWNERSHIP, type ResolvedClaim } from "./claims";
import { EXTERNAL_LINKS } from "./external-links";

export type CaseStudy = {
  id: string;
  business: string;
  kind: "client" | "founder" | "common_ownership";
  kindLabel: string;
  industry: string;
  town: string;
  problem: string;
  built: string;
  ownedByClient: string;
  /** Claim ids from lib/site/claims.ts. Unapproved ids are dropped at render. */
  metricIds: string[];
  disclosure: string | null;
  href: string;
  shot: string;
  alt: string;
  approved: boolean;
};

export const CASE_STUDIES: readonly CaseStudy[] = [
  {
    id: "premier",
    business: "Premier Dental Academy of Longview",
    kind: "common_ownership",
    kindLabel: "Operating example",
    industry: "Dental assistant school",
    town: "Longview, Texas",
    problem:
      "Applications, payment conversations, and student records by hand, and software that still did not fit the way a school actually enrols.",
    built:
      "An enrollment engine: applications, payment plans, an interactive tuition planner, free training simulators as the top of the funnel, career tools, and a hiring partner directory. Every inquiry captured, every student record in a database the school owns.",
    ownedByClient: "The school owns the funnel, the student records, the tools students train on, and the accounts they run in.",
    metricIds: ["pda_leads_30d", "pda_meta_leads_30d", "pda_pageviews_30d"],
    disclosure: PREMIER_COMMON_OWNERSHIP,
    href: "/premier-system",
    shot: "/og/portfolio/premier-dental.jpg",
    alt: "Premier Dental Academy of Longview homepage showing the 12 week RDA program and enrollment contact details",
    approved: true,
  },
  {
    id: "lonestar",
    business: "Lone Star Total Wash",
    kind: "client",
    kindLabel: "Client system",
    industry: "Fleet and pressure washing",
    town: "East Texas",
    problem:
      "Fleet and pressure washing sold entirely by phone call and word of mouth. Nothing online said what they do, what it costs, or what finished work looks like.",
    built:
      "A mobile-first service site with a free quote request that reaches them instantly, a public price list, a completed-jobs gallery, and click to call.",
    ownedByClient: "Built in the owner's accounts on Next.js and Vercel. The site, the form, and the leads are theirs.",
    metricIds: [],
    disclosure: null,
    href: EXTERNAL_LINKS.loneStarTotalWash,
    shot: "/og/portfolio/lonestar.jpg",
    alt: "Lone Star Total Wash homepage with the fleet washing offer, free quote request, and company logo",
    approved: true,
  },
  {
    id: "realryannichols",
    business: "RealRyanNichols.com",
    kind: "founder",
    kindLabel: "Founder-built platform",
    industry: "Independent media",
    town: "East Texas",
    problem:
      "The audience and archive lived on platforms that could throttle reach, change the rules, or disconnect the owner from the people following the work.",
    built:
      "An independent media system with long-form publishing, a searchable archive of case profiles, intake forms, an AI assistant trained on the owner's writing, SMS alerts, and a store.",
    ownedByClient: "Ryan's own site, on his own domain, database, and infrastructure.",
    metricIds: ["rrn_case_profiles"],
    disclosure: "Ryan Nichols owns this platform. It is shown as a founder-built example, not a client result.",
    href: EXTERNAL_LINKS.realRyanNichols,
    shot: "/og/portfolio/realryannichols.jpg",
    alt: "RealRyanNichols.com homepage with the author profile and links into the searchable archive",
    approved: true,
  },
];

export type RenderableCaseStudy = CaseStudy & { metrics: ResolvedClaim[] };

/** Approved studies with their approved metrics. Anything else is dropped. */
export function renderableCaseStudies(now = new Date()): RenderableCaseStudy[] {
  return CASE_STUDIES.filter((c) => c.approved).map((c) => ({
    ...c,
    metrics: c.metricIds.map((id) => approvedClaim(id, now)).filter((m): m is ResolvedClaim => m !== null),
  }));
}
