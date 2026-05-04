// src/app/pricing/page.tsx — 5-tier subscription pricing (light theme).
//
// Free → Starter → Pro → Power → 1:1 with Ryan.
// Stripe Payment Link URLs come from env. Falls back to /start if not set.

import Link from "next/link";
import {
  ArrowRight, Check, Crown, Sparkles, TrendingUp, Briefcase, Zap, X,
} from "lucide-react";

export const metadata = {
  title: "Pricing — The LeadFlow Pro",
  description:
    "Free forever to 1:1 with Ryan. Five tiers built around the freemium-to-must-pay journey. Cancel any month, upgrade any time.",
};

const PAY = {
  starter: process.env.NEXT_PUBLIC_STRIPE_LINK_STARTER || "/start",
  pro:     process.env.NEXT_PUBLIC_STRIPE_LINK_PRO     || "/start",
  power:   process.env.NEXT_PUBLIC_STRIPE_LINK_POWER   || "/start",
};

type Tier = {
  slug: "free" | "starter" | "pro" | "power" | "vip";
  name: string;
  price: string;
  cadence: string;
  tagline: string;
  who: string;
  features: string[];
  notIncluded?: string[];
  cta: { label: string; href: string };
  highlight?: boolean;
  icon: any;
  tone: "slate" | "cyan" | "brand" | "accent" | "lead";
};

const TIERS: Tier[] = [
  {
    slug: "free",
    name: "Free",
    price: "$0",
    cadence: "/mo, forever",
    tagline: "See what's possible.",
    who: "Anyone starting out, just curious, or testing if we're a fit.",
    features: [
      "Connect 1 social platform",
      "Basic analytics on your real numbers",
      "Looking Glass — read-only signals",
      "Public lessons + community read access",
      "Weekly newsletter from Ryan",
    ],
    notIncluded: [
      "Actionable Looking Glass prompts",
      "Template libraries",
      "Direct access to Ryan",
    ],
    cta: { label: "Start free", href: "/start" },
    icon: Sparkles,
    tone: "slate",
  },
  {
    slug: "starter",
    name: "Starter",
    price: "$47",
    cadence: "/mo",
    tagline: "Get the flow going.",
    who: "New owners, side hustlers, creators with momentum but no system.",
    features: [
      "Everything in Free",
      "Connect up to 3 socials",
      "Looking Glass — 1 actionable prompt per day",
      "Template starter pack (hooks, captions, replies)",
      "Community post access",
      "Monthly Q&A reply from Ryan",
    ],
    cta: { label: "Start the Starter plan", href: PAY.starter },
    icon: TrendingUp,
    tone: "cyan",
  },
  {
    slug: "pro",
    name: "Pro",
    price: "$197",
    cadence: "/mo",
    tagline: "Run the algorithm on purpose.",
    who: "$50K–$250K operators ready to act on data, not vibes.",
    features: [
      "Everything in Starter",
      "All social platforms connected",
      "Looking Glass — unlimited actionable prompts",
      "All template libraries",
      "Live monthly group office hours with Ryan",
      "All teaching modules (talk-to-text, Keyholes, AI when/when-not)",
    ],
    cta: { label: "Go Pro", href: PAY.pro },
    icon: Briefcase,
    tone: "brand",
    highlight: true,
  },
  {
    slug: "power",
    name: "Power",
    price: "$497",
    cadence: "/mo",
    tagline: "Direct access. Faster results.",
    who: "$250K–$1M operators who want a sharp second brain in their corner weekly.",
    features: [
      "Everything in Pro",
      "Weekly small-group office hours (12-person cap)",
      "Direct Voxer / Slack access to Ryan (1 business day)",
      "Quarterly 1:1 strategic review (60 min)",
      "Early access to new tools as they ship",
      "Priority Looking Glass features",
    ],
    cta: { label: "Step up to Power", href: PAY.power },
    icon: Zap,
    tone: "accent",
  },
  {
    slug: "vip",
    name: "1:1 with Ryan",
    price: "$1,997+",
    cadence: "/mo",
    tagline: "Ryan in the room for the consequential calls.",
    who: "$1M+ operators ready for a fractional operator, DFY social, FB Ads management, or VIP advisor.",
    features: [
      "Fractional Operator — $1,997/mo",
      "DFY Social Management — $2,497/mo",
      "Facebook Ads Management — $1,497/mo + 10% spend",
      "VIP Strategic Advisor — $24,000/yr (annual prepay)",
      "Custom packages built around your business",
      "Mutual NDA on every engagement",
    ],
    cta: { label: "Book the 10-min call", href: "/book?tier=vip" },
    icon: Crown,
    tone: "lead",
  },
];

const TONE = {
  slate:  { ring: "ring-slate-200",  bg: "bg-white",       text: "text-slate-700",  pill: "bg-slate-100 text-slate-700",  icon: "text-slate-600",  cta: "bg-slate-900 text-white hover:bg-slate-800" },
  cyan:   { ring: "ring-cyan-200",   bg: "bg-white",       text: "text-cyan-800",   pill: "bg-cyan-100 text-cyan-800",    icon: "text-cyan-600",   cta: "bg-cyan-600 text-white hover:bg-cyan-500" },
  brand:  { ring: "ring-brand-300",  bg: "bg-brand-50/40", text: "text-brand-800",  pill: "bg-brand-100 text-brand-800",  icon: "text-brand-600",  cta: "bg-brand-600 text-white hover:bg-brand-500" },
  accent: { ring: "ring-accent-300", bg: "bg-white",       text: "text-accent-700", pill: "bg-accent-100 text-accent-800",icon: "text-accent-600", cta: "bg-accent-500 text-slate-950 hover:bg-accent-400" },
  lead:   { ring: "ring-lead-400",   bg: "bg-white",       text: "text-lead-600",   pill: "bg-lead-400/15 text-lead-600", icon: "text-lead-500",   cta: "bg-slate-900 text-white hover:bg-slate-800" },
} as const;

export default function PricingPage() {
  return (
    <div className="min-h-screen bg-white text-slate-900">
      <header className="sticky top-0 z-40 border-b border-slate-200 bg-white/90 backdrop-blur">
        <div className="mx-auto max-w-6xl px-4 sm:px-6 py-3 flex items-center justify-between">
          <Link href="/" className="font-semibold text-slate-900 hover:text-slate-700">
            The LeadFlow Pro
          </Link>
          <nav className="hidden md:flex items-center gap-6 text-sm text-slate-600">
            <Link href="/grow" className="hover:text-slate-900">Grow</Link>
            <Link href="/start" className="hover:text-slate-900">Start (intake)</Link>
            <Link href="/book" className="hover:text-slate-900">Book a call</Link>
          </nav>
        </div>
      </header>

      <section className="mx-auto max-w-6xl px-4 sm:px-6 pt-12 pb-8 sm:pt-20 text-center">
        <div className="inline-flex items-center gap-2 rounded-full border border-slate-200 bg-slate-50 px-3 py-1 text-xs uppercase tracking-widest text-slate-600">
          5 tiers · cancel any month · no contracts
        </div>
        <h1 className="mt-4 text-4xl sm:text-5xl font-bold tracking-tight text-slate-950">
          Free to start. Affordable to grow.{" "}
          <span className="text-slate-500">Direct access when it's time.</span>
        </h1>
        <p className="mt-4 max-w-2xl mx-auto text-lg text-slate-700">
          The Free tier shows you what's possible. Starter gets the flow going. Pro runs the
          algorithm on purpose. Power gives you direct access. 1:1 with Ryan is for when your
          business is ready to be in the room with an operator.
        </p>
      </section>

      <section className="mx-auto max-w-7xl px-4 sm:px-6 pb-16">
        <div className="grid gap-5 lg:grid-cols-5">
          {TIERS.map((t) => {
            const tone = TONE[t.tone];
            const Icon = t.icon;
            return (
              <div
                key={t.slug}
                id={t.slug}
                className={`rounded-2xl ${tone.bg} ${tone.ring} ring-1 p-6 shadow-sm flex flex-col ${
                  t.highlight ? "ring-2 lg:scale-105" : ""
                }`}
              >
                {t.highlight && (
                  <span className={`inline-flex items-center gap-1.5 self-start rounded-full px-2.5 py-1 text-[11px] font-semibold uppercase tracking-widest ${tone.pill} mb-3`}>
                    Most popular
                  </span>
                )}
                <div className="flex items-center gap-2">
                  <Icon className={`h-5 w-5 ${tone.icon}`} />
                  <span className="text-xs uppercase tracking-widest text-slate-400 font-semibold">
                    {t.slug}
                  </span>
                </div>
                <h2 className="mt-3 text-2xl font-bold text-slate-950">{t.name}</h2>
                <div className="mt-1 flex items-baseline gap-1">
                  <span className="text-4xl font-bold text-slate-950">{t.price}</span>
                  <span className="text-sm text-slate-500">{t.cadence}</span>
                </div>
                <p className={`mt-2 text-sm font-semibold ${tone.text}`}>{t.tagline}</p>
                <p className="mt-2 text-xs text-slate-600">{t.who}</p>

                <ul className="mt-5 space-y-2 text-sm text-slate-800">
                  {t.features.map((f) => (
                    <li key={f} className="flex items-start gap-2">
                      <Check className={`mt-0.5 h-4 w-4 shrink-0 ${tone.icon}`} />
                      <span>{f}</span>
                    </li>
                  ))}
                </ul>

                {t.notIncluded && (
                  <ul className="mt-3 space-y-1.5 text-xs text-slate-500">
                    {t.notIncluded.map((f) => (
                      <li key={f} className="flex items-start gap-2">
                        <X className="mt-0.5 h-3.5 w-3.5 shrink-0 text-slate-400" />
                        <span>{f}</span>
                      </li>
                    ))}
                  </ul>
                )}

                <div className="mt-6 flex-1" />
                <Link
                  href={t.cta.href}
                  className={`inline-flex w-full items-center justify-center gap-2 rounded-xl px-4 py-2.5 text-sm font-semibold ${tone.cta}`}
                >
                  {t.cta.label} <ArrowRight className="h-4 w-4" />
                </Link>
              </div>
            );
          })}
        </div>
      </section>

      <section className="mx-auto max-w-5xl px-4 sm:px-6 pb-16">
        <h2 className="text-2xl sm:text-3xl font-bold text-slate-950 tracking-tight">
          Pricing FAQ
        </h2>
        <div className="mt-6 grid gap-4 md:grid-cols-2">
          <FAQ q="Is the Free tier really free, forever?">
            Yes. No credit card. No surprise charges. We make money when you upgrade because
            the value is real — not because we trapped you.
          </FAQ>
          <FAQ q="Can I cancel any time?">
            Yes. All recurring tiers cancel on 30-day notice. No long-term contracts. Annual
            prepay is available on the VIP tier only and refunds remaining quarters at retail.
          </FAQ>
          <FAQ q="Can I upgrade or downgrade later?">
            Yes — both directions, any time. Upgrades take effect immediately and prorate.
            Downgrades take effect at the next billing cycle.
          </FAQ>
          <FAQ q="What if I need something custom?">
            Book the 10-minute call. The VIP tier covers Fractional Operator, DFY Social, FB
            Ads, and the VIP Annual Advisor. Custom packages get built around your business.
          </FAQ>
        </div>
      </section>

      <section className="mx-auto max-w-5xl px-4 sm:px-6 pb-20">
        <div className="rounded-3xl border border-slate-200 bg-gradient-to-br from-cyan-50 via-white to-accent-50 p-8 sm:p-10 text-center shadow-sm">
          <h2 className="text-2xl sm:text-3xl font-bold tracking-tight text-slate-950">
            Not sure which tier? Take the 2-minute intake.
          </h2>
          <p className="mt-3 text-slate-700 max-w-2xl mx-auto">
            We route you to the right tier based on your stage, your goal, and your budget.
            No "contact sales" runaround.
          </p>
          <Link
            href="/start"
            className="mt-6 inline-flex items-center gap-2 rounded-xl bg-accent-500 px-6 py-3 font-semibold text-slate-950 shadow-sm hover:bg-accent-400"
          >
            Start the intake <ArrowRight className="h-4 w-4" />
          </Link>
        </div>
        <p className="mt-8 text-xs text-slate-500 text-center max-w-3xl mx-auto leading-relaxed">
          Operated by Real Ryan Nichols LLC, a Texas LLC. We do not guarantee specific
          outcomes — we deliver work product, strategic direction, tools, and access. Cancel
          any month with 30-day notice unless you've prepaid annually.
        </p>
      </section>
    </div>
  );
}

function FAQ({ q, children }: { q: string; children: React.ReactNode }) {
  return (
    <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
      <h3 className="font-semibold text-slate-950">{q}</h3>
      <p className="mt-2 text-sm text-slate-700">{children}</p>
    </div>
  );
}
