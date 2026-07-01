"use client";

import Link from "next/link";
import { useEffect } from "react";
import {
  AlertTriangle,
  ArrowRight,
  BarChart3,
  CheckCircle2,
  DollarSign,
  Filter,
  Gauge,
  MousePointerClick,
  ShieldCheck,
  Signal,
  Table2,
  Target,
} from "lucide-react";
import type { LeadFlowOpsData, OpsComplianceWatch, OpsMetric } from "@/lib/leadflow-ops";
import { trackLeadFlowEvent } from "@/lib/leadflow-events-client";
import { cn } from "@/lib/utils";

export function OpsDashboardClient({ data }: { data: LeadFlowOpsData }) {
  useEffect(() => {
    trackLeadFlowEvent("ops_dashboard_viewed", {
      route: "/dashboard/ops",
      range: data.filters.range,
      vertical: data.filters.vertical || "all",
      category: data.filters.category || "all",
      source_type: data.filters.sourceType || "all",
      user_role: "admin",
    });
  }, [data.filters.category, data.filters.range, data.filters.sourceType, data.filters.vertical]);

  return (
    <div className="mx-auto max-w-[1580px] space-y-6">
      <section className="overflow-hidden rounded-2xl border border-white/10 bg-[radial-gradient(circle_at_12%_10%,rgba(35,184,255,0.16),transparent_28%),radial-gradient(circle_at_85%_8%,rgba(255,186,61,0.13),transparent_24%),linear-gradient(135deg,#07101b,#050711)] p-5 shadow-2xl shadow-black/30 md:p-7">
        <div className="grid gap-6 xl:grid-cols-[minmax(0,1fr)_420px] xl:items-end">
          <div>
            <p className="inline-flex items-center gap-2 rounded-lg border border-cyan-300/25 bg-cyan-300/10 px-3 py-1 text-xs font-extrabold uppercase tracking-wider text-cyan-200">
              <Gauge className="h-4 w-4" />
              LeadFlow Operating Dashboard
            </p>
            <h1 className="mt-4 max-w-5xl text-4xl font-black leading-tight text-white md:text-6xl">
              See if the lead signal machine is actually working.
            </h1>
            <p className="mt-4 max-w-4xl text-sm leading-6 text-ink-200 md:text-base md:leading-7">
              Traffic, tools, buyer demand, source supply, marketplace movement, revenue, exports, and compliance problems in one operator view. No raw answers, contact fields, hidden notes, or sensitive data are shown here.
            </p>
            <div className="mt-5 flex flex-wrap items-center gap-2">
              <ModePill label={data.mode === "live" ? "Live Supabase data" : "Safe fallback mode"} tone={data.mode === "live" ? "good" : "warning"} />
              <ModePill label={data.rangeLabel} />
              <ModePill label={`${shortDateTime(data.startedAt)} to ${shortDateTime(data.endedAt)}`} />
            </div>
          </div>
          <OpsFilterPanel data={data} />
        </div>
        {data.loadErrors.length ? (
          <div className="mt-5 rounded-lg border border-accent-300/30 bg-accent-300/10 p-3 text-sm leading-6 text-accent-100">
            {data.loadErrors[0]}
          </div>
        ) : null}
      </section>

      <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-5">
        {data.today.map((metric) => <MetricCard key={metric.key} metric={metric} />)}
      </section>

      <section className="grid gap-5 xl:grid-cols-[minmax(0,1fr)_420px]">
        <Panel title="Funnel" eyebrow="Decision path" icon={MousePointerClick}>
          <div className="space-y-3">
            {data.funnel.map((step, index) => {
              const previous = index > 0 ? data.funnel[index - 1]?.count || 0 : step.count;
              const rate = index > 0 ? percent(step.count, previous) : 100;
              return (
                <div key={step.key} className="rounded-lg border border-white/10 bg-white/[0.035] p-3">
                  <div className="flex items-center justify-between gap-3">
                    <p className="text-sm font-bold text-white">{step.label}</p>
                    <p className="font-mono text-lg font-black text-white">{step.count.toLocaleString()}</p>
                  </div>
                  <div className="mt-3 h-2 overflow-hidden rounded-full bg-white/5">
                    <div className="h-full rounded-full bg-gradient-to-r from-cyan-300 to-accent-300" style={{ width: `${Math.max(3, Math.min(100, rate))}%` }} />
                  </div>
                  <p className="mt-2 text-[11px] font-bold uppercase tracking-wider text-ink-500">{index === 0 ? "Top of funnel" : `${rate}% of previous step`}</p>
                </div>
              );
            })}
          </div>
        </Panel>

        <Panel title="Decision Links" eyebrow="What to open next" icon={Target}>
          <div className="grid gap-3">
            {data.actions.map((action) => (
              <Link
                key={action.href}
                href={action.href}
                onClick={() => trackLeadFlowEvent("ops_action_clicked", { route: "/dashboard/ops", cta: action.eventKey, user_role: "admin" })}
                className="group rounded-lg border border-white/10 bg-white/[0.035] p-4 transition hover:border-cyan-300/40 hover:bg-cyan-300/10"
              >
                <div className="flex items-start justify-between gap-4">
                  <div>
                    <p className="font-black text-white">{action.label}</p>
                    <p className="mt-2 text-sm leading-5 text-ink-300">{action.note}</p>
                  </div>
                  <ArrowRight className="mt-1 h-4 w-4 shrink-0 text-cyan-300 transition group-hover:translate-x-0.5" />
                </div>
              </Link>
            ))}
          </div>
        </Panel>
      </section>

      <section className="grid gap-5 xl:grid-cols-2">
        <Panel title="Tools Performance" eyebrow="Are people using the intake tools?" icon={Table2}>
          <ResponsiveTable
            headers={["Tool", "Views", "Starts", "Done", "Rate", "Avg score", "Profiles", "Top tags"]}
            empty="No tool events or responses loaded for this filter."
            rows={data.tools.map((tool) => [
              <CellTitle key="tool" title={tool.toolName} sub={tool.toolSlug} />,
              tool.views.toLocaleString(),
              tool.starts.toLocaleString(),
              tool.completions.toLocaleString(),
              `${tool.completionRate}%`,
              tool.averageScore === null ? "n/a" : tool.averageScore.toString(),
              tool.profilesCreated.toLocaleString(),
              <TagList key="tags" tags={tool.topTags} />,
            ])}
          />
        </Panel>

        <Panel title="Marketplace Performance" eyebrow="Are listings creating demand?" icon={Signal}>
          <ResponsiveTable
            headers={["Listing", "Views", "Samples", "Access", "Paid", "Orders", "Exports", "Matches"]}
            empty="No marketplace performance rows loaded for this filter."
            rows={data.marketplace.map((listing) => [
              <CellTitle key="listing" title={listing.title} sub={listing.vertical} />,
              listing.views.toLocaleString(),
              listing.sampleRequests.toLocaleString(),
              listing.accessRequests.toLocaleString(),
              listing.paidSamples.toLocaleString(),
              listing.orders.toLocaleString(),
              listing.exports.toLocaleString(),
              listing.buyerMatchCount.toLocaleString(),
            ])}
          />
        </Panel>
      </section>

      <section className="grid gap-5 xl:grid-cols-3">
        <Panel title="Buyer Demand" eyebrow="What buyers are asking for" icon={BarChart3}>
          <RankBlock title="Industries" rows={data.buyerDemand.industries} />
          <RankBlock title="Geographies" rows={data.buyerDemand.geographies} />
          <RankBlock title="Buyer types" rows={data.buyerDemand.buyerTypes} />
          <RankBlock title="Budget ranges" rows={data.buyerDemand.budgetRanges} />
          <div className="mt-4 grid gap-3 md:grid-cols-2">
            <MiniStat label="Custom sourcing" value={data.buyerDemand.customSourcingRequests} />
            <MiniStat label="Unmatched demand" value={data.buyerDemand.unmatchedDemand} tone={data.buyerDemand.unmatchedDemand ? "warning" : "good"} />
          </div>
        </Panel>

        <Panel title="Source Supply" eyebrow="Can we create products?" icon={CheckCircle2}>
          <div className="grid gap-3">
            {data.sourceSupply.map((metric) => <MetricMiniCard key={metric.key} metric={metric} />)}
          </div>
        </Panel>

        <Panel title="Compliance Watch" eyebrow="What could block release?" icon={ShieldCheck}>
          <div className="grid gap-3">
            {data.compliance.map((item) => <ComplianceCard key={item.label} item={item} />)}
          </div>
        </Panel>
      </section>

      <section className="grid gap-5 xl:grid-cols-[minmax(0,1fr)_420px]">
        <Panel title="Revenue Summary" eyebrow="Only real product movement matters" icon={DollarSign}>
          <ResponsiveTable
            headers={["Revenue line", "Count", "Amount"]}
            empty="No order or partner earning rows loaded for this filter."
            rows={data.revenue.map((row) => [
              row.label,
              row.count.toLocaleString(),
              formatMoney(row.amount),
            ])}
          />
        </Panel>

        <div className="rounded-xl border border-white/10 bg-[#060a11]/92 p-5 shadow-2xl shadow-black/25">
          <div className="flex items-start justify-between gap-4">
            <div>
              <p className="text-xs font-extrabold uppercase tracking-wider text-cyan-300">Operator rule</p>
              <h2 className="mt-2 text-2xl font-black text-white">Do not chase vanity traffic.</h2>
            </div>
            <AlertTriangle className="h-5 w-5 text-accent-300" />
          </div>
          <div className="mt-4 space-y-3 text-sm leading-6 text-ink-300">
            <p>Useful movement means tool completions, source submissions, buyer requests, paid samples, approved listings, clean exports, and repeat demand by vertical.</p>
            <p>Compliance problems are product problems. Suppression, missing proof, unclear allowed use, and civic review items block release until they are handled.</p>
          </div>
        </div>
      </section>
    </div>
  );
}

function OpsFilterPanel({ data }: { data: LeadFlowOpsData }) {
  return (
    <form action="/dashboard/ops" className="rounded-xl border border-white/10 bg-white/[0.045] p-4">
      <div className="flex items-center gap-2 text-xs font-extrabold uppercase tracking-wider text-cyan-200">
        <Filter className="h-4 w-4" />
        Filters
      </div>
      <div className="mt-4 grid gap-3 sm:grid-cols-2">
        <label className="grid gap-1.5">
          <span className="text-xs font-bold text-ink-300">Range</span>
          <select
            name="range"
            defaultValue={data.filters.range}
            onChange={(event) => trackLeadFlowEvent("ops_date_range_changed", { route: "/dashboard/ops", range: event.target.value, user_role: "admin" })}
            className="min-h-11 rounded-lg border border-white/10 bg-ink-950 px-3 text-sm text-white outline-none focus:border-cyan-300/50"
          >
            <option value="today">Today</option>
            <option value="7d">Last 7 days</option>
            <option value="30d">Last 30 days</option>
            <option value="month">This month</option>
            <option value="custom">Custom</option>
          </select>
        </label>
        <label className="grid gap-1.5">
          <span className="text-xs font-bold text-ink-300">Vertical</span>
          <input
            name="vertical"
            defaultValue={data.filters.vertical || ""}
            placeholder="all"
            onBlur={(event) => trackLeadFlowEvent("ops_vertical_filter_changed", { route: "/dashboard/ops", vertical: event.target.value || "all", user_role: "admin" })}
            className="min-h-11 rounded-lg border border-white/10 bg-ink-950 px-3 text-sm text-white outline-none placeholder:text-ink-600 focus:border-cyan-300/50"
          />
        </label>
        <label className="grid gap-1.5">
          <span className="text-xs font-bold text-ink-300">Category</span>
          <input
            name="category"
            defaultValue={data.filters.category || ""}
            placeholder="all"
            className="min-h-11 rounded-lg border border-white/10 bg-ink-950 px-3 text-sm text-white outline-none placeholder:text-ink-600 focus:border-cyan-300/50"
          />
        </label>
        <label className="grid gap-1.5">
          <span className="text-xs font-bold text-ink-300">Source type</span>
          <input
            name="source_type"
            defaultValue={data.filters.sourceType || ""}
            placeholder="all"
            className="min-h-11 rounded-lg border border-white/10 bg-ink-950 px-3 text-sm text-white outline-none placeholder:text-ink-600 focus:border-cyan-300/50"
          />
        </label>
        <label className="grid gap-1.5">
          <span className="text-xs font-bold text-ink-300">Start</span>
          <input
            type="date"
            name="start"
            defaultValue={dateInput(data.filters.start)}
            className="min-h-11 rounded-lg border border-white/10 bg-ink-950 px-3 text-sm text-white outline-none focus:border-cyan-300/50"
          />
        </label>
        <label className="grid gap-1.5">
          <span className="text-xs font-bold text-ink-300">End</span>
          <input
            type="date"
            name="end"
            defaultValue={dateInput(data.filters.end)}
            className="min-h-11 rounded-lg border border-white/10 bg-ink-950 px-3 text-sm text-white outline-none focus:border-cyan-300/50"
          />
        </label>
      </div>
      <div className="mt-4 flex flex-wrap gap-2">
        <button className="btn-accent min-h-11 justify-center text-sm" type="submit">
          Apply filters
        </button>
        <Link href="/dashboard/ops" className="btn-ghost min-h-11 justify-center text-sm">
          Reset
        </Link>
      </div>
    </form>
  );
}

function Panel({
  title,
  eyebrow,
  icon: Icon,
  children,
}: {
  title: string;
  eyebrow: string;
  icon: typeof Gauge;
  children: React.ReactNode;
}) {
  return (
    <section className="rounded-xl border border-white/10 bg-[#060a11]/92 p-5 shadow-2xl shadow-black/25">
      <div className="mb-5 flex items-start justify-between gap-4">
        <div>
          <p className="text-xs font-extrabold uppercase tracking-wider text-cyan-300">{eyebrow}</p>
          <h2 className="mt-2 text-2xl font-black text-white">{title}</h2>
        </div>
        <Icon className="h-5 w-5 shrink-0 text-cyan-300" />
      </div>
      {children}
    </section>
  );
}

function MetricCard({ metric }: { metric: OpsMetric }) {
  return (
    <Link
      href={metric.href || "/dashboard/ops"}
      onClick={() => trackLeadFlowEvent("ops_action_clicked", { route: "/dashboard/ops", cta: metric.key, user_role: "admin" })}
      className={cn(
        "rounded-xl border bg-[#060a11]/92 p-4 shadow-2xl shadow-black/20 transition hover:-translate-y-0.5 hover:bg-white/[0.055]",
        toneClass(metric.tone),
      )}
    >
      <p className="text-xs font-extrabold uppercase tracking-wider text-ink-400">{metric.label}</p>
      <p className="mt-3 text-4xl font-black text-white">{metric.value.toLocaleString()}</p>
      <p className="mt-3 text-xs leading-5 text-ink-400">{metric.hint}</p>
    </Link>
  );
}

function MetricMiniCard({ metric }: { metric: OpsMetric }) {
  return (
    <Link href={metric.href || "/dashboard/ops"} className={cn("rounded-lg border p-3", toneClass(metric.tone))}>
      <div className="flex items-center justify-between gap-3">
        <p className="text-sm font-bold text-white">{metric.label}</p>
        <p className="font-mono text-lg font-black text-white">{metric.value.toLocaleString()}</p>
      </div>
      <p className="mt-2 text-xs leading-5 text-ink-400">{metric.hint}</p>
    </Link>
  );
}

function ComplianceCard({ item }: { item: OpsComplianceWatch }) {
  const tone = item.severity === "high" ? "border-red-300/35 bg-red-300/10" : item.severity === "medium" ? "border-accent-300/35 bg-accent-300/10" : "border-lead-300/25 bg-lead-300/8";
  return (
    <Link href={item.href} className={`rounded-lg border p-3 ${tone}`}>
      <div className="flex items-start justify-between gap-3">
        <p className="text-sm font-bold text-white">{item.label}</p>
        <p className="font-mono text-lg font-black text-white">{item.count}</p>
      </div>
      <p className="mt-2 text-xs leading-5 text-ink-300">{item.note}</p>
    </Link>
  );
}

function ResponsiveTable({
  headers,
  rows,
  empty,
}: {
  headers: string[];
  rows: Array<Array<React.ReactNode>>;
  empty: string;
}) {
  return (
    <div className="overflow-x-auto rounded-lg border border-white/10">
      <table className="min-w-full divide-y divide-white/10 text-left text-sm">
        <thead>
          <tr>
            {headers.map((header) => (
              <th key={header} className="whitespace-nowrap bg-white/[0.035] px-3 py-3 text-xs font-extrabold uppercase tracking-wider text-ink-400">
                {header}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {rows.length ? rows.map((row, rowIndex) => (
            <tr key={`row-${rowIndex}`}>
              {row.map((cell, cellIndex) => (
                <td key={`cell-${cellIndex}`} className="border-t border-white/10 px-3 py-3 text-ink-200">
                  {cell}
                </td>
              ))}
            </tr>
          )) : (
            <tr>
              <td colSpan={headers.length} className="border-t border-white/10 px-3 py-8 text-center text-sm text-ink-300">
                {empty}
              </td>
            </tr>
          )}
        </tbody>
      </table>
    </div>
  );
}

function CellTitle({ title, sub }: { title: string; sub: string }) {
  return (
    <div>
      <p className="max-w-[260px] truncate font-bold text-white">{title}</p>
      <p className="mt-1 max-w-[260px] truncate text-xs text-ink-500">{sub}</p>
    </div>
  );
}

function TagList({ tags }: { tags: string[] }) {
  if (!tags.length) return <span className="text-xs text-ink-500">none</span>;
  return (
    <div className="flex min-w-40 flex-wrap gap-1.5">
      {tags.slice(0, 3).map((tag) => (
        <span key={tag} className="rounded-md border border-white/10 bg-white/[0.04] px-2 py-1 text-[11px] font-bold text-ink-200">
          {tag.replace(/_/g, " ")}
        </span>
      ))}
    </div>
  );
}

function RankBlock({ title, rows }: { title: string; rows: Array<{ label: string; count: number }> }) {
  return (
    <div className="mt-4 first:mt-0">
      <h3 className="text-xs font-extrabold uppercase tracking-wider text-ink-400">{title}</h3>
      <div className="mt-2 space-y-2">
        {rows.length ? rows.map((row) => (
          <div key={row.label} className="flex items-center justify-between gap-3 rounded-lg border border-white/10 bg-white/[0.035] px-3 py-2">
            <span className="truncate text-sm font-semibold text-ink-100">{row.label}</span>
            <span className="font-mono text-sm font-black text-white">{row.count}</span>
          </div>
        )) : (
          <p className="rounded-lg border border-white/10 bg-white/[0.025] p-3 text-sm text-ink-400">No rows loaded.</p>
        )}
      </div>
    </div>
  );
}

function MiniStat({ label, value, tone = "neutral" }: { label: string; value: number; tone?: "neutral" | "good" | "warning" }) {
  return (
    <div className={cn("rounded-lg border p-3", toneClass(tone))}>
      <p className="text-xs font-extrabold uppercase tracking-wider text-ink-400">{label}</p>
      <p className="mt-2 text-2xl font-black text-white">{value.toLocaleString()}</p>
    </div>
  );
}

function ModePill({ label, tone = "neutral" }: { label: string; tone?: "neutral" | "good" | "warning" }) {
  return (
    <span className={cn("rounded-lg border px-3 py-1.5 text-xs font-extrabold uppercase tracking-wider", toneClass(tone))}>
      {label}
    </span>
  );
}

function toneClass(tone: OpsMetric["tone"] | "good" = "neutral") {
  if (tone === "good") return "border-lead-300/25 bg-lead-300/8 text-lead-100";
  if (tone === "warning") return "border-accent-300/30 bg-accent-300/10 text-accent-100";
  if (tone === "danger") return "border-red-300/35 bg-red-300/10 text-red-100";
  if (tone === "premium") return "border-fuchsia-300/30 bg-fuchsia-300/10 text-fuchsia-100";
  return "border-white/10 bg-white/[0.035] text-ink-100";
}

function percent(value: number, total: number) {
  return total > 0 ? Math.round((value / total) * 100) : 0;
}

function shortDateTime(value: string) {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  return new Intl.DateTimeFormat("en-US", { month: "short", day: "numeric", hour: "numeric", minute: "2-digit" }).format(date);
}

function dateInput(value: string | undefined) {
  if (!value) return "";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "";
  return date.toISOString().slice(0, 10);
}

function formatMoney(amount: number) {
  return new Intl.NumberFormat("en-US", { style: "currency", currency: "USD", maximumFractionDigits: 2 }).format(amount);
}
