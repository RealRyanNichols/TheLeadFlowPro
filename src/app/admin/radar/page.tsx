import Link from "next/link";
import { ArrowRight, MapPinned, Radar, Search, ShieldCheck } from "lucide-react";
import { requireAdminUser } from "@/lib/admin";
import { listProspects } from "@/lib/lead-intelligence";

export const dynamic = "force-dynamic";
export const metadata = { title: "Local Prospect Radar - The LeadFlow Pro" };

export default async function LocalRadarPage() {
  const admin = await requireAdminUser();
  const prospects = await listProspects(100).catch(() => []);

  return (
    <div className="min-h-screen bg-slate-950 text-white">
      <header className="relative overflow-hidden border-b border-cyan-300/20">
        <div
          aria-hidden
          className="absolute inset-0 bg-[linear-gradient(135deg,#020617_0%,#083344_40%,#0f172a_72%,#431407_100%)]"
        />
        <div className="relative mx-auto max-w-7xl px-4 py-8">
          <div className="flex flex-col gap-5 lg:flex-row lg:items-center lg:justify-between">
            <div>
              <div className="inline-flex items-center gap-2 rounded-full border border-cyan-300/30 bg-cyan-300/10 px-3 py-1 text-xs font-semibold uppercase tracking-widest text-cyan-100">
                <Radar className="h-3.5 w-3.5" /> Local prospect radar
              </div>
              <h1 className="mt-4 text-4xl font-semibold tracking-tight sm:text-5xl">
                Build tonight's outreach list by niche and city.
              </h1>
              <p className="mt-3 max-w-3xl text-sm leading-relaxed text-slate-300">
                Signed in as {admin.email}. With a Google Places API key, this can auto-seed
                prospects. Without it, it creates manual search links and a local batch tracker.
              </p>
            </div>
            <Link href="/admin/intelligence" className="rounded-xl bg-white px-4 py-3 text-sm font-semibold text-slate-950 hover:bg-cyan-50">
              Intelligence
            </Link>
          </div>
        </div>
      </header>

      <main className="mx-auto grid max-w-7xl gap-6 px-4 py-8 xl:grid-cols-[420px_minmax(0,1fr)]">
        <aside className="rounded-3xl border border-white/10 bg-white/[0.04] p-5 shadow-2xl shadow-black/20">
          <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-widest text-cyan-200">
            <MapPinned className="h-4 w-4" />
            Run radar
          </div>
          <form action="/api/admin/prospect-radar" method="post" className="mt-5 grid gap-4">
            <Field label="City" name="city" defaultValue="Longview" />
            <Field label="State" name="state" defaultValue="Texas" />
            <Field label="Niche" name="niche" defaultValue="contractors" />
            <button className="inline-flex min-h-12 items-center justify-center gap-2 rounded-xl bg-accent-500 px-4 py-3 text-sm font-semibold text-white hover:bg-accent-600">
              Build prospect batch <ArrowRight className="h-4 w-4" />
            </button>
          </form>

          <div className="mt-6 rounded-2xl border border-white/10 bg-white/[0.05] p-4">
            <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-widest text-cyan-200">
              <ShieldCheck className="h-4 w-4" />
              Guardrail
            </div>
            <p className="mt-2 text-sm leading-relaxed text-slate-300">
              Keep this private. Do not publish prospect names as "bad" or "broken." Use it to
              prioritize helpful audit outreach.
            </p>
          </div>
        </aside>

        <section className="rounded-3xl border border-white/10 bg-white/[0.04] p-5 shadow-2xl shadow-black/20">
          <div className="flex items-center justify-between gap-3">
            <div>
              <h2 className="text-2xl font-semibold tracking-tight">Prospects</h2>
              <p className="mt-1 text-sm text-slate-400">
                Score means outreach priority, not a public claim.
              </p>
            </div>
          </div>

          <div className="mt-5 grid gap-3">
            {prospects.length ? prospects.map((prospect) => (
              <article key={prospect.id} className="rounded-2xl border border-white/10 bg-white/[0.05] p-4">
                <div className="flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
                  <div>
                    <div className="flex flex-wrap items-center gap-2">
                      <h3 className="font-semibold text-white">{prospect.businessName}</h3>
                      <span className="rounded-full border border-cyan-300/20 bg-cyan-300/10 px-2 py-0.5 text-[11px] font-semibold uppercase tracking-wider text-cyan-100">
                        {prospect.score}/100
                      </span>
                    </div>
                    <p className="mt-1 text-xs text-slate-500">
                      {prospect.niche} - {prospect.city}, {prospect.state || "Texas"}
                    </p>
                    <div className="mt-3 grid gap-1">
                      {(prospect.leakSignals || []).map((signal) => (
                        <div key={signal} className="flex items-start gap-2 text-sm text-slate-300">
                          <Search className="mt-0.5 h-4 w-4 shrink-0 text-cyan-200" />
                          <span>{signal}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                  <div className="flex shrink-0 flex-wrap gap-2">
                    {prospect.website ? (
                      <a
                        href={prospect.website}
                        target="_blank"
                        rel="noreferrer"
                        className="rounded-xl bg-white px-3 py-2 text-sm font-semibold text-slate-950 hover:bg-cyan-50"
                      >
                        Website
                      </a>
                    ) : null}
                    {prospect.sourceUrl ? (
                      <a
                        href={prospect.sourceUrl}
                        target="_blank"
                        rel="noreferrer"
                        className="rounded-xl border border-white/10 bg-white/[0.08] px-3 py-2 text-sm font-semibold hover:bg-white/[0.13]"
                      >
                        Source
                      </a>
                    ) : null}
                  </div>
                </div>
              </article>
            )) : (
              <div className="rounded-2xl border border-dashed border-white/10 p-6 text-sm text-slate-400">
                No prospect batches yet.
              </div>
            )}
          </div>
        </section>
      </main>
    </div>
  );
}

function Field({
  label,
  name,
  defaultValue,
}: {
  label: string;
  name: string;
  defaultValue: string;
}) {
  return (
    <label>
      <span className="text-sm font-semibold text-slate-200">{label}</span>
      <input
        name={name}
        defaultValue={defaultValue}
        className="mt-2 min-h-12 w-full rounded-xl border border-white/10 bg-white px-3 text-sm font-semibold text-slate-950 outline-none focus:ring-2 focus:ring-cyan-300/40"
      />
    </label>
  );
}
