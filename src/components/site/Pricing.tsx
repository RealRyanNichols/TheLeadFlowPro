import Link from "next/link";
import { Check, Zap, Sparkles } from "lucide-react";
import { PLANS, BOOSTERS } from "@/lib/pricing";
import { cn } from "@/lib/utils";
import { CheckoutButton } from "./CheckoutButton";

export function Pricing() {
  return (
    <section id="pricing" className="py-12 md:py-24">
      <div className="container">
        <div className="text-center max-w-3xl mx-auto mb-8 md:mb-14">
          <p className="text-cyan-400 text-xs md:text-sm font-semibold uppercase tracking-wider mb-2 md:mb-3">
            Pricing — every step is just $5 more
          </p>
          <h2 className="text-3xl md:text-5xl font-extrabold">
            Start free. <span className="funnel-text">Grow on coffee money.</span>
          </h2>
          <p className="mt-3 md:mt-5 text-ink-200 text-base md:text-lg">
            Free is genuinely useful — lead inbox + missed-call text-back + AI snapshot.
            Upgrades cost less than lunch and unlock real horsepower.
          </p>
        </div>

        <div className="grid gap-4 md:gap-5 lg:grid-cols-5 md:grid-cols-2">
          {PLANS.map((plan) => (
            <div
              key={plan.id}
              className={cn(
                "glass rounded-2xl p-5 md:p-6 flex flex-col relative",
                plan.highlight &&
                  "ring-2 ring-cyan-500/60 shadow-2xl shadow-cyan-500/10 lg:scale-[1.03]"
              )}
            >
              {plan.highlight && (
                <span className="absolute -top-3 left-1/2 -translate-x-1/2 stat-pill bg-cyan-500 text-ink-950 font-bold">
                  Most popular
                </span>
              )}
              <div>
                <h3 className="text-xl font-bold text-white">{plan.name}</h3>
                <div className="mt-3 flex items-baseline gap-1">
                  <span className="text-4xl font-extrabold text-white">
                    ${plan.priceMonthly}
                  </span>
                  <span className="text-ink-300 text-sm">/mo</span>
                </div>
                <p className="mt-2 text-sm text-ink-200 min-h-[2.5rem]">
                  {plan.blurb}
                </p>
              </div>

              <ul className="mt-5 space-y-2 text-sm text-ink-100 flex-1">
                {plan.features.map((f) => (
                  <li key={f} className="flex gap-2">
                    <Check className="h-4 w-4 text-lead-500 shrink-0 mt-0.5" />
                    <span>{f}</span>
                  </li>
                ))}
              </ul>

              <div className="mt-6">
                {plan.priceMonthly === 0 ? (
                  <Link href="/dashboard" className="btn-ghost text-sm py-2.5 w-full">
                    Start free
                  </Link>
                ) : (
                  <CheckoutButton
                    priceKey={plan.id}
                    variant={plan.highlight ? "accent" : "ghost"}
                  >
                    Get {plan.name}
                  </CheckoutButton>
                )}
              </div>
            </div>
          ))}
        </div>

        {/* BOOSTERS — micro-upsells */}
        <div className="mt-12 md:mt-20">
          <div className="text-center max-w-2xl mx-auto mb-6 md:mb-10">
            <p className="text-accent-400 text-xs md:text-sm font-semibold uppercase tracking-wider mb-2 flex items-center justify-center gap-2">
              <Sparkles className="h-4 w-4" /> Boosters — top up anytime
            </p>
            <h3 className="text-2xl md:text-4xl font-extrabold text-white">
              On a hot streak? <span className="funnel-text">Pour gas on it.</span>
            </h3>
            <p className="mt-2 md:mt-3 text-ink-300 text-sm md:text-base">
              One-time packs for when the tool's working and you want more of it.
              No plan change, no commitment — just a tap.
            </p>
          </div>

          <div className="grid gap-3 md:gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {BOOSTERS.map((b) => (
              <div key={b.id} className="glass rounded-2xl p-4 md:p-5 flex flex-col hover:border-accent-500/40 transition">
                <div className="flex items-start justify-between gap-2">
                  <div className="inline-flex h-9 w-9 rounded-xl bg-accent-500/15 text-accent-400 items-center justify-center shrink-0">
                    <Zap className="h-4 w-4" />
                  </div>
                  <div className="text-right">
                    <span className="text-2xl font-extrabold text-white">${b.priceUsd}</span>
                  </div>
                </div>
                <h4 className="mt-3 text-base font-bold text-white">{b.name}</h4>
                <p className="mt-1 text-sm text-ink-200">{b.oneLiner}</p>
                <div className="mt-3 text-xs text-ink-400 space-y-1">
                  <p><span className="text-cyan-400 font-semibold">Get:</span> {b.give}</p>
                  <p><span className="text-accent-400 font-semibold">Nice for:</span> {b.niceFor}</p>
                </div>
                <div className="mt-4">
                  <CheckoutButton priceKey={b.id} variant="ghost">
                    Buy — ${b.priceUsd}
                  </CheckoutButton>
                </div>
              </div>
            ))}
          </div>

          <p className="mt-6 md:mt-8 text-center text-xs text-ink-400 max-w-2xl mx-auto">
            Hit your cap without a booster? Pay-as-you-go kicks in at $0.04 per AI action
            and $0.03 per SMS — we'll show you the cheaper booster right in the app so you
            never pay more than you need to.
          </p>
        </div>

        <p className="mt-10 text-center text-xs text-ink-400">
          Every paid plan includes a 14-day money-back guarantee. Cancel anytime in one click.
        </p>
      </div>
    </section>
  );
}
