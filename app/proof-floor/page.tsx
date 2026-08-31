import Link from "next/link";
import { ArrowRight, Bot, CircleDollarSign, Eye, Rocket, Send, Target, UsersRound } from "lucide-react";
import { createServiceClient } from "@/lib/supabase/service";
import { LEADFLOW_GROWTH_LOOP, centralDate, money, number } from "@/lib/operatoros/growth";

export const metadata = {
  title: "The Proof Floor | The LeadFlow Pro",
  description: "A sanitized live scoreboard showing what The LeadFlow Pro is actually moving: attention, leads, follow-up, sales activity, builds, and AI work.",
};
export const dynamic = "force-dynamic";

const PAID = new Set(["paid", "complete", "completed", "succeeded"]);
const WINDOWS = [
  { label: "Today", days: 1 },
  { label: "7 days", days: 7 },
  { label: "14 days", days: 14 },
  { label: "30 days", days: 30 },
  { label: "2 months", days: 60 },
  { label: "3 months", days: 90 },
  { label: "6 months", days: 180 },
  { label: "9 months", days: 270 },
  { label: "12 months", days: 365 },
] as const;

function within(value: string | null, since: number, todayOnly = false) {
  if (!value) return false;
  if (todayOnly) return centralDate(value) === centralDate();
  return new Date(value).getTime() >= since;
}

export default async function ProofFloor() {
  const supabase = createServiceClient();
  const since365 = new Date(Date.now() - 365 * 86400_000).toISOString();
  const [analyticsResult, leadResult, taskResult, purchaseResult, runResult, socialResult, projectResult, approvalResult] = await Promise.all([
    supabase.from("analytics_events").select("event_name,visitor_id,created_at").eq("is_internal", false).gte("created_at", since365).order("created_at", { ascending: false }).limit(20000),
    supabase.from("leads").select("status,created_at").is("deleted_at", null).eq("is_test", false).gte("created_at", since365).limit(10000),
    supabase.from("lead_tasks").select("completed_at,created_at").gte("created_at", since365).limit(10000),
    supabase.from("purchases").select("amount_cents,status,created_at").gte("created_at", since365).limit(10000),
    supabase.from("operator_runs").select("status,created_at,finished_at").gte("created_at", since365).limit(10000),
    supabase.from("social_posts").select("status,published_at,created_at").gte("created_at", since365).limit(10000),
    supabase.from("projects").select("status,milestones(status)").limit(1000),
    supabase.from("operator_approvals").select("status").eq("status", "pending").limit(1000),
  ]);

  const results = [analyticsResult, leadResult, taskResult, purchaseResult, runResult, socialResult, projectResult, approvalResult];
  const firstError = results.map((result) => result.error).find(Boolean);
  if (firstError) throw new Error("The Proof Floor is temporarily unavailable.");

  const analytics = analyticsResult.data ?? [];
  const leads = leadResult.data ?? [];
  const tasks = taskResult.data ?? [];
  const purchases = purchaseResult.data ?? [];
  const runs = runResult.data ?? [];
  const posts = socialResult.data ?? [];
  const projects = projectResult.data ?? [];
  const approvals = approvalResult.data ?? [];
  const activeBuilds = projects.filter((project) => !["live", "support", "paused"].includes(project.status)).length;
  const milestones = projects.flatMap((project) => project.milestones ?? []);
  const milestonesDone = milestones.filter((milestone) => milestone.status === "done").length;

  const rows = WINDOWS.map((window) => {
    const since = Date.now() - window.days * 86400_000;
    const todayOnly = window.days === 1;
    const pageViews = analytics.filter((event) => event.event_name === "page_view" && within(event.created_at, since, todayOnly));
    const visitors = new Set(pageViews.map((event) => event.visitor_id).filter(Boolean)).size;
    const windowLeads = leads.filter((lead) => within(lead.created_at, since, todayOnly));
    const followups = tasks.filter((task) => within(task.completed_at, since, todayOnly)).length;
    const windowPurchases = purchases.filter((purchase) => PAID.has(String(purchase.status || "").toLowerCase()) && within(purchase.created_at, since, todayOnly));
    const cash = windowPurchases.reduce((sum, purchase) => sum + Math.max(0, Number(purchase.amount_cents || 0)) / 100, 0);
    const completedRuns = runs.filter((run) => run.status === "completed" && within(run.finished_at || run.created_at, since, todayOnly)).length;
    const shipped = posts.filter((post) => post.status === "published" && within(post.published_at || post.created_at, since, todayOnly)).length;
    return { label: window.label, visitors, pageViews: pageViews.length, leads: windowLeads.length, followups, cash, completedRuns, shipped };
  });

  const today = rows[0];
  const openOpportunities = leads.filter((lead) => !["won", "lost"].includes(lead.status)).length;
  const headlineCards = [
    { label: "Visitors today", value: today.visitors, icon: Eye },
    { label: "Page views today", value: today.pageViews, icon: Eye },
    { label: "Leads today", value: today.leads, icon: UsersRound },
    { label: "Follow-ups completed", value: today.followups, icon: Send },
    { label: "Cash recorded today", value: money(today.cash), icon: CircleDollarSign },
    { label: "AI runs completed", value: today.completedRuns, icon: Bot },
    { label: "Active builds", value: activeBuilds, icon: Rocket },
    { label: "Human approvals", value: approvals.length, icon: Target },
  ];

  return (
    <main className="min-h-screen bg-[#07111f] text-white">
      <section className="mx-auto max-w-7xl px-4 pb-12 pt-12 sm:pt-16">
        <div className="rounded-[32px] border border-white/10 bg-[#0d1a2d] p-6 shadow-[0_30px_120px_rgba(0,0,0,.32)] sm:p-10">
          <p className="text-xs font-black uppercase tracking-[0.24em] text-[#50d4ff]">Live sanitized operating proof</p>
          <div className="mt-3 flex flex-col justify-between gap-6 lg:flex-row lg:items-end">
            <div>
              <h1 className="text-4xl font-black tracking-tight sm:text-6xl">The LeadFlow Pro is running.</h1>
              <p className="mt-4 max-w-3xl text-base leading-7 text-[#b8c5d9]">This is not a client list and it does not expose private records. It is the aggregate scoreboard: what moved, what shipped, and what the operating system recorded.</p>
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

        <div className="mt-6 grid gap-3 sm:grid-cols-2 lg:grid-cols-4 xl:grid-cols-8">
          {headlineCards.map(({ label, value, icon: Icon }) => (
            <section key={label} className="rounded-2xl border border-white/10 bg-[#0d1a2d] p-4">
              <Icon className="h-5 w-5 text-[#50d4ff]" />
              <p className="mt-3 text-[10px] font-black uppercase tracking-wide text-[#8295b1]">{label}</p>
              <p className="mt-1 text-2xl font-black">{value}</p>
            </section>
          ))}
        </div>

        <section className="mt-6 overflow-hidden rounded-[28px] border border-white/10 bg-[#0d1a2d]">
          <div className="border-b border-white/10 px-6 py-5">
            <h2 className="text-2xl font-black">Operating scoreboard by window</h2>
            <p className="mt-1 text-sm text-[#9fb0c8]">Today, 7 days, 14 days, 30 days, 2, 3, 6, 9, and 12 months from the same underlying business records.</p>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full min-w-[900px] text-left text-sm">
              <thead className="bg-[#12223a] text-[11px] uppercase tracking-wider text-[#8295b1]"><tr><th className="px-5 py-3">Window</th><th className="px-4 py-3">Visitors</th><th className="px-4 py-3">Views</th><th className="px-4 py-3">Leads</th><th className="px-4 py-3">Follow-ups</th><th className="px-4 py-3">Cash recorded</th><th className="px-4 py-3">AI runs</th><th className="px-4 py-3">Content shipped</th></tr></thead>
              <tbody className="divide-y divide-white/10">
                {rows.map((row) => <tr key={row.label}><td className="px-5 py-4 font-black">{row.label}</td><td className="px-4 py-4">{number(row.visitors)}</td><td className="px-4 py-4">{number(row.pageViews)}</td><td className="px-4 py-4">{number(row.leads)}</td><td className="px-4 py-4">{number(row.followups)}</td><td className="px-4 py-4 font-black text-emerald-300">{money(row.cash)}</td><td className="px-4 py-4">{number(row.completedRuns)}</td><td className="px-4 py-4">{number(row.shipped)}</td></tr>)}
              </tbody>
            </table>
          </div>
        </section>

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
            <div className="mt-5 flex flex-wrap gap-3"><Link href="/diagnostic" className="rounded-xl bg-[#1240e8] px-5 py-3 text-sm font-black text-white">Run the Business Diagnostic</Link><Link href="/operatoros" className="rounded-xl border border-white/20 px-5 py-3 text-sm font-black text-white">See OperatorOS</Link></div>
          </section>
        </div>

        <p className="mt-6 text-center text-xs leading-5 text-[#7287a5]">Aggregate operating proof only. No private lead, client, project, message, or approval details are published on this page.</p>
      </section>
    </main>
  );
}
