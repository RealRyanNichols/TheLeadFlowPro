import { NextResponse } from "next/server";
import { upsertContentArtifact } from "@/lib/content-command/import";
import { loadContentCommandState } from "@/lib/content-command/state";
import { CONTENT_PLATFORMS, type ContentPlatform } from "@/lib/content-command/types";
import { createSocialServiceClient, requireSocialAdmin } from "@/lib/social-server";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

function json(body: Record<string, unknown>, status = 200) {
  return NextResponse.json(body, {
    status,
    headers: { "Cache-Control": "private, no-store, max-age=0" },
  });
}

function ids(value: unknown) {
  return Array.isArray(value)
    ? [...new Set(value.map((id) => String(id)).filter((id) => /^[0-9a-f-]{36}$/i.test(id)))].slice(0, 100)
    : [];
}

function platform(value: unknown): ContentPlatform | null {
  const candidate = String(value ?? "") as ContentPlatform;
  return CONTENT_PLATFORMS.includes(candidate) ? candidate : null;
}

export async function GET(request: Request) {
  const admin = await requireSocialAdmin();
  if (admin instanceof NextResponse) return admin;
  const sb = createSocialServiceClient();
  if (!sb) return json({ error: "Server database access is not configured." }, 503);
  const artifactId = new URL(request.url).searchParams.get("artifact");
  return json({ state: await loadContentCommandState(sb, artifactId) });
}

export async function POST(request: Request) {
  const admin = await requireSocialAdmin();
  if (admin instanceof NextResponse) return admin;
  const sb = createSocialServiceClient();
  if (!sb) return json({ error: "Server database access is not configured." }, 503);
  const body = (await request.json().catch(() => ({}))) as Record<string, unknown>;
  const action = String(body.action ?? "");

  if (action === "import_artifact") {
    try {
      const result = await upsertContentArtifact(sb, body.artifact, admin.user.id);
      return json({ ok: true, ...result });
    } catch (error) {
      return json({ error: error instanceof Error ? error.message : "Artifact import failed." }, 400);
    }
  }

  if (action === "update_variant") {
    const id = String(body.id ?? "");
    const { data: current } = await sb.from("content_variants").select("status").eq("id", id).single();
    if (!current) return json({ error: "Variant not found." }, 404);
    if (!new Set(["draft", "approved", "blocked", "failed"]).has(current.status)) {
      return json({ error: `A ${current.status} variant cannot be edited.` }, 409);
    }
    const copy = String(body.copy ?? "").trim().slice(0, 30000);
    if (!copy) return json({ error: "The platform copy cannot be empty." }, 400);
    const scheduled = body.scheduled_for ? new Date(String(body.scheduled_for)) : null;
    if (scheduled && Number.isNaN(scheduled.valueOf())) return json({ error: "Choose a valid schedule time." }, 400);
    const { data, error } = await sb
      .from("content_variants")
      .update({
        copy,
        scheduled_for: scheduled?.toISOString() ?? null,
        status: current.status === "approved" ? "approved" : "draft",
        last_error: null,
      })
      .eq("id", id)
      .select("*")
      .single();
    if (error || !data) return json({ error: error?.message || "Could not save the variant." }, 500);
    await sb.from("content_activity_events").insert({
      kind: "variant.edited",
      entity_type: "variant",
      entity_id: id,
      summary: `Edited ${data.platform} copy.`,
      actor_id: admin.user.id,
    });
    return json({ ok: true, variant: data });
  }

  if (action === "approve_variants") {
    const variantIds = ids(body.ids);
    if (!variantIds.length) return json({ error: "Select at least one platform version." }, 400);
    const approvedAt = new Date().toISOString();
    const { data, error } = await sb
      .from("content_variants")
      .update({ status: "approved", approved_by: admin.user.id, approved_at: approvedAt, last_error: null })
      .in("id", variantIds)
      .in("status", ["draft", "blocked", "failed", "approved"])
      .select("id,platform");
    if (error) return json({ error: error.message }, 500);
    await sb.from("content_activity_events").insert({
      kind: "variant.approved",
      entity_type: "variant",
      summary: `Approved ${data?.length ?? 0} platform version${data?.length === 1 ? "" : "s"}.`,
      actor_id: admin.user.id,
      details: { variant_ids: data?.map((row) => row.id) ?? [] },
    });
    return json({ ok: true, approved: data ?? [] });
  }

  if (action === "publish_variants") {
    if (body.confirmed !== true) return json({ error: "Publishing requires an explicit confirmation." }, 409);
    const variantIds = ids(body.ids);
    if (!variantIds.length) return json({ error: "Select at least one approved platform version." }, 400);
    const state = await loadContentCommandState(sb);
    const connections = new Map(state.connections.map((item) => [item.platform, item]));
    const { data: variants, error } = await sb.from("content_variants").select("*").in("id", variantIds);
    if (error) return json({ error: error.message }, 500);

    const results: { id: string; ok: boolean; status: string; error?: string }[] = [];
    for (const variant of variants ?? []) {
      if (variant.status !== "approved") {
        results.push({ id: variant.id, ok: false, status: variant.status, error: "Approve this version first." });
        continue;
      }
      const connection = connections.get(variant.platform as ContentPlatform);
      const canPublish = connection?.status === "connected" && connection.capabilities.includes("publish");
      const jobStatus = canPublish ? "queued" : "blocked";
      const blocker = canPublish
        ? null
        : connection?.last_error || `Connect ${variant.platform} with publishing permission before pushing this post.`;
      const { data: activeJob } = await sb
        .from("content_publish_jobs")
        .select("id,status")
        .eq("variant_id", variant.id)
        .in("status", ["queued", "processing", "succeeded"])
        .limit(1)
        .maybeSingle();
      if (activeJob) {
        results.push({ id: variant.id, ok: activeJob.status === "succeeded", status: activeJob.status });
        continue;
      }
      await sb.from("content_publish_jobs").insert({
        variant_id: variant.id,
        platform: variant.platform,
        action: variant.scheduled_for ? "schedule" : "publish",
        status: jobStatus,
        payload: { confirmed_in_dashboard: true },
        approved_by: admin.user.id,
        approved_at: new Date().toISOString(),
        last_error: blocker,
      });
      await sb
        .from("content_variants")
        .update({ status: jobStatus, last_error: blocker })
        .eq("id", variant.id);
      results.push({ id: variant.id, ok: canPublish, status: jobStatus, ...(blocker ? { error: blocker } : {}) });
    }
    await sb.from("content_activity_events").insert({
      kind: "publish.queued",
      entity_type: "variant",
      summary: `Processed ${results.length} confirmed publish request${results.length === 1 ? "" : "s"}.`,
      actor_id: admin.user.id,
      details: { results },
    });
    return json({ ok: results.some((result) => result.ok), results });
  }

  if (action === "save_template") {
    const kind = String(body.kind ?? "message");
    if (!["comment", "dm", "review", "message"].includes(kind)) return json({ error: "Choose a valid template type." }, 400);
    const title = String(body.title ?? "").trim().slice(0, 160);
    const templateBody = String(body.body ?? "").trim().slice(0, 12000);
    const selectedPlatform = body.platform ? platform(body.platform) : null;
    if (!title || !templateBody) return json({ error: "Template title and copy are required." }, 400);
    const { data, error } = await sb
      .from("content_reply_templates")
      .insert({
        title,
        body: templateBody,
        kind,
        platform: selectedPlatform,
        category: String(body.category ?? "general").trim().slice(0, 100) || "general",
        created_by: admin.user.id,
      })
      .select("*")
      .single();
    if (error || !data) return json({ error: error?.message || "Could not save the template." }, 500);
    return json({ ok: true, template: data });
  }

  if (action === "queue_reply") {
    if (body.confirmed !== true) return json({ error: "Sending a reply requires explicit confirmation." }, 409);
    const threadId = String(body.thread_id ?? "");
    const replyBody = String(body.body ?? "").trim().slice(0, 30000);
    if (!replyBody) return json({ error: "Write the reply first." }, 400);
    const { data: thread } = await sb.from("content_threads").select("*").eq("id", threadId).single();
    if (!thread) return json({ error: "Conversation not found." }, 404);
    const state = await loadContentCommandState(sb);
    const connection = state.connections.find((item) => item.platform === thread.platform);
    const needed = thread.thread_type === "dm" ? "reply" : "comment";
    const canReply = connection?.status === "connected" && connection.capabilities.includes(needed);
    const status = canReply ? "queued" : "blocked";
    const blocker = canReply ? null : connection?.last_error || `${thread.platform} does not have ${needed} permission.`;
    const { data: message, error } = await sb
      .from("content_messages")
      .insert({
        thread_id: threadId,
        direction: "outbound",
        body: replyBody,
        reply_template_id: body.template_id || null,
        status,
        last_error: blocker,
        created_by: admin.user.id,
      })
      .select("*")
      .single();
    if (error || !message) return json({ error: error?.message || "Could not save the reply." }, 500);
    await sb.from("content_publish_jobs").insert({
      message_id: message.id,
      platform: thread.platform,
      action: thread.thread_type === "dm" ? "reply" : "comment",
      status,
      payload: { confirmed_in_dashboard: true },
      approved_by: admin.user.id,
      approved_at: new Date().toISOString(),
      last_error: blocker,
    });
    await sb.from("content_threads").update({ status: canReply ? "waiting" : "blocked", unread_count: 0 }).eq("id", threadId);
    return json({ ok: canReply, message, ...(blocker ? { error: blocker } : {}) }, canReply ? 200 : 409);
  }

  if (action === "mark_thread") {
    const threadId = String(body.thread_id ?? "");
    const status = String(body.status ?? "open");
    if (!["open", "waiting", "replied", "closed", "blocked"].includes(status)) return json({ error: "Invalid thread status." }, 400);
    const { error } = await sb.from("content_threads").update({ status, unread_count: 0 }).eq("id", threadId);
    if (error) return json({ error: error.message }, 500);
    return json({ ok: true });
  }

  return json({ error: "Unknown action." }, 400);
}
