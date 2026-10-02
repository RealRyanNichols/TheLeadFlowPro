import assert from "node:assert/strict";
import { createHmac, randomBytes } from "node:crypto";
import { readFile } from "node:fs/promises";
import test from "node:test";
import { activityDetail, resendEventActivity, resendTags, verifyResendSignature } from "../lib/resendEvents.ts";
import { stripActivityMarkers } from "../lib/leadTimeline.ts";
import { withLeadTag } from "../lib/leadNotify.ts";

// Opens and clicks from Resend land on the lead's Back Office timeline. These
// pin the signature check (Svix scheme) and what each event becomes.

const key = randomBytes(24);
const secret = `whsec_${key.toString("base64")}`;
const now = Date.parse("2026-10-02T15:00:00Z");
const ts = String(Math.floor(now / 1000));

function sign(id: string, timestamp: string, body: string, signingKey = key) {
  return `v1,${createHmac("sha256", signingKey).update(`${id}.${timestamp}.${body}`).digest("base64")}`;
}

const EMAIL_ID = "4ef9a417-02e9-4d39-ad75-9611e0fcc33c";
const LEAD_ID = "dd7723a6-8574-4fe5-8935-6a6963e1a76e";

test("only a fresh, correctly signed body passes", () => {
  const body = JSON.stringify({ type: "email.opened" });
  assert.equal(verifyResendSignature(secret, "msg_1", ts, sign("msg_1", ts, body), body, now), true);
  // several signatures in one header, one of them right
  assert.equal(verifyResendSignature(secret, "msg_1", ts, `v1,AAAA ${sign("msg_1", ts, body)}`, body, now), true);
  assert.equal(verifyResendSignature(secret, "msg_1", ts, sign("msg_1", ts, body), `${body} `, now), false);
  assert.equal(verifyResendSignature(secret, "msg_2", ts, sign("msg_1", ts, body), body, now), false);
  assert.equal(verifyResendSignature(secret, "msg_1", ts, sign("msg_1", ts, body, randomBytes(24)), body, now), false);
  const stale = String(Math.floor(now / 1000) - 600);
  assert.equal(verifyResendSignature(secret, "msg_1", stale, sign("msg_1", stale, body), body, now), false);
  assert.equal(verifyResendSignature("", "msg_1", ts, sign("msg_1", ts, body), body, now), false);
  assert.equal(verifyResendSignature(secret, null, ts, sign("msg_1", ts, body), body, now), false);
});

test("tags arrive as an object or a list", () => {
  assert.deepEqual(resendTags({ campaign: "contractor_owner", lead_id: LEAD_ID }), { campaign: "contractor_owner", lead_id: LEAD_ID });
  assert.deepEqual(resendTags([{ name: "day", value: "02" }]), { day: "02" });
  assert.deepEqual(resendTags(null), {});
});

test("an open becomes one readable line on the right lead", () => {
  const activity = resendEventActivity({
    type: "email.opened",
    data: {
      email_id: EMAIL_ID,
      to: ["Mike@Example.com"],
      subject: "📋 Four questions before you load the truck",
      tags: { campaign: "contractor_owner", day: "02", lead_id: LEAD_ID },
    },
  });
  assert.ok(activity);
  assert.equal(activity.leadId, LEAD_ID);
  assert.equal(activity.email, "mike@example.com");
  assert.equal(activity.stopEmails, false);
  const stored = activityDetail(activity);
  assert.match(stored, /Ref open-4ef9a417-02e9-4d39-ad75-9611e0fcc33c$/);
  assert.equal(
    stripActivityMarkers(stored),
    'Opened "📋 Four questions before you load the truck" (contractor_owner, day 02).',
  );
});

test("a click names the page, and each link is its own record", () => {
  const event = (link: string) => ({
    type: "email.clicked",
    data: { email_id: EMAIL_ID, to: ["mike@example.com"], subject: "Day 1", click: { link } },
  });
  const a = resendEventActivity(event("https://www.theleadflowpro.com/contractors?utm_source=email#scott"));
  const b = resendEventActivity(event("https://calendly.com/ryan-realryannichols/straight-answer-call-20-min?utm_content=day1_book"));
  assert.ok(a && b);
  assert.match(a.detail, /^Clicked theleadflowpro\.com\/contractors#scott in "Day 1"\.$/);
  assert.match(b.detail, /^Clicked calendly\.com\/ryan-realryannichols\/straight-answer-call-20-min in "Day 1"\.$/);
  assert.notEqual(a.ref, b.ref);
  assert.match(activityDetail(a), /Ref click-[0-9a-f-]{36}-[0-9a-f]{8}$/);
});

test("spam reports and permanent bounces stop the emails; the rest is ignored", () => {
  const spam = resendEventActivity({ type: "email.complained", data: { email_id: EMAIL_ID, to: ["x@example.com"], subject: "Hi" } });
  const hard = resendEventActivity({ type: "email.bounced", data: { email_id: EMAIL_ID, to: ["x@example.com"], bounce: { type: "Permanent" } } });
  const soft = resendEventActivity({ type: "email.bounced", data: { email_id: EMAIL_ID, to: ["x@example.com"], bounce: { type: "Transient" } } });
  assert.equal(spam?.stopEmails, true);
  assert.equal(hard?.stopEmails, true);
  assert.equal(soft?.stopEmails, false);
  assert.equal(resendEventActivity({ type: "email.delivered", data: { email_id: EMAIL_ID } }), null);
  assert.equal(resendEventActivity({ type: "email.opened", data: { email_id: "not-an-id" } }), null);
  assert.equal(resendEventActivity({ type: "email.clicked", data: { email_id: EMAIL_ID, click: {} } }), null);
});

test("lead emails carry the lead id tag, without losing their own tags", () => {
  const tagged = withLeadTag({ subject: "x", tags: [{ name: "campaign", value: "contractor_owner" }] }, LEAD_ID);
  assert.deepEqual(tagged.tags, [
    { name: "campaign", value: "contractor_owner" },
    { name: "lead_id", value: LEAD_ID },
  ]);
  assert.deepEqual(withLeadTag({ subject: "x" }, null), { subject: "x" });
});

test("the webhook route fails closed and verifies before it reads anything", async () => {
  const route = await readFile(new URL("../app/api/webhooks/resend/route.ts", import.meta.url), "utf8");
  const secretCheck = route.indexOf("RESEND_WEBHOOK_SECRET");
  const verify = route.indexOf("verifyResendSignature(");
  const parse = route.indexOf("JSON.parse(body)");
  const db = route.indexOf("createSupabaseClient(");
  assert.ok(secretCheck > 0 && secretCheck < verify && verify < parse && parse < db);
  assert.match(route, /status: 503/);
  assert.match(route, /status: 401/);
});
