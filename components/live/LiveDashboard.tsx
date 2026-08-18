"use client";

// The /live command center. Receives server-fetched initial data, then polls
// the cached /api/live route (never raw tables — the anon role cannot select
// them). Every number shown is a real aggregate; anything below the privacy
// threshold or without a connected source renders an honest empty state.

import { useCallback, useEffect, useRef, useState } from "react";
import {
  compactNumber,
  publicFeedSentence,
  publicPageLabel,
  relativeTime,
  trend,
  positionTrend,
  type PublicFeedItem,
} from "@/lib/analytics/shared";
import { AreaChart, BarList, FunnelChart } from "@/components/analytics/charts";

type Json = Record<string, any>;

export type LivePayload = {
  metrics: Json | null;
  feed: PublicFeedItem[];
  series: Json | null;
  fetched_at: string;
};

const POLL_MS = 45_000;
// Sequential blue ramp for the funnel on ink (light → reads down the stages).
const FUNNEL_COLORS = ["#98acf8", "#7d97f6", "#5b87ff", "#3d63ef", "#2b4ed1"];
const ACCENT = "#5b87ff"; // validated against #0a1220

function toolName(slug: string): string {
  return slug.replace(/-/g, " ").replace(/\b\w/g, (c) => c.toUpperCase());
}

export default function LiveDashboard({ initial, showLeads }: { initial: LivePayload; showLeads: boolean }) {
  const [payload, setPayload] = useState<LivePayload>(initial);
  const [stale, setStale] = useState(false);
  const [hydrated, setHydrated] = useState(false);
  const [, forceTick] = useState(0);
  const timer = useRef<ReturnType<typeof setInterval> | null>(null);

  const refresh = useCallback(async () => {
    if (document.visibilityState === "hidden") return;
    try {
      const res = await fetch("/api/live", { cache: "no-store" });
      if (!res.ok) throw new Error(String(res.status));
      const json = (await res.json()) as LivePayload;
      if (json.metrics) {
        setPayload(json);
        setStale(false);
      }
    } catch {
      setStale(true); // keep showing the last real data, say so, retry next tick
    }
  }, []);

  useEffect(() => {
    setHydrated(true);
    timer.current = setInterval(refresh, POLL_MS);
    const tick = setInterval(() => forceTick((n) => n + 1), 10_000); // re-render relative times
    return () => {
      if (timer.current) clearInterval(timer.current);
      clearInterval(tick);
    };
  }, [refresh]);

  const m = payload.metrics;
  const series = payload.series;
  const feed = payload.feed ?? [];

  if (!m || m.enabled === false) {
    return (
      <div className="lfp-ink p-8 text-center">
        <p className="text-sm text-[#a8b4c8]">
          The live dashboard is offline right now. The system underneath it is still running.
        </p>
      </div>
    );
  }

  const funnel = (m.funnel_30d as Json) ?? {};
  const gsc = m.gsc as Json | null;
  const gscClicksTrend = gsc ? trend(gsc.clicks_28d ?? 0, gsc.prev_clicks_28d ?? 0) : null;
  const gscPosTrend = gsc ? positionTrend(gsc.position_28d, gsc.prev_position_28d) : null;
  const visitorsTrend = trend(m.visitors_30d ?? 0, m.visitors_prev_30d ?? 0);

  const tiles: Array<{ label: string; value: number | null; live?: boolean; sub?: string }> = [
    { label: "Visitors today", value: m.visitors_today, sub: `${m.visitors_yesterday ?? 0} yesterday` },
    {
      label: "Visitors · 30 days",
      value: m.visitors_30d,
      sub:
        m.visitors_prev_30d > 0
          ? `${visitorsTrend.diff >= 0 ? "+" : ""}${visitorsTrend.diff} vs prior 30d`
          : "first 30-day window",
    },
    { label: "Page views today", value: m.pageviews_today, sub: `${compactNumber(m.pageviews_30d)} in 30d` },
    { label: "Actions tracked today", value: m.actions_today, sub: `${compactNumber(m.actions_30d)} in 30d` },
    { label: "Active right now", value: m.active_now, live: true, sub: "last 5 minutes" },
    { label: "Tool sessions today", value: m.tool_sessions_today, sub: `${compactNumber(m.tool_views_30d)} tool views in 30d` },
    { label: "CTA clicks · 30 days", value: m.cta_clicks_30d, sub: "calls, texts, emails, buttons" },
    ...(showLeads && m.leads_30d != null
      ? [{ label: "Leads · 30 days", value: m.leads_30d as number, sub: `${m.leads_today ?? 0} today` }]
      : []),
  ];

  return (
    <div className="space-y-6">
      {/* ---- status line ---- */}
      <div className="flex flex-wrap items-center gap-3 text-xs font-bold uppercase tracking-wider">
        <span className="inline-flex items-center gap-2 rounded-full border border-[#146c3466] bg-[#146c3422] px-3 py-1.5 text-[#4ade80]">
          <span className="live-pulse-dot" aria-hidden="true" />
          {stale ? "Reconnecting — showing last verified data" : "System live"}
        </span>
        <span className="text-[#a8b4c8]">
          Data updated {hydrated ? relativeTime(payload.fetched_at) : "recently"} · refreshes
          about every 30–45s
        </span>
      </div>

      {/* ---- command center ---- */}
      <section className="lfp-ink p-5 sm:p-7" aria-label="Live traffic metrics">
        <div className="lfp-ink-grid" aria-hidden="true" />
        <div className="lfp-ink-glow" style={{ background: "#1240e8", top: -160, right: -120 }} aria-hidden="true" />
        <div className="relative">
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
            {tiles.map((t) => (
              <div key={t.label} className="rounded-xl border border-white/10 bg-white/[0.04] p-4">
                <div className="text-[11px] font-bold uppercase tracking-wider text-[#a8b4c8]">{t.label}</div>
                <div className="mt-1.5 flex items-baseline gap-2">
                  <span key={String(t.value)} className="lfp-num text-3xl font-black text-white">
                    {t.value != null ? compactNumber(t.value) : "—"}
                  </span>
                  {t.live && (
                    <span className="inline-flex items-center gap-1 text-[10px] font-bold uppercase tracking-wider text-[#4ade80]">
                      <span className="live-pulse-dot" aria-hidden="true" /> live
                    </span>
                  )}
                </div>
                {t.sub && <div className="mt-1 text-[11px] text-[#7f8ca3]">{t.sub}</div>}
              </div>
            ))}
          </div>

          <div className="mt-6 grid gap-6 lg:grid-cols-[1.6fr_1fr]">
            <div>
              <h3 className="mb-3 text-sm font-black uppercase tracking-wider text-[#a8b4c8]">
                Visitors · last 30 days
              </h3>
              <AreaChart
                points={((series?.daily as Json[]) ?? []).map((d) => ({ x: d.day, ys: [d.visitors] }))}
                seriesNames={["Visitors"]}
                colors={[ACCENT]}
                height={200}
                ink
                summary="Daily unique visitors for the last 30 days."
              />
            </div>
            <div>
              <h3 className="mb-3 text-sm font-black uppercase tracking-wider text-[#a8b4c8]">
                Live activity
              </h3>
              {feed.length > 0 ? (
                <ol className="space-y-2.5" aria-live="polite">
                  {feed.slice(0, 8).map((item, i) => (
                    <li key={`${item.at}-${i}`} className="flex items-start gap-2.5 text-[13px]">
                      <span className="mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full" style={{ background: ACCENT }} aria-hidden="true" />
                      <span className="flex-1 text-[#e7ecf5]">
                        {publicFeedSentence(item)}
                        <span className="ml-1.5 text-[11px] text-[#7f8ca3]">
                          {hydrated ? relativeTime(item.at) : "recently"}
                          {item.device ? ` · ${item.device}` : ""}
                        </span>
                      </span>
                    </li>
                  ))}
                </ol>
              ) : (
                <p className="rounded-lg border border-dashed border-white/15 p-4 text-[13px] text-[#a8b4c8]">
                  Quiet right now. Real actions appear here after a short privacy delay — no
                  identities, no locations, ever.
                </p>
              )}
            </div>
          </div>
        </div>
      </section>

      {/* ---- funnel ---- */}
      <section className="lfp-ink p-5 sm:p-7" aria-label="Attention to action funnel">
        <div className="lfp-ink-grid" aria-hidden="true" />
        <div className="relative">
          <h3 className="text-sm font-black uppercase tracking-wider text-[#a8b4c8]">
            Attention → action · last 30 days
          </h3>
          <p className="mb-4 mt-1 text-[13px] text-[#7f8ca3]">
            The post gets attention. The system turns it into conversations. Distinct visitors per stage.
          </p>
          <FunnelChart
            ink
            colors={FUNNEL_COLORS}
            stages={[
              { label: "Visitors", count: funnel.visitors ?? 0 },
              { label: "Engaged", count: funnel.engaged ?? 0 },
              { label: "Took action", count: funnel.cta_actions ?? 0 },
              { label: "Started a conversation", count: funnel.conversations_started ?? 0 },
              ...(showLeads && funnel.leads != null ? [{ label: "Became leads", count: funnel.leads }] : []),
            ]}
          />
          <p className="mt-4 text-[11px] text-[#7f8ca3]">
            Interaction tracking went live in August 2026, so action stages count from then — these
            are measured events, not estimates.
          </p>
        </div>
      </section>

      {/* ---- pages + tools ---- */}
      <div className="grid gap-6 md:grid-cols-2">
        <section className="lfp-ink p-5 sm:p-6" aria-label="Most active pages">
          <h3 className="mb-3 text-sm font-black uppercase tracking-wider text-[#a8b4c8]">
            Most active pages · 7 days
          </h3>
          <BarList
            ink
            color={ACCENT}
            items={((series?.top_pages as Json[]) ?? []).map((p) => ({
              label: p.path === "/" ? "Homepage" : publicPageLabel(p.path),
              value: p.views,
              hint: p.path,
              href: p.path,
            }))}
            emptyLabel="Not enough page data yet — collecting"
          />
          <p className="mt-3 text-[11px] text-[#7f8ca3]">
            Every row is a real page — click one and you become part of the numbers.
          </p>
        </section>
        <section className="lfp-ink p-5 sm:p-6" aria-label="Most used tools">
          <h3 className="mb-3 text-sm font-black uppercase tracking-wider text-[#a8b4c8]">
            Most used free tools · 30 days
          </h3>
          <BarList
            ink
            color={ACCENT}
            items={((series?.top_tools as Json[]) ?? []).map((t) => ({
              label: toolName(t.tool),
              value: t.uses,
              href: `/tools/${t.tool}`,
            }))}
            emptyLabel="Tool usage tracking is new — numbers build from today"
          />
          <p className="mt-3 text-[13px]">
            <a href="/tools" className="font-bold text-[#5b87ff] hover:text-white">
              Try the free tools yourself →
            </a>
          </p>
        </section>
      </div>

      {/* ---- Google growth + index ---- */}
      <div className="grid gap-6 md:grid-cols-2">
        <section className="lfp-ink p-5 sm:p-6" aria-label="Google organic visibility">
          <h3 className="mb-3 text-sm font-black uppercase tracking-wider text-[#a8b4c8]">
            Organic Google growth
          </h3>
          {gsc ? (
            <div>
              <div className="grid grid-cols-2 gap-3">
                <div className="rounded-lg border border-white/10 p-3">
                  <div className="text-2xl font-black text-white lfp-num">{compactNumber(gsc.clicks_28d)}</div>
                  <div className="text-[11px] text-[#a8b4c8]">Google clicks · 28d</div>
                  {gscClicksTrend && gscClicksTrend.arrow !== "flat" && (
                    <div className={`mt-1 text-[11px] font-bold ${gscClicksTrend.tone === "positive" ? "text-[#4ade80]" : "text-[#f87171]"}`}>
                      {gscClicksTrend.arrow === "up" ? "▲" : "▼"} {Math.abs(gscClicksTrend.diff)} vs prior 28d
                    </div>
                  )}
                </div>
                <div className="rounded-lg border border-white/10 p-3">
                  <div className="text-2xl font-black text-white lfp-num">{gsc.position_28d ?? "—"}</div>
                  <div className="text-[11px] text-[#a8b4c8]">avg position (lower = better)</div>
                  {gscPosTrend && gscPosTrend.arrow !== "flat" && (
                    <div className={`mt-1 text-[11px] font-bold ${gscPosTrend.tone === "positive" ? "text-[#4ade80]" : "text-[#f87171]"}`}>
                      {gscPosTrend.tone === "positive" ? "▲ improved" : "▼ slipped"} from {gsc.prev_position_28d}
                    </div>
                  )}
                </div>
              </div>
              <p className="mt-3 text-[11px] text-[#7f8ca3]">
                Straight from Google Search Console, through {gsc.last_data_date} (Google's data lags ~2 days).
              </p>
            </div>
          ) : (
            <p className="rounded-lg border border-dashed border-white/15 p-4 text-[13px] text-[#a8b4c8]">
              Search Console not connected yet. When Google&apos;s own data feed is wired in, real
              impressions, clicks, and average position appear here — never estimates.
            </p>
          )}
        </section>
        <section className="lfp-ink p-5 sm:p-6" aria-label="Index coverage">
          <h3 className="mb-3 text-sm font-black uppercase tracking-wider text-[#a8b4c8]">
            Index coverage
          </h3>
          {m.index_coverage ? (
            <div>
              <div className="flex items-baseline gap-2">
                <span className="text-3xl font-black text-white lfp-num">
                  {(m.index_coverage as Json).indexed}
                </span>
                <span className="text-sm text-[#a8b4c8]">
                  of {(m.index_coverage as Json).monitored} monitored pages verified indexed by Google
                </span>
              </div>
              <p className="mt-3 text-[11px] text-[#7f8ca3]">
                Checked daily against Google&apos;s URL Inspection API. &quot;Indexed&quot; is only
                claimed when Google confirms it.
              </p>
            </div>
          ) : (
            <p className="rounded-lg border border-dashed border-white/15 p-4 text-[13px] text-[#a8b4c8]">
              Awaiting first inspection. Priority pages get verified against Google&apos;s index
              every day once the Search Console connection is live.
            </p>
          )}
        </section>
      </div>
    </div>
  );
}
