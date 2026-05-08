"use client";

import { useEffect, useMemo, useState } from "react";
import {
  Activity,
  ArrowRight,
  Brain,
  CalendarCheck,
  Clock3,
  Eye,
  Lightbulb,
  MousePointerClick,
  RadioTower,
  Share2,
  ShoppingCart,
  Sparkles,
  TrendingUp,
  Users,
} from "lucide-react";

type PulseSnapshot = {
  source: "live" | "offline";
  trackingStartedAt: string | null;
  historyDays: number;
  activeNow: number;
  viewsToday: number;
  visitorsToday: number;
  totalViews: number;
  returningVisitors: number;
  serviceClicksToday: number;
  bookClicksToday: number;
  capacityClicksToday: number;
  checkoutClicksToday: number;
  purchaseSignalsToday: number;
  chatQuestionsToday: number;
  shareCreatesToday: number;
  shareClicksToday: number;
  socialShareViewsToday: number;
  engagementSecondsToday: number;
  totalEngagementSeconds: number;
  updatedAt: string;
  topIntentPaths: Array<{
    path: string;
    views: number;
    clicks: number;
    engagementSeconds: number;
  }>;
  learning: {
    recommendedActions: Array<{
      priority: "high" | "medium" | "watch";
      title: string;
      body: string;
      evidence: string;
    }>;
  };
};

const EMPTY: PulseSnapshot = {
  source: "offline",
  trackingStartedAt: null,
  historyDays: 0,
  activeNow: 0,
  viewsToday: 0,
  visitorsToday: 0,
  totalViews: 0,
  returningVisitors: 0,
  serviceClicksToday: 0,
  bookClicksToday: 0,
  capacityClicksToday: 0,
  checkoutClicksToday: 0,
  purchaseSignalsToday: 0,
  chatQuestionsToday: 0,
  shareCreatesToday: 0,
  shareClicksToday: 0,
  socialShareViewsToday: 0,
  engagementSecondsToday: 0,
  totalEngagementSeconds: 0,
  updatedAt: "1970-01-01T00:00:00.000Z",
  topIntentPaths: [],
  learning: { recommendedActions: [] },
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

function pct(part: number, whole: number) {
  if (!whole) return "0%";
  return `${Math.round((part / whole) * 1000) / 10}%`;
}

async function fetchPulse() {
  const response = await fetch("/api/site-pulse", { cache: "no-store" });
  if (!response.ok) throw new Error("Pulse request failed");
  return (await response.json()) as PulseSnapshot;
}

export function LivePulseEngineRoom() {
  const [snapshot, setSnapshot] = useState<PulseSnapshot>(EMPTY);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let mounted = true;

    function load() {
      fetchPulse()
        .then((next) => {
          if (mounted) setSnapshot(next);
        })
        .catch(() => undefined)
        .finally(() => {
          if (mounted) setLoading(false);
        });
    }

    load();
    const interval = window.setInterval(load, 10_000);

    return () => {
      mounted = false;
      window.clearInterval(interval);
    };
  }, []);

  const intentClicks =
    snapshot.serviceClicksToday +
    snapshot.bookClicksToday +
    snapshot.capacityClicksToday +
    snapshot.checkoutClicksToday +
    snapshot.chatQuestionsToday +
    snapshot.shareClicksToday;

  const engineStages = useMemo(
    () => [
      {
        Icon: Eye,
        label: "Attention",
        value: snapshot.viewsToday,
        sub: `${fmt(snapshot.visitorsToday)} visitors today`,
        width: 100,
        color: "from-cyan-300 to-cyan-500",
      },
      {
        Icon: Clock3,
        label: "Engaged time",
        value: snapshot.engagementSecondsToday,
        display: fmtDuration(snapshot.engagementSecondsToday),
        sub: `${fmtDuration(snapshot.totalEngagementSeconds)} total measured`,
        width: Math.max(8, Math.min(100, snapshot.engagementSecondsToday / 3)),
        color: "from-brand-300 to-cyan-400",
      },
      {
        Icon: MousePointerClick,
        label: "Intent clicks",
        value: intentClicks,
        sub: `${pct(intentClicks, snapshot.viewsToday)} of today's views`,
        width: Math.max(8, Math.min(100, intentClicks * 18)),
        color: "from-accent-200 to-accent-500",
      },
      {
        Icon: CalendarCheck,
        label: "Calendar clicks",
        value: snapshot.bookClicksToday,
        sub: `${pct(snapshot.bookClicksToday, snapshot.viewsToday)} view-to-book signal`,
        width: Math.max(8, Math.min(100, snapshot.bookClicksToday * 22)),
        color: "from-cyan-200 to-brand-500",
      },
      {
        Icon: ShoppingCart,
        label: "Checkout starts",
        value: snapshot.checkoutClicksToday + snapshot.purchaseSignalsToday,
        sub: `${fmt(snapshot.purchaseSignalsToday)} returned purchase signals`,
        width: Math.max(8, Math.min(100, (snapshot.checkoutClicksToday + snapshot.purchaseSignalsToday) * 25)),
        color: "from-accent-300 to-rose-400",
      },
      {
        Icon: Share2,
        label: "Share loop",
        value: snapshot.shareClicksToday + snapshot.socialShareViewsToday,
        sub: `${fmt(snapshot.shareClicksToday)} click-backs, ${fmt(snapshot.socialShareViewsToday)} imported views`,
        width: Math.max(8, Math.min(100, (snapshot.shareClicksToday + snapshot.socialShareViewsToday / 20) * 12)),
        color: "from-cyan-300 to-accent-300",
      },
    ],
    [intentClicks, snapshot],
  );

  const actions = snapshot.learning.recommendedActions.length
    ? snapshot.learning.recommendedActions.slice(0, 3)
    : [
        {
          priority: "watch" as const,
          title: "Feed the board more traffic",
          body: "The next decision gets stronger after more people view, click, share, ask, and book from this page.",
          evidence: "Waiting for more live signals",
        },
        {
          priority: "medium" as const,
          title: "Use the share loop",
          body: "Every tracked share can show click-backs. Imported social views make the outside attention visible.",
          evidence: "Share buttons are already wired",
        },
        {
          priority: "high" as const,
          title: "Turn high-intent pages into offers",
          body: "When one page earns watch time and clicks, the next build is a sharper offer, calculator, or checkout path.",
          evidence: "Intent paths rank automatically",
        },
      ];

  return (
    <section className="relative overflow-hidden border-b border-slate-200 bg-slate-950 text-white">
      <div
        aria-hidden
        className="absolute inset-0 opacity-[0.06]"
        style={{
          backgroundImage:
            "linear-gradient(rgba(255,255,255,.35) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,.35) 1px, transparent 1px)",
          backgroundSize: "36px 36px",
        }}
      />
      <div aria-hidden className="absolute -right-24 top-0 h-[520px] w-[520px] rounded-full bg-cyan-400/20 blur-3xl" />
      <div aria-hidden className="absolute -left-24 bottom-0 h-[440px] w-[440px] rounded-full bg-accent-400/15 blur-3xl" />

      <div className="relative mx-auto max-w-7xl px-4 py-12 sm:py-14">
        <div className="grid gap-8 lg:grid-cols-[0.78fr_1.22fr] lg:items-start">
          <div>
            <div className="inline-flex items-center gap-2 rounded-full border border-cyan-300/30 bg-cyan-300/10 px-3 py-1 text-xs font-semibold uppercase tracking-widest text-cyan-100">
              <Brain className="h-3.5 w-3.5" /> Brain and engine live
            </div>
            <h2 className="mt-4 text-3xl font-semibold tracking-tight sm:text-4xl">
              This shows the machine while it is running.
            </h2>
            <p className="mt-4 text-sm leading-relaxed text-slate-300 sm:text-base">
              A normal analytics page hides the story. This turns the story into a live operating
              board: attention, engaged time, intent clicks, calendar movement, checkout pressure,
              share loops, and the next recommended move.
            </p>

            <div className="mt-6 grid gap-3 sm:grid-cols-2">
              <EngineKpi Icon={Users} label="Watching now" value={loading ? "..." : fmt(snapshot.activeNow)} />
              <EngineKpi Icon={TrendingUp} label="All-time views" value={fmt(snapshot.totalViews)} />
              <EngineKpi Icon={MousePointerClick} label="Intent today" value={fmt(intentClicks)} />
              <EngineKpi Icon={RadioTower} label="Feed status" value={snapshot.source === "live" ? "Live" : "Connecting"} />
            </div>

            <div className="mt-5 rounded-3xl border border-white/10 bg-white/[0.06] p-4">
              <div className="flex items-center gap-2 text-sm font-semibold text-white">
                <Sparkles className="h-4 w-4 text-accent-200" />
                What a buyer should understand
              </div>
              <p className="mt-2 text-sm leading-relaxed text-slate-300">
                This is what Ryan can build into a dealership, law office, doctor, real estate team,
                artist launch, ministry fundraiser, or local service business. The public sees proof.
                The owner sees the customer, status, source, follow-up, and money trail.
              </p>
            </div>
          </div>

          <div className="overflow-hidden rounded-3xl border border-white/10 bg-white/[0.06] shadow-[0_30px_90px_-40px_rgba(0,0,0,0.9)]">
            <div className="border-b border-white/10 p-4 sm:p-5">
              <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                <div>
                  <div className="text-xs font-semibold uppercase tracking-widest text-cyan-100">
                    Signal chain
                  </div>
                  <h3 className="mt-2 text-2xl font-semibold tracking-tight">
                    Views should turn into movement.
                  </h3>
                </div>
                <div className="rounded-2xl border border-cyan-300/25 bg-cyan-300/10 px-4 py-3 text-right">
                  <div className="text-2xl font-semibold tabular-nums text-cyan-100">
                    {pct(intentClicks, snapshot.viewsToday)}
                  </div>
                  <div className="text-[10px] font-semibold uppercase tracking-widest text-slate-300">
                    view to intent
                  </div>
                </div>
              </div>
            </div>

            <div className="grid gap-0 lg:grid-cols-[1.05fr_0.95fr]">
              <div className="border-b border-white/10 p-4 sm:p-5 lg:border-b-0 lg:border-r">
                <div className="space-y-3">
                  {engineStages.map((stage) => (
                    <div key={stage.label} className="rounded-2xl border border-white/10 bg-white/[0.04] p-3">
                      <div className="mb-2 flex items-center justify-between gap-3">
                        <div className="flex items-center gap-2 text-sm font-semibold">
                          <stage.Icon className="h-4 w-4 text-cyan-200" />
                          {stage.label}
                        </div>
                        <div className="font-mono text-sm font-semibold text-white">
                          {stage.display ?? fmt(stage.value)}
                        </div>
                      </div>
                      <div className="h-2 overflow-hidden rounded-full bg-white/10">
                        <div
                          className={`h-full rounded-full bg-gradient-to-r ${stage.color}`}
                          style={{ width: `${Math.max(6, stage.width)}%` }}
                        />
                      </div>
                      <div className="mt-2 text-xs text-slate-400">{stage.sub}</div>
                    </div>
                  ))}
                </div>
              </div>

              <div className="p-4 sm:p-5">
                <div className="mb-3 flex items-center gap-2 text-sm font-semibold">
                  <Lightbulb className="h-4 w-4 text-accent-200" />
                  Brain output
                </div>
                <div className="space-y-3">
                  {actions.map((action) => (
                    <div key={`${action.title}-${action.evidence}`} className="rounded-2xl border border-white/10 bg-white/[0.05] p-3">
                      <div className="flex items-start gap-2">
                        <span
                          className={
                            action.priority === "high"
                              ? "mt-1.5 h-2 w-2 rounded-full bg-accent-300 shadow-[0_0_18px_rgba(255,214,107,0.8)]"
                              : action.priority === "medium"
                                ? "mt-1.5 h-2 w-2 rounded-full bg-cyan-300"
                                : "mt-1.5 h-2 w-2 rounded-full bg-slate-400"
                          }
                        />
                        <div>
                          <div className="text-sm font-semibold text-white">{action.title}</div>
                          <p className="mt-1 text-xs leading-relaxed text-slate-300">{action.body}</p>
                          <div className="mt-2 text-[10px] font-semibold uppercase tracking-widest text-cyan-200">
                            {action.evidence}
                          </div>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>

                <div className="mt-4 rounded-2xl border border-accent-300/25 bg-accent-300/10 p-3 text-xs leading-relaxed text-slate-300">
                  <strong className="text-accent-100">Public board, private details.</strong> This
                  page shows anonymous movement. A client version can show owner-only names,
                  files, quote values, statuses, and next actions behind login.
                </div>
              </div>
            </div>

            <div className="border-t border-white/10 bg-white/[0.04] p-4">
              <div className="grid gap-2 sm:grid-cols-4">
                <SourceChip label="Browser views" value="Live" />
                <SourceChip label="Heartbeat time" value="Live" />
                <SourceChip label="Share links" value="Tracked" />
                <SourceChip label="Social views" value="Import/API" />
              </div>
              <div className="mt-3 flex flex-col gap-2 text-xs text-slate-400 sm:flex-row sm:items-center sm:justify-between">
                <span>
                  Started {snapshot.trackingStartedAt ?? "waiting for first tracked day"} · {snapshot.historyDays} day history
                </span>
                <span>Updates every 10 seconds while open</span>
              </div>
            </div>
          </div>
        </div>

        <div className="mt-8 grid gap-4 md:grid-cols-3">
          <OwnerUseCase
            title="What got attention?"
            body="See which page, post, offer, or share link brought someone into the business."
          />
          <OwnerUseCase
            title="Where did they hesitate?"
            body="Find the page that got views but not clicks, then fix the offer, proof, or next step."
          />
          <OwnerUseCase
            title="What should be built next?"
            body="Use questions, clicks, watch time, and checkout starts to create the next tool or service page."
          />
        </div>
      </div>
    </section>
  );
}

function EngineKpi({
  Icon,
  label,
  value,
}: {
  Icon: typeof Activity;
  label: string;
  value: string;
}) {
  return (
    <div className="rounded-2xl border border-white/10 bg-white/[0.06] p-4">
      <Icon className="h-5 w-5 text-cyan-200" />
      <div className="mt-3 text-3xl font-semibold tabular-nums text-white">{value}</div>
      <div className="mt-1 text-xs font-semibold uppercase tracking-widest text-slate-400">
        {label}
      </div>
    </div>
  );
}

function SourceChip({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-2xl border border-white/10 bg-white/[0.06] px-3 py-2">
      <div className="text-[10px] font-semibold uppercase tracking-widest text-slate-400">
        {label}
      </div>
      <div className="mt-1 text-sm font-semibold text-cyan-100">{value}</div>
    </div>
  );
}

function OwnerUseCase({ title, body }: { title: string; body: string }) {
  return (
    <div className="rounded-3xl border border-white/10 bg-white/[0.06] p-5">
      <div className="inline-flex h-9 w-9 items-center justify-center rounded-2xl bg-cyan-300 text-slate-950">
        <ArrowRight className="h-4 w-4" />
      </div>
      <h3 className="mt-4 text-lg font-semibold tracking-tight text-white">{title}</h3>
      <p className="mt-2 text-sm leading-relaxed text-slate-300">{body}</p>
    </div>
  );
}
