import Link from "next/link";
import { ArrowRight, Sparkles, ShieldCheck, Phone, MessageSquare, Megaphone, Zap } from "lucide-react";
import { StatCard } from "@/components/dashboard/StatCard";
import { NextMoveCard } from "@/components/dashboard/NextMoveCard";
import { LeadsChart } from "@/components/dashboard/LeadsChart";
import { MOCK_KPIS, MOCK_NEXT_MOVES, MOCK_LEADS } from "@/lib/mock-data";
import { formatCurrency, formatPercent, relativeTime } from "@/lib/utils";
import { auth } from "@/lib/auth";

export default async function DashboardOverview() {
  const session = await auth();
  const firstName =
    (session?.user?.name || session?.user?.email || "").split(" ")[0]?.split("@")[0] || "there";

  const hasNextMoves = MOCK_NEXT_MOVES.length > 0;
  const hasLeads = MOCK_LEADS.length > 0;

  return (
    <div className="space-y-8 max-w-7xl mx-auto">
      {/* greeting */}
      <div>
        <p className="text-cyan-400 text-sm font-semibold">
          Welcome{session?.user ? `, ${firstName}` : ""}
        </p>
        <h1 className="mt-1 text-3xl font-extrabold text-white">
          Your dashboard —{" "}
          <span className="funnel-text">honest from day one</span>
        </h1>
        <p className="mt-2 text-sm text-ink-300 max-w-2xl">
          Everything you see here is real. No inflated numbers, no invented leads.
          Connect your sources and Flo will start filling in the blanks.
        </p>
      </div>

      {/* KPIs — real zeros, no fake deltas */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard label="Leads this month" value={MOCK_KPIS.newLeadsThisMonth.toString()} sub="Connect a lead source to start counting" highlight />
        <StatCard label="Cost per lead"    value={formatCurrency(MOCK_KPIS.costPerLead)} sub="Needs ad-spend data" />
        <StatCard label="Ad spend (MTD)"   value={formatCurrency(MOCK_KPIS.adSpend)} sub="Connect Meta / Google Ads" />
        <StatCard label="Conversion rate"  value={formatPercent(MOCK_KPIS.conversionRate * 100)} sub="Appears once leads convert" />
      </div>

      {/* Connect-to-unlock block — only shown while there is nothing to do */}
      {!hasNextMoves && (
        <div className="glass rounded-2xl p-6 sm:p-8 border border-cyan-400/20">
          <div className="flex items-start gap-4">
            <div className="h-12 w-12 rounded-xl bg-gradient-to-br from-cyan-500 to-accent-500 flex items-center justify-center text-white shrink-0">
              <Sparkles className="h-5 w-5" />
            </div>
            <div className="flex-1 min-w-0">
              <h2 className="text-lg font-bold text-white">
                Let's plug you in so Flo can get to work
              </h2>
              <p className="mt-1 text-sm text-ink-200">
                Pick any one to start. You don't need them all — Flo gets more
                useful with each source you add.
              </p>
              <div className="mt-4 grid sm:grid-cols-2 gap-2">
                <ConnectRow
                  icon={Phone}
                  title="Connect your phone number"
                  sub="Missed-call text-back starts working immediately"
                />
                <ConnectRow
                  icon={MessageSquare}
                  title="Connect Instagram / Facebook"
                  sub="Catch DMs and ad leads in one inbox"
                />
                <ConnectRow
                  icon={Megaphone}
                  title="Connect Google / Meta Ads"
                  sub="See cost-per-lead in real dollars"
                />
                <ConnectRow
                  icon={Zap}
                  title="Add a lead form or CRM import"
                  sub="Pull in everyone who already reached out"
                />
              </div>
              <p className="mt-4 text-xs text-ink-400 flex items-center gap-1">
                <ShieldCheck className="h-3 w-3" /> Your data is yours. We never sell it, ever.
              </p>
            </div>
          </div>
        </div>
      )}

      <div className="grid gap-6 lg:grid-cols-3">
        {/* Next Moves: the heart of LeadFlow Pro */}
        <div className="lg:col-span-2 space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-xl font-bold text-white">Your next moves</h2>
              <p className="text-sm text-ink-300">
                Ranked by impact. You decide what to act on.
              </p>
            </div>
            <Link href="/dashboard/insights" className="text-sm text-cyan-400 hover:underline inline-flex items-center gap-1">
              See all insights <ArrowRight className="h-3 w-3" />
            </Link>
          </div>

          {hasNextMoves ? (
            <div className="grid gap-4">
              {MOCK_NEXT_MOVES.map((m) => <NextMoveCard key={m.id} move={m} />)}
            </div>
          ) : (
            <div className="rounded-2xl border border-dashed border-white/10 p-6 text-center">
              <p className="text-sm text-ink-200">
                Flo will drop your first move here as soon as a lead comes in
                or an opportunity shows up in your data.
              </p>
              <p className="mt-1 text-xs text-ink-400">
                No busy-work. No fake priorities.
              </p>
            </div>
          )}
        </div>

        {/* Right rail */}
        <div className="space-y-6">
          <LeadsChart />

          <div className="glass rounded-2xl p-5">
            <div className="flex items-center justify-between mb-3">
              <h3 className="text-base font-bold text-white">Recent leads</h3>
              <Link href="/dashboard/leads" className="text-xs text-cyan-400 hover:underline">
                Open inbox →
              </Link>
            </div>
            {hasLeads ? (
              <ul className="space-y-3">
                {MOCK_LEADS.slice(0, 5).map((l) => (
                  <li key={l.id} className="flex items-center justify-between text-sm">
                    <div className="min-w-0">
                      <p className="text-white font-medium truncate">{l.name}</p>
                      <p className="text-xs text-ink-400 truncate">{l.notes}</p>
                    </div>
                    <span className="text-[10px] text-ink-400 shrink-0 ml-2">
                      {relativeTime(l.createdAt)}
                    </span>
                  </li>
                ))}
              </ul>
            ) : (
              <div className="rounded-xl border border-dashed border-white/10 p-4 text-center">
                <p className="text-xs text-ink-300">
                  No leads yet. They'll show up here the moment one comes in.
                </p>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

function ConnectRow({
  icon: Icon, title, sub,
}: { icon: any; title: string; sub: string }) {
  return (
    <Link
      href="/dashboard/settings"
      className="glass rounded-xl p-3 flex items-center gap-3 hover:bg-white/5 transition border border-white/5"
    >
      <div className="h-9 w-9 rounded-lg bg-white/5 flex items-center justify-center shrink-0">
        <Icon className="h-4 w-4 text-cyan-300" />
      </div>
      <div className="flex-1 min-w-0">
        <p className="text-sm text-white font-medium">{title}</p>
        <p className="text-[11px] text-ink-400">{sub}</p>
      </div>
      <ArrowRight className="h-4 w-4 text-ink-300 shrink-0" />
    </Link>
  );
}
