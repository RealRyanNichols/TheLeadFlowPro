import { NextResponse } from "next/server";
import { createServiceClient } from "@/lib/supabase/service";
import { OperatorAuthError, requireOperatorAdmin } from "@/lib/operatoros/auth.ts";

function nowIso() {
  return new Date().toISOString();
}

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const { user } = await requireOperatorAdmin();
    const { id } = await params;
    const body = (await request.json().catch(() => null)) as
      | { decision?: unknown; note?: unknown }
      | null;
    const decision = body?.decision === "approved" || body?.decision === "rejected"
      ? body.decision
      : null;
    if (!decision || !/^[0-9a-f-]{36}$/i.test(id)) {
      return NextResponse.json({ error: "A valid approval decision is required" }, { status: 400 });
    }

    const service = createServiceClient();
    const { data: approval, error: approvalError } = await service
      .from("operator_approvals")
      .select("id, workspace_id, run_id, status, title, requested_by_worker_id")
      .eq("id", id)
      .single();
    if (approvalError || !approval) {
      return NextResponse.json({ error: "Approval was not found" }, { status: 404 });
    }
    if (approval.status !== "pending") {
      return NextResponse.json({ error: "This approval has already been decided" }, { status: 409 });
    }

    const decidedAt = nowIso();
    const { data: updated, error: updateError } = await service
      .from("operator_approvals")
      .update({
        status: decision,
        decided_by: user.id,
        decided_at: decidedAt,
        decision_note: typeof body?.note === "string" ? body.note.slice(0, 1000) : null,
        updated_at: decidedAt,
      })
      .eq("id", approval.id)
      .eq("status", "pending")
      .select("*")
      .single();
    if (updateError || !updated) throw new Error("Could not save the approval decision");

    await service.from("operator_run_events").insert({
      workspace_id: approval.workspace_id,
      run_id: approval.run_id,
      event_type: decision === "approved" ? "recommendation" : "blocked",
      title: `${approval.title} ${decision}`,
      detail:
        decision === "approved"
          ? "The recommendation was approved for human-controlled execution. OperatorOS did not perform the external action."
          : "The recommendation was rejected and will not proceed.",
      payload_json: { approval_id: approval.id, decision, decided_by: user.id },
    });

    const { data: allApprovals, error: allError } = await service
      .from("operator_approvals")
      .select("status")
      .eq("run_id", approval.run_id);
    if (allError) throw new Error("Could not reconcile the run approval state");
    const statuses = (allApprovals ?? []).map((item: { status: string }) => item.status);
    const pending = statuses.includes("pending");
    const rejected = statuses.includes("rejected");

    if (!pending) {
      const runStatus = rejected ? "blocked" : "completed";
      await service
        .from("operator_runs")
        .update({
          status: runStatus,
          completed_at: decidedAt,
          updated_at: decidedAt,
          error_text: rejected ? "A human rejected one or more proposed actions." : null,
        })
        .eq("id", approval.run_id);
      if (approval.requested_by_worker_id) {
        await service
          .from("operator_workers")
          .update({
            status: rejected ? "blocked" : "waiting",
            status_detail: rejected
              ? "A recommendation was rejected. Review the mission before retrying."
              : "Human review complete. Ready for the next mission.",
            current_run_id: null,
            updated_at: decidedAt,
          })
          .eq("id", approval.requested_by_worker_id);
      }
    }

    return NextResponse.json({ approval: updated });
  } catch (error) {
    if (error instanceof OperatorAuthError) {
      return NextResponse.json({ error: error.message }, { status: error.status });
    }
    const message = error instanceof Error ? error.message : "Approval update failed";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
