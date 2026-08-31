import Link from "next/link";
import {
  Activity,
  ArrowRight,
  Bot,
  BrainCircuit,
  CheckCircle2,
  CircleAlert,
  DollarSign,
  Eye,
  Gauge,
  LockKeyhole,
  MessageSquareText,
  Radio,
  Rocket,
  ShieldCheck,
  Sparkles,
  Target,
  Workflow,
} from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import { OPERATOR_WORKER_BLUEPRINTS, operatorExecutionEnabled } from "@/lib/operatoros/catalog.ts";
import LiveOperatorRefresh from "./LiveOperatorRefresh";
import OperatorControls from "./OperatorControls";
import TeachJobForm from "./TeachJobForm";

export const metadata = { title: "OperatorOS Mission Control | The LeadFlow Pro" };
export const dynamic = "force-dynamic";

type Worker = {
  id: string;
  slug: string;
  name: string;
  role_title: string;
  provider: string;
  model: string | null;
  status: "waiting" | "working" | "blocked" | "offline";
  status_detail: string | null;
  capabilities: string[] | null;
  last_heartbeat_at: string | null;
};

type Skill = {
  id: string;
  name: string;
  description: string | null;
  provider: string;
  risk_level: string;
  enabled: boolean;
};

type Run = {
  id: string;
  skill_id: string;
  worker_id: string | null;
  status: string;
  output_json: Record<string, unknown> | null;
  error_text: string | null;
  created_at: string;
};

type RunEvent = {
  id: string;
  run_id: string;
  event_type: string;
  title: string;
  detail: string | null;
  created_at: string;
};

type Approval = {
  id: string;
  run_id: string;
  title: string;
  summary: string;
  risk_level: string;
  status: string;
  created_at: string;
};

function centralDay(value: Date | string = new Date()) {
  return new Date(value).toLocaleDateString("en-CA", { timeZone: "America/Chicago" });
}

function shortTime(value: string) {
  return new Intl.DateTimeFormat("en-US", {
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
    timeZone: "America/Chicago",
  }).format(new Date(value));
}

function money(cents: number) {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    maximumFractionDigits: 0,
  }).format(cents / 100);
}

function workerTone(status: Worker["status"]) {
  if (status === "working") return "border-emerald-400/40 bg-emerald-400/10 text-emerald-200";
  if (status === "blocked") return "border-red-400/40 bg-red-400/10 text-red-200";
  if (status === "offline") return "border-slate-400/30 bg-slate-400/10 text-slate-300";
  return "border-cyan-400/30 bg-cyan-400/10 text-cyan-100";
}

function eventTone(type: string) {
  if (type === "completed") return "bg-emerald-100 text-emerald-700";
  if (type === "failed" || type === "blocked") return "bg-red-100 text-red-700";
  if (type === "approval_required") return "bg-amber-100 text-amber-700";
  if (type === "model_response") return "bg-violet-100 text-violet-700";
  return "bg-[var(--accent-tint)] text-[var(--blue)]";
}

function outputSummary(output: Record<string, unknown> | null) {
  return output && typeof output.summary === "string" ? output.summary : null;
}

export default async function OperatorMissionControl() {
  const supabase = await createClient();
  const { data: workspace, error: workspaceError } = await supabase
    .from("operator_workspaces")
    .select("id, name, business_goal")
    .eq("slug", "the-leadflow-pro")
    .single();

  if (workspaceError || !workspace) {
    throw new Error("OperatorOS is not initialized. Apply the OperatorOS v1 database migration first.");
  }

  const since30d = new Date(Date.now() - 30 * 86400_000).toISOString();
  const since7d = new Date(Date.now() - 7 * 86400_000).toISOString();
  const since24h = new Date(Date.now() - 86400_000).toISOString();
  const today = centralDay();

  const [
    missionResult,
    skillResult,
    workerResult,
    runResult,
    eventResult,
    approvalResult,
    leadResult,
    taskResult,
    purchaseResult,
    projectResult,
    socialResult,
  ] = await Promise.all([
    supabase
      .from("operator_missions")
      .select("id, name, description, status, target_value, unit")
      .eq("workspace_id", workspace.id)
      .eq("status", "active")
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle(),
    supabase
      .from("operator_skills")
      .select("id, name, description, provider, risk_level, enabled")
      .eq("workspace_id", workspace.id)
      .order("created_at"),
    supabase
      .from("operator_workers")
      .select("id, slug, name, role_title, provider, model, status, status_detail, capabilities, last_heartbeat_at")
      .eq("workspace_id", workspace.id),
    supabase
      .from("operator_runs")
      .select("id, skill_id, worker_id, status, output_json, error_text, created_at")
      .eq("workspace_id", workspace.id)
      .order("created_at", { ascending: false })
      .limit(30),
    supabase
      .from("operator_run_events")
      .select("id, run_id, event_type, title, detail, created_at")
      .eq("workspace_id", workspace.id)
      .order("created_at", { ascending: false })
      .limit(40),
    supabase
      .from("operator_approvals")
      .select("id, run_id, title, summary, risk_level, status, created_at")
      .eq("workspace_id", workspace.id)
      .order("created_at", { ascending: false })
      .limit(50),
    supabase
      .from("leads")
      .select("id, status, expected_value_cents, created_at")
      .is("deleted_at", null)
      .eq("is_test", false)
      .limit(500),
    supabase
      .from("lead_tasks")
      .select("id, due_date, completed_at")
      .is("completed_at", null)
      .limit(500),
    supabase
      .from("purchases")
      .select("amount_cents, status, created_at")
      .gte("created_at", since30d)
      .limit(1000),
    supabase
      .from("projects")
      .select("id, status, milestones(id,status)")
      .limit(200),
    supabase
      .from("social_posts")
      .select("status, published_at, created_at")
      .gte("created_at", since7d)
      .limit(1000),
  ]);

  const firstError = [
    missionResult,
    skillResult,
    workerResult,
    runResult,
    eventResult,
    approvalResult,
    leadResult,
    taskResult,
    purchaseResult,
    projectResult,
    socialResult,
  ]
    .map((result) => result.error)
    .find(Boolean);
  if (firstError) throw new Error(`OperatorOS Mission Control is temporarily unavailable: ${firstError.message}`);

  const skills = (skillResult.data ?? []) as Skill[];
  const workers = (workerResult.data ?? []) as Worker[];
  const runs = (runResult.data ?? []) as Run[];
  const events = (eventResult.data ?? []) as RunEvent[];
  const approvals = (approvalResult.data ?? []) as Approval[];
  const pendingApprovals = approvals.filter((approval) => approval.status === "pending");
  const leads = (leadResult.data ?? []) as Array<{
    id: string;
    status: string;
    expected_value_cents: number | null;
    created_at: string;
  }>;
  const tasks = (taskResult.data ?? []) as Array<{ id: string; due_date: string | null }>;
  const purchases = (purchaseResult.data ?? []) as Array<{
    amount_cents: number | null;
    status: string | null;
  }>;
  const projects = (projectResult.data ?? []) as Array<{
    id: string;
    status: string;
    milestones: Array<{ id: string; status: string }> | null;
  }>;
  const socialPosts = (socialResult.data ?? []) as Array<{
    status: string;
    published_at: string | null;
  }>;

  const closed = new Set(["won", "lost"]);
  const activeLeads = leads.filter((lead) => !closed.has(lead.status));
  const newLeads = leads.filter((lead) => lead.status === "new").length;
  const overdueTasks = tasks.filter((task) => task.due_date && task.due_date <= today).length;
  const openPipeline = activeLeads.reduce(
    (sum, lead) => sum + Math.max(0, Number(lead.expected_value_cents || 0)),
    0,
  );
  const paid30d = purchases
    .filter((purchase) => ["paid", "complete", "completed", "succeeded"].includes((purchase.status || "").toLowerCase()))
    .reduce((sum, purchase) => sum + Math.max(0, Number(purchase.amount_cents || 0)), 0);
  const activeProjects = projects.filter((project) => !["live", "support", "paused"].includes(project.status));
  const allMilestones = projects.flatMap((project) => project.milestones ?? []);
  const proofShippedToday = socialPosts.filter(
    (post) => post.published_at && centralDay(post.published_at) === today,
  ).length;
  const completedRuns24h = runs.filter(
    (run) => run.status === "completed" && run.created_at >= since24h,
  ).length;

  const checks = [
    { label: "New leads worked", pass: newLeads === 0, detail: `${newLeads} still new` },
    { label: "Overdue follow-up cleared", pass: overdueTasks === 0, detail: `${overdueTasks} overdue` },
    {
      label: "Open opportunities valued",
      pass: activeLeads.length === 0 || activeLeads.every((lead) => Number(lead.expected_value_cents || 0) > 0),
      detail: `${activeLeads.filter((lead) => Number(lead.expected_value_cents || 0) <= 0).length} missing value`,
    },
    { label: "Human stopline clear", pass: pendingApprovals.length === 0, detail: `${pendingApprovals.length} waiting` },
    { label: "Proof shipped today", pass: proofShippedToday > 0, detail: `${proofShippedToday} published` },
  ];
  const flowScore = checks.filter((check) => check.pass).length * 20;

  const workerBySlug = new Map(workers.map((worker) => [worker.slug, worker]));
  const orderedWorkers = [
    ...OPERATOR_WORKER_BLUEPRINTS.map((blueprint) => workerBySlug.get(blueprint.slug)).filter(Boolean),
    ...workers.filter((worker) => !OPERATOR_WORKER_BLUEPRINTS.some((blueprint) => blueprint.slug === worker.slug)),
  ] as Worker[];
  const skillById = new Map(skills.map((skill) => [skill.id, skill]));
  const workerById = new Map(workers.map((worker) => [worker.id, worker]));
  const executionEnabled = operatorExecutionEnabled(process.env.OPERATOROS_EXECUTION_ENABLED);
  const providerReady = {
    openai: Boolean(process.env.OPENAI_API_KEY),
    anthropic: Boolean(process.env.ANTHROPIC_API_KEY),
  };

  const metrics = [
    { label: "Flow score", value: `${flowScore}/100`, note: `${checks.filter((check) => check.pass).length} of 5 controls clear`, icon: Gauge },
    { label: "Active pipeline", value: money(openPipeline), note: `${activeLeads.length} open opportunities`, icon: Target },
    { label: "Recorded paid 30d", value: money(paid30d), note: "Posted purchase records", icon: DollarSign },
    { label: "AI runs completed", value: String(completedRuns24h), note: "Last 24 hours", icon: BrainCircuit },
    { label: "Active builds", value: String(activeProjects.length), note: `${allMilestones.filter((milestone) => milestone.status === "done").length}/${allMilestones.length} milestones done`, icon: Rocket },
    { label: "Human approvals", value: String(pendingApprovals.length), note: pendingApprovals.length ? "Stopline engaged" : "Stopline clear", icon: ShieldCheck },
  ];

  return (
    <div className="space-y-8">
      <section className="overflow-hidden rounded-[28px] border border-[#ffffff1f] bg-[#07111f] text-white shadow-[0_30px_90px_rgba(7,17,31,0.28)]">
        <div className="relative px-5 py-7 sm:px-8 sm:py-9">
          <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_20%_0%,rgba(18,64,232,0.34),transparent_36%),radial-gradient(circle_at_82%_16%,rgba(53,198,244,0.18),transparent_30%)]" />
          <div className="relative flex flex-col justify-between gap-6 lg:flex-row lg:items-start">
            <div>
              <div className="flex flex-wrap items-center gap-3">
                <p className="text-xs font-black uppercase tracking-[0.24em] text-[#50d4ff]">The LeadFlow Pro</p>
                <LiveOperatorRefresh />
              </div>
              <h2 className="mt-3 text-4xl font-black tracking-tight sm:text-5xl">OperatorOS Mission Control</h2>
              <p className="mt-3 max-w-3xl text-sm leading-6 text-[#b8c5d9] sm:text-base">
                Watch attention become leads, leads become decisions, decisions become delivery, and completed work become proof. Every number below comes from a stored business record.
              </p>
            </div>
            <div className="grid min-w-[280px] grid-cols-2 gap-3">
              <div className="rounded-2xl border border-[#ffffff1f] bg-[#101d31]/90 p-4">
                <p className="text-[11px] font-black uppercase tracking-wide text-[#8fa2bd]">Current mission</p>
                <p className="mt-1 text-sm font-black">{missionResult.data?.name || "No active mission"}</p>
              </div>
              <div className="rounded-2xl border border-[#ffffff1f] bg-[#101d31]/90 p-4">
                <p className="text-[11px] font-black uppercase tracking-wide text-[#8fa2bd]">Execution</p>
                <p className={`mt-1 text-sm font-black ${executionEnabled ? "text-emerald-300" : "text-amber-300"}`}>
                  {executionEnabled ? "Enabled" : "Safe pause"}
                </p>
              </div>
            </div>
          </div>

          <div className="relative mt-7 grid gap-3 sm:grid-cols-2 xl:grid-cols-6">
            {metrics.map(({ label, value, note, icon: Icon }) => (
              <article key={label} className="rounded-2xl border border-[#ffffff1f] bg-[#101d31]/90 p-4">
                <div className="flex items-center justify-between gap-2">
                  <p className="text-[11px] font-black uppercase tracking-wide text-[#8fa2bd]">{label}</p>
                  <Icon className="h-4 w-4 text-[#50d4ff]" aria-hidden="true" />
                </div>
                <p className="mt-2 text-2xl font-black tabular-nums">{value}</p>
                <p className="mt-1 text-[11px] text-[#aebcd0]">{note}</p>
              </article>
            ))}
          </div>

          <div className="relative mt-6 rounded-2xl border border-[#ffffff1f] bg-[#101d31]/90 p-5">
            <div className="flex flex-wrap items-end justify-between gap-3">
              <div>
                <p className="text-[11px] font-black uppercase tracking-wide text-[#8fa2bd]">Daily operating controls</p>
                <p className="mt-1 text-sm text-[#b8c5d9]">The score is transparent. Each cleared condition is worth 20 points.</p>
              </div>
              <span className="text-3xl font-black text-[#50d4ff]">{flowScore}%</span>
            </div>
            <div className="mt-4 grid gap-2 md:grid-cols-5">
              {checks.map((check) => (
                <div key={check.label} className={`rounded-xl border p-3 ${check.pass ? "border-emerald-400/30 bg-emerald-400/10" : "border-amber-400/30 bg-amber-400/10"}`}>
                  <div className="flex items-center gap-2">
                    {check.pass ? <CheckCircle2 className="h-4 w-4 text-emerald-300" /> : <CircleAlert className="h-4 w-4 text-amber-300" />}
                    <p className="text-xs font-black">{check.label}</p>
                  </div>
                  <p className="mt-1 text-[11px] text-[#b8c5d9]">{check.detail}</p>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      <section>
        <div className="flex flex-wrap items-end justify-between gap-3">
          <div>
            <p className="text-xs font-black uppercase tracking-[0.2em] text-[var(--blue)]">Live company map</p>
            <h3 className="mt-1 text-2xl font-black text-[var(--heading)]">The workers and the handoffs</h3>
          </div>
          <p className="text-sm text-[var(--muted)]">Working, waiting, blocked, or offline. No decorative activity.</p>
        </div>
        <div className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5">
          {orderedWorkers.map((worker, index) => (
            <article key={worker.id} className="relative overflow-hidden rounded-2xl border border-[#ffffff1f] bg-[#0a1424] p-4 text-white shadow-[0_18px_45px_rgba(10,20,36,0.14)]">
              {index < orderedWorkers.length - 1 && (
                <ArrowRight className="absolute right-2 top-2 h-4 w-4 text-[#355271] opacity-50" aria-hidden="true" />
              )}
              <div className="flex items-center justify-between gap-3">
                <span className="inline-flex h-10 w-10 items-center justify-center rounded-xl bg-[#132642] text-[#50d4ff]">
                  <Bot className={`h-5 w-5 ${worker.status === "working" ? "animate-pulse" : ""}`} aria-hidden="true" />
                </span>
                <span className={`rounded-full border px-2.5 py-1 text-[10px] font-black uppercase tracking-wide ${workerTone(worker.status)}`}>
                  {worker.status}
                </span>
              </div>
              <p className="mt-4 text-lg font-black">{worker.name}</p>
              <p className="text-xs font-bold text-[#50d4ff]">{worker.role_title}</p>
              <p className="mt-3 line-clamp-3 min-h-[54px] text-xs leading-5 text-[#aebcd0]">
                {worker.status_detail || "Ready for a controlled mission."}
              </p>
              <div className="mt-4 flex items-center justify-between border-t border-[#ffffff14] pt-3 text-[10px] font-bold uppercase tracking-wide text-[#7f91aa]">
                <span>{worker.provider === "openai" ? "ChatGPT" : worker.provider === "anthropic" ? "Claude" : "Human"}</span>
                <span>{worker.model || "manual"}</span>
              </div>
            </article>
          ))}
        </div>
      </section>

      <div className="grid gap-6 xl:grid-cols-[minmax(0,1.25fr)_minmax(360px,0.75fr)]">
        <OperatorControls
          skills={skills}
          approvals={pendingApprovals.map(({ id, title, summary, risk_level }) => ({ id, title, summary, risk_level }))}
        />

        <aside className="space-y-6">
          <section className="rounded-2xl border border-[var(--line)] bg-white p-5 shadow-[0_12px_32px_rgba(10,18,32,0.05)]">
            <div className="flex items-center gap-2">
              <Radio className="h-5 w-5 text-[var(--blue)]" aria-hidden="true" />
              <h3 className="font-black text-[var(--heading)]">Provider readiness</h3>
            </div>
            <div className="mt-4 space-y-3">
              {[
                { label: "ChatGPT", ready: providerReady.openai, detail: process.env.OPENAI_OPERATOR_MODEL || "gpt-5.6-terra" },
                { label: "Claude", ready: providerReady.anthropic, detail: process.env.ANTHROPIC_OPERATOR_MODEL || "claude-sonnet-5" },
                { label: "Execution switch", ready: executionEnabled, detail: executionEnabled ? "Active" : "Paused by default" },
              ].map((item) => (
                <div key={item.label} className="flex items-center justify-between gap-3 rounded-xl border border-[var(--line)] p-3">
                  <div>
                    <p className="text-sm font-black text-[var(--heading)]">{item.label}</p>
                    <p className="text-xs text-[var(--muted)]">{item.detail}</p>
                  </div>
                  <span className={`rounded-full px-2.5 py-1 text-[10px] font-black uppercase tracking-wide ${item.ready ? "bg-emerald-100 text-emerald-700" : "bg-amber-100 text-amber-700"}`}>
                    {item.ready ? "Ready" : "Not active"}
                  </span>
                </div>
              ))}
            </div>
          </section>

          <section className="rounded-2xl border border-[var(--line)] bg-white p-5 shadow-[0_12px_32px_rgba(10,18,32,0.05)]">
            <div className="flex items-center gap-2">
              <LockKeyhole className="h-5 w-5 text-[var(--blue)]" aria-hidden="true" />
              <h3 className="font-black text-[var(--heading)]">Blast radius</h3>
            </div>
            <ul className="mt-4 space-y-3 text-sm text-[var(--muted)]">
              {[
                "No automatic public publishing",
                "No automatic outbound messages",
                "No automatic spending or refunds",
                "No automatic pricing changes",
                "No automatic production deployment",
              ].map((item) => (
                <li key={item} className="flex gap-2">
                  <ShieldCheck className="mt-0.5 h-4 w-4 shrink-0 text-emerald-600" aria-hidden="true" />
                  {item}
                </li>
              ))}
            </ul>
          </section>
        </aside>
      </div>

      <TeachJobForm />

      <div className="grid gap-6 xl:grid-cols-[minmax(0,1fr)_380px]">
        <section className="overflow-hidden rounded-2xl border border-[var(--line)] bg-white shadow-[0_12px_32px_rgba(10,18,32,0.05)]">
          <div className="flex items-center justify-between border-b border-[var(--line)] px-5 py-4">
            <div>
              <div className="flex items-center gap-2">
                <Workflow className="h-5 w-5 text-[var(--blue)]" aria-hidden="true" />
                <h3 className="font-black text-[var(--heading)]">Recent missions</h3>
              </div>
              <p className="mt-1 text-xs text-[var(--muted)]">Every provider run, outcome, failure, and stopline.</p>
            </div>
          </div>
          {runs.length ? (
            <div className="divide-y divide-[var(--line)]">
              {runs.slice(0, 12).map((run) => {
                const skill = skillById.get(run.skill_id);
                const worker = run.worker_id ? workerById.get(run.worker_id) : null;
                return (
                  <article key={run.id} className="px-5 py-4">
                    <div className="flex flex-wrap items-start justify-between gap-3">
                      <div className="min-w-0 flex-1">
                        <div className="flex flex-wrap items-center gap-2">
                          <p className="font-black text-[var(--heading)]">{skill?.name || "OperatorOS run"}</p>
                          <span className={`rounded-full px-2 py-0.5 text-[10px] font-black uppercase tracking-wide ${run.status === "completed" ? "bg-emerald-100 text-emerald-700" : run.status === "failed" || run.status === "blocked" ? "bg-red-100 text-red-700" : run.status === "waiting_approval" ? "bg-amber-100 text-amber-700" : "bg-[var(--accent-tint)] text-[var(--blue)]"}`}>
                            {run.status.replace(/_/g, " ")}
                          </span>
                        </div>
                        <p className="mt-1 text-xs font-bold text-[var(--muted)]">
                          {worker?.name || "Unassigned worker"} · {shortTime(run.created_at)}
                        </p>
                        {(outputSummary(run.output_json) || run.error_text) && (
                          <p className="mt-2 line-clamp-3 text-sm leading-6 text-[var(--text)]">
                            {outputSummary(run.output_json) || run.error_text}
                          </p>
                        )}
                      </div>
                      {run.status === "queued" && (
                        <form action={`/api/admin/operator/runs/${run.id}/execute`} method="post">
                          <button className="inline-flex min-h-[40px] items-center gap-2 rounded-lg border border-[var(--line-strong)] px-3 text-xs font-black text-[var(--blue)]">
                            <Sparkles className="h-3.5 w-3.5" aria-hidden="true" /> Run
                          </button>
                        </form>
                      )}
                    </div>
                  </article>
                );
              })}
            </div>
          ) : (
            <div className="px-6 py-16 text-center">
              <BrainCircuit className="mx-auto h-8 w-8 text-[var(--blue)]" aria-hidden="true" />
              <p className="mt-3 font-black text-[var(--heading)]">No AI mission has been run yet</p>
              <p className="mt-1 text-sm text-[var(--muted)]">The first run will create the first real event trail.</p>
            </div>
          )}
        </section>

        <aside className="rounded-2xl border border-[var(--line)] bg-white p-5 shadow-[0_12px_32px_rgba(10,18,32,0.05)]">
          <div className="flex items-center gap-2">
            <Activity className="h-5 w-5 text-[var(--blue)]" aria-hidden="true" />
            <h3 className="font-black text-[var(--heading)]">Live event trail</h3>
          </div>
          {events.length ? (
            <ol className="mt-5 space-y-4">
              {events.slice(0, 16).map((event) => (
                <li key={event.id} className="flex gap-3">
                  <span className={`mt-0.5 inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-lg ${eventTone(event.event_type)}`}>
                    {event.event_type === "approval_required" ? <LockKeyhole className="h-4 w-4" /> : event.event_type === "completed" ? <CheckCircle2 className="h-4 w-4" /> : event.event_type === "failed" || event.event_type === "blocked" ? <CircleAlert className="h-4 w-4" /> : <MessageSquareText className="h-4 w-4" />}
                  </span>
                  <div className="min-w-0">
                    <p className="text-sm font-black text-[var(--heading)]">{event.title}</p>
                    {event.detail && <p className="mt-0.5 line-clamp-3 text-xs leading-5 text-[var(--muted)]">{event.detail}</p>}
                    <p className="mt-1 text-[10px] font-bold uppercase tracking-wide text-[var(--quiet)]">{shortTime(event.created_at)}</p>
                  </div>
                </li>
              ))}
            </ol>
          ) : (
            <p className="mt-4 text-sm text-[var(--muted)]">Events appear here when a real mission is queued.</p>
          )}
        </aside>
      </div>

      <section className="rounded-2xl border border-[var(--line)] bg-[var(--fill-2)] p-5">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div className="flex items-start gap-3">
            <Eye className="mt-0.5 h-5 w-5 text-[var(--blue)]" aria-hidden="true" />
            <div>
              <h3 className="font-black text-[var(--heading)]">This is the private operating floor</h3>
              <p className="mt-1 max-w-3xl text-sm leading-6 text-[var(--muted)]">
                The public product page explains what customers buy. This private page shows the real system, records, workers, approvals, and outcomes inside The LeadFlow Pro.
              </p>
            </div>
          </div>
          <Link href="/operatoros" target="_blank" className="inline-flex items-center gap-2 text-sm font-black text-[var(--blue)] hover:underline">
            Open the sales page <ArrowRight className="h-4 w-4" aria-hidden="true" />
          </Link>
        </div>
      </section>
    </div>
  );
}
