// The server half of the Client 360 (lib/client360.ts): the parts that use
// the call sheet's rules and the business line's phone format, worked out on
// the server and handed to the lead workspace as plain values. Same reason as
// the call card: the browser never loads the Quo or call sheet code.
//
// - followUpForStory: the next follow-up by the call sheet's own rules
//   (callbackState over the last human touch), and whether they reached out
//   since a person last did, so the lead record and the call card agree.
// - reachForStory: the Call, Text, and Email buttons, with the same consent
//   and address rules as the call card. Text only with recorded consent and
//   no STOP since; email only for a real address. Links open the phone's own
//   apps. Nothing here sends anything.
//
// Server only: it imports lib/callSheet.ts and lib/quo.ts. Nothing here reads,
// writes, sends, or fetches; callers load the rows after authorizing the user.

import { callbackState, canText, isHumanTouch, latestInbound, touchesFromRows, type CallSheetCallRow, type CallSheetMessageRow } from "@/lib/callSheet";
import { isCallHistoryEntry } from "@/lib/callCloser";
import { emailGap, textGap } from "@/lib/contactGaps";
import { formatPhone } from "@/lib/hq/phone";
import { hasLeadEmailAddress } from "@/lib/leadMessageAuthor";
import { toE164 } from "@/lib/quo";
import type { StoryFollowUp, StoryReachSet } from "@/lib/client360";
import type { LeadActivityRecord, LeadCallRecord, LeadMessageRecord, LeadNoteRecord } from "@/lib/leadTimeline";

/** A history table as loaded: its rows, or null when the read failed. */
type Loaded<T> = T[] | null;

function validDate(iso: string | null | undefined): Date | null {
  if (!iso) return null;
  const at = new Date(iso);
  return Number.isNaN(at.getTime()) ? null : at;
}

/** The newest valid instant among these, as ISO, or null. */
function latest(values: (string | null | undefined)[]): string | null {
  let best: Date | null = null;
  for (const v of values) {
    const at = validDate(v);
    if (at && (!best || at > best)) best = at;
  }
  return best ? best.toISOString() : null;
}

/**
 * The follow-up the lead record shows, by the call card's rules:
 * - the last human touch is the newest note, business call, text or email a
 *   person sent that was not rejected, reply logged by hand, or Call Closer
 *   entry (touchesFromRows plus the Call Closer's entries);
 * - a lead with no note, no Call Closer entry, no human touch, and no
 *   last_contacted_at is the first call, whatever time is stamped on it (the
 *   call sheet ignores that time until a person has acted, and the call card
 *   says "This is the first call"); with history missing that cannot be told;
 * - otherwise callbackState decides whether the stored time is owed now,
 *   later, or not at all;
 * - they reached out when their newest message or unanswered call is newer
 *   than that touch.
 * When a history table failed to load, partial is true and the screen says a
 * past time cannot be judged instead of guessing.
 */
export function followUpForStory(input: {
  leadId: string;
  nextFollowUpAt: string | null;
  /** leads.last_contacted_at. An inbound text and the automatic text-back move it, so it counts only toward "not the first call". */
  lastContactedAt: string | null;
  notes: Loaded<LeadNoteRecord>;
  calls: Loaded<LeadCallRecord>;
  messages: Loaded<LeadMessageRecord>;
  activity: Loaded<LeadActivityRecord>;
  now: Date;
}): StoryFollowUp {
  const { leadId } = input;
  const notes = (input.notes ?? []).filter((n) => n.lead_id === leadId);
  const calls: CallSheetCallRow[] = (input.calls ?? [])
    .filter((c) => c.lead_id === leadId)
    .map((c) => ({ lead_id: c.lead_id, started_at: c.started_at, direction: c.direction, outcome: c.outcome, scope_status: c.scope_status }));
  const messages: CallSheetMessageRow[] = (input.messages ?? [])
    .filter((m) => m.lead_id === leadId)
    .map((m) => ({ lead_id: m.lead_id, direction: m.direction, channel: m.channel, body: m.body, created_at: m.created_at, delivered: m.delivered }));
  const callSaves = (input.activity ?? []).filter(
    (a) => a.lead_id === leadId && isCallHistoryEntry(a.kind, a.detail) && typeof a.detail === "string" && /\bOutcome: [a-z_]+\./.test(a.detail),
  );

  const touches = touchesFromRows({
    notes: notes.map((n) => ({ lead_id: n.lead_id, created_at: n.created_at, body: n.body })),
    calls,
    messages,
  });
  const lastHumanTouchAt = latest([...touches.filter(isHumanTouch).map((t) => t.at), ...callSaves.map((a) => a.created_at)]);
  const partial = [input.notes, input.calls, input.messages, input.activity].some((rows) => rows === null);
  const promise = callbackState(input.nextFollowUpAt, lastHumanTouchAt, input.now);
  const inbound = latestInbound({ calls, messages });
  const lastTouchMs = lastHumanTouchAt ? Date.parse(lastHumanTouchAt) : Number.NEGATIVE_INFINITY;
  const reachedOut = inbound && Date.parse(inbound.at) > lastTouchMs ? inbound : null;
  // The call card's first-call test: a full history with nothing a person did and no contact stamp.
  const noted = notes.some((n) => typeof n.body === "string" && n.body.trim());
  const touched = noted || callSaves.length > 0 || Boolean(lastHumanTouchAt) || Boolean(input.lastContactedAt);
  const firstCall = !touched && !partial;
  return {
    state: firstCall ? "first_call" : promise.state,
    at: promise.at ? promise.at.toISOString() : null,
    partial,
    reachedOut,
  };
}

/** The call card's three buttons, by the same rules. */
export function reachForStory(lead: {
  phone: string | null;
  email: string | null;
  sms_consent: boolean | null;
  sms_unsubscribed_at: string | null;
}): StoryReachSet {
  const e164 = lead.phone ? toE164(lead.phone) : null;
  const textable = Boolean(e164) && canText(lead);
  const noText = textGap(lead);
  const noEmail = emailGap(lead.email);
  return {
    call: e164 ? { label: `Call ${formatPhone(e164)}`, href: `tel:${e164}` } : { label: "No phone on file", href: null },
    // No phone: the Call button already says so, and the call card shows no second chip for it.
    text: !e164 ? null : textable ? { label: "Text (consented)", href: `sms:${e164}` } : { label: noText?.label ?? "No text consent", href: null },
    email: hasLeadEmailAddress(lead.email) && !noEmail ? { label: "Email", href: `mailto:${lead.email}` } : { label: noEmail?.label ?? "No email on file", href: null },
  };
}
