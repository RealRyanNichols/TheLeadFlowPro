"use client";

import { useId, useRef, useState, type KeyboardEvent } from "react";
import { Bookmark, BookmarkCheck } from "lucide-react";
import { draftCopyText } from "@/lib/postCreator/ideas/drafts";
import type { PlatformId } from "@/lib/postCreator/options";
import type { DraftView } from "@/lib/postCreator/types";
import BlankText from "./BlankText";
import CopyButton from "./CopyButton";
import { isDraftSaved, useSavedItems } from "./storage";

// One draft per platform, one tab each. The same view shows the free
// template drafts on the public page and the AI drafts in the buyer app, so
// the counts, the blanks, and the copy buttons behave the same in both.
//
// "Saved" is read from the saved list itself: an AI draft saved on arrival
// shows "Saved" at once, and a draft removed from the list shows "Save" again.

/** Tab labels. The platform list says "Google Business Profile"; a tab has less room. */
const TAB_LABELS: Record<PlatformId, string> = {
  facebook: "Facebook",
  instagram: "Instagram",
  google: "Google",
  nextdoor: "Nextdoor",
  video: "Short video",
};

export function charsLine(d: DraftView): string {
  const n = d.chars.toLocaleString("en-US");
  return d.limit === null ? `${n} characters` : `${n} of ${d.limit.toLocaleString("en-US")} characters`;
}

export function blanksLine(count: number): string {
  return count === 1 ? "1 blank to fill in before you post" : `${count} blanks to fill in before you post`;
}

export default function DraftTabs({
  drafts,
  initial,
  onSave,
}: {
  drafts: DraftView[];
  initial?: PlatformId;
  onSave?(d: DraftView): void;
}) {
  const baseId = useId();
  const [picked, setPicked] = useState<PlatformId | undefined>(initial);
  const savedItems = useSavedItems();
  const tabs = useRef<(HTMLButtonElement | null)[]>([]);

  if (!drafts.length) return null;
  const index = Math.max(
    0,
    drafts.findIndex((d) => d.platform === picked),
  );
  const draft = drafts[index];
  const tabId = (i: number) => `${baseId}-tab-${i}`;
  const panelId = `${baseId}-panel`;
  const isSaved = isDraftSaved(savedItems, draftCopyText(draft));

  function select(i: number) {
    const next = (i + drafts.length) % drafts.length;
    setPicked(drafts[next].platform);
    tabs.current[next]?.focus();
  }

  function onKeyDown(e: KeyboardEvent<HTMLButtonElement>) {
    if (e.key === "ArrowRight" || e.key === "ArrowDown") select(index + 1);
    else if (e.key === "ArrowLeft" || e.key === "ArrowUp") select(index - 1);
    else if (e.key === "Home") select(0);
    else if (e.key === "End") select(drafts.length - 1);
    else return;
    e.preventDefault();
  }

  function save() {
    if (!onSave || isSaved) return;
    onSave(draft);
  }

  return (
    <div>
      <div role="tablist" aria-label="Draft for" className="flex flex-wrap gap-2">
        {drafts.map((d, i) => (
          <button
            key={d.platform}
            ref={(el) => {
              tabs.current[i] = el;
            }}
            type="button"
            role="tab"
            id={tabId(i)}
            aria-selected={i === index}
            aria-controls={panelId}
            tabIndex={i === index ? 0 : -1}
            onClick={() => setPicked(d.platform)}
            onKeyDown={onKeyDown}
            className="inline-flex min-h-[44px] items-center rounded-[9px] border border-[var(--line-strong)] bg-[var(--panel)] px-3.5 text-[15px] font-bold text-[var(--text)] hover:border-[var(--blue)] aria-selected:border-[var(--blue)] aria-selected:bg-[var(--blue)] aria-selected:text-[var(--on-accent)]"
          >
            {TAB_LABELS[d.platform]}
          </button>
        ))}
      </div>

      <div
        role="tabpanel"
        id={panelId}
        aria-labelledby={tabId(index)}
        tabIndex={0}
        className="mt-3 rounded-xl border border-[var(--line)] bg-[var(--fill-2)] p-4"
      >
        <p className="text-[16px] leading-relaxed text-[var(--heading)]">
          <BlankText text={draft.text} />
        </p>
        {draft.hashtags.length ? (
          <p className="mt-3 text-[15px] font-semibold text-[var(--blue)] [overflow-wrap:anywhere]">{draft.hashtags.join(" ")}</p>
        ) : null}
        {draft.shotList.length ? (
          <ol className="mt-3 space-y-1.5 border-t border-[var(--line)] pt-3 text-[15px] leading-relaxed text-[var(--text)]">
            {draft.shotList.map((shot, i) => (
              <li key={i}>
                <BlankText text={shot} />
              </li>
            ))}
          </ol>
        ) : null}
        <p className="mt-3 text-[13px] font-semibold text-[var(--muted)]">{charsLine(draft)}</p>
        {draft.blanks.length ? (
          <p className="mt-1 text-[13px] font-semibold text-[var(--warn)]">{blanksLine(draft.blanks.length)}</p>
        ) : null}
      </div>

      <div className="mt-3 flex flex-wrap items-start gap-2">
        <CopyButton text={draftCopyText(draft)} label="Copy post" className="button-primary" />
        {draft.hashtags.length ? <CopyButton text={draft.hashtags.join(" ")} label="Copy hashtags" /> : null}
        {onSave ? (
          <button type="button" className="button-secondary disabled:cursor-default disabled:opacity-70" onClick={save} disabled={isSaved}>
            {isSaved ? <BookmarkCheck aria-hidden="true" className="h-4 w-4" /> : <Bookmark aria-hidden="true" className="h-4 w-4" />}
            {isSaved ? "Saved" : "Save"}
          </button>
        ) : null}
      </div>
    </div>
  );
}
