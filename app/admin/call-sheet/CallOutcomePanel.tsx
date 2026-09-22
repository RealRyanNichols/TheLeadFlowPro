"use client";

import { useEffect, useId, useMemo, useRef, useState } from "react";
import CopyButton from "@/app/hq/_components/CopyButton";
import { centralDate, quickCallbackChoices } from "@/lib/businessTime";
import {
  LOST_REASONS,
  MAX_CALL_OFFERS,
  MAX_DAYS_AHEAD,
  MEETING_PLACES,
  MEETING_PLACE_MAX,
  NEXT_STEP_NOTE_MAX,
  OUTCOME_LABELS,
  PANEL_OUTCOMES,
  firstName,
  parseNextStepRequest,
  planCallOutcome,
  type CallOutcome,
  type CallPlan,
  type PlannerLead,
} from "@/lib/callCloser";
import { closerOffers, payDoorFor, type CloserOfferId, type PayDoor } from "@/lib/payDoors";

// "How did the call go?" Two taps after a call: pick what happened, read the
// list of what saving does, save. The list is drawn by the same planner the
// save route runs (lib/callCloser.ts), on the browser clock, from the same
// JSON this panel posts, so what Ryan reads before he taps Save is what lands.
//
// Rules this file keeps:
// - The only network call is the POST to /api/admin/leads/<id>/next-step.
//   Nothing here texts, emails, or charges anyone. When a lead is ready to
//   pay, the panel hands Ryan the pay links and a message he sends himself.
// - Every save carries an idempotency key minted on mount. A retry of the same
//   failed save reuses it, so a save that landed before the connection dropped
//   is not written twice. A changed save, or any save after a success, gets a
//   new key.
// - An error keeps everything Ryan entered. A success is announced and gets
//   focus, so a screen reader and a thumb both land on it.
// - After a call link is tapped and the phone app closes, focus comes back to
//   "How did the call go?" if nothing is chosen and Ryan is not typing.
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

export type CallOutcomePanelProps = {
  /** Plain lead fields for the preview. Pass diagnostic as null: the planner does not need it in the browser. */
  lead: PlannerLead;
  /** Offers to have ready (closerOffersFor on the server). Shown first in the offer list. */
  suggestedOffers: CloserOfferId[];
  /** Offers named on the last call. Preselected when present, otherwise the first suggestions are. */
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
  /** Start with an outcome chosen. */
  initialOutcome?: CallOutcome | null;
  backHref?: string;
  backLabel?: string;
  onSaved?: (saved: SavedCall) => void;
};

/** Passes IDEMPOTENCY_KEY_RE. Only ever used for the preview; a real save mints its own. */
const PREVIEW_KEY = "preview-only-key-not-saved";
const CLOCK_TICK_MS = 30_000;
const DAY_MS = 86_400_000;

const FOCUS = "focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--blue)]";
const TILE_BASE = "flex min-h-[44px] cursor-pointer gap-3 rounded-xl border px-3 py-2.5 text-sm font-bold leading-snug";
const TILE = `${TILE_BASE} items-center`;
const TILE_ON = "border-[var(--blue)] bg-[var(--accent-tint)] text-[var(--heading)]";
const TILE_OFF = "border-[var(--line-strong)] bg-[var(--panel)] text-[var(--text)]";
const CHIP = `inline-flex min-h-[44px] items-center rounded-lg border px-3 py-2 text-sm font-semibold ${FOCUS}`;
const BUTTON_QUIET = `inline-flex min-h-[44px] items-center justify-center rounded-lg border border-[var(--line-strong)] bg-[var(--panel)] px-4 py-2 text-sm font-bold text-[var(--text)] ${FOCUS}`;
const LINK_ACCENT = `inline-flex min-h-[44px] items-center justify-center rounded-lg border border-[var(--accent-line)] bg-[var(--accent-tint)] px-4 py-2 text-sm font-bold text-[var(--blue)] ${FOCUS}`;
const RADIO = `h-5 w-5 shrink-0 accent-[var(--blue)] ${FOCUS}`;
const SUBLEGEND = "mb-2 text-sm font-bold text-[var(--heading)]";
const SUMMARY = `flex min-h-[44px] cursor-pointer items-center rounded-lg px-1 text-sm font-bold text-[var(--blue)] ${FOCUS}`;

/** Outcomes whose offers are required and always sent. */
const OFFER_REQUIRED: ReadonlySet<CallOutcome> = new Set<CallOutcome>(["wants_proposal", "ready_to_pay"]);
/** Outcomes where offers are optional: sent only when Ryan opens "Talked about an offer?". */
const OFFER_OPTIONAL: ReadonlySet<CallOutcome> = new Set<CallOutcome>(["booked", "call_back"]);
const UNANSWERED: ReadonlySet<CallOutcome> = new Set<CallOutcome>(["no_answer", "voicemail"]);

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

function isRecord(v: unknown): v is Record<string, unknown> {
  return typeof v === "object" && v !== null && !Array.isArray(v);
}

function strings(v: unknown): string[] {
  return Array.isArray(v) ? v.filter((x): x is string => typeof x === "string") : [];
}

/** The route's 200 body, checked field by field before the panel trusts it. */
function readSaved(data: unknown, outcome: CallOutcome): SavedCall | null {
  if (!isRecord(data) || data.ok !== true || typeof data.summary !== "string") return null;
  return {
    ok: true,
    outcome,
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
  defaultMeetingPlace = null,
  proposalAllowed = false,
  compact = false,
  sample = false,
  fixedNow = null,
  initialOutcome = null,
  backHref = "/admin/call-sheet",
  backLabel = "Back to the call sheet",
  onSaved,
}: CallOutcomePanelProps) {
  const uid = useId();
  const ids = {
    legend: `${uid}-legend`,
    hint: `${uid}-hint`,
    note: `${uid}-note`,
    preview: `${uid}-preview`,
  };

  const featured = useMemo(() => uniqueOffers([...(initialOffers ?? []), ...suggestedOffers]), [initialOffers, suggestedOffers]);
  const others = useMemo(() => closerOffers().filter((d) => !featured.includes(d.offerId)), [featured]);
  const startingOffers = useMemo(
    () => uniqueOffers(initialOffers && initialOffers.length ? initialOffers : suggestedOffers).slice(0, MAX_CALL_OFFERS),
    [initialOffers, suggestedOffers],
  );
  const startingPlace = MEETING_PLACES.find((p) => p.place === defaultMeetingPlace)?.id ?? "";

  const [outcome, setOutcome] = useState<CallOutcome | null>(initialOutcome);
  const [meetingDate, setMeetingDate] = useState("");
  const [meetingTime, setMeetingTime] = useState("");
  const [placeChoice, setPlaceChoice] = useState<string>(startingPlace);
  const [placeOther, setPlaceOther] = useState("");
  const [callbackDate, setCallbackDate] = useState("");
  const [callbackTime, setCallbackTime] = useState("");
  const [retryOpen, setRetryOpen] = useState(false);
  const [talkedOpen, setTalkedOpen] = useState(false);
  const [offers, setOffers] = useState<CloserOfferId[]>(startingOffers);
  const [lostReason, setLostReason] = useState("");
  const [note, setNote] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [saved, setSaved] = useState<SavedCall | null>(null);
  // The browser clock is read after mount, so the server render and the
  // first browser render agree. A fixed clock (sample mode) is known at once.
  const fixedMs = fixedNow && Number.isFinite(Date.parse(fixedNow)) ? Date.parse(fixedNow) : null;
  const [nowMs, setNowMs] = useState<number | null>(fixedMs);

  const keyRef = useRef("");
  const failedPayloadRef = useRef<string | null>(null);
  const calledRef = useRef(false);
  const outcomeRef = useRef<CallOutcome | null>(outcome);
  const legendRef = useRef<HTMLLegendElement>(null);
  const statusRef = useRef<HTMLDivElement>(null);
  const hintRef = useRef<HTMLParagraphElement>(null);

  useEffect(() => {
    keyRef.current = mintKey();
  }, []);

  useEffect(() => {
    outcomeRef.current = outcome;
  }, [outcome]);

  useEffect(() => {
    if (fixedMs !== null) {
      setNowMs(fixedMs);
      return;
    }
    setNowMs(Date.now());
    const timer = window.setInterval(() => setNowMs(Date.now()), CLOCK_TICK_MS);
    return () => window.clearInterval(timer);
  }, [fixedMs]);

  // Back from the phone app: bring "How did the call go?" into view.
  useEffect(() => {
    function onClick(event: MouseEvent) {
      const target = event.target instanceof Element ? event.target : null;
      if (target?.closest('a[href^="tel:"]')) calledRef.current = true;
    }
    function onVisibility() {
      if (document.visibilityState !== "visible" || !calledRef.current) return;
      calledRef.current = false;
      if (outcomeRef.current) return;
      const active = document.activeElement;
      if (active instanceof HTMLElement && active.closest("input, textarea, select, [contenteditable='true']")) return;
      legendRef.current?.focus();
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

  const now = nowMs === null ? null : new Date(nowMs);
  const first = firstName(lead.full_name);
  const who = first || "the lead";
  const today = now ? centralDate(now) : undefined;
  const lastDay = now ? centralDate(new Date(now.getTime() + MAX_DAYS_AHEAD * DAY_MS)) : undefined;
  const quickChoices = useMemo(() => (nowMs === null ? [] : quickCallbackChoices(new Date(nowMs))), [nowMs]);

  const sendsOffers = outcome !== null && (OFFER_REQUIRED.has(outcome) || (OFFER_OPTIONAL.has(outcome) && talkedOpen));
  const sendsCallback = outcome === "call_back" || (outcome !== null && UNANSWERED.has(outcome) && retryOpen);
  const place = placeChoice === "other" ? placeOther : (MEETING_PLACES.find((p) => p.id === placeChoice)?.place ?? "");

  // Exactly what Save posts, minus the key.
  const body = useMemo(() => {
    if (!outcome) return null;
    return {
      outcome,
      note: note.trim() ? note : null,
      offers: sendsOffers ? offers : [],
      meeting_date: outcome === "booked" ? meetingDate || null : null,
      meeting_time: outcome === "booked" ? meetingTime || null : null,
      meeting_place: outcome === "booked" ? place.trim() || null : null,
      callback_date: sendsCallback ? callbackDate || null : null,
      callback_time: sendsCallback ? callbackTime || null : null,
      lost_reason: outcome === "not_a_fit" ? lostReason || null : null,
    };
  }, [outcome, note, sendsOffers, offers, meetingDate, meetingTime, place, sendsCallback, callbackDate, callbackTime, lostReason]);

  const plan: CallPlan | { ok: false; error: string } | null = useMemo(() => {
    if (!body || nowMs === null) return null;
    const parsed = parseNextStepRequest({ ...body, idempotency_key: PREVIEW_KEY });
    if (!parsed.ok) return { ok: false, error: parsed.error };
    const result = planCallOutcome({ lead, request: parsed.request, actorName, now: new Date(nowMs), priorAttempts });
    return result.ok ? result : { ok: false, error: result.error };
  }, [body, nowMs, lead, actorName, priorAttempts]);

  function choose(next: CallOutcome) {
    setOutcome(next);
    setError("");
  }

  function toggleOffer(id: CloserOfferId, on: boolean) {
    setOffers((current) => (on ? (current.includes(id) || current.length >= MAX_CALL_OFFERS ? current : [...current, id]) : current.filter((x) => x !== id)));
  }

  function reset() {
    setSaved(null);
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
    setLostReason("");
    setNote("");
    setError("");
    window.setTimeout(() => legendRef.current?.focus(), 0);
  }

  async function save(event: React.FormEvent) {
    event.preventDefault();
    if (sample || busy) return;
    // Not ready yet: take Ryan to what is missing instead of posting. The
    // hint already says it in words, so there is no second alert to go stale.
    if (!outcome || !body) {
      legendRef.current?.focus();
      return;
    }
    if (plan && !plan.ok) {
      hintRef.current?.focus();
      return;
    }
    const payload = JSON.stringify(body);
    // Same save again after a failure: same key. Anything else: a new one.
    if (!keyRef.current || (failedPayloadRef.current !== null && failedPayloadRef.current !== payload)) {
      keyRef.current = mintKey();
    }
    setBusy(true);
    setError("");
    try {
      const response = await fetch(`/api/admin/leads/${encodeURIComponent(lead.id)}/next-step`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ...body, idempotency_key: keyRef.current }),
      });
      let data: unknown = null;
      try {
        data = await response.json();
      } catch {
        data = null;
      }
      const result = response.ok ? readSaved(data, outcome) : null;
      if (!result) {
        failedPayloadRef.current = payload;
        setError(failureMessage(response.status, data));
        return;
      }
      failedPayloadRef.current = null;
      keyRef.current = mintKey();
      setSaved(result);
      onSaved?.(result);
    } catch {
      failedPayloadRef.current = payload;
      setError("Could not reach the server, so nothing was saved yet. Everything you entered is still here. Check the connection and tap Save again.");
    } finally {
      setBusy(false);
    }
  }

  const HeadingTag = compact ? "h2" : "h3";

  if (saved) {
    const doors = saved.payDoors;
    const message = saved.payMessage;
    const textHref = message && canText && smsHref ? `${smsHref}?&body=${encodeURIComponent(message)}` : null;
    const emailHref =
      message && hasEmail && mailHref
        ? `${mailHref}?subject=${encodeURIComponent("The link we talked about")}&body=${encodeURIComponent(message)}`
        : null;
    return (
      <section className={`card ${compact ? "!p-4" : "!p-4 sm:!p-5"}`} aria-labelledby={`${uid}-saved`}>
        <div
          ref={statusRef}
          role="status"
          tabIndex={-1}
          className="rounded-xl border border-[var(--green-line)] bg-[var(--green-tint)] p-4 focus:outline focus:outline-2 focus:outline-offset-2 focus:outline-[var(--blue)]"
        >
          <HeadingTag id={`${uid}-saved`} className="text-base font-black text-[var(--heading)]">
            {saved.duplicate ? "Already saved" : "Saved"}
          </HeadingTag>
          <p className="mt-1 text-sm text-[var(--text)]">{saved.summary}</p>
          {saved.nextFollowUpLabel ? (
            <p className="mt-2 text-sm text-[var(--text)]">
              <span className="font-bold">Next follow-up:</span> {saved.nextFollowUpLabel} Central. {first || "The lead"} comes back on
              the call sheet then.
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
                <p className="mt-1 whitespace-pre-wrap break-words rounded-lg border border-[var(--line)] bg-[var(--panel)] p-3 text-sm text-[var(--text)]">
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
                  {canText ? "" : " There is no text consent on file, so there is no text button."}
                </p>
              </div>
            ) : null}
          </div>
        ) : null}

        <div className="mt-4 flex flex-wrap gap-2">
          {proposalAllowed && saved.proposalHref ? (
            <a href={saved.proposalHref} className={`btn-primary min-h-[44px] !px-4 text-sm ${FOCUS}`}>
              Draft the proposal now
            </a>
          ) : null}
          <button type="button" onClick={reset} className={BUTTON_QUIET}>
            Log another call
          </button>
          <a href={backHref} className={BUTTON_QUIET}>
            {backLabel}
          </a>
        </div>
      </section>
    );
  }

  const featuredDoors = featured.map((id) => payDoorFor(id)).filter((d): d is PayDoor => d !== null);
  const chosenElsewhere = offers.filter((id) => !featured.includes(id)).length;
  const offerLegend =
    outcome === "wants_proposal"
      ? "What goes in the proposal? Pick up to three."
      : outcome === "ready_to_pay"
        ? "What are they paying for? Pick up to three."
        : "Which offers did you talk about? Up to three.";

  const offerRow = (door: PayDoor) => {
    const id = `${uid}-offer-${door.offerId}`;
    const checked = offers.includes(door.offerId);
    const full = !checked && offers.length >= MAX_CALL_OFFERS;
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
              {outcome === "ready_to_pay" ? (door.payableNow ? "Pays online today. " : "Cannot be paid online today. ") : ""}
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
      <ul className="grid gap-2">{featuredDoors.map(offerRow)}</ul>
      {others.length > 0 ? (
        <details className="mt-2">
          <summary className={SUMMARY}>
            More offers{chosenElsewhere ? ` (${chosenElsewhere} chosen)` : ""}
          </summary>
          <ul className="mt-2 grid gap-2">{others.map(offerRow)}</ul>
        </details>
      ) : null}
      {offers.length >= MAX_CALL_OFFERS ? (
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
            className="input min-h-[44px] min-w-0 !px-3 text-sm"
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
            className="input min-h-[44px] min-w-0 !px-3 text-sm"
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

  return (
    <section className={`card ${compact ? "!p-4" : "!p-4 sm:!p-5"}`} aria-labelledby={ids.legend}>
      <form onSubmit={save} noValidate>
        <fieldset className="min-w-0">
          <legend
            id={ids.legend}
            ref={legendRef}
            tabIndex={-1}
            className={`rounded-md ${compact ? "text-base" : "text-lg"} font-black text-[var(--heading)] focus:outline focus:outline-2 focus:outline-offset-4 focus:outline-[var(--blue)]`}
          >
            How did the call go?
          </legend>
          <p className="mb-3 mt-1 text-sm text-[var(--muted)]">
            Pick what happened. The list below shows exactly what saving does. Nothing is sent to {who}.
          </p>
          <div className="grid grid-cols-2 gap-2">
            {PANEL_OUTCOMES.map((o) => {
              const id = `${uid}-outcome-${o}`;
              const on = outcome === o;
              return (
                <label key={o} htmlFor={id} className={`${TILE} ${on ? TILE_ON : TILE_OFF}`}>
                  <input id={id} type="radio" name={`${uid}-outcome`} value={o} checked={on} onChange={() => choose(o)} className={RADIO} />
                  <span className="min-w-0">{OUTCOME_LABELS[o]}</span>
                </label>
              );
            })}
          </div>
        </fieldset>

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
                    className="input min-h-[44px] text-sm"
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
          <details className="mt-5" open={retryOpen} onToggle={(e) => setRetryOpen(e.currentTarget.open)}>
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
          <details className="mt-4" open={talkedOpen} onToggle={(e) => setTalkedOpen(e.currentTarget.open)}>
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

        {outcome ? (
          <div className="mt-5">
            <label htmlFor={ids.note} className="mb-1 block text-sm font-semibold text-[var(--text)]">
              {noteLabel}
            </label>
            <textarea
              id={ids.note}
              className="input text-sm"
              rows={compact ? 2 : 3}
              maxLength={NEXT_STEP_NOTE_MAX}
              value={note}
              placeholder={`What ${who} said, in a line or two`}
              onChange={(e) => setNote(e.target.value)}
            />
          </div>
        ) : null}

        {outcome && plan ? (
          plan.ok ? (
            <div id={ids.preview} className="mt-5 rounded-xl border border-[var(--line)] bg-[var(--page)] p-4">
              <p className="text-sm font-black text-[var(--heading)]">When you save</p>
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

        {error ? (
          <p role="alert" className="mt-4 rounded-lg border border-[var(--danger-line)] bg-[var(--danger-tint)] p-3 text-sm text-[var(--danger)]">
            {error}
          </p>
        ) : null}

        <div className="mt-5 flex flex-wrap items-center gap-3">
          <button
            type="submit"
            disabled={sample || busy}
            aria-describedby={outcome && plan && !plan.ok ? ids.hint : undefined}
            className={`btn-primary min-h-[44px] w-full !px-5 text-sm disabled:cursor-not-allowed disabled:opacity-60 sm:w-auto ${FOCUS}`}
          >
            {sample ? "Sample only, nothing is saved" : busy ? "Saving..." : "Save the call"}
          </button>
          {!compact ? (
            <a href={backHref} className={`inline-flex min-h-[44px] items-center px-1 text-sm font-semibold text-[var(--blue)] ${FOCUS}`}>
              {backLabel}
            </a>
          ) : null}
        </div>
      </form>
    </section>
  );
}
