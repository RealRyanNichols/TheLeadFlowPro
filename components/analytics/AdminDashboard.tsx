"use client";

// The /admin/analytics command center. One client component owns the filter
// state; every tab reads through the admin_analytics_* RPCs (SECURITY DEFINER,
// is_admin-gated) with the signed-in admin's own session — there is no
// separate analytics API surface to secure.

import { useCallback, useEffect, useMemo, useState } from "react";
import { RefreshCw } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import {
  compactNumber,
  positionTrend,
  publicPageLabel,
  relativeTime,
  trend,
} from "@/lib/analytics/shared";
import MetricCard from "./MetricCard";
import { AreaChart, BarList, EmptyChart, FunnelChart } from "./charts";

// Validated light-surface categorical order (see docs/leadflow-web-analytics-plan.md).
const C = {
  blue: "#1240e8",
  cyan: "#0e6f96",
  green: "#146c34",
  violet: "#6d28d9",
};

type Json = Record<string, any>;

const RANGES = [
  { key: "live", label: "Live" },
  { key: "today", label: "Today" },
  { key: "yesterday", label: "Yesterday" },
  { key: "7d", label: "7 days" },
  { key: "30d", label: "30 days" },
  { key: "90d", label: "90 days" },
  { key: "custom", label: "Custom" },
] as const;

type RangeKey = (typeof RANGES)[number]["key"];

const TABS = [
  "Overview",
  "Live",
  "Acquisition",
  "Behavior",
  "Pages",
  "Tools",
  "Funnel",
  "SEO & Index",
  "Health",
] as const;

type Tab = (typeof TABS)[number];

type Filters = {
  path?: string;
  source?: string;
  campaign?: string;
  device?: string;
  visitor_type?: string;
  include_internal?: boolean;
};

function startOfDay(d: Date): Date {
  const c = new Date(d);
  c.setHours(0, 0, 0, 0);
  return c;
}

function rangeDates(key: RangeKey, customFrom: string, customTo: string) {
  const now = new Date();
  const today = startOfDay(now);
  const day = 86400e3;
  switch (key) {
    case "live": {
      const from = new Date(now.getTime() - 3600e3);
      return { from, to: now, prevFrom: new Date(now.getTime() - 2 * 3600e3), prevTo: from, bucket: "hour" };
    }
    case "today":
      return {
        from: today,
        to: now,
        prevFrom: new Date(today.getTime() - day),
        prevTo: new Date(now.getTime() - day),
        bucket: "hour",
      };
    case "yesterday":
      return {
        from: new Date(today.getTime() - day),
        to: today,
        prevFrom: new Date(today.getTime() - 2 * day),
        prevTo: new Date(today.getTime() - day),
        bucket: "hour",
      };
    case "7d":
      return {
        from: new Date(now.getTime() - 7 * day),
        to: now,
        prevFrom: new Date(now.getTime() - 14 * day),
        prevTo: new Date(now.getTime() - 7 * day),
        bucket: "day",
      };
    case "90d":
      return {
        from: new Date(now.getTime() - 90 * day),
        to: now,
        prevFrom: new Date(now.getTime() - 180 * day),
        prevTo: new Date(now.getTime() - 90 * day),
        bucket: "day",
      };
    case "custom": {
      const from = customFrom ? new Date(`${customFrom}T00:00:00`) : new Date(now.getTime() - 30 * day);
      const toBase = customTo ? new Date(`${customTo}T00:00:00`) : now;
      const to = new Date(Math.min(toBase.getTime() + day, now.getTime()));
      const span = Math.max(day, to.getTime() - from.getTime());
      return {
        from,
        to,
        prevFrom: new Date(from.getTime() - span),
        prevTo: from,
        bucket: span > 3 * day ? "day" : "hour",
      };
    }
    case "30d":
    default:
      return {
        from: new Date(now.getTime() - 30 * day),
        to: now,
        prevFrom: new Date(now.getTime() - 60 * day),
        prevTo: new Date(now.getTime() - 30 * day),
        bucket: "day",
      };
  }
}

function fmtDuration(s: number): string {
  if (!Number.isFinite(s) || s <= 0) return "0s";
  if (s < 60) return `${Math.round(s)}s`;
  return `${Math.floor(s / 60)}m ${Math.round(s % 60)}s`;
}

function fmtPct(v: number): string {
  return `${(v * 100).toFixed(1)}%`;
}

const EVENT_LABELS: Record<string, string> = {
  page_view: "Viewed a page",
  session_start: "New session",
  engaged_session: "Became engaged",
  page_engagement: "Time on page",
  scroll_depth: "Scrolled",
  navigation_click: "Navigation click",
  cta_click: "Clicked a CTA",
  outbound_click: "Outbound click",
  phone_click: "Clicked to call",
  sms_click: "Clicked to text",
  email_click: "Clicked to email",
  form_view: "Saw a form",
  form_start: "Started a form",
  form_submit: "Submitted a form",
  booking_start: "Opened the calendar",
  booking_complete: "Booked a consultation",
  tool_view: "Viewed a tool",
  tool_card_open: "Opened a tool card",
  tool_start: "Started a tool",
  tool_complete: "Completed a tool",
  tool_action: "Used a tool result",
  download: "Downloaded a result",
  lead_created: "Lead captured",
};

export default function AdminDashboard() {
  const supabase = useMemo(() => createClient(), []);
  const [tab, setTab] = useState<Tab>("Overview");
  const [rangeKey, setRangeKey] = useState<RangeKey>("30d");
  const [customFrom, setCustomFrom] = useState("");
  const [customTo, setCustomTo] = useState("");
  const [filters, setFilters] = useState<Filters>({});
  const [filterOptions, setFilterOptions] = useState<Json | null>(null);
  const [data, setData] = useState<Record<string, Json | Json[] | null>>({});
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [lastUpdated, setLastUpdated] = useState<Date | null>(null);
  const [pageDetail, setPageDetail] = useState<{ path: string; data: Json | null } | null>(null);

  const dates = useMemo(
    () => rangeDates(rangeKey, customFrom, customTo),
    [rangeKey, customFrom, customTo]
  );

  const rpcFilters = useMemo(() => {
    const f: Json = {};
    if (filters.path) f.path = filters.path;
    if (filters.source) f.source = filters.source;
    if (filters.campaign) f.campaign = filters.campaign;
    if (filters.device) f.device = filters.device;
    if (filters.visitor_type) f.visitor_type = filters.visitor_type;
    if (filters.include_internal) f.include_internal = true;
    return f;
  }, [filters]);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    const args = {
      p_from: dates.from.toISOString(),
      p_to: dates.to.toISOString(),
    };
    const cmpArgs = {
      ...args,
      p_prev_from: dates.prevFrom.toISOString(),
      p_prev_to: dates.prevTo.toISOString(),
    };
    try {
      const jobs: Array<Promise<void>> = [];
      const merge = (key: string, promise: PromiseLike<{ data: any; error: any }>) =>
        jobs.push(
          Promise.resolve(promise).then(({ data: d, error: e }) => {
            if (e) throw new Error(e.message);
            setData((prev) => ({ ...prev, [key]: d }));
          })
        );

      if (tab === "Overview") {
        merge("overview", supabase.rpc("admin_analytics_overview", { ...cmpArgs, p_filters: rpcFilters }));
        merge("timeseries", supabase.rpc("admin_analytics_timeseries", {
          ...args,
          p_bucket: dates.bucket,
          p_tz: Intl.DateTimeFormat().resolvedOptions().timeZone || "America/Chicago",
          p_filters: rpcFilters,
        }));
      } else if (tab === "Live") {
        merge("live", supabase.rpc("admin_analytics_live", { p_limit: 40 }));
        merge("active", supabase.rpc("admin_analytics_active"));
      } else if (tab === "Acquisition") {
        merge("acquisition", supabase.rpc("admin_analytics_acquisition", { ...args, p_filters: rpcFilters }));
      } else if (tab === "Behavior") {
        merge("behavior", supabase.rpc("admin_analytics_behavior", { ...args, p_filters: rpcFilters }));
      } else if (tab === "Pages") {
        merge("pages", supabase.rpc("admin_analytics_pages", { ...cmpArgs, p_filters: rpcFilters }));
      } else if (tab === "Tools") {
        merge("tools", supabase.rpc("admin_analytics_tools", cmpArgs));
      } else if (tab === "Funnel") {
        merge("funnel", supabase.rpc("admin_analytics_funnel", { ...cmpArgs, p_filters: rpcFilters }));
      } else if (tab === "SEO & Index") {
        merge("seo", supabase.rpc("admin_analytics_seo", { p_days: 28 }));
      } else if (tab === "Health") {
        merge("filters", supabase.rpc("admin_analytics_filters", args));
      }
      await Promise.all(jobs);
      setLastUpdated(new Date());
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not load analytics.");
    } finally {
      setLoading(false);
    }
  }, [supabase, tab, dates, rpcFilters]);

  useEffect(() => {
    load();
  }, [load]);

  // Live tab and Live range refresh themselves.
  useEffect(() => {
    if (tab !== "Live" && rangeKey !== "live") return;
    const t = setInterval(load, 15000);
    return () => clearInterval(t);
  }, [tab, rangeKey, load]);

  // Filter dropdown options track the date range.
  useEffect(() => {
    supabase
      .rpc("admin_analytics_filters", {
        p_from: dates.from.toISOString(),
        p_to: dates.to.toISOString(),
      })
      .then(({ data: d }) => {
        if (d) setFilterOptions(d as Json);
      });
  }, [supabase, dates]);

  async function openPageDetail(path: string) {
    setPageDetail({ path, data: null });
    const { data: d } = await supabase.rpc("admin_analytics_page_detail", {
      p_path: path,
      p_from: dates.from.toISOString(),
      p_to: dates.to.toISOString(),
    });
    setPageDetail({ path, data: (d as Json) ?? {} });
  }

  const overview = data.overview as Json | null;
  const cur = overview?.current as Json | undefined;
  const prev = overview?.previous as Json | undefined;

  return (
    <div>
      {/* ---- Filter bar ---- */}
      <div className="mb-5 space-y-3">
        <div className="flex flex-wrap items-center gap-1.5" role="tablist" aria-label="Date range">
          {RANGES.map((r) => (
            <button
              key={r.key}
              onClick={() => setRangeKey(r.key)}
              className={`rounded-full border px-3 py-1.5 text-xs font-bold transition ${
                rangeKey === r.key
                  ? "border-[var(--blue)] bg-[var(--blue)] text-white"
                  : "border-[var(--line-strong)] bg-[var(--panel)] text-[var(--text)] hover:border-[var(--blue)]"
              }`}
              aria-pressed={rangeKey === r.key}
            >
              {r.label}
            </button>
          ))}
          {rangeKey === "custom" && (
            <span className="inline-flex items-center gap-1.5 text-xs">
              <label className="sr-only" htmlFor="an-from">From</label>
              <input id="an-from" type="date" className="input !w-auto !px-2 !py-1 text-xs" value={customFrom}
                onChange={(e) => setCustomFrom(e.target.value)} />
              <span aria-hidden="true">→</span>
              <label className="sr-only" htmlFor="an-to">To</label>
              <input id="an-to" type="date" className="input !w-auto !px-2 !py-1 text-xs" value={customTo}
                onChange={(e) => setCustomTo(e.target.value)} />
            </span>
          )}
          <button
            onClick={load}
            className="ml-auto inline-flex items-center gap-1.5 rounded-full border border-[var(--line-strong)] px-3 py-1.5 text-xs font-bold text-[var(--text)] hover:border-[var(--blue)]"
            aria-label="Refresh data"
          >
            <RefreshCw aria-hidden="true" className={`h-3.5 w-3.5 ${loading ? "animate-spin" : ""}`} />
            {lastUpdated ? `Updated ${relativeTime(lastUpdated.toISOString())}` : "Refresh"}
          </button>
        </div>

        <div className="flex flex-wrap items-center gap-2 text-xs">
          <FilterSelect
            label="Page"
            value={filters.path ?? ""}
            onChange={(v) => setFilters((f) => ({ ...f, path: v || undefined }))}
            options={((filterOptions?.paths as string[]) ?? []).map((p) => [p, p])}
            allLabel="All pages"
          />
          <FilterSelect
            label="Source"
            value={filters.source ?? ""}
            onChange={(v) => setFilters((f) => ({ ...f, source: v || undefined }))}
            options={((filterOptions?.sources as string[]) ?? []).map((s) => [s, s])}
            allLabel="All sources"
          />
          <FilterSelect
            label="Campaign"
            value={filters.campaign ?? ""}
            onChange={(v) => setFilters((f) => ({ ...f, campaign: v || undefined }))}
            options={((filterOptions?.campaigns as string[]) ?? []).map((c) => [c, c])}
            allLabel="All campaigns"
          />
          <FilterSelect
            label="Device"
            value={filters.device ?? ""}
            onChange={(v) => setFilters((f) => ({ ...f, device: v || undefined }))}
            options={[
              ["mobile", "Mobile"],
              ["tablet", "Tablet"],
              ["desktop", "Desktop"],
            ]}
            allLabel="All devices"
          />
          <FilterSelect
            label="Visitors"
            value={filters.visitor_type ?? ""}
            onChange={(v) => setFilters((f) => ({ ...f, visitor_type: v || undefined }))}
            options={[
              ["new", "New"],
              ["returning", "Returning"],
            ]}
            allLabel="New + returning"
          />
          <label className="inline-flex cursor-pointer items-center gap-1.5 font-semibold text-[var(--muted)]">
            <input
              type="checkbox"
              checked={!!filters.include_internal}
              onChange={(e) => setFilters((f) => ({ ...f, include_internal: e.target.checked || undefined }))}
            />
            Include my internal traffic
          </label>
        </div>

        <nav className="flex flex-wrap gap-1 border-b border-line" aria-label="Analytics sections">
          {TABS.map((t) => (
            <button
              key={t}
              onClick={() => setTab(t)}
              className={`-mb-px border-b-2 px-3 py-2 text-sm font-bold transition ${
                tab === t
                  ? "border-[var(--blue)] text-[var(--heading)]"
                  : "border-transparent text-[var(--muted)] hover:text-[var(--heading)]"
              }`}
              aria-current={tab === t ? "page" : undefined}
            >
              {t}
            </button>
          ))}
        </nav>
      </div>

      {error && (
        <div className="card mb-4 !border-[var(--danger-line)] !bg-[var(--danger-tint)] text-sm text-[var(--danger)]" role="alert">
          {error}
        </div>
      )}

      {/* ================= OVERVIEW ================= */}
      {tab === "Overview" && (
        <div className="space-y-6">
          {!overview && loading ? (
            <CardSkeleton rows={3} />
          ) : overview && cur && prev ? (
            <>
              <div className="grid grid-cols-2 gap-3 md:grid-cols-3 xl:grid-cols-4">
                <MetricCard label="Unique visitors" value={cur.visitors} previous={prev.visitors}
                  tooltip="Distinct anonymous visitors in the period, admin traffic excluded." />
                <MetricCard label="Active now" value={overview.active_now} live
                  tooltip="Distinct visitors with activity in the last 5 minutes." />
                <MetricCard label="Sessions" value={cur.sessions} previous={prev.sessions}
                  tooltip="Visits separated by 30 minutes of inactivity." />
                <MetricCard label="Page views" value={cur.pageviews} previous={prev.pageviews}
                  tooltip="Total pages viewed, including repeat views." />
                <MetricCard label="Engaged sessions" value={cur.engaged_sessions} previous={prev.engaged_sessions}
                  tooltip="Sessions with 10+ seconds of attention, a second page, or a real interaction." />
                <MetricCard label="Avg engagement" value={cur.avg_engagement_seconds} previous={prev.avg_engagement_seconds}
                  format={fmtDuration}
                  tooltip="Average visible time per session that reported engagement time." />
                <MetricCard label="Disengagement rate"
                  value={cur.sessions > 0 ? cur.not_engaged_sessions / cur.sessions : null}
                  previous={prev.sessions > 0 ? prev.not_engaged_sessions / prev.sessions : null}
                  direction="down_good" format={fmtPct}
                  tooltip="Share of sessions that bounced: one page, no engagement. Lower is better." />
                <MetricCard label="Tracked actions" value={cur.actions} previous={prev.actions}
                  tooltip="Deliberate interactions: CTA, contact, form, booking, and tool actions." />
                <MetricCard label="CTA clicks" value={cur.cta_clicks} previous={prev.cta_clicks}
                  tooltip="Clicks on primary calls to action across the site." />
                <MetricCard label="Form starts" value={cur.form_starts} previous={prev.form_starts}
                  tooltip="A visitor focused a form field. The top of the capture funnel." />
                <MetricCard label="Form submissions" value={cur.form_submits} previous={prev.form_submits}
                  tooltip="Forms actually sent." />
                <MetricCard label="Leads captured" value={cur.leads} previous={prev.leads}
                  tooltip="Real rows in the CRM (test leads excluded). Source of truth: the leads table." />
                <MetricCard label="Calls initiated" value={cur.phone_clicks} previous={prev.phone_clicks}
                  tooltip="Taps on a call link." />
                <MetricCard label="Texts initiated" value={cur.sms_clicks} previous={prev.sms_clicks}
                  tooltip="Taps on a text link." />
                <MetricCard label="Emails initiated" value={cur.email_clicks} previous={prev.email_clicks}
                  tooltip="Clicks on an email link." />
                <MetricCard label="Booking starts" value={cur.booking_starts} previous={prev.booking_starts}
                  tooltip="Visitors who opened the consultation calendar." />
                <MetricCard label="Completed bookings" value={cur.booking_completes} previous={prev.booking_completes}
                  tooltip="Calendar confirmations detected from the embedded scheduler." />
                <MetricCard label="Tool opens" value={cur.tool_views} previous={prev.tool_views}
                  tooltip="Views of individual free-tool pages." />
                <MetricCard label="Tool starts" value={cur.tool_starts} previous={prev.tool_starts}
                  tooltip="A visitor began entering values into a tool." />
                <MetricCard label="Tool completions" value={cur.tool_completes} previous={prev.tool_completes}
                  tooltip="A tool produced a saved, downloaded, or emailed result." />
                <MetricCard label="Visitor → lead"
                  value={cur.visitors > 0 ? cur.leads / cur.visitors : null}
                  previous={prev.visitors > 0 ? prev.leads / prev.visitors : null}
                  format={fmtPct}
                  tooltip="Leads divided by unique visitors in the period." />
                <MetricCard label="Lead → booked call"
                  value={cur.leads > 0 ? cur.booked_calls / cur.leads : null}
                  previous={prev.leads > 0 ? prev.booked_calls / prev.leads : null}
                  format={fmtPct}
                  tooltip="Share of this period's leads currently at call_booked or beyond in the CRM." />
                <MetricCard label="Won clients" value={cur.won_clients} previous={prev.won_clients}
                  tooltip="Leads created in the period whose CRM status is won." />
              </div>

              <section className="card">
                <h2 className="mb-3 font-bold text-[var(--heading)]">Traffic & actions</h2>
                <AreaChart
                  points={((data.timeseries as Json[]) ?? []).map((b) => ({
                    x: b.bucket,
                    ys: [b.visitors, b.pageviews],
                  }))}
                  seriesNames={["Visitors", "Page views"]}
                  colors={[C.blue, C.cyan]}
                  formatX={(x) => (dates.bucket === "hour" ? x.slice(11, 16) : x.slice(5, 10))}
                  summary={`Visitors and page views per ${dates.bucket} for the selected period.`}
                />
              </section>
            </>
          ) : (
            <EmptyChart label="Collecting data" height={160} />
          )}
        </div>
      )}

      {/* ================= LIVE ================= */}
      {tab === "Live" && (
        <div className="grid gap-6 lg:grid-cols-[1fr_320px]">
          <section className="card">
            <div className="mb-3 flex items-center justify-between">
              <h2 className="font-bold text-[var(--heading)]">Live activity</h2>
              <span className="inline-flex items-center gap-1.5 text-xs font-bold text-[var(--green)]">
                <span className="live-pulse-dot" aria-hidden="true" /> Refreshes every 15s
              </span>
            </div>
            {(data.live as Json[] | null)?.length ? (
              <ul className="divide-y divide-line">
                {(data.live as Json[]).map((e, i) => (
                  <li key={i} className="flex flex-wrap items-baseline gap-x-3 gap-y-1 py-2 text-sm">
                    <span className="w-16 shrink-0 text-xs tabular-nums text-[var(--quiet)]">
                      {relativeTime(e.at)}
                    </span>
                    <span className="font-semibold text-[var(--heading)]">
                      {EVENT_LABELS[e.event] ?? e.event}
                    </span>
                    <span className="truncate text-[var(--muted)]">
                      {e.tool ? `tool: ${e.tool}` : e.label ? e.label : e.path}
                    </span>
                    <span className="ml-auto flex gap-2 text-xs text-[var(--quiet)]">
                      {e.device && <span>{e.device}</span>}
                      {e.source && <span>{e.source}</span>}
                      {e.region && e.country && <span>{e.region}, {e.country}</span>}
                    </span>
                  </li>
                ))}
              </ul>
            ) : (
              <EmptyChart label="No verified activity yet — events appear here as visitors act" height={160} />
            )}
          </section>
          <section className="card h-fit">
            <h2 className="mb-2 font-bold text-[var(--heading)]">Right now</h2>
            <div className="text-4xl font-black text-[var(--heading)] tabular-nums">
              {(data.active as Json | null)?.active_visitors ?? "—"}
            </div>
            <p className="mb-4 text-xs text-[var(--muted)]">active visitors (last 5 min)</p>
            <BarList
              items={(((data.active as Json | null)?.pages as Json[]) ?? []).map((p) => ({
                label: p.path,
                value: p.visitors,
              }))}
              color={C.blue}
              emptyLabel="Nobody on the site right now"
            />
          </section>
        </div>
      )}

      {/* ================= ACQUISITION ================= */}
      {tab === "Acquisition" && (
        <AcquisitionTab data={data.acquisition as Json | null} loading={loading} />
      )}

      {/* ================= BEHAVIOR ================= */}
      {tab === "Behavior" && <BehaviorTab data={data.behavior as Json | null} loading={loading} />}

      {/* ================= PAGES ================= */}
      {tab === "Pages" && (
        <PagesTab
          rows={(data.pages as Json[]) ?? []}
          loading={loading}
          onOpen={openPageDetail}
          detail={pageDetail}
          onCloseDetail={() => setPageDetail(null)}
        />
      )}

      {/* ================= TOOLS ================= */}
      {tab === "Tools" && <ToolsTab rows={(data.tools as Json[]) ?? []} loading={loading} />}

      {/* ================= FUNNEL ================= */}
      {tab === "Funnel" && <FunnelTab data={data.funnel as Json | null} loading={loading} />}

      {/* ================= SEO ================= */}
      {tab === "SEO & Index" && <SeoTab data={data.seo as Json | null} loading={loading} />}

      {/* ================= HEALTH ================= */}
      {tab === "Health" && <HealthTab data={data.filters as Json | null} loading={loading} />}
    </div>
  );
}

// ---------------------------------------------------------------------------

function FilterSelect({
  label,
  value,
  onChange,
  options,
  allLabel,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  options: [string, string][];
  allLabel: string;
}) {
  return (
    <label className="inline-flex items-center gap-1.5 font-semibold text-[var(--muted)]">
      {label}
      <select
        className="input !w-auto !px-2 !py-1.5 text-xs"
        value={value}
        onChange={(e) => onChange(e.target.value)}
      >
        <option value="">{allLabel}</option>
        {options.map(([v, l]) => (
          <option key={v} value={v}>
            {l}
          </option>
        ))}
      </select>
    </label>
  );
}

function CardSkeleton({ rows = 2 }: { rows?: number }) {
  return (
    <div className="grid grid-cols-2 gap-3 md:grid-cols-4" aria-hidden="true">
      {Array.from({ length: rows * 4 }).map((_, i) => (
        <div key={i} className="h-28 animate-pulse rounded-xl border border-[var(--line)] bg-[var(--fill-2)]" />
      ))}
    </div>
  );
}

function SectionCard({ title, children, note }: { title: string; children: React.ReactNode; note?: string }) {
  return (
    <section className="card">
      <h2 className="mb-1 font-bold text-[var(--heading)]">{title}</h2>
      {note && <p className="mb-3 text-xs text-[var(--quiet)]">{note}</p>}
      {!note && <div className="mb-3" />}
      {children}
    </section>
  );
}

function AcquisitionTab({ data, loading }: { data: Json | null; loading: boolean }) {
  if (!data) return loading ? <CardSkeleton /> : <EmptyChart label="Collecting data" height={160} />;
  return (
    <div className="grid gap-5 lg:grid-cols-2">
      <SectionCard title="Traffic sources" note="Visits, engagement, and the leads each source produced. Untagged leads count as direct.">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="text-left text-[11px] uppercase tracking-wider text-[var(--muted)]">
                <th className="py-1.5 pr-2 font-bold">Source</th>
                <th className="py-1.5 pr-2 text-right font-bold">Visitors</th>
                <th className="py-1.5 pr-2 text-right font-bold">Engaged</th>
                <th className="py-1.5 pr-2 text-right font-bold">Leads</th>
                <th className="py-1.5 text-right font-bold">Booked</th>
              </tr>
            </thead>
            <tbody>
              {((data.sources as Json[]) ?? []).map((s) => (
                <tr key={s.source} className="border-t border-line">
                  <td className="py-1.5 pr-2 font-semibold text-[var(--heading)]">{s.source}</td>
                  <td className="py-1.5 pr-2 text-right tabular-nums">{compactNumber(s.visitors)}</td>
                  <td className="py-1.5 pr-2 text-right tabular-nums">{compactNumber(s.engaged_sessions)}</td>
                  <td className="py-1.5 pr-2 text-right font-bold tabular-nums text-[var(--green)]">{s.leads}</td>
                  <td className="py-1.5 text-right tabular-nums">{s.booked}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </SectionCard>
      <SectionCard title="Campaigns (UTM)">
        <BarList
          items={((data.utm as Json[]) ?? []).map((u) => ({
            label: [u.source, u.medium, u.campaign].filter(Boolean).join(" / "),
            value: u.visitors,
          }))}
          color={C.blue}
          emptyLabel="No campaign-tagged traffic in this period"
        />
      </SectionCard>
      <SectionCard title="Leads by campaign">
        <BarList
          items={((data.campaign_leads as Json[]) ?? []).map((u) => ({
            label: [u.source, u.campaign].filter(Boolean).join(" / ") || "(untagged)",
            value: u.leads,
            hint: u.booked > 0 ? `${u.booked} booked` : undefined,
          }))}
          color={C.green}
          emptyLabel="No attributed leads in this period"
        />
      </SectionCard>
      <SectionCard title="Referring sites">
        <BarList
          items={((data.referrers as Json[]) ?? []).map((r) => ({ label: r.host, value: r.visitors }))}
          color={C.cyan}
          emptyLabel="No referral traffic in this period"
        />
      </SectionCard>
      <SectionCard title="Landing pages">
        <BarList
          items={((data.landing_pages as Json[]) ?? []).map((l) => ({ label: l.path, value: l.sessions }))}
          color={C.blue}
          emptyLabel="Collecting data"
        />
      </SectionCard>
      <SectionCard title="Devices & browsers">
        <div className="grid grid-cols-2 gap-4">
          <BarList
            items={((data.devices as Json[]) ?? []).map((d) => ({ label: d.device, value: d.visitors }))}
            color={C.violet}
            emptyLabel="Collecting data"
          />
          <BarList
            items={((data.browsers as Json[]) ?? []).map((b) => ({ label: b.browser, value: b.visitors }))}
            color={C.violet}
            emptyLabel="Awaiting new events"
          />
        </div>
      </SectionCard>
      <SectionCard title="Countries & regions" note="Coarse edge-network geography. IP addresses are never stored.">
        <div className="grid grid-cols-2 gap-4">
          <BarList
            items={((data.countries as Json[]) ?? []).map((c) => ({ label: c.country, value: c.visitors }))}
            color={C.cyan}
            emptyLabel="Awaiting new events"
          />
          <BarList
            items={((data.regions as Json[]) ?? []).map((r) => ({
              label: `${r.region}, ${r.country}`,
              value: r.visitors,
            }))}
            color={C.cyan}
            emptyLabel="Awaiting new events"
          />
        </div>
      </SectionCard>
    </div>
  );
}

function BehaviorTab({ data, loading }: { data: Json | null; loading: boolean }) {
  if (!data) return loading ? <CardSkeleton /> : <EmptyChart label="Collecting data" height={160} />;
  const scroll = data.scroll_reach as Json | null;
  const contact = data.contact_clicks as Json | null;
  return (
    <div className="grid gap-5 lg:grid-cols-2">
      <SectionCard title="Most-clicked CTAs">
        <BarList
          items={((data.top_ctas as Json[]) ?? []).map((c) => ({
            label: c.label,
            value: c.clicks,
            hint: c.path,
          }))}
          color={C.blue}
          emptyLabel="No CTA clicks recorded yet — tracking is new, data grows from today"
        />
      </SectionCard>
      <SectionCard title="Contact actions">
        <div className="grid grid-cols-3 gap-3 text-center">
          {[
            ["Calls", contact?.phone],
            ["Texts", contact?.sms],
            ["Emails", contact?.email],
          ].map(([label, v]) => (
            <div key={label as string} className="rounded-lg border border-[var(--line)] p-3">
              <div className="text-2xl font-black text-[var(--heading)] tabular-nums">{v ?? 0}</div>
              <div className="text-xs text-[var(--muted)]">{label}</div>
            </div>
          ))}
        </div>
        <h3 className="mb-2 mt-5 text-sm font-bold text-[var(--heading)]">Outbound links</h3>
        <BarList
          items={((data.outbound as Json[]) ?? []).map((o) => ({ label: o.host, value: o.clicks }))}
          color={C.cyan}
          emptyLabel="No outbound clicks yet"
        />
      </SectionCard>
      <SectionCard title="Scroll depth" note="How far sessions get down the page.">
        {scroll && scroll.sessions > 0 ? (
          <BarList
            items={[
              { label: "Reached 25%", value: scroll.p25 },
              { label: "Reached 50%", value: scroll.p50 },
              { label: "Reached 75%", value: scroll.p75 },
              { label: "Reached bottom", value: scroll.p100 },
            ]}
            color={C.violet}
          />
        ) : (
          <EmptyChart label="Scroll tracking starts collecting with the next deploy" height={100} />
        )}
      </SectionCard>
      <SectionCard title="Forms" note="Starts vs submissions. Abandonment = started but never sent.">
        {((data.forms as Json[]) ?? []).length > 0 ? (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="text-left text-[11px] uppercase tracking-wider text-[var(--muted)]">
                  <th className="py-1.5 pr-2 font-bold">Form</th>
                  <th className="py-1.5 pr-2 text-right font-bold">Starts</th>
                  <th className="py-1.5 pr-2 text-right font-bold">Submits</th>
                  <th className="py-1.5 text-right font-bold">Abandonment</th>
                </tr>
              </thead>
              <tbody>
                {((data.forms as Json[]) ?? []).map((f) => (
                  <tr key={f.form} className="border-t border-line">
                    <td className="max-w-[180px] truncate py-1.5 pr-2 font-semibold text-[var(--heading)]">{f.form}</td>
                    <td className="py-1.5 pr-2 text-right tabular-nums">{f.starts}</td>
                    <td className="py-1.5 pr-2 text-right tabular-nums">{f.submits}</td>
                    <td className={`py-1.5 text-right font-bold tabular-nums ${
                      f.abandonment_rate > 0.6 ? "text-[var(--danger)]" : f.abandonment_rate > 0.3 ? "text-[var(--warn)]" : "text-[var(--green)]"
                    }`}>
                      {f.abandonment_rate != null ? fmtPct(f.abandonment_rate) : "—"}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <EmptyChart label="No form activity recorded yet" height={100} />
        )}
      </SectionCard>
      <SectionCard title="Exit pages" note="Where sessions ended.">
        <BarList
          items={((data.exit_pages as Json[]) ?? []).map((e) => ({ label: e.path, value: e.exits }))}
          color={C.cyan}
          emptyLabel="Collecting data"
        />
      </SectionCard>
      <SectionCard title="Pages seen before converting" note="What converting sessions viewed on the way to a form submit or booking.">
        <BarList
          items={((data.pre_conversion_pages as Json[]) ?? []).map((p) => ({ label: p.path, value: p.sessions }))}
          color={C.green}
          emptyLabel="No conversions in this period yet"
        />
      </SectionCard>
      <SectionCard title="Conversion by page" note="Pages with traffic but no conversions are the fix-next list.">
        {((data.page_conversion as Json[]) ?? []).length > 0 ? (
          <div className="max-h-80 overflow-auto">
            <table className="w-full text-sm">
              <thead className="sticky top-0 bg-[var(--panel)]">
                <tr className="text-left text-[11px] uppercase tracking-wider text-[var(--muted)]">
                  <th className="py-1.5 pr-2 font-bold">Page</th>
                  <th className="py-1.5 pr-2 text-right font-bold">Visitors</th>
                  <th className="py-1.5 pr-2 text-right font-bold">Converters</th>
                  <th className="py-1.5 text-right font-bold">Rate</th>
                </tr>
              </thead>
              <tbody>
                {((data.page_conversion as Json[]) ?? [])
                  .slice(0, 40)
                  .map((p) => (
                    <tr key={p.path} className="border-t border-line">
                      <td className="max-w-[220px] truncate py-1.5 pr-2 text-[var(--heading)]">{p.path}</td>
                      <td className="py-1.5 pr-2 text-right tabular-nums">{p.visitors}</td>
                      <td className="py-1.5 pr-2 text-right tabular-nums">{p.converters}</td>
                      <td className="py-1.5 text-right tabular-nums">{p.rate != null ? fmtPct(p.rate) : "—"}</td>
                    </tr>
                  ))}
              </tbody>
            </table>
          </div>
        ) : (
          <EmptyChart label="Collecting data" height={100} />
        )}
      </SectionCard>
    </div>
  );
}

type SortKey = "views" | "visitors" | "cta_clicks" | "form_submits" | "conversion_rate" | "exit_rate" | "gsc_position";

function attention(row: Json): { label: string; tone: "warn" | "danger" | "good" } | null {
  if (row.views >= 20 && (row.form_submits ?? 0) === 0 && (row.cta_clicks ?? 0) === 0)
    return { label: "Traffic, no action", tone: "warn" };
  if (row.exit_rate != null && row.exit_rate > 0.75 && row.views >= 10)
    return { label: "High exits", tone: "warn" };
  if (row.prev_views > 0 && row.views < row.prev_views * 0.6)
    return { label: "Losing traffic", tone: "danger" };
  if (row.gsc_position != null && row.gsc_position > 3 && row.gsc_position <= 15 && (row.gsc_impressions ?? 0) >= 50)
    return { label: "SEO opportunity", tone: "good" };
  if (row.conversion_rate != null && row.conversion_rate >= 0.05 && row.visitors >= 10)
    return { label: "Strong converter", tone: "good" };
  return null;
}

function PagesTab({
  rows,
  loading,
  onOpen,
  detail,
  onCloseDetail,
}: {
  rows: Json[];
  loading: boolean;
  onOpen: (path: string) => void;
  detail: { path: string; data: Json | null } | null;
  onCloseDetail: () => void;
}) {
  const [q, setQ] = useState("");
  const [sort, setSort] = useState<SortKey>("views");
  const [dir, setDir] = useState<1 | -1>(-1);

  const filtered = useMemo(() => {
    const needle = q.toLowerCase();
    return rows
      .filter((r) => !needle || r.path.toLowerCase().includes(needle) || (r.title ?? "").toLowerCase().includes(needle))
      .sort((a, b) => {
        const av = a[sort] ?? (sort === "gsc_position" ? Infinity : -1);
        const bv = b[sort] ?? (sort === "gsc_position" ? Infinity : -1);
        return (av === bv ? 0 : av > bv ? 1 : -1) * dir;
      });
  }, [rows, q, sort, dir]);

  function header(label: string, key: SortKey, title?: string) {
    return (
      <th className="whitespace-nowrap py-2 pr-3 text-right font-bold">
        <button
          className="inline-flex items-center gap-0.5 text-[11px] uppercase tracking-wider hover:text-[var(--heading)]"
          onClick={() => {
            if (sort === key) setDir((d) => (d === 1 ? -1 : 1));
            else {
              setSort(key);
              setDir(-1);
            }
          }}
          title={title}
        >
          {label}
          {sort === key && <span aria-hidden="true">{dir === -1 ? "↓" : "↑"}</span>}
        </button>
      </th>
    );
  }

  if (rows.length === 0) {
    return loading ? <CardSkeleton /> : <EmptyChart label="No page traffic in this period" height={160} />;
  }

  return (
    <div className="space-y-5">
      <div className="card !p-4">
        <label className="sr-only" htmlFor="page-search">Search pages</label>
        <input
          id="page-search"
          className="input"
          placeholder={`Search ${rows.length} pages…`}
          value={q}
          onChange={(e) => setQ(e.target.value)}
        />
      </div>
      <div className="card overflow-x-auto !p-0">
        <table className="w-full min-w-[900px] text-sm">
          <thead>
            <tr className="text-left text-[var(--muted)]">
              <th className="py-2 pl-4 pr-3 text-[11px] font-bold uppercase tracking-wider">Page</th>
              {header("Views", "views")}
              {header("Visitors", "visitors")}
              {header("CTA", "cta_clicks", "CTA + contact clicks on the page")}
              {header("Submits", "form_submits")}
              {header("Conv", "conversion_rate", "Converting visitors ÷ visitors")}
              {header("Exit", "exit_rate")}
              {header("G-Pos", "gsc_position", "Average Google position (lower is better)")}
              <th className="py-2 pr-3 text-right text-[11px] font-bold uppercase tracking-wider">Trend</th>
              <th className="py-2 pr-4 text-right text-[11px] font-bold uppercase tracking-wider">Status</th>
            </tr>
          </thead>
          <tbody>
            {filtered.slice(0, 100).map((r) => {
              const t = trend(r.views, r.prev_views);
              const att = attention(r);
              return (
                <tr
                  key={r.path}
                  className="cursor-pointer border-t border-line hover:bg-[var(--fill-2)]"
                  onClick={() => onOpen(r.path)}
                >
                  <td className="max-w-[260px] py-2 pl-4 pr-3">
                    <div className="truncate font-semibold text-[var(--heading)]">{r.path}</div>
                    {r.title && <div className="truncate text-xs text-[var(--quiet)]">{r.title}</div>}
                  </td>
                  <td className="py-2 pr-3 text-right tabular-nums">{compactNumber(r.views)}</td>
                  <td className="py-2 pr-3 text-right tabular-nums">{compactNumber(r.visitors)}</td>
                  <td className="py-2 pr-3 text-right tabular-nums">{r.cta_clicks}</td>
                  <td className="py-2 pr-3 text-right tabular-nums">{r.form_submits}</td>
                  <td className="py-2 pr-3 text-right tabular-nums">
                    {r.conversion_rate != null ? fmtPct(r.conversion_rate) : "—"}
                  </td>
                  <td className="py-2 pr-3 text-right tabular-nums">
                    {r.exit_rate != null ? fmtPct(r.exit_rate) : "—"}
                  </td>
                  <td className="py-2 pr-3 text-right tabular-nums">
                    {r.gsc_position ?? <span className="text-[var(--quiet)]">n/a</span>}
                  </td>
                  <td className={`py-2 pr-3 text-right text-xs font-bold tabular-nums ${
                    t.tone === "positive" ? "text-[var(--green)]" : t.tone === "negative" ? "text-[var(--danger)]" : "text-[var(--quiet)]"
                  }`}>
                    {t.arrow === "flat" ? "→" : t.arrow === "up" ? "↑" : "↓"}
                    {t.pct != null ? ` ${Math.abs(t.pct * 100).toFixed(0)}%` : ""}
                  </td>
                  <td className="py-2 pr-4 text-right">
                    {att ? (
                      <span className={`inline-block rounded-full border px-2 py-0.5 text-[10px] font-bold ${
                        att.tone === "danger"
                          ? "border-[var(--danger-line)] bg-[var(--danger-tint)] text-[var(--danger)]"
                          : att.tone === "warn"
                            ? "border-[var(--warn-line)] bg-[var(--warn-tint)] text-[var(--warn)]"
                            : "border-[var(--green-line)] bg-[var(--green-tint)] text-[var(--green)]"
                      }`}>
                        {att.label}
                      </span>
                    ) : (
                      <span className="text-xs text-[var(--quiet)]">OK</span>
                    )}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      {detail && (
        <div className="card" role="region" aria-label={`Details for ${detail.path}`}>
          <div className="mb-3 flex items-center justify-between">
            <h2 className="font-bold text-[var(--heading)]">{detail.path}</h2>
            <button className="button-quiet" onClick={onCloseDetail}>Close</button>
          </div>
          {!detail.data ? (
            <CardSkeleton rows={1} />
          ) : (
            <div className="grid gap-5 lg:grid-cols-2">
              <div>
                <h3 className="mb-2 text-sm font-bold text-[var(--heading)]">Traffic history</h3>
                <AreaChart
                  points={((detail.data.series as Json[]) ?? []).map((d) => ({ x: d.day, ys: [d.views] }))}
                  seriesNames={["Views"]}
                  colors={[C.blue]}
                  height={160}
                  summary={`Daily views for ${detail.path}.`}
                />
              </div>
              <div>
                <h3 className="mb-2 text-sm font-bold text-[var(--heading)]">Sources</h3>
                <BarList
                  items={((detail.data.sources as Json[]) ?? []).map((s) => ({ label: s.source, value: s.views }))}
                  color={C.cyan}
                />
              </div>
              <div>
                <h3 className="mb-2 text-sm font-bold text-[var(--heading)]">Events on this page</h3>
                <BarList
                  items={((detail.data.events as Json[]) ?? []).map((e) => ({
                    label: EVENT_LABELS[e.event] ?? e.event,
                    value: e.count,
                  }))}
                  color={C.violet}
                />
              </div>
              <div>
                <h3 className="mb-2 text-sm font-bold text-[var(--heading)]">CTA performance</h3>
                <BarList
                  items={((detail.data.ctas as Json[]) ?? []).map((c) => ({ label: c.label, value: c.count }))}
                  color={C.blue}
                  emptyLabel="No CTA clicks on this page yet"
                />
              </div>
              <div>
                <h3 className="mb-2 text-sm font-bold text-[var(--heading)]">Google queries for this page</h3>
                {((detail.data.gsc_queries as Json[]) ?? []).length > 0 ? (
                  <BarList
                    items={((detail.data.gsc_queries as Json[]) ?? []).map((q2) => ({
                      label: q2.query,
                      value: q2.impressions,
                      hint: q2.position != null ? `pos ${q2.position}` : undefined,
                    }))}
                    color={C.green}
                  />
                ) : (
                  <EmptyChart label="Search Console not connected or no query data yet" height={80} />
                )}
              </div>
              <div>
                <h3 className="mb-2 text-sm font-bold text-[var(--heading)]">Index status</h3>
                {detail.data.inspection ? (
                  <dl className="space-y-1 text-sm">
                    {Object.entries(detail.data.inspection as Json)
                      .filter(([, v]) => v != null && v !== "")
                      .map(([k, v]) => (
                        <div key={k} className="flex justify-between gap-3">
                          <dt className="text-[var(--muted)]">{k.replace(/_/g, " ")}</dt>
                          <dd className="text-right font-semibold text-[var(--heading)]">{String(v)}</dd>
                        </div>
                      ))}
                  </dl>
                ) : (
                  <EmptyChart label="Not in the index-monitoring list — add it in Settings" height={80} />
                )}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

function ToolsTab({ rows, loading }: { rows: Json[]; loading: boolean }) {
  if (rows.length === 0) {
    return loading ? (
      <CardSkeleton />
    ) : (
      <EmptyChart label="No tool activity in this period yet — tool tracking starts collecting with this deploy" height={160} />
    );
  }
  const rising = [...rows]
    .filter((r) => r.views > r.prev_views && r.prev_views >= 0)
    .sort((a, b) => b.views - b.prev_views - (a.views - a.prev_views))
    .slice(0, 8);
  const leaky = rows.filter((r) => r.starts >= 5 && (r.completion_rate ?? 0) < 0.3);
  return (
    <div className="space-y-5">
      <div className="card overflow-x-auto !p-0">
        <table className="w-full min-w-[760px] text-sm">
          <thead>
            <tr className="text-left text-[11px] uppercase tracking-wider text-[var(--muted)]">
              <th className="py-2 pl-4 pr-3 font-bold">Tool</th>
              <th className="py-2 pr-3 text-right font-bold">Views</th>
              <th className="py-2 pr-3 text-right font-bold">Starts</th>
              <th className="py-2 pr-3 text-right font-bold">Completions</th>
              <th className="py-2 pr-3 text-right font-bold">Completion rate</th>
              <th className="py-2 pr-3 text-right font-bold">CTAs after</th>
              <th className="py-2 pr-4 text-right font-bold">Leads</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((r) => (
              <tr key={r.tool} className="border-t border-line">
                <td className="py-2 pl-4 pr-3 font-semibold text-[var(--heading)]">{r.tool}</td>
                <td className="py-2 pr-3 text-right tabular-nums">{r.views}</td>
                <td className="py-2 pr-3 text-right tabular-nums">{r.starts}</td>
                <td className="py-2 pr-3 text-right tabular-nums">{r.completes}</td>
                <td className={`py-2 pr-3 text-right font-bold tabular-nums ${
                  r.completion_rate == null ? "text-[var(--quiet)]" : r.completion_rate < 0.3 ? "text-[var(--warn)]" : "text-[var(--green)]"
                }`}>
                  {r.completion_rate != null ? fmtPct(r.completion_rate) : "—"}
                </td>
                <td className="py-2 pr-3 text-right tabular-nums">{r.post_completion_ctas}</td>
                <td className="py-2 pr-4 text-right font-bold tabular-nums text-[var(--green)]">{r.leads}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <div className="grid gap-5 lg:grid-cols-2">
        <SectionCard title="Fastest growing" note="Views vs the previous period.">
          <BarList
            items={rising.map((r) => ({ label: r.tool, value: r.views - r.prev_views, hint: `${r.prev_views} → ${r.views}` }))}
            color={C.green}
            emptyLabel="Not enough history to rank growth yet"
          />
        </SectionCard>
        <SectionCard title="High traffic, low completion" note="Tools people open but do not finish — candidates for fixes.">
          <BarList
            items={leaky.map((r) => ({ label: r.tool, value: r.starts, hint: `${fmtPct(r.completion_rate ?? 0)} finish` }))}
            color={C.violet}
            emptyLabel="No leaky tools detected in this period"
          />
        </SectionCard>
      </div>
    </div>
  );
}

function FunnelTab({ data, loading }: { data: Json | null; loading: boolean }) {
  if (!data) return loading ? <CardSkeleton /> : <EmptyChart label="Collecting data" height={160} />;
  const stages = (data.stages as Json[]) ?? [];
  return (
    <div className="space-y-5">
      <SectionCard
        title="Attention → clients"
        note="Distinct visitors per stage from the event stream; lead stages come from the CRM. Stages the CRM has not reached yet show zero, never invented numbers."
      >
        <FunnelChart
          stages={stages.map((s) => ({ label: s.label, count: s.count ?? 0, note: s.note }))}
          colors={["#08205E", "#0B2CA8", "#1240E8", "#3D63EF", "#6D8BF4", "#98ACF8", "#C3CEFB"]}
        />
      </SectionCard>
      <div className="card overflow-x-auto !p-0">
        <table className="w-full min-w-[680px] text-sm">
          <thead>
            <tr className="text-left text-[11px] uppercase tracking-wider text-[var(--muted)]">
              <th className="py-2 pl-4 pr-3 font-bold">Stage</th>
              <th className="py-2 pr-3 text-right font-bold">Now</th>
              <th className="py-2 pr-3 text-right font-bold">Previous</th>
              <th className="py-2 pr-3 text-right font-bold">Change</th>
              <th className="py-2 pr-3 font-bold">Top source</th>
              <th className="py-2 pr-4 font-bold">Top landing</th>
            </tr>
          </thead>
          <tbody>
            {stages.map((s) => {
              const t = trend(s.count ?? 0, s.prev ?? 0);
              return (
                <tr key={s.key} className="border-t border-line">
                  <td className="py-2 pl-4 pr-3 font-semibold text-[var(--heading)]">{s.label}</td>
                  <td className="py-2 pr-3 text-right font-bold tabular-nums">{s.count ?? 0}</td>
                  <td className="py-2 pr-3 text-right tabular-nums text-[var(--muted)]">{s.prev ?? 0}</td>
                  <td className={`py-2 pr-3 text-right text-xs font-bold ${
                    t.tone === "positive" ? "text-[var(--green)]" : t.tone === "negative" ? "text-[var(--danger)]" : "text-[var(--quiet)]"
                  }`}>
                    {t.diff > 0 ? "+" : ""}
                    {t.diff}
                  </td>
                  <td className="py-2 pr-3 text-[var(--muted)]">{s.top_source ?? "—"}</td>
                  <td className="py-2 pr-4 text-[var(--muted)]">{s.top_landing ?? "—"}</td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function SeoTab({ data, loading }: { data: Json | null; loading: boolean }) {
  if (!data) return loading ? <CardSkeleton /> : <EmptyChart label="Loading Search Console state…" height={160} />;

  const inspections = (data.inspections as Json[]) ?? [];
  const indexSummary = (data.index_summary as Json[]) ?? [];

  if (!data.connected) {
    return (
      <div className="space-y-5">
        <div className="card">
          <h2 className="font-bold text-[var(--heading)]">Search Console: not connected</h2>
          <p className="mt-2 text-sm text-[var(--muted)]">
            Organic metrics stay empty until the connection exists — nothing here is ever estimated.
            Connecting takes about ten minutes:
          </p>
          <ol className="mt-3 list-decimal space-y-2 pl-5 text-sm text-[var(--text)]">
            <li>In Google Cloud Console, create (or pick) a project and enable the <strong>Google Search Console API</strong>.</li>
            <li>Create a <strong>service account</strong> (IAM → Service accounts) and download a JSON key.</li>
            <li>In Search Console → Settings → Users, add the service account email as a <strong>Full</strong> user on the property.</li>
            <li>In Vercel → Project → Environment Variables, add <code className="rounded bg-[var(--fill-3)] px-1">GSC_CLIENT_EMAIL</code>, <code className="rounded bg-[var(--fill-3)] px-1">GSC_PRIVATE_KEY</code> (the key's private_key field), and <code className="rounded bg-[var(--fill-3)] px-1">GSC_SITE_URL</code> (e.g. <code className="rounded bg-[var(--fill-3)] px-1">sc-domain:theleadflowpro.com</code>).</li>
            <li>Redeploy. The daily sync runs at 4am Central, or hit <code className="rounded bg-[var(--fill-3)] px-1">/api/cron/analytics</code> once to backfill immediately.</li>
          </ol>
          {(data.integration as Json | null)?.detail && (
            <p className="mt-3 text-xs text-[var(--quiet)]">Status: {(data.integration as Json).detail}</p>
          )}
        </div>
        <IndexPanel inspections={inspections} summary={indexSummary} />
      </div>
    );
  }

  const totals = data.totals as Json;
  const prevTotals = data.prev_totals as Json;
  const posTrend = positionTrend(totals?.position, prevTotals?.position);
  const series = (data.series as Json[]) ?? [];

  return (
    <div className="space-y-5">
      <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
        <MetricCard label="Google clicks" value={totals?.clicks} previous={prevTotals?.clicks}
          tooltip={`Clicks from Google Search in the last ${data.window_days} days of available data vs the ${data.window_days} before.`} />
        <MetricCard label="Impressions" value={totals?.impressions} previous={prevTotals?.impressions}
          tooltip="How often the site appeared in Google results." />
        <MetricCard label="CTR" value={totals?.ctr} previous={prevTotals?.ctr} format={fmtPct}
          tooltip="Clicks ÷ impressions." />
        <MetricCard label="Avg position" value={totals?.position} previous={prevTotals?.position}
          direction="down_good" format={(v) => v.toFixed(1)}
          tooltip="Average Google position across queries. Lower is better: position 3 beats position 8." />
      </div>
      {posTrend && (
        <p className="text-xs text-[var(--muted)]">
          Position moved {prevTotals.position} → {totals.position}
          {posTrend.tone === "positive" ? " — that numeric drop is an improvement." : posTrend.tone === "negative" ? " — the site slipped down the results." : "."}
        </p>
      )}
      <div className="grid gap-5 lg:grid-cols-2">
        <SectionCard title="Google clicks" note={`Data through ${data.last_data_date} (Search Console lags ~2 days).`}>
          <AreaChart
            points={series.map((d) => ({ x: d.date, ys: [d.clicks] }))}
            seriesNames={["Clicks"]}
            colors={[C.blue]}
            height={180}
            summary="Daily Google Search clicks."
          />
        </SectionCard>
        <SectionCard title="Impressions">
          <AreaChart
            points={series.map((d) => ({ x: d.date, ys: [d.impressions] }))}
            seriesNames={["Impressions"]}
            colors={[C.cyan]}
            height={180}
            summary="Daily Google Search impressions."
          />
        </SectionCard>
        <SectionCard title="Visibility footprint">
          <div className="grid grid-cols-2 gap-3 text-center">
            <div className="rounded-lg border border-[var(--line)] p-3">
              <div className="text-2xl font-black tabular-nums text-[var(--heading)]">{data.query_count}</div>
              <div className="text-xs text-[var(--muted)]">queries with impressions</div>
            </div>
            <div className="rounded-lg border border-[var(--line)] p-3">
              <div className="text-2xl font-black tabular-nums text-[var(--heading)]">{data.page_count}</div>
              <div className="text-xs text-[var(--muted)]">pages with impressions</div>
            </div>
          </div>
          <h3 className="mb-2 mt-4 text-sm font-bold text-[var(--heading)]">Branded vs non-branded</h3>
          <BarList
            items={[
              { label: "Branded clicks", value: (data.branded as Json)?.clicks ?? 0 },
              { label: "Non-branded clicks", value: (data.nonbranded as Json)?.clicks ?? 0 },
            ]}
            color={C.violet}
          />
        </SectionCard>
        <SectionCard title="Top queries" note="Position change vs the prior window; ↓number = moved up the page.">
          <div className="max-h-72 overflow-auto">
            <table className="w-full text-sm">
              <thead className="sticky top-0 bg-[var(--panel)]">
                <tr className="text-left text-[11px] uppercase tracking-wider text-[var(--muted)]">
                  <th className="py-1.5 pr-2 font-bold">Query</th>
                  <th className="py-1.5 pr-2 text-right font-bold">Clicks</th>
                  <th className="py-1.5 pr-2 text-right font-bold">Impr</th>
                  <th className="py-1.5 text-right font-bold">Pos</th>
                </tr>
              </thead>
              <tbody>
                {((data.top_queries as Json[]) ?? []).map((q) => {
                  const pt = positionTrend(q.position, q.prev_position);
                  return (
                    <tr key={q.query} className="border-t border-line">
                      <td className="max-w-[200px] truncate py-1.5 pr-2 text-[var(--heading)]">{q.query}</td>
                      <td className="py-1.5 pr-2 text-right tabular-nums">{q.clicks}</td>
                      <td className="py-1.5 pr-2 text-right tabular-nums">{q.impressions}</td>
                      <td className="py-1.5 text-right tabular-nums">
                        {q.position}
                        {pt && pt.tone !== "neutral" && (
                          <span className={`ml-1 text-xs font-bold ${pt.tone === "positive" ? "text-[var(--green)]" : "text-[var(--danger)]"}`}>
                            {pt.tone === "positive" ? "▲" : "▼"}
                          </span>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </SectionCard>
        <SectionCard title="Gaining visibility">
          <BarList
            items={[
              ...((data.rising_queries as Json[]) ?? []).map((q) => ({
                label: q.query,
                value: q.impressions,
                hint: `pos ${q.prev_position} → ${q.position}`,
              })),
            ]}
            color={C.green}
            emptyLabel="No queries improved by a full position yet"
          />
        </SectionCard>
        <SectionCard title="Losing visibility">
          <BarList
            items={[
              ...((data.falling_queries as Json[]) ?? []).map((q) => ({
                label: q.query,
                value: q.impressions,
                hint: `pos ${q.prev_position} → ${q.position}`,
              })),
            ]}
            color={C.violet}
            emptyLabel="No queries lost a full position — good"
          />
        </SectionCard>
      </div>
      <IndexPanel inspections={inspections} summary={indexSummary} />
    </div>
  );
}

const VERDICT_STYLE: Record<string, string> = {
  indexed: "border-[var(--green-line)] bg-[var(--green-tint)] text-[var(--green)]",
  not_indexed: "border-[var(--danger-line)] bg-[var(--danger-tint)] text-[var(--danger)]",
  crawled_not_indexed: "border-[var(--warn-line)] bg-[var(--warn-tint)] text-[var(--warn)]",
  discovered: "border-[var(--warn-line)] bg-[var(--warn-tint)] text-[var(--warn)]",
  blocked: "border-[var(--danger-line)] bg-[var(--danger-tint)] text-[var(--danger)]",
  redirected: "border-[var(--warn-line)] bg-[var(--warn-tint)] text-[var(--warn)]",
  canonical_mismatch: "border-[var(--warn-line)] bg-[var(--warn-tint)] text-[var(--warn)]",
  inspection_unavailable: "border-[var(--line)] bg-[var(--fill-2)] text-[var(--muted)]",
  awaiting_data: "border-[var(--line)] bg-[var(--fill-2)] text-[var(--muted)]",
};

function IndexPanel({ inspections, summary }: { inspections: Json[]; summary: Json[] }) {
  return (
    <SectionCard
      title="Index monitoring"
      note="Verified against Google's URL Inspection API when connected; without credentials only HTTP + sitemap facts are shown and no index claim is made."
    >
      {inspections.length === 0 ? (
        <EmptyChart label="Awaiting first inspection — runs daily at 4am Central" height={100} />
      ) : (
        <>
          <div className="mb-3 flex flex-wrap gap-2">
            {summary.map((s) => (
              <span key={s.verdict} className={`rounded-full border px-2.5 py-1 text-xs font-bold ${VERDICT_STYLE[s.verdict] ?? VERDICT_STYLE.awaiting_data}`}>
                {String(s.verdict).replace(/_/g, " ")}: {s.count}
              </span>
            ))}
          </div>
          <div className="overflow-x-auto">
            <table className="w-full min-w-[640px] text-sm">
              <thead>
                <tr className="text-left text-[11px] uppercase tracking-wider text-[var(--muted)]">
                  <th className="py-1.5 pr-2 font-bold">URL</th>
                  <th className="py-1.5 pr-2 font-bold">Verdict</th>
                  <th className="py-1.5 pr-2 text-right font-bold">HTTP</th>
                  <th className="py-1.5 pr-2 text-right font-bold">Sitemap</th>
                  <th className="py-1.5 text-right font-bold">Last crawl</th>
                </tr>
              </thead>
              <tbody>
                {inspections.map((u) => (
                  <tr key={u.url} className="border-t border-line">
                    <td className="max-w-[280px] truncate py-1.5 pr-2 text-[var(--heading)]">
                      {String(u.url).replace("https://www.theleadflowpro.com", "") || "/"}
                    </td>
                    <td className="py-1.5 pr-2">
                      <span className={`inline-block rounded-full border px-2 py-0.5 text-[10px] font-bold ${VERDICT_STYLE[u.verdict] ?? VERDICT_STYLE.awaiting_data}`}>
                        {String(u.verdict ?? "awaiting data").replace(/_/g, " ")}
                      </span>
                    </td>
                    <td className="py-1.5 pr-2 text-right tabular-nums">{u.http_status ?? "—"}</td>
                    <td className="py-1.5 pr-2 text-right">{u.sitemap_listed ? "yes" : "no"}</td>
                    <td className="py-1.5 text-right text-xs text-[var(--muted)]">
                      {u.last_crawl_time ? relativeTime(u.last_crawl_time) : "—"}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </>
      )}
    </SectionCard>
  );
}

function HealthTab({ data, loading }: { data: Json | null; loading: boolean }) {
  const integrations = ((data?.integrations as Json[]) ?? []);
  if (integrations.length === 0 && loading) return <CardSkeleton rows={1} />;
  return (
    <div className="space-y-5">
      <SectionCard title="Integration health" note="Where every number on these dashboards comes from.">
        <ul className="divide-y divide-line">
          {integrations.map((i) => (
            <li key={i.key} className="flex flex-wrap items-center gap-3 py-2.5 text-sm">
              <span className={`inline-block h-2.5 w-2.5 rounded-full ${
                i.status === "connected" ? "bg-[var(--green)]" : i.status === "error" ? "bg-[var(--danger)]" : "bg-[var(--line-strong)]"
              }`} aria-hidden="true" />
              <span className="font-semibold text-[var(--heading)]">{String(i.key).replace(/_/g, " ")}</span>
              <span className={`rounded-full border px-2 py-0.5 text-[10px] font-bold uppercase ${
                i.status === "connected"
                  ? "border-[var(--green-line)] bg-[var(--green-tint)] text-[var(--green)]"
                  : i.status === "error"
                    ? "border-[var(--danger-line)] bg-[var(--danger-tint)] text-[var(--danger)]"
                    : "border-[var(--line)] bg-[var(--fill-2)] text-[var(--muted)]"
              }`}>
                {i.status}
              </span>
              <span className="w-full text-xs text-[var(--muted)] sm:w-auto sm:flex-1">{i.detail}</span>
              {i.last_sync_at && (
                <span className="text-xs text-[var(--quiet)]">synced {relativeTime(i.last_sync_at)}</span>
              )}
            </li>
          ))}
        </ul>
      </SectionCard>
      <SectionCard title="Configuration" note="Public dashboard toggles, privacy thresholds, proof stats, and index-monitored URLs live with the rest of the site settings.">
        <a href="/admin/settings" className="button-secondary">Open Settings</a>
      </SectionCard>
      <SectionCard title="Heatmaps & session replay" note="Deliberately not installed. If wanted later: PostHog or Microsoft Clarity can be added behind the same internal-traffic exclusions; this dashboard's click, scroll, and form analytics cover the first-party need without recording visitors.">
        <p className="text-sm text-[var(--muted)]">
          Current click and scroll analytics are first-party and anonymous. Adding replay is a
          product decision, not a code gap.
        </p>
      </SectionCard>
    </div>
  );
}
