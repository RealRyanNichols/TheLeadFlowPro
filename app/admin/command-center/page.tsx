import Link from "next/link";
import {
  ArrowRight,
  CalendarClock,
  CheckCircle2,
  CircleAlert,
  ClipboardList,
  MessageSquareText,
  PhoneCall,
  Target,
  UsersRound,
} from "lucide-react";
import { createClient } from "@/lib/supabase/server";

export const metadata = { title: "Lead Command Center | The LeadFlow Pro" };

type Lead = {
  id: string;
  full_name: string;
  business_name: string | null;
  source: string | null;
  status: string;
  interest: string;
  created_at: string;
};

type LeadTask = {
  id: string;
  lead_id: string;
  title: string;
  due_date: string | null;
  completed_at: string | null;
};

type LeadActivity = {
  id: string;
  lead_id: string;
  kind: string;
  detail: string;
  created_at: string;
};

const STATUS_LABELS: Record<string, string> = {
  new: "New",
  contacted: "Contacted",
  call_booked: "Call booked",
  qualified: "Qualified",
  proposal_sent: "Proposal",
  won: "Won",
  lost: "Lost",
};

const STATUS_TONES: Record<string, string> = {
  new: "border-[var(--accent-line)] bg-[var(--accent-tint)] text-[var(--blue)]",
  contacted: "border-[var(--line)] bg-[var(--fill-2)] text-[var(--cyan)]",
  call_booked: "border-[var(--warn-line)] bg-[var(--warn-tint)] text-[var(--warn)]",
  qualified: "border-[var(--line)] bg-[var(--fill-2)] text-[var(--violet)]",
  proposal_sent: "border-[var(--line)] bg-[var(--fill-2)] text-[var(--violet)]",
  won: "border-[var(--green-line)] bg-[var(--green-tint)] text-[var(--green)]",
  lost: "border-[var(--danger-line)] bg-[var(--danger-tint)] text-[var(--danger)]",
};

function centralDay() {
  return new Date().toLocaleDateString("en-CA", { timeZone: "America/Chicago" });
}

function shortDate(value: string) {
  return new Intl.DateTimeFormat("en-US", {
    month: "short",
    day: "numeric",
    timeZone: "America/Chicago",
  }).format(new Date(value));
}

function shortTime(value: string) {
  return new Intl.DateTimeFormat("en-US", {
    hour: "numeric",
    minute: "2-digit",
    timeZone: "America/Chicago",
  }).format(new Date(value));
}

export default async function LeadCommandCenter() {
  const supabase = await createClient();
  const [leadResult, taskResult, activityResult] = await Promise.all([
    supabase
      .from("leads")
      .select("id, full_name, business_name, source, status, interest, created_at")
      .is("deleted_at", null)
      .eq("is_test", false)
      .order("created_at", { ascending: false })
      .limit(100),
    supabase
      .from("lead_tasks")
      .select("id, lead_id, title, due_date, completed_at")
      .is("completed_at", null)
      .order("due_date", { ascending: true })
      .limit(100),
    supabase
      .from("lead_activity")
      .select("id, lead_id, kind, detail, created_at")
      .order("created_at", { ascending: false })
      .limit(10),
  ]);

  if (leadResult.error || taskResult.error || activityResult.error) {
    throw new Error("Command center data is temporarily unavailable.");
  }

  const leads = (leadResult.data ?? []) as Lead[];
  const tasks = (taskResult.data ?? []) as LeadTask[];
  const activity = (activityResult.data ?? []) as LeadActivity[];
  const today = centralDay();
  const leadById = new Map(leads.map((lead) => [lead.id, lead]));
  const openLeads = leads.filter((lead) => !["won", "lost"].includes(lead.status));
  const needsResponse = leads.filter((lead) => lead.status === "new").length;
  const dueToday = tasks.filter((task) => task.due_date && task.due_date <= today).length;
  const proposals = leads.filter((lead) => ["proposal", "proposal_sent"].includes(lead.status)).length;
  const won = leads.filter((lead) => lead.status === "won").length;
  const nextLead = openLeads[0];

  const metrics = [
    { label: "Needs response", value: needsResponse, note: "New leads", icon: CircleAlert, tone: "text-[var(--danger)] bg-[var(--danger-tint)]" },
    { label: "Follow up today", value: dueToday, note: `${tasks.length} open tasks`, icon: CalendarClock, tone: "text-[var(--warn)] bg-[var(--warn-tint)]" },
    { label: "Proposal out", value: proposals, note: "Active opportunities", icon: ClipboardList, tone: "text-[var(--violet)] bg-[var(--fill-2)]" },
    { label: "Won", value: won, note: "All recorded wins", icon: CheckCircle2, tone: "text-[var(--green)] bg-[var(--green-tint)]" },
  ];

  return (
    <div className="space-y-6">
      <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-end">
        <div>
          <p className="text-xs font-bold uppercase tracking-[0.2em] text-[var(--blue)]">Operator view</p>
          <h2 className="mt-1 text-3xl font-black tracking-tight text-[var(--heading)] sm:text-4xl">
            Lead Command Center
          </h2>
          <p className="mt-2 max-w-2xl text-sm text-[var(--muted)]">
            The live queue, the next action, and the handoffs that need attention now.
          </p>
        </div>
        {nextLead ? (
          <Link href={`/admin/leads/${nextLead.id}`} className="btn-primary inline-flex items-center justify-center gap-2">
            Work next lead <ArrowRight className="h-4 w-4" aria-hidden="true" />
          </Link>
        ) : (
          <span className="inline-flex items-center gap-2 rounded-lg border border-[var(--green-line)] bg-[var(--green-tint)] px-4 py-2 text-sm font-bold text-[var(--green)]">
            <CheckCircle2 className="h-4 w-4" aria-hidden="true" /> Queue clear
          </span>
        )}
      </div>

      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        {metrics.map(({ label, value, note, icon: Icon, tone }) => (
          <section key={label} className="rounded-2xl border border-[var(--line)] bg-white p-5 shadow-[0_12px_32px_rgba(10,18,32,0.04)]">
            <div className="flex items-start justify-between gap-3">
              <div>
                <p className="text-sm font-semibold text-[var(--muted)]">{label}</p>
                <p className="mt-2 text-4xl font-black tabular-nums tracking-tight text-[var(--heading)]">{value}</p>
              </div>
              <span className={`rounded-xl p-2.5 ${tone}`}><Icon className="h-5 w-5" aria-hidden="true" /></span>
            </div>
            <p className="mt-3 text-xs text-[var(--quiet)]">{note}</p>
          </section>
        ))}
      </div>

      <div className="grid gap-6 xl:grid-cols-[minmax(0,1fr)_320px]">
        <section className="overflow-hidden rounded-2xl border border-[var(--line)] bg-white shadow-[0_12px_32px_rgba(10,18,32,0.04)]">
          <div className="flex items-center justify-between border-b border-[var(--line)] px-5 py-4">
            <div>
              <h3 className="font-black text-[var(--heading)]">Lead queue</h3>
              <p className="text-xs text-[var(--muted)]">{openLeads.length} active records</p>
            </div>
            <Link href="/admin" className="text-sm font-bold text-[var(--blue)] hover:underline">View full pipeline</Link>
          </div>
          {openLeads.length === 0 ? (
            <div className="px-6 py-16 text-center">
              <CheckCircle2 className="mx-auto h-8 w-8 text-[var(--green)]" aria-hidden="true" />
              <p className="mt-3 font-bold text-[var(--heading)]">No active leads</p>
              <p className="mt-1 text-sm text-[var(--muted)]">New inquiries will appear here automatically.</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full min-w-[720px] text-left text-sm">
                <thead className="bg-[var(--fill-2)] text-[11px] uppercase tracking-wider text-[var(--muted)]">
                  <tr><th className="px-5 py-3">Lead</th><th className="px-4 py-3">Source</th><th className="px-4 py-3">Added</th><th className="px-4 py-3">Stage</th><th className="px-5 py-3 text-right">Next action</th></tr>
                </thead>
                <tbody className="divide-y divide-[var(--line)]">
                  {openLeads.slice(0, 8).map((lead) => (
                    <tr key={lead.id} className="group hover:bg-[var(--accent-tint)]">
                      <td className="px-5 py-4">
                        <p className="font-bold text-[var(--heading)]">{lead.business_name || lead.full_name}</p>
                        <p className="mt-0.5 text-xs text-[var(--muted)]">{lead.business_name ? lead.full_name : lead.interest}</p>
                      </td>
                      <td className="px-4 py-4 text-[var(--text)]">{lead.source || "Direct"}</td>
                      <td className="px-4 py-4 text-[var(--muted)]">{shortDate(lead.created_at)}</td>
                      <td className="px-4 py-4"><span className={`inline-flex rounded-full border px-2.5 py-1 text-xs font-bold ${STATUS_TONES[lead.status] || "border-[var(--line)] bg-[var(--fill-2)] text-[var(--muted)]"}`}>{STATUS_LABELS[lead.status] || lead.status}</span></td>
                      <td className="px-5 py-4 text-right"><Link href={`/admin/leads/${lead.id}`} className="inline-flex items-center gap-1.5 font-bold text-[var(--blue)] hover:underline">Open record <ArrowRight className="h-3.5 w-3.5" aria-hidden="true" /></Link></td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </section>

        <aside className="space-y-6">
          <section className="rounded-2xl border border-[var(--line)] bg-white p-5 shadow-[0_12px_32px_rgba(10,18,32,0.04)]">
            <div className="flex items-center gap-2"><Target className="h-5 w-5 text-[var(--blue)]" aria-hidden="true" /><h3 className="font-black text-[var(--heading)]">Work next</h3></div>
            {tasks.length ? (
              <ul className="mt-4 space-y-3">
                {tasks.slice(0, 4).map((task) => {
                  const lead = leadById.get(task.lead_id);
                  return <li key={task.id} className="rounded-xl border border-[var(--line)] p-3"><p className="text-sm font-bold text-[var(--heading)]">{task.title}</p><p className="mt-1 text-xs text-[var(--muted)]">{lead?.business_name || lead?.full_name || "Lead record"}{task.due_date ? ` · Due ${task.due_date <= today ? "now" : task.due_date}` : ""}</p>{lead && <Link href={`/admin/leads/${lead.id}`} className="mt-2 inline-flex items-center gap-1 text-xs font-bold text-[var(--blue)]">Open <ArrowRight className="h-3 w-3" aria-hidden="true" /></Link>}</li>;
                })}
              </ul>
            ) : <p className="mt-4 text-sm text-[var(--muted)]">No open lead tasks.</p>}
          </section>

          <section className="rounded-2xl border border-[var(--line)] bg-white p-5 shadow-[0_12px_32px_rgba(10,18,32,0.04)]">
            <div className="flex items-center gap-2"><UsersRound className="h-5 w-5 text-[var(--blue)]" aria-hidden="true" /><h3 className="font-black text-[var(--heading)]">Live activity</h3></div>
            {activity.length ? (
              <ol className="mt-4 space-y-4">
                {activity.slice(0, 6).map((entry) => {
                  const lead = leadById.get(entry.lead_id);
                  const ActivityIcon = entry.kind.includes("call") ? PhoneCall : MessageSquareText;
                  return <li key={entry.id} className="flex gap-3"><span className="mt-0.5 rounded-lg bg-[var(--accent-tint)] p-2 text-[var(--blue)]"><ActivityIcon className="h-4 w-4" aria-hidden="true" /></span><div className="min-w-0"><p className="truncate text-sm font-bold text-[var(--heading)]">{lead?.business_name || lead?.full_name || "Lead activity"}</p><p className="line-clamp-2 text-xs leading-5 text-[var(--muted)]">{entry.detail}</p><p className="mt-0.5 text-[11px] text-[var(--quiet)]">{shortTime(entry.created_at)}</p></div></li>;
                })}
              </ol>
            ) : <p className="mt-4 text-sm text-[var(--muted)]">Activity will appear as the team works the queue.</p>}
          </section>
        </aside>
      </div>
    </div>
  );
}
