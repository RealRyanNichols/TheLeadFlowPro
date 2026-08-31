import { NextResponse } from "next/server";
import { createServiceClient } from "@/lib/supabase/service";
import { executeOperatorRun } from "@/lib/operatoros/engine.ts";
import { OperatorAuthError, requireOperatorAdmin } from "@/lib/operatoros/auth.ts";

export const maxDuration = 120;

function jsonError(error: unknown) {
  if (error instanceof OperatorAuthError) {
    return NextResponse.json({ error: error.message }, { status: error.status });
  }
  const message = error instanceof Error ? error.message : "OperatorOS request failed";
  return NextResponse.json({ error: message }, { status: 500 });
}

export async function POST(request: Request) {
  try {
    const { user } = await requireOperatorAdmin();
    const body = (await request.json().catch(() => null)) as
      | { skillId?: unknown; input?: unknown; execute?: unknown }
      | null;
    const skillId = typeof body?.skillId === "string" ? body.skillId : "";
    if (!/^[0-9a-f-]{36}$/i.test(skillId)) {
      return NextResponse.json({ error: "A valid skill is required" }, { status: 400 });
    }

    const input =
      body?.input && typeof body.input === "object" && !Array.isArray(body.input)
        ? (body.input as Record<string, unknown>)
        : {};
    const service = createServiceClient();
    const { data: skill, error: skillError } = await service
      .from("operator_skills")
      .select("id, workspace_id, risk_level, enabled")
      .eq("id", skillId)
      .single();
    if (skillError || !skill || !skill.enabled) {
      return NextResponse.json({ error: "This OperatorOS skill is unavailable" }, { status: 404 });
    }

    const [{ data: workerLink }, { data: mission }] = await Promise.all([
      service
        .from("operator_worker_skills")
        .select("worker_id")
        .eq("skill_id", skillId)
        .eq("is_primary", true)
        .limit(1)
        .maybeSingle(),
      service
        .from("operator_missions")
        .select("id")
        .eq("workspace_id", skill.workspace_id)
        .eq("status", "active")
        .order("created_at", { ascending: false })
        .limit(1)
        .maybeSingle(),
    ]);

    const { data: run, error: runError } = await service
      .from("operator_runs")
      .insert({
        workspace_id: skill.workspace_id,
        mission_id: mission?.id ?? null,
        skill_id: skill.id,
        worker_id: workerLink?.worker_id ?? null,
        status: "queued",
        trigger_source: "manual",
        input_json: input,
        risk_level: skill.risk_level,
        created_by: user.id,
      })
      .select("*")
      .single();
    if (runError || !run) throw new Error(`Could not queue OperatorOS run: ${runError?.message || "unknown error"}`);

    const { error: eventError } = await service.from("operator_run_events").insert({
      workspace_id: skill.workspace_id,
      run_id: run.id,
      event_type: "queued",
      title: "Mission queued by Ryan",
      detail: "No external action has been executed.",
      payload_json: { trigger_source: "manual" },
    });
    if (eventError) throw new Error(`Could not create run history: ${eventError.message}`);

    if (body?.execute === false) return NextResponse.json({ run }, { status: 201 });
    const result = await executeOperatorRun(run.id, user.id);
    return NextResponse.json({ run: result }, { status: 201 });
  } catch (error) {
    return jsonError(error);
  }
}
