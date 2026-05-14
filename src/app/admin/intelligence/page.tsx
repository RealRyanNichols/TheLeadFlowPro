import Link from "next/link";
import {
  ArrowRight,
  BarChart3,
  ClipboardCheck,
  FileText,
  Mail,
  Radar,
  ShieldCheck,
} from "lucide-react";
import { requireAdminUser } from "@/lib/admin";
import { listAuditReports, listOutreachItems } from "@/lib/lead-intelligence";

export const dynamic = "force-dynamic";
export const metadata = { title: "Lead Intelligence - The LeadFlow Pro" };

export default async function AdminIntelligencePage() {
  const admin = await requireAdminUser();
  const [reports, outreach] = await Promise.all([
    listAuditReports(40).catch(() => []),
    listOutreachItems(60).catch(() => []),
  ]);

  const avgScore = reports.length
    ? Math.round(reports.reduce((sum, report) => sum + Number(report.scoreTotal || 0), 0) / reports.length)
    : 0;
  const hot = reports.filter((report) => report.scoreTotal < 65).length;

  return (
    <div className="min-h-screen bg-slate-950 text-white">
      <header className="relative overflow-hidden border-b border-cyan-300/20">
        <div
          aria-hidden
          className="absolute inset-0 bg-[linear-gradient(135deg,#020617_0%,#083344_38%,#0f172a_70%,#431407_100%)]"
        />
        <div className="absolute -right-28 -top-32 h-96 w-96 rounded-full bg-cyan-400/20 blur-3xl" />
        <div className="absolute -left-28 -bottom-32 h-96 w-96 rounded-full bg-accent-400/20 blur-3xl" />
        <div className="relative mx-auto max-w-7xl px-4 py-8">
          <div className="flex flex-col gap-5 lg:flex-row lg:items-center lg:justify-between">
            <div>
              <div className="inline-flex items-center gap-2 rounded-full border border-cyan-300/30 bg-cyan-300/10 px-3 py-1 text-xs font-semibold uppercase tracking-widest text-cyan-100">
                <ShieldCheck className="h-3.5 w-3.5" /> Ryan-only intelligence queue
              </div>
              <h1 className="mt-4 text-4xl font-semibold tracking-tight sm:text-5xl">
                Every audit becomes a sales move.
              </h1>
              <p className="mt-3 max-w-3xl text-sm leading-relaxed text-slate-300">
                Signed in as {admin.email}. This page turns cold audit submissions into report
                links, outreach scripts, proof drafts, and local prospecting.
              </p>
            </div>
            <div className="flex flex-wrap gap-2">
              <Link href="/admin/proof-factory" className="rounded-xl bg-white px-4 py-3 text-sm font-semibold text-slate-950 hover:bg-cyan-50">
                Proof factory
              </Link>
              <Link href="/admin/radar" className="rounded-xl bg-accent-500 px-4 py-3 text-sm font-semibold text-white hover:bg-accent-600">
                Local radar
              </Link>
              <Link href="/admin" className="rounded-xl border border-white/15 bg-white/10 px-4 py-3 text-sm font-semibold text-white hover:bg-white/15">
                Admin home
              </Link>
            </div>
          </div>

          <div className="mt-7 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
            <Stat icon={ClipboardCheck} label="Audit reports" value={String(reports.length)} sub="Private report URLs" />
            <Stat icon={BarChart3} label="Average score" value={String(avgScore)} sub="Across stored reports" />
            <Stat icon={Radar} label="Hot leaks" value={String(hot)} sub="Score under 65" />
            <Stat icon={Mail} label="Outreach items" value={String(outreach.length)} sub="Scripts ready to work" />
          </div>
        </div>
      </header>

      <main className="mx-auto grid max-w-7xl gap-6 px-4 py-8 xl:grid-cols-[minmax(0,1fr)_420px]">
        <section className="rounded-3xl border border-white/10 bg-white/[0.04] p-5 shadow-2xl shadow-black/20">
          <div className="flex flex-col gap-3 md:flex-row md:items-end md:justify-between">
            <div>
              <h2 className="text-2xl font-semibold tracking-tight">Audit reports</h2>
              <p className="mt-1 text-sm text-slate-400">
                Review the private report, then use the first fix as the opener.
              </p>
            </div>
            <Link
              href="/lead-leak-audit"
              className="inline-flex min-h-11 items-center justify-center gap-2 rounded-xl bg-cyan-300 px-4 py-3 text-sm font-semibold text-slate-950 hover:bg-cyan-200"
            >
              Public audit page <ArrowRight className="h-4 w-4" />
            </Link>
          </div>

          <div className="mt-5 grid gap-3">
            {reports.length ? reports.map((report) => (
              <article key={report.id} className="rounded-2xl border border-white/10 bg-white/[0.05] p-4">
                <div className="flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
                  <div>
                    <div className="flex flex-wrap items-center gap-2">
                      <h3 className="font-semibold text-white">{report.businessName || report.fullName}</h3>
                      <span className="rounded-full border border-cyan-300/20 bg-cyan-300/10 px-2 py-0.5 text-[11px] font-semibold uppercase tracking-wider text-cyan-100">
                        {report.scoreTotal}/100
                      </span>
                    </div>
                    <p className="mt-1 text-sm text-slate-400">{report.email}</p>
                    <p className="mt-2 line-clamp-2 text-sm leading-relaxed text-slate-300">
                      {report.publicSummary}
                    </p>
                  </div>
                  <div className="flex shrink-0 flex-wrap gap-2">
                    <Link
                      href={`/audit/${report.publicId}`}
                      className="rounded-xl bg-white px-3 py-2 text-sm font-semibold text-slate-950 hover:bg-cyan-50"
                    >
                      Open report
                    </Link>
                    <form action="/api/admin/proof-drafts" method="post">
                      <input type="hidden" name="publicId" value={report.publicId} />
                      <button className="rounded-xl border border-white/10 bg-white/[0.08] px-3 py-2 text-sm font-semibold hover:bg-white/[0.13]">
                        Make proof draft
                      </button>
                    </form>
                  </div>
                </div>
              </article>
            )) : (
              <div className="rounded-2xl border border-dashed border-white/10 p-6 text-sm text-slate-400">
                No audit reports yet. Submit a test from /lead-leak-audit after the database is live.
              </div>
            )}
          </div>
        </section>

        <aside className="space-y-6">
          <section className="rounded-3xl border border-white/10 bg-white/[0.04] p-5 shadow-2xl shadow-black/20">
            <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-widest text-accent-200">
              <Mail className="h-4 w-4" />
              Outreach queue
            </div>
            <div className="mt-4 grid gap-3">
              {outreach.length ? outreach.slice(0, 12).map((item) => (
                <div key={item.id} className="rounded-2xl border border-white/10 bg-white/[0.05] p-4">
                  <div className="text-[11px] font-semibold uppercase tracking-widest text-slate-500">
                    Priority {item.priority} - {item.status}
                  </div>
                  <h3 className="mt-2 text-sm font-semibold text-white">{item.opener}</h3>
                  <p className="mt-2 whitespace-pre-wrap text-xs leading-relaxed text-slate-300">{item.script}</p>
                  {item.publicId ? (
                    <Link href={`/audit/${item.publicId}`} className="mt-3 inline-flex items-center gap-1 text-xs font-semibold text-cyan-200">
                      Report link <ArrowRight className="h-3 w-3" />
                    </Link>
                  ) : null}
                </div>
              )) : (
                <p className="text-sm text-slate-400">No outreach items yet.</p>
              )}
            </div>
          </section>

          <section className="rounded-3xl border border-white/10 bg-white/[0.04] p-5 shadow-2xl shadow-black/20">
            <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-widest text-cyan-200">
              <FileText className="h-4 w-4" />
              Tonight's ad angle
            </div>
            <h2 className="mt-3 text-xl font-semibold tracking-tight">
              Free Lead Leak Audit
            </h2>
            <p className="mt-2 text-sm leading-relaxed text-slate-300">
              Do not advertise generic marketing. Advertise the problem: calls, clicks, forms,
              DMs, and follow-up turning into lost money.
            </p>
          </section>
        </aside>
      </main>
    </div>
  );
}

function Stat({
  icon: Icon,
  label,
  value,
  sub,
}: {
  icon: typeof ClipboardCheck;
  label: string;
  value: string;
  sub: string;
}) {
  return (
    <div className="rounded-2xl border border-white/10 bg-white/[0.06] p-4">
      <Icon className="h-5 w-5 text-cyan-200" />
      <div className="mt-3 text-xs font-semibold uppercase tracking-widest text-cyan-100">{label}</div>
      <div className="mt-2 text-3xl font-bold tracking-tight">{value}</div>
      <div className="mt-1 text-xs text-slate-400">{sub}</div>
    </div>
  );
}
