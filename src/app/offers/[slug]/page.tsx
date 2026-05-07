// src/app/offers/[slug]/page.tsx — Universal offer sales page.
//
// Renders any offer from /lib/offers.ts. The visual language follows the
// "Journey" aesthetic Ryan approved: dark glass cards on a navy gradient
// with gradient text and animated milestone dots. Hopeful, premium, and
// makes a small investment feel like an investment in yourself.

import Link from "next/link";
import { notFound } from "next/navigation";
import {
  ArrowRight, BadgeCheck, Calendar, Check, Clock, Sparkles, X as XIcon,
} from "lucide-react";
import { LightHeader, LightFooter } from "@/components/site/LightHeader";
import { BandwidthMeter } from "@/components/BandwidthMeter";
import { InteractiveOfferDecision } from "@/components/offers/InteractiveOfferDecision";
import { OFFERS, type OfferSlug } from "@/lib/offers";
import { formatHours, getOfferWorkload } from "@/lib/workload";

export function generateStaticParams() {
  return Object.keys(OFFERS).map((slug) => ({ slug }));
}

type Props = { params: { slug: string } };
type PageProps = Props & {
  searchParams?: {
    source?: string;
    fit?: string;
    budget?: string;
  };
};

export function generateMetadata({ params }: Props) {
  const offer = OFFERS[params.slug as OfferSlug];
  if (!offer) return { title: "Offer · The LeadFlow Pro" };
  return { title: offer.metaTitle, description: offer.metaDescription };
}

export default async function OfferPage({ params, searchParams }: PageProps) {
  const offer = OFFERS[params.slug as OfferSlug];
  if (!offer) notFound();

  const O = offer;
  const Icon = O.Icon;
  const recommendedFromStart = searchParams?.source === "start";
  const workload = getOfferWorkload(O.slug);

  return (
    <div className="min-h-screen bg-slate-950 text-slate-900">
      <LightHeader />

      {recommendedFromStart && (
        <div className="border-b border-cyan-200 bg-gradient-to-r from-cyan-50 via-white to-accent-300/20">
          <div className="mx-auto flex max-w-7xl flex-col gap-2 px-4 py-3 text-sm text-slate-700 sm:flex-row sm:items-center sm:justify-between">
            <div className="flex items-start gap-2">
              <Sparkles className="mt-0.5 h-4 w-4 shrink-0 text-cyan-700" />
              <span>
                Recommended from your intake. This is the cleanest next click based on the problem,
                budget, and urgency you picked.
              </span>
            </div>
            <Link href="/start" className="font-semibold text-cyan-700 hover:text-cyan-800">
              Reroute me
            </Link>
          </div>
        </div>
      )}

      {/* HERO — warm-glass blend (NOT plain white, NOT all-dark) */}
      <section className="relative overflow-hidden">
        {/* Warm gradient base */}
        <div
          aria-hidden
          className="absolute inset-0"
          style={{
            background:
              "linear-gradient(135deg, #fff8f1 0%, #f6f9ff 38%, #eef9ff 70%, #f3eaff 100%)",
          }}
        />
        {/* Cyan bloom — top-right */}
        <div
          aria-hidden
          className="absolute -top-32 -right-32 h-[520px] w-[520px] rounded-full opacity-50 blur-3xl"
          style={{ background: "radial-gradient(circle, rgba(35,184,255,0.55) 0%, transparent 65%)" }}
        />
        {/* Accent bloom — bottom-left */}
        <div
          aria-hidden
          className="absolute -bottom-40 -left-32 h-[560px] w-[560px] rounded-full opacity-55 blur-3xl"
          style={{ background: "radial-gradient(circle, rgba(255,154,31,0.45) 0%, transparent 65%)" }}
        />
        {/* Soft purple bloom — middle-right */}
        <div
          aria-hidden
          className="absolute top-1/2 right-1/3 h-[320px] w-[320px] rounded-full opacity-30 blur-3xl"
          style={{ background: "radial-gradient(circle, rgba(176,107,255,0.35) 0%, transparent 60%)" }}
        />

        <div className="relative mx-auto max-w-7xl px-4 py-16 sm:py-20">
          <div className="grid gap-10 lg:grid-cols-5 lg:items-center">
            <div className="lg:col-span-3">
              <div className="flex flex-wrap items-center gap-2">
                <div className="inline-flex items-center gap-2 rounded-full border border-cyan-300 bg-white/70 backdrop-blur px-3 py-1 text-xs uppercase tracking-widest text-cyan-700 font-semibold shadow-sm">
                  <Icon className="h-3.5 w-3.5" /> {O.badge}
                </div>
                <BandwidthMeter variant="compact" />
              </div>
              <h1 className="mt-5 text-4xl sm:text-5xl lg:text-6xl font-semibold tracking-tight leading-tight text-slate-950">
                {O.hero.h1Lead}{" "}
                <span className="bg-gradient-to-r from-brand-700 via-cyan-500 to-accent-500 bg-clip-text text-transparent">
                  {O.hero.h1Highlight}
                </span>
              </h1>
              <p className="mt-5 text-lg text-slate-700 leading-relaxed">{O.hero.paragraph}</p>
              {O.hero.paragraph2 && (
                <p className="mt-3 text-base text-slate-700 leading-relaxed">{O.hero.paragraph2}</p>
              )}
              <div className="mt-7 flex flex-col sm:flex-row gap-3">
                <Link
                  href={O.primaryCta.href}
                  className="inline-flex items-center justify-center gap-2 rounded-xl bg-slate-900 px-6 py-3 font-semibold text-white shadow-lg shadow-slate-900/30 hover:bg-slate-800"
                >
                  {O.primaryCta.label} <ArrowRight className="h-4 w-4" />
                </Link>
                <Link
                  href={O.secondaryCta.href}
                  className="inline-flex items-center justify-center gap-2 rounded-xl border border-slate-300 bg-white/80 backdrop-blur px-6 py-3 font-semibold text-slate-800 hover:border-brand-500 hover:text-brand-700"
                >
                  {O.secondaryCta.label}
                </Link>
              </div>
              <p className="mt-3 text-xs text-slate-500">
                Secure Stripe checkout. Texas-law engagement letter + mutual NDA. No specific-outcome
                guarantees.
              </p>
            </div>

            {/* Frosted-glass price card on the warm base */}
            <div className="lg:col-span-2">
              <div className="relative rounded-3xl border border-white/60 bg-white/70 backdrop-blur-xl p-6 shadow-[0_30px_70px_-20px_rgba(15,23,42,0.20)] ring-1 ring-slate-900/5">
                <div className="flex items-center justify-between">
                  <div className="text-[10px] uppercase tracking-widest text-slate-500 font-semibold">Price</div>
                  {O.price.badge && (
                    <span className="inline-flex items-center gap-1.5 rounded-full bg-cyan-50 border border-cyan-200 px-2.5 py-0.5 text-xs font-semibold text-cyan-800">
                      {O.price.badge}
                    </span>
                  )}
                </div>
                <div className="mt-2 flex items-baseline gap-2">
                  <span className="text-5xl font-bold text-slate-950 tabular-nums">{O.price.big}</span>
                  <span className="text-sm text-slate-500">{O.price.sub}</span>
                </div>
                <ul className="mt-5 space-y-2.5 text-sm text-slate-700">
                  {O.price.deliverables.map((d) => (
                    <li key={d} className="flex items-start gap-2">
                      <Check className="mt-0.5 h-4 w-4 shrink-0 text-cyan-600" />
                      <span>{d}</span>
                    </li>
                  ))}
                </ul>

                {O.price.addOn && (
                  <div className="mt-5 rounded-xl border border-cyan-300 bg-cyan-50/80 p-3 text-xs text-cyan-900">
                    <div className="flex items-center gap-1.5 font-semibold">
                      <Sparkles className="h-3.5 w-3.5" /> {O.price.addOn.title}
                    </div>
                    <p className="mt-1 leading-relaxed">{O.price.addOn.body}</p>
                  </div>
                )}

                {workload && (
                  <div className="mt-5 rounded-xl border border-slate-200 bg-white p-3 text-xs text-slate-700">
                    <div className="flex items-start gap-2">
                      <Clock className="mt-0.5 h-3.5 w-3.5 shrink-0 text-cyan-600" />
                      <div>
                        <div className="font-semibold text-slate-950">Capacity math</div>
                        <p className="mt-1 leading-relaxed">
                          {workload.visibleTime} reserves {formatHours(workload.reserveHours)} of
                          Ryan's 60-hour week. Planning estimate:{" "}
                          {formatHours(workload.planningHours)}.
                        </p>
                      </div>
                    </div>
                    <div className="mt-3 flex items-start gap-2">
                      <Calendar className="mt-0.5 h-3.5 w-3.5 shrink-0 text-accent-600" />
                      <div>
                        <div className="font-semibold text-slate-950">Delivery promise</div>
                        <p className="mt-1 leading-relaxed">{workload.deliveryPromise}</p>
                      </div>
                    </div>
                  </div>
                )}

                <div className="mt-3 rounded-xl bg-slate-50 border border-slate-200 p-3 text-xs text-slate-600">
                  <Calendar className="inline h-3.5 w-3.5 mr-1 text-cyan-600" />
                  Cancel/reschedule with 24hr notice. Mutual NDA. No specific-outcome guarantees.
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      <InteractiveOfferDecision
        slug={O.slug}
        category={O.category}
        priceBig={O.price.big}
        priceSub={O.price.sub}
        primaryCta={O.primaryCta}
        secondaryCta={O.secondaryCta}
        rightFit={O.rightFit}
        wrongFit={O.wrongFit}
        upgradeCredit={O.upgradeCredit}
        workload={workload}
      />

      {/* WHY BUY */}
      <section className="border-b border-cyan-200/60 bg-gradient-to-br from-[#fff8f1] via-[#eef9ff] to-[#f3eaff]">
        <div className="mx-auto max-w-7xl px-4 py-14 sm:py-16">
          <div className="text-xs uppercase tracking-widest text-cyan-700 font-semibold mb-2">
            Why buy this
          </div>
          <h2 className="text-3xl sm:text-4xl font-semibold tracking-tight text-slate-950 max-w-3xl">
            What you're really paying for.
          </h2>
          <div className="mt-8 grid gap-5 md:grid-cols-3">
            {O.whyBuy.map((r) => (
              <Reason key={r.title} {...r} />
            ))}
          </div>
        </div>
      </section>

      {/* TIMELINE — dark glass strip */}
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
        <div className="relative mx-auto max-w-7xl px-4 py-14 sm:py-16">
          <div className="text-xs uppercase tracking-widest text-cyan-300 font-semibold mb-2">
            What happens when you buy
          </div>
          <h2 className="text-3xl sm:text-4xl font-semibold tracking-tight">
            Start to finish — written down so nothing slips.
          </h2>
          <div className="mt-10 grid gap-4 md:grid-cols-2 lg:grid-cols-4">
            {O.timeline.map((s) => (
              <Step key={s.n} {...s} />
            ))}
          </div>
        </div>
      </section>

      {/* WHO IT'S FOR / NOT FOR */}
      <section className="border-b border-cyan-200/60 bg-gradient-to-br from-[#eef9ff] via-[#fff8f1] to-[#fff1dd]">
        <div className="mx-auto max-w-7xl px-4 py-14 sm:py-16">
          <div className="text-xs uppercase tracking-widest text-cyan-700 font-semibold mb-2">Save us both time</div>
          <h2 className="text-3xl sm:text-4xl font-semibold tracking-tight text-slate-950 mb-8">
            Are you the right buyer for this?
          </h2>
          <div className="grid gap-5 md:grid-cols-2">
            <FitBlock tone="lead" title="Buy this if" items={O.rightFit} />
            <FitBlock tone="rose" title="Don't buy this if" items={O.wrongFit} />
          </div>
        </div>
      </section>

      {/* COST OF NOT BUYING — dark contrast */}
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
        <div className="relative mx-auto max-w-7xl px-4 py-14 sm:py-16">
          <div className="text-xs uppercase tracking-widest text-amber-300 font-semibold mb-2">The math</div>
          <h2 className="text-3xl sm:text-4xl font-semibold tracking-tight mb-2">
            What it costs to NOT do this.
          </h2>
          <p className="text-slate-300 max-w-2xl">
            Spending money on me <em>is</em> spending money on you — because I turn around and put it back
            into your business as a real result. Here's the math both ways.
          </p>
          <div className="mt-8 grid gap-5 md:grid-cols-2">
            <CostBlock tone="amber" title="If you stay stuck" big={O.costMath.stuck.big} sub={O.costMath.stuck.sub} />
            <CostBlock tone="lead"  title="If you invest"     big={O.costMath.buy.big}   sub={O.costMath.buy.sub} />
          </div>
        </div>
      </section>

      {/* PROOF */}
      <section className="border-b border-cyan-200/60 bg-gradient-to-br from-[#f6f9ff] via-[#ecfbff] to-[#fff4e3]">
        <div className="mx-auto max-w-7xl px-4 py-14 sm:py-16">
          <div className="text-xs uppercase tracking-widest text-cyan-700 font-semibold mb-2">
            Why trust Ryan with this
          </div>
          <h2 className="text-3xl sm:text-4xl font-semibold tracking-tight text-slate-950">
            I do this in my own businesses every week.
          </h2>
          <div className="mt-8 grid gap-4 md:grid-cols-2 lg:grid-cols-4">
            {O.proof.map((p) => (
              <ProofTile key={p.label} big={p.big} label={p.label} />
            ))}
          </div>
        </div>
      </section>

      {/* FAQ */}
      <section className="border-b border-cyan-200/60 bg-gradient-to-br from-[#fff8f1] via-[#f6f9ff] to-[#eef9ff]">
        <div className="mx-auto max-w-7xl px-4 py-14 sm:py-16">
          <div className="text-xs uppercase tracking-widest text-cyan-700 font-semibold mb-2">Common questions</div>
          <h2 className="text-3xl sm:text-4xl font-semibold tracking-tight text-slate-950 mb-8">
            Before you buy.
          </h2>
          <div className="grid gap-4 md:grid-cols-2">
            {O.faqs.map((f) => (
              <FAQ key={f.q} q={f.q} a={f.a} />
            ))}
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
        <div className="relative mx-auto max-w-4xl px-4 py-16 text-center">
          <h2 className="text-3xl sm:text-4xl font-semibold tracking-tight">
            Decide. Move. Build the next chapter.
          </h2>
          {O.upgradeCredit && (
            <p className="mt-3 text-sm text-cyan-200">
              <Sparkles className="inline h-4 w-4 mr-1" /> {O.upgradeCredit}
            </p>
          )}
          <div className="mt-7 flex flex-col sm:flex-row items-center justify-center gap-3">
            <Link
              href={O.primaryCta.href}
              className="inline-flex items-center justify-center gap-2 rounded-xl bg-accent-500 px-6 py-3 font-semibold text-white shadow-lg shadow-accent-500/30 hover:bg-accent-600"
            >
              {O.primaryCta.label} <ArrowRight className="h-4 w-4" />
            </Link>
            <Link
              href={O.secondaryCta.href}
              className="inline-flex items-center justify-center gap-2 rounded-xl border border-white/20 bg-white/5 backdrop-blur px-6 py-3 font-semibold text-white hover:bg-white/10"
            >
              {O.secondaryCta.label}
            </Link>
          </div>
          <p className="mt-4 text-xs text-slate-400 max-w-2xl mx-auto leading-relaxed">
            Real Ryan Nichols LLC · Texas-governed under mutual NDA. We do not promise specific outcomes —
            we deliver the work and the deliverables described above.
          </p>
        </div>
      </section>

      <LightFooter />
    </div>
  );
}

/* ─── components ──────────────────────────────────────────────── */

function Reason({ Icon, title, body }: { Icon: any; title: string; body: string }) {
  return (
    <div className="relative overflow-hidden rounded-2xl border border-white/70 bg-white/80 p-6 shadow-[0_22px_55px_-18px_rgba(15,23,42,0.18)] ring-1 ring-cyan-300/20 backdrop-blur">
      <div className="absolute inset-x-0 top-0 h-1 bg-gradient-to-r from-cyan-400 via-brand-500 to-accent-500" />
      <div className="inline-flex h-11 w-11 items-center justify-center rounded-xl bg-gradient-to-br from-cyan-500 to-brand-600 text-white">
        <Icon className="h-5 w-5" />
      </div>
      <h3 className="mt-4 font-semibold text-slate-950 text-lg">{title}</h3>
      <p className="mt-2 text-sm text-slate-700 leading-relaxed">{body}</p>
    </div>
  );
}

function Step({ n, minutes, title, body }: { n: string; minutes: string; title: string; body: string }) {
  return (
    <div className="rounded-2xl border border-white/10 bg-white/[0.04] backdrop-blur p-5 shadow-2xl shadow-black/30">
      <div className="flex items-center justify-between">
        <span className="inline-flex h-8 w-8 items-center justify-center rounded-full bg-gradient-to-br from-cyan-400 to-brand-500 text-white text-sm font-bold">
          {n}
        </span>
        <span className="text-[10px] uppercase tracking-widest text-cyan-300 bg-cyan-400/10 border border-cyan-400/30 px-2 py-0.5 rounded-full">
          {minutes}
        </span>
      </div>
      <div className="mt-3 font-semibold text-white">{title}</div>
      <p className="mt-1 text-sm text-slate-300 leading-relaxed">{body}</p>
    </div>
  );
}

function FitBlock({ tone, title, items }: { tone: "lead" | "rose"; title: string; items: string[] }) {
  const styles =
    tone === "lead"
      ? "border-cyan-200 bg-cyan-50"
      : "border-rose-200 bg-rose-50";
  const chip =
    tone === "lead"
      ? "border-cyan-300 bg-cyan-100 text-cyan-800"
      : "border-rose-300 bg-rose-100 text-rose-800";
  const iconColor = tone === "lead" ? "text-cyan-600" : "text-rose-600";
  const Pill = tone === "lead" ? Check : XIcon;
  return (
    <div className={`rounded-2xl border ${styles} p-6`}>
      <div className={`inline-flex items-center gap-2 rounded-full border ${chip} px-3 py-1 text-xs font-semibold uppercase tracking-widest`}>
        <Pill className="h-3.5 w-3.5" /> {tone === "lead" ? "Right fit" : "Wrong fit"}
      </div>
      <h3 className="mt-3 text-xl font-semibold text-slate-950">{title}</h3>
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

function CostBlock({ tone, title, big, sub }: { tone: "lead" | "amber"; title: string; big: string; sub: string }) {
  const ring = tone === "lead" ? "border-cyan-400/30 bg-cyan-400/10" : "border-amber-400/30 bg-amber-400/10";
  const chip = tone === "lead" ? "text-cyan-300" : "text-amber-300";
  return (
    <div className={`rounded-2xl border ${ring} backdrop-blur p-6`}>
      <div className={`text-xs uppercase tracking-widest ${chip} font-semibold`}>{title}</div>
      <div className="mt-2 text-4xl sm:text-5xl font-bold tabular-nums text-white">{big}</div>
      <p className="mt-2 text-sm text-slate-200 leading-relaxed">{sub}</p>
    </div>
  );
}

function ProofTile({ big, label }: { big: string; label: string }) {
  return (
    <div className="relative overflow-hidden rounded-2xl border border-white/70 bg-white/85 p-5 shadow-[0_20px_50px_-15px_rgba(15,23,42,0.14)] ring-1 ring-cyan-300/20 backdrop-blur">
      <div
        aria-hidden
        className="absolute -right-10 -top-10 h-24 w-24 rounded-full opacity-45 blur-2xl"
        style={{ background: "radial-gradient(circle, rgba(92,208,255,0.75) 0%, transparent 70%)" }}
      />
      <div className="relative text-3xl sm:text-4xl font-bold bg-gradient-to-r from-brand-700 via-cyan-600 to-accent-500 bg-clip-text text-transparent tabular-nums">{big}</div>
      <div className="mt-2 text-sm text-slate-600 leading-snug">{label}</div>
    </div>
  );
}

function FAQ({ q, a }: { q: string; a: string }) {
  return (
    <div className="rounded-2xl border border-white/70 bg-white/80 p-5 shadow-[0_20px_50px_-15px_rgba(15,23,42,0.12)] ring-1 ring-slate-900/5 backdrop-blur">
      <div className="font-semibold text-slate-950">{q}</div>
      <p className="mt-2 text-sm text-slate-700 leading-relaxed">{a}</p>
    </div>
  );
}
