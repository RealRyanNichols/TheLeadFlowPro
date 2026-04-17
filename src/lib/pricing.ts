export type PlanId = "free" | "starter" | "growth" | "pro" | "agency";

export interface Plan {
  id: PlanId;
  name: string;
  priceMonthly: number;
  blurb: string;
  highlight?: boolean;
  features: string[];
  limits: {
    leadsPerMonth: number | "unlimited";
    socialConnections: number | "all";
    aiAdCopyPerMonth: number | "unlimited";
    aiInsightsCadence: "weekly" | "daily" | "real-time";
    seats: number;
  };
}

export const PLANS: Plan[] = [
  {
    id: "free",
    name: "Free",
    priceMonthly: 0,
    blurb: "Stop missing leads — today, at zero cost.",
    features: [
      "Lead Inbox (50 leads / month)",
      "Missed-Call Auto Text-Back (1 number)",
      "1 social media connection",
      "Weekly AI snapshot of your accounts",
      "Mobile + desktop dashboard"
    ],
    limits: {
      leadsPerMonth: 50,
      socialConnections: 1,
      aiAdCopyPerMonth: 0,
      aiInsightsCadence: "weekly",
      seats: 1
    }
  },
  {
    id: "starter",
    name: "Starter",
    priceMonthly: 5,
    blurb: "Add the AI ad-copy that pays for itself in one lead.",
    features: [
      "Everything in Free",
      "500 leads / month",
      "AI Ad Copy Generator (25 / month)",
      "3 social connections",
      "Daily AI insight digest"
    ],
    limits: {
      leadsPerMonth: 500,
      socialConnections: 3,
      aiAdCopyPerMonth: 25,
      aiInsightsCadence: "daily",
      seats: 1
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
      "Target Audience Analyzer (AI)",
      "All 5 social connections",
      "Unlimited AI insights",
      "Ad performance import + scoring"
    ],
    limits: {
      leadsPerMonth: 5_000,
      socialConnections: "all",
      aiAdCopyPerMonth: "unlimited",
      aiInsightsCadence: "daily",
      seats: 1
    }
  },
  {
    id: "pro",
    name: "Pro",
    priceMonthly: 35,
    blurb: "Run a real operation. Automate the follow-up.",
    features: [
      "Everything in Growth",
      "Unlimited leads",
      "3 team seats",
      "Outreach automations (SMS + email)",
      "Priority AI processing",
      "Custom dashboards"
    ],
    limits: {
      leadsPerMonth: "unlimited",
      socialConnections: "all",
      aiAdCopyPerMonth: "unlimited",
      aiInsightsCadence: "real-time",
      seats: 3
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
      "API access",
      "10 team seats",
      "Dedicated onboarding"
    ],
    limits: {
      leadsPerMonth: "unlimited",
      socialConnections: "all",
      aiAdCopyPerMonth: "unlimited",
      aiInsightsCadence: "real-time",
      seats: 10
    }
  }
];

export function planById(id: PlanId): Plan {
  const p = PLANS.find((x) => x.id === id);
  if (!p) throw new Error(`Unknown plan: ${id}`);
  return p;
}
