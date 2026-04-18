"use client";
import type { ReactNode } from "react";
import { cn } from "@/lib/utils";

// A deliberately-disabled button for surfaces we haven't wired yet.
// Renders the visual the designer intended, but makes it unmistakably
// clear to the user that it's not live — no silent no-op clicks.
export function SoonButton({
  children, className, size = "sm", variant = "ghost", title
}: {
  children: ReactNode;
  className?: string;
  size?: "xs" | "sm";
  variant?: "primary" | "accent" | "ghost";
  title?: string;
}) {
  const base = variant === "primary" ? "btn-primary"
             : variant === "accent"  ? "btn-accent"
             :                         "btn-ghost";
  const pad = size === "xs" ? "text-xs py-1.5 px-3" : "text-sm py-2 px-3";
  return (
    <button
      type="button"
      disabled
      title={title || "Coming soon — we're wiring this up."}
      className={cn(base, pad, "opacity-60 cursor-not-allowed relative", className)}
    >
      {children}
      <span className="ml-1.5 text-[10px] uppercase tracking-wider bg-white/10 text-ink-200 border border-white/10 rounded px-1.5 py-0.5">
        Soon
      </span>
    </button>
  );
}
