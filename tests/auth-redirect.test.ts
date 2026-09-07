import { strict as assert } from "node:assert";
import { test } from "node:test";
import {
  authCallbackPath,
  authDestination,
  homeForRole,
  safeAuthNext,
} from "../lib/authRedirect.ts";
import { workspaceRedirect } from "../lib/workspaceHost.ts";

test("each existing role reaches its own workspace on the go host without a redirect loop", () => {
  for (const [role, expected] of [
    ["admin", "/admin"],
    ["sales", "/admin/sales"],
    ["client", "/dashboard"],
    [null, "/dashboard"],
  ]) {
    assert.equal(homeForRole(role), expected);
    assert.equal(workspaceRedirect(authDestination(role)), null);
  }
});

test("login preserves deep links allowed for the current role", () => {
  assert.equal(
    authDestination("admin", "/admin/leads/abc?tab=notes"),
    "/admin/leads/abc?tab=notes",
  );
  assert.equal(
    authDestination("sales", "/admin/sales/delivery"),
    "/admin/sales/delivery",
  );
  assert.equal(
    authDestination("client", "/dashboard/build-room"),
    "/dashboard/build-room",
  );
  assert.equal(
    authDestination("client", "/training/chatgpt-operator/lesson"),
    "/training/chatgpt-operator/lesson",
  );
});

test("a requested admin destination cannot route a client or staff member into an inaccessible loop", () => {
  assert.equal(
    authDestination("client", "/admin/sales/delivery"),
    "/dashboard",
  );
  assert.equal(authDestination("sales", "/admin"), "/admin/sales");
  assert.equal(authDestination("sales", "/admin/settings"), "/admin/sales");
  assert.equal(authDestination("client", "/sales/delivery"), "/dashboard");
});

test("auth destinations reject external redirects and authentication loops", () => {
  for (const value of [
    "https://evil.test",
    "//evil.test",
    "/\\evil.test",
    "/%2fevil.test",
    "/%5cevil.test",
    "/\nevil.test",
    "/%0devil.test",
    "/login",
    "/login?next=/admin",
    "/auth/signout",
    "/logout",
    "/%ZZ",
  ]) {
    assert.equal(safeAuthNext(value), null, value);
    assert.equal(authDestination("admin", value), "/admin", value);
  }
});

test("email links finish through a same-origin callback before entering protected pages", () => {
  assert.equal(authCallbackPath(), "/auth/callback");
  assert.equal(
    authCallbackPath("/admin/sales/delivery"),
    "/auth/callback?next=%2Fadmin%2Fsales%2Fdelivery",
  );
  assert.equal(
    authCallbackPath("/account/password"),
    "/auth/callback?next=%2Faccount%2Fpassword",
  );
  assert.equal(authCallbackPath("//evil.test"), "/auth/callback");
});
