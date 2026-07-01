import type { Metadata } from "next";
import Link from "next/link";
import { ArrowRight, BarChart3, MessageSquareText, ShieldCheck } from "lucide-react";
import { Footer } from "@/components/site/Footer";
import { Header } from "@/components/site/Header";
import { civicIssueLabel, getCivicPublicData } from "@/lib/leadflow-civic";
import { CivicTracking } from "../CivicTracking";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Civic Issue Pulse | The LeadFlow Pro",
  description:
    "Aggregate civic issue dashboard showing top public concerns, district counts, urgency distribution, approved comments, and source-backed civic signals.",
};

export default async function CivicIssuePulsePage() {
  const data = await getCivicPublicData();
  const totalResponses = data.aggregates.reduce((sum, row) => sum + Number(row.response_count || 0), 0);
  const averageUrgency = data.aggregates.length
    ? (data.aggregates.reduce((sum, row) => sum + Number(row.urgency_average || 0), 0) / data.aggregates.length).toFixed(1)
    : "0.0";

  return (
    <>
      <Header />
      <CivicTracking eventName="civic_issue_aggregate_viewed" route="/civic/issue-pulse" properties={{ aggregate_count: data.aggregates.length }} />
      <main className="pb-20">
        <section className="border-b border-white/10 bg-[radial-gradient(circle_at_18%_8%,rgba(35,184,255,0.17),transparent_32%),linear-gradient(135deg,#030711,#07101b_58%,#080a10)] py-14 md:py-20">
          <div className="container">
            <div className="max-w-4xl">
              <p className="inline-flex items-center gap-2 rounded-lg border border-cyan-300/25 bg-cyan-300/10 px-3 py-1 text-xs font-black uppercase tracking-wider text-cyan-200">
                <BarChart3 className="h-4 w-4" />
                Aggregate issue pulse
              </p>
              <h1 className="mt-5 text-5xl font-black leading-[0.96] text-white md:text-7xl">
                Public civic signals without individual targeting labels.
              </h1>
              <p className="mt-6 max-w-3xl text-lg leading-8 text-ink-100">
                This dashboard shows aggregate issue counts, urgency, public-source context, and approved comments only. It does not show private contact info or individual political persuasion profiles.
              </p>
              <div className="mt-8 flex flex-col gap-3 sm:flex-row">
                <Link href="/civic/surveys" className="btn-accent text-base">
                  Add your issue signal
                  <ArrowRight className="h-4 w-4" />
                </Link>
                <Link href="/civic/districts" className="btn-ghost text-base">
                  View districts
                </Link>
              </div>
            </div>
          </div>
        </section>

        <section className="border-b border-white/10 bg-white/[0.02] py-12">
          <div className="container">
            <div className="grid gap-4 md:grid-cols-4">
              <Metric label="Aggregate responses" value={String(totalResponses)} />
              <Metric label="Issue rows" value={String(data.aggregates.length)} />
              <Metric label="Average urgency" value={averageUrgency} />
              <Metric label="Approved comments" value={String(data.publicSubmissions.length)} />
            </div>
          </div>
        </section>

        <section className="py-14 md:py-20">
          <div className="container">
            <div className="mb-8 flex flex-col gap-3 md:flex-row md:items-end md:justify-between">
              <div>
                <p className="text-xs font-black uppercase tracking-wider text-cyan-300">Top issues</p>
                <h2 className="mt-3 text-3xl font-black text-white md:text-5xl">What people are raising.</h2>
              </div>
              <div className="rounded-lg border border-white/10 bg-white/[0.035] px-3 py-2 text-xs font-black uppercase tracking-wider text-ink-300">
                Aggregate only
              </div>
            </div>
            <div className="grid gap-4 lg:grid-cols-2">
              {data.aggregates.map((row) => {
                const count = Number(row.response_count || 0);
                const percent = totalResponses ? Math.round((count / totalResponses) * 100) : 0;
                return (
                  <article key={row.id} className="lead-shell p-5">
                    <div className="flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
                      <div>
                        <p className="text-xs font-black uppercase tracking-wider text-cyan-300">{row.geography}{row.district ? ` | ${row.district}` : ""}</p>
                        <h3 className="mt-3 text-2xl font-black text-white">{civicIssueLabel(String(row.issue_category))}</h3>
                      </div>
                      <div className="grid min-h-16 min-w-20 place-items-center rounded-lg border border-accent-300/35 bg-accent-300/10 px-3 text-center">
                        <span className="text-[10px] font-black uppercase tracking-wider text-accent-100">Urgency</span>
                        <strong className="text-2xl font-black text-white">{row.urgency_average}</strong>
                      </div>
                    </div>
                    <div className="mt-5 h-3 overflow-hidden rounded-full bg-white/10">
                      <div className="h-full rounded-full bg-cyan-300" style={{ width: `${Math.max(6, percent)}%` }} />
                    </div>
                    <div className="mt-4 flex flex-wrap gap-2">
                      {(row.top_concerns || []).slice(0, 5).map((concern) => (
                        <span key={concern} className="rounded-lg border border-white/10 bg-white/[0.045] px-2.5 py-1.5 text-xs font-bold text-ink-100">
                          {concern}
                        </span>
                      ))}
                    </div>
                    <p className="mt-4 text-sm leading-6 text-ink-400">
                      {count} aggregate responses in {row.time_period.replace(/_/g, " ")} from {row.source_type.replace(/_/g, " ")}.
                    </p>
                  </article>
                );
              })}
            </div>
          </div>
        </section>

        <section className="border-y border-white/10 bg-[#050813] py-14 md:py-20">
          <div className="container">
            <div className="mb-8">
              <p className="text-xs font-black uppercase tracking-wider text-accent-300">Approved public comments</p>
              <h2 className="mt-3 text-3xl font-black text-white md:text-5xl">Only what passed review.</h2>
            </div>
            <div className="grid gap-4 md:grid-cols-2">
              {data.publicSubmissions.map((submission) => (
                <article key={submission.id} className="lead-panel p-5">
                  <div className="flex items-start gap-3">
                    <MessageSquareText className="mt-1 h-5 w-5 shrink-0 text-cyan-300" />
                    <div>
                      <h3 className="text-xl font-black text-white">{submission.title}</h3>
                      <p className="mt-2 text-sm leading-6 text-ink-300">{submission.body || "Approved civic concern."}</p>
                      <p className="mt-3 text-xs font-black uppercase tracking-wider text-ink-500">
                        {submission.location || "Unknown area"} | {civicIssueLabel(String(submission.issue_category || "other"))}
                      </p>
                    </div>
                  </div>
                </article>
              ))}
              {!data.publicSubmissions.length ? (
                <div className="lead-panel p-6 text-center text-sm font-bold text-ink-300">
                  Public comments appear only after explicit public-display consent and admin approval.
                </div>
              ) : null}
            </div>
          </div>
        </section>

        <section className="py-14 md:py-20">
          <div className="container">
            <div className="lead-shell p-6 md:p-8">
              <ShieldCheck className="h-7 w-7 text-lead-300" />
              <h2 className="mt-4 text-3xl font-black text-white">Civic marketplace boundary.</h2>
              <p className="mt-4 max-w-3xl text-base leading-7 text-ink-200">
                Civic signal products do not automatically enter the commercial lead marketplace. If a civic insight product is created later, it must be aggregate, consented, public-source, or manually reviewed.
              </p>
            </div>
          </div>
        </section>
      </main>
      <Footer />
    </>
  );
}

function Metric({ label, value }: { label: string; value: string }) {
  return (
    <div className="lead-panel p-5">
      <p className="text-xs font-black uppercase tracking-wider text-ink-400">{label}</p>
      <p className="mt-2 text-4xl font-black text-white">{value}</p>
    </div>
  );
}
