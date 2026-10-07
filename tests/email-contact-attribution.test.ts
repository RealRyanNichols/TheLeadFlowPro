import test from "node:test";
import assert from "node:assert/strict";
import { sanitizeCampaignAttribution } from "../lib/analytics/attribution.ts";
import { serverEventRow } from "../lib/analytics/serverEvent.ts";
import { persistAnalyticsBatch, persistServerEvent } from "../lib/analytics/persistence.ts";

test("existing lead conversion preserves the email button label", () => {
  const tags = sanitizeCampaignAttribution({ utm_source: "resend", utm_medium: "email", utm_campaign: "my-voice-results-20261006", utm_content: "call-bottom" });
  assert.equal(tags.utm_content, "call-bottom");
  const row = serverEventRow(new Request("https://www.theleadflowpro.com/api/leads", {
    headers: { referer: "https://www.theleadflowpro.com/contact?utm_content=call-bottom", cookie: "lfp_vid=anonvisitor123test; lfp_sid=9d232e1c-194f-416b-9308-c91b32b3f2fb; lfp_int=1" },
  }), { event_name: "lead_submit", label: "lead", ...tags });
  assert.ok(row);
  assert.equal(row.utm_content, "call-bottom");
  assert.equal(row.source_family, "email");
  assert.equal(row.path, "/contact");
  assert.equal(row.is_internal, true);
});

test("attribution ignores identity fields and contact-shaped values", () => {
  assert.deepEqual(sanitizeCampaignAttribution({
    utm_source: "resend", utm_medium: "email", utm_content: "owner@example.com",
    utm_campaign: "903-500-8898", visitor_email: "private@example.com", body: "private content",
  }), { utm_source: "resend", utm_medium: "email" });
  assert.deepEqual(sanitizeCampaignAttribution({ utm_content: "owner%40example.com", utm_campaign: "9d232e1c-194f-416b-9308-c91b32b3f2fb" }), {});
  assert.deepEqual(sanitizeCampaignAttribution({ utm_content: "x".repeat(101), utm_source: ["resend"] }), {});
});

test("server conversion excludes private paths, cookies, query strings and submitted details", () => {
  const make = (referer: string) => new Request("https://www.theleadflowpro.com/api/leads", { headers: { referer, cookie: "lfp_vid=private%40example.com; lfp_sid=%ZZ" } });
  assert.equal(serverEventRow(make("https://www.theleadflowpro.com/admin/messages"), { event_name: "lead_submit" }), null);
  const row = serverEventRow(make("https://www.theleadflowpro.com/contact?utm_source=resend"), {
    event_name: "lead_submit", meta: { email: "private@example.com", body: "private content", approved: true },
  });
  assert.ok(row);
  assert.equal(row.path, "/contact");
  assert.equal(row.visitor_id, null);
  assert.equal(row.session_id, null);
  assert.deepEqual(row.meta, { approved: true });
  assert.equal(JSON.stringify(row).includes("private"), false);
});

test("browser reporting rejects two failed writes instead of false success", async () => {
  let mirror = 0;
  const result = await persistAnalyticsBatch({
    upsertEvents: async () => ({ error: "upsert failed" }),
    insertEvents: async () => ({ error: "insert failed" }),
    insertPageViews: async () => { mirror++; return { error: null }; },
  }, [{ client_id: "stable-id" }], [{ path: "/" }]);
  assert.deepEqual(result, { saved: false, pageViewsSaved: false });
  assert.equal(mirror, 0);
});

test("fallback success and mirror failure are reported separately", async () => {
  let fallback = 0;
  const result = await persistAnalyticsBatch({
    upsertEvents: async () => ({ error: "legacy constraint" }),
    insertEvents: async () => { fallback++; return { error: null }; },
    insertPageViews: async () => ({ error: "mirror unavailable" }),
  }, [{ client_id: "stable-id" }], [{ path: "/" }]);
  assert.deepEqual(result, { saved: true, pageViewsSaved: false });
  assert.equal(fallback, 1);
});

test("conversion storage errors are best effort and reveal no provider error details", async () => {
  assert.equal(await persistServerEvent({}, async () => ({ error: "private database details" })), false);
  assert.equal(await persistServerEvent({}, async () => { throw new Error("private"); }), false);
  assert.equal(await persistServerEvent({}, async () => ({ error: null })), true);
});
