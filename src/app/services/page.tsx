// src/app/services/page.tsx — Social Media services hub.
//
// Full rewrite. Warm-glass hero + dark navy accent sections matching the
// homepage Journey aesthetic. NO emerald/green palette anywhere. Platform
// cards route to dedicated /platforms/[handle] pages. Stripe links wire in
// automatically via offers.ts buyHref().

import Link from "next/link";
import {
  ArrowRight, BadgeCheck, Calendar, Check, Facebook, Layers, LineChart,
  Megaphone, Music2, ShieldCheck, Sparkles, Star, TrendingUp, Trophy,
  Twitter, Users, X as XIcon, Youtube, Zap,
} from "lucide-react";
import { LightHeader, LightFooter } from "@/components/site/LightHeader";

export const metadata = {
  title: "Social Media Services — Done For You · The LeadFlow Pro",
  description:
    "TikTok, Facebook, X, and YouTube — managed end-to-end by Ryan Nichols. 75K+ followers built across 5 platforms. Same playbook, your voice. Plus dedicated Facebook Ads management for owners ready to scale lead volume.",
};

const PLATFORMS = [
  {
    handle: "tiktok",
    name: "TikTok",
    Icon: Music2,
    blurb: "Daily short-form built around the hook patterns the algorithm is rewarding this week. Repurposed across IG Reels and YT Shorts.",
    bullets: [
      "20 short-form posts / month",
      "Hook + caption iteration weekly",
      "Cross-post to Reels & Shorts (free)",
    ],
    metric: "FYP-first",
  },
  {
    handle: "facebook",
    name: "Facebook",
    Icon: Facebook,
    blurb: "Page + groups strategy for businesses where buyers actually live (local services, mortgage, real estate, B2B).",
    bullets: [
      "12 long-form + 8 short videos / mo",
      "Group seeding + engagement",
      "Messenger funnel + auto-reply",
    ],
    metric: "18,900+",
  },
  {
    handle: "x",
    name: "X / Twitter",
    Icon: Twitter,
    blurb: "Daily posting + reply game. The platform I grew to 43,800+ on. Built for personal brands, founders, and operators.",
    bullets: [
      "Daily Mon–Fri posts in your voice",
      "Reply targeting that drives audience",
      "Weekly thread + monthly long-form",
    ],
    metric: "43,800+",
  },
  {
    handle: "youtube",
    name: "YouTube",
    Icon: Youtube,
    blurb: "Long-form content engine. Title + thumbnail + retention loops engineered for the home feed and search.",
    bullets: [
      "1 long-form video / week",
      "Title + thumbnail iteration",
      "Retention + CTR analysis monthly",
    ],
    metric: "12,000+",
  },
];

const TIERS = [
  {
    label: "$47",
    sub: "Quick-Look Video",
    line: "I look at your socials, record a 5-min video, write your next post.",
    href: "/offers/quick-look",
    style: "border-cyan-300 bg-white",
  },
  {
    label: "$497/mo",
    sub: "Single platform",
    line: "TikTok, FB, X, or YouTube — managed end-to-end on one channel.",
    href: "/services#single-platforms",
    style: "border-brand-300 bg-white",
  },
  {
    label: "$1,497/mo",
    sub: "Power Bundle",
    line: "All 4 platforms managed. Saves $491/mo vs. single-channel pricing.",
    href: "/offers/power-bundle",
    style: "border-accent-300 bg-white",
    highlight: true,
  },
  {
    label: "$1,497/mo + 10%",
    sub: "Facebook Ads",
    line: "Done-for-you Meta ad management. You pay Meta directly. $2K min.",
    href: "/offers/fb-ads",
    style: "border-cyan-300 bg-white",
  },
];

export default function ServicesPage() {
  return (
    <div className="min-h-screen bg-white text-slate-900">
      <LightHeader activePath="/services" />

      {/* HERO — warm-glass blend */}
      <section className="relative overflow-hidden">
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
          className="absolute -top-32 -right-32 h-[520px] w-[520px] rounded-full opacity-50 blur-3xl"
          style={{ background: "radial-gradient(circle, rgba(35,184,255,0.55) 0%, transparent 65%)" }}
        />
        <div
          aria-hidden
          className="absolute -bottom-40 -left-32 h-[560px] w-[560px] rounded-full opacity-50 blur-3xl"
          style={{ background: "radial-gradient(circle, rgba(255,154,31,0.45) 0%, transparent 65%)" }}
        />
        <div
          aria-hidden
          className="absolute top-1/2 right-1/3 h-[320px] w-[320px] rounded-full opacity-30 blur-3xl"
          style={{ background: "radial-gradient(circle, rgba(176,107,255,0.35) 0%, transparent 60%)" }}
        />

        <div className="relative mx-auto max-w-7xl px-4 py-16 sm:py-20">
          <div className="grid gap-10 lg:grid-cols-5 lg:items-center">
            <div className="lg:col-span-3">
              <div className="inline-flex items-center gap-2 rounded-full border border-cyan-300 bg-white/70 backdrop-blur px-3 py-1 text-xs uppercase tracking-widest text-cyan-700 font-semibold shadow-sm">
                <BadgeCheck className="h-3.5 w-3.5" /> 75K+ followers across 5 platforms · I run them all
              </div>
              <h1 className="mt-5 text-4xl sm:text-5xl lg:text-6xl font-semibold tracking-tight leading-tight text-slate-950">
                Social media,{" "}
                <span className="bg-gradient-to-r from-brand-700 via-cyan-500 to-accent-500 bg-clip-text text-transparent">
                  run by the operator who already crossed the reef.
                </span>
              </h1>
              <p className="mt-5 text-lg text-slate-700 leading-relaxed">
                Pick a platform. Pick the bundle. Or hand me all four. I write the hooks, edit the
                cuts, schedule the posts, and run the reply game in your voice — while you keep
                doing the work that actually brought you here.
              </p>
              <p className="mt-3 text-base text-slate-700 leading-relaxed">
                Spending money on me <strong>is</strong> spending money on you. I take what you pay
                me and turn it into followers, leads, and a system your business runs on.
              </p>
              <div className="mt-7 flex flex-col sm:flex-row gap-3 flex-wrap">
                <Link
                  href="/offers/power-bundle"
                  className="inline-flex items-center justify-center gap-2 rounded-xl bg-slate-900 px-6 py-3 font-semibold text-white shadow-lg shadow-slate-900/30 hover:bg-slate-800"
                >
                  Get the Power Bundle — $1,497/mo <ArrowRight className="h-4 w-4" />
                </Link>
                <Link
                  href="/offers/quick-look"
                  className="inline-flex items-center justify-center gap-2 rounded-xl bg-accent-500 px-6 py-3 font-semibold text-white shadow-lg shadow-accent-500/30 hover:bg-accent-600"
                >
                  Try the $47 Quick-Look first
                </Link>
                <Link
                  href="/book"
                  className="inline-flex items-center justify-center gap-2 rounded-xl border border-slate-300 bg-white/80 backdrop-blur px-6 py-3 font-semibold text-slate-800 hover:border-brand-500 hover:text-brand-700"
                >
                  Free 10-min call
                </Link>
              </div>
            </div>

            {/* Glass stats card */}
            <div className="lg:col-span-2">
              <div className="relative rounded-3xl border border-white/60 bg-white/70 backdrop-blur-xl p-6 shadow-[0_30px_70px_-20px_rgba(15,23,42,0.20)] ring-1 ring-slate-900/5">
                <div className="flex items-center justify-between">
                  <div className="text-[10px] uppercase tracking-widest text-slate-500 font-semibold">My socials</div>
                  <span className="inline-flex items-center gap-1.5 rounded-full bg-cyan-100 border border-cyan-300 px-2.5 py-0.5 text-xs font-semibold text-cyan-800">
                    <span className="h-1.5 w-1.5 rounded-full bg-cyan-500 animate-pulse" />
                    Live
                  </span>
                </div>
                <div className="mt-2 flex items-baseline gap-2">
                  <span className="text-5xl font-bold text-slate-950 tabular-nums">75K+</span>
                  <span className="text-sm text-slate-500">total reach</span>
                </div>
                <div className="mt-5 grid grid-cols-2 gap-3">
                  <Stat label="X / Twitter" value="43.8K" />
                  <Stat label="Facebook"    value="18K+" />
                  <Stat label="YouTube"     value="12K" />
                  <Stat label="Instagram"   value="4.8K" />
                </div>
                <div className="mt-3 rounded-xl border border-slate-200 bg-white/80 p-3 text-xs text-slate-700">
                  TikTok: <strong className="text-slate-950">3,178 followers</strong> and{" "}
                  <strong className="text-slate-950">24.5K likes</strong> on the current account.
                </div>
                <div className="mt-4 rounded-xl bg-cyan-50/70 border border-cyan-200 p-3 text-xs text-cyan-900 leading-relaxed">
                  <strong>Real numbers.</strong> Not "100K students" or "millions reached." The
                  followers I built on my own accounts, with the playbook I'll run for you.
                </div>
                <div className="mt-4 rounded-2xl border border-slate-200 bg-slate-950 p-4 text-white">
                  <div className="text-[10px] font-semibold uppercase tracking-widest text-cyan-300">
                    Meta comeback receipt
                  </div>
                  <div className="mt-2 grid grid-cols-2 gap-3">
                    <div>
                      <div className="text-2xl font-bold tabular-nums">24M+</div>
                      <div className="text-xs text-slate-300">views since Jan 21, 2025</div>
                    </div>
                    <div>
                      <div className="text-2xl font-bold tabular-nums">401K</div>
                      <div className="text-xs text-slate-300">interactions in Meta Insights</div>
                    </div>
                  </div>
                  <Link
                    href="/start"
                    className="mt-4 inline-flex items-center gap-2 text-sm font-semibold text-accent-300 hover:text-accent-200"
                  >
                    Start with the offer router <ArrowRight className="h-3.5 w-3.5" />
                  </Link>
                </div>
              </div>
            </div>
          </div>

          <div className="mt-10 overflow-hidden rounded-3xl border border-white/70 bg-white/85 shadow-[0_30px_70px_-28px_rgba(15,23,42,0.28)] ring-1 ring-slate-900/5">
            <div className="grid gap-0 lg:grid-cols-[0.85fr_1.15fr]">
              <div className="relative min-h-[320px] bg-slate-100">
                <img
                  src="/images/ryan-meta-raybans-toolkit.jpg"
                  alt="Ryan Nichols wearing Meta Ray-Ban glasses used for POV content capture"
                  className="h-full w-full object-cover"
                />
              </div>
              <div className="p-6 sm:p-8">
                <div className="text-xs font-semibold uppercase tracking-widest text-accent-700">
                  Field production kit
                </div>
                <h3 className="mt-2 text-2xl font-semibold tracking-tight text-slate-950 sm:text-3xl">
                  If you need someone following the work and catching the angles, that is a real
                  service.
                </h3>
                <p className="mt-4 leading-relaxed text-slate-700">
                  Meta Ray-Bans for POV clips and photos, two GoPros, Rode mics, a strong iPhone,
                  stands, live-direction, shot lists, hooks, captions, and the ability to turn one
                  field day into short after short after short.
                </p>
                <div className="mt-5 grid gap-3 sm:grid-cols-2">
                  {[
                    "POV shots with Meta Ray-Bans",
                    "GoPro angles and movement shots",
                    "Clean audio with Rode mics",
                    "Travel production days, lodging billed separately",
                  ].map((item) => (
                    <div key={item} className="rounded-2xl border border-slate-200 bg-slate-50 p-3 text-sm font-semibold text-slate-800">
                      <Check className="mr-2 inline h-4 w-4 text-cyan-600" />
                      {item}
                    </div>
                  ))}
                </div>
                <div className="mt-5 grid gap-4 sm:grid-cols-[0.85fr_1.15fr] sm:items-center">
                  <div className="overflow-hidden rounded-2xl border border-slate-200 bg-slate-100">
                    <img
                      src="/images/ryan-jefferson-city-council-meta-raybans.jpg"
                      alt="Ryan Nichols addressing Jefferson City Council using Meta Ray-Bans POV footage"
                      className="h-full w-full object-cover"
                    />
                  </div>
                  <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4 text-sm leading-relaxed text-slate-700">
                    Example: public-meeting footage captured in the room, edited into a clear short,
                    and published as evidence-first transparency content. Clients can use the same
                    pattern for jobs, inspections, field work, leadership, training, and public
                    accountability.
                  </div>
                </div>
                <div className="mt-5 grid gap-4 sm:grid-cols-2">
                  <div className="overflow-hidden rounded-2xl border border-slate-200 bg-slate-100">
                    <img
                      src="/images/dent-bully-field-content-1.jpg"
                      alt="Missouri Dent Bully short-form field content frame"
                      className="h-full w-full object-cover"
                    />
                  </div>
                  <div className="overflow-hidden rounded-2xl border border-slate-200 bg-slate-100">
                    <img
                      src="/images/dent-bully-field-content-2.jpg"
                      alt="Missouri Dent Bully promotional video frame with contact number"
                      className="h-full w-full object-cover"
                    />
                  </div>
                  <div className="rounded-2xl border border-slate-200 bg-white p-4 text-sm leading-relaxed text-slate-700 sm:col-span-2">
                    Field example: on-site promotional shorts for Missouri Dent Bully /
                    DentBullyUSA.com. Same pattern: get the angle, show the work, put the phone
                    number or next step on screen, then keep cutting until the owner has usable clips.
                  </div>
                </div>
                <div className="mt-5 rounded-2xl border border-cyan-200 bg-cyan-50/80 p-4 text-sm leading-relaxed text-cyan-950">
                  Honest claim: I am not promising a hidden Meta algorithm cheat code. The advantage
                  is native-feeling footage, speed, first-person angles, and direct Instagram/Facebook
                  capture workflows.
                </div>
                <div className="mt-6 flex flex-col gap-3 sm:flex-row">
                  <Link
                    href="/book"
                    className="inline-flex items-center justify-center gap-2 rounded-xl bg-slate-950 px-5 py-3 font-semibold text-white hover:bg-slate-800"
                  >
                    Scope a content day <ArrowRight className="h-4 w-4" />
                  </Link>
                  <Link
                    href="/start"
                    className="inline-flex items-center justify-center gap-2 rounded-xl border border-slate-300 bg-white px-5 py-3 font-semibold text-slate-800 hover:border-cyan-400"
                  >
                    Route the project
                  </Link>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      <section className="relative overflow-hidden border-y border-slate-200">
        <div
          aria-hidden
          className="absolute inset-0"
          style={{ background: "linear-gradient(180deg, #fff8f1 0%, #eef9ff 100%)" }}
        />
        <div className="relative mx-auto max-w-7xl px-4 py-12 sm:py-16">
          <div className="grid gap-8 lg:grid-cols-5 lg:items-center">
            <div className="lg:col-span-2">
              <div className="text-xs font-semibold uppercase tracking-widest text-cyan-700">
                Creative direction
              </div>
              <h2 className="mt-2 text-3xl font-semibold tracking-tight text-slate-950 sm:text-4xl">
                I help you make the thing people will actually stop and watch.
              </h2>
              <p className="mt-4 leading-relaxed text-slate-700">
                Photos, AI images, organic video, live selling, hooks, scripts, what to say, what to
                cut, what to post, and how the lead turns into a sales conversation. This is done
                for you as much as possible without pretending the owner can disappear from the
                account.
              </p>
              <div className="mt-5 grid gap-3 sm:grid-cols-2">
                {[
                  "Video direction and shot list",
                  "Hooks, captions, and sales angles",
                  "Organic or AI-assisted creative",
                  "Lead generation and sales follow-up",
                ].map((item) => (
                  <div key={item} className="rounded-2xl border border-slate-200 bg-white/85 p-3 text-sm font-semibold text-slate-800 shadow-sm">
                    <Check className="mr-2 inline h-4 w-4 text-cyan-600" />
                    {item}
                  </div>
                ))}
              </div>
            </div>
            <div className="lg:col-span-3">
              <div className="grid gap-4 sm:grid-cols-3">
                {[
                  {
                    src: "/images/ryan-live-content-work-1.jpg",
                    alt: "Ryan Nichols reviewing live sales content",
                    label: "Live commerce",
                  },
                  {
                    src: "/images/ryan-live-content-work-2.jpg",
                    alt: "Ryan Nichols presenting product during a live content session",
                    label: "Product angle",
                  },
                  {
                    src: "/images/ryan-cmon-man-marketing.jpg",
                    alt: "Ryan Nichols with a C'mon Man marketing ice breaker sign",
                    label: "Personality",
                  },
                ].map((photo) => (
                  <div key={photo.src} className="overflow-hidden rounded-3xl border border-white/70 bg-white/80 shadow-[0_24px_60px_-28px_rgba(15,23,42,0.35)] ring-1 ring-slate-900/5">
                    <div className="aspect-[4/5] bg-slate-100">
                      <img src={photo.src} alt={photo.alt} className="h-full w-full object-cover" />
                    </div>
                    <div className="p-4 text-sm font-semibold text-slate-950">{photo.label}</div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* PRICE LADDER */}
      <section className="relative overflow-hidden border-b border-slate-200">
        <div
          aria-hidden
          className="absolute inset-0"
          style={{ background: "linear-gradient(180deg, #f3eaff 0%, #fff8f1 100%)" }}
        />
        <div className="relative mx-auto max-w-7xl px-4 py-12 sm:py-16">
          <div className="text-xs uppercase tracking-widest text-cyan-700 font-semibold mb-2">
            Pick your tier
          </div>
          <h2 className="text-3xl sm:text-4xl font-semibold tracking-tight text-slate-950">
            Four entry points. Same operator running them.
          </h2>
          <div className="mt-8 grid gap-4 md:grid-cols-2 lg:grid-cols-4">
            {TIERS.map((t) => (
              <Link
                key={t.label}
                href={t.href}
                className={`group relative rounded-2xl border ${t.style} p-5 backdrop-blur shadow-[0_20px_50px_-15px_rgba(15,23,42,0.10)] hover:shadow-[0_30px_70px_-15px_rgba(15,23,42,0.20)] transition-shadow`}
              >
                {t.highlight && (
                  <span className="absolute -top-3 left-4 inline-flex items-center gap-1 rounded-full bg-accent-500 px-2.5 py-0.5 text-[10px] font-bold text-white uppercase tracking-widest">
                    <Star className="h-3 w-3" /> Most popular
                  </span>
                )}
                <div className="text-3xl font-bold text-slate-950 tabular-nums">{t.label}</div>
                <div className="mt-1 text-sm font-semibold text-cyan-700">{t.sub}</div>
                <p className="mt-2 text-sm text-slate-600 leading-relaxed">{t.line}</p>
                <div className="mt-4 inline-flex items-center gap-1 text-sm font-semibold text-brand-700 group-hover:text-brand-800">
                  Read more <ArrowRight className="h-3.5 w-3.5" />
                </div>
              </Link>
            ))}
          </div>
        </div>
      </section>

      {/* PER-PLATFORM CARDS */}
      <section id="single-platforms" className="relative overflow-hidden border-b border-slate-200">
        <div
          aria-hidden
          className="absolute inset-0"
          style={{ background: "linear-gradient(180deg, #fff8f1 0%, #f6f9ff 100%)" }}
        />
        <div className="relative mx-auto max-w-7xl px-4 py-14 sm:py-20">
          <div className="text-xs uppercase tracking-widest text-cyan-700 font-semibold mb-2">
            Single-channel · $497/mo each
          </div>
          <h2 className="text-3xl sm:text-4xl font-semibold tracking-tight text-slate-950 max-w-3xl">
            Done-for-you on the platform that fits your audience.
          </h2>
          <p className="mt-3 text-slate-700 max-w-2xl">
            Each channel runs end-to-end: voice intake, content production, posting, community
            management, monthly performance report tied to leads and revenue. Bundle all four for
            $1,497/mo and save $491/mo.
          </p>

          <div className="mt-8 grid gap-5 md:grid-cols-2 lg:grid-cols-4">
            {PLATFORMS.map((p) => {
              const Icon = p.Icon;
              return (
                <Link
                  key={p.handle}
                  href={`/platforms/${p.handle}`}
                  className="group flex flex-col rounded-2xl border border-slate-200 bg-white/80 backdrop-blur p-6 shadow-[0_20px_50px_-15px_rgba(15,23,42,0.10)] hover:shadow-[0_30px_70px_-15px_rgba(15,23,42,0.20)] transition-shadow"
                >
                  <div className="flex items-center justify-between">
                    <div className="inline-flex h-11 w-11 items-center justify-center rounded-xl bg-slate-900 text-white">
                      <Icon className="h-5 w-5" />
                    </div>
                    <span className="text-[10px] uppercase tracking-widest text-cyan-700 bg-cyan-50 border border-cyan-200 px-2 py-0.5 rounded-full font-semibold">
                      {p.metric}
                    </span>
                  </div>
                  <h3 className="mt-4 text-lg font-semibold text-slate-950">{p.name}</h3>
                  <div className="mt-1 flex items-baseline gap-1">
                    <span className="text-2xl font-bold text-slate-950 tabular-nums">$497</span>
                    <span className="text-sm text-slate-500">/mo</span>
                  </div>
                  <p className="mt-3 text-sm text-slate-700 leading-relaxed">{p.blurb}</p>
                  <ul className="mt-4 space-y-2">
                    {p.bullets.map((b) => (
                      <li key={b} className="flex items-start gap-2 text-sm text-slate-700">
                        <Check className="mt-0.5 h-4 w-4 shrink-0 text-cyan-600" />
                        <span>{b}</span>
                      </li>
                    ))}
                  </ul>
                  <div className="mt-auto pt-6 inline-flex items-center gap-1 text-sm font-semibold text-brand-700 group-hover:text-brand-800">
                    See the {p.name} comparison <ArrowRight className="h-3.5 w-3.5" />
                  </div>
                </Link>
              );
            })}
          </div>
        </div>
      </section>

      {/* POWER BUNDLE — dark accent */}
      <section className="relative overflow-hidden bg-gradient-to-br from-slate-950 via-slate-900 to-brand-950 text-white">
        <div
          aria-hidden
          className="absolute inset-0 opacity-[0.06]"
          style={{
            backgroundImage:
              "linear-gradient(to right, white 1px, transparent 1px), linear-gradient(to bottom, white 1px, transparent 1px)",
            backgroundSize: "40px 40px",
          }}
        />
        <div
          aria-hidden
          className="absolute -top-24 -right-24 h-[400px] w-[400px] rounded-full opacity-30 blur-3xl"
          style={{ background: "radial-gradient(circle, #22b8ff 0%, transparent 60%)" }}
        />
        <div
          aria-hidden
          className="absolute -bottom-32 -left-32 h-[480px] w-[480px] rounded-full opacity-25 blur-3xl"
          style={{ background: "radial-gradient(circle, #ff9a1f 0%, transparent 60%)" }}
        />

        <div className="relative mx-auto max-w-7xl px-4 py-16 sm:py-20">
          <div className="grid gap-10 lg:grid-cols-5 lg:items-center">
            <div className="lg:col-span-3">
              <div className="inline-flex items-center gap-2 rounded-full border border-accent-400/40 bg-accent-400/10 px-3 py-1 text-xs uppercase tracking-widest text-accent-300 font-semibold">
                <Star className="h-3.5 w-3.5" /> Power Bundle · Saves $491/mo
              </div>
              <h2 className="mt-5 text-3xl sm:text-5xl font-semibold tracking-tight leading-tight">
                All four platforms.{" "}
                <span className="bg-gradient-to-r from-cyan-300 to-accent-400 bg-clip-text text-transparent">
                  $1,497 a month. One operator.
                </span>
              </h2>
              <p className="mt-5 text-slate-300 leading-relaxed">
                The algorithm rewards consistency <em>across</em> platforms — not just one. The
                Power Bundle runs TikTok, Facebook, X, and YouTube simultaneously so the signals
                compound. Same operator, same voice, same deliverables — one monthly invoice
                instead of four.
              </p>
              <p className="mt-3 text-slate-300 leading-relaxed">
                One long YouTube video → 4 TikToks → 4 Reels → 6 X threads → 2 FB posts. The
                bundle math works because the source content is shared.
              </p>
              <div className="mt-7 flex flex-col sm:flex-row gap-3">
                <Link
                  href="/offers/power-bundle"
                  className="inline-flex items-center justify-center gap-2 rounded-xl bg-accent-500 px-6 py-3 font-semibold text-white shadow-lg shadow-accent-500/30 hover:bg-accent-600"
                >
                  Reserve the Power Bundle — $1,497/mo <ArrowRight className="h-4 w-4" />
                </Link>
                <Link
                  href="/book"
                  className="inline-flex items-center justify-center gap-2 rounded-xl border border-white/20 bg-white/5 backdrop-blur px-6 py-3 font-semibold text-white hover:bg-white/10"
                >
                  Free 10-min call
                </Link>
              </div>
            </div>

            <div className="lg:col-span-2">
              <div className="rounded-3xl border border-white/15 bg-white/[0.06] backdrop-blur-xl p-6 shadow-2xl shadow-black/40">
                <div className="text-[10px] uppercase tracking-widest text-cyan-300 font-bold">
                  The reef-barrier rule
                </div>
                <p className="mt-3 text-base leading-relaxed">
                  Most owners quit between zero and the first 1,000 followers. Past that, the
                  algorithm starts trusting you and the curve flips.{" "}
                  <strong className="text-white">I've crossed the reef on every platform.</strong>{" "}
                  I know exactly where it is on yours.
                </p>
                <div className="mt-5 grid grid-cols-2 gap-3 text-xs">
                  <div className="rounded-xl border border-white/10 bg-white/[0.03] p-3">
                    <div className="text-cyan-300 font-bold">DIY path</div>
                    <div className="mt-1 text-slate-300">Usually slow because the rhythm breaks</div>
                  </div>
                  <div className="rounded-xl border border-accent-400/30 bg-accent-400/10 p-3">
                    <div className="text-accent-300 font-bold">With me</div>
                    <div className="mt-1 text-white">Cadence, hooks, and follow-up get installed</div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* FACEBOOK ADS SPOTLIGHT */}
      <section className="relative overflow-hidden border-b border-slate-200">
        <div
          aria-hidden
          className="absolute inset-0"
          style={{ background: "linear-gradient(180deg, #f6f9ff 0%, #fff8f1 100%)" }}
        />
        <div className="relative mx-auto max-w-7xl px-4 py-14 sm:py-20">
          <div className="grid gap-10 lg:grid-cols-2 lg:items-center">
            <div>
              <div className="inline-flex items-center gap-2 rounded-full border border-accent-300 bg-white/70 backdrop-blur px-3 py-1 text-xs uppercase tracking-widest text-accent-700 font-semibold shadow-sm">
                <Megaphone className="h-3.5 w-3.5" /> Performance ads · $1,497/mo + 10% spend
              </div>
              <h2 className="mt-5 text-3xl sm:text-4xl font-semibold tracking-tight leading-tight text-slate-950">
                Done-for-you Facebook Ads.{" "}
                <span className="bg-gradient-to-r from-brand-700 to-accent-500 bg-clip-text text-transparent">
                  Your budget pays Meta — never me.
                </span>
              </h2>
              <p className="mt-5 text-slate-700 leading-relaxed">
                I run your campaigns end-to-end — audience research, creative iteration, daily
                optimization, weekly reports tied to leads and revenue. You pay Meta directly.
                $2K/mo minimum spend. Built for businesses doing $20K+/mo who want CPL down and
                lead volume up.
              </p>
              <div className="mt-7 flex flex-col sm:flex-row gap-3">
                <Link
                  href="/offers/fb-ads"
                  className="inline-flex items-center justify-center gap-2 rounded-xl bg-slate-900 px-6 py-3 font-semibold text-white shadow-lg shadow-slate-900/30 hover:bg-slate-800"
                >
                  Reserve FB Ads — $1,497/mo + 10% <ArrowRight className="h-4 w-4" />
                </Link>
                <Link
                  href="/book"
                  className="inline-flex items-center justify-center gap-2 rounded-xl border border-slate-300 bg-white/80 backdrop-blur px-6 py-3 font-semibold text-slate-800 hover:border-brand-500 hover:text-brand-700"
                >
                  Talk first
                </Link>
              </div>
            </div>

            <div className="rounded-3xl border border-white/60 bg-white/70 backdrop-blur-xl p-6 shadow-[0_30px_70px_-20px_rgba(15,23,42,0.20)] ring-1 ring-slate-900/5">
              <div className="flex items-center justify-between">
                <div className="text-[10px] uppercase tracking-widest text-slate-500 font-semibold">
                  Cost-per-lead trend
                </div>
                <span className="inline-flex items-center gap-1.5 rounded-full bg-accent-100 border border-accent-300 px-2.5 py-0.5 text-xs font-semibold text-accent-700">
                  <TrendingUp className="h-3 w-3" /> Down 42%
                </span>
              </div>
              <CPLChart />
              <div className="mt-3 grid grid-cols-3 gap-2 text-[11px] text-center">
                <div className="rounded-md bg-slate-50 py-1.5 text-slate-700">Week 1<br /><strong>$84</strong></div>
                <div className="rounded-md bg-cyan-50 py-1.5 text-cyan-800">Week 4<br /><strong>$58</strong></div>
                <div className="rounded-md bg-accent-100 py-1.5 text-accent-800">Week 8<br /><strong>$49</strong></div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* WHO IT'S FOR */}
      <section className="relative overflow-hidden border-b border-slate-200">
        <div
          aria-hidden
          className="absolute inset-0"
          style={{ background: "linear-gradient(180deg, #fff8f1 0%, #eef9ff 100%)" }}
        />
        <div className="relative mx-auto max-w-7xl px-4 py-14 sm:py-16">
          <div className="text-xs uppercase tracking-widest text-cyan-700 font-semibold mb-2">
            Who this is for
          </div>
          <h2 className="text-3xl sm:text-4xl font-semibold tracking-tight text-slate-950 max-w-3xl">
            Three audiences. Same algorithm. Same playbook in your voice.
          </h2>
          <div className="mt-8 grid gap-5 md:grid-cols-3">
            <Bucket
              Icon={Users}
              title="Business owners"
              body="Local services, mortgage, real estate, contractors, dental, fitness — your buyers are scrolling right now. We turn the platforms into a lead engine."
            />
            <Bucket
              Icon={Sparkles}
              title="Creators"
              body="You make the content; I run the engine that gets it seen. Daily output + hook iteration + cross-platform posting = compounding audience growth."
            />
            <Bucket
              Icon={Trophy}
              title="People with a message"
              body="Faith, recovery, redemption, niche advocacy — the algorithm doesn't care what you stand for, only how well you hook. Get heard."
            />
          </div>
        </div>
      </section>

      {/* RIGHT FIT / WRONG FIT */}
      <section className="relative overflow-hidden border-b border-slate-200">
        <div
          aria-hidden
          className="absolute inset-0"
          style={{ background: "linear-gradient(180deg, #eef9ff 0%, #f6f9ff 100%)" }}
        />
        <div className="relative mx-auto max-w-7xl px-4 py-14 sm:py-16">
          <div className="text-xs uppercase tracking-widest text-cyan-700 font-semibold mb-2">
            Save us both time
          </div>
          <h2 className="text-3xl sm:text-4xl font-semibold tracking-tight text-slate-950 mb-8">
            Are you a fit for done-for-you social?
          </h2>
          <div className="grid gap-5 md:grid-cols-2">
            <FitBlock
              tone="cyan"
              title="Bring me in if"
              items={[
                "You can record 5–10 min of phone footage / week",
                "You'll do a 30-min content sync once a week",
                "You're committed to 90 days minimum (algorithm runway)",
                "Your offer is real and your sales process can handle leads",
                "You want lead flow — not vanity follower count",
              ]}
            />
            <FitBlock
              tone="rose"
              title="Do not bring me in if"
              items={[
                "You won't show up for 1 weekly sync",
                "You expect to go viral by next Tuesday",
                "You want to approve every single post before it ships",
                "Your sales process drops 50% of leads (fix that first)",
                "You want me to do this for $200/mo",
              ]}
            />
          </div>
        </div>
      </section>

      {/* FINAL CTA — dark glass */}
      <section className="relative overflow-hidden bg-gradient-to-br from-slate-950 via-brand-900 to-cyan-900 text-white">
        <div
          aria-hidden
          className="absolute -top-24 left-1/2 -translate-x-1/2 h-[400px] w-[600px] rounded-full opacity-25 blur-3xl"
          style={{ background: "radial-gradient(circle, #ff9a1f 0%, transparent 60%)" }}
        />
        <div className="relative mx-auto max-w-4xl px-4 py-16 sm:py-20 text-center">
          <h2 className="text-3xl sm:text-4xl font-semibold tracking-tight">
            Get past the reef on every platform that matters.
          </h2>
          <p className="mt-3 text-slate-300 max-w-2xl mx-auto">
            Pick a tier, a platform, or all four. Either way the algorithm starts working with you,
            not against you, in 90 days.
          </p>
          <div className="mt-7 flex flex-col sm:flex-row flex-wrap items-center justify-center gap-3">
            <Link
              href="/offers/power-bundle"
              className="inline-flex items-center justify-center gap-2 rounded-xl bg-accent-500 px-6 py-3 font-semibold text-white shadow-lg shadow-accent-500/30 hover:bg-accent-600"
            >
              Power Bundle — $1,497/mo <ArrowRight className="h-4 w-4" />
            </Link>
            <Link
              href="/offers/quick-look"
              className="inline-flex items-center justify-center gap-2 rounded-xl bg-cyan-500 px-6 py-3 font-semibold text-white shadow-lg shadow-cyan-500/30 hover:bg-cyan-600"
            >
              Quick-Look — $47
            </Link>
            <Link
              href="/book"
              className="inline-flex items-center justify-center gap-2 rounded-xl border border-white/20 bg-white/5 backdrop-blur px-6 py-3 font-semibold text-white hover:bg-white/10"
            >
              Free 10-min call
            </Link>
          </div>
          <p className="mt-6 text-xs text-slate-400 max-w-2xl mx-auto leading-relaxed">
            Real Ryan Nichols LLC · Texas-governed under mutual NDA on every paid engagement. Paid
            ad budgets are paid by clients directly to Meta — never invoiced through us.
          </p>
        </div>
      </section>

      <LightFooter />
    </div>
  );
}

/* ─── components ──────────────────────────────────────────────── */

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-xl border border-slate-200 bg-white/80 p-3 text-center">
      <div className="text-lg font-bold text-slate-950 tabular-nums">{value}</div>
      <div className="text-[10px] uppercase tracking-widest text-slate-500 mt-0.5">{label}</div>
    </div>
  );
}

function Bucket({ Icon, title, body }: { Icon: any; title: string; body: string }) {
  return (
    <div className="rounded-2xl border border-slate-200 bg-white/80 backdrop-blur p-6 shadow-[0_20px_50px_-15px_rgba(15,23,42,0.10)]">
      <div className="inline-flex h-11 w-11 items-center justify-center rounded-xl bg-gradient-to-br from-cyan-500 to-brand-600 text-white">
        <Icon className="h-5 w-5" />
      </div>
      <h3 className="mt-4 font-semibold text-slate-950 text-lg">{title}</h3>
      <p className="mt-2 text-sm text-slate-700 leading-relaxed">{body}</p>
    </div>
  );
}

function FitBlock({ tone, title, items }: { tone: "cyan" | "rose"; title: string; items: string[] }) {
  const styles =
    tone === "cyan"
      ? "border-cyan-200 bg-cyan-50/70"
      : "border-rose-200 bg-rose-50/70";
  const chip =
    tone === "cyan"
      ? "border-cyan-300 bg-cyan-100 text-cyan-800"
      : "border-rose-300 bg-rose-100 text-rose-800";
  const iconColor = tone === "cyan" ? "text-cyan-700" : "text-rose-600";
  const Pill = tone === "cyan" ? Check : XIcon;
  return (
    <div className={`rounded-2xl border ${styles} backdrop-blur p-6`}>
      <div className={`inline-flex items-center gap-2 rounded-full border ${chip} px-3 py-1 text-xs font-semibold uppercase tracking-widest`}>
        <Pill className="h-3.5 w-3.5" /> {title}
      </div>
      <ul className="mt-4 space-y-2.5">
        {items.map((line) => (
          <li key={line} className="flex items-start gap-2 text-slate-800 text-sm">
            <Pill className={`mt-0.5 h-5 w-5 shrink-0 ${iconColor}`} />
            <span>{line}</span>
          </li>
        ))}
      </ul>
    </div>
  );
}

function CPLChart() {
  const W = 360;
  const H = 160;
  const data = [84, 78, 71, 64, 58, 54, 51, 49];
  const max = 90;
  const min = 40;
  const points = data.map((v, i) => {
    const x = (i / (data.length - 1)) * (W - 30) + 15;
    const y = H - ((v - min) / (max - min)) * (H - 30) - 15;
    return { x, y, v };
  });
  const path = `M ${points[0].x} ${points[0].y} ` +
    points.slice(1).map((p, i) => {
      const prev = points[i];
      const cx1 = prev.x + (p.x - prev.x) / 2;
      return `Q ${cx1} ${prev.y}, ${p.x} ${p.y}`;
    }).join(" ");
  const areaPath = path + ` L ${points[points.length - 1].x} ${H - 15} L ${points[0].x} ${H - 15} Z`;

  return (
    <svg viewBox={`0 0 ${W} ${H}`} className="block w-full mt-3">
      <defs>
        <linearGradient id="cpl-line" x1="0" y1="0" x2="1" y2="0">
          <stop offset="0%" stopColor="#23b8ff" />
          <stop offset="100%" stopColor="#ff9a1f" />
        </linearGradient>
        <linearGradient id="cpl-area" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#23b8ff" stopOpacity="0.2" />
          <stop offset="100%" stopColor="#23b8ff" stopOpacity="0" />
        </linearGradient>
      </defs>
      {[40, 60, 80, 100, 120].map((y) => (
        <line key={y} x1="15" y1={y} x2={W - 15} y2={y} stroke="#e2e8f0" strokeDasharray="2 4" />
      ))}
      <path d={areaPath} fill="url(#cpl-area)" />
      <path d={path} fill="none" stroke="url(#cpl-line)" strokeWidth="3" strokeLinecap="round">
        <animate attributeName="stroke-dasharray" from="0 1000" to="1000 0" dur="1.6s" fill="freeze" />
      </path>
      {points.map((p, i) => (
        <g key={i}>
          <circle cx={p.x} cy={p.y} r="4" fill="#ffffff" stroke="#23b8ff" strokeWidth="2" />
        </g>
      ))}
    </svg>
  );
}
