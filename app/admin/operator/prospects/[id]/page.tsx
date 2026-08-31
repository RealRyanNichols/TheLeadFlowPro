import Link from "next/link";
import { ArrowLeft, CalendarClock, CircleAlert, Clock3, ExternalLink, History, ShieldCheck, Target } from "lucide-react";
import { notFound } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import {
  outreachReadiness,
  type OutreachChannel,
  type OutreachProspectReadiness,
  type OutreachWorkspaceReadiness,
} from "@/lib/operatoros/outreach-readiness";
import ProspectResponsePlanner from "../ProspectResponsePlanner";
import ProspectActionControls from "./ProspectActionControls";
import ProspectContactEditor from "./ProspectContactEditor";

export const dynamic = "force-dynamic";

function when(value: string | null) {
  if (!value) return "Not scheduled";
  return new Intl.DateTimeFormat("en-US", {
    dateStyle: "medium",
    timeStyle: "short",
    timeZone: "America/Chicago",
  }).format(new Date(value));
}

function statusTone(status: string) {
  if (status === "approved") return "border-emerald-200 bg-emerald-50 text-emerald-800";
  if (status === "sent" || status === "responded") return "border-cyan-200 bg-cyan-50 text-cyan-800";
  if (status === "skipped" || status === "cancelled") return "border-slate-200 bg-slate-50 text-slate-600";
  return "border-amber-200 bg-amber-50 text-amber-800";
}

export default async function ProspectRecord({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const supabase = await createClient();
  const [prospectResult, actionResult, eventResult] = await Promise.all([
    supabase
      .from("operator_prospects")
      .select("id,workspace_id,business_name,website_url,industry,market,priority,qualification_signal,observed_gap,best_offer,contact_route,source,status,owner_name,permission_state,last_contacted_at,next_action_at,next_action,response_summary,compliance_review_required,contact_name,contact_title,contact_email,contact_phone,contact_source,contact_verified_at,last_outreach_channel,do_not_contact_reason")
      .eq("id", id)
      .maybeSingle(),
    supabase
      .from("operator_outreach_actions")
      .select("id,channel,action_type,due_at,sequence_day,message_draft,status,human_approved,sent_at,notes,created_at")
      .eq("prospect_id", id)
      .order("due_at", { ascending: true }),
    supabase
      .from("operator_outreach_events")
      .select("id,event_type,detail_json,created_at")
      .eq("prospect_id", id)
      .order("created_at", { ascending: false })
      .limit(30),
  ]);

  if (prospectResult.error || !prospectResult.data) notFound();
  if (actionResult.error || eventResult.error) throw new Error("Prospect record is temporarily unavailable.");

  const prospect = prospectResult.data;
  const { data: workspaceSettings, error: settingsError } = await supabase
    .from("operator_workspace_settings")
    .select("sender_name,sender_email,sender_phone,allowed_channels")
    .eq("workspace_id", prospect.workspace_id)
    .single();
  if (settingsError || !workspaceSettings) throw new Error("OperatorOS readiness settings are temporarily unavailable.");
  const actions = actionResult.data ?? [];
  const events = eventResult.data ?? [];
  const activeActions = actions.filter((action) => ["queued", "approved"].includes(action.status));
  const closedActions = actions.filter((action) => !["queued", "approved"].includes(action.status));
  const verifiedContact = Boolean(prospect.contact_verified_at);

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <Link href="/admin/operator/prospects" className="inline-flex items-center gap-2 text-sm font-black text-[var(--blue)] hover:underline">
          <ArrowLeft className="h-4 w-4" /> Back to Prospect Command
        </Link>
        <div className="flex flex-wrap items-center gap-2">
          <span className={`rounded-full border px-3 py-1 text-xs font-black ${prospect.priority === "A" ? "border-red-200 bg-red-50 text-red-700" : prospect.priority === "B" ? "border-amber-200 bg-amber-50 text-amber-700" : "border-slate-200 bg-slate-50 text-slate-600"}`}>Priority {prospect.priority}</span>
          <span className="rounded-full border border-[var(--line)] bg-white px-3 py-1 text-xs font-black text-[var(--muted)]">{prospect.status.replaceAll("_", " ")}</span>
          <span className={`rounded-full border px-3 py-1 text-xs font-black ${verifiedContact ? "border-emerald-200 bg-emerald-50 text-emerald-800" : "border-amber-200 bg-amber-50 text-amber-800"}`}>{verifiedContact ? "Contact verified" : "Contact needs verification"}</span>
        </div>
      </div>

      <section className="overflow-hidden rounded-[28px] border border-[#ffffff1f] bg-[#07111f] p-6 text-white shadow-[0_30px_90px_rgba(7,17,31,0.24)] sm:p-8">
        <div className="flex flex-col justify-between gap-5 lg:flex-row lg:items-start">
          <div>
            <p className="text-xs font-black uppercase tracking-[0.22em] text-[#50d4ff]">Prospect record · {prospect.market}</p>
            <h1 className="mt-2 text-4xl font-black tracking-tight">{prospect.business_name}</h1>
            <p className="mt-2 text-sm text-[#aabbd2]">{prospect.industry || "Local business"} · owner {prospect.owner_name || "unassigned"} · permission {prospect.permission_state.replaceAll("_", " ")}</p>
          </div>
          {prospect.website_url && (
            <a href={prospect.website_url} target="_blank" rel="noreferrer" className="inline-flex min-h-[42px] items-center justify-center gap-2 rounded-xl border border-white/20 px-4 text-sm font-black text-white">
              Review public source <ExternalLink className="h-4 w-4" />
            </a>
          )}
        </div>
        <div className="mt-6 grid gap-3 md:grid-cols-3">
          <div className="rounded-2xl border border-white/10 bg-[#101d31] p-4"><p className="text-[11px] font-black uppercase tracking-wide text-[#8295b1]">Why it is worth attention</p><p className="mt-2 text-sm leading-6 text-[#dbe5f3]">{prospect.qualification_signal || "Needs verification"}</p></div>
          <div className="rounded-2xl border border-white/10 bg-[#101d31] p-4"><p className="text-[11px] font-black uppercase tracking-wide text-[#8295b1]">Observed opportunity</p><p className="mt-2 text-sm leading-6 text-[#dbe5f3]">{prospect.observed_gap || "Needs verification"}</p></div>
          <div className="rounded-2xl border border-white/10 bg-[#101d31] p-4"><p className="text-[11px] font-black uppercase tracking-wide text-[#8295b1]">Best first offer</p><p className="mt-2 text-sm leading-6 text-[#dbe5f3]">{prospect.best_offer || "Private audit"}</p></div>
        </div>
      </section>

      <div className="grid gap-6 xl:grid-cols-[minmax(0,1.15fr)_minmax(360px,.85fr)]">
        <div className="space-y-6">
          <ProspectContactEditor prospect={prospect} />

          <section className="rounded-2xl border border-[var(--line)] bg-white p-5 shadow-[0_12px_32px_rgba(10,18,32,0.04)]">
            <div className="flex items-start gap-3">
              <Target className="mt-0.5 h-5 w-5 text-[var(--blue)]" />
              <div><h2 className="font-black text-[var(--heading)]">Response planner</h2><p className="mt-1 text-xs leading-5 text-[var(--muted)]">Paste a real reply. OperatorOS will cancel the old sequence, classify the response, and queue the next recommendation for human review.</p></div>
            </div>
            <ProspectResponsePlanner prospectId={prospect.id} />
          </section>
        </div>

        <div className="space-y-6">
          <section className="rounded-2xl border border-[var(--line)] bg-white p-5 shadow-[0_12px_32px_rgba(10,18,32,0.04)]">
            <div className="flex items-center justify-between gap-3">
              <div className="flex items-center gap-2"><CalendarClock className="h-5 w-5 text-[var(--blue)]" /><h2 className="font-black text-[var(--heading)]">Active outreach</h2></div>
              <span className="rounded-full bg-[var(--fill-2)] px-3 py-1 text-xs font-black text-[var(--muted)]">{activeActions.length} open</span>
            </div>
            {activeActions.length ? (
              <div className="mt-4 space-y-5">
                {activeActions.map((action) => (
                  <article key={action.id} className="rounded-xl border border-[var(--line)] bg-[var(--fill-2)] p-4">
                    <div className="mb-4 flex flex-wrap items-center justify-between gap-2">
                      <div><p className="font-black text-[var(--heading)]">{action.action_type.replaceAll("_", " ")}</p><p className="mt-1 text-xs text-[var(--muted)]">Sequence {action.sequence_day} · due {when(action.due_at)}</p></div>
                      <span className={`rounded-full border px-2.5 py-1 text-xs font-black ${statusTone(action.status)}`}>{action.status}</span>
                    </div>
                    <ProspectActionControls
                      action={action}
                      complianceRequired={prospect.compliance_review_required}
                      approvalBlockers={outreachReadiness(
                        prospect as OutreachProspectReadiness,
                        workspaceSettings as OutreachWorkspaceReadiness,
                        action.channel as OutreachChannel,
                      ).blockers}
                    />
                  </article>
                ))}
              </div>
            ) : (
              <div className="mt-4 rounded-xl border border-dashed border-[var(--line-strong)] p-5 text-center">
                <CircleAlert className="mx-auto h-5 w-5 text-[var(--muted)]" />
                <p className="mt-2 font-black text-[var(--heading)]">No active draft</p>
                <p className="mt-1 text-xs leading-5 text-[var(--muted)]">The sequence may be complete, cancelled, or waiting for a new response recommendation.</p>
              </div>
            )}
          </section>

          <section className="rounded-2xl border border-[var(--line)] bg-white p-5 shadow-[0_12px_32px_rgba(10,18,32,0.04)]">
            <div className="flex items-center gap-2"><Clock3 className="h-5 w-5 text-[var(--blue)]" /><h2 className="font-black text-[var(--heading)]">Current state</h2></div>
            <dl className="mt-4 space-y-3 text-sm">
              <div><dt className="text-xs font-black uppercase tracking-wide text-[var(--muted)]">Next action</dt><dd className="mt-1 font-semibold leading-6 text-[var(--text)]">{prospect.next_action || "No next action is recorded."}</dd></div>
              <div><dt className="text-xs font-black uppercase tracking-wide text-[var(--muted)]">Next action time</dt><dd className="mt-1 font-semibold text-[var(--text)]">{when(prospect.next_action_at)}</dd></div>
              <div><dt className="text-xs font-black uppercase tracking-wide text-[var(--muted)]">Last contact</dt><dd className="mt-1 font-semibold text-[var(--text)]">{when(prospect.last_contacted_at)}{prospect.last_outreach_channel ? ` · ${prospect.last_outreach_channel}` : ""}</dd></div>
              <div><dt className="text-xs font-black uppercase tracking-wide text-[var(--muted)]">Source note</dt><dd className="mt-1 font-semibold leading-6 text-[var(--text)]">{prospect.source || "No source note"}</dd></div>
            </dl>
          </section>
        </div>
      </div>

      {(closedActions.length > 0 || events.length > 0) && (
        <section className="rounded-2xl border border-[var(--line)] bg-white p-5 shadow-[0_12px_32px_rgba(10,18,32,0.04)] sm:p-6">
          <div className="flex items-center gap-2"><History className="h-5 w-5 text-[var(--blue)]" /><h2 className="font-black text-[var(--heading)]">Outreach audit trail</h2></div>
          <div className="mt-5 grid gap-5 lg:grid-cols-2">
            <div className="space-y-3">
              <p className="text-xs font-black uppercase tracking-wide text-[var(--muted)]">Closed actions</p>
              {closedActions.slice().reverse().slice(0, 12).map((action) => (
                <div key={action.id} className="rounded-xl border border-[var(--line)] p-3">
                  <div className="flex flex-wrap items-center justify-between gap-2"><p className="font-black text-[var(--heading)]">{action.action_type.replaceAll("_", " ")}</p><span className={`rounded-full border px-2 py-0.5 text-[11px] font-black ${statusTone(action.status)}`}>{action.status}</span></div>
                  <p className="mt-1 text-xs text-[var(--muted)]">{action.sent_at ? `Sent record ${when(action.sent_at)}` : `Due ${when(action.due_at)}`}</p>
                </div>
              ))}
            </div>
            <div className="space-y-3">
              <p className="text-xs font-black uppercase tracking-wide text-[var(--muted)]">Recorded events</p>
              {events.map((event) => (
                <div key={event.id} className="border-l-2 border-[var(--accent-line)] pl-3">
                  <div className="flex flex-wrap items-center gap-2"><p className="font-black text-[var(--heading)]">{event.event_type.replaceAll("_", " ")}</p>{event.event_type === "approved" && <ShieldCheck className="h-4 w-4 text-emerald-700" />}</div>
                  <p className="mt-1 text-xs text-[var(--muted)]">{when(event.created_at)}</p>
                </div>
              ))}
            </div>
          </div>
        </section>
      )}
    </div>
  );
}
