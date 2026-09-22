// Speed to lead: of the people who asked this week, how many heard from a
// person within a day.
//
// Why this exists: docs/ceo-plan-2026-09-20.md traced $0 in revenue to leads
// that got an automated email and never a call. The call sheet fixes the list;
// this one line keeps score, at the top of the sheet, so Ryan sees whether the
// habit is holding without opening a report. It is his own records about his
// own follow-up. It is admin-only and is never a public claim about response
// times.
//
// The rules:
// - A lead counts when it is not a test record and was created inside the
//   window (the last seven days by default), measured back from `now`.
// - "Heard from a person" uses the call sheet's definition of a human touch:
//   a note, a call, or an outbound message a person wrote. The welcome email
//   and the automatic text-back are never touches (lib/callSheet.ts filters
//   them out before they get here). A reply from the lead is not a touch.
// - Reached means the first human touch landed no later than 24 hours after
//   the lead was created. Exactly 24 hours still counts.
// - A lead with no touch yet and less than 24 hours old is still inside its
//   first day: neither a win nor a miss. Everything else is missed.
// - `partial` is passed in by the loader when a history query hit its row cap,
//   so the line can say the count may be low.
//
// Pure: `now` is injected, nothing is read, written, sent, or fetched.

import type { CallSheetLead, CallSheetTouch } from "@/lib/callSheet";

export type SpeedToLead = {
  windowDays: number;
  leads: number;
  reachedIn24h: number;
  stillInside24h: number;
  missed: number;
  partial: boolean;
};

/** The default look-back for the line on the call sheet. */
export const SPEED_WINDOW_DAYS = 7;
/** How long a new lead has to hear from a person to count as reached. */
export const SPEED_TARGET_HOURS = 24;

const HOUR_MS = 3_600_000;
const HUMAN_KINDS: ReadonlySet<CallSheetTouch["kind"]> = new Set(["note", "call", "message_out"]);

export function speedToLead(
  leads: CallSheetLead[],
  touches: CallSheetTouch[],
  now: Date,
  opts: { windowDays?: number; partial?: boolean } = {},
): SpeedToLead {
  const requested = opts.windowDays;
  const windowDays = typeof requested === "number" && Number.isFinite(requested) && requested > 0 ? requested : SPEED_WINDOW_DAYS;
  const since = now.getTime() - windowDays * 24 * HOUR_MS;
  const targetMs = SPEED_TARGET_HOURS * HOUR_MS;

  // Earliest human touch per lead. Order of the input does not matter.
  const firstHuman = new Map<string, number>();
  for (const t of touches) {
    if (!HUMAN_KINDS.has(t.kind)) continue;
    const at = Date.parse(t.at);
    if (Number.isNaN(at)) continue;
    const prev = firstHuman.get(t.lead_id);
    if (prev === undefined || at < prev) firstHuman.set(t.lead_id, at);
  }

  const result: SpeedToLead = { windowDays, leads: 0, reachedIn24h: 0, stillInside24h: 0, missed: 0, partial: Boolean(opts.partial) };
  const seen = new Set<string>();
  for (const lead of leads) {
    if (lead.is_test || seen.has(lead.id)) continue;
    const created = Date.parse(lead.created_at);
    if (Number.isNaN(created) || created < since) continue;
    seen.add(lead.id);
    result.leads += 1;
    const first = firstHuman.get(lead.id);
    if (first !== undefined && first - created <= targetMs) {
      result.reachedIn24h += 1;
    } else if (now.getTime() - created < targetMs) {
      result.stillInside24h += 1;
    } else {
      result.missed += 1;
    }
  }
  return result;
}

function plural(n: number, one: string, many: string): string {
  return n === 1 ? one : many;
}

/**
 * The one line the call sheet shows, for example:
 * "Last 7 days: 4 of 9 new leads heard from a person within 24 hours. 2 are still inside their first 24 hours."
 */
export function speedToLeadLine(s: SpeedToLead): string {
  const window = `${s.windowDays} ${plural(s.windowDays, "day", "days")}`;
  const partial = s.partial ? " Partial: some history did not load." : "";
  if (s.leads === 0) return `No new leads in the last ${window}.${partial}`;
  let line = `Last ${window}: ${s.reachedIn24h} of ${s.leads} new ${plural(s.leads, "lead", "leads")} heard from a person within ${SPEED_TARGET_HOURS} hours.`;
  if (s.stillInside24h > 0) {
    line += ` ${s.stillInside24h} ${plural(s.stillInside24h, "is", "are")} still inside their first ${SPEED_TARGET_HOURS} hours.`;
  }
  return `${line}${partial}`;
}
