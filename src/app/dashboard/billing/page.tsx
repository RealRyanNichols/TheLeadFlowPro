"use client";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import {
  CheckCircle2, Zap, CreditCard, Receipt, Gauge, ArrowRight, Sparkles
} from "lucide-react";
import { PLANS, BOOSTERS, planById } from "@/lib/pricing";
import { CheckoutButton } from "@/components/site/CheckoutButton";
import { MOCK_USER } from "@/lib/mock-data";

// Fake "current usage" — replace with DB-backed numbers once metering is wired.
const USAGE = {
  aiActionsUsed: 432,
  smsUsed:       18,
  leadsUsed:     187
};

const INVOICES = [
  { date: "Apr 1, 2026",  plan: "Growth",  amount: 15, status: "Paid" },
  { date: "Mar 1, 2026",  plan: "Growth",  amount: 15, status: "Paid" },
  { date: "Feb 18, 2026", plan: "Booster — +500 AI actions", amount: 12, status: "Paid" },
  { date: "Feb 1, 2026",  plan: "Growth",  amount: 15, status: "Paid" },
  { date: "Jan 1, 2026",  plan: "Starter", amount: 5,  status: "Paid" }
];

export default function BillingPage() {
  const search = useSearchParams();
  const checkout = search.get("checkout");
  const item = search.get("item");

  const current = planById(MOCK_USER.plan);
  const aiPct   = Math.min(100, (USAGE.aiActionsUsed / current.limits.aiActionsPerMonth) * 100);
  const leadsPct = Math.min(100, (USAGE.leadsUsed / current.limits.leadsPerMonth) * 100);
  const smsPct  = current.limits.smsIncluded > 0
    ? Math.min(100, (USAGE.smsUsed / current.limits.smsIncluded) * 100)
    : 0;

  return (
    <div className="max-w-5xl space-y-6">
      {/* Post-checkout banner */}
      {checkout === "success" && (
        <div className="glass-strong rounded-2xl p-4 border border-lead-500/30 flex items-start gap-3">
          <CheckCircle2 className="h-5 w-5 text-lead-400 shrink-0 mt-0.5" />
          <div>
            <p className="text-sm font-bold text-white">Payment successful</p>
            <p className="text-xs text-ink-300">
              {item ? <>Thanks for picking up <span className="text-cyan-400">{item}</span> — it's already activated.</> : "You're all set."}
            </p>
          </div>
        </div>
      )}
      {checkout === "cancel" && (
        <div className="glass rounded-2xl p-4 border border-accent-500/30 text-sm text-ink-200">
          Checkout was cancelled. No charge made.
        </div>
      )}

      <div>
        <h1 className="text-2xl sm:text-3xl font-bold text-white">Billing & plan</h1>
        <p className="text-sm text-ink-300 mt-1">
          Everything you're paying for and everything you've got left this month.
        </p>
      </div>

      {/* Current plan */}
      <div className="glass rounded-2xl p-5 sm:p-6 relative overflow-hidden">
        <div className="absolute inset-0 bg-promo-glow opacity-30 -z-10" />
        <div className="flex items-start justify-between gap-4 flex-wrap">
          <div>
            <div className="flex items-center gap-2 flex-wrap">
              <span className="stat-pill bg-cyan-500/15 text-cyan-400 border border-cyan-500/30 text-[11px]">
                Current plan
              </span>
              <h2 className="text-2xl font-bold text-white">{current.name}</h2>
              <span className="text-ink-300 text-sm">${current.priceMonthly}/mo</span>
            </div>
            <p className="text-sm text-ink-300 mt-1">{current.blurb}</p>
            <p className="text-xs text-ink-400 mt-2">Renews May 1, 2026 · billed monthly</p>
          </div>
          <div className="flex gap-2">
            <button
              onClick={openPortal}
              className="btn-ghost text-sm py-2 px-3"
            >
              <CreditCard className="h-4 w-4" /> Manage payment
            </button>
          </div>
        </div>
      </div>

      {/* Usage */}
      <div className="glass rounded-2xl p-5 sm:p-6">
        <h2 className="text-lg font-bold text-white flex items-center gap-2 mb-4">
          <Gauge className="h-4 w-4 text-cyan-400" /> This month's usage
        </h2>
        <div className="grid gap-4 sm:grid-cols-3">
          <UsageBar
            label="AI actions"
            used={USAGE.aiActionsUsed}
            cap={current.limits.aiActionsPerMonth}
            pct={aiPct}
            boosterKey="ai-500"
            boosterLabel="Top up +500 for $12"
          />
          <UsageBar
            label="Outreach SMS"
            used={USAGE.smsUsed}
            cap={current.limits.smsIncluded}
            pct={smsPct}
            boosterKey="sms-250"
            boosterLabel="+250 SMS for $5"
          />
          <UsageBar
            label="Leads this month"
            used={USAGE.leadsUsed}
            cap={current.limits.leadsPerMonth}
            pct={leadsPct}
          />
        </div>
      </div>

      {/* Upgrade plans */}
      <div>
        <h2 className="text-lg font-bold text-white flex items-center gap-2 mb-3">
          <Sparkles className="h-4 w-4 text-cyan-400" /> Switch plans
        </h2>
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          {PLANS.filter((p) => p.priceMonthly > 0).map((p) => {
            const isCurrent = p.id === MOCK_USER.plan;
            return (
              <div
                key={p.id}
                className={
                  "glass rounded-2xl p-4 flex flex-col " +
                  (isCurrent ? "border-2 border-cyan-500/50" : "")
                }
              >
                <div className="flex items-center justify-between">
                  <p className="text-base font-bold text-white">{p.name}</p>
                  {isCurrent && (
                    <span className="stat-pill bg-cyan-500/15 text-cyan-400 border border-cyan-500/30 text-[10px]">
                      Current
                    </span>
                  )}
                </div>
                <p className="text-xl font-extrabold text-white mt-1">
                  ${p.priceMonthly}<span className="text-xs text-ink-400 font-normal">/mo</span>
                </p>
                <p className="text-xs text-ink-300 mt-1 min-h-[2.5rem]">{p.blurb}</p>
                <div className="mt-3">
                  {isCurrent ? (
                    <button disabled className="btn-ghost text-xs py-2 w-full opacity-60 cursor-not-allowed">
                      Active
                    </button>
                  ) : (
                    <CheckoutButton priceKey={p.id} variant="ghost">
                      Switch to {p.name}
                    </CheckoutButton>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Boosters row */}
      <div>
        <h2 className="text-lg font-bold text-white flex items-center gap-2 mb-3">
          <Zap className="h-4 w-4 text-accent-400" /> One-time boosters
        </h2>
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {BOOSTERS.map((b) => (
            <div key={b.id} className="glass rounded-2xl p-4 flex flex-col">
              <div className="flex items-start justify-between">
                <p className="text-sm font-bold text-white">{b.name}</p>
                <p className="text-lg font-extrabold text-accent-400">${b.priceUsd}</p>
              </div>
              <p className="text-xs text-ink-300 mt-1 flex-1">{b.oneLiner}</p>
              <div className="mt-3">
                <CheckoutButton priceKey={b.id} variant="ghost">
                  Buy — ${b.priceUsd}
                </CheckoutButton>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Invoices */}
      <div className="glass rounded-2xl p-5 sm:p-6">
        <h2 className="text-lg font-bold text-white flex items-center gap-2 mb-4">
          <Receipt className="h-4 w-4 text-cyan-400" /> Recent invoices
        </h2>
        <div className="space-y-2">
          {INVOICES.map((inv, i) => (
            <div key={i} className="flex items-center justify-between py-2 border-b border-white/5 last:border-0">
              <div className="min-w-0">
                <p className="text-sm text-white truncate">{inv.plan}</p>
                <p className="text-[11px] text-ink-400">{inv.date}</p>
              </div>
              <div className="flex items-center gap-3 shrink-0">
                <span className="stat-pill bg-lead-500/10 text-lead-400 border border-lead-500/20 text-[10px]">
                  {inv.status}
                </span>
                <span className="text-sm font-semibold text-white w-16 text-right">${inv.amount}</span>
                <button className="text-xs text-cyan-400 hover:text-cyan-300 hidden sm:inline-flex items-center gap-1">
                  View <ArrowRight className="h-3 w-3" />
                </button>
              </div>
            </div>
          ))}
        </div>
      </div>

      <p className="text-center text-xs text-ink-400">
        Questions about billing? <Link href="/dashboard/requests" className="text-cyan-400 hover:underline">Drop us a note</Link>.
      </p>
    </div>
  );
}

function UsageBar({ label, used, cap, pct, boosterKey, boosterLabel }: {
  label: string; used: number; cap: number; pct: number;
  boosterKey?: string; boosterLabel?: string;
}) {
  const warn = pct >= 80;
  return (
    <div className="glass rounded-xl p-4 border border-white/5">
      <div className="flex items-center justify-between">
        <p className="text-xs text-ink-300 font-semibold">{label}</p>
        <p className="text-[11px] text-ink-400">
          {used.toLocaleString()} / {cap.toLocaleString()}
        </p>
      </div>
      <div className="mt-2 h-1.5 rounded-full bg-white/5 overflow-hidden">
        <div
          className={
            "h-full transition-all " +
            (warn ? "bg-accent-500" : "bg-cyan-500")
          }
          style={{ width: `${pct}%` }}
        />
      </div>
      {warn && boosterKey && boosterLabel && (
        <div className="mt-3">
          <CheckoutButton priceKey={boosterKey} variant="accent">
            {boosterLabel}
          </CheckoutButton>
        </div>
      )}
    </div>
  );
}

async function openPortal() {
  try {
    const res = await fetch("/api/billing-portal", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      // TODO: replace with the real Stripe customer ID once auth is wired.
      body: JSON.stringify({ customerId: "cus_demo_placeholder" })
    });
    const data = await res.json();
    if (data.url) window.location.href = data.url;
    else alert(data.error || "Portal not ready — wire customer ID after auth is set up.");
  } catch (e: any) {
    alert(e.message);
  }
}
