"use client";

import { useEffect, useRef, useState } from "react";
import { Check, Copy } from "lucide-react";

// Copy to the clipboard with a confirmation the owner can see and a screen
// reader can hear. Older phone browsers refuse the clipboard call, so there
// is a second try through a hidden text box, and if that fails too the button
// says so instead of pretending it worked.

export const COPY_FAILED = "Could not copy. Press and hold the text to copy it.";

const COPIED_MS = 2000;

function copyWithTextarea(text: string): boolean {
  try {
    const box = document.createElement("textarea");
    box.value = text;
    box.setAttribute("readonly", "");
    box.style.position = "fixed";
    box.style.top = "0";
    box.style.left = "-9999px";
    box.style.opacity = "0";
    document.body.appendChild(box);
    box.select();
    const ok = document.execCommand("copy");
    box.remove();
    return ok;
  } catch {
    return false;
  }
}

/** Put `text` on the clipboard. True when the browser says it worked. */
export async function copyText(text: string): Promise<boolean> {
  try {
    if (typeof navigator !== "undefined" && navigator.clipboard?.writeText) {
      await navigator.clipboard.writeText(text);
      return true;
    }
  } catch {
    // Fall through to the text box.
  }
  return copyWithTextarea(text);
}

export default function CopyButton({
  text,
  label = "Copy",
  copiedLabel = "Copied",
  className = "button-secondary",
}: {
  text: string;
  label?: string;
  copiedLabel?: string;
  className?: string;
}) {
  const [state, setState] = useState<"idle" | "copied" | "failed">("idle");
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(
    () => () => {
      if (timer.current) clearTimeout(timer.current);
    },
    [],
  );

  async function copy() {
    const ok = await copyText(text);
    if (timer.current) clearTimeout(timer.current);
    setState(ok ? "copied" : "failed");
    if (ok) timer.current = setTimeout(() => setState("idle"), COPIED_MS);
  }

  return (
    <span className="inline-flex max-w-full flex-col items-start gap-1.5">
      <button type="button" className={className} onClick={copy}>
        {state === "copied" ? <Check aria-hidden="true" className="h-4 w-4" /> : <Copy aria-hidden="true" className="h-4 w-4" />}
        {state === "copied" ? copiedLabel : label}
      </button>
      <span className="sr-only" aria-live="polite">
        {state === "copied" ? copiedLabel : ""}
      </span>
      {state === "failed" ? (
        <span role="alert" className="tool-field-error">
          {COPY_FAILED}
        </span>
      ) : null}
    </span>
  );
}
