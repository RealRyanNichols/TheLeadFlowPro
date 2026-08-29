"use client";

import { useState } from "react";
import Link from "next/link";
import { createClient } from "@/lib/supabase/client";
import {
  BUSINESS_DIAGNOSTIC_SECTIONS,
  diagnosticReadinessLabel,
  fieldVisible,
  type DiagnosticAnswers,
  type DiagnosticField,
} from "@/lib/businessDiagnostic";
import LeadThread, { type LeadMsg } from "./LeadThread";
import DeleteLead from "./DeleteLead";

const STAGES = ["new", "contacted", "call_booked", "proposal", "won", "lost"] as const;

const STAGE_LABELS: Record<string, string> = {
  new: "New",
  contacted: "Contacted",
  call_booked: "Call booked",
  proposal: "Proposal",
  won: "Won",
  lost: "Lost",
};

const INTEREST_LABELS: Record<string, string> = {
  learn: "Legacy training path",
  build_with_you: "Legacy guided build path",
  done_for_you: "Legacy full-service path",
  unsure: "Not sure yet",
  blueprint: "System Map",
  system_map: "System Map",
  launch_system: "Website Launch",
  website_launch: "Website Launch",
  lead_engine: "Lead Engine",
  training_platform: "Training Platform",
  industry_os: "Company OS",
  company_os: "Company OS",
  custom_platform: "Custom Platform",
  operations: "Operations Partner",
};

type Lead = {
  id: string;
  created_at: string;
  full_name: string;
  email: string;
  phone: string | null;
  business_name: string | null;
  website_url: string | null;
  current_platform: string | null;
  monthly_platform_spend: string | null;
  industry: string | null;
  desired_modules: string[];
  interest: string;
  goals: string | null;
  budget_range: string | null;
  timeline: string | null;
  best_contact_method: string | null;
  status: string;
  notes: string | null;
  owner: string | null;
  source: string | null;
  utm_source: string | null;
  utm_medium: string | null;
  utm_campaign: string | null;
  is_test: boolean;
  sms_consent: boolean;
  marketing_email_consent: boolean;
  consent_at: string | null;
  email_unsubscribed_at: string | null;
  sms_unsubscribed_at: string | null;
  diagnostic: Record<string, unknown> | null;
};

type Note = { id: string; body: string; author: string | null; created_at: string };
type Task = {
  id: string;
  title: string;
  due_date: string | null;
  completed_at: string | null;
  created_at: string;
};
type Activity = { id: string; kind: string; detail: string; created_at: string };
type LeadEmail = { id: string; step: number; sent_at: string };
export type DiagnosticNotification = {
  id: string;
  event_type: "draft_saved" | "submitted";
  status: "pending" | "sent" | "failed";
  attempt_count: number;
  next_attempt_at: string;
  last_attempt_at: string | null;
  sent_at: string | null;
  last_error: string | null;
  created_at: string;
};

function fmt(ts: string) {
  return new Date(ts).toLocaleString();
}

function pretty(v: string | null | undefined) {
  return v ? v.replace(/_/g, " ") : "-";
}

function ConsentBadge({
  label,
  granted,
  withdrawnAt,
}: {
  label: string;
  granted: boolean;
  withdrawnAt: string | null;
}) {
  const state = withdrawnAt ? "withdrawn" : granted ? "granted" : "none";
  const styles =
    state === "granted"
      ? "bg-mint/15 text-mint"
      : state === "withdrawn"
        ? "bg-warn/15 text-warn"
        : "bg-[var(--fill-3)] text-[var(--muted)]";
  return (
    <span className={`rounded-full px-3 py-1 text-xs font-bold ${styles}`}>
      {label}:{" "}
      {state === "granted"
        ? "consented"
        : state === "withdrawn"
          ? `withdrawn ${new Date(withdrawnAt!).toLocaleDateString()}`
          : "no consent"}
    </span>
  );
}

type Diagnostic = {
  source?: string;
  labels?: {
    goal?: string;
    industry?: string;
    presence?: string;
    sales_channels?: string[];
    stages?: string[];
    // Kept for older rows written before the guided intake used an array.
    stage?: string;
  };
  recommendation?: {
    package_name?: string;
    price_range?: string;
    module_labels?: string[];
  };
  next_action?: string;
  owner_notes?: string | null;
};

type BusinessDiagnosticSummary = {
  problem?: unknown;
  desired_outcome?: unknown;
  success_definition?: unknown;
  help_categories?: unknown;
  timeframe?: unknown;
  decision_role?: unknown;
  website_state?: unknown;
  website_platform?: unknown;
  website_issue_detail?: unknown;
  facebook_page_status?: unknown;
  youtube_status?: unknown;
  crm_status?: unknown;
  lead_response_time?: unknown;
};

export type StoredBusinessDiagnostic = {
  status: string;
  form_version: number;
  answers: Record<string, unknown> | null;
  completeness_score: number;
  opportunity_score: number;
  tags: string[];
  source_channel: string | null;
  submitted_at: string | null;
  updated_at: string;
};

function asRecord(value: unknown): Record<string, unknown> {
  return value && typeof value === "object" && !Array.isArray(value)
    ? (value as Record<string, unknown>)
    : {};
}

function displayValue(value: unknown): string {
  if (Array.isArray(value)) {
    const values = value
      .filter((item): item is string => typeof item === "string")
      .map((item) => pretty(item));
    return values.length ? values.join(", ") : "-";
  }
  if (typeof value === "string") return pretty(value);
  if (typeof value === "number") return String(value);
  return "-";
}

function displayText(value: unknown): string {
  if (typeof value === "string") return value.trim() || "-";
  return displayValue(value);
}

function displayScore(value: unknown): number | null {
  return typeof value === "number" && Number.isFinite(value) ? Math.round(value) : null;
}

function safeDiagnosticForDisplay(value: unknown): unknown {
  if (Array.isArray(value)) return value.map(safeDiagnosticForDisplay);
  if (!value || typeof value !== "object") return value;

  return Object.fromEntries(
    Object.entries(value as Record<string, unknown>)
      .filter(([key]) => {
        const normalized = key.toLowerCase().replace(/[^a-z]/g, "");
        return !normalized.includes("resume");
      })
      .map(([key, item]) => [key, safeDiagnosticForDisplay(item)]),
  );
}

function BusinessGrowthDiagnosticViewer({ diagnostic }: { diagnostic: Record<string, unknown> }) {
  const summary = asRecord(diagnostic.summary) as BusinessDiagnosticSummary;
  const completeness = displayScore(diagnostic.completeness_score);
  const opportunity = displayScore(diagnostic.opportunity_score);
  const tags = Array.isArray(diagnostic.tags)
    ? diagnostic.tags.filter((item): item is string => typeof item === "string").slice(0, 40)
    : [];
  const submittedAt =
    typeof diagnostic.submitted_at === "string" ? diagnostic.submitted_at : null;

  return (
    <div className="card !p-4">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h2 className="text-sm font-bold uppercase tracking-wide text-[var(--muted)]">
            Business Growth Diagnostic
          </h2>
          <p className="mt-1 text-xs text-[var(--quiet)]">
            {submittedAt ? `Submitted ${fmt(submittedAt)}` : "Saved business intake"}
          </p>
        </div>
        <div className="flex flex-wrap gap-2 text-xs font-bold">
          <span className="rounded-full bg-[var(--fill-3)] px-3 py-1 text-[var(--text)]">
            {displayValue(diagnostic.status)}
          </span>
          {completeness !== null && (
            <span className="rounded-full bg-mint/15 px-3 py-1 text-mint">
              {completeness}% complete
            </span>
          )}
          {opportunity !== null && (
            <span className="rounded-full bg-flow-400/15 px-3 py-1 text-flow-400">
              Opportunity {opportunity}/100
            </span>
          )}
        </div>
      </div>

      <p className="mt-3 text-sm font-bold text-[var(--heading)]">
        {displayValue(diagnostic.readiness_label)}
      </p>

      <dl className="mt-3 grid gap-3 text-sm sm:grid-cols-2">
        <div className="rounded-lg bg-[var(--page)] p-3">
          <dt className="text-[var(--muted)]">Top problem</dt>
          <dd className="mt-1 whitespace-pre-wrap text-[var(--text)]">
            {displayText(summary.problem)}
          </dd>
        </div>
        <div className="rounded-lg bg-[var(--page)] p-3">
          <dt className="text-[var(--muted)]">Desired outcome</dt>
          <dd className="mt-1 whitespace-pre-wrap text-[var(--text)]">
            {displayText(summary.desired_outcome)}
          </dd>
        </div>
        {displayText(summary.success_definition) !== "-" && (
          <div className="rounded-lg bg-[var(--page)] p-3 sm:col-span-2">
            <dt className="text-[var(--muted)]">What success looks like</dt>
            <dd className="mt-1 whitespace-pre-wrap text-[var(--text)]">
              {displayText(summary.success_definition)}
            </dd>
          </div>
        )}
      </dl>

      <div className="mt-4 grid gap-3 text-sm sm:grid-cols-2">
        <DiagnosticGroup
          title="Business request"
          rows={[
            ["Help requested", summary.help_categories],
            ["Timeframe", summary.timeframe],
            ["Decision role", summary.decision_role],
          ]}
        />
        <DiagnosticGroup
          title="Website"
          rows={[
            ["State", summary.website_state],
            ["Platform", summary.website_platform],
            ["Issue", summary.website_issue_detail, "text"],
          ]}
        />
        <DiagnosticGroup
          title="Social presence"
          rows={[
            ["Facebook", summary.facebook_page_status],
            ["YouTube", summary.youtube_status],
          ]}
        />
        <DiagnosticGroup
          title="Lead flow"
          rows={[
            ["Lead tracking", summary.crm_status],
            ["Response time", summary.lead_response_time],
          ]}
        />
      </div>

      {tags.length > 0 && (
        <div className="mt-4">
          <p className="text-xs font-bold uppercase tracking-wide text-[var(--muted)]">Tags</p>
          <div className="mt-2 flex flex-wrap gap-2">
            {tags.map((tag) => (
              <span
                key={tag}
                className="rounded-full bg-[var(--fill-3)] px-2.5 py-1 text-xs text-[var(--text)]"
              >
                {tag}
              </span>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

function DiagnosticGroup({
  title,
  rows,
}: {
  title: string;
  rows: Array<[string, unknown, ("text" | "label")?]>;
}) {
  return (
    <section className="rounded-lg border border-[var(--line)] p-3">
      <h3 className="font-bold text-[var(--heading)]">{title}</h3>
      <dl className="mt-2 space-y-2">
        {rows.map(([label, value, format]) => (
          <div key={label}>
            <dt className="text-xs text-[var(--muted)]">{label}</dt>
            <dd className="whitespace-pre-wrap text-[var(--text)]">
              {format === "text" ? displayText(value) : displayValue(value)}
            </dd>
          </div>
        ))}
      </dl>
    </section>
  );
}

function hasStoredAnswer(value: unknown): boolean {
  if (typeof value === "boolean") return true;
  if (typeof value === "string") return value.trim().length > 0;
  return Array.isArray(value) && value.length > 0;
}

function answerLabel(field: DiagnosticField, value: unknown): string {
  if (typeof value === "boolean") return value ? "Yes" : "No";
  const optionLabel = (item: string) =>
    field.options?.find((option) => option.value === item)?.label ?? pretty(item);
  if (Array.isArray(value)) {
    return value
      .filter((item): item is string => typeof item === "string")
      .map(optionLabel)
      .join(", ");
  }
  if (typeof value === "string") {
    if (field.options?.length) return optionLabel(value);
    return value;
  }
  return "-";
}

function FullBusinessDiagnosticViewer({ response }: { response: StoredBusinessDiagnostic }) {
  const answers = asRecord(response.answers) as DiagnosticAnswers;
  const answeredSections = BUSINESS_DIAGNOSTIC_SECTIONS.map((section) => ({
    ...section,
    fields: section.fields.filter(
      (field) => fieldVisible(field, answers) && hasStoredAnswer(answers[field.id]),
    ),
  })).filter((section) => section.fields.length > 0);

  return (
    <div className="card !p-4">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h2 className="text-sm font-bold uppercase tracking-wide text-[var(--muted)]">
            Full questionnaire answers
          </h2>
          <p className="mt-1 text-xs text-[var(--quiet)]">
            Form v{response.form_version} · {displayValue(response.source_channel)} · Updated{" "}
            {fmt(response.updated_at)}
          </p>
        </div>
        <span className="rounded-full bg-[var(--fill-3)] px-3 py-1 text-xs font-bold text-[var(--text)]">
          {response.completeness_score}% complete
        </span>
      </div>

      {answeredSections.length > 0 ? (
        <div className="mt-4 space-y-2">
          {answeredSections.map((section, index) => (
            <details
              key={section.id}
              open={index === 0}
              className="rounded-lg border border-[var(--line)] bg-[var(--page)]"
            >
              <summary className="cursor-pointer px-4 py-3 font-bold text-[var(--heading)]">
                {section.title}{" "}
                <span className="text-xs font-normal text-[var(--muted)]">
                  ({section.fields.length} answered)
                </span>
              </summary>
              <dl className="grid gap-4 border-t border-[var(--line)] px-4 py-4 text-sm sm:grid-cols-2">
                {section.fields.map((field) => (
                  <div
                    key={field.id}
                    className={field.type === "textarea" ? "sm:col-span-2" : undefined}
                  >
                    <dt className="text-xs text-[var(--muted)]">{field.label}</dt>
                    <dd className="mt-1 break-words whitespace-pre-wrap text-[var(--text)]">
                      {answerLabel(field, answers[field.id])}
                    </dd>
                  </div>
                ))}
              </dl>
            </details>
          ))}
        </div>
      ) : (
        <p className="mt-3 text-sm text-[var(--muted)]">No questionnaire answers are available.</p>
      )}
    </div>
  );
}

function DiagnosticNotificationStatus({
  notifications,
}: {
  notifications: DiagnosticNotification[];
}) {
  if (!notifications.length) return null;

  return (
    <div className="card !p-4">
      <h2 className="text-sm font-bold uppercase tracking-wide text-[var(--muted)]">
        Owner notification delivery
      </h2>
      <ul className="mt-3 space-y-3">
        {notifications.map((notification) => {
          const label = notification.event_type === "submitted" ? "Final submission" : "Draft saved";
          const badge =
            notification.status === "sent"
              ? "bg-mint/15 text-mint"
              : notification.status === "failed"
                ? "bg-warn/15 text-warn"
                : "bg-flow-400/15 text-flow-400";
          return (
            <li key={notification.id} className="rounded-lg border border-[var(--line)] p-3 text-sm">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <span className="font-bold text-[var(--heading)]">{label}</span>
                <span className={`rounded-full px-2.5 py-1 text-xs font-bold ${badge}`}>
                  {notification.status}
                </span>
              </div>
              <p className="mt-1 text-xs text-[var(--muted)]">
                Attempts: {notification.attempt_count}
                {notification.sent_at
                  ? ` · Delivered ${fmt(notification.sent_at)}`
                  : notification.status === "pending"
                    ? ` · Next retry ${fmt(notification.next_attempt_at)}`
                    : " · Manual follow-up task created"}
              </p>
              {notification.last_error && notification.status !== "sent" && (
                <p className="mt-2 break-words rounded bg-warn/10 p-2 text-xs text-warn">
                  {notification.last_error}
                </p>
              )}
            </li>
          );
        })}
      </ul>
    </div>
  );
}

export function DiagnosticViewer({
  diagnostic,
  businessDiagnostic,
  notifications = [],
}: {
  diagnostic: Record<string, unknown> | null;
  businessDiagnostic?: StoredBusinessDiagnostic | null;
  notifications?: DiagnosticNotification[];
}) {
  const isBusinessDiagnostic =
    diagnostic?.source === "business_growth_diagnostic" || Boolean(businessDiagnostic);

  if (isBusinessDiagnostic) {
    const storedAnswers = asRecord(businessDiagnostic?.answers);
    const storedCompleteness = businessDiagnostic?.completeness_score;
    const compactDiagnostic: Record<string, unknown> = {
      ...(diagnostic ?? {}),
      source: "business_growth_diagnostic",
      summary:
        diagnostic?.summary ??
        {
          problem: storedAnswers.primary_problem ?? storedAnswers.situation_summary,
          desired_outcome: storedAnswers.desired_outcome,
          success_definition: storedAnswers.success_definition,
          help_categories: storedAnswers.help_categories,
          timeframe: storedAnswers.timeframe,
          decision_role: storedAnswers.decision_role,
          website_state: storedAnswers.website_state,
          website_platform: storedAnswers.website_platform,
          website_issue_detail: storedAnswers.website_issue_detail,
          facebook_page_status: storedAnswers.facebook_page_status,
          youtube_status: storedAnswers.youtube_status,
          crm_status: storedAnswers.crm_status,
          lead_response_time: storedAnswers.lead_response_time,
        },
      readiness_label:
        diagnostic?.readiness_label ??
        (storedCompleteness === undefined
          ? undefined
          : diagnosticReadinessLabel(storedCompleteness)),
      ...(businessDiagnostic
        ? {
            status: businessDiagnostic.status,
            form_version: businessDiagnostic.form_version,
            completeness_score: businessDiagnostic.completeness_score,
            opportunity_score: businessDiagnostic.opportunity_score,
            tags: businessDiagnostic.tags,
            submitted_at: businessDiagnostic.submitted_at,
          }
        : {}),
    };

    return (
      <div className="space-y-6">
        <BusinessGrowthDiagnosticViewer diagnostic={compactDiagnostic} />
        {businessDiagnostic && <FullBusinessDiagnosticViewer response={businessDiagnostic} />}
        <DiagnosticNotificationStatus notifications={notifications} />
      </div>
    );
  }

  if (!diagnostic) {
    return (
      <div className="card !p-4">
        <h2 className="text-sm font-bold uppercase tracking-wide text-[var(--muted)]">
          System Map diagnostic
        </h2>
        <p className="mt-2 text-sm text-[var(--muted)]">
          No guided diagnostic on this lead. It fills in automatically when someone
          completes the Map My System flow.
        </p>
      </div>
    );
  }

  const d = diagnostic as Diagnostic;
  const stages = d.labels?.stages ?? (d.labels?.stage ? [d.labels.stage] : []);
  return (
    <div className="card !p-4">
      <h2 className="text-sm font-bold uppercase tracking-wide text-[var(--muted)]">
        System Map diagnostic
      </h2>
      {d.labels && (
        <dl className="mt-3 grid gap-x-6 gap-y-2 text-sm sm:grid-cols-2">
          <div>
            <dt className="text-[var(--muted)]">Problem</dt>
            <dd className="text-[var(--text)]">{d.labels.goal ?? "-"}</dd>
          </div>
          <div>
            <dt className="text-[var(--muted)]">Business</dt>
            <dd className="text-[var(--text)]">{d.labels.industry ?? "-"}</dd>
          </div>
          <div>
            <dt className="text-[var(--muted)]">Home base</dt>
            <dd className="text-[var(--text)]">{d.labels.presence ?? "-"}</dd>
          </div>
          <div>
            <dt className="text-[var(--muted)]">Current setup</dt>
            <dd className="text-[var(--text)]">{stages.length ? stages.join(", ") : "-"}</dd>
          </div>
          {(d.labels.sales_channels ?? []).length > 0 && (
            <div className="sm:col-span-2">
              <dt className="text-[var(--muted)]">Sales channels</dt>
              <dd className="text-[var(--text)]">{d.labels.sales_channels!.join(", ")}</dd>
            </div>
          )}
        </dl>
      )}
      {d.recommendation && (
        <div className="mt-4 rounded-lg bg-[var(--page)] p-3 text-sm">
          <p className="font-bold text-[var(--heading)]">
            Recommended: {d.recommendation.package_name ?? "-"}{" "}
            <span className="text-flow-400">{d.recommendation.price_range ?? ""}</span>
          </p>
          {(d.recommendation.module_labels ?? []).length > 0 && (
            <p className="mt-1 text-[var(--text)]">
              {d.recommendation.module_labels!.join(" · ")}
            </p>
          )}
          {d.next_action && <p className="mt-2 text-[var(--muted)]">Next: {d.next_action}</p>}
        </div>
      )}
      {d.owner_notes && (
        <p className="mt-3 rounded-lg bg-[var(--page)] p-3 text-sm text-[var(--text)]">
          <span className="text-[var(--muted)]">In their words:</span> {d.owner_notes}
        </p>
      )}
      <details className="mt-3">
        <summary className="cursor-pointer text-xs text-[var(--muted)]">Raw diagnostic JSON</summary>
        <pre className="mt-2 max-h-80 overflow-auto rounded-lg bg-[var(--page)] p-3 text-xs text-[var(--text)]">
          {JSON.stringify(safeDiagnosticForDisplay(diagnostic), null, 2)}
        </pre>
      </details>
    </div>
  );
}

export default function LeadWorkspace({
  lead,
  initialNotes,
  initialTasks,
  initialActivity,
  emails,
  initialThread,
  businessDiagnostic,
  diagnosticNotifications,
}: {
  lead: Lead;
  initialNotes: Note[];
  initialTasks: Task[];
  initialActivity: Activity[];
  emails: LeadEmail[];
  initialThread: LeadMsg[];
  businessDiagnostic: StoredBusinessDiagnostic | null;
  diagnosticNotifications: DiagnosticNotification[];
}) {
  const [status, setStatusState] = useState(lead.status);
  const [owner, setOwnerState] = useState(lead.owner ?? "");
  const [notes, setNotes] = useState(initialNotes);
  const [tasks, setTasks] = useState(initialTasks);
  const [activity, setActivity] = useState(initialActivity);
  const [noteDraft, setNoteDraft] = useState("");
  const [taskDraft, setTaskDraft] = useState("");
  const [saving, setSaving] = useState(false);

  async function logActivity(kind: string, detail: string) {
    const supabase = createClient();
    const { data } = await supabase
      .from("lead_activity")
      .insert({ lead_id: lead.id, kind, detail })
      .select()
      .single();
    if (data) setActivity((a) => [data, ...a]);
  }

  async function changeStage(next: string) {
    const prev = status;
    if (next === prev) return;
    setStatusState(next);
    const supabase = createClient();
    const { error } = await supabase.from("leads").update({ status: next }).eq("id", lead.id);
    if (error) {
      setStatusState(prev);
      return;
    }
    await logActivity(
      "stage_change",
      `Stage: ${STAGE_LABELS[prev] ?? prev} to ${STAGE_LABELS[next] ?? next}`,
    );
  }

  async function saveOwner() {
    const next = owner.trim();
    if (next === (lead.owner ?? "")) return;
    setSaving(true);
    const supabase = createClient();
    const { error } = await supabase
      .from("leads")
      .update({ owner: next || null })
      .eq("id", lead.id);
    setSaving(false);
    if (!error) {
      await logActivity(
        "owner_change",
        next ? `Owner set to ${next}` : "Owner cleared",
      );
    }
  }

  async function addNote(e: React.FormEvent) {
    e.preventDefault();
    const body = noteDraft.trim();
    if (!body) return;
    const supabase = createClient();
    const { data } = await supabase
      .from("lead_notes")
      .insert({ lead_id: lead.id, body })
      .select()
      .single();
    if (data) {
      setNotes((n) => [data, ...n]);
      setNoteDraft("");
    }
  }

  async function addTask(e: React.FormEvent) {
    e.preventDefault();
    const title = taskDraft.trim();
    if (!title) return;
    const supabase = createClient();
    const { data } = await supabase
      .from("lead_tasks")
      .insert({ lead_id: lead.id, title })
      .select()
      .single();
    if (data) {
      setTasks((t) => [data, ...t]);
      setTaskDraft("");
    }
  }

  async function toggleTask(task: Task) {
    const completed_at = task.completed_at ? null : new Date().toISOString();
    setTasks((ts) => ts.map((t) => (t.id === task.id ? { ...t, completed_at } : t)));
    const supabase = createClient();
    await supabase.from("lead_tasks").update({ completed_at }).eq("id", task.id);
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <Link href="/admin" className="text-sm text-[var(--muted)] hover:text-[var(--heading)]">
            ← All leads
          </Link>
          <h1 className="mt-1 text-2xl font-black text-[var(--heading)]">
            {lead.full_name}
            {lead.business_name && (
              <span className="ml-2 text-base font-semibold text-[var(--muted)]">
                {lead.business_name}
              </span>
            )}
          </h1>
          <p className="mt-1 text-xs text-[var(--muted)]">
            Arrived {fmt(lead.created_at)} · {INTEREST_LABELS[lead.interest] ?? lead.interest}
            {lead.is_test && " · TEST LEAD"}
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-3">
          <label className="text-xs text-[var(--muted)]">
            Stage
            <select
              className="input !w-auto !py-1.5 ml-2 text-sm"
              value={status}
              onChange={(e) => changeStage(e.target.value)}
            >
              {STAGES.map((s) => (
                <option key={s} value={s}>
                  {STAGE_LABELS[s]}
                </option>
              ))}
            </select>
          </label>
          <label className="text-xs text-[var(--muted)]">
            Owner
            <input
              className="input !w-40 !py-1.5 ml-2 text-sm"
              value={owner}
              placeholder="Unassigned"
              onChange={(e) => setOwnerState(e.target.value)}
              onBlur={saveOwner}
              disabled={saving}
            />
          </label>
        </div>
      </div>

      <div className="flex flex-wrap gap-2">
        <ConsentBadge
          label="Email"
          granted={lead.marketing_email_consent}
          withdrawnAt={lead.email_unsubscribed_at}
        />
        <ConsentBadge
          label="SMS"
          granted={lead.sms_consent}
          withdrawnAt={lead.sms_unsubscribed_at}
        />
        {lead.consent_at && (
          <span className="rounded-full bg-[var(--fill-3)] px-3 py-1 text-xs text-[var(--muted)]">
            Consent recorded {fmt(lead.consent_at)}
          </span>
        )}
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        <div className="space-y-6">
          <div className="card !p-4">
            <h2 className="text-sm font-bold uppercase tracking-wide text-[var(--muted)]">
              Intake
            </h2>
            <dl className="mt-3 grid gap-x-6 gap-y-2 text-sm sm:grid-cols-2">
              <div>
                <dt className="text-[var(--muted)]">Email</dt>
                <dd>
                  <a href={`mailto:${lead.email}`} className="text-flow-400">
                    {lead.email}
                  </a>
                </dd>
              </div>
              <div>
                <dt className="text-[var(--muted)]">Phone</dt>
                <dd>
                  {lead.phone ? (
                    <a href={`tel:${lead.phone}`} className="text-flow-400">
                      {lead.phone}
                    </a>
                  ) : (
                    "-"
                  )}
                </dd>
              </div>
              <div>
                <dt className="text-[var(--muted)]">Website / profile</dt>
                <dd className="break-all text-[var(--text)]">{lead.website_url ?? "-"}</dd>
              </div>
              <div>
                <dt className="text-[var(--muted)]">Industry</dt>
                <dd className="text-[var(--text)]">{pretty(lead.industry)}</dd>
              </div>
              <div>
                <dt className="text-[var(--muted)]">Home base</dt>
                <dd className="text-[var(--text)]">{pretty(lead.current_platform)}</dd>
              </div>
              <div>
                <dt className="text-[var(--muted)]">Budget</dt>
                <dd className="text-[var(--text)]">{pretty(lead.budget_range)}</dd>
              </div>
              <div>
                <dt className="text-[var(--muted)]">Timeline</dt>
                <dd className="text-[var(--text)]">{pretty(lead.timeline)}</dd>
              </div>
              <div>
                <dt className="text-[var(--muted)]">Prefers</dt>
                <dd className="text-[var(--text)]">{pretty(lead.best_contact_method)}</dd>
              </div>
              <div>
                <dt className="text-[var(--muted)]">Source</dt>
                <dd className="text-[var(--text)]">
                  {[lead.source, lead.utm_source, lead.utm_medium, lead.utm_campaign]
                    .filter(Boolean)
                    .join(" / ") || "-"}
                </dd>
              </div>
              {(lead.desired_modules ?? []).length > 0 && (
                <div className="sm:col-span-2">
                  <dt className="text-[var(--muted)]">Modules</dt>
                  <dd className="text-[var(--text)]">
                    {lead.desired_modules.map((m) => pretty(m)).join(", ")}
                  </dd>
                </div>
              )}
            </dl>
            {lead.goals && (
              <p className="mt-3 rounded-lg bg-[var(--page)] p-3 text-sm text-[var(--text)]">
                <span className="text-[var(--muted)]">Summary:</span> {lead.goals}
              </p>
            )}
          </div>

          <DiagnosticViewer
            diagnostic={lead.diagnostic}
            businessDiagnostic={businessDiagnostic}
            notifications={diagnosticNotifications}
          />

          <div className="card !p-4">
            <h2 className="text-sm font-bold uppercase tracking-wide text-[var(--muted)]">
              Automated emails
            </h2>
            {emails.length === 0 ? (
              <p className="mt-2 text-sm text-[var(--muted)]">No automated emails sent yet.</p>
            ) : (
              <ul className="mt-2 space-y-1 text-sm text-[var(--text)]">
                {emails.map((e) => (
                  <li key={e.id}>
                    Step {e.step} · sent {fmt(e.sent_at)}
                  </li>
                ))}
              </ul>
            )}
          </div>
        </div>

        <div className="space-y-6">
          <LeadThread
            leadId={lead.id}
            initialMessages={initialThread}
            canText={Boolean(lead.phone) && lead.sms_consent && !lead.sms_unsubscribed_at}
            hasEmail={Boolean(lead.email)}
          />

          <div className="card !p-4">
            <h2 className="text-sm font-bold uppercase tracking-wide text-[var(--muted)]">Notes</h2>
            <form onSubmit={addNote} className="mt-3 flex gap-2">
              <input
                className="input text-sm"
                value={noteDraft}
                onChange={(e) => setNoteDraft(e.target.value)}
                placeholder="Add a note"
                maxLength={4000}
              />
              <button type="submit" className="btn-primary !px-4 !py-2 text-sm">
                Add
              </button>
            </form>
            <ul className="mt-4 space-y-3">
              {lead.notes && (
                <li className="rounded-lg bg-[var(--page)] p-3 text-sm text-[var(--text)]">
                  <span className="text-xs text-[var(--quiet)]">Legacy note</span>
                  <p>{lead.notes}</p>
                </li>
              )}
              {notes.map((n) => (
                <li key={n.id} className="rounded-lg bg-[var(--page)] p-3 text-sm text-[var(--text)]">
                  <span className="text-xs text-[var(--quiet)]">{fmt(n.created_at)}</span>
                  <p>{n.body}</p>
                </li>
              ))}
              {notes.length === 0 && !lead.notes && (
                <li className="text-sm text-[var(--muted)]">No notes yet.</li>
              )}
            </ul>
          </div>

          <div className="card !p-4">
            <h2 className="text-sm font-bold uppercase tracking-wide text-[var(--muted)]">Tasks</h2>
            <form onSubmit={addTask} className="mt-3 flex gap-2">
              <input
                className="input text-sm"
                value={taskDraft}
                onChange={(e) => setTaskDraft(e.target.value)}
                placeholder="Add a follow-up task"
                maxLength={300}
              />
              <button type="submit" className="btn-primary !px-4 !py-2 text-sm">
                Add
              </button>
            </form>
            <ul className="mt-4 space-y-2">
              {tasks.map((t) => (
                <li key={t.id} className="flex items-center gap-3 text-sm">
                  <input
                    type="checkbox"
                    checked={!!t.completed_at}
                    onChange={() => toggleTask(t)}
                    aria-label={`Mark task ${t.title} ${t.completed_at ? "open" : "done"}`}
                  />
                  <span
                    className={t.completed_at ? "text-[var(--quiet)] line-through" : "text-[var(--text)]"}
                  >
                    {t.title}
                  </span>
                </li>
              ))}
              {tasks.length === 0 && <li className="text-sm text-[var(--muted)]">No tasks yet.</li>}
            </ul>
          </div>

          <div className="card !p-4">
            <h2 className="text-sm font-bold uppercase tracking-wide text-[var(--muted)]">
              Activity
            </h2>
            <ul className="mt-3 space-y-2 text-sm">
              {activity.map((a) => (
                <li key={a.id} className="flex gap-3">
                  <span className="whitespace-nowrap text-xs text-[var(--quiet)]">
                    {fmt(a.created_at)}
                  </span>
                  <span className="text-[var(--text)]">{a.detail}</span>
                </li>
              ))}
              {activity.length === 0 && (
                <li className="text-sm text-[var(--muted)]">
                  No activity yet. Stage and owner changes are logged automatically.
                </li>
              )}
            </ul>
          </div>
        </div>
      </div>

      <div className="flex justify-end border-t border-[var(--line)] pt-5">
        <DeleteLead leadId={lead.id} leadName={lead.full_name} />
      </div>
    </div>
  );
}
