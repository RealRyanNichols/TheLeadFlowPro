import { centralToday, shiftDay } from "./scoreboard";

export const CAPTURE_SOURCES: Record<string, Record<string, string>> = {
  "premier-dental-academy-of-longview": {
    leads: "Lead intake",
    subscribers: "Email subscribers",
    enrollment_forms: "Enrollment forms",
  },
  realryannichols: {
    book_email_signups: "Book email signups",
    notify_signups: "Notification signups",
    poll_unlocks: "Reader signups",
    chat_escalations: "Chat requests with contact details",
    leads: "Other contact records",
  },
};

export type CaptureCoverageRow = {
  source: string;
  records: number;
  additional_emails: number;
  start_day: string;
  end_day: string;
};

/** Only accept the exact public source set and a complete, current observation window. */
export function normalizeCaptureCoverage(raw: unknown, slug: string, daysBack = 30, today = centralToday()): CaptureCoverageRow[] | null {
  const expected = Object.keys(CAPTURE_SOURCES[slug] ?? {});
  if (!Array.isArray(raw) || !expected.length || raw.length !== expected.length) return null;
  const start = shiftDay(today, -(daysBack - 1));
  const rows: CaptureCoverageRow[] = [];
  for (const value of raw) {
    if (!value || typeof value !== "object") return null;
    const row = value as Record<string, unknown>;
    if (typeof row.source !== "string" || !expected.includes(row.source) || rows.some((r) => r.source === row.source)) return null;
    if (row.start_day !== start || row.end_day !== today) return null;
    if (![row.records, row.additional_emails].every((n) => (typeof n === "number" || typeof n === "string") && String(n).trim() !== "" && Number.isSafeInteger(Number(n)) && Number(n) >= 0)) return null;
    if (Number(row.additional_emails) > Number(row.records)) return null;
    rows.push({ source: row.source, records: Number(row.records), additional_emails: Number(row.additional_emails), start_day: start, end_day: today });
  }
  return expected.map((source) => rows.find((row) => row.source === source)!);
}
