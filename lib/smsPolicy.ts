// When the application may text a lead on its own.
//
// Two rules sit in front of every application-originated text, in
// lib/quo.ts sendLeadText:
//
//   1. STOP is global. A number in public.sms_suppressions never gets an
//      application text again, whichever door the lead came through. Until
//      2026-09-20 this lookup lived only on the Meta lead path; the website
//      intake and the CRM send route went straight to the provider.
//   2. Automated texts go out only between 8:00 in the morning and 9:00 at
//      night, Central time. A form filled in at 11 pm gets its welcome email
//      at 11 pm and no text; the person is on the morning call sheet. A
//      text a human sends from the CRM is a human decision and is not held.
//
// This file is the pure part so the window can be tested without a clock.

import { BUSINESS } from "@/lib/site/business";

export const SEND_WINDOW = { startHour: 8, endHourExclusive: 21, timezone: BUSINESS.timezone } as const;

/** Hour of the day (0 to 23) at `now` in the business time zone. */
export function localHour(now: Date, timezone: string = SEND_WINDOW.timezone): number {
  const text = new Intl.DateTimeFormat("en-US", { timeZone: timezone, hour: "numeric", hour12: false }).format(now);
  const hour = Number.parseInt(text, 10);
  // Some engines print midnight as "24".
  return Number.isFinite(hour) ? hour % 24 : 0;
}

/** True when an automated text may go out right now. */
export function withinSendWindow(now: Date, timezone: string = SEND_WINDOW.timezone): boolean {
  const hour = localHour(now, timezone);
  return hour >= SEND_WINDOW.startHour && hour < SEND_WINDOW.endHourExclusive;
}

type ZonedParts = { year: number; month: number; day: number; hour: number; minute: number };

function zonedParts(at: Date, timezone: string): ZonedParts {
  const parts = new Intl.DateTimeFormat("en-US", {
    timeZone: timezone,
    year: "numeric",
    month: "numeric",
    day: "numeric",
    hour: "numeric",
    minute: "numeric",
    hour12: false,
  }).formatToParts(at);
  const get = (type: string) => Number.parseInt(parts.find((p) => p.type === type)?.value ?? "0", 10);
  return { year: get("year"), month: get("month"), day: get("day"), hour: get("hour") % 24, minute: get("minute") };
}

/** The instant a wall-clock hour in `timezone` happens. Two passes settle the offset across a DST change. */
function zonedWallTimeToDate(year: number, month: number, day: number, hour: number, timezone: string): Date {
  const wanted = Date.UTC(year, month - 1, day, hour, 0);
  let guess = wanted;
  for (let i = 0; i < 2; i += 1) {
    const p = zonedParts(new Date(guess), timezone);
    const shown = Date.UTC(p.year, p.month - 1, p.day, p.hour, p.minute);
    guess -= shown - wanted;
  }
  return new Date(guess);
}

/**
 * When an automated text held for quiet hours may go: `now` itself inside the
 * window, otherwise the next 8:00 in the morning Central. A held first text
 * waits for this instead of being dropped (lib/speedToLeadAlertsServer.ts).
 */
export function nextSendWindowOpen(now: Date, timezone: string = SEND_WINDOW.timezone): Date {
  if (withinSendWindow(now, timezone)) return now;
  const local = zonedParts(now, timezone);
  if (local.hour < SEND_WINDOW.startHour) {
    return zonedWallTimeToDate(local.year, local.month, local.day, SEND_WINDOW.startHour, timezone);
  }
  const tomorrow = new Date(Date.UTC(local.year, local.month - 1, local.day + 1));
  return zonedWallTimeToDate(
    tomorrow.getUTCFullYear(),
    tomorrow.getUTCMonth() + 1,
    tomorrow.getUTCDate(),
    SEND_WINDOW.startHour,
    timezone,
  );
}

export type SendPolicyInput = {
  now: Date;
  suppressed: boolean;
  /** A person pressed send in the CRM. Skips the window, never the suppression. */
  humanInitiated: boolean;
};

export type SendPolicyDecision = { allow: true } | { allow: false; reason: "suppressed" | "quiet_hours" };

export function decideSend(input: SendPolicyInput): SendPolicyDecision {
  if (input.suppressed) return { allow: false, reason: "suppressed" };
  if (!input.humanInitiated && !withinSendWindow(input.now)) return { allow: false, reason: "quiet_hours" };
  return { allow: true };
}
