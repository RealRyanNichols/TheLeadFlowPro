export type PlanId = "free" | "starter" | "growth" | "pro" | "agency";

export interface Plan {
  id: PlanId;
  name: string;
  priceMonthly: number;
  blurb: string;
  highlight?: boolean;
  features: string[];
  limits: {
    leadsPerMonth: number;
    socialConnections: number | "all";
    aiActionsPerMonth: number;       // chatbot turns, insights, ad-copy, audience, playbook — all count
    seats: number;
    smsIncluded: number;
  };
}

// Caps sized from src/lib/costs.ts so every tier keeps >60% gross margin
// even when users blast all their AI actions on Sonnet-tier tasks.
export const PLANS: Plan[] = [
  {
    id: "free",
    name: "Free",
    priceMonthly: 0,
    blurb: "Stop missing leads — today, at zero cost.",
    features: [
      "Lead Inbox (50 leads / month)",
      "Missed-Call Auto Text-Back (1 number)",
      "2 social connections (Facebook capped at 1 personal + 1 page)",
      "50 AI actions / month (chatbot + insights)",
      "Weekly AI snapshot"
    ],
    limits: {
      leadsPerMonth: 50,
      socialConnections: 2,
      aiActionsPerMonth: 50,
      seats: 1,
      smsIncluded: 0
    }
  },
  {
    id: "starter",
    name: "Starter",
    priceMonthly: 5,
    blurb: "The AI ad-copy that pays for itself in one lead.",
    features: [
      "Everything in Free",
      "500 leads / month",
      "300 AI actions / month",
      "3 social connections",
      "Daily AI insight digest",
      "Ad copy generator (boosts $2 / 50)"
    ],
    limits: {
      leadsPerMonth: 500,
      socialConnections: 3,
      aiActionsPerMonth: 300,
      seats: 1,
      smsIncluded: 0
    }
  },
  {
    id: "growth",
    name: "Growth",
    priceMonthly: 15,
    highlight: true,
    blurb: "Find your real audience. Run ads that actually convert.",
    features: [
      "Everything in Starter",
      "5,000 leads / month",
      "1,500 AI actions / month",
      "All 5 social connections",
      "Target Audience Analyzer",
      "Ad performance scoring"
    ],
    limits: {
      leadsPerMonth: 5_000,
      socialConnections: "all",
      aiActionsPerMonth: 1_500,
      seats: 1,
      smsIncluded: 0
    }
  },
  {
    id: "pro",
    name: "Pro",
    priceMonthly: 35,
    blurb: "Run a real operation. Automate the follow-up.",
    features: [
      "Everything in Growth",
      "25,000 leads / month",
      "6,000 AI actions / month",
      "500 outreach SMS included",
      "3 team seats",
      "Priority AI (Sonnet) available",
      "Custom dashboards"
    ],
    limits: {
      leadsPerMonth: 25_000,
      socialConnections: "all",
      aiActionsPerMonth: 6_000,
      seats: 3,
      smsIncluded: 500
    }
  },
  {
    id: "agency",
    name: "Agency",
    priceMonthly: 95,
    blurb: "Run client workspaces under your own brand.",
    features: [
      "Everything in Pro",
      "Multi-client workspaces",
      "White-label dashboard",
      "20,000 AI actions / month",
      "2,000 outreach SMS included",
      "API access",
      "10 team seats"
    ],
    limits: {
      leadsPerMonth: 100_000,
      socialConnections: "all",
      aiActionsPerMonth: 20_000,
      seats: 10,
      smsIncluded: 2_000
    }
  }
];

export function planById(id: PlanId): Plan {
  const p = PLANS.find((x) => x.id === id);
  if (!p) throw new Error(`Unknown plan: ${id}`);
  return p;
}

// --- Micro-upsells (boosters) ---
// Shown mid-flow — always framed as "unlock more of this win," never as a wall.
// Priced so Ryan nets ~70% on each pack.
export interface Booster {
  id: string;
  name: string;
  priceUsd: number;
  oneLiner: string;
  give: string;
  niceFor: string;
}

export const BOOSTERS: Booster[] = [
  {
    id: "ai-100",
    name: "+100 AI actions",
    priceUsd: 3,
    oneLiner: "One more blast of insights and chatbot replies.",
    give: "+100 AI actions this month",
    niceFor: "You're in a hot streak and need more Claude time."
  },
  {
    id: "ai-500",
    name: "+500 AI actions",
    priceUsd: 12,
    oneLiner: "A week of heavy lifting for the price of lunch.",
    give: "+500 AI actions this month",
    niceFor: "Busy month — lots of new leads, lots of replies."
  },
  {
    id: "sms-250",
    name: "+250 outreach SMS",
    priceUsd: 5,
    oneLiner: "Send the follow-ups. Close the deals.",
    give: "+250 SMS credits",
    niceFor: "You've got a nurture sequence ready to launch."
  },
  {
    id: "adcopy-50",
    name: "Ad Copy Booster — 50 generations",
    priceUsd: 7,
    oneLiner: "Test 50 hook + headline combos in one sitting.",
    give: "+50 Ad Copy generations (Sonnet)",
    niceFor: "Launch day. A/B testing time."
  },
  {
    id: "audience-scan",
    name: "Deep Audience Scan",
    priceUsd: 9,
    oneLiner: "Claude crawls your 5 socials and hands you the real buyer profile.",
    give: "1 full audience scan across all connected platforms",
    niceFor: "Quarterly check-in or a new service launch."
  },
  {
    id: "priority-ai",
    name: "Priority AI (Sonnet) — 7 days",
    priceUsd: 6,
    oneLiner: "Smarter answers, faster, for the next big push.",
    give: "All AI runs on Sonnet for 7 days",
    niceFor: "Cosmetic consult week, product drop, campaign launch."
  }
];

// --- Overage (pay-as-you-go when you skip the booster) ---
// Slightly more expensive than buying a booster — nudges people toward packs.
export const OVERAGE_PRICING = {
  aiActionCents: 4,     // $0.04 / action (vs $0.03 via booster)
  smsCents:      3,     // $0.03 / SMS   (vs $0.02 via booster)
  leadCents:     2      // $0.02 / lead  past cap
};
