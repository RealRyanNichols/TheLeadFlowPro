// src/app/tiers/page.tsx — VISUAL DRAFT of the full price ladder.
//
// Not linked from nav yet. Ryan previews at /tiers, marks up what he likes /
// hates, then we promote (or replace /pricing).
//
// Structure: 4 tiers, each with 3-6 product cards. Light theme only. Brand
// colors only (cyan + accent + lead). Mobile-first. No rainbow gradients.
// Every card has: name, price, cadence, "best for" line, what's included
// (3-5 bullets), single CTA.

import Link from "next/link";
import {
  ArrowRight, BookOpen, Check, ChevronRight, Crown, GraduationCap,
  HeartHandshake, Mail, Megaphone, MessageSquare, Rocket, ShieldCheck,
  Sparkles, Star, Target, Trophy, Users, Wrench,
} from "lucide-react";

export const metadata = {
  title: "Pricing & Tiers — The LeadFlow Pro",
  description:
    "From $5 to $150K. Find the level that matches where you are right now. Built by Ryan Nichols — founder of The LeadFlow Pro, RepWatchr, Faretta.Legal, Faretta.AI, and Wholesale Universe.",
};

/* ─────────────────────────────────────────────────────────────────
   DATA
   ──────────────────────────────────────────────────────────────── */

type Card = {
  name: string;
  price: string;
  cadence: string;
  bestFor: string;
  inclusions: string[];
  cta: string;
  ctaHref: string;
  icon: any;
  highlight?: boolean;
  badge?: string;
};

const TIER_1: Card[] = [
  {
    name: "Mini Swipe File",
    price: "$5",
    cadence: "one-time",
    bestFor: "Anyone testing the waters",
    inclusions: [
      "5 hook templates for Reels / Shorts",
      "Instant PDF download",
      "Lifetime access",
    ],
    cta: "Buy now",
    ctaHref: "#",
    icon: Sparkles,
  },
  {
    name: "Cold DM Scripts Pack",
    price: "$27",
    cadence: "one-time",
    bestFor: "Creators who want their DMs to convert",
    inclusions: [
      "30 proven scripts (IG, X, FB, LinkedIn)",
      "Hook → Pitch → Close framework",
      "Editable Notion + PDF",
      "Lifetime access",
    ],
    cta: "Buy now",
    ctaHref: "#",
    icon: MessageSquare,
  },
  {
    name: "Algorithm Decoder Mini-Course",
    price: "$47",
    cadence: "one-time",
    bestFor: "First taste of how the algorithms actually work",
    inclusions: [
      "4 video lessons (90 min total)",
      "Why your posts are or aren't working",
      "Per-platform algorithm cheat sheet",
      "Lifetime access",
    ],
    cta: "Start the course",
    ctaHref: "#",
    icon: GraduationCap,
  },
  {
    name: "Self-Paced Community",
    price: "$97",
    cadence: "/month",
    bestFor: "Async learners who want all the courses + Ryan's playbooks",
    inclusions: [
      "Full course library access",
      "Monthly recorded Q&A from Ryan",
      "Private feed of Ryan's playbook drops",
      "Cancel any month",
    ],
    cta: "Join community",
    ctaHref: "#",
    icon: BookOpen,
  },
  {
    name: "Community Plus",
    price: "$197",
    cadence: "/month",
    bestFor: "Members who want a private line to Ryan, async",
    inclusions: [
      "Everything in $97 Community",
      "1 async DM to Ryan / month (48-hr reply)",
      "Early-access to new products",
      "Cancel any month",
    ],
    cta: "Upgrade to Plus",
    ctaHref: "#",
    icon: Mail,
    highlight: true,
    badge: "Most upgraded",
  },
  {
    name: "Flagship Self-Paced Course",
    price: "$497",
    cadence: "one-time",
    bestFor: "Serious solo founders ready to commit to the system",
    inclusions: [
      "Full From-Zero-to-10K course (12 videos)",
      "Every PDF and template included",
      "ONE 30-minute welcome call with Ryan",
      "Lifetime access + future updates",
    ],
    cta: "Enroll now",
    ctaHref: "#",
    icon: Trophy,
  },
];

const TIER_2: Card[] = [
  {
    name: "Audit & 90-Day Plan",
    price: "$497",
    cadence: "one-time",
    bestFor: "Owners doing $50K–$500K who feel busy but unclear",
    inclusions: [
      "Pre-call intake (offers, numbers, tools)",
      "60-min live audit with Ryan",
      "Written 12–18 page audit + 90-day action plan",
      "30-day follow-up check-in call",
      "Delivered in 7 business days",
    ],
    cta: "Book my audit",
    ctaHref: "/book",
    icon: Target,
  },
  {
    name: "Light 1:1 Retainer",
    price: "$1,997",
    cadence: "/month",
    bestFor: "Small biz owners who want strategic input every other week",
    inclusions: [
      "2 × 60-min calls per month",
      "Email access between calls (1-business-day reply)",
      "Monthly written priority brief",
      "30-day cancellation",
    ],
    cta: "Start retainer",
    ctaHref: "/book",
    icon: HeartHandshake,
    highlight: true,
    badge: "Best fit at $50K–$500K",
  },
  {
    name: "Working Session",
    price: "$2,997",
    cadence: "one-time",
    bestFor: "When you have one specific problem to crush in a single sit-down",
    inclusions: [
      "60-min deep-dive call with Ryan",
      "Live shared working doc",
      "Written follow-up + 3 next-step actions",
      "30-day async access for clarifying questions",
    ],
    cta: "Book the session",
    ctaHref: "/book",
    icon: Wrench,
  },
];

const TIER_3: Card[] = [
  {
    name: "Diagnostic + Strategic Plan",
    price: "$4,997",
    cadence: "one-time",
    bestFor: "Mid-market owners ($500K–$5M) before a major move",
    inclusions: [
      "Pre-call data pull + competitive scan",
      "Half-day (4-hr) working session with Ryan",
      "Written strategic plan: 3 priorities, 9 metrics, 1 thing to stop",
      "Mid-quarter 30-min check-in (free, included)",
    ],
    cta: "Schedule diagnostic",
    ctaHref: "/book",
    icon: Rocket,
  },
  {
    name: "Monthly Operator",
    price: "$4,997",
    cadence: "/month",
    bestFor: "Founders building a team and scaling past their own bandwidth",
    inclusions: [
      "4 × 60-min calls per month",
      "Direct text access Mon–Fri (1-day reply)",
      "Monthly P&L + KPI review call",
      "Quarterly strategic review included free",
      "30-day cancellation; 6-month prepay $24,985",
    ],
    cta: "Bring Ryan in",
    ctaHref: "/book",
    icon: Crown,
    highlight: true,
    badge: "Most requested",
  },
  {
    name: "4-Week 1:1 Sprint",
    price: "$9,997",
    cadence: "one-time",
    bestFor: "Compressed full attention — when you need to ship a launch fast",
    inclusions: [
      "8 × 60-min calls in 4 weeks (twice / week)",
      "Daily async access during sprint",
      "Specific deliverable defined at kickoff",
      "30-day post-sprint email support",
    ],
    cta: "Apply for sprint",
    ctaHref: "/book",
    icon: Star,
  },
];

const TIER_4: Card[] = [
  {
    name: "3-Month Strategic Project",
    price: "$50,000",
    cadence: "one-time",
    bestFor: "Defined-scope: turnaround, launch, M&A advisory",
    inclusions: [
      "Kickoff scoping call: success criteria locked",
      "~30 hrs of Ryan over 3 months",
      "Weekly 1:1 + async access",
      "Written milestone deliverable each month",
      "Travel-to-client billed separately",
    ],
    cta: "Apply",
    ctaHref: "/book",
    icon: ShieldCheck,
  },
  {
    name: "Annual Advisor",
    price: "$75,000",
    cadence: "/year (annual prepay)",
    bestFor: "Owners $1M+ who want Ryan in every consequential call",
    inclusions: [
      "12-month engagement",
      "5 hrs of Ryan per month (60 hrs/year)",
      "Direct phone access for true emergencies",
      "First look at every new LeadFlow Pro tool",
      "Cap: 2 active VIPs ever",
    ],
    cta: "Apply for VIP",
    ctaHref: "/book",
    icon: Crown,
    highlight: true,
    badge: "Premium",
  },
  {
    name: "Premier Annual",
    price: "$150,000",
    cadence: "/year (annual prepay)",
    bestFor: "Long-arc partnership for a single defining year",
    inclusions: [
      "Everything in Annual Advisor",
      "10 hrs of Ryan per month (120 hrs/year)",
      "2 in-person working days (client covers travel)",
      "Front-of-line on all new LeadFlow Pro builds",
      "Cap: 1 active Premier ever",
    ],
    cta: "Apply for Premier",
    ctaHref: "/book",
    icon: Trophy,
  },
];

/* ─────────────────────────────────────────────────────────────────
   PAGE
   ──────────────────────────────────────────────────────────────── */

export default function TiersPage() {
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

      {/* Preview banner — only shows because /tiers is a draft, not linked from nav */}
      <div className="border-b border-amber-200 bg-amber-50">
        <div className="mx-auto max-w-7xl px-4 py-2 text-xs text-amber-800 text-center">
          <strong>Preview draft</strong> — full price ladder for Ryan's review. Mark up what you like / hate, then we promote this to /pricing.
        </div>
      </div>

      {/* Hero */}
      <section className="bg-gradient-to-b from-white to-slate-50 border-b border-slate-200">
        <div className="mx-auto max-w-7xl px-4 py-12 sm:py-20 text-center">
          <div className="inline-flex items-center gap-2 rounded-full border border-cyan-200 bg-cyan-50 px-3 py-1 text-xs uppercase tracking-widest text-cyan-700">
            From $5 to $150,000
          </div>
          <h1 className="mt-5 text-4xl sm:text-6xl font-semibold tracking-tight text-slate-950">
            Pick where you are.{" "}
            <span className="bg-gradient-to-r from-brand-700 to-cyan-500 bg-clip-text text-transparent">
              We'll get you where you're going.
            </span>
          </h1>
          <p className="mt-5 max-w-3xl mx-auto text-lg text-slate-600">
            Four levels. Real prices. Same operator at every level. Built by Ryan Nichols —
            founder of The LeadFlow Pro, RepWatchr, Faretta.Legal, Faretta.AI, and Wholesale
            Universe. 75K+ followers built on the same playbook we'll teach you.
          </p>
          <div className="mt-8 flex flex-col sm:flex-row items-center justify-center gap-3">
            <a
              href="#tier-1"
              className="inline-flex items-center justify-center gap-2 rounded-xl border border-slate-300 bg-white px-5 py-3 font-semibold text-slate-800 hover:border-brand-500 hover:text-brand-700"
            >
              Just getting started <ChevronRight className="h-4 w-4" />
            </a>
            <a
              href="#tier-2"
              className="inline-flex items-center justify-center gap-2 rounded-xl border border-slate-300 bg-white px-5 py-3 font-semibold text-slate-800 hover:border-brand-500 hover:text-brand-700"
            >
              Small business <ChevronRight className="h-4 w-4" />
            </a>
            <a
              href="#tier-3"
              className="inline-flex items-center justify-center gap-2 rounded-xl border border-slate-300 bg-white px-5 py-3 font-semibold text-slate-800 hover:border-brand-500 hover:text-brand-700"
            >
              Mid-market <ChevronRight className="h-4 w-4" />
            </a>
            <a
              href="#tier-4"
              className="inline-flex items-center justify-center gap-2 rounded-xl bg-slate-900 px-5 py-3 font-semibold text-white hover:bg-slate-800"
            >
              Enterprise / VIP <ChevronRight className="h-4 w-4" />
            </a>
          </div>
        </div>
      </section>

      {/* Mindset bar */}
      <section className="bg-white border-b border-slate-200">
        <div className="mx-auto max-w-5xl px-4 py-10 grid gap-6 md:grid-cols-3">
          <div className="text-center md:text-left">
            <div className="text-3xl font-bold text-brand-700 tabular-nums">75K+</div>
            <div className="text-sm text-slate-600 mt-1">Followers built across 5 platforms</div>
          </div>
          <div className="text-center md:text-left">
            <div className="text-3xl font-bold text-brand-700 tabular-nums">5</div>
            <div className="text-sm text-slate-600 mt-1">Companies founded or co-founded</div>
          </div>
          <div className="text-center md:text-left">
            <div className="text-3xl font-bold text-brand-700 tabular-nums">10+</div>
            <div className="text-sm text-slate-600 mt-1">Years operating in social, ads, sales</div>
          </div>
        </div>
      </section>

      {/* TIER 1 */}
      <TierSection
        id="tier-1"
        eyebrow="TIER 1"
        title="Just getting started"
        subtitle="Pre-revenue or under $50K/yr. Mostly self-paced. One 1:1 call unlocks at $497."
        cards={TIER_1}
        accent="cyan"
      />

      {/* TIER 2 */}
      <TierSection
        id="tier-2"
        eyebrow="TIER 2"
        title="Small business"
        subtitle="$50K–$500K. Light 1:1 access. ~4 hours of Ryan per month at the retainer level."
        cards={TIER_2}
        accent="emerald"
      />

      {/* TIER 3 */}
      <TierSection
        id="tier-3"
        eyebrow="TIER 3"
        title="Mid-market"
        subtitle="$500K–$5M. Real strategic partnership. ~8 hours of Ryan per month at retainer."
        cards={TIER_3}
        accent="indigo"
      />

      {/* TIER 4 */}
      <TierSection
        id="tier-4"
        eyebrow="TIER 4"
        title="Enterprise / VIP"
        subtitle="$1M+. Premium 1:1 only — no workshops, no events. Capped seats."
        cards={TIER_4}
        accent="amber"
      />

      {/* Founder strip */}
      <section className="bg-slate-50 border-t border-slate-200">
        <div className="mx-auto max-w-5xl px-4 py-14">
          <div className="text-xs uppercase tracking-widest text-slate-500 text-center">
            What I've built
          </div>
          <h2 className="mt-2 text-2xl sm:text-3xl font-semibold text-slate-950 text-center">
            Same operator. Different problems. Same playbook.
          </h2>
          <div className="mt-8 grid gap-4 md:grid-cols-5 text-center">
            <FounderTile name="The LeadFlow Pro"  note="Founder · this site" />
            <FounderTile name="RepWatchr.com"     note="Founder" />
            <FounderTile name="Faretta.Legal"     note="Founder" />
            <FounderTile name="Faretta.AI"        note="Founder" />
            <FounderTile name="Wholesale Universe" note="Founder" />
          </div>
        </div>
      </section>

      {/* Final CTA */}
      <section className="bg-white">
        <div className="mx-auto max-w-4xl px-4 py-16 text-center">
          <h2 className="text-2xl sm:text-3xl font-semibold text-slate-950">
            Don't know which tier? Book the 10-minute call.
          </h2>
          <p className="mt-3 text-slate-600">
            Free. Reserved for serious buyers. We'll know in 10 minutes which level fits you.
          </p>
          <Link
            href="/book"
            className="mt-6 inline-flex items-center justify-center gap-2 rounded-xl bg-accent-500 px-6 py-3 font-semibold text-white shadow-sm hover:bg-accent-600"
          >
            Book my 10-min call <ArrowRight className="h-4 w-4" />
          </Link>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t border-slate-200 bg-slate-50">
        <div className="mx-auto max-w-7xl px-4 py-8 text-xs text-slate-500 grid gap-4 md:grid-cols-2">
          <div>
            The LeadFlow Pro · A Real Ryan Nichols LLC company · Texas-governed under
            mutual NDA on every paid engagement. We do not guarantee specific revenue,
            growth, or business outcomes.
          </div>
          <div className="md:text-right space-x-4">
            <Link href="/grow" className="hover:text-slate-900">Grow</Link>
            <Link href="/services" className="hover:text-slate-900">Services</Link>
            <Link href="/services/consulting" className="hover:text-slate-900">Consulting</Link>
            <Link href="/book" className="hover:text-slate-900">Book a call</Link>
          </div>
        </div>
      </footer>
    </div>
  );
}

/* ─────────────────────────────────────────────────────────────────
   COMPONENTS
   ──────────────────────────────────────────────────────────────── */

function TierSection({
  id, eyebrow, title, subtitle, cards, accent,
}: {
  id: string;
  eyebrow: string;
  title: string;
  subtitle: string;
  cards: Card[];
  accent: "cyan" | "emerald" | "indigo" | "amber";
}) {
  const accentColors = {
    cyan:    { eyebrow: "text-cyan-700",    border: "border-cyan-200",    bg: "bg-cyan-50" },
    emerald: { eyebrow: "text-emerald-700", border: "border-emerald-200", bg: "bg-emerald-50" },
    indigo:  { eyebrow: "text-indigo-700",  border: "border-indigo-200",  bg: "bg-indigo-50" },
    amber:   { eyebrow: "text-amber-700",   border: "border-amber-200",   bg: "bg-amber-50" },
  }[accent];

  return (
    <section id={id} className="bg-white border-b border-slate-200">
      <div className="mx-auto max-w-7xl px-4 py-14 sm:py-20">
        <div className="mb-8 sm:mb-10">
          <div className={`inline-flex items-center gap-2 rounded-full border ${accentColors.border} ${accentColors.bg} px-3 py-1 text-xs uppercase tracking-widest ${accentColors.eyebrow}`}>
            {eyebrow}
          </div>
          <h2 className="mt-3 text-3xl sm:text-4xl font-semibold tracking-tight text-slate-950">
            {title}
          </h2>
          <p className="mt-2 text-slate-600 max-w-3xl">{subtitle}</p>
        </div>

        <div className="grid gap-5 md:grid-cols-2 lg:grid-cols-3">
          {cards.map((c) => (
            <ProductCard key={c.name} card={c} />
          ))}
        </div>
      </div>
    </section>
  );
}

function ProductCard({ card }: { card: Card }) {
  const Icon = card.icon;
  return (
    <div
      className={`relative flex flex-col rounded-2xl border bg-white p-6 shadow-sm transition-shadow hover:shadow-md ${
        card.highlight ? "border-brand-500 ring-1 ring-brand-200" : "border-slate-200"
      }`}
    >
      {card.badge && (
        <span className="absolute -top-3 left-6 inline-flex items-center gap-1.5 rounded-full bg-brand-600 px-3 py-1 text-xs font-semibold text-white shadow">
          <Star className="h-3 w-3" /> {card.badge}
        </span>
      )}
      <div className="inline-flex h-11 w-11 items-center justify-center rounded-xl bg-slate-900 text-white">
        <Icon className="h-5 w-5" />
      </div>
      <h3 className="mt-4 text-xl font-semibold text-slate-950">{card.name}</h3>
      <div className="mt-1 flex items-baseline gap-1">
        <span className="text-3xl font-bold text-slate-950 tabular-nums">{card.price}</span>
        <span className="text-sm text-slate-500">{card.cadence}</span>
      </div>
      <div className="mt-3 rounded-lg border border-slate-200 bg-slate-50 px-3 py-2">
        <div className="text-[11px] uppercase tracking-widest text-slate-500">Best for</div>
        <div className="mt-0.5 text-sm text-slate-700">{card.bestFor}</div>
      </div>
      <ul className="mt-4 space-y-2">
        {card.inclusions.map((d) => (
          <li key={d} className="flex items-start gap-2 text-sm text-slate-700">
            <Check className="mt-0.5 h-4 w-4 shrink-0 text-lead-600" />
            <span>{d}</span>
          </li>
        ))}
      </ul>
      <Link
        href={card.ctaHref}
        className="mt-auto pt-6"
      >
        <span className="inline-flex w-full items-center justify-center gap-2 rounded-xl bg-slate-900 px-4 py-2.5 text-sm font-semibold text-white hover:bg-slate-800">
          {card.cta} <ArrowRight className="h-4 w-4" />
        </span>
      </Link>
    </div>
  );
}

function FounderTile({ name, note }: { name: string; note: string }) {
  return (
    <div className="rounded-xl border border-slate-200 bg-white p-3 shadow-sm">
      <div className="text-sm font-semibold text-slate-900">{name}</div>
      <div className="mt-0.5 text-xs text-slate-500">{note}</div>
    </div>
  );
}
