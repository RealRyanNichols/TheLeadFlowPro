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
  // The copy rule covers what a visitor reads. The shared metadata helper
  // joins titles with a dash in alt text, which is not this page's copy.
  const visible = await page.evaluate(() => document.body.innerText);
  expect(visible).not.toMatch(/[—–]/);
  const html = await page.content();
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

// The consent page carries the site's no-referrer policy, and under it Chrome
// sends "Origin: null" on a real form post. A stand-in consent page on the
// app's own origin, clicked by a real browser, sends the genuine headers.
// Without a session the route sends the browser to log in; the bug this
// guards against was a 403 "Cross-site approval" before anything else.
const CONSENT_PROBE = `<!doctype html><html><head><meta name="referrer" content="no-referrer"></head><body>
<form method="post" action="/api/hq/oauth/approve"><input type="hidden" name="nonce" value="probe"><button id="go" type="submit">Connect Claude</button></form></body></html>`;

test("the Connect button's real browser post is not mistaken for another site's", async ({ page, baseURL }) => {
  await page.route(`${baseURL}/__consent-probe`, (route) => route.fulfill({ contentType: "text/html", body: CONSENT_PROBE }));
  await page.goto(`${baseURL}/__consent-probe`);
  const [response] = await Promise.all([
    page.waitForResponse((r) => r.url().endsWith("/api/hq/oauth/approve") && r.request().method() === "POST"),
    page.click("#go"),
  ]);
  expect(response.status()).toBe(303);
  expect(response.headers()["location"]).toContain("/login");
  await expect(page).toHaveURL(/\/login/);
});

test("the same button on another origin is refused", async ({ page, baseURL }) => {
  // 127.0.0.1 and localhost are different origins for the browser, and the
  // same dev server answers both.
  const foreign = "http://127.0.0.1:3000/__attacker";
  await page.route(foreign, (route) => route.fulfill({ contentType: "text/html", body: CONSENT_PROBE.replace('action="/api/hq/oauth/approve"', `action="${baseURL}/api/hq/oauth/approve"`) }));
  await page.goto(foreign);
  const [response] = await Promise.all([
    page.waitForResponse((r) => r.url().endsWith("/api/hq/oauth/approve") && r.request().method() === "POST"),
    page.click("#go"),
  ]);
  expect(response.status()).toBe(403);
  expect(await response.text()).toContain("Cross-site approval");
});

test("HQ and the inbound doors are closed without credentials", async ({ page, request }) => {
  await page.goto("/hq");
  await expect(page).toHaveURL(/\/login\?next=%2Fhq/);
  const lead = await request.post("/api/hq/in/lfpin_notarealtokenatallxxxxxxxxxxx/lead", { data: { name: "Probe" } });
  expect(lead.ok()).toBe(false);
  const manage = await request.post("/api/hq", { data: { action: "add_lead", name: "Probe" } });
  expect(manage.status()).toBe(401);
});
