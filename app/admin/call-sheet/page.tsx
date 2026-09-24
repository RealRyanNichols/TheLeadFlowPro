import Link from "next/link";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { loadCallSheet, LOOKBACK_DAYS } from "@/lib/callSheetServer";
import { ANSWER_WINDOW_HOURS, FOLLOW_UP_AFTER_DAYS, TIER_LABELS, TIER_ORDER, ageLabel, tiers } from "@/lib/callSheet";
import { NEXT_CALL_PATH } from "@/lib/callQueue";
import { speedToLeadLine } from "@/lib/speedToLead";
import { BUSINESS } from "@/lib/site/business";
import { toE164 } from "@/lib/quo";
import LiveRefresh from "../command-center/LiveRefresh";

// Who to call today, in order. Read-only: every action on this page is a
// phone link, a text link, or a link into the call card, where the outcome
// gets logged. Logging the outcome is what takes a lead off this sheet, and
// it decides when the lead comes back (a call back time, a sit-down, the next
// try after no answer).
//
// "Start calling" walks the same list one card at a time
// (/admin/call-sheet/next, lib/callQueue.ts). Each row's one filled button is
// its call card; Call, Text and Email are outlines, and the full record is a
// small link. The rules behind the list sit under "How this works", so the
// page opens on one plain sentence instead of a paragraph.
//
// The speed-to-lead line under the heading comes from the same rows the
// sheet was built from. It is Ryan's own record of his own follow-up, shown
// only here, never as a public claim.

export const dynamic = "force-dynamic";
export const metadata = { title: "Today's calls | The LeadFlow Pro" };

const FOCUS = "focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--blue)]";
/** The one filled button on a row: the call card, where the call is logged. */
const ROW_PRIMARY = `inline-flex min-h-[44px] items-center rounded-lg bg-[var(--blue)] px-4 py-2 text-sm font-bold text-white ${FOCUS}`;
const ROW_OUTLINE = `inline-flex min-h-[44px] items-center rounded-lg border border-[var(--line-strong)] px-4 py-2 text-sm font-bold text-[var(--text)] ${FOCUS}`;
const ROW_MISSING = "inline-flex min-h-[44px] items-center rounded-lg border border-[var(--line)] px-4 py-2 text-sm text-[var(--muted)]";
const ROW_LINK = `inline-flex min-h-[44px] items-center px-1 text-xs font-semibold text-[var(--blue)] underline underline-offset-2 ${FOCUS}`;

function telHref(phone: string | null): string | null {
  if (!phone) return null;
  const e164 = toE164(phone);
  return e164 ? `tel:${e164}` : null;
}

function smsHref(phone: string | null): string | null {
  if (!phone) return null;
  const e164 = toE164(phone);
  return e164 ? `sms:${e164}` : null;
}

export default async function CallSheetPage() {
  const supabase = await createClient();
  // Authorization next to the private read, not only in the layout.
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login?next=/admin/call-sheet");
  const { data: profile } = await supabase.from("profiles").select("role").eq("id", user.id).single();
  if (profile?.role !== "admin") redirect("/dashboard");

  const now = new Date();
  const loaded = await loadCallSheet(supabase, now);
  const stamp = new Intl.DateTimeFormat("en-US", {
    timeZone: BUSINESS.timezone,
    weekday: "long",
    month: "long",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
  }).format(now);
  const waiting = loaded.ok ? loaded.sheet.rows.length : 0;

  return (
    <>
      <div className="mb-3 flex flex-wrap items-start justify-between gap-3">
        <div className="min-w-0">
          <h2 className="text-2xl font-black">Today&apos;s calls</h2>
          <p className="mt-1 text-sm text-[var(--muted)]">{stamp} Central</p>
        </div>
        <LiveRefresh />
      </div>

      <div className="mb-5">
        <p className="max-w-2xl text-base text-[var(--text)]">
          Call these people from the top. Open a card, call, and tap what happened. Each person comes back when you said they would.
        </p>
        {waiting > 0 ? (
          <div className="mt-4 flex flex-wrap items-center gap-x-4 gap-y-2">
            <Link
              href={NEXT_CALL_PATH}
              prefetch={false}
              className={`inline-flex min-h-[52px] w-full items-center justify-center rounded-xl bg-[var(--blue)] px-6 text-base font-black text-white sm:w-auto ${FOCUS}`}
            >
              Start calling
            </Link>
            <p className="text-sm text-[var(--muted)]">
              {waiting === 1 ? "1 person" : `${waiting} people`}, one card at a time, from the top.
            </p>
          </div>
        ) : null}
        <details className="mt-2 max-w-2xl">
          <summary className={`inline-flex min-h-[44px] cursor-pointer items-center rounded-lg px-1 text-sm font-bold text-[var(--blue)] ${FOCUS}`}>
            How this works
          </summary>
          <ul className="mb-2 mt-1 grid list-disc gap-1 pl-5 text-sm text-[var(--text)]">
            <li>
              Someone is on this list when nobody has called them, texted them, or written a note about them yet, or when a call back
              you promised is due. It covers leads from the last {LOOKBACK_DAYS} days.
            </li>
            <li>The welcome email and the automatic text do not count. Only a person reaching them does.</li>
            <li>
              Tap what happened on the call card and they leave the list. They come back at the call back time you pick, on the day of
              a sit-down, or at the next try after no answer. Anyone quiet for {FOLLOW_UP_AFTER_DAYS} days comes back as a follow-up.
            </li>
            <li>Nothing is ever sent to a lead from here. Call and Text open your own phone.</li>
          </ul>
        </details>
        {loaded.ok ? (
          <p className="mt-2 text-sm text-[var(--text)]">
            <span className="font-bold">From your own records:</span> {speedToLeadLine(loaded.speed)}
          </p>
        ) : null}
      </div>

      {loaded.ok && loaded.partial ? (
        <p className="card mb-5 !p-4 text-sm" role="status">
          Some call and message history did not load, so a lead below may already have been reached. Tap Full record on the
          row to check the thread before you dial.
        </p>
      ) : null}
      {loaded.ok && loaded.leadsCapped ? (
        <p className="card mb-5 !p-4 text-sm" role="status">
          More leads matched than the sheet reads at once, so some older leads or call backs may be missing here. Check the{" "}
          <Link href="/admin" className="font-bold text-[var(--blue)]">
            full lead list
          </Link>{" "}
          for the rest.
        </p>
      ) : null}

      {!loaded.ok ? (
        <div className="card" role="alert">
          <h3 className="font-bold">The call sheet could not be loaded.</h3>
          <p className="my-3 text-sm">This is a connection problem, not an empty list. Try refreshing in a moment.</p>
        </div>
      ) : loaded.sheet.rows.length === 0 ? (
        <div className="card">
          <h3 className="font-bold">Nobody is waiting on a call right now.</h3>
          <p className="my-3 text-sm text-[var(--muted)]">
            Every open lead from the last {LOOKBACK_DAYS} days has a note, a call, or a message from a person on it within the
            last {FOLLOW_UP_AFTER_DAYS} days, or a call back set for later. New leads land here the moment they arrive, and a call
            back comes back the moment it is due.
          </p>
          <Link href="/admin" className="font-bold text-[var(--blue)]">
            Open the full lead list
          </Link>
        </div>
      ) : (
        <>
          <div className="mb-6 grid grid-cols-2 gap-4 sm:grid-cols-5">
            {TIER_ORDER.map((tier) => (
              <div key={tier} className="card !p-4 text-center">
                <div className="text-3xl font-black text-[var(--heading)]">{loaded.sheet.counts[tier]}</div>
                <div className="text-xs uppercase tracking-wide text-[var(--muted)]">{TIER_LABELS[tier].title}</div>
              </div>
            ))}
          </div>

          {tiers(loaded.sheet).map((group) => (
            <section key={group.tier} className="mb-8" aria-labelledby={`tier-${group.tier}`}>
              <h3 id={`tier-${group.tier}`} className="text-lg font-black text-[var(--heading)]">
                {TIER_LABELS[group.tier].title}{" "}
                <span className="text-sm font-semibold text-[var(--muted)]">({group.rows.length})</span>
              </h3>
              <p className="mb-3 text-sm text-[var(--muted)]">{TIER_LABELS[group.tier].lead}</p>
              {/* grid-cols-1 is minmax(0, 1fr): one long word in a reason (a pasted link in the
                  last note) cannot widen every row past a phone's width. */}
              <ol className="grid grid-cols-1 gap-3">
                {group.rows.map((row, i) => {
                  const tel = telHref(row.lead.phone);
                  // Consent and no STOP since, the same rule as the CRM send route.
                  const sms = row.canText ? smsHref(row.lead.phone) : null;
                  const name = row.lead.full_name || "Unnamed lead";
                  return (
                    <li key={row.lead.id} className="card !p-4">
                      <div className="flex flex-wrap items-start justify-between gap-3">
                        <div className="min-w-0">
                          <div className="font-black text-[var(--heading)] [overflow-wrap:anywhere]">
                            {i + 1}. {name}
                            {row.lead.business_name ? (
                              <span className="font-semibold text-[var(--muted)]"> at {row.lead.business_name}</span>
                            ) : null}
                          </div>
                          <div className="mt-1 text-sm text-[var(--muted)]">
                            {row.sourceLabel} · {row.interestLabel} · {ageLabel(row.ageHours)} · status {row.lead.status.replace(/_/g, " ")}
                            {row.lead.best_contact_method ? ` · prefers ${row.lead.best_contact_method}` : ""}
                          </div>
                          <p className="mt-2 text-sm [overflow-wrap:anywhere]">{row.reason}</p>
                        </div>
                        <div className="flex flex-wrap items-center gap-2">
                          <Link href={row.href} aria-label={`Open call card for ${name}`} className={ROW_PRIMARY}>
                            Open call card
                          </Link>
                          {tel ? (
                            <a href={tel} className={ROW_OUTLINE}>
                              Call {row.lead.phone}
                            </a>
                          ) : (
                            <span className={ROW_MISSING}>No phone on file</span>
                          )}
                          {sms ? (
                            <a href={sms} className={ROW_OUTLINE}>
                              Text (consented)
                            </a>
                          ) : row.lead.phone && row.lead.sms_unsubscribed_at ? (
                            <span className={ROW_MISSING} title="This number replied STOP. Call instead.">
                              Replied STOP. Call instead.
                            </span>
                          ) : row.lead.phone ? (
                            <span className={ROW_MISSING} title="No text consent recorded. Call instead.">
                              No text consent
                            </span>
                          ) : null}
                          {row.lead.email ? (
                            <a href={`mailto:${row.lead.email}`} className={ROW_OUTLINE}>
                              Email
                            </a>
                          ) : null}
                          <Link href={`/admin/leads/${row.lead.id}`} className={ROW_LINK}>
                            Full record
                          </Link>
                        </div>
                      </div>
                    </li>
                  );
                })}
              </ol>
            </section>
          ))}

          <p className="mb-3 text-sm">
            Want the full running order, with follow-up dates and proposals that went quiet?{" "}
            <Link href="/admin/sales" className="font-bold text-[var(--blue)]">
              Open the Today queue
            </Link>
            .
          </p>
          <p className="text-xs text-[var(--muted)]">
            Answer now means under {ANSWER_WINDOW_HOURS} hours old. You said you would call means a call back you logged has come due and nobody has
            touched the lead since. Follow up means the last human touch was {FOLLOW_UP_AFTER_DAYS} or more days ago and the lead is still open.{" "}
            {loaded.sheet.excluded.length} record{loaded.sheet.excluded.length === 1 ? "" : "s"} in the window left off: won, lost, test, no way to reach
            them, touched recently, or a call back set for later.
          </p>
        </>
      )}
    </>
  );
}
