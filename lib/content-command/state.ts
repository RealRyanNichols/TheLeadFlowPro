import "server-only";

import type { SupabaseClient } from "@supabase/supabase-js";
import { CONTENT_PLATFORMS, type ContentCommandState, type ContentPlatform } from "./types";

const emptyConnections = CONTENT_PLATFORMS.map((platform) => ({
  id: platform,
  platform,
  status: "not_connected",
  display_name: null,
  capabilities: [],
  last_verified_at: null,
  last_error: `No authenticated ${platform === "x" ? "X" : platform} publishing connection is configured.`,
}));

export function emptyContentCommandState(error?: string): ContentCommandState {
  return {
    ready: !error,
    ...(error ? { schemaError: error } : {}),
    artifacts: [],
    activeArtifactId: null,
    units: [],
    variants: [],
    connections: emptyConnections,
    templates: [],
    threads: [],
    messages: [],
    activity: [],
  };
}

export async function loadContentCommandState(
  sb: SupabaseClient<any>,
  requestedArtifactId?: string | null,
): Promise<ContentCommandState> {
  const artifactResult = await sb
    .from("content_artifacts")
    .select("id,artifact_date,title,status,timezone,notion_page_url,unit_count,channel_blockers,verification,last_synced_at,created_at")
    .order("artifact_date", { ascending: false })
    .limit(45);

  if (artifactResult.error) {
    return emptyContentCommandState(
      artifactResult.error.code === "42P01"
        ? "The Content Command Center database migration has not been applied yet."
        : artifactResult.error.message,
    );
  }

  const artifacts = artifactResult.data ?? [];
  const activeArtifactId =
    artifacts.find((item) => item.id === requestedArtifactId)?.id ?? artifacts[0]?.id ?? null;

  const [unitsResult, connectionsResult, templatesResult, threadsResult, activityResult] =
    await Promise.all([
      activeArtifactId
        ? sb.from("content_units").select("*").eq("artifact_id", activeArtifactId).order("position")
        : Promise.resolve({ data: [], error: null }),
      sb.from("content_channel_connections").select("*").order("platform"),
      sb.from("content_reply_templates").select("*").eq("is_active", true).order("sort_order"),
      sb.from("content_threads").select("*").order("last_message_at", { ascending: false }).limit(100),
      sb.from("content_activity_events").select("id,kind,entity_type,entity_id,summary,created_at").order("created_at", { ascending: false }).limit(100),
    ]);

  const units = unitsResult.data ?? [];
  const unitIds = units.map((unit) => unit.id);
  const threadIds = (threadsResult.data ?? []).map((thread) => thread.id);
  const [variantsResult, messagesResult, facebookResult] = await Promise.all([
    unitIds.length
      ? sb.from("content_variants").select("*").in("unit_id", unitIds).order("platform")
      : Promise.resolve({ data: [], error: null }),
    threadIds.length
      ? sb.from("content_messages").select("*").in("thread_id", threadIds).order("created_at", { ascending: true }).limit(500)
      : Promise.resolve({ data: [], error: null }),
    sb.from("social_connections").select("page_name,status,permission_names,page_tasks,last_verified_at,last_error").eq("provider", "facebook").maybeSingle(),
  ]);

  const saved = new Map<ContentPlatform, any>(
    (connectionsResult.data ?? []).map((connection) => [connection.platform as ContentPlatform, connection]),
  );
  const facebook = facebookResult.data;
  if (facebook && !saved.get("facebook")?.last_verified_at) {
    const capabilities = [
      ...(facebook.permission_names?.includes("pages_manage_posts") ? ["publish"] : []),
      ...(facebook.permission_names?.includes("pages_manage_engagement") ? ["comment", "reply"] : []),
      ...((facebook.page_tasks ?? []).some((task: string) => ["CREATE_CONTENT", "MANAGE"].includes(task)) ? ["publish"] : []),
    ];
    saved.set("facebook", {
      id: "legacy-facebook",
      platform: "facebook",
      status: capabilities.includes("publish") ? "connected" : facebook.status || "limited",
      display_name: facebook.page_name,
      capabilities: [...new Set(capabilities)],
      last_verified_at: facebook.last_verified_at,
      last_error: facebook.last_error,
    });
  }

  return {
    ready: true,
    artifacts,
    activeArtifactId,
    units,
    variants: variantsResult.data ?? [],
    connections: CONTENT_PLATFORMS.map(
      (platform) => saved.get(platform) ?? emptyConnections.find((item) => item.platform === platform)!,
    ),
    templates: templatesResult.data ?? [],
    threads: threadsResult.data ?? [],
    messages: messagesResult.data ?? [],
    activity: activityResult.data ?? [],
  };
}
