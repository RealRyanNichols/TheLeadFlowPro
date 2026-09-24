// "Start calling": one person after another, straight down today's call sheet.
//
// The run lives in the URL, so it survives a phone call, a locked screen, and
// a reload, and needs no table. /admin/call-sheet/next reads the sheet fresh,
// drops everyone already passed in this run (the skip list), and sends Ryan to
// the call card of the first person left. The card carries the run along:
// "Skip for now" and the panel's "Next call" both go back to /next with this
// person added to the list, so a run never returns to the same person.
//
// A saved call takes the lead off the sheet anyway (it sets when they come
// back); the skip list is what keeps "Skip for now" from landing on the same
// card again. Pure: no reads, no writes, nothing sent to anyone.

import type { CallSheetRow, CallSheetTier } from "@/lib/callSheet";

/** Most ids one run carries. The newest are kept, so the person just passed never comes back first. */
export const SKIP_MAX = 50;

/** Where "Start calling" and every "Next call" go. */
export const NEXT_CALL_PATH = "/admin/call-sheet/next";

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/;

/**
 * The skip list from a query value: a comma list of lead ids (repeated
 * parameters are joined). Lowercased, deduplicated, anything that is not a
 * UUID dropped, at most SKIP_MAX, keeping the most recent (the end of the list).
 */
export function parseSkip(value: unknown): string[] {
  const raw = typeof value === "string" ? value : Array.isArray(value) ? value.filter((v) => typeof v === "string").join(",") : "";
  const seen = new Set<string>();
  const ids: string[] = [];
  for (const part of raw.split(",")) {
    const id = part.trim().toLowerCase();
    if (!UUID_RE.test(id) || seen.has(id)) continue;
    seen.add(id);
    ids.push(id);
  }
  return ids.slice(-SKIP_MAX);
}

/**
 * The first row in sheet order that this run has not passed yet, and how many
 * are left counting it. Null when everyone left was skipped or the sheet is empty.
 */
export function pickNext(rows: readonly CallSheetRow[], skip: readonly string[]): { row: CallSheetRow; left: number } | null {
  const passed = new Set(skip.map((id) => id.toLowerCase()));
  const remaining = rows.filter((r) => !passed.has(String(r.lead.id).toLowerCase()));
  return remaining.length ? { row: remaining[0], left: remaining.length } : null;
}

/** "7 people are waiting on a call", for the banner at the top of the back office. */
export function waitingHeadline(total: number): string {
  return total === 1 ? "1 person is waiting on a call" : `${total} people are waiting on a call`;
}

/**
 * The short breakdown under the headline, in the sheet's own order, empty
 * tiers left out: "2 reached out · 1 call you promised · 3 new".
 */
export function waitingBreakdown(counts: Record<CallSheetTier, number>): string {
  const parts: string[] = [];
  const n = (tier: CallSheetTier) => (Number.isFinite(counts[tier]) ? Math.max(0, counts[tier]) : 0);
  if (n("reply")) parts.push(`${n("reply")} reached out`);
  if (n("callback")) parts.push(`${n("callback")} call${n("callback") === 1 ? "" : "s"} you promised`);
  if (n("answer")) parts.push(`${n("answer")} new`);
  if (n("waiting")) parts.push(`${n("waiting")} still waiting`);
  if (n("follow_up")) parts.push(`${n("follow_up")} to follow up`);
  return parts.join(" · ");
}

/** How many people this run skipped who are still on today's sheet. */
export function skippedStillWaiting(rows: readonly CallSheetRow[], skip: readonly string[]): number {
  const passed = new Set(skip.map((id) => id.toLowerCase()));
  return rows.filter((r) => passed.has(String(r.lead.id).toLowerCase())).length;
}

/** The count carried in the card's URL: a whole number from 0 up, else null. */
export function parseLeft(value: unknown): number | null {
  if (typeof value !== "string" || !/^\d{1,5}$/.test(value)) return null;
  return Number(value);
}

/**
 * The card's count includes the person on it ("5 left" on the first of five).
 * Once that call is saved, the panel's "Next call" counts the ones after it.
 */
export function leftAfterThis(left: number | null): number | null {
  return left === null ? null : Math.max(0, left - 1);
}

/** The call card in queue mode: /admin/call-sheet/<id>?queue=1&left=<n>&skip=<list>. */
export function queueCardHref(id: string, skip: readonly string[], left: number): string {
  const list = parseSkip(skip.join(","));
  const count = Number.isFinite(left) ? Math.max(0, Math.floor(left)) : 0;
  return `/admin/call-sheet/${encodeURIComponent(id)}?queue=1&left=${count}${list.length ? `&skip=${list.join(",")}` : ""}`;
}

/**
 * The next person after this one: /admin/call-sheet/next?skip=<skip + this id>.
 * The current id goes last, so it is the last one the SKIP_MAX cap would drop.
 */
export function nextHref(skip: readonly string[], currentId: string | null | undefined): string {
  const current = typeof currentId === "string" ? currentId.trim().toLowerCase() : "";
  const list = parseSkip(skip.join(",")).filter((id) => id !== current);
  if (UUID_RE.test(current)) list.push(current);
  const kept = list.slice(-SKIP_MAX);
  return kept.length ? `${NEXT_CALL_PATH}?skip=${kept.join(",")}` : NEXT_CALL_PATH;
}
