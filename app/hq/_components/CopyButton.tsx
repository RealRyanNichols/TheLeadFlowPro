"use client";

import { useState } from "react";
import { Check, Copy } from "lucide-react";

// Copy to clipboard with a confirmation the owner can actually see. The
// fallback matters: on an old phone browser the clipboard call throws, and
// the button says select it by hand instead of pretending it worked.

export default function CopyButton({
  value,
  label = "Copy",
  className = "hq-btn hq-btn-sm",
}: {
  value: string;
  label?: string;
  className?: string;
}) {
  const [state, setState] = useState<"idle" | "done" | "failed">("idle");

  async function copy() {
    try {
      await navigator.clipboard.writeText(value);
      setState("done");
      setTimeout(() => setState("idle"), 2000);
    } catch {
      setState("failed");
    }
  }

  return (
    <button type="button" onClick={copy} className={className}>
      {state === "done" ? <Check aria-hidden="true" className="h-4 w-4" /> : <Copy aria-hidden="true" className="h-4 w-4" />}
      {state === "done" ? "Copied" : state === "failed" ? "Select it by hand" : label}
    </button>
  );
}
