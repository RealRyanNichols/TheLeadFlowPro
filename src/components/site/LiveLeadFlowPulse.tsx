"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import {
  Activity,
  ArrowRight,
  BarChart3,
  Brain,
  CalendarCheck,
  Clock3,
  Copy,
  ExternalLink,
  Flame,
  Gauge,
  Link2,
  Lightbulb,
  LockKeyhole,
  MessageSquareText,
  MousePointerClick,
  RadioTower,
  RotateCw,
  Share2,
  Sparkles,
  ShoppingCart,
  Trophy,
  Users,
} from "lucide-react";

type PulseTab = "live" | "views" | "clicks" | "share" | "learn";

type PulseSnapshot = {
  source: "live" | "offline";
  offlineReason?: string;
  offlineDetail?: string;
  trackingStartedAt: string | null;
  historyDays: number;
  activeNow: number;
  viewsToday: number;
  visitorsToday: number;
  totalViews: number;
  importedViews: number;
  returningVisitors: number;
  serviceClicksToday: number;
  bookClicksToday: number;
  capacityClicksToday: number;
  checkoutClicksToday: number;
  purchaseSignalsToday: number;
  chatQuestionsToday: number;
  trackedActionsToday: number;
  allClicksToday: number;
  formInteractionsToday: number;
  scrollDepthSignalsToday: number;
  toolInteractionsToday: number;
  shareCreatesToday: number;
  shareClicksToday: number;
  socialShareViewsToday: number;
  totalShareClicks: number;
  engagementSecondsToday: number;
  totalEngagementSeconds: number;
  updatedAt: string;
  hourly: Array<{ label: string; views: number; visitors: number }>;
  daily: Array<{
    date: string;
    label: string;
    views: number;
    visitors: number;
    serviceClicks: number;
    bookClicks: number;
    capacityClicks: number;
    checkoutClicks: number;
    purchaseSignals: number;
    chatQuestions: number;
    trackedActions: number;
    allClicks: number;
    formInteractions: number;
    toolInteractions: number;
    engagementSeconds: number;
    liveViews: number;
    importedViews: number;
  }>;
  topPaths: Array<{ path: string; views: number }>;
  topIntentPaths: Array<{
    path: string;
    views: number;
    clicks: number;
    engagementSeconds: number;
  }>;
  topQuestionTopics: Array<{ topic: string; count: number }>;
  topShares: Array<{
    token: string;
    platform: string;
    path: string;
    shares: number;
    clicks: number;
    reportedViews: number;
  }>;
  learning: {
    trackingStartedAt: string | null;
    historyDays: number;
    strongestPath: {
      path: string;
      views: number;
      clicks: number;
      engagementSeconds: number;
    } | null;
    longestWatchedPath: { path: string; engagementSeconds: number } | null;
    topQuestionTopic: { topic: string; count: number } | null;
    recommendedActions: Array<{
      priority: "high" | "medium" | "watch";
      title: string;
      body: string;
      evidence: string;
    }>;
  };
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
  trackingStartedAt: null,
  historyDays: 0,
  activeNow: 0,
  viewsToday: 0,
  visitorsToday: 0,
  totalViews: 0,
  importedViews: 0,
  returningVisitors: 0,
  serviceClicksToday: 0,
  bookClicksToday: 0,
  capacityClicksToday: 0,
  checkoutClicksToday: 0,
  purchaseSignalsToday: 0,
  chatQuestionsToday: 0,
  trackedActionsToday: 0,
  allClicksToday: 0,
  formInteractionsToday: 0,
  scrollDepthSignalsToday: 0,
  toolInteractionsToday: 0,
  shareCreatesToday: 0,
  shareClicksToday: 0,
  socialShareViewsToday: 0,
  totalShareClicks: 0,
  engagementSecondsToday: 0,
  totalEngagementSeconds: 0,
  updatedAt: "1970-01-01T00:00:00.000Z",
  hourly: Array.from({ length: 12 }, (_, index) => ({
    label: `${index + 1}`,
    views: 0,
    visitors: 0,
  })),
  daily: Array.from({ length: 7 }, (_, index) => ({
    date: "",
    label: `${index + 1}`,
    views: 0,
    visitors: 0,
    serviceClicks: 0,
    bookClicks: 0,
    capacityClicks: 0,
    checkoutClicks: 0,
    purchaseSignals: 0,
    chatQuestions: 0,
    trackedActions: 0,
    allClicks: 0,
    formInteractions: 0,
    toolInteractions: 0,
    engagementSeconds: 0,
    liveViews: 0,
    importedViews: 0,
  })),
  topPaths: [],
  topIntentPaths: [],
  topQuestionTopics: [],
  topShares: [],
  learning: {
    trackingStartedAt: null,
    historyDays: 0,
    strongestPath: null,
    longestWatchedPath: null,
    topQuestionTopic: null,
    recommendedActions: [],
  },
  recent: [],
};

function fmt(value: number) {
  if (value >= 1_000_000) return `${(value / 1_000_000).toFixed(1)}M`;
  if (value >= 10_000) return `${Math.round(value / 1000)}K`;
  if (value >= 1000) return `${(value / 1000).toFixed(1)}K`;
  return value.toLocaleString();
}

function fmtDuration(seconds: number) {
  if (seconds >= 3600) return `${(seconds / 3600).toFixed(seconds >= 36_000 ? 0 : 1)}h`;
  if (seconds >= 60) return `${Math.round(seconds / 60)}m`;
  return `${seconds}s`;
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
    engagement: "Engaged time",
    cta_start: "Picked service",
    cta_book: "Opened calendar",
    cta_capacity: "Checked capacity",
    cta_pulse: "Opened pulse board",
    cta_service: "Opened service page",
    cta_contact: "Opened contact",
    cta_checkout: "Started checkout",
    purchase_complete: "Purchase returned",
    chat_open: "Opened chat",
    chat_question: "Asked a question",
    chat_cta: "Chat CTA click",
    click: "Clicked page",
    form_interaction: "Touched form",
    scroll_depth: "Scrolled deeper",
    tool_interaction: "Used tool",
    share_create: "Shared pulse",
    share_click: "Clicked shared pulse",
    share_view_import: "Imported social views",
    api_sync: "API sync",
    tab_live: "Checked live",
    tab_views: "Checked views",
    tab_clicks: "Checked clicks",
    tab_share: "Checked shares",
    tab_learn: "Checked learning",
  };
  return labels[eventType] ?? "Site action";
}

async function fetchPulse() {
  const response = await fetch("/api/site-pulse", {
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
  const [shareStatus, setShareStatus] = useState<string | null>(null);
  const [sharingPlatform, setSharingPlatform] = useState<string | null>(null);
  const [sessionSeconds, setSessionSeconds] = useState(0);
  const [sessionActions, setSessionActions] = useState(0);

  useEffect(() => {
    let mounted = true;

    fetchPulse()
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
      fetchPulse()
        .then((next) => {
          if (mounted) setSnapshot(next);
        })
        .catch(() => undefined);
    }, 10_000);

    return () => {
      mounted = false;
      window.clearInterval(interval);
    };
  }, []);

  useEffect(() => {
    const interval = window.setInterval(() => {
      if (document.visibilityState !== "visible") return;
      setSessionSeconds((seconds) => seconds + 1);
    }, 1000);

    return () => {
      window.clearInterval(interval);
    };
  }, []);

  const maxHour = useMemo(
    () => Math.max(...snapshot.hourly.map((hour) => hour.views), 1),
    [snapshot.hourly],
  );
  const recentDaily = useMemo(() => snapshot.daily.slice(-14), [snapshot.daily]);
  const maxDay = useMemo(
    () => Math.max(...recentDaily.map((day) => day.views), 1),
    [recentDaily],
  );

  const totalClicks =
    snapshot.serviceClicksToday +
    snapshot.bookClicksToday +
    snapshot.capacityClicksToday +
    snapshot.checkoutClicksToday +
    snapshot.chatQuestionsToday +
    snapshot.shareClicksToday;

  const sessionPoints = Math.min(999, Math.floor(sessionSeconds / 10) + sessionActions * 5);
  const nextMilestone = sessionPoints < 25 ? 25 : sessionPoints < 75 ? 75 : sessionPoints < 150 ? 150 : 300;
  const rewardProgress = Math.min(100, Math.round((sessionPoints / nextMilestone) * 100));
  const rewardTitle =
    sessionPoints >= 150
      ? "Builder signal"
      : sessionPoints >= 75
        ? "Share scout"
        : sessionPoints >= 25
          ? "Signal reader"
          : "First signal";

  function changeTab(next: PulseTab) {
    setTab(next);
    setSessionActions((actions) => actions + 1);
    beaconPulse(`tab_${next}`, window.location.pathname);
  }

  async function createShare(platform: string) {
    setSharingPlatform(platform);
    setShareStatus(null);

    try {
      const response = await fetch("/api/pulse-share", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          visitorId: getVisitorId(),
          platform,
          path: "/pulse",
          title: "The LeadFlow Pro Live Counter",
        }),
      });
      const data = (await response.json()) as {
        ok?: boolean;
        shareUrl?: string;
        intentUrl?: string;
        text?: string;
      };

      if (!response.ok || !data.ok || !data.shareUrl) throw new Error("Share link failed");

      const shareText = data.text ? `${data.text} ${data.shareUrl}` : data.shareUrl;
      if (platform === "copy") {
        await navigator.clipboard?.writeText(shareText);
        setShareStatus("Share link copied. Click-backs will show on this board.");
      } else if (platform === "native" && navigator.share) {
        await navigator.share({
          title: "The LeadFlow Pro Live Counter",
          text: data.text,
          url: data.shareUrl,
        });
        setShareStatus("Native share opened. Click-backs will show on this board.");
      } else if (data.intentUrl) {
        window.open(data.intentUrl, "_blank", "noopener,noreferrer");
        setShareStatus("Share window opened. Click-backs will show on this board.");
      }

      fetchPulse()
        .then((next) => setSnapshot(next))
        .catch(() => undefined);
      setSessionActions((actions) => actions + 3);
    } catch {
      setShareStatus("Share link could not be created. Try again in a minute.");
    } finally {
      setSharingPlatform(null);
    }
  }

  return (
    <div className="rounded-3xl border border-slate-200 bg-gradient-to-br from-slate-950 via-brand-950 to-slate-900 p-4 text-white shadow-[0_24px_70px_-24px_rgba(15,23,42,0.70)] sm:p-5">
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

      <div className="mt-4 grid grid-cols-[1fr_auto] items-center gap-4 rounded-3xl border border-cyan-300/20 bg-white/[0.06] p-4">
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

      <div className="mt-3 rounded-3xl border border-accent-300/20 bg-gradient-to-br from-accent-300/15 to-cyan-300/10 p-4">
        <div className="flex items-start justify-between gap-3">
          <div>
            <div className="inline-flex items-center gap-2 text-xs font-semibold uppercase tracking-widest text-accent-100">
              <Trophy className="h-4 w-4" />
              Proof Points beta
            </div>
            <div className="mt-1 text-sm font-semibold text-white">
              Stay, click, share, learn. The board gives you credit.
            </div>
          </div>
          <div className="text-right">
            <div className="text-3xl font-semibold tabular-nums text-accent-100">{sessionPoints}</div>
            <div className="text-[10px] font-semibold uppercase tracking-widest text-slate-300">points</div>
          </div>
        </div>
        <div className="mt-3 h-2 overflow-hidden rounded-full bg-white/10">
          <div
            className="h-full rounded-full bg-gradient-to-r from-cyan-300 via-accent-200 to-accent-400"
            style={{ width: `${Math.max(6, rewardProgress)}%` }}
          />
        </div>
        <div className="mt-3 grid gap-2 text-xs text-slate-300 sm:grid-cols-[1fr_auto] sm:items-center">
          <div className="inline-flex items-center gap-2">
            <Flame className="h-4 w-4 text-accent-200" />
            <span>
              {rewardTitle}. {Math.max(0, nextMilestone - sessionPoints)} points to the next unlock.
            </span>
          </div>
          <Link
            href="/rewards"
            className="inline-flex items-center justify-center gap-1 rounded-full border border-white/10 bg-white/[0.08] px-3 py-1.5 font-semibold text-cyan-100 hover:bg-white/[0.12]"
          >
            <LockKeyhole className="h-3.5 w-3.5" />
            How it stays safe
          </Link>
        </div>
        <div className="mt-2 inline-flex items-center gap-2 text-[11px] text-slate-400">
          <Sparkles className="h-3.5 w-3.5 text-cyan-200" />
          Off-chain, no cash value, no public edits. This tests the reward loop before any token decision.
        </div>
      </div>

      <div className="mt-4 grid grid-cols-5 gap-2 rounded-2xl border border-white/10 bg-white/[0.05] p-1">
        <PulseTabButton active={tab === "live"} label="Live" onClick={() => changeTab("live")} />
        <PulseTabButton active={tab === "views"} label="Views" onClick={() => changeTab("views")} />
        <PulseTabButton active={tab === "clicks"} label="Clicks" onClick={() => changeTab("clicks")} />
        <PulseTabButton active={tab === "share"} label="Share" onClick={() => changeTab("share")} />
        <PulseTabButton active={tab === "learn"} label="Learn" onClick={() => changeTab("learn")} />
      </div>

      <div className="mt-4 min-h-[220px]">
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

            <div className="rounded-3xl border border-white/10 bg-white/[0.05] p-4">
              <div className="mb-3 flex items-center justify-between gap-3">
                <div className="text-sm font-semibold text-white">Recent daily history</div>
                <div className="text-xs text-slate-300">
                  {snapshot.historyDays
                    ? `${snapshot.historyDays.toLocaleString()} days tracked`
                    : "Live + imported"}
                </div>
              </div>
              <div className="flex h-24 items-end gap-2">
                {recentDaily.map((day, index) => (
                  <div key={`${day.date || day.label}-${index}`} className="flex flex-1 flex-col items-center gap-2">
                    <div className="flex h-16 w-full items-end overflow-hidden rounded-full bg-white/[0.06]">
                      <div
                        className="w-full rounded-full bg-gradient-to-t from-cyan-500 via-cyan-300 to-accent-200"
                        style={{
                          height: `${Math.max(8, Math.round((day.views / maxDay) * 100))}%`,
                        }}
                        title={`${day.views.toLocaleString()} views`}
                      />
                    </div>
                    <div className="text-[10px] text-slate-400">{day.label}</div>
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
              <div className="mb-3 flex items-center justify-between gap-3">
                <div className="text-sm font-semibold">Backdated daily stats</div>
                <div className="text-xs text-slate-300">
                  {snapshot.importedViews
                    ? `${fmt(snapshot.importedViews)} imported views`
                    : `Showing latest ${recentDaily.length || 0}`}
                </div>
              </div>
              <div className="space-y-2">
                {recentDaily.map((day) => (
                  <div key={day.date || day.label}>
                    <div className="mb-1 flex items-center justify-between gap-3 text-xs">
                      <span className="text-slate-200">{day.label}</span>
                      <span className="font-semibold tabular-nums text-white">
                        {fmt(day.views)} views
                        {day.importedViews ? (
                          <span className="ml-1 font-medium text-cyan-200">
                            ({fmt(day.importedViews)} imported)
                          </span>
                        ) : null}
                      </span>
                    </div>
                    <div className="h-2 overflow-hidden rounded-full bg-white/10">
                      <div
                        className="h-full rounded-full bg-cyan-300"
                        style={{ width: `${Math.max(6, Math.round((day.views / maxDay) * 100))}%` }}
                      />
                    </div>
                  </div>
                ))}
              </div>
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
              <PulseMetric label="All clicks" value={fmt(snapshot.allClicksToday)} />
              <PulseMetric label="Tool uses" value={fmt(snapshot.toolInteractionsToday)} />
              <PulseMetric label="Forms" value={fmt(snapshot.formInteractionsToday)} />
            </div>
            <div className="grid grid-cols-3 gap-2">
              <PulseMetric label="Services" value={fmt(snapshot.serviceClicksToday)} />
              <PulseMetric label="Calendar" value={fmt(snapshot.bookClicksToday)} />
              <PulseMetric label="Checkout" value={fmt(snapshot.checkoutClicksToday)} />
            </div>
            <div className="grid grid-cols-3 gap-2">
              <PulseMetric label="Scrolls" value={fmt(snapshot.scrollDepthSignalsToday)} />
              <PulseMetric label="Questions" value={fmt(snapshot.chatQuestionsToday)} />
              <PulseMetric label="Tracked" value={fmt(snapshot.trackedActionsToday)} />
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

        {tab === "learn" && (
          <div className="space-y-3">
            <div className="grid grid-cols-3 gap-2">
              <PulseDetail
                Icon={Clock3}
                label="Engaged time"
                value={fmtDuration(snapshot.totalEngagementSeconds)}
              />
              <PulseDetail Icon={ShoppingCart} label="Checkout starts" value={fmt(snapshot.checkoutClicksToday)} />
              <PulseDetail Icon={MessageSquareText} label="Questions today" value={fmt(snapshot.chatQuestionsToday)} />
            </div>

            <div className="rounded-3xl border border-white/10 bg-white/[0.05] p-4">
              <div className="mb-3 flex items-center justify-between gap-3">
                <div className="inline-flex items-center gap-2 text-sm font-semibold text-white">
                  <Brain className="h-4 w-4 text-cyan-200" />
                  What the site is learning
                </div>
                <div className="text-xs text-slate-300">
                  {snapshot.trackingStartedAt
                    ? `Since ${snapshot.trackingStartedAt}`
                    : "Waiting on first signal"}
                </div>
              </div>

              <div className="space-y-2">
                {snapshot.learning.recommendedActions.length ? (
                  snapshot.learning.recommendedActions.map((action) => (
                    <div
                      key={`${action.title}-${action.evidence}`}
                      className="rounded-2xl border border-white/10 bg-white/[0.06] p-3"
                    >
                      <div className="flex items-start gap-2">
                        <span
                          className={
                            action.priority === "high"
                              ? "mt-1 h-2 w-2 rounded-full bg-accent-300 shadow-[0_0_18px_rgba(255,214,107,0.85)]"
                              : action.priority === "medium"
                                ? "mt-1 h-2 w-2 rounded-full bg-cyan-300"
                                : "mt-1 h-2 w-2 rounded-full bg-slate-400"
                          }
                        />
                        <div>
                          <div className="text-sm font-semibold text-white">{action.title}</div>
                          <p className="mt-1 text-xs leading-relaxed text-slate-300">{action.body}</p>
                          <div className="mt-2 text-[11px] font-semibold uppercase tracking-widest text-cyan-200">
                            {action.evidence}
                          </div>
                        </div>
                      </div>
                    </div>
                  ))
                ) : (
                  <p className="text-sm text-slate-300">
                    The learning loop starts recommending moves after it sees real views, clicks,
                    watch time, chat topics, and checkout starts.
                  </p>
                )}
              </div>
            </div>

            <div className="grid gap-3 sm:grid-cols-2">
              <div className="rounded-3xl border border-white/10 bg-white/[0.05] p-4">
                <div className="mb-3 text-sm font-semibold">Highest-intent paths</div>
                <div className="space-y-2">
                  {snapshot.topIntentPaths.length ? (
                    snapshot.topIntentPaths.slice(0, 4).map((row) => (
                      <div key={row.path} className="rounded-2xl bg-white/[0.06] px-3 py-2 text-xs">
                        <div className="flex items-center justify-between gap-3">
                          <span className="truncate font-semibold text-white">{row.path}</span>
                          <span className="tabular-nums text-cyan-200">{fmt(row.clicks)} clicks</span>
                        </div>
                        <div className="mt-1 text-slate-400">
                          {fmt(row.views)} views · {fmtDuration(row.engagementSeconds)} engaged
                        </div>
                      </div>
                    ))
                  ) : (
                    <p className="text-sm text-slate-300">No intent paths ranked yet.</p>
                  )}
                </div>
              </div>

              <div className="rounded-3xl border border-white/10 bg-white/[0.05] p-4">
                <div className="mb-3 inline-flex items-center gap-2 text-sm font-semibold">
                  <Lightbulb className="h-4 w-4 text-accent-200" />
                  Question topics
                </div>
                <div className="space-y-2">
                  {snapshot.topQuestionTopics.length ? (
                    snapshot.topQuestionTopics.map((row) => (
                      <div key={row.topic}>
                        <div className="mb-1 flex items-center justify-between gap-3 text-xs">
                          <span className="text-slate-200">{row.topic}</span>
                          <span className="font-semibold tabular-nums text-white">{fmt(row.count)}</span>
                        </div>
                        <div className="h-2 overflow-hidden rounded-full bg-white/10">
                          <div
                            className="h-full rounded-full bg-accent-300"
                            style={{
                              width: `${Math.max(
                                8,
                                Math.round(
                                  (row.count / Math.max(snapshot.topQuestionTopics[0]?.count ?? 1, 1)) * 100,
                                ),
                              )}%`,
                            }}
                          />
                        </div>
                      </div>
                    ))
                  ) : (
                    <p className="text-sm text-slate-300">
                      Chat questions are classified by topic, not stored here as raw private messages.
                    </p>
                  )}
                </div>
              </div>
            </div>
          </div>
        )}

        {tab === "share" && (
          <div className="space-y-3">
            <div className="rounded-3xl border border-cyan-300/20 bg-cyan-300/10 p-4">
              <div className="inline-flex items-center gap-2 text-sm font-semibold text-cyan-100">
                <Share2 className="h-4 w-4" />
                Make the proof object travel
              </div>
              <h3 className="mt-2 text-xl font-semibold tracking-tight text-white">
                One site. One page. One post. Track the attention back here.
              </h3>
              <p className="mt-2 text-sm leading-relaxed text-slate-300">
                These buttons create tracked links for the live counter. We can measure every
                click-back. Platform views are imported only when the social platform gives us an
                API number or you import the post stats.
              </p>

              <div className="mt-4 grid grid-cols-2 gap-2 sm:grid-cols-4">
                <ShareButton
                  label="Share to X"
                  platform="x"
                  active={sharingPlatform === "x"}
                  onClick={createShare}
                  Icon={ExternalLink}
                />
                <ShareButton
                  label="Facebook"
                  platform="facebook"
                  active={sharingPlatform === "facebook"}
                  onClick={createShare}
                  Icon={ExternalLink}
                />
                <ShareButton
                  label="LinkedIn"
                  platform="linkedin"
                  active={sharingPlatform === "linkedin"}
                  onClick={createShare}
                  Icon={ExternalLink}
                />
                <ShareButton
                  label="Copy link"
                  platform="copy"
                  active={sharingPlatform === "copy"}
                  onClick={createShare}
                  Icon={Copy}
                />
              </div>

              {shareStatus ? (
                <div className="mt-3 rounded-2xl border border-white/10 bg-white/[0.08] px-3 py-2 text-xs text-cyan-100">
                  {shareStatus}
                </div>
              ) : null}
            </div>

            <div className="grid grid-cols-3 gap-2">
              <PulseMetric label="Shares today" value={fmt(snapshot.shareCreatesToday)} />
              <PulseMetric label="Click-backs" value={fmt(snapshot.shareClicksToday)} />
              <PulseMetric label="Social views" value={fmt(snapshot.socialShareViewsToday)} />
            </div>

            <div className="rounded-3xl border border-white/10 bg-white/[0.05] p-4">
              <div className="mb-3 flex items-center justify-between gap-3">
                <div className="inline-flex items-center gap-2 text-sm font-semibold text-white">
                  <Link2 className="h-4 w-4 text-cyan-200" />
                  Tracked shared links
                </div>
                <div className="text-xs text-slate-300">{fmt(snapshot.totalShareClicks)} total click-backs</div>
              </div>
              <div className="space-y-2">
                {snapshot.topShares.length ? (
                  snapshot.topShares.map((share) => (
                    <div key={share.token} className="rounded-2xl bg-white/[0.06] px-3 py-2 text-xs">
                      <div className="flex items-center justify-between gap-3">
                        <span className="truncate font-semibold text-white">
                          {share.platform} · {share.path}
                        </span>
                        <span className="tabular-nums text-cyan-200">{fmt(share.clicks)} clicks</span>
                      </div>
                      <div className="mt-1 text-slate-400">
                        {fmt(share.shares)} share action{share.shares === 1 ? "" : "s"} ·{" "}
                        {fmt(share.reportedViews)} imported social views
                      </div>
                    </div>
                  ))
                ) : (
                  <p className="text-sm text-slate-300">
                    Create a share link above. When someone comes back through it, this board
                    records the click-back.
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

function ShareButton({
  label,
  platform,
  active,
  onClick,
  Icon,
}: {
  label: string;
  platform: string;
  active: boolean;
  onClick: (platform: string) => void;
  Icon: typeof Activity;
}) {
  return (
    <button
      type="button"
      onClick={() => onClick(platform)}
      disabled={active}
      className="inline-flex min-h-12 items-center justify-center gap-2 rounded-2xl border border-white/10 bg-white px-3 py-2 text-xs font-bold text-slate-950 shadow-lg shadow-black/20 hover:bg-cyan-50 disabled:cursor-wait disabled:opacity-70"
    >
      <Icon className="h-4 w-4 text-cyan-700" />
      {active ? "Creating..." : label}
    </button>
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
      data-pulse-manual="true"
      className="group inline-flex min-h-14 items-center justify-center gap-2 rounded-2xl bg-white px-3 py-3 text-center text-xs font-bold text-slate-950 shadow-lg shadow-black/20 hover:bg-cyan-50"
    >
      <Icon className="h-4 w-4 text-cyan-700" />
      <span>{label}</span>
      <ArrowRight className="hidden h-3.5 w-3.5 text-slate-400 transition group-hover:translate-x-0.5 sm:block" />
    </Link>
  );
}
