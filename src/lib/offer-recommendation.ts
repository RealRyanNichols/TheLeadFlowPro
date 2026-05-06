import type { OfferSlug } from "./offers";

export type PrimaryNeed =
  | "next-post"
  | "one-decision"
  | "audit"
  | "working-session"
  | "managed-social"
  | "ads"
  | "operator"
  | "advisor";

export type WorkStyle =
  | "quick-answer"
  | "written-review"
  | "hands-on-build"
  | "done-for-you"
  | "advisor";

export type BudgetTier =
  | "under-100"
  | "100-500"
  | "500-2000"
  | "2000-5000"
  | "5000-10000"
  | "10000-plus";

export type Urgency = "today" | "this-week" | "this-month" | "planning";

export const PRIMARY_NEED_OPTIONS: Array<{
  value: PrimaryNeed;
  title: string;
  body: string;
}> = [
  {
    value: "next-post",
    title: "Tell me what to post next",
    body: "You need one sharp move, not a full strategy engagement.",
  },
  {
    value: "one-decision",
    title: "Unstick one business decision",
    body: "Pricing, offer, funnel, platform, hire, launch, or sales process.",
  },
  {
    value: "audit",
    title: "Show me what is leaking",
    body: "You want the whole picture in writing before you spend bigger.",
  },
  {
    value: "working-session",
    title: "Build one thing with me",
    body: "A funnel, landing page, offer, content engine, CRM flow, or launch asset.",
  },
  {
    value: "managed-social",
    title: "Run my social content",
    body: "You want the platforms fed consistently without building the machine alone.",
  },
  {
    value: "ads",
    title: "Fix or launch Meta ads",
    body: "You have ad budget and need leads tracked instead of money burned.",
  },
  {
    value: "operator",
    title: "Bring Ryan into operations",
    body: "You need monthly operator help across systems, sales, social, and decisions.",
  },
  {
    value: "advisor",
    title: "Board-level advisor",
    body: "You want high-level business counsel with limited seats and direct access.",
  },
];

export const WORK_STYLE_OPTIONS: Array<{
  value: WorkStyle;
  title: string;
  body: string;
}> = [
  {
    value: "quick-answer",
    title: "Quick answer",
    body: "Point me at the next move and let me execute.",
  },
  {
    value: "written-review",
    title: "Written review",
    body: "Give me a document I can work from and revisit.",
  },
  {
    value: "hands-on-build",
    title: "Hands-on build",
    body: "Sit with me and ship a real asset.",
  },
  {
    value: "done-for-you",
    title: "Done-for-you",
    body: "I want the work handled and reported back.",
  },
  {
    value: "advisor",
    title: "Advisor access",
    body: "I want Ryan in the room for decisions over time.",
  },
];

export const BUDGET_OPTIONS: Array<{
  value: BudgetTier;
  title: string;
  body: string;
}> = [
  { value: "under-100", title: "Under $100", body: "Start small and get direction." },
  { value: "100-500", title: "$100-$500", body: "A sprint or written audit makes sense." },
  { value: "500-2000", title: "$500-$2,000", body: "Ready for managed work or deeper review." },
  { value: "2000-5000", title: "$2,000-$5,000", body: "Ready for a build, ads, or operator help." },
  { value: "5000-10000", title: "$5,000-$10,000", body: "Ready for a serious sprint." },
  { value: "10000-plus", title: "$10,000+", body: "Advisor or larger build budget." },
];

export const URGENCY_OPTIONS: Array<{
  value: Urgency;
  title: string;
  body: string;
}> = [
  { value: "today", title: "Today", body: "I need the next click now." },
  { value: "this-week", title: "This week", body: "I am ready to move." },
  { value: "this-month", title: "This month", body: "I am comparing the right fit." },
  { value: "planning", title: "Planning", body: "I am mapping the path before spending." },
];

export const VALID_BUDGET_TIERS = new Set(BUDGET_OPTIONS.map((o) => o.value));
export const VALID_PRIMARY_NEEDS = new Set(PRIMARY_NEED_OPTIONS.map((o) => o.value));
export const VALID_WORK_STYLES = new Set(WORK_STYLE_OPTIONS.map((o) => o.value));
export const VALID_URGENCIES = new Set(URGENCY_OPTIONS.map((o) => o.value));

const BUDGET_RANK: Record<BudgetTier, number> = {
  "under-100": 0,
  "100-500": 1,
  "500-2000": 2,
  "2000-5000": 3,
  "5000-10000": 4,
  "10000-plus": 5,
};

const NEED_LABEL: Record<PrimaryNeed, string> = Object.fromEntries(
  PRIMARY_NEED_OPTIONS.map((o) => [o.value, o.title]),
) as Record<PrimaryNeed, string>;

export type RecommendationInput = {
  primaryNeed?: string | null;
  workStyle?: string | null;
  budgetTier?: string | null;
  urgency?: string | null;
};

export type OfferRecommendation = {
  slug: OfferSlug;
  title: string;
  reason: string;
  confidence: "direct" | "budget-adjusted" | "starter";
};

function asPrimaryNeed(value?: string | null): PrimaryNeed | null {
  return value && VALID_PRIMARY_NEEDS.has(value as PrimaryNeed)
    ? (value as PrimaryNeed)
    : null;
}

function asWorkStyle(value?: string | null): WorkStyle | null {
  return value && VALID_WORK_STYLES.has(value as WorkStyle)
    ? (value as WorkStyle)
    : null;
}

function asBudgetTier(value?: string | null): BudgetTier {
  return value && VALID_BUDGET_TIERS.has(value as BudgetTier)
    ? (value as BudgetTier)
    : "under-100";
}

function asUrgency(value?: string | null): Urgency | null {
  return value && VALID_URGENCIES.has(value as Urgency)
    ? (value as Urgency)
    : null;
}

export function recommendOffer(input: RecommendationInput): OfferRecommendation {
  const primaryNeed = asPrimaryNeed(input.primaryNeed);
  const workStyle = asWorkStyle(input.workStyle);
  const budgetTier = asBudgetTier(input.budgetTier);
  const urgency = asUrgency(input.urgency);
  const budgetRank = BUDGET_RANK[budgetTier];

  if (primaryNeed === "next-post") {
    return {
      slug: "quick-look",
      title: "Quick-Look Video",
      reason: "You asked for one sharp next move. The Quick-Look keeps the spend low and gets you a post, bio fixes, and a video review fast.",
      confidence: "direct",
    };
  }

  if (primaryNeed === "one-decision") {
    return {
      slug: "decision-sprint",
      title: "Decision Sprint",
      reason: "You have one stuck decision. The Decision Sprint is built for a focused call, recording, transcript, and next-three-moves worksheet.",
      confidence: "direct",
    };
  }

  if (primaryNeed === "ads") {
    if (budgetRank >= 2) {
      return {
        slug: "fb-ads",
        title: "Facebook Ads Management",
        reason: "You named ads and have enough budget to support management plus media spend. This is the direct route.",
        confidence: "direct",
      };
    }
    return {
      slug: "business-audit",
      title: "Business Audit",
      reason: "You named ads, but the budget says the smartest first move is finding the offer, funnel, and tracking leaks before ad spend starts.",
      confidence: "budget-adjusted",
    };
  }

  if (primaryNeed === "managed-social") {
    if (budgetRank >= 2) {
      return {
        slug: "power-bundle",
        title: "Power Bundle",
        reason: "You want social handled across platforms. The Power Bundle is the cleanest done-for-you social path.",
        confidence: "direct",
      };
    }
    return {
      slug: "business-audit",
      title: "Business Audit",
      reason: "You want managed social, but the budget says to map the machine first so the monthly spend has a clear plan.",
      confidence: "budget-adjusted",
    };
  }

  if (primaryNeed === "working-session") {
    if (budgetRank >= 3) {
      return {
        slug: "working-session",
        title: "Working Session",
        reason: "You want to build one real thing. The Working Session is built around shipping a usable deliverable, not talking around it.",
        confidence: "direct",
      };
    }
    return {
      slug: "business-audit",
      title: "Business Audit",
      reason: "You want a build, but the budget says the audit should define exactly what gets built before you spend more.",
      confidence: "budget-adjusted",
    };
  }

  if (primaryNeed === "operator") {
    if (budgetRank >= 3) {
      return {
        slug: "monthly-operator",
        title: "Monthly Operator",
        reason: "You need Ryan involved across operations, systems, sales, and follow-through. Monthly Operator is the closest fit.",
        confidence: "direct",
      };
    }
    return {
      slug: "working-session",
      title: "Working Session",
      reason: "You want operator help, but the budget points to a single focused build before a monthly commitment.",
      confidence: "budget-adjusted",
    };
  }

  if (primaryNeed === "advisor") {
    if (budgetRank >= 5) {
      return {
        slug: "annual-advisor",
        title: "Annual Advisor",
        reason: "You asked for board-level advisor access and have the budget range for the limited-seat advisor engagement.",
        confidence: "direct",
      };
    }
    return {
      slug: "monthly-operator",
      title: "Monthly Operator",
      reason: "You want advisor access, but the budget points to monthly operator help before the annual advisor seat.",
      confidence: "budget-adjusted",
    };
  }

  if (workStyle === "hands-on-build") {
    return budgetRank >= 3
      ? {
          slug: "working-session",
          title: "Working Session",
          reason: "You chose hands-on build. The Working Session is the smallest package that ships a concrete asset with you.",
          confidence: "direct",
        }
      : {
          slug: "business-audit",
          title: "Business Audit",
          reason: "You chose hands-on build, but the budget says to define the build first with a written audit.",
          confidence: "budget-adjusted",
        };
  }

  if (workStyle === "done-for-you") {
    return {
      slug: budgetRank >= 2 ? "power-bundle" : "business-audit",
      title: budgetRank >= 2 ? "Power Bundle" : "Business Audit",
      reason:
        budgetRank >= 2
          ? "You chose done-for-you. The Power Bundle gets the content machine moving without making you build it alone."
          : "You chose done-for-you, but the budget says to get the written operating plan first.",
      confidence: budgetRank >= 2 ? "direct" : "budget-adjusted",
    };
  }

  if (urgency === "today" || workStyle === "quick-answer") {
    return {
      slug: budgetRank === 0 ? "quick-look" : "decision-sprint",
      title: budgetRank === 0 ? "Quick-Look Video" : "Decision Sprint",
      reason:
        budgetRank === 0
          ? "You need fast direction with a low spend. The Quick-Look is the cleanest start."
          : "You need fast direction and can support a focused call. The Decision Sprint is the cleanest start.",
      confidence: "starter",
    };
  }

  return {
    slug: primaryNeed === "audit" ? "business-audit" : "business-audit",
    title: "Business Audit",
    reason: primaryNeed
      ? `You picked "${NEED_LABEL[primaryNeed]}." The Business Audit gives you the map before you spend bigger.`
      : "The Business Audit is the safest default when the buyer needs clarity before picking a larger engagement.",
    confidence: "starter",
  };
}

export function routeForRecommendation(input: RecommendationInput): string {
  const rec = recommendOffer(input);
  const params = new URLSearchParams({
    source: "start",
    fit: input.primaryNeed || "unknown",
    budget: input.budgetTier || "unknown",
  });

  return `/offers/${rec.slug}?${params.toString()}`;
}
