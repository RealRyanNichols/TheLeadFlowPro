import type { ChannelConnection, ContentThread } from "./types";

export function facebookReplyCapabilities(
  permissionNames: readonly string[] | null | undefined,
): string[] {
  const permissions = new Set(Array.isArray(permissionNames) ? permissionNames : []);
  const capabilities: string[] = [];
  if (
    permissions.has("pages_manage_engagement") &&
    permissions.has("pages_read_engagement") &&
    permissions.has("pages_read_user_content")
  ) capabilities.push("comment");
  if (permissions.has("pages_messaging")) capabilities.push("reply");
  return capabilities;
}

/** Saved channel labels cannot substitute for the verified Facebook grant. */
export function withFacebookReplyPermissions(
  connection: ChannelConnection,
  permissionNames: readonly string[] | null | undefined,
): ChannelConnection {
  const granted = Array.isArray(permissionNames) ? [...permissionNames] : [];
  return {
    ...connection,
    permission_names: granted,
    capabilities: [
      ...connection.capabilities.filter((capability) => !["comment", "reply"].includes(capability)),
      ...facebookReplyCapabilities(granted),
    ],
  };
}

export function getReplyReadiness(
  connection: ChannelConnection | undefined,
  threadType: ContentThread["thread_type"],
): { canReply: boolean; reason: string | null } {
  const needed = threadType === "dm" ? "reply" : "comment";
  if (!connection || connection.status !== "connected") {
    return {
      canReply: false,
      reason: connection?.last_error || "Connect this channel before sending a reply.",
    };
  }
  if (
    connection.platform === "facebook" &&
    !facebookReplyCapabilities(connection.permission_names).includes(needed)
  ) {
    return {
      canReply: false,
      reason: threadType === "dm"
        ? "Connect Facebook with Messenger access before sending this reply."
        : "Connect Facebook with comment read and reply access before sending this reply.",
    };
  }
  if (!connection.capabilities.includes(needed)) {
    return { canReply: false, reason: connection.last_error || "This channel does not have reply access." };
  }
  return { canReply: true, reason: null };
}
