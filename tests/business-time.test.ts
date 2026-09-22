import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import test from "node:test";
import {
  BUSINESS_TZ,
  addBusinessDays,
  addCalendarDays,
  centralDate,
  centralHour,
  formatCentral,
  formatCentralDate,
  isBusinessDay,
  isLocalDate,
  isLocalTime,
  nextBusinessAt,
  nextWeekdayAfter,
  quickCallbackChoices,
  wallClockToInstant,
  weekdayOf,
} from "../lib/businessTime.ts";
import { copyProblems } from "../lib/hq/copy.ts";
import { BUSINESS } from "../lib/site/business.ts";

// Fixed clocks only. Tue 2026-09-22 10:00 AM CDT is the shared sample "now".
const TUE_10AM = new Date("2026-09-22T15:00:00.000Z");
// Fri 2026-09-25 4:30 PM CDT.
const FRI_430PM = new Date("2026-09-25T21:30:00.000Z");
// Fri 2026-10-30 10:00 AM CDT, the Friday before the clocks fall back on Sunday Nov 1.
const FRI_BEFORE_FALL_BACK = new Date("2026-10-30T15:00:00.000Z");

const iso = (d: Date) => d.toISOString();

test("the business zone comes from the business identity", () => {
  assert.equal(BUSINESS_TZ, BUSINESS.timezone);
  assert.equal(BUSINESS_TZ, "America/Chicago");
});

test("the two anchor conversions: CST after the fall change, CDT before it", () => {
  assert.equal(iso(wallClockToInstant("2026-11-02", "10:00")), "2026-11-02T16:00:00.000Z");
  assert.equal(iso(wallClockToInstant("2026-10-30", "15:00")), "2026-10-30T20:00:00.000Z");
});

test("the offset is resolved for the target date, whatever today is", () => {
  // Same wall clock, a week apart across the November change: one hour apart in UTC.
  assert.equal(iso(wallClockToInstant("2026-10-26", "10:00")), "2026-10-26T15:00:00.000Z");
  assert.equal(iso(wallClockToInstant("2026-11-09", "10:00")), "2026-11-09T16:00:00.000Z");
  // And across the March change.
  assert.equal(iso(wallClockToInstant("2026-03-06", "10:00")), "2026-03-06T16:00:00.000Z");
  assert.equal(iso(wallClockToInstant("2026-03-09", "10:00")), "2026-03-09T15:00:00.000Z");
  // A winter date and a summer date convert correctly regardless of the other.
  assert.equal(iso(wallClockToInstant("2027-01-15", "09:00")), "2027-01-15T15:00:00.000Z");
  assert.equal(iso(wallClockToInstant("2027-07-15", "09:00")), "2027-07-15T14:00:00.000Z");
});

test("spring forward, Sunday 2026-03-08: times before, inside, and after the skipped hour", () => {
  assert.equal(iso(wallClockToInstant("2026-03-08", "00:00")), "2026-03-08T06:00:00.000Z");
  assert.equal(iso(wallClockToInstant("2026-03-08", "01:59")), "2026-03-08T07:59:00.000Z");
  // 2:00 to 2:59 never happens that morning; it moves forward by the skipped hour.
  assert.equal(iso(wallClockToInstant("2026-03-08", "02:00")), "2026-03-08T08:00:00.000Z");
  assert.equal(iso(wallClockToInstant("2026-03-08", "02:30")), "2026-03-08T08:30:00.000Z");
  assert.equal(formatCentral(wallClockToInstant("2026-03-08", "02:30")), "Sun, Mar 8 at 3:30 AM");
  assert.equal(iso(wallClockToInstant("2026-03-08", "03:00")), "2026-03-08T08:00:00.000Z");
  assert.equal(iso(wallClockToInstant("2026-03-08", "10:00")), "2026-03-08T15:00:00.000Z");
  assert.equal(iso(wallClockToInstant("2026-03-08", "23:59")), "2026-03-09T04:59:00.000Z");
});

test("fall back, Sunday 2026-11-01: times before, inside, and after the repeated hour", () => {
  assert.equal(iso(wallClockToInstant("2026-11-01", "00:30")), "2026-11-01T05:30:00.000Z");
  // 1:00 to 1:59 happens twice; the first one (still CDT) wins.
  assert.equal(iso(wallClockToInstant("2026-11-01", "01:00")), "2026-11-01T06:00:00.000Z");
  assert.equal(iso(wallClockToInstant("2026-11-01", "01:30")), "2026-11-01T06:30:00.000Z");
  assert.equal(iso(wallClockToInstant("2026-11-01", "02:00")), "2026-11-01T08:00:00.000Z");
  assert.equal(iso(wallClockToInstant("2026-11-01", "10:00")), "2026-11-01T16:00:00.000Z");
  assert.equal(iso(wallClockToInstant("2026-11-01", "23:30")), "2026-11-02T05:30:00.000Z");
});

test("every quarter hour of both change days reads back as the wall clock that was asked for", () => {
  for (const day of ["2026-03-08", "2026-11-01", "2026-09-22", "2026-12-31"]) {
    for (let h = 0; h < 24; h += 1) {
      for (const m of [0, 15, 30, 45]) {
        const time = `${String(h).padStart(2, "0")}:${String(m).padStart(2, "0")}`;
        const at = wallClockToInstant(day, time);
        if (day === "2026-03-08" && h === 2) continue; // skipped hour, covered above
        assert.equal(centralDate(at), day, `${day} ${time}`);
        assert.equal(centralHour(at), h, `${day} ${time}`);
      }
    }
  }
});

test("other zones convert too, and UTC is the identity", () => {
  assert.equal(iso(wallClockToInstant("2026-11-02", "10:00", "America/New_York")), "2026-11-02T15:00:00.000Z");
  assert.equal(iso(wallClockToInstant("2026-09-22", "10:00", "UTC")), "2026-09-22T10:00:00.000Z");
  assert.equal(iso(wallClockToInstant("2026-09-22", "10:00", "Asia/Kolkata")), "2026-09-22T04:30:00.000Z");
});

test("malformed dates and times throw a RangeError instead of guessing", () => {
  for (const bad of ["2026-02-30", "2026-13-01", "2026-00-10", "2026-9-22", "26-09-22", "2026/09/22", "2026-09-22T10:00", "", " 2026-09-22"]) {
    assert.throws(() => wallClockToInstant(bad, "10:00"), RangeError, bad);
  }
  for (const bad of ["24:00", "9:00", "10:60", "10:00:00", "10:00 AM", "", "1000"]) {
    assert.throws(() => wallClockToInstant("2026-09-22", bad), RangeError, bad);
  }
  assert.throws(() => wallClockToInstant(null as unknown as string, "10:00"), RangeError);
  assert.throws(() => wallClockToInstant("2026-09-22", undefined as unknown as string), RangeError);
  assert.throws(() => centralDate(new Date("not a date")), RangeError);
  assert.throws(() => formatCentral(new Date(Number.NaN)), RangeError);
});

test("centralDate and centralHour read the Central clock, not UTC", () => {
  assert.equal(centralDate(TUE_10AM), "2026-09-22");
  assert.equal(centralHour(TUE_10AM), 10);
  // 11:30 PM Tuesday in Longview is already Wednesday in UTC.
  const lateTuesday = new Date("2026-09-23T04:30:00.000Z");
  assert.equal(centralDate(lateTuesday), "2026-09-22");
  assert.equal(centralHour(lateTuesday), 23);
  assert.equal(centralHour(new Date("2026-09-22T05:00:00.000Z")), 0);
  assert.equal(centralDate(lateTuesday, "UTC"), "2026-09-23");
});

test("calendar math: weekdays, adding days, business days", () => {
  assert.equal(weekdayOf("2026-09-22"), 2);
  assert.equal(weekdayOf("2026-09-25"), 5);
  assert.equal(weekdayOf("2026-11-01"), 0);
  assert.equal(weekdayOf("2026-03-08"), 0);

  assert.equal(addCalendarDays("2026-09-22", 0), "2026-09-22");
  assert.equal(addCalendarDays("2026-09-30", 1), "2026-10-01");
  assert.equal(addCalendarDays("2026-12-31", 1), "2027-01-01");
  assert.equal(addCalendarDays("2028-02-28", 1), "2028-02-29");
  assert.equal(addCalendarDays("2026-03-01", -1), "2026-02-28");
  assert.equal(addCalendarDays("2026-10-31", 2), "2026-11-02");
  assert.throws(() => addCalendarDays("2026-09-22", 1.5), RangeError);

  assert.equal(isBusinessDay("2026-09-25"), true);
  assert.equal(isBusinessDay("2026-09-26"), false);
  assert.equal(isBusinessDay("2026-09-27"), false);
  assert.equal(isBusinessDay("2026-09-28"), true);
  // Holidays are not skipped (documented): Thanksgiving 2026 is a business day here.
  assert.equal(isBusinessDay("2026-11-26"), true);
});

test("addBusinessDays skips the weekend: Friday + 1 is Monday", () => {
  assert.equal(addBusinessDays("2026-09-25", 1), "2026-09-28");
  assert.equal(addBusinessDays("2026-09-25", 2), "2026-09-29");
  assert.equal(addBusinessDays("2026-09-25", 5), "2026-10-02");
  assert.equal(addBusinessDays("2026-09-22", 1), "2026-09-23");
  assert.equal(addBusinessDays("2026-09-22", 4), "2026-09-28");
  assert.equal(addBusinessDays("2026-09-26", 1), "2026-09-28"); // Saturday
  assert.equal(addBusinessDays("2026-09-27", 1), "2026-09-28"); // Sunday
  assert.equal(addBusinessDays("2026-10-30", 2), "2026-11-03");
  // n = 0 returns the date unchanged, weekend or not.
  assert.equal(addBusinessDays("2026-09-22", 0), "2026-09-22");
  assert.equal(addBusinessDays("2026-09-26", 0), "2026-09-26");
  assert.throws(() => addBusinessDays("2026-09-22", -1), RangeError);
  assert.throws(() => addBusinessDays("2026-09-22", 1.5), RangeError);
  assert.throws(() => addBusinessDays("2026-02-30", 1), RangeError);
});

test("nextBusinessAt: Friday 4:30 PM + 1 at 10:00 lands Monday 10:00 AM CDT", () => {
  const at = nextBusinessAt(FRI_430PM, 1, "10:00");
  assert.equal(iso(at), "2026-09-28T15:00:00.000Z");
  assert.equal(formatCentral(at), "Mon, Sep 28 at 10:00 AM");
});

test("nextBusinessAt: Friday Oct 30 + 2 at 10:00 lands Tuesday Nov 3 in CST, after the clocks change", () => {
  const at = nextBusinessAt(FRI_BEFORE_FALL_BACK, 2, "10:00");
  assert.equal(iso(at), "2026-11-03T16:00:00.000Z");
  assert.equal(formatCentral(at), "Tue, Nov 3 at 10:00 AM");
  // Late Friday evening in Longview is Saturday in UTC; the count still starts from Friday.
  const lateFriday = new Date("2026-10-31T04:30:00.000Z");
  assert.equal(iso(nextBusinessAt(lateFriday, 2, "10:00")), "2026-11-03T16:00:00.000Z");
  assert.equal(iso(nextBusinessAt(TUE_10AM, 0, "13:00")), "2026-09-22T18:00:00.000Z");
});

test("nextWeekdayAfter with the Tuesday and Thursday proposal slots", () => {
  const slots = [2, 4];
  assert.equal(nextWeekdayAfter("2026-09-21", slots), "2026-09-22"); // Mon -> Tue
  assert.equal(nextWeekdayAfter("2026-09-22", slots), "2026-09-24"); // Tue -> Thu (strictly after)
  assert.equal(nextWeekdayAfter("2026-09-23", slots), "2026-09-24"); // Wed -> Thu
  assert.equal(nextWeekdayAfter("2026-09-24", slots), "2026-09-29"); // Thu -> next Tue
  assert.equal(nextWeekdayAfter("2026-09-25", slots), "2026-09-29"); // Fri -> Tue
  assert.equal(nextWeekdayAfter("2026-09-26", slots), "2026-09-29"); // Sat -> Tue
  assert.equal(nextWeekdayAfter("2026-09-27", slots), "2026-09-29"); // Sun -> Tue
  assert.equal(nextWeekdayAfter("2026-12-31", slots), "2027-01-05"); // Thu -> Tue across the year
  assert.equal(nextWeekdayAfter("2026-09-22", [2]), "2026-09-29"); // one slot, a week later
  assert.throws(() => nextWeekdayAfter("2026-09-22", []), RangeError);
  assert.throws(() => nextWeekdayAfter("2026-09-22", [7]), RangeError);
  assert.throws(() => nextWeekdayAfter("2026-02-30", slots), RangeError);
});

test("formatCentral prints a short, plain Central label", () => {
  assert.equal(formatCentral(new Date("2026-09-28T15:00:00.000Z")), "Mon, Sep 28 at 10:00 AM");
  assert.equal(formatCentral(new Date("2026-09-24T19:00:00.000Z")), "Thu, Sep 24 at 2:00 PM");
  assert.equal(formatCentral(new Date("2026-09-24T05:00:00.000Z")), "Thu, Sep 24 at 12:00 AM");
  assert.equal(formatCentral(new Date("2026-09-24T17:05:00.000Z")), "Thu, Sep 24 at 12:05 PM");
  // 10:30 PM Monday in Longview is Tuesday in UTC.
  assert.equal(formatCentral(new Date("2026-09-29T03:30:00.000Z")), "Mon, Sep 28 at 10:30 PM");
  assert.equal(formatCentral(new Date("2026-11-02T16:00:00.000Z")), "Mon, Nov 2 at 10:00 AM");
  assert.equal(formatCentral(new Date("2026-09-28T15:00:00.000Z"), "UTC"), "Mon, Sep 28 at 3:00 PM");
  const label = formatCentral(TUE_10AM);
  assert.equal(label, "Tue, Sep 22 at 10:00 AM");
  assert.match(label, /^[\x20-\x7e]+$/, "plain ASCII spaces only, no narrow no-break space");
  assert.deepEqual(copyProblems(label), []);
});

test("formatCentralDate is calendar-only", () => {
  assert.equal(formatCentralDate("2026-09-24"), "Thu, Sep 24");
  assert.equal(formatCentralDate("2026-11-01"), "Sun, Nov 1");
  assert.equal(formatCentralDate("2027-01-05"), "Tue, Jan 5");
  assert.throws(() => formatCentralDate("2026-02-30"), RangeError);
});

test("isLocalDate accepts only real calendar dates", () => {
  for (const good of ["2026-09-22", "2026-02-28", "2028-02-29", "2000-02-29", "2026-12-31", "2026-01-01"]) {
    assert.equal(isLocalDate(good), true, good);
  }
  for (const bad of ["2026-02-30", "2026-02-29", "2100-02-29", "2026-04-31", "2026-13-01", "2026-00-01", "2026-09-00", "2026-9-22", "2026-09-22T00:00", "20260922", "", null, undefined, 20260922, {}]) {
    assert.equal(isLocalDate(bad), false, String(bad));
  }
});

test("isLocalTime accepts only 24-hour HH:MM", () => {
  for (const good of ["00:00", "09:00", "13:30", "23:59"]) assert.equal(isLocalTime(good), true, good);
  for (const bad of ["24:00", "9:00", "12:60", "12:5", "10:00:00", "10:00 AM", "", null, 900]) {
    assert.equal(isLocalTime(bad), false, String(bad));
  }
});

test("quickCallbackChoices on a Friday skips the weekend", () => {
  const chips = quickCallbackChoices(FRI_430PM);
  assert.equal(chips.length, 3);
  assert.deepEqual(chips.map((c) => c.localDate), ["2026-09-28", "2026-09-29", "2026-10-02"]);
  assert.deepEqual(chips.map((c) => c.time), ["09:00", "09:00", "09:00"]);
  assert.deepEqual(chips.map((c) => c.label), ["Mon, Sep 28 at 9:00 AM", "Tue, Sep 29 at 9:00 AM", "Fri, Oct 2 at 9:00 AM"]);
  assert.equal(new Set(chips.map((c) => c.id)).size, 3, "ids are unique");
  for (const chip of chips) {
    assert.ok(isLocalDate(chip.localDate) && isLocalTime(chip.time));
    assert.ok(wallClockToInstant(chip.localDate, chip.time).getTime() > FRI_430PM.getTime(), "always in the future");
    assert.deepEqual(copyProblems(chip.label), [], chip.label);
  }
});

test("quickCallbackChoices counts from the Central date and keeps 9:00 AM across the clock change", () => {
  // 11:30 PM Friday in Longview (Saturday in UTC) still offers Monday first.
  const lateFriday = new Date("2026-09-26T04:30:00.000Z");
  assert.deepEqual(quickCallbackChoices(lateFriday).map((c) => c.localDate), ["2026-09-28", "2026-09-29", "2026-10-02"]);

  const acrossChange = quickCallbackChoices(FRI_BEFORE_FALL_BACK);
  assert.deepEqual(acrossChange.map((c) => c.localDate), ["2026-11-02", "2026-11-03", "2026-11-06"]);
  assert.equal(acrossChange[0].label, "Mon, Nov 2 at 9:00 AM");
  assert.equal(iso(wallClockToInstant(acrossChange[0].localDate, acrossChange[0].time)), "2026-11-02T15:00:00.000Z");

  assert.deepEqual(quickCallbackChoices(TUE_10AM).map((c) => c.localDate), ["2026-09-23", "2026-09-24", "2026-09-29"]);
});

test("the module is a leaf: only the time helpers and the business identity, no clock, no network", () => {
  const source = readFileSync(join(process.cwd(), "lib/businessTime.ts"), "utf8");
  const imports = [...source.matchAll(/from\s+["']([^"']+)["']/g)].map((m) => m[1]).sort();
  assert.deepEqual(imports, ["@/lib/hq/time", "@/lib/site/business"]);
  assert.doesNotMatch(source, /Date\.now\(|new Date\(\)/, "now is always passed in");
  assert.doesNotMatch(source, /fetch\(|supabase|leadNotify|\bquo\b/i);
  assert.doesNotMatch(source, /[\u2013\u2014]/, "no em or en dashes, comments included");
});
