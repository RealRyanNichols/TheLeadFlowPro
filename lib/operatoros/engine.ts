import "server-only";
import type { SupabaseClient } from "@supabase/supabase-js";
import { createServiceClient } from "@/lib/supabase/service";
import { operatorExecutionEnabled, requiresHumanApproval } from "./catalog.ts";
import { buildOperatorContext } from "./context.ts";
import { parseOperatorDecision } from "./parse.ts";
import { callOperatorProvider, providerConfiguration } from "./providers.ts";
import type {
  OperatorDecision,
  OperatorProvider,
  OperatorRecommendedAction,
  OperatorRiskLevel,
} from "./types.ts";

type RunRow = {
  id: string;
  workspace_id: string;
  mission_id: string | null;
  skill_id: string;
  worker_id: string | null;
  status: string;
  input_json: Record<string, unknown> | null;
};

type SkillRow = {
  id: string;
  name: string;
  description: string | null;
  trigger_text: string;
  instructions: string;
  finish_when: string;
  forbidden_actions: string[] | null;
  provider: OperatorProvider;
  default_model: string | null;
  risk_level: OperatorRiskLevel;
  enabled: boolean;
};

type WorkerRow = {
  id: string;
  name: string;
  role_title: string;
  provider: OperatorProvider;
  model: string | null;
};

const SYSTEM_PROMPT = `You are a bounded business operator inside The LeadFlow Pro OperatorOS.
You may analyze the supplied business snapshot, identify bottlenecks, and recommend internal next actions.
You must never invent activity, customers, revenue, outcomes, or evidence.
You must never claim an external action occurred unless it appears in the supplied context.
Anything involving external messaging, publishing, spending, refunds, contracts, pricing, deletion, or production deployment must be labeled yellow or red and sent to human approval.
Return one JSON object and no prose outside it with this exact shape:
{
  "summary": "string",
  "outcome": "complete | needs_approval | blocked",
  "confidence": 0.0,
  "findings": ["string"],
  "recommended_actions": [
    {
      "title": "string",
      "description": "string",
      "action_type": "snake_case",
      "risk_level": "green | yellow | red",
      "payload": {}
    }
  ],
  "evidence": [
    { "label": "string", "value": "string or number", "source": "string" }
  ]
}`;

function nowIso() {
  return new Date().toISOString();
}

async function addRunEvent(
  supabase: SupabaseClient,
  run: Pick<RunRow, "id" | "workspace_id">,
  eventType: string,
  title: string,
  detail?: string,
  payload: Record<string, unknown> = {},
) {
  const { error } = await supabase.from("operator_run_events").insert({
    workspace_id: run.workspace_id,
    run_id: run.id,
    event_type: eventType,
    title,
    detail: detail || null,
    payload_json: payload,
  });
  if (error) throw new Error(`Could not record OperatorOS event: ${error.message}`);
}

function highestRisk(actions: OperatorRecommendedAction[], fallback: OperatorRiskLevel): OperatorRiskLevel {
  if (actions.some((action) => action.risk_level === "red")) return "red";
  if (actions.some((action) => action.risk_level === "yellow")) return "yellow";
  return fallback;
}

async function createApprovals(
  supabase: SupabaseClient,
  run: RunRow,
  worker: WorkerRow | null,
  decision: OperatorDecision,
  skillRisk: OperatorRiskLevel,
): Promise<number> {
  let actions = decision.recommended_actions.filter((action) =>
    requiresHumanApproval(action.risk_level, action.action_type),
  );

  if (decision.outcome === "needs_approval" && actions.length === 0) {
    actions = [
      {
        title: "Review worker recommendation",
        description: decision.summary,
        action_type: "review_required",
        risk_level: skillRisk === "green" ? "yellow" : skillRisk,
        payload: {},
      },
    ];
  }

  if (actions.length === 0) return 0;

  const rows = actions.map((action) => ({
    workspace_id: run.workspace_id,
    run_id: run.id,
    action_type: action.action_type,
    risk_level: action.risk_level === "green" ? "yellow" : action.risk_level,
    status: "pending",
    title: action.title,
    summary: action.description,
    payload_json: action.payload ?? {},
    requested_by_worker_id: worker?.id ?? null,
  }));
  const { error } = await supabase.from("operator_approvals").insert(rows);
  if (error) throw new Error(`Could not create approval stopline: ${error.message}`);

  await addRunEvent(
    supabase,
    run,
    "approval_required",
    `${rows.length} action${rows.length === 1 ? "" : "s"} waiting for human approval`,
    "No external action has been executed.",
    { approval_count: rows.length },
  );
  return rows.length;
}

async function setWorkerState(
  supabase: SupabaseClient,
  workerId: string | null,
  status: "waiting" | "working" | "blocked",
  detail: string,
  currentRunId: string | null,
) {
  if (!workerId) return;
  const { error } = await supabase
    .from("operator_workers")
    .update({
      status,
      status_detail: detail,
      current_run_id: currentRunId,
      last_heartbeat_at: nowIso(),
      updated_at: nowIso(),
    })
    .eq("id", workerId);
  if (error) throw new Error(`Could not update worker state: ${error.message}`);
}

function userPrompt(skill: SkillRow, context: unknown, input: Record<string, unknown>) {
  return [
    `SKILL: ${skill.name}`,
    `DESCRIPTION: ${skill.description || "No additional description."}`,
    `TRIGGER: ${skill.trigger_text}`,
    `INSTRUCTIONS: ${skill.instructions}`,
    `FINISHED WHEN: ${skill.finish_when}`,
    `FORBIDDEN ACTIONS: ${(skill.forbidden_actions ?? []).join(", ") || "None listed"}`,
    `REQUEST INPUT: ${JSON.stringify(input)}`,
    `BUSINESS SNAPSHOT: ${JSON.stringify(context)}`,
    "Use only the snapshot above. Missing data must be stated as missing.",
  ].join("\n\n");
}

export async function executeOperatorRun(runId: string, actorId: string) {
  const supabase = createServiceClient();
  const { data: runData, error: runError } = await supabase
    .from("operator_runs")
    .select("id, workspace_id, mission_id, skill_id, worker_id, status, input_json")
    .eq("id", runId)
    .single();
  if (runError || !runData) throw new Error("OperatorOS run was not found");
  const run = runData as RunRow;

  if (["completed", "cancelled"].includes(run.status)) return run;
  if (run.status === "running") throw new Error("This OperatorOS run is already working");

  const [{ data: skillData, error: skillError }, { data: workerData, error: workerError }] =
    await Promise.all([
      supabase
        .from("operator_skills")
        .select(
          "id, name, description, trigger_text, instructions, finish_when, forbidden_actions, provider, default_model, risk_level, enabled",
        )
        .eq("id", run.skill_id)
        .single(),
      run.worker_id
        ? supabase
            .from("operator_workers")
            .select("id, name, role_title, provider, model")
            .eq("id", run.worker_id)
            .single()
        : Promise.resolve({ data: null, error: null }),
    ]);
  if (skillError || !skillData) throw new Error("OperatorOS skill was not found");
  if (workerError) throw new Error("OperatorOS worker was not found");
  const skill = skillData as SkillRow;
  const worker = (workerData as WorkerRow | null) ?? null;
  if (!skill.enabled) throw new Error("This OperatorOS skill is disabled");
  if (skill.provider === "human") throw new Error("Human-only skills cannot be executed by an AI provider");

  const executionEnabled = operatorExecutionEnabled(process.env.OPERATOROS_EXECUTION_ENABLED);
  const providerState = providerConfiguration(skill.provider);
  if (!executionEnabled || !providerState.ready) {
    const reason = !executionEnabled
      ? "OperatorOS execution is paused by the server kill switch."
      : `${skill.provider === "openai" ? "OpenAI" : "Anthropic"} is not configured on the server.`;
    await supabase
      .from("operator_runs")
      .update({ status: "blocked", error_text: reason, updated_at: nowIso() })
      .eq("id", run.id);
    await setWorkerState(supabase, run.worker_id, "blocked", reason, null);
    await addRunEvent(supabase, run, "blocked", "Worker stopped safely", reason);
    return { ...run, status: "blocked", error_text: reason };
  }

  try {
    await supabase
      .from("operator_runs")
      .update({
        status: "running",
        started_at: nowIso(),
        error_text: null,
        updated_at: nowIso(),
      })
      .eq("id", run.id);
    await setWorkerState(
      supabase,
      run.worker_id,
      "working",
      `${skill.name} is reviewing live business state.`,
      run.id,
    );
    await addRunEvent(supabase, run, "started", `${worker?.name || "Worker"} started ${skill.name}`);

    const context = await buildOperatorContext(supabase, run.workspace_id);
    await supabase
      .from("operator_runs")
      .update({ context_json: context, updated_at: nowIso() })
      .eq("id", run.id);
    await addRunEvent(
      supabase,
      run,
      "context_ready",
      "Real business context assembled",
      "Private contact details were excluded before provider processing.",
      { metrics: context.metrics },
    );

    await addRunEvent(
      supabase,
      run,
      "model_request",
      `${skill.provider === "openai" ? "ChatGPT" : "Claude"} reasoning requested`,
      `Model: ${skill.default_model || providerState.model}`,
    );
    const providerResult = await callOperatorProvider({
      provider: skill.provider,
      model: worker?.model || skill.default_model || providerState.model,
      systemPrompt: SYSTEM_PROMPT,
      userPrompt: userPrompt(skill, context, run.input_json ?? {}),
    });
    const decision = parseOperatorDecision(providerResult.text);
    const approvalCount = await createApprovals(supabase, run, worker, decision, skill.risk_level);
    const risk = highestRisk(decision.recommended_actions, skill.risk_level);
    const finalStatus =
      approvalCount > 0
        ? "waiting_approval"
        : decision.outcome === "blocked"
          ? "blocked"
          : "completed";

    const { data: finalRun, error: finalError } = await supabase
      .from("operator_runs")
      .update({
        status: finalStatus,
        output_json: {
          ...decision,
          provider: skill.provider,
          model: providerResult.model,
          executed_external_actions: false,
        },
        risk_level: risk,
        completed_at: finalStatus === "completed" ? nowIso() : null,
        updated_at: nowIso(),
      })
      .eq("id", run.id)
      .select("*")
      .single();
    if (finalError) throw new Error(`Could not finalize OperatorOS run: ${finalError.message}`);

    await addRunEvent(
      supabase,
      run,
      "model_response",
      "Worker returned an evidence-backed decision",
      decision.summary,
      {
        confidence: decision.confidence,
        outcome: decision.outcome,
        findings: decision.findings,
      },
    );

    if (finalStatus === "completed") {
      await addRunEvent(
        supabase,
        run,
        "completed",
        `${skill.name} completed`,
        "The run changed internal OperatorOS records only.",
      );
      await setWorkerState(supabase, run.worker_id, "waiting", "Mission complete. Ready for the next run.", null);
    } else if (finalStatus === "blocked") {
      await addRunEvent(supabase, run, "blocked", `${skill.name} could not finish safely`, decision.summary);
      await setWorkerState(supabase, run.worker_id, "blocked", decision.summary, null);
    } else {
      await setWorkerState(
        supabase,
        run.worker_id,
        "waiting",
        `${approvalCount} proposed action${approvalCount === 1 ? " is" : "s are"} waiting for a human decision.`,
        null,
      );
    }

    return finalRun;
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown OperatorOS execution error";
    await supabase
      .from("operator_runs")
      .update({
        status: "failed",
        error_text: message,
        completed_at: nowIso(),
        updated_at: nowIso(),
      })
      .eq("id", run.id);
    await setWorkerState(supabase, run.worker_id, "blocked", message, null);
    await addRunEvent(supabase, run, "failed", `${skill.name} failed`, message).catch(() => undefined);
    throw error;
  } finally {
    void actorId;
  }
}
