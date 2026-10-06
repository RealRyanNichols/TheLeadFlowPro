import type { LeadStanding } from "@/lib/leadStanding";
export default function LeadStandingBrief({ brief }: { brief?: LeadStanding }) {
  if (!brief) return null;
  return <div className="mt-2 max-w-2xl space-y-1 text-sm leading-snug" aria-label="Current prospect standing">
    <p className="text-[var(--text)]">{brief.summary}</p>
    {brief.nextAction && <p className="text-xs text-[var(--muted)]"><span className="font-semibold text-flow-400">Next:</span> {brief.nextAction}</p>}
    {brief.updatedAt && <p className="text-[10px] text-[var(--muted)]">Reviewed {new Date(brief.updatedAt).toLocaleDateString("en-US", {month:"short",day:"numeric",timeZone:"America/Chicago"})}</p>}
  </div>;
}
