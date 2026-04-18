import Link from "next/link";
import { PhoneCall, MessageSquare, Settings2, Plus, Inbox } from "lucide-react";
import { LeadStatusBadge, LeadSourceLabel } from "@/components/dashboard/LeadStatusBadge";
import { StatCard } from "@/components/dashboard/StatCard";
import { MOCK_LEADS, MOCK_KPIS } from "@/lib/mock-data";
import { formatCurrency, relativeTime } from "@/lib/utils";

export default function LeadsPage() {
  const totalEstValue = MOCK_LEADS.reduce((s, l) => s + (l.estValue ?? 0), 0);
  const hasLeads = MOCK_LEADS.length > 0;

  return (
    <div className="max-w-7xl mx-auto space-y-8">
      <div className="flex items-start justify-between gap-4 flex-wrap">
        <div>
          <p className="text-cyan-400 text-sm font-semibold">Lead Inbox</p>
          <h1 className="mt-1 text-3xl font-extrabold text-white">
            Every lead. <span className="funnel-text">One inbox.</span>
          </h1>
          <p className="mt-2 text-ink-300">
            Calls, texts, forms, DMs — all here. The Next Move on each is up to you.
          </p>
        </div>
        <div className="flex gap-2">
          <Link href="/dashboard/leads/missed-call" className="btn-ghost text-sm py-2 px-3">
            <Settings2 className="h-4 w-4" /> Missed-call settings
          </Link>
          <button className="btn-primary text-sm py-2 px-3">
            <Plus className="h-4 w-4" /> Add lead
          </button>
        </div>
      </div>

      <div className="grid gap-4 sm:grid-cols-4">
        <StatCard label="Total leads"    value={MOCK_LEADS.length.toString()} sub="Grows as leads arrive" />
        <StatCard label="New today"      value="0" sub="Resets each morning" />
        <StatCard label="Pipeline value" value={formatCurrency(totalEstValue)} sub="Sum of estimated values" highlight />
        <StatCard label="Avg response"   value="—" sub="Tracked from first reply" />
      </div>

      <div className="glass rounded-2xl overflow-hidden">
        <div className="px-5 py-3 border-b border-white/5 flex items-center justify-between">
          <h2 className="text-sm font-bold text-white">All leads</h2>
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
            {MOCK_LEADS.map((l) => (
              <Link
                key={l.id}
                href={`/dashboard/leads/${l.id}`}
                className="px-5 py-4 hover:bg-white/[0.02] transition flex items-center gap-4"
              >
                <div className="h-10 w-10 rounded-xl bg-gradient-to-br from-cyan-500 to-brand-600 flex items-center justify-center text-sm font-bold text-white shrink-0">
                  {l.name?.split(" ").map((p) => p[0]).slice(0, 2).join("")}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="text-white font-semibold">{l.name}</span>
                    <LeadStatusBadge status={l.status} />
                    <LeadSourceLabel source={l.source} />
                  </div>
                  <p className="text-xs text-ink-300 mt-0.5 truncate">{l.notes}</p>
                  <p className="text-[11px] text-ink-500 mt-0.5">{l.phone}</p>
                </div>
                <div className="text-right shrink-0 hidden sm:block">
                  {l.estValue && (
                    <p className="text-sm text-lead-400 font-semibold">
                      {formatCurrency(l.estValue)}
                    </p>
                  )}
                  <p className="text-[11px] text-ink-400 mt-0.5">{relativeTime(l.createdAt)}</p>
                </div>
                <div className="flex gap-1 shrink-0">
                  <span className="h-9 w-9 rounded-lg hover:bg-white/5 flex items-center justify-center text-ink-300 hover:text-cyan-400" title="Call">
                    <PhoneCall className="h-4 w-4" />
                  </span>
                  <span className="h-9 w-9 rounded-lg hover:bg-white/5 flex items-center justify-center text-ink-300 hover:text-cyan-400" title="Text">
                    <MessageSquare className="h-4 w-4" />
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
            <p className="mt-4 text-sm text-white font-semibold">No leads yet</p>
            <p className="mt-1 text-xs text-ink-300 max-w-sm mx-auto">
              The second a call, text, DM, or form comes in, it lands here with a
              Next Move from Flo. Connect your socials to get going — or add a
              lead manually with the button above.
            </p>
            <div className="mt-4 flex justify-center gap-2">
              <Link href="/dashboard/social" className="btn-ghost text-xs py-2 px-3">
                Connect social accounts
              </Link>
              <Link href="/dashboard/leads/missed-call" className="btn-primary text-xs py-2 px-3">
                Set up missed-call text-back
              </Link>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
