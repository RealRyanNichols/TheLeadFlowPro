// src/lib/tools.ts - Single source of truth for the /tools hub.
//
// The 8 tools are split into two groups:
//   1. Four interactive demos that render on /tools/[slug] with a sandboxed
//      tease-to-convert experience: instant-quote, missed-call-rescue,
//      lead-magnet-quiz, owner-dashboard.
//   2. Four existing tools/pages that already have homes but appear in the
//      gallery so the inventory looks unified: seo-grader, leaderboard-engine,
//      voice-engine, live-pulse. Their cards link out to the real pages.
//
// Stripe payment links resolve through buyHref(): an env var override wins,
// then a hardcoded URL, then a mailto: fallback.
//
// Pricing is denominated in cents to avoid float drift.

import { LEADFLOW_PUBLIC_EMAIL } from "./contact";

export type ToolSlug =
  | "instant-quote"
  | "missed-call-rescue"
  | "lead-magnet-quiz"
  | "owner-dashboard"
  | "seo-grader"
  | "leaderboard-engine"
  | "voice-engine"
  | "live-pulse";

export type ToolDemoType = "sandbox" | "preview" | "try-it";

export type ToolFaq = { q: string; a: string };

export type Tool = {
  slug: ToolSlug;
  name: string;
  oneLineOutcome: string;
  demoType: ToolDemoType;
  proofImageUrl: string;
  setupPriceCents: number;
  setupStripeLink: string;
  monthlyPriceCents: number;
  monthlyStripeLink: string;
  faqs: ToolFaq[];
  // Optional metadata for the gallery + per-tool template.
  audience: string;
  deliverables: string[];
  beforeAfter: { before: string; after: string };
  whoItsFor: string[];
  whyThisPrice: string;
  // When set, the /tools card links here directly (used for the 4 existing
  // tools that already have their own pages instead of an interactive demo).
  externalHref?: string;
};

function mailto(subject: string): string {
  return `mailto:${LEADFLOW_PUBLIC_EMAIL}?subject=${encodeURIComponent(subject)}`;
}

function payHref(slug: string, fallback: string): string {
  if (typeof process !== "undefined" && process.env) {
    const envKey = `STRIPE_LINK_TOOL_${slug.toUpperCase().replace(/-/g, "_")}`;
    const url = process.env[envKey];
    if (url && /^https?:\/\//.test(url)) return url;
  }
  return fallback;
}

function dollars(cents: number): string {
  if (cents === 0) return "$0";
  const d = cents / 100;
  return d % 1 === 0 ? `$${d.toLocaleString("en-US")}` : `$${d.toFixed(2)}`;
}

export function formatToolPrice(cents: number, cadence: "setup" | "monthly"): string {
  if (cents === 0) return cadence === "monthly" ? "Included" : "Free";
  return cadence === "monthly" ? `${dollars(cents)}/mo` : `${dollars(cents)} setup`;
}

export const TOOLS: Record<ToolSlug, Tool> = {
  "instant-quote": {
    slug: "instant-quote",
    name: "Instant Quote Tool",
    oneLineOutcome: "Buyers play with the price, then leave their info.",
    demoType: "sandbox",
    proofImageUrl: "/images/dent-bully-field-content-1.jpg",
    setupPriceCents: 25000,
    setupStripeLink: payHref(
      "instant-quote-setup",
      mailto("Buy: Instant Quote Tool setup $250"),
    ),
    monthlyPriceCents: 9700,
    monthlyStripeLink: payHref(
      "instant-quote-monthly",
      mailto("Buy: Instant Quote Tool $97/mo"),
    ),
    audience: "Contractors, cleaners, med spas, repair shops",
    deliverables: [
      "Branded calculator embedded on your site or hosted on a subdomain",
      "Inputs tuned to your job (size, urgency, distance, add-ons)",
      "Live total with line-item breakdown the buyer can read",
      "Contact capture wired to your inbox + dashboard",
      "Follow-up SMS/email path triggered the moment they submit",
    ],
    beforeAfter: {
      before: "Buyers ghost because they have no idea what your job costs. The form sits empty until someone is desperate.",
      after: "Buyers play with the slider, see a real number, and leave their name + phone because they want the actual quote.",
    },
    whoItsFor: [
      "Service businesses where price scares prospects away before they ask",
      "Owners tired of writing the same quote 30 times a month",
      "Anyone with a job that has 2-4 obvious variables (size, urgency, distance, add-ons)",
    ],
    whyThisPrice: "Setup pays for the calc math, the form wiring, and the embed. The $97/mo keeps it tuned, captures leads to your dashboard, and texts the buyer back without you watching it.",
    faqs: [
      {
        q: "Can you tune the numbers to my real pricing?",
        a: "Yes. Setup includes a 30-min call where we plug in your actual price ranges, urgency modifiers, and distance fees. The math runs in the browser - no AI guessing.",
      },
      {
        q: "Does it embed on Squarespace / Wix / WordPress / Webflow?",
        a: "Yes. We give you a single iframe snippet or a hosted subdomain. Both look native and load instantly.",
      },
      {
        q: "Do leads go to my CRM?",
        a: "They land in your LeadFlow dashboard with source + line-item breakdown. From there we can forward to HubSpot, Notion, Google Sheets, or email.",
      },
      {
        q: "How long until it's live?",
        a: "5-7 days from the kickoff call. We need your price ranges, your logo, and a sample job to model.",
      },
    ],
  },

  "missed-call-rescue": {
    slug: "missed-call-rescue",
    name: "Missed-Call Rescue",
    oneLineOutcome: "Every missed call turns into a text-back the buyer actually replies to.",
    demoType: "try-it",
    proofImageUrl: "/images/ryan-meta-raybans-production-clean.jpg",
    setupPriceCents: 25000,
    setupStripeLink: payHref(
      "missed-call-setup",
      mailto("Buy: Missed-Call Rescue setup $250"),
    ),
    monthlyPriceCents: 14700,
    monthlyStripeLink: payHref(
      "missed-call-monthly",
      mailto("Buy: Missed-Call Rescue $147/mo"),
    ),
    audience: "Local service businesses, appointment shops, mortgage, real estate",
    deliverables: [
      "Twilio number provisioned and connected to your existing line",
      "Custom text-back script using your business name + voice",
      "Live thread view so you can take over the conversation anytime",
      "Owner notification SMS the moment a buyer replies",
      "Weekly recap: missed calls caught, recovered, and converted",
    ],
    beforeAfter: {
      before: "Phone rings, you're on a job, voicemail eats the buyer. They Google your competitor and book them instead.",
      after: "Phone rings, you don't catch it, the buyer gets a text in 15 seconds. They reply. You take the conversation when you finish the job.",
    },
    whoItsFor: [
      "Owners who run jobs and can't always pick up the phone",
      "Anyone losing 5+ calls a week (the math gets ugly fast)",
      "Businesses where the first vendor to reply usually wins",
    ],
    whyThisPrice: "Setup covers the number, the carrier registration, and the template. Monthly covers the carrier fees, the live thread, and the weekly recovery report.",
    faqs: [
      {
        q: "Do I need a new phone number?",
        a: "No. We forward your existing number through Twilio so callers don't see anything change. The text-back comes from a paired number that follows your area code.",
      },
      {
        q: "Can I customize the message?",
        a: "Yes. Setup includes the first template. After that you edit it from your dashboard - the demo on this page shows the same UI.",
      },
      {
        q: "Is it spammy?",
        a: "One text per missed call. No drip. The buyer either replies or they don't - we don't chase them.",
      },
      {
        q: "Does it integrate with my calendar?",
        a: "If you use Cal.com, Calendly, or Google Calendar, we can drop a booking link into the text-back. Add-on, scoped on setup.",
      },
    ],
  },

  "lead-magnet-quiz": {
    slug: "lead-magnet-quiz",
    name: "Lead Magnet Quiz",
    oneLineOutcome: "Buyers self-qualify, get a personalized result, and hand over their email to see it.",
    demoType: "sandbox",
    proofImageUrl: "/images/ryan-live-content-work-1.jpg",
    setupPriceCents: 25000,
    setupStripeLink: payHref(
      "lead-magnet-quiz-setup",
      mailto("Buy: Lead Magnet Quiz setup $250"),
    ),
    monthlyPriceCents: 9700,
    monthlyStripeLink: payHref(
      "lead-magnet-quiz-monthly",
      mailto("Buy: Lead Magnet Quiz $97/mo"),
    ),
    audience: "Coaches, gyms, consultants, real estate, legal support",
    deliverables: [
      "3-7 question quiz tuned to your business and buyer",
      "Branching logic so each answer changes the next question",
      "Personalized result screen + recommended next step",
      "Email capture gated at the result reveal (the real conversion event)",
      "Result-segmented follow-up so cold leads and hot leads get different messages",
    ],
    beforeAfter: {
      before: "Visitor scrolls your homepage, doesn't see themselves, leaves. Your bounce rate is the buyer telling you they didn't feel seen.",
      after: "Visitor takes 90 seconds, sees a result that names their problem, and gives you their email because they want the fix.",
    },
    whoItsFor: [
      "Sellers whose buyer doesn't know which package fits",
      "Coaches / consultants who get 'how does this work' calls 5x a day",
      "Anyone with 3+ packages that look similar at a glance",
    ],
    whyThisPrice: "Setup covers question design, branching logic, the result screens, and the email integration. Monthly keeps it running, refines the questions monthly, and routes leads to your follow-up system.",
    faqs: [
      {
        q: "Where does the email go?",
        a: "Your LeadFlow dashboard, or we forward to ConvertKit, Mailchimp, HubSpot, ActiveCampaign, or plain Google Sheets.",
      },
      {
        q: "Can the quiz recommend a paid offer?",
        a: "Yes. The result screen can route hot leads to a booking link, lukewarm to a nurture sequence, and cold to a free resource. We map that on setup.",
      },
      {
        q: "How many questions is right?",
        a: "3-5 for most businesses. More than 7 and completion rate drops below 40%. We split-test it.",
      },
      {
        q: "Can I see the quiz inputs and answers?",
        a: "Yes - every submission shows up in your dashboard with their answers, their result, and the timestamp.",
      },
    ],
  },

  "owner-dashboard": {
    slug: "owner-dashboard",
    name: "Owner Dashboard",
    oneLineOutcome: "One screen with the numbers that decide your next move.",
    demoType: "preview",
    proofImageUrl: "/images/ryan-jefferson-city-council-meta-raybans.jpg",
    setupPriceCents: 25000,
    setupStripeLink: payHref(
      "owner-dashboard-setup",
      mailto("Buy: Owner Dashboard setup $250"),
    ),
    monthlyPriceCents: 19700,
    monthlyStripeLink: payHref(
      "owner-dashboard-monthly",
      mailto("Buy: Owner Dashboard $197/mo"),
    ),
    audience: "Any business tired of guessing what is working",
    deliverables: [
      "Connected lead inbox: ads, forms, calls, DMs, Cal.com bookings",
      "Live metrics: leads, cost per lead, conversion rate, MRR/revenue",
      "Auto-prioritized next moves so you know who to reply to first",
      "AI insights weekly: what's working, what's leaking",
      "Google Business Profile, Stripe, and Quo integrations when connected",
    ],
    beforeAfter: {
      before: "You have 9 tabs open, a sticky note with phone numbers, and no idea which lead matters most today.",
      after: "You open one screen. The leads are scored. The next move is named. The numbers tell you whether to scale or fix.",
    },
    whoItsFor: [
      "Owners who can't answer 'how much did marketing make us this month?'",
      "Teams of 1-10 who don't need (or want) full Salesforce",
      "Operators who already trust their gut and just want the numbers next to it",
    ],
    whyThisPrice: "Setup covers the integrations (Stripe, Google Business Profile, Quo, ad accounts) and the configured layout. Monthly covers the live data sync, AI weekly insights, and the lead scoring engine.",
    faqs: [
      {
        q: "What integrations are supported?",
        a: "Google Business Profile, Stripe, Quo, Cal.com, Meta ad accounts, and any inbound form. If you need something exotic, we scope it during setup.",
      },
      {
        q: "Do I keep my data if I cancel?",
        a: "Yes. Export to CSV anytime. We don't hold your data hostage.",
      },
      {
        q: "Can my team see it too?",
        a: "Up to 3 seats included. More seats are $20/mo each.",
      },
      {
        q: "Is the AI insights thing actually useful?",
        a: "It's a weekly summary that says 'your CPL dropped 18% on Tuesdays, push more budget there' - real patterns, not generic platitudes. If it ever feels useless we turn it off and refund the difference.",
      },
    ],
  },

  "seo-grader": {
    slug: "seo-grader",
    name: "SEO Grader",
    oneLineOutcome: "Grade any local-business website in 10 seconds and see the exact fixes.",
    demoType: "try-it",
    proofImageUrl: "/images/ryan-cmon-man-marketing.jpg",
    setupPriceCents: 0,
    setupStripeLink: payHref("seo-grader-setup", "/tools/seo-grader"),
    monthlyPriceCents: 4700,
    monthlyStripeLink: payHref(
      "seo-grader-monthly",
      mailto("Buy: SEO Grader monthly scan $47/mo"),
    ),
    externalHref: "/tools/seo-grader",
    audience: "Local businesses, agencies, owners who want to know if their site is broken",
    deliverables: [
      "Live 14-point SEO scan with A-F grade",
      "Plain-English fixes ranked by impact",
      "Weekly automated re-scan (monthly tier)",
      "Competitor comparison (monthly tier)",
      "Fix queue you can work through one at a time",
    ],
    beforeAfter: {
      before: "You're paying for traffic to a site you've never SEO-audited. Google quietly downgrades your rankings while you pay for clicks.",
      after: "You see the grade. You see the fixes. You ship them or hand them to me, and your organic search starts pulling weight.",
    },
    whoItsFor: [
      "Local businesses that haven't audited their site in 6+ months",
      "Agencies who want a free embedded tool that captures leads",
      "Anyone whose 'website is fine' but the calls aren't coming",
    ],
    whyThisPrice: "The grader itself is free forever. The $47/mo tier is for weekly re-scans, competitor comparison, and a fix queue - the difference between knowing and shipping.",
    faqs: [
      {
        q: "Is the free version actually free?",
        a: "Yes. Always. No email gate. Paste the URL, get the grade. The $47/mo is for the recurring scan and the fix tracker.",
      },
      {
        q: "What does it check?",
        a: "14 on-page signals: title, meta description, H1, canonical, Open Graph, Twitter card, HTTPS, viewport, favicon, JSON-LD, robots, content length, alt text, internal links.",
      },
      {
        q: "Will it fix the issues for me?",
        a: "No - it tells you what's broken in plain English. If you want the fixes shipped, that's a separate engagement (Quick-Look $47 or Business Audit $497).",
      },
      {
        q: "Does it work for any site?",
        a: "Any public, crawlable URL. Behind-login pages and JS-only sites that block bots will return a partial score.",
      },
    ],
  },

  "leaderboard-engine": {
    slug: "leaderboard-engine",
    name: "Leaderboard Engine",
    oneLineOutcome: "Run a live Top 10 board for your industry, niche, or community.",
    demoType: "preview",
    proofImageUrl: "/images/ryan-live-content-work-2.jpg",
    setupPriceCents: 49700,
    setupStripeLink: payHref(
      "leaderboard-engine-setup",
      mailto("Buy: Leaderboard Engine setup $497"),
    ),
    monthlyPriceCents: 9700,
    monthlyStripeLink: payHref(
      "leaderboard-engine-monthly",
      mailto("Buy: Leaderboard Engine $97/mo"),
    ),
    externalHref: "/leaderboard",
    audience: "Community operators, niche publishers, agency owners with a roster",
    deliverables: [
      "Public Top 10 page tuned to your niche or community",
      "Submission form so candidates apply in",
      "Boost mechanic (paid bumps, free votes, or both)",
      "Auto-rotation by signal: revenue, growth, engagement, or custom",
      "Embeddable widget for partner sites",
    ],
    beforeAfter: {
      before: "Your niche has 80 great operators and no way to see who's actually winning. Attention scatters.",
      after: "There's one obvious list everyone watches. Candidates compete to be on it. The list becomes the lead magnet.",
    },
    whoItsFor: [
      "Community owners who want a built-in social proof engine",
      "Niche publications that need a recurring story format",
      "Agencies who want to gamify client visibility",
    ],
    whyThisPrice: "Setup covers the niche-specific board, scoring rules, and the submission flow. Monthly covers hosting, the boost ledger, and weekly ranking updates.",
    faqs: [
      {
        q: "Can I see a live version?",
        a: "Yes - our own Top 10 lives at /leaderboard. The mechanic, the boost flow, and the submission form are exactly what you get.",
      },
      {
        q: "Can I monetize the boost?",
        a: "Yes. Stripe-connected boost payments split 80/20 (you keep 80). Or run it free if you'd rather use it as community signal.",
      },
      {
        q: "What signals can rank candidates?",
        a: "Revenue, follower count, engagement rate, peer votes, paid boost, or a weighted blend. We map it on the kickoff call.",
      },
      {
        q: "Can it embed on my site?",
        a: "Yes - we provide an iframe and a JSON feed if you'd rather render it yourself.",
      },
    ],
  },

  "voice-engine": {
    slug: "voice-engine",
    name: "Voice Engine",
    oneLineOutcome: "Your community submits topics, votes, and you turn the winners into content.",
    demoType: "preview",
    proofImageUrl: "/images/ryan-meta-raybans-production-clean.jpg",
    setupPriceCents: 29700,
    setupStripeLink: payHref(
      "voice-engine-setup",
      mailto("Buy: Voice Engine setup $297"),
    ),
    monthlyPriceCents: 9700,
    monthlyStripeLink: payHref(
      "voice-engine-monthly",
      mailto("Buy: Voice Engine $97/mo"),
    ),
    externalHref: "/voice",
    audience: "Local representatives, niche operators, creators with an engaged audience",
    deliverables: [
      "Public topic submission page tuned to your audience",
      "Vote / upvote mechanic with anti-spam guardrails",
      "Topic detail pages auto-generated per submission",
      "Owner dashboard so you see momentum across the queue",
      "Content seed pack monthly: top 5 topics turned into post hooks",
    ],
    beforeAfter: {
      before: "You guess what your audience wants. You post. It flops or hits randomly. Repeat.",
      after: "Your audience tells you what to make. You make it. The piece that came from a vote outperforms the one you guessed at.",
    },
    whoItsFor: [
      "Creators with an audience of 5K+ who post regularly",
      "Operators running town-hall-style listening sessions",
      "Niche publishers picking what to cover next",
    ],
    whyThisPrice: "Setup covers the configured submission page, the voting mechanic, and the spam guardrails. Monthly covers the monthly content seed pack and the auto-generated topic pages.",
    faqs: [
      {
        q: "Can I see it live?",
        a: "Yes - /voice runs the same mechanic for East TX civic topics. Same submission form, same vote flow, same topic pages.",
      },
      {
        q: "How do you stop spam?",
        a: "Rate-limit per IP, optional email gate, and a one-vote-per-person mechanic that uses a fingerprinted cookie. Not bulletproof, but good enough for community-scale.",
      },
      {
        q: "Do I have to post the winning topic?",
        a: "No - it's a queue, not a contract. Use it as research, then post when you have the right angle.",
      },
      {
        q: "Can I export the data?",
        a: "Yes - CSV export and webhook events on every submission and vote.",
      },
    ],
  },

  "live-pulse": {
    slug: "live-pulse",
    name: "Live Pulse",
    oneLineOutcome: "Real-time visitor, share, and click signals so you know what your traffic is doing right now.",
    demoType: "preview",
    proofImageUrl: "/images/dent-bully-field-content-2.jpg",
    setupPriceCents: 9700,
    setupStripeLink: payHref(
      "live-pulse-setup",
      mailto("Buy: Live Pulse setup $97"),
    ),
    monthlyPriceCents: 4700,
    monthlyStripeLink: payHref(
      "live-pulse-monthly",
      mailto("Buy: Live Pulse $47/mo"),
    ),
    externalHref: "/pulse",
    audience: "Anyone running a website who wants to see attention move in real time",
    deliverables: [
      "1-line tracking snippet for your site",
      "Live visitor count, sources, and share-back signals",
      "Signal pages: top movers, top referrers, top destinations",
      "Owner dashboard with daily / weekly / monthly rollups",
      "Slack / SMS alerts when signal spikes (monthly tier)",
    ],
    beforeAfter: {
      before: "Google Analytics is a graveyard. You look at it once a month, mutter, and close it.",
      after: "You glance at Pulse on your phone and know whether the post you just shipped is moving anything.",
    },
    whoItsFor: [
      "Owners who actually want to feel their traffic, not just read a weekly report",
      "Anyone running a campaign who needs a real-time feedback loop",
      "Operators who hate Google Analytics 4 (most of them)",
    ],
    whyThisPrice: "Setup covers the snippet, the configured signals, and the embed. Monthly covers hosting, the alert system, and the weekly rollup.",
    faqs: [
      {
        q: "How is this different from Google Analytics?",
        a: "It's not a replacement. It's the dashboard you actually open every morning. GA4 is for the audits. Pulse is for the day-to-day feel of attention.",
      },
      {
        q: "Does it track personal data?",
        a: "No. No cookies. No PII. We track visit, source, and share-back signals only.",
      },
      {
        q: "Will it slow my site?",
        a: "The snippet is 1.4kb and loads async. We've never seen a Lighthouse score change because of it.",
      },
      {
        q: "Can I see what it looks like?",
        a: "Yes - /pulse is our own Live Pulse running on our own site. Click around - the data is real.",
      },
    ],
  },
};

export const TOOL_LIST: Tool[] = [
  TOOLS["instant-quote"],
  TOOLS["missed-call-rescue"],
  TOOLS["lead-magnet-quiz"],
  TOOLS["owner-dashboard"],
  TOOLS["seo-grader"],
  TOOLS["leaderboard-engine"],
  TOOLS["voice-engine"],
  TOOLS["live-pulse"],
];

export function isToolSlug(slug: string): slug is ToolSlug {
  return slug in TOOLS;
}

export function getTool(slug: string): Tool | null {
  return isToolSlug(slug) ? TOOLS[slug] : null;
}

export function toolHubHref(tool: Tool): string {
  return tool.externalHref ?? `/tools/${tool.slug}`;
}
