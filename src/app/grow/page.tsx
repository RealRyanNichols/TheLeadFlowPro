// src/app/grow/page.tsx — New flagship landing page.
//
// Replaces the "dark Pacman 80s" feel with a light, RepWatchr-style aesthetic:
// quantitative trust signals, inline SVG charts, platform-specific cards,
// clean sans-serif typography, neutral tones with brand accents.
//
// Built around Ryan's manifesto: "The algorithm is in everything." Every
// signal gets collected — phones, watches, cars, apps — and the operator who
// pulls / targets / sifts the data first wins. The page sells two things:
//   1. Tools the visitor can buy (Looking Glass + the rest of the toolset)
//   2. A free 10-minute call with Ryan (serious buyers only)
//
// Server component. Pure CSS + inline SVG charts — no chart lib, no JS.

import Link from "next/link";
import {
  ArrowRight, BarChart3, Brain, Calendar, Check, Crosshair, Eye,
  Flame, Globe2, Layers, Megaphone, MapPin, Radar, Rocket, Sparkles,
  Smartphone, Target, TrendingUp, Users, Zap, ShieldCheck, Quote,
} from "lucide-react";

export const metadata = {
  title: "The Algorithm Is In Everything — The LeadFlow Pro",
  description:
    "Real Ryan Nichols built 75K+ across 5 platforms by treating every business decision like the algorithm it really is. TikTok, Facebook, X, YouTube growth packages, Facebook Ads management, and the Looking Glass real-time toolset. Free 10-minute call for serious buyers.",
};

/* ──────────────────────────────────────────────────────────────
   Data
   ──────────────────────────────────────────────────────────── */

const TRUST_NUMBERS = [
  { label: "X / Twitter",   value: "43,800+", note: "@RealRyanNichols" },
  { label: "Facebook",      value: "18,900+", note: "Public page + community" },
  { label: "YouTube",       value: "12,000+", note: "Subscribers and growing" },
  { label: "Total reach",   value: "75,000+", note: "Across 5 platforms" },
];

const SIGNAL_SOURCES = [
  { icon: Smartphone, label: "Phones",   note: "App opens, dwell time, search" },
  { icon: MapPin,     label: "Geofences",note: "Where you go and stay" },
  { icon: Eye,        label: "Browsers", note: "Pixels, cookies, fingerprints" },
  { icon: Globe2,     label: "Apps",     note: "Active and dormant" },
];

type Platform = {
  slug: string;
  name: string;
  handle?: string;
  oneline: string;
  price: string;
  cadence: string;
  deliverables: string[];
  // For the chart: 12 monthly values 0-100 representing relative growth
  series: number[];
  brandHex: string;
  ctaSubject: string;
};

const PLATFORMS: Platform[] = [
  {
    slug: "tiktok",
    name: "TikTok Growth",
    oneline:
      "Daily short-form built around the hook patterns the algorithm is rewarding this week. Repurposed across IG Reels and YT Shorts.",
    price: "$497",
    cadence: "/mo per channel",
    deliverables: [
      "20 short-form posts per month",
      "Hook + caption iteration based on weekly performance",
      "Trend-watch report (what's working in your niche)",
      "Cross-post to IG Reels + YT Shorts at no extra charge",
    ],
    series: [12, 18, 22, 30, 38, 49, 55, 64, 72, 78, 86, 94],
    brandHex: "#000000",
    ctaSubject: "TikTok Growth Package — $497/mo",
  },
  {
    slug: "facebook",
    name: "Facebook Growth",
    oneline:
      "Page + groups strategy for businesses where the buyer actually lives on Facebook (local services, mortgage, real estate, B2B).",
    price: "$497",
    cadence: "/mo per channel",
    deliverables: [
      "12 long-form posts + 8 short videos per month",
      "Group seeding + engagement strategy (your niche)",
      "Messenger funnel + auto-reply build",
      "Monthly insights report tied to leads, not vanity",
    ],
    series: [25, 28, 30, 35, 41, 44, 50, 56, 63, 68, 75, 82],
    brandHex: "#1877F2",
    ctaSubject: "Facebook Growth Package — $497/mo",
  },
  {
    slug: "x",
    name: "X / Twitter Growth",
    oneline:
      "Daily posting + reply game. The platform Ryan grew to 43,800+ on. Built for personal brands, founders, and operators.",
    price: "$497",
    cadence: "/mo per channel",
    deliverables: [
      "Daily posts (Mon–Fri) in your voice",
      "Reply targeting on accounts that drive your audience",
      "Weekly thread + monthly long-form",
      "Pinned post optimization + bio testing",
    ],
    series: [10, 14, 19, 26, 34, 40, 47, 55, 62, 70, 79, 88],
    brandHex: "#0F1419",
    ctaSubject: "X / Twitter Growth Package — $497/mo",
  },
  {
    slug: "youtube",
    name: "YouTube Growth",
    oneline:
      "Long-form content engine. Title + thumbnail + retention loops engineered for the home feed and search. Where buyers actually convert.",
    price: "$497",
    cadence: "/mo per channel",
    deliverables: [
      "1 long-form video per week (you record, we edit + publish)",
      "Title + thumbnail iteration each upload",
      "Description + chapter + CTA optimization",
      "Monthly retention + CTR analysis",
    ],
    series: [8, 11, 16, 22, 28, 36, 44, 52, 61, 69, 77, 85],
    brandHex: "#FF0000",
    ctaSubject: "YouTube Growth Package — $497/mo",
  },
];

const FAQS = [
  {
    q: "Why a 10-minute call instead of an hour?",
    a: "10 minutes is enough to know whether you're serious and whether we're a fit. Tire-kickers give up at 'book a call.' Serious buyers don't need an hour to decide.",
  },
  {
    q: "Do you guarantee growth, leads, or revenue?",
    a: "No, and we won't. Anyone who guarantees a specific outcome on social or paid is overselling — performance depends on offer, market, creative, and the platform's behavior. We guarantee the work product, the strategic direction, and complete reporting transparency.",
  },
  {
    q: "What if I want all four platforms?",
    a: "There's a Power Bundle of all 4 at $1,497/mo (saves ~$500/mo over single-channel). For most operators it's the right move because the algorithm rewards consistency across surfaces, not just on one.",
  },
  {
    q: "How does this connect to Looking Glass and your toolset?",
    a: "Every managed-growth client gets Looking Glass access included — real-time API + webhook signals from your accounts that prompt the next best action. Tool-only customers can buy Looking Glass standalone when it ships.",
  },
];

/* ──────────────────────────────────────────────────────────────
   Page
   ──────────────────────────────────────────────────────────── */

export default function GrowPage() {
  return (
    <div className="min-h-screen bg-white text-slate-900">
      {/* Top bar */}
      <header className="sticky top-0 z-40 border-b border-slate-200 bg-white/90 backdrop-blur">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 py-3 flex items-center justify-between">
          <Link href="/" className="font-semibold text-slate-900 hover:text-slate-700">
            The LeadFlow Pro
          </Link>
          <nav className="hidden md:flex items-center gap-6 text-sm text-slate-600">
            <a href="#trust" className="hover:text-slate-900">Proof</a>
            <a href="#looking-glass" className="hover:text-slate-900">Looking Glass</a>
            <a href="#packages" className="hover:text-slate-900">Packages</a>
            <a href="#fb-ads" className="hover:text-slate-900">FB Ads</a>
            <a href="#faq" className="hover:text-slate-900">FAQ</a>
          </nav>
          <Link
            href="/book"
            className="inline-flex items-center gap-1.5 rounded-lg bg-slate-900 px-4 py-2 text-sm font-semibold text-white hover:bg-slate-800"
          >
            Book the 10-min call <ArrowRight className="h-3.5 w-3.5" />
          </Link>
        </div>
      </header>

      {/* HERO */}
      <section className="relative overflow-hidden">
        <div className="absolute inset-0 -z-10 bg-gradient-to-b from-slate-50 to-white" />
        <div className="mx-auto max-w-7xl px-4 sm:px-6 pt-14 pb-12 sm:pt-24 sm:pb-20">
          <div className="grid lg:grid-cols-2 gap-10 items-center">
            <div>
              <div className="inline-flex items-center gap-2 rounded-full border border-slate-200 bg-slate-50 px-3 py-1 text-xs uppercase tracking-widest text-slate-600">
                <Radar className="h-3.5 w-3.5 text-cyan-600" /> The LeadFlow Pro · Ryan Nichols
              </div>
              <h1 className="mt-5 text-4xl sm:text-5xl lg:text-6xl font-bold tracking-tight text-slate-950">
                The algorithm is in{" "}
                <span className="bg-gradient-to-r from-cyan-600 via-brand-500 to-accent-500 bg-clip-text text-transparent">
                  everything we do.
                </span>
              </h1>
              <p className="mt-5 text-lg text-slate-700 max-w-xl">
                Your phone knows. Your watch knows. Your car knows. Every place you visit, every
                app you open, every search — it's all signal. The operator who pulls, gathers,
                and targets the right data first <span className="font-semibold text-slate-900">wins</span>.
              </p>
              <p className="mt-3 text-slate-600 max-w-xl">
                That's true in business. That's true on every social platform. We help business
                owners, creators, artists, and founders use those signals to grow on TikTok,
                Facebook, X, and YouTube — and to run paid ads that actually convert.
              </p>
              <div className="mt-7 flex flex-wrap items-center gap-3">
                <Link
                  href="/book"
                  className="inline-flex items-center gap-2 rounded-xl bg-accent-500 px-5 py-3 font-semibold text-slate-950 shadow-sm hover:bg-accent-400"
                >
                  Book the 10-min call <ArrowRight className="h-4 w-4" />
                </Link>
                <a
                  href="#packages"
                  className="inline-flex items-center gap-2 rounded-xl border border-slate-300 bg-white px-5 py-3 font-semibold text-slate-900 hover:bg-slate-50"
                >
                  See the packages
                </a>
              </div>
              <p className="mt-4 text-xs text-slate-500">
                Calls are reserved for serious buyers. No pitch decks. No 60-minute "discovery"
                tours. 10 minutes — we know if we're a fit.
              </p>
            </div>

            {/* Hero visual: real-time signal radar (inline SVG) */}
            <div>
              <RadarMock />
              <p className="mt-3 text-xs text-slate-500 text-center">
                Signal sources we collect and translate into next actions
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* TRUST BAND — RepWatchr-style number cards */}
      <section id="trust" className="border-y border-slate-200 bg-slate-50/60">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 py-10">
          <div className="text-xs uppercase tracking-widest text-slate-500 mb-5">
            Built by an operator with skin in the game
          </div>
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-5">
            {TRUST_NUMBERS.map((t) => (
              <div key={t.label} className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
                <div className="text-3xl sm:text-4xl font-bold text-slate-950 tabular-nums">
                  {t.value}
                </div>
                <div className="mt-1 text-sm font-medium text-slate-700">{t.label}</div>
                <div className="mt-0.5 text-xs text-slate-500">{t.note}</div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* THE THESIS */}
      <section className="mx-auto max-w-7xl px-4 sm:px-6 py-16">
        <div className="grid lg:grid-cols-3 gap-8 items-start">
          <div className="lg:col-span-2">
            <Eyebrow>The thesis</Eyebrow>
            <h2 className="mt-2 text-3xl sm:text-4xl font-bold tracking-tight text-slate-950">
              He who pulls, gathers, targets, and sifts the data first —{" "}
              <span className="text-accent-600">wins.</span>
            </h2>
            <p className="mt-4 text-lg text-slate-700">
              Geofencing on your phone. Heart rate on your watch. Routes in your car. Search
              history in your browser. Every consumer is being read in real time — by ad
              platforms, by data brokers, by competitors who already figured this out. The
              question is whether you're using that signal flow on purpose, or being moved
              around by it.
            </p>
            <p className="mt-3 text-slate-600">
              The LeadFlow Pro is the operating layer that turns those signals into action.
              Tools you can buy. Services you can hire us for. A toolset that knows what your
              audience is doing before they do.
            </p>
          </div>

          <div className="grid grid-cols-2 gap-3">
            {SIGNAL_SOURCES.map((s) => (
              <div key={s.label} className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
                <div className="inline-flex h-9 w-9 items-center justify-center rounded-lg bg-cyan-50 text-cyan-700">
                  <s.icon className="h-4.5 w-4.5" />
                </div>
                <div className="mt-3 text-sm font-semibold text-slate-900">{s.label}</div>
                <div className="text-xs text-slate-500">{s.note}</div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* LOOKING GLASS spotlight */}
      <section id="looking-glass" className="bg-slate-950 text-white">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 py-16 sm:py-20">
          <div className="grid lg:grid-cols-2 gap-10 items-center">
            <div>
              <div className="inline-flex items-center gap-2 rounded-full border border-cyan-400/40 bg-cyan-500/10 px-3 py-1 text-xs uppercase tracking-widest text-cyan-300">
                <Crosshair className="h-3.5 w-3.5" /> Flagship tool · Looking Glass
              </div>
              <h2 className="mt-5 text-3xl sm:text-4xl font-bold tracking-tight">
                Real-time prompts for your next best move.
              </h2>
              <p className="mt-4 text-lg text-slate-200 max-w-xl">
                Looking Glass connects to your TikTok, Facebook, X, YouTube, and Instagram
                accounts via direct API + webhook integration. It watches what's happening in
                real time — replies, mentions, share velocity, comment sentiment, follower
                surges — and prompts you on the single next action that matters most.
              </p>
              <ul className="mt-5 space-y-2 text-slate-200">
                <Bullet>Real-time signal pulls every 60 seconds across all connected accounts</Bullet>
                <Bullet>Webhook triggers fire the moment a post crosses a velocity threshold</Bullet>
                <Bullet>"Next action" prompts: reply now, boost now, repost now, DM this lead now</Bullet>
                <Bullet>One unified inbox for every comment + DM + reply across platforms</Bullet>
                <Bullet>Cross-platform analytics in one dashboard (no more 5 tabs open)</Bullet>
              </ul>
              <div className="mt-7 flex flex-wrap items-center gap-3">
                <Link
                  href="/book"
                  className="inline-flex items-center gap-2 rounded-xl bg-accent-500 px-5 py-3 font-semibold text-slate-950 hover:bg-accent-400"
                >
                  Reserve early access <ArrowRight className="h-4 w-4" />
                </Link>
                <span className="text-sm text-slate-400">
                  Included free with any managed-growth package
                </span>
              </div>
            </div>

            {/* Looking Glass UI mockup (inline SVG) */}
            <div>
              <LookingGlassMock />
            </div>
          </div>
        </div>
      </section>

      {/* PLATFORM PACKAGES */}
      <section id="packages" className="mx-auto max-w-7xl px-4 sm:px-6 py-16 sm:py-20">
        <div className="flex items-end justify-between flex-wrap gap-4 mb-8">
          <div>
            <Eyebrow>Managed growth</Eyebrow>
            <h2 className="mt-2 text-3xl sm:text-4xl font-bold tracking-tight text-slate-950">
              One package per platform. Pick yours, or run all four.
            </h2>
            <p className="mt-3 text-slate-600 max-w-2xl">
              Each package includes managed posting, community engagement, monthly reporting,
              and Looking Glass access. Same operator, same standard, different surface.
            </p>
          </div>
          <div className="rounded-2xl border-2 border-dashed border-accent-400 bg-accent-50 px-5 py-3 text-sm text-slate-900">
            <div className="font-semibold flex items-center gap-2">
              <Flame className="h-4 w-4 text-accent-600" /> Power Bundle: all 4 platforms
            </div>
            <div className="text-slate-700"><span className="text-2xl font-bold text-slate-950">$1,497</span>/mo · saves ~$500</div>
          </div>
        </div>

        <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-4">
          {PLATFORMS.map((p) => (
            <PlatformCard key={p.slug} p={p} />
          ))}
        </div>

        <div className="mt-6 rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <div className="font-semibold text-slate-900">Mix-and-match also welcome</div>
              <div className="text-sm text-slate-600">
                2 platforms = $897/mo · 3 platforms = $1,197/mo · all 4 (Power Bundle) = $1,497/mo
              </div>
            </div>
            <Link
              href="/book"
              className="inline-flex items-center gap-2 rounded-xl bg-slate-900 px-4 py-2.5 text-sm font-semibold text-white hover:bg-slate-800"
            >
              Talk through which fits <ArrowRight className="h-4 w-4" />
            </Link>
          </div>
        </div>
      </section>

      {/* FACEBOOK ADS spotlight */}
      <section id="fb-ads" className="bg-gradient-to-br from-slate-50 to-white border-y border-slate-200">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 py-16 sm:py-20">
          <div className="grid lg:grid-cols-2 gap-10 items-center">
            <div>
              <Eyebrow>Paid traffic</Eyebrow>
              <h2 className="mt-2 text-3xl sm:text-4xl font-bold tracking-tight text-slate-950">
                Facebook Ads Management for{" "}
                <span className="text-brand-600">business owners.</span>
              </h2>
              <p className="mt-4 text-lg text-slate-700 max-w-xl">
                For local service businesses, coaches, course creators, mortgage originators,
                real estate agents, and ecommerce founders. We build the campaigns, write the
                creative, optimize weekly, and report on real lead volume — not vanity reach.
              </p>
              <ul className="mt-5 space-y-2 text-slate-700">
                <Bullet color="brand">Campaign strategy + audience build (your CRM as input)</Bullet>
                <Bullet color="brand">8 fresh creatives per month (4 image + 4 short-form video)</Bullet>
                <Bullet color="brand">Daily spend monitoring + weekly optimization passes</Bullet>
                <Bullet color="brand">Monthly performance report (spend, leads, CPL, ROAS)</Bullet>
                <Bullet color="brand">Pixel + conversion tracking setup ($997 one-time, waived on annual prepay)</Bullet>
                <Bullet color="brand">Ad budget paid by you directly to Meta — never invoiced through us</Bullet>
              </ul>

              <div className="mt-7 flex items-center gap-4 flex-wrap">
                <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
                  <div className="text-xs uppercase tracking-widest text-slate-500">Management fee</div>
                  <div className="mt-1 text-3xl font-bold text-slate-950">$1,497<span className="text-base font-semibold text-slate-500">/mo</span></div>
                  <div className="text-xs text-slate-500">+ 10% of monthly ad spend</div>
                </div>
                <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
                  <div className="text-xs uppercase tracking-widest text-slate-500">Min ad spend</div>
                  <div className="mt-1 text-3xl font-bold text-slate-950">$2,000<span className="text-base font-semibold text-slate-500">/mo</span></div>
                  <div className="text-xs text-slate-500">Paid directly to Meta</div>
                </div>
              </div>

              <Link
                href="/book"
                className="mt-6 inline-flex items-center gap-2 rounded-xl bg-brand-600 px-5 py-3 font-semibold text-white hover:bg-brand-500"
              >
                Talk through your campaign <ArrowRight className="h-4 w-4" />
              </Link>
            </div>

            {/* CPL improvement chart */}
            <div>
              <CplChart />
              <p className="mt-3 text-xs text-slate-500 text-center">
                Illustrative — actual CPL depends on offer, market, creative, and platform
                behavior. We do not guarantee specific results.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* HOW IT WORKS */}
      <section className="mx-auto max-w-7xl px-4 sm:px-6 py-16">
        <Eyebrow>How it works</Eyebrow>
        <h2 className="mt-2 text-3xl sm:text-4xl font-bold tracking-tight text-slate-950">
          From "I should probably do something" to live in 14 days.
        </h2>
        <div className="mt-8 grid gap-5 md:grid-cols-3">
          <StepCard
            n={1}
            icon={Calendar}
            title="Book the 10-min call"
            body="Free, but reserved for serious buyers. We confirm the fit and recommend the right starting package — services, tools, or both."
          />
          <StepCard
            n={2}
            icon={Brain}
            title="Plan together"
            body="Kickoff call: we look at your accounts, your offer, your numbers. We pick the channels, the cadence, and the creative direction."
          />
          <StepCard
            n={3}
            icon={Rocket}
            title="Execute on day 1"
            body="Posting begins. Looking Glass fires up. Weekly reviews start. You stay focused on your business while the algorithm gets fed on purpose."
          />
        </div>
      </section>

      {/* FAQ */}
      <section id="faq" className="bg-slate-50/60 border-y border-slate-200">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 py-16">
          <Eyebrow>Common questions</Eyebrow>
          <h2 className="mt-2 text-3xl sm:text-4xl font-bold tracking-tight text-slate-950">
            Before you book the call.
          </h2>
          <div className="mt-8 grid gap-5 md:grid-cols-2">
            {FAQS.map((f) => (
              <div key={f.q} className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
                <div className="flex items-start gap-3">
                  <Quote className="mt-0.5 h-4 w-4 shrink-0 text-slate-400" />
                  <h3 className="font-semibold text-slate-950">{f.q}</h3>
                </div>
                <p className="mt-2 text-sm text-slate-700">{f.a}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* FINAL CTA */}
      <section className="mx-auto max-w-7xl px-4 sm:px-6 py-16 sm:py-20">
        <div className="rounded-3xl border border-slate-200 bg-gradient-to-br from-cyan-50 via-white to-accent-50 p-8 sm:p-12 text-center shadow-sm">
          <h2 className="text-3xl sm:text-4xl font-bold tracking-tight text-slate-950">
            Ready to play the algorithm on purpose?
          </h2>
          <p className="mt-3 text-slate-700 max-w-2xl mx-auto">
            One 10-minute call. We'll know if we're a fit, and you'll walk away with a clear
            recommendation — package, tool, or both. No pitch decks. No fluff.
          </p>
          <div className="mt-7 flex flex-col sm:flex-row items-center justify-center gap-3">
            <Link
              href="/book"
              className="inline-flex items-center gap-2 rounded-xl bg-accent-500 px-6 py-3 font-semibold text-slate-950 shadow-sm hover:bg-accent-400"
            >
              Book the 10-minute call <ArrowRight className="h-4 w-4" />
            </Link>
            <Link
              href="/services/consulting"
              className="inline-flex items-center gap-2 rounded-xl border border-slate-300 bg-white px-6 py-3 font-semibold text-slate-900 hover:bg-slate-50"
            >
              <Sparkles className="h-4 w-4 text-brand-600" /> See consulting options
            </Link>
          </div>
        </div>

        <p className="mt-8 text-xs text-slate-500 max-w-3xl mx-auto text-center leading-relaxed">
          The LeadFlow Pro is operated by Real Ryan Nichols LLC, a Texas limited liability company.
          We do not guarantee specific follower-count, lead-volume, conversion-rate, or revenue
          outcomes — what we deliver is the work product, strategic direction, and reporting
          described in each package. Paid-ad budgets are paid by clients directly to ad
          platforms and are never invoiced through us.
        </p>
      </section>
    </div>
  );
}

/* ──────────────────────────────────────────────────────────────
   Sub-components (no client JS — pure SSR + SVG)
   ──────────────────────────────────────────────────────────── */

function Eyebrow({ children }: { children: React.ReactNode }) {
  return (
    <div className="text-xs uppercase tracking-widest font-semibold text-cyan-700">
      {children}
    </div>
  );
}

function Bullet({ children, color = "cyan" }: { children: React.ReactNode; color?: "cyan" | "brand" }) {
  const cls = color === "brand" ? "text-brand-600" : "text-cyan-400";
  return (
    <li className="flex items-start gap-2.5">
      <Check className={`mt-0.5 h-4 w-4 shrink-0 ${cls}`} />
      <span>{children}</span>
    </li>
  );
}

function StepCard({
  n, icon: Icon, title, body,
}: { n: number; icon: any; title: string; body: string }) {
  return (
    <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
      <div className="flex items-center gap-3">
        <div className="inline-flex h-10 w-10 items-center justify-center rounded-xl bg-slate-900 text-white font-bold">
          {n}
        </div>
        <Icon className="h-5 w-5 text-cyan-600" />
      </div>
      <h3 className="mt-4 font-semibold text-slate-950">{title}</h3>
      <p className="mt-1 text-sm text-slate-600">{body}</p>
    </div>
  );
}

function PlatformCard({ p }: { p: Platform }) {
  return (
    <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm flex flex-col">
      <div className="flex items-start justify-between">
        <div>
          <div className="text-xs uppercase tracking-widest text-slate-500">Platform</div>
          <div className="text-lg font-bold text-slate-950">{p.name}</div>
        </div>
        <div className="rounded-lg px-2 py-1 text-[11px] font-semibold uppercase tracking-wider"
             style={{ backgroundColor: p.brandHex, color: "white" }}>
          {p.slug}
        </div>
      </div>

      <Sparkline series={p.series} color={p.brandHex} />

      <p className="mt-3 text-sm text-slate-700">{p.oneline}</p>

      <ul className="mt-4 space-y-1.5 text-sm text-slate-700">
        {p.deliverables.map((d) => (
          <li key={d} className="flex items-start gap-2">
            <Check className="mt-0.5 h-4 w-4 shrink-0 text-cyan-600" />
            <span>{d}</span>
          </li>
        ))}
      </ul>

      <div className="mt-5 flex items-baseline gap-1">
        <span className="text-2xl font-bold text-slate-950">{p.price}</span>
        <span className="text-sm text-slate-500">{p.cadence}</span>
      </div>

      <Link
        href={`/book?package=${p.slug}`}
        className="mt-4 inline-flex w-full items-center justify-center gap-2 rounded-lg bg-slate-900 px-4 py-2.5 text-sm font-semibold text-white hover:bg-slate-800"
      >
        Start with {p.name.split(" ")[0]} <ArrowRight className="h-4 w-4" />
      </Link>
    </div>
  );
}

function Sparkline({ series, color }: { series: number[]; color: string }) {
  // Build a smooth-ish path from the values
  const W = 240;
  const H = 60;
  const pad = 4;
  const max = Math.max(...series);
  const min = Math.min(...series);
  const range = max - min || 1;
  const stepX = (W - pad * 2) / (series.length - 1);
  const pts = series.map((v, i) => {
    const x = pad + i * stepX;
    const y = H - pad - ((v - min) / range) * (H - pad * 2);
    return [x, y] as const;
  });
  const d = pts.map(([x, y], i) => `${i === 0 ? "M" : "L"}${x.toFixed(1)},${y.toFixed(1)}`).join(" ");
  const areaD = `${d} L${pad + (series.length - 1) * stepX},${H} L${pad},${H} Z`;

  return (
    <div className="mt-3 rounded-xl bg-slate-50 px-2 py-1">
      <svg viewBox={`0 0 ${W} ${H}`} className="block w-full h-16">
        <defs>
          <linearGradient id={`g-${color.replace(/[^a-zA-Z0-9]/g, "")}`} x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor={color} stopOpacity="0.25" />
            <stop offset="100%" stopColor={color} stopOpacity="0" />
          </linearGradient>
        </defs>
        <path d={areaD} fill={`url(#g-${color.replace(/[^a-zA-Z0-9]/g, "")})`} />
        <path d={d} fill="none" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
        {/* End-cap dot */}
        <circle cx={pts[pts.length - 1][0]} cy={pts[pts.length - 1][1]} r="3" fill={color} />
      </svg>
      <div className="flex items-center justify-between text-[10px] text-slate-500 px-1 pb-1">
        <span>Mo. 1</span>
        <span className="font-semibold text-slate-700">12-month growth pattern</span>
        <span>Mo. 12</span>
      </div>
    </div>
  );
}

function RadarMock() {
  // Stylized "real-time signal radar" — concentric arcs + dots representing
  // signals (location, app, search, video, social, ad) circulating.
  return (
    <div className="rounded-3xl border border-slate-200 bg-gradient-to-br from-slate-50 via-white to-cyan-50 p-6 shadow-sm">
      <div className="flex items-center justify-between mb-3">
        <div className="text-xs uppercase tracking-widest text-slate-500">Live signal radar</div>
        <div className="inline-flex items-center gap-1.5 text-xs text-cyan-700">
          <span className="h-2 w-2 rounded-full bg-cyan-500" /> active
        </div>
      </div>
      <svg viewBox="0 0 320 280" className="block w-full">
        {/* concentric circles */}
        {[40, 80, 120].map((r) => (
          <circle key={r} cx="160" cy="140" r={r} fill="none" stroke="#CBD5E1" strokeWidth="1" strokeDasharray="3 3" />
        ))}
        {/* axis */}
        <line x1="40" y1="140" x2="280" y2="140" stroke="#E2E8F0" strokeWidth="1" />
        <line x1="160" y1="20" x2="160" y2="260" stroke="#E2E8F0" strokeWidth="1" />
        {/* sweeping arc */}
        <path d="M 160 140 L 230 86 A 90 90 0 0 0 250 140 Z" fill="#22b8ff22" />
        <line x1="160" y1="140" x2="250" y2="140" stroke="#22b8ff" strokeWidth="2" />
        {/* dots = signals */}
        {[
          { x: 220, y: 90,  label: "TikTok",   color: "#000" },
          { x: 100, y: 70,  label: "X",        color: "#0F1419" },
          { x: 80,  y: 200, label: "YouTube",  color: "#FF0000" },
          { x: 240, y: 200, label: "Facebook", color: "#1877F2" },
          { x: 200, y: 145, label: "Geo ping", color: "#7fc93f" },
          { x: 130, y: 155, label: "Search",   color: "#ff9a1f" },
        ].map((s, i) => (
          <g key={i}>
            <circle cx={s.x} cy={s.y} r="6" fill={s.color} />
            <circle cx={s.x} cy={s.y} r="11" fill="none" stroke={s.color} strokeOpacity="0.3" strokeWidth="1.5" />
            <text x={s.x + 12} y={s.y + 4} fontSize="11" fill="#334155" fontWeight="600">{s.label}</text>
          </g>
        ))}
        {/* center dot */}
        <circle cx="160" cy="140" r="5" fill="#0d4a9d" />
        <circle cx="160" cy="140" r="9" fill="none" stroke="#0d4a9d" strokeOpacity="0.4" strokeWidth="2" />
      </svg>
      <div className="mt-2 grid grid-cols-3 gap-2 text-[10px] text-slate-500 text-center">
        <div className="rounded-md bg-slate-50 py-1">Last pull · 12s ago</div>
        <div className="rounded-md bg-slate-50 py-1">42 signals / min</div>
        <div className="rounded-md bg-cyan-50 py-1 text-cyan-700 font-semibold">3 actions queued</div>
      </div>
    </div>
  );
}

function LookingGlassMock() {
  // Stylized dashboard panel with a stack of "next actions" + a mini chart.
  return (
    <div className="rounded-2xl border border-white/10 bg-slate-900 p-5 shadow-2xl shadow-black/40">
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <span className="h-2.5 w-2.5 rounded-full bg-rose-400" />
          <span className="h-2.5 w-2.5 rounded-full bg-amber-400" />
          <span className="h-2.5 w-2.5 rounded-full bg-emerald-400" />
        </div>
        <div className="text-xs text-slate-400">looking-glass · live</div>
      </div>

      {/* Header row */}
      <div className="rounded-xl bg-slate-800/70 p-4 border border-white/5">
        <div className="text-xs text-slate-400 uppercase tracking-widest">Right now</div>
        <div className="mt-1 text-lg font-semibold text-white">
          Your 9:14am X post is{" "}
          <span className="text-cyan-300">3.2× your usual</span> velocity.
        </div>
        <div className="mt-3 flex flex-wrap items-center gap-2">
          <span className="rounded-md bg-cyan-500/15 text-cyan-300 px-2 py-0.5 text-xs font-semibold">+482 impressions / 5min</span>
          <span className="rounded-md bg-emerald-500/15 text-emerald-300 px-2 py-0.5 text-xs font-semibold">12 new follows</span>
          <span className="rounded-md bg-amber-500/15 text-amber-300 px-2 py-0.5 text-xs font-semibold">2 buying-signal replies</span>
        </div>
      </div>

      {/* Next actions */}
      <div className="mt-4 space-y-2">
        <ActionRow color="emerald" title="Reply to @daviddraperops"
                   sub="Asked your pricing — close the loop in <30s" />
        <ActionRow color="cyan"    title="Pin this post"
                   sub="It's outperforming your last 14 — keep it surfaced" />
        <ActionRow color="amber"   title="Cross-post to LinkedIn"
                   sub="Same hook will land on your B2B audience too" />
      </div>

      {/* Mini chart */}
      <div className="mt-4 rounded-xl bg-slate-800/50 p-3 border border-white/5">
        <div className="flex items-center justify-between text-xs text-slate-400 mb-2">
          <span>Velocity (last 60 min)</span>
          <span className="text-cyan-300 font-semibold">+218%</span>
        </div>
        <svg viewBox="0 0 280 60" className="block w-full h-12">
          <defs>
            <linearGradient id="lg-grad" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="#22b8ff" stopOpacity="0.5" />
              <stop offset="100%" stopColor="#22b8ff" stopOpacity="0" />
            </linearGradient>
          </defs>
          <path d="M0 50 L40 48 L80 45 L120 40 L160 35 L200 28 L240 18 L280 6 L280 60 L0 60 Z" fill="url(#lg-grad)" />
          <path d="M0 50 L40 48 L80 45 L120 40 L160 35 L200 28 L240 18 L280 6" stroke="#22b8ff" strokeWidth="2" fill="none" />
        </svg>
      </div>
    </div>
  );
}

function ActionRow({ color, title, sub }: { color: "emerald" | "cyan" | "amber"; title: string; sub: string }) {
  const dot = {
    emerald: "bg-emerald-400",
    cyan:    "bg-cyan-400",
    amber:   "bg-amber-400",
  }[color];
  return (
    <div className="flex items-start gap-3 rounded-lg bg-slate-800/40 p-3 border border-white/5">
      <span className={`mt-1.5 h-2 w-2 rounded-full ${dot}`} />
      <div className="flex-1">
        <div className="text-sm font-semibold text-white">{title}</div>
        <div className="text-xs text-slate-400">{sub}</div>
      </div>
      <button className="text-xs font-semibold text-cyan-300 hover:text-cyan-200">Do it</button>
    </div>
  );
}

function CplChart() {
  // Bar chart: monthly CPL trending down (illustrative)
  const data = [
    { m: "Jan", cpl: 87 },
    { m: "Feb", cpl: 71 },
    { m: "Mar", cpl: 64 },
    { m: "Apr", cpl: 58 },
    { m: "May", cpl: 49 },
    { m: "Jun", cpl: 42 },
  ];
  const max = Math.max(...data.map((d) => d.cpl));
  return (
    <div className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
      <div className="flex items-center justify-between mb-4">
        <div>
          <div className="text-xs uppercase tracking-widest text-slate-500">Cost per lead</div>
          <div className="mt-0.5 text-2xl font-bold text-slate-950">CPL trend, 6 months</div>
        </div>
        <div className="text-right">
          <div className="text-xs uppercase tracking-widest text-emerald-600">Down</div>
          <div className="text-2xl font-bold text-emerald-600">−52%</div>
        </div>
      </div>
      <div className="grid grid-cols-6 gap-3 items-end h-40">
        {data.map((d, i) => {
          const h = (d.cpl / max) * 100;
          const isLast = i === data.length - 1;
          return (
            <div key={d.m} className="flex flex-col items-center gap-2">
              <div className="w-full rounded-t-md transition-all flex items-end" style={{ height: `${h}%`, backgroundColor: isLast ? "#1273e8" : "#cfe6ff" }}>
                <div className="w-full text-center text-[10px] font-semibold pt-1" style={{ color: isLast ? "white" : "#0d59c2" }}>
                  ${d.cpl}
                </div>
              </div>
              <div className="text-xs text-slate-500">{d.m}</div>
            </div>
          );
        })}
      </div>
      <div className="mt-4 grid grid-cols-3 gap-3 text-center">
        <div className="rounded-lg border border-slate-200 bg-slate-50 p-3">
          <div className="text-[11px] uppercase tracking-widest text-slate-500">Starting CPL</div>
          <div className="mt-1 text-xl font-bold text-slate-950">$87</div>
        </div>
        <div className="rounded-lg border border-slate-200 bg-slate-50 p-3">
          <div className="text-[11px] uppercase tracking-widest text-slate-500">After 6 mo</div>
          <div className="mt-1 text-xl font-bold text-slate-950">$42</div>
        </div>
        <div className="rounded-lg border border-emerald-200 bg-emerald-50 p-3">
          <div className="text-[11px] uppercase tracking-widest text-emerald-700">Saved per lead</div>
          <div className="mt-1 text-xl font-bold text-emerald-700">$45</div>
        </div>
      </div>
    </div>
  );
}
