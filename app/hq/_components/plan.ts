import { planIsLive, type Workspace } from "@/lib/hq/types";

// One reading of the plan, used by the header badge and the billing page so
// the two never disagree. Days left is calendar days, rounded up, because
// that is how a trial reads to the person paying for it.

export type PlanBadge = {
  label: string;
  tone: "good" | "warn" | "bad" | "blue" | "neutral";
  live: boolean;
  daysLeft: number | null;
  /** Set when the owner cancelled: the day the plan stops, as an ISO timestamp. */
  endsAt: string | null;
};

export function trialDaysLeft(ws: Workspace, now = new Date()): number | null {
  if (ws.plan !== "trial" || !ws.trial_ends_at) return null;
  const ms = new Date(ws.trial_ends_at).getTime() - now.getTime();
  if (!Number.isFinite(ms)) return null;
  return Math.max(0, Math.ceil(ms / 86_400_000));
}

/** The day a live plan has been set to stop, or null when it renews. */
export function planEndsAt(ws: Workspace): string | null {
  if (!ws.cancel_at) return null;
  if (ws.plan !== "trial" && ws.plan !== "active" && ws.plan !== "past_due") return null;
  return Number.isNaN(new Date(ws.cancel_at).getTime()) ? null : ws.cancel_at;
}

export function planBadge(ws: Workspace, now = new Date()): PlanBadge {
  const live = planIsLive(ws.plan, ws.trial_ends_at, now);
  const daysLeft = trialDaysLeft(ws, now);
  const endsAt = planEndsAt(ws);
  if (endsAt) {
    // Cancelled but still running: the date matters more than the state.
    return { label: `Ends ${shortDate(endsAt, ws.timezone)}`, tone: "warn", live, daysLeft, endsAt };
  }
  if (ws.plan === "trial") {
    if (daysLeft === null) return { label: "Trial", tone: "blue", live, daysLeft, endsAt };
    if (daysLeft === 0) return { label: "Trial ends today", tone: "warn", live, daysLeft, endsAt };
    return { label: `Trial, ${daysLeft} day${daysLeft === 1 ? "" : "s"} left`, tone: daysLeft <= 3 ? "warn" : "blue", live, daysLeft, endsAt };
  }
  if (ws.plan === "active") return { label: "Active", tone: "good", live, daysLeft, endsAt };
  if (ws.plan === "past_due") return { label: "Payment failed", tone: "bad", live, daysLeft, endsAt };
  if (ws.plan === "canceled") return { label: "Canceled", tone: "bad", live, daysLeft, endsAt };
  return { label: "No plan", tone: "neutral", live, daysLeft, endsAt };
}

/** A date the way an owner reads it, from an ISO timestamp. */
export function readableDate(iso: string | null, timezone: string): string {
  return formatDate(iso, timezone, { month: "long", day: "numeric", year: "numeric" });
}

/** The same date short enough for a badge: "Sep 26". */
export function shortDate(iso: string | null, timezone: string): string {
  return formatDate(iso, timezone, { month: "short", day: "numeric" });
}

function formatDate(iso: string | null, timezone: string, parts: Intl.DateTimeFormatOptions): string {
  if (!iso) return "";
  const at = new Date(iso);
  if (Number.isNaN(at.getTime())) return "";
  try {
    return new Intl.DateTimeFormat("en-US", { timeZone: timezone, ...parts }).format(at);
  } catch {
    return new Intl.DateTimeFormat("en-US", parts).format(at);
  }
}
