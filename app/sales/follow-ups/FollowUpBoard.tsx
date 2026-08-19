"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { createClient } from "@/lib/supabase/client";

type Lead = {
  id: string;
  full_name: string;
  business_name: string | null;
  email: string;
  phone: string | null;
  status: string;
  priority: string;
  next_follow_up_at: string | null;
  owner: string | null;
};

type Task = {
  id: string;
  lead_id: string;
  title: string;
  due_date: string | null;
  completed_at: string | null;
  created_at: string;
  priority: string;
  assigned_to: string | null;
  task_type: string;
  leads: Lead;
};

const TASK_TYPES = ["call", "email", "text", "meeting", "proposal", "build", "other"];
const PRIORITIES = ["normal", "high", "hot", "low"];

function todayKey() {
  const now = new Date();
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}-${String(now.getDate()).padStart(2, "0")}`;
}

function pretty(value: string) {
  return value.replace(/_/g, " ");
}

function dueLabel(value: string | null) {
  if (!value) return "No date";
  return new Date(`${value}T12:00:00`).toLocaleDateString(undefined, { month: "short", day: "numeric", year: "numeric" });
}

function groupFor(task: Task) {
  if (!task.due_date) return "unscheduled";
  const today = todayKey();
  if (task.due_date < today) return "overdue";
  if (task.due_date === today) return "today";
  return "upcoming";
}

export default function FollowUpBoard({ initialTasks, initialLeads, operatorName }: { initialTasks: Task[]; initialLeads: Lead[]; operatorName: string }) {
  const [tasks, setTasks] = useState(initialTasks);
  const [leads, setLeads] = useState(initialLeads);
  const [showNew, setShowNew] = useState(false);
  const [busy, setBusy] = useState("");
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");
  const supabase = useMemo(() => createClient(), []);

  const grouped = useMemo(() => ({
    overdue: tasks.filter((task) => groupFor(task) === "overdue"),
    today: tasks.filter((task) => groupFor(task) === "today"),
    upcoming: tasks.filter((task) => groupFor(task) === "upcoming"),
    unscheduled: tasks.filter((task) => groupFor(task) === "unscheduled"),
  }), [tasks]);
  const unscheduledLeads = leads.filter((lead) => !lead.next_follow_up_at && !tasks.some((task) => task.lead_id === lead.id));

  async function createTask(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setBusy("create");
    setError("");
    const form = event.currentTarget;
    const fd = new FormData(form);
    const leadId = String(fd.get("lead_id") || "");
    const lead = leads.find((item) => item.id === leadId);
    const { data, error: insertError } = await supabase.from("lead_tasks").insert({
      lead_id: leadId,
      title: String(fd.get("title") || "").trim(),
      due_date: String(fd.get("due_date") || "") || null,
      priority: String(fd.get("priority") || "normal"),
      task_type: String(fd.get("task_type") || "call"),
      assigned_to: operatorName,
    }).select().single();
    if (insertError || !data || !lead) setError(insertError?.message || "Follow-up could not be added");
    else {
      const dueDate = String(fd.get("due_date") || "");
      const updatedLead = dueDate ? { ...lead, next_follow_up_at: new Date(`${dueDate}T09:00:00`).toISOString() } : lead;
      if (dueDate) {
        await supabase.from("leads").update({ next_follow_up_at: updatedLead.next_follow_up_at }).eq("id", lead.id);
        setLeads((items) => items.map((item) => item.id === lead.id ? updatedLead : item));
      }
      setTasks((items) => [{ ...data, leads: updatedLead } as Task, ...items]);
      form.reset();
      setShowNew(false);
      setMessage(`Follow-up added for ${lead.full_name}.`);
    }
    setBusy("");
  }

  async function completeTask(task: Task) {
    setBusy(task.id);
    const { error: updateError } = await supabase.from("lead_tasks").update({ completed_at: new Date().toISOString() }).eq("id", task.id);
    if (updateError) setError(updateError.message);
    else {
      const hasAnotherTask = tasks.some((item) => item.id !== task.id && item.lead_id === task.lead_id);
      setTasks((items) => items.filter((item) => item.id !== task.id));
      if (!hasAnotherTask) {
        await supabase.from("leads").update({ next_follow_up_at: null }).eq("id", task.lead_id);
        setLeads((items) => items.map((item) => item.id === task.lead_id ? { ...item, next_follow_up_at: null } : item));
      }
      await supabase.from("lead_activity").insert({ lead_id: task.lead_id, kind: "task", detail: `${pretty(task.task_type)} follow-up completed: ${task.title}` });
      setMessage(`Completed: ${task.title}`);
    }
    setBusy("");
  }

  async function rescheduleTask(task: Task, due_date: string) {
    const previous = task.due_date;
    setTasks((items) => items.map((item) => item.id === task.id ? { ...item, due_date } : item));
    const { error: updateError } = await supabase.from("lead_tasks").update({ due_date: due_date || null }).eq("id", task.id);
    if (updateError) {
      setTasks((items) => items.map((item) => item.id === task.id ? { ...item, due_date: previous } : item));
      setError(updateError.message);
    } else {
      const next = due_date ? new Date(`${due_date}T09:00:00`).toISOString() : null;
      await supabase.from("leads").update({ next_follow_up_at: next }).eq("id", task.lead_id);
      setLeads((items) => items.map((item) => item.id === task.lead_id ? { ...item, next_follow_up_at: next } : item));
    }
  }

  async function scheduleLead(lead: Lead, dueDate: string) {
    if (!dueDate) return;
    setBusy(`lead-${lead.id}`);
    const next = new Date(`${dueDate}T09:00:00`).toISOString();
    const { data, error: insertError } = await supabase.from("lead_tasks").insert({
      lead_id: lead.id,
      title: "Sales follow-up call",
      due_date: dueDate,
      priority: lead.priority === "low" ? "normal" : lead.priority,
      task_type: "call",
      assigned_to: operatorName,
    }).select().single();
    if (insertError || !data) setError(insertError?.message || "Follow-up could not be scheduled");
    else {
      await supabase.from("leads").update({ next_follow_up_at: next }).eq("id", lead.id);
      const updatedLead = { ...lead, next_follow_up_at: next };
      setLeads((items) => items.map((item) => item.id === lead.id ? updatedLead : item));
      setTasks((items) => [{ ...data, leads: updatedLead } as Task, ...items]);
      setMessage(`${lead.full_name} is scheduled for ${dueLabel(dueDate)}.`);
    }
    setBusy("");
  }

  return (
    <div className="space-y-7">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div><h2 className="text-2xl font-black text-[var(--heading)]">Follow-up command center</h2><p className="mt-1 text-sm text-[var(--muted)]">Every qualified lead gets a next action, a due date, and a clear owner.</p></div>
        <button type="button" className="btn-primary !px-4 !py-2 text-sm" onClick={() => setShowNew((value) => !value)}>{showNew ? "Cancel" : "+ Add follow-up"}</button>
      </div>

      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4"><Metric label="Overdue" value={grouped.overdue.length} tone="text-[var(--danger)]" /><Metric label="Due today" value={grouped.today.length} tone="text-warn" /><Metric label="Upcoming" value={grouped.upcoming.length} /><Metric label="Need a next action" value={unscheduledLeads.length + grouped.unscheduled.length} /></div>
      {message && <p className="rounded-lg border border-mint/30 bg-mint/10 p-3 text-sm font-semibold text-mint">{message}</p>}
      {error && <p className="rounded-lg border border-[var(--danger-line)] bg-[var(--danger-tint)] p-3 text-sm text-[var(--danger)]">{error}</p>}

      {showNew && <form onSubmit={createTask} className="card grid gap-4 !p-5 sm:grid-cols-2 lg:grid-cols-5"><label className="lg:col-span-2"><span className="label">Lead</span><select className="input" name="lead_id" required defaultValue=""><option value="" disabled>Choose a lead</option>{leads.map((lead) => <option key={lead.id} value={lead.id}>{lead.business_name ? `${lead.business_name} · ${lead.full_name}` : lead.full_name}</option>)}</select></label><label className="lg:col-span-3"><span className="label">Next action</span><input className="input" name="title" required maxLength={300} placeholder="Second call: review scope and close" /></label><label><span className="label">Due</span><input className="input" name="due_date" type="date" /></label><label><span className="label">Type</span><select className="input" name="task_type">{TASK_TYPES.map((type) => <option key={type} value={type}>{pretty(type)}</option>)}</select></label><label><span className="label">Priority</span><select className="input" name="priority">{PRIORITIES.map((priority) => <option key={priority} value={priority}>{priority}</option>)}</select></label><div className="flex items-end lg:col-span-2"><button className="btn-primary w-full disabled:opacity-50" disabled={busy === "create"}>{busy === "create" ? "Adding..." : "Assign follow-up"}</button></div></form>}

      <div className="grid gap-5 xl:grid-cols-2">
        <TaskGroup title="Overdue" tasks={grouped.overdue} empty="Nothing overdue." busy={busy} completeTask={completeTask} rescheduleTask={rescheduleTask} />
        <TaskGroup title="Due today" tasks={grouped.today} empty="No calls due today." busy={busy} completeTask={completeTask} rescheduleTask={rescheduleTask} />
        <TaskGroup title="Upcoming" tasks={grouped.upcoming} empty="No upcoming follow-ups yet." busy={busy} completeTask={completeTask} rescheduleTask={rescheduleTask} />
        <TaskGroup title="Needs a date" tasks={grouped.unscheduled} empty="Every task has a date." busy={busy} completeTask={completeTask} rescheduleTask={rescheduleTask} />
      </div>

      {unscheduledLeads.length > 0 && <section className="card !p-5"><h3 className="text-lg font-black text-[var(--heading)]">Active leads without a next action</h3><p className="mt-1 text-sm text-[var(--muted)]">Put a date on each one so qualified demand never disappears into the pipeline.</p><div className="mt-4 grid gap-3 lg:grid-cols-2">{unscheduledLeads.map((lead) => <QuickSchedule key={lead.id} lead={lead} busy={busy === `lead-${lead.id}`} onSchedule={scheduleLead} />)}</div></section>}
    </div>
  );
}

function TaskGroup({ title, tasks, empty, busy, completeTask, rescheduleTask }: { title: string; tasks: Task[]; empty: string; busy: string; completeTask: (task: Task) => void; rescheduleTask: (task: Task, date: string) => void }) {
  return <section className="card !p-5"><div className="flex items-center justify-between"><h3 className="text-lg font-black text-[var(--heading)]">{title}</h3><span className="rounded-full bg-[var(--fill-3)] px-2.5 py-1 text-xs font-bold text-[var(--text)]">{tasks.length}</span></div><div className="mt-4 space-y-3">{tasks.map((task) => <div key={task.id} className="rounded-xl border border-line p-4"><div className="flex items-start justify-between gap-3"><div><div className="flex flex-wrap items-center gap-2"><Link href={`/admin/sales/leads/${task.lead_id}`} className="font-bold text-[var(--heading)] hover:text-flow-400">{task.leads.business_name || task.leads.full_name}</Link><span className={`rounded-full px-2 py-0.5 text-[10px] font-bold uppercase ${task.priority === "hot" ? "bg-[var(--danger-tint)] text-[var(--danger)]" : "bg-[var(--fill-3)] text-[var(--muted)]"}`}>{task.priority}</span></div><p className="mt-1 text-sm text-[var(--text)]">{task.title}</p><p className="mt-1 text-xs text-[var(--muted)]">{pretty(task.task_type)} · {task.assigned_to || "Unassigned"} · {dueLabel(task.due_date)}</p></div><button type="button" onClick={() => completeTask(task)} disabled={busy === task.id} className="rounded-lg border border-mint/40 px-3 py-1.5 text-xs font-bold text-mint disabled:opacity-50">{busy === task.id ? "Saving" : "Done"}</button></div><div className="mt-3 flex flex-wrap items-center gap-2"><input className="input !w-auto !py-1.5 text-xs" type="date" value={task.due_date || ""} onChange={(event) => rescheduleTask(task, event.target.value)} />{task.leads.phone && <a href={`tel:${task.leads.phone}`} className="text-xs font-bold text-flow-400">Call {task.leads.phone}</a>}<a href={`mailto:${task.leads.email}`} className="text-xs font-bold text-flow-400">Email</a></div></div>)}{tasks.length === 0 && <p className="rounded-xl border border-dashed border-line p-5 text-center text-sm text-[var(--muted)]">{empty}</p>}</div></section>;
}

function QuickSchedule({ lead, busy, onSchedule }: { lead: Lead; busy: boolean; onSchedule: (lead: Lead, date: string) => void }) {
  const [date, setDate] = useState(todayKey());
  return <div className="flex flex-wrap items-center gap-3 rounded-xl border border-line p-4"><div className="min-w-0 flex-1"><Link href={`/admin/sales/leads/${lead.id}`} className="font-bold text-[var(--heading)] hover:text-flow-400">{lead.business_name || lead.full_name}</Link><p className="text-xs text-[var(--muted)]">{pretty(lead.status)} · {lead.priority} priority · {lead.owner || "Unassigned"}</p></div><input className="input !w-auto !py-1.5 text-xs" type="date" value={date} onChange={(event) => setDate(event.target.value)} /><button type="button" onClick={() => onSchedule(lead, date)} disabled={busy} className="btn-primary !px-3 !py-2 text-xs disabled:opacity-50">{busy ? "Saving" : "Schedule"}</button></div>;
}

function Metric({ label, value, tone = "text-[var(--heading)]" }: { label: string; value: number; tone?: string }) {
  return <div className="card !p-4 text-center"><p className={`text-3xl font-black ${tone}`}>{value}</p><p className="text-[11px] font-bold uppercase tracking-wide text-[var(--muted)]">{label}</p></div>;
}
