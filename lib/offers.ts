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

/**
 * How the Website Launch is named in navigation, everywhere it is named.
 *
 * WHY THIS IS A CONSTANT: the header said "Website Launch | $500" and the
 * footer said "Website Launch | $1,000". Same href, both rendered on every
 * public page, so the site quoted two different prices for one button roughly
 * a screen apart. A buyer who noticed had no way to tell which was real, and
 * the cheaper one was on the CTA.
 *
 * The label is the total, because $1,000 is the price of the offer. The $500
 * is a payment term, and a payment term shown as a price reads as the price
 * until the buyer reaches checkout, which is the worst place to learn it. The
 * term is small print: on the link that has room for it here, and in full on
 * /packages/launch, which is where WEBSITE_LAUNCH.paymentLabel already spells
 * out both halves and the refund condition.
 */
export const WEBSITE_LAUNCH_NAV = {
  href: "/packages/launch",
  label: `${WEBSITE_LAUNCH.name} | ${WEBSITE_LAUNCH.priceLabel}`,
  depositNote: `$${WEBSITE_LAUNCH.deposit} to start, $${WEBSITE_LAUNCH.finalPayment} after approval`,
} as const;

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
