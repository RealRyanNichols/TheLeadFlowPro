// Local time for a business. Every schedule the engine keeps (the brief
// hour, the weekly day, "yesterday", "this week") is in the workspace's
// own timezone, never the server's.

export type LocalParts = {
  year: number;
  month: number;
  day: number;
  hour: number;
  minute: number;
  /** 0 Sunday to 6 Saturday. */
  weekday: number;
  /** YYYY-MM-DD in the business's zone. */
  date: string;
};

const WEEKDAYS = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
export const WEEKDAY_NAMES = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];

export function isValidTimezone(tz: string): boolean {
  try {
    new Intl.DateTimeFormat("en-US", { timeZone: tz });
    return true;
  } catch {
    return false;
  }
}

export function localParts(at: Date, timezone: string): LocalParts {
  const tz = isValidTimezone(timezone) ? timezone : "America/Chicago";
  const fmt = new Intl.DateTimeFormat("en-US", {
    timeZone: tz,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    weekday: "short",
    hour12: false,
  });
  const parts: Record<string, string> = {};
  for (const p of fmt.formatToParts(at)) parts[p.type] = p.value;
  const hour = Number(parts.hour) % 24;
  const year = Number(parts.year);
  const month = Number(parts.month);
  const day = Number(parts.day);
  return {
    year,
    month,
    day,
    hour,
    minute: Number(parts.minute),
    weekday: Math.max(0, WEEKDAYS.indexOf(parts.weekday)),
    date: `${year}-${String(month).padStart(2, "0")}-${String(day).padStart(2, "0")}`,
  };
}

/** The local calendar date N days before the given instant. */
export function localDateShift(at: Date, timezone: string, days: number): string {
  return localParts(new Date(at.getTime() + days * 86_400_000), timezone).date;
}

/** Monday of the local week that contains the instant. */
export function localWeekStart(at: Date, timezone: string): string {
  const p = localParts(at, timezone);
  const back = (p.weekday + 6) % 7;
  return localDateShift(at, timezone, -back);
}

export function longLocalDate(at: Date, timezone: string): string {
  const tz = isValidTimezone(timezone) ? timezone : "America/Chicago";
  return new Intl.DateTimeFormat("en-US", {
    timeZone: tz,
    weekday: "long",
    month: "long",
    day: "numeric",
  }).format(at);
}

export function localClock(at: Date, timezone: string): string {
  const tz = isValidTimezone(timezone) ? timezone : "America/Chicago";
  return new Intl.DateTimeFormat("en-US", { timeZone: tz, hour: "numeric", minute: "2-digit" }).format(at);
}

export function minutesBetween(a: Date, b: Date): number {
  return Math.round((b.getTime() - a.getTime()) / 60_000);
}

export function ago(from: Date, now: Date): string {
  const mins = Math.max(0, minutesBetween(from, now));
  if (mins < 1) return "just now";
  if (mins < 60) return `${mins} min ago`;
  const hours = Math.floor(mins / 60);
  if (hours < 24) return `${hours} hour${hours === 1 ? "" : "s"} ago`;
  const days = Math.floor(hours / 24);
  return `${days} day${days === 1 ? "" : "s"} ago`;
}

export function addDays(at: Date, days: number): Date {
  return new Date(at.getTime() + days * 86_400_000);
}

/** Business hours only: an automatic touch never lands at 2 a.m. */
export function nextSendWindow(at: Date, timezone: string, startHour = 8, endHour = 19): Date {
  const p = localParts(at, timezone);
  if (p.hour >= startHour && p.hour < endHour) return at;
  // Move to the next startHour in local time. Walk in hour steps so DST
  // never lands the send an hour off.
  let probe = new Date(at.getTime());
  for (let i = 0; i < 48; i++) {
    probe = new Date(probe.getTime() + 60 * 60_000);
    const q = localParts(probe, timezone);
    if (q.hour === startHour) {
      return new Date(probe.getTime() - q.minute * 60_000);
    }
  }
  return probe;
}
