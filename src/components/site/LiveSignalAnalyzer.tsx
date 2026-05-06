"use client";

import { useMemo, useState } from "react";
import type { LucideIcon } from "lucide-react";
import {
  Activity,
  BarChart3,
  CheckCircle2,
  Clock,
  Gauge,
  PlugZap,
  Radar,
  RadioTower,
} from "lucide-react";

export type SignalPlatform = {
  key: string;
  label: string;
  value: number;
  source: "live" | "baseline" | "pending";
  detail: string;
  color: string;
  posts?: number;
  views?: number;
};

export type SignalCapacity = {
  capacity: number;
  booked: number;
  remaining: number;
  utilizationPct: number;
  activeClientCount: number;
  status: "open" | "limited" | "full";
  lastUpdated: string;
} | null;

export type LiveSignalAnalyzerProps = {
  platforms: SignalPlatform[];
  capacity: SignalCapacity;
  lastChecked: string;
  liveSourceCount: number;
};

type Tab = "audience" | "capacity" | "actions";

const TAB_META: Record<Tab, { label: string; icon: LucideIcon }> = {
  audience: { label: "Audience", icon: BarChart3 },
  capacity: { label: "Capacity", icon: Gauge },
  actions: { label: "Next move", icon: Activity },
};

function fmt(n: number): string {
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1)}M`;
  if (n >= 1000) return `${(n / 1000).toFixed(n >= 10_000 ? 0 : 1)}K`;
  return String(n);
}

function sourceLabel(source: SignalPlatform["source"]): string {
  if (source === "live") return "Live API";
  if (source === "baseline") return "Manual baseline";
  return "Not connected";
}

export function LiveSignalAnalyzer({
  platforms,
  capacity,
  lastChecked,
  liveSourceCount,
}: LiveSignalAnalyzerProps) {
  const [tab, setTab] = useState<Tab>("audience");

  const connectedPlatforms = platforms.filter((p) => p.source !== "pending");
  const totalMeasured = connectedPlatforms.reduce((sum, p) => sum + p.value, 0);
  const maxValue = Math.max(...connectedPlatforms.map((p) => p.value), 1);

  const actions = useMemo(() => {
    const nextActions: Array<{ title: string; body: string; tone: "cyan" | "accent" | "slate" | "rose" }> = [];
    const youtube = platforms.find((p) => p.key === "youtube");
    const pendingCount = platforms.filter((p) => p.source === "pending").length;

    if (capacity) {
      if (capacity.status === "full") {
        nextActions.push({
          title: "Ryan is full right now",
          body: "Start with the router anyway. It captures your context, shows the right package, and puts you in the cleanest next slot.",
          tone: "rose",
        });
      } else if (capacity.status === "limited") {
        nextActions.push({
          title: "Move before the week fills",
          body: `${capacity.remaining} hours remain this week. If you already know you need help, start with the router and get the right offer in front of you.`,
          tone: "accent",
        });
      } else {
        nextActions.push({
          title: "Find the cleanest offer first",
          body: `${capacity.remaining} hours remain this week. Answer a few practical questions and the site will point you to the package that fits.`,
          tone: "cyan",
        });
      }
    } else {
      nextActions.push({
        title: "Check the live availability page",
        body: "When the workload feed is reachable, the site shows how much room is left before Ryan's 60-hour cap is full.",
        tone: "slate",
      });
    }

    if (youtube?.source === "live" && youtube.posts && youtube.views) {
      const avgViews = Math.round(youtube.views / Math.max(youtube.posts, 1));
      nextActions.push({
        title: "This is proof, not decoration",
        body: `${fmt(avgViews)} average views per published YouTube video from the connected API. The same proof-first thinking is what Ryan applies to your offer.`,
        tone: "cyan",
      });
    } else {
      nextActions.push({
        title: "More live proof gets wired in over time",
        body: "Every connected platform makes this analyzer more useful. Until then, manual baselines stay labeled so the numbers are not pretending.",
        tone: "slate",
      });
    }

    if (pendingCount > 0) {
      nextActions.push({
        title: "Do not wait on perfect data",
        body: `${pendingCount} source${pendingCount === 1 ? "" : "s"} still need live API access. The right first step is still the same: pick the offer and start getting your system organized.`,
        tone: "accent",
      });
    }

    return nextActions.slice(0, 3);
  }, [capacity, platforms]);

  return (
    <div className="rounded-3xl border border-slate-200 bg-gradient-to-br from-slate-50 via-white to-cyan-50 p-5 shadow-[0_24px_60px_-24px_rgba(15,23,42,0.35)] sm:p-6">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-widest text-slate-500">
            <Radar className="h-4 w-4 text-cyan-700" /> Live signal analyzer
          </div>
          <h2 className="mt-2 text-xl font-semibold tracking-tight text-slate-950">
            Real inputs, not a decorative radar.
          </h2>
        </div>
        <div className="inline-flex items-center gap-1.5 rounded-full border border-cyan-200 bg-cyan-50 px-3 py-1 text-xs font-semibold text-cyan-800">
          <span className="h-1.5 w-1.5 rounded-full bg-cyan-500" />
          {liveSourceCount} live source{liveSourceCount === 1 ? "" : "s"}
        </div>
      </div>

      <div className="mt-4 grid grid-cols-3 gap-2 rounded-2xl border border-slate-200 bg-white/75 p-1">
        {(Object.keys(TAB_META) as Tab[]).map((key) => {
          const Icon = TAB_META[key].icon;
          const active = tab === key;
          return (
            <button
              key={key}
              type="button"
              onClick={() => setTab(key)}
              className={
                active
                  ? "inline-flex items-center justify-center gap-1.5 rounded-xl bg-slate-950 px-3 py-2 text-xs font-semibold text-white shadow-sm"
                  : "inline-flex items-center justify-center gap-1.5 rounded-xl px-3 py-2 text-xs font-semibold text-slate-600 hover:bg-slate-100"
              }
            >
              <Icon className="h-3.5 w-3.5" /> {TAB_META[key].label}
            </button>
          );
        })}
      </div>

      <div className="mt-5 min-h-[310px]">
        {tab === "audience" && (
          <div className="space-y-5">
            <div className="grid grid-cols-2 gap-3">
              <Metric label="Measured reach" value={fmt(totalMeasured)} sub="Live + labeled baselines" />
              <Metric label="Platforms tracked" value={String(platforms.length)} sub="Shows source status" />
            </div>

            <div className="space-y-3">
              {platforms.map((platform) => {
                const width = platform.source === "pending"
                  ? 8
                  : Math.max(8, Math.round((platform.value / maxValue) * 100));
                return (
                  <div key={platform.key} className="rounded-2xl border border-slate-200 bg-white p-3">
                    <div className="mb-2 flex items-center justify-between gap-3 text-sm">
                      <div>
                        <div className="font-semibold text-slate-950">{platform.label}</div>
                        <div className="text-[11px] text-slate-500">{platform.detail}</div>
                      </div>
                      <div className="text-right">
                        <div className="font-bold tabular-nums text-slate-950">
                          {platform.source === "pending" ? "Pending" : fmt(platform.value)}
                        </div>
                        <div
                          className={
                            platform.source === "live"
                              ? "text-[10px] font-semibold uppercase tracking-widest text-cyan-700"
                              : platform.source === "baseline"
                                ? "text-[10px] font-semibold uppercase tracking-widest text-slate-500"
                                : "text-[10px] font-semibold uppercase tracking-widest text-accent-600"
                          }
                        >
                          {sourceLabel(platform.source)}
                        </div>
                      </div>
                    </div>
                    <div className="h-2.5 overflow-hidden rounded-full bg-slate-100">
                      <div
                        className="h-full rounded-full"
                        style={{
                          width: `${width}%`,
                          background: platform.source === "pending"
                            ? "repeating-linear-gradient(90deg, #CBD5E1 0 6px, #E2E8F0 6px 12px)"
                            : platform.color,
                        }}
                      />
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {tab === "capacity" && (
          <div className="space-y-5">
            {capacity ? (
              <>
                <div className="grid grid-cols-3 gap-3">
                  <Metric label="Booked" value={`${capacity.booked}h`} sub="This week" />
                  <Metric label="Remaining" value={`${capacity.remaining}h`} sub="Before full" />
                  <Metric label="Active" value={String(capacity.activeClientCount)} sub="Engagements" />
                </div>

                <div className="rounded-3xl border border-slate-200 bg-white p-5">
                  <div className="flex items-center justify-between text-sm">
                    <span className="font-semibold text-slate-950">Weekly utilization</span>
                    <span className="font-bold tabular-nums text-cyan-700">{capacity.utilizationPct}%</span>
                  </div>
                  <div className="mt-3 h-4 overflow-hidden rounded-full border border-slate-200 bg-slate-100">
                    <div
                      className="h-full bg-gradient-to-r from-cyan-400 via-brand-500 to-accent-500"
                      style={{ width: `${capacity.utilizationPct}%` }}
                    />
                  </div>
                  <div className="mt-3 flex items-center justify-between text-xs text-slate-500">
                    <span>0h</span>
                    <span>{capacity.capacity}h cap</span>
                  </div>
                </div>

                <div className="rounded-2xl border border-cyan-200 bg-cyan-50/70 p-4 text-sm text-cyan-950">
                  Status is <strong>{capacity.status}</strong>. Last capacity update:{" "}
                  {new Date(capacity.lastUpdated).toLocaleString()}.
                </div>
              </>
            ) : (
              <EmptyState
                icon={PlugZap}
                title="Capacity source not reachable here"
                body="In production this reads Supabase ClientEngagement data. Locally, the dummy database URL keeps it from loading."
              />
            )}
          </div>
        )}

        {tab === "actions" && (
          <div className="space-y-3">
            {actions.map((action) => (
              <ActionCard key={action.title} {...action} />
            ))}
          </div>
        )}
      </div>

      <div className="mt-5 flex flex-col gap-2 border-t border-slate-200 pt-4 text-[11px] text-slate-500 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-center gap-1.5">
          <Clock className="h-3.5 w-3.5" />
          Last checked {new Date(lastChecked).toLocaleString()}
        </div>
        <div className="flex items-center gap-1.5">
          <RadioTower className="h-3.5 w-3.5" />
          Live sources refresh automatically. Baselines stay labeled.
        </div>
      </div>
    </div>
  );
}

function Metric({ label, value, sub }: { label: string; value: string; sub: string }) {
  return (
    <div className="rounded-2xl border border-slate-200 bg-white p-4">
      <div className="text-2xl font-bold tabular-nums text-slate-950">{value}</div>
      <div className="mt-1 text-xs font-semibold text-slate-700">{label}</div>
      <div className="mt-0.5 text-[10px] text-slate-500">{sub}</div>
    </div>
  );
}

function ActionCard({
  title,
  body,
  tone,
}: {
  title: string;
  body: string;
  tone: "cyan" | "accent" | "slate" | "rose";
}) {
  const styles = {
    cyan: "border-cyan-200 bg-cyan-50 text-cyan-950",
    accent: "border-accent-300 bg-accent-300/20 text-slate-950",
    slate: "border-slate-200 bg-white text-slate-800",
    rose: "border-rose-200 bg-rose-50 text-rose-950",
  }[tone];

  return (
    <div className={`rounded-2xl border p-4 ${styles}`}>
      <div className="flex items-start gap-3">
        <CheckCircle2 className="mt-0.5 h-5 w-5 shrink-0 text-cyan-700" />
        <div>
          <div className="font-semibold">{title}</div>
          <p className="mt-1 text-sm leading-relaxed opacity-80">{body}</p>
        </div>
      </div>
    </div>
  );
}

function EmptyState({
  icon: Icon,
  title,
  body,
}: {
  icon: LucideIcon;
  title: string;
  body: string;
}) {
  return (
    <div className="rounded-3xl border border-dashed border-slate-300 bg-white p-8 text-center">
      <Icon className="mx-auto h-8 w-8 text-cyan-700" />
      <h3 className="mt-3 font-semibold text-slate-950">{title}</h3>
      <p className="mx-auto mt-2 max-w-sm text-sm leading-relaxed text-slate-600">{body}</p>
    </div>
  );
}
