import { NextResponse } from "next/server";
import { createServiceClient } from "@/lib/supabase/service";
import { centralDate, money } from "@/lib/operatoros/growth";

const OPEN = new Set(["new", "contacted", "call_booked", "proposal", "proposal_sent"]);

function inCentralDay(value: string | null, day: string) {
  return Boolean(value) && centralDate(value as string) === day;
}

function dayNumber(day: string) {
  const start = new Date("2026-09-01T12:00:00Z").getTime();
  const value = new Date(`${day}T12:00:00Z`).getTime();
  return Math.max(1, Math.floor((value - start) / 86400_000) + 1);
}

export async function GET(request: Request) {
  const cronSecret = process.env.CRON_SECRET;
  if (cronSecret && request.headers.get("authorization") !== `Bearer ${cronSecret}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const supabase = createServiceClient();
  const episodeDate = centralDate();
  const lookback = new Date(Date.now() - 40 * 3600_000).toISOString();

  const { data: workspace, error: workspaceError } = await supabase
    .from("operator_workspaces")
    .select("id")
    .eq("slug", "the-leadflow-pro")
    .single();
  if (workspaceError || !workspace) return NextResponse.json({ error: "OperatorOS workspace unavailable" }, { status: 500 });

  const [analyticsResult, leadResult, taskResult, cashResult, runResult, approvalResult, postResult, missionResult] = await Promise.all([
    supabase.from("analytics_events").select("event_name,visitor_id,created_at").eq("is_internal", false).gte("created_at", lookback).limit(5000),
    supabase.from("leads").select("id,status,expected_value_cents,created_at").is("deleted_at", null).eq("is_test", false).limit(1000),
    supabase.from("lead_tasks").select("completed_at,created_at").gte("created_at", lookback).limit(2000),
    supabase.from("operator_verified_cash_entries").select("source_type,amount_cents,received_at").eq("workspace_id", workspace.id).gte("received_at", lookback).limit(2000),
    supabase.from("operator_runs").select("status,created_at,completed_at").eq("workspace_id", workspace.id).gte("created_at", lookback).limit(2000),
    supabase.from("operator_approvals").select("status,decided_at,created_at").eq("workspace_id", workspace.id).gte("created_at", lookback).limit(2000),
    supabase.from("social_posts").select("status,published_at,created_at").gte("created_at", lookback).limit(2000),
    supabase.from("operator_missions").select("id,starts_at,target_at").eq("workspace_id", workspace.id).eq("status", "active").eq("target_metric", "cash_collected_usd").order("created_at", { ascending: false }).limit(1).maybeSingle(),
  ]);

  const firstError = [analyticsResult, leadResult, taskResult, cashResult, runResult, approvalResult, postResult, missionResult]
    .map((result) => result.error)
    .find(Boolean);
  if (firstError) return NextResponse.json({ error: "Episode data unavailable" }, { status: 500 });

  const analytics = analyticsResult.data ?? [];
  const leads = leadResult.data ?? [];
  const tasks = taskResult.data ?? [];
  const cashEntries = cashResult.data ?? [];
  const runs = runResult.data ?? [];
  const approvals = approvalResult.data ?? [];
  const posts = postResult.data ?? [];

  const pageViews = analytics.filter((event) => event.event_name === "page_view" && inCentralDay(event.created_at, episodeDate));
  const visitors = new Set(pageViews.map((event) => event.visitor_id).filter(Boolean)).size;
  const newLeads = leads.filter((lead) => inCentralDay(lead.created_at, episodeDate));
  const qualified = newLeads.filter((lead) => ["call_booked", "proposal", "proposal_sent", "won"].includes(lead.status)).length;
  const booked = leads.filter((lead) => lead.status === "call_booked" && inCentralDay(lead.created_at, episodeDate)).length;
  const proposals = leads.filter((lead) => ["proposal", "proposal_sent"].includes(lead.status) && inCentralDay(lead.created_at, episodeDate)).length;
  const wins = leads.filter((lead) => lead.status === "won" && inCentralDay(lead.created_at, episodeDate)).length;
  const todayCashEntries = cashEntries.filter((entry) => inCentralDay(entry.received_at, episodeDate));
  const cash = todayCashEntries.reduce((sum, entry) => sum + Math.max(0, Number(entry.amount_cents || 0)) / 100, 0);
  const cashSourceCounts = todayCashEntries.reduce<Record<string, number>>((counts, entry) => {
    counts[entry.source_type] = (counts[entry.source_type] || 0) + 1;
    return counts;
  }, {});
  const followups = tasks.filter((task) => inCentralDay(task.completed_at, episodeDate)).length;
  const completedRuns = runs.filter((run) => run.status === "completed" && inCentralDay(run.completed_at || run.created_at, episodeDate)).length;
  const approvalsDecided = approvals.filter((approval) => approval.status !== "pending" && inCentralDay(approval.decided_at || approval.created_at, episodeDate)).length;
  const contentShipped = posts.filter((post) => post.status === "published" && inCentralDay(post.published_at || post.created_at, episodeDate)).length;
  const openLeads = leads.filter((lead) => OPEN.has(lead.status));
  const unvalued = openLeads.filter((lead) => Number(lead.expected_value_cents || 0) <= 0).length;
  const stillNew = openLeads.filter((lead) => lead.status === "new").length;

  const moved = `${newLeads.length} leads entered, ${followups} follow-ups were completed, ${completedRuns} OperatorOS runs finished, and ${contentShipped} proof items shipped.`;
  const failed = stillNew ? `${stillNew} open lead records are still marked new.` : "No open lead is currently stuck in the new stage.";
  const leak = unvalued ? `${unvalued} open opportunities still need a dollar value, so the pipeline cannot yet be trusted as a revenue forecast.` : "Every open opportunity currently has a recorded dollar value.";
  const fixes = completedRuns ? `${completedRuns} recorded AI/operator runs completed today.` : "No completed OperatorOS run was recorded today.";
  const approvalText = approvalsDecided ? `${approvalsDecided} human approval decisions were recorded.` : "No human approval decision was recorded today.";
  const tomorrowTarget = stillNew || unvalued
    ? "Clear the new-lead queue, value the remaining open opportunities, work the prospect sequence, and keep the cash target visible."
    : "Keep the prospect sequence moving, present proposals, collect cash, and publish the proof of what actually happened.";

  const contentDraft = [
    `Day ${dayNumber(episodeDate)} of building the LeadFlow Pro machine.`,
    "",
    `${visitors} people came through the system.`,
    `${newLeads.length} raised their hand.`,
    `${qualified} were already moved into a qualified sales stage.`,
    `${booked} calls were booked.`,
    `${proposals} proposals entered the recorded pipeline.`,
    `${wins} became recorded wins.`,
    `${money(cash)} entered the verified cash ledger across ${todayCashEntries.length} receipt record${todayCashEntries.length === 1 ? "" : "s"}.`,
    `${followups} follow-ups were completed.`,
    `${completedRuns} OperatorOS runs finished.`,
    "",
    unvalued
      ? `${unvalued} open opportunities still need a dollar value. That is the next measurement gap we are closing.`
      : "Every open opportunity has a recorded dollar value right now.",
    "",
    "Build. Measure. Show. Attract. Capture. Sell. Build again.",
    "Watch what happens tomorrow.",
  ].join("\n");

  const metrics = {
    visitors,
    page_views: pageViews.length,
    leads: newLeads.length,
    qualified,
    booked,
    proposals,
    wins,
    verified_cash_usd: cash,
    verified_cash_receipts: todayCashEntries.length,
    verified_cash_sources: cashSourceCounts,
    followups_completed: followups,
    operator_runs_completed: completedRuns,
    approvals_decided: approvalsDecided,
    content_shipped: contentShipped,
    open_leads: openLeads.length,
    unvalued_open_opportunities: unvalued,
  };

  const { error: upsertError } = await supabase.from("operator_daily_episodes").upsert(
    {
      workspace_id: workspace.id,
      episode_date: episodeDate,
      day_number: dayNumber(episodeDate),
      metrics_json: metrics,
      moved,
      failed,
      leak,
      fixes,
      approvals: approvalText,
      tomorrow_target: tomorrowTarget,
      content_draft: contentDraft,
      status: "draft",
      updated_at: new Date().toISOString(),
    },
    { onConflict: "workspace_id,episode_date" },
  );
  if (upsertError) return NextResponse.json({ error: "Episode could not be saved" }, { status: 500 });

  if (missionResult.data) {
    const missionStart = missionResult.data.starts_at ? new Date(missionResult.data.starts_at).getTime() : -Infinity;
    const missionEnd = missionResult.data.target_at ? new Date(missionResult.data.target_at).getTime() : Infinity;
    const { data: missionCashEntries } = await supabase
      .from("operator_verified_cash_entries")
      .select("amount_cents,received_at")
      .eq("workspace_id", workspace.id)
      .gte("received_at", missionResult.data.starts_at || "1970-01-01T00:00:00.000Z")
      .limit(5000);
    const missionCash = (missionCashEntries ?? [])
      .filter((entry) => {
        const received = new Date(entry.received_at).getTime();
        return received >= missionStart && received <= missionEnd;
      })
      .reduce((sum, entry) => sum + Math.max(0, Number(entry.amount_cents || 0)) / 100, 0);
    await supabase
      .from("operator_missions")
      .update({ current_value: missionCash, updated_at: new Date().toISOString() })
      .eq("id", missionResult.data.id);
  }

  return NextResponse.json({ ok: true, episode_date: episodeDate, day_number: dayNumber(episodeDate), metrics });
}
