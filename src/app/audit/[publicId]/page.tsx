import Link from "next/link";
import { notFound } from "next/navigation";
import {
  ArrowRight,
  BarChart3,
  CheckCircle2,
  Gauge,
  LockKeyhole,
  PhoneCall,
  Search,
  ShieldCheck,
} from "lucide-react";
import { LightFooter, LightHeader } from "@/components/site/LightHeader";
import { getAuditReport } from "@/lib/lead-intelligence";
import { createSeoMetadata } from "@/lib/seo-metadata";

export const dynamic = "force-dynamic";

export const metadata = createSeoMetadata({
  title: "Private Lead Leak Audit - The LeadFlow Pro",
  description: "Private LeadFlow Pro audit report.",
  path: "/audit",
  noIndex: true,
});

type PageProps = {
  params: { publicId: string };
  searchParams?: { submitted?: string };
};

export default async function AuditReportPage({ params, searchParams }: PageProps) {
  let report;
  try {
    report = await getAuditReport(params.publicId);
  } catch {
    report = null;
  }
  if (!report) notFound();

  const scores = [
    { label: "Website path", value: report.websiteScore, Icon: Search },
    { label: "Follow-up", value: report.followupScore, Icon: PhoneCall },
    { label: "Local visibility", value: report.localVisibilityScore, Icon: BarChart3 },
    { label: "Proof and trust", value: report.proofTrustScore, Icon: ShieldCheck },
    { label: "Speed and SEO", value: report.speedSeoScore, Icon: Gauge },
  ];

  return (
    <div className="min-h-screen bg-white text-slate-950">
      <LightHeader activePath="/lead-leak-audit" />

      <main>
        <section className="border-b border-slate-200 bg-slate-950 text-white">
          <div className="mx-auto max-w-7xl px-4 py-10 sm:px-6 lg:px-8 lg:py-16">
            <div className="inline-flex items-center gap-2 rounded-md border border-cyan-300/35 bg-cyan-300/10 px-3 py-1 text-xs font-semibold uppercase tracking-widest text-cyan-100">
              <LockKeyhole className="h-3.5 w-3.5" />
              Private audit link
            </div>
            {searchParams?.submitted ? (
              <div className="mt-5 rounded-lg border border-cyan-300/25 bg-cyan-300/10 p-4 text-sm font-semibold text-cyan-50">
                Your audit request was received. This report URL is private, unlisted, and not meant
                to be indexed by search engines.
              </div>
            ) : null}
            <div className="mt-6 grid gap-8 lg:grid-cols-[0.9fr_1.1fr] lg:items-end">
              <div>
                <h1 className="text-4xl font-semibold leading-tight tracking-tight sm:text-5xl">
                  {report.businessName || report.fullName} Lead Leak Report
                </h1>
                <p className="mt-5 max-w-3xl text-base leading-7 text-slate-300 sm:text-lg">
                  {report.publicSummary ||
                    "This report shows where the public lead path needs to be tightened first."}
                </p>
                <div className="mt-7 flex flex-col gap-3 sm:flex-row">
                  <Link
                    href="/book?source=audit-report"
                    className="inline-flex min-h-12 items-center justify-center gap-2 rounded-lg bg-accent-500 px-6 py-3 text-sm font-bold text-slate-950 hover:bg-accent-400"
                  >
                    Walk through this with Ryan <ArrowRight className="h-4 w-4" />
                  </Link>
                  <Link
                    href="/lead-leak-audit"
                    className="inline-flex min-h-12 items-center justify-center gap-2 rounded-lg border border-white/20 bg-white/10 px-6 py-3 text-sm font-bold text-white hover:bg-white/15"
                  >
                    Run another audit
                  </Link>
                </div>
              </div>

              <div className="rounded-lg border border-white/10 bg-white/[0.05] p-5">
                <div className="text-xs font-semibold uppercase tracking-widest text-cyan-100">
                  Lead leak score
                </div>
                <div className="mt-3 flex items-end gap-3">
                  <div className="text-7xl font-black tracking-tight text-white">{report.scoreTotal}</div>
                  <div className="pb-3 text-lg font-bold text-slate-300">/100</div>
                </div>
                <p className="mt-3 text-sm leading-6 text-slate-300">
                  Recommended first offer:{" "}
                  <span className="font-bold text-cyan-100">{report.recommendedOffer || "lead leak audit"}</span>
                </p>
              </div>
            </div>
          </div>
        </section>

        <section className="border-b border-slate-200 bg-white">
          <div className="mx-auto max-w-7xl px-4 py-12 sm:px-6 lg:px-8 lg:py-16">
            <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-5">
              {scores.map((score) => (
                <ScoreCard key={score.label} {...score} />
              ))}
            </div>
          </div>
        </section>

        <section className="border-b border-slate-200 bg-slate-50">
          <div className="mx-auto grid max-w-7xl gap-8 px-4 py-12 sm:px-6 lg:grid-cols-[0.84fr_1.16fr] lg:px-8 lg:py-16">
            <div>
              <div className="text-xs font-semibold uppercase tracking-widest text-cyan-700">
                First three fixes
              </div>
              <h2 className="mt-2 text-3xl font-semibold tracking-tight text-slate-950 sm:text-4xl">
                Do these before trying to scale traffic.
              </h2>
              <p className="mt-4 text-base leading-7 text-slate-700">
                The point is not to overwhelm the owner. It is to make the next sales move obvious.
              </p>
            </div>
            <div className="grid gap-3">
              {(report.firstThreeFixes || []).slice(0, 3).map((fix, index) => (
                <div key={fix} className="flex gap-4 rounded-lg border border-slate-200 bg-white p-4 shadow-sm">
                  <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-slate-950 text-sm font-black text-cyan-200">
                    {index + 1}
                  </div>
                  <p className="text-sm font-semibold leading-6 text-slate-800">{fix}</p>
                </div>
              ))}
            </div>
          </div>
        </section>

        <section className="border-b border-slate-200 bg-white">
          <div className="mx-auto max-w-7xl px-4 py-12 sm:px-6 lg:px-8 lg:py-16">
            <div className="max-w-3xl">
              <div className="text-xs font-semibold uppercase tracking-widest text-cyan-700">
                Findings
              </div>
              <h2 className="mt-2 text-3xl font-semibold tracking-tight text-slate-950 sm:text-4xl">
                What the audit saw.
              </h2>
            </div>
            <div className="mt-8 grid gap-4 md:grid-cols-2 xl:grid-cols-3">
              {(report.findings || []).map((finding) => (
                <div key={`${finding.area}-${finding.title}`} className="rounded-lg border border-slate-200 bg-slate-50 p-5">
                  <div className="flex items-center justify-between gap-3">
                    <div className="text-xs font-semibold uppercase tracking-widest text-cyan-700">
                      {finding.area}
                    </div>
                    <span className="rounded-md border border-slate-200 bg-white px-2 py-1 text-[11px] font-bold uppercase text-slate-700">
                      {finding.severity}
                    </span>
                  </div>
                  <h3 className="mt-3 text-lg font-bold text-slate-950">{finding.title}</h3>
                  <p className="mt-2 text-sm leading-6 text-slate-600">{finding.detail}</p>
                  <div className="mt-4 rounded-lg border border-cyan-200 bg-white p-3">
                    <div className="text-[11px] font-semibold uppercase tracking-widest text-cyan-700">
                      Fix
                    </div>
                    <p className="mt-1 text-sm font-semibold leading-6 text-slate-800">{finding.fix}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </section>

        <section className="bg-slate-950 text-white">
          <div className="mx-auto grid max-w-7xl gap-8 px-4 py-12 sm:px-6 lg:grid-cols-[1fr_0.9fr] lg:px-8 lg:py-16">
            <div>
              <div className="text-xs font-semibold uppercase tracking-widest text-cyan-100">
                What was scanned
              </div>
              <h2 className="mt-2 text-3xl font-semibold tracking-tight sm:text-4xl">
                Public signals only.
              </h2>
              <p className="mt-4 text-base leading-7 text-slate-300">
                This audit reads public website signals and the context you submitted. It does not
                claim private sales data unless you provide it.
              </p>
            </div>
            <div className="rounded-lg border border-white/10 bg-white/[0.05] p-5">
              <Info label="Website" value={report.businessUrl || "Not provided"} />
              <Info label="Title" value={report.crawlerSnapshot?.title || "Not detected"} />
              <Info label="Forms found" value={String(report.crawlerSnapshot?.forms ?? 0)} />
              <Info label="CTAs found" value={String(report.crawlerSnapshot?.ctas?.length ?? 0)} />
              <Info label="PageSpeed status" value={report.pageSpeedSnapshot?.status || "not checked"} />
            </div>
          </div>
        </section>
      </main>

      <LightFooter />
    </div>
  );
}

function ScoreCard({
  label,
  value,
  Icon,
}: {
  label: string;
  value: number;
  Icon: typeof Search;
}) {
  return (
    <div className="rounded-lg border border-slate-200 bg-slate-50 p-5">
      <Icon className="h-5 w-5 text-cyan-700" />
      <div className="mt-4 text-xs font-semibold uppercase tracking-widest text-slate-500">{label}</div>
      <div className="mt-2 text-3xl font-black text-slate-950">{value}</div>
    </div>
  );
}

function Info({ label, value }: { label: string; value: string }) {
  return (
    <div className="border-b border-white/10 py-3 last:border-b-0">
      <div className="text-xs font-semibold uppercase tracking-widest text-slate-400">{label}</div>
      <div className="mt-1 break-words text-sm font-semibold text-white">{value}</div>
    </div>
  );
}
