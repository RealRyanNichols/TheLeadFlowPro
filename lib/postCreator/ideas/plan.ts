// Post Creator idea engine: a month of posts in one tap.
//
// The planner walks the calendar from a start date and draws the next idea
// for every posting day (every day, Monday to Friday, or Monday, Wednesday,
// and Friday), so a month never repeats an idea and the idea machine picks up
// after it. The plan is a list for the owner: nothing is scheduled or posted.
// It comes out as spreadsheet rows or as one block of text to copy.
//
// Dates are the owner's own calendar days (local time, noon, so a daylight
// saving change never skips or repeats a day). Pure, browser-safe.

import { platformById, type PlatformId } from "../options";
import { draftCopyText, renderDraft } from "./drafts";
import { drawNext } from "./engine";
import type { EngineInput, PlanCadence, PlanDay, ShuffleState } from "./types";

const ISO_DAY = /^(\d{4})-(\d{2})-(\d{2})$/;
const MAX_PLAN_DAYS = 366;

const WEEKDAYS = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"] as const;
const MONTHS = [
  "January",
  "February",
  "March",
  "April",
  "May",
  "June",
  "July",
  "August",
  "September",
  "October",
  "November",
  "December",
] as const;

const pad2 = (n: number) => String(n).padStart(2, "0");

/** A YYYY-MM-DD day as local noon, or null when it is not a real day. */
export function parsePlanDay(s: string): Date | null {
  const m = ISO_DAY.exec(typeof s === "string" ? s.trim() : "");
  if (!m) return null;
  const year = Number(m[1]);
  const month = Number(m[2]);
  const day = Number(m[3]);
  const date = new Date(year, month - 1, day, 12);
  if (date.getFullYear() !== year || date.getMonth() !== month - 1 || date.getDate() !== day) return null;
  return date;
}

/** A local date as YYYY-MM-DD. */
export function planDayOf(date: Date): string {
  return `${date.getFullYear()}-${pad2(date.getMonth() + 1)}-${pad2(date.getDate())}`;
}

/** "2026-09-28" as "Monday, September 28". */
export function planDayLabel(isoDay: string): string {
  const date = parsePlanDay(isoDay);
  if (!date) return isoDay;
  return `${WEEKDAYS[date.getDay()]}, ${MONTHS[date.getMonth()]} ${date.getDate()}`;
}

function postsOn(cadence: PlanCadence, weekday: number): boolean {
  if (cadence === "daily") return true;
  if (cadence === "weekdays") return weekday >= 1 && weekday <= 5;
  return weekday === 1 || weekday === 3 || weekday === 5;
}

/**
 * The posting days from `start` through the next `days` calendar days, each
 * with the next idea, and the shuffle state after the last one. A start that
 * is not a real YYYY-MM-DD day plans nothing and leaves the state as it was.
 */
export function planMonth(
  input: EngineInput,
  state: ShuffleState,
  start: string,
  cadence: PlanCadence,
  days = 30,
): { days: PlanDay[]; state: ShuffleState } {
  const first = parsePlanDay(start);
  if (!first) return { days: [], state };
  const span = Math.max(0, Math.min(MAX_PLAN_DAYS, Math.floor(Number.isFinite(days) ? days : 30)));
  const planned: PlanDay[] = [];
  let current = state;
  for (let n = 0; n < span; n++) {
    const day = new Date(first.getFullYear(), first.getMonth(), first.getDate() + n, 12);
    if (!postsOn(cadence, day.getDay())) continue;
    const next = drawNext(input, current, day);
    current = next.state;
    planned.push({ date: planDayOf(day), card: next.card });
  }
  return { days: planned, state: current };
}

/**
 * A spreadsheet cell that opens with a formula character gets an apostrophe
 * first, so a topic or a name that starts with "=" or "+" is never run as a
 * formula when the file is opened.
 */
function safeCell(value: string): string {
  return /^[=+\-@\t\r]/.test(value) ? `'${value}` : value;
}

/** A planned day's draft. The card was drawn for that day, so its season is that day's. */
function draftFor(day: PlanDay, input: EngineInput, platform: PlatformId) {
  return renderDraft(day.card, input, platform);
}

/** The plan as spreadsheet rows, one per posting day, with the draft for one platform. */
export function planToCsv(
  days: readonly PlanDay[],
  input: EngineInput,
  platform: PlatformId,
): { headers: string[]; rows: string[][] } {
  const headers = ["Date", "Idea", "Angle", "First line", "What to show", `Draft (${platformById(platform).label})`];
  const rows = days.map((day) =>
    [day.date, day.card.title, day.card.angleLabel, day.card.hook, day.card.shot, draftCopyText(draftFor(day, input, platform))].map(
      safeCell,
    ),
  );
  return { headers, rows };
}

/** The plan as one block of text for "Copy the whole month": each day's date and idea, then its draft. */
export function planToText(days: readonly PlanDay[], input: EngineInput, platform: PlatformId): string {
  return days
    .map((day) => `${planDayLabel(day.date)} | ${day.card.title}\n\n${draftCopyText(draftFor(day, input, platform))}`)
    .join("\n\n----------\n\n");
}
