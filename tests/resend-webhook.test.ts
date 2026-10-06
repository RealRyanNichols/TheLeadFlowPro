import assert from "node:assert/strict";
import { createHmac, randomBytes } from "node:crypto";
import { readFile } from "node:fs/promises";
import test from "node:test";
import { activityDetail, recordResendActivity, resendActivityId, resendEventActivity, resendTags, verifyResendSignature } from "../lib/resendEvents.ts";
import type { ResendActivityStore } from "../lib/resendEvents.ts";
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

test("spam reports and permanent bounces stop the emails; delivery delays are ignored", () => {
  const spam = resendEventActivity({ type: "email.complained", data: { email_id: EMAIL_ID, to: ["x@example.com"], subject: "Hi" } });
  const hard = resendEventActivity({ type: "email.bounced", data: { email_id: EMAIL_ID, to: ["x@example.com"], bounce: { type: "Permanent" } } });
  const soft = resendEventActivity({ type: "email.bounced", data: { email_id: EMAIL_ID, to: ["x@example.com"], bounce: { type: "Transient" } } });
  assert.equal(spam?.stopEmails, true);
  assert.equal(hard?.stopEmails, true);
  assert.equal(soft?.stopEmails, false);
  assert.equal(resendEventActivity({ type: "email.delivery_delayed", data: { email_id: EMAIL_ID } }), null);
  assert.equal(resendEventActivity({ type: "email.opened", data: { email_id: "not-an-id" } }), null);
  assert.equal(resendEventActivity({ type: "email.clicked", data: { email_id: EMAIL_ID, click: {} } }), null);
});

test("sent and delivered receipts distinguish acceptance from mail-server delivery", () => {
  const data = { email_id: EMAIL_ID, to: ["x@example.com"], subject: "Follow-up", tags: { lead_id: LEAD_ID } };
  const sent = resendEventActivity({ type: "email.sent", data });
  const delivered = resendEventActivity({ type: "email.delivered", data });
  assert.equal(sent?.detail, 'Resend accepted "Follow-up" for delivery.');
  assert.equal(delivered?.detail, 'Delivered "Follow-up" to the recipient\'s mail server.');
  assert.equal(sent?.stopEmails, false);
  assert.equal(delivered?.stopEmails, false);
  assert.notEqual(sent?.ref, delivered?.ref);
});

function store(overrides: Partial<ResendActivityStore> = {}): ResendActivityStore {
  return {
    async findLead() { return LEAD_ID; },
    async suppressEmails() {},
    async hasLegacyActivity() { return false; },
    async insertActivity() { return "inserted"; },
    ...overrides,
  };
}

function complaint() {
  const activity = resendEventActivity({
    type: "email.complained",
    data: { email_id: EMAIL_ID, tags: { lead_id: LEAD_ID } },
  });
  assert.ok(activity);
  return activity;
}

test("concurrent retries converge on one primary-key insert even when both lookups miss", async () => {
  const activity = complaint();
  const rows = new Set<string>();
  let suppressions = 0;
  const fake = store({
    async suppressEmails() { suppressions += 1; },
    // Force the stale-read race that affected the old read-then-insert handler.
    async hasLegacyActivity() { return false; },
    async insertActivity(row) {
      if (rows.has(row.id)) return "duplicate";
      rows.add(row.id);
      return "inserted";
    },
  });
  const results = await Promise.all([
    recordResendActivity(activity, fake),
    recordResendActivity(activity, fake),
  ]);
  assert.equal(rows.size, 1);
  assert.equal(results.filter((r) => r.recorded).length, 1);
  assert.equal(suppressions, 2);
  assert.match([...rows][0], /^[0-9a-f]{8}-[0-9a-f]{4}-8[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/);
  assert.notEqual(resendActivityId(LEAD_ID, activity.ref), resendActivityId(LEAD_ID, `open-${EMAIL_ID}`));
  assert.notEqual(resendActivityId(LEAD_ID, activity.ref), resendActivityId(EMAIL_ID, activity.ref));
});

test("a failed suppression remains retryable and never gets acknowledged as recorded", async () => {
  let fail = true;
  let inserts = 0;
  let suppressed = false;
  const fake = store({
    async suppressEmails() {
      if (fail) throw new Error("email suppression failed");
      suppressed = true;
    },
    async insertActivity() { inserts += 1; return "inserted"; },
  });
  await assert.rejects(recordResendActivity(complaint(), fake), /suppression failed/);
  assert.equal(inserts, 0);
  fail = false;
  assert.deepEqual(await recordResendActivity(complaint(), fake), { ok: true, recorded: true });
  assert.equal(suppressed, true);
  assert.equal(inserts, 1);
});

test("a legacy duplicate retries its missing suppression before returning success", async () => {
  const calls: string[] = [];
  const fake = store({
    async suppressEmails() { calls.push("suppressed"); },
    async hasLegacyActivity() { calls.push("duplicate check"); return true; },
    async insertActivity() { throw new Error("must not insert a legacy duplicate"); },
  });
  assert.deepEqual(await recordResendActivity(complaint(), fake), { ok: true, recorded: false, duplicate: true });
  assert.deepEqual(calls, ["suppressed", "duplicate check"]);
});

test("an insert failure preserves suppression and a retry uses the same row id", async () => {
  let suppressed = false;
  const ids: string[] = [];
  const fake = store({
    async suppressEmails() { suppressed = true; },
    async insertActivity(row) {
      ids.push(row.id);
      if (ids.length === 1) throw new Error("activity insert failed");
      return "inserted";
    },
  });
  await assert.rejects(recordResendActivity(complaint(), fake), /insert failed/);
  assert.equal(suppressed, true);
  assert.deepEqual(await recordResendActivity(complaint(), fake), { ok: true, recorded: true });
  assert.equal(ids[0], ids[1]);
});

test("delivery receipts never write consent, and unknown recipients never write activity", async () => {
  const activity = resendEventActivity({ type: "email.delivered", data: { email_id: EMAIL_ID } });
  assert.ok(activity);
  const fake = store({
    async suppressEmails() { throw new Error("delivery must not change consent"); },
  });
  assert.deepEqual(await recordResendActivity(activity, fake), { ok: true, recorded: true });
  assert.deepEqual(await recordResendActivity(activity, store({
    async findLead() { return null; },
    async insertActivity() { throw new Error("no lead must not write"); },
  })), { ok: true, recorded: false, reason: "no lead" });
});

test("lookup and dedupe failures propagate for provider retry", async () => {
  await assert.rejects(recordResendActivity(complaint(), store({
    async findLead() { throw new Error("lead lookup failed"); },
  })), /lead lookup failed/);
  await assert.rejects(recordResendActivity(complaint(), store({
    async hasLegacyActivity() { throw new Error("activity lookup failed"); },
    async insertActivity() { throw new Error("a failed read must not proceed"); },
  })), /activity lookup failed/);
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
