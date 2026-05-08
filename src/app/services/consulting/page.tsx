// src/app/services/consulting/page.tsx — Consulting ladder.

import Link from "next/link";
import type { LucideIcon } from "lucide-react";
import {
  ArrowRight,
  Calendar,
  Check,
  Clock,
  Compass,
  FileText,
  Gauge,
  Layers,
  ShieldCheck,
  Wrench,
} from "lucide-react";
import { BandwidthMeter } from "@/components/BandwidthMeter";
import { LightFooter, LightHeader } from "@/components/site/LightHeader";
import { OFFERS, type OfferSlug } from "@/lib/offers";
import { OFFER_WORKLOADS, formatHours } from "@/lib/workload";
import { createSeoMetadata } from "@/lib/seo-metadata";

export const metadata = createSeoMetadata({
  title: "Business Consulting — The LeadFlow Pro",
  description:
    "Consulting with Ryan Nichols for stuck decisions, audits, working sessions, build sprints, retainers, operator support, and annual advisor relationships.",
  path: "/services/consulting",
  imageTitle: "Business Consulting With Ryan",
  imageSubtitle: "Decision sprints, audits, working sessions, build sprints, and operator support.",
});

const CONSULTING_SLUGS = [
  "decision-sprint",
  "business-audit",
  "working-session",
  "sprint-4-week",
  "light-retainer",
  "monthly-operator",
  "annual-advisor",
] as const satisfies readonly OfferSlug[];

const LANES = [
  {
    Icon: Compass,
    title: "Unstick the decision",
    body: "Use this when the business is not broken, but one decision is blocking everything behind it.",
    slugs: ["decision-sprint", "business-audit"] as const,
  },
  {
    Icon: Wrench,
    title: "Ship the asset",
    body: "Use this when you need a page, offer, workflow, dashboard, sales process, or system shipped instead of discussed.",
    slugs: ["working-session", "sprint-4-week"] as const,
  },
  {
    Icon: Gauge,
    title: "Keep Ryan close",
    body: "Use this when the business has enough money, urgency, and complexity to justify reserved operator bandwidth.",
    slugs: ["light-retainer", "monthly-operator", "annual-advisor"] as const,
  },
];

const DAYS = [
  {
    label: "First 30 days",
    body: "We identify the offer, account, workflow, or decision that is costing the most time. Then we either make the call or ship the first asset.",
  },
  {
    label: "Days 31-60",
    body: "The operating rhythm gets tighter: content, lead follow-up, reporting, account control, team handoff, and decision cadence.",
  },
  {
    label: "Days 61-90",
    body: "We decide whether this stays a one-time engagement, turns into a monthly operator rhythm, or gets handed back to your internal team.",
  },
];

export default function ConsultingPage() {
  return (
    <div className="min-h-screen bg-white text-slate-900">
      <LightHeader activePath="/services/consulting" />

      <main>
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
            className="absolute -right-24 -top-28 h-[520px] w-[520px] rounded-full opacity-50 blur-3xl"
            style={{ background: "radial-gradient(circle, rgba(35,184,255,0.55) 0%, transparent 65%)" }}
          />
          <div
            aria-hidden
            className="absolute -bottom-40 -left-24 h-[560px] w-[560px] rounded-full opacity-45 blur-3xl"
            style={{ background: "radial-gradient(circle, rgba(255,154,31,0.45) 0%, transparent 65%)" }}
          />

          <div className="relative mx-auto grid max-w-7xl gap-8 px-4 py-12 sm:py-16 lg:grid-cols-5 lg:items-center">
            <div className="lg:col-span-3">
              <div className="flex flex-wrap items-center gap-2">
                <div className="inline-flex items-center gap-2 rounded-full border border-cyan-300 bg-white/70 px-3 py-1 text-xs font-semibold uppercase tracking-widest text-cyan-700 shadow-sm backdrop-blur">
                  Consulting ladder
                </div>
                <BandwidthMeter variant="compact" />
              </div>

              <h1 className="mt-5 text-4xl font-semibold tracking-tight text-slate-950 sm:text-5xl lg:text-6xl">
                Decisions, systems, and operator help{" "}
                <span className="bg-gradient-to-r from-brand-700 via-cyan-500 to-accent-500 bg-clip-text text-transparent">
                  when the business is ready to move.
                </span>
              </h1>
              <p className="mt-5 max-w-3xl text-lg leading-relaxed text-slate-700">
                This is not a vague coaching page. Pick the level of help: a $90 Decision Sprint, a
                written audit, a working session, a 4-week build sprint, monthly operator support,
                or annual advisor access.
              </p>
              <p className="mt-4 max-w-3xl text-base leading-relaxed text-slate-700">
                Bigger consulting work is for businesses with budget and urgency. If you are not
                there yet, start with the lower paid tiers. Spending money on me is spending money
                on your business, not on a motivational conversation.
              </p>
              <p className="mt-4 max-w-3xl text-base leading-relaxed text-slate-700">
                I can work across the whole motion: marketing, lead generation, creative direction,
                video scripts, organic or AI-assisted content, Meta Ray-Ban POV capture, GoPro
                angles, Rode-mic audio, account control, sales follow-up, and the operating system
                behind it.
              </p>

              <div className="mt-7 flex flex-col gap-3 sm:flex-row">
                <Link
                  href="/start"
                  className="inline-flex items-center justify-center gap-2 rounded-xl bg-slate-950 px-6 py-3 font-semibold text-white shadow-lg shadow-slate-900/20 hover:bg-slate-800"
                >
                  Find the right consulting path <ArrowRight className="h-4 w-4" />
                </Link>
                <Link
                  href="/book"
                  className="inline-flex items-center justify-center gap-2 rounded-xl bg-accent-500 px-6 py-3 font-semibold text-white shadow-lg shadow-accent-500/20 hover:bg-accent-600"
                >
                  Book the 10-min call
                </Link>
              </div>
            </div>

            <div className="lg:col-span-2">
              <div className="rounded-3xl border border-white/70 bg-white/80 p-5 shadow-[0_30px_70px_-20px_rgba(15,23,42,0.25)] ring-1 ring-slate-900/5 backdrop-blur-xl">
                <div className="text-xs font-semibold uppercase tracking-widest text-slate-500">
                  What consulting is for
                </div>
                <div className="mt-4 space-y-3">
                  <Signal Icon={Compass} label="One decision" body="Pricing, offer, account control, lead flow, hiring, tool stack, or next move." />
                  <Signal Icon={FileText} label="One written plan" body="A clear audit or worksheet you can hand to a team and execute." />
                  <Signal Icon={Wrench} label="One content engine" body="Photos, videos, AI images, Meta Ray-Ban POV shots, GoPro angles, hooks, scripts, and how to move the lead after the post works." />
                  <Signal Icon={Layers} label="One operating system" body="The recurring rhythm that keeps content, leads, follow-up, and decisions moving." />
                </div>
              </div>
            </div>
          </div>
        </section>

        <section className="relative overflow-hidden border-b border-slate-200">
          <div
            aria-hidden
            className="absolute inset-0"
            style={{ background: "linear-gradient(180deg, #f6f9ff 0%, #fff8f1 100%)" }}
          />
          <div className="relative mx-auto max-w-7xl px-4 py-12 sm:py-14">
            <div className="text-xs font-semibold uppercase tracking-widest text-cyan-700">
              Choose the lane
            </div>
            <h2 className="mt-2 max-w-3xl text-3xl font-semibold tracking-tight text-slate-950 sm:text-4xl">
              The page should tell a buyer what to click.
            </h2>
            <div className="mt-7 grid gap-4 lg:grid-cols-3">
              {LANES.map((lane) => (
                <LaneCard key={lane.title} {...lane} />
              ))}
            </div>
          </div>
        </section>

        <section className="mx-auto max-w-7xl px-4 py-12 sm:py-14">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
            <div>
              <div className="text-xs font-semibold uppercase tracking-widest text-cyan-700">
                Current offers
              </div>
              <h2 className="mt-2 text-3xl font-semibold tracking-tight text-slate-950 sm:text-4xl">
                Pick the size of the problem.
              </h2>
            </div>
            <Link
              href="/tiers"
              className="inline-flex items-center gap-2 text-sm font-semibold text-cyan-700 hover:text-cyan-800"
            >
              See the full price ladder <ArrowRight className="h-4 w-4" />
            </Link>
          </div>

          <div className="mt-7 grid gap-4 md:grid-cols-2 xl:grid-cols-3">
            {CONSULTING_SLUGS.map((slug) => (
              <OfferCard key={slug} slug={slug} />
            ))}
          </div>
        </section>

        <section className="relative overflow-hidden border-y border-slate-200">
          <div
            aria-hidden
            className="absolute inset-0"
            style={{ background: "linear-gradient(180deg, #fff8f1 0%, #eef9ff 100%)" }}
          />
          <div className="relative mx-auto max-w-7xl px-4 py-12 sm:py-14">
            <div className="grid gap-8 lg:grid-cols-5 lg:items-start">
              <div className="lg:col-span-2">
                <div className="text-xs font-semibold uppercase tracking-widest text-cyan-700">
                  30 / 60 / 90
                </div>
                <h2 className="mt-2 text-3xl font-semibold tracking-tight text-slate-950 sm:text-4xl">
                  Consulting has to turn into work your business can use.
                </h2>
                <p className="mt-4 text-slate-700 leading-relaxed">
                  I am not trying to create a forever meeting. The point is to get past the reef:
                  make the decision, build the system, and leave you with a cleaner operating
                  rhythm.
                </p>
              </div>
              <div className="lg:col-span-3">
                <div className="grid gap-3">
                  {DAYS.map((day) => (
                    <div key={day.label} className="rounded-2xl border border-slate-200 bg-white/85 p-5 shadow-sm">
                      <div className="flex items-start gap-3">
                        <div className="inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-slate-950 text-white">
                          <Calendar className="h-5 w-5" />
                        </div>
                        <div>
                          <h3 className="font-semibold text-slate-950">{day.label}</h3>
                          <p className="mt-1 text-sm leading-relaxed text-slate-600">{day.body}</p>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </section>

        <section className="mx-auto max-w-7xl px-4 py-12 sm:py-14">
          <div className="rounded-3xl border border-slate-200 bg-white p-6 shadow-[0_24px_60px_-24px_rgba(15,23,42,0.25)] sm:p-8">
            <div className="grid gap-6 lg:grid-cols-3">
              <TrustCard
                Icon={Clock}
                title="The meter counts real work"
                body="A call is not just the minutes on the calendar. Prep, transcript handling, research, worksheet assembly, delivery, and follow-up all count."
              />
              <TrustCard
                Icon={ShieldCheck}
                title="No outcome guarantees"
                body="The deliverable is the work described on the offer page. I do not promise specific revenue, follower, lead, or sales outcomes."
              />
              <TrustCard
                Icon={Check}
                title="Texas-law NDA"
                body="Every paid engagement runs through Real Ryan Nichols LLC under a Texas-law engagement letter and mutual NDA."
              />
            </div>
          </div>
        </section>

        <section className="relative overflow-hidden bg-gradient-to-br from-slate-950 via-brand-900 to-cyan-900 text-white">
          <div
            aria-hidden
            className="absolute -top-28 left-1/2 h-[420px] w-[620px] -translate-x-1/2 rounded-full opacity-25 blur-3xl"
            style={{ background: "radial-gradient(circle, #ff9a1f 0%, transparent 60%)" }}
          />
          <div className="relative mx-auto max-w-3xl px-4 py-14 text-center sm:py-16">
            <h2 className="text-3xl font-semibold tracking-tight sm:text-4xl">
              If the business is ready, choose the lane.
            </h2>
            <p className="mx-auto mt-3 max-w-xl text-slate-300">
              Start with the router when you want the cleanest recommendation. Use the 10-minute
              call when you already know this deserves a fit check.
            </p>
            <div className="mt-7 flex flex-col justify-center gap-3 sm:flex-row">
              <Link
                href="/start"
                className="inline-flex items-center justify-center gap-2 rounded-xl bg-accent-500 px-6 py-3 font-semibold text-white shadow-lg shadow-accent-500/25 hover:bg-accent-600"
              >
                Pick my service <ArrowRight className="h-4 w-4" />
              </Link>
              <Link
                href="/book"
                className="inline-flex items-center justify-center gap-2 rounded-xl border border-white/20 bg-white/10 px-6 py-3 font-semibold text-white backdrop-blur hover:bg-white/15"
              >
                Book the 10-min call
              </Link>
            </div>
          </div>
        </section>
      </main>

      <LightFooter />
    </div>
  );
}

function Signal({
  Icon,
  label,
  body,
}: {
  Icon: LucideIcon;
  label: string;
  body: string;
}) {
  return (
    <div className="rounded-2xl border border-slate-200 bg-white p-4">
      <div className="flex items-start gap-3">
        <Icon className="mt-0.5 h-5 w-5 shrink-0 text-cyan-700" />
        <div>
          <div className="font-semibold text-slate-950">{label}</div>
          <p className="mt-1 text-sm leading-relaxed text-slate-600">{body}</p>
        </div>
      </div>
    </div>
  );
}

function LaneCard({
  Icon,
  title,
  body,
  slugs,
}: {
  Icon: LucideIcon;
  title: string;
  body: string;
  slugs: readonly OfferSlug[];
}) {
  return (
    <div className="rounded-2xl border border-slate-200 bg-white/85 p-5 shadow-sm">
      <div className="inline-flex h-11 w-11 items-center justify-center rounded-xl bg-gradient-to-br from-cyan-500 to-brand-700 text-white">
        <Icon className="h-5 w-5" />
      </div>
      <h3 className="mt-4 text-lg font-semibold text-slate-950">{title}</h3>
      <p className="mt-2 text-sm leading-relaxed text-slate-600">{body}</p>
      <div className="mt-4 flex flex-wrap gap-2">
        {slugs.map((slug) => (
          <Link
            key={slug}
            href={`/offers/${slug}`}
            className="rounded-full border border-cyan-200 bg-cyan-50 px-3 py-1 text-xs font-semibold text-cyan-800 hover:border-cyan-300 hover:bg-cyan-100"
          >
            {OFFERS[slug].price.big} · {OFFERS[slug].price.sub}
          </Link>
        ))}
      </div>
    </div>
  );
}

function OfferCard({ slug }: { slug: OfferSlug }) {
  const offer = OFFERS[slug];
  const workload = OFFER_WORKLOADS[slug];
  const Icon = offer.Icon;

  return (
    <div className="flex flex-col rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
      <div className="flex items-start justify-between gap-3">
        <div className="inline-flex h-11 w-11 items-center justify-center rounded-xl bg-slate-950 text-white">
          <Icon className="h-5 w-5" />
        </div>
        <span className="rounded-full border border-cyan-200 bg-cyan-50 px-2.5 py-1 text-xs font-bold text-cyan-800">
          {formatHours(workload.reserveHours)}
        </span>
      </div>
      <h3 className="mt-4 text-lg font-semibold text-slate-950">{offer.price.big} · {offer.hero.h1Lead}</h3>
      <p className="mt-2 text-sm leading-relaxed text-slate-600">{offer.hero.paragraph}</p>
      <div className="mt-4 rounded-xl border border-slate-200 bg-slate-50 p-3 text-xs leading-relaxed text-slate-600">
        <strong className="text-slate-950">{workload.visibleTime}.</strong> {workload.deliveryPromise}
      </div>
      <ul className="mt-4 space-y-2">
        {offer.price.deliverables.slice(0, 3).map((item) => (
          <li key={item} className="flex items-start gap-2 text-sm text-slate-700">
            <Check className="mt-0.5 h-4 w-4 shrink-0 text-cyan-600" />
            <span>{item}</span>
          </li>
        ))}
      </ul>
      <Link
        href={`/offers/${slug}`}
        className="mt-auto inline-flex w-full items-center justify-center gap-2 rounded-xl bg-slate-950 px-4 py-2.5 text-sm font-semibold text-white hover:bg-slate-800"
      >
        See this offer <ArrowRight className="h-4 w-4" />
      </Link>
    </div>
  );
}

function TrustCard({
  Icon,
  title,
  body,
}: {
  Icon: LucideIcon;
  title: string;
  body: string;
}) {
  return (
    <div>
      <div className="inline-flex h-11 w-11 items-center justify-center rounded-xl bg-gradient-to-br from-cyan-500 to-brand-700 text-white">
        <Icon className="h-5 w-5" />
      </div>
      <h3 className="mt-4 font-semibold text-slate-950">{title}</h3>
      <p className="mt-2 text-sm leading-relaxed text-slate-600">{body}</p>
    </div>
  );
}
