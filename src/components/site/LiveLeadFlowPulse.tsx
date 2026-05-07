"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import {
  Activity,
  ArrowRight,
  BarChart3,
  CalendarCheck,
  Gauge,
  MousePointerClick,
  RadioTower,
  RotateCw,
  Users,
} from "lucide-react";

type PulseTab = "live" | "views" | "clicks";

type PulseSnapshot = {
  source: "live" | "offline";
  activeNow: number;
  viewsToday: number;
  visitorsToday: number;
  totalViews: number;
  returningVisitors: number;
  serviceClicksToday: number;
  bookClicksToday: number;
  capacityClicksToday: number;
  updatedAt: string;
  hourly: Array<{ label: string; views: number; visitors: number }>;
  topPaths: Array<{ path: string; views: number }>;
  recent: Array<{ eventType: string; path: string; createdAt: string }>;
};

type SignalCapacity = {
  capacity: number;
  booked: number;
  remaining: number;
  utilizationPct: number;
  activeClientCount: number;
  status: "open" | "limited" | "full";
  lastUpdated: string;
} | null;

const EMPTY_SNAPSHOT: PulseSnapshot = {
  source: "offline",
  activeNow: 0,
  viewsToday: 0,
  visitorsToday: 0,
  totalViews: 0,
  returningVisitors: 0,
  serviceClicksToday: 0,
  bookClicksToday: 0,
  capacityClicksToday: 0,
  updatedAt: "1970-01-01T00:00:00.000Z",
  hourly: Array.from({ length: 12 }, (_, index) => ({
    label: `${index + 1}`,
    views: 0,
    visitors: 0,
  })),
  topPaths: [],
  recent: [],
};

function fmt(value: number) {
  if (value >= 1_000_000) return `${(value / 1_000_000).toFixed(1)}M`;
  if (value >= 10_000) return `${Math.round(value / 1000)}K`;
  if (value >= 1000) return `${(value / 1000).toFixed(1)}K`;
  return value.toLocaleString();
}

function getVisitorId() {
  const key = "leadflow_public_visitor_id";
  const existing = window.localStorage.getItem(key);
  if (existing) return existing;

  const next =
    typeof window.crypto?.randomUUID === "function"
      ? window.crypto.randomUUID()
      : `${Date.now()}-${Math.random().toString(36).slice(2)}`;

  window.localStorage.setItem(key, next);
  return next;
}

function eventLabel(eventType: string) {
  const labels: Record<string, string> = {
    view: "New view",
    heartbeat: "Still watching",
    cta_start: "Picked service",
    cta_book: "Opened calendar",
    cta_capacity: "Checked capacity",
    tab_live: "Checked live",
    tab_views: "Checked views",
    tab_clicks: "Checked clicks",
  };
  return labels[eventType] ?? "Site action";
}

async function sendPulse(eventType: string, path?: string) {
  const visitorId = getVisitorId();
  const payload = {
    visitorId,
    eventType,
    path: path ?? window.location.pathname,
    source: "homepage-counter",
  };

  const response = await fetch("/api/site-pulse", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
    cache: "no-store",
  });

  if (!response.ok) throw new Error("Pulse request failed");
  return (await response.json()) as PulseSnapshot;
}

function beaconPulse(eventType: string, path: string) {
  if (typeof window === "undefined") return;
  const payload = JSON.stringify({
    visitorId: getVisitorId(),
    eventType,
    path,
    source: "homepage-counter",
  });
  const body = new Blob([payload], { type: "application/json" });

  if (navigator.sendBeacon) {
    navigator.sendBeacon("/api/site-pulse", body);
    return;
  }

  fetch("/api/site-pulse", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: payload,
    keepalive: true,
  }).catch(() => undefined);
}

export function LiveLeadFlowPulse({ capacity }: { capacity: SignalCapacity }) {
  const [snapshot, setSnapshot] = useState<PulseSnapshot>(EMPTY_SNAPSHOT);
  const [tab, setTab] = useState<PulseTab>("live");
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let mounted = true;

    sendPulse("view")
      .then((next) => {
        if (mounted) setSnapshot(next);
      })
      .catch(() => {
        if (mounted) setSnapshot(EMPTY_SNAPSHOT);
      })
      .finally(() => {
        if (mounted) setLoading(false);
      });

    const interval = window.setInterval(() => {
      sendPulse("heartbeat")
        .then((next) => {
          if (mounted) setSnapshot(next);
        })
        .catch(() => undefined);
    }, 25_000);

    return () => {
      mounted = false;
      window.clearInterval(interval);
    };
  }, []);

  const maxHour = useMemo(
    () => Math.max(...snapshot.hourly.map((hour) => hour.views), 1),
    [snapshot.hourly],
  );

  const totalClicks =
    snapshot.serviceClicksToday + snapshot.bookClicksToday + snapshot.capacityClicksToday;

  function changeTab(next: PulseTab) {
    setTab(next);
    beaconPulse(`tab_${next}`, window.location.pathname);
  }

  return (
    <div className="rounded-3xl border border-slate-200 bg-gradient-to-br from-slate-950 via-brand-950 to-slate-900 p-5 text-white shadow-[0_24px_70px_-24px_rgba(15,23,42,0.70)] sm:p-6">
      <div className="flex items-start justify-between gap-4">
        <div>
          <div className="inline-flex items-center gap-2 text-xs font-semibold uppercase tracking-widest text-cyan-200">
            <RadioTower className="h-4 w-4" /> Live LeadFlow Counter
          </div>
          <h2 className="mt-2 text-2xl font-semibold tracking-tight">
            Watch real visitors move the board.
          </h2>
        </div>
        <div
          className={
            snapshot.source === "live"
              ? "inline-flex items-center gap-1.5 rounded-full border border-cyan-300/40 bg-cyan-300/10 px-3 py-1 text-xs font-semibold text-cyan-100"
              : "inline-flex items-center gap-1.5 rounded-full border border-accent-300/50 bg-accent-300/10 px-3 py-1 text-xs font-semibold text-accent-100"
          }
        >
          <span className="h-1.5 w-1.5 rounded-full bg-cyan-300 shadow-[0_0_16px_rgba(92,208,255,0.95)]" />
          {snapshot.source === "live" ? "real feed" : "connecting"}
        </div>
      </div>

      <div className="mt-5 grid grid-cols-[1fr_auto] items-center gap-4 rounded-3xl border border-cyan-300/20 bg-white/[0.06] p-4">
        <div>
          <div className="text-sm font-medium text-cyan-100">Watching now</div>
          <div className="mt-1 text-6xl font-semibold tabular-nums tracking-tight">
            {loading ? "..." : fmt(snapshot.activeNow)}
          </div>
          <div className="mt-2 text-xs leading-relaxed text-slate-300">
            Counts anonymous visitors active in the last 2 minutes.
          </div>
        </div>
        <div className="relative h-24 w-24">
          <div className="absolute inset-0 rounded-full border border-cyan-300/30" />
          <div className="absolute inset-2 rounded-full border border-cyan-300/20" />
          <div className="absolute inset-4 animate-pulse rounded-full bg-cyan-300/20 shadow-[0_0_38px_rgba(92,208,255,0.55)]" />
          <Users className="absolute left-1/2 top-1/2 h-8 w-8 -translate-x-1/2 -translate-y-1/2 text-cyan-100" />
        </div>
      </div>

      <div className="mt-4 grid grid-cols-3 gap-2 rounded-2xl border border-white/10 bg-white/[0.05] p-1">
        <PulseTabButton active={tab === "live"} label="Live" onClick={() => changeTab("live")} />
        <PulseTabButton active={tab === "views"} label="Views" onClick={() => changeTab("views")} />
        <PulseTabButton active={tab === "clicks"} label="Clicks" onClick={() => changeTab("clicks")} />
      </div>

      <div className="mt-5 min-h-[250px]">
        {tab === "live" && (
          <div className="space-y-4">
            <div className="grid grid-cols-3 gap-2">
              <PulseMetric label="Today" value={fmt(snapshot.viewsToday)} />
              <PulseMetric label="Visitors" value={fmt(snapshot.visitorsToday)} />
              <PulseMetric label="All-time" value={fmt(snapshot.totalViews)} />
            </div>

            <div className="rounded-3xl border border-white/10 bg-white/[0.05] p-4">
              <div className="mb-3 flex items-center justify-between gap-3">
                <div className="text-sm font-semibold text-white">Last 12 hours</div>
                <div className="text-xs text-slate-300">Views by hour</div>
              </div>
              <div className="flex h-28 items-end gap-2">
                {snapshot.hourly.map((hour, index) => (
                  <div key={`${hour.label}-${index}`} className="flex flex-1 flex-col items-center gap-2">
                    <div className="flex h-20 w-full items-end rounded-full bg-white/[0.06]">
                      <div
                        className="w-full rounded-full bg-gradient-to-t from-accent-400 via-cyan-400 to-cyan-200"
                        style={{
                          height: `${Math.max(8, Math.round((hour.views / maxHour) * 100))}%`,
                        }}
                      />
                    </div>
                    <div className="text-[10px] text-slate-400">{hour.label}</div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}

        {tab === "views" && (
          <div className="space-y-3">
            <div className="grid grid-cols-2 gap-3">
              <PulseDetail Icon={BarChart3} label="Views today" value={fmt(snapshot.viewsToday)} />
              <PulseDetail Icon={RotateCw} label="Return viewers" value={fmt(snapshot.returningVisitors)} />
            </div>
            <div className="rounded-3xl border border-white/10 bg-white/[0.05] p-4">
              <div className="mb-3 text-sm font-semibold">Top pages today</div>
              {snapshot.topPaths.length ? (
                <div className="space-y-3">
                  {snapshot.topPaths.map((row) => (
                    <div key={row.path}>
                      <div className="mb-1 flex items-center justify-between gap-3 text-xs">
                        <span className="truncate text-slate-200">{row.path}</span>
                        <span className="font-semibold tabular-nums text-white">{fmt(row.views)}</span>
                      </div>
                      <div className="h-2 overflow-hidden rounded-full bg-white/10">
                        <div
                          className="h-full rounded-full bg-cyan-300"
                          style={{
                            width: `${Math.max(
                              8,
                              Math.round((row.views / Math.max(snapshot.viewsToday, 1)) * 100),
                            )}%`,
                          }}
                        />
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-sm text-slate-300">
                  The counter starts with the next real visitors after deployment.
                </p>
              )}
            </div>
          </div>
        )}

        {tab === "clicks" && (
          <div className="space-y-3">
            <div className="grid grid-cols-3 gap-2">
              <PulseMetric label="Services" value={fmt(snapshot.serviceClicksToday)} />
              <PulseMetric label="Calendar" value={fmt(snapshot.bookClicksToday)} />
              <PulseMetric label="Capacity" value={fmt(snapshot.capacityClicksToday)} />
            </div>
            <div className="rounded-3xl border border-white/10 bg-white/[0.05] p-4">
              <div className="mb-3 text-sm font-semibold">Recent public activity</div>
              <div className="space-y-2">
                {snapshot.recent.length ? (
                  snapshot.recent.slice(0, 5).map((event, index) => (
                    <div
                      key={`${event.createdAt}-${index}`}
                      className="flex items-center justify-between gap-3 rounded-2xl bg-white/[0.06] px-3 py-2 text-xs"
                    >
                      <span className="font-semibold text-white">{eventLabel(event.eventType)}</span>
                      <span className="truncate text-slate-300">{event.path}</span>
                    </div>
                  ))
                ) : (
                  <p className="text-sm text-slate-300">
                    CTA clicks will show here as people interact with the top screen.
                  </p>
                )}
              </div>
            </div>
          </div>
        )}
      </div>

      <div className="mt-5 grid grid-cols-3 gap-2">
        <PulseAction
          href="/start"
          eventType="cta_start"
          label="Pick service"
          Icon={MousePointerClick}
        />
        <PulseAction href="/book" eventType="cta_book" label="Book call" Icon={CalendarCheck} />
        <PulseAction href="/availability" eventType="cta_capacity" label="Capacity" Icon={Gauge} />
      </div>

      <div className="mt-4 rounded-2xl border border-white/10 bg-white/[0.05] p-3 text-xs leading-relaxed text-slate-300">
        {capacity ? (
          <>
            Ryan has{" "}
            <strong className="text-white tabular-nums">{capacity.remaining} hours</strong> left
            this week. The counter shows whether people are watching, clicking, and moving toward
            those slots.
          </>
        ) : (
          <>No fake traffic. If the live database is unreachable, the board says it is connecting.</>
        )}
      </div>

      <div className="mt-3 flex items-center justify-between text-[11px] text-slate-400">
        <span>
          {loading ? "Connecting live feed" : `Updated ${new Date(snapshot.updatedAt).toLocaleTimeString()}`}
        </span>
        <span>{totalClicks} tracked CTA clicks today</span>
      </div>
    </div>
  );
}

function PulseTabButton({
  active,
  label,
  onClick,
}: {
  active: boolean;
  label: string;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={
        active
          ? "rounded-xl bg-cyan-300 px-3 py-2 text-xs font-bold text-slate-950 shadow-lg shadow-cyan-950/20"
          : "rounded-xl px-3 py-2 text-xs font-semibold text-slate-300 hover:bg-white/10 hover:text-white"
      }
    >
      {label}
    </button>
  );
}

function PulseMetric({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-2xl border border-white/10 bg-white/[0.06] p-3">
      <div className="text-2xl font-bold tabular-nums text-white">{value}</div>
      <div className="mt-1 text-[11px] font-semibold uppercase tracking-widest text-slate-400">
        {label}
      </div>
    </div>
  );
}

function PulseDetail({
  Icon,
  label,
  value,
}: {
  Icon: typeof Activity;
  label: string;
  value: string;
}) {
  return (
    <div className="rounded-3xl border border-white/10 bg-white/[0.06] p-4">
      <Icon className="h-5 w-5 text-cyan-200" />
      <div className="mt-3 text-3xl font-bold tabular-nums">{value}</div>
      <div className="mt-1 text-xs text-slate-300">{label}</div>
    </div>
  );
}

function PulseAction({
  href,
  eventType,
  label,
  Icon,
}: {
  href: string;
  eventType: "cta_start" | "cta_book" | "cta_capacity";
  label: string;
  Icon: typeof Activity;
}) {
  return (
    <Link
      href={href}
      onClick={() => beaconPulse(eventType, href)}
      className="group inline-flex min-h-14 items-center justify-center gap-2 rounded-2xl bg-white px-3 py-3 text-center text-xs font-bold text-slate-950 shadow-lg shadow-black/20 hover:bg-cyan-50"
    >
      <Icon className="h-4 w-4 text-cyan-700" />
      <span>{label}</span>
      <ArrowRight className="hidden h-3.5 w-3.5 text-slate-400 transition group-hover:translate-x-0.5 sm:block" />
    </Link>
  );
}
