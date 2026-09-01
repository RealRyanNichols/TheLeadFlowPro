"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import {
  AlertTriangle,
  BarChart3,
  CheckCircle2,
  ChevronRight,
  Clock3,
  ListTodo,
  Send,
  ShieldCheck,
} from "lucide-react";

export type MissionWindow = {
  key: string;
  label: string;
  metrics: {
    visitors: number;
    pageViews: number;
    leads: number;
    followups: number;
    verifiedCash: number;
    completedRuns: number;
    publishedPosts: number;
    sentOutreach: number;
    pendingApprovals: number;
    blockedRuns: number;
    failedRuns: number;
  };
};

export type CurrentExecutionState = {
  pendingApprovals: number;
  openTasks: number;
  dueTasks: number;
  queuedOutreach: number;
  activeBuilds: number;
  openOpportunities: number;
  blockedWorkers: number;
};

type PanelKey = "completed" | "approval" | "shipped" | "blocked" | "metrics" | "next";

const PANELS: Array<{ key: PanelKey; label: string; icon: typeof CheckCircle2 }> = [
  { key: "completed", label: "Completed", icon: CheckCircle2 },
  { key: "approval", label: "Awaiting Approval", icon: Clock3 },
  { key: "shipped", label: "Sent / Published / Activated", icon: Send },
  { key: "blocked", label: "Blocked", icon: AlertTriangle },
  { key: "metrics", label: "Actual Metrics", icon: BarChart3 },
  { key: "next", label: "Next Actions", icon: ListTodo },
];

function number(value: number) {
  return new Intl.NumberFormat("en-US", { maximumFractionDigits: 0 }).format(value);
}

function money(value: number) {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    maximumFractionDigits: 0,
  }).format(value);
}

function Metric({ label, value, note }: { label: string; value: string; note?: string }) {
  return (
    <div className="mc-metric">
      <p>{label}</p>
      <strong>{value}</strong>
      {note ? <span>{note}</span> : null}
    </div>
  );
}

export default function ExecutionDashboard({
  windows,
  current,
}: {
  windows: MissionWindow[];
  current: CurrentExecutionState;
}) {
  const [windowKey, setWindowKey] = useState(windows[3]?.key || windows[0]?.key || "30d");
  const [panel, setPanel] = useState<PanelKey>("metrics");
  const selected = useMemo(
    () => windows.find((item) => item.key === windowKey) || windows[0],
    [windowKey, windows],
  );

  if (!selected) return null;
  const m = selected.metrics;

  return (
    <section className="mc-dashboard" aria-labelledby="mission-control-title">
      <div className="mc-dashboard-head">
        <div>
          <p className="mc-kicker">Mission Control</p>
          <h2 id="mission-control-title">Execution Update</h2>
          <p>
            Every number below comes from a connected LeadFlow Pro record. Nothing is a
            sample, estimate, or decorative dashboard metric.
          </p>
        </div>
        <div className="mc-live-badge">
          <span aria-hidden="true" />
          Live data
          <small>refreshes on page load</small>
        </div>
      </div>

      <div className="mc-window-row" aria-label="Dashboard timeframe">
        {windows.map((item) => (
          <button
            key={item.key}
            type="button"
            className={item.key === selected.key ? "is-active" : ""}
            onClick={() => setWindowKey(item.key)}
            aria-pressed={item.key === selected.key}
          >
            {item.label}
          </button>
        ))}
      </div>

      <div className="mc-panel-tabs" role="tablist" aria-label="Execution status">
        {PANELS.map(({ key, label, icon: Icon }) => (
          <button
            key={key}
            type="button"
            role="tab"
            aria-selected={panel === key}
            className={panel === key ? "is-active" : ""}
            onClick={() => setPanel(key)}
          >
            <Icon aria-hidden="true" className="h-5 w-5" />
            <span>{label}</span>
            <ChevronRight aria-hidden="true" className="mc-tab-arrow h-4 w-4" />
          </button>
        ))}
      </div>

      <div className="mc-panel" role="tabpanel">
        <div className="mc-panel-title">
          <div>
            <span>{selected.label}</span>
            <h3>{PANELS.find((item) => item.key === panel)?.label}</h3>
          </div>
          <ShieldCheck aria-hidden="true" className="h-6 w-6" />
        </div>

        {panel === "completed" ? (
          <div className="mc-metric-grid">
            <Metric label="Follow-ups completed" value={number(m.followups)} note="Recorded lead tasks" />
            <Metric label="AI runs completed" value={number(m.completedRuns)} note="OperatorOS completed status" />
          </div>
        ) : null}

        {panel === "approval" ? (
          <div className="mc-metric-grid">
            <Metric label="Pending approvals" value={number(m.pendingApprovals)} note={`Created in ${selected.label.toLowerCase()} and still pending`} />
            <Metric label="Pending now" value={number(current.pendingApprovals)} note="Current human approval queue" />
          </div>
        ) : null}

        {panel === "shipped" ? (
          <div className="mc-metric-grid">
            <Metric label="Published posts" value={number(m.publishedPosts)} note="Confirmed published status" />
            <Metric label="Outreach sent" value={number(m.sentOutreach)} note="Confirmed sent status" />
            <Metric label="Unverified activations" value="—" note="Not counted without a connected activation record" />
          </div>
        ) : null}

        {panel === "blocked" ? (
          <div className="mc-metric-grid">
            <Metric label="Blocked runs" value={number(m.blockedRuns)} note="OperatorOS blocked status" />
            <Metric label="Failed runs" value={number(m.failedRuns)} note="OperatorOS failed status" />
            <Metric label="Workers blocked now" value={number(current.blockedWorkers)} note="Current worker state" />
          </div>
        ) : null}

        {panel === "metrics" ? (
          <div className="mc-metric-grid mc-metric-grid--wide">
            <Metric label="Visitors" value={number(m.visitors)} />
            <Metric label="Page views" value={number(m.pageViews)} />
            <Metric label="Leads" value={number(m.leads)} />
            <Metric label="Follow-ups" value={number(m.followups)} />
            <Metric label="Verified cash" value={money(m.verifiedCash)} />
            <Metric label="AI runs" value={number(m.completedRuns)} />
            <Metric label="Published" value={number(m.publishedPosts)} />
            <Metric label="Outreach sent" value={number(m.sentOutreach)} />
          </div>
        ) : null}

        {panel === "next" ? (
          <>
            <p className="mc-current-note">
              Next Actions is the current operating queue. It is intentionally not rewritten as a historical estimate when the timeframe changes.
            </p>
            <div className="mc-metric-grid mc-metric-grid--wide">
              <Metric label="Follow-ups due" value={number(current.dueTasks)} />
              <Metric label="Open follow-ups" value={number(current.openTasks)} />
              <Metric label="Outreach queued" value={number(current.queuedOutreach)} />
              <Metric label="Approvals waiting" value={number(current.pendingApprovals)} />
              <Metric label="Active builds" value={number(current.activeBuilds)} />
              <Metric label="Open opportunities" value={number(current.openOpportunities)} />
            </div>
          </>
        ) : null}

        <div className="mc-panel-foot">
          <p>Aggregate business records only. Private names, messages, and customer details stay inside the authenticated operating floor.</p>
          <Link href="/admin/operator">
            Open private operating floor <ChevronRight aria-hidden="true" className="h-4 w-4" />
          </Link>
        </div>
      </div>
    </section>
  );
}
