// Business clock math for the Call Closer: callbacks, sit-downs, and the
// "check the payment tomorrow" follow-up, all in Central time.
//
// Why this exists: a lead who hears "I'll call you Monday at 10" expects the
// phone to ring at 10:00 AM in Longview, not at 10:00 UTC and not an hour off
// because the clocks changed over the weekend. The offset for a callback has
// to be the offset on the day of the callback (CDT is UTC-5, CST is UTC-6),
// never the offset of the moment Ryan saved the note. Every function here
// works that way.
//
// Rules the rest of the Call Closer depends on:
// - "now" is always passed in. Nothing here reads the clock, so the same
//   inputs give the same answer in a test, on the server, and in the browser.
// - A local date is a "YYYY-MM-DD" string and a local time is "HH:MM" on a
//   24-hour clock. Date-only math (weekdays, adding days) is plain calendar
//   arithmetic with no timezone in it at all.
// - Business days are Monday to Friday. Holidays are NOT skipped: a callback
//   can land on Thanksgiving. Ryan sees the date before he saves it.
// - Malformed dates, times, or day counts throw a RangeError instead of
//   quietly producing a wrong day.
// - An unknown timezone falls back to America/Chicago, the same rule
//   lib/hq/time.ts uses.
//
// Leaf module: imports only lib/hq/time.ts and lib/site/business.ts. It never
// writes, sends, or fetches anything.

import { isValidTimezone, localParts } from "@/lib/hq/time";
import { BUSINESS } from "@/lib/site/business";

/** Every call time the closer shows or stores is read in this zone. */
export const BUSINESS_TZ: string = BUSINESS.timezone;

const DAY_MS = 86_400_000;
const LOCAL_DATE_RE = /^\d{4}-\d{2}-\d{2}$/;
const LOCAL_TIME_RE = /^([01]\d|2[0-3]):[0-5]\d$/;
const SHORT_WEEKDAYS = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
const SHORT_MONTHS = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];

type YMD = { year: number; month: number; day: number };

function zoneOrDefault(tz: string): string {
  return typeof tz === "string" && isValidTimezone(tz) ? tz : "America/Chicago";
}

function isLeapYear(year: number): boolean {
  return (year % 4 === 0 && year % 100 !== 0) || year % 400 === 0;
}

function daysInMonth(year: number, month: number): number {
  if (month === 2) return isLeapYear(year) ? 29 : 28;
  return [4, 6, 9, 11].includes(month) ? 30 : 31;
}

/**
 * Milliseconds for a UTC wall clock. setUTCFullYear avoids Date.UTC's habit
 * of reading years 0 to 99 as 1900 to 1999.
 */
function utcMs(year: number, month: number, day: number, hour = 0, minute = 0): number {
  const d = new Date(0);
  d.setUTCFullYear(year, month - 1, day);
  d.setUTCHours(hour, minute, 0, 0);
  return d.getTime();
}

function formatYmd(ms: number): string {
  const d = new Date(ms);
  const y = String(d.getUTCFullYear()).padStart(4, "0");
  const m = String(d.getUTCMonth() + 1).padStart(2, "0");
  const day = String(d.getUTCDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

function parseLocalDate(localDate: string): YMD {
  if (!isLocalDate(localDate)) {
    throw new RangeError(`Expected a real calendar date as YYYY-MM-DD, got ${JSON.stringify(localDate)}.`);
  }
  const [year, month, day] = localDate.split("-").map(Number);
  return { year, month, day };
}

function parseLocalTime(time: string): { hour: number; minute: number } {
  if (!isLocalTime(time)) {
    throw new RangeError(`Expected a 24-hour time as HH:MM, got ${JSON.stringify(time)}.`);
  }
  const [hour, minute] = time.split(":").map(Number);
  return { hour, minute };
}

function assertValidInstant(at: Date): void {
  if (!(at instanceof Date) || Number.isNaN(at.getTime())) {
    throw new RangeError("Expected a valid Date.");
  }
}

/** The wall clock in `tz` at an instant, written as if it were UTC. */
function wallMs(ms: number, tz: string): number {
  const p = localParts(new Date(ms), tz);
  return utcMs(p.year, p.month, p.day, p.hour, p.minute);
}

/** The zone's offset from UTC at an instant, in ms (CDT is -5 hours). */
function offsetAt(ms: number, tz: string): number {
  return wallMs(ms, tz) - ms;
}

/**
 * The instant a Central wall clock names on a given date, for example
 * ("2026-11-02", "10:00") -> 2026-11-02T16:00:00.000Z (CST, UTC-6) and
 * ("2026-10-30", "15:00") -> 2026-10-30T20:00:00.000Z (CDT, UTC-5).
 *
 * The offset is resolved for the TARGET date, not today. It reads the
 * zone's offset with localParts a day either side of the date (a real zone
 * changes its clocks at most once in that window), converts with each, and
 * keeps the result whose local wall clock reads back as the requested one.
 *
 * The two DST edges follow the usual calendar-app rule:
 * - Fall back (2026-11-01 01:30 happens twice): the earlier one, still CDT.
 * - Spring forward (2026-03-08 02:30 never happens): moved forward by the
 *   skipped hour, so it lands at 03:30 CDT.
 */
export function wallClockToInstant(localDate: string, time: string, tz: string = BUSINESS_TZ): Date {
  const { year, month, day } = parseLocalDate(localDate);
  const { hour, minute } = parseLocalTime(time);
  const zone = zoneOrDefault(tz);
  const target = utcMs(year, month, day, hour, minute);

  const before = offsetAt(target - DAY_MS, zone);
  const after = offsetAt(target + DAY_MS, zone);
  const candidates = Array.from(new Set([before, after]))
    .map((offset) => target - offset)
    .sort((a, b) => a - b);
  for (const candidate of candidates) {
    if (wallMs(candidate, zone) === target) return new Date(candidate);
  }
  // The clocks skipped this time. Keep the offset from before the change,
  // which pushes the call forward by exactly the skipped amount.
  return new Date(target - before);
}

/** The calendar date ("YYYY-MM-DD") in `tz` at an instant. */
export function centralDate(at: Date, tz: string = BUSINESS_TZ): string {
  assertValidInstant(at);
  return localParts(at, zoneOrDefault(tz)).date;
}

/** The hour of the day, 0 to 23, in `tz` at an instant. */
export function centralHour(at: Date, tz: string = BUSINESS_TZ): number {
  assertValidInstant(at);
  return localParts(at, zoneOrDefault(tz)).hour;
}

/** 0 Sunday to 6 Saturday for a calendar date. Pure calendar math, no timezone. */
export function weekdayOf(localDate: string): number {
  const { year, month, day } = parseLocalDate(localDate);
  return new Date(utcMs(year, month, day)).getUTCDay();
}

/** The calendar date `n` days after `localDate` (negative goes back). Pure calendar math. */
export function addCalendarDays(localDate: string, n: number): string {
  const { year, month, day } = parseLocalDate(localDate);
  if (!Number.isInteger(n)) throw new RangeError(`Expected a whole number of days, got ${n}.`);
  return formatYmd(utcMs(year, month, day + n));
}

/** Monday to Friday. Holidays are not skipped. */
export function isBusinessDay(localDate: string): boolean {
  const weekday = weekdayOf(localDate);
  return weekday >= 1 && weekday <= 5;
}

/**
 * Steps `n` business days forward, skipping Saturday and Sunday: Friday + 1
 * is Monday, Saturday + 1 is Monday. `n = 0` returns the same date, even on
 * a weekend.
 */
export function addBusinessDays(localDate: string, n: number): string {
  parseLocalDate(localDate);
  if (!Number.isInteger(n) || n < 0) {
    throw new RangeError(`Expected zero or more whole business days, got ${n}.`);
  }
  let date = localDate;
  let left = n;
  while (left > 0) {
    date = addCalendarDays(date, 1);
    if (isBusinessDay(date)) left -= 1;
  }
  return date;
}

/**
 * The instant `businessDays` business days after today's Central date, at a
 * Central wall-clock time. Friday 4:30 PM + 1 at "10:00" is Monday 10:00 AM.
 * The offset is the one in force on the landing day.
 */
export function nextBusinessAt(now: Date, businessDays: number, time: string, tz: string = BUSINESS_TZ): Date {
  const day = addBusinessDays(centralDate(now, tz), businessDays);
  return wallClockToInstant(day, time, tz);
}

/**
 * The first date STRICTLY after `localDate` whose weekday is in `weekdays`
 * (0 Sunday to 6 Saturday). With the Tuesday and Thursday proposal slots
 * [2, 4]: Monday -> Tuesday, Tuesday -> Thursday, Thursday -> next Tuesday.
 */
export function nextWeekdayAfter(localDate: string, weekdays: number[]): string {
  parseLocalDate(localDate);
  const wanted = Array.isArray(weekdays) ? weekdays.filter((w) => Number.isInteger(w) && w >= 0 && w <= 6) : [];
  if (wanted.length === 0) throw new RangeError("Expected at least one weekday from 0 (Sunday) to 6 (Saturday).");
  let date = localDate;
  for (let i = 0; i < 7; i += 1) {
    date = addCalendarDays(date, 1);
    if (wanted.includes(weekdayOf(date))) return date;
  }
  // Unreachable: seven consecutive days cover every weekday.
  throw new RangeError("No matching weekday found.");
}

function clock12(hour: number, minute: number): string {
  const h = hour % 12 === 0 ? 12 : hour % 12;
  return `${h}:${String(minute).padStart(2, "0")} ${hour < 12 ? "AM" : "PM"}`;
}

/**
 * "Mon, Sep 28 at 10:00 AM" in `tz`. Built from the date parts rather than
 * Intl's own time string, so the output never carries the narrow no-break
 * space some runtimes put before AM/PM and reads the same on every device.
 */
export function formatCentral(at: Date, tz: string = BUSINESS_TZ): string {
  assertValidInstant(at);
  const p = localParts(at, zoneOrDefault(tz));
  return `${formatCentralDate(p.date)} at ${clock12(p.hour, p.minute)}`;
}

/** "Thu, Sep 24" for a calendar date. No timezone involved. */
export function formatCentralDate(localDate: string): string {
  const { month, day } = parseLocalDate(localDate);
  return `${SHORT_WEEKDAYS[weekdayOf(localDate)]}, ${SHORT_MONTHS[month - 1]} ${day}`;
}

/** A "YYYY-MM-DD" string that names a real calendar date (2026-02-30 does not). */
export function isLocalDate(v: unknown): v is string {
  if (typeof v !== "string" || !LOCAL_DATE_RE.test(v)) return false;
  const [year, month, day] = v.split("-").map(Number);
  if (month < 1 || month > 12) return false;
  return day >= 1 && day <= daysInMonth(year, month);
}

/** A 24-hour "HH:MM" time, 00:00 to 23:59. */
export function isLocalTime(v: unknown): v is string {
  return typeof v === "string" && LOCAL_TIME_RE.test(v);
}

export type QuickChoice = { id: string; label: string; localDate: string; time: string };

const QUICK_CALLBACK_DAYS = [1, 2, 5] as const;
const QUICK_CALLBACK_TIME = "09:00";

/**
 * The three one-tap callback chips: 1, 2, and 5 business days out at 9:00 AM
 * Central. Counted from today's Central date, so a Friday evening call offers
 * Monday first, never Saturday.
 */
export function quickCallbackChoices(now: Date, tz: string = BUSINESS_TZ): QuickChoice[] {
  const today = centralDate(now, tz);
  return QUICK_CALLBACK_DAYS.map((n) => {
    const localDate = addBusinessDays(today, n);
    const instant = wallClockToInstant(localDate, QUICK_CALLBACK_TIME, tz);
    return {
      id: `business-days-${n}`,
      label: formatCentral(instant, tz),
      localDate,
      time: QUICK_CALLBACK_TIME,
    };
  });
}
