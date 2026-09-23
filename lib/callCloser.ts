// The Call Closer: every call Ryan makes becomes a structured outcome, a
// promise in Central time, and, when the lead says yes, the published pay
// door in his hand.
//
// Why this exists: docs/ceo-plan-2026-09-20.md traced $0 in revenue to leads
// that got an automated email and never a person. The call sheet gives Ryan
// the list. This file gives him the record. Two taps after a call say what
// happened, and the plan below says exactly what that changes: the lead's
// stage, the note, the task, the timeline entry, and when the lead comes back
// to the call sheet. The panel runs the same function on the browser clock to
// draw its "When you save" list, and the route runs it on the server clock to
// write, so what Ryan reads before he taps Save is what gets saved.
//
// The rules:
// - Stages only move forward: new, contacted, call_booked, proposal. A lead
//   already at proposal who books a sit-down stays at proposal. A status this
//   file does not know is left alone. Won and lost leads are closed (409).
// - No answer and a voicemail change nothing about the relationship: no stage
//   change and no last_contacted_at. They only set the next try, on a ladder
//   (1, then 2, then 4 business days) at the other half of the day. A
//   follow-up already set for sooner than that (a call back Ryan promised)
//   is kept, so an early try never pushes a promise later. After two
//   unanswered tries the preview suggests a text or an email, naming only the
//   ones allowed for this lead: a text needs consent and no STOP, an email
//   needs a real address. With neither, it says to call at another time.
// - Callbacks and sit-downs must be in the future and within 90 days.
// - "Ready to pay now" is only offered when the pay door takes money online
//   today. A price that is not published yet goes in a written proposal first.
//   An agency service is paid on the agency pay page against its written
//   scope, so once the lead is at the proposal stage (the number is in
//   writing) its pay link is handed over too, never with an amount.
// - Every price and link comes from lib/payDoors.ts, which reads the offer
//   registry. Nothing here types a number or a URL.
// - The activity detail ends with bookkeeping markers: "Outcome: x.",
//   "Offer ids: a, b." and "Ref <key>". The route finds a retried save by its
//   Ref, countPriorAttempts reads Outcome, and the call card reads the offers
//   back. lib/leadTimeline.ts strips them for display.
//
// Pure and safe in a "use client" component: "now" is passed in, and nothing
// here reads the database, sends a message, or fetches anything. It imports
// no Supabase, Quo, email, or call sheet code.

import {
  centralDate,
  centralHour,
  formatCentral,
  formatCentralDate,
  isLocalDate,
  isLocalTime,
  nextBusinessAt,
  nextWeekdayAfter,
  wallClockToInstant,
} from "@/lib/businessTime";
import { line, noteText } from "@/lib/hq/copy";
import { isCloserOfferId, payDoorFor, payLinkMessage, type CloserOfferId, type PayDoor } from "@/lib/payDoors";
import { offerIdForInterest } from "@/lib/proposals/build";
import { agencyService } from "@/lib/site/agency";
import { CONSULTATION } from "@/lib/site/consultation";

// ------------------------------------------------------------ outcomes --

export const CALL_OUTCOMES = [
  "booked",
  "wants_proposal",
  "ready_to_pay",
  "call_back",
  "no_answer",
  "voicemail",
  "not_a_fit",
  "proposal_sent",
] as const;

export type CallOutcome = (typeof CALL_OUTCOMES)[number];

/** The tiles on the call card. "Proposal sent" is logged from the proposal page instead. */
export const PANEL_OUTCOMES: readonly CallOutcome[] = CALL_OUTCOMES.filter((o) => o !== "proposal_sent");

export const OUTCOME_LABELS: Record<CallOutcome, string> = {
  booked: "Booked the sit-down",
  wants_proposal: "Wants a proposal",
  ready_to_pay: "Ready to pay now",
  call_back: "Talked, call back later",
  no_answer: "No answer",
  voicemail: "Left a voicemail",
  not_a_fit: "Not a fit",
  proposal_sent: "Proposal sent",
};

/**
 * Outcomes where a conversation happened. One of these ends a run of
 * unanswered tries. Proposal sent is written with kind "sales", so callers of
 * countPriorAttempts read CALL_HISTORY_KINDS, not only "call".
 */
export const TALKED_OUTCOMES: readonly CallOutcome[] = [
  "booked",
  "wants_proposal",
  "ready_to_pay",
  "call_back",
  "not_a_fit",
  "proposal_sent",
];

export const LOST_REASONS: readonly { id: "not_owner" | "no_budget" | "has_someone" | "wrong_number" | "other"; label: string }[] = [
  { id: "not_owner", label: "Not the owner or decision maker" },
  { id: "no_budget", label: "No budget right now" },
  { id: "has_someone", label: "Already has someone for this" },
  { id: "wrong_number", label: "Wrong number" },
  { id: "other", label: "Other" },
];

/** The open stages, in order. A call can only move a lead to the right. */
export const STAGE_ORDER = ["new", "contacted", "call_booked", "proposal"] as const;

const STAGE_LABELS: Record<string, string> = {
  new: "New",
  contacted: "Contacted",
  call_booked: "Call booked",
  proposal: "Proposal",
  won: "Won",
  lost: "Lost",
};

const CLOSED_STATUSES = new Set(["won", "lost"]);

/** A browser crypto.randomUUID() fits; so does any other 20 to 80 character key. */
export const IDEMPOTENCY_KEY_RE = /^[a-z0-9-]{20,80}$/i;

/** The marker the route searches lead_activity for, to spot a retried save. */
export function refMarker(key: string): string {
  return `Ref ${key}`;
}

/** Longest note the panel accepts, in characters. */
export const NEXT_STEP_NOTE_MAX = 2000;
/** Longest meeting place, in characters. */
export const MEETING_PLACE_MAX = 120;
/** Most offers one call can name. */
export const MAX_CALL_OFFERS = 3;
/** A callback or sit-down further out than this is a typo, not a plan. */
export const MAX_DAYS_AHEAD = 90;

/**
 * Where a sit-down happens, in the words the note uses. The ids match the
 * homepage consultation form's meeting choices.
 */
export const MEETING_PLACES = [
  { id: "your_place", label: "At their business", place: "at their business" },
  { id: "our_office", label: "At the Longview office", place: "at the Longview office" },
  { id: "call", label: "Phone or video call", place: "on a phone or video call" },
] as const;

/** The meeting place that matches the consultation form's label ("Come to my business"), or null. */
export function meetingPlaceForLabel(label: string | null): string | null {
  if (!label) return null;
  const id = CONSULTATION.meetings.find((m) => m.label === label)?.id;
  return MEETING_PLACES.find((p) => p.id === id)?.place ?? null;
}

// ------------------------------------------------------------- request --

export type NextStepRequest = {
  outcome: CallOutcome;
  idempotencyKey: string;
  note: string | null;
  offers: CloserOfferId[];
  meeting: { localDate: string; time: string; place: string | null } | null;
  callback: { localDate: string; time: string } | null;
  lostReason: string | null;
};

type Parsed = { ok: true; request: NextStepRequest } | { ok: false; error: string };

function isRecord(v: unknown): v is Record<string, unknown> {
  return typeof v === "object" && v !== null && !Array.isArray(v);
}

function isBlank(v: unknown): boolean {
  return v === undefined || v === null || (typeof v === "string" && v.trim() === "");
}

function isCallOutcome(v: unknown): v is CallOutcome {
  return typeof v === "string" && (CALL_OUTCOMES as readonly string[]).includes(v);
}

function isLostReasonId(v: unknown): boolean {
  return typeof v === "string" && LOST_REASONS.some((r) => r.id === v);
}

/** A date and time sent as a pair: both or neither. */
function readPair(
  dateValue: unknown,
  timeValue: unknown,
  what: string,
): { ok: true; pair: { localDate: string; time: string } | null } | { ok: false; error: string } {
  const noDate = isBlank(dateValue);
  const noTime = isBlank(timeValue);
  if (noDate && noTime) return { ok: true, pair: null };
  if (noDate || noTime) return { ok: false, error: `Give the ${what} a date and a time.` };
  const localDate = typeof dateValue === "string" ? dateValue.trim() : dateValue;
  const time = typeof timeValue === "string" ? timeValue.trim() : timeValue;
  if (!isLocalDate(localDate)) return { ok: false, error: `Pick a real date for the ${what}.` };
  if (!isLocalTime(time)) return { ok: false, error: `Pick a time for the ${what}.` };
  return { ok: true, pair: { localDate, time } };
}

/**
 * Reads the JSON the panel posts. Structure only: whether an outcome has
 * what it needs (a date for a sit-down, offers for a proposal) is the
 * planner's call, so the preview and the save give the same answer. Keys
 * this does not list, an "author" or "actor" among them, are ignored: the
 * route takes the author from the signed-in profile.
 */
export function parseNextStepRequest(body: unknown): Parsed {
  if (!isRecord(body)) return { ok: false, error: "Send the call outcome as a JSON object." };

  if (!isCallOutcome(body.outcome)) return { ok: false, error: "Choose how the call went." };
  const outcome = body.outcome;

  const key = body.idempotency_key;
  if (typeof key !== "string" || !IDEMPOTENCY_KEY_RE.test(key)) {
    return { ok: false, error: "This save is missing its reference. Reload the page and try again." };
  }

  let note: string | null = null;
  if (!isBlank(body.note)) {
    if (typeof body.note !== "string") return { ok: false, error: "The note must be text." };
    const normalized = body.note.replace(/\r\n?/g, "\n");
    if (normalized.length > NEXT_STEP_NOTE_MAX) {
      return { ok: false, error: `Keep the note to ${NEXT_STEP_NOTE_MAX.toLocaleString("en-US")} characters.` };
    }
    // noteText, not plain(): plain() reads a bare "<" as the start of a tag
    // and would cut "Crew of <5, budget under $800" off at the "<".
    note = noteText(normalized, NEXT_STEP_NOTE_MAX) || null;
  }

  const offers: CloserOfferId[] = [];
  if (!isBlank(body.offers)) {
    if (!Array.isArray(body.offers)) return { ok: false, error: "Send the offers as a list." };
    for (const id of body.offers) {
      if (!isCloserOfferId(id) || !payDoorFor(id)) return { ok: false, error: "One of the offers is not on the published list." };
      if (!offers.includes(id)) offers.push(id);
    }
    if (offers.length > MAX_CALL_OFFERS) return { ok: false, error: `Pick up to ${MAX_CALL_OFFERS} offers.` };
  }

  const meetingPair = readPair(body.meeting_date, body.meeting_time, "sit-down");
  if (!meetingPair.ok) return meetingPair;
  let place: string | null = null;
  if (!isBlank(body.meeting_place)) {
    if (typeof body.meeting_place !== "string") return { ok: false, error: "The meeting place must be text." };
    const cleaned = line(body.meeting_place, 1000);
    if (cleaned.length > MEETING_PLACE_MAX) return { ok: false, error: `Keep the meeting place under ${MEETING_PLACE_MAX} characters.` };
    place = cleaned || null;
  }
  const meeting = meetingPair.pair ? { ...meetingPair.pair, place } : null;

  const callbackPair = readPair(body.callback_date, body.callback_time, "call back");
  if (!callbackPair.ok) return callbackPair;

  let lostReason: string | null = null;
  if (!isBlank(body.lost_reason)) {
    if (!isLostReasonId(body.lost_reason)) return { ok: false, error: "Pick a reason from the list." };
    lostReason = body.lost_reason as string;
  }

  return {
    ok: true,
    request: { outcome, idempotencyKey: key, note, offers, meeting, callback: callbackPair.pair, lostReason },
  };
}

// ------------------------------------------------------------- planner --

export type PlannerLead = {
  id: string;
  full_name: string;
  business_name: string | null;
  status: string;
  interest: string | null;
  phone: string | null;
  email: string | null;
  sms_consent: boolean | null;
  sms_unsubscribed_at: string | null;
  next_follow_up_at: string | null;
  diagnostic: Record<string, unknown> | null;
};

/** Only the operating CRM fields a sales user may change (public.protect_sales_lead_fields). */
export type LeadPatch = Partial<{
  status: string;
  last_contacted_at: string;
  next_follow_up_at: string | null;
  lost_reason: string | null;
}>;

export type CallPlan = {
  ok: true;
  outcome: CallOutcome;
  /** Line 1 is the outcome sentence; Ryan's note follows after a blank line. At most 4000 characters. */
  noteBody: string;
  /** Keys only from status, last_contacted_at, next_follow_up_at, lost_reason. Status only when it changes. */
  leadPatch: LeadPatch;
  task: { title: string; task_type: "meeting" | "proposal"; due_date: string; priority: "high" | "normal" } | null;
  completeProposalTasks: boolean;
  /** "<sentence> Outcome: <outcome>. [Offer ids: a, b.] Ref <key>", at most 1000 characters. */
  activity: { kind: "call" | "sales"; detail: string };
  nextFollowUpAt: string | null;
  /** The "When you save" lines. The last one is always "Nothing is sent to <first name>." */
  preview: string[];
  /** Ready to pay only. */
  payDoors: PayDoor[];
  /** Ready to pay only: the one customer draft, for Ryan to send himself. */
  payMessage: string | null;
  /** Wants a proposal only. */
  proposalHref: string | null;
  /** One sentence for the success message. */
  summary: string;
};

export type PlanError = { ok: false; status: 400 | 409; error: string };

/** Database limits (supabase/migrations/20260809000100_portal_buildout.sql and 20260819172000). */
const NOTE_BODY_MAX = 4000;
const ACTIVITY_DETAIL_MAX = 1000;
const TASK_TITLE_MAX = 300;
const LOST_REASON_MAX = 200;

/** The plan's Tuesday and Thursday afternoon proposal slots. */
const PROPOSAL_WEEKDAYS = [2, 4];
const PROPOSAL_FOLLOW_UP_TIME = "13:00";
const PAYMENT_CHECK_TIME = "10:00";
const PROPOSAL_SENT_FOLLOW_UP_TIME = "09:00";
const DAY_MS = 86_400_000;

/** Outcomes that record the offers talked about. */
const OFFER_OUTCOMES: ReadonlySet<CallOutcome> = new Set<CallOutcome>(["booked", "wants_proposal", "ready_to_pay", "call_back", "proposal_sent"]);

function clip(text: string, max: number): string {
  if (text.length <= max) return text;
  return `${text.slice(0, Math.max(0, max - 3)).trimEnd()}...`;
}

function joinNames(names: string[]): string {
  if (names.length <= 1) return names.join("");
  return `${names.slice(0, -1).join(", ")} and ${names[names.length - 1]}`;
}

function withPeriod(text: string): string {
  return /[.!?]$/.test(text) ? text : `${text}.`;
}

/** A name the lead typed, on one line, with long dashes turned into plain ones so the copy rules hold. */
function tidyName(value: string | null | undefined, max = 200): string {
  return line(value ?? "", max).replace(/\s*[\u2013\u2014]\s*/g, " - ");
}

function firstLine(text: string | null): string {
  if (!text) return "";
  return (
    text
      .split("\n")
      .map((l) => l.trim())
      .find((l) => l.length > 0) ?? ""
  );
}

/** Texting is allowed: a phone, recorded consent, and no STOP since. The rule of lib/callSheet.ts canText, kept here so the panel loads no call sheet code. */
function mayText(lead: PlannerLead): boolean {
  return Boolean(lead.phone) && lead.sms_consent === true && !lead.sms_unsubscribed_at;
}

/** A real address to write to, not the placeholder a Meta lead ad leaves. The rule of hasLeadEmailAddress (lib/leadMessageAuthor.ts). */
function mayEmail(email: string | null): boolean {
  return typeof email === "string" && /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email) && !email.toLowerCase().endsWith("@no-email.facebook.lead");
}

/** After two unanswered tries: what to try next, naming only the channels Ryan may use with this lead. */
function severalTriesLine(lead: PlannerLead): string {
  const start = "That is several tries without an answer.";
  const text = mayText(lead);
  const email = mayEmail(lead.email);
  const stopped = Boolean(lead.sms_unsubscribed_at);
  if (text && email) return `${start} Try a text or an email next.`;
  if (text) return `${start} Try a text next.`;
  if (email) return stopped ? `${start} They replied STOP, so no texts. Try an email next.` : `${start} Try an email next.`;
  return stopped
    ? `${start} They replied STOP and there is no email on file, so call again at a different time of day.`
    : `${start} There is no text consent and no email on file, so call again at a different time of day.`;
}

function stageLabel(status: string): string {
  return STAGE_LABELS[status] ?? status.replace(/[_-]+/g, " ");
}

function placePhrase(place: string): string {
  const p = place.trim().replace(/[.\s]+$/, "");
  return /^(at|on|in|by|over|via)\s/i.test(p) ? p : `at ${p}`;
}

function instantFor(pair: { localDate: string; time: string } | null): Date | null {
  if (!pair || !isLocalDate(pair.localDate) || !isLocalTime(pair.time)) return null;
  return wallClockToInstant(pair.localDate, pair.time);
}

/** A stored ISO time that is a real instant later than now, or null. */
function futureInstant(iso: string | null, now: Date): Date | null {
  if (typeof iso !== "string" || !iso) return null;
  const at = new Date(iso);
  return Number.isNaN(at.getTime()) || at.getTime() <= now.getTime() ? null : at;
}

function windowError(at: Date, now: Date, what: string): PlanError | null {
  if (at.getTime() <= now.getTime()) {
    return { ok: false, status: 400, error: `That ${what} time has already passed. Pick a later one.` };
  }
  if (at.getTime() > now.getTime() + MAX_DAYS_AHEAD * DAY_MS) {
    return { ok: false, status: 400, error: `Pick a ${what} time within the next ${MAX_DAYS_AHEAD} days.` };
  }
  return null;
}

const bad = (error: string): PlanError => ({ ok: false, status: 400, error });

/**
 * Forward-only stage change. Returns the target when it is further along
 * than the current stage, and null (no change) when it is not, or when the
 * current status is one this file does not know.
 */
export function stageAfter(current: string, target: "contacted" | "call_booked" | "proposal"): string | null {
  const order = STAGE_ORDER as readonly string[];
  const from = order.indexOf(current);
  const to = order.indexOf(target);
  if (from < 0 || to < 0) return null;
  return to > from ? target : null;
}

type Draft = {
  sentence: string;
  patch: LeadPatch;
  task: CallPlan["task"];
  completeProposalTasks: boolean;
  next: Date | null;
  lines: string[];
  payDoors: PayDoor[];
  payMessage: string | null;
  proposalHref: string | null;
  summary: string;
};

/**
 * What saving this outcome writes, and what the panel says it will write.
 * `priorAttempts` is countPriorAttempts over the lead's recent call activity.
 * `actorName` signs the pay-link draft; the route takes it from the profile.
 */
export function planCallOutcome(input: {
  lead: PlannerLead;
  request: NextStepRequest;
  actorName: string;
  now: Date;
  priorAttempts: number;
}): CallPlan | PlanError {
  const { lead, request, now } = input;
  const status = typeof lead.status === "string" ? lead.status : "";
  if (CLOSED_STATUSES.has(status)) {
    return {
      ok: false,
      status: 409,
      error: `This lead is already marked ${stageLabel(status).toLowerCase()}. Reopen it on the lead page before logging a call.`,
    };
  }

  if (request.offers.length > MAX_CALL_OFFERS) return bad(`Pick up to ${MAX_CALL_OFFERS} offers.`);

  const first = firstName(lead.full_name);
  const who = first || "the lead";
  const nowIso = now.toISOString();
  const doors = request.offers.map((id) => payDoorFor(id)).filter((d): d is PayDoor => d !== null);
  const names = doors.map((d) => d.offerName);
  const talkedAbout = names.length ? ` Talked about ${joinNames(names)}.` : "";

  const draft: Draft = {
    sentence: "",
    patch: {},
    task: null,
    completeProposalTasks: false,
    next: null,
    lines: [],
    payDoors: [],
    payMessage: null,
    proposalHref: null,
    summary: "",
  };
  const moveTo = (target: "contacted" | "call_booked" | "proposal") => {
    const next = stageAfter(status, target);
    if (next) draft.patch.status = next;
  };

  switch (request.outcome) {
    case "booked": {
      if (!request.meeting) return bad("Pick the day and time of the sit-down.");
      const at = instantFor(request.meeting);
      if (!at) return bad("Pick a real date and time for the sit-down.");
      const late = windowError(at, now, "sit-down");
      if (late) return late;
      const place = request.meeting.place ? `, ${placePhrase(request.meeting.place)}` : "";
      draft.sentence = `Call: booked the sit-down for ${formatCentral(at)}${place}.${talkedAbout}`;
      moveTo("call_booked");
      draft.patch.last_contacted_at = nowIso;
      draft.patch.next_follow_up_at = at.toISOString();
      draft.next = at;
      draft.task = {
        title: clip(`Sit-down with ${tidyName(first) || "the lead"}`, TASK_TITLE_MAX),
        task_type: "meeting",
        due_date: request.meeting.localDate,
        priority: "high",
      };
      draft.summary = `Booked. The sit-down with ${who} is ${formatCentral(at)}.`;
      break;
    }

    case "wants_proposal": {
      if (doors.length === 0) return bad("Pick what goes in the proposal, up to three offers.");
      const due = nextWeekdayAfter(centralDate(now), PROPOSAL_WEEKDAYS);
      const at = wallClockToInstant(due, PROPOSAL_FOLLOW_UP_TIME);
      draft.sentence = `Call: wants a proposal for ${joinNames(names)}. Proposal due ${formatCentralDate(due)}.`;
      moveTo("contacted");
      draft.patch.last_contacted_at = nowIso;
      draft.patch.next_follow_up_at = at.toISOString();
      draft.next = at;
      const forWhom = tidyName(lead.business_name) || tidyName(lead.full_name) || "this lead";
      draft.task = {
        title: clip(`Write the proposal for ${forWhom}: ${names.join(", ")}`, TASK_TITLE_MAX),
        task_type: "proposal",
        due_date: due,
        priority: "high",
      };
      draft.proposalHref = `/admin/proposals/${encodeURIComponent(lead.id)}?offers=${doors.map((d) => d.offerId).join(",")}`;
      draft.summary = `Proposal requested. It is on your list for ${formatCentralDate(due)}.`;
      break;
    }

    case "ready_to_pay": {
      if (doors.length === 0) return bad("Pick what they are paying for, up to three offers.");
      // The agency pay page takes the amount from the written scope. At the
      // proposal stage that scope is in writing, so its link can go out.
      const scopeInWriting = status === "proposal";
      const blocked = doors.find((d) => !d.payableNow && !(d.kind === "written_scope" && d.url && scopeInWriting));
      if (blocked) {
        return bad(
          blocked.kind === "written_scope"
            ? `${blocked.offerName} has no set price. It is paid on the agency pay page against a written scope, so choose Wants a proposal to put the number in writing first. Once the proposal is marked sent, Ready to pay now gives you the link.`
            : `No online payment for ${blocked.offerName} yet. Choose Wants a proposal so the number goes in writing first.`,
        );
      }
      const at = nextBusinessAt(now, 1, PAYMENT_CHECK_TIME);
      draft.sentence = `Call: ready to pay now for ${joinNames(names)}. Check the payment ${formatCentral(at)}.`;
      moveTo("proposal");
      draft.patch.last_contacted_at = nowIso;
      draft.patch.next_follow_up_at = at.toISOString();
      draft.next = at;
      draft.payDoors = doors;
      draft.payMessage = payLinkMessage({ firstName: first, senderFirstName: firstName(input.actorName), doors });
      const links = doors.length === 1 ? "link" : "links";
      draft.lines.push(`Shows the pay ${links} and a message you can send ${who} yourself.`);
      for (const d of doors) draft.lines.push(withPeriod(`${d.offerName}: ${d.howTheyPay}`));
      draft.summary = `Ready to pay. Send ${who} the ${links} below, then check the payment ${formatCentral(at)}.`;
      break;
    }

    case "call_back": {
      if (!request.callback) return bad("Pick when to call back.");
      const at = instantFor(request.callback);
      if (!at) return bad("Pick a real date and time to call back.");
      const late = windowError(at, now, "call back");
      if (late) return late;
      draft.sentence = `Call: talked, call back ${formatCentral(at)}.${talkedAbout}`;
      moveTo("contacted");
      draft.patch.last_contacted_at = nowIso;
      draft.patch.next_follow_up_at = at.toISOString();
      draft.next = at;
      draft.summary = `Call back set for ${formatCentral(at)}.`;
      break;
    }

    case "no_answer":
    case "voicemail": {
      const voicemail = request.outcome === "voicemail";
      const prior = Number.isInteger(input.priorAttempts) && input.priorAttempts > 0 ? input.priorAttempts : 0;
      const rung = prior + (voicemail ? 1 : 0);
      let at: Date;
      if (request.callback) {
        const chosen = instantFor(request.callback);
        if (!chosen) return bad("Pick a real date and time for the next try.");
        const late = windowError(chosen, now, "next try");
        if (late) return late;
        at = chosen;
      } else {
        const businessDays = rung <= 0 ? 1 : rung === 1 ? 2 : 4;
        // Try the other half of the day: a morning miss comes back in the afternoon.
        const time = centralHour(now) < 12 ? "16:00" : "10:00";
        at = nextBusinessAt(now, businessDays, time);
        // A follow-up already set for sooner (a call back Ryan promised, a
        // sit-down) stays: an early try that nobody answered must not push the
        // lead past a time he gave them. The earlier of the two wins, so the
        // lead only ever comes back sooner.
        const stored = futureInstant(lead.next_follow_up_at, now);
        if (stored && stored.getTime() < at.getTime()) {
          at = stored;
          draft.lines.push(`Keeps the follow-up already set for ${formatCentral(stored)}, because it is sooner than the next try.`);
        }
      }
      draft.sentence = voicemail
        ? `Call: left a voicemail. Try again ${formatCentral(at)}.`
        : `Call: no answer. Try again ${formatCentral(at)}.`;
      draft.patch.next_follow_up_at = at.toISOString();
      draft.next = at;
      if (rung >= 2) draft.lines.push(severalTriesLine(lead));
      draft.summary = voicemail ? `Voicemail logged. Try again ${formatCentral(at)}.` : `No answer logged. Try again ${formatCentral(at)}.`;
      break;
    }

    case "not_a_fit": {
      if (!request.lostReason) return bad("Pick why it is not a fit.");
      const reason = LOST_REASONS.find((r) => r.id === request.lostReason);
      if (!reason) return bad("Pick a reason from the list.");
      // Not line(): it runs plain(), which would empty "<10 trucks, too small" and refuse the save.
      const why = noteText(firstLine(request.note), LOST_REASON_MAX).replace(/\s+/g, " ").trim();
      if (reason.id === "other" && !why) return bad("Add a short note that says why, so the record makes sense later.");
      const lost = clip(reason.id === "other" ? `${reason.label}: ${why}` : reason.label, LOST_REASON_MAX);
      draft.sentence = `Call: not a fit (${lost.replace(/[.\s]+$/, "")}).`;
      draft.patch.status = "lost";
      draft.patch.last_contacted_at = nowIso;
      draft.patch.next_follow_up_at = null;
      draft.patch.lost_reason = lost;
      draft.lines.push(withPeriod(`Lost reason: ${lost}`));
      draft.summary = `Marked not a fit. ${first || "This lead"} is closed as lost, with no follow-up set.`;
      break;
    }

    case "proposal_sent": {
      const at = nextBusinessAt(now, 2, PROPOSAL_SENT_FOLLOW_UP_TIME);
      draft.sentence = names.length
        ? `Proposal sent for ${joinNames(names)}. Follow up ${formatCentral(at)}.`
        : `Proposal sent. Follow up ${formatCentral(at)}.`;
      moveTo("proposal");
      draft.patch.last_contacted_at = nowIso;
      draft.patch.next_follow_up_at = at.toISOString();
      draft.next = at;
      draft.completeProposalTasks = true;
      draft.summary = `Proposal marked sent. Follow up ${formatCentral(at)}.`;
      break;
    }
  }

  const offerIds = OFFER_OUTCOMES.has(request.outcome) ? doors.map((d) => d.offerId) : [];
  const markers = ` Outcome: ${request.outcome}.${offerIds.length ? ` Offer ids: ${offerIds.join(", ")}.` : ""} ${refMarker(request.idempotencyKey)}`;
  const detail = `${clip(draft.sentence, ACTIVITY_DETAIL_MAX - markers.length)}${markers}`;
  const noteBody = clip(request.note ? `${draft.sentence}\n\n${request.note}` : draft.sentence, NOTE_BODY_MAX);

  const preview: string[] = [];
  const unanswered = request.outcome === "no_answer" || request.outcome === "voicemail";
  if (draft.patch.status) preview.push(`Status moves to ${stageLabel(draft.patch.status)}.`);
  else if (unanswered) preview.push("Status and last contacted stay as they are, because you did not talk.");
  else preview.push(status ? `Status stays ${stageLabel(status)}.` : "Status stays as it is.");
  if (draft.task) preview.push(`Adds a task: ${draft.task.title}, due ${formatCentralDate(draft.task.due_date)}.`);
  if (draft.completeProposalTasks) preview.push("Marks the open proposal tasks on this lead done.");
  // Neutral about where: an admin sees the lead on the call sheet, a sales
  // user on Today. The same planner runs for both.
  if (draft.next) preview.push(`Next follow-up: ${formatCentral(draft.next)}. The lead shows as due again then.`);
  else preview.push("Clears the next follow-up.");
  preview.push(...draft.lines);
  preview.push(request.outcome === "proposal_sent" ? "Saves a note and adds it to the timeline." : "Saves a note and adds the call to the timeline.");
  preview.push(`Nothing is sent to ${who}.`);

  return {
    ok: true,
    outcome: request.outcome,
    noteBody,
    leadPatch: draft.patch,
    task: draft.task,
    completeProposalTasks: draft.completeProposalTasks,
    activity: { kind: request.outcome === "proposal_sent" ? "sales" : "call", detail },
    nextFollowUpAt: draft.next ? draft.next.toISOString() : null,
    preview,
    payDoors: draft.payDoors,
    payMessage: draft.payMessage,
    proposalHref: draft.proposalHref,
    summary: draft.summary,
  };
}

// -------------------------------------------------- reading the record --

const OUTCOME_MARKER_RE = /\bOutcome: ([a-z_]+)\./g;
const OFFER_IDS_MARKER_RE = /\bOffer ids: ([a-z0-9_]+(?:, [a-z0-9_]+)*)\./g;

/** The last match wins: the markers are appended after anything a person typed. */
function lastMatch(re: RegExp, text: string): string | null {
  let found: string | null = null;
  for (const m of text.matchAll(re)) found = m[1];
  return found;
}

/**
 * How many calls in a row went unanswered, counting back from the newest
 * activity detail until a call where they talked. Details without an
 * outcome marker (written by something other than the Call Closer) are
 * skipped, not counted.
 */
export function countPriorAttempts(activityDetailsNewestFirst: string[]): number {
  let count = 0;
  for (const detail of activityDetailsNewestFirst ?? []) {
    if (typeof detail !== "string") continue;
    const outcome = lastMatch(OUTCOME_MARKER_RE, detail);
    if (outcome === "no_answer" || outcome === "voicemail") {
      count += 1;
      continue;
    }
    if (outcome && (TALKED_OUTCOMES as readonly string[]).includes(outcome)) break;
  }
  return count;
}

/**
 * The lead_activity kinds a Call Closer save writes: "call" for every call
 * outcome, and "sales" for Proposal sent. Readers of the call history
 * (countPriorAttempts, the call card, the Sales Desk) read both kinds and keep
 * rows with isCallHistoryEntry, so a sent proposal ends a run of missed calls.
 */
export const CALL_HISTORY_KINDS = ["call", "sales"] as const;

/**
 * An ilike pattern every Call Closer entry matches (its outcome marker). Reads
 * add it so other "sales" rows never take a place in a limited window.
 */
export const CALL_HISTORY_DETAIL_PATTERN = "%Outcome: %";

/**
 * Whether a lead_activity row is part of the call history: every "call" row,
 * and the "sales" row a Proposal sent save writes. Other "sales" rows (a stage,
 * owner, or priority change on the Sales Desk) are not calls and are left out.
 */
export function isCallHistoryEntry(kind: unknown, detail: unknown): boolean {
  if (kind === "call") return true;
  return kind === "sales" && typeof detail === "string" && lastMatch(OUTCOME_MARKER_RE, detail) === "proposal_sent";
}

/** The outcome a saved call recorded, read back from its activity detail, or null. */
export function outcomeFromDetail(detail: string): CallOutcome | null {
  if (typeof detail !== "string") return null;
  const found = lastMatch(OUTCOME_MARKER_RE, detail);
  return isCallOutcome(found) ? found : null;
}

/** The offers a saved call named, read back from its activity detail. */
export function offerIdsFromDetail(detail: string): CloserOfferId[] {
  if (typeof detail !== "string") return [];
  const list = lastMatch(OFFER_IDS_MARKER_RE, detail);
  if (!list) return [];
  const out: CloserOfferId[] = [];
  for (const id of list.split(", ")) if (isCloserOfferId(id) && !out.includes(id)) out.push(id);
  return out;
}

// --------------------------------------------------------- suggestions --

const MAX_SUGGESTIONS = 4;

/** What to have ready for a consultation or agency lead that named no service. */
const CONSULTATION_SUGGESTIONS: readonly CloserOfferId[] = ["system_map", "website_launch", "lead_followup_campaign", "free_website_program"];

/** What usually goes with the offer the lead came in for. */
const COMPANIONS: Partial<Record<string, readonly CloserOfferId[]>> = {
  free_website_program: ["free_build_followup", "free_build_content", "free_build_launch"],
  website_launch: ["lead_followup_campaign", "system_map"],
  system_map: ["website_launch", "lead_followup_campaign"],
  lead_engine: ["system_map"],
  training_platform: ["system_map"],
  company_os: ["system_map"],
  custom_platform: ["system_map"],
};

/**
 * Up to four offers to have ready on the call. An agency lead gets the
 * services it asked for (diagnostic.services); with none, the consultation
 * set. Everyone else gets the offer their interest (or the guided intake's
 * recommendation) maps to, the same way the proposal generator reads it,
 * followed by what usually goes with it.
 */
export function closerOffersFor(interest: string | null, diagnostic: Record<string, unknown> | null): CloserOfferId[] {
  const d = isRecord(diagnostic) ? diagnostic : {};
  const out: CloserOfferId[] = [];
  const add = (id: unknown) => {
    if (out.length < MAX_SUGGESTIONS && isCloserOfferId(id) && !out.includes(id) && payDoorFor(id)) out.push(id);
  };

  if (interest === "done_for_you" || d.source === "agency_intake") {
    const services = Array.isArray(d.services) ? d.services : [];
    for (const slug of services) if (typeof slug === "string") add(agencyService(slug)?.offerId);
    if (out.length === 0) CONSULTATION_SUGGESTIONS.forEach(add);
    return out;
  }

  const rec = isRecord(d.recommendation) ? d.recommendation : {};
  const pkg = typeof rec.package === "string" && rec.package.trim() ? rec.package.trim() : null;
  const primary = offerIdForInterest(pkg ?? interest) ?? "system_map";
  add(primary);
  (COMPANIONS[primary] ?? ["system_map"]).forEach(add);
  return out;
}

// ---------------------------------------------------------- their words --

/**
 * The homepage consultation form writes its choices into the top of goals
 * (components/site/ConsultationForm.tsx):
 *   "Free 30-minute consultation. Meet: <label>. Reach me by: <label>."
 * then a blank line, then what the person typed.
 */
const CONSULTATION_PREFIX_RE = new RegExp(
  `^Free ${CONSULTATION.minutes}-minute consultation\\. Meet: ([^\\n]*?)\\. Reach me by: ([^\\n]*?)\\.[ \\t]*(?:\\r?\\n|$)`,
);

/**
 * What the lead wrote, with the consultation form's prefix taken off and
 * its two choices returned separately, so the call card can show "In their
 * words" without the form's own sentence in front.
 */
export function theirWords(goals: string | null): { words: string | null; meet: string | null; reachBy: string | null } {
  if (typeof goals !== "string") return { words: null, meet: null, reachBy: null };
  const text = goals.replace(/^\uFEFF/, "");
  const m = text.match(CONSULTATION_PREFIX_RE);
  if (!m) return { words: text.trim() || null, meet: null, reachBy: null };
  const rest = text.slice(m[0].length).trim();
  return { words: rest || null, meet: m[1].trim() || null, reachBy: m[2].trim() || null };
}

/** The name app/api/meta-leads/route.ts stores when a lead form arrives without one. */
const PLACEHOLDER_NAMES = new Set(["facebook lead"]);

/**
 * "Dana" from "Dana Sample". An all-lowercase or all-caps name is
 * capitalized. Empty when there is no usable name: blank, the Meta
 * placeholder "Facebook lead", or something that is not a name (an email
 * address, digits), so no draft ever opens with "Hi Facebook".
 */
export function firstName(fullName: string): string {
  const full = line(typeof fullName === "string" ? fullName : "", 200);
  if (PLACEHOLDER_NAMES.has(full.toLowerCase())) return "";
  const word = (full.split(" ")[0] ?? "").replace(/[.,;:]+$/, "");
  if (!word || /[@\d]/.test(word)) return "";
  if (word === word.toLowerCase() || word === word.toUpperCase()) {
    return word.charAt(0).toUpperCase() + word.slice(1).toLowerCase();
  }
  return word;
}
