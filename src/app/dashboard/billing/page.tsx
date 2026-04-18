import Link from "next/link";
import { redirect } from "next/navigation";
import {
  Zap, Receipt, Gauge, ArrowRight, Sparkles
} from "lucide-react";
import { PLANS, BOOSTERS, planById, type PlanId } from "@/lib/pricing";
import { CheckoutButton } from "@/components/site/CheckoutButton";
import { currentUser } from "@/lib/auth";
import { stripe } from "@/lib/stripe";
import { CheckoutBanner, ManagePaymentButton } from "./BillingClient";

export const metadata = { title: "Billing — The LeadFlow Pro" };
export const dynamic = "force-dynamic";

type Invoice = {
  id: string;
  date: string;
  plan: string;
  amountUsd: number;
  status: string;
  hostedUrl?: string | null;
};

async function loadInvoices(customerId: string | null): Promise<Invoice[]> {
  if (!customerId) return [];
  try {
    const list = await stripe().invoices.list({ customer: customerId, limit: 8 });
    return list.data.map((inv) => ({
      id: inv.id,
      date: new Date(inv.created * 1000).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" }),
      plan: inv.lines.data[0]?.description || "Charge",
      amountUsd: (inv.amount_paid ?? inv.amount_due) / 100,
      status: inv.status ? inv.status[0].toUpperCase() + inv.status.slice(1) : "—",
      hostedUrl: inv.hosted_invoice_url
    }));
  } catch {
    // Stripe may be unreachable or the customer may have no invoices yet;
    // either way we just render an empty table instead of failing the page.
    return [];
  }
}

function renewalLine(user: { plan: PlanId; stripeCurrentPeriodEnd: Date | null }) {
  if (user.plan === "free") return "Free forever · no renewal";
  if (!user.stripeCurrentPeriodEnd) return "Billed monthly";
  const d = user.stripeCurrentPeriodEnd;
  const pretty = d.toLocaleDateString("en-US", { month: "long", day: "numeric", year: "numeric" });
  return `Renews ${pretty} · billed monthly`;
}

export default async function BillingPage() {
  const user = await currentUser();
  if (!user) redirect("/login?callbackUrl=/dashboard/billing");

  const current  = planById(user.plan);
  const aiCap    = current.limits.aiActionsPerMonth + user.aiActionsBonus;
  const smsCap   = current.limits.smsIncluded + user.smsBonus;
  const aiPct    = aiCap   > 0 ? Math.min(100, (user.aiActionsUsed / aiCap) * 100) : 0;
  const smsPct   = smsCap  > 0 ? Math.min(100, (user.smsUsed       / smsCap) * 100) : 0;
  // Lead count would live in the Lead model — zero for new accounts.
  const leadsUsed = 0;
  const leadsPct  = current.limits.leadsPerMonth > 0
    ? Math.min(100, (leadsUsed / current.limits.leadsPerMonth) * 100)
    : 0;

  const invoices = await loadInvoices(user.stripeCustomerId);

  return (
    <div className="max-w-5xl space-y-6">
      <CheckoutBanner />

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
            <p className="text-xs text-ink-400 mt-2">{renewalLine(user)}</p>
          </div>
          <div className="flex gap-2">
            {user.plan !== "free" && <ManagePaymentButton />}
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
            used={user.aiActionsUsed}
            cap={aiCap}
            pct={aiPct}
            bonus={user.aiActionsBonus}
            boosterKey="ai-500"
            boosterLabel="Top up +500 for $12"
          />
          <UsageBar
            label="Outreach SMS"
            used={user.smsUsed}
            cap={smsCap}
            pct={smsPct}
            bonus={user.smsBonus}
            boosterKey="sms-250"
            boosterLabel="+250 SMS for $5"
          />
          <UsageBar
            label="Leads this month"
            used={leadsUsed}
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
            const isCurrent = p.id === user.plan;
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
        {invoices.length === 0 ? (
          <p className="text-sm text-ink-400">No invoices yet — upgrade a plan or grab a booster and they'll land here.</p>
        ) : (
          <div className="space-y-2">
            {invoices.map((inv) => (
              <div key={inv.id} className="flex items-center justify-between py-2 border-b border-white/5 last:border-0">
                <div className="min-w-0">
                  <p className="text-sm text-white truncate">{inv.plan}</p>
                  <p className="text-[11px] text-ink-400">{inv.date}</p>
                </div>
                <div className="flex items-center gap-3 shrink-0">
                  <span className="stat-pill bg-lead-500/10 text-lead-400 border border-lead-500/20 text-[10px]">
                    {inv.status}
                  </span>
                  <span className="text-sm font-semibold text-white w-16 text-right">${inv.amountUsd.toFixed(2)}</span>
                  {inv.hostedUrl ? (
                    <a href={inv.hostedUrl} target="_blank" rel="noreferrer" className="text-xs text-cyan-400 hover:text-cyan-300 hidden sm:inline-flex items-center gap-1">
                      View <ArrowRight className="h-3 w-3" />
                    </a>
                  ) : null}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      <p className="text-center text-xs text-ink-400">
        Questions about billing? <Link href="/dashboard/requests" className="text-cyan-400 hover:underline">Drop us a note</Link>.
      </p>
    </div>
  );
}

function UsageBar({ label, used, cap, pct, bonus, boosterKey, boosterLabel }: {
  label: string; used: number; cap: number; pct: number;
  bonus?: number; boosterKey?: string; boosterLabel?: string;
}) {
  const warn = pct >= 80;
  return (
    <div className="glass rounded-xl p-4 border border-white/5">
      <div className="flex items-center justify-between">
        <p className="text-xs text-ink-300 font-semibold">{label}</p>
        <p className="text-[11px] text-ink-400">
          {used.toLocaleString()} / {cap.toLocaleString()}
          {bonus && bonus > 0 ? <span className="text-accent-400 ml-1">(+{bonus.toLocaleString()} bonus)</span> : null}
        </p>
      </div>
      <div className="mt-2 h-1.5 rounded-full bg-white/5 overflow-hidden">
        <div
          className={"h-full transition-all " + (warn ? "bg-accent-500" : "bg-cyan-500")}
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
