// src/lib/offers.ts — Single source of truth for all sellable offers.
//
// Every offer renders through /app/offers/[slug]/page.tsx using the same
// section structure: HERO + price card / WHY BUY / WHAT HAPPENS WHEN YOU
// BUY / WHO IT'S FOR & NOT FOR / COST OF NOT BUYING / PROOF / FAQ / FINAL
// CTA. Edit the data here; the template renders accordingly.
//
// Pricing rules:
//  - Sticker prices stay stable; credit math absorbs cost shifts (Ryan rule)
//  - Texas-law engagement letter + mutual NDA on every paid engagement
//  - Money-back: scheduling refund within 24h if a slot can't be set;
//    otherwise no refund post-delivery (results aren't guaranteed)

import type { LucideIcon } from "lucide-react";
import {
  Briefcase, Calendar, Check, Clock, Compass, FileText, Flag, Layers,
  LineChart, Megaphone, Rocket, ShieldCheck, Sparkles, Target, TrendingUp,
  Trophy, Users, Wrench, Zap,
} from "lucide-react";
import { STRIPE_PAYMENT_LINKS } from "./stripe-links";

export type OfferSlug =
  | "quick-look"
  | "decision-sprint"
  | "business-audit"
  | "light-retainer"
  | "power-bundle"
  | "fb-ads"
  | "working-session"
  | "monthly-operator"
  | "sprint-4-week"
  | "annual-advisor";

export type Offer = {
  slug: OfferSlug;
  tier: 1 | 2 | 3 | 4;
  category: "consulting" | "social" | "ads" | "operator" | "advisor";
  cadence: string;            // "one-time" / "monthly" / "annual" / "4-week sprint"
  badge: string;              // chip text in hero
  Icon: LucideIcon;

  metaTitle: string;
  metaDescription: string;

  hero: {
    h1Lead: string;           // first-half sentence
    h1Highlight: string;      // gradient-text emphasis
    paragraph: string;
    paragraph2?: string;
  };

  price: {
    big: string;              // "$90", "$497", "$1,997"
    sub: string;              // "for 90 minutes", "one-time", "/mo"
    badge?: string;           // "$1 / minute", "Saves $500/mo", etc.
    deliverables: string[];   // bullet list
    addOn?: { title: string; body: string };
  };

  primaryCta: { label: string; href: string };       // mailto: lock-in or Stripe link
  secondaryCta: { label: string; href: string };

  whyBuy: { Icon: LucideIcon; title: string; body: string }[];     // 3
  timeline: { n: string; minutes: string; title: string; body: string }[]; // 4
  rightFit: string[];          // 5
  wrongFit: string[];          // 5
  costMath: {
    stuck: { big: string; sub: string };
    buy:   { big: string; sub: string };
  };
  proof: { big: string; label: string }[];          // 4
  faqs: { q: string; a: string }[];                  // 5–7

  upgradeCredit?: string;                            // "Apply $90 toward $497 within 30 days"
};

const RYAN_EMAIL = "theflashflash24@gmail.com";

function mailto(subject: string): string {
  return `mailto:${RYAN_EMAIL}?subject=${encodeURIComponent(subject)}`;
}

/**
 * Resolution order for the buy button URL:
 *   1. STRIPE_LINK_<SLUG> env var if set (override path — useful for one-off
 *      promo links without a code change)
 *   2. STRIPE_PAYMENT_LINKS[slug] from /lib/stripe-links.ts (the canonical
 *      live URLs created in Stripe on 2026-05-05)
 *   3. mailto: lock-in (last-resort fallback)
 *
 * Env var naming: lowercase slug uppercased + dashes → underscores.
 *   decision-sprint   → STRIPE_LINK_DECISION_SPRINT
 *   light-retainer    → STRIPE_LINK_LIGHT_RETAINER
 *   sprint-4-week     → STRIPE_LINK_SPRINT_4_WEEK
 */
function buyHref(slug: string, fallbackSubject: string): string {
  if (typeof process !== "undefined" && process.env) {
    const envKey = `STRIPE_LINK_${slug.toUpperCase().replace(/-/g, "_")}`;
    const url = process.env[envKey];
    if (url && /^https?:\/\//.test(url)) return url;
  }
  const hardcoded = STRIPE_PAYMENT_LINKS[slug as keyof typeof STRIPE_PAYMENT_LINKS];
  if (hardcoded) return hardcoded;
  return mailto(fallbackSubject);
}

/* ─── shared scaffolding ──────────────────────────────────────── */

const RYAN_PROOF = [
  { big: "75K+",  label: "Followers built from zero across 5 platforms" },
  { big: "6",     label: "Companies founded — LeadFlow Pro, RepWatchr, Faretta.Legal, Faretta.AI, Wholesale Universe, Rescue The Universe" },
  { big: "10+ yr", label: "Years operating in social, ads, sales, lead gen" },
  { big: "Premier Dental Academy", label: "Of Longview — client work: built website + student/admin tools + ran their ads" },
];

const TEXAS_NDA_FAQ = {
  q: "Texas-law NDA?",
  a: "Yes. Mutual. Sample available before payment if you ask. Every paid engagement runs under a Texas-law engagement letter.",
};

/* ─── offer catalog ───────────────────────────────────────────── */

export const OFFERS: Record<OfferSlug, Offer> = {
  /* ──────────── 0. QUICK-LOOK VIDEO — Tier 1 micro — $47 ──────────── */
  "quick-look": {
    slug: "quick-look",
    tier: 1,
    category: "consulting",
    cadence: "one-time",
    badge: "Tier 1 micro · One-time · 5-min personalized video",
    Icon: Sparkles,
    metaTitle: "Quick-Look Video — $47 · The LeadFlow Pro",
    metaDescription:
      "I look at your social and tell you the next post to make. 5-minute personalized video reviewing your accounts, your offer, and the single highest-leverage post you should ship this week.",

    hero: {
      h1Lead: "$47. I look at your socials.",
      h1Highlight: "I tell you the next post to make.",
      paragraph:
        "You give me your handles. I spend 30 minutes reviewing them. I record a 5-minute personalized video walking through what's working, what's leaking, and the single highest-leverage post you should ship this week — written out for you in the same email.",
    },
    price: {
      big: "$47",
      sub: "one-time · 24-hour delivery",
      badge: "Cheapest path to Ryan's eyes",
      deliverables: [
        "5-minute personalized video reviewing YOUR socials",
        "The exact next post to make this week (script + hook + caption)",
        "Top-3 quick fixes I'd make to your bio / banner / pinned content",
        "Delivered within 24 hours of payment + intake form",
      ],
    },
    primaryCta: { label: "Reserve Quick-Look — $47", href: buyHref("quick-look", "Buy: Quick-Look Video $47") },
    secondaryCta: { label: "See the $90 Sprint instead", href: "/offers/decision-sprint" },

    whyBuy: [
      { Icon: Sparkles, title: "Cheapest path to my eyes", body: "Most consultants don't look at your stuff until you've paid 4 figures. This is $47 for 30 minutes of my actual attention on your actual accounts." },
      { Icon: Clock,    title: "24-hour turnaround",       body: "Pay before noon Mon–Thu, get it back by EOD next day. Friday orders ship Monday." },
      { Icon: TrendingUp, title: "One post can pay for the review", body: "If the next post I write for you creates one serious lead, the video can pay for itself. No guarantee — just practical math." },
    ],
    timeline: [
      { n: "1", minutes: "Day 0",    title: "Pay & intake",   body: "$47 via Stripe (mailto for now). 5-question intake form: handles, offer, target customer, biggest current frustration, where you'd love to be in 90 days." },
      { n: "2", minutes: "Day 0–1",  title: "I look",         body: "I spend 30 minutes inside your accounts. Pull up your last 30 posts. Read your bio. Click your link-in-bio. Make notes." },
      { n: "3", minutes: "Day 1",    title: "I record",       body: "5-minute screen-shared video walking through everything. Loom or Vimeo link emailed to you." },
      { n: "4", minutes: "Day 1",    title: "Written follow-up", body: "Same email contains: the post script, the bio rewrite, the top-3 quick fixes. Ready to ship." },
    ],
    rightFit: [
      "You're posting but not gaining traction",
      "You can name your offer in one sentence",
      "You'll fill out a 5-question intake (~5 minutes)",
      "You'll actually ship the post I write for you",
      "You're cool with a 5-min video, not a 60-min audit",
    ],
    wrongFit: [
      "You haven't posted anywhere yet (start posting, then come back)",
      "You want a deep audit (book the $497 instead)",
      "You want me to also write the next 30 posts (that's the $497/mo Power Bundle)",
      "You expect a whole strategy review (this is one post + quick wins)",
      "You're hoping $47 replaces a real engagement (it's the entry point)",
    ],
    costMath: {
      stuck: { big: "$0", sub: "Cost of doing nothing this week. The post you don't ship is the lead you don't get is the dollar that doesn't come in." },
      buy:   { big: "$47",  sub: "30 minutes of my eyes on your accounts + a written next move + a 5-min video. Pays for itself the first time the post lands a real lead." },
    },
    proof: RYAN_PROOF,
    faqs: [
      { q: "Is this a recurring thing?", a: "No — one-time. If you want regular eyes, that's the $1,997/mo Light Retainer or the Power Bundle." },
      { q: "What platforms do you cover?", a: "Up to 3 of: TikTok, FB, X, YouTube, Instagram, LinkedIn. Pick the most important to you on intake." },
      { q: "What if I want a follow-up?", a: "Apply the $47 toward a $90 Decision Sprint or a $497 Audit within 30 days." },
      { q: "Refunds?", a: "If I can't deliver in 48 hours, full refund. Otherwise, you got the work — no refund." },
      { q: "Can you do this for a friend / partner?", a: "Yes — name on intake. Buy gift-style — they'll get the email." },
      TEXAS_NDA_FAQ,
    ],
    upgradeCredit: "Apply $47 toward a $90 Decision Sprint or $497 Audit within 30 days.",
  },

  /* ──────────── 1. DECISION SPRINT — Tier 1 — $90/90 ──────────── */
  "decision-sprint": {
    slug: "decision-sprint",
    tier: 1,
    category: "consulting",
    cadence: "one-time",
    badge: "Tier 1 · One-time · Lowest-friction 1:1 with Ryan",
    Icon: Compass,
    metaTitle: "$90 for 90 Minutes — A Dollar Per Minute With Ryan · The LeadFlow Pro",
    metaDescription:
      "One stuck business decision unpacked in 90 minutes with Ryan Nichols. Recorded call, full transcript, action worksheet — all delivered within 24 hours.",

    hero: {
      h1Lead: "$90 for 90 minutes.",
      h1Highlight: "A dollar a minute with Ryan.",
      paragraph:
        "One stuck decision. 90 focused minutes. A written action worksheet in your inbox by tomorrow. Not a discovery call. Not a coaching session. A working session priced so a serious business owner says yes on the spot — but cheap-shoppers click away.",
      paragraph2:
        "I've changed the trajectory of businesses in 20-minute conversations. Imagine what we can do with 90.",
    },
    price: {
      big: "$90",
      sub: "for 90 minutes",
      badge: "$1 / minute",
      deliverables: [
        "90 minutes, just you and me — FaceTime, Zoom, or phone",
        "Recorded call — yours forever, delivered same day",
        "Full transcript — searchable copy of everything we said",
        "Action worksheet — what we covered + your next 3 moves, in your inbox by tomorrow",
      ],
      addOn: {
        title: "Local in-person add-on · +$100",
        body:
          "East Texas only. $50 there + $50 back. Same 90 minutes, same deliverables. Anywhere outside East Texas → FaceTime / Zoom / phone (no travel cost).",
      },
    },
    primaryCta: { label: "Reserve the Sprint — $90", href: buyHref("decision-sprint", "Buy: 90-Minute Decision Sprint $90") },
    secondaryCta: { label: "Free 10-min call first", href: "/book" },

    whyBuy: [
      {
        Icon: Clock,
        title: "The cost of staying stuck",
        body: "Every week a decision sits on your desk, the underlying problem compounds. A pricing decision delayed 4 weeks usually costs more than the entire business audit + working session combined.",
      },
      {
        Icon: Target,
        title: "Why $90 not $497",
        body: "This isn't a strategic engagement. It's one decision, fully unpacked, with a written recommendation. Priced to be a no-brainer for owners who just need a sharp second brain on a single call.",
      },
      {
        Icon: Zap,
        title: "Why 90 min not 60 min",
        body: "60 minutes is enough to talk about a decision. 90 minutes is enough to actually MAKE the decision — surface every constraint, weigh every trade-off, and end with the call written down.",
      },
    ],
    timeline: [
      { n: "1", minutes: "0 min",        title: "Pay & schedule",  body: "Email lock-in (Stripe checkout once Payment Links are wired). You pick a slot from Ryan's calendar within 5 business days." },
      { n: "2", minutes: "24 hrs before", title: "Pre-call note",   body: "You email Ryan a 1-paragraph note: what's the decision, options on the table, what you've already tried." },
      { n: "3", minutes: "90 min",       title: "The call",         body: "Live video. Shared doc open. Ryan asks the questions, you bring the context, we land on the call together." },
      { n: "4", minutes: "24 hrs after", title: "Three deliverables", body: "Recorded call (yours forever) + full transcript + action worksheet (the call written up + your next 3 moves)." },
    ],
    rightFit: [
      "You have one specific decision that's been stuck for 2+ weeks",
      "You can describe the decision in one sentence",
      "You'll do 5 minutes of pre-work (the 1-paragraph note)",
      "You're a real operator with a real business — not just kicking tires",
      "You'll act on the recommendation within 30 days, even if you disagree",
    ],
    wrongFit: [
      "You don't actually have a decision yet — you have 'general questions'",
      "You want a 90-minute coaching session on ten different topics",
      "You want guarantees about which option will work best",
      "You're shopping consultants for the lowest price",
      "You're hoping a $90 call will replace a real strategic engagement",
    ],
    costMath: {
      stuck: { big: "$1,200+", sub: "Median weekly opportunity cost of a delayed pricing/hire/offer decision (4 weeks at ~$300/wk impact). Plus team morale, lost momentum, and the 'just keep doing what we're doing' default." },
      buy:   { big: "$90",     sub: "One time. 90 minutes. A written recommendation in your inbox. Even if you disagree with the call, you've eliminated the option you didn't pick — that alone is worth the price." },
    },
    proof: RYAN_PROOF,
    faqs: [
      { q: "What if my decision isn't really 'one' decision?", a: "Then you book the $497 Business Audit instead. The Decision Sprint is for one stuck thing. The Audit is for the whole business." },
      { q: "Can I get a refund if I disagree with the recommendation?", a: "No. You're paying for the working session and the written recommendation, not for the recommendation matching what you wanted to hear. Refunds available within 24 hours of paying if scheduling falls through." },
      { q: "Will Ryan record the call?", a: "Yes. Recording delivered same day. You own it forever. You also get a full transcript." },
      { q: "Can we meet in person?", a: "If you're in East Texas — yes. Local in-person add-on is +$100 ($50 there, $50 back). Anywhere else in the U.S. is FaceTime, Zoom, or phone. Same 90 minutes, same deliverables." },
      { q: "What if I need a follow-up?", a: "Book another sprint, or apply the $90 toward the $497 Audit if you do that within 30 days." },
      TEXAS_NDA_FAQ,
    ],
    upgradeCredit: "Apply your $90 toward the $497 Business Audit within 30 days.",
  },

  /* ──────────── 2. BUSINESS AUDIT — Tier 2 — $497 ──────────── */
  "business-audit": {
    slug: "business-audit",
    tier: 2,
    category: "consulting",
    cadence: "one-time",
    badge: "Tier 2 · One-time · Whole-business written audit",
    Icon: FileText,
    metaTitle: "Business Audit — $497 · The LeadFlow Pro",
    metaDescription:
      "Comprehensive written audit of your offer, lead flow, pricing, sales process, and tech stack. PDF + editable doc delivered within 7 days. Built for owners ready to fix what's actually broken.",

    hero: {
      h1Lead: "$497 for the whole picture.",
      h1Highlight: "What's bleeding money — in writing.",
      paragraph:
        "I review your offer, your lead flow, your pricing, your sales process, and your tech stack. You get a 12–18 page written audit naming exactly what's leaking revenue, what's overbuilt, and what to fix in what order.",
      paragraph2:
        "This is the document you wish a competent operator had handed you 12 months ago. Most owners discover at least one $5K-per-month leak inside it.",
    },
    price: {
      big: "$497",
      sub: "one-time · 7-day turnaround",
      badge: "Most-bought consulting offer",
      deliverables: [
        "60-minute intake call (recorded + transcribed)",
        "12–18 page written audit (PDF + editable doc)",
        "Top-3 fixes ranked by ROI + difficulty",
        "30-min review call to walk you through it",
        "Audit recording you keep forever",
      ],
    },
    primaryCta: { label: "Begin the Audit — $497", href: buyHref("business-audit", "Buy: Business Audit $497") },
    secondaryCta: { label: "Free 10-min call first", href: "/book" },

    whyBuy: [
      { Icon: LineChart, title: "You can't fix what you can't see", body: "Most owners can name 1–2 problems. The audit names 8–14 — and ranks them so you fix the leak that's bleeding the most first." },
      { Icon: Wrench,    title: "Written, not 'we discussed'",       body: "A call is forgotten in a week. A 12–18 page document on your desktop is referenced for years." },
      { Icon: Trophy,    title: "Worth the money if one leak is real", body: "If the audit finds one broken offer, ad leak, dead follow-up path, or wasted workflow you actually fix, the written plan can pay for itself." },
    ],
    timeline: [
      { n: "1", minutes: "Day 0",  title: "Intake & access",  body: "60-min recorded intake call. You grant read-only access to your ad accounts, CRM, and analytics. Pre-work form: ~20 minutes." },
      { n: "2", minutes: "Day 1–4", title: "Deep audit",       body: "Ryan reviews everything. Writes the 12–18 page report. References your actual numbers, not generic frameworks." },
      { n: "3", minutes: "Day 5",  title: "Review call",      body: "30-min recorded call. Ryan walks you through the audit. You ask clarifying questions, push back, mark up the doc together." },
      { n: "4", minutes: "Day 7",  title: "Final delivery",   body: "Final PDF + editable doc emailed to you. Audit recording attached. Top-3 fixes ranked. Done." },
    ],
    rightFit: [
      "You're doing $5K+/mo and want to see where it's leaking",
      "You're considering a major change (pricing, hire, market shift)",
      "You'll grant read-only access to ads, CRM, analytics",
      "You'll do 20 min of pre-work + a 60-min intake call",
      "You'll act on at least the top-3 fixes within 60 days",
    ],
    wrongFit: [
      "You haven't started yet — there's nothing to audit",
      "You want a 'gut check', not a written deliverable",
      "You won't grant read-only access (then there's nothing to audit)",
      "You're allergic to feedback that doesn't agree with you",
      "You want a guarantee about how much money the audit will save",
    ],
    costMath: {
      stuck: { big: "$5K+/mo", sub: "Median size of the largest leak the audit identifies. Multiply by months you've been bleeding." },
      buy:   { big: "$497",    sub: "One-time. 12–18 pages. The whole picture. Pays for itself in 1–2 weeks if you fix one thing." },
    },
    proof: RYAN_PROOF,
    faqs: [
      { q: "Will you give me a refund if I disagree with the audit?", a: "No. You're paying for the work and the deliverable, not for the conclusions matching what you hoped. Refunds available within 24 hours of paying if scheduling falls through." },
      { q: "What if my audit reveals something embarrassing?", a: "It will. That's the point. Texas-law mutual NDA means none of it leaves the room." },
      { q: "Can the audit replace a fractional COO?", a: "No. The audit is a snapshot diagnosis. Implementation is a separate engagement (Light Retainer $1,997/mo or Monthly Operator $4,997/mo)." },
      { q: "What if I need help implementing?", a: "Apply the $497 toward a Light Retainer ($1,997/mo) or Monthly Operator ($4,997/mo) within 60 days." },
      { q: "Can I expense it as professional services?", a: "Yes — Real Ryan Nichols LLC, Texas-law engagement letter, invoice issued on payment." },
      TEXAS_NDA_FAQ,
    ],
    upgradeCredit: "Apply your $497 toward a Light Retainer or Monthly Operator engagement within 60 days.",
  },

  /* ──────────── 3. LIGHT RETAINER — Tier 2 — $1,997/mo ──────────── */
  "light-retainer": {
    slug: "light-retainer",
    tier: 2,
    category: "consulting",
    cadence: "monthly",
    badge: "Tier 2 · Monthly · Fractional advisor on retainer",
    Icon: Briefcase,
    metaTitle: "Light Retainer — $1,997/mo · The LeadFlow Pro",
    metaDescription:
      "Fractional advisor on retainer. Two 60-min strategy calls per month, async voice memo support, every-other-week written briefing. For owners doing $20K+/mo who need a sharp second brain — not a fractional COO.",

    hero: {
      h1Lead: "$1,997 a month for a sharp second brain.",
      h1Highlight: "Two calls. Async support. Written briefings.",
      paragraph:
        "You don't need a fractional COO running your operation. You need a high-leverage advisor who knows your business, returns voice memos, and pushes back when you're about to make a mistake.",
      paragraph2:
        "Two recorded 60-minute calls per month. Unlimited async voice memo support inside business hours. A written briefing every other week so we don't lose the thread.",
    },
    price: {
      big: "$1,997",
      sub: "/month · month-to-month",
      badge: "Cancel anytime · 30-day notice",
      deliverables: [
        "2× recorded 60-min strategy calls / month",
        "Async voice memo support (M–F, 9–6 CT)",
        "Written briefing every other week",
        "Shared Notion / Google Drive for working docs",
        "First-look at every new playbook & framework",
      ],
    },
    primaryCta: { label: "Start retainer — $1,997/mo", href: buyHref("light-retainer", "Buy: Light Retainer $1,997/mo") },
    secondaryCta: { label: "Free 10-min call first", href: "/book" },

    whyBuy: [
      { Icon: TrendingUp, title: "Compounding context",       body: "Month 1, I learn your business. Month 6, I know it better than your accountant. Decisions get faster and sharper because I'm not re-loading context every call." },
      { Icon: Sparkles,   title: "Async > scheduled",         body: "The good decisions aren't on the calendar — they're at 8:42 a.m. when you spot something weird in the data. Voice memo me. I respond." },
      { Icon: ShieldCheck, title: "Skin in your game",        body: "Mutual Texas-law NDA. No equity stake (you keep all upside). No commission (no incentive to push you toward bad ideas). Cash retainer only." },
    ],
    timeline: [
      { n: "1", minutes: "Day 1",  title: "Onboarding sprint",  body: "60-min kickoff. Same intake as the $497 audit. We compress 'who you are, what you sell, where it bleeds' into the first call." },
      { n: "2", minutes: "Day 1–7", title: "First written briefing", body: "Written summary of what I see, what I'd test first, what I'd cut. Sets the agenda for month one." },
      { n: "3", minutes: "Each month", title: "2 calls + async",  body: "Two 60-min strategy calls. Voice memos in between. Recordings + transcripts archived." },
      { n: "4", minutes: "Bi-weekly", title: "Written briefing",  body: "Every other Friday: 1-page memo. What changed. What to push on. What to cut. Yours forever." },
    ],
    rightFit: [
      "You're doing $20K+/mo and growing",
      "You make 3–5 strategic decisions per month and want backup",
      "You'll send a voice memo when something feels weird (not bottle it)",
      "You can defend your numbers — bring real metrics, not vibes",
      "You commit to 90 days minimum to give the engagement time to compound",
    ],
    wrongFit: [
      "You haven't made any money yet — start with the $497 Audit",
      "You want someone to do the work for you (that's the Monthly Operator)",
      "You want me on every internal call (that's the Annual Advisor)",
      "You can't articulate one decision per month worth advising on",
      "You're shopping for a coach (this is an advisor relationship, not a coach relationship)",
    ],
    costMath: {
      stuck: { big: "$25K+", sub: "Median annual cost of going alone on the wrong direction for 6 months. One avoided wrong-hire pays for the retainer for a year." },
      buy:   { big: "$1,997/mo", sub: "Two recorded calls + async + written briefings. Cancels with 30-day notice. No equity, no commission, no surprises." },
    },
    proof: RYAN_PROOF,
    faqs: [
      { q: "How fast do you respond to voice memos?", a: "Within one business day Mon–Fri. I don't promise nights or weekends — that's a boundary that keeps the work sharp." },
      { q: "Can I roll unused calls forward?", a: "One call rolls forward one month if not used. After that, it expires. The point is the rhythm — async fills the gaps." },
      { q: "Can my partner / co-founder be on calls?", a: "Yes — up to 2 people on the call. More than that is a different kind of engagement." },
      { q: "What if I want to upgrade to Monthly Operator?", a: "Pro-rated. Last month's retainer applies as credit toward the first month of Monthly Operator." },
      { q: "Is there an exclusivity / non-compete?", a: "I won't take on a direct competitor in your specific niche while we're working together. Mutual." },
      TEXAS_NDA_FAQ,
    ],
    upgradeCredit: "Last month's retainer credits toward Month 1 of Monthly Operator if you upgrade.",
  },

  /* ──────────── 4. POWER BUNDLE — Tier 2 — $1,497/mo ──────────── */
  "power-bundle": {
    slug: "power-bundle",
    tier: 2,
    category: "social",
    cadence: "monthly",
    badge: "Tier 2 · Monthly · All 4 platforms managed",
    Icon: Layers,
    metaTitle: "Power Bundle — All 4 Social Platforms $1,497/mo · The LeadFlow Pro",
    metaDescription:
      "TikTok + Facebook + X + YouTube — managed end-to-end for one monthly fee. Saves ~$500/mo over single channels. The algorithm rewards consistency across surfaces, not just one.",

    hero: {
      h1Lead: "Four platforms. One operator.",
      h1Highlight: "$1,497 a month for the whole social stack.",
      paragraph:
        "The algorithm doesn't reward you for crushing one platform anymore. It rewards consistency across all of them. The Power Bundle runs TikTok, Facebook, X, and YouTube simultaneously so the signals compound.",
      paragraph2:
        "$1,988 if bought separately. $1,497 bundled. Saves ~$500/mo without giving up anything.",
    },
    price: {
      big: "$1,497",
      sub: "/month · all 4 platforms",
      badge: "Saves $491/mo vs. single",
      deliverables: [
        "TikTok: 20 short-form posts/mo + hook iteration",
        "Facebook: 12 long + 8 short videos/mo + group seeding",
        "X / Twitter: daily Mon–Fri posts in your voice + reply targeting",
        "YouTube: 1 long-form/week + thumbnail + retention iteration",
        "Creative direction: what to film, what to say, what to show, and where the lead goes next",
        "Field kit available when scoped: Meta Ray-Bans, GoPros, Rode mics, iPhone, and stands",
        "Cross-posting to IG Reels & YT Shorts (free)",
        "Monthly performance report tied to leads + revenue",
      ],
    },
    primaryCta: { label: "Start Power Bundle — $1,497/mo", href: buyHref("power-bundle", "Buy: Power Bundle $1,497/mo") },
    secondaryCta: { label: "Free 10-min call first", href: "/book" },

    whyBuy: [
      { Icon: Layers,    title: "The algorithm cross-checks",  body: "Same audience on TikTok, IG, FB, X, YT. The algorithm trusts creators it sees on multiple surfaces. One channel = capped reach. Four channels = compounding." },
      { Icon: TrendingUp, title: "Repurposing pays the bill",  body: "One long-form YT video → 4 TikToks → 4 Reels → 6 X threads → 2 FB posts. The bundle math works because the source content is shared." },
      { Icon: ShieldCheck, title: "Algorithm-shift insurance", body: "When TikTok throttles you (and they will), the FB/YT/X engine keeps the lead flow going. Single-channel operators get killed by one algorithm change." },
    ],
    timeline: [
      { n: "1", minutes: "Week 1",   title: "Voice + brand intake",  body: "We capture your voice, your story, your offers, your wrong-fit list. Same intake on all four platforms." },
      { n: "2", minutes: "Week 1–2", title: "Channel setup",         body: "Profiles audited and optimized. Bio, link-in-bio funnel, pinned content, banner art, story highlights — all platform-correct." },
      { n: "3", minutes: "Week 2",   title: "First content drop",    body: "20 TikToks scheduled. 12 FB posts queued. 5 X posts/day. 1 YouTube video shipping by end of week 2." },
      { n: "4", minutes: "Monthly",  title: "Report + iterate",      body: "Real performance report. What's winning, what's not, what we're testing next month. Tied to leads + revenue, not vanity metrics." },
    ],
    rightFit: [
      "Your buyers are on multiple platforms (most are)",
      "You can show up for 1 weekly content sync (15–30 min)",
      "You'll trust us to operate the accounts (no micromanaging)",
      "You're committed to 90 days minimum — algorithms reward consistency",
      "You want lead flow, not vanity follower count",
    ],
    wrongFit: [
      "Your buyers are 100% on one platform (then buy that single channel)",
      "You won't show up for 1 sync per week",
      "You want to approve every post (we move too fast for that — see the $1,997/mo Light Retainer instead)",
      "You're hoping to go viral by next Tuesday",
      "You want to pay $200/mo for 'social media management'",
    ],
    costMath: {
      stuck: { big: "$1,988", sub: "What this same coverage costs if you buy each $497/mo channel separately. Bundle saves $491/mo." },
      buy:   { big: "$1,497/mo", sub: "All 4 platforms managed. Same operator, same voice, same deliverables — one monthly invoice instead of four." },
    },
    proof: RYAN_PROOF,
    faqs: [
      { q: "Do I get to approve content before it posts?", a: "Each month, we send a content calendar. You approve the first month. After that, it's our show — but you can flag anything anytime via Slack/voice memo and we'll pull it." },
      { q: "Can I add Instagram or Threads?", a: "IG Reels are included via cross-posting from TikTok. Threads is included via X cross-post. Native IG feed posts are a +$297/mo add-on if you want curated grid + Stories." },
      { q: "What about TikTok or FB Ads?", a: "Organic only on this bundle. Add Facebook Ads for +$1,497/mo + 10% spend (with $2K minimum spend). See the dedicated FB Ads offer." },
      { q: "Can I cancel mid-month?", a: "30-day notice. Last month is the wind-down month. Algorithms hate sudden silence — we ramp down properly." },
      { q: "What's the lock-in?", a: "First-month commitment only. Month 2 onward is month-to-month with 30-day notice." },
      TEXAS_NDA_FAQ,
    ],
    upgradeCredit: "Stack with Facebook Ads ($1,497/mo + 10% spend) for full attention-and-conversion coverage.",
  },

  /* ──────────── 5. FACEBOOK ADS — Tier 2 — $1,497/mo + 10% ──────────── */
  "fb-ads": {
    slug: "fb-ads",
    tier: 2,
    category: "ads",
    cadence: "monthly",
    badge: "Tier 2 · Monthly · Performance ad management",
    Icon: Megaphone,
    metaTitle: "Facebook Ads Management — $1,497/mo + 10% spend · The LeadFlow Pro",
    metaDescription:
      "Done-for-you Meta ad management. We run the campaigns, you pay Meta directly. Targeting, creative iteration, weekly reporting. Built for businesses doing $20K+/mo with $2K+/mo ad budget.",

    hero: {
      h1Lead: "Your ads. My execution.",
      h1Highlight: "$1,497/mo + 10% of spend. $2K min budget.",
      paragraph:
        "I run your Meta campaigns end-to-end — audience, creative, copy, optimization. You pay Meta directly (we never touch your ad budget). Weekly performance reports tied to leads and revenue, not vanity clicks.",
      paragraph2:
        "This is for businesses already doing $20K+/mo who want lead volume up and cost-per-lead down. Not for first-time advertisers — start with the $497 Audit if that's you.",
    },
    price: {
      big: "$1,497",
      sub: "/mo + 10% of ad spend",
      badge: "Min $2K/mo to Meta · paid by you",
      deliverables: [
        "Audience research + targeting (custom + lookalike + interest)",
        "Creative iteration weekly (3 hooks × 3 variants minimum)",
        "Photo/video direction so the ads have real angles to test",
        "Field capture options for POV, product, owner, and job-site creative",
        "Daily campaign optimization (M–F)",
        "Weekly performance report tied to leads + revenue",
        "Pixel + conversion API setup if missing",
        "Landing page review + recommendations (build is separate)",
      ],
    },
    primaryCta: { label: "Start FB Ads — $1,497/mo", href: buyHref("fb-ads", "Buy: Facebook Ads $1,497/mo") },
    secondaryCta: { label: "Free 10-min call first", href: "/book" },

    whyBuy: [
      { Icon: Target,     title: "Lead volume + cost-per-lead",  body: "Two metrics matter: how many leads, what each one costs. Everything we do drives one of those. No vanity metrics on the report." },
      { Icon: TrendingUp, title: "Creative is the lever",         body: "Targeting matters less than ever; creative matters more than ever. We iterate hooks weekly so the winners compound." },
      { Icon: ShieldCheck, title: "You pay Meta directly",        body: "Your ad budget never touches our account. You see every dollar Meta charges you, and you can pause anytime — no AP-from-us drama." },
    ],
    timeline: [
      { n: "1", minutes: "Week 1",   title: "Audit + access",        body: "We review existing pixel, ad accounts, past campaigns. Get admin access. If pixel/CAPI broken, we fix it." },
      { n: "2", minutes: "Week 1–2", title: "Campaign build",        body: "Audience research. 3-hook × 3-variant creative. Conversion-API events. First test campaigns live by end of week 2." },
      { n: "3", minutes: "Weekly",   title: "Iterate + report",      body: "Daily optimization Mon–Fri. Friday report: leads, CPL, ROAS, what's winning, what we're killing next week." },
      { n: "4", minutes: "Monthly",  title: "Strategy review",       body: "End-of-month 30-min call. Walk through what worked, what didn't. Set next month's hypotheses + budget plan." },
    ],
    rightFit: [
      "You're doing $20K+/mo and ready to scale lead volume",
      "You can fund $2K/mo minimum to Meta directly",
      "You have a working sales process to handle the lead bump",
      "You'll respond to creative requests (we need video / photos / examples)",
      "You commit 90 days — Meta needs 60+ days of data to optimize",
    ],
    wrongFit: [
      "You haven't run an ad before (start with $497 Audit)",
      "You can't spend $2K/mo to Meta on top of management",
      "Your sales process drops 50% of leads (fix that first)",
      "You expect 5× ROAS in week 1",
      "You want me to also build the funnel/landing page (separate quote)",
    ],
    costMath: {
      stuck: { big: "$3K+/mo", sub: "Wasted on poorly targeted ads / broken pixels / no creative iteration. The most common pattern is paying for clicks that go to a leaky funnel." },
      buy:   { big: "$1,497 + 10%", sub: "Min $2K to Meta. So $3,697/mo all-in if you spend the minimum. The work is weekly creative testing, tracking, and optimization — not a promised CPL drop." },
    },
    proof: RYAN_PROOF,
    faqs: [
      { q: "Why 10% of spend on top of the retainer?", a: "Because at $20K/mo spend, you need different attention than at $2K/mo spend. The variable fee aligns my incentives with your scale — not your pain." },
      { q: "Do you guarantee a CPL or ROAS?", a: "No. Anyone who guarantees Meta ad performance is lying or about to be sued. I commit to the work, the iteration, and the reporting." },
      { q: "Can you also run TikTok / Google ads?", a: "TikTok ads — yes, +$997/mo on top. Google ads — not currently. I'd refer you out before doing it badly." },
      { q: "Do I need to build a landing page first?", a: "Not necessarily — many accounts run on existing pages. If your page is the bottleneck, we'll flag it in week 1 and quote the build separately." },
      { q: "What if I want to pause?", a: "30-day notice on the retainer. Pause Meta spend anytime — instantly, on your dashboard." },
      TEXAS_NDA_FAQ,
    ],
    upgradeCredit: "Stack with the Power Bundle ($1,497/mo) for organic + paid attention coverage.",
  },

  /* ──────────── 6. WORKING SESSION — Tier 2 — $2,997 ──────────── */
  "working-session": {
    slug: "working-session",
    tier: 2,
    category: "consulting",
    cadence: "one-time",
    badge: "Tier 2 · One-time · Half-day intensive",
    Icon: Zap,
    metaTitle: "Half-Day Working Session — $2,997 · The LeadFlow Pro",
    metaDescription:
      "4 hours, 1:1 with Ryan, building one specific deliverable end-to-end. Rebuild your sales process. Rewrite your offer. Build your hiring scorecard. You leave with the asset, not just notes.",

    hero: {
      h1Lead: "$2,997 for half a day building one thing.",
      h1Highlight: "You leave with the asset, not notes.",
      paragraph:
        "Four hours. 1:1. We pick ONE high-leverage deliverable (rebuilt sales process, rewritten offer, hiring scorecard, content engine, a real funnel) and we ship it before you log off.",
      paragraph2:
        "This is the Decision Sprint's bigger sibling. The Sprint clarifies the call. The Working Session builds the thing.",
    },
    price: {
      big: "$2,997",
      sub: "one-time · 4-hour intensive",
      badge: "Same-day delivery",
      deliverables: [
        "4 hours, 1:1, screen-shared video call",
        "Recorded session + full transcript",
        "The actual deliverable (ready to use, not a draft)",
        "Script, creative, lead-flow, or sales-process buildout if that is the highest-leverage asset",
        "Content capture or field-production scope if the asset needs real footage",
        "30-day text-back support to ask follow-up questions",
        "60-min review call within 14 days to refine",
      ],
      addOn: {
        title: "On-site full-day add-on · +$2,000",
        body:
          "Anywhere in Texas: I drive to you, we do 8 hours instead of 4, lunch on me. Bigger deliverable scope (e.g., full sales OS, not one process). Travel beyond TX is custom-quoted.",
      },
    },
    primaryCta: { label: "Reserve the Working Session — $2,997", href: buyHref("working-session", "Buy: Working Session $2,997") },
    secondaryCta: { label: "Free 10-min call first", href: "/book" },

    whyBuy: [
      { Icon: Wrench,    title: "Built, not 'discussed'",        body: "Most consultants leave you with a deck. You leave the working session with the actual artifact — running, deployed, in your business." },
      { Icon: Clock,     title: "4 hours of full attention",     body: "No multitasking. No 'let me get back to you.' Block 4 hours, ship one big thing, never have to revisit it as 'TBD.'" },
      { Icon: TrendingUp, title: "Compounds for years",          body: "A rebuilt sales process or rewritten offer pays you back every week for the rest of the year. The session pays for itself in 30–60 days." },
    ],
    timeline: [
      { n: "1", minutes: "Day 0",  title: "Scope call",       body: "20-min call to pick the deliverable. We pre-load context, decide on tools, set the goal so we hit the ground running." },
      { n: "2", minutes: "Day X",  title: "The 4 hours",      body: "Screen-shared video call. Hour 1: discovery. Hour 2: design. Hour 3: build. Hour 4: test + handoff. Recorded throughout." },
      { n: "3", minutes: "Day X",  title: "Same-day delivery", body: "You log off with the asset working. Recording + transcript emailed within 24 hours." },
      { n: "4", minutes: "Day 14", title: "Refinement call",  body: "60-min call within 14 days. Polish the deliverable based on real-world usage. Yours forever." },
    ],
    rightFit: [
      "You can name the ONE deliverable you want built",
      "You'll block 4 uninterrupted hours (no Slack, no calls)",
      "You'll come prepared with examples / data / context",
      "You're the decision-maker (or have one in the room)",
      "You'll actually use the deliverable — not just save it",
    ],
    wrongFit: [
      "You can't pick one thing — you want 'general help'",
      "You can't block 4 hours straight (book the Sprint instead)",
      "You want me to also do the 90 days of execution after",
      "You want to test the engagement out at $90 first (Sprint, not this)",
      "You want a money-back guarantee (no — you keep the deliverable)",
    ],
    costMath: {
      stuck: { big: "$10K+", sub: "Median cost of NOT having a written sales process for 6 months — leaks, dropped follow-ups, miscommunication, lost deals. Multiply by months you've put it off." },
      buy:   { big: "$2,997", sub: "One day. The asset is yours. Pays for itself the first month it stops a single dropped lead or untrained-rep mistake." },
    },
    proof: RYAN_PROOF,
    faqs: [
      { q: "What deliverables work best?", a: "Sales process, written offer/script, hiring scorecard, content engine, FlowCard playbook, intake form, follow-up sequence. We pick on the scope call." },
      { q: "Can I bring my team?", a: "Up to 3 people on the working session. More than that, the bandwidth gets messy — we'd quote a different engagement." },
      { q: "What if we don't finish in 4 hours?", a: "We will. Scope is set ahead of time precisely so this isn't a worry. If it spills, the refinement call is where we close." },
      { q: "Refunds?", a: "No refund post-session — you have the asset. 24-hour scheduling refund if a slot can't be set." },
      { q: "Texas in-person?", a: "Yes — +$2,000 add-on covers full day in TX with travel + meal. We can scope a bigger deliverable (e.g., full sales OS, not one process)." },
      TEXAS_NDA_FAQ,
    ],
    upgradeCredit: "Apply $2,997 toward the first month of Monthly Operator if you upgrade within 60 days.",
  },

  /* ──────────── 7. MONTHLY OPERATOR — Tier 3 — $4,997/mo ──────────── */
  "monthly-operator": {
    slug: "monthly-operator",
    tier: 3,
    category: "operator",
    cadence: "monthly",
    badge: "Tier 3 · Monthly · Fractional COO-style operator",
    Icon: Rocket,
    metaTitle: "Monthly Operator — $4,997/mo · The LeadFlow Pro",
    metaDescription:
      "Fractional COO/CMO operator. Weekly working sessions, async hands-on, written ops scoreboard. Built for owners doing $50K+/mo who need someone in the trenches — not just an advisor.",

    hero: {
      h1Lead: "$4,997 a month. I'm in the trenches.",
      h1Highlight: "Not advice. Operations.",
      paragraph:
        "The Light Retainer is advice. The Monthly Operator is execution. I run weekly working sessions on your business, jump into Slack/Notion/HubSpot to actually move things, and you get a written ops scoreboard every Friday so we both know where the dollars are.",
      paragraph2:
        "This is the right move when you've outgrown 'advice' but you don't yet need a full-time COO ($150K+/yr fully loaded).",
    },
    price: {
      big: "$4,997",
      sub: "/month · 90-day commit",
      badge: "Cancel after Day 90 with 30-day notice",
      deliverables: [
        "1 hour/week working session (recorded + transcribed)",
        "Hands-on inside your tools (Slack, Notion, HubSpot, Stripe, ad accounts)",
        "Marketing, lead generation, creative, and sales follow-up work handled inside the operating rhythm",
        "Weekly written ops scoreboard (revenue, CAC, leads, drop-offs)",
        "Async Slack channel — same-day response Mon–Fri",
        "Quarterly off-site planning day (in-person if Texas, remote elsewhere)",
        "First-look access to every new playbook + template",
      ],
    },
    primaryCta: { label: "Start Operator — $4,997/mo", href: buyHref("monthly-operator", "Buy: Monthly Operator $4,997/mo") },
    secondaryCta: { label: "Free 10-min call first", href: "/book" },

    whyBuy: [
      { Icon: Briefcase, title: "Cheaper than a hire",      body: "A full-time COO is $150–250K fully loaded. The Monthly Operator is $60K/yr — without health insurance, without equity, without 'is this person going to work out?'" },
      { Icon: TrendingUp, title: "Outcomes, not hours",     body: "I'm not billing you for 8 hours/week of 'consulting.' I'm in the work, fixing the leak, shipping the system, in whatever tool gets it done." },
      { Icon: ShieldCheck, title: "30-day exit anytime",    body: "After the 90-day commit, it's month-to-month with 30-day notice. No long contracts. No surprises." },
    ],
    timeline: [
      { n: "1", minutes: "Day 0–14", title: "Onboarding sprint",   body: "Same intake as the $497 audit, compressed. End of week 2: first ops scoreboard live, top-3 fixes named, weekly cadence locked." },
      { n: "2", minutes: "Weekly",   title: "Working sessions",     body: "Every Friday, 60 min. We go through the scoreboard, decide priorities for next week, I jump into the tools to execute." },
      { n: "3", minutes: "Daily",    title: "Async Slack",          body: "Same-day Slack response Mon–Fri. I'm not a 9-to-5 employee, but I'm responsive enough that the work doesn't stall." },
      { n: "4", minutes: "Quarterly", title: "Off-site planning",  body: "Once a quarter: half-day planning. In Texas → I drive to you. Outside Texas → 4-hour Zoom intensive. Rebuilds the next 90-day plan." },
    ],
    rightFit: [
      "You're doing $50K+/mo and growing",
      "You'll grant operator-level access to your tools",
      "You'll show up for the Friday session every week",
      "You'll commit 90 days minimum",
      "You're tired of being the bottleneck on every decision",
    ],
    wrongFit: [
      "You're under $20K/mo (start with the $497 Audit + Light Retainer)",
      "You won't grant tool access (no point — I can't operate from the outside)",
      "You want a quiet advisor (you want Light Retainer, not this)",
      "You want me on every internal call (Annual Advisor)",
      "You're hoping I'll grow your business while you're hands-off",
    ],
    costMath: {
      stuck: { big: "$150K+/yr", sub: "Cost of a full-time COO/CMO (salary + benefits + equity + onboarding risk)." },
      buy:   { big: "$59,964/yr", sub: "Monthly Operator at $4,997/mo. Cancel anytime after Day 90. No equity, no commission, no hire-fire drama." },
    },
    proof: RYAN_PROOF,
    faqs: [
      { q: "How is this different from Light Retainer ($1,997/mo)?", a: "Retainer is advice + briefings. Monthly Operator is execution — I'm in your tools, building, shipping, fixing. Different role, different price." },
      { q: "Will you replace my team?", a: "No. I work WITH your team. Often I help you hire / fire / retrain — but I'm not replacing your ops manager or marketing lead." },
      { q: "Can I do 6 months and pause?", a: "Yes — after the 90-day commit, pause anytime with 30-day notice. We document the state and you can resume in 1–4 months without re-onboarding." },
      { q: "What about Annual Advisor?", a: "Annual Advisor is the next tier — $75K/yr — and includes a board-style relationship (quarterly in-person, on every internal strategy call). This is execution; that's governance." },
      { q: "Is there an exclusivity?", a: "I won't take a direct competitor in your specific niche while we're working. Mutual." },
      TEXAS_NDA_FAQ,
    ],
    upgradeCredit: "Last month's fee credits toward Annual Advisor if you upgrade.",
  },

  /* ──────────── 8. 4-WEEK BUILD SPRINT — Tier 3 — $9,997 ──────────── */
  "sprint-4-week": {
    slug: "sprint-4-week",
    tier: 3,
    category: "operator",
    cadence: "4-week sprint",
    badge: "Tier 3 · One-time · 4-week build sprint",
    Icon: Rocket,
    metaTitle: "4-Week Build Sprint — $9,997 · The LeadFlow Pro",
    metaDescription:
      "Four weeks of full-attention build. Rebuild your sales OS, ship a real funnel, retrain your team, light up automation. You start the sprint behind. You finish ahead by 6 months.",

    hero: {
      h1Lead: "$9,997 for 4 weeks of full attention.",
      h1Highlight: "Start behind. Finish 6 months ahead.",
      paragraph:
        "Four weeks of intense, focused build. We pick ONE big initiative — sales OS rebuild, full funnel build, content engine launch, retraining the team on a new process — and we ship it before week 4 closes.",
      paragraph2:
        "No retainer. No 'how about we talk again next quarter.' Four weeks, one outcome, document everything, hand it off.",
    },
    price: {
      big: "$9,997",
      sub: "one-time · 4 weeks",
      badge: "50% upfront · 50% week 2",
      deliverables: [
        "Kickoff call + 30-min daily standups Mon–Fri (recorded)",
        "Hands-on inside your tools the entire 4 weeks",
        "Creative/content engine, sales OS, funnel, or automation build depending on the agreed outcome",
        "Weekly Friday milestone review + written progress doc",
        "Final delivery: built artifact + SOP + recording library",
        "30-day post-sprint Slack support (same-day Mon–Fri)",
      ],
    },
    primaryCta: { label: "Start the Sprint — $9,997", href: buyHref("sprint-4-week", "Buy: 4-Week Build Sprint $9,997") },
    secondaryCta: { label: "Free 10-min call first", href: "/book" },

    whyBuy: [
      { Icon: Rocket,    title: "Velocity > strategy",         body: "Most businesses don't fail from bad strategy — they fail from no execution. The sprint replaces 6 months of 'we'll get to it' with 4 weeks of 'we shipped it.'" },
      { Icon: Wrench,    title: "Built once, run forever",     body: "What we ship in the sprint runs without me afterward. SOPs, recordings, documentation — your team operates it Day 29 onward." },
      { Icon: TrendingUp, title: "Better than 90 days of advice", body: "$9,997 buys the same operator-time as 5 months of Light Retainer — concentrated into 4 weeks of building, not advising." },
    ],
    timeline: [
      { n: "1", minutes: "Day 0",       title: "Scope + kickoff",   body: "60-min kickoff. Pick the ONE big outcome. Set milestones for weeks 1–4. 50% deposit clears." },
      { n: "2", minutes: "Week 1",      title: "Discovery + design", body: "Daily 30-min standups. Inventory current state. Draft target state. Tool selection. End of week: the design doc." },
      { n: "3", minutes: "Week 2–3",    title: "Build",             body: "I'm in your tools daily, building. End of week 3: the artifact runs in production. 50% balance clears at start of week 2." },
      { n: "4", minutes: "Week 4",      title: "Train + handoff",   body: "Train your team. Write the SOP. Record the walkthroughs. Day 28: you're operating it. Day 29–58: I'm Slack-available for questions." },
    ],
    rightFit: [
      "You're $50K+/mo and ready to scale a specific lever",
      "You can name the ONE outcome — sales OS, funnel, training program, etc.",
      "Your team is available for daily 30-min standups M–F",
      "You can commit 4 weeks (no major travel / launches that month)",
      "You'll act on the SOP after handoff — not shelve it",
    ],
    wrongFit: [
      "You want a low-touch engagement (this is high-touch by design)",
      "Your team can't do daily standups",
      "You want me to keep running it after week 4 (that's Monthly Operator)",
      "You can't pick ONE outcome — you want 'overall improvement'",
      "You expect a 10× revenue jump in 4 weeks (not how this works)",
    ],
    costMath: {
      stuck: { big: "6 months", sub: "Median time it takes a small team to ship a sales-OS rebuild in-house. Most teams stall, ship a half-version, and come back 6 months later." },
      buy:   { big: "$9,997 · 4 wks", sub: "Operator-time + accountability + training. The artifact runs the day we hand off. No retainer required to keep it alive." },
    },
    proof: RYAN_PROOF,
    faqs: [
      { q: "What kinds of outcomes work?", a: "Sales OS rebuild, funnel build, content engine launch, hiring system, lead-flow automation, FlowCard rollout, ops scoreboard, AI chatbot deployment." },
      { q: "Can I extend it to 8 weeks?", a: "Yes — second 4 weeks at the same scope is +$7,997 (volume discount). Locked at start of week 4." },
      { q: "What's the payment schedule?", a: "50% on signed engagement letter. 50% on Day 7 (start of week 2). All in before final week so my bandwidth is yours, not collections'." },
      { q: "Can I run two sprints in parallel?", a: "No — too much context-switching for the operator. Sequential only." },
      { q: "What about Monthly Operator after?", a: "Common path. Last $9,997 of the sprint applies as credit toward the first 2 months of Monthly Operator if you continue within 60 days." },
      TEXAS_NDA_FAQ,
    ],
    upgradeCredit: "Apply 100% of the sprint fee toward the first 2 months of Monthly Operator if you continue within 60 days.",
  },

  /* ──────────── 9. ANNUAL ADVISOR — Tier 4 — $75K/yr ──────────── */
  "annual-advisor": {
    slug: "annual-advisor",
    tier: 4,
    category: "advisor",
    cadence: "annual",
    badge: "Tier 4 · Annual · Board-style strategic advisor",
    Icon: Trophy,
    metaTitle: "Annual Advisor — $75,000/year · The LeadFlow Pro",
    metaDescription:
      "Board-level advisor. On every quarterly strategy meeting, on every major hire, in the room when the stakes are real. Reserved for owners doing $1M+/yr who need a second mind in their corner all year.",

    hero: {
      h1Lead: "$75,000 a year. In your corner.",
      h1Highlight: "Board-level advisor — not a consultant.",
      paragraph:
        "Reserved for 4 owners per year. You get me on every quarterly strategy meeting, on every major hire, in the room when the contracts are signed. Two in-person days per quarter, unlimited async, written quarterly memo to your board (or yourself if you're the only board there is).",
      paragraph2:
        "This isn't 'fractional anything.' This is the relationship every founder I respect has with their advisors — a person who knows their business as well as they do, says the hard thing, and means it.",
    },
    price: {
      big: "$75,000",
      sub: "per year · paid quarterly",
      badge: "Limited to 4 advisor seats / year",
      deliverables: [
        "On every quarterly strategy meeting + major hires",
        "2 in-person days per quarter (in TX or I fly to you, travel covered separately)",
        "Unlimited async Slack — 4-hour response M–F, same-day weekends if pre-flagged",
        "Written quarterly memo (board-style)",
        "On the call when contracts >$50K are negotiated",
        "Monthly 60-min recorded strategy call",
      ],
    },
    primaryCta: { label: "Apply — Annual Advisor", href: buyHref("annual-advisor", "Apply: Annual Advisor $75K/yr") },
    secondaryCta: { label: "Free 30-min call first", href: "/book" },

    whyBuy: [
      { Icon: Trophy,    title: "The seat at the table",        body: "Most advisors sell hours. This is a seat — at every quarterly review, every major hire, every contract signing >$50K. The decisions you make at that level move the year." },
      { Icon: ShieldCheck, title: "Reserved availability",      body: "Capped at 4 owners per year. Your business gets first claim on my calendar, ahead of any retainer or sprint client. Real exclusivity." },
      { Icon: TrendingUp, title: "Compounds across years",      body: "Year 1, I learn the business. Year 2, I'm catching things you can't. Year 3, your team treats me like a co-founder. The relationship is the asset." },
    ],
    timeline: [
      { n: "1", minutes: "Quarter 1",   title: "Onboarding quarter",   body: "Two in-person days. Full operating-system audit. Rewrite top-3 broken processes. Establish quarterly cadence." },
      { n: "2", minutes: "Quarter 2",   title: "Hiring + scaling",     body: "On the calls for every hire >$80K base. Help craft the offer letter. In the room when major customer contracts are negotiated." },
      { n: "3", minutes: "Quarter 3",   title: "Strategy + market",    body: "Strategic review. Adjacencies. Acquisitions if relevant. New offers / markets / channels — fully road-mapped." },
      { n: "4", minutes: "Quarter 4",   title: "Board memo + plan",    body: "End-of-year board memo. Written. The story of the year + the plan for next year. Yours forever." },
    ],
    rightFit: [
      "$1M+/yr in revenue and growing",
      "You make 5+ board-level decisions per year (hire, fire, raise, new market, acquisition)",
      "You'll bring me into the room when stakes are real (not just 'fyi')",
      "You'll commit a year minimum (the relationship needs the runway)",
      "You're hiring a peer — not a vendor",
    ],
    wrongFit: [
      "Under $1M/yr — start with Light Retainer or Monthly Operator",
      "You want me to do the work (Annual is governance + counsel)",
      "You want a guarantee about year-over-year growth",
      "You want unlimited time (it's bounded — quarterly + async, not 24/7)",
      "You're shopping advisors on price (this isn't a discount tier)",
    ],
    costMath: {
      stuck: { big: "$300K–$1M", sub: "Cost of a wrong $200K hire, a botched market entry, or signing a one-sided enterprise contract. One avoided mistake at this level pays for the year 4× over." },
      buy:   { big: "$75K/yr",   sub: "$18,750 per quarter. One avoided wrong-hire, one re-negotiated contract, one strategic pivot you saw 6 months early — pays for the year." },
    },
    proof: RYAN_PROOF,
    faqs: [
      { q: "Is it really only 4 owners per year?", a: "Yes. Hard cap. When seats are full, the next opening is when one closes." },
      { q: "Do you take equity instead of cash?", a: "No. Cash retainer only. Keeps the incentives clean — I don't make money if you exit, so I'm not pushing you toward an exit." },
      { q: "What if I want to renew?", a: "Year 2 onward, the rate is locked at the original number for the duration of the relationship. Loyalty pricing." },
      { q: "Travel?", a: "Two in-person days per quarter. Travel + meals are covered separately at cost (no markup). Domestic only — international is custom-quoted." },
      { q: "What if I don't use you for a quarter?", a: "The seat is yours regardless. The relationship is the product, not the hours." },
      TEXAS_NDA_FAQ,
    ],
  },
};

export const OFFER_LIST: Offer[] = [
  OFFERS["quick-look"],
  OFFERS["decision-sprint"],
  OFFERS["business-audit"],
  OFFERS["working-session"],
  OFFERS["light-retainer"],
  OFFERS["power-bundle"],
  OFFERS["fb-ads"],
  OFFERS["monthly-operator"],
  OFFERS["sprint-4-week"],
  OFFERS["annual-advisor"],
];
