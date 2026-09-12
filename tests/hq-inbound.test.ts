// Inbound parsing: the shapes OpenPhone, Twilio, and Meta actually send,
// and the management dispatcher's guard rails that need no database.

import { test, describe } from "node:test";
import assert from "node:assert/strict";
import { metaFieldsToLead, parseInboundSms } from "../lib/hq/inbound.ts";
import { handleManage } from "../lib/hq/manage.ts";
import { planFromSubscription, customerIdOf } from "../lib/hq/stripe.ts";
import type { Db } from "../lib/hq/server.ts";

describe("inbound sms parsing", () => {
  test("OpenPhone message.received", () => {
    const sms = parseInboundSms(
      { id: "EV1", type: "message.received", data: { object: { id: "AC123", from: "+19035550199", to: "+19035550142", text: "Do you do water heaters?", direction: "incoming" } } },
      "application/json",
    );
    assert.deepEqual(sms, { from: "+19035550199", to: "+19035550142", body: "Do you do water heaters?", providerId: "AC123", provider: "openphone" });
  });

  test("OpenPhone events that are not inbound messages are ignored", () => {
    assert.equal(parseInboundSms({ type: "message.delivered", data: { object: { from: "+1903", text: "x" } } }, "application/json"), null);
    assert.equal(parseInboundSms({ type: "message.received", data: { object: {} } }, "application/json"), null);
  });

  test("Twilio inbound form", () => {
    const raw = new URLSearchParams({ From: "+19035550199", To: "+19035550142", Body: "STOP", MessageSid: "SM1" }).toString();
    const sms = parseInboundSms(raw, "application/x-www-form-urlencoded");
    assert.deepEqual(sms, { from: "+19035550199", to: "+19035550142", body: "STOP", providerId: "SM1", provider: "twilio" });
  });
});

describe("meta lead fields", () => {
  test("common field names map to a lead", () => {
    const f = metaFieldsToLead([
      { name: "full_name", values: ["Jamie Rivera"] },
      { name: "phone_number", values: ["+19035550199"] },
      { name: "email", values: ["Jamie@Example.com"] },
      { name: "what_do_you_need", values: ["Hay cutting"] },
      { name: "when_do_you_want_it_done", values: ["This week"] },
    ]);
    assert.equal(f.name, "Jamie Rivera");
    assert.equal(f.phone, "+19035550199");
    assert.equal(f.email, "jamie@example.com");
    assert.equal(f.service, "Hay cutting");
    assert.match(f.message ?? "", /when do you want it done: This week/);
    assert.deepEqual(Object.keys(f.extra), ["what_do_you_need", "when_do_you_want_it_done"]);
  });

  test("first and last name combine and markup is stripped", () => {
    const f = metaFieldsToLead([
      { name: "first_name", values: ["<b>Sam</b>"] },
      { name: "last_name", values: ["Tate"] },
    ]);
    assert.equal(f.name, "Sam");
    assert.equal(f.phone, null);
  });
});

describe("stripe plan mapping", () => {
  test("statuses fold into plans", () => {
    assert.equal(planFromSubscription({ status: "trialing", trial_end: 1_800_000_000 }).plan, "trial");
    assert.equal(planFromSubscription({ status: "active" }).plan, "active");
    assert.equal(planFromSubscription({ status: "past_due" }).plan, "past_due");
    assert.equal(planFromSubscription({ status: "unpaid" }).plan, "past_due");
    assert.equal(planFromSubscription({ status: "canceled" }).plan, "canceled");
    assert.equal(planFromSubscription({ status: "incomplete" }).plan, "none");
    assert.equal(planFromSubscription({ status: "trialing", trial_end: 1_800_000_000 }).trial_ends_at, new Date(1_800_000_000 * 1000).toISOString());
    assert.equal(customerIdOf({ customer: "cus_1" }), "cus_1");
    assert.equal(customerIdOf({ customer: { id: "cus_2" } }), "cus_2");
    assert.equal(customerIdOf({}), null);
  });
});

describe("management guard rails", () => {
  const ctx = { db: {} as Db, user: { id: "u1", email: "o@x.com" }, workspace: null, now: new Date() };

  test("unknown actions and missing workspaces are refused before any query", async () => {
    assert.equal((await handleManage({ action: "nope" }, ctx)).status, 404);
    assert.equal((await handleManage({ action: "add_lead", name: "X" }, ctx)).status, 409);
    assert.equal((await handleManage({ action: "checkout" }, ctx)).status, 409);
    assert.equal((await handleManage(null, ctx)).status, 404);
  });

  test("creating a workspace needs a name", async () => {
    const r = await handleManage({ action: "create_workspace", name: "   " }, ctx);
    assert.equal(r.status, 400);
    assert.match(String(r.body.error), /name/);
  });
});

describe("inbound abuse controls", () => {
  test("honeypots, redirects, and Twilio signatures", async () => {
    const { isHoneypotHit, safeFormRedirect, twilioSignatureOk, inboundAllowed } = await import("../lib/hq/inbound.ts");
    const { workspace } = await import("./hq-engine.test.ts");
    const crypto = await import("node:crypto");
    assert.equal(isHoneypotHit({ name: "x", _hp: "filled" }), true);
    assert.equal(isHoneypotHit({ name: "x", _hp: "" }), false);
    const ws = workspace({ website: "https://kirbyplumbing.com" });
    assert.equal(safeFormRedirect("https://www.kirbyplumbing.com/thanks", ws), "https://www.kirbyplumbing.com/thanks");
    assert.match(safeFormRedirect("https://evil.example/phish", ws), /theleadflowpro\.com\/hq\/thanks/);
    assert.match(safeFormRedirect("javascript:alert(1)", ws), /hq\/thanks/);
    const url = "https://www.theleadflowpro.com/api/hq/in/lfpin_x/sms";
    const params = { From: "+19035550199", Body: "hi" };
    const sig = crypto.createHmac("sha1", "tok").update(`${url}BodyhiFrom+19035550199`).digest("base64");
    assert.equal(twilioSignatureOk("tok", url, params, sig), true);
    assert.equal(twilioSignatureOk("wrong", url, params, sig), false);
    assert.equal(twilioSignatureOk("tok", url, params, null), false);
    let allowed = 0;
    for (let i = 0; i < 70; i++) if (inboundAllowed("ws-limit")) allowed++;
    assert.equal(allowed, 60);
  });
});
