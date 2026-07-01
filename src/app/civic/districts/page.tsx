import type { Metadata } from "next";
import Link from "next/link";
import { ArrowRight, ExternalLink, Landmark, MapPinned, ShieldCheck } from "lucide-react";
import { Footer } from "@/components/site/Footer";
import { Header } from "@/components/site/Header";
import { civicIssueLabel, getCivicPublicData } from "@/lib/leadflow-civic";
import { CivicTracking } from "../CivicTracking";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Civic District Signals | The LeadFlow Pro",
  description:
    "District-level civic issue signal maps showing aggregate concerns by geography, public sources, and reviewed civic records.",
};

export default async function CivicDistrictsPage() {
  const data = await getCivicPublicData();

  return (
    <>
      <Header />
      <CivicTracking eventName="civic_page_viewed" route="/civic/districts" />
      <main className="pb-20">
        <section className="border-b border-white/10 bg-[radial-gradient(circle_at_15%_8%,rgba(35,184,255,0.17),transparent_32%),linear-gradient(135deg,#030711,#07101b_58%,#080a10)] py-14 md:py-20">
          <div className="container">
            <p className="inline-flex items-center gap-2 rounded-lg border border-cyan-300/25 bg-cyan-300/10 px-3 py-1 text-xs font-black uppercase tracking-wider text-cyan-200">
              <MapPinned className="h-4 w-4" />
              District concern map
            </p>
            <h1 className="mt-5 max-w-5xl text-5xl font-black leading-[0.96] text-white md:text-7xl">
              District-level signals, not private voter labels.
            </h1>
            <p className="mt-6 max-w-3xl text-lg leading-8 text-ink-100">
              Track issue patterns by area using public sources, consented surveys, and aggregate counts. This page avoids individual persuasion labels and private contact data.
            </p>
            <div className="mt-8 flex flex-col gap-3 sm:flex-row">
              <Link href="/civic/surveys" className="btn-accent text-base">
                Submit a local concern
                <ArrowRight className="h-4 w-4" />
              </Link>
              <Link href="/civic/issue-pulse" className="btn-ghost text-base">
                View issue pulse
              </Link>
            </div>
          </div>
        </section>

        <section className="py-14 md:py-20">
          <div className="container">
            <div className="grid gap-5 lg:grid-cols-[0.9fr_1.1fr]">
              <div>
                <p className="text-xs font-black uppercase tracking-wider text-cyan-300">Districts</p>
                <h2 className="mt-3 text-3xl font-black text-white md:text-5xl">Areas under civic watch.</h2>
                <p className="mt-4 text-base leading-7 text-ink-200">
                  Each district can connect to public government pages, public meetings, issue surveys, source records, and aggregate concern counts.
                </p>
              </div>
              <div className="grid gap-4 md:grid-cols-2">
                {data.districts.map((district) => {
                  const rows = data.aggregates.filter((row) => row.geography === district.geography || row.district === district.district);
                  const responseCount = rows.reduce((sum, row) => sum + Number(row.response_count || 0), 0);
                  return (
                    <article key={district.id} className="lead-shell p-5">
                      <div className="flex items-start gap-3">
                        <Landmark className="mt-1 h-5 w-5 shrink-0 text-cyan-300" />
                        <div>
                          <p className="text-xs font-black uppercase tracking-wider text-ink-500">{district.district_type}</p>
                          <h3 className="mt-2 text-xl font-black text-white">{district.district}</h3>
                          <p className="mt-1 text-sm text-ink-300">{district.geography}</p>
                        </div>
                      </div>
                      <div className="mt-5 grid grid-cols-2 gap-3">
                        <Metric label="Issue rows" value={String(rows.length)} />
                        <Metric label="Responses" value={String(responseCount)} />
                      </div>
                      {district.source_url ? (
                        <a href={district.source_url} target="_blank" rel="noreferrer" className="mt-5 inline-flex items-center gap-2 text-sm font-black text-cyan-200">
                          Public source <ExternalLink className="h-4 w-4" />
                        </a>
                      ) : null}
                    </article>
                  );
                })}
              </div>
            </div>
          </div>
        </section>

        <section className="border-y border-white/10 bg-[#050813] py-14 md:py-20">
          <div className="container">
            <div className="mb-8">
              <p className="text-xs font-black uppercase tracking-wider text-accent-300">Issue by area</p>
              <h2 className="mt-3 text-3xl font-black text-white md:text-5xl">Aggregate district signal rows.</h2>
            </div>
            <div className="overflow-hidden rounded-xl border border-white/10">
              <div className="overflow-x-auto">
                <table className="min-w-full divide-y divide-white/10 text-left text-sm">
                  <thead>
                    <tr>
                      {["Area", "District", "Issue", "Responses", "Urgency", "Concerns"].map((header) => (
                        <th key={header} className="whitespace-nowrap bg-white/[0.035] px-4 py-3 text-xs font-black uppercase tracking-wider text-ink-400">
                          {header}
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {data.aggregates.map((row) => (
                      <tr key={row.id}>
                        <td className="border-t border-white/10 px-4 py-3 font-bold text-white">{row.geography}</td>
                        <td className="border-t border-white/10 px-4 py-3 text-ink-200">{row.district || "Regional"}</td>
                        <td className="border-t border-white/10 px-4 py-3 text-ink-200">{civicIssueLabel(String(row.issue_category))}</td>
                        <td className="border-t border-white/10 px-4 py-3 font-black text-white">{row.response_count}</td>
                        <td className="border-t border-white/10 px-4 py-3 font-black text-white">{row.urgency_average}</td>
                        <td className="border-t border-white/10 px-4 py-3 text-ink-300">{(row.top_concerns || []).join(", ")}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        </section>

        <section className="py-14 md:py-20">
          <div className="container">
            <div className="lead-shell p-6 md:p-8">
              <ShieldCheck className="h-7 w-7 text-lead-300" />
              <h2 className="mt-4 text-3xl font-black text-white">District maps stay aggregate.</h2>
              <p className="mt-4 max-w-3xl text-base leading-7 text-ink-200">
                This is designed for issue awareness, public accountability, and source-backed civic monitoring. It does not infer private political identity or target individuals by sensitive beliefs.
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
    <div className="rounded-lg border border-white/10 bg-white/[0.035] p-3">
      <p className="text-[10px] font-black uppercase tracking-wider text-ink-500">{label}</p>
      <p className="mt-1 text-2xl font-black text-white">{value}</p>
    </div>
  );
}
