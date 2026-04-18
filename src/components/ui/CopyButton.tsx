"use client";
import { useState } from "react";
import { Copy, Check } from "lucide-react";
import { cn } from "@/lib/utils";

export function CopyButton({
  value, label = "Copy", className
}: { value: string; label?: string; className?: string }) {
  const [copied, setCopied] = useState(false);

  async function onCopy() {
    try {
      await navigator.clipboard.writeText(value);
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    } catch {
      // Clipboard blocked (http, old browser, etc) — fall back to prompt.
      window.prompt("Copy this link:", value);
    }
  }

  return (
    <button
      type="button"
      onClick={onCopy}
      className={cn("btn-ghost text-sm py-2 px-3", className)}
    >
      {copied ? <Check className="h-4 w-4" /> : <Copy className="h-4 w-4" />}
      {copied ? "Copied" : label}
    </button>
  );
}
