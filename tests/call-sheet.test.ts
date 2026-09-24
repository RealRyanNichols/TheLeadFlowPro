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
  sourceLabel,
  tiers,
  type CallSheetLead,
  type CallSheetTouch,
} from "../lib/callSheet.ts";
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
  assert.ok(server.includes("isHumanOutboundText(m.body)") && server.includes("classifyCall("));
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
  assert.match(sheet.rows[0].reason, /came in 1 hour ago from Meta lead ad asking about Free Website Program \(retired\)/);
  assert.match(sheet.rows[0].reason, /No call, text, or note from a person yet/);
  assert.equal(sheet.rows[0].href, "/admin/leads/newest");
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
  assert.ok(server.includes("isHumanOutboundText"), "the automatic texts are excluded from touches");
  assert.ok(!server.includes(".insert(") && !server.includes(".update(") && !server.includes(".delete("), "the loader is read-only");
});
