import Link from "next/link";
import { Check } from "lucide-react";
import { PLANS } from "@/lib/pricing";
import { cn } from "@/lib/utils";

export function Pricing() {
  return (
    <section id="pricing" className="py-24">
      <div className="container">
        <div className="text-center max-w-3xl mx-auto mb-14">
          <p className="text-cyan-400 text-sm font-semibold uppercase tracking-wider mb-3">
            Pricing — every step is just $5 more
          </p>
          <h2 className="text-4xl md:text-5xl font-extrabold">
            Start free. <span className="funnel-text">Grow on coffee money.</span>
          </h2>
          <p className="mt-5 text-ink-200 text-lg">
            Free is genuinely useful — lead inbox + missed-call text-back + AI snapshot.
            Upgrades cost less than lunch and unlock real horsepower.
          </p>
        </div>

        <div className="grid gap-5 lg:grid-cols-5 md:grid-cols-2">
          {PLANS.map((plan) => (
            <div
              key={plan.id}
              className={cn(
                "glass rounded-2xl p-6 flex flex-col relative",
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

              <ul className="mt-6 space-y-2 text-sm text-ink-100 flex-1">
                {plan.features.map((f) => (
                  <li key={f} className="flex gap-2">
                    <Check className="h-4 w-4 text-lead-500 shrink-0 mt-0.5" />
                    <span>{f}</span>
                  </li>
                ))}
              </ul>

              <Link
                href={plan.priceMonthly === 0 ? "/signup" : `/signup?plan=${plan.id}`}
                className={cn(
                  "mt-6 text-sm py-2.5",
                  plan.highlight ? "btn-accent" : "btn-ghost"
                )}
              >
                {plan.priceMonthly === 0 ? "Start free" : `Get ${plan.name}`}
              </Link>
            </div>
          ))}
        </div>

        <p className="mt-10 text-center text-xs text-ink-400">
          Every paid plan includes a 14-day money-back guarantee. Cancel anytime in one click.
        </p>
      </div>
    </section>
  );
}
