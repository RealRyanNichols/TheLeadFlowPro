import Link from "next/link";
import type { ReactNode } from "react";
import type { LucideIcon } from "lucide-react";
import {
  Activity,
  ArrowRight,
  BarChart3,
  Brain,
  CalendarCheck,
  Clock3,
  Eye,
  Gauge,
  Link2,
  MessageSquareText,
  MousePointerClick,
  RadioTower,
  Share2,
  ShieldCheck,
  Sparkles,
  TrendingUp,
  Users,
  Zap,
} from "lucide-react";
import { requireAdminUser } from "@/lib/admin";
import { getSitePulseSnapshot, type SitePulseSnapshot } from "@/lib/site-pulse";

export const dynamic = "force-dynamic";
export const metadata = { title: "Pulse Control Room - The LeadFlow Pro" };

export default async function AdminPulsePage() {
  const admin = await requireAdminUser();
  const snapshot = await getSitePulseSnapshot();

  const topMetrics = [
    {
      Icon: Eye,
      label: "Watching now",
      value: fmt(snapshot.activeNow),
      sub: "Visible in the last few minutes",
      href: "/pulse/live-views",
    },
    {
      Icon: Users,
      label: "Views today",
      value: fmt(snapshot.viewsToday),
      sub: `${fmt(snapshot.visitorsToday)} visitor${snapshot.visitorsToday === 1 ? "" : "s"} today`,
      href: "/pulse/live-views",
    },
    {
      Icon: MousePointerClick,
      label: "Tracked actions",
      value: fmt(snapshot.trackedActionsToday),
      sub: `${fmt(snapshot.allClicksToday)} total click signal${snapshot.allClicksToday === 1 ? "" : "s"}`,
      href: "/pulse/click-intent",
    },
    {
      Icon: Clock3,
      label: "Engaged time",
      value: fmtDuration(snapshot.engagementSecondsToday),
      sub: `${fmtDuration(snapshot.totalEngagementSeconds)} all-time tracked`,
      href: "/pulse/dwell-time",
    },
  ];

  const predictionMetrics = [
    {
      Icon: Gauge,
      label: "Traffic score",
      value: `${snapshot.prediction.trafficQualityScore}/100`,
      sub: "Signal quality from source, intent, and return behavior",
      href: "/pulse/traffic-sources",
    },
    {
      Icon: TrendingUp,
      label: "Buy readiness",
      value: `${snapshot.prediction.conversionReadinessScore}/100`,
      sub: "How close the current traffic is to booking or buying",
      href: "/pulse/click-intent",
    },
    {
      Icon: Brain,
      label: "Model confidence",
      value: snapshot.prediction.confidence.toUpperCase(),
      sub: `${fmt(snapshot.prediction.sampleSize)} signal sample`,
      href: "/pulse/predictions",
    },
    {
      Icon: BarChart3,
      label: "History window",
      value: `${fmt(snapshot.historyDays)}d`,
      sub: snapshot.trackingStartedAt ? `Started ${snapshot.trackingStartedAt}` : "Live and imported data",
      href: "/pulse",
    },
  ];

  return (
    <div className="min-h-screen bg-slate-950 text-white">
      <header className="relative overflow-hidden border-b border-cyan-300/20">
        <div
          aria-hidden
          className="absolute inset-0 bg-[linear-gradient(135deg,#020617_0%,#083344_35%,#0a1d3f_66%,#5f2607_100%)]"
        />
        <div className="absolute -right-28 -top-32 h-96 w-96 rounded-full bg-cyan-400/25 blur-3xl" />
        <div className="absolute -left-28 -bottom-32 h-96 w-96 rounded-full bg-accent-400/20 blur-3xl" />
        <div className="relative mx-auto max-w-7xl px-4 py-7">
          <div className="flex flex-col gap-5 lg:flex-row lg:items-center lg:justify-between">
            <div>
              <div className="inline-flex items-center gap-2 rounded-full border border-cyan-300/30 bg-cyan-300/10 px-3 py-1 text-xs font-semibold uppercase tracking-widest text-cyan-100">
                <RadioTower className="h-3.5 w-3.5" /> Ryan-only pulse control room
              </div>
              <h1 className="mt-4 text-4xl font-semibold tracking-tight sm:text-5xl">
                See what the site is doing, then decide what to build next.
              </h1>
              <p className="mt-3 max-w-3xl text-sm leading-relaxed text-slate-300">
                Signed in as {admin.email}. This page uses anonymous aggregate behavior only:
                views, clicks, share backs, friction, dwell time, and conversion pressure. Client
                private data stays inside the client office.
              </p>
            </div>
            <div className="flex flex-wrap gap-2">
              <Link href="/pulse" className="rounded-xl bg-white px-4 py-3 text-sm font-semibold text-slate-950 hover:bg-cyan-50">
                Public pulse
              </Link>
              <Link href="/stump-ryan" className="rounded-xl bg-accent-500 px-4 py-3 text-sm font-semibold text-white hover:bg-accent-600">
                Push build funnel
              </Link>
              <Link href="/admin" className="rounded-xl border border-white/15 bg-white/10 px-4 py-3 text-sm font-semibold text-white hover:bg-white/15">
                Admin home
              </Link>
            </div>
          </div>

          <div className="mt-7 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
            {topMetrics.map((metric) => (
              <AdminPulseStat key={metric.label} {...metric} />
            ))}
          </div>
        </div>
      </header>

      <main className="mx-auto grid max-w-7xl gap-6 px-4 py-8 xl:grid-cols-[minmax(0,1fr)_420px]">
        <div className="space-y-6">
          <section className="rounded-3xl border border-white/10 bg-white/[0.04] p-5 shadow-2xl shadow-black/20">
            <div className="flex flex-col gap-3 md:flex-row md:items-end md:justify-between">
              <div>
                <div className="text-xs font-semibold uppercase tracking-widest text-cyan-200">
                  Prediction board
                </div>
                <h2 className="mt-2 text-2xl font-semibold tracking-tight">
                  The site is scoring intent, not just counting visitors.
                </h2>
              </div>
              <Link
                href="/pulse/predictions"
                className="inline-flex min-h-11 items-center justify-center gap-2 rounded-xl bg-cyan-300 px-4 py-3 text-sm font-semibold text-slate-950 hover:bg-cyan-200"
              >
                Explain predictions <ArrowRight className="h-4 w-4" />
              </Link>
            </div>

            <div className="mt-5 grid gap-3 md:grid-cols-2 xl:grid-cols-4">
              {predictionMetrics.map((metric) => (
                <AdminPulseStat key={metric.label} {...metric} compact />
              ))}
            </div>

            <div className="mt-5 grid gap-3 md:grid-cols-2">
              <ProbabilityCard
                label="Service click next 24h"
                value={snapshot.prediction.probabilities.serviceClickNext24h}
                body={`${fmt(snapshot.prediction.projectedNext24h.serviceClicks)} projected service click${snapshot.prediction.projectedNext24h.serviceClicks === 1 ? "" : "s"}`}
              />
              <ProbabilityCard
                label="Book click next 24h"
                value={snapshot.prediction.probabilities.bookClickNext24h}
                body={`${fmt(snapshot.prediction.projectedNext24h.bookClicks)} projected calendar click${snapshot.prediction.projectedNext24h.bookClicks === 1 ? "" : "s"}`}
              />
              <ProbabilityCard
                label="Checkout start next 24h"
                value={snapshot.prediction.probabilities.checkoutStartNext24h}
                body={`${fmt(snapshot.prediction.projectedNext24h.checkoutStarts)} projected checkout start${snapshot.prediction.projectedNext24h.checkoutStarts === 1 ? "" : "s"}`}
              />
              <ProbabilityCard
                label="Return visit next 7d"
                value={snapshot.prediction.probabilities.returnVisitNext7d}
                body={`${fmt(snapshot.prediction.projectedNext7d.visitors)} projected visitor${snapshot.prediction.projectedNext7d.visitors === 1 ? "" : "s"} in 7 days`}
              />
            </div>
          </section>

          <section className="rounded-3xl border border-white/10 bg-white/[0.04] p-5 shadow-2xl shadow-black/20">
            <div className="flex flex-col gap-3 md:flex-row md:items-end md:justify-between">
              <div>
                <div className="text-xs font-semibold uppercase tracking-widest text-accent-200">
                  What Ryan should do next
                </div>
                <h2 className="mt-2 text-2xl font-semibold tracking-tight">
                  Turn live behavior into the next page, offer, short, or build.
                </h2>
              </div>
              <Link
                href="/admin/requests"
                className="inline-flex min-h-11 items-center justify-center gap-2 rounded-xl bg-accent-500 px-4 py-3 text-sm font-semibold text-white hover:bg-accent-600"
              >
                Review requests <ArrowRight className="h-4 w-4" />
              </Link>
            </div>

            <div className="mt-5 grid gap-3">
              {snapshot.learning.recommendedActions.length ? (
                snapshot.learning.recommendedActions.map((action) => (
                  <div
                    key={`${action.title}-${action.evidence}`}
                    className="rounded-2xl border border-white/10 bg-white/[0.06] p-4"
                  >
                    <div className="flex items-start gap-3">
                      <span className={priorityDot(action.priority)} />
                      <div>
                        <div className="flex flex-wrap items-center gap-2">
                          <h3 className="font-semibold text-white">{action.title}</h3>
                          <span className="rounded-full border border-white/10 bg-white/[0.08] px-2 py-0.5 text-[11px] font-semibold uppercase tracking-wider text-slate-300">
                            {action.priority}
                          </span>
                        </div>
                        <p className="mt-2 text-sm leading-relaxed text-slate-300">{action.body}</p>
                        <div className="mt-3 text-[11px] font-semibold uppercase tracking-widest text-cyan-200">
                          Evidence: {action.evidence}
                        </div>
                      </div>
                    </div>
                  </div>
                ))
              ) : (
                <EmptyState>
                  The learning loop starts making recommendations after it sees real views, clicks,
                  watch time, questions, share backs, and checkout starts.
                </EmptyState>
              )}
            </div>

            {snapshot.prediction.topOpportunity ? (
              <div className="mt-5 rounded-3xl border border-cyan-300/20 bg-cyan-300/10 p-4">
                <div className="inline-flex items-center gap-2 text-sm font-semibold text-cyan-100">
                  <Zap className="h-4 w-4" /> Best current opportunity
                </div>
                <h3 className="mt-2 text-xl font-semibold tracking-tight text-white">
                  {snapshot.prediction.topOpportunity.path}
                </h3>
                <p className="mt-2 text-sm leading-relaxed text-slate-300">
                  {snapshot.prediction.topOpportunity.reason}
                </p>
                <p className="mt-3 rounded-2xl border border-white/10 bg-white/[0.06] p-3 text-sm font-semibold leading-relaxed text-cyan-100">
                  {snapshot.prediction.topOpportunity.suggestedMove}
                </p>
              </div>
            ) : null}
          </section>

          <section className="rounded-3xl border border-white/10 bg-white/[0.04] p-5 shadow-2xl shadow-black/20">
            <div className="text-xs font-semibold uppercase tracking-widest text-cyan-200">
              Highest intent paths
            </div>
            <h2 className="mt-2 text-2xl font-semibold tracking-tight">
              Pages that are pulling the most decision behavior.
            </h2>
            <div className="mt-5 grid gap-3">
              {snapshot.topIntentPaths.length ? (
                snapshot.topIntentPaths.slice(0, 8).map((row) => (
                  <PathRow key={row.path} row={row} />
                ))
              ) : (
                <EmptyState>No intent paths ranked yet.</EmptyState>
              )}
            </div>
          </section>
        </div>

        <aside className="space-y-6">
          <SidePanel title="Friction and proof sensors" icon={ShieldCheck}>
            <SensorGrid snapshot={snapshot} />
          </SidePanel>

          <SidePanel title="Traffic sources" icon={Link2}>
            {snapshot.topTrafficSources.length ? (
              snapshot.topTrafficSources.slice(0, 6).map((row) => (
                <div key={row.source} className="rounded-2xl border border-white/10 bg-white/[0.05] p-3">
                  <div className="flex items-center justify-between gap-3">
                    <span className="truncate text-sm font-semibold text-white">{row.source}</span>
                    <span className="font-mono text-sm font-bold text-cyan-100">{fmt(row.events)}</span>
                  </div>
                  <p className="mt-1 text-xs text-slate-400">
                    {fmt(row.views)} view signal{row.views === 1 ? "" : "s"} - {fmt(row.visitors)} visitor signal{row.visitors === 1 ? "" : "s"}
                  </p>
                </div>
              ))
            ) : (
              <EmptyState>Source trails will show here when UTM tags, referrals, or share links arrive.</EmptyState>
            )}
          </SidePanel>

          <SidePanel title="Tracked shares" icon={Share2}>
            {snapshot.topShares.length ? (
              snapshot.topShares.slice(0, 6).map((share) => (
                <div key={share.token} className="rounded-2xl border border-white/10 bg-white/[0.05] p-3">
                  <div className="flex items-center justify-between gap-3">
                    <span className="truncate text-sm font-semibold text-white">
                      {share.platform} - {share.path}
                    </span>
                    <span className="font-mono text-sm font-bold text-cyan-100">{fmt(share.clicks)}</span>
                  </div>
                  <p className="mt-1 text-xs text-slate-400">
                    {fmt(share.shares)} share action{share.shares === 1 ? "" : "s"} - {fmt(share.reportedViews)} imported social views
                  </p>
                </div>
              ))
            ) : (
              <EmptyState>Share links will rank here after people share the Pulse board.</EmptyState>
            )}
          </SidePanel>

          <SidePanel title="Recent anonymous signals" icon={Activity}>
            {snapshot.recent.length ? (
              snapshot.recent.slice(0, 10).map((event) => (
                <div key={`${event.eventType}-${event.path}-${event.createdAt}`} className="rounded-2xl border border-white/10 bg-white/[0.05] p-3">
                  <div className="flex items-center justify-between gap-3">
                    <span className="text-sm font-semibold text-white">{event.eventType}</span>
                    <span className="text-[11px] text-slate-500">{new Date(event.createdAt).toLocaleTimeString()}</span>
                  </div>
                  <p className="mt-1 truncate text-xs text-slate-400">{event.path}</p>
                </div>
              ))
            ) : (
              <EmptyState>No recent public signals yet.</EmptyState>
            )}
          </SidePanel>

          <SidePanel title="Question topics" icon={MessageSquareText}>
            {snapshot.topQuestionTopics.length ? (
              snapshot.topQuestionTopics.slice(0, 6).map((row) => (
                <div key={row.topic} className="rounded-2xl border border-white/10 bg-white/[0.05] p-3">
                  <div className="flex items-center justify-between gap-3">
                    <span className="text-sm font-semibold text-white">{row.topic}</span>
                    <span className="font-mono text-sm font-bold text-cyan-100">{fmt(row.count)}</span>
                  </div>
                </div>
              ))
            ) : (
              <EmptyState>Chat topics are classified here without publishing raw private messages.</EmptyState>
            )}
          </SidePanel>
        </aside>
      </main>
    </div>
  );
}

function AdminPulseStat({
  Icon,
  label,
  value,
  sub,
  href,
  compact = false,
}: {
  Icon: LucideIcon;
  label: string;
  value: string;
  sub: string;
  href: string;
  compact?: boolean;
}) {
  return (
    <Link
      href={href}
      className="group block rounded-2xl border border-white/10 bg-white/[0.08] p-4 shadow-lg shadow-black/10 hover:border-cyan-300/40 hover:bg-white/[0.12]"
    >
      <div className="flex items-center justify-between gap-3">
        <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-cyan-100">
          <Icon className="h-4 w-4" /> {label}
        </div>
        <ArrowRight className="h-3.5 w-3.5 text-slate-500 transition group-hover:translate-x-0.5 group-hover:text-cyan-100" />
      </div>
      <p className={compact ? "mt-2 text-2xl font-semibold tracking-tight" : "mt-2 text-3xl font-semibold tracking-tight"}>
        {value}
      </p>
      <p className="mt-1 text-xs leading-relaxed text-slate-400">{sub}</p>
    </Link>
  );
}

function ProbabilityCard({ label, value, body }: { label: string; value: number; body: string }) {
  return (
    <div className="rounded-2xl border border-white/10 bg-white/[0.06] p-4">
      <div className="flex items-center justify-between gap-3">
        <div className="text-xs font-semibold uppercase tracking-widest text-slate-300">{label}</div>
        <div className="font-mono text-lg font-bold text-cyan-100">{value}%</div>
      </div>
      <div className="mt-3 h-2 overflow-hidden rounded-full bg-white/10">
        <div
          className="h-full rounded-full bg-gradient-to-r from-cyan-300 via-accent-200 to-accent-400"
          style={{ width: `${Math.max(5, value)}%` }}
        />
      </div>
      <p className="mt-3 text-sm leading-relaxed text-slate-300">{body}</p>
    </div>
  );
}

function PathRow({
  row,
}: {
  row: { path: string; views: number; clicks: number; engagementSeconds: number };
}) {
  return (
    <Link
      href={row.path}
      className="group rounded-2xl border border-white/10 bg-white/[0.05] p-4 hover:border-cyan-300/40 hover:bg-white/[0.08]"
    >
      <div className="flex flex-col gap-2 md:flex-row md:items-center md:justify-between">
        <div className="min-w-0">
          <p className="truncate font-semibold text-white">{row.path}</p>
          <p className="mt-1 text-xs text-slate-400">
            {fmt(row.views)} view{row.views === 1 ? "" : "s"} - {fmt(row.clicks)} click{row.clicks === 1 ? "" : "s"} - {fmtDuration(row.engagementSeconds)} engaged
          </p>
        </div>
        <span className="inline-flex items-center gap-2 text-sm font-semibold text-cyan-200">
          Open page <ArrowRight className="h-4 w-4 transition group-hover:translate-x-0.5" />
        </span>
      </div>
    </Link>
  );
}

function SensorGrid({ snapshot }: { snapshot: SitePulseSnapshot }) {
  const sensors = [
    { label: "Seen CTAs", value: snapshot.ctaImpressionsToday, href: "/pulse/click-intent" },
    { label: "Form submits", value: snapshot.formSubmitsToday, href: "/pulse/click-intent" },
    { label: "Video events", value: snapshot.videoInteractionsToday, href: "/pulse/dwell-time" },
    { label: "Dead zones", value: snapshot.deadClicksToday, href: "/pulse/speed-friction" },
    { label: "Rage clicks", value: snapshot.rageClicksToday, href: "/pulse/speed-friction" },
    { label: "Speed signals", value: snapshot.performanceSignalsToday, href: "/pulse/speed-friction" },
    { label: "Shares", value: snapshot.shareCreatesToday, href: "/pulse/share-backs" },
    { label: "Click-backs", value: snapshot.shareClicksToday, href: "/pulse/share-backs" },
    { label: "Social views", value: snapshot.socialShareViewsToday, href: "/pulse/share-backs" },
  ];

  return (
    <div className="grid grid-cols-3 gap-2">
      {sensors.map((sensor) => (
        <Link
          key={sensor.label}
          href={sensor.href}
          className="rounded-2xl border border-white/10 bg-white/[0.05] p-3 hover:border-cyan-300/40 hover:bg-white/[0.08]"
        >
          <div className="font-mono text-xl font-bold text-white">{fmt(sensor.value)}</div>
          <div className="mt-1 text-[10px] font-semibold uppercase tracking-wider text-slate-400">
            {sensor.label}
          </div>
        </Link>
      ))}
    </div>
  );
}

function SidePanel({
  title,
  icon: Icon,
  children,
}: {
  title: string;
  icon: LucideIcon;
  children: ReactNode;
}) {
  return (
    <section className="rounded-3xl border border-white/10 bg-white/[0.04] p-5 shadow-2xl shadow-black/20">
      <div className="flex items-center gap-2">
        <Icon className="h-4 w-4 text-cyan-200" />
        <h2 className="font-semibold tracking-tight text-white">{title}</h2>
      </div>
      <div className="mt-4 grid gap-3">{children}</div>
    </section>
  );
}

function EmptyState({ children }: { children: ReactNode }) {
  return (
    <div className="rounded-2xl border border-dashed border-white/10 bg-white/[0.03] p-4 text-sm leading-relaxed text-slate-400">
      {children}
    </div>
  );
}

function priorityDot(priority: "high" | "medium" | "watch") {
  if (priority === "high") {
    return "mt-2 h-2.5 w-2.5 shrink-0 rounded-full bg-accent-300 shadow-[0_0_18px_rgba(255,214,107,0.85)]";
  }
  if (priority === "medium") {
    return "mt-2 h-2.5 w-2.5 shrink-0 rounded-full bg-cyan-300";
  }
  return "mt-2 h-2.5 w-2.5 shrink-0 rounded-full bg-slate-400";
}

function fmt(value: number) {
  return Math.round(value || 0).toLocaleString();
}

function fmtDuration(seconds: number) {
  const total = Math.max(0, Math.round(seconds || 0));
  if (total < 60) return `${total}s`;
  const minutes = Math.round(total / 60);
  if (minutes < 60) return `${minutes}m`;
  const hours = Math.round((minutes / 60) * 10) / 10;
  return `${hours}h`;
}
