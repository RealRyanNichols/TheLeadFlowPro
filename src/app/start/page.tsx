// src/app/start/page.tsx
// Offer router for serious buyers. The customer answers once; /api/intake
// stores the context and redirects to the best-fit live offer page.

import Link from "next/link";
import type { ReactNode } from "react";
import type { LucideIcon } from "lucide-react";
import {
  ArrowRight,
  BadgeCheck,
  BarChart3,
  Briefcase,
  CalendarClock,
  Check,
  ClipboardCheck,
  Clock,
  Compass,
  FileText,
  Megaphone,
  MessageSquareText,
  PenLine,
  Rocket,
  ShieldCheck,
  Sparkles,
  Target,
  TrendingUp,
  Users,
  Wrench,
  Zap,
} from "lucide-react";
import { LightFooter, LightHeader } from "@/components/site/LightHeader";
import { VisitorIdField } from "@/components/site/VisitorIdField";
import { OFFERS, type OfferSlug } from "@/lib/offers";
import {
  BUDGET_OPTIONS,
  PRIMARY_NEED_OPTIONS,
  URGENCY_OPTIONS,
  WORK_STYLE_OPTIONS,
  type BudgetTier,
  type PrimaryNeed,
  type Urgency,
  type WorkStyle,
} from "@/lib/offer-recommendation";
import { formatHours, getOfferWorkload } from "@/lib/workload";
import { createSeoMetadata } from "@/lib/seo-metadata";

export const metadata = createSeoMetadata({
  title: "Start Here - Pick Your Service · The LeadFlow Pro",
  description:
    "Answer a few practical questions and get routed to the LeadFlow Pro offer that fits your problem, budget, and urgency.",
  path: "/start",
  imageTitle: "Find Your Next Move",
  imageSubtitle: "Answer once. Get routed to the cleanest offer for your problem, budget, and urgency.",
});

const NEED_ICONS: Record<PrimaryNeed, LucideIcon> = {
  "next-post": PenLine,
  "one-decision": Compass,
  audit: ClipboardCheck,
  "working-session": Wrench,
  "managed-social": TrendingUp,
  ads: Megaphone,
  operator: Briefcase,
  advisor: BadgeCheck,
};

const STYLE_ICONS: Record<WorkStyle, LucideIcon> = {
  "quick-answer": Zap,
  "written-review": FileText,
  "hands-on-build": Wrench,
  "done-for-you": Rocket,
  advisor: Users,
};

const BUDGET_ICONS: Record<BudgetTier, LucideIcon> = {
  "under-100": Sparkles,
  "100-500": Target,
  "500-2000": TrendingUp,
  "2000-5000": Briefcase,
  "5000-10000": Rocket,
  "10000-plus": BadgeCheck,
};

const URGENCY_ICONS: Record<Urgency, LucideIcon> = {
  today: Zap,
  "this-week": Clock,
  "this-month": CalendarClock,
  planning: BarChart3,
};

const OPTION_TONES: Record<string, { card: string; icon: string; badge: string }> = {
  "next-post": {
    card: "hover:border-accent-400 hover:bg-accent-300/10 peer-checked:border-accent-500 peer-checked:bg-accent-300/15 peer-checked:ring-accent-500/25",
    icon: "bg-accent-500 text-white group-hover:bg-accent-600",
    badge: "bg-accent-300/25 text-slate-900",
  },
  "one-decision": {
    card: "hover:border-cyan-400 hover:bg-cyan-50/60 peer-checked:border-cyan-600 peer-checked:bg-cyan-50 peer-checked:ring-cyan-500/25",
    icon: "bg-cyan-600 text-white group-hover:bg-cyan-700",
    badge: "bg-cyan-100 text-cyan-900",
  },
  audit: {
    card: "hover:border-brand-400 hover:bg-brand-50/70 peer-checked:border-brand-600 peer-checked:bg-brand-50 peer-checked:ring-brand-500/25",
    icon: "bg-brand-700 text-white group-hover:bg-brand-800",
    badge: "bg-brand-100 text-brand-900",
  },
  "working-session": {
    card: "hover:border-slate-500 hover:bg-slate-50 peer-checked:border-slate-800 peer-checked:bg-slate-100 peer-checked:ring-slate-700/20",
    icon: "bg-slate-950 text-white group-hover:bg-slate-800",
    badge: "bg-slate-200 text-slate-900",
  },
  "managed-social": {
    card: "hover:border-cyan-400 hover:bg-cyan-50/60 peer-checked:border-cyan-600 peer-checked:bg-cyan-50 peer-checked:ring-cyan-500/25",
    icon: "bg-gradient-to-br from-brand-700 to-cyan-500 text-white",
    badge: "bg-cyan-100 text-cyan-900",
  },
  ads: {
    card: "hover:border-accent-400 hover:bg-accent-300/10 peer-checked:border-accent-500 peer-checked:bg-accent-300/15 peer-checked:ring-accent-500/25",
    icon: "bg-gradient-to-br from-accent-600 to-accent-400 text-white",
    badge: "bg-accent-300/25 text-slate-900",
  },
  operator: {
    card: "hover:border-brand-400 hover:bg-brand-50/70 peer-checked:border-brand-600 peer-checked:bg-brand-50 peer-checked:ring-brand-500/25",
    icon: "bg-brand-800 text-white group-hover:bg-brand-900",
    badge: "bg-brand-100 text-brand-900",
  },
  advisor: {
    card: "hover:border-slate-500 hover:bg-slate-50 peer-checked:border-slate-800 peer-checked:bg-slate-100 peer-checked:ring-slate-700/20",
    icon: "bg-slate-950 text-white group-hover:bg-slate-800",
    badge: "bg-slate-200 text-slate-900",
  },
};

function optionTone(value: string) {
  return OPTION_TONES[value] ?? {
    card: "hover:border-cyan-400 hover:bg-cyan-50/40 peer-checked:border-cyan-600 peer-checked:bg-cyan-50 peer-checked:ring-cyan-500/25",
    icon: "bg-slate-950 text-white group-hover:bg-brand-700",
    badge: "bg-slate-100 text-slate-700",
  };
}

const REVENUE_OPTIONS = [
  { value: "pre-revenue", title: "Pre-revenue", body: "Offer is still being shaped." },
  { value: "under-10k", title: "Under $10K/mo", body: "Early traction." },
  { value: "10-50k", title: "$10K-$50K/mo", body: "Building consistency." },
  { value: "50-250k", title: "$50K-$250K/mo", body: "Scaling what works." },
  { value: "250k-plus", title: "$250K+/mo", body: "Protecting and compounding." },
];

const CONTACT_METHODS = [
  { value: "email", label: "Email" },
  { value: "phone", label: "Phone call" },
  { value: "text", label: "Text" },
  { value: "any", label: "Any of the above" },
];

const PLATFORMS = [
  { name: "platforms.tiktok", label: "TikTok", placeholder: "@your_handle", tone: "#111827" },
  { name: "platforms.facebook", label: "Facebook", placeholder: "Page name or URL", tone: "#1273e8" },
  { name: "platforms.x", label: "X / Twitter", placeholder: "@your_handle", tone: "#0a1d3f" },
  { name: "platforms.youtube", label: "YouTube", placeholder: "Channel name or URL", tone: "#f07a10" },
  { name: "platforms.instagram", label: "Instagram", placeholder: "@your_handle", tone: "#ff9a1f" },
  { name: "platforms.linkedin", label: "LinkedIn", placeholder: "Profile or company URL", tone: "#0099e0" },
];

const SERVICE_PICKER: Array<{
  slug: OfferSlug;
  nickname: string;
  angle: string;
  tone: string;
}> = [
  {
    slug: "quick-look",
    nickname: "Quick hit",
    angle: "15-20 minutes of review, then 5-15 minutes of direct videos.",
    tone: "border-cyan-300 bg-cyan-50/70 text-cyan-900",
  },
  {
    slug: "decision-sprint",
    nickname: "90-minute sprint",
    angle: "The call plus prep, research, worksheet, and handoff.",
    tone: "border-accent-300 bg-accent-100/70 text-slate-950",
  },
  {
    slug: "business-audit",
    nickname: "C'mon Man Audit",
    angle: "Find the leaks before they keep costing you money.",
    tone: "border-brand-300 bg-brand-50/80 text-brand-950",
  },
  {
    slug: "working-session",
    nickname: "Build with me",
    angle: "Four focused hours to ship one real asset.",
    tone: "border-slate-300 bg-white text-slate-950",
  },
  {
    slug: "power-bundle",
    nickname: "Social engine",
    angle: "Four platforms managed in one content rhythm.",
    tone: "border-cyan-300 bg-white text-slate-950",
  },
  {
    slug: "fb-ads",
    nickname: "Ads system",
    angle: "Flat-fee Meta ads built inside your own accounts.",
    tone: "border-accent-300 bg-white text-slate-950",
  },
];

const BUYER_LANES = [
  "Car dealerships",
  "Attorneys",
  "Doctors",
  "Insurance agencies",
  "Real estate agents",
  "Brokers",
  "Artists",
  "Rappers",
  "Music artists",
  "Civil-rights stories",
  "Public stories",
  "Owner-led businesses",
];

export default function StartPage() {
  return (
    <div className="min-h-screen bg-white text-slate-900">
      <LightHeader />

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
          style={{ background: "radial-gradient(circle, rgba(35,184,255,0.50) 0%, transparent 65%)" }}
        />
        <div
          aria-hidden
          className="absolute -bottom-40 -left-24 h-[560px] w-[560px] rounded-full opacity-55 blur-3xl"
          style={{ background: "radial-gradient(circle, rgba(255,154,31,0.42) 0%, transparent 65%)" }}
        />
        <div className="relative mx-auto max-w-7xl px-4 py-7 sm:py-10">
          <div>
            <div className="inline-flex items-center gap-2 rounded-full border border-cyan-300 bg-white/75 px-3 py-1 text-xs font-semibold uppercase tracking-widest text-cyan-700 shadow-sm backdrop-blur">
              <Sparkles className="h-3.5 w-3.5" /> Pick your service
            </div>
            <h1 className="mt-4 max-w-4xl text-4xl font-semibold leading-tight tracking-tight text-slate-950 sm:text-5xl lg:text-6xl">
              Pick the service.{" "}
              <span className="bg-gradient-to-r from-brand-700 via-cyan-500 to-accent-500 bg-clip-text text-transparent">
                Route only if unsure.
              </span>
            </h1>
            <p className="mt-4 max-w-3xl text-base leading-relaxed text-slate-700 sm:text-lg">
              These are the live offers. Click the service that matches the problem, or answer the
              router below if the choice is not obvious.
            </p>

            <div id="service-options" className="mt-5 grid grid-cols-2 gap-2 sm:grid-cols-3 lg:grid-cols-6">
              {SERVICE_PICKER.map((item) => (
                <QuickServiceCard key={item.slug} {...item} />
              ))}
            </div>

            <Link
              href="#router"
              className="mt-4 inline-flex items-center gap-2 text-sm font-semibold text-brand-700 hover:text-brand-900"
            >
              Not sure yet? Answer the router <ArrowRight className="h-3.5 w-3.5" />
            </Link>
          </div>
        </div>
      </section>

      <section className="relative overflow-hidden border-b border-slate-200 bg-slate-950 text-white">
        <div
          aria-hidden
          className="absolute -left-32 top-0 h-[420px] w-[420px] rounded-full opacity-30 blur-3xl"
          style={{ background: "radial-gradient(circle, rgba(35,184,255,0.62) 0%, transparent 65%)" }}
        />
        <div
          aria-hidden
          className="absolute -right-24 bottom-0 h-[420px] w-[420px] rounded-full opacity-30 blur-3xl"
          style={{ background: "radial-gradient(circle, rgba(255,154,31,0.60) 0%, transparent 65%)" }}
        />
        <div className="relative mx-auto max-w-7xl px-4 py-12 sm:py-14">
          <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
            <div className="max-w-3xl">
              <div className="text-xs font-semibold uppercase tracking-widest text-cyan-300">
                Router fallback
              </div>
              <h2 className="mt-3 text-3xl font-semibold tracking-tight sm:text-4xl">
                Still not sure? Answer the short intake.
              </h2>
              <p className="mt-3 max-w-2xl text-sm leading-relaxed text-slate-300 sm:text-base">
                Use this only when the service cards do not make the decision obvious. It saves
                your business context and routes you to the next move.
              </p>
            </div>
            <Link
              href="#router"
              className="inline-flex items-center justify-center gap-2 rounded-xl border border-white/20 bg-white/10 px-5 py-3 text-sm font-semibold text-white backdrop-blur hover:bg-white/15"
            >
              Answer the router instead <ArrowRight className="h-4 w-4" />
            </Link>
          </div>

          <div className="mt-6 rounded-3xl border border-white/10 bg-white/[0.06] p-4 backdrop-blur sm:p-5">
            <div className="text-xs font-semibold uppercase tracking-widest text-accent-300">
              Built for the people who need attention to turn into action
            </div>
            <div className="mt-3 flex flex-wrap gap-2">
              {BUYER_LANES.map((lane) => (
                <span
                  key={lane}
                  className="rounded-full border border-white/10 bg-white/10 px-3 py-1 text-xs font-semibold text-white"
                >
                  {lane}
                </span>
              ))}
            </div>
          </div>

          <div className="mt-6 grid gap-3 sm:grid-cols-3">
            <MiniProof icon={Target} title="No cold price maze" body="Pick the offer, or route only if unsure." />
            <MiniProof icon={ShieldCheck} title="No fake numbers" body="Real context goes to Ryan." />
            <MiniProof icon={ArrowRight} title="Real next click" body="Stripe, booking, or sales page." />
          </div>
        </div>
      </section>

      <main id="router" className="mx-auto grid max-w-7xl gap-8 px-4 py-12 lg:grid-cols-[minmax(0,1fr)_340px]">
        <form action="/api/intake" method="POST" className="space-y-8">
          <VisitorIdField />
          <FormSection
            n={1}
            title="What are you trying to fix first?"
            sub="Pick the problem that would make the biggest difference if it moved."
          >
            <div className="grid gap-3 md:grid-cols-2">
              {PRIMARY_NEED_OPTIONS.map((option) => (
                <OptionRadio
                  key={option.value}
                  name="primaryNeed"
                  value={option.value}
                  title={option.title}
                  body={option.body}
                  Icon={NEED_ICONS[option.value]}
                  required
                />
              ))}
            </div>
          </FormSection>

          <FormSection
            n={2}
            title="What kind of help do you actually want?"
            sub="This separates quick direction from done-for-you work."
          >
            <div className="grid gap-3 md:grid-cols-2 lg:grid-cols-3">
              {WORK_STYLE_OPTIONS.map((option) => (
                <OptionRadio
                  key={option.value}
                  name="workStyle"
                  value={option.value}
                  title={option.title}
                  body={option.body}
                  Icon={STYLE_ICONS[option.value]}
                  required
                />
              ))}
            </div>
          </FormSection>

          <FormSection
            n={3}
            title="What can you invest right now?"
            sub="Be practical. The router will not send you into a package that does not fit the range you picked."
          >
            <div className="grid gap-3 md:grid-cols-2 lg:grid-cols-3">
              {BUDGET_OPTIONS.map((option) => (
                <OptionRadio
                  key={option.value}
                  name="budgetTier"
                  value={option.value}
                  title={option.title}
                  body={option.body}
                  Icon={BUDGET_ICONS[option.value]}
                  required
                />
              ))}
            </div>
          </FormSection>

          <FormSection
            n={4}
            title="How urgent is this?"
            sub="A fast problem needs a smaller next click. A strategic problem may need a larger map."
          >
            <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
              {URGENCY_OPTIONS.map((option) => (
                <OptionRadio
                  key={option.value}
                  name="urgency"
                  value={option.value}
                  title={option.title}
                  body={option.body}
                  Icon={URGENCY_ICONS[option.value]}
                  required
                />
              ))}
            </div>
          </FormSection>

          <FormSection
            n={5}
            title="Where is the business right now?"
            sub="This helps Ryan read the intake fast and understand the size of the decision."
          >
            <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-5">
              {REVENUE_OPTIONS.map((option) => (
                <CompactRadio
                  key={option.value}
                  name="monthlyRevenueRange"
                  value={option.value}
                  title={option.title}
                  body={option.body}
                />
              ))}
            </div>

            <div className="mt-5">
              <label className="mb-2 block text-sm font-semibold text-slate-700">
                What is actually in the way?
              </label>
              <textarea
                name="biggestBlocker"
                rows={4}
                maxLength={1500}
                placeholder="Time, offer clarity, lead quality, content consistency, ads, systems, sales process. Write it like you would say it."
                className="block w-full rounded-xl border border-slate-300 bg-white px-4 py-3 text-slate-900 placeholder:text-slate-400 focus:border-cyan-500 focus:outline-none focus:ring-2 focus:ring-cyan-500/20"
              />
            </div>
          </FormSection>

          <FormSection
            n={6}
            title="Where should Ryan look?"
            sub="Handles are optional, but they make the first review sharper."
          >
            <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
              {PLATFORMS.map((platform) => (
                <SocialInput key={platform.name} {...platform} />
              ))}
            </div>
          </FormSection>

          <FormSection
            n={7}
            title="Where do we send the follow-up?"
            sub="This is private intake. It is not sold or pushed into public pages."
          >
            <div className="grid gap-4 sm:grid-cols-2">
              <TextField name="fullName" label="Your name" placeholder="First and last" required />
              <TextField name="email" label="Email" placeholder="you@business.com" type="email" required />
              <TextField name="phone" label="Phone" placeholder="+1 555 123 4567" />
              <TextField name="businessName" label="Business name" placeholder="What you call it" />
              <TextField name="businessUrl" label="Business URL" placeholder="https://" />
              <TextField name="industry" label="Industry / niche" placeholder="What you do" />
            </div>

            <div className="mt-5">
              <div className="mb-2 text-sm font-semibold text-slate-700">Best way to reach you?</div>
              <div className="flex flex-wrap gap-2">
                {CONTACT_METHODS.map((method) => (
                  <PillRadio
                    key={method.value}
                    name="bestContactMethod"
                    value={method.value}
                    label={method.label}
                  />
                ))}
              </div>
            </div>

            <div className="mt-5">
              <label className="mb-2 block text-sm font-semibold text-slate-700">
                Anything else Ryan should know?
              </label>
              <textarea
                name="notes"
                rows={3}
                maxLength={2000}
                placeholder="Existing tools, biggest win to date, who your buyer is, what you tried already, or anything that saves time."
                className="block w-full rounded-xl border border-slate-300 bg-white px-4 py-3 text-slate-900 placeholder:text-slate-400 focus:border-cyan-500 focus:outline-none focus:ring-2 focus:ring-cyan-500/20"
              />
            </div>

            <label className="mt-5 flex items-start gap-3 rounded-2xl border border-slate-200 bg-slate-50 p-4 text-sm text-slate-700">
              <input
                type="checkbox"
                name="acknowledgment"
                value="yes"
                required
                className="mt-1 h-4 w-4 rounded border-slate-300 text-cyan-600 focus:ring-cyan-500"
              />
              <span>
                I understand this is a business intake for The LeadFlow Pro. No specific follower,
                lead, revenue, or ad outcome is guaranteed. Paid engagements use a Texas-law
                engagement letter and mutual NDA.
              </span>
            </label>
          </FormSection>

          <div className="rounded-3xl border border-slate-200 bg-slate-950 p-5 text-white shadow-[0_30px_70px_-20px_rgba(15,23,42,0.35)] sm:p-6">
            <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
              <div>
                <div className="text-sm font-semibold text-cyan-200">Ready when you are.</div>
                <div className="mt-1 text-sm text-slate-300">
                  Click once. Get routed to the right sales page. Ryan gets the context.
                </div>
              </div>
              <button
                type="submit"
                className="inline-flex items-center justify-center gap-2 rounded-xl bg-accent-500 px-6 py-3 font-semibold text-white shadow-lg shadow-accent-500/30 hover:bg-accent-600"
              >
                Pick my service <ArrowRight className="h-4 w-4" />
              </button>
            </div>
          </div>
        </form>

        <aside className="space-y-5 lg:sticky lg:top-5 lg:self-start">
          <div className="rounded-3xl border border-slate-200 bg-white p-5 shadow-[0_20px_50px_-18px_rgba(15,23,42,0.18)]">
            <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-widest text-cyan-700">
              <Check className="h-4 w-4" /> Built for buyer clarity
            </div>
            <h2 className="mt-3 text-xl font-semibold tracking-tight text-slate-950">
              The site should answer one question fast:
            </h2>
            <p className="mt-2 text-sm leading-relaxed text-slate-700">
              What do I click next if I am serious, but I do not know which package fits?
              This page answers that without making them wait.
            </p>
          </div>

          <div className="rounded-3xl border border-cyan-200 bg-gradient-to-br from-cyan-50 via-white to-brand-50 p-5">
            <div className="text-xs font-semibold uppercase tracking-widest text-cyan-700">
              Routing logic
            </div>
            <ul className="mt-4 space-y-3 text-sm text-slate-700">
              <li className="flex gap-2">
                <Check className="mt-0.5 h-4 w-4 shrink-0 text-cyan-600" />
                Low-budget quick help goes to Quick-Look or Decision Sprint.
              </li>
              <li className="flex gap-2">
                <Check className="mt-0.5 h-4 w-4 shrink-0 text-cyan-600" />
                Ads and done-for-you paths route only when the budget supports it.
              </li>
              <li className="flex gap-2">
                <Check className="mt-0.5 h-4 w-4 shrink-0 text-cyan-600" />
                Bigger operator and advisor asks route to the higher-touch offers.
              </li>
            </ul>
          </div>

          <div className="overflow-hidden rounded-3xl border border-white/70 bg-white p-0 shadow-[0_24px_60px_-28px_rgba(15,23,42,0.30)] ring-1 ring-slate-900/5">
            <div className="grid grid-cols-3">
              <div className="h-2 bg-cyan-500" />
              <div className="h-2 bg-brand-700" />
              <div className="h-2 bg-accent-500" />
            </div>
            <div className="p-5">
              <div className="text-xs font-semibold uppercase tracking-widest text-accent-700">
                What Ryan needs
              </div>
              <p className="mt-3 text-sm leading-relaxed text-slate-700">
                Give enough context to pick the next move: the stuck point, budget, urgency, current
                platforms, and whether you want direction, buildout, or done-for-you execution.
              </p>
            </div>
          </div>

          <div className="rounded-3xl border border-slate-200 bg-slate-50 p-5 text-sm leading-relaxed text-slate-600">
            Prefer to look around first?{" "}
            <Link href="/tiers" className="font-semibold text-cyan-700 hover:text-cyan-800">
              Compare the full price ladder
            </Link>
            {" "}or{" "}
            <Link href="/book" className="font-semibold text-cyan-700 hover:text-cyan-800">
              book the 10-minute call
            </Link>
            .
          </div>
        </aside>
      </main>

      <LightFooter />
    </div>
  );
}

function MiniProof({
  icon: Icon,
  title,
  body,
}: {
  icon: LucideIcon;
  title: string;
  body: string;
}) {
  return (
    <div className="rounded-2xl border border-white/60 bg-white/70 p-4 shadow-sm backdrop-blur">
      <Icon className="h-5 w-5 text-cyan-600" />
      <div className="mt-3 font-semibold text-slate-950">{title}</div>
      <div className="mt-1 text-sm text-slate-600">{body}</div>
    </div>
  );
}

function QuickServiceCard({
  slug,
  nickname,
  angle,
  tone,
}: {
  slug: OfferSlug;
  nickname: string;
  angle: string;
  tone: string;
}) {
  const offer = OFFERS[slug];
  const workload = getOfferWorkload(slug);
  const Icon = offer.Icon;

  return (
    <Link
      href={`/offers/${slug}`}
      className={`group flex min-h-[150px] flex-col justify-between rounded-2xl border p-3 text-slate-950 shadow-sm transition hover:-translate-y-0.5 hover:shadow-lg sm:p-4 ${tone}`}
    >
      <div>
        <div className="flex items-start justify-between gap-2">
          <div>
            <div className="text-[10px] font-semibold uppercase tracking-widest opacity-75">
              {nickname}
            </div>
            <div className="mt-1 text-lg font-bold leading-tight tracking-tight">
              {offer.price.big}
            </div>
          </div>
          <div className="inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-slate-950 text-white shadow-lg shadow-slate-950/20">
            <Icon className="h-4 w-4" />
          </div>
        </div>
        <p className="mt-2 hidden text-xs leading-relaxed text-slate-700 sm:block">{angle}</p>
      </div>
      <div className="mt-3 grid grid-cols-2 gap-2 text-[10px] font-semibold uppercase tracking-wider">
        <div className="rounded-xl border border-slate-200 bg-white/65 p-2">
          <div className="text-slate-500">Work</div>
          <div className="mt-0.5 text-sm font-bold normal-case tracking-normal text-slate-950">
            {workload ? formatHours(workload.reserveHours) : "custom"}
          </div>
        </div>
        <div className="rounded-xl border border-cyan-200 bg-white/65 p-2">
          <div className="text-cyan-700">Due</div>
          <div className="mt-0.5 text-sm font-bold normal-case tracking-normal text-cyan-950">
            {shortDelivery(workload)}
          </div>
        </div>
      </div>
      <div className="mt-3 inline-flex items-center gap-1 text-sm font-semibold text-brand-700 group-hover:text-brand-900">
        Open <ArrowRight className="h-3.5 w-3.5" />
      </div>
    </Link>
  );
}

function shortDelivery(workload: ReturnType<typeof getOfferWorkload>) {
  if (!workload) return "custom";
  if (workload.deliveryKind === "ongoing") return "weekly";
  if (workload.deliveryKind === "same-day") return "same day";
  const days = workload.deliveryMaxDays;
  return days === 1 ? "1 biz day" : `${days} biz days`;
}

function FormSection({
  n,
  title,
  sub,
  children,
}: {
  n: number;
  title: string;
  sub?: string;
  children: ReactNode;
}) {
  return (
    <fieldset className="rounded-3xl border border-slate-200 bg-white p-5 shadow-[0_20px_50px_-18px_rgba(15,23,42,0.14)] sm:p-7">
      <div className="mb-5 flex items-start gap-4">
        <div className="inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-slate-950 font-bold text-white">
          {n}
        </div>
        <div>
          <legend className="text-xl font-semibold tracking-tight text-slate-950 sm:text-2xl">
            {title}
          </legend>
          {sub && <p className="mt-1 text-sm leading-relaxed text-slate-600">{sub}</p>}
        </div>
      </div>
      {children}
    </fieldset>
  );
}

function OptionRadio({
  name,
  value,
  title,
  body,
  Icon,
  required = false,
}: {
  name: string;
  value: string;
  title: string;
  body: string;
  Icon: LucideIcon;
  required?: boolean;
}) {
  const tone = optionTone(value);
  return (
    <label className="group block cursor-pointer">
      <input type="radio" name={name} value={value} required={required} className="peer sr-only" />
      <span className={`block h-full rounded-2xl border border-slate-200 bg-white p-4 shadow-sm transition peer-checked:ring-2 ${tone.card}`}>
        <span className="flex items-start gap-3">
          <span className={`inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-xl transition ${tone.icon}`}>
            <Icon className="h-5 w-5" />
          </span>
          <span>
            <span className="block font-semibold text-slate-950">{title}</span>
            <span className="mt-1 block text-sm leading-relaxed text-slate-600">{body}</span>
          </span>
        </span>
      </span>
    </label>
  );
}

function CompactRadio({
  name,
  value,
  title,
  body,
}: {
  name: string;
  value: string;
  title: string;
  body: string;
}) {
  return (
    <label className="block cursor-pointer">
      <input type="radio" name={name} value={value} className="peer sr-only" />
      <span className="block rounded-xl border border-slate-200 bg-white p-4 shadow-sm transition hover:border-cyan-400 hover:bg-cyan-50/40 peer-checked:border-cyan-600 peer-checked:bg-cyan-50 peer-checked:ring-2 peer-checked:ring-cyan-500/25">
        <span className="block font-semibold text-slate-950">{title}</span>
        <span className="mt-1 block text-xs leading-relaxed text-slate-600">{body}</span>
      </span>
    </label>
  );
}

function SocialInput({
  name,
  label,
  placeholder,
  tone,
}: {
  name: string;
  label: string;
  placeholder: string;
  tone: string;
}) {
  return (
    <label className="block">
      <div className="mb-1.5 flex items-center gap-2">
        <span className="inline-block h-2 w-2 rounded-full" style={{ backgroundColor: tone }} />
        <span className="text-sm font-semibold text-slate-700">{label}</span>
      </div>
      <input
        type="text"
        name={name}
        placeholder={placeholder}
        maxLength={120}
        className="block w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900 placeholder:text-slate-400 focus:border-cyan-500 focus:outline-none focus:ring-2 focus:ring-cyan-500/20"
      />
    </label>
  );
}

function PillRadio({
  name,
  value,
  label,
}: {
  name: string;
  value: string;
  label: string;
}) {
  return (
    <label className="cursor-pointer">
      <input type="radio" name={name} value={value} className="peer sr-only" />
      <span className="inline-flex items-center rounded-full border border-slate-300 bg-white px-4 py-1.5 text-sm font-medium text-slate-700 transition hover:border-cyan-400 hover:bg-cyan-50/40 peer-checked:border-cyan-600 peer-checked:bg-cyan-600 peer-checked:text-white">
        {label}
      </span>
    </label>
  );
}

function TextField({
  name,
  label,
  placeholder,
  type = "text",
  required = false,
}: {
  name: string;
  label: string;
  placeholder?: string;
  type?: string;
  required?: boolean;
}) {
  return (
    <label className="block">
      <div className="mb-1.5 flex items-center justify-between">
        <span className="text-sm font-semibold text-slate-700">{label}</span>
        {required && <span className="text-xs text-rose-500">required</span>}
      </div>
      <input
        type={type}
        name={name}
        required={required}
        placeholder={placeholder}
        maxLength={300}
        className="block w-full rounded-lg border border-slate-300 bg-white px-3 py-2.5 text-slate-900 placeholder:text-slate-400 focus:border-cyan-500 focus:outline-none focus:ring-2 focus:ring-cyan-500/20"
      />
    </label>
  );
}
