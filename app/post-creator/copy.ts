// The words on /post-creator: hero, how it works, the compare table, the
// pricing cards, and the questions. Every number and every allowance comes
// from lib/postCreator/product.ts, the same record checkout charges and the
// write route meters against, so the page can never promise more than the
// product does. tests/post-creator-pages.test.ts runs all of it through the
// house copy rules.

import { ANGLE_IDS, TRADES } from "@/lib/postCreator/options";
import {
  POST_CREATOR,
  SPEND_PAUSE_LINE,
  COST_LIMIT_LINE,
  FILTER_LINE,
  UNLIMITED_FAQ_A,
  UNLIMITED_FAQ_Q,
  UNLIMITED_HERO,
  UNLIMITED_ROW,
  aiCapLine,
  triesLine,
} from "@/lib/postCreator/product";
import type { PostCreatorPlan } from "@/lib/postCreator/types";
import { usd } from "@/lib/site/prices";

const MONTHLY = POST_CREATOR.ai.monthly;
const LIFETIME = POST_CREATOR.ai.lifetime;
const MAX_PLATFORMS = POST_CREATOR.ai.maxPlatformsPerWrite;
/** The named trades, not counting "Something else". */
const NAMED_TRADES = TRADES.filter((t) => t.id !== "other").length;

export const HERO = {
  eyebrow: "Free for every local business",
  title: POST_CREATOR.longName,
  body: UNLIMITED_HERO,
  trust: "Runs in your browser. Nothing you type here is sent anywhere. Nothing is posted for you.",
} as const;

export const HOW_IT_WORKS: readonly { title: string; body: string }[] = [
  { title: "Pick your trade", body: "Or skip it. Add your town and services if you want the ideas to fit closer." },
  {
    title: "Tap Next idea",
    body: "Each card has the idea, a first line, a photo idea, and a call to action. Swap any part you do not like.",
  },
  { title: "Copy the draft", body: "Pick the platform, fill in anything in brackets, and post it yourself." },
];

/** The planner's own line ("Pick how often you post...") is in PlanMonth, so the buyer app shows it too. */
export const PLAN_SECTION = { title: "Plan a whole month in one tap" } as const;

export const COMPARE_HEADS = { title: "What AI writing adds", free: "Free", paid: "With AI writing" } as const;

export const COMPARE_ROWS: readonly { label: string; free: string; paid: string }[] = [
  {
    label: `Idea machine, ${NAMED_TRADES} trades plus "Something else", your services`,
    free: UNLIMITED_ROW,
    paid: "Same, filled in from the saved profile",
  },
  { label: "Drafts for Facebook, Instagram, Google, Nextdoor, short video", free: "Templates with [blanks]", paid: "AI writes it in your voice" },
  { label: "30-day plan, spreadsheet, copy all", free: "Yes", paid: "Yes" },
  { label: "Business profile on every device", free: "No (this browser only)", paid: "Yes" },
  {
    label: "AI writes",
    free: "None",
    paid: `Monthly: ${MONTHLY.perMonth} a month, ${MONTHLY.perDay} a day. One payment: ${LIFETIME.perMonth} a month, ${LIFETIME.perDay} a day`,
  },
];

const SHARED_BULLETS = [
  "Writes in your voice from your saved business profile",
  `Drafts for up to ${MAX_PLATFORMS} platforms per write, plus two other first lines and a photo idea`,
  "Your profile on every device",
];

export type PricingPlan = {
  plan: PostCreatorPlan;
  name: string;
  /** The price, formatted from PRICES ("usd"). */
  price: string;
  per: string;
  note: string;
  bullets: readonly string[];
  button: string;
};

export const PRICING = {
  title: "Want it written in your voice?",
  sub: "The idea machine stays free. AI writing is the paid part.",
  plans: [
    {
      plan: "monthly",
      name: "Monthly",
      price: usd(POST_CREATOR.monthlyUsd),
      per: "a month",
      note: "Cancel any time from Settings. It stops at the end of the month you paid for.",
      bullets: [`Up to ${MONTHLY.perMonth} AI writes a month, ${MONTHLY.perDay} a day`, ...SHARED_BULLETS],
      button: "Start monthly",
    },
    {
      plan: "lifetime",
      name: "One payment",
      price: usd(POST_CREATOR.lifetimeUsd),
      per: "once",
      note: "Pay once. Nothing renews.",
      bullets: [
        `Up to ${LIFETIME.perMonth} AI writes a month, ${LIFETIME.perDay} a day, for as long as ${POST_CREATOR.name} is offered`,
        ...SHARED_BULLETS,
      ],
      button: "Pay once",
    },
  ] as readonly PricingPlan[],
  writeLine: `One AI write is one tap of Write it, for up to ${MAX_PLATFORMS} platforms at once.`,
  fine: [triesLine("monthly"), SPEND_PAUSE_LINE, COST_LIMIT_LINE] as readonly string[],
  checkout: "Secure checkout by Stripe. Nothing is posted for you. No results are promised.",
  termsLink: "Read the terms",
  cancelled: "Checkout was cancelled. Nothing was charged.",
  aiOn: "AI writing is on.",
  aiOff: "AI writing is not switched on right now. The idea machine above works now, free.",
} as const;

/** What shows instead of the buy buttons while sales are closed. */
export function closedMessage(aiOn: boolean): string {
  return aiOn
    ? "The paid plan is not open yet. The idea machine above works now, free."
    : `The paid plan opens when AI writing is switched on. ${PRICING.aiOff}`;
}

export type Faq = { q: string; a: string; link?: { href: "/agency" | "/privacy"; label: string } };

export const FAQS: readonly Faq[] = [
  { q: UNLIMITED_FAQ_Q, a: UNLIMITED_FAQ_A },
  {
    q: "Does it post for me?",
    a: "No. You copy a draft, fill in anything in brackets, and post it yourself from your own accounts. Nothing is posted for you.",
  },
  {
    q: "Where do the ideas come from?",
    a: `From a library of topics for your trade, everyday business topics, and the services you add, each matched with the ways to frame a post that fit it: ${ANGLE_IDS.length} in all. Nothing in the library states a price, a number, or a claim about your business.`,
  },
  {
    q: "What does AI writing add?",
    a: "It writes the whole post in your voice from your saved business profile: your services, your town, the words you use. It fills in the parts the free drafts leave in brackets when your profile covers them, drafts for up to three platforms at once, and gives you two other first lines and a photo idea.",
  },
  {
    q: "How many AI writes do I get?",
    a: `${aiCapLine("monthly")} That is the monthly plan. On the one payment plan: up to ${LIFETIME.perMonth} a month and ${LIFETIME.perDay} a day. ${triesLine("monthly")}`,
  },
  {
    q: "Will the AI make things up about my business?",
    a: `It is told to use only what is in your profile and your note. ${FILTER_LINE}`,
  },
  {
    q: "Can I cancel?",
    a: "Monthly: cancel any time from Settings inside Post Creator. It stops at the end of the month you paid for. One payment: nothing renews.",
  },
  {
    q: "Can you just do my posts for me?",
    a: "Post Creator is do it yourself. If you would rather have a team run your marketing, see our agency services.",
    link: { href: "/agency", label: "See agency services" },
  },
  {
    q: "What happens to my information?",
    a: "The idea machine runs in your browser and sends nothing to us. On the paid plan, your business profile is saved to your account so it follows you to every device. When you use AI writing, your profile, the idea, and your note are sent to Anthropic, the company that runs the AI model, to write the draft. We keep a record of each AI request but not the draft text.",
    link: { href: "/privacy", label: "Read the privacy policy" },
  },
];
