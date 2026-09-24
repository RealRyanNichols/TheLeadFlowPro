import { createHmac, timingSafeEqual } from "node:crypto";
import { NextResponse } from "next/server";
import { createSocialServiceClient, getMetaOAuthCredentials } from "@/lib/social-server";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

function safeEqual(left: string, right: string) {
  const a = Buffer.from(left);
  const b = Buffer.from(right);
  return a.length === b.length && timingSafeEqual(a, b);
}

export async function GET(request: Request) {
  const url = new URL(request.url);
  const mode = url.searchParams.get("hub.mode");
  const token = url.searchParams.get("hub.verify_token") || "";
  const challenge = url.searchParams.get("hub.challenge") || "";
  const expected = process.env.META_WEBHOOK_VERIFY_TOKEN || "";
  if (mode === "subscribe" && expected && safeEqual(token, expected)) {
    return new Response(challenge, { status: 200 });
  }
  return NextResponse.json({ error: "Webhook verification failed." }, { status: 403 });
}

export async function POST(request: Request) {
  const raw = await request.text();
  const sb = createSocialServiceClient();
  if (!sb) return NextResponse.json({ error: "Server database access is not configured." }, { status: 503 });
  const { appSecret } = await getMetaOAuthCredentials(sb);
  const signature = request.headers.get("x-hub-signature-256") || "";
  const expected = appSecret ? `sha256=${createHmac("sha256", appSecret).update(raw).digest("hex")}` : "";
  if (!expected || !safeEqual(signature, expected)) {
    return NextResponse.json({ error: "Invalid webhook signature." }, { status: 401 });
  }

  const payload = JSON.parse(raw) as {
    entry?: Array<{
      messaging?: Array<{ sender?: { id?: string }; timestamp?: number; message?: { mid?: string; text?: string; is_echo?: boolean } }>;
      changes?: Array<{ field?: string; value?: Record<string, any> }>;
    }>;
  };
  let imported = 0;

  for (const entry of payload.entry ?? []) {
    for (const event of entry.messaging ?? []) {
      if (!event.sender?.id || !event.message?.mid || !event.message.text || event.message.is_echo) continue;
      const at = event.timestamp ? new Date(event.timestamp).toISOString() : new Date().toISOString();
      const { data: thread } = await sb.from("content_threads").upsert({
        platform: "facebook",
        thread_type: "dm",
        external_thread_id: event.sender.id,
        author_handle: event.sender.id,
        status: "open",
        unread_count: 1,
        last_message_at: at,
        metadata: { sender_id: event.sender.id },
      }, { onConflict: "platform,external_thread_id" }).select("id").single();
      if (!thread) continue;
      const { error } = await sb.from("content_messages").upsert({
        thread_id: thread.id,
        external_message_id: event.message.mid,
        direction: "inbound",
        body: event.message.text,
        status: "received",
        created_at: at,
      }, { onConflict: "thread_id,external_message_id", ignoreDuplicates: true });
      if (!error) imported += 1;
    }

    for (const change of entry.changes ?? []) {
      const value = change.value ?? {};
      if (change.field !== "feed" || value.item !== "comment" || !value.comment_id || !value.message) continue;
      const at = value.created_time ? new Date(Number(value.created_time) * 1000).toISOString() : new Date().toISOString();
      const { data: thread } = await sb.from("content_threads").upsert({
        platform: "facebook",
        thread_type: "comment",
        external_thread_id: String(value.comment_id),
        external_parent_id: value.parent_id ? String(value.parent_id) : null,
        external_url: value.permalink_url || null,
        subject: value.post_id ? `Comment on ${value.post_id}` : "Facebook comment",
        author_name: value.from?.name || null,
        author_handle: value.from?.id || null,
        status: "open",
        unread_count: 1,
        last_message_at: at,
        metadata: { post_id: value.post_id || null },
      }, { onConflict: "platform,external_thread_id" }).select("id").single();
      if (!thread) continue;
      const { error } = await sb.from("content_messages").upsert({
        thread_id: thread.id,
        external_message_id: String(value.comment_id),
        direction: "inbound",
        body: String(value.message),
        author_name: value.from?.name || null,
        status: "received",
        created_at: at,
      }, { onConflict: "thread_id,external_message_id", ignoreDuplicates: true });
      if (!error) imported += 1;
    }
  }

  if (imported) await sb.from("content_activity_events").insert({
    kind: "webhook.received",
    entity_type: "message",
    summary: `Imported ${imported} Facebook message${imported === 1 ? "" : "s"}.`,
    details: { imported },
  });
  return NextResponse.json({ received: true, imported });
}
