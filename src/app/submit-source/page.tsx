import Link from "next/link";
import { ArrowRight, BadgeCheck, DatabaseZap, ShieldAlert, ShieldCheck, UploadCloud, UsersRound } from "lucide-react";
import { Header } from "@/components/site/Header";
import { Footer } from "@/components/site/Footer";
import { SourceSubmissionForm } from "@/components/site/SourceSubmissionForm";

export const metadata = {
  title: "Submit a Lead Source | The LeadFlow Pro",
  description: "Submit a business list, public directory, audience, website, tool, dataset, or signal opportunity for LeadFlow Pro review."
};

const sourceTypes = [
  "Website or directory",
  "Business list",
  "Local service route",
  "Ecommerce vendor source",
  "Real estate source",
  "Mortgage/refi source",
  "Political/civic issue source",
  "Creator audience",
  "Tool or quiz idea",
  "Other"
];

const audiences = [
  "Business owners with lists",
  "Agencies with niche knowledge",
  "Operators who know a market",
  "Creators with audiences",
  "Local people who know local businesses",
  "Researchers",
  "Partners",
  "Sales teams"
];

const reviewRules = [
  "Every submission becomes a reviewable source record.",
  "Source context, origin, permissions, and restrictions stay attached.",
  "Hidden, hacked, leaked, login-only, private, minors, medical, financial, or protected-trait data is not accepted.",
  "Nothing is published, routed, exported, or sold without review."
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
                <p className="text-xs font-extrabold uppercase tracking-wider text-lead-300">Contributor intake</p>
                <h1 className="mt-4 max-w-4xl text-5xl font-black leading-[0.96] text-white md:text-7xl">
                  Submit a lead source.
                </h1>
                <p className="mt-6 max-w-2xl text-lg leading-8 text-ink-100">
                  Found a business list, public directory, audience, website, niche, tool, data source, or signal opportunity that could turn into buyers? Submit it for review.
                </p>
                <div className="mt-8 flex flex-col gap-3 sm:flex-row">
                  <Link
                    href="#source-review-form"
                    className="btn-accent text-base"
                    data-conversion-event="source_submission_started"
                    data-conversion-cta="Start Source Submission"
                    data-conversion-source-page="/submit-source"
                    data-conversion-destination="#source-review-form"
                  >
                    Start Source Submission
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
                    <p className="text-xs font-bold uppercase tracking-wider text-ink-400">Submission types</p>
                    <h2 className="text-2xl font-black text-white">What can enter review.</h2>
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
                <p className="text-xs font-semibold uppercase tracking-wider text-cyan-300">Who this is for</p>
                <h2 className="mt-3 text-3xl font-black text-white md:text-5xl">People who see useful signals before the market does.</h2>
                <p className="mt-4 text-base leading-7 text-ink-200">
                  A good source usually starts messy: a route, a spreadsheet, a directory, an audience, a niche, or a pattern people keep missing. This intake turns it into something the review desk can evaluate.
                </p>
              </div>
              <div className="grid gap-3 md:grid-cols-2">
                {audiences.map((audience) => (
                  <div key={audience} className="lead-panel flex min-h-20 gap-3 p-5 text-sm font-semibold leading-6 text-ink-100">
                    <UsersRound className="mt-1 h-5 w-5 shrink-0 text-cyan-300" />
                    <span>{audience}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </section>

        <section className="border-t border-white/10 bg-white/[0.02] py-14 md:py-20">
          <div className="container">
            <div className="grid gap-6 lg:grid-cols-[0.8fr_1.2fr] lg:items-start">
              <div>
                <p className="text-xs font-semibold uppercase tracking-wider text-cyan-300">Review before use</p>
                <h2 className="mt-3 text-3xl font-black text-white md:text-5xl">A source is not a product until it survives review.</h2>
                <p className="mt-4 text-base leading-7 text-ink-200">
                  The value is not raw volume. The value is useful source context, clean tags, lawful permissions, confidence, freshness, and a buyer route that makes sense.
                </p>
              </div>
              <div className="grid gap-3 md:grid-cols-2">
                {reviewRules.map((rule, index) => (
                  <div key={rule} className="lead-panel flex min-h-28 gap-3 p-5 text-sm leading-6 text-ink-100">
                    {index === 2 ? (
                      <ShieldAlert className="mt-1 h-5 w-5 shrink-0 text-amber-300" />
                    ) : (
                      <ShieldCheck className="mt-1 h-5 w-5 shrink-0 text-lead-400" />
                    )}
                    <span>{rule}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </section>

        <section className="border-t border-white/10 bg-white/[0.02] py-14 md:py-20">
          <div className="container">
            <SourceSubmissionForm />
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
                <Link href="#source-review-form" className="btn-accent w-full text-base md:w-auto">
                  Start Source Submission
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
