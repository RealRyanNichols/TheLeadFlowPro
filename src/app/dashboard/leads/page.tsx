import Link from "next/link";
import { redirect } from "next/navigation";
import { ArrowRight, DatabaseZap, Plus, Inbox } from "lucide-react";
import { LeadStatusBadge, LeadSourceLabel } from "@/components/dashboard/LeadStatusBadge";
import { StatCard } from "@/components/dashboard/StatCard";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { formatCurrency, relativeTime } from "@/lib/utils";

export const dynamic = "force-dynamic";

export default async function LeadsPage() {
  const session = await auth();
  const userId = (session?.user as { id?: string } | undefined)?.id;
  if (!userId) redirect("/login?next=/dashboard/leads");

  const leads = await prisma.lead.findMany({
    where: { userId },
    orderBy: [{ lastContact: "desc" }, { createdAt: "desc" }],
    take: 200,
  });

  const now = new Date();
  const startOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const newToday = leads.filter((l) => l.createdAt >= startOfToday).length;
  const totalEstValue = leads.reduce((s, l) => s + (l.estValue ?? 0), 0);
  const hasLeads = leads.length > 0;

  return (
    <div className="max-w-7xl mx-auto space-y-8">
      <div className="flex items-start justify-between gap-4 flex-wrap">
        <div>
          <p className="text-cyan-400 text-sm font-semibold">Lead Vault</p>
          <h1 className="mt-1 text-3xl font-extrabold text-white">
            Every person and company signal. <span className="funnel-text">One vault.</span>
          </h1>
          <p className="mt-2 text-ink-300">
            CRM leads, problem-intake records, source submissions, buyer requests,
            and scored contacts belong in one reviewable place.
          </p>
        </div>
        <div className="flex gap-2">
          <Link href="/problem-intake" className="btn-ghost text-sm py-2 px-3">
            <DatabaseZap className="h-4 w-4" /> Capture intent
          </Link>
          <Link href="/marketplace" className="btn-primary text-sm py-2 px-3">
            <Plus className="h-4 w-4" /> Build list
          </Link>
        </div>
      </div>

      <div className="grid gap-4 sm:grid-cols-4">
        <StatCard label="Vault records" value={leads.length.toString()} sub="Grows as signals arrive" />
        <StatCard label="New today" value={newToday.toString()} sub="Fresh demand today" />
        <StatCard
          label="Potential value"
          value={formatCurrency(totalEstValue)}
          sub="Sum of estimated values"
          highlight
        />
        <StatCard label="Review status" value="—" sub="Scoring and packaging next" />
      </div>

      <div className="glass rounded-2xl overflow-hidden">
        <div className="px-5 py-3 border-b border-white/5 flex items-center justify-between">
          <h2 className="text-sm font-bold text-white">All vault records</h2>
          <div className="flex items-center gap-2">
            {["All", "New", "Nurturing", "Booked", "Won"].map((f, i) => (
              <button
                key={f}
                className={
                  i === 0
                    ? "stat-pill bg-cyan-500/15 text-cyan-400 border border-cyan-500/30 text-xs"
                    : "stat-pill bg-white/5 text-ink-300 border border-white/10 text-xs hover:text-white"
                }
              >
                {f}
              </button>
            ))}
          </div>
        </div>

        {hasLeads ? (
          <div className="divide-y divide-white/5">
            {leads.map((l) => (
              <Link
                key={l.id}
                href={`/dashboard/leads/${l.id}`}
                className="px-5 py-4 hover:bg-white/[0.02] transition flex items-center gap-4"
              >
                <div className="h-10 w-10 rounded-xl bg-gradient-to-br from-cyan-500 to-brand-600 flex items-center justify-center text-sm font-bold text-white shrink-0">
                  {(l.name ?? "?")
                    .split(" ")
                    .map((p) => p[0])
                    .slice(0, 2)
                    .join("")
                    .toUpperCase() || "?"}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="text-white font-semibold">
                      {l.name || l.phone || l.email || "New lead"}
                    </span>
                    <LeadStatusBadge status={l.status} />
                    <LeadSourceLabel source={l.source} />
                  </div>
                  {l.notes && (
                    <p className="text-xs text-ink-300 mt-0.5 truncate">{l.notes}</p>
                  )}
                  <p className="text-[11px] text-ink-500 mt-0.5">
                    {l.phone || l.email || "—"}
                  </p>
                </div>
                <div className="text-right shrink-0 hidden sm:block">
                  {l.estValue ? (
                    <p className="text-sm text-lead-400 font-semibold">
                      {formatCurrency(l.estValue)}
                    </p>
                  ) : null}
                  <p className="text-[11px] text-ink-400 mt-0.5">
                    {relativeTime(l.lastContact ?? l.createdAt)}
                  </p>
                </div>
                <div className="flex gap-1 shrink-0">
                  <span
                    className="h-9 w-9 rounded-lg hover:bg-white/5 flex items-center justify-center text-ink-300 hover:text-cyan-400"
                    title="Open source detail"
                  >
                    <DatabaseZap className="h-4 w-4" />
                  </span>
                  <span
                    className="h-9 w-9 rounded-lg hover:bg-white/5 flex items-center justify-center text-ink-300 hover:text-cyan-400"
                    title="Package for request"
                  >
                    <ArrowRight className="h-4 w-4" />
                  </span>
                </div>
              </Link>
            ))}
          </div>
        ) : (
          <div className="px-5 py-10 text-center">
            <div className="h-12 w-12 rounded-xl bg-white/5 border border-white/10 flex items-center justify-center mx-auto">
              <Inbox className="h-5 w-5 text-ink-400" />
            </div>
            <p className="mt-4 text-sm text-white font-semibold">No vault records yet</p>
            <p className="mt-1 text-xs text-ink-300 max-w-sm mx-auto">
              Start with problem intake or a marketplace request. The signal lands
              here after it has a person, company, source, and use case attached.
            </p>
            <div className="mt-4 flex justify-center gap-2">
              <Link href="/problem-intake" className="btn-ghost text-xs py-2 px-3">
                Capture problem intent
              </Link>
              <Link href="/marketplace" className="btn-primary text-xs py-2 px-3">
                Open marketplace
              </Link>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
