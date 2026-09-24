import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { formatCentral } from "@/lib/businessTime";
import {
  CALL_HISTORY_DETAIL_PATTERN,
  CALL_HISTORY_KINDS,
  OUTCOME_LABELS,
  PANEL_OUTCOMES,
  closerOffersFor,
  countPriorAttempts,
  firstName,
  isCallHistoryEntry,
  meetingPlaceForLabel,
  offerIdsFromDetail,
  outcomeFromDetail,
  theirWords,
  type CallOutcome,
  type PlannerLead,
} from "@/lib/callCloser";
import { SAMPLE_ACTOR_NAME, SAMPLE_CALL_ACTIVITY, SAMPLE_CALL_LEAD, SAMPLE_NOTES, SAMPLE_NOW } from "@/lib/callCloserFixtures";
import { leftAfterThis, nextHref, parseLeft, parseSkip } from "@/lib/callQueue";
import {
  ageLabel,
  callbackState,
  canText,
  interestLabel,
  isHumanTouch,
  noteSummary,
  sourceLabel,
  touchesFromRows,
  type LatestInbound,
} from "@/lib/callSheet";
import { loadLeadTouches } from "@/lib/callSheetServer";
import { emailGap, textGap } from "@/lib/contactGaps";
import { formatPhone } from "@/lib/hq/phone";
import { hasLeadEmailAddress, leadMessageAuthor } from "@/lib/leadMessageAuthor";
import { safeLeadDiagnostic } from "@/lib/leadTimeline";
import { closerOffers, payDoorFor, type CloserOfferId, type PayDoor } from "@/lib/payDoors";
import { toE164 } from "@/lib/quo";
import CallCardPanel from "./CallCardPanel";

// The call card: one lead, everything Ryan needs on the phone, and the two
// taps that record how the call went.
//
// Top to bottom it follows the call, ordered for a phone so "How did the call
// go?" is close to the top. Who they are and whether a call back is due. What
// they sent, when they texted or called since a person last reached them (the
// call sheet lists them under "They reached out" and links here). The buttons
// to reach them (a text only with consent and no STOP, an email only for a
// real address), each missing one with the reason. What they wrote, in their
// own words. What was said last time. Then "How did the call go?", which saves
// the outcome and sets when the lead comes back to the call sheet. Last, what
// he can offer, as a compact reference: name, price, and how they pay, one
// row each, with the terms a tap away.
//
// Read-only until Save: this page reads the lead, its last three notes, its
// last twenty call entries, and its recent Quo calls and texts through the
// call sheet's loader (so "Call back due now" follows the same touches the
// call sheet counts), and the panel posts to the one save route.
// Authorization sits next to the read, not only in the layout, and runs before
// anything about the lead is read. /admin/call-sheet/sample shows a fictional
// lead from lib/callCloserFixtures.ts and reads no lead data at all. Phone and
// text links are built here on the server, so the browser panel never loads
// the Quo or call sheet code.
//
// "Start calling" opens this card in queue mode (?queue=1&left=N&skip=...,
// built by lib/callQueue.ts). A slim bar at the top says how many are left and
// offers "Skip for now". Every real card, in a run or not, hands the panel the
// way to the next person (/admin/call-sheet/next with this lead added to the
// skip list), so "Next call" shows after any save and a run never comes back
// to the same person. The sample passes none of it.
//
// Back after a save must not invite logging the same call twice. When the
// newest call a Call Closer save logged is under RECENT_SAVE_MINUTES old, a
// plain line above the panel says so ("A call with Riley was logged 4 minutes
// ago: No answer. Only log again if you called again."). It does not say who
// logged it: a sales user saves through the same route, and the activity row
// records no actor. The panel reloads this page after a save and when the
// browser restores it from its back-forward cache, so the line and the header
// catch up there too. In a run, the same line turns the bar from "Skip for
// now" into "Next call", counting the people after this one like the panel.
//
// The header names a follow-up time without claiming who set it ("Next
// follow-up: ..."), because the planner sets most of them itself: the next try
// after no answer, a proposal due date, a payment check. It says "You set it"
// only for a call back that came due after Ryan picked the time himself
// (ownerSetFollowUp).

export const dynamic = "force-dynamic";
export const metadata = { title: "Call card | The LeadFlow Pro" };

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const LEAD_COLUMNS =
  "id, created_at, full_name, business_name, email, phone, status, interest, source, utm_source, best_contact_method, goals, sms_consent, sms_unsubscribed_at, next_follow_up_at, last_contacted_at, is_test, diagnostic";
const NOTES_SHOWN = 3;
const CALL_ENTRIES_READ = 20;
/** A call saved this recently gets the "A call with Riley was logged" line above the panel. */
const RECENT_SAVE_MINUTES = 30;

const FOCUS = "focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--blue)]";
const BUTTON = `inline-flex min-h-[44px] items-center rounded-lg px-4 py-2 text-sm font-bold ${FOCUS}`;
const QUIET_LINK = `inline-flex min-h-[44px] items-center px-1 text-sm font-semibold text-[var(--blue)] underline-offset-2 hover:underline ${FOCUS}`;
const SECTION_TITLE = "text-base font-black text-[var(--heading)]";

type CardNote = { summary: string; at: string; atIso: string; author: string };

/** A call the Call Closer saved: its outcome, read back from the activity detail, and when (ISO). */
type CallSave = { outcome: CallOutcome; at: string };

/** Where this card sits in a "Start calling" run, and the way on. */
type CardQueue = {
  /** Opened from /admin/call-sheet/next: show the bar with "Skip for now". */
  active: boolean;
  /** People left counting this one, from the URL. Null outside a run or when unreadable. */
  left: number | null;
  /** /admin/call-sheet/next with this lead added to the skip list: "Skip for now" and the panel's "Next call". */
  nextHref: string;
};

type CardView = {
  sample: boolean;
  /** Null on the sample, which never joins a run. */
  queue: CardQueue | null;
  now: Date;
  lead: PlannerLead;
  createdAt: string;
  source: string | null;
  utmSource: string | null;
  bestContact: string | null;
  lastContactedAt: string | null;
  isTest: boolean;
  goals: string | null;
  notes: CardNote[];
  callDetails: string[];
  /** The newest call a Call Closer save logged (a sent proposal is not a call), and when. Null on the sample. */
  lastCallSave: CallSave | null;
  /**
   * The latest human touch on the record (ISO), for the call sheet's own
   * callback rule: a note, a logged call, a Quo call, a text a person sent, or
   * a reply logged by hand, mapped by the sheet's own touchesFromRows.
   * last_contacted_at is left out on purpose: an inbound text and the
   * automatic text-back move it, and neither is a person acting.
   */
  lastHumanTouchAt: string | null;
  /**
   * The newest message or missed call from the lead (the call sheet's own
   * rule). Shown when it is newer than the last human touch, so a lead the
   * sheet lists under "They reached out" arrives with what they asked.
   */
  latestInbound: LatestInbound | null;
  /** Some history failed to load. The page says so instead of showing an empty history. */
  partial: boolean;
  /** The notes read itself failed, so "Last time" cannot say there are none. */
  notesFailed: boolean;
  actorName: string;
};

function text(v: unknown): string | null {
  return typeof v === "string" && v.trim() ? v : null;
}

function validDate(iso: string | null): Date | null {
  if (!iso) return null;
  const at = new Date(iso);
  return Number.isNaN(at.getTime()) ? null : at;
}

function withPeriod(value: string): string {
  return /[.!?]$/.test(value) ? value : `${value}.`;
}

function toNotes(rows: { body: string | null; created_at: string; author: string | null }[]): CardNote[] {
  return rows.flatMap((row) => {
    const summary = noteSummary(row.body);
    const at = validDate(row.created_at);
    if (!summary || !at) return [];
    return [{ summary, at: formatCentral(at), atIso: at.toISOString(), author: row.author?.trim() || "Author not recorded" }];
  });
}

/**
 * "They texted you Mon, Sep 21 at 2:12 PM Central, and nobody has answered
 * since." With some history missing, the second half cannot be known, so it
 * is left off.
 */
function reachedOutSentence(inbound: LatestInbound, partial: boolean): string {
  const at = validDate(inbound.at);
  const when = at ? `${formatCentral(at)} Central` : "recently";
  if (inbound.kind === "call_in") {
    return partial ? `They called ${when} and nobody picked up.` : `They called ${when} and nobody picked up. Nobody has reached them since.`;
  }
  const verb = inbound.channel === "sms" ? "texted you" : inbound.channel === "email" ? "emailed you" : "wrote to you";
  return partial ? `They ${verb} ${when}.` : `They ${verb} ${when}, and nobody has answered since.`;
}

/** The newest valid instant among these, as ISO, or null. */
function latest(values: (string | null | undefined)[]): string | null {
  let best: Date | null = null;
  for (const v of values) {
    const at = validDate(v ?? null);
    if (at && (!best || at > best)) best = at;
  }
  return best ? best.toISOString() : null;
}

/**
 * The newest call a Call Closer save logged: a "call" row whose detail carries
 * a call card outcome. A sent proposal (kind "sales") is not a call.
 */
function newestCallSave(rows: { kind?: unknown; detail: unknown; created_at?: unknown }[]): CallSave | null {
  let best: { outcome: CallOutcome; at: Date } | null = null;
  for (const row of rows) {
    if (row.kind !== "call" || typeof row.detail !== "string" || typeof row.created_at !== "string") continue;
    const outcome = outcomeFromDetail(row.detail);
    const at = validDate(row.created_at);
    if (!outcome || !PANEL_OUTCOMES.includes(outcome) || !at) continue;
    if (!best || at > best.at) best = { outcome, at };
  }
  return best ? { outcome: best.outcome, at: best.at.toISOString() } : null;
}

/**
 * "A call with Riley was logged 4 minutes ago: No answer. Only log again if
 * you called again." Neutral on who logged it: the Sales Desk saves through
 * the same route and the activity row records no actor. Null unless that save
 * is under RECENT_SAVE_MINUTES old (a minute of clock drift between the
 * database and this server is allowed).
 */
function recentCallLine(save: CallSave | null, first: string, now: Date): string | null {
  if (!save) return null;
  const ms = now.getTime() - Date.parse(save.at);
  if (!Number.isFinite(ms) || ms < -60_000 || ms >= RECENT_SAVE_MINUTES * 60_000) return null;
  const minutes = Math.max(0, Math.floor(ms / 60_000));
  const ago = minutes === 0 ? "less than a minute ago" : minutes === 1 ? "1 minute ago" : `${minutes} minutes ago`;
  return `A call with ${first || "this lead"} was logged ${ago}: ${OUTCOME_LABELS[save.outcome]}. Only log again if you called again.`;
}

/**
 * Whether Ryan picked the follow-up time on file himself, as far as the call
 * history shows. The newest Call Closer save was a call back or a sit-down
 * (both ask him for the time), or no save is on file at all (a time set by
 * hand on the lead page). After any other save the planner chose the time:
 * the next try after no answer or a voicemail, a proposal due date, a payment
 * check, the follow-up after a sent proposal.
 */
function ownerSetFollowUp(callDetailsNewestFirst: string[]): boolean {
  const newest = callDetailsNewestFirst.map(outcomeFromDetail).find((o) => o !== null) ?? null;
  return newest === null || newest === "call_back" || newest === "booked";
}

function sampleView(): CardView {
  const { created_at, source, goals, best_contact_method, ...lead } = SAMPLE_CALL_LEAD;
  const notes = toNotes(SAMPLE_NOTES);
  return {
    sample: true,
    queue: null,
    now: SAMPLE_NOW,
    lead,
    createdAt: created_at,
    source,
    utmSource: null,
    bestContact: best_contact_method,
    lastContactedAt: null,
    isTest: false,
    goals,
    notes,
    callDetails: SAMPLE_CALL_ACTIVITY,
    lastCallSave: null,
    lastHumanTouchAt: latest(notes.map((n) => n.atIso)),
    latestInbound: null,
    partial: false,
    notesFailed: false,
    actorName: SAMPLE_ACTOR_NAME,
  };
}

/** This card again, keeping a run's place, for "Try again" after a failed read. */
function retryHref(leadId: string, query: Record<string, string | string[] | undefined>): string {
  const keep = new URLSearchParams();
  for (const key of ["queue", "left", "skip"]) {
    const value = query[key];
    if (typeof value === "string" && value) keep.set(key, value);
  }
  const qs = keep.toString();
  return `/admin/call-sheet/${encodeURIComponent(leadId)}${qs ? `?${qs}` : ""}`;
}

function queueFrom(query: Record<string, string | string[] | undefined>, leadId: string): CardQueue {
  const active = query.queue === "1";
  return {
    active,
    left: active ? parseLeft(query.left) : null,
    nextHref: nextHref(parseSkip(query.skip), leadId),
  };
}

export default async function CallCardPage({
  params,
  searchParams,
}: {
  params: Promise<{ leadId: string }>;
  searchParams?: Promise<Record<string, string | string[] | undefined>>;
}) {
  const { leadId } = await params;
  const supabase = await createClient();
  // Authorization next to the private read, not only in the layout.
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect(`/login?next=${encodeURIComponent(`/admin/call-sheet/${leadId}`)}`);
  const { data: profile } = await supabase.from("profiles").select("role, full_name").eq("id", user.id).single();
  if (profile?.role !== "admin") redirect("/dashboard");

  if (leadId === "sample") return <CallCard view={sampleView()} />;
  if (!UUID_RE.test(leadId)) notFound();
  const query = (await searchParams) ?? {};
  const queue = queueFrom(query, leadId);

  const leadRead = await supabase.from("leads").select(LEAD_COLUMNS).eq("id", leadId).is("deleted_at", null).maybeSingle();
  if (leadRead.error) return <ConnectionProblem retryHref={retryHref(leadId, query)} queue={queue} />;
  const row = leadRead.data as Record<string, unknown> | null;
  if (!row) notFound();

  const [notesRead, callsRead, quoTouches] = await Promise.all([
    supabase
      .from("lead_notes")
      .select("body, author, created_at")
      .eq("lead_id", leadId)
      .order("created_at", { ascending: false })
      .limit(NOTES_SHOWN),
    // The Call Closer's entries: calls, and sent proposals (kind "sales").
    supabase
      .from("lead_activity")
      .select("kind, detail, created_at")
      .eq("lead_id", leadId)
      .in("kind", [...CALL_HISTORY_KINDS])
      .ilike("detail", CALL_HISTORY_DETAIL_PATTERN)
      .order("created_at", { ascending: false })
      .limit(CALL_ENTRIES_READ),
    // Quo calls and thread messages, mapped by the call sheet's own rules.
    loadLeadTouches(supabase, leadId),
  ]);

  const author = leadMessageAuthor(profile.full_name, user.email);
  const diagnostic = safeLeadDiagnostic(row.diagnostic);
  const noteRows = notesRead.error ? [] : ((notesRead.data ?? []) as { body: string | null; created_at: string; author: string | null }[]);
  const notes = toNotes(noteRows);
  const callRows = callsRead.error
    ? []
    : ((callsRead.data ?? []) as { kind?: unknown; detail: unknown; created_at?: unknown }[]).filter((r) => isCallHistoryEntry(r.kind, r.detail));
  // The call sheet's own mapping (lib/callSheet.ts): notes, Quo calls about
  // the company, texts a person sent that were delivered, and replies logged
  // by hand are touches; an inbound text or a missed call from the lead is not.
  const touches = [
    ...touchesFromRows({ notes: noteRows.map((n) => ({ lead_id: leadId, created_at: n.created_at, body: n.body })), calls: [], messages: [] }),
    ...quoTouches.touches,
  ];
  const humanTouches = touches.filter(isHumanTouch).map((t) => t.at);
  const view: CardView = {
    sample: false,
    queue,
    now: new Date(),
    lead: {
      id: leadId,
      full_name: text(row.full_name) ?? "",
      business_name: text(row.business_name),
      status: text(row.status) ?? "",
      interest: text(row.interest),
      phone: text(row.phone),
      email: text(row.email),
      sms_consent: typeof row.sms_consent === "boolean" ? row.sms_consent : null,
      sms_unsubscribed_at: text(row.sms_unsubscribed_at),
      next_follow_up_at: text(row.next_follow_up_at),
      diagnostic: diagnostic && typeof diagnostic === "object" && !Array.isArray(diagnostic) ? (diagnostic as Record<string, unknown>) : null,
    },
    createdAt: text(row.created_at) ?? "",
    source: text(row.source),
    utmSource: text(row.utm_source),
    bestContact: text(row.best_contact_method),
    lastContactedAt: text(row.last_contacted_at),
    isTest: row.is_test === true,
    goals: text(row.goals),
    notes,
    callDetails: callRows.map((r) => r.detail).filter((d): d is string => typeof d === "string"),
    lastCallSave: newestCallSave(callRows),
    lastHumanTouchAt: latest([...humanTouches, ...callRows.map((r) => (typeof r.created_at === "string" ? r.created_at : null))]),
    latestInbound: quoTouches.latestInbound,
    partial: Boolean(notesRead.error || callsRead.error || !quoTouches.ok),
    notesFailed: Boolean(notesRead.error),
    // Signs the pay-link draft the same way the save route does: the profile name, else the owner's first name.
    actorName: author.auditName === author.displayName ? author.displayName : "",
  };
  return <CallCard view={view} />;
}

function CardNoteItem({ note }: { note: CardNote }) {
  return (
    <li className="min-w-0">
      <p className="text-xs text-[var(--muted)]">
        {note.at} · {note.author}
      </p>
      <p className="text-sm text-[var(--text)] [overflow-wrap:anywhere]">{note.summary}</p>
    </li>
  );
}

function ConnectionProblem({ retryHref, queue }: { retryHref: string; queue: CardQueue }) {
  return (
    <div className="mx-auto grid max-w-2xl grid-cols-1 gap-4">
      <div className="card !p-4" role="alert">
        <h2 className="text-lg font-black text-[var(--heading)]">The call card could not be loaded.</h2>
        <p className="my-3 text-sm">This is a connection problem, not an empty lead. Try again in a moment.</p>
        <div className="flex flex-wrap gap-2">
          <a href={retryHref} className={`${BUTTON} bg-[var(--blue)] text-white`}>
            Try again
          </a>
          {queue.active ? (
            <a href={queue.nextHref} className={`${BUTTON} border border-[var(--line-strong)] text-[var(--text)]`}>
              Skip for now
            </a>
          ) : null}
          <Link href="/admin/call-sheet" className={QUIET_LINK}>
            Back to the call sheet
          </Link>
        </div>
      </div>
    </div>
  );
}

/**
 * The slim bar a "Start calling" run shows above the card. Once a call on this
 * card is logged (the page refreshes after a save), the bar agrees with the
 * panel's "Next call": it counts the people after this one, and its link says
 * Next call, not Skip for now. The link stays, because "Log another call"
 * clears the panel's saved view and Back restores the card without it.
 */
function QueueBar({ queue, logged }: { queue: CardQueue; logged: boolean }) {
  if (!logged) {
    const count = queue.left === null ? "" : ` · ${queue.left} left`;
    return (
      <QueueBarShell href={queue.nextHref} label="Skip for now">
        Going down today&apos;s list{count}
      </QueueBarShell>
    );
  }
  const after = leftAfterThis(queue.left);
  const count = after === null ? "" : after === 0 ? " · that was the last one" : ` · ${after} left`;
  return (
    <QueueBarShell href={queue.nextHref} label={after === 0 ? "Finish the list" : "Next call"}>
      Call logged{count}
    </QueueBarShell>
  );
}

function QueueBarShell({ href, label, children }: { href: string; label: string; children: React.ReactNode }) {
  return (
    <nav
      aria-label="Today's list"
      className="flex flex-wrap items-center justify-between gap-x-3 gap-y-1 rounded-xl border border-[var(--accent-line)] bg-[var(--accent-tint)] py-1 pl-3 pr-1"
    >
      <p className="text-sm font-bold text-[var(--heading)]">{children}</p>
      <Link href={href} prefetch={false} className={`${BUTTON} border border-[var(--line-strong)] bg-[var(--panel)] text-[var(--text)]`}>
        {label}
      </Link>
    </nav>
  );
}

function CallCard({ view }: { view: CardView }) {
  const { lead, now, sample } = view;
  const name = lead.full_name.trim() || "Unnamed lead";
  const first = firstName(lead.full_name);
  const who = first || "this lead";

  const e164 = lead.phone ? toE164(lead.phone) : null;
  const textable = canText(lead);
  const tel = e164 ? `tel:${e164}` : null;
  const sms = e164 && textable ? `sms:${e164}` : null;
  const hasEmail = hasLeadEmailAddress(lead.email);
  const mail = hasEmail ? `mailto:${lead.email}` : null;
  // Why a button is missing, in the call sheet's own words.
  const noText = sms ? null : textGap(lead);
  const noEmail = mail ? null : emailGap(lead.email);

  const created = validDate(view.createdAt);
  const ageHours = created ? Math.max(0, (now.getTime() - created.getTime()) / 3_600_000) : null;
  const touched = view.notes.length > 0 || view.callDetails.length > 0 || Boolean(view.lastHumanTouchAt) || Boolean(view.lastContactedAt);
  // The header says "This is the first call" only on a full load with nothing on file. Then an empty
  // "Last time" would only repeat it, so it is left off and the outcome panel sits higher on a phone.
  const firstCall = !touched && !view.partial;
  // The call sheet's own rule (lib/callSheet.ts callbackState): a past time is
  // a call back still owed only when the last human touch came before it.
  // Otherwise it was kept, or it is the diagnostic's stamp.
  const promise = callbackState(lead.next_follow_up_at, view.lastHumanTouchAt, now);
  const pastTime = promise.at !== null && promise.at.getTime() <= now.getTime() ? promise.at : null;
  // "You set it" only when the history shows Ryan picked the time; otherwise the time, without a claim.
  const ownerSet = ownerSetFollowUp(view.callDetails);
  // Back on this card right after a save: say so, before the empty form invites a second log.
  const recentLine = sample ? null : recentCallLine(view.lastCallSave, first, now);
  // They reached out after the last time a person did: a reply is owed.
  const lastTouchMs = view.lastHumanTouchAt ? Date.parse(view.lastHumanTouchAt) : Number.NEGATIVE_INFINITY;
  const inbound = view.latestInbound && Date.parse(view.latestInbound.at) > lastTouchMs ? view.latestInbound : null;

  const words = theirWords(view.goals);
  const suggested = closerOffersFor(lead.interest, lead.diagnostic);
  const lastOffers: CloserOfferId[] = view.callDetails.map(offerIdsFromDetail).find((ids) => ids.length > 0) ?? [];
  const suggestedDoors = suggested.map((id) => payDoorFor(id)).filter((d): d is PayDoor => d !== null);
  const everyDoor = closerOffers();

  return (
    // grid-cols-1 is minmax(0, 1fr): a long URL in the pay message or in their
    // words wraps inside the card instead of widening every card past a phone.
    <div className="mx-auto grid max-w-2xl grid-cols-1 gap-4">
      {view.queue?.active ? <QueueBar queue={view.queue} logged={recentLine !== null} /> : null}
      {/* One row: back to the list, and the full record for a real lead. */}
      <nav className="flex flex-wrap items-center gap-x-4" aria-label="Call card">
        <Link href="/admin/call-sheet" className={QUIET_LINK}>
          Back to the call sheet
        </Link>
        {!sample ? (
          <Link href={`/admin/leads/${lead.id}`} className={QUIET_LINK}>
            Full record
          </Link>
        ) : null}
      </nav>

      <header className="card !p-4">
        {sample ? (
          // One line inside the header, so the sample reads like a real card on a phone.
          <p className="mb-2 text-sm text-[var(--muted)]" role="note">
            <span className="font-bold text-[var(--text)]">Sample call card.</span> {name} is fictional. Nothing is saved or sent.
          </p>
        ) : null}
        <p className="hq-eyebrow">Call card</p>
        <h2 className="mt-1 break-words text-2xl font-black text-[var(--heading)]">{name}</h2>
        {lead.business_name ? <p className="break-words font-semibold text-[var(--muted)]">{lead.business_name}</p> : null}
        <p className="mt-2 text-sm text-[var(--muted)]">
          {sourceLabel({ source: view.source, utm_source: view.utmSource })}
          {lead.interest ? ` · ${interestLabel(lead.interest)}` : ""}
          {ageHours !== null ? ` · came in ${ageLabel(ageHours)}` : ""}
          {lead.status ? ` · status ${lead.status.replace(/_/g, " ")}` : ""}
          {view.bestContact ? ` · prefers ${view.bestContact}` : ""}
          {view.isTest ? " · test lead" : ""}
        </p>
        {/* "First call" only on a full load: missing history is a connection problem, not proof nobody called. */}
        {firstCall ? (
          <p className="mt-3 rounded-lg border border-[var(--accent-line)] bg-[var(--accent-tint)] p-3 text-sm text-[var(--text)]">
            Nobody has logged a call or a note yet. This is the first call.
          </p>
        ) : view.partial && pastTime ? (
          // Some history did not load, so whether this time is still owed cannot be told.
          <p className="mt-3 rounded-lg border border-[var(--line)] bg-[var(--page)] p-3 text-sm text-[var(--text)]">
            <span className="font-bold">Follow-up time on file:</span> {formatCentral(pastTime)} Central.
          </p>
        ) : promise.state === "due" ? (
          <p className="mt-3 rounded-lg border border-[var(--warn-line)] bg-[var(--warn-tint)] p-3 text-sm text-[var(--text)]">
            {ownerSet ? (
              <>
                <span className="font-bold">Call back due now.</span> You set it for {formatCentral(promise.at)} Central.
              </>
            ) : (
              <>
                <span className="font-bold">Follow-up due now.</span> It came due {formatCentral(promise.at)} Central.
              </>
            )}
          </p>
        ) : promise.state === "later" ? (
          // Neutral on purpose: a later time is as often the next try after no answer as a call back Ryan promised.
          <p className="mt-3 rounded-lg border border-[var(--line)] bg-[var(--page)] p-3 text-sm text-[var(--text)]">
            <span className="font-bold">Next follow-up:</span> {formatCentral(promise.at)} Central.
          </p>
        ) : (
          <p className="mt-3 text-sm text-[var(--muted)]">No call back is set.</p>
        )}

        {/* The sheet's "They reached out" case: what they sent, before Ryan dials. */}
        {inbound ? (
          <div className="mt-3 rounded-lg border border-[var(--warn-line)] bg-[var(--warn-tint)] p-3 text-sm text-[var(--text)]">
            <p>
              <span className="font-bold">They reached out.</span> {reachedOutSentence(inbound, view.partial)}
            </p>
            {inbound.said ? (
              <blockquote className="mt-2 whitespace-pre-wrap border-l-4 [overflow-wrap:anywhere] border-[var(--warn-line)] pl-3">
                {inbound.said}
              </blockquote>
            ) : null}
            {!sample ? (
              <Link href={`/admin/leads/${lead.id}`} className={`${QUIET_LINK} mt-1`}>
                Open the thread in the full record
              </Link>
            ) : null}
          </div>
        ) : null}

        <div className="mt-4 flex flex-wrap gap-2" role="group" aria-label={`Reach ${who}`}>
          {tel && e164 ? (
            // The label reads the number the link dials: (903) 555-0142 for a US number, the number as dialed otherwise.
            <a href={tel} className={`${BUTTON} bg-[var(--blue)] text-white`}>
              Call {formatPhone(e164)}
            </a>
          ) : (
            <span className={`${BUTTON} border border-[var(--line-strong)] font-normal text-[var(--muted)]`}>No phone on file</span>
          )}
          {sms ? (
            <a href={sms} className={`${BUTTON} border border-[var(--line-strong)] text-[var(--text)]`}>
              Text (consented)
            </a>
          ) : lead.phone && noText ? (
            <span className={`${BUTTON} border border-[var(--line)] font-normal text-[var(--muted)]`}>{noText.label}</span>
          ) : null}
          {mail ? (
            <a href={mail} className={`${BUTTON} border border-[var(--line-strong)] text-[var(--text)]`}>
              Email
            </a>
          ) : noEmail ? (
            <span className={`${BUTTON} border border-[var(--line)] font-normal text-[var(--muted)]`}>{noEmail.label}</span>
          ) : null}
        </div>
      </header>

      {view.partial ? (
        <div className="card !p-4 text-sm" role="alert">
          <p className="font-bold">Some of this lead&apos;s history did not load.</p>
          <p className="mt-1">
            This is a connection problem, not an empty lead. The notes, the count of unanswered tries, and whether a call back is still
            owed may be off. Saving
            still checks the full record.
          </p>
        </div>
      ) : null}

      <section className="card !p-4" aria-labelledby="call-card-words">
        <h3 id="call-card-words" className={SECTION_TITLE}>
          In their words
        </h3>
        {words.words ? (
          <blockquote className="mt-2 whitespace-pre-wrap border-l-4 [overflow-wrap:anywhere] border-[var(--accent-line)] pl-3 text-sm text-[var(--text)]">
            {words.words}
          </blockquote>
        ) : (
          <p className="mt-2 text-sm text-[var(--muted)]">They did not write anything. Ask what made them reach out.</p>
        )}
        {words.meet || words.reachBy ? (
          <dl className="mt-3 grid gap-1 text-sm">
            {words.meet ? (
              <div>
                <dt className="inline font-bold">Wants to meet: </dt>
                <dd className="inline">{words.meet}</dd>
              </div>
            ) : null}
            {words.reachBy ? (
              <div>
                <dt className="inline font-bold">Reach them by: </dt>
                <dd className="inline">{words.reachBy}</dd>
              </div>
            ) : null}
          </dl>
        ) : null}
      </section>

      {firstCall ? null : (
        <section className="card !p-4" aria-labelledby="call-card-last">
          <h3 id="call-card-last" className={SECTION_TITLE}>
            Last time
          </h3>
          {view.notes.length ? (
            <>
              {/* The latest note is what matters on the phone; the two before it are a tap away. */}
              <ol className="mt-2 grid gap-3">
                {view.notes.slice(0, 1).map((n, i) => (
                  <CardNoteItem key={`${n.at}-${i}`} note={n} />
                ))}
              </ol>
              {view.notes.length > 1 ? (
                <details className="mt-1">
                  <summary className={`flex min-h-[44px] cursor-pointer items-center rounded-lg px-1 text-sm font-bold text-[var(--blue)] ${FOCUS}`}>
                    Earlier notes ({view.notes.length - 1})
                  </summary>
                  <ol className="mt-1 grid gap-3">
                    {view.notes.slice(1).map((n, i) => (
                      <CardNoteItem key={`${n.at}-${i}`} note={n} />
                    ))}
                  </ol>
                </details>
              ) : null}
            </>
          ) : view.notesFailed ? (
            <p className="mt-2 text-sm text-[var(--muted)]">The notes did not load. Open the full record to check.</p>
          ) : (
            <p className="mt-2 text-sm text-[var(--muted)]">No notes yet.</p>
          )}
        </section>
      )}

      {/* A plain line, not an alert: it is a reminder, and it must not be read out again over the Saved message after a save. */}
      {recentLine ? (
        <p className="card !p-4 text-sm text-[var(--text)]" data-recent-call="">
          {recentLine}
        </p>
      ) : null}

      <CallCardPanel
        lead={{ ...lead, diagnostic: null }}
        suggestedOffers={suggested}
        initialOffers={lastOffers}
        priorAttempts={countPriorAttempts(view.callDetails)}
        actorName={view.actorName}
        smsHref={sms}
        mailHref={mail}
        canText={Boolean(sms)}
        hasEmail={hasEmail}
        noTextReason={noText?.reason ?? null}
        noEmailReason={noEmail?.reason ?? null}
        defaultMeetingPlace={meetingPlaceForLabel(words.meet)}
        proposalAllowed
        sample={sample}
        fixedNow={sample ? now.toISOString() : null}
        // After a save the panel offers "Next call": the next person on today's list, never this one again.
        // Its count is the people after this one; outside a run it is null. The sample passes nothing.
        {...(view.queue ? { queue: { nextHref: view.queue.nextHref, left: leftAfterThis(view.queue.left) } } : {})}
      />

      <section className="card !p-4" aria-labelledby="call-card-offers">
        <h3 id="call-card-offers" className={SECTION_TITLE}>
          What you can offer
        </h3>
        <p className="mt-1 text-sm text-[var(--muted)]">
          Prices and payment steps come straight from the published offers. Tap one for its terms.
        </p>
        <ul className="mt-2 grid">
          {suggestedDoors.map((door) => (
            <li key={door.offerId} className="min-w-0 border-b border-[var(--line)] last:border-b-0">
              <details>
                <summary className={`flex min-h-[44px] cursor-pointer flex-col justify-center rounded-lg px-1 py-2 text-sm ${FOCUS}`}>
                  <span className="min-w-0">
                    <span className="font-bold text-[var(--heading)]">{door.offerName}</span>{" "}
                    <span className="font-semibold text-[var(--blue)]">{door.priceLabel}</span>
                  </span>
                  <span className="min-w-0 text-[var(--muted)]">{withPeriod(door.howTheyPay)}</span>
                </summary>
                <p className="px-1 pb-3 text-sm text-[var(--text)]">{door.terms}</p>
              </details>
            </li>
          ))}
        </ul>
        <details className="mt-2">
          <summary className={`flex min-h-[44px] cursor-pointer items-center rounded-lg px-1 text-sm font-bold text-[var(--blue)] ${FOCUS}`}>
            Show every published offer
          </summary>
          <ul className="mt-2 grid gap-2">
            {everyDoor.map((door) => (
              <li key={door.offerId} className="min-w-0 border-b border-[var(--line)] pb-2 text-sm last:border-b-0">
                <span className="font-bold text-[var(--heading)]">{door.offerName}</span>{" "}
                <span className="font-semibold text-[var(--muted)]">{door.priceLabel}</span>
                <span className="block text-[var(--muted)]">{withPeriod(door.howTheyPay)}</span>
              </li>
            ))}
          </ul>
        </details>
      </section>
    </div>
  );
}
