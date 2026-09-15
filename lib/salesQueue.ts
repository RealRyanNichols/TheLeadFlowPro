// Who to touch right now, in order. This is the ranking behind the Today queue
// at /admin/sales.
//
// It is a running order, not a prediction. Nothing here claims a close rate,
// and every row carries the one reason it is where it is, so the order is
// arguable rather than mysterious.
//
// The tiers come straight from how the work actually goes:
//
//   1. They just reached out. A text or call in the last 24 hours is the
//      hottest thing on the board and the shortest window to answer.
//   2. They are new and said they are in a hurry. The form asks for a
//      timeline; "this week" is a person with a deadline.
//   3. A follow-up is past due. You promised a date and the date is gone.
//   4. A proposal has gone quiet for 3 days or more. Money on the table
//      cooling off.
//   5. Everybody else, oldest neglected first.
//
// WHY NOT last_contacted_at ALONE: it is null on most rows today, because
// until the Quo pipeline landed nothing wrote it. Sorting on it puts the
// best-documented leads last. Tier 5 falls back to created_at so an old lead
// nobody ever logged still surfaces instead of sinking.

export type QueueLead = {
  id: string;
  created_at: string;
  full_name: string;
  business_name: string | null;
  email: string | null;
  phone: string | null;
  status: string;
  priority: string | null;
  timeline: string | null;
  interest: string | null;
  goals: string | null;
  industry: string | null;
  next_follow_up_at: string | null;
  last_contacted_at: string | null;
  expected_value_cents: number | null;
  owner: string | null;
  source: string | null;
  sms_consent: boolean | null;
  sms_unsubscribed_at: string | null;
};

/** Most recent inbound text or call per lead, as epoch ms. */
export type InboundSignals = Record<string, { at: number; kind: "text" | "call" }>;

export type RankedLead = {
  lead: QueueLead;
  /** 1 is most urgent. */
  tier: number;
  /** The one line that explains the position. */
  reason: string;
  /** Epoch ms of the last touch we know about, for the "waiting" clock. */
  lastTouchAt: number;
  canText: boolean;
};

export const TIER_LABELS: Record<number, string> = {
  1: "Reached out just now",
  2: "New and in a hurry",
  3: "Follow-up is past due",
  4: "Proposal gone quiet",
  5: "Waiting the longest",
};

export const OPEN_STATUSES = ["new", "contacted", "call_booked", "proposal"];

const DAY = 24 * 60 * 60 * 1000;

/** Timeline answers that mean a deadline rather than browsing. */
const URGENT_TIMELINES = new Set(["this_week", "this_month", "asap", "immediately"]);

export function isUrgentTimeline(timeline: string | null): boolean {
  if (!timeline) return false;
  const key = timeline.trim().toLowerCase().replace(/[\s-]+/g, "_");
  if (URGENT_TIMELINES.has(key)) return true;
  // Free text happens. "requested a 20-minute review this week" should count.
  return /\bthis week\b|\basap\b|\bthis_week\b|\burgent\b/.test(timeline.toLowerCase());
}

/** Human timeline answers are stored as snake_case keys. Say them like a person. */
export function prettyTimeline(timeline: string | null): string | null {
  if (!timeline) return null;
  if (timeline.length > 40) return null; // free text belongs in the why line, not a chip
  return timeline.replace(/_/g, " ");
}

export function lastTouchOf(lead: QueueLead, inbound?: { at: number }): number {
  const candidates = [
    inbound?.at,
    lead.last_contacted_at ? Date.parse(lead.last_contacted_at) : undefined,
    Date.parse(lead.created_at),
  ].filter((n): n is number => typeof n === "number" && Number.isFinite(n));
  return candidates.length ? Math.max(...candidates) : 0;
}

/** One line on why this person is on the list at all. Never invented. */
export function whyLine(lead: QueueLead): string {
  const bits: string[] = [];
  if (lead.goals && lead.goals.trim()) {
    const goal = lead.goals.trim().replace(/\s+/g, " ");
    bits.push(goal.length > 120 ? `${goal.slice(0, 117)}...` : goal);
  } else if (lead.interest && lead.interest !== "unsure") {
    bits.push(`Interested in ${lead.interest.replace(/_/g, " ")}`);
  } else if (lead.industry) {
    bits.push(lead.industry);
  }
  if (!bits.length) bits.push("No form answer saved. Open the record before you call.");
  return bits[0];
}

export function rankLead(
  lead: QueueLead,
  signals: InboundSignals,
  now: number,
): RankedLead {
  const inbound = signals[lead.id];
  const lastTouchAt = lastTouchOf(lead, inbound);
  const canText = Boolean(lead.phone) && Boolean(lead.sms_consent) && !lead.sms_unsubscribed_at;

  let tier = 5;
  let reason = "Waiting the longest with no recent contact";

  if (inbound && now - inbound.at <= DAY) {
    tier = 1;
    reason = inbound.kind === "call" ? "Called you in the last 24 hours" : "Texted you in the last 24 hours";
  } else if (lead.status === "new" && isUrgentTimeline(lead.timeline)) {
    tier = 2;
    reason = "New lead who said they need this soon";
  } else if (
    lead.next_follow_up_at &&
    Date.parse(lead.next_follow_up_at) <= now
  ) {
    tier = 3;
    reason = "You set a follow-up date and it has passed";
  } else if (lead.status === "proposal" && now - lastTouchAt >= 3 * DAY) {
    tier = 4;
    reason = "Proposal is out and nobody has touched it in 3 days";
  } else if (lead.status === "new") {
    reason = "New lead, still unanswered";
  }

  // A hot flag does not jump the queue, it explains the row. Priority is set by
  // hand and would otherwise silently outrank a person who texted 10 minutes ago.
  if (lead.priority === "hot" && tier > 1) {
    reason = `${reason}. Marked hot`;
  }

  return { lead, tier, reason, lastTouchAt, canText };
}

export function rankQueue(
  leads: QueueLead[],
  signals: InboundSignals,
  now: number,
): RankedLead[] {
  return leads
    .filter((l) => OPEN_STATUSES.includes(l.status))
    .map((l) => rankLead(l, signals, now))
    .sort((a, b) => {
      if (a.tier !== b.tier) return a.tier - b.tier;
      // Inside tier 1, newest contact first: answer the freshest message.
      if (a.tier === 1) return b.lastTouchAt - a.lastTouchAt;
      // Everywhere else, longest wait first.
      return a.lastTouchAt - b.lastTouchAt;
    });
}

/** "3 days", "4 hours", "just now". Deliberately coarse. */
export function waitedLabel(since: number, now: number): string {
  const ms = Math.max(0, now - since);
  const mins = Math.floor(ms / 60000);
  if (mins < 2) return "just now";
  if (mins < 60) return `${mins} min`;
  const hours = Math.floor(mins / 60);
  if (hours < 24) return `${hours} hr`;
  const days = Math.floor(hours / 24);
  if (days < 30) return `${days} day${days === 1 ? "" : "s"}`;
  const months = Math.floor(days / 30);
  return `${months} mo`;
}

/** tel: and sms: need a bare number. Keeps the + when we have it. */
export function dialHref(phone: string | null, scheme: "tel" | "sms"): string | null {
  if (!phone) return null;
  const cleaned = String(phone).replace(/[^\d+]/g, "");
  const digits = cleaned.replace(/\D/g, "");
  if (digits.length < 10) return null;
  const e164 = cleaned.startsWith("+") ? cleaned : `+1${digits.replace(/^1/, "")}`;
  return `${scheme}:${e164}`;
}

export function formatPhone(phone: string | null): string {
  if (!phone) return "";
  const d = String(phone).replace(/\D/g, "").slice(-10);
  if (d.length !== 10) return String(phone);
  return `(${d.slice(0, 3)}) ${d.slice(3, 6)}-${d.slice(6)}`;
}

export function formatValue(cents: number | null): string | null {
  if (!cents || cents <= 0) return null;
  return `$${Math.round(cents / 100).toLocaleString()}`;
}
