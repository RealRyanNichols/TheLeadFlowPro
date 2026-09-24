import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import test from "node:test";
import { SEND_WINDOW, decideSend, localHour, nextSendWindowOpen, withinSendWindow } from "../lib/smsPolicy.ts";

// September 2026: Central Daylight Time, UTC-5.
const cdt = (hour: number, minute = 0) => new Date(Date.UTC(2026, 8, 20, hour + 5, minute));
// January 2026: Central Standard Time, UTC-6.
const cst = (hour: number, minute = 0) => new Date(Date.UTC(2026, 0, 20, hour + 6, minute));

test("the window is 8 am to 9 pm Central in both daylight and standard time", () => {
  assert.equal(SEND_WINDOW.timezone, "America/Chicago");
  assert.equal(localHour(cdt(7, 59)), 7);
  assert.equal(withinSendWindow(cdt(7, 59)), false);
  assert.equal(withinSendWindow(cdt(8, 0)), true);
  assert.equal(withinSendWindow(cdt(12, 30)), true);
  assert.equal(withinSendWindow(cdt(20, 59)), true);
  assert.equal(withinSendWindow(cdt(21, 0)), false);
  assert.equal(withinSendWindow(cdt(23, 30)), false);
  assert.equal(localHour(cst(0, 10)), 0);
  assert.equal(withinSendWindow(cst(0, 10)), false);
  assert.equal(withinSendWindow(cst(8, 0)), true);
  assert.equal(withinSendWindow(cst(21, 0)), false);
});

test("STOP wins over everything; the window holds software, not people", () => {
  assert.deepEqual(decideSend({ now: cdt(12), suppressed: true, humanInitiated: true }), { allow: false, reason: "suppressed" });
  assert.deepEqual(decideSend({ now: cdt(12), suppressed: true, humanInitiated: false }), { allow: false, reason: "suppressed" });
  assert.deepEqual(decideSend({ now: cdt(23), suppressed: false, humanInitiated: false }), { allow: false, reason: "quiet_hours" });
  assert.deepEqual(decideSend({ now: cdt(23), suppressed: false, humanInitiated: true }), { allow: true });
  assert.deepEqual(decideSend({ now: cdt(12), suppressed: false, humanInitiated: false }), { allow: true });
});

test("every application text goes through the one sender that applies the policy", () => {
  const quo = readFileSync(join(process.cwd(), "lib/quo.ts"), "utf8");
  assert.match(quo, /decideSend\(\s*\{/, "sendLeadText consults the policy");
  const suppressed = quo.search(/smsSuppressedGlobally\(\s*e164\s*\)/);
  assert.ok(suppressed > 0, "sendLeadText consults the STOP list");
  const fetchIndex = quo.indexOf("fetch(QUO_API", suppressed);
  assert.ok(fetchIndex > suppressed, "the lookup happens before the provider call");
  const adminRoute = readFileSync(join(process.cwd(), "app/api/admin/lead-message/route.ts"), "utf8");
  assert.match(adminRoute, /humanInitiated:\s*true/, "a CRM send is a human decision");
  for (const file of [
    "lib/leadNotify.ts",
    "app/api/leads/route.ts",
    "app/api/meta-leads/route.ts",
    "app/api/quo-inbound/route.ts",
    "lib/speedToLead.ts",
    "lib/speedToLeadServer.ts",
    "app/api/cron/speed-to-lead/route.ts",
  ]) {
    const source = readFileSync(join(process.cwd(), file), "utf8");
    assert.doesNotMatch(source, /humanInitiated:\s*true/, `${file} is automated and must not skip the window`);
    assert.ok(!source.includes("api.openphone.com"), `${file} never calls the provider directly`);
  }
  // The first text goes through the policy-applying sender; the staff alert
  // sender skips only the window, never the STOP list or the kill switch.
  const dispatcher = readFileSync(join(process.cwd(), "lib/speedToLeadServer.ts"), "utf8");
  assert.match(dispatcher, /sendLeadTextDetailed\(lead\.phone as string, body\)/);
  const staff = quo.slice(quo.indexOf("export async function sendStaffAlertText"));
  const staffEnd = staff.indexOf("\n}\n");
  const staffBody = staff.slice(0, staffEnd);
  assert.match(staffBody, /quoOutboundDisabled\(\)/);
  assert.match(staffBody, /smsSuppressedGlobally\(e164\)/);
  assert.ok(staffBody.indexOf("smsSuppressedGlobally(e164)") < staffBody.indexOf("fetch(QUO_API"));
  assert.doesNotMatch(staffBody, /humanInitiated/);
});

test("a held automated text waits for the next 8 am Central instead of being dropped", () => {
  // Inside the window: now.
  assert.equal(nextSendWindowOpen(cdt(12, 30)).toISOString(), cdt(12, 30).toISOString());
  // Before 8 am: 8 am the same day.
  assert.equal(nextSendWindowOpen(cdt(6, 15)).toISOString(), cdt(8, 0).toISOString());
  // After 9 pm: 8 am the next day (13:00 UTC in daylight time).
  assert.equal(nextSendWindowOpen(cdt(21, 0)).toISOString(), "2026-09-21T13:00:00.000Z");
  assert.equal(nextSendWindowOpen(cdt(23, 59)).toISOString(), "2026-09-21T13:00:00.000Z");
  // Standard time: 8 am is 14:00 UTC.
  assert.equal(nextSendWindowOpen(cst(22, 0)).toISOString(), "2026-01-21T14:00:00.000Z");
  assert.equal(nextSendWindowOpen(cst(0, 10)).toISOString(), "2026-01-20T14:00:00.000Z");
  // Across the November change: 10 pm CDT Saturday, 8 am CST Sunday.
  assert.equal(nextSendWindowOpen(new Date("2026-11-01T03:00:00.000Z")).toISOString(), "2026-11-01T14:00:00.000Z");
  // Month end rolls over.
  assert.equal(nextSendWindowOpen(new Date("2026-10-01T03:30:00.000Z")).toISOString(), "2026-10-01T13:00:00.000Z");
  assert.equal(nextSendWindowOpen(new Date("2026-10-31T02:30:00.000Z")).toISOString(), "2026-10-31T13:00:00.000Z");
  for (const at of [cdt(0), cdt(7, 59), cdt(21), cst(23, 59)]) {
    const open = nextSendWindowOpen(at);
    assert.ok(withinSendWindow(open), at.toISOString());
    assert.ok(open.getTime() > at.getTime());
    assert.ok(open.getTime() - at.getTime() <= 11 * 3_600_000 + 60_000, "never more than 11 hours");
  }
});

test("sendLeadText itself holds an automated text outside the window and lets a person through, never past STOP", async () => {
  const previous = { ...process.env };
  process.env.QUO_OUTBOUND_SMS_DISABLED = "false";
  process.env.QUO_FROM_NUMBER = "+19035008898";
  process.env.QUO_USER_ID = "";
  process.env.QUO_LEADFLOW_USER_ID = "";
  process.env.QUO_API_KEY = "test-key";
  process.env.SUPABASE_SERVICE_ROLE_KEY = "";
  const calls: string[] = [];
  const realFetch = globalThis.fetch;
  globalThis.fetch = (async (input: string | URL | Request) => {
    calls.push(String(input));
    return new Response("{}", { status: 200 });
  }) as typeof fetch;
  try {
    const { sendLeadText } = await import("../lib/quo.ts");
    // No service key: the STOP lookup fails closed, so nothing is sent even for a person.
    assert.equal(await sendLeadText("+19035550100", "hi", { humanInitiated: true }), false);
    assert.equal(calls.length, 0, "no provider call without a STOP lookup");
  } finally {
    globalThis.fetch = realFetch;
    for (const key of ["QUO_OUTBOUND_SMS_DISABLED", "QUO_FROM_NUMBER", "QUO_USER_ID", "QUO_LEADFLOW_USER_ID", "QUO_API_KEY", "SUPABASE_SERVICE_ROLE_KEY"]) {
      if (previous[key] === undefined) delete process.env[key];
      else process.env[key] = previous[key];
    }
  }
});
