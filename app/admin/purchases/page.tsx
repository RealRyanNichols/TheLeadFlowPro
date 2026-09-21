import Link from "next/link";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { usd } from "@/lib/site/prices";
import { BUSINESS } from "@/lib/site/business";

// Read-only ledger of every Stripe checkout, invoice, and plugin month the
// webhook has recorded, with the receipt email delivery state beside each one.
// Nothing on this page writes. Lead matching goes through the checkout session
// id the webhook stamps on leads.external_id, never through the buyer's email.

export const dynamic = "force-dynamic";
export const metadata = { title: "Purchases | The LeadFlow Pro" };

const STATUS_FILTERS = ["paid", "refunded", "disputed", "payment_failed"] as const;
type StatusFilter = (typeof STATUS_FILTERS)[number];

type PurchaseRow = {
  id: string;
  created_at: string;
  email: string | null;
  kind: string | null;
  amount_cents: number | null;
  status: string | null;
  stripe_session_id: string | null;
};

type DeliveryRow = {
  stripe_session_id: string;
  purpose: string;
  sent_at: string | null;
  first_attempt_at: string | null;
};

const stamp = new Intl.DateTimeFormat("en-US", {
  timeZone: BUSINESS.timezone,
  month: "short",
  day: "numeric",
  year: "numeric",
  hour: "numeric",
  minute: "2-digit",
});

function when(iso: string | null): string {
  if (!iso) return "unknown";
  const d = new Date(iso);
  return Number.isNaN(d.getTime()) ? "unknown" : stamp.format(d);
}

function shortId(id: string | null): string {
  if (!id) return "none";
  return id.length > 18 ? `${id.slice(0, 10)}...${id.slice(-6)}` : id;
}

function isStatusFilter(value: string | undefined): value is StatusFilter {
  return STATUS_FILTERS.includes(value as StatusFilter);
}

function firstParam(value: string | string[] | undefined): string | undefined {
  return Array.isArray(value) ? value[0] : value;
}

export default async function PurchasesPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const supabase = await createClient();
  // Authorization next to the private read, not only in the layout.
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login?next=/admin/purchases");
  const { data: profile } = await supabase
    .from("profiles")
    .select("role")
    .eq("id", user.id)
    .single();
  if (profile?.role !== "admin") redirect("/dashboard");

  const params = await searchParams;
  const rawStatus = firstParam(params.status);
  const statusFilter = isStatusFilter(rawStatus) ? rawStatus : null;
  // Substring filter applied in code after the fetch. User input never enters
  // a query filter string.
  const emailFilter = (firstParam(params.email) ?? "").trim().toLowerCase().slice(0, 200);

  const { data: purchases, error } = await supabase
    .from("purchases")
    .select("id, created_at, email, kind, amount_cents, status, stripe_session_id")
    .order("created_at", { ascending: false })
    .limit(200);

  if (error) {
    return (
      <>
        <PageHeader />
        <div className="card" role="alert">
          <h3 className="font-bold">Purchases could not be loaded.</h3>
          <p className="my-3 text-sm">
            This is a connection problem, not an empty list. Try refreshing in a moment.
          </p>
        </div>
      </>
    );
  }

  const all: PurchaseRow[] = purchases ?? [];
  const sessionIds = all
    .map((p) => p.stripe_session_id)
    .filter((id): id is string => typeof id === "string" && id.length > 0);

  const leadBySession = new Map<string, string>();
  const deliveriesBySession = new Map<string, DeliveryRow[]>();
  let lookupsFailed = false;

  if (sessionIds.length > 0) {
    const externalIds = sessionIds.map((id) => `stripe_checkout:${id}`);
    const [leadsResult, deliveriesResult] = await Promise.all([
      supabase
        .from("leads")
        .select("id, external_id")
        .in("external_id", externalIds)
        .is("deleted_at", null),
      supabase
        .from("payment_email_deliveries")
        .select("stripe_session_id, purpose, sent_at, first_attempt_at")
        .in("stripe_session_id", sessionIds),
    ]);
    if (leadsResult.error || deliveriesResult.error) lookupsFailed = true;
    for (const lead of (leadsResult.data ?? []) as { id: string; external_id: string | null }[]) {
      if (!lead.external_id) continue;
      const sessionId = lead.external_id.replace(/^stripe_checkout:/, "");
      if (!leadBySession.has(sessionId)) leadBySession.set(sessionId, lead.id);
    }
    for (const row of (deliveriesResult.data ?? []) as DeliveryRow[]) {
      const list = deliveriesBySession.get(row.stripe_session_id) ?? [];
      list.push(row);
      deliveriesBySession.set(row.stripe_session_id, list);
    }
  }

  const rows = all.filter((p) => {
    if (statusFilter && p.status !== statusFilter) return false;
    if (emailFilter && !(p.email ?? "").toLowerCase().includes(emailFilter)) return false;
    return true;
  });
  const paidRows = rows.filter((p) => p.status === "paid");
  const paidCents = paidRows.reduce((sum, p) => sum + (Number(p.amount_cents) || 0), 0);

  return (
    <>
      <PageHeader />

      <form method="get" className="card mb-6 !p-4">
        <div className="flex flex-wrap items-end gap-3">
          <label className="flex min-w-[160px] flex-col gap-1 text-xs font-semibold text-[var(--muted)]">
            Status
            <select
              name="status"
              defaultValue={statusFilter ?? ""}
              className="min-h-[44px] rounded-lg border border-[var(--line-strong)] bg-[var(--panel)] px-3 py-2 text-sm text-[var(--text)]"
            >
              <option value="">All statuses</option>
              {STATUS_FILTERS.map((s) => (
                <option key={s} value={s}>
                  {s.replace(/_/g, " ")}
                </option>
              ))}
            </select>
          </label>
          <label className="flex min-w-[220px] flex-1 flex-col gap-1 text-xs font-semibold text-[var(--muted)]">
            Email contains
            <input
              type="text"
              name="email"
              defaultValue={emailFilter}
              maxLength={200}
              placeholder="name@business.com"
              className="min-h-[44px] rounded-lg border border-[var(--line-strong)] bg-[var(--panel)] px-3 py-2 text-sm text-[var(--text)]"
            />
          </label>
          <button
            type="submit"
            className="min-h-[44px] rounded-lg bg-[var(--blue)] px-4 py-2 text-sm font-bold text-white"
          >
            Filter
          </button>
          {statusFilter || emailFilter ? (
            <Link
              href="/admin/purchases"
              className="min-h-[44px] rounded-lg border border-[var(--line-strong)] px-4 py-2 text-sm font-bold text-[var(--text)]"
            >
              Clear
            </Link>
          ) : null}
        </div>
      </form>

      {lookupsFailed ? (
        <div className="card mb-6 !p-4" role="status">
          <p className="text-sm">
            Lead links or delivery status could not be loaded for this view. The purchase list itself is complete.
          </p>
        </div>
      ) : null}

      {all.length === 0 ? (
        <div className="card">
          <h3 className="font-bold">No purchases yet.</h3>
          <p className="my-3 text-sm text-[var(--muted)]">
            The first paid checkout, invoice, or plugin month lands here.
          </p>
        </div>
      ) : rows.length === 0 ? (
        <div className="card">
          <h3 className="font-bold">No purchases match this filter.</h3>
          <p className="my-3 text-sm text-[var(--muted)]">
            {all.length} purchase{all.length === 1 ? "" : "s"} on record. Clear the filter to see every row.
          </p>
        </div>
      ) : (
        <>
          <div className="mb-6 grid grid-cols-2 gap-4 sm:grid-cols-3">
            <div className="card !p-4 text-center">
              <div className="text-3xl font-black text-[var(--heading)]">{rows.length}</div>
              <div className="text-xs uppercase tracking-wide text-[var(--muted)]">Rows shown</div>
            </div>
            <div className="card !p-4 text-center">
              <div className="text-3xl font-black text-mint">{paidRows.length}</div>
              <div className="text-xs uppercase tracking-wide text-[var(--muted)]">Paid</div>
            </div>
            <div className="card !p-4 text-center">
              <div className="text-3xl font-black text-mint">{usd(paidCents / 100)}</div>
              <div className="text-xs uppercase tracking-wide text-[var(--muted)]">Paid total</div>
            </div>
          </div>

          <div className="card !p-0">
            <div className="overflow-x-auto">
              <table className="w-full min-w-[960px] text-left text-sm">
                <thead className="bg-[var(--fill-2)] text-[11px] uppercase tracking-wide text-[var(--muted)]">
                  <tr>
                    <th className="px-5 py-3">Date</th>
                    <th className="px-4 py-3">Email</th>
                    <th className="px-4 py-3">Kind</th>
                    <th className="px-4 py-3 text-right">Amount</th>
                    <th className="px-4 py-3">Status</th>
                    <th className="px-4 py-3">Session / invoice</th>
                    <th className="px-4 py-3">Lead</th>
                    <th className="px-4 py-3">Delivery</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[var(--line)]">
                  {rows.map((p) => {
                    const paid = p.status === "paid";
                    const leadId = p.stripe_session_id ? leadBySession.get(p.stripe_session_id) : undefined;
                    const deliveries = p.stripe_session_id
                      ? deliveriesBySession.get(p.stripe_session_id) ?? []
                      : [];
                    return (
                      <tr key={p.id} className={paid ? "" : "bg-warn/10"}>
                        <td className="whitespace-nowrap px-5 py-4 font-semibold text-[var(--heading)]">
                          {when(p.created_at)}
                        </td>
                        <td className="px-4 py-4 text-[var(--text)]">{p.email || "no email"}</td>
                        <td className="px-4 py-4 text-[var(--text)]">{(p.kind || "unknown").replace(/_/g, " ")}</td>
                        <td className="whitespace-nowrap px-4 py-4 text-right font-black text-[var(--heading)]">
                          {p.amount_cents == null ? "n/a" : usd(Number(p.amount_cents) / 100)}
                        </td>
                        <td className="px-4 py-4">
                          <span
                            className={`rounded-full border px-2.5 py-1 text-xs font-black ${
                              paid
                                ? "border-[var(--line-strong)] text-mint"
                                : "border-warn bg-warn/20 text-warn"
                            }`}
                          >
                            {(p.status || "unknown").replace(/_/g, " ")}
                          </span>
                        </td>
                        <td className="px-4 py-4 font-mono text-xs text-[var(--muted)]" title={p.stripe_session_id ?? undefined}>
                          {shortId(p.stripe_session_id)}
                        </td>
                        <td className="px-4 py-4">
                          {leadId ? (
                            <Link href={`/admin/leads/${leadId}`} className="font-bold text-[var(--blue)]">
                              Open lead
                            </Link>
                          ) : (
                            <span className="text-xs text-[var(--muted)]">no lead matched</span>
                          )}
                        </td>
                        <td className="px-4 py-4">
                          {deliveries.length === 0 ? (
                            <span className="text-xs text-[var(--muted)]">no delivery record</span>
                          ) : (
                            <ul className="grid gap-1 text-xs">
                              {deliveries.map((d) => (
                                <li key={`${d.stripe_session_id}-${d.purpose}`}>
                                  <span className="font-semibold text-[var(--text)]">{d.purpose.replace(/_/g, " ")}</span>
                                  {": "}
                                  {d.sent_at ? (
                                    <span className="text-mint">sent</span>
                                  ) : (
                                    <span className="font-black text-warn">
                                      FAILED, first attempt {when(d.first_attempt_at)}
                                    </span>
                                  )}
                                </li>
                              ))}
                            </ul>
                          )}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
                <tfoot className="border-t border-[var(--line-strong)] bg-[var(--fill-2)] text-sm font-black text-[var(--heading)]">
                  <tr>
                    <td className="px-5 py-3" colSpan={3}>
                      {paidRows.length} paid of {rows.length} shown
                    </td>
                    <td className="whitespace-nowrap px-4 py-3 text-right">{usd(paidCents / 100)}</td>
                    <td className="px-4 py-3" colSpan={4}>
                      <span className="text-xs font-semibold text-[var(--muted)]">Paid total for the rows above</span>
                    </td>
                  </tr>
                </tfoot>
              </table>
            </div>
          </div>
        </>
      )}
    </>
  );
}

function PageHeader() {
  return (
    <div className="mb-5">
      <h2 className="text-2xl font-black">Purchases</h2>
      <p className="mt-1 text-sm text-[var(--muted)]">
        Every checkout, invoice, and plugin month the Stripe webhook recorded, newest first, with the receipt email
        delivery state beside each one. Showing the latest 200 records. Times are Central.
      </p>
    </div>
  );
}
