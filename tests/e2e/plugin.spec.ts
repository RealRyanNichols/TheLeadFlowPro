import { test, expect } from "playwright/test";
import { HQ_PLAN } from "../../lib/hq/types";

// The plugin's public surface: the sales page, the discovery documents the
// connectors read, and the doors that must stay shut without credentials.
// None of these need a database or a signed-in session.

test("the sales page shows the price, the trial, and the install address", async ({ page }) => {
  await page.goto("/plugin");
  await expect(page.getByRole("heading", { level: 1 })).toBeVisible();
  await expect(page.getByText(`$${HQ_PLAN.priceUsd}`).first()).toBeVisible();
  await expect(page.getByText(new RegExp(`${HQ_PLAN.trialDays} days? free`, "i")).first()).toBeVisible();
  await expect(page.getByText("https://www.theleadflowpro.com/api/mcp").first()).toBeVisible();
  const cta = page.getByRole("link", { name: /start|trial|install/i }).first();
  await expect(cta).toBeVisible();
  const href = await cta.getAttribute("href");
  expect(href).toMatch(/\/hq\/start|\/login\?mode=signup/);
  const html = await page.content();
  expect(html).not.toMatch(/[—–]/);
  expect(html).toContain('"@type":"SoftwareApplication"');
});

test("connectors can discover the authorization server", async ({ request }) => {
  const resource = await request.get("/.well-known/oauth-protected-resource");
  expect(resource.status()).toBe(200);
  const r = await resource.json();
  expect(r.resource).toBe("https://www.theleadflowpro.com/api/mcp");
  expect(r.authorization_servers).toEqual(["https://www.theleadflowpro.com"]);

  const server = await request.get("/.well-known/oauth-authorization-server");
  expect(server.status()).toBe(200);
  const s = await server.json();
  expect(s.registration_endpoint).toBe("https://www.theleadflowpro.com/api/oauth/register");
  expect(s.code_challenge_methods_supported).toEqual(["S256"]);
});

test("the MCP endpoint refuses anonymous calls and points at the metadata", async ({ request }) => {
  const r = await request.post("/api/mcp", { data: { jsonrpc: "2.0", id: 1, method: "tools/list" } });
  expect(r.status()).toBe(401);
  expect(r.headers()["www-authenticate"]).toContain("oauth-protected-resource");
  const body = await r.json();
  expect(body.error.message).toMatch(/Unauthorized/);
  const probe = await request.get("/api/mcp");
  expect(probe.status()).toBe(405);
});

test("client registration rejects non-https redirects", async ({ request }) => {
  const r = await request.post("/api/oauth/register", { data: { client_name: "x", redirect_uris: ["http://evil.example/cb"] } });
  expect(r.status()).toBe(400);
  const body = await r.json();
  expect(body.error).toBe("invalid_client_metadata");
});

test("HQ and the inbound doors are closed without credentials", async ({ page, request }) => {
  await page.goto("/hq");
  await expect(page).toHaveURL(/\/login\?next=%2Fhq/);
  const lead = await request.post("/api/hq/in/lfpin_notarealtokenatallxxxxxxxxxxx/lead", { data: { name: "Probe" } });
  expect(lead.ok()).toBe(false);
  const manage = await request.post("/api/hq", { data: { action: "add_lead", name: "Probe" } });
  expect(manage.status()).toBe(401);
});
