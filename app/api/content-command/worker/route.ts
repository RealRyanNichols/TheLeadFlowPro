import { NextResponse } from "next/server";
import { publishFacebookPost, resolveFacebookPageToken } from "@/lib/meta-publishing";
import { FACEBOOK_GRAPH_VERSION } from "@/lib/social";
import { isContentWorkerAuthorized } from "@/lib/content-command/worker-auth";
import {
  SOCIAL_PAGE_ID,
  createSocialServiceClient,
  getFacebookSourceToken,
} from "@/lib/social-server";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

type Job = {
  id: string;
  variant_id: string | null;
  message_id: string | null;
  platform: string;
  action: string;
  attempt_count: number;
};

async function graphPost(path: string, token: string, body: Record<string, unknown>) {
  const response = await fetch(`https://graph.facebook.com/${process.env.META_GRAPH_VERSION || FACEBOOK_GRAPH_VERSION}/${path}`, {
    method: "POST",
    headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
  const data = await response.json().catch(() => ({}));
  if (!response.ok || data.error) throw new Error(data.error?.message || `Meta returned HTTP ${response.status}.`);
  return data as { id?: string; message_id?: string };
}

async function processJob(sb: NonNullable<ReturnType<typeof createSocialServiceClient>>, job: Job) {
  if (job.platform !== "facebook") throw new Error(`${job.platform} connector is not configured on this worker.`);
  const sourceToken = await getFacebookSourceToken(sb);
  if (!sourceToken) throw new Error("The Facebook Page access token is not configured.");

  if (job.variant_id) {
    const { data: variant, error } = await sb
      .from("content_variants")
      .select("*,content_units(asset_url,verified_url)")
      .eq("id", job.variant_id)
      .single();
    if (error || !variant) throw new Error(error?.message || "Platform version not found.");
    const unit = Array.isArray(variant.content_units) ? variant.content_units[0] : variant.content_units;
    const publicAsset = /^https:\/\//i.test(unit?.asset_url || "") ? unit.asset_url : null;
    const mediaType = publicAsset ? "photo" : unit?.verified_url ? "link" : "text";
    const result = await publishFacebookPost({
      pageId: SOCIAL_PAGE_ID,
      sourceToken,
      message: variant.copy,
      mediaType,
      mediaUrl: publicAsset,
      linkUrl: unit?.verified_url || null,
      scheduledFor: variant.scheduled_for,
    });
    const now = new Date().toISOString();
    const status = result.mode === "schedule" ? "scheduled" : "published";
    await sb.from("content_variants").update({
      status,
      external_id: result.postId || result.objectId,
      external_url: result.permalink,
      published_at: status === "published" ? now : null,
      last_error: null,
    }).eq("id", variant.id);
    return { status, externalId: result.postId || result.objectId, externalUrl: result.permalink };
  }

  const { data: message, error } = await sb
    .from("content_messages")
    .select("*,content_threads(*)")
    .eq("id", job.message_id)
    .single();
  if (error || !message) throw new Error(error?.message || "Reply not found.");
  const thread = Array.isArray(message.content_threads) ? message.content_threads[0] : message.content_threads;
  if (!thread) throw new Error("Conversation not found.");
  const resolved = await resolveFacebookPageToken(sourceToken, SOCIAL_PAGE_ID);
  const data = thread.thread_type === "dm"
    ? await graphPost(`${SOCIAL_PAGE_ID}/messages`, resolved.token, {
        messaging_type: "RESPONSE",
        recipient: { id: thread.metadata?.sender_id || thread.external_thread_id },
        message: { text: message.body },
      })
    : await graphPost(`${thread.external_thread_id}/comments`, resolved.token, { message: message.body });
  const now = new Date().toISOString();
  await Promise.all([
    sb.from("content_messages").update({ status: "sent", external_message_id: data.message_id || data.id, sent_at: now, last_error: null }).eq("id", message.id),
    sb.from("content_threads").update({ status: "replied", unread_count: 0 }).eq("id", thread.id),
  ]);
  return { status: "sent", externalId: data.message_id || data.id || null };
}

export async function GET(request: Request) {
  if (!isContentWorkerAuthorized(request)) return NextResponse.json({ error: "Worker authorization failed." }, { status: 401 });
  return NextResponse.json({ ok: true, service: "content-command-worker", now: new Date().toISOString() });
}

export async function POST(request: Request) {
  if (!isContentWorkerAuthorized(request)) return NextResponse.json({ error: "Worker authorization failed." }, { status: 401 });
  const sb = createSocialServiceClient();
  if (!sb) return NextResponse.json({ error: "Server database access is not configured." }, { status: 503 });
  const { data: candidate, error } = await sb.from("content_publish_jobs").select("*")
    .eq("status", "queued").lte("available_at", new Date().toISOString()).order("created_at").limit(1).maybeSingle();
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  if (!candidate) return NextResponse.json({ ok: true, processed: false });
  const { data: claimed } = await sb.from("content_publish_jobs").update({
    status: "processing",
    locked_at: new Date().toISOString(),
    locked_by: request.headers.get("x-worker-id") || "digitalocean-worker",
    attempt_count: (candidate.attempt_count || 0) + 1,
  }).eq("id", candidate.id).eq("status", "queued").select("*").maybeSingle();
  if (!claimed) return NextResponse.json({ ok: true, processed: false, raced: true });

  try {
    const result = await processJob(sb, claimed as Job);
    await Promise.all([
      sb.from("content_publish_jobs").update({ status: "succeeded", completed_at: new Date().toISOString(), external_id: result.externalId, external_url: "externalUrl" in result ? result.externalUrl : null, last_error: null }).eq("id", claimed.id),
      sb.from("content_activity_events").insert({ kind: "worker.succeeded", entity_type: "job", entity_id: claimed.id, summary: `${claimed.platform} ${claimed.action} completed.`, details: result }),
    ]);
    return NextResponse.json({ ok: true, processed: true, job_id: claimed.id, result });
  } catch (caught) {
    const message = (caught instanceof Error ? caught.message : String(caught)).slice(0, 4000);
    await Promise.all([
      sb.from("content_publish_jobs").update({ status: "failed", completed_at: new Date().toISOString(), last_error: message }).eq("id", claimed.id),
      claimed.variant_id ? sb.from("content_variants").update({ status: "failed", last_error: message }).eq("id", claimed.variant_id) : sb.from("content_messages").update({ status: "failed", last_error: message }).eq("id", claimed.message_id),
      sb.from("content_activity_events").insert({ kind: "worker.failed", entity_type: "job", entity_id: claimed.id, summary: `${claimed.platform} ${claimed.action} failed: ${message.slice(0, 500)}`, details: { error: message } }),
    ]);
    return NextResponse.json({ ok: false, processed: true, job_id: claimed.id, error: message }, { status: 502 });
  }
}
