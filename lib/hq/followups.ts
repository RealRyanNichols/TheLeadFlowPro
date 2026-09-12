import { OPEN_STATUSES, type Lead, type WorkspaceSettings } from "./types";
import { addDays, nextSendWindow } from "./time";

// The follow-up ladder. Once a lead has been contacted, the engine keeps a
// date for the next touch and drafts the message when the date arrives. It
// never sends a follow-up on its own; the owner sends from the brief, the
// dashboard, or the plugin. What it does do is make sure no lead is quietly
// forgotten, which is the whole gap.

/** The next follow-up instant after a given step, in business hours. */
export function nextFollowUpAt(
  step: number,
  settings: WorkspaceSettings,
  from: Date,
  timezone: string,
): Date | null {
  const days = settings.followUpDays;
  if (step < 0 || step >= days.length) return null;
  // The ladder is cumulative from first contact (day 1, day 3, day 7...),
  // and `from` is the moment of the previous touch, so each rung is the gap
  // between it and the one before. A rung sent late shifts the rest late
  // rather than bunching them up.
  const target = addDays(from, days[step] - (step > 0 ? days[step - 1] : 0));
  return nextSendWindow(target, timezone);
}

/** Leads whose follow-up date has arrived and that are still open. */
export function dueFollowUps(leads: Lead[], now = new Date()): Lead[] {
  return leads
    .filter(
      (l) =>
        OPEN_STATUSES.includes(l.status) &&
        !!l.next_follow_up_at &&
        new Date(l.next_follow_up_at).getTime() <= now.getTime(),
    )
    .sort((a, b) => (a.next_follow_up_at ?? "").localeCompare(b.next_follow_up_at ?? ""));
}

/** Follow-ups landing in the next N hours, for the brief's "today" list. */
export function upcomingFollowUps(leads: Lead[], now = new Date(), hours = 24): Lead[] {
  const until = now.getTime() + hours * 3_600_000;
  return leads
    .filter(
      (l) =>
        OPEN_STATUSES.includes(l.status) &&
        !!l.next_follow_up_at &&
        new Date(l.next_follow_up_at).getTime() <= until,
    )
    .sort((a, b) => (a.next_follow_up_at ?? "").localeCompare(b.next_follow_up_at ?? ""));
}

/**
 * What changes on a lead when the owner reports a touch. Centralized so the
 * dashboard, the plugin, and the inbound webhooks all move the ladder the
 * same way.
 */
export function afterTouch(
  lead: Lead,
  settings: WorkspaceSettings,
  timezone: string,
  now = new Date(),
  outcome: "contacted" | "quoted" | "booked" | "won" | "lost" | "spam" | "no_answer" = "contacted",
): Partial<Lead> {
  const patch: Partial<Lead> = {
    last_contact_at: now.toISOString(),
    first_contact_at: lead.first_contact_at ?? now.toISOString(),
  };
  if (outcome === "won" || outcome === "lost" || outcome === "spam") {
    patch.status = outcome;
    patch.next_follow_up_at = null;
    return patch;
  }
  if (outcome === "booked") {
    patch.status = "booked";
    patch.next_follow_up_at = null;
    return patch;
  }
  if (outcome === "quoted") patch.status = "quoted";
  else if (lead.status === "new") patch.status = "contacted";

  // A real conversation resets the ladder from today; a no-answer keeps the
  // step count so the ladder still ends.
  const step = outcome === "no_answer" ? lead.follow_up_step + 1 : 0;
  const next = nextFollowUpAt(step, settings, now, timezone);
  patch.follow_up_step = Math.min(step, 20);
  patch.next_follow_up_at = next ? next.toISOString() : null;
  return patch;
}

/** Advance the ladder after the owner sends the drafted follow-up. */
export function afterFollowUpSent(lead: Lead, settings: WorkspaceSettings, timezone: string, now = new Date()): Partial<Lead> {
  const step = lead.follow_up_step + 1;
  const next = nextFollowUpAt(step, settings, now, timezone);
  return {
    last_contact_at: now.toISOString(),
    first_contact_at: lead.first_contact_at ?? now.toISOString(),
    follow_up_step: Math.min(step, 20),
    next_follow_up_at: next ? next.toISOString() : null,
    status: lead.status === "new" ? "contacted" : lead.status,
  };
}
