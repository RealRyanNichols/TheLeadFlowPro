import Link from "next/link";
import { ArrowRight } from "lucide-react";
import ExecutionDashboard, {
  type CurrentExecutionState,
  type MissionWindow,
} from "@/components/mission-control/ExecutionDashboard";
import { createServiceClient } from "@/lib/supabase/service";
import { LEADFLOW_GROWTH_LOOP, centralDate } from "@/lib/operatoros/growth";

export const metadata = {
  title: "The Proof Floor | The LeadFlow Pro",
  description: "A sanitized live scoreboard showing what The LeadFlow Pro is actually moving: attention, leads, follow-up, verified cash, builds, and AI work.",
  alternates: { canonical: "https://www.theleadflowpro.com/proof-floor" },
  openGraph: {
    title: "The Proof Floor | The LeadFlow Pro",
    description: "Live, sanitized operating proof from The LeadFlow Pro.",
    url: "https://www.theleadflowpro.com/proof-floor",
    type: "website",
  },
};
export const dynamic = "force-dynamic";

const WINDOWS = [
  { key: "today", label: "Today", days: 1 },
  { key: "7d", label: "7D", days: 7 },
  { key: "14d", label: "14D", days: 14 },
  { key: "30d", label: "30D", days: 30 },
  { key: "60d", label: "60D", days: 60 },
  { key: "90d", label: "90D", days: 90 },
  { key: "4m", label: "4M", days: 120 },
  { key: "6m", label: "6M", days: 180 },
  { key: "12m", label: "12M", days: 365 },
] as const;

function within(value: string | null, since: number, todayOnly = false) {
  if (!value) return false;
  if (todayOnly) return centralDate(value) === centralDate();
  return new Date(value).getTime() >= since;
}

function ProofFloorUnavailable() {
  return (
    <main className="min-h-screen bg-[#07111f] px-4 py-16 text-white">
      <section className="mx-auto max-w-4xl rounded-[30px] border border-amber-300/25 bg-[#0d1a2d] p-7 shadow-[0_30px_120px_rgba(0,0,0,.32)] sm:p-10">
        <p className="text-xs font-black uppercase tracking-[0.22em] text-amber-200">Data connection unavailable</p>
        <h1 className="mt-3 text-4xl font-black tracking-tight sm:text-5xl">Mission Control is not showing unverified numbers.</h1>
        <p className="mt-4 max-w-3xl text-base leading-7 text-[#b8c5d9]">
          The connected production records could not be read in this environment. The dashboard stays blank instead of substituting sample metrics or treating missing data as zero.
        </p>
        <div className="mt-6 flex flex-wrap gap-3">
          <Link href="/" className="rounded-xl bg-[#1240e8] px-5 py-3 text-sm font-black text-white">Return home</Link>
          <Link href="/login?next=/admin/operator" className="rounded-xl border border-white/20 px-5 py-3 text-sm font-black text-white">Open private login</Link>
        </div>
      </section>
    </main>
  );
}

export default async function ProofFloor() {
  let supabase: ReturnType<typeof createServiceClient>;
  try {
    supabase = createServiceClient();
  } catch {
    return <ProofFloorUnavailable />;
  }
  const since365 = new Date(Date.now() - 365 * 86400_000).toISOString();
  const { data: workspace, error: workspaceError } = await supabase
    .from("operator_workspaces")
    .select("id")
    .eq("slug", "the-leadflow-pro")
    .single();
  if (workspaceError || !workspace) return <ProofFloorUnavailable />;

  const [analyticsResult, leadResult, taskResult, cashResult, runResult, socialResult, projectResult, approvalResult, outreachResult, workerResult] = await Promise.all([
    supabase.from("analytics_events").select("event_name,visitor_id,created_at").eq("is_internal", false).gte("created_at", since365).order("created_at", { ascending: false }).limit(20000),
    supabase.from("leads").select("status,created_at").is("deleted_at", null).eq("is_test", false).gte("created_at", since365).limit(10000),
    supabase.from("lead_tasks").select("completed_at,created_at,due_date").limit(10000),
    supabase.from("operator_verified_cash_entries").select("amount_cents,received_at").eq("workspace_id", workspace.id).gte("received_at", since365).limit(10000),
    supabase.from("operator_runs").select("status,created_at,completed_at").eq("workspace_id", workspace.id).gte("created_at", since365).limit(10000),
    supabase.from("social_posts").select("status,published_at,created_at").gte("created_at", since365).limit(10000),
    supabase.from("projects").select("status,milestones(status)").limit(1000),
    supabase.from("operator_approvals").select("status,created_at,decided_at").eq("workspace_id", workspace.id).limit(10000),
    supabase.from("operator_outreach_actions").select("status,sent_at,created_at,due_at").eq("workspace_id", workspace.id).limit(10000),
    supabase.from("operator_workers").select("status").eq("workspace_id", workspace.id).limit(1000),
  ]);

  const results = [analyticsResult, leadResult, taskResult, cashResult, runResult, socialResult, projectResult, approvalResult, outreachResult, workerResult];
  const firstError = results.map((result) => result.error).find(Boolean);
  if (firstError) return <ProofFloorUnavailable />;

  const analytics = analyticsResult.data ?? [];
  const leads = leadResult.data ?? [];
  const tasks = taskResult.data ?? [];
  const cashEntries = cashResult.data ?? [];
  const runs = runResult.data ?? [];
  const posts = socialResult.data ?? [];
  const projects = projectResult.data ?? [];
  const approvals = approvalResult.data ?? [];
  const outreach = outreachResult.data ?? [];
  const workers = workerResult.data ?? [];
  const activeBuilds = projects.filter((project) => !["live", "support", "paused"].includes(project.status)).length;
  const milestones = projects.flatMap((project) => project.milestones ?? []);
  const milestonesDone = milestones.filter((milestone) => milestone.status === "done").length;

  const rows: MissionWindow[] = WINDOWS.map((window) => {
    const since = Date.now() - window.days * 86400_000;
    const todayOnly = window.days === 1;
    const pageViews = analytics.filter((event) => event.event_name === "page_view" && within(event.created_at, since, todayOnly));
    const visitors = new Set(pageViews.map((event) => event.visitor_id).filter(Boolean)).size;
    const windowLeads = leads.filter((lead) => within(lead.created_at, since, todayOnly));
    const followups = tasks.filter((task) => within(task.completed_at, since, todayOnly)).length;
    const cash = cashEntries
      .filter((entry) => within(entry.received_at, since, todayOnly))
      .reduce((sum, entry) => sum + Math.max(0, Number(entry.amount_cents || 0)) / 100, 0);
    const completedRuns = runs.filter((run) => run.status === "completed" && within(run.completed_at || run.created_at, since, todayOnly)).length;
    const publishedPosts = posts.filter((post) => post.status === "published" && within(post.published_at || post.created_at, since, todayOnly)).length;
    const sentOutreach = outreach.filter((action) => action.status === "sent" && within(action.sent_at || action.created_at, since, todayOnly)).length;
    const pendingApprovals = approvals.filter((approval) => approval.status === "pending" && within(approval.created_at, since, todayOnly)).length;
    const blockedRuns = runs.filter((run) => run.status === "blocked" && within(run.completed_at || run.created_at, since, todayOnly)).length;
    const failedRuns = runs.filter((run) => run.status === "failed" && within(run.completed_at || run.created_at, since, todayOnly)).length;
    return {
      key: window.key,
      label: window.label,
      metrics: {
        visitors,
        pageViews: pageViews.length,
        leads: windowLeads.length,
        followups,
        verifiedCash: cash,
        completedRuns,
        publishedPosts,
        sentOutreach,
        pendingApprovals,
        blockedRuns,
        failedRuns,
      },
    };
  });

  const openOpportunities = leads.filter((lead) => !["won", "lost"].includes(lead.status)).length;
  const openTasks = tasks.filter((task) => !task.completed_at);
  const current: CurrentExecutionState = {
    pendingApprovals: approvals.filter((approval) => approval.status === "pending").length,
    openTasks: openTasks.length,
    dueTasks: openTasks.filter((task) => task.due_date && task.due_date <= centralDate()).length,
    queuedOutreach: outreach.filter((action) => ["queued", "approved"].includes(action.status)).length,
    activeBuilds,
    openOpportunities,
    blockedWorkers: workers.filter((worker) => worker.status === "blocked").length,
  };

  return (
    <main className="min-h-screen bg-[#07111f] text-white">
      <section className="mx-auto max-w-7xl px-4 pb-12 pt-12 sm:pt-16">
        <div className="rounded-[32px] border border-white/10 bg-[#0d1a2d] p-6 shadow-[0_30px_120px_rgba(0,0,0,.32)] sm:p-10">
          <p className="text-xs font-black uppercase tracking-[0.24em] text-[#50d4ff]">Live sanitized operating proof</p>
          <div className="mt-3 flex flex-col justify-between gap-6 lg:flex-row lg:items-end">
            <div>
              <h1 className="text-4xl font-black tracking-tight sm:text-6xl">The LeadFlow Pro is running.</h1>
              <p className="mt-4 max-w-3xl text-base leading-7 text-[#b8c5d9]">This is not a client list and it does not expose private records. It is the aggregate scoreboard: what moved, what shipped, and what the operating system verified.</p>
            </div>
            <div className="rounded-2xl border border-emerald-400/30 bg-emerald-400/10 px-5 py-4">
              <p className="text-xs font-black uppercase tracking-[0.18em] text-emerald-200">System status</p>
              <p className="mt-1 text-xl font-black text-white">LIVE DATA</p>
              <p className="mt-1 text-xs text-emerald-100/80">Updated when this page loads</p>
            </div>
          </div>

          <div className="mt-8 flex flex-wrap items-center gap-2 text-xs font-black tracking-wide text-[#9fb0c8]">
            {LEADFLOW_GROWTH_LOOP.map((stage, index) => (
              <span key={`${stage}-${index}`} className="flex items-center gap-2">
                <span className="rounded-full border border-white/10 bg-[#12223a] px-3 py-2 text-white">{stage}</span>
                {index < LEADFLOW_GROWTH_LOOP.length - 1 && <ArrowRight className="h-3.5 w-3.5 text-[#50d4ff]" />}
              </span>
            ))}
          </div>
        </div>

        <ExecutionDashboard windows={rows} current={current} />

        <div className="mt-6 grid gap-6 lg:grid-cols-2">
          <section className="rounded-[28px] border border-white/10 bg-[#0d1a2d] p-6">
            <p className="text-xs font-black uppercase tracking-[0.18em] text-[#50d4ff]">Right now</p>
            <p className="mt-2 text-4xl font-black">{openOpportunities}</p>
            <p className="mt-1 text-sm text-[#9fb0c8]">open opportunities in the operating system</p>
            <div className="mt-5 border-t border-white/10 pt-5"><p className="text-4xl font-black">{milestonesDone}/{milestones.length}</p><p className="mt-1 text-sm text-[#9fb0c8]">recorded client-build milestones completed</p></div>
          </section>
          <section className="rounded-[28px] border border-[#35c6f455] bg-[#0b2340] p-6">
            <p className="text-xs font-black uppercase tracking-[0.18em] text-[#50d4ff]">Want this inside your business?</p>
            <h2 className="mt-2 text-3xl font-black">We build the machine, then let you watch it run.</h2>
            <p className="mt-3 text-sm leading-6 text-[#b8c5d9]">Start with the website or one repetitive job. Add lead capture, CRM, follow-up, AI workers, approvals, reporting, and the client war room as the business proves what it needs.</p>
            <div className="mt-5 flex flex-wrap gap-3"><Link href="/diagnostic" className="rounded-xl bg-[#1240e8] px-5 py-3 text-sm font-black text-white">Run the Business Diagnostic</Link><Link href="/scoreboard" className="rounded-xl border border-white/20 px-5 py-3 text-sm font-black text-white">Per-business Scoreboards</Link><Link href="/operatoros" className="rounded-xl border border-white/20 px-5 py-3 text-sm font-black text-white">See OperatorOS</Link></div>
          </section>
        </div>

        <p className="mt-6 text-center text-xs leading-5 text-[#7287a5]">Aggregate operating proof only. Verified cash means paid Stripe checkout, paid Stripe invoice, or an offline payment confirmed by an admin. No private lead, client, project, message, payer, or approval details are published here.</p>
      </section>
    </main>
  );
}
