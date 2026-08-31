import { NextResponse } from "next/server";
import { createServiceClient } from "@/lib/supabase/service";
import { DEFAULT_ANTHROPIC_MODEL, DEFAULT_OPENAI_MODEL } from "@/lib/operatoros/catalog.ts";
import { OperatorAuthError, requireOperatorAdmin } from "@/lib/operatoros/auth.ts";
import type { OperatorProvider, OperatorRiskLevel } from "@/lib/operatoros/types.ts";

function clean(value: unknown, max: number): string {
  return typeof value === "string" ? value.trim().slice(0, max) : "";
}

function slugify(value: string) {
  return value
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 48) || "custom-skill";
}

export async function POST(request: Request) {
  try {
    const { user } = await requireOperatorAdmin();
    const body = (await request.json().catch(() => null)) as Record<string, unknown> | null;
    const name = clean(body?.name, 120);
    const trigger = clean(body?.trigger, 1200);
    const steps = clean(body?.steps, 8000);
    const finishWhen = clean(body?.finishWhen, 2000);
    const forbidden = clean(body?.forbidden, 2000);
    const description = clean(body?.description, 1000);
    const provider: OperatorProvider = body?.provider === "anthropic" ? "anthropic" : "openai";
    const risk: OperatorRiskLevel =
      body?.riskLevel === "red" || body?.riskLevel === "yellow" ? body.riskLevel : "green";

    if (!name || !trigger || !steps || !finishWhen) {
      return NextResponse.json(
        { error: "Name, trigger, steps, and finish criteria are required" },
        { status: 400 },
      );
    }

    const service = createServiceClient();
    const { data: workspace, error: workspaceError } = await service
      .from("operator_workspaces")
      .select("id")
      .eq("slug", "the-leadflow-pro")
      .single();
    if (workspaceError || !workspace) throw new Error("The LeadFlow Pro OperatorOS workspace is not initialized");

    const baseSlug = slugify(name);
    const suffix = Date.now().toString(36).slice(-5);
    const slug = `${baseSlug}-${suffix}`;
    const model = provider === "anthropic" ? DEFAULT_ANTHROPIC_MODEL : DEFAULT_OPENAI_MODEL;
    const forbiddenActions = forbidden
      .split(/\n|,/)
      .map((item) => item.trim())
      .filter(Boolean)
      .slice(0, 30);

    const { data: skill, error: skillError } = await service
      .from("operator_skills")
      .insert({
        workspace_id: workspace.id,
        slug,
        name,
        description: description || null,
        trigger_text: trigger,
        instructions: steps,
        finish_when: finishWhen,
        forbidden_actions: forbiddenActions,
        provider,
        default_model: model,
        risk_level: risk,
        enabled: true,
        created_by: user.id,
      })
      .select("*")
      .single();
    if (skillError || !skill) throw new Error(`Could not create skill: ${skillError?.message || "unknown error"}`);

    const { data: worker, error: workerError } = await service
      .from("operator_workers")
      .insert({
        workspace_id: workspace.id,
        slug: `${slug}-worker`,
        name: name.split(/\s+/).slice(0, 2).join(" "),
        role_title: name,
        provider,
        model,
        status: "waiting",
        status_detail: "New skill installed. Ready for a controlled first run.",
        capabilities: [name],
      })
      .select("*")
      .single();
    if (workerError || !worker) {
      await service.from("operator_skills").delete().eq("id", skill.id);
      throw new Error(`Could not create worker: ${workerError?.message || "unknown error"}`);
    }

    const { error: linkError } = await service.from("operator_worker_skills").insert({
      worker_id: worker.id,
      skill_id: skill.id,
      is_primary: true,
    });
    if (linkError) throw new Error(`Could not assign skill to worker: ${linkError.message}`);

    return NextResponse.json({ skill, worker }, { status: 201 });
  } catch (error) {
    if (error instanceof OperatorAuthError) {
      return NextResponse.json({ error: error.message }, { status: error.status });
    }
    const message = error instanceof Error ? error.message : "Skill creation failed";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
