// How the plan reads in the HQ header and on Billing. A cancel at the end of
// the period is the case that used to be invisible: the plan stayed live
// and nothing said it was going to stop.

import { test, describe } from "node:test";
import assert from "node:assert/strict";
import { planBadge, planEndsAt, readableDate, shortDate } from "../app/hq/_components/plan.ts";
import { NOW, workspace } from "./fixtures/hq.ts";

describe("plan badge", () => {
  test("a trial that will renew counts the days", () => {
    const ws = workspace({ plan: "trial", trial_ends_at: "2026-09-27T02:46:22Z" });
    const badge = planBadge(ws, NOW);
    assert.equal(badge.label, "Trial, 13 days left");
    assert.equal(badge.live, true);
    assert.equal(badge.endsAt, null);
  });

  test("a trial the owner cancelled says when it ends and stays live until then", () => {
    const ws = workspace({ plan: "trial", trial_ends_at: "2026-09-27T02:46:22Z", cancel_at: "2026-09-27T02:46:22Z", timezone: "America/Chicago" });
    const badge = planBadge(ws, NOW);
    assert.equal(badge.label, "Ends Sep 26", "the owner's own evening, not the UTC date");
    assert.equal(badge.tone, "warn");
    assert.equal(badge.live, true);
    assert.equal(badge.endsAt, "2026-09-27T02:46:22Z");
    assert.equal(readableDate(planEndsAt(ws), ws.timezone), "September 26, 2026");
  });

  test("an active plan set to end reads the same way", () => {
    const ws = workspace({ plan: "active", current_period_end: "2026-10-13T02:46:22Z", cancel_at: "2026-10-13T02:46:22Z" });
    assert.equal(planBadge(ws, NOW).label, "Ends Oct 12");
    assert.equal(shortDate(ws.cancel_at, ws.timezone), "Oct 12");
  });

  test("a plan that already ended is canceled, not ending", () => {
    const ws = workspace({ plan: "canceled", cancel_at: "2026-09-27T02:46:22Z" });
    assert.equal(planEndsAt(ws), null);
    assert.equal(planBadge(ws, NOW).label, "Canceled");
    assert.equal(planBadge(workspace({ plan: "none", cancel_at: "2026-09-27T02:46:22Z" }), NOW).label, "No plan");
  });

  test("a bad date never breaks the badge", () => {
    const ws = workspace({ plan: "active", cancel_at: "not a date" });
    assert.equal(planEndsAt(ws), null);
    assert.equal(planBadge(ws, NOW).label, "Active");
    assert.equal(readableDate("not a date", ws.timezone), "");
  });
});
