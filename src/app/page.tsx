// src/app/page.tsx — Homepage.
//
// Promoted from /grow-v2 (which Ryan approved on 2026-05-04). Old rainbow
// homepage retired. /grow-v2 still exists at /grow-v2 for rollback / A-B.
//
// Voice anchors:
//   - "Serious buyers only — don't waste my time"
//   - Right fit / Wrong fit visual filter
//   - "We'll know in 10 minutes"
//   - The algorithm is in everything we do
//
// Style: light theme, brand colors only (cyan + accent + lead).
// No rainbow gradients. Mobile-first.

import Link from "next/link";
import {
  ArrowRight, BadgeCheck, Check, ChevronRight, Clock, Crown, Facebook,
  Megaphone, MessageSquare, Music2, Quote, ShieldCheck, Star, TrendingUp,
  Trophy, Twitter, X as XIcon, Youtube,
} from "lucide-react";
import { TrackedLink } from "@/components/TrackedLink";
import { BandwidthMeter } from "@/components/BandwidthMeter";
import { LiveSignalAnalyzer, type SignalPlatform } from "@/components/site/LiveSignalAnalyzer";
import { LightHeader } from "@/components/site/LightHeader";
import { getYouTubeStatsCached, getXStatsCached, getFacebookStatsCached } from "@/lib/social-sync";
import { getCapacitySnapshot } from "@/lib/capacity";

// Re-validate the homepage every hour so live stats refresh.
export const revalidate = 3600;

// Static fallbacks if any platform's API key isn't set yet.
const STATIC_FALLBACK = {
  youtube: 12000,
  x: 43800,
  facebook: 18900,
  tiktok: 2400,
  instagram: 3200,
};

function fmt(n: number): string {
  if (n >= 1000) return (n / 1000).toFixed(n >= 10000 ? 0 : 1) + "K";
  return String(n);
}

export const metadata = {
  title: "The LeadFlow Pro — for serious buyers only",
  description:
    "Built by Ryan Nichols. 75K+ across 5 platforms. Founder of LeadFlow Pro, RepWatchr, Faretta.Legal, Faretta.AI, and Wholesale Universe. Done-for-you growth on TikTok, Facebook, X, YouTube, plus dedicated Facebook Ads management. Free 10-minute call — reserved for serious buyers ready to invest.",
};

/* ─── Data ────────────────────────────────────────────────────── */

const RIGHT_FIT = [
  "You have a real business, or you're building one with intent",
  "You want to build your social media following the right way",
  "You have a story to tell and want it heard",
  "You want a website, a funnel, or both — done right",
  "You want more leads, more often, from the right people",
  "You're a sales manager who wants a real process built for your team",
  "You want your tech stack dragged into the 21st century",
  "You want to go from no sales process to a full one — fast",
  "You're ready to invest in tools, services, or both",
];

const WRONG_FIT = [
  "You want everything for free",
  "You're \"just curious\" — no real plans",
  "You want a guaranteed outcome before you commit",
  "You're shopping consultants for the lowest price",
];

const STATS = [
  { label: "X / Twitter",     value: "43,800+" },
  { label: "Facebook",        value: "18,900+" },
  { label: "YouTube",         value: "12,000+" },
  { label: "Total reach",     value: "75K+" },
];

const PLATFORMS = [
  {
    handle: "tiktok",
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
    handle: "facebook",
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
    handle: "x",
    name: "X / Twitter Growth",
    icon: Twitter,
    price: "$497",
    cadence: "/mo per channel",
    line: "Daily posting + reply game. The platform I grew to 43,800+ on. Built for personal brands, founders, and operators.",
    bullets: [
      "Daily Mon–Fri posts in your voice",
      "Reply targeting that drives audience",
      "Weekly thread + monthly long-form",
    ],
  },
  {
    handle: "youtube",
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
  { name: "The LeadFlow Pro",   note: "Founder · this site" },
  { name: "RepWatchr.com",      note: "Founder" },
  { name: "Faretta.Legal",      note: "Founder" },
  { name: "Faretta.AI",         note: "Founder" },
  { name: "Wholesale Universe", note: "Founder" },
  { name: "Rescue The Universe", note: "Founder" },
];

const NAMED_CLIENTS = [
  {
    name: "Premier Dental Academy of Longview",
    note: "Built website + student/admin tools + ran their ads (active client).",
  },
];

/* ─── Page ────────────────────────────────────────────────────── */

export default async function GrowV2Page() {
  // Pull live stats server-side, hourly cache. Falls back to static numbers
  // when an API key isn't set or the API errors.
  const [yt, x, fb] = await Promise.all([
    getYouTubeStatsCached("@RealRyanNicholsSr").catch(() => null),
    getXStatsCached("RealRyanNichols").catch(() => null),
    getFacebookStatsCached("RealRyanNichols").catch(() => null),
  ]);
  const ytSubs = yt?.subscribers ?? STATIC_FALLBACK.youtube;
  const xFollowers = x?.followers ?? STATIC_FALLBACK.x;
  const fbFollowers = fb?.followerCount ?? STATIC_FALLBACK.facebook;
  const totalReach = ytSubs + xFollowers + fbFollowers + STATIC_FALLBACK.tiktok + STATIC_FALLBACK.instagram;
  const liveCount = (yt ? 1 : 0) + (x ? 1 : 0) + (fb ? 1 : 0);
  const capacitySnapshot = await getCapacitySnapshot().catch(() => null);
  const signalPlatforms: SignalPlatform[] = [
    {
      key: "x",
      label: "X / Twitter",
      value: xFollowers,
      source: x ? "live" : "baseline",
      detail: x ? `${x.posts.toLocaleString()} posts tracked from X API` : "Manual public baseline until X API token is connected",
      color: "#0a1d3f",
      posts: x?.posts,
    },
    {
      key: "facebook",
      label: "Facebook",
      value: fbFollowers,
      source: fb ? "live" : "baseline",
      detail: fb ? "Facebook Graph API pull" : "Manual public baseline until Page token is connected",
      color: "#1273e8",
    },
    {
      key: "youtube",
      label: "YouTube",
      value: ytSubs,
      source: yt ? "live" : "baseline",
      detail: yt ? `${yt.videos.toLocaleString()} videos and ${yt.views.toLocaleString()} views from YouTube API` : "Manual public baseline until YouTube API is connected",
      color: "#f07a10",
      posts: yt?.videos,
      views: yt?.views,
    },
    {
      key: "instagram",
      label: "Instagram",
      value: STATIC_FALLBACK.instagram,
      source: "baseline",
      detail: "Manual public baseline until Meta IG access is connected",
      color: "#ff9a1f",
    },
    {
      key: "tiktok",
      label: "TikTok",
      value: STATIC_FALLBACK.tiktok,
      source: "baseline",
      detail: "Manual public baseline until TikTok API approval is connected",
      color: "#5cd0ff",
    },
  ];

  return (
    <div className="min-h-screen bg-white text-slate-900">
      <LightHeader activePath="/" />

{/* HERO — warm-glass blend (cyan + accent + soft purple blooms over a warm base) */}
      <section className="relative overflow-hidden border-b border-slate-200">
        <div
          aria-hidden
          className="absolute inset-0"
          style={{
            background:
              "linear-gradient(135deg, #fff8f1 0%, #f6f9ff 38%, #eef9ff 70%, #f3eaff 100%)",
          }}
        />
        <div
          aria-hidden
          className="absolute -top-32 -right-24 h-[520px] w-[520px] rounded-full opacity-55 blur-3xl"
          style={{ background: "radial-gradient(circle, rgba(35,184,255,0.55) 0%, transparent 65%)" }}
        />
        <div
          aria-hidden
          className="absolute -bottom-40 -left-24 h-[560px] w-[560px] rounded-full opacity-55 blur-3xl"
          style={{ background: "radial-gradient(circle, rgba(255,154,31,0.45) 0%, transparent 65%)" }}
        />
        <div
          aria-hidden
          className="absolute top-1/2 right-1/3 h-[320px] w-[320px] rounded-full opacity-30 blur-3xl"
          style={{ background: "radial-gradient(circle, rgba(176,107,255,0.35) 0%, transparent 60%)" }}
        />
        <div className="relative mx-auto max-w-7xl px-4 py-6 sm:py-10">
          <div className="grid gap-8 lg:grid-cols-2 lg:items-center">
            <div>
              {/* Proof-forward eyebrow + live capacity pill */}
              <div className="flex flex-wrap items-center gap-2">
                <div className="inline-flex items-center gap-2 rounded-full border border-cyan-300 bg-white/70 backdrop-blur px-3 py-1 text-xs uppercase tracking-widest text-cyan-700 font-semibold shadow-sm">
                  <BadgeCheck className="h-3.5 w-3.5" /> 75K+ followers · 6 companies · 10+ years
                </div>
                <BandwidthMeter variant="compact" />
              </div>
              <h1 className="mt-5 text-4xl sm:text-5xl lg:text-6xl font-semibold tracking-tight text-slate-950 leading-tight">
                I've already built what you're trying to build.{" "}
                <span className="bg-gradient-to-r from-brand-700 via-cyan-500 to-accent-500 bg-clip-text text-transparent">
                  Now let's build yours.
                </span>
              </h1>
              <p className="mt-5 text-lg text-slate-700 leading-relaxed">
                Six companies founded. 75,000+ followers built from zero across X, Facebook, YouTube,
                Instagram, and TikTok. A decade running social, ads, sales, and lead gen through every
                algorithm shift the platforms threw at me — and a written record of how I did it.
              </p>
              <p className="mt-4 text-lg text-slate-700 leading-relaxed">
                Spending money on me <strong className="text-slate-950">is</strong> spending money on
                yourself. I take what you pay me and turn it into followers, leads, sales process, and
                systems your business runs on after I'm gone. That's the deal.
              </p>
              <div className="mt-8 flex flex-col sm:flex-row gap-3">
                <TrackedLink
                  href="/start"
                  event="cta_start_router"
                  location="homepage_hero"
                  className="inline-flex items-center justify-center gap-2 rounded-xl bg-slate-900 px-6 py-3 font-semibold text-white shadow-lg shadow-slate-900/20 hover:bg-slate-800"
                >
                  Find my next move <ArrowRight className="h-4 w-4" />
                </TrackedLink>
                <TrackedLink
                  href="/tiers"
                  event="cta_see_tiers"
                  location="homepage_hero"
                  className="inline-flex items-center justify-center gap-2 rounded-xl bg-accent-500 px-6 py-3 font-semibold text-white shadow-lg shadow-accent-500/20 hover:bg-accent-600"
                >
                  See all packages
                </TrackedLink>
                <TrackedLink
                  href="/book"
                  event="cta_book_call"
                  location="homepage_hero"
                  className="inline-flex items-center justify-center gap-2 rounded-xl border border-slate-300 bg-white/80 backdrop-blur px-6 py-3 font-semibold text-slate-800 hover:border-brand-500 hover:text-brand-700"
                >
                  Free 10-min call
                </TrackedLink>
              </div>
              <p className="mt-3 text-xs text-slate-500">
                Not sure where to start? The router asks the practical questions, saves Ryan the
                context, and sends you to the cleanest offer page.
              </p>
            </div>

            {/* Live signal analyzer */}
            <div>
              <LiveSignalAnalyzer
                platforms={signalPlatforms}
                capacity={capacitySnapshot}
                lastChecked={new Date().toISOString()}
                liveSourceCount={liveCount}
              />
              <p className="mt-3 text-xs text-slate-500 text-center">
                Live API data where connected. Manual baselines are labeled until each source is wired.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* WHY BELIEVE ME — warm-glass extension of the hero base */}
      <section className="relative overflow-hidden border-b border-slate-200">
        <div
          aria-hidden
          className="absolute inset-0"
          style={{
            background:
              "linear-gradient(180deg, #f6f9ff 0%, #fff8f1 50%, #f3eaff 100%)",
          }}
        />
        <div
          aria-hidden
          className="absolute top-1/3 -right-32 h-[420px] w-[420px] rounded-full opacity-30 blur-3xl"
          style={{ background: "radial-gradient(circle, rgba(35,184,255,0.4) 0%, transparent 60%)" }}
        />
        <div className="relative mx-auto max-w-7xl px-4 py-14 sm:py-16">
          <div className="text-xs uppercase tracking-widest text-cyan-700 mb-2">Why believe me</div>
          <h2 className="text-3xl sm:text-4xl font-semibold tracking-tight text-slate-950 max-w-3xl">
            I take businesses from <em>not being seen</em> to <em>being seen</em> — and I have the receipts.
          </h2>
          <p className="mt-4 text-slate-700 max-w-3xl">
            Multi-million-dollar companies don't hire based on promises. They hire based on track
            record. Here's what I've actually built — for myself, for clients, and for the five
            companies I've founded or co-founded.
          </p>

          <div className="mt-8 grid gap-4 md:grid-cols-2 lg:grid-cols-4">
            <ProofTile
              big={fmt(totalReach)}
              label={`Followers across X, Facebook, YouTube, Instagram, TikTok${liveCount > 0 ? ` · ${liveCount} live API` + (liveCount > 1 ? "s" : "") : ""}`}
            />
            <ProofTile big="6" label="Companies founded — LeadFlow Pro, RepWatchr, Faretta.Legal, Faretta.AI, Wholesale Universe, Rescue The Universe" />
            <ProofTile big="10+ yr" label="Operating in social, ads, sales, and lead generation through every algorithm shift" />
            <ProofTile big="0 → ∞" label="The transformation we deliver: from invisible to in-front-of-the-right-buyers" />
          </div>
          {liveCount > 0 && (
            <p className="mt-4 text-xs text-slate-500 flex items-center gap-2">
              <span className="inline-flex h-1.5 w-1.5 rounded-full bg-cyan-500 animate-pulse" />
              Live: {yt ? `YouTube ${ytSubs.toLocaleString()}` : null}
              {yt && x ? " · " : null}
              {x ? `X ${xFollowers.toLocaleString()}` : null}
              {(yt || x) && fb ? " · " : null}
              {fb ? `Facebook ${fbFollowers.toLocaleString()}` : null}
              {" · refreshes hourly"}
            </p>
          )}

          <div className="mt-10 grid gap-5 md:grid-cols-3">
            <BeliefBlock
              n="1"
              title="I've actually done it."
              body="Every method I'll teach you, I've used to grow my own audience and my clients'. No theory. No frameworks I haven't tested with real money."
            />
            <BeliefBlock
              n="2"
              title="I run the platform you're hiring."
              body="The LeadFlow Pro is my own product — same dashboard, same automations, same chatbot, same FlowCard. If it doesn't work, I'm the first person it doesn't work for."
            />
            <BeliefBlock
              n="3"
              title="I won't take you on if it won't work."
              body="The 10-min call exists so I can tell you 'no' fast if we're not a fit. I'd rather lose the deal than burn the relationship."
            />
          </div>
        </div>
      </section>

      {/* THE JOURNEY — dark contrast section, 0 → 75K visual story */}
      <section className="border-b border-slate-800 bg-gradient-to-br from-slate-950 via-slate-900 to-brand-950 text-white relative overflow-hidden">
        {/* Soft grid backdrop */}
        <div
          aria-hidden
          className="absolute inset-0 opacity-[0.07]"
          style={{
            backgroundImage:
              "linear-gradient(to right, white 1px, transparent 1px), linear-gradient(to bottom, white 1px, transparent 1px)",
            backgroundSize: "48px 48px",
          }}
        />
        <div className="relative mx-auto max-w-7xl px-4 py-16 sm:py-20">
          <div className="grid gap-10 lg:grid-cols-5 lg:items-center">
            <div className="lg:col-span-2">
              <div className="inline-flex items-center gap-2 rounded-full border border-cyan-400/30 bg-cyan-400/10 px-3 py-1 text-xs uppercase tracking-widest text-cyan-300 font-semibold">
                <TrendingUp className="h-3.5 w-3.5" /> The Journey · Past the Reef
              </div>
              <h2 className="mt-5 text-3xl sm:text-4xl lg:text-5xl font-semibold tracking-tight leading-tight">
                A phone in a third-story apartment.{" "}
                <span className="bg-gradient-to-r from-cyan-300 to-accent-400 bg-clip-text text-transparent">
                  Then a multi-million-dollar business. Then prison. Then this.
                </span>
              </h2>
              <p className="mt-5 text-slate-300 leading-relaxed">
                I started with <strong className="text-white">zero followers and a phone</strong>, posting from
                a third-story two-bedroom apartment. I built it into a multi-million-dollar business.
              </p>
              <p className="mt-3 text-slate-300 leading-relaxed">
                Then I lost it. <strong className="text-white">4 years in federal prison for January 6.
                Pardoned.</strong> I came home with my phone and the followers I had left.
              </p>
              <p className="mt-3 text-slate-300 leading-relaxed">
                I picked up the same playbook I used the first time. I'm rebuilding right now —{" "}
                <strong className="text-white">75,000+ followers</strong>, six companies founded, one client
                I'm publicly proud of, and counting.
              </p>
              <div className="mt-5 rounded-2xl border border-accent-400/40 bg-gradient-to-br from-accent-400/10 to-cyan-400/10 backdrop-blur p-4">
                <div className="text-[10px] uppercase tracking-widest text-accent-300 font-bold">
                  My operating belief
                </div>
                <p className="mt-1 text-base text-white leading-relaxed">
                  Any product, backed with consistency and a website that takes payments,{" "}
                  <strong>will</strong> take off — if you don't quit before you get past{" "}
                  <span className="bg-gradient-to-r from-accent-300 to-cyan-300 bg-clip-text text-transparent font-bold">
                    the reef barrier.
                  </span>
                </p>
              </div>
              <div className="mt-7 flex flex-col sm:flex-row flex-wrap gap-3">
                <TrackedLink
                  href="/tiers"
                  event="cta_journey_tiers"
                  location="homepage_journey"
                  className="inline-flex items-center justify-center gap-2 rounded-xl bg-accent-500 px-5 py-3 font-semibold text-white shadow-lg shadow-accent-500/30 hover:bg-accent-600"
                >
                  I have to work with you. Show me how. <ArrowRight className="h-4 w-4" />
                </TrackedLink>
                <TrackedLink
                  href="/book"
                  event="cta_journey_reef"
                  location="homepage_journey"
                  className="inline-flex items-center justify-center gap-2 rounded-xl bg-cyan-500 px-5 py-3 font-semibold text-white shadow-lg shadow-cyan-500/30 hover:bg-cyan-600"
                >
                  Get me past my reef
                </TrackedLink>
                <TrackedLink
                  href="/offers/decision-sprint"
                  event="cta_journey_sprint"
                  location="homepage_journey"
                  className="inline-flex items-center justify-center gap-2 rounded-xl border border-white/20 bg-white/5 backdrop-blur px-5 py-3 font-semibold text-white hover:bg-white/10"
                >
                  $90 for 90 minutes
                </TrackedLink>
              </div>
            </div>

            {/* Animated growth curve */}
            <div className="lg:col-span-3">
              <FollowerJourneyChart total={totalReach} />
            </div>
          </div>

          {/* Milestone strip */}
          <div className="mt-12 grid grid-cols-2 sm:grid-cols-4 gap-3">
            {[
              { stage: "Start", count: "300", note: "Friends + family" },
              { stage: "Climb", count: "1.5K", note: "First true followers" },
              { stage: "Break", count: "10K", note: "Algorithm starts working FOR you" },
              { stage: "Compound", count: "75K+", note: "Where I'm at — and where you're going" },
            ].map((m, i) => (
              <div
                key={m.stage}
                className="rounded-2xl border border-white/10 bg-white/[0.03] backdrop-blur p-4"
              >
                <div className="text-[10px] uppercase tracking-widest text-cyan-300">
                  Stage {i + 1} · {m.stage}
                </div>
                <div className="mt-1 text-3xl font-bold tabular-nums">{m.count}</div>
                <div className="mt-1 text-xs text-slate-400">{m.note}</div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* RIGHT FIT / WRONG FIT */}
      <section className="relative overflow-hidden border-b border-slate-200">
        <div
          aria-hidden
          className="absolute inset-0"
          style={{
            background:
              "linear-gradient(180deg, #fff8f1 0%, #f6f9ff 100%)",
          }}
        />
        <div className="relative mx-auto max-w-7xl px-4 py-12 sm:py-16">
          <div className="text-xs uppercase tracking-widest text-slate-500 mb-2">Save us both time</div>
          <h2 className="text-3xl sm:text-4xl font-semibold tracking-tight text-slate-950 mb-8">
            Are you a fit?
          </h2>
          <div className="grid gap-5 md:grid-cols-2">
            <div className="rounded-2xl border border-cyan-200 bg-cyan-50 p-6">
              <div className="inline-flex items-center gap-2 rounded-full bg-cyan-100 px-3 py-1 text-xs uppercase tracking-widest text-cyan-800 font-semibold">
                <Check className="h-3.5 w-3.5" /> Right fit
              </div>
              <h3 className="mt-3 text-xl font-semibold text-slate-950">Book the call</h3>
              <ul className="mt-4 space-y-3">
                {RIGHT_FIT.map((line) => (
                  <li key={line} className="flex items-start gap-2 text-slate-700">
                    <Check className="mt-0.5 h-5 w-5 shrink-0 text-cyan-600" />
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
                        <Check className="mt-0.5 h-4 w-4 shrink-0 text-cyan-600" />
                        <span>{b}</span>
                      </li>
                    ))}
                  </ul>
                  <Link
                    href={`/platforms/${p.handle}`}
                    className="mt-auto pt-6 inline-flex items-center gap-1 text-sm font-semibold text-brand-700 hover:text-brand-800"
                  >
                    See the {p.name.replace(" Growth", "")} comparison <ArrowRight className="h-3.5 w-3.5" />
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
                    <Check className="mt-0.5 h-4 w-4 shrink-0 text-cyan-600" />
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

      {/* WHAT YOU ACTUALLY GET — teach blocks for the dashboard tools */}
      <section className="border-b border-slate-200 bg-white">
        <div className="mx-auto max-w-7xl px-4 py-14 sm:py-20">
          <div className="text-xs uppercase tracking-widest text-cyan-700 mb-2">What you actually get</div>
          <h2 className="text-3xl sm:text-4xl font-semibold tracking-tight text-slate-950">
            Inside The LeadFlow Pro dashboard.
          </h2>
          <p className="mt-3 text-slate-600 max-w-3xl">
            Six tools that work together to turn attention into leads, leads into conversations,
            and conversations into closed business. No fluff — here's what each one does and why it
            matters.
          </p>

          <div className="mt-10 grid gap-5 md:grid-cols-2 lg:grid-cols-3">
            <TeachBlock
              icon={Megaphone}
              title="What's a Lead?"
              body="A lead is someone who showed interest in your business — a DM, a comment, a form fill, a missed call. Most paid leads cost \$50–\$200. We capture them from your social, your phone, your website — score them A/B/C/D — and never let one slip."
            />
            <TeachBlock
              icon={MessageSquare}
              title="What's an Automation?"
              body="A trigger plus an action. 'DM hits Instagram → auto-reply in 30 seconds → tagged → moved to inbox → you call when ready.' One automation per channel keeps you from ever losing a lead after-hours."
            />
            <TeachBlock
              icon={Trophy}
              title="What's a FlowCard?"
              body="One link with all your contact methods, offers, and socials. Replaces business cards. Add a QR code to your truck, your invoice, your bio — they scan, they land, they reach you."
            />
            <TeachBlock
              icon={Star}
              title="What's a Chatbot?"
              body="An AI that answers your customers' questions 24/7 — in your voice. Qualifies them, books their call, or routes them to you only when they're ready to buy. Recovers the leads you'd lose after-hours."
            />
            <TeachBlock
              icon={TrendingUp}
              title="What's an Insight?"
              body="AI looks at your numbers and tells you the ONE next move that will move the needle this week. Not a 30-page report — one move. Do it. Repeat next week."
            />
            <TeachBlock
              icon={Crown}
              title="What's a Playbook?"
              body="A step-by-step proven sequence. 'Hire your first VA,' 'Run your first Facebook ad,' 'Build a lead magnet in 2 days.' You follow it, you ship the thing. No guessing."
            />
          </div>
        </div>
      </section>

      {/* THE 10-MINUTE CALL */}
      <section className="border-b border-slate-200 bg-white">
        <div className="mx-auto max-w-5xl px-4 py-14 sm:py-20 text-center">
          <div className="inline-flex items-center gap-2 rounded-full bg-cyan-100 px-3 py-1 text-xs uppercase tracking-widest text-cyan-800 font-semibold">
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
          <div className="mt-8 grid gap-4 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-6 text-center">
            {FOUNDER_BRANDS.map((b) => (
              <div key={b.name} className="rounded-xl border border-slate-200 bg-white p-3 shadow-sm">
                <div className="text-sm font-semibold text-slate-900">{b.name}</div>
                <div className="mt-0.5 text-xs text-slate-500">{b.note}</div>
              </div>
            ))}
          </div>

          {/* Named clients (separate row so we don't conflate them with Ryan's own brands) */}
          {NAMED_CLIENTS.length > 0 && (
            <div className="mt-10">
              <div className="text-center">
                <div className="text-xs uppercase tracking-widest text-slate-500">Named clients</div>
                <p className="mt-1 text-sm text-slate-700">
                  Public client work. Same operator, same playbook, different last name.
                </p>
              </div>
              <div className="mt-5 grid gap-4 md:grid-cols-2 max-w-3xl mx-auto">
                {NAMED_CLIENTS.map((c) => (
                  <div key={c.name} className="rounded-2xl border border-cyan-200 bg-cyan-50/60 backdrop-blur p-5">
                    <div className="text-sm font-bold text-slate-950">{c.name}</div>
                    <div className="mt-1 text-xs text-slate-700">{c.note}</div>
                  </div>
                ))}
              </div>
            </div>
          )}
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

function TeachBlock({
  icon: Icon, title, body,
}: { icon: any; title: string; body: string }) {
  return (
    <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm hover:shadow-md transition-shadow">
      <div className="inline-flex h-11 w-11 items-center justify-center rounded-xl bg-gradient-to-br from-cyan-500 to-brand-600 text-white shadow-sm">
        <Icon className="h-5 w-5" />
      </div>
      <h3 className="mt-4 text-xl font-semibold text-slate-950">{title}</h3>
      <p className="mt-2 text-sm text-slate-700 leading-relaxed">{body}</p>
    </div>
  );
}

function ProofTile({ big, label }: { big: string; label: string }) {
  return (
    <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
      <div className="text-3xl sm:text-4xl font-bold text-slate-950 tabular-nums">{big}</div>
      <div className="mt-2 text-sm text-slate-600 leading-snug">{label}</div>
    </div>
  );
}

function BeliefBlock({
  n, title, body,
}: { n: string; title: string; body: string }) {
  return (
    <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
      <div className="inline-flex h-8 w-8 items-center justify-center rounded-full bg-gradient-to-br from-cyan-500 to-brand-600 text-white text-sm font-bold">
        {n}
      </div>
      <h3 className="mt-3 font-semibold text-slate-950 text-lg">{title}</h3>
      <p className="mt-2 text-sm text-slate-700 leading-relaxed">{body}</p>
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

function FollowerJourneyChart({ total }: { total: number }) {
  // Animated 0 → 75K growth curve. Pure SVG with <animate> — no JS deps.
  // The line draws itself in over 2.4s, milestone points pulse, and a
  // ghost area beneath the curve fades up. Designed for the dark hero
  // section so it pops against the navy background.
  //
  // X axis is "time" (years 1 → 5+ in conceptual terms, not literal).
  // Y axis is followers, log-ish so the early-stage detail is visible.
  const W = 640;
  const H = 320;
  const points = [
    { x: 40,  y: 280, label: "300",   sub: "Start" },
    { x: 160, y: 250, label: "1.5K",  sub: "Year 1" },
    { x: 270, y: 200, label: "10K",   sub: "Year 2" },
    { x: 380, y: 130, label: "25K",   sub: "Year 3" },
    { x: 490, y: 80,  label: "50K",   sub: "Year 4" },
    { x: 600, y: 40,  label: "75K+",  sub: "Now" },
  ];
  const path = `M ${points[0].x} ${points[0].y} ` +
    points.slice(1).map((p, i) => {
      const prev = points[i];
      const cx1 = prev.x + (p.x - prev.x) / 2;
      const cy1 = prev.y;
      const cx2 = prev.x + (p.x - prev.x) / 2;
      const cy2 = p.y;
      return `C ${cx1} ${cy1}, ${cx2} ${cy2}, ${p.x} ${p.y}`;
    }).join(" ");
  const areaPath = path + ` L ${points[points.length - 1].x} ${H - 10} L ${points[0].x} ${H - 10} Z`;

  return (
    <div className="rounded-3xl border border-white/10 bg-white/[0.04] backdrop-blur p-5 sm:p-6 shadow-2xl shadow-black/40">
      <div className="flex items-center justify-between mb-4">
        <div className="text-[11px] uppercase tracking-widest text-cyan-300 font-semibold">
          The growth pattern
        </div>
        <div className="inline-flex items-center gap-1.5 text-[11px] text-slate-300">
          <span className="h-1.5 w-1.5 rounded-full bg-cyan-400 animate-pulse" />
          Live · {total.toLocaleString()} total
        </div>
      </div>
      <svg viewBox={`0 0 ${W} ${H}`} className="block w-full">
        <defs>
          <linearGradient id="journey-line" x1="0" y1="0" x2="1" y2="0">
            <stop offset="0%"   stopColor="#22b8ff" />
            <stop offset="100%" stopColor="#fb923c" />
          </linearGradient>
          <linearGradient id="journey-area" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%"   stopColor="#22b8ff" stopOpacity="0.35" />
            <stop offset="100%" stopColor="#22b8ff" stopOpacity="0" />
          </linearGradient>
        </defs>

        {/* Y grid lines */}
        {[60, 120, 180, 240, 300].map((y) => (
          <line key={y} x1="20" y1={y} x2={W - 10} y2={y} stroke="#ffffff14" strokeDasharray="2 4" />
        ))}

        {/* Filled area beneath the curve */}
        <path d={areaPath} fill="url(#journey-area)">
          <animate attributeName="opacity" from="0" to="1" dur="2.6s" fill="freeze" />
        </path>

        {/* The growth curve itself — draws in over 2.4s */}
        <path
          d={path}
          fill="none"
          stroke="url(#journey-line)"
          strokeWidth="3.5"
          strokeLinecap="round"
          strokeLinejoin="round"
          pathLength="1"
          strokeDasharray="1"
          strokeDashoffset="1"
        >
          <animate attributeName="stroke-dashoffset" from="1" to="0" dur="2.4s" fill="freeze" />
        </path>

        {/* Milestone points */}
        {points.map((p, i) => (
          <g key={p.label}>
            <circle cx={p.x} cy={p.y} r="14" fill="#22b8ff" opacity="0.18">
              <animate attributeName="r" values="10;18;10" dur="2.4s" repeatCount="indefinite" begin={`${i * 0.4}s`} />
              <animate attributeName="opacity" values="0.25;0.08;0.25" dur="2.4s" repeatCount="indefinite" begin={`${i * 0.4}s`} />
            </circle>
            <circle cx={p.x} cy={p.y} r="5" fill="#ffffff" stroke="#22b8ff" strokeWidth="2.5" />
            <text x={p.x} y={p.y - 22} fontSize="13" fontWeight="700" fill="#ffffff" textAnchor="middle">
              {p.label}
            </text>
            <text x={p.x} y={H - 16} fontSize="10" fontWeight="600" fill="#94a3b8" textAnchor="middle" letterSpacing="1">
              {p.sub.toUpperCase()}
            </text>
          </g>
        ))}
      </svg>
      <div className="mt-3 text-[11px] text-slate-400 leading-relaxed">
        The shape of the curve never changes. Every operator I've helped follows the same arc — slow
        early, sharp at the bend, compounding once the algorithm starts trusting you. Where are you on it?
      </div>
    </div>
  );
}
