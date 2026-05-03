// src/app/services/page.tsx — Public sales page for Ryan's social-growth services.
//
// Built around the 7-package ladder in SOCIAL_GROWTH_PACKAGES.md (workspace doc):
// Discovery Call (free) → Audit $297 → Sprint $1,497 → Funnel $2,997 →
// DFY Social $2,497/mo → Ads $1,997/mo+ → VIP Coaching $497/mo.
//
// Mobile-first by design: single-column on phones, two-column from md:, three
// from lg:. No JS required; pure Server Component. Every CTA is a mailto link
// today — swap to Stripe Payment Link URLs once the products are created.
//
// Notes:
// - We don't promise specific outcomes anywhere on this page (legal / good
//   business). All copy stays "what we deliver" not "what you'll achieve".
// - Ryan's social proof (70K+ across 5 platforms) is the credibility wedge.

import Link from "next/link";
import {
  ArrowRight, Check, Mail, Megaphone, Sparkles, Users, Briefcase,
  Workflow, BarChart3, GraduationCap, Quote, ShieldCheck,
} from "lucide-react";

export const metadata = {
  title: "Services — Social Growth · The LeadFlow Pro",
  description:
    "Grow your audience, your leads, and your revenue — without becoming a full-time content machine. 7 packages from a $297 audit to full done-for-you management. Built by Ryan Nichols, 70K+ across 5 platforms.",
};

const RYAN_EMAIL = "theflashflash24@gmail.com";

function mailto(subject: string) {
  return `mailto:${RYAN_EMAIL}?subject=${encodeURIComponent(subject)}`;
}

type Package = {
  slug: string;
  name: string;
  price: string;
  cadence?: string;
  one_liner: string;
  who: string;
  deliverables: string[];
  cta: string;
  cta_href: string;
  icon: any;
  tone: "indigo" | "emerald" | "amber" | "violet" | "rose" | "cyan" | "slate";
  highlight?: boolean;
};

const PACKAGES: Package[] = [
  {
    slug: "audit",
    name: "Social Audit & 90-Day Playbook",
    price: "$297",
    one_liner: "A complete teardown of your social presence and a written 90-day plan you can run yourself or hand to your team.",
    who: "Owners and creators who already post but don't know what's actually working.",
    deliverables: [
      "Audit of up to 5 active profiles (IG, TikTok, YouTube, LinkedIn, FB, X)",
      "60 days of performance data + 3 competitor benchmarks",
      "Written 12–18 page playbook (PDF + editable Notion / Google Doc)",
      "30-min walkthrough call",
      "Delivered in 7 business days",
    ],
    cta: "Get my audit",
    cta_href: mailto("Social Audit & 90-Day Playbook — $297"),
    icon: BarChart3,
    tone: "cyan",
  },
  {
    slug: "sprint",
    name: "30-Day Content Engine Sprint",
    price: "$1,497",
    one_liner: "A full month of done-for-you content — 30 posts, 4 video scripts, 12 long-form captions, voice guide, calendar.",
    who: "Owners who know they need to post consistently but can't manufacture a month from scratch.",
    deliverables: [
      "30 short-form posts (mix of reels, carousels, stills)",
      "4 short-form video scripts (shoot-ready)",
      "12 long-form captions",
      "Content calendar mapped to your real selling events",
      "Voice & style guide (your team uses going forward)",
      "2 strategy calls (kickoff + week-2 review)",
      "You own everything — editable hand-off",
    ],
    cta: "Start my sprint",
    cta_href: mailto("Content Engine Sprint — $1,497"),
    icon: Sparkles,
    tone: "violet",
  },
  {
    slug: "funnel",
    name: "Lead Flow Funnel Build",
    price: "$2,997",
    one_liner: "A complete lead-generation funnel built on LeadFlow Pro — landing page, lead magnet, 7-email nurture, ad creatives. Live in 14 days.",
    who: "Owners with a proven offer who want a real lead-generation system, not another website.",
    deliverables: [
      "1 landing page (LeadFlow Pro subdomain or your domain)",
      "1 lead magnet (PDF guide, checklist, or short video)",
      "7-email nurture sequence (written + scheduled)",
      "6 paid-ad creatives (3 image + 3 short-form video)",
      "Tracking, lead grading, and CRM routing on LeadFlow Pro",
      "Kickoff + mid-build review + launch handoff calls",
    ],
    cta: "Build my funnel",
    cta_href: mailto("Lead Flow Funnel Build — $2,997"),
    icon: Workflow,
    tone: "emerald",
    highlight: true,
  },
  {
    slug: "dfy-social",
    name: "Done-For-You Social Management",
    price: "$2,497",
    cadence: "/mo",
    one_liner: "We run two of your highest-leverage social channels every business day — content, posting, daily community management, monthly reporting.",
    who: "Established owners losing real revenue to inconsistent posting.",
    deliverables: [
      "20 short-form posts + 4 long-form posts per month, 2 channels (48 assets/mo)",
      "Daily community management (replies, DMs, buying-signal flags) Mon–Fri",
      "Monthly content calendar approval",
      "Monthly performance report tied to leads + revenue",
      "Monthly 30-min strategy call",
      "30-day cancellation, no contract. Add $497/mo per extra channel.",
    ],
    cta: "Hand it off",
    cta_href: mailto("Done-For-You Social Management — $2,497/mo"),
    icon: Briefcase,
    tone: "indigo",
  },
  {
    slug: "ads",
    name: "Paid Ads Management — Meta + Google",
    price: "$1,997",
    cadence: "/mo + 10% spend",
    one_liner: "Lead-driving paid campaigns built on Meta and Google, optimized weekly, transparent reporting tied to real lead volume and cost.",
    who: "Owners with a proven offer and at least $2,000/month in ad budget.",
    deliverables: [
      "Strategy + creative production (8 new creatives/mo: 4 Meta + 4 Google)",
      "Daily spend monitoring + weekly optimization passes",
      "Monthly performance report (spend, leads, CPL, ROAS)",
      "Monthly 30-min review call",
      "Initial pixel/tag/conversion-tracking setup ($997 one-time, waived on annual prepay)",
      "Ad spend paid by you directly to Meta + Google — never invoiced through us",
    ],
    cta: "Run my ads",
    cta_href: mailto("Paid Ads Management — Meta + Google"),
    icon: Megaphone,
    tone: "amber",
  },
  {
    slug: "vip",
    name: "VIP Coaching with Ryan",
    price: "$497",
    cadence: "/mo",
    one_liner: "Four 30-minute calls a month with Ryan, plus direct text access Mon–Fri. Built for owners who do their own work but want a sharp second brain on the strategy.",
    who: "Owners doing $100K–$1M who want strategic firepower without hiring a full agency.",
    deliverables: [
      "4 × 30-min private video calls per month",
      "Direct text access via Voxer or Slack, Mon–Fri (1 business-day response)",
      "Private template library (refreshed monthly)",
      "Recordings of every call within 24 hours",
      "30-day cancellation, no contract. 6-month prepay $2,485 (saves a month).",
    ],
    cta: "Join the VIP room",
    cta_href: mailto("VIP Coaching with Ryan — $497/mo"),
    icon: GraduationCap,
    tone: "rose",
  },
];

function toneClasses(t: Package["tone"]) {
  return {
    cyan:    "border-cyan-400/30 bg-cyan-500/[0.06] text-cyan-200",
    violet:  "border-violet-400/30 bg-violet-500/[0.06] text-violet-200",
    emerald: "border-emerald-400/30 bg-emerald-500/[0.06] text-emerald-200",
    indigo:  "border-indigo-400/30 bg-indigo-500/[0.06] text-indigo-200",
    amber:   "border-amber-400/30 bg-amber-500/[0.06] text-amber-200",
    rose:    "border-rose-400/30 bg-rose-500/[0.06] text-rose-200",
    slate:   "border-slate-400/30 bg-slate-500/[0.06] text-slate-200",
  }[t];
}

function ringTone(t: Package["tone"]) {
  return {
    cyan: "ring-cyan-400/20",
    violet: "ring-violet-400/20",
    emerald: "ring-emerald-400/30",
    indigo: "ring-indigo-400/20",
    amber: "ring-amber-400/20",
    rose: "ring-rose-400/20",
    slate: "ring-slate-400/20",
  }[t];
}

const FAQS = [
  {
    q: "Do you guarantee a specific number of followers, leads, or revenue?",
    a: "No, and we won't. What we guarantee is the work product, the strategic direction, and complete reporting transparency. Anyone selling guaranteed results in social or paid is overselling — performance depends on offer, market, creative, and platform behavior outside any agency's control.",
  },
  {
    q: "Why does ad spend get paid directly to Meta and Google instead of through you?",
    a: "Two reasons: it's cleaner for your books, and it removes any agency-side liability for unspent budget. You keep ownership of the ad accounts, the historical data, and the funds. We never touch ad-spend money.",
  },
  {
    q: "What's the fastest way to see whether we're a fit?",
    a: "Book the free 20-minute Discovery Call. You'll walk away with a one-page write-up of the single highest-leverage move you can make in the next 30 days — even if you decide not to hire us.",
  },
  {
    q: "Can you work with my existing team / scheduler / CRM?",
    a: "Yes. We work in Buffer, Later, your existing CRM, your existing analytics. Done-For-You and VIP clients onboard inside whatever stack you're already using.",
  },
  {
    q: "How does this connect to LeadFlow Pro?",
    a: "The Funnel Build runs on LeadFlow Pro by design — that's where lead capture, grading, and CRM routing happen. DFY Social and Ads management can run independently of LeadFlow Pro, but every engagement gives you the option to consolidate inside the platform.",
  },
  {
    q: "Where are you based, and what governs the engagement?",
    a: "Real Ryan Nichols LLC is based in Texas. All engagements are governed by Texas law. Standard month-to-month terms with 30-day cancellation on recurring services; one-time builds are scoped at the kickoff call and refundable up to 24 hours after delivery on the audit.",
  },
];

export default function ServicesPage() {
  return (
    <div className="min-h-screen bg-ink-950 text-ink-100">
      {/* Header strip */}
      <div className="border-b border-white/10 bg-ink-950/70 backdrop-blur">
        <div className="mx-auto max-w-6xl px-4 py-3 flex items-center justify-between text-sm">
          <Link href="/" className="font-semibold text-ink-100 hover:text-white">
            The LeadFlow Pro
          </Link>
          <Link
            href="#discovery"
            className="hidden sm:inline-flex items-center gap-1.5 rounded-full border border-emerald-400/30 bg-emerald-500/10 px-3 py-1.5 text-emerald-200 hover:bg-emerald-500/20"
          >
            Free Discovery Call <ArrowRight className="h-3.5 w-3.5" />
          </Link>
        </div>
      </div>

      {/* Hero */}
      <section className="mx-auto max-w-6xl px-4 pt-12 pb-10 sm:pt-20 sm:pb-14">
        <div className="inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/[0.03] px-3 py-1 text-xs uppercase tracking-widest text-ink-400">
          Built by Ryan Nichols · 70K+ across 5 platforms
        </div>
        <h1 className="mt-4 text-3xl sm:text-5xl font-semibold tracking-tight text-white">
          Grow your audience, your leads, and your revenue —{" "}
          <span className="text-emerald-300">without becoming a full-time content machine.</span>
        </h1>
        <p className="mt-5 max-w-2xl text-base sm:text-lg text-ink-300">
          Whether you need a clear plan, a 30-day content build, a complete lead-generation funnel,
          or a team that runs your social and ads every day — pick the level that fits where you
          are right now. Every engagement starts with a free 20-minute Discovery Call.
        </p>

        {/* Three-pillar selector */}
        <div className="mt-8 grid gap-3 sm:grid-cols-3">
          <a href="#tier-plan" className="group rounded-2xl border border-white/10 bg-white/[0.02] p-4 hover:border-cyan-400/30 hover:bg-cyan-500/[0.04]">
            <div className="text-xs uppercase tracking-widest text-ink-400">Tier 1</div>
            <div className="mt-1 font-semibold text-white">A plan I run myself</div>
            <div className="mt-1 text-sm text-ink-300">Audit + 90-day playbook · $297</div>
            <div className="mt-3 inline-flex items-center text-cyan-300 text-sm group-hover:text-cyan-200">
              See it <ArrowRight className="ml-1 h-4 w-4" />
            </div>
          </a>
          <a href="#tier-build" className="group rounded-2xl border border-white/10 bg-white/[0.02] p-4 hover:border-emerald-400/30 hover:bg-emerald-500/[0.04]">
            <div className="text-xs uppercase tracking-widest text-ink-400">Tier 2</div>
            <div className="mt-1 font-semibold text-white">Built for me once</div>
            <div className="mt-1 text-sm text-ink-300">Sprint · $1,497 &nbsp;·&nbsp; Funnel · $2,997</div>
            <div className="mt-3 inline-flex items-center text-emerald-300 text-sm group-hover:text-emerald-200">
              See it <ArrowRight className="ml-1 h-4 w-4" />
            </div>
          </a>
          <a href="#tier-recurring" className="group rounded-2xl border border-white/10 bg-white/[0.02] p-4 hover:border-violet-400/30 hover:bg-violet-500/[0.04]">
            <div className="text-xs uppercase tracking-widest text-ink-400">Tier 3</div>
            <div className="mt-1 font-semibold text-white">Run for me every month</div>
            <div className="mt-1 text-sm text-ink-300">DFY · Ads · VIP · from $497/mo</div>
            <div className="mt-3 inline-flex items-center text-violet-300 text-sm group-hover:text-violet-200">
              See it <ArrowRight className="ml-1 h-4 w-4" />
            </div>
          </a>
        </div>
      </section>

      {/* Discovery Call (top of funnel) */}
      <section id="discovery" className="mx-auto max-w-6xl px-4 pb-12">
        <div className="rounded-3xl border border-emerald-400/30 bg-gradient-to-br from-emerald-500/[0.08] to-emerald-500/[0.02] p-6 sm:p-8">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
            <div>
              <div className="inline-flex items-center gap-2 rounded-full border border-emerald-400/30 bg-emerald-500/10 px-3 py-1 text-xs text-emerald-200">
                Free · 20 minutes · No pitch
              </div>
              <h2 className="mt-3 text-xl sm:text-2xl font-semibold text-white">
                Social Growth Discovery Call
              </h2>
              <p className="mt-2 max-w-2xl text-ink-300">
                A focused 20-minute call with Ryan. You walk away with a one-page write-up
                identifying the single highest-leverage move you can make in the next 30 days —
                whether or not you hire us is up to you. Calendar slots are intentionally limited.
              </p>
            </div>
            <a
              href={mailto("Free Discovery Call — Social Growth")}
              className="inline-flex w-full sm:w-auto items-center justify-center gap-2 rounded-xl bg-emerald-500 px-5 py-3 font-semibold text-emerald-950 hover:bg-emerald-400"
            >
              Book your call <ArrowRight className="h-4 w-4" />
            </a>
          </div>
        </div>
      </section>

      {/* Tier 1 — A plan I run myself */}
      <section id="tier-plan" className="mx-auto max-w-6xl px-4 pb-12">
        <SectionHeader eyebrow="Tier 1" title="A plan I run myself" />
        <div className="grid gap-5">
          <PackageCard pkg={PACKAGES[0]} />
        </div>
      </section>

      {/* Tier 2 — Built for me once */}
      <section id="tier-build" className="mx-auto max-w-6xl px-4 pb-12">
        <SectionHeader eyebrow="Tier 2" title="Built for me once" />
        <div className="grid gap-5 md:grid-cols-2">
          <PackageCard pkg={PACKAGES[1]} />
          <PackageCard pkg={PACKAGES[2]} />
        </div>
      </section>

      {/* Tier 3 — Run for me monthly */}
      <section id="tier-recurring" className="mx-auto max-w-6xl px-4 pb-12">
        <SectionHeader eyebrow="Tier 3" title="Run for me every month" />
        <div className="grid gap-5 md:grid-cols-2 lg:grid-cols-3">
          <PackageCard pkg={PACKAGES[3]} />
          <PackageCard pkg={PACKAGES[4]} />
          <PackageCard pkg={PACKAGES[5]} />
        </div>
      </section>

      {/* Why Ryan */}
      <section className="mx-auto max-w-6xl px-4 pb-12">
        <div className="rounded-3xl border border-white/10 bg-white/[0.02] p-6 sm:p-10">
          <SectionHeader eyebrow="Why Ryan" title="Built mine. Now I'll show you how to build yours." />
          <div className="grid gap-6 md:grid-cols-3 mt-2">
            <Stat label="X / Twitter" value="44K" />
            <Stat label="Facebook" value="19K" />
            <Stat label="YouTube" value="12K" />
          </div>
          <p className="mt-6 text-ink-300 max-w-3xl">
            What you're hiring is the playbook that built this — applied to your business, your
            offers, and your audience. Not a generic agency template. Every package is something
            I either still run myself or have run for paying clients.
          </p>
        </div>
      </section>

      {/* FAQ */}
      <section id="faq" className="mx-auto max-w-6xl px-4 pb-16">
        <SectionHeader eyebrow="Common questions" title="Before you book" />
        <div className="grid gap-4 md:grid-cols-2">
          {FAQS.map((f) => (
            <div key={f.q} className="rounded-2xl border border-white/10 bg-white/[0.02] p-5">
              <div className="flex items-start gap-3">
                <Quote className="mt-0.5 h-4 w-4 shrink-0 text-ink-500" />
                <h3 className="font-semibold text-white">{f.q}</h3>
              </div>
              <p className="mt-2 text-sm text-ink-300">{f.a}</p>
            </div>
          ))}
        </div>
      </section>

      {/* Final CTA */}
      <section className="mx-auto max-w-6xl px-4 pb-20">
        <div className="rounded-3xl border border-white/10 bg-gradient-to-br from-emerald-500/[0.08] via-cyan-500/[0.04] to-violet-500/[0.06] p-6 sm:p-10 text-center">
          <h2 className="text-2xl sm:text-3xl font-semibold text-white">
            Pick a tier or just start with the call.
          </h2>
          <p className="mt-3 text-ink-300 max-w-2xl mx-auto">
            Either way, we'll know in 20 minutes whether we're a fit and what the right next
            move is for you.
          </p>
          <div className="mt-6 flex flex-col sm:flex-row items-center justify-center gap-3">
            <a
              href={mailto("Free Discovery Call — Social Growth")}
              className="inline-flex items-center gap-2 rounded-xl bg-emerald-500 px-5 py-3 font-semibold text-emerald-950 hover:bg-emerald-400"
            >
              Book the free call <ArrowRight className="h-4 w-4" />
            </a>
            <a
              href={mailto("Question about LeadFlow services")}
              className="inline-flex items-center gap-2 rounded-xl border border-white/15 bg-white/[0.03] px-5 py-3 font-semibold text-ink-100 hover:bg-white/[0.06]"
            >
              <Mail className="h-4 w-4" /> Email me a question
            </a>
          </div>
        </div>

        {/* Disclosure */}
        <p className="mt-8 text-xs text-ink-400 max-w-3xl mx-auto text-center leading-relaxed">
          All packages are sold by Real Ryan Nichols LLC, a Texas limited liability company,
          and are governed by Texas law. We do not guarantee specific follower-count, lead-volume,
          conversion-rate, or revenue outcomes — what we deliver is the work product, strategic
          direction, and reporting described in each package. Paid-ad budgets are paid by clients
          directly to Meta, Google, or other ad platforms and are never invoiced through us.
        </p>
      </section>
    </div>
  );
}

/* ────────────────────────────────────────────────────────────── */

function SectionHeader({ eyebrow, title }: { eyebrow: string; title: string }) {
  return (
    <div className="mb-5 sm:mb-7">
      <div className="text-xs uppercase tracking-widest text-ink-400">{eyebrow}</div>
      <h2 className="mt-1 text-2xl sm:text-3xl font-semibold text-white">{title}</h2>
    </div>
  );
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-2xl border border-white/10 bg-white/[0.02] p-5 text-center">
      <div className="text-3xl sm:text-4xl font-bold text-white tabular-nums">{value}</div>
      <div className="mt-1 text-xs uppercase tracking-widest text-ink-400">{label}</div>
    </div>
  );
}

function PackageCard({ pkg }: { pkg: Package }) {
  const Icon = pkg.icon;
  const tone = toneClasses(pkg.tone);
  const ring = ringTone(pkg.tone);
  return (
    <div
      className={`rounded-2xl border bg-white/[0.02] p-6 ring-1 ${ring} ${
        pkg.highlight ? "border-emerald-400/40" : "border-white/10"
      }`}
    >
      <div className="flex items-start justify-between gap-3">
        <div className={`inline-flex h-10 w-10 items-center justify-center rounded-xl border ${tone}`}>
          <Icon className="h-5 w-5" />
        </div>
        {pkg.highlight && (
          <span className="inline-flex items-center gap-1.5 rounded-full border border-emerald-400/40 bg-emerald-500/10 px-2.5 py-1 text-xs text-emerald-200">
            <ShieldCheck className="h-3 w-3" /> Most popular
          </span>
        )}
      </div>
      <h3 className="mt-4 text-lg font-semibold text-white">{pkg.name}</h3>
      <div className="mt-1 flex items-baseline gap-1">
        <span className="text-2xl font-bold text-white">{pkg.price}</span>
        {pkg.cadence && <span className="text-sm text-ink-400">{pkg.cadence}</span>}
      </div>
      <p className="mt-3 text-sm text-ink-300">{pkg.one_liner}</p>
      <div className="mt-4 rounded-xl border border-white/10 bg-white/[0.02] p-3">
        <div className="text-[11px] uppercase tracking-widest text-ink-400">Best fit</div>
        <div className="mt-0.5 text-sm text-ink-200">{pkg.who}</div>
      </div>
      <ul className="mt-4 space-y-2">
        {pkg.deliverables.map((d) => (
          <li key={d} className="flex items-start gap-2 text-sm text-ink-200">
            <Check className="mt-0.5 h-4 w-4 shrink-0 text-emerald-400" />
            <span>{d}</span>
          </li>
        ))}
      </ul>
      <a
        href={pkg.cta_href}
        className="mt-6 inline-flex w-full items-center justify-center gap-2 rounded-xl bg-white text-ink-950 px-4 py-2.5 text-sm font-semibold hover:bg-ink-100"
      >
        {pkg.cta} <ArrowRight className="h-4 w-4" />
      </a>
    </div>
  );
}
