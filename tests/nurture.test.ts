import { describe, it } from "node:test";
import assert from "node:assert/strict";
import {
  NURTURE_STEPS,
  NURTURE_FIRST_STEP,
  NURTURE_LAST_STEP,
  inSendWindow,
  stepDueOnDay,
  stepsDueBy,
} from "../lib/nurture.ts";

// A UTC instant that renders as the given hour in America/Chicago, whichever
// side of the DST line the date falls on. Written this way so the window test
// keeps meaning the same thing in January and July.
function centralHour(isoDate: string, hour: number): Date {
  for (let utcHour = 0; utcHour < 48; utcHour++) {
    const candidate = new Date(`${isoDate}T00:00:00Z`);
    candidate.setUTCHours(utcHour);
    const rendered = Number(
      new Intl.DateTimeFormat("en-US", {
        timeZone: "America/Chicago",
        hour: "numeric",
        hour12: false,
      }).format(candidate),
    );
    if ((rendered === 24 ? 0 : rendered) === hour) return candidate;
  }
  throw new Error(`no UTC instant renders as ${hour}:00 Central on ${isoDate}`);
}

describe("the 30 day sequence", () => {
  it("is exactly thirty steps, one per day, days 1 through 30", () => {
    assert.equal(NURTURE_STEPS.length, 30);
    NURTURE_STEPS.forEach((step, index) => {
      assert.equal(step.day, index + 1, `step at index ${index} is on the wrong day`);
    });
  });

  it("numbers steps 101 to 130 and never reuses the retired 0-4 range", () => {
    assert.equal(NURTURE_FIRST_STEP, 101);
    assert.equal(NURTURE_LAST_STEP, 130);
    const numbers = NURTURE_STEPS.map((s) => s.step);
    assert.equal(new Set(numbers).size, 30, "duplicate step numbers would collide in lead_emails");
    for (const n of numbers) assert.ok(n >= 101, `step ${n} collides with the retired series`);
  });

  it("writes no em dashes and promises no lead volume", () => {
    // Both are house rules. The only guarantee allowed is the ten business day
    // delivery one, which says nothing about how many leads anybody gets.
    const banned = /\b(guaranteed leads|ROAS|cost per lead|conversion rate)\b/i;
    for (const step of NURTURE_STEPS) {
      const text = `${step.subject}\n${step.body("Sam")}`;
      assert.ok(!text.includes("—"), `step ${step.step} contains an em dash`);
      assert.ok(!banned.test(text), `step ${step.step} promises a metric`);
    }
  });
});

describe("stepDueOnDay / stepsDueBy", () => {
  it("owes nothing on day zero", () => {
    assert.equal(stepDueOnDay(0), null);
    assert.deepEqual(stepsDueBy(0), []);
  });

  it("owes the matching step on its own day", () => {
    assert.equal(stepDueOnDay(1)?.step, 101);
    assert.equal(stepDueOnDay(30)?.step, 130);
  });

  it("stops at the last step once the sequence is over", () => {
    assert.equal(stepDueOnDay(400)?.step, 130);
    assert.equal(stepsDueBy(400).length, 30);
  });

  it("hands a late lead the whole backlog oldest first, so the cron sends one a day", () => {
    const due = stepsDueBy(5);
    assert.deepEqual(due.map((s) => s.step), [101, 102, 103, 104, 105]);
  });
});

describe("inSendWindow", () => {
  // Summer (CDT, UTC-5) and winter (CST, UTC-6) so a DST bug cannot hide.
  for (const date of ["2026-07-15", "2026-01-15"]) {
    it(`sends between 8am and 6pm Central on ${date}`, () => {
      assert.equal(inSendWindow(centralHour(date, 8)), true, "8am is in");
      assert.equal(inSendWindow(centralHour(date, 12)), true, "noon is in");
      assert.equal(inSendWindow(centralHour(date, 17)), true, "5pm is in");
    });

    it(`stays quiet outside the window on ${date}`, () => {
      assert.equal(inSendWindow(centralHour(date, 7)), false, "7am is too early");
      assert.equal(inSendWindow(centralHour(date, 18)), false, "6pm is the close, not in");
      assert.equal(inSendWindow(centralHour(date, 2)), false, "2am is how you get marked as spam");
      assert.equal(inSendWindow(centralHour(date, 0)), false, "midnight is out");
    });
  }

  it("passes at the hour the cron is actually scheduled for (16:00 UTC)", () => {
    for (const date of ["2026-07-15", "2026-01-15"]) {
      const cronTime = new Date(`${date}T16:00:00Z`);
      assert.equal(inSendWindow(cronTime), true, `the daily cron would not send on ${date}`);
    }
  });
});
