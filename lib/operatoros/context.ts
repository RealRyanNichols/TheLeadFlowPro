import "server-only";
import type { SupabaseClient } from "@supabase/supabase-js";
import type { OperatorBusinessContext } from "./types.ts";

function centralDate(value: string | Date): string {
  return new Date(value).toLocaleDateString("en-CA", { timeZone: "America/Chicago" });
}

function recordLabel(id: string, businessName: string | null): string {
  return businessName?.trim() || `Lead ${id.slice(0, 8)}`;
}

function paidStatus(status: string | null): boolean {
  return ["paid", "complete", "completed", "succeeded"].includes((status || "").toLowerCase());
}

export async function buildOperatorContext(
  supabase: SupabaseClient,
  workspaceId: string,
): Promise<OperatorBusinessContext> {
  const now = new Date();
  const since30d = new Date(now.getTime() - 30 * 86400_000).toISOString();
  const since7d = new Date(now.getTime() - 7 * 86400_000).toISOString();
  const today = centralDate(now);

  const [leadResult, taskResult, projectResult, purchaseResult, socialResult, approvalResult] =
    await Promise.all([
      supabase
        .from("leads")
        .select(
          "id, business_name, status, source, priority, expected_value_cents, close_probability, next_follow_up_at, last_contacted_at, created_at",
        )
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
        .from("projects")
        .select("id, name, status, target_launch, milestones(id,status)")
        .order("created_at", { ascending: false })
        .limit(100),
      supabase
        .from("purchases")
        .select("id, amount_cents, status, created_at")
        .gte("created_at", since30d)
        .limit(500),
      supabase
        .from("social_posts")
        .select("id, status, published_at, created_at")
        .gte("created_at", since7d)
        .limit(500),
      supabase
        .from("operator_approvals")
        .select("id, status")
        .eq("workspace_id", workspaceId)
        .eq("status", "pending")
        .limit(500),
    ]);

  const error = [leadResult, taskResult, projectResult, purchaseResult, socialResult, approvalResult]
    .map((result) => result.error)
    .find(Boolean);
  if (error) throw new Error(`Could not build operating context: ${error.message}`);

  const leads = (leadResult.data ?? []) as Array<{
    id: string;
    business_name: string | null;
    status: string;
    source: string | null;
    priority: string | null;
    expected_value_cents: number | null;
    close_probability: number | null;
    next_follow_up_at: string | null;
    last_contacted_at: string | null;
    created_at: string;
  }>;
  const tasks = (taskResult.data ?? []) as Array<{
    id: string;
    lead_id: string;
    title: string;
    due_date: string | null;
    completed_at: string | null;
    priority: string | null;
  }>;
  const projects = (projectResult.data ?? []) as Array<{
    id: string;
    name: string;
    status: string;
    target_launch: string | null;
    milestones: Array<{ id: string; status: string }> | null;
  }>;
  const purchases = (purchaseResult.data ?? []) as Array<{
    amount_cents: number | null;
    status: string | null;
    created_at: string;
  }>;
  const socialPosts = (socialResult.data ?? []) as Array<{
    status: string;
    published_at: string | null;
    created_at: string;
  }>;

  const closed = new Set(["won", "lost"]);
  const activeLeads = leads.filter((lead) => !closed.has(lead.status));
  const leadById = new Map(leads.map((lead) => [lead.id, lead]));
  const overdueTasks = tasks.filter((task) => task.due_date && task.due_date <= today);
  const openPipelineCents = activeLeads.reduce(
    (sum, lead) => sum + Math.max(0, Number(lead.expected_value_cents || 0)),
    0,
  );
  const paid30dCents = purchases
    .filter((purchase) => paidStatus(purchase.status))
    .reduce((sum, purchase) => sum + Math.max(0, Number(purchase.amount_cents || 0)), 0);
  const activeProjects = projects.filter((project) => !["live", "support", "paused"].includes(project.status));
  const milestones = projects.flatMap((project) => project.milestones ?? []);
  const contentShipped = socialPosts.filter(
    (post) => post.status === "published" || Boolean(post.published_at),
  ).length;

  return {
    as_of: now.toISOString(),
    workspace_id: workspaceId,
    metrics: {
      new_leads: leads.filter((lead) => lead.status === "new").length,
      active_leads: activeLeads.length,
      overdue_follow_ups: overdueTasks.length,
      open_tasks: tasks.length,
      open_pipeline_cents: openPipelineCents,
      paid_30d_cents: paid30dCents,
      active_projects: activeProjects.length,
      completed_milestones: milestones.filter((milestone) => milestone.status === "done").length,
      total_milestones: milestones.length,
      content_shipped_7d: contentShipped,
      existing_approvals_waiting: (approvalResult.data ?? []).length,
    },
    lead_queue: activeLeads.slice(0, 30).map((lead) => ({
      record: recordLabel(lead.id, lead.business_name),
      stage: lead.status,
      source: lead.source || "direct",
      priority: lead.priority || "normal",
      expected_value_cents: lead.expected_value_cents,
      close_probability: lead.close_probability,
      next_follow_up_at: lead.next_follow_up_at,
      last_contacted_at: lead.last_contacted_at,
      created_at: lead.created_at,
    })),
    overdue_tasks: overdueTasks.slice(0, 30).map((task) => {
      const lead = leadById.get(task.lead_id);
      return {
        task_id: task.id,
        lead_record: lead ? recordLabel(lead.id, lead.business_name) : `Lead ${task.lead_id.slice(0, 8)}`,
        title: task.title,
        due_date: task.due_date,
        priority: task.priority || "normal",
      };
    }),
    delivery: projects.slice(0, 30).map((project) => {
      const projectMilestones = project.milestones ?? [];
      return {
        project: project.name,
        status: project.status,
        target_launch: project.target_launch,
        milestones_done: projectMilestones.filter((milestone) => milestone.status === "done").length,
        milestones_total: projectMilestones.length,
      };
    }),
    source_notes: [
      "Lead records are anonymized and exclude email, phone, and personal names.",
      "Amounts come from stored CRM and purchase records and may be incomplete when staff have not entered values.",
      "The worker must label missing or uncertain evidence instead of inventing a result.",
    ],
  };
}
