import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { EMAIL_SERIES, EXTRAS } from "@/lib/timeback";

// Back office view of the Time Back funnel (/go/time-back): every order that
// came through the configurator, what they picked, what it costs, and whether
// Stripe has confirmed the money. Paid state is stamped onto the lead by the
// Stripe webhook; the purchases table is the cross-check.

type TimebackSelection = {
  downsell?: boolean;
  days?: number;
  per_day?: number;
  email_series?: string | null;
  extras?: string[];
  platforms?: string[];
};

type TimebackDiagnostic = {
  selection?: TimebackSelection;
  total_usd?: number;
  paid?: boolean;
  stripe?: { paid_at?: string; amount_total_cents?: number | null };
  onboarding?: { completed_at?: string };
};

type TimebackLead = {
  id: string;
  created_at: string;
  full_name: string;
  email: string;
  phone: string | null;
  business_name: string | null;
  status: string;
  diagnostic: TimebackDiagnostic | null;
};

function selectionSummary(sel: TimebackSelection | undefined): string {
  if (!sel) return "No selection recorded";
  const parts: string[] = [];
  if (sel.downsell) parts.push("Starter: 3 days x 3/day");
  else if (sel.days && sel.per_day) parts.push(`${sel.days} days x ${sel.per_day}/day`);
  if (sel.email_series) {
    const series = EMAIL_SERIES.find((s) => s.id === sel.email_series);
    parts.push(series ? `${series.days}-day email series` : sel.email_series);
  }
  for (const id of sel.extras ?? []) {
    const extra = EXTRAS.find((e) => e.id === id);
    parts.push(extra ? extra.label : id);
  }
  if (sel.platforms?.length) parts.push(`on ${sel.platforms.join(", ")}`);
  return parts.join(" · ") || "No selection recorded";
}

export default async function AdminTimeBack() {
  const supabase = await createClient();
  const { data: leads } = await supabase
    .from("leads")
    .select("id, created_at, full_name, email, phone, business_name, status, diagnostic")
    .eq("diagnostic->>source", "time_back_funnel")
    .is("deleted_at", null)
    .order("created_at", { ascending: false })
    .limit(200);

  // Cross-check: paid checkouts recorded by the webhook, keyed by email, in
  // case a lead predates the diagnostic paid stamp.
  const { data: purchases } = await supabase
    .from("purchases")
    .select("email, amount_cents, status")
    .eq("kind", "timeback_order")
    .limit(500);
  const paidEmails = new Map<string, number | null>();
  for (const p of purchases ?? []) {
    if (p.status === "paid" && typeof p.email === "string") {
      paidEmails.set(p.email.toLowerCase(), typeof p.amount_cents === "number" ? p.amount_cents : null);
    }
  }

  const all = (leads ?? []) as TimebackLead[];
  const rows = all.map((l) => {
    const d = l.diagnostic ?? {};
    const paidCents =
      d.stripe?.amount_total_cents ?? paidEmails.get(l.email?.toLowerCase() ?? "") ?? null;
    const paid = d.paid === true || paidEmails.has(l.email?.toLowerCase() ?? "");
    return {
      ...l,
      paid,
      paidUsd: paidCents !== null && paidCents !== undefined ? Math.round(paidCents / 100) : null,
      totalUsd: typeof d.total_usd === "number" ? d.total_usd : null,
      summary: selectionSummary(d.selection),
      intakeIn: !!d.onboarding?.completed_at,
    };
  });

  const paidRows = rows.filter((r) => r.paid);
  const paidRevenue = paidRows.reduce((sum, r) => sum + (r.paidUsd ?? r.totalUsd ?? 0), 0);

  return (
    <>
      <div className="mb-6 grid grid-cols-2 gap-4 sm:grid-cols-4">
        <div className="card !p-4 text-center">
          <div className="text-3xl font-black text-[var(--heading)]">{rows.length}</div>
          <div className="text-xs uppercase tracking-wide text-[var(--muted)]">Orders started</div>
        </div>
        <div className="card !p-4 text-center">
          <div className="text-3xl font-black text-mint">{paidRows.length}</div>
          <div className="text-xs uppercase tracking-wide text-[var(--muted)]">Paid</div>
        </div>
        <div className="card !p-4 text-center">
          <div className="text-3xl font-black text-mint">${paidRevenue.toLocaleString("en-US")}</div>
          <div className="text-xs uppercase tracking-wide text-[var(--muted)]">Paid revenue</div>
        </div>
        <div className="card !p-4 text-center">
          <div className="text-3xl font-black text-warn">{rows.length - paidRows.length}</div>
          <div className="text-xs uppercase tracking-wide text-[var(--muted)]">Awaiting payment</div>
        </div>
      </div>

      {rows.length === 0 ? (
        <div className="card text-center text-[var(--muted)]">
          No Time Back orders yet. They land here the moment someone submits the funnel.
        </div>
      ) : (
        <div className="space-y-3">
          {rows.map((r) => (
            <div key={r.id} className="card !p-4">
              <div className="flex flex-wrap items-center gap-3">
                <div className="min-w-0 flex-1">
                  <span className="font-bold text-[var(--heading)]">{r.full_name}</span>
                  {r.business_name && (
                    <span className="ml-2 text-sm text-[var(--muted)]">{r.business_name}</span>
                  )}
                  <div className="text-xs text-[var(--muted)]">
                    {new Date(r.created_at).toLocaleDateString()} ·{" "}
                    <a href={`mailto:${r.email}`} className="text-flow-400">
                      {r.email}
                    </a>
                    {r.phone && (
                      <>
                        {" · "}
                        <a href={`tel:${r.phone}`} className="text-flow-400">
                          {r.phone}
                        </a>
                      </>
                    )}
                  </div>
                  <div className="mt-1 text-sm text-[var(--text)]">{r.summary}</div>
                </div>
                <div className="text-right">
                  <div className="text-lg font-black text-[var(--heading)]">
                    {r.paidUsd !== null
                      ? `$${r.paidUsd.toLocaleString("en-US")}`
                      : r.totalUsd !== null
                        ? `$${r.totalUsd.toLocaleString("en-US")}`
                        : "—"}
                  </div>
                  <div className="flex justify-end gap-1">
                    {r.paid ? (
                      <span className="rounded-full bg-[var(--mint-tint,#e7f7ee)] px-2 py-0.5 text-[10px] font-black uppercase text-mint">
                        paid
                      </span>
                    ) : (
                      <span className="rounded-full bg-[var(--warn-tint)] px-2 py-0.5 text-[10px] font-black uppercase text-warn">
                        unpaid
                      </span>
                    )}
                    {r.intakeIn && (
                      <span className="rounded-full bg-[var(--page)] px-2 py-0.5 text-[10px] font-black uppercase text-[var(--muted)]">
                        intake in
                      </span>
                    )}
                  </div>
                  <div className="mt-1 text-xs text-[var(--muted)]">{r.status.replace(/_/g, " ")}</div>
                </div>
                <Link
                  href={`/admin/leads/${r.id}`}
                  className="rounded-lg border border-[var(--line-strong)] px-3 py-1.5 text-sm font-semibold text-[var(--text)] hover:border-[var(--accent-line)] hover:text-[var(--heading)]"
                >
                  Workspace
                </Link>
              </div>
            </div>
          ))}
        </div>
      )}
    </>
  );
}
