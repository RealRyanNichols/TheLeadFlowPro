import Link from "next/link";
import { ArrowRight, Clock3, MessageSquareText, Send, Target, UsersRound } from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import { centralDate } from "@/lib/operatoros/growth";

export const metadata = { title: "Prospect Command | The LeadFlow Pro" };
export const dynamic = "force-dynamic";

type Prospect = {
  id: string;
  business_name: string;
  website_url: string | null;
  industry: string | null;
  priority: string;
  qualification_signal: string | null;
  observed_gap: string | null;
  best_offer: string | null;
  contact_route: string | null;
  status: string;
  owner_name: string | null;
  permission_state: string;
  next_action: string | null;
  next_action_at: string | null;
};

type OutreachAction = {
  id: string;
  prospect_id: string;
  channel: string;
  action_type: string;
  due_at: string;
  sequence_day: number;
  message_draft: string;
  status: string;
  human_approved: boolean;
};

function priorityTone(priority: string) {
  if (priority === "A") return "border-red-200 bg-red-50 text-red-700";
  if (priority === "B") return "border-amber-200 bg-amber-50 text-amber-700";
  return "border-slate-200 bg-slate-50 text-slate-600";
}

function shortWhen(value: string) {
  return new Intl.DateTimeFormat("en-US", {
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
    timeZone: "America/Chicago",
  }).format(new Date(value));
}

export default async function ProspectCommand() {
  const supabase = await createClient();
  const { data: workspace, error: workspaceError } = await supabase
    .from("operator_workspaces")
    .select("id")
    .eq("slug", "the-leadflow-pro")
    .single();
  if (workspaceError || !workspace) throw new Error("OperatorOS workspace is unavailable.");

  const [prospectResult, actionResult] = await Promise.all([
    supabase
      .from("operator_prospects")
      .select("id,business_name,website_url,industry,priority,qualification_signal,observed_gap,best_offer,contact_route,status,owner_name,permission_state,next_action,next_action_at")
      .eq("workspace_id", workspace.id)
      .order("priority")
      .order("business_name"),
    supabase
      .from("operator_outreach_actions")
      .select("id,prospect_id,channel,action_type,due_at,sequence_day,message_draft,status,human_approved")
      .eq("workspace_id", workspace.id)
      .in("status", ["queued", "approved"])
      .order("due_at")
      .limit(1000),
  ]);
  if (prospectResult.error || actionResult.error) throw new Error("Prospect Command is temporarily unavailable.");

  const prospects = (prospectResult.data ?? []) as Prospect[];
  const actions = (actionResult.data ?? []) as OutreachAction[];
  const today = centralDate();
  const actionByProspect = new Map<string, OutreachAction>();
  actions.forEach((action) => {
    if (!actionByProspect.has(action.prospect_id)) actionByProspect.set(action.prospect_id, action);
  });
  const dueNow = actions.filter((action) => centralDate(action.due_at) <= today).length;
  const priorityA = prospects.filter((prospect) => prospect.priority === "A").length;
  const contacted = prospects.filter((prospect) => ["contacted", "responded", "qualified", "proposal", "won"].includes(prospect.status)).length;
  const replies = prospects.filter((prospect) => ["responded", "qualified", "proposal", "won"].includes(prospect.status)).length;

  return (
    <div className="space-y-7">
      <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-end">
        <div>
          <p className="text-xs font-black uppercase tracking-[0.2em] text-[var(--blue)]">OperatorOS · outbound</p>
          <h2 className="mt-1 text-3xl font-black tracking-tight text-[var(--heading)] sm:text-4xl">Prospect Command</h2>
          <p className="mt-2 max-w-3xl text-sm leading-6 text-[var(--muted)]">The first Longview 50 are staged as an operating queue. Every message is a draft. Nothing here auto-sends, impersonates a business, or bypasses the human approval line.</p>
        </div>
        <Link href="/admin/operator/growth" className="btn-primary inline-flex items-center justify-center gap-2">Open Goal Mode <ArrowRight className="h-4 w-4" /></Link>
      </div>

      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        {[
          ["Prospects loaded", prospects.length, "first Longview operating batch", UsersRound],
          ["Priority A", priorityA, "work these first", Target],
          ["Actions due", dueNow, "permission-first drafts", Clock3],
          ["Replies recorded", replies, `${contacted} contacted`, MessageSquareText],
        ].map(([label, value, note, Icon]) => {
          const C = Icon as typeof UsersRound;
          return <section key={String(label)} className="rounded-2xl border border-[var(--line)] bg-white p-5"><C className="h-5 w-5 text-[var(--blue)]" /><p className="mt-3 text-xs font-black uppercase tracking-wide text-[var(--muted)]">{label}</p><p className="mt-1 text-3xl font-black text-[var(--heading)]">{String(value)}</p><p className="mt-1 text-xs text-[var(--muted)]">{String(note)}</p></section>;
        })}
      </div>

      <section className="overflow-hidden rounded-2xl border border-[var(--line)] bg-white shadow-[0_12px_32px_rgba(10,18,32,0.04)]">
        <div className="border-b border-[var(--line)] px-5 py-4">
          <h3 className="font-black text-[var(--heading)]">Next-action queue</h3>
          <p className="mt-1 text-xs text-[var(--muted)]">Priority, evidence, the offer hypothesis, route, and the exact next draft are all visible before anybody sends anything.</p>
        </div>
        <div className="divide-y divide-[var(--line)]">
          {prospects.map((prospect) => {
            const action = actionByProspect.get(prospect.id);
            return (
              <article key={prospect.id} className="grid gap-4 px-5 py-5 lg:grid-cols-[minmax(0,1fr)_minmax(340px,.8fr)]">
                <div>
                  <div className="flex flex-wrap items-center gap-2">
                    <span className={`rounded-full border px-2.5 py-1 text-xs font-black ${priorityTone(prospect.priority)}`}>Priority {prospect.priority}</span>
                    <span className="rounded-full border border-[var(--line)] bg-[var(--fill-2)] px-2.5 py-1 text-xs font-bold text-[var(--muted)]">{prospect.status.replaceAll("_", " ")}</span>
                    <span className="rounded-full border border-[var(--line)] px-2.5 py-1 text-xs font-bold text-[var(--muted)]">{prospect.permission_state.replaceAll("_", " ")}</span>
                  </div>
                  <h4 className="mt-3 text-lg font-black text-[var(--heading)]">{prospect.business_name}</h4>
                  <p className="text-xs text-[var(--muted)]">{prospect.industry || "Local business"} · Owner: {prospect.owner_name || "Unassigned"}</p>
                  {prospect.website_url && <a href={prospect.website_url} target="_blank" rel="noreferrer" className="mt-2 inline-flex text-sm font-bold text-[var(--blue)] hover:underline">Review public source</a>}
                  <dl className="mt-4 grid gap-3 text-sm sm:grid-cols-2">
                    <div><dt className="text-xs font-black uppercase tracking-wide text-[var(--muted)]">Why it is worth attention</dt><dd className="mt-1 leading-6 text-[var(--text)]">{prospect.qualification_signal || "Needs verification"}</dd></div>
                    <div><dt className="text-xs font-black uppercase tracking-wide text-[var(--muted)]">Observed opportunity</dt><dd className="mt-1 leading-6 text-[var(--text)]">{prospect.observed_gap || "Needs verification"}</dd></div>
                    <div><dt className="text-xs font-black uppercase tracking-wide text-[var(--muted)]">Best first offer</dt><dd className="mt-1 leading-6 text-[var(--text)]">{prospect.best_offer || "Private audit"}</dd></div>
                    <div><dt className="text-xs font-black uppercase tracking-wide text-[var(--muted)]">Route</dt><dd className="mt-1 leading-6 text-[var(--text)]">{prospect.contact_route || "Verify decision-maker"}</dd></div>
                  </dl>
                </div>

                <div className="rounded-xl border border-[var(--line)] bg-[var(--fill-2)] p-4">
                  <div className="flex items-start justify-between gap-3">
                    <div><p className="text-xs font-black uppercase tracking-wide text-[var(--blue)]">Next draft</p><p className="mt-1 text-sm font-black text-[var(--heading)]">{action ? `${action.action_type.replaceAll("_", " ")} · sequence ${action.sequence_day}` : "No action queued"}</p></div>
                    <Send className="h-5 w-5 text-[var(--blue)]" />
                  </div>
                  {action ? <>
                    <p className="mt-2 text-xs text-[var(--muted)]">Due {shortWhen(action.due_at)} · {action.channel} · {action.human_approved ? "approved" : "needs human approval"}</p>
                    <p className="mt-4 whitespace-pre-wrap text-sm leading-6 text-[var(--text)]">{action.message_draft}</p>
                  </> : <p className="mt-3 text-sm text-[var(--muted)]">No queued outreach remains for this record.</p>}
                </div>
              </article>
            );
          })}
        </div>
      </section>
    </div>
  );
}
