// Business hours as the business states them, read in Longview's time zone.
//
// The rules the directory promises: a day the business does not mention is
// "not stated", never "closed"; an empty list is the business saying it is
// closed; a close earlier than the open runs past midnight; "24:00" is
// midnight at the end of the day. "Open now" answers true, false, or null
// (we cannot tell), and only true ever puts a business in the Open now filter.

import { localParts } from "../hq/time";
import { DAY_KEYS, type DayKey, type TimeRange, type WeeklyHours } from "./types";

export const DIRECTORY_TZ = "America/Chicago";

export const DAY_NAMES: Record<DayKey, string> = {
  mon: "Monday",
  tue: "Tuesday",
  wed: "Wednesday",
  thu: "Thursday",
  fri: "Friday",
  sat: "Saturday",
  sun: "Sunday",
};

// localParts weekday: 0 is Sunday.
const WEEKDAY_KEYS: DayKey[] = ["sun", "mon", "tue", "wed", "thu", "fri", "sat"];

function minutes(time: string): number {
  const [h, m] = time.split(":").map(Number);
  return h * 60 + m;
}

/**
 * Whether the business is open at `now` by its own stated hours, in
 * America/Chicago. True when a stated range covers now (including a range
 * that started yesterday and runs past midnight); false when today is stated
 * and no range covers now; null when hours are not listed or today is not
 * stated.
 */
export function openNow(hours: WeeklyHours | null, now: Date): boolean | null {
  if (!hours) return null;
  const local = localParts(now, DIRECTORY_TZ);
  const at = local.hour * 60 + local.minute;
  const today = WEEKDAY_KEYS[local.weekday];
  const yesterday = WEEKDAY_KEYS[(local.weekday + 6) % 7];

  for (const [open, close] of hours[today] ?? []) {
    const o = minutes(open);
    const c = minutes(close);
    if (c > o ? at >= o && at < c : at >= o) return true;
  }
  for (const [open, close] of hours[yesterday] ?? []) {
    const o = minutes(open);
    const c = minutes(close);
    if (c < o && at < c) return true;
  }
  return hours[today] === undefined ? null : false;
}

/** "17:30" -> "5:30 PM"; "24:00" and "00:00" -> "12:00 AM". */
export function formatTime(time: string): string {
  const total = minutes(time) % (24 * 60);
  const h = Math.floor(total / 60);
  const m = total % 60;
  const suffix = h < 12 ? "AM" : "PM";
  const h12 = h % 12 === 0 ? 12 : h % 12;
  return `${h12}:${String(m).padStart(2, "0")} ${suffix}`;
}

/** One day's stated hours: "8:00 AM – 5:30 PM", "Closed", or "Open 24 hours". */
export function formatHours(ranges: readonly TimeRange[]): string {
  if (!ranges.length) return "Closed";
  return ranges
    .map(([open, close]) =>
      open === "00:00" && close === "24:00" ? "Open 24 hours" : `${formatTime(open)} – ${formatTime(close)}`,
    )
    .join(", ");
}

export type HoursRow = { day: DayKey; label: string; text: string };

/** The stated days in week order, plus whether any day was left unstated. */
export function hoursRows(hours: WeeklyHours): { rows: HoursRow[]; someDaysMissing: boolean } {
  const rows: HoursRow[] = [];
  for (const day of DAY_KEYS) {
    const ranges = hours[day];
    if (ranges) rows.push({ day, label: DAY_NAMES[day], text: formatHours(ranges) });
  }
  return { rows, someDaysMissing: rows.length < DAY_KEYS.length };
}
