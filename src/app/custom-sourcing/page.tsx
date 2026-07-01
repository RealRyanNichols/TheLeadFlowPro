import Link from "next/link";
import { ArrowRight, DatabaseZap, FileCheck2, Route, ShieldCheck, Target } from "lucide-react";
import { Footer } from "@/components/site/Footer";
import { Header } from "@/components/site/Header";
import { createSeoMetadata } from "@/lib/seo-metadata";
import { CustomSourcingClient } from "./CustomSourcingClient";

export const metadata = createSeoMetadata({
  title: "Custom Sourcing Requests | The LeadFlow Pro",
  description:
    "Request a source-backed custom lead signal pack when the marketplace does not already have the exact industry, geography, or buyer type you need.",
  path: "/custom-sourcing",
  imageTitle: "Need a signal pack we do not have listed?",
  imageSubtitle: "Define the industry, geography, proof type, buyer use case, budget, and review path.",
  imageKicker: "Custom sourcing",
});

export default function CustomSourcingPage() {
  return (
    <>
      <Header />
      <main className="min-h-screen overflow-hidden bg-ink-950 text-white">
        <section className="relative border-b border-white/10">
          <div
            aria-hidden
            className="pointer-events-none absolute inset-0"
            style={{
              background:
                "radial-gradient(circle at 12% 8%, rgba(35,184,255,0.20), transparent 34%), radial-gradient(circle at 86% 16%, rgba(255,186,61,0.15), transparent 32%), linear-gradient(135deg,#030711 0%,#070c18 60%,#101008 100%)",
            }}
          />
          <div className="container relative py-16 md:py-24">
            <p className="inline-flex items-center gap-2 rounded-lg border border-cyan-300/25 bg-cyan-300/10 px-3 py-1 text-xs font-extrabold uppercase tracking-wider text-cyan-200">
              <Target className="h-4 w-4" />
              Custom sourcing
            </p>
            <h1 className="mt-5 max-w-4xl text-4xl font-black leading-tight md:text-6xl">
              Need a signal pack we do not have listed yet?
            </h1>
            <p className="mt-5 max-w-3xl text-base leading-8 text-ink-200 md:text-xl">
              Tell us the industry, geography, buyer type, source type, and outcome you want. We will review whether it can be sourced, scored, and built into a source-backed lead signal product.
            </p>
            <div className="mt-7 flex flex-col gap-3 sm:flex-row">
              <Link href="#custom-sourcing-form" className="btn-accent justify-center text-sm">
                Start Custom Sourcing Request
                <ArrowRight className="h-4 w-4" />
              </Link>
              <Link href="/marketplace" className="btn-ghost justify-center text-sm">
                Browse Available Signals
              </Link>
            </div>
          </div>
        </section>

        <CustomSourcingClient />

        <section className="container py-12 md:py-16">
          <div className="grid gap-5 md:grid-cols-3">
            <InfoCard
              icon={DatabaseZap}
              title="Define the demand"
              body="Industry, vertical, lead type, buyer type, geography, source preference, budget range, and timeline."
            />
            <InfoCard
              icon={FileCheck2}
              title="Review the source path"
              body="We check whether source proof, permissions, suppression status, and allowed use can support a real product."
            />
            <InfoCard
              icon={ShieldCheck}
              title="Route only what clears"
              body="No minors, protected-trait targeting, hacked data, leaked data, hidden sensitive data, or unclear permission sources."
            />
          </div>

          <div className="mt-8 rounded-xl border border-white/10 bg-white/[0.035] p-5 md:p-6">
            <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
              <div>
                <p className="text-xs font-extrabold uppercase tracking-wider text-accent-300">Review-gated</p>
                <h2 className="mt-2 text-2xl font-black text-white">A request is not a promise of availability.</h2>
                <p className="mt-3 max-w-3xl text-sm leading-6 text-ink-200">
                  Custom sourcing is for deciding whether a source-backed, compliance-aware lead signal product can be built. We do not promise guaranteed lead volume, revenue, ROAS, conversion rate, CPL, or sales.
                </p>
              </div>
              <Link href="/privacy-center" className="btn-ghost justify-center text-sm">
                Review privacy controls
              </Link>
            </div>
          </div>
        </section>
      </main>
      <Footer />
    </>
  );
}

function InfoCard({
  icon: Icon,
  title,
  body,
}: {
  icon: typeof Route;
  title: string;
  body: string;
}) {
  return (
    <article className="lead-shell p-5">
      <div className="flex h-11 w-11 items-center justify-center rounded-lg border border-cyan-300/25 bg-cyan-300/10 text-cyan-100">
        <Icon className="h-5 w-5" />
      </div>
      <h2 className="mt-4 text-xl font-black text-white">{title}</h2>
      <p className="mt-3 text-sm leading-6 text-ink-300">{body}</p>
    </article>
  );
}
