import type { Metadata } from "next";
import Link from "next/link";
import { ArrowRight, ClipboardCheck, ShieldCheck } from "lucide-react";
import { Footer } from "@/components/site/Footer";
import { Header } from "@/components/site/Header";
import { civicIssueOptions } from "@/lib/leadflow-civic";
import { CivicTracking } from "../CivicTracking";
import { CivicSurveyClient } from "./CivicSurveyClient";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Issue Pulse Survey | The LeadFlow Pro",
  description:
    "Submit a consented civic issue signal for aggregate issue pulse tracking, public-source review, and district-level civic dashboards.",
};

export default function CivicSurveysPage() {
  return (
    <>
      <Header />
      <CivicTracking eventName="civic_page_viewed" route="/civic/surveys" />
      <main className="pb-20">
        <section className="border-b border-white/10 bg-[radial-gradient(circle_at_16%_8%,rgba(35,184,255,0.17),transparent_32%),linear-gradient(135deg,#030711,#07101b_58%,#080a10)] py-14 md:py-20">
          <div className="container">
            <div className="max-w-5xl">
              <p className="inline-flex items-center gap-2 rounded-lg border border-cyan-300/25 bg-cyan-300/10 px-3 py-1 text-xs font-black uppercase tracking-wider text-cyan-200">
                <ClipboardCheck className="h-4 w-4" />
                Issue pulse survey
              </p>
              <h1 className="mt-5 text-5xl font-black leading-[0.96] text-white md:text-7xl">
                Tell us what your community needs fixed.
              </h1>
              <p className="mt-6 max-w-3xl text-lg leading-8 text-ink-100">
                Submit a local issue, choose your permissions, and help build an aggregate civic issue pulse. This is not an individual political targeting tool.
              </p>
              <div className="mt-8 flex flex-col gap-3 sm:flex-row">
                <Link href="/civic/issue-pulse" className="btn-ghost text-base">
                  View aggregate pulse
                </Link>
                <Link href="/civic/districts" className="btn-ghost text-base">
                  View districts
                  <ArrowRight className="h-4 w-4" />
                </Link>
              </div>
            </div>
          </div>
        </section>

        <section className="py-14 md:py-20">
          <div className="container">
            <div className="mb-8 grid gap-4 lg:grid-cols-[0.8fr_1.2fr] lg:items-end">
              <div>
                <p className="text-xs font-black uppercase tracking-wider text-accent-300">Separate permissions</p>
                <h2 className="mt-3 text-3xl font-black text-white md:text-5xl">No blanket civic consent.</h2>
              </div>
              <div className="rounded-xl border border-cyan-300/20 bg-cyan-300/10 p-4">
                <div className="flex gap-3">
                  <ShieldCheck className="mt-1 h-5 w-5 shrink-0 text-cyan-200" />
                  <p className="text-sm font-bold leading-6 text-cyan-50">
                    Saving a response, contact permission, public display, sharing with a civic organization, and anonymity are separate choices.
                  </p>
                </div>
              </div>
            </div>
            <CivicSurveyClient issueCategories={civicIssueOptions()} />
          </div>
        </section>
      </main>
      <Footer />
    </>
  );
}
