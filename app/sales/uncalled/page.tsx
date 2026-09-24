import Link from "next/link";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { ageLabel } from "@/lib/callSheet";
import { UNCALLED_LEAD_LIMIT } from "@/lib/uncalled";
import { loadUncalledList } from "@/lib/uncalledServer";
import { toE164 } from "@/lib/quo";
import { BUSINESS } from "@/lib/site/business";
import UncalledList, { type UncalledItem } from "./UncalledList";

// /admin/sales/uncalled (middleware rewrites /admin/sales/* here), so Pat
// (sales) and Ryan (admin) both open it. Every open lead no person has ever
// called, texted, or written a note about, oldest first. The live refresh
// pill is in the sales layout header above this page.

export const dynamic = "force-dynamic";
export const metadata = { title: "Uncalled | The LeadFlow Pro" };

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

export default async function UncalledPage() {
  const supabase = await createClient();
  // Authorization next to the private read, not only in the layout.
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login?next=/admin/sales/uncalled");
  const { data: profile } = await supabase.from("profiles").select("role, full_name").eq("id", user.id).single();
  if (profile?.role !== "admin" && profile?.role !== "sales") redirect("/dashboard");
  const actorName = String(profile?.full_name || user.email || "Staff").trim();

  const now = new Date();
  const loaded = await loadUncalledList(supabase, now);
  const stamp = new Intl.DateTimeFormat("en-US", {
    timeZone: BUSINESS.timezone,
    weekday: "long",
    month: "long",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
  }).format(now);

  const items: UncalledItem[] = loaded.ok
    ? loaded.list.rows.map((row) => ({
        id: row.id,
        name: row.full_name,
        business: row.business_name,
        phone: row.phone,
        email: row.email,
        status: row.status,
        meta: `${row.sourceLabel} · ${row.interestLabel} · came in ${ageLabel(row.ageHours)} · status ${row.status.replace(/_/g, " ")}`,
        tel: telHref(row.phone),
        // Consent and no STOP since, the same rule as the call sheet and the CRM send route.
        sms: row.canText ? smsHref(row.phone) : null,
        textBlocked: row.phone && !row.canText ? "No text consent or replied STOP. Call instead." : null,
        reachedOut: row.reachedOut,
        href: row.href,
      }))
    : [];
  const oldest = loaded.ok && loaded.list.rows.length ? ageLabel(loaded.list.rows[0].ageHours) : null;
  const reachedOut = loaded.ok ? loaded.list.rows.filter((r) => r.reachedOut).length : 0;

  return (
    <>
      <div className="mb-5">
        <h2 className="text-2xl font-black text-[var(--heading)]">Uncalled</h2>
        <p className="mt-1 text-sm text-[var(--muted)]">
          {stamp} Central. Every open lead that no person has called, texted, or written a note about, oldest first.
        </p>
        <p className="mt-2 text-sm text-[var(--muted)]">
          This list ignores the &quot;last contacted&quot; date, because the phone system stamps it the moment the software texts a lead.
        </p>
      </div>

      {!loaded.ok ? (
        <div className="card" role="alert">
          <h3 className="font-bold">The Uncalled list could not be loaded.</h3>
          <p className="my-3 text-sm">This is a connection problem, not an empty list. Try refreshing in a moment.</p>
        </div>
      ) : (
        <>
          <div className="mb-6 grid grid-cols-3 gap-3 sm:gap-4">
            <div className="card !p-4 text-center">
              <div className="text-3xl font-black text-[var(--heading)]">{loaded.list.rows.length}</div>
              <div className="text-xs uppercase tracking-wide text-[var(--muted)]">Never called</div>
            </div>
            <div className="card !p-4 text-center">
              <div className="text-3xl font-black text-[var(--heading)]">{reachedOut}</div>
              <div className="text-xs uppercase tracking-wide text-[var(--muted)]">Reached out, no answer</div>
            </div>
            <div className="card !p-4 text-center">
              <div className="text-lg font-black text-[var(--heading)] sm:text-xl">{oldest ?? "None"}</div>
              <div className="text-xs uppercase tracking-wide text-[var(--muted)]">Oldest waiting</div>
            </div>
          </div>

          {loaded.capped ? (
            <p className="mb-4 text-sm font-bold text-[var(--text)]" role="status">
              Only the newest {UNCALLED_LEAD_LIMIT} open leads were checked. Older open leads are not on this page.
            </p>
          ) : null}

          {items.length === 0 ? (
            <div className="card">
              <h3 className="font-bold">Every open lead has been touched by a person.</h3>
              <p className="my-3 text-sm text-[var(--muted)]">New leads land here the moment they arrive and leave when somebody calls, texts, or writes a note.</p>
              <Link href="/admin/call-sheet" className="font-bold text-[var(--blue)]">
                Open the call sheet
              </Link>
            </div>
          ) : (
            <UncalledList items={items} actorName={actorName} />
          )}

          <p className="mt-6 text-xs text-[var(--muted)]">
            A note, a logged call, or a text a person typed takes a lead off this list. The automatic first text, the welcome email, and missed
            inbound calls do not. {loaded.list.excluded.length} open record{loaded.list.excluded.length === 1 ? "" : "s"} read and left off: touched by
            a person, or no way to reach them. Won, lost, deleted, and test records are not read.
          </p>
        </>
      )}
    </>
  );
}
