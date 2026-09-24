import Link from "next/link";
import { Coins, Lock } from "lucide-react";
import { TLFP_CREDITS, formatCredits } from "@/lib/tlfpCredits";
import type { TlfpAccountView } from "@/lib/tlfp";

// The balance card. Real numbers when a person is logged in; a labelled
// example when nobody is, so the page still shows what the thing looks like.

const REASON_LABELS: Record<string, string> = {
  pack_purchase: "Pack purchased",
  pack_refund: "Pack refunded",
  pack_restore: "Pack restored",
  course_completed: "Course finished",
  event_attended: "Workshop attended",
  referral_purchase: "Referral bought",
  redeem: "Applied at checkout",
  admin_grant: "Granted by Ryan",
  admin_adjust: "Adjusted by Ryan",
};

function reasonLabel(row: { reason: string; status: string }): string {
  const base = REASON_LABELS[row.reason] ?? row.reason.replace(/_/g, " ");
  if (row.status === "held") return `${base} (checkout open)`;
  if (row.status === "released") return `${base} (checkout expired, returned)`;
  return base;
}

function when(iso: string): string {
  const d = new Date(iso);
  return Number.isNaN(d.getTime()) ? "" : d.toLocaleDateString("en-US", { month: "short", day: "numeric" });
}

export default function TlfpBalanceCard({
  account,
  compact = false,
  next = "/tlfp",
}: {
  account: TlfpAccountView | null;
  compact?: boolean;
  next?: string;
}) {
  const holder = !!account && account.balance >= TLFP_CREDITS.holderThreshold;
  const toHolder = account ? Math.max(0, TLFP_CREDITS.holderThreshold - account.balance) : TLFP_CREDITS.holderThreshold;
  const pct = account ? Math.min(100, Math.round((account.balance / TLFP_CREDITS.holderThreshold) * 100)) : 0;
  const history = account ? account.history.filter((row) => row.status !== "released").slice(0, compact ? 4 : 8) : [];

  return (
    <div
      className="rounded-2xl border border-[var(--accent-line)] p-5 shadow-[0_18px_50px_#0000001f] sm:p-6"
      style={{ background: "linear-gradient(160deg, var(--accent-tint), var(--panel) 62%)" }}
    >
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="text-xs font-extrabold uppercase tracking-[0.16em] text-[var(--blue)]">
            {account ? "Your balance" : "Example balance"}
          </p>
          <p className="mt-1 text-4xl font-black leading-none text-[var(--heading)] sm:text-5xl">
            {account ? account.balance.toLocaleString("en-US") : "625"}
            <span className="ml-2 text-base font-bold text-[var(--muted)]">credits</span>
          </p>
          <p className="mt-2 text-sm text-[var(--muted)]">
            {account
              ? `Worth $${account.balance.toLocaleString("en-US")} of LeadFlow Pro services${account.held > 0 ? `, ${account.held} on hold for an open checkout` : ""}.`
              : "What a Builder pack looks like the day it lands."}
          </p>
        </div>
        <span className="grid h-11 w-11 flex-none place-items-center rounded-xl border border-[var(--accent-line)] bg-[var(--panel)] text-[var(--blue)]">
          <Coins className="h-5 w-5" aria-hidden="true" />
        </span>
      </div>

      <div className="mt-5">
        <div className="flex items-center justify-between text-xs font-bold text-[var(--muted)]">
          <span>{holder || !account ? "Holder perks: on" : `Holder perks at ${TLFP_CREDITS.holderThreshold}`}</span>
          <span>{account ? (holder ? "Unlocked" : `${toHolder} to go`) : "Unlocked"}</span>
        </div>
        <div className="mt-2 h-2 overflow-hidden rounded-full bg-[var(--fill-3)]">
          <div
            className="h-full rounded-full"
            style={{ width: `${account ? pct : 100}%`, background: holder || !account ? "var(--green)" : "var(--blue)" }}
          />
        </div>
      </div>

      {account ? (
        history.length ? (
          <ul className="mt-5 divide-y divide-[var(--line)] text-sm">
            {history.map((row) => (
              <li key={row.id} className="flex items-center justify-between gap-3 py-2">
                <span className="min-w-0">
                  <span className="block truncate font-semibold text-[var(--heading)]">{reasonLabel(row)}</span>
                  {row.memo ? <span className="block truncate text-xs text-[var(--quiet)]">{row.memo}</span> : null}
                </span>
                <span className="flex-none text-right">
                  <span className={`block font-black ${row.delta > 0 ? "text-[var(--green)]" : "text-[var(--heading)]"}`}>
                    {row.delta > 0 ? "+" : ""}
                    {row.delta.toLocaleString("en-US")}
                  </span>
                  <span className="block text-xs text-[var(--quiet)]">{when(row.created_at)}</span>
                </span>
              </li>
            ))}
          </ul>
        ) : (
          <p className="mt-5 rounded-xl border border-dashed border-[var(--line-strong)] px-4 py-3 text-sm text-[var(--muted)]">
            Nothing on the ledger yet. Finish a course, show up at a workshop, or buy a pack below and it shows up here.
          </p>
        )
      ) : (
        <div className="mt-5 flex items-center gap-3 rounded-xl border border-[var(--line)] bg-[var(--panel)] px-4 py-3 text-sm">
          <Lock className="h-4 w-4 flex-none text-[var(--blue)]" aria-hidden="true" />
          <span className="text-[var(--muted)]">
            <Link href={`/login?next=${encodeURIComponent(next)}`} className="font-bold text-[var(--blue)] underline-offset-2 hover:underline">
              Log in
            </Link>{" "}
            with the email you buy or register with and your real balance shows here.
          </span>
        </div>
      )}

      {!compact && account ? (
        <p className="mt-4 text-xs text-[var(--quiet)]">
          {formatCredits(account.balance)} on {account.email}. Balance cap {TLFP_CREDITS.maxBalance.toLocaleString("en-US")}.
        </p>
      ) : null}
    </div>
  );
}
