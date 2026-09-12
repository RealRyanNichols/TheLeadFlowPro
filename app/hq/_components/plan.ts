import { planIsLive, type Workspace } from "@/lib/hq/types";

// One reading of the plan, used by the header badge and the billing page so
// the two never disagree. Days left is calendar days, rounded up, because
// that is how a trial reads to the person paying for it.

export type PlanBadge = { label: string; tone: "good" | "warn" | "bad" | "blue" | "neutral"; live: boolean; daysLeft: number | null };

export function trialDaysLeft(ws: Workspace, now = new Date()): number | null {
  if (ws.plan !== "trial" || !ws.trial_ends_at) return null;
  const ms = new Date(ws.trial_ends_at).getTime() - now.getTime();
  if (!Number.isFinite(ms)) return null;
  return Math.max(0, Math.ceil(ms / 86_400_000));
}

export function planBadge(ws: Workspace, now = new Date()): PlanBadge {
  const live = planIsLive(ws.plan, ws.trial_ends_at, now);
  const daysLeft = trialDaysLeft(ws, now);
  if (ws.plan === "trial") {
    if (daysLeft === null) return { label: "Trial", tone: "blue", live, daysLeft };
    if (daysLeft === 0) return { label: "Trial ends today", tone: "warn", live, daysLeft };
    return { label: `Trial, ${daysLeft} day${daysLeft === 1 ? "" : "s"} left`, tone: daysLeft <= 3 ? "warn" : "blue", live, daysLeft };
  }
  if (ws.plan === "active") return { label: "Active", tone: "good", live, daysLeft };
  if (ws.plan === "past_due") return { label: "Payment failed", tone: "bad", live, daysLeft };
  if (ws.plan === "canceled") return { label: "Canceled", tone: "bad", live, daysLeft };
  return { label: "No plan", tone: "neutral", live, daysLeft };
}

/** A date the way an owner reads it, from an ISO timestamp. */
export function readableDate(iso: string | null, timezone: string): string {
  if (!iso) return "";
  const at = new Date(iso);
  if (Number.isNaN(at.getTime())) return "";
  try {
    return new Intl.DateTimeFormat("en-US", { timeZone: timezone, month: "long", day: "numeric", year: "numeric" }).format(at);
  } catch {
    return new Intl.DateTimeFormat("en-US", { month: "long", day: "numeric", year: "numeric" }).format(at);
  }
}
