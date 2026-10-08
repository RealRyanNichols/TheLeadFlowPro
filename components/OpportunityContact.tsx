import { leadSourceLabel } from "@/lib/leadSourceLabel";
import type { LeadTouch } from "@/lib/leadTouch";
export default function OpportunityContact({ phone, touch, source }: { phone: string | null; touch?: LeadTouch; source?: string | null }) {
  const date = touch?.at ? new Date(touch.at).toLocaleString("en-US", { timeZone: "America/Chicago", month: "short", day: "numeric", hour: "numeric", minute: "2-digit" }) + " CT" : null;
  return <div className="mt-2 flex flex-wrap items-center gap-x-4 gap-y-1 text-xs">
    <span className="rounded-full border border-[var(--line)] px-2 py-1 text-[var(--muted)]">{leadSourceLabel(source)}</span>
    {phone ? <a href={`tel:${phone.replace(/[^+\d]/g, "")}`} onClick={event => event.stopPropagation()} className="lf-prospect-phone inline-flex min-h-[44px] items-center font-semibold text-flow-400 hover:underline" aria-label={`Call ${phone}`}>{phone}</a> : <span className="text-[var(--muted)]">Phone not provided</span>}
    <span className="text-[var(--muted)]">Last recorded team touch: <strong className="font-semibold text-[var(--text)]">{touch?.name || (touch?.unavailable ? "History unavailable" : touch?.limited ? "History limited" : "Not recorded")}</strong>{date && ` · ${date}`}{touch?.name && touch.unavailable && " · Partial history"}</span>
  </div>;
}
