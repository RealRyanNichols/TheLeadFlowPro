"use client";

import { useState } from "react";

// Copies one script to the clipboard so it can be pasted into a text or an
// email. It sends nothing: the person still presses send in their own app.

const FOCUS = "focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--blue)]";

export default function CopyButton({ text, label }: { text: string; label: string }) {
  const [state, setState] = useState<"idle" | "copied" | "failed">("idle");

  async function copy() {
    try {
      await navigator.clipboard.writeText(text);
      setState("copied");
    } catch {
      // No clipboard permission (an old browser, a locked-down phone): say so and leave the text selectable.
      setState("failed");
    }
    window.setTimeout(() => setState("idle"), 2500);
  }

  return (
    <button
      type="button"
      onClick={copy}
      aria-label={`Copy ${label}`}
      className={`inline-flex min-h-[44px] items-center rounded-lg border border-[var(--line-strong)] px-3 text-xs font-bold text-[var(--text)] hover:border-[var(--accent-line)] ${FOCUS}`}
    >
      <span aria-live="polite">{state === "copied" ? "Copied" : state === "failed" ? "Select and copy by hand" : "Copy"}</span>
    </button>
  );
}
