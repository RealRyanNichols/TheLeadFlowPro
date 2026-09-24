"use client";

import { useEffect, useId, useRef, useState } from "react";
import { Trash2 } from "lucide-react";
import BlankText from "./BlankText";
import CopyButton from "./CopyButton";
import { useOptionalPostCreator } from "./ShuffleProvider";
import { SAVED_EVENT, STORAGE_KEYS, clearSaved, readSaved, removeSaved, type SavedItem } from "./storage";

// Ideas and drafts the owner saved, kept in this browser only. The list
// reloads whenever anything on the page saves (the SAVED_EVENT from
// storage.ts) or another tab changes it, so a Save anywhere shows up here.
//
// Focus never falls to the page when a button it sat on goes away: "Keep
// them" hands it back to "Clear saved", clearing the list hands it to the
// heading, and removing an item hands it to the next item's Remove (or the
// heading when the list is empty).

export function savedCopyText(items: readonly SavedItem[]): string {
  return items.map((i) => `${i.title}\n\n${i.text}`).join("\n\n----------\n\n");
}

export default function SavedList({ title = "Saved ideas", empty }: { title?: string; empty?: string }) {
  const pc = useOptionalPostCreator();
  const [items, setItems] = useState<SavedItem[]>([]);
  const [confirming, setConfirming] = useState(false);
  const keepRef = useRef<HTMLButtonElement>(null);
  const clearRef = useRef<HTMLButtonElement>(null);
  const headingRef = useRef<HTMLHeadingElement>(null);
  const removeRefs = useRef(new Map<string, HTMLButtonElement>());
  /** Where focus goes after the next render: "Clear saved", the heading, or an item's Remove button (by id). */
  const focusNext = useRef<"clear" | "heading" | { id: string } | null>(null);
  const questionId = useId();
  const emptyLine =
    empty ?? (pc?.mode === "paid" ? "Nothing saved yet. Tap Save on any idea or draft to keep it here." : "Tap Save on any idea to keep it here.");

  useEffect(() => {
    const reload = () => setItems(readSaved());
    const onStorage = (e: StorageEvent) => {
      if (e.key === null || e.key === STORAGE_KEYS.saved) reload();
    };
    reload();
    window.addEventListener(SAVED_EVENT, reload);
    window.addEventListener("storage", onStorage);
    return () => {
      window.removeEventListener(SAVED_EVENT, reload);
      window.removeEventListener("storage", onStorage);
    };
  }, []);

  // The question takes focus on the safe answer, so Enter never clears by accident.
  useEffect(() => {
    if (confirming) keepRef.current?.focus();
  }, [confirming]);

  // After the question closes or an item goes, focus lands on what is still there.
  useEffect(() => {
    const next = focusNext.current;
    if (!next || confirming) return;
    focusNext.current = null;
    if (next === "clear") clearRef.current?.focus();
    else if (next === "heading") headingRef.current?.focus();
    else (removeRefs.current.get(next.id) ?? headingRef.current)?.focus();
  }, [confirming, items]);

  function keep() {
    focusNext.current = "clear";
    setConfirming(false);
  }

  function clearAll() {
    focusNext.current = "heading";
    clearSaved();
    setItems([]);
    setConfirming(false);
  }

  function remove(id: string) {
    const at = items.findIndex((i) => i.id === id);
    const neighbor = items[at + 1] ?? items[at - 1];
    focusNext.current = neighbor ? { id: neighbor.id } : "heading";
    setItems(removeSaved(id));
  }

  return (
    <section aria-label={title} className="rounded-2xl border border-[var(--line)] bg-[var(--panel)] p-4 sm:p-6">
      <h3 ref={headingRef} tabIndex={-1} className="text-[20px] font-extrabold text-[var(--heading)] focus:outline-none">
        {title}
      </h3>
      <p className="mt-1 text-[14px] text-[var(--muted)]">Saved in this browser only.</p>

      {items.length === 0 ? (
        <p className="mt-4 text-[15px] text-[var(--muted)]">{emptyLine}</p>
      ) : (
        <>
          <ul className="mt-4 divide-y divide-[var(--line)] border-y border-[var(--line)]">
            {items.map((item) => (
              <li key={item.id} className="py-4">
                <p className="text-[12px] font-extrabold uppercase tracking-[0.12em] text-[var(--muted)]">{item.kind === "draft" ? "Draft" : "Idea"}</p>
                <p className="mt-1 text-[16px] font-bold leading-snug text-[var(--heading)] [overflow-wrap:anywhere]">{item.title}</p>
                <p className="mt-2 text-[15px] leading-relaxed text-[var(--text)]">
                  <BlankText text={item.text} />
                </p>
                <div className="mt-3 flex flex-wrap items-start gap-2">
                  <CopyButton text={`${item.title}\n\n${item.text}`} label="Copy" />
                  <button
                    type="button"
                    className="button-secondary"
                    ref={(el) => {
                      if (el) removeRefs.current.set(item.id, el);
                      else removeRefs.current.delete(item.id);
                    }}
                    onClick={() => remove(item.id)}
                  >
                    <Trash2 aria-hidden="true" className="h-4 w-4" />
                    Remove<span className="sr-only">: {item.title}</span>
                  </button>
                </div>
              </li>
            ))}
          </ul>

          <div className="mt-4 flex flex-wrap items-start gap-2">
            <CopyButton text={savedCopyText(items)} label="Copy all" className="button-primary" />
            {!confirming ? (
              <button ref={clearRef} type="button" className="button-secondary" onClick={() => setConfirming(true)}>
                Clear saved
              </button>
            ) : null}
          </div>

          {confirming ? (
            <div role="group" aria-labelledby={questionId} className="tool-disclaimer mt-3">
              <p id={questionId} className="text-[15px] font-bold text-[var(--heading)]">
                Clear everything saved on this device?
              </p>
              <div className="mt-3 flex flex-wrap gap-2">
                <button type="button" className="button-primary" onClick={clearAll}>
                  Clear
                </button>
                <button ref={keepRef} type="button" className="button-secondary" onClick={keep}>
                  Keep them
                </button>
              </div>
            </div>
          ) : null}
        </>
      )}
    </section>
  );
}
