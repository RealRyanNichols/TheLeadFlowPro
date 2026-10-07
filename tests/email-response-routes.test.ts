import test, { type TestContext } from "node:test";
import assert from "node:assert/strict";
import { createHmac, randomBytes } from "node:crypto";
import { register } from "node:module";

// The existing TS test hook covers aliases; this resolves only Next's server entry.
register("./fixtures/next-server-hook.mjs", import.meta.url);
const { POST: resendHook } = await import("../app/api/webhooks/resend/route.ts");
const { POST: track } = await import("../app/api/track/route.ts");
const messageId = "52fc582f-f59b-4f48-9b08-fb5fc7195f06";
const providerId = "cd3c5cab-1858-411c-8c2f-386ad815f5b9";

function env(t: TestContext, values: Record<string, string>) {
  for (const [name, value] of Object.entries(values)) {
    const previous = process.env[name];
    process.env[name] = value;
    t.after(() => {
      if (previous === undefined) delete process.env[name];
      else process.env[name] = previous;
    });
  }
}
function signedBounce(key: Buffer, valid = true) {
  const body = JSON.stringify({ type: "email.bounced", data: {
    email_id: providerId, bounce: { type: "Permanent", message: "private recipient failure details" },
    tags: [{ name: "contact_message_id", value: messageId }],
  } });
  const timestamp = String(Math.floor(Date.now() / 1000));
  const signature = createHmac("sha256", key).update(`test-hook.${timestamp}.${body}`).digest("base64");
  return new Request("https://www.theleadflowpro.com/api/webhooks/resend", {
    method: "POST", body, headers: {
      "svix-id": "test-hook", "svix-timestamp": timestamp,
      "svix-signature": valid ? `v1,${signature}` : "v1,AAAA",
    },
  });
}
function logs(t: TestContext) {
  const lines: unknown[][] = [];
  t.mock.method(console, "error", (...args: unknown[]) => { lines.push(args); });
  return lines;
}

test("signed contact-bounce storage failure returns retryable 500, without outbound sending or private logs", async (t) => {
  const key = randomBytes(24);
  env(t, { RESEND_WEBHOOK_SECRET: `whsec_${key.toString("base64")}`, SUPABASE_SERVICE_ROLE_KEY: "test-database-key" });
  const lines = logs(t);
  let calls = 0;
  t.mock.method(globalThis, "fetch", async (input: unknown, options: RequestInit) => {
    const url = String(input);
    assert.match(url, /\.supabase\.co\/rest\/v1\/contact_notifications\?/);
    calls++;
    if (options.method === "GET") return Response.json({ message_id: messageId, provider_message_id: providerId, status: "sent", attempt_count: 2 });
    assert.equal(options.method, "PATCH");
    assert.deepEqual(JSON.parse(String(options.body)), {
      status: "failed", last_error: "Owner alert permanently bounced. Inquiry is saved; check the destination and follow up in the private inbox.",
    });
    return Response.json({ message: "private database details", code: "test_failure" }, { status: 500 });
  });
  const response = await resendHook(signedBounce(key));
  assert.equal(response.status, 500);
  assert.deepEqual(await response.json(), { error: "storage failed" });
  assert.equal(calls, 2);
  assert.deepEqual(lines, [["Resend webhook storage failed"]]);
});

test("bad signed contact-bounce request touches no storage or send API", async (t) => {
  const key = randomBytes(24);
  env(t, { RESEND_WEBHOOK_SECRET: `whsec_${key.toString("base64")}`, SUPABASE_SERVICE_ROLE_KEY: "test-database-key" });
  let calls = 0;
  t.mock.method(globalThis, "fetch", async () => { calls++; throw new Error("No network is permitted"); });
  assert.equal((await resendHook(signedBounce(key, false))).status, 401);
  assert.equal(calls, 0);
});

function trackingRequest() {
  return new Request("https://www.theleadflowpro.com/api/track", {
    method: "POST", headers: { "content-type": "application/json", "user-agent": "Mozilla/5.0 Chrome/130.0 Safari/537.36" },
    body: JSON.stringify({ events: [{ event_name: "page_view", path: "/contact", visitor_id: "owner-test-anonymous", session_id: "owner-test-session" }] }),
  });
}

test("track route returns 503 after failed primary and fallback writes, without false success or mirror write", async (t) => {
  env(t, { SUPABASE_SERVICE_ROLE_KEY: "test-database-key" });
  const lines = logs(t);
  let calls = 0;
  t.mock.method(globalThis, "fetch", async (input: unknown) => {
    assert.match(String(input), /\.supabase\.co\/rest\/v1\/analytics_events/);
    calls++;
    return Response.json({ message: "private database details", code: "test_failure" }, { status: 500 });
  });
  const response = await track(trackingRequest());
  assert.equal(response.status, 503);
  assert.deepEqual(await response.json(), { ok: false, error: "Analytics storage unavailable" });
  assert.equal(calls, 2);
  assert.deepEqual(lines, [["First-party analytics events could not be saved"]]);
});

test("track route reports existing legacy mirror failure separately from saved primary events", async (t) => {
  env(t, { SUPABASE_SERVICE_ROLE_KEY: "test-database-key" });
  const lines = logs(t);
  let calls = 0;
  t.mock.method(globalThis, "fetch", async (input: unknown) => {
    const url = String(input);
    calls++;
    if (url.includes("/analytics_events")) return new Response(null, { status: 201 });
    assert.match(url, /\.supabase\.co\/rest\/v1\/page_views/);
    return Response.json({ message: "private database details", code: "test_failure" }, { status: 500 });
  });
  const response = await track(trackingRequest());
  assert.equal(response.status, 200);
  assert.deepEqual(await response.json(), { ok: true, pageViewsSaved: false });
  assert.equal(calls, 2);
  assert.deepEqual(lines, [["Legacy page-view mirror unavailable"]]);
});

test("track route stores only safe campaign labels in both existing event pipes", async (t) => {
  env(t, { SUPABASE_SERVICE_ROLE_KEY: "test-database-key" });
  const rows: Record<string, unknown>[] = [];
  t.mock.method(globalThis, "fetch", async (_input: unknown, options: RequestInit) => {
    rows.push(...JSON.parse(String(options.body)));
    return new Response(null, { status: 201 });
  });
  const request = new Request("https://www.theleadflowpro.com/api/track", {
    method: "POST", headers: { "user-agent": "Mozilla/5.0 Chrome/130.0 Safari/537.36" },
    body: JSON.stringify({ events: [{
      event_name: "page_view", path: "/contact", visitor_id: "owner-safe-test-anonymous",
      utm_source: "resend", utm_medium: "email", utm_campaign: "903-500-8898", utm_content: "private@example.com",
    }] }),
  });
  assert.equal((await track(request)).status, 200);
  assert.equal(rows.length, 2);
  for (const row of rows) {
    assert.equal(row.utm_source, "resend");
    assert.equal(row.utm_medium, "email");
    assert.equal(row.utm_campaign, null);
    assert.equal(JSON.stringify(row).includes("private@example.com"), false);
  }
  assert.equal(rows[0].utm_content, null);
});
