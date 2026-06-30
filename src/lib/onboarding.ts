/**
 * Onboarding is goal-first, not feature-first.
 * Ryan picks the #1 outcome he wants — then we hand him the exact 5-step
 * checklist that gets him there. No tours, no "explore the dashboard."
 */
export type OnboardingGoal =
  | "stop_missing_calls"
  | "more_leads"
  | "close_more"
  | "grow_audience"
  | "free_up_time";

export interface Step {
  id: string;
  label: string;
  why: string;
  href: string;
  cta: string;
  estMinutes: number;
}

export interface GoalPlan {
  id: OnboardingGoal;
  headline: string;
  subhead: string;
  emoji: string;
  steps: Step[];
}

export const GOALS: GoalPlan[] = [
  {
    id: "stop_missing_calls",
    headline: "Capture painful buyer intent",
    subhead: "Turn adult problem answers into scored demand that can feed the marketplace.",
    emoji: "01",
    steps: [
      {
        id: "s1",
        label: "Open the problem-intake path",
        why: "This is where pain, urgency, budget, and active search behavior become useful signal.",
        href: "/problem-intake",
        cta: "Open intake",
        estMinutes: 3
      },
      {
        id: "s2",
        label: "Review the Lead Vault",
        why: "Every captured person or company needs a source, use case, and status before it is valuable.",
        href: "/dashboard/leads",
        cta: "Open vault",
        estMinutes: 2
      },
      {
        id: "s3",
        label: "Check scoring rules",
        why: "Pain without urgency is noise. Urgency with source depth is a possible product.",
        href: "/dashboard/insights",
        cta: "Review scoring",
        estMinutes: 4
      },
      {
        id: "s4",
        label: "Package a buyer-ready segment",
        why: "List value comes from fields, exclusions, region, source labels, and delivery readiness.",
        href: "/dashboard/data-requests",
        cta: "Review requests",
        estMinutes: 5
      },
      {
        id: "s5",
        label: "Build the first marketplace request",
        why: "A clear buyer use case tells the system what data is worth collecting.",
        href: "/data-marketplace",
        cta: "Build request",
        estMinutes: 1
      }
    ]
  },
  {
    id: "more_leads",
    headline: "Build or buy a lead list",
    subhead: "Define the list type, source lanes, volume, fields, budget, and delivery format.",
    emoji: "02",
    steps: [
      {
        id: "s1",
        label: "Open the marketplace builder",
        why: "Start with the business outcome so the data package is scoped correctly.",
        href: "/data-marketplace",
        cta: "Open builder",
        estMinutes: 5
      },
      {
        id: "s2",
        label: "Choose list categories",
        why: "Business owners, ecommerce sites, AI products, local services, social intent, and public profiles need different fields.",
        href: "/data-marketplace",
        cta: "Choose categories",
        estMinutes: 3
      },
      {
        id: "s3",
        label: "Set must-have fields",
        why: "A list is only worth buying when the buyer can act on the fields delivered.",
        href: "/data-marketplace",
        cta: "Set fields",
        estMinutes: 4
      },
      {
        id: "s4",
        label: "Review price estimate",
        why: "Fair-rate pricing should follow volume, depth, urgency, and scoring strength.",
        href: "/dashboard/data-requests",
        cta: "Review estimate",
        estMinutes: 2
      },
      {
        id: "s5",
        label: "Track delivery status",
        why: "Requests move from new to review, quote, build, ready, and delivered.",
        href: "/dashboard/data-requests",
        cta: "Track request",
        estMinutes: 3
      }
    ]
  },
  {
    id: "close_more",
    headline: "Score records I already have",
    subhead: "Separate useful buyer signal from weak records before anything becomes a data product.",
    emoji: "03",
    steps: [
      {
        id: "s1",
        label: "Open the Lead Vault",
        why: "Review the people, companies, sources, and notes already captured.",
        href: "/dashboard/leads",
        cta: "Open vault",
        estMinutes: 2
      },
      {
        id: "s2",
        label: "Find the strongest buyer target",
        why: "Good lists come from repeated pain, clear use case, and reachable profiles.",
        href: "/dashboard/audience",
        cta: "Open targets",
        estMinutes: 3
      },
      {
        id: "s3",
        label: "Run scoring review",
        why: "Each record needs intent, source depth, compliance status, and delivery fit.",
        href: "/dashboard/insights",
        cta: "Review scoring",
        estMinutes: 4
      },
      {
        id: "s4",
        label: "Move good records into a request",
        why: "Qualified records should attach to a specific buyer use case or source offer.",
        href: "/dashboard/data-requests",
        cta: "Open queue",
        estMinutes: 5
      },
      {
        id: "s5",
        label: "Automate the review path",
        why: "Use workflows to move high-intent signals toward review, quote, and delivery.",
        href: "/dashboard/automations",
        cta: "Open workflows",
        estMinutes: 4
      }
    ]
  },
  {
    id: "grow_audience",
    headline: "Map public source accounts",
    subhead: "Connect public profiles and Pages that can support source labels and buyer-target discovery.",
    emoji: "04",
    steps: [
      {
        id: "s1",
        label: "Connect public source accounts",
        why: "Followers, bios, profile fields, and public activity can add context to source scoring.",
        href: "/dashboard/social",
        cta: "Open sources",
        estMinutes: 4
      },
      {
        id: "s2",
        label: "Review buyer clusters",
        why: "Source accounts help reveal who is reachable and what segment they belong to.",
        href: "/dashboard/audience",
        cta: "Open targets",
        estMinutes: 3
      },
      {
        id: "s3",
        label: "Check signal strength",
        why: "Engagement without purchase intent is weak. Engagement plus problem intent is useful.",
        href: "/dashboard/insights",
        cta: "Review signal",
        estMinutes: 3
      },
      {
        id: "s4",
        label: "Attach sources to requests",
        why: "A buyer should know what source lanes were used and what limits apply.",
        href: "/dashboard/data-requests",
        cta: "Open requests",
        estMinutes: 4
      },
      {
        id: "s5",
        label: "Build a source-backed list",
        why: "Package public context with buyer use case, field requirements, and delivery format.",
        href: "/data-marketplace",
        cta: "Build list",
        estMinutes: 5
      }
    ]
  },
  {
    id: "free_up_time",
    headline: "Automate review and delivery",
    subhead: "Use workflows to keep requests, scoring, quotes, and delivery gates moving.",
    emoji: "05",
    steps: [
      {
        id: "s1",
        label: "Open workflows",
        why: "Start with automations around intake review, buyer quotes, and source checks.",
        href: "/dashboard/automations",
        cta: "Open workflows",
        estMinutes: 4
      },
      {
        id: "s2",
        label: "Route high-intent intake",
        why: "Urgent, painful answers should move to scoring instead of sitting in a form table.",
        href: "/problem-intake",
        cta: "Open intake",
        estMinutes: 3
      },
      {
        id: "s3",
        label: "Route buyer requests",
        why: "New requests need quote review, source requirements, and delivery planning.",
        href: "/dashboard/data-requests",
        cta: "Open requests",
        estMinutes: 3
      },
      {
        id: "s4",
        label: "Set notification rules",
        why: "Only surface high-intent signals, buyer updates, source review, and delivery risk.",
        href: "/dashboard/settings#notifications",
        cta: "Tune alerts",
        estMinutes: 3
      },
      {
        id: "s5",
        label: "Review command dashboard",
        why: "The command center should show captured signals, buyer requests, source offers, and pipeline value.",
        href: "/dashboard",
        cta: "Open command",
        estMinutes: 2
      }
    ]
  }
];

export function planFor(goal: OnboardingGoal): GoalPlan {
  const p = GOALS.find((g) => g.id === goal);
  if (!p) throw new Error(`Unknown goal: ${goal}`);
  return p;
}
