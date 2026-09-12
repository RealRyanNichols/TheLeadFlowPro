import type { Lead, WorkspaceSettings } from "./types";
import { minutesBetween } from "./time";

// Speed to lead. A new lead that nobody has touched gets the owner an
// alert at the response target, then at one hour, four hours, and a day.
// Each stage fires once per lead: the dedupe key is stored with the event,
// so a cron that runs every five minutes cannot nag.

export type AlertStage = "target" | "1h" | "4h" | "24h";

export type WatchdogAlert = {
  lead: Lead;
  stage: AlertStage;
  minutesWaiting: number;
  dedupeKey: string;
  headline: string;
};

const STAGE_LABEL: Record<AlertStage, (name: string, mins: number) => string> = {
  target: (name, mins) => `${name} is waiting (${mins} min). Call now.`,
  "1h": (name) => `${name} has waited over an hour. Still no contact.`,
  "4h": (name) => `${name} has waited four hours. Losing them.`,
  "24h": (name) => `${name} waited a full day with no contact.`,
};

export function watchdogKey(leadId: string, stage: AlertStage): string {
  return `watchdog:${leadId}:${stage}`;
}

/** The alerts that should fire now, given which ones already did. */
export function pendingAlerts(
  leads: Lead[],
  settings: WorkspaceSettings,
  firedKeys: Set<string>,
  now = new Date(),
): WatchdogAlert[] {
  const out: WatchdogAlert[] = [];
  // Sorted by minutes so a target above an hour still fires as "target"
  // rather than being shadowed by the generic one-hour stage.
  const stages: [AlertStage, number][] = (
    [
      ["target", settings.responseTargetMinutes],
      ["1h", 60],
      ["4h", 240],
      ["24h", 1440],
    ] as [AlertStage, number][]
  ).sort((a, b) => a[1] - b[1]);
  for (const lead of leads) {
    // An automatic reply is the machine answering; the owner still has not.
    if (lead.status !== "new" || lead.first_contact_at) continue;
    const waiting = minutesBetween(new Date(lead.created_at), now);
    if (waiting < settings.responseTargetMinutes) continue;
    // Only the highest stage reached fires, so a lead found after a day
    // gets one alert, not four.
    let due: [AlertStage, number] | null = null;
    for (const [stage, mins] of stages) {
      if (waiting >= mins) due = [stage, mins];
    }
    if (!due) continue;
    const [stage] = due;
    const key = watchdogKey(lead.id, stage);
    if (firedKeys.has(key)) continue;
    // A lead that already got a later stage never gets an earlier one.
    const later = stages.slice(stages.findIndex(([s]) => s === stage) + 1);
    if (later.some(([s]) => firedKeys.has(watchdogKey(lead.id, s)))) continue;
    const name = lead.name.trim() || "A new lead";
    out.push({
      lead,
      stage,
      minutesWaiting: waiting,
      dedupeKey: key,
      headline: STAGE_LABEL[stage](name, waiting),
    });
  }
  return out;
}

/** Response-time facts for the report. Median in minutes, or null. */
export function responseStats(leads: Lead[]): {
  contacted: number;
  uncontacted: number;
  medianMinutes: number | null;
  withinTarget: number;
} {
  const times: number[] = [];
  let contacted = 0;
  let uncontacted = 0;
  for (const l of leads) {
    if (l.status === "spam") continue;
    if (l.first_contact_at) {
      contacted++;
      times.push(minutesBetween(new Date(l.created_at), new Date(l.first_contact_at)));
    } else if (l.status === "new") {
      uncontacted++;
    }
  }
  times.sort((a, b) => a - b);
  const median = times.length ? times[Math.floor(times.length / 2)] : null;
  return { contacted, uncontacted, medianMinutes: median, withinTarget: times.filter((t) => t <= 15).length };
}
