// The daily call sheet: who Ryan should call today, in order, and why.
//
// Ground truth on 2026-09-20: the site was producing leads (47 Meta lead-ad
// leads in thirty days) and the automation answered nearly all of them by
// email, but 45 of the last 56 leads were still marked "new" with no note,
// no call, and no text from a person. Nothing on the site turns a lead into a
// customer; a conversation does. This module ranks the leads that have not
// had one yet, as a pure function over rows the page and the cron read.
//
// A "touch" is a human action on the record: a note, a call in either
// direction, or an outbound text or email logged on the thread. The
// automation's own welcome email and text-back are deliberately not touches:
// an owner who reads "answered" when the software replied would stop calling.
// An inbound message from the lead is not a touch either; it is the opposite,
// a reply owed, and it goes to the top. Three more rules keep the count
// honest (touchesFromRows): a text the provider rejected never reached
// anyone, so it is not a touch; a call the Quo layer scoped out of the
// company (personal, noise) is not about this lead; and a reply Ryan logged
// by hand ("Log their reply", channel "note") proves a person was in the
// conversation, so it counts as a note, not as a reply still owed.
//
// The Call Closer adds the promise. When Ryan logs "call back Monday at 10",
// the lead's next_follow_up_at holds that instant. Until then the lead stays
// off the sheet; once it passes, the lead comes back under "You said you
// would call", earliest promise first, with the last note beside it so he
// dials knowing what was said. A lead nobody has touched ignores the field
// completely: /api/business-diagnostic stamps it with the submission time on
// brand-new leads, and a person still has to make the first call.
//
// Nothing here writes to the database or contacts anyone.

import { formatCentral } from "@/lib/businessTime";
import { INTEREST_LABELS, isAutomatedLeadText } from "@/lib/leadNotify";
import { INBOUND_AUTO_REPLY } from "@/lib/quo";

export type CallSheetLead = {
  id: string;
  created_at: string;
  full_name: string;
  business_name: string | null;
  email: string | null;
  phone: string | null;
  interest: string;
  status: string;
  source: string | null;
  utm_source: string | null;
  best_contact_method: string | null;
  sms_consent: boolean | null;
  /** Set by a STOP reply (public.apply_sms_opt_out). Consent alone is not enough to text. */
  sms_unsubscribed_at: string | null;
  is_test: boolean | null;
  /**
   * When a person promised to come back to this lead (the Call Closer writes
   * it). Only honoured once a person has touched the lead: the diagnostic
   * route sets it to the submission time on brand-new leads.
   */
  next_follow_up_at: string | null;
};

export type CallSheetTouch = {
  lead_id: string;
  at: string;
  /** note, call, message_out: a person acted. message_in, call_in: the lead reached out and is owed a reply. */
  kind: "note" | "call" | "message_out" | "message_in" | "call_in";
  /** Note touches only: the first line of the note, markers removed, at most NOTE_SUMMARY_MAX characters. */
  summary?: string | null;
};

/** Texting is allowed only with recorded consent and no STOP since. Same rule as the CRM send route. */
export function canText(lead: Pick<CallSheetLead, "phone" | "sms_consent" | "sms_unsubscribed_at">): boolean {
  return Boolean(lead.phone) && Boolean(lead.sms_consent) && !lead.sms_unsubscribed_at;
}

/**
 * The Quo webhook writes every text on the line into lead_messages, the
 * application's own included, under Ryan's name. Only a text a person typed
 * counts as a touch: the inbound auto-reply (lib/quo.ts) and the two
 * text-backs (lib/leadNotify.ts) are software.
 */
export function isHumanOutboundText(body: string): boolean {
  return body !== INBOUND_AUTO_REPLY && !isAutomatedLeadText(body);
}

/**
 * A call somebody had is a touch. A call the lead placed that nobody picked
 * up (missed, voicemail, no answer) is the opposite: a reply owed, so it
 * ranks with an inbound message.
 */
export function classifyCall(direction: string | null, outcome: string | null): CallSheetTouch["kind"] {
  if (direction === "incoming" && ["missed", "voicemail", "no_answer"].includes(outcome ?? "")) return "call_in";
  return "call";
}

/** Longest note summary carried on a touch and printed after "Last:". */
export const NOTE_SUMMARY_MAX = 140;

// The markers the Call Closer appends to lead_activity details so a retry and
// the attempt counter can find them: " Outcome: x. Offer ids: a, b. Ref key".
// They are bookkeeping, never something to read out loud, so a summary drops
// them. They are only ever appended at the end, so only a trailing run is
// removed and a note that happens to say "Outcome: great." mid-line keeps it.
const ACTIVITY_MARKER_TAIL =
  /(?:\s*\bOutcome: [a-z_]+\.)?(?:\s*\bOffer ids: [a-z0-9_]+(?:, [a-z0-9_]+)*\.)?(?:\s*\bRef [A-Za-z0-9-]{20,80})?\s*$/;

function clip(text: string, max: number): string {
  return text.length > max ? `${text.slice(0, max - 3).trimEnd()}...` : text;
}

/**
 * One line that says what the note was about: its first non-empty line, with
 * activity markers removed and whitespace collapsed, clipped to
 * NOTE_SUMMARY_MAX. Null when nothing readable is left.
 */
export function noteSummary(body: string | null | undefined): string | null {
  if (typeof body !== "string") return null;
  const first = body
    .split(/\r?\n/)
    .map((line) => line.trim())
    .find((line) => line.length > 0);
  if (!first) return null;
  const text = first.replace(ACTIVITY_MARKER_TAIL, "").replace(/\s+/g, " ").trim();
  return text ? clip(text, NOTE_SUMMARY_MAX) : null;
}

export type CallSheetNoteRow = { lead_id: string; created_at: string; body?: string | null };
export type CallSheetCallRow = {
  lead_id: string | null;
  started_at: string | null;
  direction: string | null;
  outcome: string | null;
  /** lead_calls.scope_status. Anything other than "company" is not a call about this lead. */
  scope_status?: string | null;
};
export type CallSheetMessageRow = {
  lead_id: string;
  direction: string;
  /** sms, email, or note (a reply logged by hand from the thread). */
  channel?: string | null;
  body: string;
  created_at: string;
  /** False when the provider rejected the send. Missing means the column was not read, so it is not held against the row. */
  delivered?: boolean | null;
};

/**
 * Turn the three history tables into touches. This is the loader's mapping,
 * kept pure so the rules are tested rather than trusted:
 * - every note is a touch, carrying its summary;
 * - a call is a touch (or a reply owed, see classifyCall) unless the Quo
 *   layer scoped it out of the company;
 * - an inbound message is a reply owed, except one logged by hand
 *   (channel "note"), which is a person's note about the conversation;
 * - an outbound message is a touch only when a person wrote it and the
 *   provider did not reject it.
 */
export function touchesFromRows(rows: {
  notes: CallSheetNoteRow[];
  calls: CallSheetCallRow[];
  messages: CallSheetMessageRow[];
}): CallSheetTouch[] {
  const touches: CallSheetTouch[] = [];
  for (const n of rows.notes) {
    if (!n.lead_id || !n.created_at) continue;
    touches.push({ lead_id: n.lead_id, at: n.created_at, kind: "note", summary: noteSummary(n.body) });
  }
  for (const c of rows.calls) {
    if (!c.lead_id || !c.started_at) continue;
    if (c.scope_status && c.scope_status !== "company") continue;
    touches.push({ lead_id: c.lead_id, at: c.started_at, kind: classifyCall(c.direction, c.outcome) });
  }
  for (const m of rows.messages) {
    if (!m.lead_id || !m.created_at) continue;
    if (m.direction === "in") {
      if (m.channel === "note") {
        const said = noteSummary(m.body);
        touches.push({ lead_id: m.lead_id, at: m.created_at, kind: "note", summary: said ? clip(`They said: ${said}`, NOTE_SUMMARY_MAX) : null });
      } else {
        touches.push({ lead_id: m.lead_id, at: m.created_at, kind: "message_in" });
      }
    } else if (m.delivered !== false && isHumanOutboundText(m.body)) {
      touches.push({ lead_id: m.lead_id, at: m.created_at, kind: "message_out" });
    }
  }
  return touches;
}

export type CallSheetTier = "reply" | "callback" | "answer" | "waiting" | "follow_up";

export type CallSheetRow = {
  lead: CallSheetLead;
  tier: CallSheetTier;
  /** One plain sentence: why this row is here and where it sits. */
  reason: string;
  sourceLabel: string;
  interestLabel: string;
  ageHours: number;
  lastTouchAt: string | null;
  /** Consent recorded and no STOP since. The page shows a text button only when true. */
  canText: boolean;
  /** Callback tier only: the promised instant (ISO) that has now passed. Null on every other tier. */
  callbackAt: string | null;
  /** The call card for this lead. */
  href: string;
};

export type CallSheet = {
  generatedAt: string;
  rows: CallSheetRow[];
  counts: Record<CallSheetTier, number>;
  /** Leads read but left off, with the reason, so an empty sheet is explainable. */
  excluded: { id: string; reason: string }[];
};

export const TIER_LABELS: Record<CallSheetTier, { title: string; lead: string }> = {
  reply: { title: "They reached out", lead: "A message or a missed call from the lead is the last thing on the thread. Answer these first." },
  callback: {
    title: "You said you would call",
    lead: "You logged a call and set a time to come back to these people. That time has come. Earliest promise first.",
  },
  answer: { title: "Answer now", lead: "New in the last three days and nobody has called, texted, or written a note. The software replied; a person has not." },
  waiting: { title: "Still waiting", lead: "Older than three days and still untouched by a person. Newest first, because they are the most likely to pick up." },
  follow_up: { title: "Follow up", lead: "You touched these once, then nothing for five days or more, and the lead is still open." },
};

/** Statuses that mean the conversation is over, one way or the other. */
export const CLOSED_STATUSES = ["won", "lost"] as const;

/** Hours a new lead can sit before "answer now" becomes "still waiting". */
export const ANSWER_WINDOW_HOURS = 72;
/** Days since the last human touch before an open lead comes back as a follow-up. */
export const FOLLOW_UP_AFTER_DAYS = 5;
/** Rows the email carries; the page shows everything. */
export const EMAIL_ROW_LIMIT = 25;

/** Display order, top of the sheet first. */
export const TIER_ORDER: readonly CallSheetTier[] = ["reply", "callback", "answer", "waiting", "follow_up"];

const SOURCE_LABELS: Record<string, string> = {
  meta_lead_ad: "Meta lead ad",
  "facebook-lead-ad": "Meta lead ad",
  facebook_lead_ad: "Meta lead ad",
  website: "Website form",
  quo_inbound: "Texted or called in",
  quo_call: "Called in",
  plugin: "Plugin",
  manual: "Added by hand",
};

export function sourceLabel(lead: Pick<CallSheetLead, "source" | "utm_source">): string {
  const source = (lead.source ?? "").trim();
  if (source && SOURCE_LABELS[source]) return SOURCE_LABELS[source];
  const utm = (lead.utm_source ?? "").trim().toLowerCase();
  if (["facebook", "fb", "meta", "instagram", "ig"].includes(utm)) return "Meta";
  if (utm === "google") return "Google";
  if (source) return source.replace(/[_-]+/g, " ");
  return utm ? `via ${utm}` : "Website";
}

export function interestLabel(interest: string): string {
  return INTEREST_LABELS[interest] ?? interest.replace(/[_-]+/g, " ");
}

function hoursBetween(later: Date, earlier: Date): number {
  return Math.max(0, (later.getTime() - earlier.getTime()) / 3_600_000);
}

export function ageLabel(hours: number): string {
  if (hours < 1) return "under an hour ago";
  if (hours < 48) return `${Math.round(hours)} hour${Math.round(hours) === 1 ? "" : "s"} ago`;
  const days = Math.round(hours / 24);
  return `${days} day${days === 1 ? "" : "s"} ago`;
}

function displayName(lead: CallSheetLead): string {
  return String(lead.full_name || "").trim() || "Unnamed lead";
}

/** The promised call back instant, or null when the field is empty or unreadable. */
function callbackDue(lead: CallSheetLead): Date | null {
  if (!lead.next_follow_up_at) return null;
  const due = new Date(lead.next_follow_up_at);
  return Number.isNaN(due.getTime()) ? null : due;
}

/**
 * Build the sheet. Touches may be in any order; only the latest per lead per
 * direction matters. `now` is injected so the ranking is testable and so the
 * page and the cron agree on the same instant.
 *
 * The rules, in order, for an open, reachable, non-test lead:
 * 1. The lead reached out after the last human touch: "reply".
 * 2. No human touch at all: "answer" or "waiting" by age. next_follow_up_at
 *    is ignored here on purpose (see the header).
 * 3. A call back was promised and has passed, and nobody has touched the lead
 *    since it came due: "callback".
 * 4. A call back is promised for later: off the sheet until then.
 * 5. Otherwise five days of silence since the last touch: "follow_up".
 */
export function buildCallSheet(leads: CallSheetLead[], touches: CallSheetTouch[], now: Date): CallSheet {
  const lastHuman = new Map<string, Date>();
  const lastInbound = new Map<string, { at: Date; kind: "message_in" | "call_in" }>();
  const lastNote = new Map<string, { at: Date; summary: string }>();
  for (const t of touches) {
    const at = new Date(t.at);
    if (Number.isNaN(at.getTime())) continue;
    if (t.kind === "message_in" || t.kind === "call_in") {
      const prev = lastInbound.get(t.lead_id);
      if (!prev || at > prev.at) lastInbound.set(t.lead_id, { at, kind: t.kind });
    } else {
      const prev = lastHuman.get(t.lead_id);
      if (!prev || at > prev) lastHuman.set(t.lead_id, at);
      if (t.kind === "note" && t.summary) {
        const prevNote = lastNote.get(t.lead_id);
        if (!prevNote || at > prevNote.at) lastNote.set(t.lead_id, { at, summary: t.summary });
      }
    }
  }

  const rows: CallSheetRow[] = [];
  const excluded: CallSheet["excluded"] = [];

  for (const lead of leads) {
    if (lead.is_test) {
      excluded.push({ id: lead.id, reason: "test record" });
      continue;
    }
    if ((CLOSED_STATUSES as readonly string[]).includes(lead.status)) {
      excluded.push({ id: lead.id, reason: `status ${lead.status}` });
      continue;
    }
    if (!lead.phone && !lead.email) {
      excluded.push({ id: lead.id, reason: "no phone and no email" });
      continue;
    }
    const created = new Date(lead.created_at);
    if (Number.isNaN(created.getTime())) {
      excluded.push({ id: lead.id, reason: "bad created_at" });
      continue;
    }

    const human = lastHuman.get(lead.id) ?? null;
    const inbound = lastInbound.get(lead.id) ?? null;
    const ageHours = hoursBetween(now, created);
    const base = {
      lead,
      sourceLabel: sourceLabel(lead),
      interestLabel: interestLabel(lead.interest),
      ageHours,
      lastTouchAt: human ? human.toISOString() : null,
      canText: canText(lead),
      callbackAt: null,
      href: `/admin/call-sheet/${lead.id}`,
    };
    const who = `${displayName(lead)}${lead.business_name ? ` at ${lead.business_name}` : ""}`;

    if (inbound && (!human || inbound.at > human)) {
      const what = inbound.kind === "call_in" ? "called and nobody picked up" : "sent a message";
      rows.push({
        ...base,
        tier: "reply",
        reason: `${who} ${what} ${ageLabel(hoursBetween(now, inbound.at))} and nothing has gone back since.`,
      });
      continue;
    }
    if (!human) {
      const tier: CallSheetTier = ageHours <= ANSWER_WINDOW_HOURS ? "answer" : "waiting";
      rows.push({
        ...base,
        tier,
        reason: `${who} came in ${ageLabel(ageHours)} from ${base.sourceLabel} asking about ${base.interestLabel}. No call, text, or note from a person yet.`,
      });
      continue;
    }
    const due = callbackDue(lead);
    if (due && due.getTime() > now.getTime()) {
      excluded.push({ id: lead.id, reason: `call back set for ${formatCentral(due)}` });
      continue;
    }
    if (due && human < due) {
      const note = lastNote.get(lead.id);
      rows.push({
        ...base,
        tier: "callback",
        callbackAt: due.toISOString(),
        reason: `You set a call back with ${who} for ${formatCentral(due)}.${note ? ` Last: ${note.summary}` : ""}`,
      });
      continue;
    }
    // Due, but somebody touched the lead after it came due: the promise was
    // kept, so the ordinary five-day rule decides.
    const sinceTouch = hoursBetween(now, human);
    if (sinceTouch >= FOLLOW_UP_AFTER_DAYS * 24) {
      rows.push({
        ...base,
        tier: "follow_up",
        reason: `${who} was last touched ${ageLabel(sinceTouch)} and is still ${lead.status.replace(/_/g, " ")}.`,
      });
      continue;
    }
    excluded.push({ id: lead.id, reason: `touched ${ageLabel(sinceTouch)}` });
  }

  rows.sort((a, b) => {
    const tier = TIER_ORDER.indexOf(a.tier) - TIER_ORDER.indexOf(b.tier);
    if (tier !== 0) return tier;
    if (a.tier === "follow_up") {
      // Longest since a touch first.
      return (a.lastTouchAt ?? "").localeCompare(b.lastTouchAt ?? "");
    }
    if (a.tier === "callback") {
      // The oldest promise first: that person has waited longest past the time they were given.
      const due = (a.callbackAt ?? "").localeCompare(b.callbackAt ?? "");
      if (due !== 0) return due;
    }
    // Newest first: they are most likely to remember filling in the form.
    return b.lead.created_at.localeCompare(a.lead.created_at);
  });

  const counts: Record<CallSheetTier, number> = { reply: 0, callback: 0, answer: 0, waiting: 0, follow_up: 0 };
  for (const r of rows) counts[r.tier] += 1;

  return { generatedAt: now.toISOString(), rows, counts, excluded };
}

/** Group rows by tier in display order, omitting empty tiers. */
export function tiers(sheet: CallSheet): { tier: CallSheetTier; rows: CallSheetRow[] }[] {
  return TIER_ORDER.map((tier) => ({ tier, rows: sheet.rows.filter((r) => r.tier === tier) })).filter((g) => g.rows.length > 0);
}

/**
 * The internal email. Goes only to the owner inbox, never to a lead, and only
 * when the sheet has rows. Names and numbers are the owner's own records,
 * the same ones the owner alert already carries.
 */
export function callSheetEmail(sheet: CallSheet, siteUrl: string): { subject: string; text: string } | null {
  if (sheet.rows.length === 0) return null;
  const parts: string[] = [];
  if (sheet.counts.reply) parts.push(`${sheet.counts.reply} to reply to`);
  if (sheet.counts.callback) parts.push(`${sheet.counts.callback} call back${sheet.counts.callback === 1 ? "" : "s"} due`);
  if (sheet.counts.answer) parts.push(`${sheet.counts.answer} to answer now`);
  if (sheet.counts.waiting) parts.push(`${sheet.counts.waiting} still waiting`);
  if (sheet.counts.follow_up) parts.push(`${sheet.counts.follow_up} to follow up`);
  const subject = `Call sheet: ${parts.join(", ")}`;

  const lines: string[] = [
    "THE LEADFLOW PRO. TODAY'S CALL SHEET",
    "Straight from your own database. Everyone below is waiting on a person: a reply, a call back you promised, or a first call. The software's own replies do not count.",
    "",
  ];
  let printed = 0;
  for (const group of tiers(sheet)) {
    // No empty tier headings once the row cap is reached.
    if (printed >= EMAIL_ROW_LIMIT) break;
    lines.push(TIER_LABELS[group.tier].title.toUpperCase());
    for (const row of group.rows) {
      if (printed >= EMAIL_ROW_LIMIT) break;
      printed += 1;
      const contact = [row.lead.phone, row.lead.email].filter(Boolean).join(" | ");
      const texting = row.canText ? "texts OK" : row.lead.sms_unsubscribed_at ? "replied STOP, call only" : "no text consent, call or email";
      lines.push(`  ${printed}. ${displayName(row.lead)}${row.lead.business_name ? ` (${row.lead.business_name})` : ""}`);
      lines.push(`     ${contact} (${texting})`);
      lines.push(`     ${row.reason}`);
      lines.push(`     ${siteUrl}${row.href}`);
    }
    lines.push("");
  }
  if (sheet.rows.length > printed) lines.push(`...and ${sheet.rows.length - printed} more on the page.`, "");
  lines.push(`The full sheet, with one-tap call and text: ${siteUrl}/admin/call-sheet`);
  lines.push("");
  lines.push("Texts go only to people who ticked the consent box and have not replied STOP; each row says which. This email is for you and is not sent to anyone on it.");
  return { subject, text: lines.join("\n") };
}

/** The cron sends nothing unless this is exactly "true". Default off. */
export function callSheetEmailEnabled(env: Record<string, string | undefined>): boolean {
  return env.CALL_SHEET_EMAIL_ENABLED === "true";
}

/** Owner inboxes only: LEADFLOW_NOTIFY_EMAIL, at most five, else the fallback. */
export function callSheetRecipients(env: Record<string, string | undefined>, fallback: string): string[] {
  const configured = (env.LEADFLOW_NOTIFY_EMAIL ?? "").trim();
  const list = configured
    ? configured
        .split(/[;,]/)
        .map((v) => v.trim())
        .filter(Boolean)
        .slice(0, 5)
    : [];
  return list.length ? list : [fallback];
}
