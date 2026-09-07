"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import LeadHistory from "@/app/admin/leads/[id]/LeadHistory";
import {
  buildLeadTimeline,
  originalLeadAnswers,
  type LeadNoteRecord,
  type LeadActivityRecord,
  type LeadEmailRecord,
  type LeadCallRecord,
} from "@/lib/leadTimeline";
import Link from "next/link";
import { createClient } from "@/lib/supabase/client";
import LeadThread, { type LeadMsg } from "@/app/admin/leads/[id]/LeadThread";
import {
  DiagnosticViewer,
  type StoredBusinessDiagnostic,
} from "@/app/admin/leads/[id]/LeadWorkspace";
import DictationButton from "@/components/DictationButton";

const STAGES = [
  "new",
  "contacted",
  "call_booked",
  "proposal",
  "won",
  "lost",
] as const;

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
  priority: string;
  next_follow_up_at: string | null;
  last_contacted_at: string | null;
  expected_value_cents: number | null;
  close_probability: number | null;
  lost_reason: string | null;
  source: string | null;
  utm_source: string | null;
  utm_medium: string | null;
  utm_campaign: string | null;
  sms_consent: boolean;
  marketing_email_consent: boolean;
  email_unsubscribed_at: string | null;
  sms_unsubscribed_at: string | null;
  diagnostic: Record<string, unknown> | null;
};

type Note = LeadNoteRecord;
type Task = {
  id: string;
  title: string;
  due_date: string | null;
  completed_at: string | null;
  created_at: string;
  priority: string;
  assigned_to: string | null;
  task_type: string;
};
type Activity = LeadActivityRecord;
type LeadEmail = LeadEmailRecord;
type Project = {
  id: string;
  name: string;
  status: string;
  target_launch: string | null;
  client_portal_invited_at: string | null;
  milestones: { id: string; status: string }[];
  deliverables: {
    id: string;
    title: string;
    status: string;
    visible_to_client: boolean;
    client_decision: string;
  }[];
};

function pretty(value: string | null | undefined) {
  return value ? value.replace(/_/g, " ") : "Not answered";
}

function fmt(value: string) {
  return new Date(value).toLocaleString();
}

export default function SalesLeadWorkspace({
  lead,
  initialNotes,
  initialTasks,
  initialActivity,
  emails,
  initialThread,
  projects,
  businessDiagnostic,
  calls,
  actorName,
  unavailableSections,
}: {
  lead: Lead;
  initialNotes: Note[];
  initialTasks: Task[];
  initialActivity: Activity[];
  emails: LeadEmail[];
  initialThread: LeadMsg[];
  projects: Project[];
  businessDiagnostic: StoredBusinessDiagnostic | null;
  calls: LeadCallRecord[];
  actorName: string;
  unavailableSections: string[];
}) {
  const [status, setStatus] = useState(lead.status);
  const [owner, setOwner] = useState(lead.owner ?? "");
  const [priority, setPriority] = useState(lead.priority ?? "normal");
  const [nextFollowUp, setNextFollowUp] = useState(
    lead.next_follow_up_at?.slice(0, 10) ?? "",
  );
  const [expectedValue, setExpectedValue] = useState(
    lead.expected_value_cents == null
      ? ""
      : String(lead.expected_value_cents / 100),
  );
  const [closeProbability, setCloseProbability] = useState(
    lead.close_probability == null ? "" : String(lead.close_probability),
  );
  const [notes, setNotes] = useState(initialNotes);
  const [tasks, setTasks] = useState(initialTasks);
  const [activity, setActivity] = useState(initialActivity);
  const [noteDraft, setNoteDraft] = useState("");
  const [taskDraft, setTaskDraft] = useState("");
  const [taskDue, setTaskDue] = useState("");
  const [taskPriority, setTaskPriority] = useState("normal");
  const [taskType, setTaskType] = useState("call");
  const [error, setError] = useState("");
  const [thread, setThread] = useState(initialThread);
  const [savingNote, setSavingNote] = useState(false);
  const [savingTask, setSavingTask] = useState(false);
  const router = useRouter();
  const serverFields = {
    status: lead.status,
    owner: lead.owner ?? "",
    priority: lead.priority ?? "normal",
    nextFollowUp: lead.next_follow_up_at?.slice(0, 10) ?? "",
    expectedValue:
      lead.expected_value_cents == null
        ? ""
        : String(lead.expected_value_cents / 100),
    closeProbability:
      lead.close_probability == null ? "" : String(lead.close_probability),
  };
  const previousServer = useRef(serverFields);
  useEffect(() => {
    const previous = previousServer.current;
    const incoming = {
      status: lead.status,
      owner: lead.owner ?? "",
      priority: lead.priority ?? "normal",
      nextFollowUp: lead.next_follow_up_at?.slice(0, 10) ?? "",
      expectedValue:
        lead.expected_value_cents == null
          ? ""
          : String(lead.expected_value_cents / 100),
      closeProbability:
        lead.close_probability == null ? "" : String(lead.close_probability),
    };
    // Refresh saved fields only while they still match the previous server value.
    // A half-written owner, amount, date, note, task, or reply is never discarded.
    setStatus((current) =>
      current === previous.status ? incoming.status : current,
    );
    setOwner((current) =>
      current === previous.owner ? incoming.owner : current,
    );
    setPriority((current) =>
      current === previous.priority ? incoming.priority : current,
    );
    setNextFollowUp((current) =>
      current === previous.nextFollowUp ? incoming.nextFollowUp : current,
    );
    setExpectedValue((current) =>
      current === previous.expectedValue ? incoming.expectedValue : current,
    );
    setCloseProbability((current) =>
      current === previous.closeProbability
        ? incoming.closeProbability
        : current,
    );
    previousServer.current = incoming;
  }, [
    lead.status,
    lead.owner,
    lead.priority,
    lead.next_follow_up_at,
    lead.expected_value_cents,
    lead.close_probability,
  ]);
  useEffect(() => setNotes(initialNotes), [initialNotes]);
  useEffect(() => setTasks(initialTasks), [initialTasks]);
  useEffect(() => setActivity(initialActivity), [initialActivity]);
  useEffect(() => setThread(initialThread), [initialThread]);
  const timeline = buildLeadTimeline({
    lead,
    notes,
    activity,
    messages: thread,
    emails,
    calls,
  });
  const originalAnswers = originalLeadAnswers(lead.diagnostic);
  const supabase = createClient();

  async function logActivity(detail: string) {
    const { data } = await supabase
      .from("lead_activity")
      .insert({
        lead_id: lead.id,
        kind: "sales",
        detail: `${actorName}: ${detail}`,
      })
      .select()
      .single();
    if (data) setActivity((items) => [data as Activity, ...items]);
    router.refresh();
  }

  async function changeStage(next: string) {
    const previous = status;
    setStatus(next);
    const { error: updateError } = await supabase
      .from("leads")
      .update({ status: next })
      .eq("id", lead.id);
    if (updateError) {
      setStatus(previous);
      setError(updateError.message);
      return;
    }
    await logActivity(`Stage changed to ${pretty(next)}`);
  }

  async function saveOwner() {
    const { error: updateError } = await supabase
      .from("leads")
      .update({ owner: owner.trim() || null })
      .eq("id", lead.id);
    if (updateError) setError(updateError.message);
    else await logActivity(`Owner set to ${owner.trim() || "unassigned"}`);
  }

  async function saveCrmField(values: Record<string, unknown>, detail: string) {
    setError("");
    const { error: updateError } = await supabase
      .from("leads")
      .update(values)
      .eq("id", lead.id);
    if (updateError) setError(updateError.message);
    else await logActivity(detail);
  }

  async function logCall() {
    const now = new Date().toISOString();
    const values: Record<string, unknown> = { last_contacted_at: now };
    if (status === "new") values.status = "contacted";
    const { error: updateError } = await supabase
      .from("leads")
      .update(values)
      .eq("id", lead.id);
    if (updateError) setError(updateError.message);
    else {
      if (status === "new") setStatus("contacted");
      await logActivity("Completed call logged");
    }
  }

  async function addNote(event: React.FormEvent) {
    event.preventDefault();
    const body = noteDraft.trim();
    if (!body || savingNote) return;
    setSavingNote(true);
    setError("");
    const { data, error: insertError } = await supabase
      .from("lead_notes")
      .insert({ lead_id: lead.id, body, author: actorName })
      .select()
      .single();
    if (insertError) setError(insertError.message);
    else if (data) {
      setNotes((items) => [data as Note, ...items]);
      setNoteDraft((current) => (current.trim() === body ? "" : current));
      router.refresh();
    }
    setSavingNote(false);
  }

  async function addTask(event: React.FormEvent) {
    event.preventDefault();
    const title = taskDraft.trim();
    if (!title || savingTask) return;
    setSavingTask(true);
    setError("");
    const { data, error: insertError } = await supabase
      .from("lead_tasks")
      .insert({
        lead_id: lead.id,
        title,
        due_date: taskDue || null,
        priority: taskPriority,
        task_type: taskType,
        assigned_to: owner.trim() || "Sales Desk",
      })
      .select()
      .single();
    if (insertError) setError(insertError.message);
    else if (data) {
      setTasks((items) => [data as Task, ...items]);
      if (taskDue) {
        const nextFollowUpAt = new Date(`${taskDue}T09:00:00`).toISOString();
        await supabase
          .from("leads")
          .update({ next_follow_up_at: nextFollowUpAt })
          .eq("id", lead.id);
        setNextFollowUp(taskDue);
      }
      setTaskDraft((current) => (current.trim() === title ? "" : current));
      router.refresh();
      setTaskDue("");
    }
    setSavingTask(false);
  }

  async function toggleTask(task: Task) {
    const completed_at = task.completed_at ? null : new Date().toISOString();
    const { data, error: updateError } = await supabase
      .from("lead_tasks")
      .update({ completed_at })
      .eq("id", task.id)
      .select()
      .single();
    if (updateError) setError(updateError.message);
    else if (data) {
      setTasks((items) =>
        items.map((item) => (item.id === task.id ? (data as Task) : item)),
      );
      if (
        completed_at &&
        !tasks.some((item) => item.id !== task.id && !item.completed_at)
      ) {
        await supabase
          .from("leads")
          .update({ next_follow_up_at: null })
          .eq("id", lead.id);
        setNextFollowUp("");
      }
    }
  }

  return (
    <div className="space-y-6">
      <div>
        <Link
          href="/admin/sales"
          className="text-sm font-semibold text-flow-400"
        >
          ← Pipeline
        </Link>
        <div className="mt-3 flex flex-wrap items-end gap-4">
          <div className="min-w-0 flex-1">
            <h1 className="text-3xl font-black text-[var(--heading)]">
              {lead.full_name}
            </h1>
            <p className="text-[var(--muted)]">
              {lead.business_name || "Business name not captured"}
            </p>
          </div>
          <label className="text-xs text-[var(--muted)]">
            Stage
            <select
              className="input ml-2 !w-auto !py-1.5 text-sm"
              value={status}
              onChange={(event) => changeStage(event.target.value)}
            >
              {STAGES.map((stage) => (
                <option key={stage} value={stage}>
                  {pretty(stage)}
                </option>
              ))}
            </select>
          </label>
          <label className="text-xs text-[var(--muted)]">
            Owner
            <input
              className="input ml-2 !w-40 !py-1.5 text-sm"
              value={owner}
              onChange={(event) => setOwner(event.target.value)}
              onBlur={saveOwner}
            />
          </label>
          <Link
            href={`/admin/sales/invoices?lead=${lead.id}`}
            className="btn-primary !px-4 !py-2 text-sm"
          >
            Create invoice
          </Link>
        </div>
      </div>

      {unavailableSections.length > 0 && (
        <p
          role="alert"
          className="rounded-lg border border-[var(--warn-line)] bg-[var(--warn-tint)] p-3 text-sm text-[var(--warn)]"
        >
          Some records could not be loaded: {unavailableSections.join(", ")}.
          These sections may be incomplete. Refresh to retry; missing data is
          not being treated as no history.
        </p>
      )}
      {error && (
        <p
          role="alert"
          className="rounded-lg border border-[var(--danger-line)] bg-[var(--danger-tint)] p-3 text-sm text-[var(--danger)]"
        >
          {error}
        </p>
      )}

      <section className="card !p-4">
        <div className="flex flex-wrap items-end justify-between gap-3">
          <div>
            <h2 className="text-sm font-bold uppercase tracking-wide text-[var(--muted)]">
              Deal control
            </h2>
            <p className="mt-1 text-sm text-[var(--text)]">
              Set the attention level, next action, working value, and closing
              confidence.
            </p>
          </div>
          <button
            type="button"
            onClick={logCall}
            className="btn-ghost !px-3 !py-2 text-xs"
          >
            Log completed call
          </button>
        </div>
        <div className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          <label>
            <span className="label">Priority</span>
            <select
              className="input text-sm"
              value={priority}
              onChange={(event) => {
                const next = event.target.value;
                setPriority(next);
                void saveCrmField(
                  { priority: next },
                  `Priority set to ${next}`,
                );
              }}
            >
              <option value="hot">Hot</option>
              <option value="high">High</option>
              <option value="normal">Normal</option>
              <option value="low">Low</option>
            </select>
          </label>
          <label>
            <span className="label">Next follow-up</span>
            <input
              className="input text-sm"
              type="date"
              value={nextFollowUp}
              onChange={(event) => setNextFollowUp(event.target.value)}
              onBlur={() =>
                saveCrmField(
                  {
                    next_follow_up_at: nextFollowUp
                      ? new Date(`${nextFollowUp}T09:00:00`).toISOString()
                      : null,
                  },
                  nextFollowUp
                    ? `Next follow-up set for ${nextFollowUp}`
                    : "Next follow-up cleared",
                )
              }
            />
          </label>
          <label>
            <span className="label">Estimated value ($)</span>
            <input
              className="input text-sm"
              type="number"
              min="0"
              step="100"
              value={expectedValue}
              onChange={(event) => setExpectedValue(event.target.value)}
              onBlur={() =>
                saveCrmField(
                  {
                    expected_value_cents: expectedValue
                      ? Math.round(Number(expectedValue) * 100)
                      : null,
                  },
                  expectedValue
                    ? `Deal value estimated at $${expectedValue}`
                    : "Deal value cleared",
                )
              }
            />
          </label>
          <label>
            <span className="label">Close confidence (%)</span>
            <input
              className="input text-sm"
              type="number"
              min="0"
              max="100"
              step="5"
              value={closeProbability}
              onChange={(event) => setCloseProbability(event.target.value)}
              onBlur={() =>
                saveCrmField(
                  {
                    close_probability: closeProbability
                      ? Number(closeProbability)
                      : null,
                  },
                  closeProbability
                    ? `Close confidence set to ${closeProbability}%`
                    : "Close confidence cleared",
                )
              }
            />
          </label>
        </div>
        <p className="mt-3 text-xs text-[var(--quiet)]">
          Last logged contact:{" "}
          {lead.last_contacted_at
            ? fmt(lead.last_contacted_at)
            : "No completed call logged yet"}
        </p>
      </section>

      <div className="grid gap-6 lg:grid-cols-2">
        <div className="space-y-6">
          <section className="card !p-4">
            <h2 className="text-sm font-bold uppercase tracking-wide text-[var(--muted)]">
              Contact and original intake
            </h2>
            <dl className="mt-3 grid gap-x-6 gap-y-3 text-sm sm:grid-cols-2">
              <Field label="Email">
                <a href={`mailto:${lead.email}`} className="text-flow-400">
                  {lead.email}
                </a>
              </Field>
              <Field label="Phone">
                {lead.phone ? (
                  <a href={`tel:${lead.phone}`} className="text-flow-400">
                    {lead.phone}
                  </a>
                ) : (
                  "Not answered"
                )}
              </Field>
              <Field label="Website / profile">
                {lead.website_url ?? "Not answered"}
              </Field>
              <Field label="Industry">{pretty(lead.industry)}</Field>
              <Field label="Current presence">
                {pretty(lead.current_platform)}
              </Field>
              <Field label="Timeline">{pretty(lead.timeline)}</Field>
              <Field label="Prefers">{pretty(lead.best_contact_method)}</Field>
              <Field label="Budget">{pretty(lead.budget_range)}</Field>
              <Field label="Source">
                {[
                  lead.source,
                  lead.utm_source,
                  lead.utm_medium,
                  lead.utm_campaign,
                ]
                  .filter(Boolean)
                  .join(" / ") || "Not answered"}
              </Field>
              <Field label="Offer selected">{pretty(lead.interest)}</Field>
            </dl>
            <p className="mt-4 rounded-lg bg-[var(--page)] p-3 text-sm text-[var(--text)]">
              <span className="text-[var(--muted)]">What they want:</span>{" "}
              {lead.goals ||
                "No open-text answer captured. See call notes below."}
            </p>
          </section>

          {originalAnswers.length > 0 && (
            <section className="card !p-4">
              <h2 className="text-lg font-bold text-[var(--heading)]">
                Original form answers
              </h2>
              <p className="mt-1 text-xs text-[var(--muted)]">
                Saved from the form they submitted.
              </p>
              <dl className="mt-4 space-y-4">
                {originalAnswers.map((answer) => (
                  <Field key={answer.label} label={answer.label}>
                    {answer.value}
                  </Field>
                ))}
              </dl>
            </section>
          )}

          <DiagnosticViewer
            diagnostic={lead.diagnostic}
            businessDiagnostic={businessDiagnostic}
          />

          <section className="card !p-4">
            <div className="flex items-center justify-between gap-3">
              <h2 className="text-sm font-bold uppercase tracking-wide text-[var(--muted)]">
                Delivery record
              </h2>
              <Link
                href="/admin/sales/delivery"
                className="text-xs font-bold text-flow-400"
              >
                Open Delivery Center →
              </Link>
            </div>
            {projects.length ? (
              <div className="mt-3 space-y-3">
                {projects.map((project) => {
                  const done = project.milestones.filter(
                    (item) => item.status === "done",
                  ).length;
                  const total = project.milestones.length;
                  return (
                    <div
                      key={project.id}
                      className="rounded-lg border border-line p-3"
                    >
                      <div className="flex flex-wrap items-center justify-between gap-2">
                        <p className="font-bold text-[var(--heading)]">
                          {project.name}
                        </p>
                        <span className="rounded-full bg-[var(--fill-3)] px-2 py-1 text-[10px] font-bold uppercase text-[var(--text)]">
                          {pretty(project.status)}
                        </span>
                      </div>
                      <p className="mt-1 text-xs text-[var(--muted)]">
                        {done}/{total} milestones ·{" "}
                        {project.deliverables.length} deliverables ·{" "}
                        {
                          project.deliverables.filter(
                            (item) => item.visible_to_client,
                          ).length
                        }{" "}
                        visible to client
                      </p>
                      {project.deliverables.some(
                        (item) => item.client_decision !== "pending",
                      ) && (
                        <p className="mt-1 text-xs font-bold text-flow-400">
                          Client review received
                        </p>
                      )}
                    </div>
                  );
                })}
              </div>
            ) : (
              <p className="mt-3 text-sm text-[var(--muted)]">
                No project has been started for this lead yet.
              </p>
            )}
          </section>
        </div>

        <div className="space-y-6">
          <LeadHistory items={timeline} />
          <LeadThread
            leadId={lead.id}
            initialMessages={initialThread}
            canText={
              Boolean(lead.phone) &&
              lead.sms_consent &&
              !lead.sms_unsubscribed_at
            }
            hasEmail={
              Boolean(lead.email) &&
              !lead.email.endsWith("@no-email.facebook.lead") &&
              lead.marketing_email_consent &&
              !lead.email_unsubscribed_at
            }
            actorName={actorName}
            onMessagesChange={setThread}
            showMessages={false}
          />

          <section className="card !p-4">
            <h2 className="text-sm font-bold uppercase tracking-wide text-[var(--muted)]">
              Add a team note or build link
            </h2>
            <form onSubmit={addNote} className="mt-3 flex gap-2">
              <input
                className="input text-sm"
                value={noteDraft}
                onChange={(event) => setNoteDraft(event.target.value)}
                aria-label="Team note"
                placeholder="Add a call note, or tap the mic and talk"
                maxLength={4000}
              />
              <DictationButton
                onText={(spoken) =>
                  setNoteDraft((current) =>
                    current ? `${current} ${spoken}` : spoken,
                  )
                }
              />
              <button
                type="submit"
                className="btn-primary !px-4 !py-2 text-sm"
                disabled={savingNote}
              >
                {savingNote ? "Saving…" : "Add"}
              </button>
            </form>
            <p className="mt-3 text-xs text-[var(--muted)]">
              Saved as {actorName}. Team notes appear in the shared history
              above.
            </p>
          </section>

          <section className="card !p-4">
            <h2 className="text-sm font-bold uppercase tracking-wide text-[var(--muted)]">
              Follow-ups
            </h2>
            <form onSubmit={addTask} className="mt-3 grid gap-2 sm:grid-cols-2">
              <input
                className="input text-sm sm:col-span-2"
                value={taskDraft}
                onChange={(event) => setTaskDraft(event.target.value)}
                aria-label="Follow-up task"
                placeholder="Second call: review scope and close"
                maxLength={300}
              />
              <input
                className="input text-sm"
                aria-label="Follow-up due date"
                type="date"
                value={taskDue}
                onChange={(event) => setTaskDue(event.target.value)}
              />
              <div className="grid grid-cols-2 gap-2">
                <select
                  className="input text-sm"
                  aria-label="Follow-up type"
                  value={taskType}
                  onChange={(event) => setTaskType(event.target.value)}
                >
                  <option value="call">Call</option>
                  <option value="email">Email</option>
                  <option value="text">Text</option>
                  <option value="meeting">Meeting</option>
                  <option value="proposal">Proposal</option>
                  <option value="build">Build</option>
                  <option value="other">Other</option>
                </select>
                <select
                  className="input text-sm"
                  aria-label="Follow-up priority"
                  value={taskPriority}
                  onChange={(event) => setTaskPriority(event.target.value)}
                >
                  <option value="normal">Normal</option>
                  <option value="high">High</option>
                  <option value="hot">Hot</option>
                  <option value="low">Low</option>
                </select>
              </div>
              <button
                type="submit"
                className="btn-primary !px-4 !py-2 text-sm sm:col-span-2"
                disabled={savingTask}
              >
                {savingTask ? "Saving…" : "Assign follow-up"}
              </button>
            </form>
            <ul className="mt-4 space-y-2">
              {tasks.map((task) => (
                <li key={task.id} className="flex items-center gap-3 text-sm">
                  <input
                    type="checkbox"
                    aria-label={`Mark ${task.title} ${task.completed_at ? "incomplete" : "complete"}`}
                    checked={Boolean(task.completed_at)}
                    onChange={() => toggleTask(task)}
                  />
                  <span
                    className={
                      task.completed_at
                        ? "text-[var(--quiet)] line-through"
                        : "text-[var(--text)]"
                    }
                  >
                    {task.title}
                    <span className="ml-2 text-xs text-[var(--quiet)]">
                      {pretty(task.task_type || "call")}
                      {task.due_date
                        ? ` · ${new Date(`${task.due_date}T12:00:00`).toLocaleDateString()}`
                        : ""}
                      {task.priority && task.priority !== "normal"
                        ? ` · ${task.priority}`
                        : ""}
                    </span>
                  </span>
                </li>
              ))}
              {tasks.length === 0 && (
                <li className="text-sm text-[var(--muted)]">No tasks yet.</li>
              )}
            </ul>
          </section>
        </div>
      </div>
    </div>
  );
}

function Field({
  label,
  children,
}: {
  label: string;
  children: React.ReactNode;
}) {
  return (
    <div>
      <dt className="text-[var(--muted)]">{label}</dt>
      <dd className="break-words text-[var(--text)]">{children}</dd>
    </div>
  );
}
