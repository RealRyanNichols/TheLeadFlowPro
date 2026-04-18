"use client";
import { useState } from "react";
import { Sparkles, Check, X } from "lucide-react";
import { cn } from "@/lib/utils";
import { SoonButton } from "@/components/ui/SoonButton";

interface Move {
  id: string;
  priority: number;
  title: string;
  body: string;
  suggestedAction: string;
}

const PRIORITY_LABELS: Record<number, { label: string; cls: string }> = {
  1: { label: "Do today",     cls: "bg-accent-500/20 text-accent-400 border-accent-500/40" },
  2: { label: "This week",    cls: "bg-cyan-500/15 text-cyan-400 border-cyan-500/30" },
  3: { label: "When you can", cls: "bg-white/5 text-ink-200 border-white/10" }
};

// Local-only state for now — once NextMoves are a real DB entity, wire
// these to PATCH /api/next-moves/:id with status=dismissed|done.
type Status = "open" | "done" | "dismissed";

export function NextMoveCard({ move }: { move: Move }) {
  const p = PRIORITY_LABELS[move.priority] ?? PRIORITY_LABELS[3];
  const [status, setStatus] = useState<Status>("open");

  if (status === "dismissed") return null;

  return (
    <div
      className={cn(
        "glass rounded-2xl p-5 transition group",
        status === "done" ? "opacity-60" : "hover:border-cyan-500/30"
      )}
    >
      <div className="flex items-start justify-between gap-3">
        <div className="flex items-center gap-2">
          <Sparkles className="h-4 w-4 text-cyan-400" />
          <span className={cn("stat-pill border text-[11px]", p.cls)}>{p.label}</span>
          {status === "done" && (
            <span className="stat-pill bg-lead-500/15 text-lead-400 border border-lead-500/30 text-[11px]">
              <Check className="h-3 w-3" /> Done
            </span>
          )}
        </div>
      </div>
      <h3 className={cn("mt-3 text-base font-bold leading-snug", status === "done" ? "text-ink-300 line-through" : "text-white")}>
        {move.title}
      </h3>
      <p className="mt-2 text-sm text-ink-200 leading-relaxed">{move.body}</p>
      <div className="mt-4 glass rounded-xl p-3 border-l-2 border-accent-500">
        <p className="text-[10px] uppercase tracking-wider text-accent-400 font-semibold">
          Suggested action
        </p>
        <p className="text-sm text-white mt-1">{move.suggestedAction}</p>
      </div>
      <div className="mt-4 flex items-center justify-end gap-2">
        <button
          type="button"
          onClick={() => setStatus("dismissed")}
          className="text-xs text-ink-400 hover:text-white inline-flex items-center gap-1"
        >
          <X className="h-3 w-3" /> Dismiss
        </button>
        <button
          type="button"
          onClick={() => setStatus(status === "done" ? "open" : "done")}
          className="text-xs text-ink-400 hover:text-white inline-flex items-center gap-1"
        >
          <Check className="h-3 w-3" /> {status === "done" ? "Unmark" : "Mark done"}
        </button>
        <SoonButton size="xs" variant="primary">Take action</SoonButton>
      </div>
    </div>
  );
}
