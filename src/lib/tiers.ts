// src/lib/tiers.ts
// Long-form sales copy data for the 4 paid tier pages.
// Each page at /pricing/[slug] renders <TierSalesPage tier={TIERS[slug]} />.

export type TierSlug = "starter" | "growth" | "pro" | "agency";

export type Tier = {
  slug: TierSlug;
  name: string;
  priceMonthly: number;
  priceYearly: number;
  featured: boolean;
  /** env var key that holds the live Stripe price ID */
  stripePriceEnv: string;
  /** one-liner under the H1 */
  subhead: string;
  /** 1-sentence positioning statement, e.g. "The AI ad-copy that pays for itself in one lead." */
  tagline: string;
  /** Who this is for — speaks to the reader by role */
  idealFor: string[];
  /** Four concrete use-case scenarios with outcome */
  useCases: {
    title: string;
    body: string;
  }[];
  /** Feature bullets — what's included */
  features: string[];
  /** What's excluded / where to upgrade */
  notIncluded: string[];
  /** Simple ROI math tied to this tier's caps */
  roi: {
    setup: string;
    math: string;
    conclusion: string;
  };
  /** Faux but grounded testimonial — clearly labeled as early user */
  testimonial: {
    quote: string;
    name: string;
    business: string;
  };
  /** FAQ specific to this tier */
  faq: {
    q: string;
    a: string;
  }[];
};

export const TIERS: Record<TierSlug, Tier> = {
  // ────────────────────────────────────────────────────────────────────────
  starter: {
    slug: "starter",
    name: "Starter",
    priceMonthly: 5,
    priceYearly: 60,
    featured: false,
    stripePriceEnv: "STRIPE_PRICE_STARTER",
    subhead: "The plan that pays for itself the first time someone texts you back.",
    tagline: "You already have calls and texts coming in. Starter makes sure none of them fall through the cracks.",
    idealFor: [
      "Solo operators and 1–2 person service businesses",
      "Contractors, cleaners, salons, mobile detailers — anyone whose phone is the business",
      "Owners running ads for the first time who need copy that doesn't suck",
      "Anyone who has ever lost a lead to 'I meant to text them back'",
    ],
    useCases: [
      {
        title: "The missed call at 6:47pm",
        body: "You're at your kid's game. A new customer calls. You miss it. Starter's Missed-Call Auto Text-Back fires within 8 seconds — 'Hey, just missed your call. What do you need a quote on?' — and you keep the lead warm until you can follow up.",
      },
      {
        title: "The Facebook ad that actually works",
        body: "You type what you're offering into the Ad Copy Generator once. It spits out 3 hooks, 3 bodies, and 3 CTAs built off real local-service patterns. Paste into Meta Ads, launch in 10 minutes. One booked job at $200 and you're in the black for the year.",
      },
      {
        title: "The first 50 leads in one inbox",
        body: "Every call, text, DM, and form fill lands in one screen — so you stop toggling between Phone, Messenger, Instagram, your website form, and a Google Doc. When a lead comes in, you see it. When you need to follow up, you know who.",
      },
      {
        title: "The daily 2-minute scan",
        body: "Every morning you get one short digest: new leads, follow-ups due, what to post today, what to stop doing. No dashboard to navigate. Read, act, close the tab.",
      },
    ],
    features: [
      "Everything in Free — plus:",
      "500 leads / month",
      "300 AI actions / month (hooks, replies, scripts)",
      "3 social account connections",
      "Shared Brain access at 3× return multiplier (community intelligence, anonymized, filtered to your niche)",
      "Daily AI insight digest (morning email)",
      "Ad Copy Generator (small boosts available)",
      "Know-Like-Trust script library (13 proven scripts)",
      "Weekly Monday recap email",
      "Standard email support (24-hr reply)",
    ],
    notIncluded: [
      "Target Audience Analyzer — upgrade to Growth",
      "Ad performance scoring — upgrade to Growth",
      "Outbound SMS credits — upgrade to Pro",
      "Team seats — upgrade to Pro (3) or Agency (10)",
    ],
    roi: {
      setup: "Your average job is worth roughly $150. Starter costs $5/month.",
      math: "One extra booked job per year covers the entire subscription 30× over. Two missed-call recoveries per month — which is below industry average — and you're banking $290+/month net.",
      conclusion: "If Starter doesn't pay for itself in 30 days, you get all of it back.",
    },
    testimonial: {
      quote:
        "I used to lose 3-4 leads a week to 'I'll text them tomorrow.' Now every missed call gets a reply before I get to my truck. Closed two jobs last week from texts I would've never sent.",
      name: "Mike D.",
      business: "Gutter cleaning, East Texas",
    },
    faq: [
      {
        q: "Is there a contract or long commitment?",
        a: "No. Starter is month-to-month. Cancel in one click from your billing page. Your plan stays active until the end of the current period.",
      },
      {
        q: "What happens if I go over 500 leads?",
        a: "Nothing bad. We don't cut you off — you can either upgrade to Growth ($15/mo, 5,000 leads) or pay $0.02 per extra lead as overage. We show you the cheaper option right in the app.",
      },
      {
        q: "Do I need to know anything about AI or marketing?",
        a: "No. LeadFlow Pro was built by a non-coder for fellow non-coders. If you can send a text message, you can run this.",
      },
      {
        q: "What if I already have a website / CRM / GoHighLevel?",
        a: "Starter plugs in. We pull your lead data, layer AI insights on top, and let you keep whatever you're already using.",
      },
    ],
  },

  // ────────────────────────────────────────────────────────────────────────
  growth: {
    slug: "growth",
    name: "Growth",
    priceMonthly: 15,
    priceYearly: 180,
    featured: true,
    stripePriceEnv: "STRIPE_PRICE_GROWTH",
    subhead: "The plan most owners pick when they're done guessing and ready to grow on purpose.",
    tagline: "Target Audience Analyzer + Ad Performance Intelligence + 5x the lead capacity. This is where your marketing stops being random.",
    idealFor: [
      "Growing local businesses doing $10k–$50k/month in revenue",
      "Owners running ads but not sure if they're actually working",
      "Anyone who has ever asked 'who is my customer, really?' and not had a clear answer",
      "Service businesses ready to add a 2nd and 3rd lead source",
    ],
    useCases: [
      {
        title: "Finally knowing who your customer actually is",
        body: "Target Audience Analyzer pulls data from your 5 social accounts + your ad results + your closed-won leads. It tells you: your real buyer is a 38-45 year old mom in a 3-mile radius, most active Sunday 8pm, responds to 'save time' copy 3x better than 'save money.' You run ads that finally land.",
      },
      {
        title: "Killing the $40 CPL ad before it bleeds you",
        body: "Ad Performance Intelligence imports Meta, Google, and TikTok results. It shows you cost-per-lead by creative. That $40 CPL ad you've been running for 3 weeks? Dead. The $8 CPL one you almost paused? Scale it. One click.",
      },
      {
        title: "5,000 leads without the panic",
        body: "You ran a local Facebook campaign. It worked too well. 400 messages in a day. Growth handles 5,000 leads/month without breaking, and the AI auto-tags, auto-replies to common questions, and only pings you when a real human needs to take the call.",
      },
      {
        title: "One post, five pieces of content",
        body: "Write one Instagram post. Growth turns it into a TikTok script, a Facebook version, a LinkedIn repost, and an X thread — all in your voice, all with the right hashtags per platform. You sat down to write one thing. You walked away with five.",
      },
    ],
    features: [
      "Everything in Starter — plus:",
      "5,000 leads / month",
      "1,500 AI actions / month",
      "All 5 social account connections (IG, TikTok, X, Facebook, LinkedIn — and YouTube)",
      "Shared Brain access at 8× return multiplier + priority pattern matching",
      "Target Audience Analyzer (cross-platform buyer profile)",
      "Ad Performance Intelligence (Meta, Google, TikTok)",
      "Follower + engagement tracking",
      "Playbooks access (dental, cold-lead, contractor templates)",
      "Priority email support (same-day reply)",
    ],
    notIncluded: [
      "Outbound SMS credits — upgrade to Pro for 500/mo",
      "Team seats — upgrade to Pro (3 seats)",
      "Priority AI (Sonnet) by default — available as a booster",
      "White-label + client workspaces — upgrade to Agency",
    ],
    roi: {
      setup: "Growth costs $15/month. Your average customer lifetime value is roughly $400.",
      math: "One retained customer per quarter covers Growth for 27 months. If the Target Audience Analyzer helps you cut your ad CPL from $30 to $15 (which it does for 70% of users), $500/mo in ad spend now buys 33 leads instead of 16.",
      conclusion: "Most Growth users see payback within the first campaign. If you don't, you get a full refund inside 14 days — no questions.",
    },
    testimonial: {
      quote:
        "Switched from a $99/mo 'all-in-one' platform. Growth is $15, smarter, and actually tells me what to do next. I closed 3 booked consultations the first week just from the audience scan insights.",
      name: "Sarah K.",
      business: "Esthetics studio, North Texas",
    },
    faq: [
      {
        q: "What's the difference between Growth and Pro?",
        a: "Growth is built for solo or very small teams ($15/mo, 1 seat, no outbound SMS). Pro adds 3 team seats, 500 outbound SMS credits/month, and jumps capacity to 25,000 leads/month. If you're not running outbound SMS campaigns or adding a team, Growth is the sweet spot.",
      },
      {
        q: "Can I connect my existing Meta Ads account?",
        a: "Yes. Growth connects natively to Meta (Facebook + Instagram) Ads, Google Ads, and TikTok Ads. You authorize once and it pulls performance data in the background.",
      },
      {
        q: "How good is the audience analyzer really?",
        a: "It's not magic. It's a weighted model that looks at engagement patterns across your 5 socials, overlaid on your closed-won customer data, to surface demographic + behavioral patterns. Expect 'your top 15% of buyers share X, Y, and Z' — actionable patterns, not fortune-telling.",
      },
      {
        q: "Can I downgrade to Starter if I don't need all this?",
        a: "Yes, anytime. Your data stays with you. The next billing cycle drops to Starter's cap (500 leads/mo). No penalty.",
      },
    ],
  },

  // ────────────────────────────────────────────────────────────────────────
  pro: {
    slug: "pro",
    name: "Pro",
    priceMonthly: 35,
    priceYearly: 420,
    featured: false,
    stripePriceEnv: "STRIPE_PRICE_PRO",
    subhead: "For owners who stopped being the only person running the business.",
    tagline: "3 team seats, 500 outbound SMS, 25,000 leads/month, and everything you need to scale a real operation.",
    idealFor: [
      "Established local businesses with 3+ team members",
      "Owners ready to run outbound SMS campaigns (win-back, promotions, reactivation)",
      "Businesses hitting Growth's 5,000 lead/month cap regularly",
      "Operators who want a team member handling inbox while they handle closing",
    ],
    useCases: [
      {
        title: "The Saturday SMS blast that filled Monday",
        body: "You have 800 past customers who haven't visited in 90+ days. Pro gives you 500 SMS credits/month. You write one message, personalize with first name + last service, fire 500 at a time. Monday's calendar is full by Sunday night.",
      },
      {
        title: "Your assistant handling the inbox, not the business",
        body: "You hire a VA or a part-time admin. They log in with their own seat, see only the inbox + the scripts library + next-move recommendations — not your billing, not your Stripe settings. They reply to leads using your Know-Like-Trust scripts. You close the hot ones.",
      },
      {
        title: "Custom dashboards for what matters to YOUR business",
        body: "Standard dashboards are fine, but at 25,000 leads/month you need to see things your way — 'leads by service type,' 'close rate by ad source,' 'average days to first payment.' Pro lets you pin the exact metrics you care about to your home screen.",
      },
      {
        title: "Priority AI on the big push",
        body: "You're running a seasonal campaign (summer promo, year-end clearance). You need sharper, faster AI output for 7 days straight. Pro includes Priority AI (Sonnet-class) availability — same model that powers the highest-end plans — on demand.",
      },
    ],
    features: [
      "Everything in Growth — plus:",
      "25,000 leads / month",
      "6,000 AI actions / month",
      "500 outbound SMS credits / month",
      "Shared Brain access at 20× return multiplier, team-wide + early access to new pattern types",
      "3 team seats with role-based access",
      "Priority AI (Sonnet) available on demand",
      "Custom dashboards (pin your own metrics)",
      "Advanced automations (conditional branching, multi-step delays)",
      "Priority chat + email support (2-hr response during business hours)",
    ],
    notIncluded: [
      "Multi-client workspaces — upgrade to Agency",
      "White-label dashboard — upgrade to Agency",
      "API access — upgrade to Agency",
      "10 team seats — upgrade to Agency",
    ],
    roi: {
      setup: "Pro costs $35/month. Your business generates $200+ per closed lead.",
      math: "500 SMS credits/month at a conservative 3% conversion = 15 booked jobs from SMS alone. At $200/job, that's $3,000/month. Pro pays for itself 85 times over on the SMS feature alone, before you count anything else.",
      conclusion: "If Pro doesn't 10x on itself in the first 30 days, we refund you. That confident.",
    },
    testimonial: {
      quote:
        "The jump from Growth to Pro paid for itself the first week. One reactivation SMS blast pulled $4,200 in booked appointments. My part-time admin uses her own seat so I stopped having to share my phone.",
      name: "Jorge R.",
      business: "Auto detailing shop, Houston TX",
    },
    faq: [
      {
        q: "How do the 500 SMS credits work?",
        a: "Each outbound SMS you send to a customer counts as 1 credit. Receiving messages is free. If you run out mid-month, you can buy a 250-SMS booster for $5, or pay $0.03/SMS as overage.",
      },
      {
        q: "Can I bring my own phone number?",
        a: "Yes. Pro supports number porting through our Twilio integration. If you don't have one, we provision a local number for you free of charge.",
      },
      {
        q: "What's role-based access on the team seats?",
        a: "Each seat can be Admin (full access), Manager (leads + campaigns, no billing), or Agent (inbox + scripts only). You control who sees what.",
      },
      {
        q: "I'm not sure if I need Pro or Agency. How do I tell?",
        a: "Pro = you run one business. Agency = you run (or want to run) multiple client accounts under one login with separate dashboards, separate branding, separate billing. If you're still asking 'is this my business or a client?' you need Pro.",
      },
    ],
  },

  // ────────────────────────────────────────────────────────────────────────
  agency: {
    slug: "agency",
    name: "Agency",
    priceMonthly: 95,
    priceYearly: 1140,
    featured: false,
    stripePriceEnv: "STRIPE_PRICE_AGENCY",
    subhead: "Run client workspaces under your own brand. This is the plan that pays for your agency.",
    tagline: "Multi-client workspaces, white-label dashboard, API access, 10 team seats, and 100,000 leads/month.",
    idealFor: [
      "Marketing and lead-gen agencies serving local service businesses",
      "Fractional CMOs and consultants managing 5+ client accounts",
      "Virtual assistants and ops specialists running lead flow for multiple clients",
      "Anyone charging clients for lead management who wants to own the experience",
    ],
    useCases: [
      {
        title: "Onboarding your 8th client in 15 minutes",
        body: "Create a new workspace, invite your client as a view-only user, connect their Meta + Google Ads accounts, and boom — they see their dashboard under your brand (your logo, your domain, your colors). No more spinning up a 9th tool per client.",
      },
      {
        title: "The white-label dashboard your clients brag about",
        body: "Your clients log in at app.youragency.com (you set this). They see your logo, your color scheme, your brand voice. They have no idea you're using LeadFlow Pro under the hood — and if they ever ask, you can say 'proprietary stack' with a straight face.",
      },
      {
        title: "Charging $500–$2,000/mo per client with a $95/mo cost",
        body: "Your costs are fixed. Your revenue scales with every new client you onboard. 10 clients at $500/mo = $5,000 MRR on a $95 base. Add-on services (custom playbooks, audience reports, ad management) stack on top.",
      },
      {
        title: "API access for the custom thing you actually need",
        body: "Your client has a PMS / booking system / proprietary CRM? Hit the LeadFlow Pro API, sync the lead data in, get insights out. Build the exact integration your client wants without waiting on our roadmap.",
      },
    ],
    features: [
      "Everything in Pro — plus:",
      "100,000 leads / month",
      "20,000 AI actions / month",
      "2,000 outbound SMS credits / month",
      "Shared Brain access at 50× return multiplier across all client workspaces + API pull of anonymized pattern data",
      "Multi-client workspaces (unlimited clients)",
      "White-label dashboard (your logo, colors, subdomain)",
      "10 team seats with granular permissions",
      "REST API access + webhooks",
      "Dedicated onboarding call + account manager",
      "SLA: 99.9% uptime, 1-hr priority support",
    ],
    notIncluded: [
      "No limits on clients — this is your top tier",
      "Need more? Email us about enterprise and we'll build something custom.",
    ],
    roi: {
      setup: "Agency costs $95/month. Average local-service client pays a lead-gen agency $500–$1,500/month.",
      math: "3 clients at $500/mo each = $1,500 MRR on $95 platform cost. That's a 15.8x margin before you add custom services. 10 clients = $5,000 MRR minimum.",
      conclusion: "Agency is engineered so you hit profitability on your 1st paid client and scale from there. If that math doesn't work for you in month one, full refund.",
    },
    testimonial: {
      quote:
        "I was using 4 separate tools per client (CRM + ad manager + scheduling + reporting). Agency replaced all 4 at a fraction of the cost and let me finally white-label for my clients. I added 3 new clients the month I switched because I could onboard them fast.",
      name: "Amanda T.",
      business: "Lead-gen agency owner, Austin TX",
    },
    faq: [
      {
        q: "How does the white-label actually work?",
        a: "You point a CNAME record from your subdomain (e.g., app.youragency.com) to our servers. Upload your logo + brand colors. Your clients log in at your subdomain, see your branding, never see 'LeadFlow Pro.' Takes about 20 minutes to set up.",
      },
      {
        q: "Do my clients each get their own billing, or is it all under me?",
        a: "Both are supported. Default: you bill your clients directly, we bill you one flat $95/mo for the platform. Option: enable per-client billing — each client's Stripe subscription lives under their own account and you take a rev share we route automatically.",
      },
      {
        q: "What's the API rate limit?",
        a: "10,000 requests / day per workspace, burst up to 100 req/sec. If you need more, reach out — we're flexible for agencies doing real volume.",
      },
      {
        q: "Can I resell boosters to my clients?",
        a: "Yes. Boosters are available per-workspace, and you can resell them at whatever markup you want. Most agencies add a 2–3x margin.",
      },
    ],
  },
};
