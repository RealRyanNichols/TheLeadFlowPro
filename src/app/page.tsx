import Link from "next/link";
import { ArrowRight, BadgeCheck, CircleCheck, DatabaseZap, Radar } from "lucide-react";
import { Footer } from "@/components/site/Footer";
import { Header } from "@/components/site/Header";
import { LeadFlowPageView } from "@/components/site/LeadFlowPageView";
import { leadFlowSections, signalProducts } from "@/lib/leadflow-sections";

const proofChips = [
  "Source-backed profiles",
  "Intent scoring",
  "Suppression controls",
  "Review-gated release",
  "Public and permissioned sources",
];

export default function HomePage() {
  const featuredSignals = signalProducts.slice(0, 3);

  return (
    <>
      <LeadFlowPageView eventName="homepage_viewed" route="/" />
      <Header />
      <main className="pb-24">
        <section className="relative isolate overflow-hidden border-b border-white/10 py-12 md:py-20">
          <div className="absolute inset-0 -z-10 bg-[radial-gradient(circle_at_18%_8%,rgba(35,184,255,0.18),transparent_34%),radial-gradient(circle_at_82%_18%,rgba(255,154,31,0.15),transparent_30%),linear-gradient(135deg,#030711_0%,#070c18_48%,#101008_100%)]" />
          <div className="container">
            <div className="grid gap-8 lg:grid-cols-[minmax(0,0.94fr)_minmax(360px,0.74fr)] lg:items-center">
              <div>
                <p className="inline-flex items-center gap-2 rounded-full border border-cyan-300/30 bg-cyan-300/10 px-4 py-2 text-xs font-extrabold uppercase tracking-wider text-cyan-100">
                  <Radar className="h-4 w-4" />
                  Buyer signal system
                </p>
                <h1 className="mt-6 max-w-5xl text-5xl font-black leading-[0.94] tracking-normal text-white md:text-7xl">
                  Stop buying blind lists.
                  <span className="mt-3 block bg-gradient-to-r from-cyan-200 via-white to-accent-200 bg-clip-text text-transparent">
                    Build the lead machine.
                  </span>
                </h1>
                <p className="mt-6 max-w-3xl text-lg leading-8 text-ink-100 md:text-xl">
                  LeadFlow Pro separates the machine into clear lanes: buy source-backed signals, search the marketplace, build systems, run public tools, submit sources, inspect profile proof, and manage privacy controls.
                </p>
                <div className="mt-8 flex flex-col gap-3 sm:flex-row sm:flex-wrap">
                  <Link
                    href="/buy-leads"
                    className="btn-accent text-base"
                    data-conversion-event="hero_cta_clicked"
                    data-conversion-cta="Buy Lead Signals"
                    data-conversion-source-page="/"
                    data-conversion-destination="/buy-leads"
                  >
                    Buy Lead Signals
                    <ArrowRight className="h-4 w-4" />
                  </Link>
                  <Link
                    href="/build-my-system"
                    className="btn-ghost text-base"
                    data-conversion-event="hero_cta_clicked"
                    data-conversion-cta="Build My Lead Machine"
                    data-conversion-source-page="/"
                    data-conversion-destination="/build-my-system"
                  >
                    Build My Lead Machine
                  </Link>
                  <Link
                    href="/submit-source"
                    className="btn-ghost border-cyan-300/30 text-base text-cyan-100 hover:border-cyan-200/50"
                    data-conversion-event="submit_source_lane_clicked"
                    data-conversion-cta="Submit a Lead Source"
                    data-conversion-source-page="/"
                    data-conversion-destination="/submit-source"
                  >
                    Submit a Lead Source
                  </Link>
                </div>
                <div className="mt-8 flex flex-wrap gap-2">
                  {proofChips.map((chip) => (
                    <span key={chip} className="inline-flex items-center gap-2 rounded-full border border-white/10 bg-ink-900/70 px-3 py-2 text-xs font-bold uppercase tracking-wide text-ink-100">
                      <BadgeCheck className="h-3.5 w-3.5 text-lead-400" />
                      {chip}
                    </span>
                  ))}
                </div>
              </div>

              <aside className="lead-shell p-5">
                <div className="flex items-center justify-between gap-3 border-b border-white/10 pb-4">
                  <div>
                    <p className="text-xs font-extrabold uppercase tracking-wider text-cyan-300">Live signal board</p>
                    <h2 className="mt-1 text-2xl font-black text-white">Samples with proof attached</h2>
                  </div>
                  <DatabaseZap className="h-7 w-7 text-accent-300" />
                </div>
                <div className="mt-5 space-y-3">
                  {featuredSignals.map((signal) => (
                    <Link
                      key={signal.title}
                      href="/marketplace"
                      className="block rounded-lg border border-white/10 bg-white/[0.035] p-4 transition hover:-translate-y-0.5 hover:border-cyan-300/30 hover:bg-white/[0.055]"
                      data-conversion-event="listing_card_clicked"
                      data-conversion-cta={signal.title}
                      data-conversion-source-page="/"
                      data-conversion-destination="/marketplace"
                    >
                      <div className="flex items-start justify-between gap-3">
                        <div>
                          <h3 className="text-base font-extrabold text-white">{signal.title}</h3>
                          <p className="mt-1 text-xs uppercase tracking-wider text-ink-400">
                            {signal.category} | {signal.freshness}
                          </p>
                        </div>
                        <div className="rounded-lg border border-lead-400/25 bg-lead-400/10 px-3 py-2 text-center">
                          <p className="text-[10px] font-bold uppercase tracking-wider text-lead-300">Score</p>
                          <p className="text-2xl font-black text-white">{signal.score}</p>
                        </div>
                      </div>
                    </Link>
                  ))}
                </div>
              </aside>
            </div>
          </div>
        </section>

        <section className="border-b border-white/10 bg-ink-950/80 py-10 md:py-14">
          <div className="container">
            <div className="flex flex-col gap-3 md:flex-row md:items-end md:justify-between">
              <div>
                <p className="text-xs font-semibold uppercase tracking-wider text-accent-300">Site map</p>
                <h2 className="mt-2 text-3xl font-black text-white md:text-5xl">Choose the section that matches the job.</h2>
              </div>
              <p className="max-w-xl text-sm leading-6 text-ink-300">
                The homepage is the router. Each section now has its own job, offer, controls, and next click.
              </p>
            </div>
            <div className="mt-8 grid gap-4 md:grid-cols-2 xl:grid-cols-4">
              {leadFlowSections.map((section) => {
                const Icon = section.icon;
                const eventName =
                  section.href === "/buy-leads"
                    ? "buyer_lane_clicked"
                    : section.href === "/build-my-system"
                      ? "system_lane_clicked"
                      : section.href === "/submit-source"
                        ? "submit_source_lane_clicked"
                        : "hero_cta_clicked";
                return (
                  <Link
                    key={section.href}
                    href={section.href}
                    className="group lead-panel flex min-h-80 flex-col p-5 transition duration-300 hover:-translate-y-1 hover:border-cyan-300/35 hover:bg-white/[0.055]"
                    data-conversion-event={eventName}
                    data-conversion-cta={section.navLabel}
                    data-conversion-source-page="/"
                    data-conversion-destination={section.href}
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div className="flex h-12 w-12 items-center justify-center rounded-lg border border-cyan-300/25 bg-cyan-300/10 text-cyan-200">
                        <Icon className="h-5 w-5" />
                      </div>
                      <ArrowRight className="h-5 w-5 text-ink-500 transition group-hover:translate-x-1 group-hover:text-accent-300" />
                    </div>
                    <p className="mt-5 text-xs font-extrabold uppercase tracking-wider text-accent-300">{section.eyebrow}</p>
                    <h3 className="mt-2 text-2xl font-black text-white">{section.navLabel}</h3>
                    <p className="mt-3 text-sm leading-6 text-ink-200">{section.body}</p>
                    <div className="mt-auto space-y-2 pt-5">
                      {section.bullets.slice(0, 2).map((bullet) => (
                        <span key={bullet} className="flex items-center gap-2 text-xs font-semibold text-ink-300">
                          <CircleCheck className="h-3.5 w-3.5 text-lead-400" />
                          {bullet}
                        </span>
                      ))}
                    </div>
                  </Link>
                );
              })}
            </div>
          </div>
        </section>

        <section className="py-14 md:py-20">
          <div className="container">
            <div className="rounded-lg border border-white/10 bg-[linear-gradient(135deg,rgba(35,184,255,0.12),rgba(255,154,31,0.12))] p-6 md:p-10">
              <div className="grid gap-6 md:grid-cols-[1fr_auto] md:items-center">
                <div>
                  <p className="text-xs font-semibold uppercase tracking-wider text-accent-300">Build the machine</p>
                  <h2 className="mt-3 text-3xl font-extrabold text-white md:text-5xl">
                    Solve problems first. Sell trusted intent after review.
                  </h2>
                  <p className="mt-4 max-w-2xl text-base leading-7 text-ink-100">
                    Public tools collect useful first-party answers. Sources go through review. Profiles keep proof, timestamps, confidence, suppression status, and open questions.
                  </p>
                </div>
                <Link href="/marketplace" className="btn-accent w-full text-base md:w-auto">
                  Open Marketplace
                  <ArrowRight className="h-4 w-4" />
                </Link>
              </div>
            </div>
          </div>
        </section>
      </main>
      <Footer />
    </>
  );
}
