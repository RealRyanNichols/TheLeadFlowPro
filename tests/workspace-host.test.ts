import { strict as assert } from "node:assert";
import { test } from "node:test";
import {
  WORKSPACE_HOME,
  isWorkspaceHost,
  workspaceRedirect,
} from "../lib/workspaceHost.ts";

test("recognises the workspace hostname in the shapes a Host header arrives in", () => {
  assert.equal(isWorkspaceHost("go.theleadflowpro.com"), true);
  assert.equal(isWorkspaceHost("GO.TheLeadFlowPro.com"), true);
  assert.equal(isWorkspaceHost("go.theleadflowpro.com:443"), true);
  assert.equal(isWorkspaceHost("go.theleadflowpro.com."), true);
  assert.equal(isWorkspaceHost(" go.theleadflowpro.com "), true);
});

test("does not treat the public site or a lookalike as the workspace", () => {
  assert.equal(isWorkspaceHost("theleadflowpro.com"), false);
  assert.equal(isWorkspaceHost("www.theleadflowpro.com"), false);
  assert.equal(isWorkspaceHost("go.theleadflowpro.com.evil.test"), false);
  assert.equal(isWorkspaceHost("nogo.theleadflowpro.com"), false);
  assert.equal(isWorkspaceHost(null), false);
  assert.equal(isWorkspaceHost(""), false);
});

test("the override only matches when it is set", () => {
  const preview = "the-lead-flow-pro-git-build-go-workspace.vercel.app";
  assert.equal(isWorkspaceHost(preview), false);
  assert.equal(isWorkspaceHost(preview, preview), true);
  assert.equal(isWorkspaceHost(preview, ""), false);
  assert.equal(isWorkspaceHost(preview, undefined), false);
});

test("the root of the workspace host lands on the delivery workspace", () => {
  assert.equal(workspaceRedirect("/"), WORKSPACE_HOME);
  assert.equal(WORKSPACE_HOME, "/admin/sales/delivery");
});

test("the workspace and its sign-in round trip pass through untouched", () => {
  for (const path of [
    "/admin/sales",
    "/admin/sales/delivery",
    "/admin/sales/invoices",
    "/admin/sales/leads/abc-123",
    "/sales/delivery",
    "/login",
    "/account/password",
    "/auth/callback",
    "/api/sales/invoices",
    "/_next/static/chunk.js",
    "/favicon.ico",
  ]) {
    assert.equal(workspaceRedirect(path), null, `${path} should pass through`);
  }
});

test("the marketing site never renders under the workspace hostname", () => {
  for (const path of [
    "/pricing",
    "/free-build",
    "/packages/launch",
    "/go/time-back",
    "/tools",
    "/connect",
    "/admin",
    "/admin/leads",
    "/dashboard",
  ]) {
    assert.equal(workspaceRedirect(path), WORKSPACE_HOME, `${path} should route to the workspace`);
  }
});

test("a prefix is a path segment, not a string prefix", () => {
  assert.equal(workspaceRedirect("/loginhelp"), WORKSPACE_HOME);
  assert.equal(workspaceRedirect("/salesletter"), WORKSPACE_HOME);
  assert.equal(workspaceRedirect("/api"), null);
});
