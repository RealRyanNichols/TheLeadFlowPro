export const WEBSITE_LAUNCH_CHECKOUT =
  "https://book.stripe.com/cNi6oG52y1kockE5oq5AQ0a";

export const WEBSITE_LAUNCH = {
  id: "website-launch",
  name: "Website Launch",
  total: 1000,
  deposit: 500,
  finalPayment: 500,
  priceLabel: "$1,000",
  paymentLabel:
    "$500 to start. Once intake begins, the deposit is non-refundable, except where the written agreement or applicable law requires otherwise. $500 after approval, before launch.",
  summary:
    "The first connected release for a real business: five premium pages built around one buyer, one offer, and one measurable next action.",
  included: [
    "One conversion map: audience, offer, buyer path, and primary action",
    "Up to five conversion-led pages named in the written scope",
    "One lead-capture path with routing to the agreed destination",
    "Responsive production build for desktop, tablet, and mobile",
    "Basic on-page SEO, core analytics, domain connection, and deployment",
    "Two focused revision rounds against the approved scope",
    "A founding-rate visual pack with up to three premium system scenes",
  ],
  exclusions: [
    "Additional pages, stand-alone landing pages, or multi-step funnels",
    "CRM, database migration, phone, text, email, or AI automation",
    "Customer, member, student, or course portals",
    "Custom calculators, workflow tools, ecommerce, or payment systems",
    "Ad setup, ad spend, ongoing ad management, or ongoing social publishing",
    "A new brand identity, unlimited copywriting, illustrations, or revisions",
    "Third-party hosting, database, email, SMS, advertising, or vendor fees",
  ],
  milestones: [
    {
      number: "01",
      name: "Reserve",
      body: "The $500 deposit reserves the build and opens intake. Once intake begins, it is non-refundable, except where the written agreement or applicable law requires otherwise.",
    },
    {
      number: "02",
      name: "Lock the scope",
      body: "We confirm the buyer, offer, five pages, raw assets, and primary action in writing.",
    },
    {
      number: "03",
      name: "Build",
      body: "The working site is assembled in a reviewable preview environment.",
    },
    {
      number: "04",
      name: "Review",
      body: "You test the pages and form, then use two focused revision rounds.",
    },
    {
      number: "05",
      name: "Approve",
      body: "The final $500 is due only after approval and before production launch.",
    },
    {
      number: "06",
      name: "Launch",
      body: "We connect the live domain, verify routing and analytics, and hand off the agreed accounts.",
    },
  ],
} as const;

// Hold The Line, the second offer lane. Lane one sells a business owner a
// platform they own. This lane teaches them to keep speaking on it: how to
// answer critics and trolls without losing the account, and how to recover if
// they already did. Product spec: Notion, The LeadFlow Pro -> 14. Hold The Line.
//
// Checkout builds the Stripe session inline with price_data / unit_amount in
// /api/checkout, so there are no Stripe Price IDs to create or manage. The
// fifth rung of this ladder is the existing $1,000 Website Launch at $500
// down; it is linked, never duplicated.
export type HoldTheLineOffer = {
  slug: string;
  name: string;
  priceLabel: string;
  amountCents: number;
  // "payment" is a one-time charge; "subscription" bills monthly.
  mode: "payment" | "subscription";
  tagline: string;
  summary: string;
  included: readonly string[];
  afterCheckout: string;
};

export const HOLD_THE_LINE_OFFERS: readonly HoldTheLineOffer[] = [
  {
    slug: "hold-the-line-playbook",
    name: "Hold The Line Playbook",
    priceLabel: "$47",
    amountCents: 4700,
    mode: "payment",
    tagline: "The training, in your hands tonight.",
    summary:
      "The doctrine, the sorting table, the full response library, the never-type list, and the 60-second pre-send check. Digital, instant.",
    included: [
      "The ten-rule doctrine that keeps accounts alive",
      "The sorting table: seven kinds of people in your comments and the answer each one gets",
      "The four-part reply that wins the people reading instead of the person typing",
      "The full response library for the situations that come up over and over",
      "The never-type list. This alone is worth the price.",
      "The 60-second check to run before you hit reply",
      "What to actually do if you are already suspended or demonetized",
    ],
    afterCheckout:
      "Delivery is instant. The access link lands in your email as soon as the payment clears.",
  },
  {
    slug: "comment-rescue",
    name: "Comment Rescue",
    priceLabel: "$197",
    amountCents: 19700,
    mode: "payment",
    tagline: "Send us the thread. Get the exact reply.",
    summary:
      "Send us the thread. Within 24 hours you get the read on what type it is, the exact reply to paste, and what to do if they come back.",
    included: [
      "A straight read on who you are dealing with and what they actually want",
      "The exact reply to paste, written for the people reading, not the person typing",
      "What to do if they come back, so one comment never becomes a week",
      "Turnaround within 24 hours of sending the thread",
    ],
    afterCheckout:
      "After payment you get an email asking for the thread, the link, and one line of context. The reply comes back within 24 hours.",
  },
  {
    slug: "voice-recovery",
    name: "Voice Recovery Session",
    priceLabel: "$497",
    amountCents: 49700,
    mode: "payment",
    tagline: "For the person already suspended or demonetized.",
    summary:
      "60 minutes live. We figure out which of the five things actually happened, write the appeal together on the call, and map the off-platform backup. You leave with the appeal text and a one-page rebuild plan.",
    included: [
      "60 minutes live, one on one",
      "A straight read on which of the five things actually happened to the account",
      "The appeal, written together on the call, not after it",
      "A one-page rebuild plan and the off-platform backup, mapped",
    ],
    afterCheckout:
      "After payment you get an email to book the call. Bring the account and whatever the platform sent you.",
  },
  {
    slug: "comment-cover",
    name: "Comment Cover",
    priceLabel: "$297/mo",
    amountCents: 29700,
    mode: "subscription",
    tagline: "For the owner who cannot stomach the comment section.",
    summary:
      "We watch the page, sort what comes in, and hand you the reply. You approve and post.",
    included: [
      "We watch the page so you do not have to",
      "Every comment sorted: objection, critic, troll, or something worse",
      "The reply, written and handed to you. You approve and post.",
      "Cancel any time. No contract, no wind-down fee.",
    ],
    afterCheckout:
      "After payment you get an email asking which pages to cover and how you want replies handed to you.",
  },
] as const;

export function holdTheLineOffer(slug: string) {
  return HOLD_THE_LINE_OFFERS.find((offer) => offer.slug === slug) ?? null;
}

export const OFFER_LADDER = [
  {
    id: "system-map",
    name: "System Map",
    price: "$497",
    priceValue: 497,
    purpose: "Paid diagnosis, architecture, priorities, and an implementation roadmap.",
    href: "/packages/system-map",
  },
  {
    id: "website-launch",
    name: "Website Launch",
    price: "$1,000",
    priceValue: 1000,
    purpose: "A scope-controlled five-page conversion website with a real approval checkpoint.",
    href: "/packages/launch",
  },
  {
    id: "lead-engine",
    name: "Lead Engine",
    price: "$3,500+",
    priceValue: 3500,
    purpose: "Website, conversion funnel, CRM, lead routing, and response automation.",
    href: "/start?goal=follow_up",
  },
  {
    id: "training-platform",
    name: "Training Platform",
    price: "$5,000+",
    priceValue: 5000,
    purpose: "Course catalog, member dashboard, enrollment, progress, and admin tools.",
    href: "/start?goal=delivery",
  },
  {
    id: "company-os",
    name: "Company OS",
    price: "$7,500+",
    priceValue: 7500,
    purpose: "Website, CRM, client portal, analytics, automation, and operating dashboard.",
    href: "/start?goal=replace_tools",
  },
  {
    id: "custom-platform",
    name: "Custom Platform",
    price: "$15,000+",
    priceValue: 15000,
    purpose: "Custom software, multi-role workflows, advanced integrations, and platform architecture.",
    href: "/start?goal=custom",
  },
] as const;
