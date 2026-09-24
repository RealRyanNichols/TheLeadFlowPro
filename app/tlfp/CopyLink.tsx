"use client";

import { useState } from "react";
import { Check, Copy } from "lucide-react";

export default function CopyLink({ value, label = "Copy link" }: { value: string; label?: string }) {
  const [copied, setCopied] = useState(false);

  async function copy() {
    try {
      await navigator.clipboard.writeText(value);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      // Clipboard blocked: the link is printed beside the button anyway.
    }
  }

  return (
    <button type="button" onClick={copy} className="btn-ghost min-h-11 px-4 text-sm">
      {copied ? <Check className="h-4 w-4 text-[var(--green)]" aria-hidden="true" /> : <Copy className="h-4 w-4" aria-hidden="true" />}
      {copied ? "Copied" : label}
    </button>
  );
}
