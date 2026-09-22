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
import { copyProblems } from "../lib/hq/copy.ts";
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
  assert.equal(row.reason, "You set a call back with Lead cb at Sample Roofing (fictional) for Fri, Sep 18 at 10:00 AM. Last: Call: talked, call back later.");
  assert.equal(row.href, "/admin/call-sheet/cb");
  assert.equal(sheet.counts.callback, 1);
  assert.deepEqual(copyProblems(row.reason), []);

  // No note on file: the promise still stands, just without a "Last:" line.
  const called = buildCallSheet([cb], [{ lead_id: "cb", at: "2026-09-15T20:00:00.000Z", kind: "call" }], NOW);
  assert.equal(called.rows[0].tier, "callback");
  assert.equal(called.rows[0].reason, "You set a call back with Lead cb at Sample Roofing (fictional) for Fri, Sep 18 at 10:00 AM.");

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
    // /api/business-diagnostic sets next_follow_up_at to the submission time on a brand-new lead.
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
  assert.match(sheet.rows[2].reason, /for Sat, Sep 19 at 2:30 PM\./);
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
});
