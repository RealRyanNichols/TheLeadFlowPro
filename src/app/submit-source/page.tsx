import Link from "next/link";
import { ArrowRight, BadgeCheck, DatabaseZap, ShieldCheck, UploadCloud } from "lucide-react";
import { Header } from "@/components/site/Header";
import { Footer } from "@/components/site/Footer";

export const metadata = {
  title: "Submit a Lead Source | The LeadFlow Pro",
  description: "Submit a source, list, tool, directory, or audience for review, scoring, suppression checks, and routing analysis."
};

const sourceTypes = [
  "Public directory",
  "Niche list",
  "Ecommerce signal",
  "AI tool or SaaS category",
  "Local demand route",
  "Audience or community",
  "Questionnaire idea",
  "Buyer problem pattern"
];

const reviewRules = [
  "Source context must stay attached.",
  "No minors, private addresses, medical data, financial account data, or protected-trait targeting.",
  "Suppression and do-not-contact status must be respected before release.",
  "LeadFlow reviews fit, freshness, proof, and lawful use before marketplace access."
];

export default function SubmitSourcePage() {
  return (
    <>
      <Header />
      <main className="pb-24">
        <section className="border-b border-white/10 bg-[radial-gradient(circle_at_18%_8%,rgba(35,184,255,0.17),transparent_32%),radial-gradient(circle_at_82%_10%,rgba(70,255,169,0.11),transparent_28%),linear-gradient(135deg,#030711,#070c18_55%,#07100d)] py-14 md:py-20">
          <div className="container">
            <div className="grid gap-8 lg:grid-cols-[0.95fr_1.05fr] lg:items-center">
              <div>
                <p className="text-xs font-extrabold uppercase tracking-wider text-lead-300">Submit a lead source</p>
                <h1 className="mt-4 max-w-4xl text-5xl font-black leading-[0.96] text-white md:text-7xl">
                  Have a signal source? Put it in the review lane.
                </h1>
                <p className="mt-6 max-w-2xl text-lg leading-8 text-ink-100">
                  Submit a source, list, tool, directory, audience, or problem pattern. LeadFlow can tag it, score it, verify source context, and decide whether it belongs in a buyer route or an aggregated insight product.
                </p>
                <div className="mt-8 flex flex-col gap-3 sm:flex-row">
                  <Link href="/data-marketplace?mode=source" className="btn-accent text-base">
                    Open Source Review
                    <ArrowRight className="h-4 w-4" />
                  </Link>
                  <Link href="/contact" className="btn-ghost text-base">
                    Talk Through a Source
                  </Link>
                </div>
              </div>

              <div className="lead-shell p-5">
                <div className="flex items-center gap-3 border-b border-white/10 pb-4">
                  <div className="flex h-11 w-11 items-center justify-center rounded-lg bg-lead-400/10 text-lead-300">
                    <UploadCloud className="h-5 w-5" />
                  </div>
                  <div>
                    <p className="text-xs font-bold uppercase tracking-wider text-ink-400">Source review</p>
                    <h2 className="text-2xl font-black text-white">What we can inspect first.</h2>
                  </div>
                </div>
                <div className="mt-5 grid gap-2 sm:grid-cols-2">
                  {sourceTypes.map((type) => (
                    <div key={type} className="flex min-h-14 items-center gap-2 rounded-lg border border-white/10 bg-white/[0.035] px-3 text-sm font-semibold text-ink-100">
                      <BadgeCheck className="h-4 w-4 shrink-0 text-cyan-300" />
                      {type}
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </section>

        <section className="py-14 md:py-20">
          <div className="container">
            <div className="grid gap-6 lg:grid-cols-[0.8fr_1.2fr] lg:items-start">
              <div>
                <p className="text-xs font-semibold uppercase tracking-wider text-cyan-300">Review before release</p>
                <h2 className="mt-3 text-3xl font-black text-white md:text-5xl">A source is not a product until it survives review.</h2>
                <p className="mt-4 text-base leading-7 text-ink-200">
                  The value is not raw volume. The value is useful source context, clean tags, lawful permissions, confidence, freshness, and a buyer route that makes sense.
                </p>
              </div>
              <div className="grid gap-3 md:grid-cols-2">
                {reviewRules.map((rule) => (
                  <div key={rule} className="lead-panel flex min-h-28 gap-3 p-5 text-sm leading-6 text-ink-100">
                    <ShieldCheck className="mt-1 h-5 w-5 shrink-0 text-lead-400" />
                    <span>{rule}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </section>

        <section className="border-t border-white/10 bg-ink-900/45 py-14 md:py-20">
          <div className="container">
            <div className="lead-shell p-6 md:p-8">
              <div className="grid gap-6 md:grid-cols-[1fr_auto] md:items-center">
                <div>
                  <DatabaseZap className="h-7 w-7 text-accent-300" />
                  <h2 className="mt-4 text-3xl font-black text-white md:text-5xl">Turn a source into a scored data product.</h2>
                  <p className="mt-4 max-w-2xl text-base leading-7 text-ink-200">
                    Start with the source review desk. If the source has commercial use, proof, freshness, and clean boundaries, it can move toward sample, score, and marketplace packaging.
                  </p>
                </div>
                <Link href="/data-marketplace?mode=source" className="btn-accent w-full text-base md:w-auto">
                  Submit for Review
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
