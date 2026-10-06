import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  facebookReplyCapabilities,
  getReplyReadiness,
  withFacebookReplyPermissions,
} from "../lib/content-command/facebook-permissions.ts";
import { buildMetaAuthorizationUrl } from "../lib/meta-oauth.ts";
import type { ChannelConnection } from "../lib/content-command/types.ts";

const commentPermissions = [
  "pages_manage_engagement",
  "pages_read_engagement",
  "pages_read_user_content",
];
function connection(overrides: Partial<ChannelConnection> = {}): ChannelConnection {
  return {
    id: "facebook",
    platform: "facebook",
    status: "connected",
    display_name: "LeadFlow",
    capabilities: ["publish", "comment", "reply"],
    last_verified_at: "2026-10-06T03:41:19Z",
    last_error: null,
    ...overrides,
  };
}

describe("Facebook comment and Messenger authorization", () => {
  it("cannot queue a Messenger reply with comment permissions or a stale reply label", () => {
    const current = connection({ permission_names: commentPermissions });
    assert.equal(getReplyReadiness(current, "comment").canReply, true);
    assert.equal(getReplyReadiness(current, "dm").canReply, false);
    assert.match(getReplyReadiness(current, "dm").reason || "", /Messenger access/);
  });

  it("Messenger authorization does not grant comment moderation", () => {
    const current = withFacebookReplyPermissions(connection(), ["pages_messaging"]);
    assert.deepEqual(current.capabilities, ["publish", "reply"]);
    assert.equal(getReplyReadiness(current, "dm").canReply, true);
    assert.equal(getReplyReadiness(current, "comment").canReply, false);
  });

  it("requires both comment read scopes as well as the write grant", () => {
    for (const missing of commentPermissions) {
      const permissions = commentPermissions.filter((permission) => permission !== missing);
      assert.equal(facebookReplyCapabilities(permissions).includes("comment"), false, missing);
      assert.equal(
        getReplyReadiness(connection({ permission_names: permissions }), "comment").canReply,
        false,
        missing,
      );
    }
  });

  it("missing grant evidence removes saved reply labels while retaining publishing", () => {
    const current = withFacebookReplyPermissions(connection(), undefined);
    assert.deepEqual(current.capabilities, ["publish"]);
    assert.deepEqual(current.permission_names, []);
    assert.equal(getReplyReadiness(current, "dm").canReply, false);
    assert.equal(getReplyReadiness(current, "comment").canReply, false);
  });

  it("supports both channels only when their separate grants are present", () => {
    const current = withFacebookReplyPermissions(connection(), [...commentPermissions, "pages_messaging"]);
    assert.equal(getReplyReadiness(current, "dm").canReply, true);
    assert.equal(getReplyReadiness(current, "comment").canReply, true);
  });

  it("does not present a disconnected or capability-limited channel as ready", () => {
    assert.equal(getReplyReadiness(
      connection({ status: "limited", permission_names: ["pages_messaging"] }),
      "dm",
    ).canReply, false);
    assert.equal(getReplyReadiness(
      connection({ capabilities: ["publish"], permission_names: ["pages_messaging"] }),
      "dm",
    ).canReply, false);
  });

  it("retains other platforms' explicit connected-channel capabilities", () => {
    assert.equal(getReplyReadiness(connection({ platform: "x", capabilities: ["reply"] }), "dm").canReply, true);
    assert.equal(getReplyReadiness(connection({ platform: "x", capabilities: ["reply"] }), "comment").canReply, false);
  });

  it("requests the existing publisher and separate comment and Messenger permissions", () => {
    const url = buildMetaAuthorizationUrl({ appId: "1595903401874517", state: "test-state" });
    const scopes = new Set((url.searchParams.get("scope") || "").split(","));
    for (const scope of [
      "pages_show_list", "pages_read_engagement", "pages_manage_posts",
      "pages_read_user_content", "pages_manage_engagement", "pages_messaging",
    ]) assert.equal(scopes.has(scope), true, scope);
    assert.equal(url.searchParams.has("access_token"), false);
    assert.equal(url.searchParams.has("client_secret"), false);
  });
});
