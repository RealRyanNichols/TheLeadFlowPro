// The honest relevance layer over the tool catalog.
//
// Every tool carries a generous `industries` list so search can always fall
// back to "could this ever help". That list is the wrong thing to count. A
// generic QR maker can absolutely help a mortgage lender, but that does not
// make it a mortgage tool, and a collection page that claims 74 "home services
// tools" because most of the catalog could theoretically serve a plumber is
// lying with math.
//
// This file is the strict reading. For each published slug:
//
// - coreIndustries: only industries the tool was genuinely built for. The
//   name, the fields and the formula speak that industry's language as the
//   main job. Most of the catalog is generic business math, so most tools
//   have an empty core list, and that is correct.
// - secondaryIndustries: strongly related. The tool ships a preset for the
//   industry, or its copy addresses it by name. Kept tight on purpose.
// - broadlyUseful: almost any business (or household, for the home and
//   family batch) gets value. These show under "Broadly useful" and are
//   never counted as core anywhere.
// - collectionPriority: 0 to 100 ordering inside a collection tier, seeded
//   from hand-ranked popularity and nudged up where the core fit is real.
// - collectionReason: one honest line for anything claiming core or
//   secondary standing. Pure broadly-useful tools do not need an excuse.
//
// Collections and industry ranking read this file. Search keeps the generous
// list as its last resort. Nothing here changes a tool, only how it counts.

import type { ToolRelevance } from "./types";
import type { Industry } from "./taxonomy";

export const TOOL_RELEVANCE: Record<string, ToolRelevance> = {
  /* ------------------------------- leads --------------------------------- */

  "missed-call-calculator": {
    coreIndustries: [],
    secondaryIndustries: [
      "legal", "dental-practice", "medical-practice", "real-estate", "mortgage-lending",
      "hvac", "plumbing", "electrical", "roofing", "restaurant", "hair-salon",
      "barbershop", "private-security", "auto-dealership", "tourism",
    ],
    broadlyUseful: true,
    collectionPriority: 98,
    collectionReason: "Ships fifteen industry presets, each carrying that industry's real call volume and ticket size.",
  },

  "lead-response-time": {
    coreIndustries: [],
    secondaryIndustries: ["real-estate", "mortgage-lending", "legal", "hvac", "consulting"],
    broadlyUseful: true,
    collectionPriority: 92,
    collectionReason: "Presets model how fast portal leads, rate shoppers and emergency calls go cold in each business.",
  },

  "lead-value-calculator": {
    coreIndustries: [],
    secondaryIndustries: ["mortgage-lending", "real-estate", "roofing", "dental-practice", "hvac"],
    broadlyUseful: true,
    collectionPriority: 90,
    collectionReason: "Presets carry each industry's real close rates and ticket sizes, from funded loans to new roofs.",
  },

  "cost-per-lead-calculator": {
    coreIndustries: [],
    secondaryIndustries: [],
    broadlyUseful: true,
    collectionPriority: 84,
  },

  "no-show-calculator": {
    coreIndustries: [
      "medical-practice", "dental-practice", "hair-salon", "nail-salon", "barbershop",
      "spa", "massage", "legal", "behavioral-health", "veterinary",
    ],
    secondaryIndustries: ["auto-repair", "restaurant", "fitness", "tutoring", "tourism"],
    broadlyUseful: false,
    collectionPriority: 86,
    collectionReason: "Built around empty booked slots, the daily loss for anyone who sells time in a chair or a room.",
  },

  "quote-follow-up-calculator": {
    coreIndustries: [],
    secondaryIndustries: [
      "general-contracting", "roofing", "remodeling", "hvac", "plumbing",
      "mortgage-lending", "insurance", "real-estate",
    ],
    broadlyUseful: false,
    collectionPriority: 80,
    collectionReason: "Speaks to open estimates and open applications, the quoted work sitting on a desk waiting on a call.",
  },

  "close-rate-calculator": {
    coreIndustries: [],
    secondaryIndustries: [],
    broadlyUseful: true,
    collectionPriority: 76,
  },

  "lead-goal-planner": {
    coreIndustries: [],
    secondaryIndustries: [],
    broadlyUseful: true,
    collectionPriority: 82,
  },

  "capacity-calculator": {
    coreIndustries: [],
    secondaryIndustries: [
      "general-contracting", "hvac", "landscaping", "cleaning", "moving",
      "trucking", "auto-repair", "hair-salon",
    ],
    broadlyUseful: false,
    collectionPriority: 72,
    collectionReason: "Counts crews, chairs, bays and trucks, which is how service businesses actually measure a full week.",
  },

  "after-hours-lead-calculator": {
    coreIndustries: [],
    secondaryIndustries: [],
    broadlyUseful: true,
    collectionPriority: 74,
  },

  /* ------------------------------- money --------------------------------- */

  "hourly-rate-calculator": {
    coreIndustries: [],
    secondaryIndustries: ["general-contracting", "consulting", "photography", "cleaning", "massage"],
    broadlyUseful: true,
    collectionPriority: 94,
    collectionReason: "Presets show what billable time really looks like for trades, consultants, photographers and cleaners.",
  },

  "job-price-calculator": {
    coreIndustries: [
      "general-contracting", "roofing", "plumbing", "electrical", "hvac",
      "landscaping", "remodeling", "painting", "handyman",
    ],
    secondaryIndustries: ["cleaning", "flooring", "concrete", "pest-control", "pool-service"],
    broadlyUseful: false,
    collectionPriority: 96,
    collectionReason: "Materials, waste, crew hours and drive time is trade estimating language from top to bottom.",
  },

  "profit-margin-calculator": {
    coreIndustries: [],
    secondaryIndustries: ["restaurant", "retail", "ecommerce", "hvac"],
    broadlyUseful: true,
    collectionPriority: 89,
    collectionReason: "Presets cover plate cost, keystone retail and job margin, the three ways this math gets used.",
  },

  "markup-vs-margin": {
    coreIndustries: [],
    secondaryIndustries: ["retail", "ecommerce", "general-contracting"],
    broadlyUseful: true,
    collectionPriority: 86,
    collectionReason: "The buy-at-one-price, sell-at-another mistake lives mostly in retail, ecommerce and the trades.",
  },

  "break-even-calculator": {
    coreIndustries: [],
    secondaryIndustries: ["restaurant", "hair-salon", "hvac", "fitness"],
    broadlyUseful: true,
    collectionPriority: 85,
    collectionReason: "Presets carry the fixed-cost shape of a restaurant, a salon, a trades company and a gym.",
  },

  "price-increase-impact": {
    coreIndustries: [],
    secondaryIndustries: [],
    broadlyUseful: true,
    collectionPriority: 83,
  },

  "discount-damage-calculator": {
    coreIndustries: [],
    secondaryIndustries: [],
    broadlyUseful: true,
    collectionPriority: 80,
  },

  "customer-lifetime-value": {
    coreIndustries: [],
    secondaryIndustries: ["dental-practice", "hair-salon", "landscaping", "restaurant", "hvac"],
    broadlyUseful: true,
    collectionPriority: 84,
    collectionReason: "Presets model repeat visits for the industries where the second appointment is the whole business.",
  },

  "payment-plan-calculator": {
    coreIndustries: [],
    secondaryIndustries: [],
    broadlyUseful: true,
    collectionPriority: 76,
  },

  "loan-payment-calculator": {
    coreIndustries: [],
    secondaryIndustries: ["mortgage-lending", "trucking", "agriculture"],
    broadlyUseful: true,
    collectionPriority: 88,
    collectionReason: "Equipment and vehicle notes are the main job; the same amortization answers a mortgage question too.",
  },

  "late-invoice-calculator": {
    coreIndustries: [],
    secondaryIndustries: [],
    broadlyUseful: true,
    collectionPriority: 74,
  },

  "cash-runway-calculator": {
    coreIndustries: [],
    secondaryIndustries: [],
    broadlyUseful: true,
    collectionPriority: 79,
  },

  "sales-tax-calculator": {
    coreIndustries: [],
    secondaryIndustries: ["retail", "restaurant", "ecommerce"],
    broadlyUseful: true,
    collectionPriority: 77,
    collectionReason: "Adding tax and backing it out is counter work for retail, restaurants and online sellers.",
  },

  "quarterly-tax-estimator": {
    coreIndustries: [],
    secondaryIndustries: ["personal-finance"],
    broadlyUseful: true,
    collectionPriority: 81,
    collectionReason: "Set-aside math for 1099 income, which is a personal finance problem as much as a business one.",
  },

  "mileage-deduction-calculator": {
    coreIndustries: [],
    secondaryIndustries: ["real-estate", "trucking", "logistics"],
    broadlyUseful: true,
    collectionPriority: 75,
    collectionReason: "Business miles pile up fastest for agents, drivers and anyone whose office is a truck.",
  },

  "employee-true-cost": {
    coreIndustries: [],
    secondaryIndustries: [],
    broadlyUseful: true,
    collectionPriority: 82,
  },

  "hire-vs-automate": {
    coreIndustries: [],
    secondaryIndustries: [],
    broadlyUseful: true,
    collectionPriority: 72,
  },

  "overtime-cost-calculator": {
    coreIndustries: [],
    secondaryIndustries: ["fire-ems", "law-enforcement", "public-safety", "private-security"],
    broadlyUseful: true,
    collectionPriority: 78,
    collectionReason: "Written to reach shift coverage in public safety and security, where overtime is the budget line.",
  },

  /* ---------------------------- operations ------------------------------- */

  "rent-receipt": {
    coreIndustries: [],
    secondaryIndustries: [],
    broadlyUseful: true,
    collectionPriority: 87,
  },

  "credit-card-fee-calculator": {
    coreIndustries: [],
    secondaryIndustries: [],
    broadlyUseful: true,
    collectionPriority: 76,
  },

  "platform-fee-calculator": {
    coreIndustries: [],
    secondaryIndustries: ["vacation-rental", "restaurant", "general-contracting", "ecommerce"],
    broadlyUseful: true,
    collectionPriority: 79,
    collectionReason: "Presets model delivery apps, booking sites, lead sellers and marketplaces, each with its real take rate.",
  },

  "per-seat-cost-calculator": {
    coreIndustries: [],
    secondaryIndustries: [],
    broadlyUseful: true,
    collectionPriority: 70,
  },

  "downtime-cost-calculator": {
    coreIndustries: [],
    secondaryIndustries: [],
    broadlyUseful: true,
    collectionPriority: 68,
  },

  "equipment-buy-vs-rent": {
    coreIndustries: [],
    secondaryIndustries: [
      "general-contracting", "concrete", "landscaping", "agriculture",
      "manufacturing", "event-venue",
    ],
    broadlyUseful: false,
    collectionPriority: 74,
    collectionReason: "Rent-versus-own math only comes up where the machine is the job: construction, dirt work and events.",
  },

  "roas-calculator": {
    coreIndustries: [],
    secondaryIndustries: [],
    broadlyUseful: true,
    collectionPriority: 85,
  },

  "ad-budget-planner": {
    coreIndustries: [],
    secondaryIndustries: ["roofing", "mortgage-lending", "dental-practice", "hvac", "legal"],
    broadlyUseful: true,
    collectionPriority: 83,
    collectionReason: "Presets carry real cost-per-lead and close rates for roofs, loans, patients and cases.",
  },

  "cac-payback-calculator": {
    coreIndustries: [],
    secondaryIndustries: ["saas", "fitness", "it-services", "pest-control", "landscaping", "cleaning"],
    broadlyUseful: false,
    collectionPriority: 69,
    collectionReason: "Payback periods only matter where customers pay over time: memberships, retainers and route work.",
  },

  "ad-test-budget-calculator": {
    coreIndustries: [],
    secondaryIndustries: [],
    broadlyUseful: true,
    collectionPriority: 62,
  },

  "commission-calculator": {
    coreIndustries: ["real-estate", "auto-dealership", "insurance"],
    secondaryIndustries: ["mortgage-lending", "roofing", "staffing", "saas"],
    broadlyUseful: false,
    collectionPriority: 83,
    collectionReason: "Commission plans are the pay structure in real estate, car sales and insurance, not a side detail.",
  },

  "admin-time-audit": {
    coreIndustries: [],
    secondaryIndustries: [],
    broadlyUseful: true,
    collectionPriority: 73,
  },

  "task-automation-savings": {
    coreIndustries: [],
    secondaryIndustries: [],
    broadlyUseful: true,
    collectionPriority: 72,
  },

  "cost-per-mile-calculator": {
    coreIndustries: [],
    secondaryIndustries: [
      "trucking", "logistics", "moving", "towing", "general-contracting",
      "landscaping", "plumbing", "hvac",
    ],
    broadlyUseful: false,
    collectionPriority: 76,
    collectionReason: "Per-mile costing for the work truck, aimed at drivers and trades quoting jobs out of town.",
  },

  "drive-time-cost": {
    coreIndustries: [],
    secondaryIndustries: [
      "general-contracting", "plumbing", "hvac", "electrical", "landscaping",
      "pest-control", "pool-service", "home-health",
    ],
    broadlyUseful: false,
    collectionPriority: 67,
    collectionReason: "Windshield time is the mobile trades' problem: hours between jobs that nobody can bill.",
  },

  "meeting-cost-calculator": {
    coreIndustries: [],
    secondaryIndustries: [],
    broadlyUseful: true,
    collectionPriority: 75,
  },

  "owner-hourly-worth": {
    coreIndustries: [],
    secondaryIndustries: [],
    broadlyUseful: true,
    collectionPriority: 80,
  },

  /* ------------------------------- growth -------------------------------- */

  "google-review-link": {
    coreIndustries: [],
    secondaryIndustries: [],
    broadlyUseful: true,
    collectionPriority: 93,
  },

  "review-goal-calculator": {
    coreIndustries: [],
    secondaryIndustries: ["restaurant", "hvac", "dental-practice", "auto-repair"],
    broadlyUseful: true,
    collectionPriority: 78,
    collectionReason: "Presets show how fast a rating moves in high-volume and low-volume review industries.",
  },

  "bad-review-impact": {
    coreIndustries: [],
    secondaryIndustries: [],
    broadlyUseful: true,
    collectionPriority: 76,
  },

  "review-response-writer": {
    coreIndustries: [],
    secondaryIndustries: [],
    broadlyUseful: true,
    collectionPriority: 82,
  },

  "website-speed-money": {
    coreIndustries: [],
    secondaryIndustries: [],
    broadlyUseful: true,
    collectionPriority: 80,
  },

  "conversion-lift-calculator": {
    coreIndustries: [],
    secondaryIndustries: [],
    broadlyUseful: true,
    collectionPriority: 77,
  },

  "mobile-traffic-loss": {
    coreIndustries: [],
    secondaryIndustries: [],
    broadlyUseful: true,
    collectionPriority: 73,
  },

  "seo-traffic-value": {
    coreIndustries: [],
    secondaryIndustries: [],
    broadlyUseful: true,
    collectionPriority: 74,
  },

  "website-grader": {
    coreIndustries: [],
    secondaryIndustries: [],
    broadlyUseful: true,
    collectionPriority: 86,
  },

  "google-business-profile-scorecard": {
    coreIndustries: [],
    secondaryIndustries: [],
    broadlyUseful: true,
    collectionPriority: 84,
  },

  "form-friction-calculator": {
    coreIndustries: [],
    secondaryIndustries: [],
    broadlyUseful: true,
    collectionPriority: 75,
  },

  /* ----------------------------- generators ------------------------------ */

  "qr-code-maker": {
    coreIndustries: [],
    secondaryIndustries: [],
    broadlyUseful: true,
    collectionPriority: 96,
  },

  "wifi-qr-code": {
    coreIndustries: [],
    secondaryIndustries: ["restaurant", "coffee-shop", "bar", "hotel", "vacation-rental"],
    broadlyUseful: true,
    collectionPriority: 88,
    collectionReason: "Guest wifi on a printed card is a lobby, table and rental turnover problem first.",
  },

  "digital-business-card": {
    coreIndustries: [],
    secondaryIndustries: [],
    broadlyUseful: true,
    collectionPriority: 85,
  },

  "click-to-call-button": {
    coreIndustries: [],
    secondaryIndustries: [],
    broadlyUseful: true,
    collectionPriority: 81,
  },

  "sms-link-generator": {
    coreIndustries: [],
    secondaryIndustries: [],
    broadlyUseful: true,
    collectionPriority: 79,
  },

  "utm-link-builder": {
    coreIndustries: [],
    secondaryIndustries: [],
    broadlyUseful: true,
    collectionPriority: 83,
  },

  "email-signature-generator": {
    coreIndustries: [],
    secondaryIndustries: [],
    broadlyUseful: true,
    collectionPriority: 78,
  },

  "missed-call-textback-script": {
    coreIndustries: [],
    secondaryIndustries: [],
    broadlyUseful: true,
    collectionPriority: 87,
  },

  "review-request-script": {
    coreIndustries: [],
    secondaryIndustries: [],
    broadlyUseful: true,
    collectionPriority: 84,
  },

  "estimate-terms-generator": {
    coreIndustries: [
      "general-contracting", "roofing", "plumbing", "electrical", "hvac",
      "landscaping", "remodeling", "painting", "handyman",
    ],
    secondaryIndustries: ["flooring", "concrete", "pool-service", "pest-control", "cleaning"],
    broadlyUseful: false,
    collectionPriority: 82,
    collectionReason: "Deposits, change orders and scope language are contractor paperwork, written in contractor terms.",
  },

  "late-payment-language": {
    coreIndustries: [],
    secondaryIndustries: [],
    broadlyUseful: true,
    collectionPriority: 74,
  },

  "cancellation-policy-generator": {
    coreIndustries: [
      "medical-practice", "dental-practice", "hair-salon", "nail-salon", "barbershop",
      "spa", "massage", "behavioral-health", "veterinary",
    ],
    secondaryIndustries: [
      "fitness", "pet-services", "childcare", "event-venue", "wedding-services",
      "vacation-rental", "tourism", "restaurant",
    ],
    broadlyUseful: false,
    collectionPriority: 83,
    collectionReason: "Protects booked time, which is the inventory of every appointment business.",
  },

  "localbusiness-schema-generator": {
    coreIndustries: [],
    secondaryIndustries: [],
    broadlyUseful: true,
    collectionPriority: 72,
  },

  "faq-schema-generator": {
    coreIndustries: [],
    secondaryIndustries: [],
    broadlyUseful: true,
    collectionPriority: 68,
  },

  "meta-title-description-writer": {
    coreIndustries: [],
    secondaryIndustries: [],
    broadlyUseful: true,
    collectionPriority: 75,
  },

  "ad-character-counter": {
    coreIndustries: [],
    secondaryIndustries: [],
    broadlyUseful: true,
    collectionPriority: 66,
  },

  "google-maps-link-generator": {
    coreIndustries: [],
    secondaryIndustries: [],
    broadlyUseful: true,
    collectionPriority: 71,
  },

  "add-to-calendar-link": {
    coreIndustries: [],
    secondaryIndustries: ["event-venue", "church", "nonprofit", "k12-school", "tourism"],
    broadlyUseful: true,
    collectionPriority: 70,
    collectionReason: "Events, services and class schedules are where a calendar link earns its keep.",
  },

  "voicemail-script-generator": {
    coreIndustries: [],
    secondaryIndustries: [],
    broadlyUseful: true,
    collectionPriority: 69,
  },

  "job-post-writer": {
    coreIndustries: [],
    secondaryIndustries: ["staffing"],
    broadlyUseful: true,
    collectionPriority: 73,
    collectionReason: "Any owner hiring can use it, and writing postings all day is literally the staffing trade.",
  },

  "google-post-writer": {
    coreIndustries: [],
    secondaryIndustries: [],
    broadlyUseful: true,
    collectionPriority: 71,
  },

  "robots-txt-generator": {
    coreIndustries: [],
    secondaryIndustries: [],
    broadlyUseful: true,
    collectionPriority: 60,
  },

  /* --------------------------- home and family --------------------------- */

  "household-budget-planner": {
    coreIndustries: ["household", "personal-finance"],
    secondaryIndustries: [],
    broadlyUseful: true,
    collectionPriority: 90,
    collectionReason: "Built for the household ledger: rent, groceries, and where the paycheck actually goes.",
  },

  "grocery-unit-price-calculator": {
    coreIndustries: ["household"],
    secondaryIndustries: ["personal-finance"],
    broadlyUseful: true,
    collectionPriority: 79,
    collectionReason: "Price-per-unit math for the store aisle, which is household shopping work.",
  },

  "childcare-vs-work-calculator": {
    coreIndustries: ["household", "personal-finance"],
    secondaryIndustries: ["childcare"],
    broadlyUseful: false,
    collectionPriority: 84,
    collectionReason: "Built for one family decision: what a second income really nets after childcare.",
  },

  "subscription-audit": {
    coreIndustries: ["household", "personal-finance"],
    secondaryIndustries: [],
    broadlyUseful: true,
    collectionPriority: 85,
    collectionReason: "Built for the family card statement and everything quietly charging it.",
  },

  "emergency-fund-calculator": {
    coreIndustries: ["personal-finance", "household"],
    secondaryIndustries: [],
    broadlyUseful: true,
    collectionPriority: 87,
    collectionReason: "A cushion measured in months of household expenses is personal finance at its most basic.",
  },

  "debt-payoff-planner": {
    coreIndustries: ["personal-finance", "household"],
    secondaryIndustries: [],
    broadlyUseful: true,
    collectionPriority: 88,
    collectionReason: "Built around personal balances and what an extra payment does to the payoff date.",
  },

  "rent-affordability-estimator": {
    coreIndustries: ["household", "personal-finance"],
    secondaryIndustries: ["real-estate"],
    broadlyUseful: false,
    collectionPriority: 82,
    collectionReason: "Built for a renter's decision, with a nod to the agents who get asked the same question.",
  },

  "salary-to-hourly-converter": {
    coreIndustries: ["personal-finance"],
    secondaryIndustries: ["staffing", "household"],
    broadlyUseful: true,
    collectionPriority: 81,
    collectionReason: "Built for comparing pay offers, which is personal money math recruiters also run daily.",
  },
};

/**
 * How strongly one tool belongs to one industry, read only from the table
 * above. "core" and "secondary" are earned; "broad" means the tool helps
 * almost anyone and should never be counted as an industry tool; "none"
 * means the collection should not show it at all.
 *
 * Deliberately does not import the registry, so collections and search can
 * use it without a dependency cycle.
 */
export function relevanceTier(
  slug: string,
  industry: Industry,
): "core" | "secondary" | "broad" | "none" {
  const r = TOOL_RELEVANCE[slug];
  if (!r) return "none";
  if (r.coreIndustries.includes(industry)) return "core";
  if (r.secondaryIndustries.includes(industry)) return "secondary";
  if (r.broadlyUseful) return "broad";
  return "none";
}
