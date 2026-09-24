"use client";

import { useEffect, useId, useRef, useState, type FormEvent } from "react";
import { RotateCcw, Sparkles } from "lucide-react";
import CopyButton from "@/components/postCreator/CopyButton";
import DraftTabs from "@/components/postCreator/DraftTabs";
import { saveItem } from "@/components/postCreator/storage";
import { draftCopyText } from "@/lib/postCreator/ideas/drafts";
import type { IdeaCard } from "@/lib/postCreator/ideas/types";
import { PLATFORMS, PLATFORM_IDS, platformById, type PlatformId } from "@/lib/postCreator/options";
import { POST_CREATOR } from "@/lib/postCreator/product";
import type { Allowance, DraftView, WriteRequestBody } from "@/lib/postCreator/types";
import { write } from "./api";
import { APP_COPY, counterLine, trimmedLine, writeCostLine } from "./copy";
import { INITIAL_WRITER_STATE, newRequestId, writerReducer, type WriterEvent, type WriterState } from "./writerState";

// AI writing for one idea, inline under the idea machine. The buyer picks up
// to three platforms and can add a note; one tap sends the idea, and the
// drafts come back checked by the claim filter and are saved to this device
// on arrival (the server keeps no draft text).
//
// One request at a time, and no automatic retry. A dropped answer or a
// "still writing" answer keeps its request id, so Try again cannot count
// twice (writerState.ts). The browser stops waiting after 115 seconds and
// treats that as a dropped answer (api.ts).

const COPY = APP_COPY.writer;
const MAX_PLATFORMS = POST_CREATOR.ai.maxPlatformsPerWrite;
const NOTE_MAX = POST_CREATOR.ai.noteMaxChars;
const DEFAULT_PLATFORMS: readonly PlatformId[] = ["facebook", "instagram", "google"];

/** What a write sends, apart from its request id. */
type WriteContent = Omit<WriteRequestBody, "requestId">;

function draftTitle(ideaTitle: string, d: DraftView): string {
  return `${ideaTitle} (${platformById(d.platform).label})`;
}

function prefersReducedMotion(): boolean {
  try {
    return window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  } catch {
    return false;
  }
}

/** The button each idea card gets in the buyer app, or the reason it cannot run. */
export function WriteAction({
  allowance,
  blocked,
  busy,
  onWrite,
}: {
  allowance: Allowance | null;
  blocked: string | null;
  busy: boolean;
  onWrite(): void;
}) {
  if (blocked) {
    return (
      <button type="button" className="button-secondary w-full disabled:cursor-not-allowed disabled:opacity-70 sm:w-auto" disabled>
        {blocked}
      </button>
    );
  }
  return (
    <div className="flex flex-col items-start gap-1.5 sm:flex-row sm:items-center sm:gap-3">
      <button type="button" className="button-primary w-full sm:w-auto" onClick={onWrite} disabled={busy} aria-busy={busy}>
        <Sparkles aria-hidden="true" className="h-4 w-4" />
        {COPY.action}
      </button>
      <p className="text-[14px] text-[var(--muted)]">{writeCostLine(allowance)}</p>
    </div>
  );
}

export default function WritePanel({
  card,
  allowance,
  blocked,
  onAllowance,
  onRefresh,
  onSessionLost,
  onBusyChange,
}: {
  card: IdeaCard;
  allowance: Allowance | null;
  /** Why a new write cannot start right now (AI off, profile, limits), or null. */
  blocked: string | null;
  onAllowance(a: Allowance): void;
  /** Reload the session: the allowance, whether AI writing is on, the profile. */
  onRefresh(): void;
  /** The server says this device is signed out or the plan lapsed. */
  onSessionLost(): void;
  onBusyChange?(busy: boolean): void;
}) {
  const baseId = useId();
  const id = (name: string) => `${baseId}-${name}`;
  const [platforms, setPlatforms] = useState<PlatformId[]>(() => [...DEFAULT_PLATFORMS]);
  const [note, setNote] = useState("");
  const [pickError, setPickError] = useState(false);
  const [writer, setWriter] = useState<WriterState>(INITIAL_WRITER_STATE);
  const [autoSaved, setAutoSaved] = useState(false);

  const stateRef = useRef<WriterState>(INITIAL_WRITER_STATE);
  const lastContent = useRef<WriteContent | null>(null);
  const inFlight = useRef<AbortController | null>(null);
  const mounted = useRef(true);
  const headingRef = useRef<HTMLHeadingElement>(null);
  const resultRef = useRef<HTMLHeadingElement>(null);
  const busyChange = useRef(onBusyChange);

  const writing = writer.phase === "writing";

  useEffect(() => {
    busyChange.current = onBusyChange;
  }, [onBusyChange]);

  function apply(e: WriterEvent): WriterState {
    const next = writerReducer(stateRef.current, e);
    stateRef.current = next;
    setWriter(next);
    return next;
  }

  // A new idea starts a new write: clear the last answer, then bring the
  // panel into view. The platforms and the note carry over.
  useEffect(() => {
    if (stateRef.current.phase !== "writing") {
      const next = writerReducer(stateRef.current, { type: "reset" });
      stateRef.current = next;
      setWriter(next);
      setAutoSaved(false);
      setPickError(false);
    }
    const heading = headingRef.current;
    if (!heading) return;
    heading.scrollIntoView({ block: "start", behavior: prefersReducedMotion() ? "auto" : "smooth" });
    heading.focus({ preventScroll: true });
  }, [card.key]);

  useEffect(() => {
    mounted.current = true;
    return () => {
      mounted.current = false;
      inFlight.current?.abort();
      busyChange.current?.(false);
    };
  }, []);

  // Leaving mid-write loses the drafts, so the browser asks first.
  useEffect(() => {
    if (!writing) return;
    const warn = (e: BeforeUnloadEvent) => {
      e.preventDefault();
      e.returnValue = "";
    };
    window.addEventListener("beforeunload", warn);
    return () => window.removeEventListener("beforeunload", warn);
  }, [writing]);

  function contentFromForm(): WriteContent | null {
    if (!platforms.length) return null;
    const content: WriteContent = {
      idea: { title: card.title, angle: card.angle, hook: card.hook, shot: card.shot },
      platforms: PLATFORM_IDS.filter((p) => platforms.includes(p)),
    };
    const trimmed = note.trim();
    if (trimmed) content.note = trimmed;
    return content;
  }

  async function send(kind: "submit" | "retry") {
    if (stateRef.current.phase === "writing") return;
    const content = kind === "retry" && lastContent.current ? lastContent.current : contentFromForm();
    if (!content) {
      setPickError(true);
      return;
    }
    setPickError(false);
    const next = apply({ type: kind, newId: newRequestId() });
    if (next.phase !== "writing") return;
    const requestId = next.requestId;
    lastContent.current = content;
    setAutoSaved(false);
    busyChange.current?.(true);

    const controller = new AbortController();
    inFlight.current = controller;
    const result = await write({ requestId, ...content }, controller.signal);
    if (!mounted.current || inFlight.current !== controller) return;
    inFlight.current = null;
    busyChange.current?.(false);

    const after = apply({ type: "response", requestId, result });
    if (after.phase === "done") {
      for (const d of after.result.drafts) saveItem({ kind: "draft", title: draftTitle(content.idea.title, d), text: draftCopyText(d) });
      setAutoSaved(true);
      if (after.result.allowance) onAllowance(after.result.allowance);
      else onRefresh();
      requestAnimationFrame(() => resultRef.current?.focus());
      return;
    }
    if (result.ok) return;
    if (result.status === 401 || result.status === 402) {
      onSessionLost();
      return;
    }
    if (result.allowance) onAllowance(result.allowance);
    else if (result.code !== "network") onRefresh();
  }

  function submit(e: FormEvent) {
    e.preventDefault();
    void send("submit");
  }

  function togglePlatform(p: PlatformId, on: boolean) {
    setPickError(false);
    setPlatforms((list) => (on ? (list.includes(p) || list.length >= MAX_PLATFORMS ? list : [...list, p]) : list.filter((x) => x !== p)));
  }

  function saveDraft(d: DraftView) {
    saveItem({ kind: "draft", title: draftTitle(lastContent.current?.idea.title ?? card.title, d), text: draftCopyText(d) });
  }

  const done = writer.phase === "done" ? writer.result : null;
  const failed = writer.phase === "failed" ? writer : null;

  return (
    <section aria-labelledby={id("title")} aria-busy={writing} className="scroll-mt-4 rounded-2xl border border-[var(--accent-line)] bg-[var(--panel)] p-4 shadow-[var(--cb-shadow)] sm:p-6">
      <h3 id={id("title")} ref={headingRef} tabIndex={-1} className="text-[20px] font-extrabold text-[var(--heading)] focus:outline-none">
        {COPY.heading}
      </h3>
      <p className="mt-1 text-[16px] font-bold leading-snug text-[var(--text)] [overflow-wrap:anywhere]">{card.title}</p>

      <form onSubmit={submit} noValidate className="mt-4 space-y-5">
        <fieldset aria-describedby={pickError ? `${id("hint")} ${id("pick-error")}` : id("hint")}>
          <legend className="mb-1 block text-[15px] font-bold text-[var(--heading)]">{COPY.platformsLegend}</legend>
          <p id={id("hint")} className="mb-2 text-[14px] text-[var(--muted)]">
            {COPY.platformsHint}
          </p>
          <div className="grid gap-2 sm:grid-cols-2">
            {PLATFORMS.map((p) => {
              const checked = platforms.includes(p.id);
              const full = !checked && platforms.length >= MAX_PLATFORMS;
              return (
                <label key={p.id} className={`tool-check ${full ? "cursor-not-allowed opacity-60" : ""}`}>
                  <input
                    type="checkbox"
                    checked={checked}
                    disabled={full || writing}
                    onChange={(e) => togglePlatform(p.id, e.target.checked)}
                    className="mt-0.5 h-5 w-5 flex-none accent-[var(--blue)]"
                  />
                  <span className="font-bold text-[var(--heading)]">{p.label}</span>
                </label>
              );
            })}
          </div>
          {pickError ? (
            <p id={id("pick-error")} role="alert" className="tool-field-error mt-2">
              {COPY.pickOne}
            </p>
          ) : null}
        </fieldset>

        <div>
          <label htmlFor={id("note")} className="mb-1.5 block text-[15px] font-bold text-[var(--heading)]">
            {COPY.noteLabel}
          </label>
          <textarea
            id={id("note")}
            rows={3}
            maxLength={NOTE_MAX}
            value={note}
            placeholder={COPY.notePlaceholder}
            disabled={writing}
            onChange={(e) => setNote(e.target.value)}
            aria-describedby={`${id("note-help")} ${id("note-count")}`}
            className="min-h-[48px] w-full rounded-[11px] border border-[var(--line-strong)] bg-[var(--panel)] px-3.5 py-2.5 text-base leading-relaxed text-[var(--heading)] placeholder:text-[var(--quiet)] focus:border-[var(--blue)] focus:shadow-[0_0_0_3px_#1240e826] focus:outline-none"
          />
          <div className="mt-1 flex items-start justify-between gap-3 text-[13px] text-[var(--muted)]">
            <p id={id("note-help")}>{COPY.noteHelp}</p>
            <p id={id("note-count")} className="flex-none tabular-nums">
              {counterLine(note.length, NOTE_MAX)}
            </p>
          </div>
        </div>

        <div className="flex flex-col items-start gap-2">
          <button type="submit" className="button-primary w-full sm:w-auto" disabled={writing || Boolean(blocked)} aria-busy={writing}>
            <Sparkles aria-hidden="true" className={`h-4 w-4 ${writing ? "motion-safe:animate-pulse" : ""}`} />
            {COPY.submit}
          </button>
          {blocked && !writing ? <p className="text-[14px] font-bold text-[var(--muted)]">{blocked}</p> : null}
        </div>
      </form>

      <p role="status" aria-live="polite" className={writing ? "mt-4 rounded-xl border border-[var(--accent-line)] bg-[var(--accent-tint)] px-4 py-3 text-[15px] font-bold text-[var(--heading)]" : "sr-only"}>
        {writing ? COPY.busy : ""}
      </p>

      {failed ? (
        <div className="mt-4 rounded-xl border border-[var(--danger-line)] bg-[var(--danger-tint)] px-4 py-3">
          <p role="alert" className="text-[15px] font-bold leading-relaxed text-[var(--heading)]">
            {failed.message}
          </p>
          {failed.retryable ? (
            <button type="button" className="button-secondary mt-3" onClick={() => void send("retry")}>
              <RotateCcw aria-hidden="true" className="h-4 w-4" />
              {COPY.retry}
            </button>
          ) : null}
        </div>
      ) : null}

      {done ? (
        <div className="mt-6 space-y-4 border-t border-[var(--line)] pt-5">
          <div>
            <h4 ref={resultRef} tabIndex={-1} className="text-[20px] font-extrabold text-[var(--heading)] focus:outline-none">
              {COPY.resultTitle}
            </h4>
            <p className="mt-1 text-[15px] text-[var(--muted)]">{COPY.resultNote}</p>
            {done.trimmed > 0 ? <p className="mt-2 text-[15px] font-bold text-[var(--warn)]">{trimmedLine(done.trimmed)}</p> : null}
          </div>

          <DraftTabs drafts={done.drafts} onSave={saveDraft} />
          {autoSaved ? <p className="text-[14px] font-bold text-[var(--green)]">{COPY.savedNote}</p> : null}

          {done.altHooks.length ? (
            <div>
              <h5 className="text-[16px] font-extrabold text-[var(--heading)]">{COPY.otherHooks}</h5>
              <ul className="mt-2 space-y-3">
                {done.altHooks.map((hook) => (
                  <li key={hook} className="rounded-xl border border-[var(--line)] bg-[var(--fill-2)] p-3">
                    <p className="text-[15px] leading-relaxed text-[var(--heading)] [overflow-wrap:anywhere]">{hook}</p>
                    <div className="mt-2">
                      <CopyButton text={hook} label={COPY.copy} />
                    </div>
                  </li>
                ))}
              </ul>
            </div>
          ) : null}

          {done.photoIdea ? (
            <p className="text-[15px] leading-relaxed text-[var(--text)] [overflow-wrap:anywhere]">
              <strong className="text-[var(--heading)]">{COPY.photoIdea}</strong> {done.photoIdea}
            </p>
          ) : null}

          <div className="flex flex-col items-start gap-2">
            <button type="button" className="button-secondary w-full sm:w-auto" onClick={() => void send("submit")} disabled={Boolean(blocked)}>
              <RotateCcw aria-hidden="true" className="h-4 w-4" />
              {COPY.again}
            </button>
            {blocked ? <p className="text-[14px] font-bold text-[var(--muted)]">{blocked}</p> : null}
          </div>
        </div>
      ) : null}
    </section>
  );
}
