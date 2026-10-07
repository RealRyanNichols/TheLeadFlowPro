// The next action on every open lead: what to do, when it is due, and where
// the lead stands on the follow-up plan ("Call 3 of 25, email 8 of 81").
//
// Ryan, October 7, 2026: "everything that is signaling what should be done
// next." The call sheet (lib/callSheet.ts) already ranks who is waiting. This
// adds the three things it never had: a count of attempts against a plan
// (lib/followUpPlan.ts), a due time for the next one, and the name of the
// script to use (lib/nextActionTemplates.ts).
//
// The rules for an open, reachable, real lead, first match wins:
//   1. They reached out after the last time a person touched the record:
//      answer them. Nothing outranks a person who is waiting on us.
//   2. A proposal is out: follow it up on days 1, 3, 5, 7 and 14, then ask
//      for the decision.
//   3. A call or sit-down is booked: get ready for it, then log what happened.
//   4. A person promised a time (the Call Closer's follow-up) and it has
//      come: call back. A promise still ahead keeps the lead quiet until then.
//   5. Nobody has called yet: call 1, due five minutes after the form.
//   6. A person talked to them and nothing is scheduled: set the next step.
//   7. Calls went unanswered: the next attempt on the plan, on the plan's
//      spacing. When the plan runs out the calls stop and the emails carry on.
// A lead that sat past the end of its plan without a single call is not put
// back at "call 1, weeks overdue". It is listed apart, as past the plan, for
// one decision: call once, or close it.
//
// What counts, and what does not:
//   - An attempt is a call we placed: an outgoing Quo call about the company,
//     or a call outcome a person logged on the call card. A call logged both
//     ways inside thirty minutes is one attempt, not two.
//   - A note is a human touch only when a person wrote it. Notes written by
//     software (a recording review, a sync) are history, not follow-up: on
//     Oct 7, 2026 nine of ten new leads carried a note and none had a call.
//   - The automatic first text and the automatic emails are counted and
//     shown, and never count as a person reaching out.
//
// Pure module. `now` is passed in. Nothing here reads, writes or sends.

import { formatCentral } from "@/lib/businessTime";
import {
  CALL_PLANS,
  EMAIL_SERIES,
  PROPOSAL_FOLLOW_UP_DAYS,
  dayNumber,
  nextAttempt,
  planIdFor,
  proposalFollowUpDue,
  seriesForStep,
  seriesLength,
  type CallStep,
  type Companion,
  type EmailSeries,
  type PlanId,
} from "@/lib/followUpPlan";

export type FollowUpGroup = "priority" | "funding_review" | "fit_check" | "standard";

export const GROUP_LABELS: Record<FollowUpGroup, string> = {
  priority: "Priority",
  funding_review: "Funding review",
  fit_check: "Fit check",
  standard: "Standard",
};

export type NextActionLead = {
  id: string;
  created_at: string;
  full_name: string;
  business_name: string | null;
  phone: string | null;
  email: string | null;
  status: string;
  /** leads.priority: low, normal, high or hot. */
  priority: string | null;
  source: string | null;
  /** leads.utm_campaign, the campaign key the form is registered under. */
  campaign: string | null;
  /** Pat's follow-up group, when the lead answered his questions on the form. */
  group: FollowUpGroup | null;
  /** What they do, in the words on the form. */
  service: string | null;
  /** The Meta ad the lead came from, when Meta gave it to us. */
  ad_id: string | null;
  /** The automatic email series this lead is in, when known (EMAIL_SERIES key). */
  series: string | null;
  /** Consent recorded and no STOP since. */
  can_text: boolean;
  /** A real address that has not unsubscribed. */
  can_email: boolean;
  next_follow_up_at: string | null;
  is_test: boolean | null;
  expected_value_cents: number | null;
};

export type TouchKind =
  /** We called and talked. */
  | "call_out_answered"
  /** We called and nobody picked up (or we left a voicemail). */
  | "call_out_missed"
  /** They called and we talked. */
  | "call_in_answered"
  /** They called and nobody picked up: a reply owed. */
  | "call_in_missed"
  /** A text a person typed. */
  | "text_out"
  /** The software's own text. Counted, never a human touch. */
  | "text_auto"
  /** A text or email from the lead: a reply owed. */
  | "text_in"
  /** An email a person wrote from the lead's record. */
  | "email_out"
  /** A note a person wrote. */
  | "note"
  /** A proposal marked sent. */
  | "proposal_sent";

export type NextActionTouch = { lead_id: string; at: string; kind: TouchKind };

export type NextActionEmail = {
  lead_id: string;
  /** lead_emails.step. */
  step: number;
  /** pending, sent or failed. Only sent counts. */
  status: string | null;
};

export type EmailEvent = { lead_id: string; kind: "opened" | "clicked" | "bounced" };

const ATTEMPTS: readonly TouchKind[] = ["call_out_answered", "call_out_missed"];
const CONVERSATIONS: readonly TouchKind[] = ["call_out_answered", "call_in_answered"];
const INBOUND_OWED: readonly TouchKind[] = ["call_in_missed", "text_in"];
const HUMAN: readonly TouchKind[] = ["call_out_answered", "call_out_missed", "call_in_answered", "text_out", "email_out", "note", "proposal_sent"];

export const isAttempt = (t: Pick<NextActionTouch, "kind">) => ATTEMPTS.includes(t.kind);
export const isConversation = (t: Pick<NextActionTouch, "kind">) => CONVERSATIONS.includes(t.kind);
export const isInboundOwed = (t: Pick<NextActionTouch, "kind">) => INBOUND_OWED.includes(t.kind);
export const isHuman = (t: Pick<NextActionTouch, "kind">) => HUMAN.includes(t.kind);

// ------------------------------------------------ history rows to touches --

export type HistoryCallRow = {
  lead_id: string | null;
  started_at: string | null;
  direction: string | null;
  outcome: string | null;
  duration_seconds?: number | null;
  /** lead_calls.scope_status. Anything other than "company" is not a call about this lead. */
  scope_status?: string | null;
};
export type HistoryMessageRow = {
  lead_id: string;
  direction: string;
  /** sms, email, or note (a reply a person logged by hand). */
  channel?: string | null;
  created_at: string;
  delivered?: boolean | null;
  author?: string | null;
  body?: string | null;
};
export type HistoryNoteRow = { lead_id: string; created_at: string; author?: string | null };
export type HistoryActivityRow = { lead_id: string; kind: string; detail: string; created_at: string };

/** An outgoing call this long, marked completed, is taken as a conversation rather than a ring-out. */
export const TALKED_SECONDS = 45;
/** A logged outcome and a Quo call this close together are the same attempt. */
export const SAME_ATTEMPT_MS = 30 * 60_000;

/**
 * Whoever wrote the note. Software signs its notes ("Codex · ...", "Claude
 * (Quo log)", "brain"); a person signs with a name. An unsigned note is taken
 * as a person's, because the lead pages save notes that way.
 */
export function isAutomatedAuthor(author: string | null | undefined): boolean {
  const who = (author ?? "").trim().toLowerCase();
  if (!who) return false;
  return /^(codex|claude|brain|system|automation|leadflow bot)\b/.test(who) || who.includes("(automatic") || who.includes("quo log");
}

const OUTCOME_RE = /\bOutcome: ([a-z_]+)\./g;

function lastOutcome(detail: string): string | null {
  let found: string | null = null;
  for (const m of detail.matchAll(OUTCOME_RE)) found = m[1];
  return found;
}

/** Outcomes the Call Closer writes when the person was reached (lib/callCloser.ts TALKED_OUTCOMES). */
const TALKED = new Set(["booked", "wants_proposal", "ready_to_pay", "call_back", "not_a_fit"]);
const UNANSWERED = new Set(["no_answer", "voicemail"]);

function ms(value: string | null | undefined): number {
  const n = Date.parse(value ?? "");
  return Number.isFinite(n) ? n : Number.NaN;
}

/**
 * Turn the history tables into touches. `isAutomatedText` lets the server
 * pass the exact rule the call sheet uses (the software's own text bodies);
 * without it, a text signed "(automatic ...)" is taken as the software's.
 */
export function touchesFromHistory(
  rows: {
    calls: readonly HistoryCallRow[];
    messages: readonly HistoryMessageRow[];
    notes: readonly HistoryNoteRow[];
    activity: readonly HistoryActivityRow[];
  },
  options: { isAutomatedText?: (row: HistoryMessageRow) => boolean } = {},
): NextActionTouch[] {
  const automatedText = options.isAutomatedText ?? ((row: HistoryMessageRow) => isAutomatedAuthor(row.author));
  const touches: NextActionTouch[] = [];
  const quoAttempts: NextActionTouch[] = [];

  for (const c of rows.calls) {
    if (!c.lead_id || !c.started_at || Number.isNaN(ms(c.started_at))) continue;
    if (c.scope_status && c.scope_status !== "company") continue;
    const outcome = c.outcome ?? "";
    if (c.direction === "incoming") {
      const missed = ["missed", "voicemail", "no_answer"].includes(outcome);
      touches.push({ lead_id: c.lead_id, at: c.started_at, kind: missed ? "call_in_missed" : "call_in_answered" });
      continue;
    }
    const talked = outcome === "answered" || (outcome === "completed" && (c.duration_seconds ?? 0) >= TALKED_SECONDS);
    const touch: NextActionTouch = { lead_id: c.lead_id, at: c.started_at, kind: talked ? "call_out_answered" : "call_out_missed" };
    touches.push(touch);
    quoAttempts.push(touch);
  }

  for (const a of rows.activity) {
    if (!a.lead_id || !a.created_at || typeof a.detail !== "string" || Number.isNaN(ms(a.created_at))) continue;
    if (a.kind !== "call" && a.kind !== "sales") continue;
    const outcome = lastOutcome(a.detail);
    if (!outcome) continue;
    if (outcome === "proposal_sent") {
      touches.push({ lead_id: a.lead_id, at: a.created_at, kind: "proposal_sent" });
      continue;
    }
    const kind: TouchKind | null = TALKED.has(outcome) ? "call_out_answered" : UNANSWERED.has(outcome) ? "call_out_missed" : null;
    if (!kind) continue;
    // The same call, logged by Quo and by hand: one attempt. The person's own
    // word on whether they talked wins over the provider's.
    const twin = quoAttempts.find((q) => q.lead_id === a.lead_id && Math.abs(ms(q.at) - ms(a.created_at)) <= SAME_ATTEMPT_MS);
    if (twin) {
      twin.kind = kind;
      continue;
    }
    touches.push({ lead_id: a.lead_id, at: a.created_at, kind });
  }

  for (const m of rows.messages) {
    if (!m.lead_id || !m.created_at || Number.isNaN(ms(m.created_at))) continue;
    if (m.direction === "in") {
      // A reply a person logged by hand is their note about the conversation.
      touches.push({ lead_id: m.lead_id, at: m.created_at, kind: m.channel === "note" ? "note" : "text_in" });
      continue;
    }
    if (m.delivered === false) continue;
    if (m.channel === "note") touches.push({ lead_id: m.lead_id, at: m.created_at, kind: "note" });
    else if (m.channel === "email") touches.push({ lead_id: m.lead_id, at: m.created_at, kind: "email_out" });
    else touches.push({ lead_id: m.lead_id, at: m.created_at, kind: automatedText(m) ? "text_auto" : "text_out" });
  }

  for (const n of rows.notes) {
    if (!n.lead_id || !n.created_at || Number.isNaN(ms(n.created_at))) continue;
    if (isAutomatedAuthor(n.author)) continue;
    touches.push({ lead_id: n.lead_id, at: n.created_at, kind: "note" });
  }
  return touches;
}

// ------------------------------------------------------------ the action --

export type ActionKind =
  | "reply"
  | "proposal_follow_up"
  | "proposal_decide"
  | "booked"
  | "booked_passed"
  | "callback"
  | "first_call"
  | "set_next_step"
  | "call_attempt"
  | "email_only"
  | "stale"
  | "wait";

export const ACTION_LABELS: Record<ActionKind, string> = {
  reply: "They reached out",
  proposal_follow_up: "Proposal follow-up",
  proposal_decide: "Ask for the decision",
  booked: "Call booked",
  booked_passed: "Booked time has passed",
  callback: "You said you would call",
  first_call: "First call",
  set_next_step: "Set the next step",
  call_attempt: "Next attempt",
  email_only: "Calls done",
  stale: "Past the plan",
  wait: "Nothing due yet",
};

/** Display and sort order, most urgent first. */
export const ACTION_ORDER: readonly ActionKind[] = [
  "reply",
  "booked_passed",
  "callback",
  "proposal_follow_up",
  "proposal_decide",
  "first_call",
  "set_next_step",
  "call_attempt",
  "booked",
  "wait",
  "email_only",
  "stale",
];

export type NextAction = {
  lead: NextActionLead;
  kind: ActionKind;
  planId: PlanId;
  /** Short and loud: "Call 3 of 25". */
  headline: string;
  /** One plain sentence: why this, why now. */
  why: string;
  /** When it is due. Null when nothing is scheduled. */
  dueAt: string | null;
  /** Due now or overdue. */
  due: boolean;
  /** Hours past due, 0 when not due yet. */
  overdueHours: number;
  /** Call attempts on the record, and how many the plan holds. */
  callsMade: number;
  callsPlanned: number;
  /** Times a person and the lead actually talked. */
  conversations: number;
  /** Texts sent, the software's first text included. */
  textsSent: number;
  /** Automatic emails sent (welcome included), and how many the series holds. Null when the lead is in no series. */
  emailsSent: number;
  emailsPlanned: number | null;
  seriesName: string | null;
  opens: number;
  clicks: number;
  /** Days since the lead arrived, Central calendar. */
  day: number;
  /** What to leave behind if this attempt is not answered, already filtered by consent. */
  companions: Companion[];
  /** Scripts for this action, in the order to use them (lib/nextActionTemplates.ts). */
  templateKeys: string[];
  /** "Calls 2 of 25 · Emails 8 of 81 · Day 4". */
  position: string;
  /** The page to log the outcome on. */
  href: string;
};

export type NextActionBoard = {
  generatedAt: string;
  /** Every open lead with its action, most urgent first. */
  rows: NextAction[];
  /** Rows due now or overdue. */
  due: NextAction[];
  /** Rows with a due time still ahead, soonest first. */
  upcoming: NextAction[];
  counts: Record<ActionKind, number>;
  /** Leads read but left off, with the reason. */
  excluded: { id: string; reason: string }[];
};

const OPEN_STATUSES = new Set(["new", "contacted", "call_booked", "proposal"]);
/** Past its plan's last day and untouched for this long, a lead is listed as past the plan. */
export const STALE_QUIET_DAYS = 30;
const GROUP_WEIGHT: Record<string, number> = { priority: 0, funding_review: 1, standard: 2, fit_check: 3 };

function hoursBetween(later: number, earlier: number): number {
  return Math.max(0, (later - earlier) / 3_600_000);
}

function agoLabel(hours: number): string {
  if (hours < 1) return "under an hour ago";
  if (hours < 48) return `${Math.round(hours)} hour${Math.round(hours) === 1 ? "" : "s"} ago`;
  const days = Math.round(hours / 24);
  return `${days} day${days === 1 ? "" : "s"} ago`;
}

function who(lead: NextActionLead): string {
  const name = String(lead.full_name || "").trim() || "Unnamed lead";
  return lead.business_name ? `${name} at ${lead.business_name}` : name;
}

/** Which numbered voicemail, text or email this step's companion is: the 3 in "voicemail 3". */
function companionNumber(steps: readonly CallStep[], uptoN: number, companion: Companion): number {
  let count = 0;
  for (const s of steps) {
    if (s.n > uptoN) break;
    if (s.with.includes(companion)) count += 1;
  }
  return count;
}

function templatesForAttempt(steps: readonly CallStep[], stepItem: CallStep, companions: readonly Companion[]): string[] {
  const keys: string[] = [stepItem.n === 1 ? "call.first" : stepItem.n === steps.length ? "call.last" : "call.attempt"];
  for (const c of companions) {
    const number = companionNumber(steps, stepItem.n, c);
    const last = stepItem.n === steps.length;
    if (c === "voicemail") keys.push(last ? "voicemail.last" : `voicemail.${Math.min(number, 5)}`);
    if (c === "text") keys.push(`text.${Math.min(number, 5)}`);
    if (c === "email") keys.push(last ? "email.last" : `email.${Math.min(number, 3)}`);
  }
  return keys;
}

type EmailProgress = { sent: number; planned: number | null; series: EmailSeries | null };

/**
 * `welcome` is true or false when the welcome emails were read, and null when
 * they could not be: then the welcome is left out of both sides of the count
 * ("Emails 3 of 80") instead of being guessed.
 */
function emailProgress(lead: NextActionLead, emails: readonly NextActionEmail[], welcome: boolean | null): EmailProgress {
  const welcomed = welcome === true;
  const sent = emails.filter((e) => e.status === null || e.status === "sent");
  // The series named on the lead wins; otherwise the series its newest step belongs to.
  let series: EmailSeries | null = lead.series ? (EMAIL_SERIES.find((s) => s.key === lead.series) ?? null) : null;
  if (!series) {
    const newest = sent.reduce<number | null>((best, e) => (seriesForStep(e.step) && (best === null || e.step > best) ? e.step : best), null);
    series = newest === null ? null : seriesForStep(newest);
  }
  if (!series) return { sent: welcomed ? 1 : 0, planned: null, series: null };
  const inSeries = new Set(sent.filter((e) => e.step >= series.firstStep && e.step <= series.lastStep).map((e) => e.step)).size;
  // Every series opens with the welcome email on day 0.
  return { sent: inSeries + (welcomed ? 1 : 0), planned: seriesLength(series) + (welcome === null ? 0 : 1), series };
}

/**
 * Build the board. Touches and emails may be in any order.
 *
 * `welcomed` holds the leads whose welcome email is on record as sent; a lead
 * that is not in it is shown without one rather than assumed to have had it.
 * Pass null when the welcome emails could not be read. Pass `emails: null`
 * when the email history could not be read: the board then prints no email
 * count at all, because an unread number is never shown as zero.
 */
export function buildNextActions(input: {
  leads: readonly NextActionLead[];
  touches: readonly NextActionTouch[];
  emails?: readonly NextActionEmail[] | null;
  emailEvents?: readonly EmailEvent[];
  welcomed?: ReadonlySet<string> | null;
  now: Date;
  /** Where the outcome is logged. The call card for admins, the sales lead page for the sales desk. */
  hrefFor?: (leadId: string) => string;
}): NextActionBoard {
  const now = input.now;
  const nowMs = now.getTime();
  const hrefFor = input.hrefFor ?? ((id: string) => `/admin/call-sheet/${id}`);

  const touchesByLead = new Map<string, NextActionTouch[]>();
  for (const t of input.touches) {
    if (Number.isNaN(ms(t.at))) continue;
    const list = touchesByLead.get(t.lead_id);
    if (list) list.push(t);
    else touchesByLead.set(t.lead_id, [t]);
  }
  const emailsRead = input.emails !== null;
  const emailsByLead = new Map<string, NextActionEmail[]>();
  for (const e of input.emails ?? []) {
    const list = emailsByLead.get(e.lead_id);
    if (list) list.push(e);
    else emailsByLead.set(e.lead_id, [e]);
  }
  const opens = new Map<string, number>();
  const clicks = new Map<string, number>();
  for (const e of input.emailEvents ?? []) {
    if (e.kind === "opened") opens.set(e.lead_id, (opens.get(e.lead_id) ?? 0) + 1);
    if (e.kind === "clicked") clicks.set(e.lead_id, (clicks.get(e.lead_id) ?? 0) + 1);
  }

  const rows: NextAction[] = [];
  const excluded: NextActionBoard["excluded"] = [];

  for (const lead of input.leads) {
    if (lead.is_test) {
      excluded.push({ id: lead.id, reason: "test record" });
      continue;
    }
    if (!OPEN_STATUSES.has(lead.status)) {
      excluded.push({ id: lead.id, reason: `status ${lead.status}` });
      continue;
    }
    if (!lead.phone && !lead.email) {
      excluded.push({ id: lead.id, reason: "no phone and no email" });
      continue;
    }
    const createdMs = ms(lead.created_at);
    if (Number.isNaN(createdMs)) {
      excluded.push({ id: lead.id, reason: "bad created_at" });
      continue;
    }
    const created = new Date(createdMs);

    const mine = (touchesByLead.get(lead.id) ?? []).slice().sort((a, b) => ms(a.at) - ms(b.at));
    const attempts = mine.filter(isAttempt);
    const talks = mine.filter(isConversation);
    const humans = mine.filter(isHuman);
    const inbound = mine.filter(isInboundOwed);
    const lastHumanMs = humans.length ? ms(humans[humans.length - 1].at) : null;
    const lastInboundMs = inbound.length ? ms(inbound[inbound.length - 1].at) : null;
    const lastAttemptMs = attempts.length ? ms(attempts[attempts.length - 1].at) : null;
    const lastTalkMs = talks.length ? ms(talks[talks.length - 1].at) : null;

    const planId = planIdFor(lead);
    const plan = CALL_PLANS[planId];
    const progress: EmailProgress = emailsRead
      ? emailProgress(lead, emailsByLead.get(lead.id) ?? [], input.welcomed === null ? null : (input.welcomed?.has(lead.id) ?? false))
      : { sent: 0, planned: null, series: null };
    const day = dayNumber(created, now);
    const callsMade = attempts.length;
    const positionParts = [`Calls ${Math.min(callsMade, plan.steps.length)} of ${plan.steps.length}`];
    if (progress.planned !== null) positionParts.push(`Emails ${Math.min(progress.sent, progress.planned)} of ${progress.planned}`);
    else if (progress.sent > 0) positionParts.push(`Emails ${progress.sent}`);
    positionParts.push(`Day ${day}`);

    const base = {
      lead,
      planId,
      callsMade,
      callsPlanned: plan.steps.length,
      conversations: talks.length,
      textsSent: mine.filter((t) => t.kind === "text_out" || t.kind === "text_auto").length,
      emailsSent: progress.sent,
      emailsPlanned: progress.planned,
      seriesName: progress.series?.name ?? null,
      opens: opens.get(lead.id) ?? 0,
      clicks: clicks.get(lead.id) ?? 0,
      day,
      position: positionParts.join(" · "),
      href: hrefFor(lead.id),
    };
    const name = who(lead);
    const finish = (
      kind: ActionKind,
      headline: string,
      why: string,
      dueAtMs: number | null,
      templateKeys: string[],
      companions: Companion[] = [],
    ) => {
      const due = dueAtMs !== null && dueAtMs <= nowMs;
      rows.push({
        ...base,
        kind,
        headline,
        why,
        dueAt: dueAtMs === null ? null : new Date(dueAtMs).toISOString(),
        due,
        overdueHours: due && dueAtMs !== null ? hoursBetween(nowMs, dueAtMs) : 0,
        companions,
        templateKeys,
      });
    };

    // 1. They reached out and nothing has gone back.
    if (lastInboundMs !== null && (lastHumanMs === null || lastInboundMs > lastHumanMs)) {
      const how = inbound[inbound.length - 1].kind === "call_in_missed" ? "called and nobody picked up" : "sent a message";
      finish("reply", "Answer them now", `${name} ${how} ${agoLabel(hoursBetween(nowMs, lastInboundMs))} and nothing has gone back since.`, lastInboundMs, ["reply"]);
      continue;
    }

    const promiseMs = ms(lead.next_follow_up_at);
    const hasPromise = !Number.isNaN(promiseMs);

    // 2. A proposal is out.
    if (lead.status === "proposal") {
      const sent = mine.filter((t) => t.kind === "proposal_sent");
      const sentMs = sent.length ? ms(sent[sent.length - 1].at) : (lastHumanMs ?? createdMs);
      const followUps = humans.filter((t) => t.kind !== "proposal_sent" && ms(t.at) > sentMs).length;
      const total = PROPOSAL_FOLLOW_UP_DAYS.length;
      if (followUps >= total) {
        const lastMs = lastHumanMs ?? sentMs;
        finish(
          "proposal_decide",
          "Ask for the decision",
          `${name} has had ${total} follow-ups on the proposal. Ask for a yes or a no, or park it for 30 days.`,
          lastMs + 3 * 86_400_000,
          ["proposal.decide"],
        );
        continue;
      }
      const planned = proposalFollowUpDue(new Date(sentMs), followUps);
      // A time a person set after the proposal went out wins over the ladder.
      const dueMs = hasPromise && promiseMs > sentMs && (lastHumanMs === null || lastHumanMs < promiseMs) ? promiseMs : (planned?.getTime() ?? sentMs);
      const since = sent.length
        ? `${name} has had the proposal since ${formatCentral(new Date(sentMs))}.`
        : `${name} is at the proposal stage, with no send date on the record.`;
      finish(
        "proposal_follow_up",
        `Proposal follow-up ${followUps + 1} of ${total}`,
        `${since} ${followUps === 0 ? "Nobody has followed up yet." : `Followed up ${followUps} time${followUps === 1 ? "" : "s"} so far.`}`,
        dueMs,
        [`proposal.${followUps + 1}`],
      );
      continue;
    }

    // 3. A call or sit-down is on the calendar.
    if (lead.status === "call_booked" && hasPromise) {
      if (promiseMs > nowMs) {
        finish("booked", "Call booked", `${name} is booked for ${formatCentral(new Date(promiseMs))}. Do the homework before you dial.`, promiseMs, ["booked.prep"]);
        continue;
      }
      if (lastHumanMs === null || lastHumanMs < promiseMs) {
        finish("booked_passed", "Log the booked call", `${name} was booked for ${formatCentral(new Date(promiseMs))} and nothing is on the record since. Log what happened and set the next step.`, promiseMs, ["next_step"]);
        continue;
      }
    }

    // 4. A promised time. Only honoured once a person has touched the lead:
    // the diagnostic route stamps brand new leads with a time of its own.
    if (hasPromise && lastHumanMs !== null) {
      if (promiseMs > nowMs) {
        finish("wait", "Nothing due yet", `${name}: follow-up is set for ${formatCentral(new Date(promiseMs))}.`, promiseMs, ["callback"]);
        continue;
      }
      if (lastHumanMs < promiseMs) {
        finish("callback", "Call back, as promised", `${name}: follow-up due since ${formatCentral(new Date(promiseMs))}.`, promiseMs, ["callback"]);
        continue;
      }
    }

    // Past the end of the plan with nothing to show for it: one decision, not a backlog.
    const planLastDay = plan.steps[plan.steps.length - 1].day;
    const neverCalled = callsMade === 0 && talks.length === 0;
    const wentQuiet = !neverCalled && lastHumanMs !== null && hoursBetween(nowMs, lastHumanMs) > STALE_QUIET_DAYS * 24;
    if (day > planLastDay && (neverCalled || wentQuiet)) {
      finish(
        "stale",
        "Past the plan",
        neverCalled
          ? `${name} came in ${day} days ago and no call is on the record. The ${plan.name.toLowerCase()} ended on day ${planLastDay}. Call once, or close it.`
          : `${name} came in ${day} days ago and nothing has happened for ${Math.round(hoursBetween(nowMs, lastHumanMs ?? nowMs) / 24)} days. Call once, or close it.`,
        null,
        ["call.reopen"],
      );
      continue;
    }

    // 5. Nobody has called yet.
    if (neverCalled) {
      const first = nextAttempt({ createdAt: created, planId, attemptsMade: 0, lastAttemptAt: null });
      const dueMs = first ? first.dueAt.getTime() : createdMs;
      finish(
        "first_call",
        `Call 1 of ${plan.steps.length}`,
        `${name} came in ${agoLabel(hoursBetween(nowMs, createdMs))} and no call is on the record.${lead.group ? ` ${GROUP_LABELS[lead.group]} lead.` : ""}`,
        dueMs,
        ["call.first", "voicemail.1", ...(lead.can_text ? ["text.1"] : []), ...(lead.can_email ? ["email.1"] : [])],
      );
      continue;
    }

    // 6. A person talked to them and nothing is scheduled.
    if (lastTalkMs !== null && (lastAttemptMs === null || lastTalkMs >= lastAttemptMs)) {
      finish(
        "set_next_step",
        "Set the next step",
        `Somebody talked to ${name} on ${formatCentral(new Date(lastTalkMs))} and no next step is set. Book the second call, send the proposal, or close it out.`,
        lastTalkMs + 24 * 3_600_000,
        ["next_step"],
      );
      continue;
    }

    // 7. The next attempt on the plan.
    const next = nextAttempt({ createdAt: created, planId, attemptsMade: callsMade, lastAttemptAt: lastAttemptMs === null ? null : new Date(lastAttemptMs) });
    if (!next) {
      finish(
        "email_only",
        "Calls done. Emails carry on",
        `${name} has had all ${plan.steps.length} call attempts with no conversation. Stop calling. ${progress.planned !== null ? "The email series keeps going." : "Leave the record open in case they reply."}`,
        null,
        [],
      );
      continue;
    }
    const companions = next.step.with.filter((c) => (c === "text" ? lead.can_text : c === "email" ? lead.can_email : true));
    const skippedText = next.step.with.includes("text") && !lead.can_text;
    finish(
      "call_attempt",
      `Call ${next.step.n} of ${plan.steps.length}`,
      `${name} has had ${callsMade} attempt${callsMade === 1 ? "" : "s"} and no conversation yet.${
        companions.length ? ` No answer: leave ${companions.join(", ").replace(/, ([^,]*)$/, " and $1")}.` : ""
      }${skippedText ? " No text: there is no texting consent on file." : ""}`,
      next.dueAt.getTime(),
      templatesForAttempt(plan.steps, next.step, companions),
      companions,
    );
  }

  rows.sort((a, b) => {
    if (a.due !== b.due) return a.due ? -1 : 1;
    if (a.due) {
      const kind = ACTION_ORDER.indexOf(a.kind) - ACTION_ORDER.indexOf(b.kind);
      if (kind !== 0) return kind;
      const group = (GROUP_WEIGHT[a.lead.group ?? "standard"] ?? 2) - (GROUP_WEIGHT[b.lead.group ?? "standard"] ?? 2);
      if (group !== 0) return group;
      // A first call goes to the newest lead: they are the most likely to pick up.
      if (a.kind === "first_call") return b.lead.created_at.localeCompare(a.lead.created_at);
      return (a.dueAt ?? "").localeCompare(b.dueAt ?? "");
    }
    // Not due: the soonest first, and anything with no time last.
    if ((a.dueAt === null) !== (b.dueAt === null)) return a.dueAt === null ? 1 : -1;
    return (a.dueAt ?? "").localeCompare(b.dueAt ?? "");
  });

  const counts = Object.fromEntries(ACTION_ORDER.map((k) => [k, 0])) as Record<ActionKind, number>;
  for (const r of rows) counts[r.kind] += 1;

  return {
    generatedAt: now.toISOString(),
    rows,
    due: rows.filter((r) => r.due),
    upcoming: rows.filter((r) => !r.due && r.dueAt !== null),
    counts,
    excluded,
  };
}

/** One sentence for the top of the board: where the work is right now. */
export function nextActionLine(board: NextActionBoard): string {
  const due = board.due;
  if (due.length === 0) {
    return board.rows.length === 0
      ? "No open leads on the board."
      : "Nothing is due right now. The next one is listed under Coming up.";
  }
  const count = (kind: ActionKind) => due.filter((r) => r.kind === kind).length;
  const replies = count("reply");
  const first = count("first_call");
  const promised = count("callback") + count("booked_passed");
  const proposals = count("proposal_follow_up") + count("proposal_decide");
  if (replies > 0) return `${replies} ${replies === 1 ? "person has" : "people have"} reached out and ${replies === 1 ? "is" : "are"} waiting on an answer. Start there.`;
  if (promised > 0) return `${promised} call${promised === 1 ? "" : "s"} you promised ${promised === 1 ? "is" : "are"} due. Keep your word first.`;
  if (proposals > 0) return `${proposals} proposal${proposals === 1 ? "" : "s"} ${proposals === 1 ? "needs" : "need"} a follow-up. That is the closest money on the board.`;
  if (first > 0) return `${first} lead${first === 1 ? " has" : "s have"} never had a call. Call the newest one now.`;
  return `${due.length} follow-up${due.length === 1 ? " is" : "s are"} due on the plan.`;
}

// ------------------------------------------------------------- the pace --

export type LeadPace = {
  lead_id: string;
  created_at: string;
  /** Minutes from the form to the first call attempt. Null when no attempt is on the record. */
  minutesToFirstCall: number | null;
  /** Attempts in the first 48 hours. */
  attemptsIn48h: number;
  talked: boolean;
};

/** How fast and how often each lead was called. Feeds the scorecard (lib/growthSignals.ts). */
export function leadPace(leads: readonly Pick<NextActionLead, "id" | "created_at">[], touches: readonly NextActionTouch[]): LeadPace[] {
  const byLead = new Map<string, NextActionTouch[]>();
  for (const t of touches) {
    const list = byLead.get(t.lead_id);
    if (list) list.push(t);
    else byLead.set(t.lead_id, [t]);
  }
  return leads.map((lead) => {
    const createdMs = ms(lead.created_at);
    const mine = byLead.get(lead.id) ?? [];
    const attempts = mine.filter(isAttempt).map((t) => ms(t.at)).filter((n) => !Number.isNaN(n)).sort((a, b) => a - b);
    const first = attempts.length ? attempts[0] : null;
    return {
      lead_id: lead.id,
      created_at: lead.created_at,
      minutesToFirstCall: first === null || Number.isNaN(createdMs) ? null : Math.max(0, Math.round((first - createdMs) / 60_000)),
      attemptsIn48h: attempts.filter((at) => at - createdMs <= 48 * 3_600_000).length,
      talked: mine.some(isConversation),
    };
  });
}
