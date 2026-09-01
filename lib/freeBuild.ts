// The Free Website Program (/free-build).
//
// The public promise is literal: the first five-page website has a $0 build
// fee for approved applicants. Paid growth services are optional, priced
// separately, and never hidden inside the word "free." The client owns the
// code, domain, account access, analytics, and leads.
//
// Checkout IDs stay stable because Stripe/webhook history depends on them.
// Paid tiers below are optional add-ons to the same five-page foundation.

export type FreeBuildTier = {
  id: "free_build_followup" | "free_build_content" | "free_build_launch" | "free_build_only";
  name: string;
  priceUsd: number;
  priceCents: number;
  engine: string;
  pages: string;
  includes: string[];
  tag: string;
};

export const FREE_BUILD = {
  slug: "free-build",
  name: "The Free Website Program",
  headline: "Own your website.",
  subhead: "Your first five-page build is $0.",
  promise:
    "If your business needs a real website, apply and let me build the first five-page foundation " +
    "with no build fee. You own it. If you want ads, follow-up, content, CRM, automation, SEO, " +
    "video, or a larger operating system after that, those are separate choices with written pricing.",

  // The paid-out-right option remains available for businesses that do not
  // want the application/capacity process. It is not the public front door.
  anchorUsd: 1000,
  anchorLine:
    "The same five-page foundation can be purchased outright for $1,000 without waiting for a program opening.",

  whyFree: [
    {
      q: "What is actually free?",
      a:
        "The build fee for one approved five-page website. That includes a mobile-first site, one clear offer path, lead capture, basic search setup, analytics, launch setup, and a defined 90-day correction window. It is not a trial and the site does not disappear if you decline every add-on.",
    },
    {
      q: "Why would LeadFlow Pro do that?",
      a:
        "Because the website is the first proof. I want to earn the larger work by showing you what I can build before asking you to trust me with ads, follow-up, CRM, automation, content, video, or a complete business system. I also ask for one honest feedback session and permission to request an honest review after launch. A positive review is never required.",
    },
    {
      q: "What is the catch?",
      a:
        "Application and capacity limits, a written five-page scope, and deadlines for your photos, facts, and feedback. Domain registration, paid hosting after the included period, ad spend, software subscriptions, extra pages, new features, and ongoing marketing are not included. Every one of those costs is disclosed before you approve it.",
    },
  ],

  monthlySlots: 10,
  slotsNote:
    "Application required. The first release is capped at ten qualified businesses per month so every build gets real attention.",

  guaranteeDays: 10,
  guarantee:
    "The working-preview target is 10 business days after the written scope, complete intake, photos, and access approvals are in. If the current queue cannot support that target, you will be told before your application is accepted.",

  buildIncludes: [
    {
      title: "Up to five core pages",
      detail:
        "A practical mix such as Home, Services, About, Contact, and one quote, booking, checkout, or campaign page. The exact five are written into the scope before the build starts.",
    },
    {
      title: "Built for phones first",
      detail:
        "The pages, forms, calls to action, and navigation are tested for the screen most local customers use first, then checked on desktop.",
    },
    {
      title: "Lead capture you control",
      detail:
        "A contact or quote form routes into the agreed client-owned inbox or CRM. LeadFlow Pro does not take a hidden copy of customer records and does not reuse one client's audience for another client.",
    },
    {
      title: "Search foundation",
      detail:
        "Page titles, descriptions, crawl controls, LocalBusiness structure where appropriate, sitemap setup, and Google indexing submission. No promise of a particular ranking position.",
    },
    {
      title: "Analytics in your account",
      detail:
        "First-party analytics and the client's own approved tracking are connected so visits, forms, and campaign sources can be measured without transferring ownership.",
    },
    {
      title: "90-day correction window",
      detail:
        "Up to two minor correction requests per month for 90 days, plus a day-90 review. Minor means existing-scope text, photos, hours, pricing, links, or contact information, not new pages or systems.",
    },
    {
      title: "A clean ownership choice",
      detail:
        "The first 90 days of managed hosting are included. After that, self-host or export the site, use $49/month managed hosting, or choose $99/month hosting with two minor edits. Nothing renews without written approval.",
    },
  ],

  buildExcludes: [
    "Domain registration, paid themes, third-party software, text-message fees, and ad spend",
    "More than five scoped pages, a store, member portal, custom app, CRM, automation, or additional funnels",
    "Unlimited revisions, redesigns, new features, or open-ended support",
    "Guaranteed leads, sales, revenue, cost per lead, ad return, or Google ranking",
    "Any hidden LeadFlow Pro copy of the client's leads, pixel data, or customer audience",
  ],

  tiers: [
    {
      id: "free_build_followup",
      name: "Free Website + Follow-Up Pack",
      priceUsd: 197,
      priceCents: 19700,
      engine: "A fixed follow-up work product for one offer",
      pages: "Up to five scoped pages, $0 build fee",
      tag: "",
      includes: [
        "First-response email and phone scripts",
        "Five-email follow-up sequence for one offer",
        "Missed-call and review-request scripts for the owner to use",
        "A one-page response schedule for whoever works the leads",
        "No recurring management or automated marketing texts",
      ],
    },
    {
      id: "free_build_content",
      name: "Free Website + Content Engine",
      priceUsd: 497,
      priceCents: 49700,
      engine: "Two weeks of business-specific content built around the offer",
      pages: "Up to five scoped pages, $0 build fee",
      tag: "POPULAR START",
      includes: [
        "Fourteen days of platform-ready business content",
        "A campaign calendar tied to the site's offer path",
        "Publishing handoff inside client-controlled accounts",
        "One visual direction and reusable copy framework",
        "No ad spend or ongoing publishing hidden in the price",
      ],
    },
    {
      id: "free_build_launch",
      name: "Free Website + 30-Day Growth Engine",
      priceUsd: 997,
      priceCents: 99700,
      engine: "A 30-day campaign and follow-up foundation",
      pages: "Up to five scoped pages, $0 build fee",
      tag: "",
      includes: [
        "Thirty-day content and campaign calendar",
        "Thirty-email nurture sequence for one approved offer",
        "Lead-source tracking and owner notification path",
        "Launch checklist for ads, forms, follow-up, and reporting",
        "Ad spend, CRM subscriptions, video production, and ongoing management quoted separately",
      ],
    },
  ] as FreeBuildTier[],

  freeOnly: {
    id: "free_build_only",
    name: "Free Website Program",
    priceUsd: 0,
    pages: "Up to five scoped pages, $0 build fee",
    engine: "No paid add-on required",
    line:
      "Apply for the website by itself. If you qualify, declining every paid service does not cancel the free build or change who owns it.",
    tradeTitle: "What the program asks from you",
    trade: [
      {
        title: "One decision-maker and a complete intake",
        detail:
          "Submit accurate business details, the final decision-maker, usable photos or permission to source approved visuals, and the access approvals the written scope requires.",
      },
      {
        title: "Fast, consolidated feedback",
        detail:
          "Return one organized launch review within two business days instead of sending scattered changes across text, email, and social messages.",
      },
      {
        title: "One honest feedback session",
        detail:
          "Tell us what worked and what did not. We may ask for an honest review after launch, but a positive review is never required and any public testimonial will disclose the free build.",
      },
    ],
    removal:
      "Your leads stay yours. Your tracking stays in your account. LeadFlow Pro does not take a hidden customer list, build a cross-client audience, or keep an undisclosed pixel on the site.",
    notIncluded: [
      "No required add-on purchase and no surprise checkout after approval",
      "No free domain, paid software, advertising budget, or third-party vendor fees",
      "No unlimited revisions or work outside the written five-page scope",
    ],
    cta: "Apply for the free website",
  },

  steps: [
    {
      number: "01",
      name: "Apply and qualify",
      body:
        "Name, phone, email, what you want built first, and the first-30-day traffic and follow-up budget you are genuinely prepared to use. A $0 answer does not cancel the free offer; it tells us which lane and follow-up fit the business.",
    },
    {
      number: "02",
      name: "Lock the five-page scope",
      body:
        "One decision-maker approves the pages, offer, lead route, ownership, vendor costs, and what is not included before work begins.",
    },
    {
      number: "03",
      name: "Build the working preview",
      body:
        "The mobile-first pages, form, analytics, and search foundation are built on a private working URL using real business information.",
    },
    {
      number: "04",
      name: "Review and correct",
      body:
        "You click through the real site and return one consolidated review. Corrections inside the written scope are applied before launch.",
    },
    {
      number: "05",
      name: "Launch, measure, and improve",
      body:
        "The site moves into client-controlled accounts, tracking is tested, and the 90-day correction window begins. Paid growth services remain optional and separately approved.",
    },
  ],

  faq: [
    {
      q: "Do I have to buy an add-on?",
      a:
        "No. The free website is a real application lane. Paid follow-up, content, ads, CRM, automation, video, SEO, and larger systems are optional and separately priced. If a future campaign includes a website with a required service, it will say 'included with service,' not 'free.'",
    },
    {
      q: "Do I own the website?",
      a:
        "Yes. The written scope identifies the client-controlled domain, code or export, analytics, forms, and accounts. LeadFlow Pro does not hold customer data hostage or reuse it for another business.",
    },
    {
      q: "What happens after 90 days?",
      a:
        "Choose self-hosting or a clean export, $49/month managed hosting, or $99/month hosting with two minor edits. Larger updates, quarterly rebuilds, new pages, and new systems receive a written proposal first.",
    },
    {
      q: "What counts as a correction?",
      a:
        "An existing-scope change to text, photos, hours, prices, links, contact information, or a small layout issue. A new page, funnel, integration, checkout, portal, app, CRM, automation, or campaign is additional work.",
    },
    {
      q: "Will it rank on Google?",
      a:
        "The build includes a crawlable search foundation and indexing submission. No one can honestly promise a ranking position. Search growth depends on competition, content quality, local authority, reviews, links, site history, and continued work.",
    },
    {
      q: "Can you run the ads and follow-up too?",
      a:
        "Yes, after a separate written scope. The client pays ad spend directly to the platform and owns the ad account, pixel, leads, and reporting. LeadFlow Pro can build creative, forms, funnels, nurture, CRM, automation, and reporting without moving one client's data into another client's system.",
    },
  ],
} as const;

export function formatUsd(amount: number): string {
  return `$${amount.toLocaleString("en-US")}`;
}

export function findFreeBuildTier(id: string): FreeBuildTier | undefined {
  return FREE_BUILD.tiers.find((tier) => tier.id === id);
}

export const FREE_BUILD_OPTIONS: FreeBuildTier[] = [
  {
    id: FREE_BUILD.freeOnly.id as FreeBuildTier["id"],
    name: FREE_BUILD.freeOnly.name,
    priceUsd: FREE_BUILD.freeOnly.priceUsd,
    priceCents: 0,
    engine: FREE_BUILD.freeOnly.engine,
    pages: FREE_BUILD.freeOnly.pages,
    tag: "START HERE",
    includes: FREE_BUILD.freeOnly.trade.map(
      (item) => `${item.title}: ${item.detail.split(".")[0]}.`,
    ),
  },
  ...FREE_BUILD.tiers,
];
