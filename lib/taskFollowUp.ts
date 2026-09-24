// The follow-up time on a lead, as the older task screens edit it.
//
// Before the Call Closer, leads.next_follow_up_at was only ever set together
// with a task (the Sales Desk task form, the follow-up board, the diagnostic
// review task), so those screens could assume "no open task left" meant "no
// follow-up left", and set the field to 9:00 AM on a task's due day. The Call
// Closer now stores a promise there with no task behind it: a call back at
// 3:00 PM, the next try after no answer, a sit-down time. The call sheet's
// "You said you would call" tier reads only that field.
//
// So these screens change the field only when it still holds the value their
// own task set, and the database does the comparison (a stale browser never
// wipes a newer promise). A new task fills the field only when it is empty. A
// date typed into the Sales Desk's "Next follow-up" box keeps the time of day
// already stored, in Central time, and a blur that changed nothing writes
// nothing.
//
// The value alone cannot always tell whose it is: the Call Closer's quick
// call back chips and its "Proposal sent" follow-up are also 9:00 AM Central,
// the same instant a task due that day sets. So before clearing or moving,
// the helpers read the lead's newest Call Closer save (the timeline entry
// with an "Outcome:" marker, lib/callCloser.ts). When that save came after
// the task was created, or names the very time stored, the time is the Call
// Closer's promise and is left alone.
//
// Client-safe: imports only lib/businessTime.ts. The caller hands in its own
// row level security client.

import type { SupabaseClient } from "@supabase/supabase-js";
import { centralDate, centralTime, formatCentral, isLocalDate, wallClockToInstant } from "@/lib/businessTime";

/** The time of day a task's due date stands for. */
export const TASK_FOLLOW_UP_TIME = "09:00";

function instant(iso: string | null | undefined): Date | null {
  if (!iso) return null;
  const at = new Date(iso);
  return Number.isNaN(at.getTime()) ? null : at;
}

/** The follow-up time a task due on `dueDate` sets: 9:00 AM Central. */
export function taskFollowUpAt(dueDate: string): string {
  return wallClockToInstant(dueDate, TASK_FOLLOW_UP_TIME).toISOString();
}

/**
 * Every value a task due on `dueDate` may have written: 9:00 AM Central, and
 * 9:00 AM on the browser's own clock, which the task screens used before.
 * For a browser in Central time the two are the same.
 */
export function taskFollowUpValues(dueDate: string | null | undefined): string[] {
  if (!isLocalDate(dueDate)) return [];
  const values = [taskFollowUpAt(dueDate)];
  const browser = new Date(`${dueDate}T${TASK_FOLLOW_UP_TIME}:00`);
  if (!Number.isNaN(browser.getTime()) && !values.includes(browser.toISOString())) values.push(browser.toISOString());
  return values;
}

/** The Central calendar day of a stored follow-up, for a date input. Empty when there is none. */
export function followUpDay(iso: string | null | undefined): string {
  const at = instant(iso);
  return at ? centralDate(at) : "";
}

export type FollowUpDayEdit = { write: false } | { write: true; value: string | null };

/**
 * What to store when someone edits only the day of a follow-up. Nothing when
 * the day is unchanged or not a full date yet. Null when the box was cleared.
 * Otherwise the new day at the time of day already stored (so a 3:00 PM call
 * back moved to Friday stays at 3:00 PM), or 9:00 AM Central when none was.
 */
export function followUpDayEdit(storedIso: string | null | undefined, day: string): FollowUpDayEdit {
  if (day === followUpDay(storedIso)) return { write: false };
  if (day === "") return { write: true, value: null };
  if (!isLocalDate(day)) return { write: false };
  const stored = instant(storedIso);
  const time = stored ? centralTime(stored) : TASK_FOLLOW_UP_TIME;
  return { write: true, value: wallClockToInstant(day, time).toISOString() };
}

type Client = Pick<SupabaseClient, "from">;
export type FollowUpWrite = { changed: boolean; value: string | null; error: string | null };

async function setIfCurrently(
  supabase: Client,
  leadId: string,
  value: string | null,
  current: string | null,
): Promise<{ changed: boolean; error: string | null }> {
  const base = supabase.from("leads").update({ next_follow_up_at: value }).eq("id", leadId);
  const filtered = current === null ? base.is("next_follow_up_at", null) : base.eq("next_follow_up_at", current);
  const result = await filtered.select("id");
  if (result.error) return { changed: false, error: result.error.message };
  return { changed: Array.isArray(result.data) && result.data.length > 0, error: null };
}

// The Call Closer's timeline entries: kind "call", and kind "sales" for
// Proposal sent. Each ends with " Outcome: <outcome>." (lib/callCloser.ts
// CALL_HISTORY_KINDS, CALL_HISTORY_DETAIL_PATTERN, isCallHistoryEntry).
const CALL_CLOSER_KINDS = ["call", "sales"];
const CALL_CLOSER_DETAIL_PATTERN = "%Outcome: %";
const PROPOSAL_SENT_RE = /\bOutcome: proposal_sent\./;

type CallCloserSave = { at: Date; detail: string };

async function newestCallCloserSave(supabase: Client, leadId: string): Promise<{ save: CallCloserSave | null; error: string | null }> {
  const result = await supabase
    .from("lead_activity")
    .select("kind, detail, created_at")
    .eq("lead_id", leadId)
    .in("kind", CALL_CLOSER_KINDS)
    .ilike("detail", CALL_CLOSER_DETAIL_PATTERN)
    .order("created_at", { ascending: false })
    .limit(5);
  if (result.error) return { save: null, error: result.error.message };
  for (const row of (Array.isArray(result.data) ? result.data : []) as { kind?: unknown; detail?: unknown; created_at?: unknown }[]) {
    if (typeof row.detail !== "string") continue;
    if (row.kind !== "call" && !(row.kind === "sales" && PROPOSAL_SENT_RE.test(row.detail))) continue;
    const at = instant(typeof row.created_at === "string" ? row.created_at : null);
    if (at) return { save: { at, detail: row.detail }, error: null };
  }
  return { save: null, error: null };
}

/**
 * Whether the field now belongs to the Call Closer rather than to this task:
 * a Call Closer save came after the task was created (or the task's creation
 * time is unknown), so whatever it stored is newer than anything the task set.
 */
function savedAfterTask(save: CallCloserSave | null, taskCreatedAt: string | null | undefined): boolean {
  if (!save) return false;
  const created = instant(taskCreatedAt);
  return !created || save.at.getTime() > created.getTime();
}

/** The Call Closer's newest save names this exact time (its sentence always carries formatCentral of what it set). */
function promisedThisTime(save: CallCloserSave | null, iso: string): boolean {
  const at = instant(iso);
  return Boolean(save && at && save.detail.includes(formatCentral(at)));
}

/**
 * A task is done: clear the lead's follow-up time, but only while it is still
 * the time that task set. A call back from the Call Closer, a sit-down time,
 * or any other date is left alone, including a Call Closer call back at 9:00
 * AM on the task's own due day. A task without a due date set nothing, so it
 * clears nothing.
 */
export async function clearTaskFollowUp(
  supabase: Client,
  leadId: string,
  dueDate: string | null | undefined,
  taskCreatedAt: string | null | undefined,
): Promise<FollowUpWrite> {
  const values = taskFollowUpValues(dueDate);
  if (values.length === 0) return { changed: false, value: null, error: null };
  const owner = await newestCallCloserSave(supabase, leadId);
  if (owner.error) return { changed: false, value: null, error: owner.error };
  if (savedAfterTask(owner.save, taskCreatedAt)) return { changed: false, value: null, error: null };
  for (const mine of values) {
    if (promisedThisTime(owner.save, mine)) continue;
    const r = await setIfCurrently(supabase, leadId, null, mine);
    if (r.error) return { changed: false, value: null, error: r.error };
    if (r.changed) return { changed: true, value: null, error: null };
  }
  return { changed: false, value: null, error: null };
}

/**
 * A task moved to another day: move the lead's follow-up time with it, but
 * only when the field is empty or still holds the time the task set before,
 * and never after a Call Closer save newer than the task (that save may have
 * set, or on "Not a fit" cleared, the field on purpose). Two narrow writes
 * instead of one OR filter, so no timestamp needs quoting.
 */
export async function moveTaskFollowUp(
  supabase: Client,
  leadId: string,
  previousDue: string | null | undefined,
  nextDue: string | null | undefined,
  taskCreatedAt: string | null | undefined,
): Promise<FollowUpWrite> {
  const value = isLocalDate(nextDue) ? taskFollowUpAt(nextDue) : null;
  const previous = taskFollowUpValues(previousDue).filter((mine) => mine !== value);
  if (value === null && previous.length === 0) return { changed: false, value, error: null };
  const owner = await newestCallCloserSave(supabase, leadId);
  if (owner.error) return { changed: false, value, error: owner.error };
  if (savedAfterTask(owner.save, taskCreatedAt)) return { changed: false, value, error: null };
  if (value !== null) {
    const empty = await setIfCurrently(supabase, leadId, value, null);
    if (empty.error) return { changed: false, value, error: empty.error };
    if (empty.changed) return { changed: true, value, error: null };
  }
  for (const mine of previous) {
    if (promisedThisTime(owner.save, mine)) continue;
    const r = await setIfCurrently(supabase, leadId, value, mine);
    if (r.error) return { changed: false, value, error: r.error };
    if (r.changed) return { changed: true, value, error: null };
  }
  return { changed: false, value, error: null };
}

/**
 * A new task with a due date: fill the lead's follow-up time with 9:00 AM
 * Central on that day, but only when the field is empty. A time already there
 * (a Call Closer call back, a sit-down, another task's day) stays; the new
 * task still shows on the boards by its own due date. The empty check runs in
 * the database, so a stale browser never replaces a newer promise.
 */
export async function setTaskFollowUpIfEmpty(supabase: Client, leadId: string, dueDate: string | null | undefined): Promise<FollowUpWrite> {
  if (!isLocalDate(dueDate)) return { changed: false, value: null, error: null };
  const value = taskFollowUpAt(dueDate);
  const r = await setIfCurrently(supabase, leadId, value, null);
  return { changed: r.changed, value, error: r.error };
}
