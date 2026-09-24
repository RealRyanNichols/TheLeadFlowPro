import Link from "next/link";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { loadCallSheet } from "@/lib/callSheetServer";
import { FOLLOW_UP_AFTER_DAYS } from "@/lib/callSheet";
import { NEXT_CALL_PATH, nextHref, parseSkip, pickNext, queueCardHref, skippedStillWaiting } from "@/lib/callQueue";

// "Start calling" and every "Next call" land here. The page reads today's call
// sheet fresh, drops everyone this run already passed (the skip list in the
// URL, lib/callQueue.ts), and sends Ryan straight to the next person's call
// card in queue mode. When nobody is left it says so, calmly, and says when
// people come back. Caught up, the first thing to tap is the lead list: the
// call sheet is empty by then, so it is only a quiet link. With people skipped
// in this run, going through them again comes first.
//
// Read-only, like the call sheet: the same role check next to the private
// read, the same loader, and nothing is ever sent to a lead from here. The
// static "next" segment wins over /admin/call-sheet/[leadId] in the App
// Router, and the card page only accepts a UUID anyway.

export const dynamic = "force-dynamic";
export const metadata = { title: "Next call | The LeadFlow Pro" };

const FOCUS = "focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--blue)]";
const PRIMARY = `inline-flex min-h-[52px] w-full items-center justify-center rounded-xl bg-[var(--blue)] px-5 text-base font-black text-white sm:w-auto ${FOCUS}`;
const BUTTON = `inline-flex min-h-[44px] items-center rounded-lg bg-[var(--blue)] px-4 py-2 text-sm font-bold text-white ${FOCUS}`;
const QUIET_LINK = `inline-flex min-h-[44px] items-center px-1 text-sm font-semibold text-[var(--blue)] underline-offset-2 hover:underline ${FOCUS}`;

export default async function NextCallPage({
  searchParams,
}: {
  searchParams?: Promise<Record<string, string | string[] | undefined>>;
}) {
  const supabase = await createClient();
  // Authorization next to the private read, not only in the layout.
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login?next=/admin/call-sheet/next");
  const { data: profile } = await supabase.from("profiles").select("role").eq("id", user.id).single();
  if (profile?.role !== "admin") redirect("/dashboard");

  const query = (await searchParams) ?? {};
  const skip = parseSkip(query.skip);
  const loaded = await loadCallSheet(supabase, new Date());
  if (!loaded.ok) return <LoadProblem retryHref={skip.length ? nextHref(skip, null) : NEXT_CALL_PATH} />;

  const next = pickNext(loaded.sheet.rows, skip);
  if (next) redirect(queueCardHref(next.row.lead.id, skip, next.left));
  return <CaughtUp skipped={skippedStillWaiting(loaded.sheet.rows, skip)} />;
}

function LoadProblem({ retryHref }: { retryHref: string }) {
  return (
    <div className="mx-auto grid max-w-2xl grid-cols-1 gap-4">
      <div className="card !p-4" role="alert">
        <h2 className="text-lg font-black text-[var(--heading)]">The call sheet could not be loaded.</h2>
        <p className="my-3 text-sm">This is a connection problem, not an empty list. Try again in a moment.</p>
        <div className="flex flex-wrap items-center gap-x-4 gap-y-2">
          <a href={retryHref} className={BUTTON}>
            Try again
          </a>
          <Link href="/admin/call-sheet" className={QUIET_LINK}>
            Back to the call sheet
          </Link>
        </div>
      </div>
    </div>
  );
}

function CaughtUp({ skipped }: { skipped: number }) {
  const people = skipped === 1 ? "1 person you skipped is" : `${skipped} people you skipped are`;
  return (
    <div className="mx-auto grid max-w-2xl grid-cols-1 gap-4">
      <section className="card !p-5" aria-labelledby="caught-up">
        <h2 id="caught-up" className="text-2xl font-black text-[var(--heading)]">
          {skipped ? "That is the end of the list." : "You are caught up."}
        </h2>
        <p className="mt-2 text-base text-[var(--text)]">
          {skipped
            ? `Nobody new is waiting. ${people} still on the list for when you are ready.`
            : "Nobody is waiting on a call right now."}
        </p>
        <p className="mt-3 text-sm text-[var(--muted)]">
          People come back on their own. A new lead shows up the moment it arrives. A call back comes back at the time you picked,
          and a sit-down on its day. Anyone who goes quiet for {FOLLOW_UP_AFTER_DAYS} days comes back as a follow-up.
        </p>
        {/* Caught up, the call sheet is empty, so the way on is the lead list; the sheet stays one quiet tap away. */}
        <div className="mt-4 flex flex-wrap items-center gap-x-4 gap-y-2">
          {skipped ? (
            <>
              <Link href={NEXT_CALL_PATH} prefetch={false} className={PRIMARY}>
                Call the ones you skipped
              </Link>
              <Link href="/admin/call-sheet" className={QUIET_LINK}>
                See the call sheet
              </Link>
              <Link href="/admin" className={QUIET_LINK}>
                Open the lead list
              </Link>
            </>
          ) : (
            <>
              <Link href="/admin" className={PRIMARY}>
                Open the lead list
              </Link>
              <Link href="/admin/call-sheet" className={QUIET_LINK}>
                See the call sheet
              </Link>
            </>
          )}
        </div>
      </section>
    </div>
  );
}
