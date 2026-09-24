import Link from "next/link";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { loadCallSheet, LOOKBACK_DAYS } from "@/lib/callSheetServer";
import { ANSWER_WINDOW_HOURS, FOLLOW_UP_AFTER_DAYS, TIER_LABELS, TIER_ORDER, ageLabel, tiers } from "@/lib/callSheet";
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
// The speed-to-lead line under the heading comes from the same rows the
// sheet was built from. It is Ryan's own record of his own follow-up, shown
// only here, never as a public claim.

export const dynamic = "force-dynamic";
export const metadata = { title: "Call sheet | The LeadFlow Pro" };

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

  return (
    <>
      <div className="mb-5 flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 className="text-2xl font-black">Today&apos;s call sheet</h2>
          <p className="mt-1 text-sm text-[var(--muted)]">
            {stamp} Central. Leads from the last {LOOKBACK_DAYS} days that a person has not called, texted, or written a note
            about, plus the call backs you promised that are now due. The welcome email and the automatic text do not count.
            Open the call card and log how the call went: that takes the lead off this list and sets when it comes back, at the
            call back time you pick, the day of a sit-down, or the next try after no answer.
          </p>
          {loaded.ok ? (
            <p className="mt-2 text-sm text-[var(--text)]">
              <span className="font-bold">From your own records:</span> {speedToLeadLine(loaded.speed)}
            </p>
          ) : null}
        </div>
        <LiveRefresh />
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
          <h3 className="font-bold">Nothing waiting on you.</h3>
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
                  return (
                    <li key={row.lead.id} className="card !p-4">
                      <div className="flex flex-wrap items-start justify-between gap-3">
                        <div className="min-w-0">
                          <div className="font-black text-[var(--heading)] [overflow-wrap:anywhere]">
                            {i + 1}. {row.lead.full_name || "Unnamed lead"}
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
                        <div className="flex flex-wrap gap-2">
                          {tel ? (
                            <a href={tel} className="min-h-[44px] rounded-lg bg-[var(--blue)] px-4 py-2 text-sm font-bold text-white">
                              Call {row.lead.phone}
                            </a>
                          ) : (
                            <span className="min-h-[44px] rounded-lg border border-[var(--line-strong)] px-4 py-2 text-sm text-[var(--muted)]">
                              No phone on file
                            </span>
                          )}
                          {sms ? (
                            <a href={sms} className="min-h-[44px] rounded-lg border border-[var(--line-strong)] px-4 py-2 text-sm font-bold text-[var(--text)]">
                              Text (consented)
                            </a>
                          ) : row.lead.phone && row.lead.sms_unsubscribed_at ? (
                            <span className="min-h-[44px] rounded-lg border border-[var(--line)] px-4 py-2 text-sm text-[var(--muted)]" title="This number replied STOP. Call instead.">
                              Replied STOP. Call instead.
                            </span>
                          ) : row.lead.phone ? (
                            <span className="min-h-[44px] rounded-lg border border-[var(--line)] px-4 py-2 text-sm text-[var(--muted)]" title="No text consent recorded. Call instead.">
                              No text consent
                            </span>
                          ) : null}
                          {row.lead.email ? (
                            <a href={`mailto:${row.lead.email}`} className="min-h-[44px] rounded-lg border border-[var(--line-strong)] px-4 py-2 text-sm font-bold text-[var(--text)]">
                              Email
                            </a>
                          ) : null}
                          <Link
                            href={row.href}
                            className="min-h-[44px] rounded-lg border border-[var(--accent-line)] bg-[var(--accent-tint)] px-4 py-2 text-sm font-bold text-[var(--blue)] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--blue)]"
                          >
                            Open call card
                          </Link>
                          <Link
                            href={`/admin/leads/${row.lead.id}`}
                            className="min-h-[44px] rounded-lg px-2 py-2 text-sm font-semibold text-[var(--blue)] underline-offset-2 hover:underline focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--blue)]"
                          >
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
