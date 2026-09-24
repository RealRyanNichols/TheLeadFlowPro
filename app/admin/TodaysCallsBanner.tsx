import Link from "next/link";
import type { SupabaseClient } from "@supabase/supabase-js";
import { loadCallSheet } from "@/lib/callSheetServer";
import { NEXT_CALL_PATH, waitingBreakdown, waitingHeadline } from "@/lib/callQueue";

// Who is waiting on a call, at the top of the back office: the lead list (where
// an admin lands after signing in) and the command center. Same loader and
// same rows as /admin/call-sheet, so the number here is the number there.
//
// The page that renders this has already checked the admin role and passes
// its own signed-in client in; this never reads with the service key. Read-
// only, and nothing is ever sent to a lead from here. If the sheet cannot be
// read, the banner steps aside and the page still works.

const FOCUS = "focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--blue)]";

export default async function TodaysCallsBanner({
  supabase,
  className = "mb-6",
}: {
  supabase: SupabaseClient;
  /** Outer spacing, so the banner fits a page with or without its own gaps. */
  className?: string;
}) {
  let loaded: Awaited<ReturnType<typeof loadCallSheet>>;
  try {
    loaded = await loadCallSheet(supabase, new Date());
  } catch {
    return null;
  }
  if (!loaded.ok) return null;

  const total = loaded.sheet.rows.length;
  if (total === 0) {
    return (
      <p className={`${className} rounded-xl border border-[var(--line)] bg-[var(--panel)] px-4 py-3 text-sm text-[var(--muted)]`}>
        Nobody is waiting on a call right now.
      </p>
    );
  }

  const breakdown = waitingBreakdown(loaded.sheet.counts);
  return (
    <section
      aria-labelledby="todays-calls-banner"
      className={`${className} rounded-2xl border-2 border-[var(--accent-line)] bg-[var(--panel)] p-4 sm:p-5`}
    >
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="min-w-0">
          <p className="text-xs font-black uppercase tracking-wide text-[var(--blue)]">Today&apos;s calls</p>
          <h2 id="todays-calls-banner" className="mt-1 text-xl font-black text-[var(--heading)] sm:text-2xl">
            {waitingHeadline(total)}
          </h2>
          {breakdown ? <p className="mt-1 text-sm text-[var(--muted)]">{breakdown}</p> : null}
        </div>
        <div className="flex w-full flex-wrap items-center gap-x-4 gap-y-1 sm:w-auto">
          <Link
            href={NEXT_CALL_PATH}
            prefetch={false}
            className={`inline-flex min-h-[52px] w-full items-center justify-center rounded-xl bg-[var(--blue)] px-6 text-base font-black text-white sm:w-auto ${FOCUS}`}
          >
            Start calling
          </Link>
          <Link
            href="/admin/call-sheet"
            className={`inline-flex min-h-[44px] items-center px-1 text-sm font-semibold text-[var(--blue)] underline-offset-2 hover:underline ${FOCUS}`}
          >
            See the list
          </Link>
        </div>
      </div>
    </section>
  );
}
