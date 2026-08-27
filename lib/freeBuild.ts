// The Free Build (/free-build).
//
// The offer: Ryan builds the site for free. The customer pays for the engine
// that makes the site do something. That is the whole trade, and the page says
// it in those words.
//
// Why it exists: the $500 Website Launch payment link ran ten straight
// abandoned checkout sessions. Cold traffic will not hand over $500 for a
// website. The Free Build campaign, by contrast, bought clicks at $0.59 while
// the Time Back campaign paid $3 to $5. So the free build becomes the front
// door and the paid engine becomes the ticket.
//
// EVERY number and promise on that page lives here and ONLY here. The page
// renders from this file and /api/checkout charges from PRICE CENTS in this
// file, so the browser can never invent its own total.
//
// SCOPE RULE, deliberate: application-originated outbound SMS has been off
// since the Aug 21 emergency stop. Nothing in this file may promise an
// automated text sent on the customer's behalf. Message copy that the owner
// sends from their own phone is fine and is described that way.
//
// COMPLIANCE RULE: no promised lead volume, revenue, ROAS, CPL, conversion
// rate, or ranking. The only guarantee here is a DELIVERY guarantee, which is
// entirely inside Ryan's control.

export type FreeBuildTier = {
  /** Checkout kind. Must match the keys wired in /api/checkout. */
  id: "free_build_followup" | "free_build_content" | "free_build_launch" | "free_build_only";
  name: string;
  priceUsd: number;
  priceCents: number;
  /** One line under the price. What the money is actually for. */
  engine: string;
  /** Pages included in the free build at this tier. */
  pages: string;
  /** Bullet list of what the paid engine contains. */
  includes: string[];
  /** Small tag rendered on the card. Empty string renders no tag. */
  tag: string;
};

export const FREE_BUILD = {
  slug: "free-build",
  name: "The Free Build",
  headline: "I will build your site for free.",
  subhead: "You pay for the engine that makes it work.",

  promise:
    "A website by itself does not make anybody money. It sits there. What makes money is the thing " +
    "running behind it: posts going out, follow-up answering people, leads landing somewhere you " +
    "will actually see them. So I stopped charging for the site. Pick the engine you want running, " +
    "and the build comes with it.",

  // THE ANCHOR. Ryan's note, 2026-08-27: people were reading "Free Build" and
  // "$197" in the same breath and hearing a bait and switch. The fix is not a
  // softer price, it is stating what the free part is worth BEFORE any number
  // appears, and stating it with a figure they can go verify.
  //
  // We anchor to Ryan's OWN published price, not an invented market rate.
  // /packages/launch sells this exact build for $1,000 today. A visitor can
  // click through and check it in ten seconds. An invented "normally $2,000"
  // is unverifiable and reads like every other fake discount on the internet;
  // "this is the thing I sell for $1,000, on this same site, right now" cannot
  // be argued with.
  anchorUsd: 1000,
  anchorLine: "The same build sells for $1,000 on this site. Go look, it is on the packages page.",

  /** The three questions every visitor asks, in the order they ask them. */
  whyFree: [
    {
      q: "So what is the free part actually worth?",
      a:
        "A one or two page site, built for a phone, with a form that reaches you, your pixel installed, " +
        "and a domain in your name. I sell that exact build for $1,000 on the packages page of this " +
        "same site. That is not a made up number to make a discount look big. It is my real price and " +
        "you can go check it right now.",
    },
    {
      q: "Then why would you give it away?",
      a:
        "Because a website on its own is a business card nobody asked for. It does not follow up, it " +
        "does not post, it does not answer anybody at 9pm. I got tired of handing people a $1,000 site " +
        "and watching it sit there doing nothing for two years. So now I give the site away and charge " +
        "for the part that actually works. If the engine is no good, you paid $197 and you still keep " +
        "a $1,000 website. That is the deal, and I am fine with it.",
    },
    {
      q: "Where is the catch?",
      a:
        "Two places, and I would rather you read them here than find them later. One: the engine is not " +
        "refundable once I start writing it. Two: you were going to buy a website anyway. I am betting " +
        "that if I build it free and it is good, you keep working with me. That is the whole strategy. " +
        "There is no monthly fee hiding behind it and nothing renews on you.",
    },
  ],

  /** Honest capacity. Not fake urgency: this is one person's real week. */
  weeklySlots: 4,
  slotsNote: "Four free builds a week. That is what one person can actually do properly.",

  /** Delivery guarantee. Inside Ryan's control, so it is safe to promise. */
  guaranteeDays: 10,
  guarantee:
    "Your site is live within 10 business days of your call and your photos landing, or the engine " +
    "you paid for costs you nothing and you keep the site anyway.",

  /** In every free build, at every tier. */
  buildIncludes: [
    {
      title: "Built for a phone first",
      detail:
        "Most of your customers will see it on a phone in the truck or on the couch. It gets built for that screen first and checked on a desktop second.",
    },
    {
      title: "A form that reaches you",
      detail:
        "Someone fills it in and it emails you within seconds, with their name, number and what they asked about. No portal to remember to log into.",
    },
    {
      title: "Your Meta pixel installed",
      detail:
        "So when you do run ads, Facebook can learn who actually reads your page instead of guessing. Installed on your pixel, inside your account.",
    },
    {
      title: "Click to call and click for directions",
      detail:
        "One tap to your phone, one tap to your Google listing. The two things local customers do most.",
    },
    {
      title: "On a domain you own",
      detail:
        "Your domain, your hosting account, your pixel, your leads. If you fired me tomorrow you would keep every bit of it.",
    },
    {
      title: "Twelve months of small updates",
      detail:
        "Hours changed, prices changed, new photos, new service. Send it to me and it gets changed. Free for a year.",
    },
  ],

  /** Said out loud, before the customer finds it. */
  buildExcludes: [
    "Not a twelve page website with a blog, a store and a login",
    "No logo design and no new brand identity",
    "Your domain stays in your name, and if you need to buy one that is yours to buy, usually 12 to 20 dollars a year",
    "I do not send messages from your accounts on your behalf",
    "No promise of a number of leads, a number of sales, or a spot in Google results",
  ],

  tiers: [
    {
      id: "free_build_followup",
      name: "Free Build + Follow-Up",
      priceUsd: 197,
      priceCents: 19700,
      engine: "Your follow-up, written and ready to send",
      pages: "One page site, free",
      tag: "",
      includes: [
        "The five minute first reply, written for you to send in one tap",
        "A missed call message you save as a quick reply on your own phone",
        "A five message email follow-up sequence for one offer, in your voice",
        "A review request message paired with your direct Google review link",
        "A one page cheat sheet of what goes out when, for whoever answers the phone",
      ],
    },
    {
      id: "free_build_content",
      name: "Free Build + Content",
      priceUsd: 497,
      priceCents: 49700,
      engine: "Two solid weeks of posting, off your plate",
      pages: "Two page site, free",
      tag: "MOST PICKED",
      includes: [
        "42 posts, 3 a day for 14 days, written in your voice",
        "Scheduled inside your own Facebook, Instagram and X accounts",
        "Granted through official partner access, so you never hand over a password",
        "A second page built for one offer, so you have somewhere to send the posts",
        "A walkthrough of exactly what is scheduled and where to see it",
      ],
    },
    {
      id: "free_build_launch",
      name: "Free Build + Launch",
      priceUsd: 997,
      priceCents: 99700,
      engine: "A full month running, and the follow-up behind it",
      pages: "Two page site, free",
      tag: "",
      includes: [
        "90 posts, 3 a day for 30 days, written in your voice and scheduled in your accounts",
        "A seven day email follow-up series, written once, working for months",
        "The full follow-up pack: first reply, missed call message, review request",
        "A second page built for one offer, wired to the same form and the same pixel",
        "A live walkthrough at handover, recorded so you can watch it again",
      ],
    },
  ] as FreeBuildTier[],

  // ------------------------------------------------------------ free only ---
  // Ryan's call, 2026-08-27: some people just want the free website and nothing
  // else. Fine. But there has to be a trade, and the trade has to be STATED.
  //
  // Ryan's first instinct was to embed tracking they cannot easily remove and
  // quietly take the leads. We are not doing that, and the reason is business,
  // not squeamishness: his entire pitch is "you do not own your Facebook page,
  // they change the rules on a Tuesday and never tell you." The day one client
  // opens the source and finds us harvesting their customers, that is the only
  // story anyone ever tells about The LeadFlow Pro again. It hands every
  // competitor the exact weapon.
  //
  // So the same value is captured out loud instead. Footer credit, shared lead
  // copy, our pixel, all named on this page and in the agreement, and all of it
  // comes off the moment they buy anything. This is the standard free-tier
  // trade every website platform on earth runs, and saying it plainly is
  // itself a sales asset for a man whose brand is receipts.
  freeOnly: {
    id: "free_build_only",
    name: "Free Build, nothing else",
    priceUsd: 0,
    pages: "One page site, free",
    engine: "No engine. Just the site.",
    line: "You want the website and none of the rest. That is a real answer and I will still build it.",
    tradeTitle: "What I get out of it, said out loud",
    trade: [
      {
        title: "My name in your footer",
        detail:
          "A small \u201cBuilt by The LeadFlow Pro\u201d credit at the bottom, linking back to me. Every visitor you get sees it. That is the oldest trade on the internet and it is how the free tier of every website platform works.",
      },
      {
        title: "A copy of your leads",
        detail:
          "When somebody fills in your form it goes to you first, every time, and a copy comes to me. Not instead of you. As well as you. You will know, because it is written here and it is in the agreement you sign.",
      },
      {
        title: "My pixel next to yours",
        detail:
          "So I can see how the page performs and get better at building them. Your pixel goes on too, and yours is the one that owns your ad data.",
      },
    ],
    removal:
      "All three come off the day you buy anything, even the $197. That is not a threat, it is the deal: pay for an engine and the site is yours clean, with nothing of mine on it.",
    notIncluded: [
      "No posting, no follow-up, no review asks. The site sits there. That is what free means.",
      "Updates are best effort and go behind paying clients, because they are paying.",
      "One page, not two. The second page is part of the paid tiers.",
    ],
    cta: "Claim the free build only",
  },

  steps: [
    {
      number: "01",
      name: "Pick the engine",
      body: "That is the only thing you pay for. The site is free at every one of the three.",
    },
    {
      number: "02",
      name: "Twenty minutes on the phone",
      body: "What you do, who you want calling you, and what you want them to do when they land. That is the whole call.",
    },
    {
      number: "03",
      name: "I build it",
      body: "Draft in your hands inside 5 business days. You look at it on your phone, same as your customers will.",
    },
    {
      number: "04",
      name: "One round of changes",
      body: "Mark what is wrong. Wording, photos, order of things. It comes back fixed.",
    },
    {
      number: "05",
      name: "Live, in your accounts",
      body: "Inside 10 business days. Your domain, your hosting, your pixel. Then the engine switches on.",
    },
  ],

  faq: [
    {
      q: "Why would you build a website for free?",
      a: "Because a website on its own is a business card that nobody asked for. It does not follow up, it does not post, it does not answer anybody. The part that actually moves money is the engine, so that is the part I charge for. It also means you get to judge me on my work before you decide whether to spend real money with me.",
    },
    {
      q: "So what is the catch?",
      a: "The engine is not free, and once I start writing it, it is not refundable. That is the trade, said plainly. The site is free either way. If it is not live in 10 business days from your call and your photos, you keep the site and the engine costs you nothing.",
    },
    {
      q: "Do I actually own it?",
      a: "Yes, all of it. The domain is in your name, the hosting account is yours, the pixel is on your ad account, the leads land in your inbox. Nothing about this holds you hostage. That is the entire point of owning your platform instead of renting it.",
    },
    {
      q: "I already have a website. Is this useless to me?",
      a: "Not necessarily. Most sites I see are fine to look at and dead behind the scenes: no form that reaches anybody, no pixel, no follow-up. In that case the free build becomes a landing page you can send ads to, and the engine goes to work either way. Bring it to the call and I will tell you straight which it is.",
    },
    {
      q: "Do you work with people outside East Texas?",
      a: "Yes. The call is on the phone and the build happens in your accounts, so where you are does not change anything. Longview is home and local businesses get my time first, but the work is not limited to it.",
    },
    {
      q: "What do you need from me?",
      a: "Twenty minutes on the phone, your logo if you have one, a handful of photos if you have them, and a few access approvals you click through yourself. I never ask for a password.",
    },
    {
      q: "Can I move up later?",
      a: "Yes. Whatever you paid comes off the next thing you buy from me. You are not starting over because you started small.",
    },
  ],
} as const;

/** Whole-dollar display, no cents. */
export function formatUsd(amount: number): string {
  return `$${amount.toLocaleString("en-US")}`;
}

/** Server-side lookup so a browser can never name its own price. */
export function findFreeBuildTier(id: string): FreeBuildTier | undefined {
  return FREE_BUILD.tiers.find((t) => t.id === id);
}

/**
 * The four things a visitor can actually pick, in order: the three paid
 * engines, then the free-only option last. Free is last on purpose. Somebody
 * who reads the paid options first and then finds the free one has already
 * seen what they are giving up; somebody who sees free first never reads
 * further. `includes` for the free option is the TRADE, not features, because
 * on that card the trade is the thing the buyer needs to weigh.
 */
export const FREE_BUILD_OPTIONS: FreeBuildTier[] = [
  ...FREE_BUILD.tiers,
  {
    id: FREE_BUILD.freeOnly.id as FreeBuildTier["id"],
    name: FREE_BUILD.freeOnly.name,
    priceUsd: 0,
    priceCents: 0,
    engine: FREE_BUILD.freeOnly.engine,
    pages: FREE_BUILD.freeOnly.pages,
    tag: "",
    includes: FREE_BUILD.freeOnly.trade.map((t) => `${t.title}: ${t.detail.split(".")[0]}.`),
  },
];
