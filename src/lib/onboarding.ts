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
    headline: "Stop losing leads to missed calls",
    subhead: "Every missed call should text back instantly — before they call your competitor.",
    emoji: "📞",
    steps: [
      {
        id: "s1",
        label: "Set your business phone number",
        why: "We forward missed calls from this number into the text-back flow.",
        href: "/dashboard/settings#contact",
        cta: "Set phone",
        estMinutes: 2
      },
      {
        id: "s2",
        label: "Turn on missed-call text-back",
        why: "The only automation that pays for itself in one lead.",
        href: "/dashboard/automations",
        cta: "Enable automation",
        estMinutes: 1
      },
      {
        id: "s3",
        label: "Personalize the auto-text",
        why: "Generic templates convert at 12%. Yours with a name + link: 40%+.",
        href: "/dashboard/scripts",
        cta: "Copy Script K1",
        estMinutes: 3
      },
      {
        id: "s4",
        label: "Add your booking link",
        why: "Give them the shortest possible path from 'missed call' to 'booked.'",
        href: "/dashboard/settings#business",
        cta: "Paste link",
        estMinutes: 2
      },
      {
        id: "s5",
        label: "Test it — call yourself, hang up",
        why: "You should get the auto-text inside 60 seconds.",
        href: "/dashboard/automations",
        cta: "Verify",
        estMinutes: 1
      }
    ]
  },
  {
    id: "more_leads",
    headline: "Get more leads into the top of the funnel",
    subhead: "Better ad copy, smarter audiences, and a shareable card you can hand out anywhere.",
    emoji: "🎯",
    steps: [
      {
        id: "s1",
        label: "Connect your social accounts",
        why: "We pull engagement data to pick the right audiences + ad slots for you.",
        href: "/dashboard/social",
        cta: "Connect socials",
        estMinutes: 4
      },
      {
        id: "s2",
        label: "Run a Deep Audience Scan",
        why: "Claude crawls your 5 platforms and hands you a real buyer profile.",
        href: "/dashboard/audience",
        cta: "Run scan",
        estMinutes: 2
      },
      {
        id: "s3",
        label: "Generate 5 ad-copy variants",
        why: "Pick the one that sings. Ship it in under 10 minutes.",
        href: "/dashboard/ad-copy",
        cta: "Open Ad Copy",
        estMinutes: 3
      },
      {
        id: "s4",
        label: "Publish your FlowCard",
        why: "A shareable one-tap card for every customer, QR code, and social bio.",
        href: "/dashboard/card",
        cta: "Edit FlowCard",
        estMinutes: 5
      },
      {
        id: "s5",
        label: "Launch the ad + share the card",
        why: "More surface area = more inbound leads this week.",
        href: "/dashboard",
        cta: "Go live",
        estMinutes: 3
      }
    ]
  },
  {
    id: "close_more",
    headline: "Close more of the leads I already have",
    subhead: "Tighten your follow-up. Reply faster, send the right script, and don't let any lead go cold.",
    emoji: "🤝",
    steps: [
      {
        id: "s1",
        label: "Open your Lead Inbox",
        why: "Get a live view of every hot lead that needs a reply right now.",
        href: "/dashboard/leads",
        cta: "See leads",
        estMinutes: 2
      },
      {
        id: "s2",
        label: "Stage a nurture automation",
        why: "5-day SMS + video sequence for every new lead who doesn't reply.",
        href: "/dashboard/automations",
        cta: "Stage sequence",
        estMinutes: 4
      },
      {
        id: "s3",
        label: "Save 3 favorite reply scripts",
        why: "Your 3 most-used replies — one tap to send.",
        href: "/dashboard/scripts",
        cta: "Open library",
        estMinutes: 3
      },
      {
        id: "s4",
        label: "Upload a pricing video or GIF",
        why: "One short video cuts price-objection back-and-forth by 60%.",
        href: "/dashboard/media",
        cta: "Upload",
        estMinutes: 5
      },
      {
        id: "s5",
        label: "Run a 'Book the Consult' playbook",
        why: "Branching step-by-step play that ends with a calendar hold.",
        href: "/dashboard/playbooks",
        cta: "Run playbook",
        estMinutes: 8
      }
    ]
  },
  {
    id: "grow_audience",
    headline: "Grow my social audience + trust",
    subhead: "Post the content that's actually working and capture followers into your funnel.",
    emoji: "🌱",
    steps: [
      {
        id: "s1",
        label: "Connect all 5 socials",
        why: "We need a full picture before we can tell you what's pulling and what's flat.",
        href: "/dashboard/social",
        cta: "Connect",
        estMinutes: 4
      },
      {
        id: "s2",
        label: "Run Weekly AI Insights",
        why: "Claude finds the 3 patterns driving your top posts.",
        href: "/dashboard/insights",
        cta: "See insights",
        estMinutes: 2
      },
      {
        id: "s3",
        label: "Set up a FlowCard for your bio",
        why: "One link in every bio that captures every tap into a lead.",
        href: "/dashboard/card",
        cta: "Build card",
        estMinutes: 5
      },
      {
        id: "s4",
        label: "Save 3 KLT scripts for DMs",
        why: "When a follow comes in, reply with a real human opener — not 'hey.'",
        href: "/dashboard/scripts",
        cta: "Pick scripts",
        estMinutes: 3
      },
      {
        id: "s5",
        label: "Schedule 3 testimonial reels",
        why: "Testimonials + face = highest-trust content you can post.",
        href: "/dashboard/media",
        cta: "Plan posts",
        estMinutes: 6
      }
    ]
  },
  {
    id: "free_up_time",
    headline: "Free up my time",
    subhead: "Let automations and the AI chatbot answer the repeat questions while you run the business.",
    emoji: "⏰",
    steps: [
      {
        id: "s1",
        label: "Turn on the AI Chatbot",
        why: "Answers pricing, hours, and booking questions 24/7 — escalates the tough ones.",
        href: "/dashboard/chatbot",
        cta: "Enable chatbot",
        estMinutes: 4
      },
      {
        id: "s2",
        label: "Train it on your FAQs",
        why: "20 minutes now saves 10 hours this quarter answering the same questions.",
        href: "/dashboard/chatbot",
        cta: "Add FAQs",
        estMinutes: 20
      },
      {
        id: "s3",
        label: "Enable missed-call text-back + new-lead nurture",
        why: "The two automations that cover 80% of follow-up work.",
        href: "/dashboard/automations",
        cta: "Enable both",
        estMinutes: 3
      },
      {
        id: "s4",
        label: "Check the weekly recap email",
        why: "One email Monday morning — everything you actually need to look at.",
        href: "/dashboard/recap",
        cta: "Preview recap",
        estMinutes: 2
      },
      {
        id: "s5",
        label: "Set notification rules",
        why: "Silence what doesn't matter. Only surface the urgent stuff.",
        href: "/dashboard/settings#notifications",
        cta: "Tune alerts",
        estMinutes: 3
      }
    ]
  }
];

export function planFor(goal: OnboardingGoal): GoalPlan {
  const p = GOALS.find((g) => g.id === goal);
  if (!p) throw new Error(`Unknown goal: ${goal}`);
  return p;
}
