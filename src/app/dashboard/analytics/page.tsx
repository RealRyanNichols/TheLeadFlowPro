import type { Metadata } from "next";
import type { ReactNode } from "react";
import { Activity, BarChart3, MousePointerClick, ShieldCheck } from "lucide-react";
import { getLeadFlowFunnelSummary } from "@/lib/analytics";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Funnel Analytics | The LeadFlow Pro",
  description: "Internal privacy-safe funnel analytics for marketplace, tools, buyer portal, source intake, and exports.",
  robots: {
    index: false,
    follow: false,
  },
};

function dateLabel(value: string) {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  return new Intl.DateTimeFormat("en", {
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
  }).format(date);
}

export default async function DashboardAnalyticsPage() {
  const summary = await getLeadFlowFunnelSummary(30);

  return (
    <div className="mx-auto max-w-[1500px] space-y-6">
      <section className="rounded-2xl border border-white/10 bg-[radial-gradient(circle_at_16%_12%,rgba(35,184,255,0.16),transparent_28%),linear-gradient(135deg,#07101b,#050711)] p-5 shadow-2xl shadow-black/30 md:p-7">
        <div className="flex flex-col gap-5 xl:flex-row xl:items-end xl:justify-between">
          <div>
            <p className="text-xs font-extrabold uppercase tracking-wider text-cyan-300">Privacy-safe funnel</p>
            <h1 className="mt-3 max-w-5xl text-4xl font-black leading-tight text-white md:text-6xl">
              See what is moving without leaking raw data.
            </h1>
            <p className="mt-4 max-w-4xl text-sm leading-6 text-ink-200 md:text-base md:leading-7">
              These counts come from sanitized event names, IDs, categories, statuses, routes, score ranges, and CTA labels only. No raw names, emails, phones, addresses, answers, notes, or sensitive fields are used here.
            </p>
          </div>
          <div className="rounded-lg border border-cyan-300/25 bg-cyan-300/10 p-3 text-xs font-bold leading-5 text-cyan-100">
            Last {summary.rangeDays} days | {summary.mode === "live" ? "Supabase events" : "offline"}
          </div>
        </div>
        {summary.loadErrors.length ? (
          <div className="mt-5 rounded-lg border border-accent-300/30 bg-accent-300/10 p-3 text-sm leading-6 text-accent-100">
            {summary.loadErrors[0]}
          </div>
        ) : null}
      </section>

      <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-5">
        {summary.metrics.map((metric) => (
          <div key={metric.key} className="rounded-xl border border-white/10 bg-[#060a11]/92 p-4 shadow-2xl shadow-black/20">
            <p className="text-xs font-extrabold uppercase tracking-wider text-ink-400">{metric.label}</p>
            <p className="mt-3 text-4xl font-black text-white">{metric.count.toLocaleString()}</p>
            <p className="mt-3 text-xs leading-5 text-ink-400">{metric.eventNames.join(", ")}</p>
          </div>
        ))}
      </section>

      <section className="grid gap-5 xl:grid-cols-3">
        <RankPanel
          title="Top routes"
          icon={<Activity className="h-5 w-5 text-cyan-300" />}
          rows={summary.topRoutes.map((row) => ({ label: row.route, count: row.count }))}
        />
        <RankPanel
          title="Top verticals"
          icon={<BarChart3 className="h-5 w-5 text-lead-300" />}
          rows={summary.topVerticals.map((row) => ({ label: row.vertical, count: row.count }))}
        />
        <RankPanel
          title="Top CTAs"
          icon={<MousePointerClick className="h-5 w-5 text-accent-300" />}
          rows={summary.topCtas.map((row) => ({ label: row.cta, count: row.count }))}
        />
      </section>

      <section className="rounded-xl border border-white/10 bg-[#060a11]/92 p-5 shadow-2xl shadow-black/25">
        <div className="flex items-center justify-between gap-3">
          <div>
            <p className="text-xs font-extrabold uppercase tracking-wider text-cyan-300">Recent safe events</p>
            <h2 className="mt-2 text-2xl font-black text-white">Latest funnel activity.</h2>
          </div>
          <ShieldCheck className="h-5 w-5 text-cyan-300" />
        </div>
        <div className="mt-5 overflow-x-auto rounded-lg border border-white/10">
          <table className="min-w-full divide-y divide-white/10 text-left text-sm">
            <thead>
              <tr>
                {["Event", "Route", "Vertical", "Role", "Created"].map((header) => (
                  <th key={header} className="whitespace-nowrap bg-white/[0.035] px-3 py-3 text-xs font-extrabold uppercase tracking-wider text-ink-400">{header}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {summary.recentEvents.length ? summary.recentEvents.map((event) => (
                <tr key={event.id}>
                  <td className="border-t border-white/10 px-3 py-3 font-mono text-xs text-cyan-100">{event.event_name}</td>
                  <td className="border-t border-white/10 px-3 py-3 text-ink-200">{event.route || event.source_path || "unknown"}</td>
                  <td className="border-t border-white/10 px-3 py-3 text-ink-200">{event.vertical || event.category || "none"}</td>
                  <td className="border-t border-white/10 px-3 py-3 text-ink-200">{event.user_role || "anonymous"}</td>
                  <td className="border-t border-white/10 px-3 py-3 text-ink-300">{dateLabel(event.created_at)}</td>
                </tr>
              )) : (
                <tr>
                  <td colSpan={5} className="border-t border-white/10 px-3 py-8 text-center text-sm text-ink-300">
                    No safe funnel events loaded yet.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </section>
    </div>
  );
}

function RankPanel({
  title,
  icon,
  rows,
}: {
  title: string;
  icon: ReactNode;
  rows: Array<{ label: string; count: number }>;
}) {
  return (
    <div className="rounded-xl border border-white/10 bg-[#060a11]/92 p-5 shadow-2xl shadow-black/20">
      <div className="flex items-center justify-between gap-3">
        <h2 className="text-xl font-black text-white">{title}</h2>
        {icon}
      </div>
      <div className="mt-4 space-y-2">
        {rows.length ? rows.map((row) => (
          <div key={row.label} className="flex items-center justify-between gap-3 rounded-lg border border-white/10 bg-white/[0.035] px-3 py-2">
            <span className="truncate text-sm font-semibold text-ink-100">{row.label}</span>
            <span className="font-mono text-sm font-black text-white">{row.count}</span>
          </div>
        )) : (
          <p className="rounded-lg border border-white/10 bg-white/[0.025] p-4 text-sm leading-6 text-ink-300">
            No rows yet.
          </p>
        )}
      </div>
    </div>
  );
}
