import { redirect } from "next/navigation";
import { StatCard } from "@/components/dashboard/StatCard";
import { NextMoveCard } from "@/components/dashboard/NextMoveCard";
import { LeadsChart } from "@/components/dashboard/LeadsChart";
import { MOCK_KPIS, MOCK_NEXT_MOVES, MOCK_LEADS } from "@/lib/mock-data";
import { formatCurrency, formatPercent, relativeTime } from "@/lib/utils";
import { currentUser } from "@/lib/auth";
import Link from "next/link";
import { ArrowRight } from "lucide-react";

export const dynamic = "force-dynamic";

export default async function DashboardOverview() {
  const user = await currentUser();
  if (!user) redirect("/login?callbackUrl=/dashboard");

  // Brand-new accounts land in onboarding until they've at least filled in
  // their business name. Otherwise the dashboard is just mock data in a
  // vacuum — no context, no personalization, nothing actionable.
  if (!user.businessName) redirect("/dashboard/onboarding");

  const greetingName = user.name?.split(" ")[0] || "there";

  return (
    <div className="space-y-8 max-w-7xl mx-auto">
      {/* greeting */}
      <div>
        <p className="text-cyan-400 text-sm font-semibold">
          Welcome back, {greetingName}
        </p>
        <h1 className="mt-1 text-3xl font-extrabold text-white">
          Here's the data —{" "}
          <span className="funnel-text">and your next moves</span>
        </h1>
      </div>

      {/* KPIs */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard label="Leads this month" value={MOCK_KPIS.newLeadsThisMonth.toString()} delta={22.4} highlight />
        <StatCard label="Cost per lead"    value={formatCurrency(MOCK_KPIS.costPerLead)} delta={-8.2} />
        <StatCard label="Ad spend (MTD)"   value={formatCurrency(MOCK_KPIS.adSpend)} sub="$382.88 across Meta + Google" />
        <StatCard label="Conversion rate"  value={formatPercent(MOCK_KPIS.conversionRate * 100)} delta={3.1} />
      </div>

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
          <div className="grid gap-4">
            {MOCK_NEXT_MOVES.map((m) => <NextMoveCard key={m.id} move={m} />)}
          </div>
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
          </div>
        </div>
      </div>
    </div>
  );
}
