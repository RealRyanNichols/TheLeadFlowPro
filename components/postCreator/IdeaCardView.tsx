"use client";

import type { ReactNode } from "react";
import { ArrowLeft, ArrowRight, Bookmark, BookmarkCheck, RefreshCw } from "lucide-react";
import type { IdeaCard } from "@/lib/postCreator/ideas/types";
import BlankText from "./BlankText";

// One idea: what the post is about, the first line, what to show, and the
// call to action, each with a button that swaps just that part. The buyer
// app puts its "Write it in my voice" button in `actions`.

export type RemixPart = "hook" | "shot" | "cta";

const SMALL_BUTTON =
  "inline-flex min-h-[44px] items-center gap-2 rounded-[9px] border border-[var(--line-strong)] bg-[var(--panel)] px-3 text-[14px] font-bold text-[var(--text)] hover:border-[var(--blue)]";

function Part({ label, value, button, onClick }: { label: string; value: string; button: string; onClick: () => void }) {
  return (
    <div className="border-t border-[var(--line)] pt-2">
      <dt className="flex items-center justify-between gap-2">
        <span className="text-[12px] font-extrabold uppercase tracking-[0.14em] text-[var(--muted)]">{label}</span>
        <button type="button" className={SMALL_BUTTON} onClick={onClick}>
          <RefreshCw aria-hidden="true" className="h-4 w-4" />
          {button}
        </button>
      </dt>
      <dd className="mt-1 text-[16px] leading-relaxed text-[var(--heading)]">
        <BlankText text={value} />
      </dd>
    </div>
  );
}

export default function IdeaCardView({
  card,
  coreCount,
  countLine,
  saved,
  canGoBack,
  onRemix,
  onSave,
  onNext,
  onBack,
  actions,
}: {
  card: IdeaCard;
  coreCount: number;
  countLine: string;
  saved: boolean;
  canGoBack: boolean;
  onRemix(part: RemixPart): void;
  onSave(): void;
  onNext(): void;
  onBack(): void;
  actions?: ReactNode;
}) {
  return (
    <article className="rounded-2xl border border-[var(--line-strong)] bg-[var(--panel)] p-4 shadow-[var(--cb-shadow)] sm:p-6">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <span className="rounded-full border border-[var(--accent-line)] bg-[var(--accent-tint)] px-3 py-1 text-[13px] font-extrabold text-[var(--blue)]">
          {card.angleLabel}
        </span>
        <span className="text-[13px] font-bold tabular-nums text-[var(--muted)]">
          Idea {card.position.toLocaleString("en-US")} of {coreCount.toLocaleString("en-US")}
        </span>
      </div>

      <p className="mt-4 text-[12px] font-extrabold uppercase tracking-[0.14em] text-[var(--muted)]">Idea</p>
      <h3 className="text-[22px] font-extrabold leading-tight tracking-[-0.02em] text-[var(--heading)] [overflow-wrap:anywhere] sm:text-[26px]">
        {card.title}
      </h3>

      <dl className="mt-4 space-y-3">
        <Part label="First line" value={card.hook} button="New first line" onClick={() => onRemix("hook")} />
        <Part label="What to show" value={card.shot} button="New photo idea" onClick={() => onRemix("shot")} />
        <Part label="Call to action" value={card.ctaLine} button="New call to action" onClick={() => onRemix("cta")} />
      </dl>

      <div className="mt-4 flex flex-wrap items-center gap-2 border-t border-[var(--line)] pt-4">
        <button
          type="button"
          className="button-secondary disabled:cursor-default disabled:opacity-70"
          onClick={onSave}
          disabled={saved}
        >
          {saved ? <BookmarkCheck aria-hidden="true" className="h-4 w-4" /> : <Bookmark aria-hidden="true" className="h-4 w-4" />}
          {saved ? "Saved" : "Save"}
        </button>
        <div className="hidden flex-wrap gap-2 md:ml-auto md:flex">
          <button type="button" className="button-secondary disabled:cursor-default disabled:opacity-50" onClick={onBack} disabled={!canGoBack}>
            <ArrowLeft aria-hidden="true" className="h-4 w-4" />
            Back
          </button>
          <button type="button" className="button-primary" onClick={onNext}>
            Next idea
            <ArrowRight aria-hidden="true" className="h-4 w-4" />
          </button>
        </div>
      </div>

      {actions ? <div className="mt-4">{actions}</div> : null}

      <p className="mt-4 text-[13px] leading-relaxed text-[var(--muted)]">{countLine}</p>
    </article>
  );
}
