"use client";

import { useState } from "react";
import Link from "next/link";
import { createClient } from "@/lib/supabase/client";
import LeadThread, { type LeadMsg } from "@/app/admin/leads/[id]/LeadThread";

const STAGES = ["new", "contacted", "call_booked", "proposal", "won", "lost"] as const;

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
  sms_consent: boolean;
  marketing_email_consent: boolean;
  email_unsubscribed_at: string | null;
  sms_unsubscribed_at: string | null;
};

type Note = { id: string; body: string; author: string | null; created_at: string };
type Task = { id: string; title: string; due_date: string | null; completed_at: string | null; created_at: string };
type Activity = { id: string; kind: string; detail: string; created_at: string };
type LeadEmail = { id: string; step: number; sent_at: string };

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
}: {
  lead: Lead;
  initialNotes: Note[];
  initialTasks: Task[];
  initialActivity: Activity[];
  emails: LeadEmail[];
  initialThread: LeadMsg[];
}) {
  const [status, setStatus] = useState(lead.status);
  const [owner, setOwner] = useState(lead.owner ?? "Patrick Grabbs");
  const [notes, setNotes] = useState(initialNotes);
  const [tasks, setTasks] = useState(initialTasks);
  const [activity, setActivity] = useState(initialActivity);
  const [noteDraft, setNoteDraft] = useState("");
  const [taskDraft, setTaskDraft] = useState("");
  const [error, setError] = useState("");
  const supabase = createClient();

  async function logActivity(detail: string) {
    const { data } = await supabase.from("lead_activity").insert({ lead_id: lead.id, kind: "sales", detail }).select().single();
    if (data) setActivity((items) => [data as Activity, ...items]);
  }

  async function changeStage(next: string) {
    const previous = status;
    setStatus(next);
    const { error: updateError } = await supabase.from("leads").update({ status: next }).eq("id", lead.id);
    if (updateError) {
      setStatus(previous);
      setError(updateError.message);
      return;
    }
    await logActivity(`Stage changed to ${pretty(next)}`);
  }

  async function saveOwner() {
    const { error: updateError } = await supabase.from("leads").update({ owner: owner.trim() || null }).eq("id", lead.id);
    if (updateError) setError(updateError.message);
    else await logActivity(`Owner set to ${owner.trim() || "unassigned"}`);
  }

  async function addNote(event: React.FormEvent) {
    event.preventDefault();
    const body = noteDraft.trim();
    if (!body) return;
    const { data, error: insertError } = await supabase.from("lead_notes").insert({ lead_id: lead.id, body, author: "Sales Desk" }).select().single();
    if (insertError) setError(insertError.message);
    else if (data) {
      setNotes((items) => [data as Note, ...items]);
      setNoteDraft("");
    }
  }

  async function addTask(event: React.FormEvent) {
    event.preventDefault();
    const title = taskDraft.trim();
    if (!title) return;
    const { data, error: insertError } = await supabase.from("lead_tasks").insert({ lead_id: lead.id, title }).select().single();
    if (insertError) setError(insertError.message);
    else if (data) {
      setTasks((items) => [data as Task, ...items]);
      setTaskDraft("");
    }
  }

  async function toggleTask(task: Task) {
    const completed_at = task.completed_at ? null : new Date().toISOString();
    const { data, error: updateError } = await supabase.from("lead_tasks").update({ completed_at }).eq("id", task.id).select().single();
    if (updateError) setError(updateError.message);
    else if (data) setTasks((items) => items.map((item) => (item.id === task.id ? (data as Task) : item)));
  }

  return (
    <div className="space-y-6">
      <div>
        <Link href="/sales" className="text-sm font-semibold text-flow-400">← Pipeline</Link>
        <div className="mt-3 flex flex-wrap items-end gap-4">
          <div className="min-w-0 flex-1">
            <h1 className="text-3xl font-black text-[var(--heading)]">{lead.full_name}</h1>
            <p className="text-[var(--muted)]">{lead.business_name || "Business name not captured"}</p>
          </div>
          <label className="text-xs text-[var(--muted)]">
            Stage
            <select className="input ml-2 !w-auto !py-1.5 text-sm" value={status} onChange={(event) => changeStage(event.target.value)}>
              {STAGES.map((stage) => <option key={stage} value={stage}>{pretty(stage)}</option>)}
            </select>
          </label>
          <label className="text-xs text-[var(--muted)]">
            Owner
            <input className="input ml-2 !w-40 !py-1.5 text-sm" value={owner} onChange={(event) => setOwner(event.target.value)} onBlur={saveOwner} />
          </label>
          <Link
            href={`/sales/invoices?lead=${lead.id}`}
            className="btn-primary !px-4 !py-2 text-sm"
          >
            Create invoice
          </Link>
        </div>
      </div>

      {error && <p className="rounded-lg border border-[var(--danger-line)] bg-[var(--danger-tint)] p-3 text-sm text-[var(--danger)]">{error}</p>}

      <div className="grid gap-6 lg:grid-cols-2">
        <div className="space-y-6">
          <section className="card !p-4">
            <h2 className="text-sm font-bold uppercase tracking-wide text-[var(--muted)]">Contact and Facebook intake</h2>
            <dl className="mt-3 grid gap-x-6 gap-y-3 text-sm sm:grid-cols-2">
              <Field label="Email"><a href={`mailto:${lead.email}`} className="text-flow-400">{lead.email}</a></Field>
              <Field label="Phone">{lead.phone ? <a href={`tel:${lead.phone}`} className="text-flow-400">{lead.phone}</a> : "Not answered"}</Field>
              <Field label="Website / profile">{lead.website_url ?? "Not answered"}</Field>
              <Field label="Industry">{pretty(lead.industry)}</Field>
              <Field label="Current presence">{pretty(lead.current_platform)}</Field>
              <Field label="Timeline">{pretty(lead.timeline)}</Field>
              <Field label="Prefers">{pretty(lead.best_contact_method)}</Field>
              <Field label="Budget">{pretty(lead.budget_range)}</Field>
              <Field label="Source">{[lead.source, lead.utm_source, lead.utm_medium, lead.utm_campaign].filter(Boolean).join(" / ") || "Not answered"}</Field>
              <Field label="Offer selected">{pretty(lead.interest)}</Field>
            </dl>
            <p className="mt-4 rounded-lg bg-[var(--page)] p-3 text-sm text-[var(--text)]">
              <span className="text-[var(--muted)]">What they want:</span> {lead.goals || "No open-text answer captured. See call notes below."}
            </p>
          </section>

          <section className="card !p-4">
            <h2 className="text-sm font-bold uppercase tracking-wide text-[var(--muted)]">Automated email record</h2>
            {emails.length === 0 ? (
              <p className="mt-2 text-sm text-[var(--muted)]">No send record in LeadFlow Pro.</p>
            ) : (
              <ul className="mt-2 space-y-1 text-sm text-[var(--text)]">
                {emails.map((email) => <li key={email.id}>Step {email.step} · sent {fmt(email.sent_at)}</li>)}
              </ul>
            )}
            <p className="mt-2 text-xs text-[var(--quiet)]">This confirms recorded sends, not provider opens or replies.</p>
          </section>

          <section className="card !p-4">
            <h2 className="text-sm font-bold uppercase tracking-wide text-[var(--muted)]">Activity</h2>
            <ul className="mt-3 space-y-2 text-sm">
              {activity.map((item) => (
                <li key={item.id} className="flex gap-3">
                  <span className="whitespace-nowrap text-xs text-[var(--quiet)]">{fmt(item.created_at)}</span>
                  <span className="text-[var(--text)]">{item.detail}</span>
                </li>
              ))}
              {activity.length === 0 && <li className="text-[var(--muted)]">No activity logged yet.</li>}
            </ul>
          </section>
        </div>

        <div className="space-y-6">
          <LeadThread
            leadId={lead.id}
            initialMessages={initialThread}
            canText={Boolean(lead.phone) && lead.sms_consent && !lead.sms_unsubscribed_at}
            hasEmail={Boolean(lead.email) && lead.marketing_email_consent && !lead.email_unsubscribed_at}
          />

          <section className="card !p-4">
            <h2 className="text-sm font-bold uppercase tracking-wide text-[var(--muted)]">Call notes and build links</h2>
            <form onSubmit={addNote} className="mt-3 flex gap-2">
              <input className="input text-sm" value={noteDraft} onChange={(event) => setNoteDraft(event.target.value)} placeholder="Add a call note" maxLength={4000} />
              <button type="submit" className="btn-primary !px-4 !py-2 text-sm">Add</button>
            </form>
            <ul className="mt-4 space-y-3">
              {lead.notes && <li className="whitespace-pre-wrap rounded-lg bg-[var(--page)] p-3 text-sm text-[var(--text)]"><span className="text-xs text-[var(--quiet)]">Original note</span><p>{lead.notes}</p></li>}
              {notes.map((note) => <li key={note.id} className="whitespace-pre-wrap rounded-lg bg-[var(--page)] p-3 text-sm text-[var(--text)]"><span className="text-xs text-[var(--quiet)]">{fmt(note.created_at)} · {note.author || "Team"}</span><p>{note.body}</p></li>)}
              {notes.length === 0 && !lead.notes && <li className="text-sm text-[var(--muted)]">No notes yet.</li>}
            </ul>
          </section>

          <section className="card !p-4">
            <h2 className="text-sm font-bold uppercase tracking-wide text-[var(--muted)]">Follow-ups</h2>
            <form onSubmit={addTask} className="mt-3 flex gap-2">
              <input className="input text-sm" value={taskDraft} onChange={(event) => setTaskDraft(event.target.value)} placeholder="Add a follow-up task" maxLength={300} />
              <button type="submit" className="btn-primary !px-4 !py-2 text-sm">Add</button>
            </form>
            <ul className="mt-4 space-y-2">
              {tasks.map((task) => (
                <li key={task.id} className="flex items-center gap-3 text-sm">
                  <input type="checkbox" checked={Boolean(task.completed_at)} onChange={() => toggleTask(task)} />
                  <span className={task.completed_at ? "text-[var(--quiet)] line-through" : "text-[var(--text)]"}>{task.title}</span>
                </li>
              ))}
              {tasks.length === 0 && <li className="text-sm text-[var(--muted)]">No tasks yet.</li>}
            </ul>
          </section>
        </div>
      </div>
    </div>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return <div><dt className="text-[var(--muted)]">{label}</dt><dd className="break-words text-[var(--text)]">{children}</dd></div>;
}
