import Link from "next/link";
import { ArrowRight, Clock3, ContactRound, Send, ShieldCheck, Target } from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import { centralDate } from "@/lib/operatoros/growth";
import {
  outreachReadiness,
  type OutreachChannel,
  type OutreachProspectReadiness,
  type OutreachWorkspaceReadiness,
} from "@/lib/operatoros/outreach-readiness";

export const metadata = { title: "Outreach Action Center | The LeadFlow Pro" };
export const dynamic = "force-dynamic";

function shortWhen(value: string | null) {
  if (!value) return "Not scheduled";
  return new Intl.DateTimeFormat("en-US", {
    dateStyle: "medium",
    timeStyle: "short",
    timeZone: "America/Chicago",
  }).format(new Date(value));
}

export default async function OutreachActionCenter() {
  const supabase = await createClient();
  const { data: workspace, error: workspaceError } = await supabase
    .from("operator_workspaces")
    .select("id")
    .eq("slug", "the-leadflow-pro")
    .single();
  if (workspaceError || !workspace) throw new Error("OperatorOS workspace is unavailable.");

  const [prospectResult, actionResult, settingsResult] = await Promise.all([
    supabase
      .from("operator_prospects")
      .select("id,business_name,industry,priority,status,owner_name,contact_name,contact_title,contact_email,contact_phone,contact_route,contact_source,contact_verified_at,compliance_review_required,next_action_at")
      .eq("workspace_id", workspace.id)
      .not("status", "in", "(won,lost,do_not_contact)")
      .order("priority")
      .order("next_action_at", { ascending: true, nullsFirst: false }),
    supabase
      .from("operator_outreach_actions")
      .select("id,prospect_id,action_type,due_at,channel,status,human_approved")
      .eq("workspace_id", workspace.id)
      .in("status", ["queued", "approved"])
      .order("due_at", { ascending: true }),
    supabase
      .from("operator_workspace_settings")
      .select("sender_name,sender_email,sender_phone,allowed_channels")
      .eq("workspace_id", workspace.id)
      .single(),
  ]);
  if (prospectResult.error || actionResult.error || settingsResult.error || !settingsResult.data) throw new Error("Outreach Action Center is temporarily unavailable.");

  const prospects = prospectResult.data ?? [];
  const actions = actionResult.data ?? [];
  const actionByProspect = new Map<string, (typeof actions)[number]>();
  actions.forEach((action) => { if (!actionByProspect.has(action.prospect_id)) actionByProspect.set(action.prospect_id, action); });
  const readinessByProspect = new Map(
    prospects.map((prospect) => {
      const action = actionByProspect.get(prospect.id);
      return [
        prospect.id,
        action
          ? outreachReadiness(
              prospect as OutreachProspectReadiness,
              settingsResult.data as OutreachWorkspaceReadiness,
              action.channel as OutreachChannel,
            )
          : { ready: false, blockers: ["No active outreach draft is queued."] },
      ] as const;
    }),
  );
  const today = centralDate();
  const due = actions.filter((action) => centralDate(action.due_at) <= today).length;
  const missingContact = prospects.filter((prospect) => !prospect.contact_email && !prospect.contact_phone).length;
  const verified = prospects.filter((prospect) => prospect.contact_verified_at).length;
  const approved = actions.filter((action) => action.human_approved && action.status === "approved").length;
  const readyForApproval = prospects.filter((prospect) => readinessByProspect.get(prospect.id)?.ready).length;

  return (
    <div className="space-y-7">
      <section className="overflow-hidden rounded-[28px] border border-[#ffffff1f] bg-[#07111f] p-6 text-white shadow-[0_30px_90px_rgba(7,17,31,0.24)] sm:p-8">
        <p className="text-xs font-black uppercase tracking-[0.22em] text-[#50d4ff]">Human-gated execution</p>
        <h1 className="mt-2 text-4xl font-black tracking-tight sm:text-5xl">Outreach Action Center</h1>
        <p className="mt-3 max-w-3xl text-sm leading-6 text-[#b8c5d9]">This is the working queue between a drafted idea and a real message. Verify the decision-maker, edit the draft, approve it, send it yourself, then record the result.</p>
      </section>

      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        {[
          ["Due now", due, Clock3, "queued or approved"],
          ["Ready for approval", readyForApproval, ShieldCheck, "verified route and settings"],
          ["Approved", approved, ShieldCheck, "ready for a human to send"],
          ["Verified contacts", verified, ContactRound, `${missingContact} still need a route`],
        ].map(([label, value, Icon, note]) => {
          const C = Icon as typeof Target;
          return <section key={String(label)} className="rounded-2xl border border-[var(--line)] bg-white p-5"><C className="h-5 w-5 text-[var(--blue)]" /><p className="mt-3 text-xs font-black uppercase tracking-wide text-[var(--muted)]">{String(label)}</p><p className="mt-1 text-3xl font-black text-[var(--heading)]">{String(value)}</p><p className="mt-1 text-xs text-[var(--muted)]">{String(note)}</p></section>;
        })}
      </div>

      <section className="overflow-hidden rounded-2xl border border-[var(--line)] bg-white shadow-[0_12px_32px_rgba(10,18,32,0.04)]">
        <div className="border-b border-[var(--line)] px-5 py-4"><h2 className="font-black text-[var(--heading)]">Work in this order</h2><p className="mt-1 text-xs text-[var(--muted)]">Priority A first, then due time. Nothing auto-sends.</p></div>
        <div className="divide-y divide-[var(--line)]">
          {prospects.map((prospect) => {
            const action = actionByProspect.get(prospect.id);
            const readiness = readinessByProspect.get(prospect.id);
            const hasContact = Boolean(prospect.contact_email || prospect.contact_phone);
            return (
              <article key={prospect.id} className="grid gap-4 px-5 py-4 lg:grid-cols-[minmax(0,1fr)_minmax(280px,.55fr)_auto] lg:items-center">
                <div>
                  <div className="flex flex-wrap items-center gap-2"><span className={`rounded-full border px-2 py-0.5 text-[11px] font-black ${prospect.priority === "A" ? "border-red-200 bg-red-50 text-red-700" : prospect.priority === "B" ? "border-amber-200 bg-amber-50 text-amber-700" : "border-slate-200 bg-slate-50 text-slate-600"}`}>Priority {prospect.priority}</span><span className="rounded-full border border-[var(--line)] bg-[var(--fill-2)] px-2 py-0.5 text-[11px] font-black text-[var(--muted)]">{prospect.status.replaceAll("_", " ")}</span>{prospect.compliance_review_required && <span className="rounded-full border border-amber-200 bg-amber-50 px-2 py-0.5 text-[11px] font-black text-amber-800">compliance review</span>}</div>
                  <h3 className="mt-2 font-black text-[var(--heading)]">{prospect.business_name}</h3>
                  <p className="mt-1 text-xs text-[var(--muted)]">{prospect.industry || "Local business"} · {prospect.owner_name || "Unassigned"} · {hasContact ? prospect.contact_name || prospect.contact_email || prospect.contact_phone : "contact input needed"}</p>
                  <p className={`mt-2 text-xs font-bold ${readiness?.ready ? "text-emerald-700" : "text-amber-800"}`}>
                    {readiness?.ready ? "Ready for human approval review." : readiness?.blockers[0] || "Readiness could not be verified."}
                  </p>
                </div>
                <div className="rounded-xl border border-[var(--line)] bg-[var(--fill-2)] p-3">
                  <div className="flex items-center gap-2"><Send className="h-4 w-4 text-[var(--blue)]" /><p className="text-sm font-black text-[var(--heading)]">{action ? action.action_type.replaceAll("_", " ") : "No active draft"}</p></div>
                  <p className="mt-1 text-xs text-[var(--muted)]">{action ? `${shortWhen(action.due_at)} · ${action.channel} · ${action.status}` : `Next action ${shortWhen(prospect.next_action_at)}`}</p>
                </div>
                <Link href={`/admin/operator/prospects/${prospect.id}`} className="inline-flex min-h-[42px] items-center justify-center gap-2 rounded-lg bg-[var(--blue)] px-4 text-sm font-black text-white">Open <ArrowRight className="h-4 w-4" /></Link>
              </article>
            );
          })}
        </div>
      </section>
    </div>
  );
}
