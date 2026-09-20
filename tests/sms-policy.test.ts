import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import test from "node:test";
import { SEND_WINDOW, decideSend, localHour, withinSendWindow } from "../lib/smsPolicy.ts";

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
  assert.ok(quo.includes("decideSend({"), "sendLeadText consults the policy");
  assert.ok(quo.includes("smsSuppressedGlobally(e164)"), "sendLeadText consults the STOP list");
  const suppressedIndex = quo.indexOf("smsSuppressedGlobally(e164)");
  const fetchIndex = quo.indexOf("fetch(QUO_API", suppressedIndex);
  assert.ok(suppressedIndex > 0 && fetchIndex > suppressedIndex, "the lookup happens before the provider call");
  const adminRoute = readFileSync(join(process.cwd(), "app/api/admin/lead-message/route.ts"), "utf8");
  assert.ok(adminRoute.includes("{ humanInitiated: true }"), "a CRM send is a human decision");
  for (const file of ["lib/leadNotify.ts", "app/api/leads/route.ts", "app/api/meta-leads/route.ts"]) {
    const source = readFileSync(join(process.cwd(), file), "utf8");
    assert.ok(!source.includes("humanInitiated: true"), `${file} is automated and must not skip the window`);
    assert.ok(!source.includes("api.openphone.com"), `${file} never calls the provider directly`);
  }
});
