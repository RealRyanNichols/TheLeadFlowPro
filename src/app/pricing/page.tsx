// src/app/pricing/page.tsx — standalone /pricing overview (kills the 404)
import Link from "next/link";
import { ArrowRight, ShieldCheck, Network, TrendingUp } from "lucide-react";
import { Pricing } from "@/components/site/Pricing";
import { TIERS } from "@/lib/tiers";

export const metadata = {
  title: "Pricing — The LeadFlow Pro",
  description:
    "Four paid tiers from $5 to $95/month. 14-day money-back guarantee. Free forever tier available. Shared Brain access on every plan.",
};

export default function PricingPage() {
  return (
    <main className="relative">
      <div className="absolute inset-0 -z-10 bg-promo-glow" />
      <div className="absolute inset-0 -z-10 bg-grid-fade" />

      <section className="container pt-10 pb-6 md:pt-14 md:pb-10 text-center max-w-4xl mx-auto animate-fade-up">
        <h1 className="text-4xl md:text-6xl font-extrabold tracking-tight">
          Simple pricing. <span className="funnel-text">Real outcomes.</span>
        </h1>
        <p className="mt-4 text-xl text-ink-100 max-w-2xl mx-auto leading-relaxed">
          No setup fees. No contracts. No "contact sales."
          <br />
          Pick the tier that fits today, upgrade when you outgrow it.
        </p>
        <div className="mt-5 flex flex-wrap justify-center gap-2 text-xs">
          <span className="inline-flex items-center gap-1 px-3 py-1 rounded-full bg-emerald-500/10 border border-emerald-400/30 text-emerald-200">
            <ShieldCheck className="h-3.5 w-3.5" /> 14-day money-back
          </span>
          <span className="inline-flex items-center gap-1 px-3 py-1 rounded-full bg-cyan-500/10 border border-cyan-400/30 text-cyan-200">
            <Network className="h-3.5 w-3.5" /> Shared Brain on every plan
          </span>
          <span className="inline-flex items-center gap-1 px-3 py-1 rounded-full bg-amber-500/10 border border-amber-400/30 text-amber-200">
            <TrendingUp className="h-3.5 w-3.5" /> Upgrade or downgrade anytime
          </span>
        </div>
      </section>

      {/* Existing Pricing grid (reused) */}
      <Pricing />

      {/* Sales-page deep-links */}
      <section className="container py-10 md:py-14 max-w-5xl mx-auto animate-fade-up">
        <h2 className="text-2xl md:text-3xl font-extrabold text-center">
          Want the full story on each tier?
        </h2>
        <p className="mt-2 text-center text-ink-300">
          Each paid plan has a dedicated page with use cases, ROI math, FAQs, and what's really inside.
        </p>
        <div className="mt-6 grid sm:grid-cols-2 md:grid-cols-4 gap-3">
          {(["starter", "growth", "pro", "agency"] as const).map((slug) => {
            const t = TIERS[slug];
            return (
              <Link
                key={slug}
                href={`/pricing/${slug}`}
                className="group rounded-2xl border border-cyan-400/20 bg-white/[0.03] p-5 hover:border-cyan-300/50 hover:bg-white/[0.06] transition"
              >
                <div className="flex items-baseline justify-between">
                  <span className="text-sm font-bold uppercase tracking-widest text-cyan-300">
                    {t.name}
                  </span>
                  {t.featured && (
                    <span className="text-[10px] px-2 py-0.5 rounded-full bg-amber-400/20 text-amber-200 uppercase tracking-wider">
                      Popular
                    </span>
                  )}
                </div>
                <div className="mt-2 text-3xl font-extrabold text-white">
                  ${t.priceMonthly}
                  <span className="text-base font-normal text-ink-300">/mo</span>
                </div>
                <p className="mt-2 text-sm text-ink-100 line-clamp-2">{t.subhead}</p>
                <div className="mt-4 inline-flex items-center gap-1 text-sm text-cyan-300 group-hover:text-cyan-200">
                  Read the {t.name} breakdown{" "}
                  <ArrowRight className="h-4 w-4 transition group-hover:translate-x-1" />
                </div>
              </Link>
            );
          })}
        </div>
      </section>

      {/* Trust footer */}
      <section className="container py-8 md:py-12 text-center max-w-2xl mx-auto animate-fade-up">
        <p className="text-ink-300 text-sm">
          Every paid plan is covered by a{" "}
          <span className="text-white font-semibold">14-day money-back guarantee</span>. If LeadFlow
          Pro doesn't pay for itself in the first two weeks, email us and we refund every dollar.
          Full terms on our{" "}
          <Link href="/legal" className="text-cyan-300 hover:underline">
            legal page
          </Link>
          .
        </p>
      </section>
    </main>
  );
}
