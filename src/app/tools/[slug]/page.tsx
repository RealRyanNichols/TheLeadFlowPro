// src/app/tools/[slug]/page.tsx - Per-tool interactive page.
//
// Above the fold: H1 + outcome + interactive demo + tease-to-convert callout.
// Below the fold: 6-section anatomy (deliverables, who it's for, before/after,
// why this price, FAQ, CTA) matching the offer-page upgrade.
//
// Tools that have their own dedicated pages (seo-grader, leaderboard-engine,
// voice-engine, live-pulse) are rendered through their externalHref on the
// gallery card and never resolve here — generateStaticParams skips them.

import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft, ArrowRight, BadgeCheck, Check, ChevronRight, ShieldCheck, Sparkles } from "lucide-react";
import { LightFooter, LightHeader } from "@/components/site/LightHeader";
import { ToolDemo, hasInteractiveDemo } from "@/components/tools/ToolDemo";
import { TOOLS, formatToolPrice, isToolSlug, type ToolSlug } from "@/lib/tools";
import { createSeoMetadata } from "@/lib/seo-metadata";

type Props = { params: { slug: string } };

export function generateStaticParams() {
  return (Object.keys(TOOLS) as ToolSlug[])
    .filter((slug) => hasInteractiveDemo(slug))
    .map((slug) => ({ slug }));
}

export function generateMetadata({ params }: Props) {
  if (!isToolSlug(params.slug)) return { title: "Tool · The LeadFlow Pro" };
  const tool = TOOLS[params.slug];
  return createSeoMetadata({
    title: `${tool.name} | Demo + Pricing · The LeadFlow Pro`,
    description: `${tool.oneLineOutcome} Try the interactive demo, then wire the real version to your business.`,
    path: `/tools/${tool.slug}`,
    imageTitle: tool.name,
    imageSubtitle: tool.oneLineOutcome,
    imageKicker: "Interactive demo",
  });
}

export default function ToolPage({ params }: Props) {
  if (!isToolSlug(params.slug) || !hasInteractiveDemo(params.slug)) {
    notFound();
  }
  const tool = TOOLS[params.slug];

  const setupLabel = formatToolPrice(tool.setupPriceCents, "setup");
  const monthlyLabel = formatToolPrice(tool.monthlyPriceCents, "monthly");

  return (
    <div className="min-h-screen bg-white text-slate-900">
      <LightHeader activePath="/tools" />

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
          style={{ background: "radial-gradient(circle, rgba(35,184,255,0.55) 0%, transparent 65%)" }}
        />
        <div
          aria-hidden
          className="absolute -bottom-40 -left-32 h-[560px] w-[560px] rounded-full opacity-50 blur-3xl"
          style={{ background: "radial-gradient(circle, rgba(255,154,31,0.45) 0%, transparent 65%)" }}
        />

        <div className="relative mx-auto max-w-7xl px-4 py-8 sm:py-10">
          <Link
            href="/tools"
            className="inline-flex items-center gap-2 text-sm font-semibold text-cyan-800 hover:text-cyan-950"
          >
            <ArrowLeft className="h-4 w-4" /> All tools
          </Link>

          <div className="mt-5 max-w-4xl">
            <div className="inline-flex items-center gap-2 rounded-full border border-cyan-300 bg-white/70 px-3 py-1 text-xs font-semibold uppercase tracking-widest text-cyan-700 shadow-sm backdrop-blur">
              <BadgeCheck className="h-3.5 w-3.5" /> Interactive demo · no login
            </div>
            <h1 className="mt-4 text-4xl font-semibold leading-tight tracking-tight text-slate-950 sm:text-5xl lg:text-6xl">
              {tool.name}.
            </h1>
            <p className="mt-3 text-lg leading-relaxed text-slate-700">{tool.oneLineOutcome}</p>

            <div className="mt-5 flex flex-wrap items-center gap-3">
              <span className="inline-flex items-center gap-1 rounded-full border border-slate-300 bg-white px-3 py-1 text-xs font-bold uppercase tracking-widest text-slate-700">
                {setupLabel}
              </span>
              <span className="inline-flex items-center gap-1 rounded-full border border-slate-300 bg-white px-3 py-1 text-xs font-bold uppercase tracking-widest text-slate-700">
                {monthlyLabel}
              </span>
              <Link
                href={tool.setupStripeLink}
                className="inline-flex min-h-10 items-center gap-1.5 rounded-lg bg-slate-950 px-4 py-2 text-sm font-bold text-white hover:bg-slate-800"
              >
                Get it for my business <ArrowRight className="h-4 w-4" />
              </Link>
            </div>
          </div>

          <div className="mt-8">
            <ToolDemo slug={tool.slug} />
          </div>

          <div className="mt-6 rounded-3xl border border-cyan-300 bg-cyan-50/80 p-5 text-sm leading-6 text-cyan-950 shadow-sm sm:flex sm:items-center sm:justify-between sm:gap-6">
            <div className="flex items-start gap-3">
              <ShieldCheck className="mt-0.5 h-5 w-5 shrink-0 text-cyan-700" />
              <div>
                <div className="font-bold">This is the demo. Your version connects to YOUR business.</div>
                <p className="mt-1 text-cyan-950/80">
                  Same shape, real wiring: your prices, your number, your buyers, your dashboard.
                </p>
              </div>
            </div>
            <Link
              href={tool.setupStripeLink}
              className="mt-3 inline-flex min-h-11 w-full items-center justify-center gap-1.5 rounded-lg bg-slate-950 px-5 py-3 text-sm font-bold text-white hover:bg-slate-800 sm:mt-0 sm:w-auto"
            >
              Get it for my business <ArrowRight className="h-4 w-4" />
            </Link>
          </div>
        </div>
      </section>

      <section id="deliverables" className="border-t border-slate-200 bg-white">
        <div className="mx-auto max-w-7xl px-4 py-12 sm:py-16">
          <div className="grid gap-8 lg:grid-cols-[0.7fr_1.3fr]">
            <div>
              <div className="text-xs font-semibold uppercase tracking-widest text-cyan-700">
                01 · Deliverables
              </div>
              <h2 className="mt-2 text-3xl font-semibold tracking-tight text-slate-950 sm:text-4xl">
                What you actually get.
              </h2>
              <p className="mt-3 text-sm leading-6 text-slate-600">
                Setup is one-time and covers the build. Monthly keeps it running, tuned, and
                wired to your stack.
              </p>
            </div>
            <ul className="grid gap-3 sm:grid-cols-2">
              {tool.deliverables.map((item) => (
                <li
                  key={item}
                  className="flex items-start gap-2.5 rounded-2xl border border-slate-200 bg-white p-4 text-sm leading-6 text-slate-800 shadow-sm"
                >
                  <Check className="mt-0.5 h-4 w-4 shrink-0 text-cyan-600" />
                  <span className="font-semibold">{item}</span>
                </li>
              ))}
            </ul>
          </div>
        </div>
      </section>

      <section id="who-its-for" className="border-t border-slate-200 bg-slate-50">
        <div className="mx-auto max-w-7xl px-4 py-12 sm:py-16">
          <div className="max-w-3xl">
            <div className="text-xs font-semibold uppercase tracking-widest text-cyan-700">
              02 · Who it's for
            </div>
            <h2 className="mt-2 text-3xl font-semibold tracking-tight text-slate-950 sm:text-4xl">
              Built for: {tool.audience}
            </h2>
          </div>
          <div className="mt-8 grid gap-3 sm:grid-cols-3">
            {tool.whoItsFor.map((item) => (
              <div
                key={item}
                className="rounded-2xl border border-slate-200 bg-white p-5 text-sm leading-6 text-slate-800 shadow-sm"
              >
                <div className="font-bold text-slate-950">{item}</div>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section id="before-after" className="border-t border-slate-200 bg-white">
        <div className="mx-auto max-w-7xl px-4 py-12 sm:py-16">
          <div className="max-w-3xl">
            <div className="text-xs font-semibold uppercase tracking-widest text-cyan-700">
              03 · Before / after
            </div>
            <h2 className="mt-2 text-3xl font-semibold tracking-tight text-slate-950 sm:text-4xl">
              The shape of the change.
            </h2>
          </div>
          <div className="mt-8 grid gap-4 sm:grid-cols-2">
            <div className="rounded-3xl border border-slate-200 bg-slate-50 p-5 sm:p-6">
              <div className="text-xs font-bold uppercase tracking-widest text-slate-500">Before</div>
              <p className="mt-2 text-base leading-7 text-slate-700">{tool.beforeAfter.before}</p>
            </div>
            <div className="rounded-3xl border border-cyan-200 bg-cyan-50/80 p-5 sm:p-6">
              <div className="text-xs font-bold uppercase tracking-widest text-cyan-700">After</div>
              <p className="mt-2 text-base leading-7 text-cyan-950">{tool.beforeAfter.after}</p>
            </div>
          </div>
        </div>
      </section>

      <section id="why-this-price" className="border-t border-slate-200 bg-slate-50">
        <div className="mx-auto max-w-7xl px-4 py-12 sm:py-16">
          <div className="grid gap-8 lg:grid-cols-[0.78fr_1.22fr] lg:items-center">
            <div>
              <div className="text-xs font-semibold uppercase tracking-widest text-cyan-700">
                04 · Why this price
              </div>
              <h2 className="mt-2 text-3xl font-semibold tracking-tight text-slate-950 sm:text-4xl">
                {setupLabel} setup. {monthlyLabel}.
              </h2>
            </div>
            <div className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm sm:p-6">
              <p className="text-base leading-7 text-slate-700">{tool.whyThisPrice}</p>
              <div className="mt-5 flex flex-col gap-3 sm:flex-row">
                <Link
                  href={tool.setupStripeLink}
                  className="inline-flex min-h-12 items-center justify-center gap-2 rounded-lg bg-slate-950 px-5 py-3 text-sm font-bold text-white hover:bg-slate-800"
                >
                  Pay the setup <ArrowRight className="h-4 w-4" />
                </Link>
                {tool.monthlyPriceCents > 0 ? (
                  <Link
                    href={tool.monthlyStripeLink}
                    className="inline-flex min-h-12 items-center justify-center gap-2 rounded-lg border border-slate-300 bg-white px-5 py-3 text-sm font-bold text-slate-950 hover:border-cyan-400"
                  >
                    Start the monthly
                  </Link>
                ) : null}
              </div>
            </div>
          </div>
        </div>
      </section>

      <section id="faq" className="border-t border-slate-200 bg-white">
        <div className="mx-auto max-w-7xl px-4 py-12 sm:py-16">
          <div className="max-w-3xl">
            <div className="text-xs font-semibold uppercase tracking-widest text-cyan-700">
              05 · FAQ
            </div>
            <h2 className="mt-2 text-3xl font-semibold tracking-tight text-slate-950 sm:text-4xl">
              The questions owners actually ask.
            </h2>
          </div>
          <div className="mt-8 grid gap-3 sm:grid-cols-2">
            {tool.faqs.map((faq) => (
              <details
                key={faq.q}
                className="group rounded-2xl border border-slate-200 bg-white p-5 shadow-sm open:bg-slate-50"
              >
                <summary className="flex cursor-pointer items-start justify-between gap-3 text-sm font-bold text-slate-950">
                  <span>{faq.q}</span>
                  <ChevronRight className="mt-0.5 h-4 w-4 shrink-0 text-slate-400 transition group-open:rotate-90" />
                </summary>
                <p className="mt-3 text-sm leading-6 text-slate-700">{faq.a}</p>
              </details>
            ))}
          </div>
        </div>
      </section>

      <section id="cta" className="border-t border-slate-200 bg-slate-950 text-white">
        <div className="mx-auto max-w-7xl px-4 py-14 sm:py-20">
          <div className="grid gap-8 lg:grid-cols-[0.95fr_1.05fr] lg:items-center">
            <div>
              <div className="inline-flex items-center gap-2 rounded-full border border-cyan-300/35 bg-cyan-300/10 px-3 py-1 text-xs font-semibold uppercase tracking-widest text-cyan-100">
                <Sparkles className="h-3.5 w-3.5" /> 06 · One next move
              </div>
              <h2 className="mt-4 text-3xl font-semibold tracking-tight sm:text-4xl">
                Get this for my business.
              </h2>
              <p className="mt-4 text-base leading-7 text-slate-300">
                {tool.oneLineOutcome} The Stripe link is below — that's the
                signal you're ready, and the kickoff happens within 24 business hours.
              </p>
            </div>
            <div className="rounded-3xl border border-white/10 bg-white/[0.04] p-5 shadow-2xl shadow-black/30 sm:p-6">
              <div className="text-xs font-semibold uppercase tracking-widest text-cyan-200">
                Stack
              </div>
              <div className="mt-3 space-y-2 text-sm leading-6 text-slate-200">
                <div className="flex items-center justify-between gap-3">
                  <span>Setup</span>
                  <span className="font-bold text-white">{setupLabel}</span>
                </div>
                <div className="flex items-center justify-between gap-3">
                  <span>Ongoing</span>
                  <span className="font-bold text-white">{monthlyLabel}</span>
                </div>
              </div>
              <div className="mt-5 flex flex-col gap-3">
                <Link
                  href={tool.setupStripeLink}
                  className="inline-flex min-h-12 items-center justify-center gap-2 rounded-lg bg-accent-500 px-5 py-3 text-sm font-bold text-slate-950 shadow-lg shadow-accent-500/20 hover:bg-accent-400"
                >
                  Get this for my business <ArrowRight className="h-4 w-4" />
                </Link>
                <Link
                  href="/book"
                  className="inline-flex min-h-12 items-center justify-center gap-2 rounded-lg border border-white/25 bg-white/10 px-5 py-3 text-sm font-bold text-white hover:bg-white/15"
                >
                  Free 10-min call first
                </Link>
              </div>
            </div>
          </div>
        </div>
      </section>

      <LightFooter />
    </div>
  );
}
