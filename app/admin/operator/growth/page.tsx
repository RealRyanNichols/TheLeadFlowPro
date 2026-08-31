import Link from "next/link";
import {
  ArrowRight,
  CalendarDays,
  CircleDollarSign,
  Gauge,
  Landmark,
  MessageSquareText,
  ReceiptText,
  Send,
  Target,
  UsersRound,
} from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import {
  DEFAULT_GROWTH_ASSUMPTIONS,
  DEFAULT_SEPTEMBER_OFFER_MIX,
  LEADFLOW_GROWTH_LOOP,
  businessDaysInclusive,
  centralDate,
  clampDate,
  funnelTargets,
  money,
  number,
  pct,
  type GrowthAssumptions,
} from "@/lib/operatoros/growth";

export const metadata = { title: "Goal Mode | The LeadFlow Pro" };
export const dynamic = "force-dynamic";

type MissionControl = {
  stretch_target_value?: number;
  assumptions?: Partial<GrowthAssumptions>;
  offer_mix?: Array<{ name: string; setup: number; closes: number }>;
  daily_quotas?: Record<string, number>;
};

type Mission = {
  id: string;
  name: string;
  description: string | null;
  target_value: number | string | null;
  current_value: number | string | null;
  unit: string | null;
  score: number;
  control_json: MissionControl | null;
  starts_at: string | null;
  target_at: string | null;
};

type CashEntry = {
  source_type: string;
  amount_cents: number;
  received_at: string;
};

function statTone(status: string) {
  if (status === "AHEAD" || status === "ON PACE") return "border-emerald-400/35 bg-emerald-400/10 text-emerald-200";
  if (status === "BEHIND") return "border-amber-400/35 bg-amber-400/10 text-amber-100";
  return "border-cyan-400/30 bg-cyan-400/10 text-cyan-100";
}

function cashSourceLabel(source: string) {
  if (source === "checkout") return "checkout";
  if (source === "invoice") return "invoice";
  return source.replace("manual_", "");
}

export default async function GrowthGoalMode() {
  const supabase = await createClient();
  const { data: workspace, error: workspaceError } = await supabase
    .from("operator_workspaces")
    .select("id")
    .eq("slug", "the-leadflow-pro")
    .single();
  if (workspaceError || !workspace) throw new Error("OperatorOS workspace is unavailable.");

  const { data: missionData, error: missionError } = await supabase
    .from("operator_missions")
    .select("id,name,description,target_value,current_value,unit,score,control_json,starts_at,target_at")
    .eq("workspace_id", workspace.id)
    .eq("status", "active")
    .eq("target_metric", "cash_collected_usd")
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();
  if (missionError) throw new Error(`Goal Mode is unavailable: ${missionError.message}`);

  const mission = missionData as Mission | null;
  const startDate = mission?.starts_at ? centralDate(mission.starts_at) : "2026-09-01";
  const targetDate = mission?.target_at ? centralDate(mission.target_at) : "2026-09-30";
  const startIso = mission?.starts_at ?? "2026-09-01T05:00:00.000Z";
  const targetUsd = Number(mission?.target_value || 75000);
  const controls = (mission?.control_json ?? {}) as MissionControl;
  const stretchUsd = Number(controls.stretch_target_value || 100000);
  const assumptions: GrowthAssumptions = {
    ...DEFAULT_GROWTH_ASSUMPTIONS,
    ...(controls.assumptions ?? {}),
  };
  const offerMix = controls.offer_mix?.length ? controls.offer_mix : [...DEFAULT_SEPTEMBER_OFFER_MIX];
  const closeTarget = offerMix.reduce((sum, item) => sum + Number(item.closes || 0), 0);
  const funnel = funnelTargets(closeTarget, assumptions);

  const [cashResult, leadResult, prospectResult, outreachResult, episodeResult] = await Promise.all([
    supabase
      .from("operator_verified_cash_entries")
      .select("source_type,amount_cents,received_at")
      .eq("workspace_id", workspace.id)
      .gte("received_at", startIso)
      .order("received_at", { ascending: false })
      .limit(5000),
    supabase
      .from("leads")
      .select("id,status,expected_value_cents,close_probability,priority,next_follow_up_at,created_at")
      .is("deleted_at", null)
      .eq("is_test", false)
      .limit(1000),
    supabase
      .from("operator_prospects")
      .select("id,status,priority,next_action_at,contact_email,contact_phone,contact_verified_at")
      .eq("workspace_id", workspace.id)
      .limit(2000),
    supabase
      .from("operator_outreach_actions")
      .select("id,status,due_at,sequence_day")
      .eq("workspace_id", workspace.id)
      .limit(5000),
    supabase
      .from("operator_daily_episodes")
      .select("episode_date,day_number,content_draft,status,metrics_json")
      .eq("workspace_id", workspace.id)
      .order("episode_date", { ascending: false })
      .limit(3),
  ]);

  const firstError = [cashResult, leadResult, prospectResult, outreachResult, episodeResult]
    .map((result) => result.error)
    .find(Boolean);
  if (firstError) throw new Error(`Goal Mode data is temporarily unavailable: ${firstError.message}`);

  const cashEntries = (cashResult.data ?? []) as CashEntry[];
  const leads = leadResult.data ?? [];
  const prospects = prospectResult.data ?? [];
  const outreach = outreachResult.data ?? [];
  const episodes = episodeResult.data ?? [];

  const targetEnd = mission?.target_at ? new Date(mission.target_at).getTime() : Infinity;
  const cashCollected = cashEntries
    .filter((entry) => new Date(entry.received_at).getTime() <= targetEnd)
    .reduce((sum, entry) => sum + Math.max(0, Number(entry.amount_cents || 0)) / 100, 0);
  const cashSources = new Map<string, number>();
  cashEntries.forEach((entry) => cashSources.set(entry.source_type, (cashSources.get(entry.source_type) || 0) + Number(entry.amount_cents || 0) / 100));

  const gap = Math.max(0, targetUsd - cashCollected);
  const totalBusinessDays = businessDaysInclusive(startDate, targetDate);
  const today = centralDate();
  const boundedToday = clampDate(today, startDate, targetDate);
  const elapsed = today < startDate ? 0 : businessDaysInclusive(startDate, boundedToday);
  const remaining = Math.max(0, totalBusinessDays - elapsed);
  const expectedByNow = totalBusinessDays ? targetUsd * (elapsed / totalBusinessDays) : targetUsd;
  const paceStatus = today < startDate
    ? "READY"
    : cashCollected + 1 >= expectedByNow
      ? cashCollected > expectedByNow * 1.1
        ? "AHEAD"
        : "ON PACE"
      : "BEHIND";
  const requiredDaily = gap / Math.max(remaining || 1, 1);
  const targetProgress = targetUsd ? cashCollected / targetUsd : 0;

  const openLeads = leads.filter((lead) => !["won", "lost"].includes(lead.status));
  const valuedLeads = openLeads.filter((lead) => Number(lead.expected_value_cents || 0) > 0);
  const openPipeline = valuedLeads.reduce((sum, lead) => sum + Number(lead.expected_value_cents || 0) / 100, 0);
  const warmProposals = leads.filter((lead) => ["proposal", "proposal_sent"].includes(lead.status)).length;
  const warmCalls = leads.filter((lead) => lead.status === "call_booked").length;
  const warmWins = leads.filter((lead) => lead.status === "won").length;

  const prospectCounts = new Map<string, number>();
  prospects.forEach((prospect) => prospectCounts.set(prospect.status, (prospectCounts.get(prospect.status) || 0) + 1));
  const contactsDone = ["contacted", "responded", "qualified", "proposal", "won"].reduce((sum, status) => sum + (prospectCounts.get(status) || 0), 0);
  const repliesDone = ["responded", "qualified", "proposal", "won"].reduce((sum, status) => sum + (prospectCounts.get(status) || 0), 0);
  const qualifiedDone = ["qualified", "proposal", "won"].reduce((sum, status) => sum + (prospectCounts.get(status) || 0), 0);
  const proposalsDone = (prospectCounts.get("proposal") || 0) + (prospectCounts.get("won") || 0);
  const closesDone = (prospectCounts.get("won") || 0) + warmWins;
  const contactCoverage = prospects.filter((prospect) => prospect.contact_email || prospect.contact_phone).length;
  const verifiedContacts = prospects.filter((prospect) => prospect.contact_verified_at).length;

  const todayActions = outreach.filter(
    (action) => action.due_at && centralDate(action.due_at) <= today && ["queued", "approved"].includes(action.status),
  ).length;
  const baselineDaily = {
    contacts: Math.ceil(funnel.contacts / Math.max(totalBusinessDays, 1)),
    followups: Number(controls.daily_quotas?.followups || 20),
    qualified: Math.ceil(funnel.qualified / Math.max(totalBusinessDays, 1)),
    proposals: Math.ceil(funnel.proposals / Math.max(totalBusinessDays, 1)),
    closes: Math.ceil(funnel.closes / Math.max(totalBusinessDays, 1)),
    concepts: Number(controls.daily_quotas?.private_concepts || 2),
  };

  const scorecards = [
    { label: "September target", value: money(targetUsd), note: `${money(stretchUsd)} stretch`, icon: Target },
    { label: "Verified cash", value: money(cashCollected), note: `${pct(targetProgress)} of target · ${cashEntries.length} receipts`, icon: CircleDollarSign },
    { label: "Gap to target", value: money(gap), note: `${money(requiredDaily)} needed per remaining business day`, icon: Gauge },
    { label: "Open CRM pipeline", value: money(openPipeline), note: `${valuedLeads.length}/${openLeads.length} open leads have a dollar value`, icon: UsersRound },
    { label: "Actions due", value: number(todayActions), note: "Permission-first drafts; nothing auto-sends", icon: Send },
    { label: "Warm opportunities", value: number(warmProposals + warmCalls), note: `${warmProposals} proposal · ${warmCalls} call booked`, icon: MessageSquareText },
  ];

  return (
    <div className="space-y-7">
      <section className="overflow-hidden rounded-[28px] border border-[#ffffff1f] bg-[#07111f] px-5 py-7 text-white shadow-[0_30px_90px_rgba(7,17,31,0.24)] sm:px-8">
        <div className="flex flex-col justify-between gap-5 lg:flex-row lg:items-start">
          <div>
            <p className="text-xs font-black uppercase tracking-[0.24em] text-[#50d4ff]">Goal Mode · September 2026</p>
            <h2 className="mt-2 text-4xl font-black tracking-tight sm:text-5xl">{mission?.name || "$75K Cash Collected"}</h2>
            <p className="mt-3 max-w-3xl text-sm leading-6 text-[#b8c5d9]">The scoreboard works backward from verified money received into conversations, proposals, follow-up, and targeted outreach. Open invoices, expected value, and promises are not counted as cash.</p>
          </div>
          <div className={`rounded-2xl border px-5 py-4 ${statTone(paceStatus)}`}>
            <p className="text-[11px] font-black uppercase tracking-[0.18em]">Pace</p>
            <p className="mt-1 text-2xl font-black">{paceStatus}</p>
            <p className="mt-1 text-xs opacity-80">Day {elapsed} of {totalBusinessDays} business days</p>
          </div>
        </div>

        <div className="mt-7 flex flex-wrap items-center gap-2 text-xs font-black tracking-wide text-[#9fb0c8]">
          {LEADFLOW_GROWTH_LOOP.map((stage, index) => (
            <span key={`${stage}-${index}`} className="flex items-center gap-2">
              <span className="rounded-full border border-[#ffffff1f] bg-[#101d31] px-3 py-2 text-white">{stage}</span>
              {index < LEADFLOW_GROWTH_LOOP.length - 1 && <ArrowRight className="h-3.5 w-3.5 text-[#50d4ff]" />}
            </span>
          ))}
        </div>
        <div className="mt-7 h-3 overflow-hidden rounded-full bg-white/10"><div className="h-full rounded-full bg-gradient-to-r from-[#1240e8] to-[#35c6f4]" style={{ width: `${Math.min(100, targetProgress * 100)}%` }} /></div>
      </section>

      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-6">
        {scorecards.map(({ label, value, note, icon: Icon }) => (
          <section key={label} className="rounded-2xl border border-[var(--line)] bg-white p-4 shadow-[0_10px_30px_rgba(10,18,32,0.04)]">
            <Icon className="h-5 w-5 text-[var(--blue)]" />
            <p className="mt-3 text-[11px] font-black uppercase tracking-wide text-[var(--muted)]">{label}</p>
            <p className="mt-1 text-2xl font-black tracking-tight text-[var(--heading)]">{value}</p>
            <p className="mt-1 text-xs leading-5 text-[var(--muted)]">{note}</p>
          </section>
        ))}
      </div>

      <div className="grid gap-6 xl:grid-cols-[minmax(0,1.15fr)_minmax(360px,.85fr)]">
        <section className="rounded-2xl border border-[var(--line)] bg-white p-5 shadow-[0_12px_32px_rgba(10,18,32,0.04)] sm:p-6">
          <div className="flex flex-wrap items-end justify-between gap-3">
            <div><p className="text-xs font-black uppercase tracking-[0.18em] text-[var(--blue)]">Reverse-engineered funnel</p><h3 className="mt-1 text-2xl font-black text-[var(--heading)]">What the month requires</h3></div>
            <span className="rounded-full bg-[var(--fill-2)] px-3 py-1.5 text-xs font-bold text-[var(--muted)]">{closeTarget} closes in the working mix</span>
          </div>
          <div className="mt-5 grid gap-3 sm:grid-cols-5">
            {[
              ["Targeted contacts", funnel.contacts, contactsDone],
              ["Positive replies", funnel.replies, repliesDone],
              ["Qualified", funnel.qualified, qualifiedDone],
              ["Proposals", funnel.proposals, proposalsDone],
              ["Closes", funnel.closes, closesDone],
            ].map(([label, target, actual]) => (
              <div key={String(label)} className="rounded-xl border border-[var(--line)] bg-[var(--fill-2)] p-4"><p className="text-xs font-bold text-[var(--muted)]">{label}</p><p className="mt-2 text-3xl font-black text-[var(--heading)]">{number(Number(target))}</p><p className="mt-1 text-xs text-[var(--muted)]">{number(Number(actual))} recorded</p></div>
            ))}
          </div>
          <div className="mt-5 rounded-xl border border-[var(--line)] p-4">
            <p className="text-sm font-black text-[var(--heading)]">Working conversion assumptions</p>
            <div className="mt-3 grid gap-2 text-sm sm:grid-cols-4">
              <p><span className="font-black">{pct(assumptions.contact_to_reply)}</span><br /><span className="text-[var(--muted)]">contact → reply</span></p>
              <p><span className="font-black">{pct(assumptions.reply_to_qualified)}</span><br /><span className="text-[var(--muted)]">reply → qualified</span></p>
              <p><span className="font-black">{pct(assumptions.qualified_to_proposal)}</span><br /><span className="text-[var(--muted)]">qualified → proposal</span></p>
              <p><span className="font-black">{pct(assumptions.proposal_to_close)}</span><br /><span className="text-[var(--muted)]">proposal → close</span></p>
            </div>
            <p className="mt-3 text-xs leading-5 text-[var(--muted)]">These are planning assumptions, not historical claims. Replace them with measured rates once enough records have moved through the same stages.</p>
          </div>
        </section>

        <section className="rounded-2xl border border-[var(--line)] bg-white p-5 shadow-[0_12px_32px_rgba(10,18,32,0.04)] sm:p-6">
          <p className="text-xs font-black uppercase tracking-[0.18em] text-[var(--blue)]">Daily operating card</p>
          <h3 className="mt-1 text-2xl font-black text-[var(--heading)]">The minimum useful day</h3>
          <div className="mt-5 space-y-3">
            {[
              ["New targeted contacts", baselineDaily.contacts, "personalized and permission-first"],
              ["Follow-ups", baselineDaily.followups, "warm plus sequence queue"],
              ["Qualified conversations", baselineDaily.qualified, "measurable need and next step"],
              ["Proposals presented", baselineDaily.proposals, "not merely drafted"],
              ["Closes", baselineDaily.closes, "working daily pace"],
              ["Private concepts", baselineDaily.concepts, "only highest-value targets"],
            ].map(([label, value, note]) => <div key={String(label)} className="flex items-center justify-between gap-3 rounded-xl border border-[var(--line)] px-4 py-3"><div><p className="font-black text-[var(--heading)]">{label}</p><p className="text-xs text-[var(--muted)]">{note}</p></div><span className="text-2xl font-black text-[var(--blue)]">{value}</span></div>)}
          </div>
          <div className="mt-5 grid gap-2 sm:grid-cols-2"><Link href="/admin/operator/action-center" className="inline-flex items-center gap-2 font-black text-[var(--blue)] hover:underline">Work the action queue <ArrowRight className="h-4 w-4" /></Link><Link href="/admin/operator/cash" className="inline-flex items-center gap-2 font-black text-[var(--blue)] hover:underline">Open verified cash <ReceiptText className="h-4 w-4" /></Link></div>
          <p className="mt-4 text-xs leading-5 text-[var(--muted)]">Contact coverage: {contactCoverage}/{prospects.length}. Human verified: {verifiedContacts}. The queue cannot become reliable outbound until the decision-maker routes are loaded.</p>
        </section>
      </div>

      <div className="grid gap-6 lg:grid-cols-[minmax(0,.75fr)_minmax(0,1.25fr)]">
        <section className="rounded-2xl border border-[var(--line)] bg-white p-5 sm:p-6">
          <div className="flex items-center gap-2"><Landmark className="h-5 w-5 text-[var(--blue)]" /><h3 className="text-xl font-black text-[var(--heading)]">Verified cash sources</h3></div>
          <div className="mt-4 space-y-3">
            {[...cashSources.entries()].sort((a,b) => b[1]-a[1]).map(([source, total]) => <div key={source} className="flex items-center justify-between rounded-xl border border-[var(--line)] bg-[var(--fill-2)] px-4 py-3"><span className="font-black capitalize text-[var(--heading)]">{cashSourceLabel(source)}</span><span className="font-black text-emerald-700">{money(total)}</span></div>)}
            {!cashSources.size && <p className="rounded-xl border border-dashed border-[var(--line-strong)] p-4 text-sm text-[var(--muted)]">No money-received record has entered the mission window yet.</p>}
          </div>
        </section>

        <section className="rounded-2xl border border-[var(--line)] bg-white p-5 shadow-[0_12px_32px_rgba(10,18,32,0.04)] sm:p-6">
          <div className="flex flex-wrap items-end justify-between gap-3"><div><p className="text-xs font-black uppercase tracking-[0.18em] text-[var(--blue)]">Offer mix</p><h3 className="mt-1 text-2xl font-black text-[var(--heading)]">Sell systems, use the site as the wedge</h3></div><CalendarDays className="h-6 w-6 text-[var(--blue)]" /></div>
          <div className="mt-5 overflow-x-auto"><table className="w-full min-w-[640px] text-left text-sm"><thead className="bg-[var(--fill-2)] text-xs uppercase tracking-wide text-[var(--muted)]"><tr><th className="px-4 py-3">Offer</th><th className="px-4 py-3">Setup</th><th className="px-4 py-3">Working closes</th><th className="px-4 py-3">Setup revenue</th></tr></thead><tbody className="divide-y divide-[var(--line)]">{offerMix.map((item) => <tr key={item.name}><td className="px-4 py-3 font-black text-[var(--heading)]">{item.name}</td><td className="px-4 py-3">{money(item.setup)}</td><td className="px-4 py-3">{item.closes}</td><td className="px-4 py-3 font-black">{money(item.setup * item.closes)}</td></tr>)}</tbody><tfoot><tr className="border-t-2 border-[var(--line-strong)]"><td className="px-4 py-3 font-black" colSpan={3}>Working mix total</td><td className="px-4 py-3 text-lg font-black text-[var(--blue)]">{money(offerMix.reduce((sum, item) => sum + item.setup * item.closes, 0))}</td></tr></tfoot></table></div>
          <p className="mt-4 text-sm leading-6 text-[var(--muted)]">A free homepage concept earns attention. Systems setup, ongoing plans, custom integrations, archives, e-commerce, and full operating systems remain paid scope.</p>
        </section>
      </div>

      {episodes.length > 0 && <section className="rounded-2xl border border-[var(--line)] bg-white p-5 shadow-[0_12px_32px_rgba(10,18,32,0.04)] sm:p-6"><p className="text-xs font-black uppercase tracking-[0.18em] text-[var(--blue)]">Episode Engine</p><h3 className="mt-1 text-2xl font-black text-[var(--heading)]">The business becomes the content</h3><div className="mt-5 grid gap-4 lg:grid-cols-3">{episodes.map((episode) => <article key={episode.episode_date} className="rounded-xl border border-[var(--line)] bg-[var(--fill-2)] p-4"><p className="text-xs font-black uppercase tracking-wide text-[var(--muted)]">Day {episode.day_number} · {episode.episode_date}</p><p className="mt-3 whitespace-pre-wrap text-sm leading-6 text-[var(--text)]">{episode.content_draft}</p><p className="mt-3 text-xs font-black uppercase text-[var(--blue)]">{episode.status}</p></article>)}</div></section>}
    </div>
  );
}
