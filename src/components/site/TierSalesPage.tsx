// src/components/site/TierSalesPage.tsx
// Shared long-form sales page layout. One component, rendered 4 times
// (Starter / Growth / Pro / Agency) with different tier data.

import Link from "next/link";
import { CheckCircle2, XCircle, ArrowRight, Sparkles, Quote, ShieldCheck } from "lucide-react";
import { Tier, TIERS } from "@/lib/tiers";
import { CheckoutButton } from "./CheckoutButton";

export function TierSalesPage({ tier }: { tier: Tier }) {
  return (
    <main className="relative">
      <div className="absolute inset-0 -z-10 bg-promo-glow" />
      <div className="absolute inset-0 -z-10 bg-grid-fade" />

      {/* HERO / HEADLINE */}
      <section className="container pt-10 pb-8 md:pt-14 md:pb-12 text-center max-w-4xl mx-auto animate-fade-up">
        <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-cyan-400/10 border border-cyan-400/30 text-cyan-200 text-xs font-semibold mb-4">
          <Sparkles className="h-4 w-4" />
          LeadFlow Pro · {tier.name} tier
          {tier.featured && (
            <span className="ml-2 px-2 py-0.5 rounded-full bg-amber-400/20 text-amber-200 text-[10px] uppercase tracking-wider">
              Most picked
            </span>
          )}
        </div>
        <h1 className="text-4xl md:text-6xl font-extrabold tracking-tight">
          <span className="funnel-text">{tier.name}</span>{" "}
          <span className="text-white">— ${tier.priceMonthly}/mo</span>
        </h1>
        <p className="mt-4 text-xl md:text-2xl text-ink-100 leading-relaxed">{tier.subhead}</p>
        <p className="mt-3 text-base md:text-lg text-ink-300 leading-relaxed">{tier.tagline}</p>

        <div className="mt-8 flex flex-col sm:flex-row items-center justify-center gap-3">
          <CheckoutButton
            priceKey={tier.slug}
            variant="accent"
            className="text-base py-3 px-6"
          >
            Start {tier.name} — ${tier.priceMonthly}/mo
          </CheckoutButton>
          <Link href="/signup" className="btn-ghost text-base py-3 px-6">
            Try the free tier first
          </Link>
        </div>
        <p className="mt-3 text-xs text-ink-300">
          14-day money-back guarantee · Cancel anytime in one click · No setup fee
        </p>
      </section>

      {/* IDEAL FOR */}
      <section className="container py-8 md:py-12 max-w-4xl mx-auto animate-fade-up">
        <h2 className="text-sm font-bold uppercase tracking-widest text-cyan-300">Who this is for</h2>
        <div className="mt-4 grid md:grid-cols-2 gap-3">
          {tier.idealFor.map((line) => (
            <div
              key={line}
              className="flex items-start gap-3 rounded-xl border border-white/10 bg-white/[0.03] p-4"
            >
              <CheckCircle2 className="h-5 w-5 text-emerald-300 shrink-0 mt-0.5" />
              <p className="text-ink-100">{line}</p>
            </div>
          ))}
        </div>
      </section>

      {/* USE CASES */}
      <section className="container py-8 md:py-12 max-w-5xl mx-auto animate-fade-up">
        <h2 className="text-3xl md:text-4xl font-extrabold text-center">
          What <span className="funnel-text">{tier.name}</span> actually does for you
        </h2>
        <p className="mt-3 text-center text-ink-300 max-w-2xl mx-auto">
          Four real scenarios. Not features — moments where this plan pays you back.
        </p>
        <div className="mt-8 grid md:grid-cols-2 gap-4 md:gap-6">
          {tier.useCases.map((uc, i) => (
            <div
              key={uc.title}
              className="rounded-2xl border border-cyan-400/20 bg-white/[0.03] p-5 md:p-6 hover:border-cyan-300/40 transition"
            >
              <div className="flex items-center gap-3 mb-3">
                <div className="rounded-lg bg-cyan-400/10 border border-cyan-400/30 text-cyan-200 w-8 h-8 flex items-center justify-center font-bold text-sm">
                  {i + 1}
                </div>
                <h3 className="text-lg md:text-xl font-bold text-white">{uc.title}</h3>
              </div>
              <p className="text-ink-100 leading-relaxed">{uc.body}</p>
            </div>
          ))}
        </div>
      </section>

      {/* FEATURES + NOT INCLUDED */}
      <section className="container py-8 md:py-12 max-w-5xl mx-auto animate-fade-up">
        <div className="grid md:grid-cols-2 gap-6">
          <div className="rounded-2xl border border-emerald-400/20 bg-emerald-500/[0.04] p-6">
            <h3 className="text-sm font-bold uppercase tracking-widest text-emerald-300 mb-4">
              What's included
            </h3>
            <ul className="space-y-2.5">
              {tier.features.map((f) => (
                <li key={f} className="flex items-start gap-2 text-ink-100">
                  <CheckCircle2 className="h-5 w-5 text-emerald-300 shrink-0 mt-0.5" />
                  <span>{f}</span>
                </li>
              ))}
            </ul>
          </div>
          <div className="rounded-2xl border border-white/10 bg-white/[0.02] p-6">
            <h3 className="text-sm font-bold uppercase tracking-widest text-ink-300 mb-4">
              Where to upgrade if you need more
            </h3>
            <ul className="space-y-2.5">
              {tier.notIncluded.map((f) => (
                <li key={f} className="flex items-start gap-2 text-ink-300">
                  <XCircle className="h-5 w-5 text-ink-300 shrink-0 mt-0.5" />
                  <span>{f}</span>
                </li>
              ))}
            </ul>
          </div>
        </div>
      </section>

      {/* ROI MATH */}
      <section className="container py-8 md:py-12 max-w-3xl mx-auto animate-fade-up">
        <div className="rounded-2xl border border-amber-400/30 bg-gradient-to-br from-amber-500/[0.06] to-orange-500/[0.04] p-6 md:p-8">
          <h3 className="text-sm font-bold uppercase tracking-widest text-amber-200 mb-3">
            The math
          </h3>
          <p className="text-ink-100 text-lg leading-relaxed">{tier.roi.setup}</p>
          <p className="mt-3 text-ink-100 leading-relaxed">{tier.roi.math}</p>
          <p className="mt-3 text-white font-bold leading-relaxed">{tier.roi.conclusion}</p>
        </div>
      </section>

      {/* TESTIMONIAL — only render if a real one has been provided. No invented quotes. */}
      {tier.testimonial && (
        <section className="container py-8 md:py-12 max-w-3xl mx-auto animate-fade-up">
          <div className="rounded-2xl border border-white/10 bg-white/[0.03] p-6 md:p-8">
            <Quote className="h-8 w-8 text-cyan-300 mb-3" />
            <blockquote className="text-lg md:text-xl text-white italic leading-relaxed">
              “{tier.testimonial.quote}”
            </blockquote>
            <p className="mt-4 text-ink-300">
              <span className="text-white font-semibold">{tier.testimonial.name}</span> ·{" "}
              {tier.testimonial.business}
            </p>
            <p className="mt-1 text-xs text-ink-300">
              Shared with permission. Results not guaranteed.
            </p>
          </div>
        </section>
      )}

      {/* FAQ */}
      <section className="container py-8 md:py-12 max-w-3xl mx-auto animate-fade-up">
        <h2 className="text-3xl md:text-4xl font-extrabold text-center">Questions you'd ask</h2>
        <div className="mt-8 space-y-3">
          {tier.faq.map((f) => (
            <details
              key={f.q}
              className="group rounded-xl border border-white/10 bg-white/[0.03] overflow-hidden"
            >
              <summary className="cursor-pointer list-none p-4 md:p-5 flex items-start gap-3 hover:bg-white/[0.02]">
                <span className="text-cyan-300 font-bold mt-0.5">?</span>
                <span className="text-white font-semibold flex-1">{f.q}</span>
                <span className="text-ink-300 group-open:rotate-180 transition">▾</span>
              </summary>
              <div className="px-4 md:px-5 pb-4 md:pb-5 pl-11 text-ink-100 leading-relaxed">
                {f.a}
              </div>
            </details>
          ))}
        </div>
      </section>

      {/* CLOSING CTA */}
      <section className="container py-12 md:py-20 text-center animate-fade-up">
        <h2 className="text-3xl md:text-5xl font-extrabold">
          Ready to try <span className="funnel-text">{tier.name}</span>?
        </h2>
        <p className="mt-3 text-ink-300 max-w-xl mx-auto">
          14 days to decide. If it doesn't earn back the ${tier.priceMonthly} we owe you, we refund it. Simple.
        </p>
        <div className="mt-6 flex flex-col sm:flex-row items-center justify-center gap-3">
          <CheckoutButton
            priceKey={tier.slug}
            variant="accent"
            className="text-base py-3 px-6"
          >
            Start {tier.name} — ${tier.priceMonthly}/mo
          </CheckoutButton>
          <Link
            href="/pricing"
            className="inline-flex items-center gap-2 text-ink-100 hover:text-white"
          >
            Compare all plans
            <ArrowRight className="h-4 w-4" />
          </Link>
        </div>
        <p className="mt-4 text-xs text-ink-300 inline-flex items-center gap-1">
          <ShieldCheck className="h-3 w-3" /> Your data is yours · No card required for the free tier
        </p>
      </section>
    </main>
  );
}
