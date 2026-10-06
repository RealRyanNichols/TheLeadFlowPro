import Link from "next/link";
import { Phone, MessageSquare, ChevronRight } from "lucide-react";
import type { CallSheetRow } from "@/lib/callSheet";
import { TIER_LABELS } from "@/lib/callSheet";
import { NEXT_CALL_PATH } from "@/lib/callQueue";
import { dialHref, formatPhone } from "@/lib/salesQueue";

// The first few people to call, straight off today's call sheet, with the
// phone's own dialer one tap away. The same rows and the same order as
// /admin/call-sheet, so the board never disagrees with the sheet. A text
// button appears only with recorded consent and no STOP (the sheet's canText).
// Nothing here sends anything; the dialer and the messages app do.

const FOCUS = "focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--blue)]";
const PRIMARY = `inline-flex min-h-[44px] items-center gap-1.5 rounded-lg bg-[var(--blue)] px-4 text-sm font-bold text-white ${FOCUS}`;
const OUTLINE = `inline-flex min-h-[44px] items-center gap-1.5 rounded-lg border border-[var(--line-strong)] px-4 text-sm font-bold text-[var(--text)] ${FOCUS}`;
const QUIET = `inline-flex min-h-[44px] items-center gap-1 px-1 text-sm font-semibold text-[var(--blue)] underline-offset-2 hover:underline ${FOCUS}`;

/** How many rows the board shows before handing off to the full sheet. */
export const CALL_NOW_LIMIT = 6;

export default function CallNowList({
  rows,
  total,
  /** Where "see the whole list" goes: the admin sheet, or Pat's Today queue. */
  listHref,
  /** Whether "Start calling" (the admin-only call card run) is offered. */
  canRunCards,
}: {
  rows: CallSheetRow[];
  total: number;
  listHref: string;
  canRunCards: boolean;
}) {
  if (rows.length === 0) {
    return (
      <p className="rounded-2xl border border-[var(--green-line)] bg-[var(--green-tint)] px-4 py-3 text-sm text-[var(--text)]">
        Nobody is waiting on a call. That is the whole list, not a loading error.
      </p>
    );
  }
  return (
    <div>
      <ol className="divide-y divide-[var(--line)] rounded-2xl border border-[var(--line)] bg-[var(--panel)]">
        {rows.map((row) => {
          const name = row.lead.business_name || row.lead.full_name;
          const tel = dialHref(row.lead.phone, "tel");
          const sms = row.canText ? dialHref(row.lead.phone, "sms") : null;
          return (
            <li key={row.lead.id} className="flex flex-col gap-3 px-4 py-3 sm:flex-row sm:items-center sm:justify-between">
              <div className="min-w-0">
                <p className="text-[10px] font-black uppercase tracking-wider text-[var(--quiet)]">{TIER_LABELS[row.tier].title}</p>
                <p className="mt-0.5 truncate font-black text-[var(--heading)]">{name}</p>
                <p className="mt-0.5 text-xs text-[var(--muted)]">
                  {row.sourceLabel} · {row.interestLabel}
                  {row.lead.phone ? ` · ${formatPhone(row.lead.phone)}` : " · no phone on file"}
                </p>
                <p className="mt-1 text-sm text-[var(--text)]">{row.reason}</p>
              </div>
              <div className="flex flex-wrap items-center gap-2">
                {tel ? (
                  <a href={tel} className={PRIMARY} aria-label={`Call ${name}`}>
                    <Phone className="h-4 w-4" aria-hidden="true" /> Call
                  </a>
                ) : null}
                {sms ? (
                  <a href={sms} className={OUTLINE} aria-label={`Text ${name}`}>
                    <MessageSquare className="h-4 w-4" aria-hidden="true" /> Text
                  </a>
                ) : null}
                <Link href={row.href} className={QUIET} aria-label={`Open call card for ${name}`}>
                  Call card <ChevronRight className="h-4 w-4" aria-hidden="true" />
                </Link>
              </div>
            </li>
          );
        })}
      </ol>
      <div className="mt-3 flex flex-wrap items-center gap-x-4 gap-y-2">
        {canRunCards ? (
          <Link href={NEXT_CALL_PATH} prefetch={false} className={PRIMARY}>
            Start calling
          </Link>
        ) : null}
        <Link href={listHref} className={QUIET}>
          {total > rows.length ? `See all ${total} waiting` : "See the list"}
        </Link>
      </div>
    </div>
  );
}
