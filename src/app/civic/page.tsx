import type { Metadata } from "next";
import Link from "next/link";
import { ArrowRight, BarChart3, Building2, FileSearch, MapPinned, ShieldCheck, Vote } from "lucide-react";
import { Footer } from "@/components/site/Footer";
import { Header } from "@/components/site/Header";
import {
  CIVIC_ALLOWED_SOURCE_TYPES,
  CIVIC_RESTRICTED_RULES,
  civicIssueLabel,
  getCivicPublicData,
} from "@/lib/leadflow-civic";
import { CivicTracking } from "./CivicTracking";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Civic Issue Signals | The LeadFlow Pro",
  description:
    "RepWatchr-style public civic issue pulse tools for aggregate issue dashboards, public-source monitoring, and consented survey responses.",
};

export default async function CivicPage() {
  const data = await getCivicPublicData();
  const topIssues = data.aggregates.slice(0, 4);

  return (
    <>
      <Header />
      <CivicTracking eventName="civic_page_viewed" route="/civic" />
      <main className="pb-20">
        <section className="relative overflow-hidden border-b border-white/10 bg-[radial-gradient(circle_at_12%_10%,rgba(35,184,255,0.18),transparent_30%),radial-gradient(circle_at_84%_12%,rgba(255,186,61,0.12),transparent_28%),linear-gradient(135deg,#050711,#07101b_58%,#080a10)] py-14 md:py-20">
          <div className="container">
            <div className="grid gap-8 lg:grid-cols-[minmax(0,1fr)_420px] lg:items-end">
              <div>
                <p className="inline-flex items-center gap-2 rounded-lg border border-cyan-300/25 bg-cyan-300/10 px-3 py-1 text-xs font-black uppercase tracking-wider text-cyan-200">
                  <Vote className="h-4 w-4" />
                  Civic issue pulse
                </p>
                <h1 className="mt-5 max-w-5xl text-5xl font-black leading-[0.95] text-white md:text-7xl">
                  See what communities are asking leaders to fix.
                </h1>
                <p className="mt-6 max-w-3xl text-lg leading-8 text-ink-100">
                  RepWatchr-style civic signal tools help identify what issues people care about, where public attention is moving, and what communities are asking from local leaders.
                </p>
                <div className="mt-8 flex flex-col gap-3 sm:flex-row">
                  <Link href="/civic/surveys" className="btn-accent text-base">
                    Start Issue Pulse Survey
                    <ArrowRight className="h-4 w-4" />
                  </Link>
                  <Link href="/civic/issue-pulse" className="btn-ghost text-base">
                    View aggregate pulse
                  </Link>
                </div>
              </div>

              <aside className="lead-shell p-5">
                <p className="text-xs font-black uppercase tracking-wider text-accent-300">Boundary</p>
                <h2 className="mt-3 text-2xl font-black text-white">Civic signals are not commercial lead lists.</h2>
                <div className="mt-5 grid gap-3">
                  {CIVIC_RESTRICTED_RULES.map((rule) => (
                    <div key={rule} className="flex gap-3 rounded-lg border border-white/10 bg-white/[0.035] p-3 text-sm font-bold leading-6 text-ink-100">
                      <ShieldCheck className="mt-1 h-4 w-4 shrink-0 text-cyan-300" />
                      {rule}
                    </div>
                  ))}
                </div>
              </aside>
            </div>
          </div>
        </section>

        <section className="border-b border-white/10 bg-white/[0.02] py-12 md:py-16">
          <div className="container">
            <div className="grid gap-4 md:grid-cols-4">
              {[
                { icon: BarChart3, label: "Aggregate pulse", value: `${data.aggregates.length} issue rows` },
                { icon: MapPinned, label: "District signals", value: `${data.districts.length} areas` },
                { icon: FileSearch, label: "Public sources", value: `${data.sources.length} sources` },
                { icon: Building2, label: "Public comments", value: `${data.publicSubmissions.length} approved` },
              ].map((stat) => (
                <article key={stat.label} className="lead-panel p-5">
                  <stat.icon className="h-5 w-5 text-cyan-300" />
                  <p className="mt-4 text-xs font-black uppercase tracking-wider text-ink-400">{stat.label}</p>
                  <p className="mt-2 text-3xl font-black text-white">{stat.value}</p>
                </article>
              ))}
            </div>
          </div>
        </section>

        <section className="py-14 md:py-20">
          <div className="container">
            <div className="grid gap-8 lg:grid-cols-[0.82fr_1.18fr] lg:items-start">
              <div>
                <p className="text-xs font-black uppercase tracking-wider text-cyan-300">Allowed data</p>
                <h2 className="mt-3 text-3xl font-black text-white md:text-5xl">Build from public, aggregate, or consented civic signals.</h2>
                <p className="mt-4 text-base leading-7 text-ink-200">
                  The engine can track public attention without becoming an individual persuasion machine. Civic records stay aggregate, public-source, consented, or manually reviewed.
                </p>
              </div>
              <div className="grid gap-3 md:grid-cols-2">
                {CIVIC_ALLOWED_SOURCE_TYPES.map((item) => (
                  <div key={item} className="lead-panel flex min-h-16 items-center gap-3 p-4 text-sm font-bold capitalize text-ink-100">
                    <ShieldCheck className="h-4 w-4 shrink-0 text-lead-300" />
                    {item}
                  </div>
                ))}
              </div>
            </div>
          </div>
        </section>

        <section className="border-y border-white/10 bg-[#050813] py-14 md:py-20">
          <div className="container">
            <div className="mb-8 flex flex-col gap-3 md:flex-row md:items-end md:justify-between">
              <div>
                <p className="text-xs font-black uppercase tracking-wider text-accent-300">Live pulse preview</p>
                <h2 className="mt-3 text-3xl font-black text-white md:text-5xl">Top aggregate issue signals.</h2>
              </div>
              <Link href="/civic/issue-pulse" className="btn-ghost text-base">
                Open full pulse
              </Link>
            </div>
            <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
              {topIssues.map((row) => (
                <article key={row.id} className="lead-shell p-5">
                  <p className="text-xs font-black uppercase tracking-wider text-cyan-300">{row.geography}</p>
                  <h3 className="mt-3 text-2xl font-black text-white">{civicIssueLabel(String(row.issue_category))}</h3>
                  <div className="mt-5 grid grid-cols-2 gap-3">
                    <Metric label="Responses" value={String(row.response_count)} />
                    <Metric label="Urgency" value={String(row.urgency_average)} />
                  </div>
                  <p className="mt-4 text-sm leading-6 text-ink-300">
                    {(row.top_concerns || []).slice(0, 3).join(", ") || "Aggregate concern pattern"}
                  </p>
                </article>
              ))}
            </div>
          </div>
        </section>

        <section className="py-14 md:py-20">
          <div className="container">
            <div className="mb-8">
              <p className="text-xs font-black uppercase tracking-wider text-cyan-300">Civic tools</p>
              <h2 className="mt-3 text-3xl font-black text-white md:text-5xl">Useful tools before products.</h2>
            </div>
            <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
              {data.tools.map((tool) => (
                <Link key={tool.title} href={tool.href} className="lead-panel group min-h-52 p-5 transition hover:-translate-y-1 hover:border-cyan-300/35">
                  <p className="text-xs font-black uppercase tracking-wider text-accent-300">{tool.status}</p>
                  <h3 className="mt-3 text-xl font-black text-white">{tool.title}</h3>
                  <p className="mt-3 text-sm leading-6 text-ink-300">{tool.body}</p>
                  <span className="mt-5 inline-flex items-center gap-2 text-sm font-black text-cyan-200">
                    Open <ArrowRight className="h-4 w-4 transition group-hover:translate-x-1" />
                  </span>
                </Link>
              ))}
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
    <div className="rounded-lg border border-white/10 bg-white/[0.035] p-3">
      <p className="text-[10px] font-black uppercase tracking-wider text-ink-500">{label}</p>
      <p className="mt-1 text-2xl font-black text-white">{value}</p>
    </div>
  );
}
