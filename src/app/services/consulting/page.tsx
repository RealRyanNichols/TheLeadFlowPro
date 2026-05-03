// src/app/services/consulting/page.tsx — Business Consulting sales page.
//
// Sister page to /services (social-growth). Same dark, mobile-first aesthetic.
// Ladder, top to bottom:
//   Free Discovery Call (top of every funnel)
//   MICRO   $97   90-Minute Decision Sprint        (one-time)
//   MICRO   $297  Business Audit                    (one-time, written deliverable)
//   ONE-OFF $1,997 AI / Automation Build Sprint    (10-day implementation)
//   WEEKLY  $297/mo Office Hours (group)            (recurring, scalable)
//   MONTHLY $1,997/mo Fractional Operator           (ongoing 1:1)
//   QUARTERLY $1,497/qtr Quarterly Business Review  (recurring quarterly)
//   ANNUAL  $24,000/yr VIP Strategic Advisor        (premium, long arc)
//
// Same legal posture as /services: Texas-law, REAL RYAN NICHOLS LLC,
// no guaranteed outcomes. CTAs are mailto: until Stripe Payment Links land.

import Link from "next/link";
import {
  ArrowRight, Bot, Calendar, Check, Compass, GraduationCap, Mail,
  Quote, Rocket, ShieldCheck, Sparkles, TrendingUp, Users,
} from "lucide-react";

export const metadata = {
  title: "Business Consulting — The LeadFlow Pro",
  description:
    "Strategic consulting from Ryan Nichols (75K+ across 5 platforms). Audits, AI/automation builds, weekly office hours, monthly fractional operator, quarterly reviews, and VIP advisor relationships — sold one-time, weekly, monthly, quarterly, and annually.",
};

const RYAN_EMAIL = "theflashflash24@gmail.com";
const mailto = (subject: string) =>
  `mailto:${RYAN_EMAIL}?subject=${encodeURIComponent(subject)}`;

type Pkg = {
  slug: string;
  name: string;
  price: string;
  cadence: string;             // "one-time", "/mo", "/qtr", "/yr"
  cadenceTone: "indigo" | "emerald" | "amber" | "violet" | "rose" | "cyan";
  one_liner: string;
  who: string;
  deliverables: string[];
  cta: string;
  cta_href: string;
  icon: any;
  highlight?: boolean;
};

const PACKAGES: Pkg[] = [
  {
    slug: "decision-sprint",
    name: "90-Minute Decision Sprint",
    price: "$97",
    cadence: "one-time",
    cadenceTone: "cyan",
    one_liner:
      "One specific decision, fully unpacked in 90 minutes — pricing, hire, offer, market move, tech stack call, anything that's been stuck for weeks.",
    who: "Owners with one acute decision they want a sharp second brain on, fast. Not a discovery call — a working session.",
    deliverables: [
      "90-minute private video call with Ryan",
      "Live whiteboard / shared doc capturing the working memory",
      "Written one-pager within 24 hours: the recommendation + the 3 reasons + the next 3 actions",
      "Recording delivered same day",
    ],
    cta: "Book the sprint",
    cta_href: mailto("90-Minute Decision Sprint — $97"),
    icon: Compass,
  },
  {
    slug: "business-audit",
    name: "Business Audit & 90-Day Plan",
    price: "$297",
    cadence: "one-time",
    cadenceTone: "cyan",
    one_liner:
      "A full read on your offer, your numbers, your tech stack, your social, and your time. Written 90-day plan you own and can run yourself or hand to your team.",
    who: "Owners doing $50K–$1M who feel busy but unclear on where the leverage is. Coaches, consultants, agencies, local service businesses, creators monetizing followings.",
    deliverables: [
      "Pre-call intake (offers, P&L summary, tools, traffic sources)",
      "60-minute live audit + working session with Ryan",
      "Written 12–18 page audit document (PDF + editable Notion / Doc)",
      "90-day prioritized action plan: what to do, in what order, by whom",
      "30-day follow-up check-in call (free, included)",
      "Delivered in 7 business days",
    ],
    cta: "Get my audit",
    cta_href: mailto("Business Audit & 90-Day Plan — $297"),
    icon: TrendingUp,
    highlight: true,
  },
  {
    slug: "ai-automation-build",
    name: "AI / Automation Build Sprint",
    price: "$1,997",
    cadence: "one-time",
    cadenceTone: "violet",
    one_liner:
      "Pick the one workflow eating the most time — lead intake, content posting, follow-up sequences, AI assistant, dashboard. We build it, ship it, train your team.",
    who: "Owners who know what to automate but don't have the time, the team, or the technical skill to ship it themselves.",
    deliverables: [
      "Kickoff scoping call: agree on the exact workflow + success criteria",
      "10-day build window using your existing stack (or LeadFlow Pro)",
      "End-to-end implementation: triggers, AI prompts, integrations, error handling",
      "30-minute team training + recorded walkthrough",
      "30 days of email support after launch",
      "Optional $497/mo 'Care' add-on for ongoing tuning",
    ],
    cta: "Build it for me",
    cta_href: mailto("AI / Automation Build Sprint — $1,997"),
    icon: Bot,
  },
  {
    slug: "office-hours",
    name: "Weekly Office Hours (Group)",
    price: "$297",
    cadence: "/mo",
    cadenceTone: "emerald",
    one_liner:
      "One 75-minute Zoom every week with Ryan and a small cohort of operators. Bring one question, get group feedback, hear five other owners' problems for free.",
    who: "Solo operators and small-team owners who want strategic firepower without a private retainer's price tag.",
    deliverables: [
      "4 × 75-minute group calls per month",
      "Cohort capped at 12 owners (you get real airtime)",
      "Recordings + transcript posted within 24 hours",
      "Private Slack channel between calls",
      "Monthly guest expert (rotates: ads, hiring, finance, AI, content)",
      "30-day cancellation, no contract",
    ],
    cta: "Join the room",
    cta_href: mailto("Weekly Office Hours — $297/mo"),
    icon: Users,
  },
  {
    slug: "fractional-operator",
    name: "Fractional Operator",
    price: "$1,997",
    cadence: "/mo",
    cadenceTone: "indigo",
    one_liner:
      "Ryan as your part-time operator — weekly 1:1, async access Mon–Fri, hands on offer / pricing / hiring / numbers / next-quarter plan. We make the calls together.",
    who: "Owners $250K–$2M who need executive-level strategic partnership without a full-time hire. Founders building a team and scaling past their own bandwidth.",
    deliverables: [
      "1 × 60-minute strategy call per week (4/mo)",
      "Direct text access via Voxer / Slack, Mon–Fri (1 business day response)",
      "Monthly P&L + KPI review call",
      "Quarterly Business Review included (no extra charge)",
      "Hiring scorecards, offer redesigns, ad-budget approvals — anything strategic",
      "30-day cancellation, no long-term contract. 6-month prepay $9,985 (saves a month).",
    ],
    cta: "Bring Ryan in",
    cta_href: mailto("Fractional Operator — $1,997/mo"),
    icon: Rocket,
    highlight: true,
  },
  {
    slug: "quarterly-review",
    name: "Quarterly Business Review",
    price: "$1,497",
    cadence: "/qtr",
    cadenceTone: "amber",
    one_liner:
      "Every 90 days: pre-call analysis, half-day working session, written quarter-plan. The single most useful recurring rhythm for serious operators.",
    who: "Owners who already have execution muscle and need a rhythm of strategic re-leveling, not weekly tactical input.",
    deliverables: [
      "Pre-call data pull (you send numbers; we do the analysis)",
      "Half-day (4-hour) working session with Ryan",
      "Written quarter-plan: 3 priorities, 9 metrics to watch, 1 thing to stop doing",
      "Mid-quarter 30-min check-in call",
      "Cancel any quarter; pay-as-you-go is fine",
    ],
    cta: "Schedule next QBR",
    cta_href: mailto("Quarterly Business Review — $1,497/qtr"),
    icon: Calendar,
  },
  {
    slug: "vip-annual",
    name: "VIP Strategic Advisor",
    price: "$24,000",
    cadence: "/yr",
    cadenceTone: "rose",
    one_liner:
      "A long-arc relationship. Annual prepay, weekly access, deep involvement in every strategic decision for 12 months. Capped at 3 active VIPs.",
    who: "Owners $1M+ who want Ryan in the room for the consequential calls — and want the discount that comes from full-year commitment.",
    deliverables: [
      "Everything in Fractional Operator, for 12 months",
      "2 in-person working days per year (DFW or your city, you cover travel)",
      "Direct phone access (not just text) for true emergencies",
      "First look at every new LeadFlow Pro feature, free for the year",
      "Annual prepay only. Effective rate: $2,000/mo (vs $1,997/mo retail saves a month + perks).",
    ],
    cta: "Apply for VIP",
    cta_href: mailto("VIP Strategic Advisor — $24,000/yr"),
    icon: ShieldCheck,
  },
];

const CADENCE_TONE = {
  cyan:    "border-cyan-400/30 bg-cyan-500/[0.06] text-cyan-200",
  violet:  "border-violet-400/30 bg-violet-500/[0.06] text-violet-200",
  emerald: "border-emerald-400/30 bg-emerald-500/[0.06] text-emerald-200",
  indigo:  "border-indigo-400/30 bg-indigo-500/[0.06] text-indigo-200",
  amber:   "border-amber-400/30 bg-amber-500/[0.06] text-amber-200",
  rose:    "border-rose-400/30 bg-rose-500/[0.06] text-rose-200",
};

const FAQS = [
  {
    q: "How is this different from your social-growth services?",
    a: "Social-growth services (/services) are about getting more qualified followers and leads — audit, content, funnels, ads. Consulting is about the rest of the business — offers, pricing, ops, hiring, automation, decision-making. Many clients use both.",
  },
  {
    q: "Do you do equity or commission deals?",
    a: "No. Cash-only engagements keep the incentives clean and the relationship honest. If you want skin in the game, the VIP Annual is structured around long-arc commitment instead.",
  },
  {
    q: "Can I move between tiers?",
    a: "Yes. Many clients start with a 90-Minute Sprint or Business Audit, then upgrade to Office Hours or Fractional Operator. Quarterly Reviews can be added on top of any monthly tier.",
  },
  {
    q: "What kinds of businesses do you work with?",
    a: "Coaches, consultants, agencies, local service businesses (mortgage, real estate, contractors, fitness, beauty), creators monetizing followings, course / community founders, e-commerce founders under $5M. If you have a clear offer and a real customer, we can probably help.",
  },
  {
    q: "Do you sign NDAs?",
    a: "Yes — every paid engagement is governed by a Texas-law NDA covering both directions. Sample available on request before you book.",
  },
  {
    q: "What if I just want to talk first?",
    a: "Book the free Discovery Call (top of this page). 20 minutes, no pitch. We'll know quickly whether we're a fit and which tier makes sense.",
  },
];

export default function ConsultingPage() {
  return (
    <div className="min-h-screen bg-ink-950 text-ink-100">
      {/* Header strip */}
      <div className="border-b border-white/10 bg-ink-950/70 backdrop-blur">
        <div className="mx-auto max-w-6xl px-4 py-3 flex items-center justify-between text-sm">
          <Link href="/" className="font-semibold text-ink-100 hover:text-white">
            The LeadFlow Pro
          </Link>
          <div className="flex items-center gap-3">
            <Link href="/services" className="text-ink-300 hover:text-white">
              Social Growth →
            </Link>
            <Link
              href="#discovery"
              className="hidden sm:inline-flex items-center gap-1.5 rounded-full border border-emerald-400/30 bg-emerald-500/10 px-3 py-1.5 text-emerald-200 hover:bg-emerald-500/20"
            >
              Free Discovery Call <ArrowRight className="h-3.5 w-3.5" />
            </Link>
          </div>
        </div>
      </div>

      {/* Hero */}
      <section className="mx-auto max-w-6xl px-4 pt-12 pb-10 sm:pt-20 sm:pb-14">
        <div className="inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/[0.03] px-3 py-1 text-xs uppercase tracking-widest text-ink-400">
          Built by Ryan Nichols · 75K+ across 5 platforms
        </div>
        <h1 className="mt-4 text-3xl sm:text-5xl font-semibold tracking-tight text-white">
          Strategic consulting on{" "}
          <span className="text-violet-300">your business, your offers, your team —</span>{" "}
          weekly, monthly, quarterly, or one-time.
        </h1>
        <p className="mt-5 max-w-2xl text-base sm:text-lg text-ink-300">
          Pick the cadence that fits your stage. A $97 sprint to unstick a single decision, a
          $297 audit if you want clarity in writing, a weekly group room, a monthly fractional
          operator, a quarterly business review — or an annual advisor relationship for owners
          $1M+. Every engagement starts with a free 20-minute Discovery Call.
        </p>

        {/* Cadence selector */}
        <div className="mt-8 grid gap-3 sm:grid-cols-4">
          <CadencePill href="#cadence-onetime" label="One-time" sub="$97 · $297 · $1,997" tone="cyan" />
          <CadencePill href="#cadence-weekly"  label="Weekly"   sub="$297/mo group room"   tone="emerald" />
          <CadencePill href="#cadence-monthly" label="Monthly"  sub="$1,997/mo fractional" tone="indigo" />
          <CadencePill href="#cadence-long"    label="Qtr / Annual" sub="$1,497/qtr · $24K/yr" tone="rose" />
        </div>
      </section>

      {/* Discovery Call */}
      <section id="discovery" className="mx-auto max-w-6xl px-4 pb-12">
        <div className="rounded-3xl border border-emerald-400/30 bg-gradient-to-br from-emerald-500/[0.08] to-emerald-500/[0.02] p-6 sm:p-8">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
            <div>
              <div className="inline-flex items-center gap-2 rounded-full border border-emerald-400/30 bg-emerald-500/10 px-3 py-1 text-xs text-emerald-200">
                Free · 20 minutes · No pitch
              </div>
              <h2 className="mt-3 text-xl sm:text-2xl font-semibold text-white">
                Strategic Discovery Call
              </h2>
              <p className="mt-2 max-w-2xl text-ink-300">
                One call, one-page write-up of the highest-leverage move you can make in the next
                30 days, and a clear read on which cadence (one-time, weekly, monthly, quarterly,
                annual) actually fits your stage.
              </p>
            </div>
            <a
              href={mailto("Free Discovery Call — Strategic Consulting")}
              className="inline-flex w-full sm:w-auto items-center justify-center gap-2 rounded-xl bg-emerald-500 px-5 py-3 font-semibold text-emerald-950 hover:bg-emerald-400"
            >
              Book your call <ArrowRight className="h-4 w-4" />
            </a>
          </div>
        </div>
      </section>

      {/* One-time */}
      <section id="cadence-onetime" className="mx-auto max-w-6xl px-4 pb-12">
        <SectionHeader eyebrow="One-time" title="Single deliverable, fast turnaround" />
        <div className="grid gap-5 md:grid-cols-2 lg:grid-cols-3">
          <PackageCard pkg={PACKAGES[0]} />
          <PackageCard pkg={PACKAGES[1]} />
          <PackageCard pkg={PACKAGES[2]} />
        </div>
      </section>

      {/* Weekly */}
      <section id="cadence-weekly" className="mx-auto max-w-6xl px-4 pb-12">
        <SectionHeader eyebrow="Weekly" title="Recurring rhythm, group leverage" />
        <div className="grid gap-5">
          <PackageCard pkg={PACKAGES[3]} />
        </div>
      </section>

      {/* Monthly */}
      <section id="cadence-monthly" className="mx-auto max-w-6xl px-4 pb-12">
        <SectionHeader eyebrow="Monthly" title="Private retainer, executive partnership" />
        <div className="grid gap-5">
          <PackageCard pkg={PACKAGES[4]} />
        </div>
      </section>

      {/* Quarterly + Annual */}
      <section id="cadence-long" className="mx-auto max-w-6xl px-4 pb-12">
        <SectionHeader eyebrow="Long arc" title="Quarterly review · annual advisor" />
        <div className="grid gap-5 md:grid-cols-2">
          <PackageCard pkg={PACKAGES[5]} />
          <PackageCard pkg={PACKAGES[6]} />
        </div>
      </section>

      {/* Why Ryan */}
      <section className="mx-auto max-w-6xl px-4 pb-12">
        <div className="rounded-3xl border border-white/10 bg-white/[0.02] p-6 sm:p-10">
          <SectionHeader eyebrow="Why Ryan" title="Operator first, advisor second." />
          <div className="grid gap-6 md:grid-cols-3 mt-2">
            <Stat label="X / Twitter" value="43.8K" />
            <Stat label="Facebook"    value="18.9K" />
            <Stat label="YouTube"     value="12K+" />
          </div>
          <p className="mt-6 text-ink-300 max-w-3xl">
            What you're hiring is the operator who built and runs The LeadFlow Pro and a 75K+
            personal audience across five platforms — applied to your business, your numbers,
            and your decisions. No frameworks I haven't used in real money.
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
        <div className="rounded-3xl border border-white/10 bg-gradient-to-br from-violet-500/[0.08] via-cyan-500/[0.04] to-emerald-500/[0.06] p-6 sm:p-10 text-center">
          <h2 className="text-2xl sm:text-3xl font-semibold text-white">
            Pick a cadence, or just book the call.
          </h2>
          <p className="mt-3 text-ink-300 max-w-2xl mx-auto">
            20 minutes is all it takes to know whether we're a fit and which package
            actually moves your business forward.
          </p>
          <div className="mt-6 flex flex-col sm:flex-row items-center justify-center gap-3">
            <a
              href={mailto("Free Discovery Call — Strategic Consulting")}
              className="inline-flex items-center gap-2 rounded-xl bg-emerald-500 px-5 py-3 font-semibold text-emerald-950 hover:bg-emerald-400"
            >
              Book the free call <ArrowRight className="h-4 w-4" />
            </a>
            <Link
              href="/services"
              className="inline-flex items-center gap-2 rounded-xl border border-white/15 bg-white/[0.03] px-5 py-3 font-semibold text-ink-100 hover:bg-white/[0.06]"
            >
              <Sparkles className="h-4 w-4" /> See Social Growth services
            </Link>
            <a
              href={mailto("Question about LeadFlow consulting")}
              className="inline-flex items-center gap-2 rounded-xl border border-white/15 bg-white/[0.03] px-5 py-3 font-semibold text-ink-100 hover:bg-white/[0.06]"
            >
              <Mail className="h-4 w-4" /> Email a question
            </a>
          </div>
        </div>

        {/* Disclosure */}
        <p className="mt-8 text-xs text-ink-400 max-w-3xl mx-auto text-center leading-relaxed">
          All consulting engagements are sold by Real Ryan Nichols LLC, a Texas limited liability
          company, and are governed by Texas law under a mutual NDA. We do not guarantee specific
          revenue, growth, or business outcomes — what we deliver is the work product, strategic
          direction, and decision support described in each package. All recurring tiers cancel on
          30-day notice unless prepaid.
        </p>
      </section>
    </div>
  );
}

/* ────────────────────────────────────────────────────────────── */

function CadencePill({
  href, label, sub, tone,
}: { href: string; label: string; sub: string; tone: keyof typeof CADENCE_TONE }) {
  const t = CADENCE_TONE[tone];
  return (
    <a
      href={href}
      className={`group rounded-2xl border bg-white/[0.02] p-4 hover:bg-white/[0.04] ${t}`}
    >
      <div className="text-xs uppercase tracking-widest opacity-90">Cadence</div>
      <div className="mt-1 font-semibold text-white">{label}</div>
      <div className="mt-1 text-sm text-ink-300">{sub}</div>
    </a>
  );
}

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

function PackageCard({ pkg }: { pkg: Pkg }) {
  const Icon = pkg.icon;
  const tone = CADENCE_TONE[pkg.cadenceTone];
  return (
    <div
      className={`rounded-2xl border bg-white/[0.02] p-6 ${
        pkg.highlight
          ? "border-emerald-400/40 ring-1 ring-emerald-400/20"
          : "border-white/10"
      }`}
    >
      <div className="flex items-start justify-between gap-3">
        <div className={`inline-flex h-10 w-10 items-center justify-center rounded-xl border ${tone}`}>
          <Icon className="h-5 w-5" />
        </div>
        <span className={`inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-[11px] uppercase tracking-widest ${tone}`}>
          {pkg.cadence}
        </span>
      </div>
      <h3 className="mt-4 text-lg font-semibold text-white">{pkg.name}</h3>
      <div className="mt-1 flex items-baseline gap-1">
        <span className="text-2xl font-bold text-white">{pkg.price}</span>
        {pkg.cadence !== "one-time" && (
          <span className="text-sm text-ink-400">{pkg.cadence}</span>
        )}
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
