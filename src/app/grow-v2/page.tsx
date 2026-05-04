// src/app/grow-v2/page.tsx — Full top-to-bottom rewrite of /grow.
//
// Preview only. Lives at /grow-v2 alongside the existing /grow.
// Once Ryan promotes, /grow-v2 replaces /grow.
//
// Voice anchors (per Ryan, 2026-05-04):
//   - "Serious buyers only — don't waste my time"
//   - Right fit / Wrong fit visual filter
//   - "We'll know in 10 minutes"
//
// Style: light theme, brand colors only (cyan + accent + lead).
// No rainbow gradients. Mobile-first.

import Link from "next/link";
import {
  ArrowRight, BadgeCheck, Check, ChevronRight, Clock, Crown, Facebook,
  Megaphone, MessageSquare, Music2, Quote, ShieldCheck, Star, TrendingUp,
  Trophy, Twitter, X as XIcon, Youtube,
} from "lucide-react";

export const metadata = {
  title: "Grow on every platform — for serious buyers only · The LeadFlow Pro",
  description:
    "Built by Ryan Nichols. 75K+ across 5 platforms. Founder of LeadFlow Pro, RepWatchr, Faretta.Legal, Faretta.AI, and Wholesale Universe. Done-for-you growth on TikTok, Facebook, X, YouTube, plus dedicated Facebook Ads management. Free 10-minute call — reserved for serious buyers ready to invest.",
};

/* ─── Data ────────────────────────────────────────────────────── */

const RIGHT_FIT = [
  "You have a real business, or you're building one with intent",
  "You're committed to growth and willing to do the actual work",
  "You're ready to invest in tools, services, or both",
  "You want a long-term operator in your corner — not a quick fix",
];

const WRONG_FIT = [
  "You want guaranteed follower or revenue numbers",
  "You want everything for free",
  "You're \"just curious\" — no real plans",
  "You want results in two weeks with no work on your end",
];

const STATS = [
  { label: "X / Twitter",     value: "43,800+" },
  { label: "Facebook",        value: "18,900+" },
  { label: "YouTube",         value: "12,000+" },
  { label: "Total reach",     value: "75K+" },
];

const PLATFORMS = [
  {
    name: "TikTok Growth",
    icon: Music2,
    price: "$497",
    cadence: "/mo per channel",
    line: "Daily short-form built around the hook patterns the algorithm is rewarding this week. Repurposed across IG Reels and YT Shorts.",
    bullets: [
      "20 short-form posts / month",
      "Hook + caption iteration weekly",
      "Cross-post to Reels + Shorts (free)",
    ],
  },
  {
    name: "Facebook Growth",
    icon: Facebook,
    price: "$497",
    cadence: "/mo per channel",
    line: "Page + groups strategy for businesses where buyers actually live on Facebook (local services, mortgage, real estate, B2B).",
    bullets: [
      "12 long-form + 8 short videos / mo",
      "Group seeding + engagement",
      "Messenger funnel + auto-reply",
    ],
  },
  {
    name: "X / Twitter Growth",
    icon: Twitter,
    price: "$497",
    cadence: "/mo per channel",
    line: "Daily posting + reply game. The platform Ryan grew to 43,800+ on. Built for personal brands, founders, and operators.",
    bullets: [
      "Daily Mon–Fri posts in your voice",
      "Reply targeting that drives audience",
      "Weekly thread + monthly long-form",
    ],
  },
  {
    name: "YouTube Growth",
    icon: Youtube,
    price: "$497",
    cadence: "/mo per channel",
    line: "Long-form content engine. Title + thumbnail + retention loops engineered for the home feed and search.",
    bullets: [
      "1 long-form video / week",
      "Title + thumbnail iteration",
      "Retention + CTR analysis monthly",
    ],
  },
];

const FOUNDER_BRANDS = [
  { name: "The LeadFlow Pro",  note: "Founder · this site" },
  { name: "RepWatchr.com",     note: "Founder" },
  { name: "Faretta.Legal",     note: "Founder" },
  { name: "Faretta.AI",        note: "Founder" },
  { name: "Wholesale Universe", note: "Founder" },
];

/* ─── Page ────────────────────────────────────────────────────── */

export default function GrowV2Page() {
  return (
    <div className="min-h-screen bg-white text-slate-900">
      {/* Header */}
      <header className="sticky top-0 z-30 border-b border-slate-200 bg-white/85 backdrop-blur">
        <div className="mx-auto max-w-7xl px-4 py-3 flex items-center justify-between">
          <Link href="/" className="font-semibold hover:text-brand-700">
            The LeadFlow Pro
          </Link>
          <Link
            href="/book"
            className="inline-flex items-center gap-1.5 rounded-lg bg-accent-500 px-4 py-2 text-sm font-semibold text-white hover:bg-accent-600"
          >
            Book the 10-min call <ArrowRight className="h-3.5 w-3.5" />
          </Link>
        </div>
      </header>

      {/* Preview banner */}
      <div className="border-b border-amber-200 bg-amber-50">
        <div className="mx-auto max-w-7xl px-4 py-2 text-xs text-amber-800 text-center">
          <strong>Preview draft (/grow-v2)</strong> — full rewrite of /grow with serious-buyer voice. Compare side-by-side, then promote when ready.
        </div>
      </div>

      {/* HERO — hard filter */}
      <section className="border-b border-slate-200 bg-gradient-to-b from-white to-slate-50">
        <div className="mx-auto max-w-7xl px-4 py-12 sm:py-20">
          <div className="max-w-4xl">
            <div className="inline-flex items-center gap-2 rounded-full border border-cyan-300 bg-cyan-50 px-3 py-1 text-xs uppercase tracking-widest text-cyan-700">
              <BadgeCheck className="h-3.5 w-3.5" /> Built by Ryan Nichols · 75K+ across 5 platforms
            </div>
            <h1 className="mt-5 text-4xl sm:text-6xl font-semibold tracking-tight text-slate-950 leading-tight">
              Read this first.{" "}
              <span className="bg-gradient-to-r from-brand-700 to-cyan-500 bg-clip-text text-transparent">
                If you're here for free tips, click away.
              </span>
            </h1>
            <p className="mt-6 max-w-2xl text-lg text-slate-700 leading-relaxed">
              This page is for <strong className="text-slate-950">serious buyers only</strong> — owners,
              creators, and operators ready to invest in tools, services, or both. I'm not a guru.
              I'm an operator who shows up when you're serious. I won't pitch you. I won't slide-deck
              you.
            </p>
            <p className="mt-4 max-w-2xl text-lg text-slate-700 leading-relaxed">
              <strong className="text-slate-950">We'll know in 10 minutes</strong> whether we should
              work together.
            </p>
            <div className="mt-8 flex flex-col sm:flex-row gap-3">
              <Link
                href="/book"
                className="inline-flex items-center justify-center gap-2 rounded-xl bg-accent-500 px-6 py-3 font-semibold text-white shadow-sm hover:bg-accent-600"
              >
                Book the 10-minute call <ArrowRight className="h-4 w-4" />
              </Link>
              <Link
                href="/tiers"
                className="inline-flex items-center justify-center gap-2 rounded-xl border border-slate-300 bg-white px-6 py-3 font-semibold text-slate-800 hover:border-brand-500 hover:text-brand-700"
              >
                See the price ladder
              </Link>
            </div>
            <p className="mt-3 text-xs text-slate-500">
              Free, 10 minutes, video. No pitch decks. No 60-minute "discovery" tours.
            </p>
          </div>
        </div>
      </section>

      {/* RIGHT FIT / WRONG FIT */}
      <section className="border-b border-slate-200 bg-white">
        <div className="mx-auto max-w-7xl px-4 py-12 sm:py-16">
          <div className="text-xs uppercase tracking-widest text-slate-500 mb-2">Save us both time</div>
          <h2 className="text-3xl sm:text-4xl font-semibold tracking-tight text-slate-950 mb-8">
            Are you a fit?
          </h2>
          <div className="grid gap-5 md:grid-cols-2">
            <div className="rounded-2xl border border-lead-200 bg-lead-50 p-6">
              <div className="inline-flex items-center gap-2 rounded-full bg-lead-100 px-3 py-1 text-xs uppercase tracking-widest text-lead-800 font-semibold">
                <Check className="h-3.5 w-3.5" /> Right fit
              </div>
              <h3 className="mt-3 text-xl font-semibold text-slate-950">Book the call</h3>
              <ul className="mt-4 space-y-3">
                {RIGHT_FIT.map((line) => (
                  <li key={line} className="flex items-start gap-2 text-slate-700">
                    <Check className="mt-0.5 h-5 w-5 shrink-0 text-lead-600" />
                    <span>{line}</span>
                  </li>
                ))}
              </ul>
            </div>

            <div className="rounded-2xl border border-rose-200 bg-rose-50 p-6">
              <div className="inline-flex items-center gap-2 rounded-full bg-rose-100 px-3 py-1 text-xs uppercase tracking-widest text-rose-800 font-semibold">
                <XIcon className="h-3.5 w-3.5" /> Wrong fit
              </div>
              <h3 className="mt-3 text-xl font-semibold text-slate-950">Click away. Save us both time.</h3>
              <ul className="mt-4 space-y-3">
                {WRONG_FIT.map((line) => (
                  <li key={line} className="flex items-start gap-2 text-slate-700">
                    <XIcon className="mt-0.5 h-5 w-5 shrink-0 text-rose-600" />
                    <span>{line}</span>
                  </li>
                ))}
              </ul>
            </div>
          </div>
        </div>
      </section>

      {/* STATS BAND */}
      <section className="border-b border-slate-200 bg-slate-50">
        <div className="mx-auto max-w-7xl px-4 py-10">
          <div className="text-xs uppercase tracking-widest text-slate-500 mb-5 text-center">
            Built by an operator with skin in the game
          </div>
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
            {STATS.map((s) => (
              <div key={s.label} className="rounded-xl border border-slate-200 bg-white p-5 text-center">
                <div className="text-3xl sm:text-4xl font-bold text-slate-950 tabular-nums">{s.value}</div>
                <div className="mt-1 text-xs uppercase tracking-widest text-slate-500">{s.label}</div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* THE 4 PLATFORMS */}
      <section className="border-b border-slate-200 bg-white">
        <div className="mx-auto max-w-7xl px-4 py-14 sm:py-20">
          <div className="text-xs uppercase tracking-widest text-cyan-700 mb-2">Pick your platform</div>
          <h2 className="text-3xl sm:text-4xl font-semibold tracking-tight text-slate-950">
            Done-for-you growth, one channel at a time.
          </h2>
          <p className="mt-3 text-slate-600 max-w-3xl">
            Each package is a complete monthly engagement on one platform — strategy, production,
            posting, community management, and a real performance report tied to leads and revenue.
            Bundle two or more for cross-channel pricing on the call.
          </p>

          <div className="mt-8 grid gap-5 md:grid-cols-2 lg:grid-cols-4">
            {PLATFORMS.map((p) => {
              const Icon = p.icon;
              return (
                <div
                  key={p.name}
                  className="flex flex-col rounded-2xl border border-slate-200 bg-white p-6 shadow-sm hover:shadow-md transition-shadow"
                >
                  <div className="inline-flex h-11 w-11 items-center justify-center rounded-xl bg-slate-900 text-white">
                    <Icon className="h-5 w-5" />
                  </div>
                  <h3 className="mt-4 text-lg font-semibold text-slate-950">{p.name}</h3>
                  <div className="mt-1 flex items-baseline gap-1">
                    <span className="text-2xl font-bold text-slate-950 tabular-nums">{p.price}</span>
                    <span className="text-sm text-slate-500">{p.cadence}</span>
                  </div>
                  <p className="mt-3 text-sm text-slate-600">{p.line}</p>
                  <ul className="mt-4 space-y-2">
                    {p.bullets.map((b) => (
                      <li key={b} className="flex items-start gap-2 text-sm text-slate-700">
                        <Check className="mt-0.5 h-4 w-4 shrink-0 text-lead-600" />
                        <span>{b}</span>
                      </li>
                    ))}
                  </ul>
                  <Link
                    href="/book"
                    className="mt-auto pt-6 inline-flex items-center gap-1 text-sm font-semibold text-brand-700 hover:text-brand-800"
                  >
                    Book the 10-min call <ArrowRight className="h-3.5 w-3.5" />
                  </Link>
                </div>
              );
            })}
          </div>

          {/* Power Bundle */}
          <div className="mt-8 rounded-2xl border border-brand-500 bg-gradient-to-br from-brand-50 via-white to-cyan-50 p-6 sm:p-8 ring-1 ring-brand-200">
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
              <div>
                <div className="inline-flex items-center gap-2 rounded-full bg-brand-600 px-3 py-1 text-xs font-semibold text-white">
                  <Star className="h-3 w-3" /> Power Bundle
                </div>
                <h3 className="mt-3 text-2xl font-semibold text-slate-950">
                  All 4 platforms — $1,497/mo
                </h3>
                <p className="mt-2 text-slate-600 max-w-2xl">
                  Saves ~$500/mo over single channels. The algorithm rewards consistency across
                  surfaces, not just on one. For owners who want it all, simultaneously.
                </p>
              </div>
              <Link
                href="/book"
                className="inline-flex w-full sm:w-auto items-center justify-center gap-2 rounded-xl bg-slate-900 px-5 py-3 font-semibold text-white hover:bg-slate-800"
              >
                Book the call <ArrowRight className="h-4 w-4" />
              </Link>
            </div>
          </div>
        </div>
      </section>

      {/* FACEBOOK ADS — for biz owners */}
      <section id="fb-ads" className="border-b border-slate-200 bg-gradient-to-br from-slate-50 to-white">
        <div className="mx-auto max-w-7xl px-4 py-14 sm:py-20">
          <div className="grid gap-10 lg:grid-cols-2 lg:items-center">
            <div>
              <div className="inline-flex items-center gap-2 rounded-full bg-accent-500 px-3 py-1 text-xs font-semibold text-white">
                <Megaphone className="h-3.5 w-3.5" /> For business owners
              </div>
              <h2 className="mt-4 text-3xl sm:text-4xl font-semibold tracking-tight text-slate-950">
                Facebook Ads Management
              </h2>
              <div className="mt-3 flex items-baseline gap-2">
                <span className="text-4xl font-bold text-slate-950 tabular-nums">$1,497</span>
                <span className="text-slate-500">/mo + 10% of ad spend</span>
              </div>
              <p className="mt-4 text-slate-700">
                Built for business owners with a real offer who want professional-grade Facebook +
                Instagram ads without paying agency fees. Full-service: strategy, creative, daily
                monitoring, weekly optimization, transparent reporting.
              </p>
              <ul className="mt-5 space-y-2 text-slate-700">
                {[
                  "Account setup + pixel / conversion tracking installed",
                  "8 new ad creatives / month (4 image + 4 short video)",
                  "Daily spend monitoring + weekly optimization",
                  "Monthly report: spend, leads, CPL, ROAS",
                  "You pay Meta directly. We never touch ad-spend funds.",
                  "Minimum recommended monthly ad budget: $1,500",
                ].map((b) => (
                  <li key={b} className="flex items-start gap-2 text-sm">
                    <Check className="mt-0.5 h-4 w-4 shrink-0 text-lead-600" />
                    <span>{b}</span>
                  </li>
                ))}
              </ul>
              <Link
                href="/book"
                className="mt-7 inline-flex items-center justify-center gap-2 rounded-xl bg-accent-500 px-6 py-3 font-semibold text-white shadow-sm hover:bg-accent-600"
              >
                Book the 10-min call <ArrowRight className="h-4 w-4" />
              </Link>
            </div>

            {/* Stat card */}
            <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-md">
              <div className="text-xs uppercase tracking-widest text-slate-500">What gets measured</div>
              <div className="mt-3 grid gap-4 grid-cols-2">
                <StatBlock label="Cost per lead" value="$" sub="Tracked weekly" />
                <StatBlock label="Lead volume" value="#" sub="Tracked daily" />
                <StatBlock label="ROAS" value="x" sub="Tracked monthly" />
                <StatBlock label="Creative tested" value="8/mo" sub="New every month" />
              </div>
              <p className="mt-5 text-xs text-slate-500 leading-relaxed">
                We do not guarantee specific lead volume, CPL, or ROAS — paid-ad performance depends
                on offer, market, creative, and platform behavior outside our control. We guarantee
                the work product, the strategic direction, and complete reporting transparency.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* THE 10-MINUTE CALL */}
      <section className="border-b border-slate-200 bg-white">
        <div className="mx-auto max-w-5xl px-4 py-14 sm:py-20 text-center">
          <div className="inline-flex items-center gap-2 rounded-full bg-lead-100 px-3 py-1 text-xs uppercase tracking-widest text-lead-800 font-semibold">
            <Clock className="h-3.5 w-3.5" /> The first step
          </div>
          <h2 className="mt-4 text-3xl sm:text-4xl font-semibold tracking-tight text-slate-950">
            10 minutes. Free. We'll know.
          </h2>
          <p className="mt-4 text-lg text-slate-700 max-w-2xl mx-auto">
            This isn't a coaching session. It's not a pitch. It's a 10-minute conversation where
            we both figure out fast whether we should work together — and if yes, on which package.
          </p>
          <div className="mt-8 grid gap-4 sm:grid-cols-3 max-w-3xl mx-auto text-left">
            <Step n="1" title="Pick a slot" body="Cal.com on /book. Pick a 10-minute slot that works." />
            <Step n="2" title="We meet" body="Ryan asks 5 questions. You ask 5 questions. We know." />
            <Step n="3" title="Move forward" body="If yes — we work together. If no — you keep your time." />
          </div>
          <Link
            href="/book"
            className="mt-10 inline-flex items-center justify-center gap-2 rounded-xl bg-accent-500 px-6 py-3 font-semibold text-white shadow-sm hover:bg-accent-600"
          >
            Book my 10-min call <ArrowRight className="h-4 w-4" />
          </Link>
        </div>
      </section>

      {/* FOUNDER STRIP */}
      <section className="border-b border-slate-200 bg-slate-50">
        <div className="mx-auto max-w-5xl px-4 py-14">
          <div className="text-center">
            <div className="text-xs uppercase tracking-widest text-slate-500">What I've built</div>
            <h2 className="mt-2 text-2xl sm:text-3xl font-semibold text-slate-950">
              Same operator. Different problems. Same playbook.
            </h2>
          </div>
          <div className="mt-8 grid gap-4 md:grid-cols-5 text-center">
            {FOUNDER_BRANDS.map((b) => (
              <div key={b.name} className="rounded-xl border border-slate-200 bg-white p-3 shadow-sm">
                <div className="text-sm font-semibold text-slate-900">{b.name}</div>
                <div className="mt-0.5 text-xs text-slate-500">{b.note}</div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* FOOTER */}
      <footer className="bg-white">
        <div className="mx-auto max-w-7xl px-4 py-10 text-xs text-slate-500 grid gap-4 md:grid-cols-2">
          <div>
            The LeadFlow Pro · A Real Ryan Nichols LLC company · Texas-governed under mutual NDA on
            every paid engagement. We do not guarantee specific follower-count, lead-volume,
            conversion-rate, or revenue outcomes — what we deliver is the work product, strategic
            direction, and reporting described in each package. Paid-ad budgets are paid by clients
            directly to Meta, Google, or other ad platforms — never invoiced through us.
          </div>
          <div className="md:text-right space-x-4">
            <Link href="/tiers" className="hover:text-slate-900">All tiers</Link>
            <Link href="/services" className="hover:text-slate-900">Services</Link>
            <Link href="/services/consulting" className="hover:text-slate-900">Consulting</Link>
            <Link href="/book" className="hover:text-slate-900">Book a call</Link>
          </div>
        </div>
      </footer>
    </div>
  );
}

/* ─── Components ──────────────────────────────────────────────── */

function Step({ n, title, body }: { n: string; title: string; body: string }) {
  return (
    <div className="rounded-xl border border-slate-200 bg-slate-50 p-5">
      <div className="inline-flex h-7 w-7 items-center justify-center rounded-full bg-slate-900 text-white text-xs font-bold">
        {n}
      </div>
      <div className="mt-3 font-semibold text-slate-950">{title}</div>
      <div className="mt-1 text-sm text-slate-600">{body}</div>
    </div>
  );
}

function StatBlock({ label, value, sub }: { label: string; value: string; sub: string }) {
  return (
    <div className="rounded-lg border border-slate-200 bg-slate-50 p-4">
      <div className="text-2xl font-bold text-slate-950 tabular-nums">{value}</div>
      <div className="text-xs font-semibold text-slate-700 mt-1">{label}</div>
      <div className="text-[10px] text-slate-500 mt-0.5">{sub}</div>
    </div>
  );
}
