import type { Allowance } from "@/lib/postCreator/types";
import { meterLine } from "./copy";

// What is left of this month's AI writes and today's, and when the month
// resets. The numbers are the server's (the same count the write route
// checks), refreshed after every write. The bar is decoration; the sentence
// says everything, and a screen reader hears it change.
//
// No hooks: renders on the server or in the browser.

export default function UsageMeter({ allowance }: { allowance: Allowance | null }) {
  const usedShare = allowance && allowance.perMonth > 0 ? Math.min(1, Math.max(0, allowance.usedThisMonth / allowance.perMonth)) : 0;
  return (
    <div className="rounded-2xl border border-[var(--line)] bg-[var(--panel)] px-4 py-3">
      <p aria-live="polite" className="text-[15px] font-bold leading-snug text-[var(--heading)]">
        {meterLine(allowance)}
      </p>
      {allowance ? (
        <div aria-hidden="true" className="mt-2 h-2 overflow-hidden rounded-full bg-[var(--fill-3)]">
          <div
            className={`h-full rounded-full ${allowance.leftThisMonth <= 10 ? "bg-[var(--warn)]" : "bg-[var(--blue)]"}`}
            style={{ width: `${Math.round((1 - usedShare) * 100)}%` }}
          />
        </div>
      ) : null}
    </div>
  );
}
