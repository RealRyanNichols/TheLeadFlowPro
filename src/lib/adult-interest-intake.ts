export type CatalogItem<T extends string = string> = {
  id: T;
  label: string;
  description: string;
  scoreWeight: number;
};

export type ProblemCategoryId =
  | "business_growth"
  | "find_customers"
  | "save_time"
  | "make_more_money"
  | "compare_tools"
  | "local_service_need"
  | "career_or_skill"
  | "home_lifestyle"
  | "ai_automation"
  | "buy_or_sell_asset";

export type InterestId =
  | "business_services"
  | "ecommerce"
  | "software_ai"
  | "marketing_sales"
  | "local_providers"
  | "education_training"
  | "creator_tools"
  | "real_world_events"
  | "finance_education"
  | "product_research";

export type RequestTypeId =
  | "find_solution"
  | "get_recommendations"
  | "join_lead_brain"
  | "compare_options"
  | "buy_soon"
  | "submit_market_signal";

export type UrgencyId = "now" | "this_week" | "this_month" | "researching";
export type ContactPreferenceId = "email" | "text" | "phone" | "no_contact_yet";
export type BudgetRangeId = "unknown" | "under_100" | "100_500" | "500_2500" | "2500_plus";

export const PROBLEM_CATEGORIES: CatalogItem<ProblemCategoryId>[] = [
  {
    id: "business_growth",
    label: "My business feels stuck",
    description: "I need more customers, cleaner offers, better decisions, or a reason sales are not moving.",
    scoreWeight: 14
  },
  {
    id: "find_customers",
    label: "I need better leads",
    description: "I do not just need names. I need people with a reason to care right now.",
    scoreWeight: 16
  },
  {
    id: "save_time",
    label: "I am wasting time",
    description: "Something repetitive, messy, or manual is stealing hours I should not be losing.",
    scoreWeight: 11
  },
  {
    id: "make_more_money",
    label: "I need more money",
    description: "I need a clearer path to revenue, better buyers, higher-value work, or stronger pricing.",
    scoreWeight: 13
  },
  {
    id: "compare_tools",
    label: "Too many choices",
    description: "I am tired of comparing tools, services, platforms, vendors, or advice that all sounds the same.",
    scoreWeight: 10
  },
  {
    id: "local_service_need",
    label: "I need someone local",
    description: "I need a provider, quote, appointment, repair, route, or real-world help I can trust.",
    scoreWeight: 9
  },
  {
    id: "career_or_skill",
    label: "I need to level up",
    description: "I need a skill, mentor, training path, community, or practical next move.",
    scoreWeight: 8
  },
  {
    id: "home_lifestyle",
    label: "Daily life is harder than it should be",
    description: "I need better products, routines, services, plans, or recommendations that actually reduce friction.",
    scoreWeight: 7
  },
  {
    id: "ai_automation",
    label: "AI should be doing this",
    description: "I know a tool, agent, workflow, or automation should solve this, but I do not know the right setup.",
    scoreWeight: 15
  },
  {
    id: "buy_or_sell_asset",
    label: "I am evaluating an opportunity",
    description: "A site, store, route, domain, dataset, list, or deal might be worth money if the facts check out.",
    scoreWeight: 14
  }
];

export const INTERESTS: CatalogItem<InterestId>[] = [
  {
    id: "business_services",
    label: "Business services",
    description: "Vendors, agencies, operations, consulting, fulfillment, and B2B help I might actually use.",
    scoreWeight: 11
  },
  {
    id: "ecommerce",
    label: "Ecommerce",
    description: "Stores, products, suppliers, marketplaces, brands, weak points, and buyer signals.",
    scoreWeight: 12
  },
  {
    id: "software_ai",
    label: "Software and AI",
    description: "Tools, apps, automations, agents, SaaS, demos, and implementation support.",
    scoreWeight: 14
  },
  {
    id: "marketing_sales",
    label: "Marketing and sales",
    description: "Lead generation, ads, outreach, funnels, content, conversion, and real buying intent.",
    scoreWeight: 13
  },
  {
    id: "local_providers",
    label: "Local providers",
    description: "Local services, quotes, appointments, routes, repairs, and providers.",
    scoreWeight: 8
  },
  {
    id: "education_training",
    label: "Education and training",
    description: "Courses, coaching, skills, workshops, communities, playbooks, and direct help.",
    scoreWeight: 7
  },
  {
    id: "creator_tools",
    label: "Creator tools",
    description: "Channels, content systems, audiences, newsletters, video, and editing.",
    scoreWeight: 9
  },
  {
    id: "real_world_events",
    label: "Events and opportunities",
    description: "Local events, meetups, openings, demand spikes, and timely offers.",
    scoreWeight: 6
  },
  {
    id: "finance_education",
    label: "Money education",
    description: "Budgeting, business finance, pricing, taxes, cash flow, and education-only resources.",
    scoreWeight: 6
  },
  {
    id: "product_research",
    label: "Product research",
    description: "Buying guides, reviews, alternatives, comparisons, and honest recommendations.",
    scoreWeight: 8
  }
];

export const REQUEST_TYPES: CatalogItem<RequestTypeId>[] = [
  {
    id: "find_solution",
    label: "I need this fixed",
    description: "I have a real problem and want options that do not waste my time.",
    scoreWeight: 12
  },
  {
    id: "get_recommendations",
    label: "Tell me what fits",
    description: "I want tools, services, providers, or products that match what I am actually trying to do.",
    scoreWeight: 10
  },
  {
    id: "join_lead_brain",
    label: "Match me with the right thing",
    description: "Use what I answer here to find relevant matches, not random pitches.",
    scoreWeight: 13
  },
  {
    id: "compare_options",
    label: "Help me choose",
    description: "I am comparing options and need the difference made obvious.",
    scoreWeight: 9
  },
  {
    id: "buy_soon",
    label: "I may buy soon",
    description: "I am close enough that the right answer, list, provider, or offer could move me.",
    scoreWeight: 16
  },
  {
    id: "submit_market_signal",
    label: "I see a pattern",
    description: "I know a niche, demand spike, repeated problem, source, or opportunity worth tracking.",
    scoreWeight: 11
  }
];

export const URGENCIES: CatalogItem<UrgencyId>[] = [
  { id: "now", label: "It hurts now", description: "I need a useful answer as soon as possible.", scoreWeight: 18 },
  { id: "this_week", label: "This week", description: "I am actively looking this week.", scoreWeight: 13 },
  { id: "this_month", label: "This month", description: "I am planning or comparing options.", scoreWeight: 8 },
  { id: "researching", label: "I am watching it", description: "I want to learn before I act.", scoreWeight: 3 }
];

export const CONTACT_PREFERENCES: CatalogItem<ContactPreferenceId>[] = [
  { id: "email", label: "Email me", description: "Send useful matches or next steps by email.", scoreWeight: 4 },
  { id: "text", label: "Text me", description: "Text me if there is a relevant match.", scoreWeight: 5 },
  { id: "phone", label: "Call me", description: "Call me only for a strong match.", scoreWeight: 4 },
  { id: "no_contact_yet", label: "Do not contact me yet", description: "Save the response, but do not contact me yet.", scoreWeight: 0 }
];

export const BUDGET_RANGES: CatalogItem<BudgetRangeId>[] = [
  { id: "unknown", label: "I need to see the fit", description: "I need options before deciding.", scoreWeight: 2 },
  { id: "under_100", label: "Under $100", description: "Low-cost tool, guide, or starter option.", scoreWeight: 4 },
  { id: "100_500", label: "$100 to $500", description: "I can pay for the right solution.", scoreWeight: 8 },
  { id: "500_2500", label: "$500 to $2,500", description: "I have meaningful budget for the right fit.", scoreWeight: 12 },
  { id: "2500_plus", label: "$2,500+", description: "High-intent buyer or business problem.", scoreWeight: 16 }
];

export interface AdultInterestSelection {
  requestType: string;
  problemCategories: string[];
  interests: string[];
  urgency: string;
  budgetRange?: string | null;
  preferredContact: string;
  problemStatement: string;
  desiredOutcome: string;
  activeSearches?: string | null;
  adultConfirmed: boolean;
  consentAccepted: boolean;
  sensitiveDataAcknowledged: boolean;
}

export interface AdultInterestScore {
  problemFitScore: number;
  intentScore: number;
  contactScore: number;
  complianceScore: number;
  leadScore: number;
  segment: string;
  notes: string[];
}

function clampScore(value: number) {
  return Math.max(0, Math.min(100, Math.round(value)));
}

function scoreFor(items: CatalogItem[], id: string) {
  return items.find((item) => item.id === id)?.scoreWeight ?? 0;
}

export function estimateAdultInterest(selection: AdultInterestSelection): AdultInterestScore {
  const categoryWeight = selection.problemCategories.reduce((sum, id) => sum + scoreFor(PROBLEM_CATEGORIES, id), 0);
  const interestWeight = selection.interests.reduce((sum, id) => sum + scoreFor(INTERESTS, id), 0);
  const requestWeight = scoreFor(REQUEST_TYPES, selection.requestType);
  const urgencyWeight = scoreFor(URGENCIES, selection.urgency);
  const budgetWeight = selection.budgetRange ? scoreFor(BUDGET_RANGES, selection.budgetRange) : 0;
  const contactWeight = scoreFor(CONTACT_PREFERENCES, selection.preferredContact);
  const textDepth =
    selection.problemStatement.length > 160 ? 10 : selection.problemStatement.length > 70 ? 6 : 2;
  const outcomeDepth = selection.desiredOutcome.length > 120 ? 8 : selection.desiredOutcome.length > 50 ? 5 : 2;
  const activeSearchBonus = selection.activeSearches && selection.activeSearches.length > 30 ? 6 : 0;

  const problemFitScore = clampScore(25 + categoryWeight * 1.5 + interestWeight + textDepth + outcomeDepth);
  const intentScore = clampScore(24 + requestWeight * 2 + urgencyWeight * 2 + budgetWeight + activeSearchBonus);
  const contactScore = clampScore(40 + contactWeight * 7 + (selection.preferredContact === "no_contact_yet" ? -16 : 0));
  const complianceScore = clampScore(
    selection.adultConfirmed && selection.consentAccepted && selection.sensitiveDataAcknowledged ? 96 : 35
  );
  const leadScore = clampScore(
    problemFitScore * 0.32 + intentScore * 0.36 + contactScore * 0.12 + complianceScore * 0.2
  );

  const segment =
    leadScore >= 82
      ? "Strong signal"
      : leadScore >= 68
        ? "Clear problem"
        : leadScore >= 50
          ? "Watching and comparing"
          : "Needs a sharper answer";

  return {
    problemFitScore,
    intentScore,
    contactScore,
    complianceScore,
    leadScore,
    segment,
    notes: [
      leadScore >= 82
        ? "Strong signal: clear pain, real interest, timing, and a way to follow up."
        : "Useful but not sharp yet: ask what hurts, what they tried, and what would make them act.",
      selection.preferredContact === "no_contact_yet"
        ? "They are not ready for contact. Respect that and use the answer for signal only."
        : "Contact path is available if there is a relevant match.",
      "Keep the signal adult-only and avoid minors, protected traits, private addresses, medical details, and financial accounts."
    ]
  };
}

export function labelFor(items: CatalogItem[], id: string) {
  return items.find((item) => item.id === id)?.label ?? id;
}
