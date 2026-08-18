import { NextResponse } from "next/server";
import {
  cancelFacebookPost,
  inspectFacebookConnection,
  metaErrorDetails,
  publishFacebookPost,
} from "@/lib/meta-publishing";
import {
  FACEBOOK_GRAPH_VERSION,
  SOCIAL_TIMEZONE,
  validDailySlots,
  validateSocialPostInput,
} from "@/lib/social";
import {
  SOCIAL_PAGE_ID,
  createSocialServiceClient,
  getFacebookSourceToken,
  getSocialCredentialStatus,
  requireSocialAdmin,
  type SocialAdminContext,
  type SocialServiceClient,
} from "@/lib/social-server";

export const runtime = "nodejs";

const REPO = "RealRyanNichols/TheLeadFlowPro";

type SocialPostRow = {
  id: string;
  page_id: string;
  status: string;
  message: string;
  media_type: "text" | "link" | "photo" | "video";
  media_url: string | null;
  link_url: string | null;
  content_pillar: string | null;
  campaign: string | null;
  internal_notes: string | null;
  scheduled_for: string | null;
  timezone: string;
  source: "manual" | "chatgpt" | "import" | "api";
  approval_queue_id: string | null;
  meta_object_id: string | null;
  meta_post_id: string | null;
  publish_attempts: number;
};

async function loadState(sb: SocialServiceClient) {
  const [{ data: posts }, { data: settings }, { data: connection }, credentialStatus] = await Promise.all([
    sb.from("social_posts").select("*").order("created_at", { ascending: false }).limit(200),
    sb.from("social_schedule_settings").select("*").eq("singleton", true).maybeSingle(),
    sb.from("social_connections").select("*").eq("provider", "facebook").eq("page_id", SOCIAL_PAGE_ID).maybeSingle(),
    getSocialCredentialStatus(sb),
  ]);
  return {
    posts: posts ?? [],
    settings: settings ?? null,
    connection: connection ?? null,
    credential_status: credentialStatus,
  };
}

function approvalPayload(post: SocialPostRow) {
  return {
    social_post_id: post.id,
    provider: "facebook",
    page_id: post.page_id,
    media_type: post.media_type,
    scheduled_for: post.scheduled_for,
    message_preview: post.message.slice(0, 240),
  };
}

async function ensureApproval(
  sb: SocialServiceClient,
  post: SocialPostRow,
) {
  if (post.approval_queue_id) {
    const { data, error } = await sb
      .from("approval_queue")
      .update({
        status: "needs_approval",
        payload_json: approvalPayload(post),
        result_json: {},
        approval_required: true,
      })
      .eq("id", post.approval_queue_id)
      .select("id")
      .single();
    if (!error && data) return data.id as string;
  }

  const { data, error } = await sb
    .from("approval_queue")
    .insert({
      repo: REPO,
      branch: "main",
      source_agent: post.source === "chatgpt" ? "chatgpt" : "leadflow-admin",
      target_agent: "meta-facebook-page",
      status: "needs_approval",
      payload_json: approvalPayload(post),
      result_json: {},
      approval_required: true,
    })
    .select("id")
    .single();
  if (error || !data) throw new Error(error?.message || "Could not create approval record.");
  return data.id as string;
}

async function attempt(
  sb: SocialServiceClient,
  values: {
    postId: string;
    action: "verify" | "schedule" | "publish" | "cancel";
    status: "started" | "succeeded" | "failed";
    userId: string;
    httpStatus?: number | null;
    code?: string | null;
    subcode?: string | null;
    traceId?: string | null;
    summary?: Record<string, unknown>;
  },
) {
  await sb.from("social_publish_attempts").insert({
    social_post_id: values.postId,
    action: values.action,
    status: values.status,
    http_status: values.httpStatus ?? null,
    meta_error_code: values.code ?? null,
    meta_error_subcode: values.subcode ?? null,
    meta_trace_id: values.traceId ?? null,
    summary_json: values.summary ?? {},
    created_by: values.userId,
  });
}

async function approveOne(
  sb: SocialServiceClient,
  postId: string,
  admin: SocialAdminContext,
) {
  const { data } = await sb.from("social_posts").select("*").eq("id", postId).single();
  const post = data as SocialPostRow | null;
  if (!post) return { id: postId, ok: false, error: "Post not found." };
  if (["scheduled", "published", "cancelled"].includes(post.status)) {
    return { id: postId, ok: false, error: `Post is already ${post.status}.` };
  }

  const validation = validateSocialPostInput(post);
  if (!validation.ok) {
    return { id: postId, ok: false, error: validation.errors.join(" ") };
  }

  const queueId = await ensureApproval(sb, post);
  const approvedAt = new Date().toISOString();
  await Promise.all([
    sb
      .from("approval_queue")
      .update({ status: "approved", approval_required: false })
      .eq("id", queueId),
    sb
      .from("social_posts")
      .update({
        status: "approved",
        approval_queue_id: queueId,
        approved_by: admin.user.id,
        approved_at: approvedAt,
        last_error: null,
      })
      .eq("id", post.id),
  ]);

  const sourceToken = await getFacebookSourceToken(sb);
  const action = post.scheduled_for ? "schedule" : "publish";
  await attempt(sb, {
    postId: post.id,
    action,
    status: "started",
    userId: admin.user.id,
    summary: { scheduled_for: post.scheduled_for, media_type: post.media_type },
  });

  try {
    const result = await publishFacebookPost({
      pageId: post.page_id,
      sourceToken,
      message: validation.value.message,
      mediaType: validation.value.media_type,
      mediaUrl: validation.value.media_url,
      linkUrl: validation.value.link_url,
      scheduledFor: validation.value.scheduled_for,
    });
    const now = new Date().toISOString();
    const nextStatus = result.mode === "schedule" ? "scheduled" : "published";
    await Promise.all([
      sb
        .from("social_posts")
        .update({
          status: nextStatus,
          meta_object_id: result.objectId,
          meta_post_id: result.postId,
          meta_permalink: result.permalink,
          publish_attempts: (post.publish_attempts || 0) + 1,
          published_at: result.mode === "publish" ? now : null,
          last_error: null,
        })
        .eq("id", post.id),
      sb
        .from("approval_queue")
        .update({
          result_json: {
            ok: true,
            mode: result.mode,
            meta_object_id: result.objectId,
            meta_post_id: result.postId,
          },
        })
        .eq("id", queueId),
      attempt(sb, {
        postId: post.id,
        action,
        status: "succeeded",
        userId: admin.user.id,
        httpStatus: result.httpStatus,
        summary: { mode: result.mode, meta_object_id: result.objectId, meta_post_id: result.postId },
      }),
    ]);
    return { id: post.id, ok: true, status: nextStatus, meta_post_id: result.postId };
  } catch (error) {
    const details = metaErrorDetails(error);
    await Promise.all([
      sb
        .from("social_posts")
        .update({
          status: "failed",
          publish_attempts: (post.publish_attempts || 0) + 1,
          last_error: details.message,
        })
        .eq("id", post.id),
      sb
        .from("approval_queue")
        .update({ result_json: { ok: false, error: details.message } })
        .eq("id", queueId),
      attempt(sb, {
        postId: post.id,
        action,
        status: "failed",
        userId: admin.user.id,
        httpStatus: details.httpStatus,
        code: details.code,
        subcode: details.subcode,
        traceId: details.traceId,
        summary: { error: details.message },
      }),
    ]);
    return { id: post.id, ok: false, error: details.message };
  }
}

export async function GET() {
  const admin = await requireSocialAdmin();
  if (admin instanceof NextResponse) return admin;
  const sb = createSocialServiceClient();
  if (!sb) return NextResponse.json({ error: "Server database access is not configured." }, { status: 503 });
  return NextResponse.json(await loadState(sb));
}

export async function POST(request: Request) {
  const admin = await requireSocialAdmin();
  if (admin instanceof NextResponse) return admin;
  const sb = createSocialServiceClient();
  if (!sb) return NextResponse.json({ error: "SUPABASE_SERVICE_ROLE_KEY is not configured." }, { status: 503 });

  const body = (await request.json().catch(() => ({}))) as Record<string, unknown>;
  const action = String(body.action ?? "");

  if (action === "create") {
    const validation = validateSocialPostInput(body.post);
    if (!validation.ok) return NextResponse.json({ error: validation.errors.join(" ") }, { status: 400 });
    const { data, error } = await sb
      .from("social_posts")
      .insert({
        ...validation.value,
        page_id: SOCIAL_PAGE_ID,
        provider: "facebook",
        status: "draft",
        created_by: admin.user.id,
      })
      .select("*")
      .single();
    if (error) return NextResponse.json({ error: error.message }, { status: 500 });
    return NextResponse.json({ post: data });
  }

  if (action === "update") {
    const id = String(body.id ?? "");
    const { data: current } = await sb.from("social_posts").select("*").eq("id", id).single();
    if (!current) return NextResponse.json({ error: "Post not found." }, { status: 404 });
    if (!["draft", "pending_approval", "failed"].includes(current.status)) {
      return NextResponse.json({ error: "Cancel a Meta schedule before editing it." }, { status: 409 });
    }
    const validation = validateSocialPostInput(body.post);
    if (!validation.ok) return NextResponse.json({ error: validation.errors.join(" ") }, { status: 400 });
    const { data, error } = await sb
      .from("social_posts")
      .update({
        ...validation.value,
        status: current.status === "draft" ? "draft" : "pending_approval",
        last_error: null,
      })
      .eq("id", id)
      .select("*")
      .single();
    if (error || !data) return NextResponse.json({ error: error?.message || "Update failed." }, { status: 500 });
    if (data.status === "pending_approval") {
      const queueId = await ensureApproval(sb, data as SocialPostRow);
      await sb.from("social_posts").update({ approval_queue_id: queueId }).eq("id", id);
    }
    return NextResponse.json({ post: data });
  }

  if (action === "submit") {
    const id = String(body.id ?? "");
    const { data } = await sb.from("social_posts").select("*").eq("id", id).single();
    if (!data) return NextResponse.json({ error: "Post not found." }, { status: 404 });
    if (!["draft", "failed", "pending_approval"].includes(data.status)) {
      return NextResponse.json({ error: `Post is already ${data.status}.` }, { status: 409 });
    }
    const validation = validateSocialPostInput(data);
    if (!validation.ok) return NextResponse.json({ error: validation.errors.join(" ") }, { status: 400 });
    const queueId = await ensureApproval(sb, data as SocialPostRow);
    const { data: post } = await sb
      .from("social_posts")
      .update({ status: "pending_approval", approval_queue_id: queueId, last_error: null })
      .eq("id", id)
      .select("*")
      .single();
    return NextResponse.json({ post });
  }

  if (action === "approve") {
    const ids = Array.isArray(body.ids)
      ? body.ids.map(String).filter(Boolean).slice(0, 10)
      : [String(body.id ?? "")].filter(Boolean);
    if (!ids.length) return NextResponse.json({ error: "Choose at least one post." }, { status: 400 });
    const results = [];
    for (const id of ids) results.push(await approveOne(sb, id, admin));
    return NextResponse.json({ results });
  }

  if (action === "cancel") {
    const id = String(body.id ?? "");
    const { data } = await sb.from("social_posts").select("*").eq("id", id).single();
    const post = data as SocialPostRow | null;
    if (!post) return NextResponse.json({ error: "Post not found." }, { status: 404 });
    if (post.status === "published") {
      return NextResponse.json({ error: "Published posts must be handled directly on Facebook." }, { status: 409 });
    }

    const metaId = post.meta_post_id || post.meta_object_id;
    if (post.status === "scheduled" && metaId) {
      try {
        const result = await cancelFacebookPost({
          pageId: post.page_id,
          sourceToken: await getFacebookSourceToken(sb),
          metaId,
        });
        await attempt(sb, {
          postId: post.id,
          action: "cancel",
          status: "succeeded",
          userId: admin.user.id,
          httpStatus: result.httpStatus,
          summary: { meta_id: metaId },
        });
      } catch (error) {
        const details = metaErrorDetails(error);
        await attempt(sb, {
          postId: post.id,
          action: "cancel",
          status: "failed",
          userId: admin.user.id,
          httpStatus: details.httpStatus,
          code: details.code,
          subcode: details.subcode,
          traceId: details.traceId,
          summary: { error: details.message },
        });
        return NextResponse.json({ error: details.message }, { status: 502 });
      }
    }

    const cancelledAt = new Date().toISOString();
    const { data: updated } = await sb
      .from("social_posts")
      .update({ status: "cancelled", cancelled_at: cancelledAt, last_error: null })
      .eq("id", id)
      .select("*")
      .single();
    if (post.approval_queue_id) {
      await sb
        .from("approval_queue")
        .update({ status: "rejected", result_json: { cancelled: true } })
        .eq("id", post.approval_queue_id);
    }
    return NextResponse.json({ post: updated });
  }

  if (action === "verify") {
    try {
      const health = await inspectFacebookConnection(
        await getFacebookSourceToken(sb),
        SOCIAL_PAGE_ID,
      );
      const status = health.canPublish ? "connected" : "limited";
      const { data } = await sb
        .from("social_connections")
        .upsert(
          {
            provider: "facebook",
            page_id: SOCIAL_PAGE_ID,
            page_name: health.pageName,
            graph_version: health.graphVersion,
            status,
            permission_names: health.permissions,
            page_tasks: health.pageTasks,
            last_verified_at: new Date().toISOString(),
            last_error: health.canPublish
              ? null
              : "The Page is visible, but pages_manage_posts or CREATE_CONTENT was not confirmed.",
          },
          { onConflict: "provider,page_id" },
        )
        .select("*")
        .single();
      return NextResponse.json({ connection: data, source_kind: health.sourceKind });
    } catch (error) {
      const details = metaErrorDetails(error);
      const { data } = await sb
        .from("social_connections")
        .upsert(
          {
            provider: "facebook",
            page_id: SOCIAL_PAGE_ID,
            graph_version: process.env.META_GRAPH_VERSION || FACEBOOK_GRAPH_VERSION,
            status: "error",
            last_verified_at: new Date().toISOString(),
            last_error: details.message,
          },
          { onConflict: "provider,page_id" },
        )
        .select("*")
        .single();
      return NextResponse.json({ connection: data, error: details.message }, { status: 502 });
    }
  }

  if (action === "settings") {
    const slots = body.daily_slots;
    const minimum = Number(body.minimum_posts ?? 3);
    const maximum = Number(body.maximum_posts ?? 5);
    if (!validDailySlots(slots)) {
      return NextResponse.json({ error: "Use one to five times in 24-hour HH:MM format." }, { status: 400 });
    }
    if (!Number.isInteger(minimum) || !Number.isInteger(maximum) || minimum < 1 || maximum > 5 || minimum > maximum) {
      return NextResponse.json({ error: "Choose a minimum and maximum between one and five." }, { status: 400 });
    }
    const { data, error } = await sb
      .from("social_schedule_settings")
      .upsert({
        singleton: true,
        enabled: body.enabled !== false,
        timezone: SOCIAL_TIMEZONE,
        daily_slots: slots,
        minimum_posts: minimum,
        maximum_posts: maximum,
        fifth_post_optional: body.fifth_post_optional !== false,
        updated_by: admin.user.id,
      })
      .select("*")
      .single();
    if (error) return NextResponse.json({ error: error.message }, { status: 500 });
    return NextResponse.json({ settings: data });
  }

  return NextResponse.json({ error: "Unknown action." }, { status: 400 });
}
