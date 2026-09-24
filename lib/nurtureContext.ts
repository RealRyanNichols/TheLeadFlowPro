// What the follow-up emails know about a lead at send time. Leaf module.
//
// The Sep 2026 instant forms ask two questions: what is costing you the most
// right now, and how soon do you want it fixed. The answers land in three
// places depending on which writer captured the lead: the structured
// leads.diagnostic.fields payload, the leads.timeline column, and the free
// text leads.goals summary. This module reads all three and hands the
// sequence one small, normalized object so the copy never parses anything.
//
// Every reader here fails soft. A lead with no answers renders as pain
// "other" and timeline "unknown", which the series treats as the cool path
// with the general first week. Nothing throws on a malformed payload.

export type NurturePain =
  | "missed_calls"
  | "no_website"
  | "no_follow_up"
  | "monthly_fees"
  | "other";

export type NurtureTimeline =
  | "this_week"
  | "this_month"
  | "next_90_days"
  | "just_looking"
  | "unknown";

export type NurtureContext = {
  first: string;
  pain: NurturePain;
  timeline: NurtureTimeline;
  /** this_week or this_month. Hot emails close on the booking link. */
  hot: boolean;
};

export type NurtureContextSource = {
  full_name?: unknown;
  timeline?: unknown;
  goals?: unknown;
  diagnostic?: unknown;
};

export const NURTURE_PAINS: readonly NurturePain[] = [
  "missed_calls",
  "no_website",
  "no_follow_up",
  "monthly_fees",
  "other",
];

export const NURTURE_TIMELINES: readonly NurtureTimeline[] = [
  "this_week",
  "this_month",
  "next_90_days",
  "just_looking",
  "unknown",
];

export function firstNameOf(fullName: unknown): string {
  return String(fullName ?? "").trim().split(/\s+/)[0] || "there";
}

function diagnosticFields(diagnostic: unknown): Record<string, unknown> {
  if (!diagnostic || typeof diagnostic !== "object" || Array.isArray(diagnostic)) return {};
  const fields = (diagnostic as Record<string, unknown>).fields;
  if (!fields || typeof fields !== "object" || Array.isArray(fields)) return {};
  return fields as Record<string, unknown>;
}

/** The first string value whose key contains the fragment, or null. */
function fieldContaining(fields: Record<string, unknown>, fragment: string): string | null {
  for (const [key, value] of Object.entries(fields)) {
    if (key.toLowerCase().includes(fragment) && typeof value === "string" && value.trim()) {
      return value;
    }
  }
  return null;
}

/** The value after "label: " in the goals summary, or null. */
function goalsValue(goals: unknown, label: string): string | null {
  if (typeof goals !== "string") return null;
  const line = goals
    .split("\n")
    .find((l) => l.toLowerCase().startsWith(label.toLowerCase()));
  if (!line) return null;
  const value = line.slice(line.indexOf(":") + 1).trim();
  return value || null;
}

function normalizePain(raw: string | null): NurturePain {
  const v = (raw ?? "").toLowerCase();
  if (!v) return "other";
  if (v.includes("missed_call") || v.includes("missed call") || v.includes("nobody_returns")) {
    return "missed_calls";
  }
  if (v.includes("website")) return "no_website";
  if (v.includes("follow")) return "no_follow_up";
  if (v.includes("monthly") || v.includes("paying_for") || v.includes("tools_i_do_not_use")) {
    return "monthly_fees";
  }
  return "other";
}

function normalizeTimeline(raw: string | null): NurtureTimeline {
  const v = (raw ?? "").toLowerCase();
  if (!v) return "unknown";
  if (v.includes("this_week") || v.includes("this week") || v.includes("asap") || v === "now") {
    return "this_week";
  }
  if (v.includes("this_month") || v.includes("this month") || v.includes("30_day") || v.includes("30 day")) {
    return "this_month";
  }
  if (v.includes("90") || v.includes("60") || v.includes("quarter")) return "next_90_days";
  if (v.includes("looking") || v.includes("not_sure") || v.includes("later") || v.includes("someday")) {
    return "just_looking";
  }
  return "unknown";
}

export function painOf(lead: NurtureContextSource): NurturePain {
  const fields = diagnosticFields(lead.diagnostic);
  const raw =
    fieldContaining(fields, "costing_you") ??
    fieldContaining(fields, "costing you") ??
    goalsValue(lead.goals, "what is costing you the most right now");
  return normalizePain(raw);
}

export function timelineOf(lead: NurtureContextSource): NurtureTimeline {
  const fields = diagnosticFields(lead.diagnostic);
  const raw =
    (typeof lead.timeline === "string" && lead.timeline.trim() ? lead.timeline : null) ??
    fieldContaining(fields, "how_soon") ??
    fieldContaining(fields, "how soon") ??
    fieldContaining(fields, "timeline") ??
    goalsValue(lead.goals, "how soon do you want it fixed");
  return normalizeTimeline(raw);
}

export function isHotTimeline(timeline: NurtureTimeline): boolean {
  return timeline === "this_week" || timeline === "this_month";
}

/** "this week" / "this month" for copy that echoes the answer back. */
export function timelineWords(timeline: NurtureTimeline): string {
  switch (timeline) {
    case "this_week":
      return "this week";
    case "this_month":
      return "this month";
    case "next_90_days":
      return "in the next ninety days";
    case "just_looking":
      return "you are just looking right now";
    default:
      return "soon";
  }
}

export function nurtureContextFor(lead: NurtureContextSource): NurtureContext {
  const timeline = timelineOf(lead);
  return {
    first: firstNameOf(lead.full_name),
    pain: painOf(lead),
    timeline,
    hot: isHotTimeline(timeline),
  };
}
