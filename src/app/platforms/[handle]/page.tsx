// src/app/platforms/[handle]/page.tsx — Per-platform sales page.
//
// Same warm-glass-with-dark-accents rhythm as /offers/[slug]. The hook of
// each page is the DIY-vs-You comparison: 3 metrics (followers, time,
// leads) shown side-by-side so a buyer immediately sees what changes.

import Link from "next/link";
import { notFound } from "next/navigation";
import {
  ArrowRight, BadgeCheck, Check, Clock, Sparkles, TrendingUp, Users,
  X as XIcon,
} from "lucide-react";
import { LightHeader, LightFooter } from "@/components/site/LightHeader";
import { PLATFORMS, type PlatformHandle } from "@/lib/platforms";
import { OFFERS, type OfferSlug } from "@/lib/offers";

export function generateStaticParams() {
  return Object.keys(PLATFORMS).map((handle) => ({ handle }));
}

type Props = { params: { handle: string } };

export function generateMetadata({ params }: Props) {
  const p = PLATFORMS[params.handle as PlatformHandle];
  if (!p) return { title: "Platform · The LeadFlow Pro" };
  return { title: p.metaTitle, description: p.metaDescription };
}

export default function PlatformPage({ params }: Props) {
  const p = PLATFORMS[params.handle as PlatformHandle];
  if (!p) notFound();
  const Icon = p.Icon;
  const offer = OFFERS[p.primaryOfferSlug as OfferSlug];

  return (
    <div className="min-h-screen bg-white text-slate-900">
      <LightHeader />

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
          style={{ background: `radial-gradient(circle, ${p.brandColor}55 0%, transparent 65%)` }}
        />
        <div
          aria-hidden
          className="absolute -bottom-40 -left-32 h-[560px] w-[560px] rounded-full opacity-50 blur-3xl"
          style={{ background: "radial-gradient(circle, rgba(35,184,255,0.45) 0%, transparent 65%)" }}
        />

        <div className="relative mx-auto max-w-7xl px-4 py-16 sm:py-20">
          <div className="grid gap-10 lg:grid-cols-2 lg:items-center">
            <div>
              <div className="inline-flex items-center gap-2 rounded-full border border-cyan-300 bg-white/70 backdrop-blur px-3 py-1 text-xs uppercase tracking-widest text-cyan-700 font-semibold shadow-sm">
                <Icon className="h-3.5 w-3.5" /> {p.displayName} · Done-for-you growth
              </div>
              <h1 className="mt-5 text-4xl sm:text-5xl lg:text-6xl font-semibold tracking-tight leading-tight text-slate-950">
                {p.hero.h1Lead}{" "}
                <span className="bg-gradient-to-r from-brand-700 via-cyan-500 to-accent-500 bg-clip-text text-transparent">
                  {p.hero.h1Highlight}
                </span>
              </h1>
              <p className="mt-5 text-lg text-slate-700 leading-relaxed">{p.hero.paragraph}</p>
              <div className="mt-7 flex flex-col sm:flex-row gap-3">
                <Link
                  href={`/offers/${p.primaryOfferSlug}`}
                  className="inline-flex items-center justify-center gap-2 rounded-xl bg-slate-900 px-6 py-3 font-semibold text-white shadow-lg shadow-slate-900/30 hover:bg-slate-800"
                >
                  {p.primaryCtaLabel} <ArrowRight className="h-4 w-4" />
                </Link>
                <Link
                  href="/book"
                  className="inline-flex items-center justify-center gap-2 rounded-xl border border-slate-300 bg-white/80 backdrop-blur px-6 py-3 font-semibold text-slate-800 hover:border-brand-500 hover:text-brand-700"
                >
                  Free 10-min call first
                </Link>
              </div>
            </div>

            {/* Ryan's growth glass card */}
            <div className="relative rounded-3xl border border-white/60 bg-white/70 backdrop-blur-xl p-6 shadow-[0_30px_70px_-20px_rgba(15,23,42,0.20)] ring-1 ring-slate-900/5">
              <div className="flex items-center justify-between">
                <div className="text-[10px] uppercase tracking-widest text-slate-500 font-semibold">My {p.displayName}</div>
                <span className="inline-flex items-center gap-1.5 rounded-full bg-cyan-50 border border-cyan-200 px-2.5 py-0.5 text-xs font-semibold text-cyan-800">
                  <span className="h-1.5 w-1.5 rounded-full bg-cyan-500 animate-pulse" />
                  Real numbers
                </span>
              </div>
              <div className="mt-2 flex items-baseline gap-2">
                <span className="text-5xl font-bold text-slate-950 tabular-nums">{p.ryanGrowth.current}</span>
                <span className="text-sm text-slate-500">followers / subs</span>
              </div>
              <div className="mt-1 text-sm text-slate-600">Started at {p.ryanGrowth.started}. {p.ryanGrowth.months}.</div>
              <div className="mt-4 rounded-xl bg-slate-50 border border-slate-200 p-3 text-xs text-slate-700 leading-relaxed">
                {p.ryanGrowth.note}
              </div>
              <div className="mt-4 rounded-xl border border-accent-300 bg-accent-300/15 p-3 text-xs text-slate-800">
                <strong className="text-slate-950">The reef-barrier rule:</strong> Most owners quit
                between 0 and the first 1,000 followers. Past that, the algorithm starts trusting you.
                I've crossed the reef on every platform — I know exactly where it is on yours.
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* WHO IT'S FOR */}
      <section className="border-b border-slate-200 bg-white">
        <div className="mx-auto max-w-7xl px-4 py-14 sm:py-16">
          <div className="text-xs uppercase tracking-widest text-cyan-700 font-semibold mb-2">
            Why {p.displayName} matters
          </div>
          <h2 className="text-3xl sm:text-4xl font-semibold tracking-tight text-slate-950 max-w-3xl">
            Different audiences. Same algorithm logic. Same playbook.
          </h2>
          <div className="mt-8 grid gap-5 md:grid-cols-3">
            {p.audiences.map((a) => (
              <div key={a.who} className="rounded-2xl border border-slate-200 bg-white p-6 shadow-[0_20px_50px_-15px_rgba(15,23,42,0.10)]">
                <div className="inline-flex items-center gap-2 rounded-full border border-cyan-300 bg-cyan-50 px-3 py-1 text-xs font-semibold uppercase tracking-widest text-cyan-700">
                  <Users className="h-3.5 w-3.5" /> {a.who}
                </div>
                <p className="mt-3 text-sm text-slate-700 leading-relaxed">{a.why}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* DIY VS RYAN — DARK ACCENT, the centerpiece */}
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
        <div className="relative mx-auto max-w-7xl px-4 py-16 sm:py-20">
          <div className="text-xs uppercase tracking-widest text-cyan-300 font-semibold mb-2">
            With me vs. without me
          </div>
          <h2 className="text-3xl sm:text-4xl font-semibold tracking-tight max-w-3xl">
            What changes the moment I'm running {p.displayName} for you.
          </h2>
          <p className="mt-3 text-slate-300 max-w-2xl">
            This is a planning comparison, not a promise. The actual 30/60/90 projection gets set
            after intake from your current baseline, your offer, your access, and your budget.
          </p>

          <div className="mt-10 overflow-hidden rounded-3xl border border-white/10 bg-white/[0.03] backdrop-blur-xl shadow-2xl shadow-black/40">
            <div className="grid grid-cols-3 border-b border-white/10 bg-white/[0.02]">
              <div className="p-4 text-[11px] uppercase tracking-widest text-slate-400 font-semibold">Metric</div>
              <div className="p-4 text-[11px] uppercase tracking-widest text-rose-300 font-semibold border-l border-white/10">
                You alone (DIY)
              </div>
              <div className="p-4 text-[11px] uppercase tracking-widest text-cyan-300 font-semibold border-l border-white/10">
                With me running it
              </div>
            </div>
            {p.diyVsYou.map((row) => (
              <div key={row.metric} className="grid grid-cols-3 border-b border-white/5 last:border-b-0">
                <div className="p-4 text-sm font-semibold text-white">{row.metric}</div>
                <div className="p-4 text-sm text-rose-200 border-l border-white/10">
                  <XIcon className="inline h-3.5 w-3.5 mr-1 text-rose-400" />
                  {row.diy}
                </div>
                <div className="p-4 text-sm text-cyan-100 border-l border-white/10">
                  <Check className="inline h-3.5 w-3.5 mr-1 text-cyan-300" />
                  {row.you}
                </div>
              </div>
            ))}
          </div>

          <div className="mt-10 flex flex-col sm:flex-row items-center justify-center gap-3">
            <Link
              href={`/offers/${p.primaryOfferSlug}`}
              className="inline-flex items-center justify-center gap-2 rounded-xl bg-accent-500 px-6 py-3 font-semibold text-white shadow-lg shadow-accent-500/30 hover:bg-accent-600"
            >
              {offer ? `${p.primaryCtaLabel} — ${offer.price.big}${offer.price.sub.startsWith('/') ? offer.price.sub : ''}` : p.primaryCtaLabel}
              <ArrowRight className="h-4 w-4" />
            </Link>
            <Link
              href="/book"
              className="inline-flex items-center justify-center gap-2 rounded-xl border border-white/20 bg-white/5 backdrop-blur px-6 py-3 font-semibold text-white hover:bg-white/10"
            >
              Free 10-min call
            </Link>
          </div>
        </div>
      </section>

      {/* SAMPLE POSTS — placeholders for Ryan to drop real screenshots */}
      <section className="border-b border-slate-200 bg-white">
        <div className="mx-auto max-w-7xl px-4 py-14 sm:py-16">
          <div className="text-xs uppercase tracking-widest text-cyan-700 font-semibold mb-2">
            What we'd ship for you
          </div>
          <h2 className="text-3xl sm:text-4xl font-semibold tracking-tight text-slate-950 max-w-3xl">
            Three post types I'd run in your name on {p.displayName}.
          </h2>
          <p className="mt-3 text-slate-700 max-w-2xl">
            Real screenshots from Ryan's own {p.displayName} drop in here as he ships them. For now,
            here's the playbook structure.
          </p>

          <div className="mt-8 grid gap-5 md:grid-cols-3">
            {p.samplePosts.map((s, i) => (
              <div key={s.type} className="rounded-2xl border border-slate-200 bg-gradient-to-br from-slate-50 to-white p-6 shadow-[0_20px_50px_-15px_rgba(15,23,42,0.10)]">
                <div className="flex items-center justify-between">
                  <span className="inline-flex items-center gap-1.5 rounded-full bg-cyan-100 px-2.5 py-0.5 text-xs font-semibold text-cyan-800">
                    Sample {i + 1}
                  </span>
                  <span className="inline-flex items-center gap-1.5 rounded-full bg-amber-100 px-2.5 py-0.5 text-xs font-semibold text-amber-800">
                    Real screenshot coming
                  </span>
                </div>
                <div className="mt-3 text-base font-semibold text-slate-950">{s.type}</div>
                <p className="mt-1 text-sm text-slate-700 leading-relaxed">{s.note}</p>
                {/* Empty-frame placeholder where the real screenshot will live */}
                <div className="mt-4 aspect-[4/5] rounded-xl border-2 border-dashed border-slate-300 bg-slate-100 flex items-center justify-center text-xs text-slate-500 text-center px-4 leading-relaxed">
                  Real {p.displayName} screenshot drops here.<br />
                  Ryan curates from his account.
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* FAQ */}
      <section className="border-b border-slate-200 bg-slate-50">
        <div className="mx-auto max-w-7xl px-4 py-14 sm:py-16">
          <div className="text-xs uppercase tracking-widest text-cyan-700 font-semibold mb-2">Common questions</div>
          <h2 className="text-3xl sm:text-4xl font-semibold tracking-tight text-slate-950 mb-8">
            Before I run {p.displayName} for you.
          </h2>
          <div className="grid gap-4 md:grid-cols-2">
            {p.faqs.map((f) => (
              <div key={f.q} className="rounded-2xl border border-slate-200 bg-white p-5 shadow-[0_20px_50px_-15px_rgba(15,23,42,0.08)]">
                <div className="font-semibold text-slate-950">{f.q}</div>
                <p className="mt-2 text-sm text-slate-700 leading-relaxed">{f.a}</p>
              </div>
            ))}
            <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-[0_20px_50px_-15px_rgba(15,23,42,0.08)]">
              <div className="font-semibold text-slate-950">Texas-law NDA?</div>
              <p className="mt-2 text-sm text-slate-700 leading-relaxed">
                Yes. Mutual. Sample available before you start. Every paid engagement is governed
                by a Texas-law engagement letter.
              </p>
            </div>
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
            Get me past the reef on {p.displayName}.
          </h2>
          <p className="mt-3 text-slate-300 max-w-2xl mx-auto">
            The reef-barrier is real. The first 1,000 followers feel impossible. Past that, the
            algorithm starts working with you, not against you. I've crossed it on every platform —
            now let's get you across.
          </p>
          <div className="mt-7 flex flex-col sm:flex-row items-center justify-center gap-3">
            <Link
              href={`/offers/${p.primaryOfferSlug}`}
              className="inline-flex items-center justify-center gap-2 rounded-xl bg-accent-500 px-6 py-3 font-semibold text-white shadow-lg shadow-accent-500/30 hover:bg-accent-600"
            >
              {p.primaryCtaLabel} <ArrowRight className="h-4 w-4" />
            </Link>
            <Link
              href="/book"
              className="inline-flex items-center justify-center gap-2 rounded-xl border border-white/20 bg-white/5 backdrop-blur px-6 py-3 font-semibold text-white hover:bg-white/10"
            >
              Free 10-min call
            </Link>
          </div>
        </div>
      </section>

      <LightFooter />
    </div>
  );
}
