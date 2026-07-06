import Link from "next/link";
import { ArrowRight, Check, DatabaseZap, Wrench } from "lucide-react";
import { Header } from "@/components/site/Header";
import { Footer } from "@/components/site/Footer";
import { LeadFlowPageView } from "@/components/site/LeadFlowPageView";
import { OFFERS, type OfferSlug } from "@/lib/offers";
import { createSeoMetadata } from "@/lib/seo-metadata";

export const metadata = createSeoMetadata({
  title: "Pricing | The LeadFlow Pro",
  description:
    "Buy source-backed buyer signals, or bring Ryan in for a sample, an audit, or a build. Clear prices, no blind lists.",
  path: "/pricing",
  imageTitle: "Pricing",
  imageSubtitle: "Buy the signal, the sample, the audit, or the build.",
});

// The consulting offers we surface on the hub. Every slug resolves through
// /offers/[slug] and is checkout-ready via /api/offers/checkout.
const FEATURED_OFFERS: OfferSlug[] = ["quick-look", "decision-sprint", "business-audit"];

const LANES = [
  {
    icon: DatabaseZap,
    eyebrow: "Buy the data",
    title: "Buyer-signal lead products",
    body: "Source-backed, scored, review-gated signal packs. Price bands run from $99 to $249+ depending on exclusivity, freshness, and volume.",
    href: "/buy-leads",
    cta: "Browse buyer signals",
    bullets: ["Source proof on every profile", "Confidence + freshness scoring", "Named, exclusive, or shared release"],
  },
  {
    icon: Wrench,
    eyebrow: "Bring in Ryan",
    title: "Audits, sprints & builds",
    body: "Start at $47 for eyes on your accounts, $497 for the full written audit, or scope a system build. Every paid engagement runs under a Texas-law letter + mutual NDA.",
    href: "#offers",
    cta: "See the offers",
    bullets: ["Quick-Look $47", "Business Audit $497", "Retainers & builds when it fits"],
  },
];

export default function PricingPage() {
  const offers = FEATURED_OFFERS.map((slug) => OFFERS[slug]).filter(Boolean);

  return (
    <>
      <LeadFlowPageView eventName="pricing_viewed" route="/pricing" />
      <Header />
      <main className="pb-24">
        <section className="relative isolate overflow-hidden border-b border-white/10 py-14 md:py-20">
          <div className="absolute inset-0 -z-10 bg-[radial-gradient(circle_at_18%_8%,rgba(35,184,255,0.16),transparent_34%),radial-gradient(circle_at_82%_18%,rgba(255,154,31,0.14),transparent_30%),linear-gradient(135deg,#030711_0%,#070c18_48%,#101008_100%)]" />
          <div className="container">
            <p className="text-xs font-extrabold uppercase tracking-wider text-accent-300">Pricing</p>
            <h1 className="mt-3 max-w-4xl text-4xl font-black leading-tight text-white md:text-6xl">
              Buy the signal, or buy the fix.
            </h1>
            <p className="mt-5 max-w-2xl text-lg leading-8 text-ink-100">
              Two ways to work with LeadFlow Pro: buy source-backed buyer signals, or bring Ryan in
              for a sample, an audit, or a full build. Clear prices, no blind lists.
            </p>
            <div className="mt-8 grid gap-4 md:grid-cols-2">
              {LANES.map((lane) => {
                const Icon = lane.icon;
                return (
                  <div key={lane.title} className="lead-panel flex flex-col p-6">
                    <div className="flex h-12 w-12 items-center justify-center rounded-lg border border-cyan-300/25 bg-cyan-300/10 text-cyan-200">
                      <Icon className="h-5 w-5" />
                    </div>
                    <p className="mt-5 text-xs font-extrabold uppercase tracking-wider text-accent-300">{lane.eyebrow}</p>
                    <h2 className="mt-2 text-2xl font-black text-white">{lane.title}</h2>
                    <p className="mt-3 text-sm leading-6 text-ink-200">{lane.body}</p>
                    <div className="mt-4 space-y-2">
                      {lane.bullets.map((bullet) => (
                        <span key={bullet} className="flex items-center gap-2 text-xs font-semibold text-ink-300">
                          <Check className="h-3.5 w-3.5 text-lead-400" />
                          {bullet}
                        </span>
                      ))}
                    </div>
                    <Link href={lane.href} className="btn-accent mt-6 w-full justify-center text-sm">
                      {lane.cta}
                      <ArrowRight className="h-4 w-4" />
                    </Link>
                  </div>
                );
              })}
            </div>
          </div>
        </section>

        <section id="offers" className="py-14 md:py-20">
          <div className="container">
            <div className="flex flex-col gap-3 md:flex-row md:items-end md:justify-between">
              <div>
                <p className="text-xs font-semibold uppercase tracking-wider text-accent-300">Consulting offers</p>
                <h2 className="mt-2 text-3xl font-black text-white md:text-5xl">Start small, scale when it works.</h2>
              </div>
              <p className="max-w-xl text-sm leading-6 text-ink-300">
                Each offer is checkout-ready with secure Stripe checkout. Every paid engagement runs
                under a Texas-law engagement letter and mutual NDA.
              </p>
            </div>
            <div className="mt-8 grid gap-4 md:grid-cols-3">
              {offers.map((offer) => (
                <Link
                  key={offer.slug}
                  href={`/offers/${offer.slug}`}
                  className="group lead-panel flex flex-col p-6 transition duration-300 hover:-translate-y-1 hover:border-cyan-300/35 hover:bg-white/[0.055]"
                >
                  <p className="text-xs font-extrabold uppercase tracking-wider text-cyan-300">{offer.badge}</p>
                  <div className="mt-4 flex items-end gap-2">
                    <span className="text-4xl font-black text-white">{offer.price.big}</span>
                    <span className="pb-1 text-xs font-semibold text-ink-400">{offer.price.sub}</span>
                  </div>
                  <h3 className="mt-4 text-xl font-black text-white">{offer.hero.h1Lead}</h3>
                  <p className="mt-3 flex-1 text-sm leading-6 text-ink-200">{offer.metaDescription}</p>
                  <span className="mt-6 inline-flex items-center gap-2 text-sm font-bold text-accent-300">
                    {offer.primaryCta.label}
                    <ArrowRight className="h-4 w-4 transition group-hover:translate-x-1" />
                  </span>
                </Link>
              ))}
            </div>
            <div className="mt-10 rounded-lg border border-white/10 bg-[linear-gradient(135deg,rgba(35,184,255,0.1),rgba(255,154,31,0.1))] p-6 md:p-8">
              <div className="grid gap-4 md:grid-cols-[1fr_auto] md:items-center">
                <div>
                  <h3 className="text-2xl font-extrabold text-white md:text-3xl">Not sure which one?</h3>
                  <p className="mt-2 max-w-2xl text-sm leading-6 text-ink-100">
                    Tell Ryan what you are trying to fix and he will point you to the right lane —
                    buy leads, build a system, or start with a sample.
                  </p>
                </div>
                <Link href="/contact" className="btn-ghost w-full justify-center text-sm md:w-auto">
                  Talk it through
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
