"use client";

import type { ReactNode } from "react";
import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import {
  AlertTriangle,
  BarChart3,
  CheckCircle2,
  FileSearch,
  Loader2,
  MessageSquareText,
  ShieldCheck,
  Vote,
  XCircle,
} from "lucide-react";
import { trackLeadFlowEvent } from "@/lib/leadflow-events-client";
import { cn } from "@/lib/utils";

type CivicRowBase = {
  id: string;
  created_at: string;
  updated_at?: string;
  review_status?: string;
  risk_level?: string;
};

type CivicSurveyRow = CivicRowBase & {
  location: string;
  district: string | null;
  issue_priority: string;
  concern_category: string;
  urgency: number;
  contact_consent: boolean;
  public_display_consent: boolean;
  share_with_civic_org_consent: boolean;
  anonymous_allowed: boolean;
  contact_email?: string | null;
};

type CivicSubmissionRow = CivicRowBase & {
  title: string;
  body: string | null;
  location: string | null;
  district: string | null;
  issue_category: string | null;
  public_display_consent: boolean;
  public_display_approved: boolean;
  contact_consent: boolean;
  share_with_civic_org_consent: boolean;
  anonymous_allowed: boolean;
};

type CivicSourceRow = CivicRowBase & {
  source_type: string;
  title: string;
  source_url: string | null;
  geography: string | null;
  district: string | null;
  issue_category: string | null;
  source_summary: string | null;
  status: string;
  public_visible: boolean;
};

type CivicAggregateRow = {
  id: string;
  geography: string;
  district: string | null;
  issue_category: string;
  response_count: number | string;
  urgency_average: number | string;
  top_concerns: string[] | null;
  source_type: string;
  time_period: string;
};

type CivicDashboardData = {
  mode: "live" | "offline";
  loadErrors: string[];
  aggregates: CivicAggregateRow[];
  surveys: CivicSurveyRow[];
  allSubmissions: CivicSubmissionRow[];
  sources: CivicSourceRow[];
  stats: {
    surveyResponses: number;
    districtLevelCounts: number;
    publicSourceCounts: number;
    concernsNeedingReview: number;
    submissionsFlaggedForRisk: number;
    optInContacts: number;
    publicDisplayApprovals: number;
    topIssues: Array<{ issue: string; count: number; urgency: number }>;
  };
};

function readable(value: string | null | undefined) {
  return (value || "unknown").replace(/_/g, " ");
}

function formatDate(value: string | null | undefined) {
  if (!value) return "Not set";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  return new Intl.DateTimeFormat("en", { month: "short", day: "numeric", hour: "numeric", minute: "2-digit" }).format(date);
}

function toneFor(value: string | null | undefined) {
  const status = value || "unknown";
  if (/approved|active|low/.test(status)) return "border-lead-300/35 bg-lead-300/12 text-lead-100";
  if (/pending|review|medium/.test(status)) return "border-accent-300/35 bg-accent-300/12 text-accent-100";
  if (/suppress|reject|high|prohibited/.test(status)) return "border-red-300/35 bg-red-300/12 text-red-100";
  return "border-white/10 bg-white/[0.045] text-ink-200";
}

function Badge({ value }: { value: string | null | undefined }) {
  return (
    <span className={cn("inline-flex min-h-7 items-center rounded-lg border px-2.5 text-xs font-black capitalize", toneFor(value))}>
      {readable(value)}
    </span>
  );
}

export function AdminCivicClient({ data }: { data: CivicDashboardData }) {
  const [pending, setPending] = useState("");
  const [notice, setNotice] = useState("");

  useEffect(() => {
    trackLeadFlowEvent("civic_dashboard_viewed", { route: "/dashboard/civic", user_role: "admin" });
  }, []);

  const reviewQueue = useMemo(() => {
    return data.allSubmissions.filter((submission) => submission.review_status === "review" || submission.review_status === "pending");
  }, [data.allSubmissions]);

  async function runAction(recordType: "survey" | "submission" | "source", id: string, action: "approve_public_display" | "mark_reviewed" | "reject" | "suppress" | "flag_risk") {
    if ((action === "suppress" || action === "reject") && !window.confirm("This civic review action is audited. Continue?")) return;
    const key = `${recordType}:${id}:${action}`;
    setPending(key);
    setNotice("");
    try {
      const response = await fetch("/api/leadflow/civic/admin", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ recordType, id, action }),
      });
      const result = await response.json().catch(() => ({}));
      if (!response.ok || !result.ok) throw new Error(result.error || "Civic review action failed.");
      setNotice("Civic review action saved. Refresh to load the latest rows.");
      trackLeadFlowEvent(action === "flag_risk" ? "civic_submission_flagged" : "civic_dashboard_viewed", {
        route: "/dashboard/civic",
        user_role: "admin",
        status: action,
      });
    } catch (error) {
      setNotice(error instanceof Error ? error.message : "Civic review action failed.");
    } finally {
      setPending("");
    }
  }

  return (
    <div className="mx-auto max-w-[1540px] space-y-6">
      <section className="overflow-hidden rounded-2xl border border-white/10 bg-[radial-gradient(circle_at_12%_10%,rgba(35,184,255,0.18),transparent_30%),radial-gradient(circle_at_82%_18%,rgba(255,186,61,0.12),transparent_28%),linear-gradient(135deg,#07101b,#050711)] p-5 shadow-2xl shadow-black/30 md:p-7">
        <div className="flex flex-col gap-5 xl:flex-row xl:items-end xl:justify-between">
          <div>
            <p className="inline-flex items-center gap-2 rounded-lg border border-cyan-300/25 bg-cyan-300/10 px-3 py-1 text-xs font-black uppercase tracking-wider text-cyan-200">
              <Vote className="h-4 w-4" />
              Civic review
            </p>
            <h1 className="mt-4 max-w-5xl text-4xl font-black leading-tight text-white md:text-6xl">
              Review civic signals before public display.
            </h1>
            <p className="mt-4 max-w-4xl text-sm leading-6 text-ink-200 md:text-base md:leading-7">
              Civic records stay aggregate, public-source, consented, or manually reviewed. Nothing here should become a commercial lead product without separate legal review.
            </p>
          </div>
          <Badge value={data.mode === "live" ? "live data" : "safe templates"} />
        </div>
        {data.loadErrors.length ? (
          <div className="mt-5 rounded-lg border border-accent-300/30 bg-accent-300/10 p-3 text-sm leading-6 text-accent-100">
            {data.loadErrors[0]}
          </div>
        ) : null}
      </section>

      <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-7">
        <Stat icon={BarChart3} label="Survey responses" value={data.stats.surveyResponses} />
        <Stat icon={Vote} label="Trending issues" value={data.stats.topIssues.length} />
        <Stat icon={FileSearch} label="District rows" value={data.stats.districtLevelCounts} />
        <Stat icon={FileSearch} label="Public sources" value={data.stats.publicSourceCounts} />
        <Stat icon={MessageSquareText} label="Needs review" value={data.stats.concernsNeedingReview} />
        <Stat icon={AlertTriangle} label="Risk flags" value={data.stats.submissionsFlaggedForRisk} />
        <Stat icon={CheckCircle2} label="Display approvals" value={data.stats.publicDisplayApprovals} />
      </section>

      <section className="grid gap-5 xl:grid-cols-[minmax(0,1fr)_420px]">
        <div className="rounded-xl border border-white/10 bg-[#060a11]/92 p-5 shadow-2xl shadow-black/25">
          <div className="flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
            <div>
              <h2 className="text-2xl font-black text-white">Civic review queue</h2>
              <p className="mt-2 text-sm leading-6 text-ink-300">Approve only comments with explicit public-display consent and low risk.</p>
            </div>
            <Link href="/civic/issue-pulse" className="inline-flex min-h-10 items-center rounded-lg border border-cyan-300/30 bg-cyan-300/10 px-4 text-sm font-black text-cyan-50">
              Public pulse
            </Link>
          </div>
          {notice ? <div className="mt-4 rounded-lg border border-white/10 bg-white/[0.035] p-3 text-sm font-bold text-ink-100">{notice}</div> : null}
          <div className="mt-5 overflow-x-auto rounded-lg border border-white/10">
            <table className="min-w-full divide-y divide-white/10 text-left text-sm">
              <thead>
                <tr>
                  {["Concern", "Area", "Consent", "Status", "Risk", "Actions"].map((header) => (
                    <th key={header} className="whitespace-nowrap bg-white/[0.035] px-3 py-3 text-xs font-black uppercase tracking-wider text-ink-400">
                      {header}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {reviewQueue.length ? reviewQueue.map((submission) => (
                  <tr key={submission.id} className="border-t border-white/10 align-top">
                    <td className="px-3 py-3">
                      <p className="max-w-md font-black text-white">{submission.title}</p>
                      <p className="mt-1 line-clamp-2 max-w-md text-xs leading-5 text-ink-400">{submission.body || "No public comment text."}</p>
                    </td>
                    <td className="px-3 py-3 text-ink-300">{submission.location || "Unknown"}<br />{submission.district || "No district"}</td>
                    <td className="px-3 py-3 text-xs font-bold text-ink-300">
                      Public: {submission.public_display_consent ? "yes" : "no"}<br />
                      Share: {submission.share_with_civic_org_consent ? "yes" : "no"}<br />
                      Anonymous: {submission.anonymous_allowed ? "yes" : "no"}
                    </td>
                    <td className="px-3 py-3"><Badge value={submission.review_status} /></td>
                    <td className="px-3 py-3"><Badge value={submission.risk_level} /></td>
                    <td className="px-3 py-3">
                      <ActionGroup
                        pending={pending}
                        recordType="submission"
                        id={submission.id}
                        canApprove={submission.public_display_consent && submission.risk_level !== "prohibited"}
                        onAction={runAction}
                      />
                    </td>
                  </tr>
                )) : (
                  <tr>
                    <td colSpan={6} className="px-3 py-10 text-center text-sm text-ink-300">
                      No civic submissions need review right now.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>

        <div className="space-y-5">
          <div className="rounded-xl border border-white/10 bg-[#060a11]/92 p-5 shadow-2xl shadow-black/25">
            <h2 className="text-2xl font-black text-white">Top issues</h2>
            <div className="mt-4 grid gap-3">
              {data.stats.topIssues.map((issue) => (
                <div key={issue.issue} className="rounded-lg border border-white/10 bg-white/[0.035] p-3">
                  <div className="flex items-center justify-between gap-3">
                    <p className="font-black capitalize text-white">{readable(issue.issue)}</p>
                    <span className="font-mono text-sm font-black text-cyan-200">{issue.count}</span>
                  </div>
                  <p className="mt-1 text-xs font-bold text-ink-400">Average urgency {issue.urgency}</p>
                </div>
              ))}
            </div>
          </div>
          <div className="rounded-xl border border-cyan-300/20 bg-cyan-300/10 p-5">
            <ShieldCheck className="h-7 w-7 text-cyan-200" />
            <h2 className="mt-4 text-2xl font-black text-white">Civic boundary.</h2>
            <p className="mt-3 text-sm font-bold leading-6 text-cyan-50">
              Do not approve individual persuasion labels, protected-trait targeting, minors, private messages, hacked lists, leaked lists, or unclear-permission civic data.
            </p>
          </div>
        </div>
      </section>

      <section className="grid gap-5 xl:grid-cols-2">
        <DataTable
          title="Recent survey responses"
          headers={["Issue", "Area", "Urgency", "Consent", "Status", "Risk", "Created"]}
          rows={data.surveys.slice(0, 40).map((survey) => [
            <strong key="issue" className="text-white">{survey.issue_priority}</strong>,
            <span key="area" className="text-ink-300">{survey.location}<br />{survey.district || "No district"}</span>,
            <strong key="urgency" className="text-white">{survey.urgency}</strong>,
            <span key="consent" className="text-xs font-bold text-ink-300">Contact: {survey.contact_consent ? "yes" : "no"}<br />Public: {survey.public_display_consent ? "yes" : "no"}</span>,
            <Badge key="status" value={survey.review_status} />,
            <Badge key="risk" value={survey.risk_level} />,
            <span key="created" className="text-ink-400">{formatDate(survey.created_at)}</span>,
          ])}
        />
        <DataTable
          title="Public civic sources"
          headers={["Source", "Area", "Type", "Visible", "Status", "Risk", "Actions"]}
          rows={data.sources.slice(0, 40).map((source) => [
            <div key="source"><strong className="text-white">{source.title}</strong><p className="mt-1 line-clamp-2 text-xs leading-5 text-ink-400">{source.source_summary || source.source_url || "No source summary."}</p></div>,
            <span key="area" className="text-ink-300">{source.geography || "Unknown"}<br />{source.district || "No district"}</span>,
            <span key="type" className="capitalize text-ink-300">{readable(source.source_type)}</span>,
            <span key="visible" className="font-bold text-ink-300">{source.public_visible ? "yes" : "no"}</span>,
            <Badge key="status" value={source.review_status || source.status} />,
            <Badge key="risk" value={source.risk_level} />,
            <ActionGroup key="actions" pending={pending} recordType="source" id={source.id} canApprove={source.risk_level !== "prohibited"} onAction={runAction} />,
          ])}
        />
      </section>

      <DataTable
        title="Aggregate public pulse rows"
        headers={["Area", "District", "Issue", "Responses", "Urgency", "Concerns", "Source"]}
        rows={data.aggregates.map((row) => [
          <strong key="area" className="text-white">{row.geography}</strong>,
          <span key="district" className="text-ink-300">{row.district || "Regional"}</span>,
          <span key="issue" className="capitalize text-ink-300">{readable(row.issue_category)}</span>,
          <strong key="responses" className="text-white">{row.response_count}</strong>,
          <strong key="urgency" className="text-white">{row.urgency_average}</strong>,
          <span key="concerns" className="text-ink-300">{(row.top_concerns || []).join(", ")}</span>,
          <span key="source" className="capitalize text-ink-400">{readable(row.source_type)}</span>,
        ])}
      />
    </div>
  );
}

function Stat({ icon: Icon, label, value }: { icon: typeof BarChart3; label: string; value: number | string }) {
  return (
    <div className="rounded-xl border border-white/10 bg-[#060a11]/92 p-4 shadow-2xl shadow-black/20">
      <Icon className="h-5 w-5 text-cyan-300" />
      <p className="mt-4 text-xs font-black uppercase tracking-wider text-ink-500">{label}</p>
      <p className="mt-2 text-3xl font-black text-white">{value}</p>
    </div>
  );
}

function DataTable({ title, headers, rows }: { title: string; headers: string[]; rows: ReactNode[][] }) {
  return (
    <section className="rounded-xl border border-white/10 bg-[#060a11]/92 p-5 shadow-2xl shadow-black/25">
      <h2 className="text-2xl font-black text-white">{title}</h2>
      <div className="mt-5 overflow-x-auto rounded-lg border border-white/10">
        <table className="min-w-full divide-y divide-white/10 text-left text-sm">
          <thead>
            <tr>
              {headers.map((header) => (
                <th key={header} className="whitespace-nowrap bg-white/[0.035] px-3 py-3 text-xs font-black uppercase tracking-wider text-ink-400">
                  {header}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {rows.length ? rows.map((row, rowIndex) => (
              <tr key={rowIndex} className="border-t border-white/10 align-top">
                {row.map((cell, cellIndex) => (
                  <td key={cellIndex} className="px-3 py-3">
                    {cell}
                  </td>
                ))}
              </tr>
            )) : (
              <tr>
                <td colSpan={headers.length} className="px-3 py-10 text-center text-sm text-ink-300">
                  No civic records loaded.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </section>
  );
}

function ActionGroup({
  pending,
  recordType,
  id,
  canApprove,
  onAction,
}: {
  pending: string;
  recordType: "survey" | "submission" | "source";
  id: string;
  canApprove: boolean;
  onAction: (
    recordType: "survey" | "submission" | "source",
    id: string,
    action: "approve_public_display" | "mark_reviewed" | "reject" | "suppress" | "flag_risk",
  ) => void;
}) {
  return (
    <div className="flex flex-wrap gap-2">
      <SmallAction
        pending={pending === `${recordType}:${id}:approve_public_display`}
        disabled={!canApprove}
        icon={CheckCircle2}
        label="Approve"
        onClick={() => onAction(recordType, id, "approve_public_display")}
      />
      <SmallAction
        pending={pending === `${recordType}:${id}:flag_risk`}
        icon={AlertTriangle}
        label="Risk"
        onClick={() => onAction(recordType, id, "flag_risk")}
      />
      <SmallAction
        pending={pending === `${recordType}:${id}:reject`}
        icon={XCircle}
        label="Reject"
        danger
        onClick={() => onAction(recordType, id, "reject")}
      />
    </div>
  );
}

function SmallAction({
  pending,
  disabled,
  icon: Icon,
  label,
  onClick,
  danger,
}: {
  pending: boolean;
  disabled?: boolean;
  icon: typeof CheckCircle2;
  label: string;
  onClick: () => void;
  danger?: boolean;
}) {
  return (
    <button
      type="button"
      disabled={disabled || pending}
      onClick={onClick}
      className={cn(
        "inline-flex min-h-9 items-center gap-1.5 rounded-lg border px-3 text-xs font-black disabled:cursor-not-allowed disabled:opacity-40",
        danger
          ? "border-red-300/35 bg-red-300/10 text-red-100"
          : "border-white/10 bg-white/[0.045] text-ink-100 hover:border-cyan-300/35"
      )}
    >
      {pending ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Icon className="h-3.5 w-3.5" />}
      {label}
    </button>
  );
}
