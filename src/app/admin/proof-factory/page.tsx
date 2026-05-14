import Link from "next/link";
import { ArrowRight, CheckCircle2, FileText, Megaphone, ShieldCheck } from "lucide-react";
import { requireAdminUser } from "@/lib/admin";
import { listAuditReports, listProofDrafts } from "@/lib/lead-intelligence";

export const dynamic = "force-dynamic";
export const metadata = { title: "Proof Factory - The LeadFlow Pro" };

export default async function ProofFactoryPage() {
  const admin = await requireAdminUser();
  const [reports, drafts] = await Promise.all([
    listAuditReports(30).catch(() => []),
    listProofDrafts(60).catch(() => []),
  ]);

  return (
    <div className="min-h-screen bg-slate-950 text-white">
      <header className="relative overflow-hidden border-b border-cyan-300/20">
        <div
          aria-hidden
          className="absolute inset-0 bg-[linear-gradient(135deg,#020617_0%,#083344_42%,#0f172a_72%,#431407_100%)]"
        />
        <div className="relative mx-auto max-w-7xl px-4 py-8">
          <div className="flex flex-col gap-5 lg:flex-row lg:items-center lg:justify-between">
            <div>
              <div className="inline-flex items-center gap-2 rounded-full border border-cyan-300/30 bg-cyan-300/10 px-3 py-1 text-xs font-semibold uppercase tracking-widest text-cyan-100">
                <FileText className="h-3.5 w-3.5" /> Proof factory
              </div>
              <h1 className="mt-4 text-4xl font-semibold tracking-tight sm:text-5xl">
                Turn audits into posts, proof pages, and ad angles.
              </h1>
              <p className="mt-3 max-w-3xl text-sm leading-relaxed text-slate-300">
                Signed in as {admin.email}. Generate safe proof drafts from audit reports. These
                are drafts, not public claims, until Ryan reviews them.
              </p>
            </div>
            <div className="flex flex-wrap gap-2">
              <Link href="/admin/intelligence" className="rounded-xl bg-white px-4 py-3 text-sm font-semibold text-slate-950 hover:bg-cyan-50">
                Intelligence
              </Link>
              <Link href="/proof" className="rounded-xl border border-white/15 bg-white/10 px-4 py-3 text-sm font-semibold text-white hover:bg-white/15">
                Public proof page
              </Link>
            </div>
          </div>
        </div>
      </header>

      <main className="mx-auto grid max-w-7xl gap-6 px-4 py-8 xl:grid-cols-[420px_minmax(0,1fr)]">
        <aside className="rounded-3xl border border-white/10 bg-white/[0.04] p-5 shadow-2xl shadow-black/20">
          <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-widest text-cyan-200">
            <ShieldCheck className="h-4 w-4" />
            Make draft from audit
          </div>
          <div className="mt-4 grid gap-3">
            {reports.length ? reports.map((report) => (
              <form key={report.id} action="/api/admin/proof-drafts" method="post" className="rounded-2xl border border-white/10 bg-white/[0.05] p-4">
                <input type="hidden" name="publicId" value={report.publicId} />
                <h2 className="text-sm font-semibold text-white">{report.businessName || report.fullName}</h2>
                <p className="mt-1 text-xs text-slate-400">{report.scoreTotal}/100 - {report.recommendedOffer}</p>
                <button className="mt-3 inline-flex min-h-10 items-center justify-center gap-2 rounded-xl bg-cyan-300 px-3 py-2 text-sm font-semibold text-slate-950 hover:bg-cyan-200">
                  Generate proof draft <ArrowRight className="h-4 w-4" />
                </button>
              </form>
            )) : (
              <p className="text-sm text-slate-400">No audit reports yet.</p>
            )}
          </div>
        </aside>

        <section className="rounded-3xl border border-white/10 bg-white/[0.04] p-5 shadow-2xl shadow-black/20">
          <div className="flex items-center justify-between gap-3">
            <div>
              <h2 className="text-2xl font-semibold tracking-tight">Drafts</h2>
              <p className="mt-1 text-sm text-slate-400">
                Copy these into posts, proof pages, email follow-ups, or ad scripts after review.
              </p>
            </div>
          </div>
          <div className="mt-5 grid gap-4">
            {drafts.length ? drafts.map((draft) => (
              <article key={draft.id} className="rounded-2xl border border-white/10 bg-white/[0.05] p-5">
                <div className="flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
                  <div>
                    <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-widest text-cyan-100">
                      <CheckCircle2 className="h-4 w-4" />
                      {draft.status}
                    </div>
                    <h3 className="mt-3 text-xl font-semibold text-white">{draft.title}</h3>
                    <p className="mt-2 text-sm leading-relaxed text-slate-300">{draft.summary}</p>
                  </div>
                  <span className="rounded-full border border-white/10 bg-white/[0.08] px-3 py-1 text-xs font-semibold text-slate-300">
                    /proof/{draft.slug}
                  </span>
                </div>

                <div className="mt-5 grid gap-3 md:grid-cols-2">
                  <Block label="Before" value={draft.beforeState} />
                  <Block label="After" value={draft.afterState} />
                </div>

                <div className="mt-4 rounded-2xl border border-white/10 bg-slate-900/70 p-4">
                  <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-widest text-accent-200">
                    <Megaphone className="h-4 w-4" />
                    Social post
                  </div>
                  <pre className="mt-3 whitespace-pre-wrap text-sm leading-relaxed text-slate-200">{draft.socialPost}</pre>
                </div>
                <Block label="Ad angle" value={draft.adAngle} />
              </article>
            )) : (
              <div className="rounded-2xl border border-dashed border-white/10 p-6 text-sm text-slate-400">
                No proof drafts yet.
              </div>
            )}
          </div>
        </section>
      </main>
    </div>
  );
}

function Block({ label, value }: { label: string; value: string }) {
  return (
    <div className="mt-4 rounded-2xl border border-white/10 bg-slate-900/70 p-4">
      <div className="text-xs font-semibold uppercase tracking-widest text-slate-500">{label}</div>
      <p className="mt-2 whitespace-pre-wrap text-sm leading-relaxed text-slate-200">{value}</p>
    </div>
  );
}
