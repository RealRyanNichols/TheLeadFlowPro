import Link from "next/link";
import {
  ArrowRight,
  Bot,
  CheckCircle2,
  CircleAlert,
  Clock3,
  DollarSign,
  Eye,
  FileCheck2,
  Gauge,
  Megaphone,
  MessageSquareText,
  Rocket,
  Send,
  Target,
  Users,
  Workflow,
} from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import LiveRefresh from "./LiveRefresh";

export const metadata = { title: "Flow Mission Control | The LeadFlow Pro" };

type Lead = {
  id: string;
  full_name: string;
  business_name: string | null;
  source: string | null;
  status: string;
  interest: string | null;
  priority: string | null;
  expected_value_cents: number | null;
  close_probability: number | null;
  next_follow_up_at: string | null;
  last_contacted_at: string | null;
  created_at: string;
};

type LeadTask = {
  id: string;
  lead_id: string;
  title: string;
  due_date: string | null;
  completed_at: string | null;
  priority: string | null;
};

type LeadActivity = {
  id: string;
  lead_id: string;
  kind: string;
  detail: string;
  created_at: string;
};

type AnalyticsEvent = {
  id: number;
  event_name: string;
  visitor_id: string | null;
  path: string | null;
  source_family: string | null;
  created_at: string;
};

type Purchase = {
  id: string;
  kind: string;
  amount_cents: number;
  status: string;
  created_at: string;
};

type Approval = {
  id: string;
  source_agent: string | null;
  target_agent: string | null;
  status: string;
  approval_required: boolean;
  created_at: string;
};

type SocialPost = {
  id: string;
  status: string;
  content_pillar: string | null;
  scheduled_for: string | null;
  published_at: string | null;
  created_at: string;
};

type Project = {
  id: string;
  name: string;
  status: string;
  target_launch: string | null;
  milestones: { id: string; status: string }[] | null;
};

type TimelineItem = {
  id: string;
  at: string;
  title: string;
  detail: string;
  tone: "blue" | "green" | "warn" | "violet";
};

const CLOSED_STATUSES = new Set(["won", "lost"]);
const PAID_STATUSES = new Set(["paid", "complete", "completed", "succeeded"]);
const PENDING_APPROVAL_STATUSES = new Set(["pending", "awaiting_approval", "queued", "ready"]);

function money(cents: number) {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    maximumFractionDigits: 0,
  }).format(cents / 100);
}

function shortTime(value: string) {
  return new Intl.DateTimeFormat("en-US", {
    hour: "numeric",
    minute: "2-digit",
    timeZone: "America/Chicago",
  }).format(new Date(value));
}

function centralDay() {
  return new Date().toLocaleDateString("en-CA", { timeZone: "America/Chicago" });
}

function agentTone(status: "working" | "waiting" | "blocked") {
  if (status === "working") return "border-[var(--green-line)] bg-[var(--green-tint)] text-[var(--green)]";
  if (status === "blocked") return "border-[var(--danger-line)] bg-[var(--danger-tint)] text-[var(--danger)]";
  return "border-[var(--line)] bg-[var(--fill-2)] text-[var(--muted)]";
}

export default async function FlowMissionControl() {
  const supabase = await createClient();
  const now = Date.now();
  const since24h = new Date(now - 24 * 60 * 60 * 1000).toISOString();
  const since7d = new Date(now - 7 * 24 * 60 * 60 * 1000).toISOString();
  const today = centralDay();

  const [leadResult, taskResult, activityResult, analyticsResult, purchaseResult, approvalResult, socialResult, projectResult] =
    await Promise.all([
      supabase
        .from("leads")
        .select("id, full_name, business_name, source, status, interest, priority, expected_value_cents, close_probability, next_follow_up_at, last_contacted_at, created_at")
        .is("deleted_at", null)
        .eq("is_test", false)
        .order("created_at", { ascending: false })
        .limit(250),
      supabase
        .from("lead_tasks")
        .select("id, lead_id, title, due_date, completed_at, priority")
        .is("completed_at", null)
        .order("due_date", { ascending: true })
        .limit(250),
      supabase
        .from("lead_activity")
        .select("id, lead_id, kind, detail, created_at")
        .gte("created_at", since7d)
        .order("created_at", { ascending: false })
        .limit(100),
      supabase
        .from("analytics_events")
        .select("id, event_name, visitor_id, path, source_family, created_at")
        .gte("created_at", since7d)
        .eq("is_internal", false)
        .order("created_at", { ascending: false })
        .limit(2500),
      supabase
        .from("purchases")
        .select("id, kind, amount_cents, status, created_at")
        .gte("created_at", since7d)
        .order("created_at", { ascending: false })
        .limit(250),
      supabase
        .from("approval_queue")
        .select("id, source_agent, target_agent, status, approval_required, created_at")
        .order("created_at", { ascending: false })
        .limit(100),
      supabase
        .from("social_posts")
        .select("id, status, content_pillar, scheduled_for, published_at, created_at")
        .gte("created_at", since7d)
        .order("created_at", { ascending: false })
        .limit(100),
      supabase
        .from("projects")
        .select("id, name, status, target_launch, milestones(id,status)")
        .order("created_at", { ascending: false })
        .limit(50),
    ]);

  const firstError = [leadResult, taskResult, activityResult, analyticsResult, purchaseResult, approvalResult, socialResult, projectResult]
    .map((result) => result.error)
    .find(Boolean);
  if (firstError) throw new Error(`Mission control data is temporarily unavailable: ${firstError.message}`);

  const leads = (leadResult.data ?? []) as Lead[];
  const tasks = (taskResult.data ?? []) as LeadTask[];
  const activity = (activityResult.data ?? []) as LeadActivity[];
  const analytics = (analyticsResult.data ?? []) as AnalyticsEvent[];
  const purchases = (purchaseResult.data ?? []) as Purchase[];
  const approvals = (approvalResult.data ?? []) as Approval[];
  const socialPosts = (socialResult.data ?? []) as SocialPost[];
  const projects = (projectResult.data ?? []) as Project[];

  const activeLeads = leads.filter((lead) => !CLOSED_STATUSES.has(lead.status));
  const leads24h = leads.filter((lead) => lead.created_at >= since24h);
  const leads7d = leads.filter((lead) => lead.created_at >= since7d);
  const newLeads = activeLeads.filter((lead) => lead.status === "new");
  const booked = activeLeads.filter((lead) => lead.status === "call_booked");
  const proposals = activeLeads.filter((lead) => ["proposal", "proposal_sent"].includes(lead.status));
  const highPriority = activeLeads.filter((lead) => ["high", "urgent", "hot"].includes((lead.priority || "").toLowerCase()));
  const overdueTasks = tasks.filter((task) => task.due_date && task.due_date <= today);
  const touchedLeadIds7d = new Set(activity.map((entry) => entry.lead_id));
  const scoredOpen = activeLeads.filter((lead) => Number(lead.expected_value_cents || 0) > 0);
  const pipelineCents = activeLeads.reduce((sum, lead) => sum + Number(lead.expected_value_cents || 0), 0);

  const analytics24h = analytics.filter((event) => event.created_at >= since24h);
  const visitors24h = new Set(analytics24h.map((event) => event.visitor_id).filter(Boolean)).size;
  const pageViews24h = analytics24h.filter((event) => event.event_name === "page_view").length;
  const ctaClicks24h = analytics24h.filter((event) => event.event_name === "cta_click").length;

  const purchases24h = purchases.filter((purchase) => purchase.created_at >= since24h && PAID_STATUSES.has(purchase.status));
  const recordedRevenue24h = purchases24h.reduce((sum, purchase) => sum + Number(purchase.amount_cents || 0), 0);
  const approvalsWaiting = approvals.filter(
    (item) => item.approval_required && PENDING_APPROVAL_STATUSES.has(item.status),
  );
  const contentMoving24h = socialPosts.filter((post) => {
    const movedAt = post.published_at || post.scheduled_for || post.created_at;
    return movedAt >= since24h && ["published", "scheduled", "approved"].includes(post.status);
  });
  const activeProjects = projects.filter((project) => ["discovery", "design", "build", "launch", "live", "support"].includes(project.status));
  const milestones = activeProjects.flatMap((project) => project.milestones ?? []);
  const doneMilestones = milestones.filter((milestone) => milestone.status === "done").length;

  const missions = [
    {
      label: "Work every new lead",
      done: newLeads.length === 0,
      detail: newLeads.length ? `${newLeads.length} new lead${newLeads.length === 1 ? "" : "s"} still waiting` : "New-lead queue clear",
      href: "/admin",
    },
    {
      label: "Clear overdue follow-up",
      done: overdueTasks.length === 0,
      detail: overdueTasks.length ? `${overdueTasks.length} follow-up${overdueTasks.length === 1 ? "" : "s"} due now` : "No overdue lead tasks",
      href: "/admin/command-center",
    },
    {
      label: "Put a dollar value on the open pipeline",
      done: activeLeads.length === 0 || scoredOpen.length === activeLeads.length,
      detail: activeLeads.length ? `${scoredOpen.length}/${activeLeads.length} active opportunities valued` : "No open opportunities",
      href: "/admin",
    },
    {
      label: "Clear the human stopline",
      done: approvalsWaiting.length === 0,
      detail: approvalsWaiting.length ? `${approvalsWaiting.length} action${approvalsWaiting.length === 1 ? "" : "s"} waiting for approval` : "Approval queue clear",
      href: "/admin/social",
    },
    {
      label: "Ship proof into the market",
      done: contentMoving24h.length > 0,
      detail: contentMoving24h.length ? `${contentMoving24h.length} post${contentMoving24h.length === 1 ? "" : "s"} published or scheduled in 24h` : "No recorded content shipped in 24h",
      href: "/admin/social",
    },
  ];
  const completedMissions = missions.filter((mission) => mission.done).length;
  const flowScore = Math.round((completedMissions / missions.length) * 100);

  const agents: {
    name: string;
    job: string;
    state: "working" | "waiting" | "blocked";
    metric: string;
    icon: typeof Eye;
  }[] = [
    { name: "Signal", job: "Attention", state: visitors24h > 0 ? "working" : "waiting", metric: `${visitors24h} visitors · ${pageViews24h} views`, icon: Eye },
    { name: "Catcher", job: "Lead capture", state: leads24h.length > 0 ? "working" : "waiting", metric: `${leads24h.length} leads in 24h`, icon: Users },
    { name: "Scout", job: "Qualification", state: highPriority.length > 0 ? "working" : activeLeads.length ? "waiting" : "waiting", metric: `${highPriority.length} high priority · ${activeLeads.length} open`, icon: Target },
    { name: "Drip", job: "Follow-up", state: overdueTasks.length > 0 ? "blocked" : tasks.length ? "working" : "waiting", metric: overdueTasks.length ? `${overdueTasks.length} overdue` : `${tasks.length} open tasks`, icon: Send },
    { name: "Closer", job: "Booked → proposal", state: booked.length || proposals.length ? "working" : "waiting", metric: `${booked.length} booked · ${proposals.length} proposal`, icon: MessageSquareText },
    { name: "Cash", job: "Payment", state: recordedRevenue24h > 0 ? "working" : "waiting", metric: recordedRevenue24h ? `${money(recordedRevenue24h)} recorded in 24h` : "No paid checkout in 24h", icon: DollarSign },
    { name: "Forge", job: "Delivery", state: activeProjects.length ? "working" : "waiting", metric: `${activeProjects.length} active builds · ${doneMilestones}/${milestones.length} milestones`, icon: Rocket },
    { name: "Lens", job: "Reporting", state: analytics24h.length > 0 ? "working" : "waiting", metric: `${analytics24h.length} events · ${ctaClicks24h} CTA clicks`, icon: Gauge },
  ];

  const leadById = new Map(leads.map((lead) => [lead.id, lead]));
  const timeline: TimelineItem[] = [
    ...leads24h.map((lead) => ({
      id: `lead-${lead.id}`,
      at: lead.created_at,
      title: "Lead captured",
      detail: `${lead.business_name || lead.full_name} entered from ${lead.source || "direct"}.`,
      tone: "blue" as const,
    })),
    ...activity.filter((entry) => entry.created_at >= since24h).map((entry) => {
      const lead = leadById.get(entry.lead_id);
      return {
        id: `activity-${entry.id}`,
        at: entry.created_at,
        title: entry.kind.replace(/_/g, " "),
        detail: `${lead?.business_name || lead?.full_name || "Lead"}: ${entry.detail}`,
        tone: "violet" as const,
      };
    }),
    ...purchases24h.map((purchase) => ({
      id: `purchase-${purchase.id}`,
      at: purchase.created_at,
      title: "Payment recorded",
      detail: `${money(purchase.amount_cents)} · ${purchase.kind.replace(/_/g, " ")}`,
      tone: "green" as const,
    })),
    ...approvalsWaiting.slice(0, 8).map((approval) => ({
      id: `approval-${approval.id}`,
      at: approval.created_at,
      title: "Human stopline",
      detail: `${approval.source_agent || "Agent"} → ${approval.target_agent || "operator"} needs approval.`,
      tone: "warn" as const,
    })),
  ].sort((a, b) => b.at.localeCompare(a.at)).slice(0, 10);

  const timelineTone: Record<TimelineItem["tone"], string> = {
    blue: "bg-[var(--accent-tint)] text-[var(--blue)]",
    green: "bg-[var(--green-tint)] text-[var(--green)]",
    warn: "bg-[var(--warn-tint)] text-[var(--warn)]",
    violet: "bg-[var(--fill-2)] text-[var(--violet)]",
  };

  return (
    <div className="space-y-6">
      <section className="overflow-hidden rounded-[28px] border border-[#20365d] bg-[#091222] text-white shadow-[0_24px_80px_rgba(9,18,34,0.18)]">
        <div className="border-b border-white/10 px-5 py-4 sm:px-7">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div className="flex items-center gap-3">
              <span className="inline-flex h-10 w-10 items-center justify-center rounded-2xl bg-[#1240e8] shadow-[0_0_30px_rgba(18,64,232,0.5)]">
                <Workflow className="h-5 w-5" aria-hidden="true" />
              </span>
              <div>
                <p className="text-[11px] font-black uppercase tracking-[0.22em] text-[#63d8ff]">The operating game</p>
                <h2 className="text-2xl font-black tracking-tight sm:text-3xl">Flow Mission Control</h2>
              </div>
            </div>
            <LiveRefresh />
          </div>
        </div>

        <div className="grid gap-6 px-5 py-6 sm:px-7 lg:grid-cols-[minmax(0,1fr)_260px]">
          <div>
            <div className="flex flex-wrap items-center gap-2 text-xs font-extrabold uppercase tracking-[0.16em] text-[#8fa7ca]">
              <span>Attention</span><ArrowRight className="h-3 w-3" /><span>Lead</span><ArrowRight className="h-3 w-3" /><span>Follow-up</span><ArrowRight className="h-3 w-3" /><span>Sale</span><ArrowRight className="h-3 w-3" /><span>Delivery</span><ArrowRight className="h-3 w-3" /><span>Proof</span>
            </div>
            <h3 className="mt-4 max-w-3xl text-3xl font-black leading-tight sm:text-4xl">
              Turn attention into paid work. Make every handoff visible.
            </h3>
            <p className="mt-3 max-w-2xl text-sm leading-6 text-[#a9b9d2]">
              This board uses the real CRM, analytics, approvals, social queue, payments, and project data already inside The LeadFlow Pro. No decorative counters. If the underlying record moves, this run moves.
            </p>

            <div className="mt-6 grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
              <div className="rounded-2xl border border-white/10 bg-white/[0.045] p-4">
                <p className="text-[10px] font-black uppercase tracking-wider text-[#8296b5]">Attention · 24h</p>
                <p className="mt-1 text-3xl font-black tabular-nums">{visitors24h}</p>
                <p className="mt-1 text-xs text-[#a9b9d2]">{pageViews24h} page views · {ctaClicks24h} CTA clicks</p>
              </div>
              <div className="rounded-2xl border border-white/10 bg-white/[0.045] p-4">
                <p className="text-[10px] font-black uppercase tracking-wider text-[#8296b5]">Captured · 24h</p>
                <p className="mt-1 text-3xl font-black tabular-nums">{leads24h.length}</p>
                <p className="mt-1 text-xs text-[#a9b9d2]">{leads7d.length} leads in the last 7 days</p>
              </div>
              <div className="rounded-2xl border border-white/10 bg-white/[0.045] p-4">
                <p className="text-[10px] font-black uppercase tracking-wider text-[#8296b5]">Open pipeline</p>
                <p className="mt-1 text-3xl font-black tabular-nums">{pipelineCents > 0 ? money(pipelineCents) : "Unscored"}</p>
                <p className="mt-1 text-xs text-[#a9b9d2]">{scoredOpen.length}/{activeLeads.length} opportunities valued</p>
              </div>
              <div className="rounded-2xl border border-white/10 bg-white/[0.045] p-4">
                <p className="text-[10px] font-black uppercase tracking-wider text-[#8296b5]">Recorded cash · 24h</p>
                <p className="mt-1 text-3xl font-black tabular-nums">{money(recordedRevenue24h)}</p>
                <p className="mt-1 text-xs text-[#a9b9d2]">From tracked paid checkout records</p>
              </div>
            </div>
          </div>

          <aside className="rounded-3xl border border-white/10 bg-white/[0.05] p-5">
            <div className="flex items-center justify-between gap-3">
              <div>
                <p className="text-[10px] font-black uppercase tracking-[0.18em] text-[#8296b5]">Flow score</p>
                <p className="mt-1 text-5xl font-black tabular-nums">{flowScore}</p>
              </div>
              <span className="inline-flex h-12 w-12 items-center justify-center rounded-2xl bg-[#1240e8]/20 text-[#63d8ff]">
                <Gauge className="h-6 w-6" aria-hidden="true" />
              </span>
            </div>
            <div className="mt-4 h-2 overflow-hidden rounded-full bg-white/10">
              <div className="h-full rounded-full bg-gradient-to-r from-[#1240e8] to-[#63d8ff]" style={{ width: `${flowScore}%` }} />
            </div>
            <p className="mt-3 text-xs leading-5 text-[#a9b9d2]">
              {completedMissions}/{missions.length} operating checks clear. This score measures execution hygiene, not promised revenue.
            </p>
            <div className="mt-5 rounded-2xl border border-white/10 bg-black/10 p-4">
              <p className="text-[10px] font-black uppercase tracking-wider text-[#8296b5]">Current run</p>
              <p className="mt-1 text-sm font-bold">{newLeads.length ? `${newLeads.length} new lead${newLeads.length === 1 ? "" : "s"} need a first move.` : overdueTasks.length ? `${overdueTasks.length} overdue follow-up${overdueTasks.length === 1 ? "" : "s"} are blocking flow.` : proposals.length ? `${proposals.length} proposal${proposals.length === 1 ? "" : "s"} are at the money line.` : "The queue is clear. Create more demand."}</p>
            </div>
          </aside>
        </div>
      </section>

      <section className="rounded-[26px] border border-[var(--line)] bg-white p-5 shadow-[0_14px_36px_rgba(10,18,32,0.05)] sm:p-6">
        <div className="flex flex-wrap items-end justify-between gap-3">
          <div>
            <p className="text-xs font-black uppercase tracking-[0.18em] text-[var(--blue)]">Live company floor</p>
            <h3 className="mt-1 text-2xl font-black text-[var(--heading)]">Eight roles. One revenue loop.</h3>
            <p className="mt-1 max-w-2xl text-sm text-[var(--muted)]">Working means there is live work in that lane. Waiting means the lane is clear or has no new input. Blocked means a queue or missed handoff needs attention.</p>
          </div>
          <span className="rounded-full border border-[var(--line)] bg-[var(--fill-2)] px-3 py-1.5 text-xs font-bold text-[var(--muted)]">Human approval stays the stopline</span>
        </div>

        <div className="mt-5 grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
          {agents.map(({ name, job, state, metric, icon: Icon }, index) => (
            <article key={name} className="relative overflow-hidden rounded-2xl border border-[var(--line)] bg-[var(--fill-1)] p-4">
              <div className="flex items-start justify-between gap-3">
                <span className="inline-flex h-10 w-10 items-center justify-center rounded-xl bg-[var(--accent-tint)] text-[var(--blue)]"><Icon className="h-5 w-5" aria-hidden="true" /></span>
                <span className={`rounded-full border px-2.5 py-1 text-[10px] font-black uppercase tracking-wider ${agentTone(state)}`}>{state}</span>
              </div>
              <p className="mt-4 text-[10px] font-black uppercase tracking-wider text-[var(--quiet)]">0{index + 1} · {job}</p>
              <h4 className="mt-1 text-lg font-black text-[var(--heading)]">{name}</h4>
              <p className="mt-2 text-sm leading-5 text-[var(--muted)]">{metric}</p>
            </article>
          ))}
        </div>
      </section>

      <div className="grid gap-6 xl:grid-cols-[minmax(0,1fr)_360px]">
        <section className="rounded-[26px] border border-[var(--line)] bg-white p-5 shadow-[0_14px_36px_rgba(10,18,32,0.05)] sm:p-6">
          <div className="flex items-center justify-between gap-3">
            <div>
              <p className="text-xs font-black uppercase tracking-[0.18em] text-[var(--blue)]">Today&apos;s mission</p>
              <h3 className="mt-1 text-2xl font-black text-[var(--heading)]">Win the five moves that matter.</h3>
            </div>
            <span className="text-sm font-black text-[var(--blue)]">{completedMissions}/{missions.length}</span>
          </div>
          <div className="mt-5 space-y-3">
            {missions.map((mission, index) => (
              <Link key={mission.label} href={mission.href} className="group flex min-h-[72px] items-center gap-4 rounded-2xl border border-[var(--line)] p-4 transition hover:border-[var(--accent-line)] hover:bg-[var(--accent-tint)]">
                <span className={`inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-xl ${mission.done ? "bg-[var(--green-tint)] text-[var(--green)]" : "bg-[var(--warn-tint)] text-[var(--warn)]"}`}>
                  {mission.done ? <CheckCircle2 className="h-5 w-5" aria-hidden="true" /> : <CircleAlert className="h-5 w-5" aria-hidden="true" />}
                </span>
                <div className="min-w-0 flex-1">
                  <p className="text-[10px] font-black uppercase tracking-wider text-[var(--quiet)]">Mission 0{index + 1}</p>
                  <p className="mt-0.5 font-black text-[var(--heading)]">{mission.label}</p>
                  <p className="mt-1 text-xs text-[var(--muted)]">{mission.detail}</p>
                </div>
                <ArrowRight className="h-4 w-4 shrink-0 text-[var(--quiet)] transition group-hover:translate-x-0.5 group-hover:text-[var(--blue)]" aria-hidden="true" />
              </Link>
            ))}
          </div>
        </section>

        <aside className="space-y-6">
          <section className="rounded-[26px] border border-[var(--line)] bg-white p-5 shadow-[0_14px_36px_rgba(10,18,32,0.05)]">
            <div className="flex items-center gap-2"><Bot className="h-5 w-5 text-[var(--blue)]" aria-hidden="true" /><h3 className="font-black text-[var(--heading)]">Human stopline</h3></div>
            <p className="mt-2 text-sm leading-6 text-[var(--muted)]">Anything that sends, spends, publishes, changes price, or makes an irreversible move can stop here before it happens.</p>
            <div className={`mt-4 rounded-2xl border p-4 ${approvalsWaiting.length ? "border-[var(--warn-line)] bg-[var(--warn-tint)]" : "border-[var(--green-line)] bg-[var(--green-tint)]"}`}>
              <p className={`text-3xl font-black ${approvalsWaiting.length ? "text-[var(--warn)]" : "text-[var(--green)]"}`}>{approvalsWaiting.length}</p>
              <p className="mt-1 text-xs font-bold text-[var(--text)]">actions waiting for a human yes</p>
            </div>
          </section>

          <section className="rounded-[26px] border border-[var(--line)] bg-white p-5 shadow-[0_14px_36px_rgba(10,18,32,0.05)]">
            <div className="flex items-center gap-2"><FileCheck2 className="h-5 w-5 text-[var(--blue)]" aria-hidden="true" /><h3 className="font-black text-[var(--heading)]">Build telemetry</h3></div>
            <dl className="mt-4 space-y-3 text-sm">
              <div className="flex items-center justify-between gap-4"><dt className="text-[var(--muted)]">Active client systems</dt><dd className="font-black text-[var(--heading)]">{activeProjects.length}</dd></div>
              <div className="flex items-center justify-between gap-4"><dt className="text-[var(--muted)]">Milestones complete</dt><dd className="font-black text-[var(--heading)]">{doneMilestones}/{milestones.length}</dd></div>
              <div className="flex items-center justify-between gap-4"><dt className="text-[var(--muted)]">Leads touched · 7d</dt><dd className="font-black text-[var(--heading)]">{touchedLeadIds7d.size}</dd></div>
              <div className="flex items-center justify-between gap-4"><dt className="text-[var(--muted)]">High-priority opportunities</dt><dd className="font-black text-[var(--heading)]">{highPriority.length}</dd></div>
            </dl>
          </section>
        </aside>
      </div>

      <div className="grid gap-6 xl:grid-cols-[minmax(0,1fr)_380px]">
        <section className="overflow-hidden rounded-[26px] border border-[var(--line)] bg-white shadow-[0_14px_36px_rgba(10,18,32,0.05)]">
          <div className="flex flex-wrap items-center justify-between gap-3 border-b border-[var(--line)] px-5 py-4 sm:px-6">
            <div>
              <p className="text-xs font-black uppercase tracking-[0.18em] text-[var(--blue)]">Live handoffs</p>
              <h3 className="mt-1 text-xl font-black text-[var(--heading)]">Watch the work move.</h3>
            </div>
            <Link href="/admin" className="inline-flex items-center gap-1 text-sm font-bold text-[var(--blue)] hover:underline">Open CRM <ArrowRight className="h-4 w-4" aria-hidden="true" /></Link>
          </div>
          {timeline.length ? (
            <ol className="divide-y divide-[var(--line)]">
              {timeline.map((item) => (
                <li key={item.id} className="flex gap-4 px-5 py-4 sm:px-6">
                  <span className={`mt-0.5 inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-xl ${timelineTone[item.tone]}`}>
                    {item.tone === "green" ? <DollarSign className="h-4 w-4" aria-hidden="true" /> : item.tone === "warn" ? <CircleAlert className="h-4 w-4" aria-hidden="true" /> : item.tone === "violet" ? <MessageSquareText className="h-4 w-4" aria-hidden="true" /> : <Users className="h-4 w-4" aria-hidden="true" />}
                  </span>
                  <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-baseline justify-between gap-2">
                      <p className="font-black capitalize text-[var(--heading)]">{item.title}</p>
                      <p className="text-[11px] font-bold text-[var(--quiet)]">{shortTime(item.at)}</p>
                    </div>
                    <p className="mt-1 text-sm leading-5 text-[var(--muted)]">{item.detail}</p>
                  </div>
                </li>
              ))}
            </ol>
          ) : (
            <div className="px-6 py-14 text-center"><Clock3 className="mx-auto h-7 w-7 text-[var(--quiet)]" aria-hidden="true" /><p className="mt-3 font-bold text-[var(--heading)]">No handoffs recorded in the last 24 hours.</p><p className="mt-1 text-sm text-[var(--muted)]">The next lead, follow-up, payment, or approval will appear here.</p></div>
          )}
        </section>

        <aside className="rounded-[26px] border border-[var(--line)] bg-[#0b1424] p-5 text-white shadow-[0_14px_36px_rgba(10,18,32,0.10)]">
          <div className="flex items-center gap-2 text-[#63d8ff]"><Megaphone className="h-5 w-5" aria-hidden="true" /><p className="text-xs font-black uppercase tracking-[0.18em]">Proof snapshot</p></div>
          <h3 className="mt-3 text-2xl font-black leading-tight">Turn the operating run into content.</h3>
          <p className="mt-2 text-sm leading-6 text-[#a9b9d2]">This is the LeadFlow version of the post you sent: visible progress, real constraints, real counters, and the next target.</p>
          <div className="mt-5 rounded-2xl border border-white/10 bg-white/[0.05] p-4">
            <p className="text-[10px] font-black uppercase tracking-wider text-[#8296b5]">Last 24 hours</p>
            <p className="mt-2 text-lg font-black leading-7">
              {visitors24h} visitors → {leads24h.length} leads → {booked.length} booked → {proposals.length} proposals → {money(recordedRevenue24h)} tracked checkout revenue.
            </p>
            <p className="mt-3 text-xs leading-5 text-[#a9b9d2]">{overdueTasks.length ? `${overdueTasks.length} overdue follow-up${overdueTasks.length === 1 ? "" : "s"} still blocking the board.` : "No overdue follow-up is blocking the board."} {approvalsWaiting.length ? `${approvalsWaiting.length} human approval${approvalsWaiting.length === 1 ? "" : "s"} waiting.` : "Human approval queue clear."}</p>
          </div>
          <Link href="/admin/content-engine" className="mt-5 inline-flex min-h-[44px] w-full items-center justify-center gap-2 rounded-xl bg-[#1240e8] px-4 text-sm font-black text-white">Turn this run into a post <ArrowRight className="h-4 w-4" aria-hidden="true" /></Link>
        </aside>
      </div>
    </div>
  );
}
