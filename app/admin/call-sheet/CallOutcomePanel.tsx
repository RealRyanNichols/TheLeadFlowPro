"use client";

import { useEffect, useId, useMemo, useRef, useState, type ReactNode, type RefObject } from "react";
import { ArrowRight, CheckCircle2 } from "lucide-react";
import CopyButton from "@/app/hq/_components/CopyButton";
import { centralDate, quickCallbackChoices } from "@/lib/businessTime";
import {
  CALL_OUTCOMES,
  LOST_REASONS,
  MAX_CALL_OFFERS,
  MAX_DAYS_AHEAD,
  MEETING_PLACES,
  MEETING_PLACE_MAX,
  NEXT_STEP_NOTE_MAX,
  OUTCOME_LABELS,
  PANEL_OUTCOMES,
  firstName,
  isPayableToday,
  parseNextStepRequest,
  planCallOutcome,
  type CallOutcome,
  type CallPlan,
  type PlannerLead,
} from "@/lib/callCloser";
import { closerOffers, payDoorFor, type CloserOfferId, type PayDoor } from "@/lib/payDoors";

// "How did the call go?" asked the way people think after a call. Step 1:
// "Did you reach them?" No answer and a voicemail are the outcome itself, one
// tap. "Yes, we talked" opens step 2, "What happens next?", with nothing
// picked. Then read "What saving does" and save. That list is drawn by the
// same planner the save route runs (lib/callCloser.ts), on the browser clock,
// from the same JSON this panel posts, so what Ryan reads is what lands.
//
// Rules this file keeps:
// - Changing step 1 never leaves a stale outcome picked: "Yes, we talked"
//   always starts step 2 empty (outcomeForReach). The note is kept. Save stays
//   off, with a hint in words, until there is an outcome.
// - The only network call is the POST to /api/admin/leads/<id>/next-step.
//   Nothing here texts, emails, or charges anyone. When a lead is ready to
//   pay, the panel hands Ryan the pay links and a message he sends himself.
// - Every save carries an idempotency key minted on mount. When the route
//   answered with its own error, nothing with that key landed: the same save
//   again reuses the key, and a changed save gets a new one. When no answer
//   came back (the connection dropped, or a platform error page), the save may
//   have landed, so every later save keeps that key until one succeeds, even
//   after an edit: the route then says "already saved" instead of writing the
//   call twice, and the panel says the later edits were not saved. Any save
//   after a success gets a new key.
// - For Wants a proposal, only the primary suggestion (or the offers named on
//   the last call) starts checked. The rest are listed first, one tap away, so
//   a quick save never names offers nobody talked about.
// - Ready to pay now keeps its own list. The offers that can be paid today
//   (isPayableToday, the planner's own rule) come first, and the first such
//   suggestion starts checked, so a free-website lead is not stuck on an offer
//   that takes no money. The offers named on the last call still start checked
//   and are shown first. Everything else sits under "Offers that cannot be paid
//   online today". The planner stays the authority: an unpayable pick is
//   explained, never saved. The optional "Talked about an offer?" list on a sit-down or a call
//   back starts with nothing ticked, so opening it to add one offer never
//   records a second one nobody mentioned.
// - An error keeps everything Ryan entered. A success is announced and gets
//   focus, so a screen reader and a thumb both land on it.
// - While a save is in flight the form is frozen (SavingLock), so nothing
//   typed during "Saving..." is dropped when the saved view replaces it.
// - After a call link is tapped, coming back to the page never moves it: Ryan
//   often switches back mid-call to read the card. Until step 1 is answered,
//   a small "Log how the call went" button shows, and only a tap on it takes
//   him to "Did you reach them?". No focus move ever pulls him out of a field
//   he is typing in (isTypingField).
// - After a save on the call card, "Next call" (the queue prop) is the first
//   thing to tap. Without the prop (the Sales Desk) and in sample mode, the
//   saved view is unchanged.
// - Everything that needs lib/quo or lib/callSheet (phone links, texting
//   consent) is worked out on the server and passed in as plain props. This
//   file imports no Supabase, Quo, call sheet, or notification code, and no
//   Next.js router, so it renders in a plain React test too.

export type SavedCall = {
  ok: true;
  outcome: CallOutcome;
  duplicate: boolean;
  landed: string[];
  warnings: string[];
  summary: string;
  nextFollowUpAt: string | null;
  nextFollowUpLabel: string | null;
  preview: string[];
  payDoors: PayDoor[];
  payMessage: string | null;
  proposalHref: string | null;
};

/** Step 1, "Did you reach them?". A miss and a voicemail are outcomes on their own; a talk needs step 2. */
export type Reach = "talked" | "no_answer" | "voicemail";

/** Where "Next call" goes after a save, and how many calls are left (null when unknown). */
export type CallQueueHandoff = { nextHref: string; left: number | null };

export type CallOutcomePanelProps = {
  /** Plain lead fields for the preview. Pass diagnostic as null: the planner does not need it in the browser. */
  lead: PlannerLead;
  /** Offers to have ready (closerOffersFor on the server). Shown first in the offer list. */
  suggestedOffers: CloserOfferId[];
  /** Offers named on the last call. Preselected for Wants a proposal and Ready to pay now; otherwise only the first (primary) suggestion is. Listed first everywhere. */
  initialOffers?: CloserOfferId[];
  /** countPriorAttempts over the lead's recent call activity. */
  priorAttempts: number;
  /** Signs the pay-link draft in the preview. The route signs the saved one from the profile. */
  actorName: string;
  /** "sms:+1..." built on the server, only when the lead can be texted. */
  smsHref: string | null;
  /** "mailto:..." built on the server, only for a real email address. */
  mailHref: string | null;
  canText: boolean;
  hasEmail: boolean;
  /** Why there is no text button (lib/contactGaps.ts textGap().reason), e.g. "they replied STOP". */
  noTextReason?: string | null;
  /** Why there is no email button (lib/contactGaps.ts emailGap().reason), e.g. "Facebook did not share an email". */
  noEmailReason?: string | null;
  /** The sit-down place the lead asked for on the consultation form, as a MEETING_PLACES place. */
  defaultMeetingPlace?: string | null;
  /** Show "Draft the proposal now" after Wants a proposal (the proposal page is admin only). */
  proposalAllowed?: boolean;
  /** Tighter layout for the lead workspace. */
  compact?: boolean;
  /** Sample mode: the preview works, Save never posts. */
  sample?: boolean;
  /** A fixed clock (ISO) for sample mode. Otherwise the browser clock, read after mount. */
  fixedNow?: string | null;
  /** Start with an outcome chosen. Step 1 follows from it. */
  initialOutcome?: CallOutcome | null;
  /** Start with step 1 answered and no outcome yet ("talked" opens an empty "What happens next?"). initialOutcome wins when both are given. */
  initialReach?: Reach | null;
  /**
   * The call card's queue. After a successful save, "Next call" (plus " · N left"
   * when left is a whole number above 0) links to nextHref, first of the
   * actions. Leave it out (the Sales Desk) and the saved view is unchanged.
   * Never shown in sample mode, and only for a same-site path.
   */
  queue?: CallQueueHandoff | null;
  backHref?: string;
  backLabel?: string;
  onSaved?: (saved: SavedCall) => void;
};

/** Passes IDEMPOTENCY_KEY_RE. Only ever used for the preview; a real save mints its own. */
const PREVIEW_KEY = "preview-only-key-not-saved";
const CLOCK_TICK_MS = 30_000;
const DAY_MS = 86_400_000;

const FOCUS = "focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--blue)]";
// The focus ring goes on the whole tile when its radio or checkbox has keyboard focus.
const TILE_FOCUS =
  "has-[:focus-visible]:outline has-[:focus-visible]:outline-2 has-[:focus-visible]:outline-offset-2 has-[:focus-visible]:outline-[var(--blue)]";
const TILE_SHAPE = `flex cursor-pointer gap-3 rounded-xl border px-3 font-bold leading-snug ${TILE_FOCUS}`;
const TILE_BASE = `${TILE_SHAPE} min-h-[44px] py-2.5 text-sm`;
const TILE = `${TILE_BASE} items-center`;
// Step 1 is the first tap after a call, so its tiles are the biggest.
const BIG_TILE = `${TILE_SHAPE} min-h-[52px] items-center py-3 text-base`;
// Picked is more than a color: the radio's own dot, and a border twice as thick (an inset line, so nothing shifts).
const TILE_ON = "border-[var(--blue)] bg-[var(--accent-tint)] text-[var(--heading)] shadow-[inset_0_0_0_1px_var(--blue)]";
const TILE_OFF = "border-[var(--line-strong)] bg-[var(--panel)] text-[var(--text)]";
const STEP_LEGEND =
  "mb-2 rounded-md text-base font-black text-[var(--heading)] focus:outline focus:outline-2 focus:outline-offset-4 focus:outline-[var(--blue)]";
const CHIP = `inline-flex min-h-[44px] items-center rounded-lg border px-3 py-2 text-sm font-semibold ${FOCUS}`;
const BUTTON_QUIET = `inline-flex min-h-[44px] items-center justify-center rounded-lg border border-[var(--line-strong)] bg-[var(--panel)] px-4 py-2 text-sm font-bold text-[var(--text)] ${FOCUS}`;
const LINK_ACCENT = `inline-flex min-h-[44px] items-center justify-center rounded-lg border border-[var(--accent-line)] bg-[var(--accent-tint)] px-4 py-2 text-sm font-bold text-[var(--blue)] ${FOCUS}`;
// The tile around it draws the focus ring (TILE_FOCUS), so the control itself does not draw a second one.
const RADIO = "h-5 w-5 shrink-0 accent-[var(--blue)] focus-visible:outline-none";
const SUBLEGEND = "mb-2 text-sm font-bold text-[var(--heading)]";
const SUMMARY = `flex min-h-[44px] cursor-pointer items-center rounded-lg px-1 text-sm font-bold text-[var(--blue)] ${FOCUS}`;

/** Outcomes whose offers are required and always sent. */
const OFFER_REQUIRED: ReadonlySet<CallOutcome> = new Set<CallOutcome>(["wants_proposal", "ready_to_pay"]);
/** Outcomes where offers are optional: sent only when Ryan opens "Talked about an offer?". */
const OFFER_OPTIONAL: ReadonlySet<CallOutcome> = new Set<CallOutcome>(["booked", "call_back"]);
const UNANSWERED: ReadonlySet<CallOutcome> = new Set<CallOutcome>(["no_answer", "voicemail"]);

/** Step 1's tiles, in order. */
export const REACH_CHOICES: readonly { id: Reach; label: string }[] = [
  { id: "talked", label: "Yes, we talked" },
  { id: "no_answer", label: OUTCOME_LABELS.no_answer },
  { id: "voicemail", label: OUTCOME_LABELS.voicemail },
];

/** Step 2's tiles: every call card outcome where they talked, in the call card's order. */
export const NEXT_OUTCOMES: readonly CallOutcome[] = PANEL_OUTCOMES.filter((o) => !UNANSWERED.has(o));

/** Step 2's tile words. "We talked" is already answered, so the call back tile says only the rest. */
export function nextStepLabel(outcome: CallOutcome): string {
  return outcome === "call_back" ? "Call back later" : OUTCOME_LABELS[outcome];
}

/** The step 1 answer an outcome implies, or null when nothing is chosen (or it is not a call card outcome). */
export function reachFor(outcome: CallOutcome | null): Reach | null {
  if (outcome === null || !PANEL_OUTCOMES.includes(outcome)) return null;
  return outcome === "no_answer" || outcome === "voicemail" ? outcome : "talked";
}

/**
 * The outcome right after step 1 changes. A miss or a voicemail is the
 * outcome. "Yes, we talked" always starts step 2 empty, so a pick made before
 * switching away is never carried back in unseen.
 */
export function outcomeForReach(reach: Reach): CallOutcome | null {
  return reach === "talked" ? null : reach;
}

/** Why Save cannot be tapped yet, in plain words, or null once an outcome is chosen. */
export function pickHint(reach: Reach | null, outcome: CallOutcome | null): string | null {
  if (outcome) return null;
  return reach === "talked" ? "Pick what happens next." : "Pick whether you reached them.";
}

/**
 * A field someone may be typing in. The panel never moves focus out of one:
 * a text, date, or time input, a textarea, a select, or editable text.
 */
export function isTypingField(el: { tagName?: string; type?: string; isContentEditable?: boolean } | null | undefined): boolean {
  if (!el || typeof el.tagName !== "string") return false;
  const tag = el.tagName.toUpperCase();
  if (tag === "TEXTAREA" || tag === "SELECT") return true;
  if (tag === "INPUT") return !["radio", "checkbox", "button", "submit", "reset", "image", "range", "color", "file"].includes((el.type || "text").toLowerCase());
  return el.isContentEditable === true;
}

/**
 * "Next call" after a save: the link and the count to show, or null. Only a
 * same-site path is linked, and the count only when it is a whole number above 0.
 */
export function nextCallLink(queue: CallQueueHandoff | null | undefined, sample: boolean): { href: string; label: string } | null {
  if (sample || !queue || typeof queue.nextHref !== "string") return null;
  const href = queue.nextHref.trim();
  if (!href.startsWith("/") || href.startsWith("//") || href.startsWith("/\\")) return null;
  const left = queue.left;
  const count = typeof left === "number" && Number.isInteger(left) && left > 0 ? ` · ${left} left` : "";
  return { href, label: `Next call${count}` };
}

function mintKey(): string {
  const c: Crypto | undefined = typeof globalThis.crypto === "object" ? globalThis.crypto : undefined;
  if (c && typeof c.randomUUID === "function") return c.randomUUID();
  // randomUUID needs a secure context. getRandomValues does not.
  const bytes = new Uint8Array(16);
  if (c && typeof c.getRandomValues === "function") c.getRandomValues(bytes);
  else for (let i = 0; i < bytes.length; i += 1) bytes[i] = Math.floor(Math.random() * 256);
  const hex = Array.from(bytes, (b) => b.toString(16).padStart(2, "0")).join("");
  return `${hex.slice(0, 8)}-${hex.slice(8, 12)}-${hex.slice(12, 16)}-${hex.slice(16, 20)}-${hex.slice(20)}`;
}

function uniqueOffers(ids: readonly CloserOfferId[]): CloserOfferId[] {
  const out: CloserOfferId[] = [];
  for (const id of ids) if (!out.includes(id) && payDoorFor(id)) out.push(id);
  return out;
}

function withPeriod(text: string): string {
  return /[.!?]$/.test(text) ? text : `${text}.`;
}

/**
 * Under "Ready to pay now": whether this offer can be paid online today. An
 * agency service pays on the agency pay page against its written scope, which
 * the planner allows once the lead is at the proposal stage.
 */
function payTodayLabel(door: PayDoor, status: string): string {
  // Most payable doors already say "online today" or "Pays ..." in their own words; saying it twice reads like a stutter.
  if (door.payableNow) {
    if (/online today/i.test(door.howTheyPay)) return "";
    return /^pays /i.test(door.howTheyPay) ? "Online today. " : "Pays online today. ";
  }
  if (door.kind === "written_scope" && door.url) {
    return status === "proposal" ? "Pays online against the written scope. " : "Pays online once the number is in writing. ";
  }
  return "Cannot be paid online today. ";
}

function isRecord(v: unknown): v is Record<string, unknown> {
  return typeof v === "object" && v !== null && !Array.isArray(v);
}

function strings(v: unknown): string[] {
  return Array.isArray(v) ? v.filter((x): x is string => typeof x === "string") : [];
}

function isCallOutcome(v: unknown): v is CallOutcome {
  return typeof v === "string" && (CALL_OUTCOMES as readonly string[]).includes(v);
}

/** The route's 200 body, checked field by field before the panel trusts it. */
export function readSaved(data: unknown, outcome: CallOutcome): SavedCall | null {
  if (!isRecord(data) || data.ok !== true || typeof data.summary !== "string") return null;
  return {
    ok: true,
    // "Already saved" names the outcome that was saved, which can differ from an edit on screen.
    outcome: isCallOutcome(data.outcome) ? data.outcome : outcome,
    duplicate: data.duplicate === true,
    landed: strings(data.landed),
    warnings: strings(data.warnings),
    summary: data.summary,
    nextFollowUpAt: typeof data.nextFollowUpAt === "string" ? data.nextFollowUpAt : null,
    nextFollowUpLabel: typeof data.nextFollowUpLabel === "string" ? data.nextFollowUpLabel : null,
    preview: strings(data.preview),
    payDoors: Array.isArray(data.payDoors) ? (data.payDoors.filter(isRecord) as unknown as PayDoor[]) : [],
    payMessage: typeof data.payMessage === "string" ? data.payMessage : null,
    proposalHref: typeof data.proposalHref === "string" && data.proposalHref.startsWith("/admin/") ? data.proposalHref : null,
  };
}

/** What the panel remembers between saves that did not succeed. */
export type SaveMemory = {
  /** The key the next save uses unless it has to change. */
  key: string;
  /** The last save the route refused with its own error. Nothing with `key` landed from it. */
  failedPayload: string | null;
  /** Saves sent under `key` whose answer never came back. Any one of them may have landed. */
  uncertainPayloads: string[];
};

/** How a save ended, as far as the panel can tell. */
export type SaveOutcome =
  | { kind: "saved"; duplicate: boolean }
  /** The route answered with its own JSON error. Its Ref marker is written last, so nothing with this key landed. */
  | { kind: "refused" }
  /** No answer the panel can trust: the save may or may not have landed. */
  | { kind: "unknown" };

export const UNCERTAIN_SAVE_MESSAGE =
  "The connection dropped before the server answered, so this call may already be saved. Everything you entered is still here. Tap Save again: if it already saved, it will say so, and nothing is saved twice.";

export const EDITS_NOT_SAVED_WARNING =
  "An earlier save of this call went through, so your later changes were not saved. Anything below is for the call that was saved. To record a different outcome and get its links, tap Log another call. To add to the note, use the lead page.";

/** Sort a finished request into saved, refused, or unknown. A null response means fetch itself threw. */
export function classifySave(response: { ok: boolean } | null, data: unknown): SaveOutcome {
  if (!response) return { kind: "unknown" };
  if (response.ok) {
    return isRecord(data) && data.ok === true && typeof data.summary === "string"
      ? { kind: "saved", duplicate: data.duplicate === true }
      : { kind: "unknown" };
  }
  return isRecord(data) && data.ok === false ? { kind: "refused" } : { kind: "unknown" };
}

/** The key for the next save of `payload`. */
export function keyForSave(memory: SaveMemory, payload: string, mint: () => string): string {
  if (!memory.key) return mint();
  // A save under this key may already have landed, and only this key can find it.
  if (memory.uncertainPayloads.length > 0) return memory.key;
  // The route refused the last save, so a changed save is a new save.
  if (memory.failedPayload !== null && memory.failedPayload !== payload) return mint();
  return memory.key;
}

/** What to remember after a save of `payload` ended with `outcome`, and whether later edits were lost to an earlier save. */
export function afterSave(
  memory: SaveMemory,
  payload: string,
  outcome: SaveOutcome,
  mint: () => string,
): { memory: SaveMemory; editsLost: boolean } {
  if (outcome.kind === "saved") {
    const uncertain = memory.uncertainPayloads;
    const editsLost = outcome.duplicate && uncertain.length > 0 && !(uncertain.length === 1 && uncertain[0] === payload);
    return { memory: { key: mint(), failedPayload: null, uncertainPayloads: [] }, editsLost };
  }
  if (outcome.kind === "refused") return { memory: { ...memory, failedPayload: payload }, editsLost: false };
  const uncertainPayloads = memory.uncertainPayloads.includes(payload) ? memory.uncertainPayloads : [...memory.uncertainPayloads, payload];
  return { memory: { ...memory, uncertainPayloads }, editsLost: false };
}

/**
 * Everything Ryan can change, frozen while a save is in flight. The success
 * view replaces the form, so an edit made during "Saving..." would never be
 * sent and never be mentioned. A disabled fieldset turns off every input,
 * radio, checkbox, textarea, and chip button; inert also stops the two
 * <details> toggles, which are not form controls.
 */
export function SavingLock({ busy, children }: { busy: boolean; children: ReactNode }) {
  return (
    <fieldset disabled={busy} inert={busy} aria-busy={busy} className="m-0 min-w-0 border-0 p-0">
      {children}
    </fieldset>
  );
}

/**
 * Coming back to the page after a call link was tapped. Ryan often switches
 * back in the middle of a call to read the card (their words, the prices), so
 * nothing here moves focus or scrolls: it only says whether to show the "Log
 * how the call went" button. The tap stays armed until step 1 is answered,
 * so a glance during the call does not use it up before the call ends.
 */
export function showsLogPrompt(state: { visible: boolean; called: boolean; outcome: CallOutcome | null; reach?: Reach | null }): boolean {
  return state.visible && state.called && state.outcome === null && !state.reach;
}

/** A small button, fixed above the iPhone home bar, that takes Ryan to "Did you reach them?" only when he taps it. */
export function LogCallPrompt({ onClick }: { onClick: () => void }) {
  return (
    <div className="pointer-events-none fixed inset-x-0 bottom-0 z-40 flex justify-center px-4 pb-[calc(1rem+env(safe-area-inset-bottom))]">
      <button
        type="button"
        onClick={onClick}
        className={`pointer-events-auto inline-flex min-h-[44px] items-center rounded-full bg-[var(--blue)] px-5 py-2 text-sm font-bold text-white shadow-lg ${FOCUS}`}
      >
        Log how the call went
      </button>
    </div>
  );
}

function failureMessage(status: number, data: unknown): string {
  const said = isRecord(data) && typeof data.error === "string" ? data.error.trim() : "";
  const kept = "Everything you entered is still here.";
  if (status === 401) return `You are signed out, so nothing was saved. Sign in again in another tab, then tap Save. ${kept}`;
  if (isRecord(data) && data.retryable === true) {
    return `${said || "The call did not finish saving."} ${kept} Saving again will not double anything up.`;
  }
  if (said) return `${withPeriod(said)} ${kept}`;
  return `The call did not save. ${kept} Try again in a moment.`;
}

export type SavedCallViewProps = {
  saved: SavedCall;
  /** firstName(lead.full_name): "" when there is no usable name. */
  leadFirstName: string;
  compact?: boolean;
  canText: boolean;
  smsHref: string | null;
  hasEmail: boolean;
  mailHref: string | null;
  noTextReason?: string | null;
  noEmailReason?: string | null;
  proposalAllowed?: boolean;
  /** nextCallLink(queue, sample): the call card's "Next call", or null for no change. */
  nextCall: { href: string; label: string } | null;
  backHref: string;
  backLabel: string;
  onLogAnother: () => void;
  /** The panel focuses it after a save, so a screen reader and a thumb both land on it. */
  statusRef?: RefObject<HTMLDivElement | null>;
};

/**
 * What a save hands back: the saved sentence, anything to check, the pay
 * links and a message Ryan sends himself, then what to do next. With a queue,
 * "Next call" comes first and the rest step back.
 */
export function SavedCallView({
  saved,
  leadFirstName,
  compact = false,
  canText,
  smsHref,
  hasEmail,
  mailHref,
  noTextReason = null,
  noEmailReason = null,
  proposalAllowed = false,
  nextCall,
  backHref,
  backLabel,
  onLogAnother,
  statusRef,
}: SavedCallViewProps) {
  const headingId = `${useId()}-saved`;
  const first = leadFirstName;
  const who = first || "the lead";
  const HeadingTag = compact ? "h2" : "h3";
  const doors = saved.payDoors;
  const message = saved.payMessage;
  const textHref = message && canText && smsHref ? `${smsHref}?&body=${encodeURIComponent(message)}` : null;
  const emailHref =
    message && hasEmail && mailHref
      ? `${mailHref}?subject=${encodeURIComponent("The link we talked about")}&body=${encodeURIComponent(message)}`
      : null;
  return (
    <section className={`card min-w-0 ${compact ? "!p-4" : "!p-4 sm:!p-5"}`} aria-labelledby={headingId}>
      <div
        ref={statusRef}
        role="status"
        tabIndex={-1}
        className="rounded-xl border-2 border-[var(--green)] p-4 [background:linear-gradient(var(--green-tint),var(--green-tint)),var(--panel)] focus:outline focus:outline-2 focus:outline-offset-2 focus:outline-[var(--blue)]"
      >
        <div className="flex items-center gap-2">
          <CheckCircle2 aria-hidden="true" className="h-6 w-6 shrink-0 text-[var(--green)]" />
          <HeadingTag id={headingId} className="text-base font-black text-[var(--green)]">
            {saved.duplicate ? "Already saved" : "Saved"}
          </HeadingTag>
        </div>
        <p className="mt-1 text-sm text-[var(--text)]">{saved.summary}</p>
        {saved.nextFollowUpLabel ? (
          <p className="mt-2 text-sm text-[var(--text)]">
            <span className="font-bold">Next follow-up:</span> {saved.nextFollowUpLabel} Central. {first || "The lead"} shows as due
            again then.
          </p>
        ) : null}
        {saved.warnings.length > 0 ? (
          <div className="mt-3 rounded-lg border border-[var(--warn-line)] bg-[var(--warn-tint)] p-3 text-sm text-[var(--text)]">
            <p className="font-bold">Saved, with {saved.warnings.length === 1 ? "one thing" : "a few things"} to check:</p>
            <ul className="mt-1 list-disc pl-5">
              {saved.warnings.map((w) => (
                <li key={w}>{w}</li>
              ))}
            </ul>
          </div>
        ) : null}
      </div>

      {doors.length > 0 ? (
        <div className="mt-4">
          <p className="text-sm font-black text-[var(--heading)]">
            Pay {doors.length === 1 ? "link" : "links"} to send {who} yourself
          </p>
          <ul className="mt-2 grid gap-3">
            {doors.map((door) => (
              <li key={door.offerId} className="min-w-0 rounded-xl border border-[var(--line)] bg-[var(--panel)] p-3">
                <p className="font-bold text-[var(--heading)]">
                  {door.offerName} <span className="font-semibold text-[var(--muted)]">{door.priceLabel}</span>
                </p>
                <p className="mt-1 text-sm text-[var(--muted)]">{withPeriod(door.howTheyPay)}</p>
                {door.url ? (
                  <div className="mt-2 flex flex-wrap items-center gap-2">
                    <span className="min-w-0 break-all text-sm text-[var(--text)]">{door.url}</span>
                    <CopyButton value={door.url} label="Copy link" />
                  </div>
                ) : null}
              </li>
            ))}
          </ul>
          {message ? (
            <div className="mt-4">
              <p className="text-sm font-bold text-[var(--heading)]">A message you can send</p>
              <p className="mt-1 whitespace-pre-wrap [overflow-wrap:anywhere] rounded-lg border border-[var(--line)] bg-[var(--panel)] p-3 text-sm text-[var(--text)]">
                {message}
              </p>
              <div className="mt-2 flex flex-wrap gap-2">
                <CopyButton value={message} label="Copy message" />
                {textHref ? (
                  <a href={textHref} className={LINK_ACCENT}>
                    Open a text with this message
                  </a>
                ) : null}
                {emailHref ? (
                  <a href={emailHref} className={BUTTON_QUIET}>
                    Open an email draft
                  </a>
                ) : null}
              </div>
              <p className="mt-2 text-xs text-[var(--muted)]">
                Nothing goes to {who} until you send it from your own phone or email.
                {textHref ? "" : ` There is no text button because ${noTextReason || "there is no text consent on file"}.`}
                {emailHref ? "" : ` There is no email button because ${noEmailReason || "there is no email on file"}.`}
              </p>
            </div>
          ) : null}
        </div>
      ) : null}

      {/* Working the queue: the next call is the first thing to tap, and everything else steps back. */}
      {nextCall ? (
        <div className="mt-4">
          <a href={nextCall.href} data-next-call="" className={`btn-primary min-h-[56px] w-full !px-5 text-base sm:w-auto ${FOCUS}`}>
            {nextCall.label}
            <ArrowRight aria-hidden="true" className="h-5 w-5 shrink-0" />
          </a>
        </div>
      ) : null}
      <div className={`${nextCall ? "mt-3" : "mt-4"} flex flex-wrap gap-2`}>
        {proposalAllowed && saved.proposalHref ? (
          <a href={saved.proposalHref} className={nextCall ? LINK_ACCENT : `btn-primary min-h-[44px] !px-4 text-sm ${FOCUS}`}>
            Draft the proposal now
          </a>
        ) : null}
        <button type="button" onClick={onLogAnother} className={BUTTON_QUIET}>
          Log another call
        </button>
        <a href={backHref} className={BUTTON_QUIET}>
          {backLabel}
        </a>
      </div>
    </section>
  );
}

export default function CallOutcomePanel({
  lead,
  suggestedOffers,
  initialOffers,
  priorAttempts,
  actorName,
  smsHref,
  mailHref,
  canText,
  hasEmail,
  noTextReason = null,
  noEmailReason = null,
  defaultMeetingPlace = null,
  proposalAllowed = false,
  compact = false,
  sample = false,
  fixedNow = null,
  initialOutcome = null,
  initialReach = null,
  queue = null,
  backHref = "/admin/call-sheet",
  backLabel = "Back to the call sheet",
  onSaved,
}: CallOutcomePanelProps) {
  const uid = useId();
  const ids = {
    title: `${uid}-title`,
    reach: `${uid}-reach`,
    next: `${uid}-next`,
    hint: `${uid}-hint`,
    pick: `${uid}-pick`,
    note: `${uid}-note`,
    preview: `${uid}-preview`,
  };

  const featured = useMemo(() => uniqueOffers([...(initialOffers ?? []), ...suggestedOffers]), [initialOffers, suggestedOffers]);
  const others = useMemo(() => closerOffers().filter((d) => !featured.includes(d.offerId)), [featured]);
  // The offers named on the last call, or only the primary suggestion. The
  // companions and add-ons stay unchecked, one tap away.
  const startingOffers = useMemo(
    () =>
      initialOffers && initialOffers.length
        ? uniqueOffers(initialOffers).slice(0, MAX_CALL_OFFERS)
        : uniqueOffers(suggestedOffers).slice(0, 1),
    [initialOffers, suggestedOffers],
  );
  // Ready to pay now: the offers named on the last call, else the first
  // suggestion that can be paid today, else nothing ("Pick what they are
  // paying for today"). Never an offer that takes no money online.
  const payStartingOffers = useMemo(() => {
    const named = uniqueOffers(initialOffers ?? []);
    if (named.length) return named.slice(0, MAX_CALL_OFFERS);
    const payable = uniqueOffers(suggestedOffers).find((id) => {
      const door = payDoorFor(id);
      return door !== null && isPayableToday(door, lead.status);
    });
    return payable ? [payable] : [];
  }, [initialOffers, suggestedOffers, lead.status]);
  const startingPlace = MEETING_PLACES.find((p) => p.place === defaultMeetingPlace)?.id ?? "";

  // Step 1 and the outcome. A miss or a voicemail is both at once; "talked" waits for step 2.
  const givenOutcome = reachFor(initialOutcome) ? initialOutcome : null;
  const startReach = reachFor(givenOutcome) ?? initialReach;
  const [reach, setReach] = useState<Reach | null>(startReach);
  const [outcome, setOutcome] = useState<CallOutcome | null>(givenOutcome ?? (startReach ? outcomeForReach(startReach) : null));
  const [meetingDate, setMeetingDate] = useState("");
  const [meetingTime, setMeetingTime] = useState("");
  const [placeChoice, setPlaceChoice] = useState<string>(startingPlace);
  const [placeOther, setPlaceOther] = useState("");
  const [callbackDate, setCallbackDate] = useState("");
  const [callbackTime, setCallbackTime] = useState("");
  const [retryOpen, setRetryOpen] = useState(false);
  const [talkedOpen, setTalkedOpen] = useState(false);
  // The offers a proposal or a payment is for. Starts with the last call's offers or the primary suggestion.
  const [offers, setOffers] = useState<CloserOfferId[]>(startingOffers);
  // What Ready to pay now is for: its own list, so a proposal pick never blocks a payment.
  const [payOffers, setPayOffers] = useState<CloserOfferId[]>(payStartingOffers);
  // What "Talked about an offer?" records on a sit-down or a call back. Starts
  // empty: opening the list must not claim an offer nobody mentioned.
  const [talkedOffers, setTalkedOffers] = useState<CloserOfferId[]>([]);
  const [logPrompt, setLogPrompt] = useState(false);
  const [lostReason, setLostReason] = useState("");
  const [note, setNote] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [saved, setSaved] = useState<SavedCall | null>(null);
  // The browser clock is read after mount, so the server render and the
  // first browser render agree. A fixed clock (sample mode) is known at once.
  const fixedMs = fixedNow && Number.isFinite(Date.parse(fixedNow)) ? Date.parse(fixedNow) : null;
  const [nowMs, setNowMs] = useState<number | null>(fixedMs);

  const memoryRef = useRef<SaveMemory>({ key: "", failedPayload: null, uncertainPayloads: [] });
  const calledRef = useRef(false);
  const outcomeRef = useRef<CallOutcome | null>(outcome);
  const reachRef = useRef<Reach | null>(reach);
  const legendRef = useRef<HTMLLegendElement>(null);
  const nextLegendRef = useRef<HTMLLegendElement>(null);
  const statusRef = useRef<HTMLDivElement>(null);
  const hintRef = useRef<HTMLParagraphElement>(null);
  const alertRef = useRef<HTMLParagraphElement>(null);

  useEffect(() => {
    if (!memoryRef.current.key) memoryRef.current = { ...memoryRef.current, key: mintKey() };
  }, []);

  useEffect(() => {
    outcomeRef.current = outcome;
    reachRef.current = reach;
  }, [outcome, reach]);

  useEffect(() => {
    if (fixedMs !== null) {
      setNowMs(fixedMs);
      return;
    }
    setNowMs(Date.now());
    const timer = window.setInterval(() => setNowMs(Date.now()), CLOCK_TICK_MS);
    return () => window.clearInterval(timer);
  }, [fixedMs]);

  // Back from the phone app: offer the way to "Did you reach them?" without
  // moving the page (see showsLogPrompt). Either step, reset(), and a save disarm it.
  useEffect(() => {
    function onClick(event: MouseEvent) {
      const target = event.target instanceof Element ? event.target : null;
      if (target?.closest('a[href^="tel:"]')) calledRef.current = true;
    }
    function onVisibility() {
      if (
        showsLogPrompt({
          visible: document.visibilityState === "visible",
          called: calledRef.current,
          outcome: outcomeRef.current,
          reach: reachRef.current,
        })
      ) {
        setLogPrompt(true);
      }
    }
    document.addEventListener("click", onClick, true);
    document.addEventListener("visibilitychange", onVisibility);
    return () => {
      document.removeEventListener("click", onClick, true);
      document.removeEventListener("visibilitychange", onVisibility);
    };
  }, []);

  useEffect(() => {
    if (saved) statusRef.current?.focus();
  }, [saved]);

  // A failed save: take focus to the message, so a screen reader and the
  // keyboard land on what went wrong instead of on the page itself.
  useEffect(() => {
    if (error) alertRef.current?.focus();
  }, [error]);

  const now = nowMs === null ? null : new Date(nowMs);
  const first = firstName(lead.full_name);
  const who = first || "the lead";
  const today = now ? centralDate(now) : undefined;
  const lastDay = now ? centralDate(new Date(now.getTime() + MAX_DAYS_AHEAD * DAY_MS)) : undefined;
  const quickChoices = useMemo(() => (nowMs === null ? [] : quickCallbackChoices(new Date(nowMs))), [nowMs]);

  const sendsOffers = outcome !== null && (OFFER_REQUIRED.has(outcome) || (OFFER_OPTIONAL.has(outcome) && talkedOpen));
  const sendsCallback = outcome === "call_back" || (outcome !== null && UNANSWERED.has(outcome) && retryOpen);
  const place = placeChoice === "other" ? placeOther : (MEETING_PLACES.find((p) => p.id === placeChoice)?.place ?? "");
  // The list the offer picker shows and changes: the optional "Talked about an offer?" list, or the required one.
  const talking = outcome !== null && OFFER_OPTIONAL.has(outcome);
  const paying = outcome === "ready_to_pay";
  const picked = talking ? talkedOffers : paying ? payOffers : offers;

  // Exactly what Save posts, minus the key.
  const body = useMemo(() => {
    if (!outcome) return null;
    return {
      outcome,
      note: note.trim() ? note : null,
      offers: !sendsOffers ? [] : outcome === "ready_to_pay" ? payOffers : OFFER_REQUIRED.has(outcome) ? offers : talkedOffers,
      meeting_date: outcome === "booked" ? meetingDate || null : null,
      meeting_time: outcome === "booked" ? meetingTime || null : null,
      meeting_place: outcome === "booked" ? place.trim() || null : null,
      callback_date: sendsCallback ? callbackDate || null : null,
      callback_time: sendsCallback ? callbackTime || null : null,
      lost_reason: outcome === "not_a_fit" ? lostReason || null : null,
    };
  }, [outcome, note, sendsOffers, offers, payOffers, talkedOffers, meetingDate, meetingTime, place, sendsCallback, callbackDate, callbackTime, lostReason]);

  const plan: CallPlan | { ok: false; error: string } | null = useMemo(() => {
    if (!body || nowMs === null) return null;
    const parsed = parseNextStepRequest({ ...body, idempotency_key: PREVIEW_KEY });
    if (!parsed.ok) return { ok: false, error: parsed.error };
    const result = planCallOutcome({ lead, request: parsed.request, actorName, now: new Date(nowMs), priorAttempts });
    return result.ok ? result : { ok: false, error: result.error };
  }, [body, nowMs, lead, actorName, priorAttempts]);

  /** The call is being logged, so the "Log how the call went" button has done its job. */
  function disarmLogPrompt() {
    calledRef.current = false;
    setLogPrompt(false);
  }

  /** Move focus to a question, unless Ryan is typing in a field: focus is never pulled out of one. */
  function focusQuestion(ref: RefObject<HTMLLegendElement | null>) {
    if (typeof document !== "undefined" && isTypingField(document.activeElement as HTMLElement | null)) return;
    ref.current?.focus();
  }

  /** Step 1. The note and everything else typed stay; only the outcome follows the answer. */
  function chooseReach(next: Reach) {
    setReach(next);
    setOutcome(outcomeForReach(next));
    setError("");
    disarmLogPrompt();
  }

  /** Step 2, after "Yes, we talked". */
  function choose(next: CallOutcome) {
    setOutcome(next);
    setError("");
    disarmLogPrompt();
  }

  function toggleOffer(id: CloserOfferId, on: boolean) {
    const setPicked = talking ? setTalkedOffers : paying ? setPayOffers : setOffers;
    setPicked((current) => (on ? (current.includes(id) || current.length >= MAX_CALL_OFFERS ? current : [...current, id]) : current.filter((x) => x !== id)));
  }

  function reset() {
    disarmLogPrompt();
    setSaved(null);
    setReach(null);
    setOutcome(null);
    setMeetingDate("");
    setMeetingTime("");
    setPlaceChoice(startingPlace);
    setPlaceOther("");
    setCallbackDate("");
    setCallbackTime("");
    setRetryOpen(false);
    setTalkedOpen(false);
    setOffers(startingOffers);
    setPayOffers(payStartingOffers);
    setTalkedOffers([]);
    setLostReason("");
    setNote("");
    setError("");
    window.setTimeout(() => focusQuestion(legendRef), 0);
  }

  async function save(event: React.FormEvent) {
    event.preventDefault();
    if (sample || busy) return;
    // Not ready yet: take Ryan to what is missing instead of posting. The
    // hint already says it in words, so there is no second alert to go stale.
    if (!outcome || !body) {
      focusQuestion(reach === "talked" ? nextLegendRef : legendRef);
      return;
    }
    if (plan && !plan.ok) {
      hintRef.current?.focus();
      return;
    }
    const payload = JSON.stringify(body);
    const key = keyForSave(memoryRef.current, payload, mintKey);
    memoryRef.current = { ...memoryRef.current, key };
    setBusy(true);
    setError("");
    try {
      let response: Response | null = null;
      let data: unknown = null;
      try {
        response = await fetch(`/api/admin/leads/${encodeURIComponent(lead.id)}/next-step`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ ...body, idempotency_key: key }),
        });
        try {
          data = await response.json();
        } catch {
          data = null;
        }
      } catch {
        response = null;
      }
      const ended = classifySave(response, data);
      const next = afterSave(memoryRef.current, payload, ended, mintKey);
      memoryRef.current = next.memory;
      const result = ended.kind === "saved" ? readSaved(data, outcome) : null;
      if (!result) {
        setError(ended.kind === "refused" && response ? failureMessage(response.status, data) : UNCERTAIN_SAVE_MESSAGE);
        return;
      }
      const shown = next.editsLost ? { ...result, warnings: [EDITS_NOT_SAVED_WARNING, ...result.warnings] } : result;
      disarmLogPrompt();
      setSaved(shown);
      onSaved?.(shown);
    } finally {
      setBusy(false);
    }
  }

  const HeadingTag = compact ? "h2" : "h3";

  if (saved) {
    return (
      <SavedCallView
        saved={saved}
        leadFirstName={first}
        compact={compact}
        canText={canText}
        smsHref={smsHref}
        hasEmail={hasEmail}
        mailHref={mailHref}
        noTextReason={noTextReason}
        noEmailReason={noEmailReason}
        proposalAllowed={proposalAllowed}
        nextCall={nextCallLink(queue, sample)}
        backHref={backHref}
        backLabel={backLabel}
        onLogAnother={reset}
        statusRef={statusRef}
      />
    );
  }

  const featuredDoors = featured.map((id) => payDoorFor(id)).filter((d): d is PayDoor => d !== null);
  // Ready to pay now lists what can be paid today first (the planner's rule):
  // the offers named on the last call, then payable suggestions, then every
  // other payable offer. The rest wait under a summary that says why.
  const payableToday = (door: PayDoor) => isPayableToday(door, lead.status);
  const namedDoors = uniqueOffers(initialOffers ?? [])
    .map((id) => payDoorFor(id))
    .filter((d): d is PayDoor => d !== null);
  const shownDoors = paying
    ? [...namedDoors, ...featuredDoors.filter(payableToday), ...others.filter(payableToday)].filter(
        (door, i, all) => all.findIndex((d) => d.offerId === door.offerId) === i,
      )
    : featuredDoors;
  const shownIds = shownDoors.map((d) => d.offerId);
  const hiddenDoors = paying
    ? [...featuredDoors, ...others].filter((door) => !shownIds.includes(door.offerId))
    : others;
  const chosenElsewhere = picked.filter((id) => !shownIds.includes(id)).length;
  const moreLabel = paying ? "Offers that cannot be paid online today" : "More offers";
  const offerLegend =
    outcome === "wants_proposal"
      ? "What goes in the proposal? Pick up to three."
      : outcome === "ready_to_pay"
        ? "What are they paying for? Pick up to three."
        : "Which offers did you talk about? Up to three.";

  const offerRow = (door: PayDoor) => {
    const id = `${uid}-offer-${door.offerId}`;
    const checked = picked.includes(door.offerId);
    const full = !checked && picked.length >= MAX_CALL_OFFERS;
    return (
      <li key={door.offerId}>
        <label htmlFor={id} className={`${TILE_BASE} items-start ${checked ? TILE_ON : TILE_OFF} ${full ? "cursor-not-allowed opacity-60" : ""}`}>
          <input
            id={id}
            type="checkbox"
            className={`${RADIO} mt-0.5`}
            checked={checked}
            disabled={full}
            onChange={(e) => toggleOffer(door.offerId, e.target.checked)}
          />
          <span className="min-w-0">
            <span className="block">
              {door.offerName} <span className="font-semibold text-[var(--muted)]">{door.priceLabel}</span>
            </span>
            <span className="mt-0.5 block text-xs font-normal text-[var(--muted)]">
              {outcome === "ready_to_pay" ? payTodayLabel(door, lead.status) : ""}
              {withPeriod(door.howTheyPay)}
            </span>
          </span>
        </label>
      </li>
    );
  };

  const offerPicker = (
    <fieldset className="min-w-0">
      <legend className={SUBLEGEND}>{offerLegend}</legend>
      <ul className="grid gap-2">{shownDoors.map(offerRow)}</ul>
      {hiddenDoors.length > 0 ? (
        <details className="mt-2">
          <summary className={SUMMARY}>
            {moreLabel}
            {chosenElsewhere ? ` (${chosenElsewhere} chosen)` : ""}
          </summary>
          <ul className="mt-2 grid gap-2">{hiddenDoors.map(offerRow)}</ul>
        </details>
      ) : null}
      {picked.length >= MAX_CALL_OFFERS ? (
        <p className="mt-2 text-xs text-[var(--muted)]">Three is the most one call can name. Uncheck one to pick another.</p>
      ) : null}
    </fieldset>
  );

  const timeFields = (kind: "meeting" | "callback") => {
    const date = kind === "meeting" ? meetingDate : callbackDate;
    const time = kind === "meeting" ? meetingTime : callbackTime;
    const setDate = kind === "meeting" ? setMeetingDate : setCallbackDate;
    const setTime = kind === "meeting" ? setMeetingTime : setCallbackTime;
    return (
      <div className="grid grid-cols-2 gap-2">
        <div className="min-w-0">
          <label htmlFor={`${uid}-${kind}-date`} className="mb-1 block text-sm font-semibold text-[var(--text)]">
            Day
          </label>
          <input
            id={`${uid}-${kind}-date`}
            type="date"
            className="input min-h-[44px] min-w-0 !px-3 text-base sm:text-sm"
            value={date}
            min={today}
            max={lastDay}
            onChange={(e) => setDate(e.target.value)}
          />
        </div>
        <div className="min-w-0">
          <label htmlFor={`${uid}-${kind}-time`} className="mb-1 block text-sm font-semibold text-[var(--text)]">
            Time (Central)
          </label>
          <input
            id={`${uid}-${kind}-time`}
            type="time"
            className="input min-h-[44px] min-w-0 !px-3 text-base sm:text-sm"
            value={time}
            onChange={(e) => setTime(e.target.value)}
          />
        </div>
      </div>
    );
  };

  const quickChips = quickChoices.length ? (
    <div className="mb-3 flex flex-wrap gap-2" role="group" aria-label="Quick call back times">
      {quickChoices.map((choice) => {
        const on = callbackDate === choice.localDate && callbackTime === choice.time;
        return (
          <button
            key={choice.id}
            type="button"
            aria-pressed={on}
            onClick={() => {
              setCallbackDate(choice.localDate);
              setCallbackTime(choice.time);
            }}
            className={`${CHIP} ${on ? TILE_ON : TILE_OFF}`}
          >
            {choice.label}
          </button>
        );
      })}
    </div>
  ) : null;

  const noteLabel = outcome === "not_a_fit" && lostReason === "other" ? "Why is it not a fit? The first line is saved as the reason." : "Note (optional)";
  // Why Save is off, in words. The sample's button already says why it never saves.
  const saveWaitsFor = sample ? null : pickHint(reach, outcome);

  return (
    <section className={`card min-w-0 ${compact ? "!p-4" : "!p-4 sm:!p-5"}`} aria-labelledby={ids.title}>
      <HeadingTag id={ids.title} className={`${compact ? "text-base" : "text-lg"} font-black text-[var(--heading)]`}>
        How did the call go?
      </HeadingTag>
      <p className="mb-4 mt-1 text-sm text-[var(--muted)]">Tap what happened. Nothing is sent to {who}.</p>
      <form onSubmit={save} noValidate>
        <SavingLock busy={busy}>
          <fieldset className="min-w-0">
            <legend id={ids.reach} ref={legendRef} tabIndex={-1} className={STEP_LEGEND}>
              Did you reach them?
            </legend>
            <div className="grid gap-2 sm:grid-cols-3">
              {REACH_CHOICES.map((r) => {
                const id = `${uid}-reach-${r.id}`;
                const on = reach === r.id;
                return (
                  <label key={r.id} htmlFor={id} className={`${BIG_TILE} ${on ? TILE_ON : TILE_OFF}`}>
                    <input id={id} type="radio" name={`${uid}-reach`} value={r.id} checked={on} onChange={() => chooseReach(r.id)} className={RADIO} />
                    <span className="min-w-0">{r.label}</span>
                  </label>
                );
              })}
            </div>
          </fieldset>

          {reach === "talked" ? (
            <fieldset className="mt-5 min-w-0">
              <legend id={ids.next} ref={nextLegendRef} tabIndex={-1} className={STEP_LEGEND}>
                What happens next?
              </legend>
              <div className="grid grid-cols-2 gap-2">
                {NEXT_OUTCOMES.map((o) => {
                  const id = `${uid}-outcome-${o}`;
                  const on = outcome === o;
                  return (
                    <label key={o} htmlFor={id} className={`${TILE} ${on ? TILE_ON : TILE_OFF}`}>
                      <input id={id} type="radio" name={`${uid}-outcome`} value={o} checked={on} onChange={() => choose(o)} className={RADIO} />
                      <span className="min-w-0">{nextStepLabel(o)}</span>
                    </label>
                  );
                })}
              </div>
            </fieldset>
          ) : null}

          {outcome === "booked" ? (
            <div className="mt-5 grid gap-4">
              <fieldset className="min-w-0">
                <legend className={SUBLEGEND}>When is the sit-down?</legend>
                {timeFields("meeting")}
              </fieldset>
              <fieldset className="min-w-0">
                <legend className={SUBLEGEND}>Where? (optional)</legend>
                <div className="flex flex-wrap gap-2">
                  {[...MEETING_PLACES, { id: "other", label: "Somewhere else", place: "" }].map((p) => {
                    const id = `${uid}-place-${p.id}`;
                    const on = placeChoice === p.id;
                    return (
                      <label key={p.id} htmlFor={id} className={`${TILE} ${on ? TILE_ON : TILE_OFF} font-semibold`}>
                        <input
                          id={id}
                          type="radio"
                          name={`${uid}-place`}
                          value={p.id}
                          checked={on}
                          onChange={() => setPlaceChoice(p.id)}
                          className={RADIO}
                        />
                        <span>{p.label}</span>
                      </label>
                    );
                  })}
                </div>
                {placeChoice === "other" ? (
                  <div className="mt-2">
                    <label htmlFor={`${uid}-place-text`} className="mb-1 block text-sm font-semibold text-[var(--text)]">
                      Where exactly
                    </label>
                    <input
                      id={`${uid}-place-text`}
                      className="input min-h-[44px] text-base sm:text-sm"
                      value={placeOther}
                      maxLength={MEETING_PLACE_MAX}
                      placeholder="Their shop, a job site, a coffee shop"
                      onChange={(e) => setPlaceOther(e.target.value)}
                    />
                  </div>
                ) : null}
              </fieldset>
            </div>
          ) : null}

          {outcome === "call_back" ? (
            <fieldset className="mt-5 min-w-0">
              <legend className={SUBLEGEND}>When should you call back?</legend>
              {quickChips}
              {timeFields("callback")}
            </fieldset>
          ) : null}

          {outcome && UNANSWERED.has(outcome) ? (
            <details
              className="mt-5"
              open={retryOpen}
              onToggle={(e) => {
                if (!busy) setRetryOpen(e.currentTarget.open);
              }}
            >
              <summary className={SUMMARY}>Pick the next try yourself (optional)</summary>
              <fieldset className="mt-2 min-w-0">
                <legend className={SUBLEGEND}>When to try again</legend>
                {quickChips}
                {timeFields("callback")}
                <p className="mt-2 text-xs text-[var(--muted)]">Leave it closed and the next try is set for you, at the other half of the day.</p>
              </fieldset>
            </details>
          ) : null}

          {outcome && OFFER_REQUIRED.has(outcome) ? <div className="mt-5">{offerPicker}</div> : null}

          {outcome && OFFER_OPTIONAL.has(outcome) ? (
            <details
              className="mt-4"
              open={talkedOpen}
              onToggle={(e) => {
                if (!busy) setTalkedOpen(e.currentTarget.open);
              }}
            >
              <summary className={SUMMARY}>Talked about an offer? Add it to the note (optional)</summary>
              <div className="mt-2">{offerPicker}</div>
            </details>
          ) : null}

          {outcome === "not_a_fit" ? (
            <fieldset className="mt-5 min-w-0">
              <legend className={SUBLEGEND}>Why is it not a fit?</legend>
              <div className="grid gap-2 sm:grid-cols-2">
                {LOST_REASONS.map((r) => {
                  const id = `${uid}-lost-${r.id}`;
                  const on = lostReason === r.id;
                  return (
                    <label key={r.id} htmlFor={id} className={`${TILE} ${on ? TILE_ON : TILE_OFF} font-semibold`}>
                      <input
                        id={id}
                        type="radio"
                        name={`${uid}-lost`}
                        value={r.id}
                        checked={on}
                        onChange={() => setLostReason(r.id)}
                        className={RADIO}
                      />
                      <span>{r.label}</span>
                    </label>
                  );
                })}
              </div>
            </fieldset>
          ) : null}

          {/* Open from step 1 on, so Ryan can jot what was said while he decides what happens next. */}
          {reach ? (
            <div className="mt-5">
              <label htmlFor={ids.note} className="mb-1 block text-sm font-semibold text-[var(--text)]">
                {noteLabel}
              </label>
              <textarea
                id={ids.note}
                className="input text-base sm:text-sm"
                rows={compact ? 2 : 3}
                maxLength={NEXT_STEP_NOTE_MAX}
                value={note}
                placeholder={reach === "talked" ? `What ${who} said, in a line or two` : "Anything to remember for next time"}
                onChange={(e) => setNote(e.target.value)}
              />
            </div>
          ) : null}

          {outcome && plan ? (
            plan.ok ? (
              <div id={ids.preview} className="mt-5 rounded-xl border border-[var(--line)] bg-[var(--page)] p-4">
                <p className="text-sm font-black text-[var(--heading)]">What saving does</p>
                <ul className="mt-2 grid list-disc gap-1 pl-5 text-sm text-[var(--text)]">
                  {plan.preview.map((lineText, i) => (
                    <li key={`${i}-${lineText}`}>{lineText}</li>
                  ))}
                </ul>
                <p className="mt-3 break-words text-xs text-[var(--muted)]">
                  <span className="font-bold">The note starts:</span> {plan.noteBody.split("\n")[0]}
                </p>
              </div>
            ) : (
              <p
                id={ids.hint}
                ref={hintRef}
                tabIndex={-1}
                className="mt-5 rounded-xl border border-[var(--warn-line)] bg-[var(--warn-tint)] p-3 text-sm text-[var(--text)] focus:outline focus:outline-2 focus:outline-offset-2 focus:outline-[var(--blue)]"
              >
                <span className="font-bold">Before you save:</span> {plan.error}
              </p>
            )
          ) : null}
        </SavingLock>

        {error ? (
          <p
            ref={alertRef}
            role="alert"
            tabIndex={-1}
            className="mt-4 rounded-lg border border-[var(--danger-line)] bg-[var(--danger-tint)] p-3 text-sm text-[var(--danger)] focus:outline focus:outline-2 focus:outline-offset-2 focus:outline-[var(--blue)]"
          >
            {error}
          </p>
        ) : null}

        <div className="mt-5 flex flex-wrap items-center gap-3">
          <button
            type="submit"
            disabled={sample || busy || !outcome}
            aria-describedby={saveWaitsFor ? ids.pick : outcome && plan && !plan.ok ? ids.hint : undefined}
            className={`btn-primary min-h-[44px] w-full !px-5 text-sm disabled:cursor-not-allowed disabled:opacity-60 sm:w-auto ${FOCUS}`}
          >
            {sample ? "Sample only, nothing is saved" : busy ? "Saving..." : "Save the call"}
          </button>
          {saveWaitsFor ? (
            <p id={ids.pick} className="w-full text-sm font-semibold text-[var(--muted)] sm:w-auto">
              {saveWaitsFor}
            </p>
          ) : null}
          {!compact ? (
            <a href={backHref} className={`inline-flex min-h-[44px] items-center px-1 text-sm font-semibold text-[var(--blue)] ${FOCUS}`}>
              {backLabel}
            </a>
          ) : null}
        </div>
      </form>
      {logPrompt && !reach ? (
        <LogCallPrompt
          onClick={() => {
            setLogPrompt(false);
            // He asked to go there, so moving the page is right this time (never out of a field he is typing in).
            focusQuestion(legendRef);
          }}
        />
      ) : null}
    </section>
  );
}
