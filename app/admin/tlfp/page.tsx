import Link from "next/link";
import { Coins } from "lucide-react";
import { createServiceClient } from "@/lib/supabase/service";
import { TLFP_CREDITS } from "@/lib/tlfpCredits";
import GrantForm from "./GrantForm";
import AnnounceForm from "./AnnounceForm";

export const dynamic = "force-dynamic";

// Admin view of TLFP Credits: grant or correct by hand, see who holds what,
// and read the last movements. The admin layout already gates this to the
// admin role; the reads here use the service role because the admin RLS
// policy on the ledger is the same data anyway.

type BalanceRow = { email: string; balance: number; held: number; referral_code: string; created_at: string };
type LedgerRow = {
  id: string;
  email: string;
  delta: number;
  reason: string;
  status: string;
  memo: string | null;
  amount_cents: number | null;
  actor: string;
  created_at: string;
};

function when(iso: string): string {
  const d = new Date(iso);
  return Number.isNaN(d.getTime()) ? "" : d.toLocaleString("en-US", { month: "short", day: "numeric", hour: "numeric", minute: "2-digit" });
}

export default async function AdminTlfpPage() {
  let balances: BalanceRow[] = [];
  let ledger: LedgerRow[] = [];
  let problem: string | null = null;
  try {
    const service = createServiceClient();
    const [b, l] = await Promise.all([
      service.from("tlfp_balances").select("email, balance, held, referral_code, created_at").order("balance", { ascending: false }).limit(100),
      service
        .from("tlfp_ledger")
        .select("id, email, delta, reason, status, memo, amount_cents, actor, created_at")
        .order("created_at", { ascending: false })
        .limit(60),
    ]);
    if (b.error) throw new Error(b.error.message);
    if (l.error) throw new Error(l.error.message);
    balances = (b.data ?? []) as BalanceRow[];
    ledger = (l.data ?? []) as LedgerRow[];
  } catch (error) {
    problem = error instanceof Error ? error.message : "unknown";
  }

  const outstanding = balances.reduce((sum, row) => sum + Math.max(0, row.balance), 0);
  const holders = balances.filter((row) => row.balance >= TLFP_CREDITS.holderThreshold).length;

  return (
    <div>
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          <Coins className="h-5 w-5 text-[var(--blue)]" aria-hidden="true" />
          <h2 className="text-xl font-black text-[var(--heading)]">{TLFP_CREDITS.name}</h2>
        </div>
        <Link href={TLFP_CREDITS.path} className="text-sm font-bold text-[var(--blue)] underline-offset-2 hover:underline">
          Public page
        </Link>
      </div>

      {problem ? (
        <p className="mt-4 rounded-xl border border-[var(--danger-line)] bg-[var(--danger-tint)] px-4 py-3 text-sm font-semibold text-[var(--danger)]">
          Could not read the ledger: {problem}. Is supabase/migrations/20260923000000_tlfp_credits.sql applied?
        </p>
      ) : null}

      <div className="mt-5 grid gap-3 sm:grid-cols-3">
        {[
          { label: "Accounts", value: balances.length.toLocaleString("en-US") },
          { label: "Credits outstanding", value: outstanding.toLocaleString("en-US"), sub: `$${outstanding.toLocaleString("en-US")} of services owed` },
          { label: `Holders (${TLFP_CREDITS.holderThreshold}+)`, value: holders.toLocaleString("en-US") },
        ].map((stat) => (
          <div key={stat.label} className="card">
            <p className="text-xs font-extrabold uppercase tracking-[0.14em] text-[var(--muted)]">{stat.label}</p>
            <p className="mt-1 text-3xl font-black text-[var(--heading)]">{stat.value}</p>
            {stat.sub ? <p className="text-xs text-[var(--quiet)]">{stat.sub}</p> : null}
          </div>
        ))}
      </div>

      <div className="card mt-6">
        <h3 className="text-lg font-bold text-[var(--heading)]">Grant or correct</h3>
        <p className="mt-1 text-sm text-[var(--muted)]">
          A referral that booked a call, a make-good, a correction. Positive adds, negative removes. It posts as one ledger row with
          your email on it and shows on their account with the reason you type.
        </p>
        <div className="mt-4">
          <GrantForm />
        </div>
      </div>

      <AnnounceForm />

      <div className="card mt-6 overflow-x-auto">
        <h3 className="text-lg font-bold text-[var(--heading)]">Balances</h3>
        {balances.length ? (
          <table className="mt-3 w-full text-sm">
            <thead>
              <tr className="text-left text-xs uppercase tracking-wide text-[var(--muted)]">
                <th className="py-2 pr-3">Email</th>
                <th className="py-2 pr-3">Balance</th>
                <th className="py-2 pr-3">Held</th>
                <th className="py-2 pr-3">Referral</th>
                <th className="py-2">Since</th>
              </tr>
            </thead>
            <tbody>
              {balances.map((row) => (
                <tr key={row.email} className="border-t border-[var(--line)]">
                  <td className="py-2 pr-3 font-semibold text-[var(--heading)]">{row.email}</td>
                  <td className="py-2 pr-3 font-black">{row.balance.toLocaleString("en-US")}</td>
                  <td className="py-2 pr-3">{row.held ? row.held.toLocaleString("en-US") : ""}</td>
                  <td className="py-2 pr-3 font-mono text-xs">{row.referral_code}</td>
                  <td className="py-2 text-[var(--quiet)]">{when(row.created_at)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        ) : (
          <p className="mt-3 text-sm text-[var(--muted)]">No accounts yet.</p>
        )}
      </div>

      <div className="card mt-6 overflow-x-auto">
        <h3 className="text-lg font-bold text-[var(--heading)]">Last 60 movements</h3>
        {ledger.length ? (
          <table className="mt-3 w-full text-sm">
            <thead>
              <tr className="text-left text-xs uppercase tracking-wide text-[var(--muted)]">
                <th className="py-2 pr-3">When</th>
                <th className="py-2 pr-3">Email</th>
                <th className="py-2 pr-3">Credits</th>
                <th className="py-2 pr-3">Reason</th>
                <th className="py-2 pr-3">Memo</th>
                <th className="py-2">By</th>
              </tr>
            </thead>
            <tbody>
              {ledger.map((row) => (
                <tr key={row.id} className="border-t border-[var(--line)]">
                  <td className="whitespace-nowrap py-2 pr-3 text-[var(--quiet)]">{when(row.created_at)}</td>
                  <td className="py-2 pr-3 font-semibold text-[var(--heading)]">{row.email}</td>
                  <td className={`py-2 pr-3 font-black ${row.delta > 0 ? "text-[var(--green)]" : ""}`}>
                    {row.delta > 0 ? "+" : ""}
                    {row.delta.toLocaleString("en-US")}
                    {row.status !== "posted" ? <span className="ml-1 text-xs font-semibold text-[var(--quiet)]">({row.status})</span> : null}
                  </td>
                  <td className="py-2 pr-3">{row.reason.replace(/_/g, " ")}</td>
                  <td className="py-2 pr-3 text-[var(--muted)]">{row.memo ?? ""}</td>
                  <td className="py-2 text-xs text-[var(--quiet)]">{row.actor}</td>
                </tr>
              ))}
            </tbody>
          </table>
        ) : (
          <p className="mt-3 text-sm text-[var(--muted)]">Nothing posted yet.</p>
        )}
      </div>
    </div>
  );
}
