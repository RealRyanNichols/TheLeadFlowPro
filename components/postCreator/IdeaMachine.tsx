"use client";

import { useEffect, useId, useMemo, useRef, useState, type ReactNode } from "react";
import Link from "next/link";
import { ArrowLeft, ArrowRight, Sparkles } from "lucide-react";
import { draftCopyText, renderDraft } from "@/lib/postCreator/ideas/drafts";
import { ideaSpace, remixCard, tradeWords } from "@/lib/postCreator/ideas/engine";
import type { IdeaCard } from "@/lib/postCreator/ideas/types";
import { PLATFORM_IDS, TRADES, isTradeId, platformById, type TradeId } from "@/lib/postCreator/options";
import { ideaCountLine } from "@/lib/postCreator/product";
import type { DraftView } from "@/lib/postCreator/types";
import DraftTabs from "./DraftTabs";
import IdeaCardView, { type RemixPart } from "./IdeaCardView";
import SetupFields, { FIELD_CLASS, LABEL_CLASS } from "./SetupFields";
import { usePostCreator } from "./ShuffleProvider";
import { saveItem } from "./storage";

// The free idea machine: pick a trade, tap Next idea, get an idea with a
// first line, a photo idea, a call to action, and a draft for each platform.
// It runs entirely in the browser (lib/postCreator/ideas) and never calls a
// server. The buyer app uses the same machine and adds its own button to each
// card through `cardActions`.

/** What the buyer app adds under each card, given the card on screen. */
export type CardActions = (card: IdeaCard) => ReactNode;

/** How many cards Back can step through. */
const MAX_HISTORY = 50;

const PART_NAMES: Record<RemixPart, string> = { hook: "first line", shot: "photo idea", cta: "call to action" };

/** The idea as saved text: its parts on labelled lines. */
export function ideaSavedText(card: IdeaCard): string {
  return [`First line: ${card.hook}`, `What to show: ${card.shot}`, `Call to action: ${card.ctaLine}`].join("\n");
}

function Hydrating() {
  return (
    <div aria-busy="true" className="rounded-2xl border border-[var(--line)] bg-[var(--panel)] p-4 sm:p-6">
      <p role="status" className="text-[15px] font-bold text-[var(--muted)]">
        Shuffling ideas...
      </p>
      <div aria-hidden="true" className="mt-4 space-y-3 motion-safe:animate-pulse">
        <div className="h-4 w-1/3 rounded bg-[var(--fill-3)]" />
        <div className="h-7 w-3/4 rounded bg-[var(--fill-3)]" />
        <div className="h-4 w-full rounded bg-[var(--fill-2)]" />
        <div className="h-4 w-5/6 rounded bg-[var(--fill-2)]" />
        <div className="h-4 w-2/3 rounded bg-[var(--fill-2)]" />
      </div>
    </div>
  );
}

function TradePicker({ onPick }: { onPick(trade: TradeId): void }) {
  return (
    <div className="rounded-2xl border border-[var(--line-strong)] bg-[var(--panel)] p-4 shadow-[var(--cb-shadow)] sm:p-6">
      <h3 className="text-[22px] font-extrabold leading-tight text-[var(--heading)]">What kind of business?</h3>
      <p className="mt-1 text-[15px] text-[var(--muted)]">Pick one to start. Everything else is optional.</p>
      <ul className="mt-4 grid grid-cols-2 gap-2 sm:grid-cols-3">
        {TRADES.map((t) => (
          <li key={t.id}>
            <button type="button" className="tool-preset h-full w-full justify-center text-center" onClick={() => onPick(t.id)}>
              {t.label}
            </button>
          </li>
        ))}
      </ul>
    </div>
  );
}

export default function IdeaMachine({ cardActions, aiHref }: { cardActions?: CardActions; aiHref?: string }) {
  const { mode, input, setInput, draw, ready, picked, storageOk } = usePostCreator();
  const tradeId = useId();
  const [history, setHistory] = useState<IdeaCard[]>([]);
  const [index, setIndex] = useState(-1);
  const [wrapped, setWrapped] = useState(false);
  const [announcement, setAnnouncement] = useState("");
  const [savedKeys, setSavedKeys] = useState<string[]>([]);

  const inputKey = JSON.stringify(input);
  const drawnFor = useRef<string | null>(null);
  // After a trade is picked the picker goes away, so focus moves to the first card.
  const focusCard = useRef(false);
  const cardRegion = useRef<HTMLDivElement>(null);
  const card = index >= 0 ? history[index] : undefined;

  const space = useMemo(() => ideaSpace(input), [input]);
  const countLine = ideaCountLine(space, tradeWords(input.trade));
  const drafts = useMemo<DraftView[]>(() => (card ? PLATFORM_IDS.map((p) => renderDraft(card, input, p)) : []), [card, input]);

  function show(cards: IdeaCard[], at: number, lapStart: boolean) {
    setHistory(cards);
    setIndex(at);
    setWrapped(lapStart);
    setAnnouncement(`New idea: ${cards[at].title}`);
  }

  function drawFresh(keep: IdeaCard[]) {
    const next = draw();
    if (!next) return;
    const cards = [...keep, next.card].slice(-MAX_HISTORY);
    show(cards, cards.length - 1, next.wrapped);
  }

  // The first idea once the browser is ready, and a fresh one whenever the
  // settings change (the old cards were for other settings).
  useEffect(() => {
    if (!ready || !picked || drawnFor.current === inputKey) return;
    drawnFor.current = inputKey;
    drawFresh([]);
    // drawFresh reads the provider's latest state through draw().
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [ready, picked, inputKey]);

  useEffect(() => {
    if (!card || !focusCard.current) return;
    focusCard.current = false;
    cardRegion.current?.focus();
  }, [card]);

  function pickTrade(trade: TradeId) {
    focusCard.current = true;
    setInput({ ...input, trade });
  }

  function nextIdea() {
    if (index >= 0 && index < history.length - 1) show(history, index + 1, false);
    else drawFresh(history);
  }

  function back() {
    if (index > 0) show(history, index - 1, false);
  }

  function remix(part: RemixPart) {
    if (!card) return;
    const next = remixCard(card, input, part);
    const cards = history.slice();
    cards[index] = next;
    setHistory(cards);
    const value = part === "hook" ? next.hook : part === "shot" ? next.shot : next.ctaLine;
    setAnnouncement(`New ${PART_NAMES[part]}: ${value}`);
  }

  function saveIdea() {
    if (!card) return;
    saveItem({ kind: "idea", title: card.title, text: ideaSavedText(card) });
    setSavedKeys((k) => [...k.slice(-99), card.key]);
  }

  function saveDraft(d: DraftView) {
    if (!card) return;
    saveItem({ kind: "draft", title: `${card.title} (${platformById(d.platform).label})`, text: draftCopyText(d) });
  }

  if (!ready) return <Hydrating />;
  if (!picked) return <TradePicker onPick={pickTrade} />;

  return (
    <div className="space-y-4">
      <p className="sr-only" aria-live="polite">
        {announcement}
      </p>

      {mode === "free" ? (
        <div className="space-y-3">
          <div>
            <label htmlFor={tradeId} className={LABEL_CLASS}>
              Your trade
            </label>
            <select
              id={tradeId}
              className={FIELD_CLASS}
              value={input.trade}
              onChange={(e) => {
                if (isTradeId(e.target.value)) setInput({ ...input, trade: e.target.value });
              }}
            >
              {TRADES.map((t) => (
                <option key={t.id} value={t.id}>
                  {t.label}
                </option>
              ))}
            </select>
          </div>
          <SetupFields />
        </div>
      ) : (
        <p className="rounded-xl border border-[var(--accent-line)] bg-[var(--accent-tint)] px-4 py-3 text-[15px] text-[var(--text)]">
          Your ideas use your saved profile. Change it in Settings.
        </p>
      )}

      {!storageOk ? (
        <p className="tool-disclaimer text-[14px] leading-relaxed text-[var(--text)]">
          Your browser is not saving your place (private browsing or storage is off). Ideas may repeat after you close this tab.
        </p>
      ) : null}

      {wrapped && card ? (
        <p role="status" className="rounded-xl border border-[var(--green-line)] bg-[var(--green-tint)] px-4 py-3 text-[15px] text-[var(--text)]">
          You have seen all {space.coreCount.toLocaleString("en-US")} ideas for these settings. They are coming back now with different first lines.
        </p>
      ) : null}

      {card ? (
        <>
          <div ref={cardRegion} tabIndex={-1} role="group" aria-label="Your post idea" className="rounded-2xl focus:outline-none">
            <IdeaCardView
              card={card}
              coreCount={space.coreCount}
              countLine={countLine}
              saved={savedKeys.includes(card.key)}
              canGoBack={index > 0}
              onRemix={remix}
              onSave={saveIdea}
              onNext={nextIdea}
              onBack={back}
              actions={cardActions ? cardActions(card) : undefined}
            />
          </div>

          <section aria-label="Drafts for this idea" className="rounded-2xl border border-[var(--line)] bg-[var(--panel)] p-4 sm:p-6">
            <DraftTabs drafts={drafts} onSave={saveDraft} />
            <p className="mt-4 text-[14px] leading-relaxed text-[var(--muted)]">
              Free drafts leave blanks for your know-how. AI writing fills them in, in your voice.
              {mode === "free" && aiHref ? (
                <>
                  {" "}
                  <Link href={aiHref} className="inline-flex min-h-[44px] items-center gap-1.5 font-extrabold text-[var(--blue)] underline underline-offset-4">
                    <Sparkles aria-hidden="true" className="h-4 w-4" />
                    Write it with AI
                  </Link>
                </>
              ) : null}
            </p>
          </section>

          {/* Below md the two buttons ride along at the bottom of the screen. */}
          <div className="sticky bottom-0 z-20 rounded-t-2xl border border-b-0 border-[var(--line)] bg-[var(--panel)] pb-[env(safe-area-inset-bottom)] shadow-[0_-8px_24px_#0a122014] md:hidden">
            <div className="flex gap-2 px-3 py-3">
              <button
                type="button"
                className="button-secondary flex-none disabled:cursor-default disabled:opacity-50"
                onClick={back}
                disabled={index <= 0}
              >
                <ArrowLeft aria-hidden="true" className="h-4 w-4" />
                Back
              </button>
              <button type="button" className="button-primary flex-1" onClick={nextIdea}>
                Next idea
                <ArrowRight aria-hidden="true" className="h-4 w-4" />
              </button>
            </div>
          </div>
        </>
      ) : (
        <Hydrating />
      )}
    </div>
  );
}
