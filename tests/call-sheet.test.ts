import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import test from "node:test";
import {
  ANSWER_WINDOW_HOURS,
  EMAIL_ROW_LIMIT,
  FOLLOW_UP_AFTER_DAYS,
  ageLabel,
  buildCallSheet,
  callSheetEmail,
  callSheetEmailEnabled,
  callSheetRecipients,
  canText,
  classifyCall,
  isHumanOutboundText,
  NOTE_SUMMARY_MAX,
  noteSummary,
  sourceLabel,
  TIER_LABELS,
  TIER_ORDER,
  tiers,
  touchesFromRows,
  type CallSheetLead,
  type CallSheetTouch,
} from "../lib/callSheet.ts";
import ts from "typescript";
import * as callSheetModule from "../lib/callSheet.ts";
import { callbackState } from "../lib/callSheet.ts";
import { copyProblems } from "../lib/hq/copy.ts";
import * as speedToLeadModule from "../lib/speedToLead.ts";
import { leadConsultationTextBody, leadTextBackBody } from "../lib/leadNotify.ts";
import { INBOUND_AUTO_REPLY } from "../lib/quo.ts";

const NOW = new Date("2026-09-20T13:00:00Z");
const hoursAgo = (h: number) => new Date(NOW.getTime() - h * 3_600_000).toISOString();

function lead(overrides: Partial<CallSheetLead> & { id: string }): CallSheetLead {
  return {
    created_at: hoursAgo(2),
    full_name: `Lead ${overrides.id}`,
    business_name: null,
    email: `${overrides.id}@example.com`,
    phone: "(903) 555-0100",
    interest: "free_website_program",
    status: "new",
    source: "meta_lead_ad",
    utm_source: "facebook",
    best_contact_method: "text",
    sms_consent: false,
    sms_unsubscribed_at: null,
    is_test: false,
    next_follow_up_at: null,
    ...overrides,
  };
}

test("software's own texts are not touches; a person's text is; a missed inbound call is a reply owed", () => {
  for (const body of [INBOUND_AUTO_REPLY, leadTextBackBody("Sam", null), leadConsultationTextBody("Sam", "https://calendar.app.google/x")]) {
    assert.equal(isHumanOutboundText(body), false, body);
  }
  assert.equal(isHumanOutboundText("Hi Sam, Ryan here. Thursday at 2 work for you?"), true);
  assert.equal(classifyCall("outgoing", "answered"), "call");
  assert.equal(classifyCall("incoming", "answered"), "call");
  assert.equal(classifyCall("incoming", "missed"), "call_in");
  assert.equal(classifyCall("incoming", "voicemail"), "call_in");
  assert.equal(classifyCall("incoming", "no_answer"), "call_in");
  assert.equal(classifyCall(null, null), "call");

  // The echo of the automatic text-back must leave the lead exactly where it was.
  const echoed = lead({ id: "echo", created_at: hoursAgo(2) });
  const withEcho = buildCallSheet([echoed], [], NOW);
  assert.deepEqual(withEcho.rows.map((r) => [r.lead.id, r.tier]), [["echo", "answer"]]);

  // A missed call from the lead goes to the top, worded as a call.
  const missed = lead({ id: "missed", status: "contacted", created_at: hoursAgo(50) });
  const sheet = buildCallSheet([missed], [{ lead_id: "missed", at: hoursAgo(1), kind: "call_in" }], NOW);
  assert.equal(sheet.rows[0].tier, "reply");
  assert.match(sheet.rows[0].reason, /called and nobody picked up 1 hour ago and nothing has gone back since/);
  // ...and an answered call after it clears the debt.
  const answered = buildCallSheet([missed], [{ lead_id: "missed", at: hoursAgo(1), kind: "call_in" }, { lead_id: "missed", at: hoursAgo(0.5), kind: "call" }], NOW);
  assert.equal(answered.rows.length, 0);
});

test("texting on the sheet needs consent and no STOP since, in the row and in the email", () => {
  assert.equal(canText({ phone: "9035550100", sms_consent: true, sms_unsubscribed_at: null }), true);
  assert.equal(canText({ phone: "9035550100", sms_consent: true, sms_unsubscribed_at: "2026-09-19T00:00:00Z" }), false);
  assert.equal(canText({ phone: "9035550100", sms_consent: false, sms_unsubscribed_at: null }), false);
  assert.equal(canText({ phone: null, sms_consent: true, sms_unsubscribed_at: null }), false);
  const leads = [
    lead({ id: "ok", sms_consent: true }),
    lead({ id: "stopped", sms_consent: true, sms_unsubscribed_at: hoursAgo(5) }),
    lead({ id: "noconsent" }),
  ];
  const sheet = buildCallSheet(leads, [], NOW);
  assert.deepEqual(Object.fromEntries(sheet.rows.map((r) => [r.lead.id, r.canText])), { ok: true, stopped: false, noconsent: false });
  const email = callSheetEmail(sheet, "https://www.theleadflowpro.com")!;
  assert.ok(email.text.includes("(texts OK)"));
  assert.ok(email.text.includes("(replied STOP, call only)"));
  assert.ok(email.text.includes("(no text consent, call or email)"));
  const page = readFileSync(join(process.cwd(), "app/admin/call-sheet/page.tsx"), "utf8");
  assert.ok(page.includes("row.canText ? smsHref"), "the page text button follows canText");
  assert.ok(page.includes("Replied STOP. Call instead."));
  const server = readFileSync(join(process.cwd(), "lib/callSheetServer.ts"), "utf8");
  assert.ok(server.includes("sms_unsubscribed_at"), "the loader selects the STOP timestamp");
  assert.ok(server.includes("direction, outcome"), "the loader selects call direction and outcome");
  // The row mapping moved into the pure touchesFromRows; the loader must hand every row to it.
  assert.ok(server.includes("touchesFromRows("), "the loader maps rows through touchesFromRows");
  const sheetSource = readFileSync(join(process.cwd(), "lib/callSheet.ts"), "utf8");
  const mapping = sheetSource.slice(sheetSource.indexOf("export function touchesFromRows("));
  assert.ok(mapping.includes("isHumanOutboundText(m.body)") && mapping.includes("classifyCall("));
});

test("untouched leads rank newest first, split at the answer window, and the automation's reply never counts", () => {
  const leads = [
    lead({ id: "old", created_at: hoursAgo(ANSWER_WINDOW_HOURS + 10) }),
    lead({ id: "newest", created_at: hoursAgo(1) }),
    lead({ id: "mid", created_at: hoursAgo(30) }),
  ];
  // No touches at all: the welcome email and the text-back are not passed in as touches.
  const sheet = buildCallSheet(leads, [], NOW);
  assert.deepEqual(
    sheet.rows.map((r) => [r.lead.id, r.tier]),
    [
      ["newest", "answer"],
      ["mid", "answer"],
      ["old", "waiting"],
    ],
  );
  assert.equal(sheet.counts.answer, 2);
  assert.equal(sheet.counts.waiting, 1);
  assert.match(sheet.rows[0].reason, /came in 1 hour ago from Meta lead ad asking about Free Website Program/);
  assert.match(sheet.rows[0].reason, /No call, text, or note from a person yet/);
  // Every row opens the call card, where the outcome is logged.
  assert.equal(sheet.rows[0].href, "/admin/call-sheet/newest");
  assert.deepEqual(
    sheet.rows.map((r) => r.href),
    ["/admin/call-sheet/newest", "/admin/call-sheet/mid", "/admin/call-sheet/old"],
  );
  assert.ok(sheet.rows.every((r) => r.callbackAt === null), "only the callback tier carries a due time");
});

test("a note, a call, or an outbound message is a touch; a recent touch removes the lead; an old one makes it a follow-up", () => {
  const leads = [
    lead({ id: "noted", status: "contacted" }),
    lead({ id: "called", status: "contacted" }),
    lead({ id: "texted", status: "call_booked" }),
    lead({ id: "stale", status: "proposal", created_at: hoursAgo(400) }),
  ];
  const touches: CallSheetTouch[] = [
    { lead_id: "noted", at: hoursAgo(1), kind: "note" },
    { lead_id: "called", at: hoursAgo(20), kind: "call" },
    { lead_id: "texted", at: hoursAgo(24 * FOLLOW_UP_AFTER_DAYS - 1), kind: "message_out" },
    { lead_id: "stale", at: hoursAgo(24 * 9), kind: "message_out" },
    { lead_id: "stale", at: hoursAgo(24 * 12), kind: "note" },
  ];
  const sheet = buildCallSheet(leads, touches, NOW);
  assert.deepEqual(
    sheet.rows.map((r) => [r.lead.id, r.tier]),
    [["stale", "follow_up"]],
  );
  assert.match(sheet.rows[0].reason, /last touched 9 days ago and is still proposal/);
  assert.equal(sheet.rows[0].lastTouchAt, hoursAgo(24 * 9));
  assert.ok(sheet.excluded.some((e) => e.id === "noted" && e.reason.startsWith("touched")));
  assert.ok(sheet.excluded.some((e) => e.id === "texted"));
});

test("an inbound message with nothing after it goes to the top, and follow-ups order by longest silence", () => {
  const leads = [
    lead({ id: "fresh", created_at: hoursAgo(1) }),
    lead({ id: "wrote", status: "contacted", created_at: hoursAgo(100) }),
    lead({ id: "answered", status: "contacted", created_at: hoursAgo(100) }),
    lead({ id: "f7", status: "contacted", created_at: hoursAgo(500) }),
    lead({ id: "f12", status: "contacted", created_at: hoursAgo(500) }),
  ];
  const touches: CallSheetTouch[] = [
    { lead_id: "wrote", at: hoursAgo(50), kind: "message_out" },
    { lead_id: "wrote", at: hoursAgo(3), kind: "message_in" },
    { lead_id: "answered", at: hoursAgo(3), kind: "message_in" },
    { lead_id: "answered", at: hoursAgo(2), kind: "message_out" },
    { lead_id: "f7", at: hoursAgo(24 * 7), kind: "note" },
    { lead_id: "f12", at: hoursAgo(24 * 12), kind: "call" },
  ];
  const sheet = buildCallSheet(leads, touches, NOW);
  assert.deepEqual(
    sheet.rows.map((r) => [r.lead.id, r.tier]),
    [
      ["wrote", "reply"],
      ["fresh", "answer"],
      ["f12", "follow_up"],
      ["f7", "follow_up"],
    ],
  );
  assert.match(sheet.rows[0].reason, /sent a message 3 hours ago and nothing has gone back since/);
  assert.equal(tiers(sheet).map((g) => g.tier).join(","), "reply,answer,follow_up");
});

test("won, lost, test, and unreachable records are left off with a stated reason", () => {
  const leads = [
    lead({ id: "won", status: "won" }),
    lead({ id: "lost", status: "lost" }),
    lead({ id: "test", is_test: true }),
    lead({ id: "ghost", phone: null, email: null }),
    lead({ id: "emailonly", phone: null }),
  ];
  const sheet = buildCallSheet(leads, [], NOW);
  assert.deepEqual(
    sheet.rows.map((r) => r.lead.id),
    ["emailonly"],
  );
  assert.deepEqual(
    sheet.excluded.map((e) => [e.id, e.reason]),
    [
      ["won", "status won"],
      ["lost", "status lost"],
      ["test", "test record"],
      ["ghost", "no phone and no email"],
    ],
  );
});

test("source and age labels read as plain English", () => {
  assert.equal(sourceLabel({ source: "meta_lead_ad", utm_source: null }), "Meta lead ad");
  assert.equal(sourceLabel({ source: "website", utm_source: "google" }), "Website form");
  assert.equal(sourceLabel({ source: null, utm_source: "ig" }), "Meta");
  assert.equal(sourceLabel({ source: null, utm_source: null }), "Website");
  assert.equal(sourceLabel({ source: "some_import", utm_source: null }), "some import");
  assert.equal(ageLabel(0.4), "under an hour ago");
  assert.equal(ageLabel(1.2), "1 hour ago");
  assert.equal(ageLabel(47), "47 hours ago");
  assert.equal(ageLabel(49), "2 days ago");
});

test("the email exists only when there is someone to call, caps its rows, and goes nowhere near a lead", () => {
  assert.equal(callSheetEmail(buildCallSheet([], [], NOW), "https://www.theleadflowpro.com"), null);
  const many = Array.from({ length: EMAIL_ROW_LIMIT + 5 }, (_, i) => lead({ id: `l${i}`, created_at: hoursAgo(i + 1) }));
  const sheet = buildCallSheet(many, [{ lead_id: "l0", at: hoursAgo(0.5), kind: "message_in" }], NOW);
  const email = callSheetEmail(sheet, "https://www.theleadflowpro.com")!;
  assert.equal(email.subject, `Call sheet: 1 to reply to, ${EMAIL_ROW_LIMIT + 4} to answer now`);
  assert.ok(email.text.includes("THEY REACHED OUT"));
  assert.ok(email.text.includes(`  ${EMAIL_ROW_LIMIT}. `));
  assert.ok(!email.text.includes(`  ${EMAIL_ROW_LIMIT + 1}. `));
  assert.ok(email.text.includes("...and 5 more on the page."));
  assert.ok(email.text.includes("https://www.theleadflowpro.com/admin/call-sheet"));
  assert.ok(email.text.includes("not sent to anyone on it"));
});

test("the cron is off unless the flag is exactly true, and only ever addresses the owner inboxes", () => {
  assert.equal(callSheetEmailEnabled({}), false);
  assert.equal(callSheetEmailEnabled({ CALL_SHEET_EMAIL_ENABLED: "TRUE" }), false);
  assert.equal(callSheetEmailEnabled({ CALL_SHEET_EMAIL_ENABLED: "1" }), false);
  assert.equal(callSheetEmailEnabled({ CALL_SHEET_EMAIL_ENABLED: "true" }), true);
  assert.deepEqual(callSheetRecipients({}, "hello@theleadflowpro.com"), ["hello@theleadflowpro.com"]);
  assert.deepEqual(callSheetRecipients({ LEADFLOW_NOTIFY_EMAIL: "a@x.com; b@x.com,c@x.com" }, "f@x.com"), ["a@x.com", "b@x.com", "c@x.com"]);
  assert.equal(callSheetRecipients({ LEADFLOW_NOTIFY_EMAIL: "1@x,2@x,3@x,4@x,5@x,6@x,7@x" }, "f@x.com").length, 5);
  const env = readFileSync(join(process.cwd(), ".env.example"), "utf8");
  assert.match(env, /^CALL_SHEET_EMAIL_ENABLED="false"$/m);
  const route = readFileSync(join(process.cwd(), "app/api/cron/call-sheet/route.ts"), "utf8");
  assert.match(route, /if \(!cronSecret \|\|/, "the cron fails closed when no secret is configured");
  assert.ok(route.includes("callSheetEmailEnabled(process.env)"));
  assert.ok(route.includes("callSheetRecipients(process.env"));
  assert.ok(!route.includes("lead.email"), "the cron never addresses a lead");
  const crons = JSON.parse(readFileSync(join(process.cwd(), "vercel.json"), "utf8")) as { crons: { path: string }[] };
  assert.ok(crons.crons.some((c) => c.path === "/api/cron/call-sheet"));
  const server = readFileSync(join(process.cwd(), "lib/callSheetServer.ts"), "utf8");
  const sheetSource = readFileSync(join(process.cwd(), "lib/callSheet.ts"), "utf8");
  assert.ok(server.includes("touchesFromRows(") && sheetSource.includes("isHumanOutboundText"), "the automatic texts are excluded from touches");
  assert.ok(!server.includes(".insert(") && !server.includes(".update(") && !server.includes(".delete("), "the loader is read-only");
  assert.ok(!server.includes(".upsert(") && !server.includes(".rpc("), "the loader is read-only");
});

// ---------------------------------------------------------------------------
// The Call Closer's promise: next_follow_up_at, honoured once a person has
// touched the lead. NOW is Sunday 2026-09-20 at 8:00 AM CDT.
// ---------------------------------------------------------------------------

const FRI_10AM = "2026-09-18T15:00:00.000Z"; // Fri, Sep 18 at 10:00 AM CDT
const THU_9AM = "2026-09-17T14:00:00.000Z"; // Thu, Sep 17 at 9:00 AM CDT
const SAT_230PM = "2026-09-19T19:30:00.000Z"; // Sat, Sep 19 at 2:30 PM CDT
const TUE_10AM = "2026-09-22T15:00:00.000Z"; // Tue, Sep 22 at 10:00 AM CDT, still ahead

test("a call back that has come due puts the lead under You said you would call, with the last note beside it", () => {
  const cb = lead({ id: "cb", status: "contacted", created_at: hoursAgo(200), business_name: "Sample Roofing (fictional)", next_follow_up_at: FRI_10AM });
  const touches = touchesFromRows({
    notes: [
      { lead_id: "cb", created_at: "2026-09-14T15:00:00.000Z", body: "First try. Left a voicemail." },
      {
        lead_id: "cb",
        created_at: "2026-09-15T20:00:00.000Z",
        body: "Call: talked, call back later. Outcome: call_back. Ref 0123456789abcdef0123\n\nWants a price on the website build first.",
      },
    ],
    calls: [],
    messages: [],
  });
  const sheet = buildCallSheet([cb], touches, NOW);
  assert.deepEqual(sheet.rows.map((r) => [r.lead.id, r.tier]), [["cb", "callback"]]);
  const row = sheet.rows[0];
  assert.equal(row.callbackAt, FRI_10AM);
  // The reason names the time and the last note, never who set it: a passed sit-down or another screen can set it too.
  assert.equal(row.reason, "Lead cb at Sample Roofing (fictional): follow-up due since Fri, Sep 18 at 10:00 AM. Last: Call: talked, call back later.");
  assert.doesNotMatch(row.reason, /\byou set\b/i);
  assert.equal(row.href, "/admin/call-sheet/cb");
  assert.equal(sheet.counts.callback, 1);
  assert.deepEqual(copyProblems(row.reason), []);

  // No note on file: the promise still stands, just without a "Last:" line.
  const called = buildCallSheet([cb], [{ lead_id: "cb", at: "2026-09-15T20:00:00.000Z", kind: "call" }], NOW);
  assert.equal(called.rows[0].tier, "callback");
  assert.equal(called.rows[0].reason, "Lead cb at Sample Roofing (fictional): follow-up due since Fri, Sep 18 at 10:00 AM.");
  // A summary without its own full stop still ends the sentence.
  const unpunctuated = buildCallSheet([cb], [{ lead_id: "cb", at: "2026-09-15T20:00:00.000Z", kind: "note", summary: "Wants a price first" }], NOW);
  assert.equal(unpunctuated.rows[0].reason, "Lead cb at Sample Roofing (fictional): follow-up due since Fri, Sep 18 at 10:00 AM. Last: Wants a price first.");

  // The tier sits right under "They reached out".
  assert.deepEqual([...TIER_ORDER], ["reply", "callback", "answer", "waiting", "follow_up"]);
  assert.equal(TIER_LABELS.callback.title, "You said you would call");
});

test("a call back set for later hides a touched lead, but never a lead nobody has touched", () => {
  const leads = [
    // Touched an hour ago, call back Tuesday: off the sheet until then.
    lead({ id: "later", status: "contacted", created_at: hoursAgo(30), next_follow_up_at: TUE_10AM }),
    // Silent for nine days would be a follow-up, but the promise is still ahead.
    lead({ id: "quiet", status: "contacted", created_at: hoursAgo(400), next_follow_up_at: TUE_10AM }),
    // Nobody has touched these. The field is ignored completely.
    lead({ id: "untouched_future", created_at: hoursAgo(5), next_follow_up_at: TUE_10AM }),
    lead({ id: "untouched_past", created_at: hoursAgo(6), next_follow_up_at: FRI_10AM }),
    // /api/business-diagnostic stamps next_follow_up_at on a brand-new lead (its review task's time, the day it came in).
    lead({ id: "diag_new", created_at: hoursAgo(2), next_follow_up_at: hoursAgo(2) }),
    lead({ id: "diag_old", created_at: hoursAgo(100), next_follow_up_at: hoursAgo(100) }),
  ];
  const touches: CallSheetTouch[] = [
    { lead_id: "later", at: hoursAgo(1), kind: "call" },
    { lead_id: "quiet", at: hoursAgo(24 * 9), kind: "note", summary: "Talked." },
  ];
  const sheet = buildCallSheet(leads, touches, NOW);
  assert.deepEqual(
    sheet.rows.map((r) => [r.lead.id, r.tier]),
    [
      ["diag_new", "answer"],
      ["untouched_future", "answer"],
      ["untouched_past", "answer"],
      ["diag_old", "waiting"],
    ],
  );
  assert.equal(sheet.counts.callback, 0);
  assert.deepEqual(
    sheet.excluded.map((e) => [e.id, e.reason]),
    [
      ["later", "call back set for Tue, Sep 22 at 10:00 AM"],
      ["quiet", "call back set for Tue, Sep 22 at 10:00 AM"],
    ],
  );
  assert.match(sheet.rows[0].reason, /No call, text, or note from a person yet/);
});

test("a touch after the call back came due means the promise was kept, so the five-day rule decides", () => {
  const leads = [
    // Due Friday, called Saturday: touched recently, off the sheet.
    lead({ id: "kept", status: "contacted", created_at: hoursAgo(300), next_follow_up_at: FRI_10AM }),
    // Due twelve days ago, last touched nine days ago (after it came due): a follow-up again.
    lead({ id: "kept_long_ago", status: "proposal", created_at: hoursAgo(500), next_follow_up_at: hoursAgo(24 * 12) }),
    // A touch exactly at the due instant counts as keeping it.
    lead({ id: "on_time", status: "contacted", created_at: hoursAgo(300), next_follow_up_at: FRI_10AM }),
    // An unreadable value is treated as no promise at all.
    lead({ id: "garbled", status: "contacted", created_at: hoursAgo(300), next_follow_up_at: "not a date" }),
  ];
  const touches: CallSheetTouch[] = [
    { lead_id: "kept", at: hoursAgo(24 * 4), kind: "note" },
    { lead_id: "kept", at: SAT_230PM, kind: "call" },
    { lead_id: "kept_long_ago", at: hoursAgo(24 * 13), kind: "note" },
    { lead_id: "kept_long_ago", at: hoursAgo(24 * 9), kind: "message_out" },
    { lead_id: "on_time", at: FRI_10AM, kind: "call" },
    { lead_id: "garbled", at: hoursAgo(24 * 6), kind: "note" },
  ];
  const sheet = buildCallSheet(leads, touches, NOW);
  assert.deepEqual(
    sheet.rows.map((r) => [r.lead.id, r.tier]),
    [
      ["kept_long_ago", "follow_up"],
      ["garbled", "follow_up"],
    ],
  );
  assert.ok(sheet.rows.every((r) => r.callbackAt === null));
  assert.ok(sheet.excluded.some((e) => e.id === "kept" && e.reason.startsWith("touched")));
  assert.ok(sheet.excluded.some((e) => e.id === "on_time" && e.reason.startsWith("touched")));
});

test("a reply from the lead still beats a call back that is due", () => {
  const cb = lead({ id: "both", status: "contacted", created_at: hoursAgo(200), next_follow_up_at: FRI_10AM });
  const touches: CallSheetTouch[] = [
    { lead_id: "both", at: "2026-09-15T20:00:00.000Z", kind: "note", summary: "Talked, call back Friday." },
    { lead_id: "both", at: hoursAgo(2), kind: "message_in" },
  ];
  const sheet = buildCallSheet([cb], touches, NOW);
  assert.deepEqual(sheet.rows.map((r) => [r.lead.id, r.tier]), [["both", "reply"]]);
  assert.match(sheet.rows[0].reason, /sent a message 2 hours ago and nothing has gone back since/);
  assert.equal(sheet.rows[0].callbackAt, null);
  // The promise is not forgotten: the reply row names it.
  assert.match(sheet.rows[0].reason, /Follow-up due since Fri, Sep 18 at 10:00 AM\.$/);
});

test("call backs sort by the promised time, earliest first, not by when the lead came in", () => {
  const leads = [
    lead({ id: "sat", status: "contacted", created_at: hoursAgo(50), next_follow_up_at: SAT_230PM }),
    lead({ id: "thu", status: "contacted", created_at: hoursAgo(400), next_follow_up_at: THU_9AM }),
    lead({ id: "fri", status: "contacted", created_at: hoursAgo(100), next_follow_up_at: FRI_10AM }),
    lead({ id: "fresh", created_at: hoursAgo(1) }),
  ];
  const touches: CallSheetTouch[] = [
    { lead_id: "sat", at: hoursAgo(48), kind: "call" },
    { lead_id: "thu", at: hoursAgo(24 * 5), kind: "call" },
    { lead_id: "fri", at: hoursAgo(90), kind: "call" },
  ];
  const sheet = buildCallSheet(leads, touches, NOW);
  assert.deepEqual(
    sheet.rows.map((r) => [r.lead.id, r.tier]),
    [
      ["thu", "callback"],
      ["fri", "callback"],
      ["sat", "callback"],
      ["fresh", "answer"],
    ],
  );
  assert.deepEqual(sheet.rows.slice(0, 3).map((r) => r.callbackAt), [THU_9AM, FRI_10AM, SAT_230PM]);
  assert.match(sheet.rows[2].reason, /follow-up due since Sat, Sep 19 at 2:30 PM\./);
  assert.equal(tiers(sheet).map((g) => g.tier).join(","), "callback,answer");
});

test("an outbound message the provider rejected is not a touch", () => {
  const touches = touchesFromRows({
    notes: [],
    calls: [],
    messages: [
      { lead_id: "a", direction: "out", channel: "sms", body: "Hi Sam, Ryan here. Thursday at 2 work for you?", created_at: hoursAgo(1), delivered: false },
      { lead_id: "b", direction: "out", channel: "email", body: "Hi Pat, Ryan here. Here is the link we talked about.", created_at: hoursAgo(1), delivered: true },
      { lead_id: "c", direction: "out", body: "Hi Lee, Ryan here.", created_at: hoursAgo(1) },
      { lead_id: "d", direction: "out", channel: "sms", body: INBOUND_AUTO_REPLY, created_at: hoursAgo(1), delivered: true },
    ],
  });
  assert.deepEqual(
    touches.map((t) => [t.lead_id, t.kind]),
    [
      ["b", "message_out"],
      ["c", "message_out"],
    ],
  );
  // The rejected text leaves the lead exactly where it was: nobody has reached them.
  const sheet = buildCallSheet([lead({ id: "a" })], touches, NOW);
  assert.deepEqual(sheet.rows.map((r) => [r.lead.id, r.tier]), [["a", "answer"]]);
});

test("a reply logged by hand (channel note) is a person's touch, not a reply still owed", () => {
  const touches = touchesFromRows({
    notes: [],
    calls: [],
    messages: [
      { lead_id: "logged", direction: "in", channel: "note", body: "Yes, call me Tuesday after lunch.\nThey run two crews.", created_at: hoursAgo(3), delivered: true },
      { lead_id: "texted", direction: "in", channel: "sms", body: "Is this still available?", created_at: hoursAgo(3), delivered: true },
    ],
  });
  assert.deepEqual(touches, [
    { lead_id: "logged", at: hoursAgo(3), kind: "note", summary: "They said: Yes, call me Tuesday after lunch." },
    { lead_id: "texted", at: hoursAgo(3), kind: "message_in" },
  ]);
  const sheet = buildCallSheet([lead({ id: "logged", status: "contacted" }), lead({ id: "texted", status: "contacted" })], touches, NOW);
  assert.deepEqual(sheet.rows.map((r) => [r.lead.id, r.tier]), [["texted", "reply"]]);
  assert.ok(sheet.excluded.some((e) => e.id === "logged" && e.reason === "touched 3 hours ago"));
});

test("calls the Quo layer scoped out of the company are ignored; company calls and notes still count", () => {
  const touches = touchesFromRows({
    notes: [{ lead_id: "n", created_at: hoursAgo(4) }],
    calls: [
      { lead_id: "company", started_at: hoursAgo(1), direction: "outgoing", outcome: "answered", scope_status: "company" },
      { lead_id: "unscoped", started_at: hoursAgo(1), direction: "outgoing", outcome: "answered" },
      { lead_id: "noise", started_at: hoursAgo(1), direction: "outgoing", outcome: "answered", scope_status: "noise" },
      { lead_id: "review", started_at: hoursAgo(1), direction: "incoming", outcome: "missed", scope_status: "review" },
      { lead_id: "excluded", started_at: hoursAgo(1), direction: "outgoing", outcome: "answered", scope_status: "excluded" },
      { lead_id: null, started_at: hoursAgo(1), direction: "outgoing", outcome: "answered", scope_status: "company" },
      { lead_id: "missed", started_at: hoursAgo(1), direction: "incoming", outcome: "missed", scope_status: "company" },
    ],
    messages: [],
  });
  assert.deepEqual(
    touches.map((t) => [t.lead_id, t.kind]),
    [
      ["n", "note"],
      ["company", "call"],
      ["unscoped", "call"],
      ["missed", "call_in"],
    ],
  );
  assert.equal(touches[0].summary, null, "a note with no body has no summary");
  // A personal call on the same number does not take a waiting lead off the sheet.
  const sheet = buildCallSheet([lead({ id: "noise" }), lead({ id: "company" })], touches, NOW);
  assert.deepEqual(sheet.rows.map((r) => [r.lead.id, r.tier]), [["noise", "answer"]]);
});

test("note summaries are the first line, markers removed, never longer than the cap", () => {
  assert.equal(noteSummary("Call: no answer. Outcome: no_answer. Ref 0123456789abcdef0123\n\nTry after 4."), "Call: no answer.");
  assert.equal(noteSummary("Proposal sent. Outcome: proposal_sent. Offer ids: website_launch, system_map. Ref ABCDEF0123456789abcd-ef"), "Proposal sent.");
  assert.equal(noteSummary("\n\n   Talked   to the owner.  \nSecond line."), "Talked to the owner.");
  assert.equal(noteSummary("Outcome: great. Referral from Pat."), "Outcome: great. Referral from Pat.", "ordinary words mid-line are left alone");
  assert.equal(noteSummary("Left a voicemail. Outcome: voicemail."), "Left a voicemail.");
  assert.equal(noteSummary("Booked Thursday. Ref 0123456789abcdef0123"), "Booked Thursday.");
  assert.equal(noteSummary(""), null);
  assert.equal(noteSummary(null), null);
  assert.equal(noteSummary(undefined), null);
  const long = noteSummary(`Talked about ${"the website and the ads ".repeat(20)}`)!;
  assert.ok(long.length <= NOTE_SUMMARY_MAX && long.length > NOTE_SUMMARY_MAX - 10, String(long.length));
  assert.ok(long.startsWith("Talked about the website") && long.endsWith("..."));
  const reply = touchesFromRows({ notes: [], calls: [], messages: [{ lead_id: "x", direction: "in", channel: "note", body: "y".repeat(400), created_at: hoursAgo(1) }] });
  assert.equal(reply[0].summary!.length, NOTE_SUMMARY_MAX);
});

test("the email counts call backs in the subject, prints the tier, and links each row to its call card", () => {
  const leads = [
    lead({ id: "c1", status: "contacted", created_at: hoursAgo(200), next_follow_up_at: THU_9AM }),
    lead({ id: "c2", status: "contacted", created_at: hoursAgo(200), next_follow_up_at: FRI_10AM }),
    lead({ id: "r1", status: "contacted", created_at: hoursAgo(200) }),
    lead({ id: "n1", created_at: hoursAgo(1) }),
  ];
  const touches: CallSheetTouch[] = [
    { lead_id: "c1", at: hoursAgo(24 * 6), kind: "note", summary: "Talked, wants Thursday." },
    { lead_id: "c2", at: hoursAgo(24 * 6), kind: "call" },
    { lead_id: "r1", at: hoursAgo(24 * 6), kind: "call" },
    { lead_id: "r1", at: hoursAgo(1), kind: "message_in" },
  ];
  const sheet = buildCallSheet(leads, touches, NOW);
  const email = callSheetEmail(sheet, "https://www.theleadflowpro.com")!;
  assert.equal(email.subject, "Call sheet: 1 to reply to, 2 call backs due, 1 to answer now");
  assert.ok(email.text.includes("YOU SAID YOU WOULD CALL"));
  assert.ok(email.text.indexOf("THEY REACHED OUT") < email.text.indexOf("YOU SAID YOU WOULD CALL"));
  assert.ok(email.text.indexOf("YOU SAID YOU WOULD CALL") < email.text.indexOf("ANSWER NOW"));
  assert.ok(email.text.includes("Last: Talked, wants Thursday."));
  assert.ok(email.text.includes("https://www.theleadflowpro.com/admin/call-sheet/c1"));
  assert.ok(!email.text.includes("/admin/leads/"), "rows link to the call card");
  assert.deepEqual(copyProblems(email.text), []);
  for (const label of Object.values(TIER_LABELS)) assert.deepEqual(copyProblems(`${label.title} ${label.lead}`), []);

  const one = buildCallSheet([leads[0]], touches, NOW);
  assert.equal(callSheetEmail(one, "https://www.theleadflowpro.com")!.subject, "Call sheet: 1 call back due");
});

test("the loader reads the columns the rules need, flags a capped read, and still writes nothing", () => {
  const server = readFileSync(join(process.cwd(), "lib/callSheetServer.ts"), "utf8");
  assert.ok(server.includes("is_test, next_follow_up_at"), "leads: the promised call back");
  assert.ok(server.includes('"lead_id, created_at, body"'), "notes: the body for the summary");
  assert.ok(server.includes('"lead_id, started_at, direction, outcome, scope_status"'), "calls: the Quo scope");
  assert.ok(server.includes('"lead_id, direction, channel, body, created_at, delivered"'), "messages: channel and delivery");
  assert.ok(server.includes(">= TOUCH_ROW_CAP"), "a history query that hits the row cap marks the load partial");
  assert.ok(server.includes("speedToLead(leads, touches, now"), "speed to lead rides on the same rows");
  assert.ok(!server.includes("fetch(") && !server.includes("lib/supabase/service"));
  const page = readFileSync(join(process.cwd(), "app/admin/call-sheet/page.tsx"), "utf8");
  assert.ok(page.includes("From your own records"));
  assert.ok(page.includes("speedToLeadLine(loaded.speed)"), "the page shows the line without another query");
  assert.ok(page.includes("sm:grid-cols-5") && page.includes("TIER_ORDER.map"), "five tiles, callback included");
  assert.ok(page.includes("Open call card") && page.includes("href={row.href}"));
  assert.ok(!page.includes(".from(\"lead_"), "the page reads nothing itself beyond the role check");
  // A long word in a reason (a link pasted into the last note) wraps inside the row at 390px.
  assert.match(page, /<ol className="grid grid-cols-1 gap-3">/);
  assert.match(page, /<p className="mt-2 text-sm \[overflow-wrap:anywhere\]">\{row\.reason\}<\/p>/);
  assert.match(page, /className="font-black text-\[var\(--heading\)\] \[overflow-wrap:anywhere\]">\s*\{i \+ 1\}\./);
});

// ---------------------------------------------------------------------------
// One rule for a stored follow-up time, shared with the call card.
// ---------------------------------------------------------------------------

test("callbackState: due only when the last human touch came before the time", () => {
  assert.deepEqual(callbackState(null, hoursAgo(1), NOW), { state: "none", at: null });
  assert.deepEqual(callbackState("not a date", hoursAgo(1), NOW), { state: "none", at: null });
  assert.equal(callbackState(TUE_10AM, hoursAgo(1), NOW).state, "later");
  assert.equal(callbackState(TUE_10AM, null, NOW).state, "later");
  const due = callbackState(FRI_10AM, "2026-09-15T20:00:00.000Z", NOW);
  assert.equal(due.state, "due");
  assert.equal(due.at?.toISOString(), FRI_10AM);
  // Touched at or after the time: kept, not owed.
  assert.equal(callbackState(FRI_10AM, FRI_10AM, NOW).state, "none");
  assert.equal(callbackState(FRI_10AM, SAT_230PM, NOW).state, "none");
  // Nobody touched the lead: a past time is a stamp, not a promise.
  assert.equal(callbackState(FRI_10AM, null, NOW).state, "none");
  // Accepts a Date as the touch too.
  assert.equal(callbackState(FRI_10AM, new Date("2026-09-15T20:00:00.000Z"), NOW).state, "due");
});

test("promiseOnly leads show up as call backs or not at all, and never count as excluded", () => {
  const leads = [
    lead({ id: "old_cb", status: "contacted", created_at: "2026-06-01T15:00:00.000Z", next_follow_up_at: FRI_10AM }),
    lead({ id: "old_untouched", created_at: "2026-06-01T15:00:00.000Z", next_follow_up_at: FRI_10AM }),
    lead({ id: "old_kept", status: "contacted", created_at: "2026-06-01T15:00:00.000Z", next_follow_up_at: FRI_10AM }),
    lead({ id: "old_test", is_test: true, status: "contacted", created_at: "2026-06-01T15:00:00.000Z", next_follow_up_at: FRI_10AM }),
    lead({ id: "fresh", created_at: hoursAgo(1) }),
  ];
  const touches: CallSheetTouch[] = [
    { lead_id: "old_cb", at: "2026-09-15T20:00:00.000Z", kind: "note", summary: "Call: talked, call back Fri." },
    { lead_id: "old_kept", at: SAT_230PM, kind: "call" },
    { lead_id: "old_test", at: "2026-09-15T20:00:00.000Z", kind: "call" },
  ];
  const promiseOnly = new Set(["old_cb", "old_untouched", "old_kept", "old_test"]);
  const sheet = buildCallSheet(leads, touches, NOW, { promiseOnly });
  assert.deepEqual(
    sheet.rows.map((r) => [r.lead.id, r.tier]),
    [
      ["old_cb", "callback"],
      ["fresh", "answer"],
    ],
  );
  assert.deepEqual(sheet.excluded, [], "leads outside the window are not counted as left off");
  assert.equal(sheet.counts.callback, 1);
  // Without the option the same leads would land in other tiers: the option is what keeps them out.
  const plain = buildCallSheet(leads, touches, NOW);
  assert.ok(plain.rows.some((r) => r.lead.id === "old_untouched" && r.tier === "waiting"));
});

test("an older promised lead who also replied shows up as a reply, naming the due time; one with no promise owed stays off", () => {
  const OLD = "2026-05-01T15:00:00.000Z";
  const leads = [
    // Promised a call back, then the lead texted in: owes both, shows as a reply.
    lead({ id: "old_replied", status: "contacted", created_at: OLD, next_follow_up_at: FRI_10AM }),
    // Same promise, no reply: a plain call back, as before.
    lead({ id: "old_quiet", status: "contacted", created_at: OLD, next_follow_up_at: FRI_10AM }),
    // Nobody ever touched it; the only stored time is a stamp. A text in does not bring an old lead back.
    lead({ id: "old_untouched_replied", created_at: OLD, next_follow_up_at: FRI_10AM }),
    // Promise kept (called after it came due), then the lead texted: no promise owed, so it stays off.
    lead({ id: "old_kept_replied", status: "contacted", created_at: OLD, next_follow_up_at: FRI_10AM }),
  ];
  const touches: CallSheetTouch[] = [
    { lead_id: "old_replied", at: "2026-09-15T20:00:00.000Z", kind: "note", summary: "Call: talked, call back Fri." },
    { lead_id: "old_replied", at: SAT_230PM, kind: "message_in" },
    { lead_id: "old_quiet", at: "2026-09-15T20:00:00.000Z", kind: "note", summary: "Call: talked, call back Fri." },
    { lead_id: "old_untouched_replied", at: SAT_230PM, kind: "message_in" },
    { lead_id: "old_kept_replied", at: "2026-09-15T20:00:00.000Z", kind: "note", summary: "Talked." },
    { lead_id: "old_kept_replied", at: "2026-09-18T16:00:00.000Z", kind: "call" },
    { lead_id: "old_kept_replied", at: SAT_230PM, kind: "message_in" },
  ];
  const promiseOnly = new Set(leads.map((l) => l.id));
  const sheet = buildCallSheet(leads, touches, NOW, { promiseOnly });
  assert.deepEqual(
    sheet.rows.map((r) => [r.lead.id, r.tier]),
    [
      ["old_replied", "reply"],
      ["old_quiet", "callback"],
    ],
  );
  assert.equal(sheet.counts.reply, 1);
  assert.equal(sheet.counts.callback, 1);
  assert.deepEqual(sheet.excluded, [], "leads outside the window are still never counted as left off");
  const replied = sheet.rows[0];
  assert.match(replied.reason, /sent a message .* and nothing has gone back since\./);
  assert.match(replied.reason, / Follow-up due since Fri, Sep 18 at 10:00 AM\.$/);
  assert.deepEqual(copyProblems(replied.reason), []);

  // The same data without the option: the reply is there too, so the option no longer hides it.
  const plain = buildCallSheet(leads.slice(0, 2), touches, NOW);
  assert.deepEqual(
    plain.rows.map((r) => [r.lead.id, r.tier]),
    [
      ["old_replied", "reply"],
      ["old_quiet", "callback"],
    ],
  );
});

// ---------------------------------------------------------------------------
// The loader, run for real against a fake database that applies the filters
// it sends. A promise outlives the 90-day window; an old untouched lead does not.
// ---------------------------------------------------------------------------

type FakeRow = Record<string, unknown>;
type FakeQuery = { table: string; ops: { name: string; args: unknown[] }[] };

function loaderDb(tables: Record<string, FakeRow[]>, queries: FakeQuery[]) {
  const time = (v: unknown) => (typeof v === "string" ? Date.parse(v) : Number.NaN);
  function apply(q: FakeQuery): FakeRow[] {
    let rows = (tables[q.table] ?? []).slice();
    for (const { name, args } of q.ops) {
      const [col, a, b] = args as [string, unknown, unknown];
      if (name === "is") rows = rows.filter((r) => (r[col] ?? null) === a);
      else if (name === "eq") rows = rows.filter((r) => r[col] === a);
      else if (name === "in") rows = rows.filter((r) => (a as unknown[]).includes(r[col]));
      else if (name === "gte") rows = rows.filter((r) => time(r[col]) >= time(a));
      else if (name === "lte") rows = rows.filter((r) => time(r[col]) <= time(a));
      else if (name === "lt") rows = rows.filter((r) => time(r[col]) < time(a));
      else if (name === "not") {
        assert.equal(a, "in", "only not-in is expected");
        const list = String(b).replace(/^\(|\)$/g, "").split(",");
        rows = rows.filter((r) => r[col] !== null && r[col] !== undefined && !list.includes(String(r[col])));
      } else if (name === "order") {
        const asc = (a as { ascending?: boolean } | undefined)?.ascending !== false;
        rows.sort((x, y) => (String(x[col]) < String(y[col]) ? -1 : String(x[col]) > String(y[col]) ? 1 : 0) * (asc ? 1 : -1));
      } else if (name === "limit") rows = rows.slice(0, Number(col));
      else if (name !== "select") throw new Error(`unexpected filter ${name}`);
    }
    return rows;
  }
  return {
    from(table: string) {
      const q: FakeQuery = { table, ops: [] };
      queries.push(q);
      const chain: Record<string, unknown> = {};
      for (const name of ["select", "is", "eq", "in", "gte", "lte", "lt", "not", "order", "limit"]) {
        chain[name] = (...args: unknown[]) => {
          q.ops.push({ name, args });
          return chain;
        };
      }
      for (const write of ["insert", "update", "upsert", "delete", "rpc"]) {
        chain[write] = () => {
          throw new Error(`the loader tried to ${write} ${table}`);
        };
      }
      chain.then = (resolve: (v: unknown) => unknown) => Promise.resolve({ data: apply(q), error: null }).then(resolve);
      return chain;
    },
  };
}

function loadLoader() {
  const code = ts.transpileModule(readFileSync(join(process.cwd(), "lib/callSheetServer.ts"), "utf8"), {
    compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 },
  }).outputText;
  const modules: Record<string, unknown> = {
    "server-only": {},
    "@/lib/callSheet": callSheetModule,
    "@/lib/speedToLead": speedToLeadModule,
  };
  const mod = { exports: {} as Record<string, unknown> };
  new Function("require", "module", "exports", code)(
    (name: string) => {
      if (!(name in modules)) throw new Error(`the loader imports ${name}, which this harness does not expect`);
      return modules[name];
    },
    mod,
    mod.exports,
  );
  return mod.exports as {
    loadCallSheet: (db: unknown, now: Date) => Promise<{
      ok: boolean;
      sheet: ReturnType<typeof buildCallSheet>;
      speed: { leads: number };
      partial: boolean;
      leadsCapped: boolean;
    }>;
    LOOKBACK_DAYS: number;
    PROMISE_LIMIT: number;
  };
}

function dbLead(overrides: FakeRow & { id: string }): FakeRow {
  return { ...lead({ id: overrides.id }), deleted_at: null, ...overrides };
}

test("loader: a call back promised on a lead past the 90-day window still comes back when it is due", async () => {
  const { loadCallSheet, LOOKBACK_DAYS } = loadLoader();
  assert.equal(LOOKBACK_DAYS, 90);
  // Tue, Sep 29, 2026 at 10:30 AM CDT. The window starts Jul 1.
  const now = new Date("2026-09-29T15:30:00.000Z");
  const tables: Record<string, FakeRow[]> = {
    leads: [
      // Created 85 days before Sep 22, still waiting; Ryan called Sep 22 and set Tue, Sep 29 at 10:00 AM.
      dbLead({ id: "old_promise", status: "contacted", created_at: "2026-06-29T15:00:00.000Z", next_follow_up_at: "2026-09-29T15:00:00.000Z" }),
      // Old and untouched: the diagnostic stamped it long before the window.
      dbLead({ id: "old_diag", created_at: "2026-05-01T15:00:00.000Z", next_follow_up_at: "2026-05-01T15:05:00.000Z" }),
      // Old and untouched, but the questionnaire was finished inside the window: read, then left off.
      dbLead({ id: "old_diag_late", created_at: "2026-06-01T15:00:00.000Z", next_follow_up_at: "2026-07-15T15:00:00.000Z" }),
      // Old, promise kept after it came due: not a call back, and too old for the five-day rule.
      dbLead({ id: "old_kept", status: "contacted", created_at: "2026-06-01T15:00:00.000Z", next_follow_up_at: "2026-09-10T15:00:00.000Z" }),
      // Old and closed.
      dbLead({ id: "old_won", status: "won", created_at: "2026-06-01T15:00:00.000Z", next_follow_up_at: "2026-09-28T15:00:00.000Z" }),
      // Old, promise still ahead.
      dbLead({ id: "old_later", status: "contacted", created_at: "2026-06-01T15:00:00.000Z", next_follow_up_at: "2026-10-02T15:00:00.000Z" }),
      // Old and deleted.
      dbLead({ id: "old_deleted", status: "contacted", created_at: "2026-06-01T15:00:00.000Z", next_follow_up_at: "2026-09-28T15:00:00.000Z", deleted_at: "2026-09-01T00:00:00.000Z" }),
      // Inside the window, untouched.
      dbLead({ id: "fresh", created_at: "2026-09-28T20:00:00.000Z" }),
    ],
    lead_notes: [
      { lead_id: "old_promise", created_at: "2026-09-22T15:05:00.000Z", body: "Call: talked, call back Tue, Sep 29 at 10:00 AM.\n\nWants the price in writing." },
      { lead_id: "old_kept", created_at: "2026-09-11T15:00:00.000Z", body: "Called back as promised." },
      { lead_id: "old_later", created_at: "2026-09-25T15:00:00.000Z", body: "Call: talked, call back Fri." },
    ],
    lead_calls: [],
    lead_messages: [],
  };
  const queries: FakeQuery[] = [];
  const loaded = await loadCallSheet(loaderDb(tables, queries), now);
  assert.equal(loaded.ok, true);
  assert.deepEqual(
    loaded.sheet.rows.map((r) => [r.lead.id, r.tier]),
    [
      ["old_promise", "callback"],
      ["fresh", "answer"],
    ],
  );
  const row = loaded.sheet.rows[0];
  assert.equal(row.callbackAt, "2026-09-29T15:00:00.000Z");
  assert.equal(row.reason, "Lead old_promise: follow-up due since Tue, Sep 29 at 10:00 AM. Last: Call: talked, call back Tue, Sep 29 at 10:00 AM.");
  // Nothing outside the window is counted as left off, and nothing old reaches speed to lead.
  assert.ok(loaded.sheet.excluded.every((e) => e.id === "fresh" || !e.id.startsWith("old_")), JSON.stringify(loaded.sheet.excluded));
  assert.equal(loaded.speed.leads, 1);
  assert.equal(loaded.partial, false);
  assert.equal(loaded.leadsCapped, false);
  // The promise read is narrow: open, not deleted, older than the window, due inside it.
  const leadReads = queries.filter((q) => q.table === "leads");
  assert.equal(leadReads.length, 2);
  const promiseRead = leadReads.find((q) => q.ops.some((o) => o.name === "lt"));
  assert.ok(promiseRead);
  const has = (q: FakeQuery, name: string, ...args: unknown[]) => q.ops.some((o) => o.name === name && JSON.stringify(o.args) === JSON.stringify(args));
  const since = new Date(now.getTime() - 90 * 86_400_000).toISOString();
  assert.ok(has(promiseRead, "is", "deleted_at", null));
  assert.ok(has(promiseRead, "lt", "created_at", since));
  assert.ok(has(promiseRead, "gte", "next_follow_up_at", since));
  assert.ok(has(promiseRead, "lte", "next_follow_up_at", now.toISOString()));
  assert.ok(has(promiseRead, "not", "status", "in", "(won,lost)"));
  // The old lead's history is read too, so its last note is beside the row.
  const notesRead = queries.find((q) => q.table === "lead_notes");
  const idsRead = notesRead?.ops.find((o) => o.name === "in")?.args[1] as string[];
  assert.ok(idsRead.includes("old_promise") && idsRead.includes("fresh"));
});

test("loader: a full lead read is flagged, so missing call backs are not silent", async () => {
  const { loadCallSheet, PROMISE_LIMIT } = loadLoader();
  const now = new Date("2026-09-29T15:30:00.000Z");
  const old = Array.from({ length: PROMISE_LIMIT }, (_, i) =>
    dbLead({ id: `old_${i}`, status: "contacted", created_at: "2026-06-01T15:00:00.000Z", next_follow_up_at: "2026-09-28T15:00:00.000Z" }),
  );
  const loaded = await loadCallSheet(loaderDb({ leads: old, lead_notes: [], lead_calls: [], lead_messages: [] }, []), now);
  assert.equal(loaded.ok, true);
  assert.equal(loaded.leadsCapped, true);
  const page = readFileSync(join(process.cwd(), "app/admin/call-sheet/page.tsx"), "utf8");
  assert.ok(page.includes("loaded.leadsCapped"), "the page says when a lead read came back full");
});

// ---------------------------------------------------------------------------
// The call card is where every row now links. When the lead reached out, it
// has to show what they sent, and the partial-history banner has to point at
// a thread that exists.
// ---------------------------------------------------------------------------

test("latestInbound: the newest message or missed call from the lead, by the sheet's own rules", () => {
  const msg = (overrides: Record<string, unknown>) => ({
    lead_id: "a",
    direction: "in",
    channel: "sms",
    body: "Can you do a quote\nfor 3 acres Thursday?",
    created_at: hoursAgo(2),
    ...overrides,
  });
  const call = (overrides: Record<string, unknown>) => ({
    lead_id: "a",
    started_at: hoursAgo(1),
    direction: "incoming",
    outcome: "missed",
    scope_status: "company",
    ...overrides,
  });
  assert.equal(callSheetModule.latestInbound({ calls: [], messages: [] }), null);
  assert.deepEqual(callSheetModule.latestInbound({ calls: [], messages: [msg({})] as never }), {
    kind: "message_in",
    at: hoursAgo(2),
    channel: "sms",
    said: "Can you do a quote for 3 acres Thursday?",
  });
  // The newest wins, whether it is a call or a message.
  assert.deepEqual(callSheetModule.latestInbound({ calls: [call({})] as never, messages: [msg({})] as never }), {
    kind: "call_in",
    at: hoursAgo(1),
    channel: null,
    said: null,
  });
  assert.equal(callSheetModule.latestInbound({ calls: [call({ started_at: hoursAgo(5) })] as never, messages: [msg({})] as never })?.kind, "message_in");
  // Not the lead reaching out: a message we sent, a reply a person logged by hand, a call somebody answered,
  // our own outgoing call, a call scoped out of the company, and a row with no time.
  const none = callSheetModule.latestInbound({
    calls: [call({ outcome: "answered" }), call({ direction: "outgoing", outcome: "no_answer" }), call({ scope_status: "personal" }), call({ started_at: null })] as never,
    messages: [msg({ direction: "out" }), msg({ channel: "note" }), msg({ created_at: "" })] as never,
  });
  assert.equal(none, null);
  // A long message is clipped for the card; the full thread is one tap away.
  const long = callSheetModule.latestInbound({ calls: [], messages: [msg({ body: "w".repeat(1000) })] as never });
  assert.equal(long?.said?.length, callSheetModule.INBOUND_SUMMARY_MAX);
  assert.ok(long?.said?.endsWith("..."));
});

test("loader: the call card's touches come with the lead's latest message, from the same two reads", async () => {
  const code = ts.transpileModule(readFileSync(join(process.cwd(), "lib/callSheetServer.ts"), "utf8"), {
    compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 },
  }).outputText;
  const modules: Record<string, unknown> = { "server-only": {}, "@/lib/callSheet": callSheetModule, "@/lib/speedToLead": speedToLeadModule };
  const mod = { exports: {} as Record<string, unknown> };
  new Function("require", "module", "exports", code)((name: string) => modules[name], mod, mod.exports);
  const loadLeadTouches = mod.exports.loadLeadTouches as (db: unknown, id: string) => Promise<{
    ok: boolean;
    touches: CallSheetTouch[];
    latestInbound: ReturnType<typeof callSheetModule.latestInbound>;
  }>;
  const queries: FakeQuery[] = [];
  const db = loaderDb(
    {
      lead_calls: [],
      lead_messages: [
        { lead_id: "a", direction: "in", channel: "sms", body: "Are you open Saturday?", created_at: hoursAgo(3), delivered: null },
        { lead_id: "b", direction: "in", channel: "sms", body: "Someone else's text", created_at: hoursAgo(1), delivered: null },
      ],
    },
    queries,
  );
  const loaded = await loadLeadTouches(db, "a");
  assert.equal(loaded.ok, true);
  assert.equal(loaded.latestInbound?.said, "Are you open Saturday?");
  assert.deepEqual(loaded.touches.map((t) => t.kind), ["message_in"]);
  assert.deepEqual(queries.map((q) => q.table).sort(), ["lead_calls", "lead_messages"], "no extra read");
});

test("the partial-history banner points at the thread where it lives: Full record on the row", () => {
  const page = readFileSync(join(process.cwd(), "app/admin/call-sheet/page.tsx"), "utf8");
  const banner = page.slice(page.indexOf("loaded.partial ?"), page.indexOf("loaded.leadsCapped ?"));
  assert.ok(banner.includes("Tap Full record on the"), banner);
  assert.ok(!/thread on the\s+call card/.test(page), "the call card has no thread to check");
  // The row really has that link, to the lead record with the thread.
  assert.match(page, /href=\{`\/admin\/leads\/\$\{row\.lead\.id\}`\}[\s\S]{0,400}Full record/);
  assert.deepEqual(copyProblems(banner.replace(/<[^>]+>|\{[^}]*\}/g, " ")), []);
});
