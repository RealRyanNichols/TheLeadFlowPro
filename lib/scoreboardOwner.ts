// The private owner view of a client's scoreboard.
//
// The public board shows aggregate counts with definitions. The owner view
// shows the same counts plus what the public board withholds for that
// client (the payment-record count when it is not public, the 90-day table,
// a CSV of the aggregates) and a plain-English reading of the window. It
// is reached by a signed link Ryan generates for the client. Every number
// still comes from the client's own aggregate feed; there is no name,
// email, phone, or dollar figure anywhere in this view.

import { hqSecrets, signPayload, verifyPayload } from "./hq/crypto";
import { SCOREBOARD_METRICS, formatCount, type ScoreboardBusiness, type ScoreboardDay, type ScoreboardMetricKey, type ScoreboardWindow } from "./scoreboard";

const OWNER_KEY_VERSION = "v1";

function payload(slug: string): string {
  return `scoreboard-owner:${OWNER_KEY_VERSION}:${slug}`;
}

/** The key in the owner's link. Stable for a slug until the HQ secret rotates. */
export function ownerKey(slug: string, secrets: string[] = hqSecrets()): string {
  if (secrets.length === 0) throw new Error("No signing secret is configured");
  return signPayload(payload(slug), secrets[0]);
}

export function verifyOwnerKey(slug: string, key: string | null | undefined, secrets: string[] = hqSecrets()): boolean {
  if (!key || key.length < 20 || key.length > 200 || !/^[A-Za-z0-9_-]+$/.test(key)) return false;
  if (secrets.length === 0) return false;
  return verifyPayload(payload(slug), key, secrets);
}

export function ownerViewPath(slug: string, key: string): string {
  return `/scoreboard/${slug}/owner?k=${encodeURIComponent(key)}`;
}

const CSV_KEYS: ScoreboardMetricKey[] = ["views", "visitors", "clicks", "leads", "paid_leads", "unpaid_leads", "calls", "forms", "sales"];

/** Aggregate rows only. There is no other column to leak. */
export function daysToCsv(days: ScoreboardDay[], business: Pick<ScoreboardBusiness, "unsupportedMetrics">): string {
  const keys = CSV_KEYS.filter((k) => !(business.unsupportedMetrics ?? []).includes(k));
  const header = ["day", ...keys].join(",");
  const rows = days.map((d) => [d.day, ...keys.map((k) => String(d[k]))].join(","));
  return [header, ...rows].join("\n") + "\n";
}

export type OwnerReading = { headline: string; notes: string[] };

/** A plain-English reading of the 30-day window against the 30 before it. Counts only; no causes claimed. */
export function ownerReading(business: ScoreboardBusiness, windows: ScoreboardWindow[], days: ScoreboardDay[], today: string): OwnerReading {
  const w30 = windows.find((w) => w.key === "30d");
  if (!w30) return { headline: "No 30-day window available.", notes: [] };
  const supported = (k: ScoreboardMetricKey) => !(business.unsupportedMetrics ?? []).includes(k);
  const prior = priorWindow(days, 30, today);
  const notes: string[] = [];
  const t = w30.totals;

  const compare = (k: ScoreboardMetricKey, label: string) => {
    if (!supported(k)) return;
    const now = t[k];
    const before = prior[k];
    if (before === null) {
      notes.push(`${label}: ${formatCount(now)} in the last 30 days. The feed does not reach back far enough for a prior-window comparison yet.`);
      return;
    }
    const diff = now - before;
    const dir = diff > 0 ? "up" : diff < 0 ? "down" : "level";
    notes.push(`${label}: ${formatCount(now)} in the last 30 days, ${dir} ${diff === 0 ? "" : `${formatCount(Math.abs(diff))} `}against the 30 days before (${formatCount(before)}).`);
  };
  compare("views", "Views");
  compare("leads", "Lead records");
  if (supported("paid_leads") && t.leads > 0) notes.push(`${formatCount(t.paid_leads)} of ${formatCount(t.leads)} lead records carry an advertising source; ${formatCount(t.unpaid_leads)} do not. Unknown sources are counted as not ad-attributed.`);
  if (supported("calls") && t.calls > 0) notes.push(`${formatCount(t.calls)} call records in the window. Repeat callers can appear more than once.`);
  if (t.sales > 0) notes.push(`${formatCount(t.sales)} payment records in the window. A count of records, not revenue or unique buyers.`);
  if (t.views > 0 && t.leads === 0) notes.push("Views were recorded but no lead records were. The pages are being seen; nothing on them is being answered. That is the first thing to look at.");
  if (t.views === 0 && t.leads === 0) notes.push("No views and no lead records in the window. Either tracking is off or the site is not being found.");

  const leadLine = supported("leads") ? `${formatCount(t.leads)} lead record${t.leads === 1 ? "" : "s"}` : "lead records not tracked";
  return { headline: `Last 30 days: ${formatCount(t.views)} views, ${leadLine}.`, notes };
}

/** Totals for the 30 days before the last 30, or null per metric when the feed does not cover them. */
function priorWindow(days: ScoreboardDay[], n: number, today: string): Record<ScoreboardMetricKey, number | null> {
  const end = shift(today, -n);
  const start = shift(today, -(2 * n - 1));
  const rows = days.filter((d) => d.day >= start && d.day <= end);
  const covered = rows.length === n;
  const out = {} as Record<ScoreboardMetricKey, number | null>;
  for (const k of CSV_KEYS) out[k] = covered ? rows.reduce((s, d) => s + d[k], 0) : null;
  return out;
}

function shift(day: string, delta: number): string {
  const [y, m, d] = day.split("-").map(Number);
  return new Date(Date.UTC(y, m - 1, d + delta)).toISOString().slice(0, 10);
}

/** Which metrics the owner sees, with the public definitions, in board order. */
export function ownerMetrics(business: ScoreboardBusiness) {
  return SCOREBOARD_METRICS.filter((m) => !(business.unsupportedMetrics ?? []).includes(m.key));
}
