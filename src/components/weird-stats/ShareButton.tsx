"use client";

import { useState } from "react";
import { Check, Share2 } from "lucide-react";

export function ShareButton({
  title,
  path,
  label = "Share",
}: {
  title: string;
  path: string;
  label?: string;
}) {
  const [copied, setCopied] = useState(false);

  async function share() {
    const url = `${window.location.origin}${path}`;
    if (navigator.share) {
      await navigator.share({ title, url }).catch(() => undefined);
      return;
    }
    await navigator.clipboard.writeText(url);
    setCopied(true);
    window.setTimeout(() => setCopied(false), 1600);
  }

  return (
    <button
      type="button"
      onClick={share}
      className="inline-flex items-center justify-center gap-1.5 rounded-lg border border-white/10 bg-white/[0.06] px-3 py-2 text-xs font-black uppercase tracking-[0.16em] text-slate-100 hover:border-cyan-300/35 hover:bg-cyan-300/10"
    >
      {copied ? <Check className="h-3.5 w-3.5 text-cyan-200" /> : <Share2 className="h-3.5 w-3.5 text-cyan-200" />}
      {copied ? "Copied" : label}
    </button>
  );
}
