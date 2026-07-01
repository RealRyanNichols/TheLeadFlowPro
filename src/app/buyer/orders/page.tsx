import type { Metadata } from "next";
import Link from "next/link";
import { ArrowRight, Clock3, CreditCard, FileCheck2, LockKeyhole, ShieldCheck, XCircle } from "lucide-react";
import { BuyerPortalShell } from "@/components/buyer/BuyerPortalShell";
import { getBuyerPortalData } from "@/lib/buyer-portal";
import { getBuyerOrdersPageData, type LeadFlowOrderRecord } from "@/lib/leadflow-checkout";
import { cn } from "@/lib/utils";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Buyer Orders | The LeadFlow Pro",
  description: "Buyer order history for paid samples, listing access, exclusive deposits, and custom sourcing requests.",
};

function formatMoney(amount: number | string, currency = "usd") {
  return new Intl.NumberFormat("en-US", { style: "currency", currency: currency.toUpperCase(), maximumFractionDigits: 2 }).format(Number(amount || 0));
}

function formatDate(value: string | null | undefined) {
  if (!value) return "Not set";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  return new Intl.DateTimeFormat("en", { month: "short", day: "numeric", year: "numeric", hour: "numeric", minute: "2-digit" }).format(date);
}

function statusTone(status: string) {
  if (status === "fulfilled") return "border-lead-300/35 bg-lead-300/12 text-lead-100";
  if (status === "paid") return "border-cyan-300/35 bg-cyan-300/12 text-cyan-100";
  if (status === "manual_review" || status === "pending_payment") return "border-accent-300/35 bg-accent-300/12 text-accent-100";
  if (status === "failed" || status === "canceled" || status === "refunded") return "border-red-300/35 bg-red-300/12 text-red-100";
  return "border-white/10 bg-white/[0.04] text-ink-200";
}

function statusIcon(status: string) {
  if (status === "fulfilled") return ShieldCheck;
  if (status === "paid") return FileCheck2;
  if (status === "failed" || status === "canceled" || status === "refunded") return XCircle;
  if (status === "pending_payment") return CreditCard;
  return Clock3;
}

export default async function BuyerOrdersPage() {
  const [portalData, orderData] = await Promise.all([
    getBuyerPortalData(),
    getBuyerOrdersPageData(),
  ]);

  return (
    <BuyerPortalShell
      data={portalData}
      active="/buyer/orders"
      title="Buyer orders"
      description="Track paid samples, listing access, exclusive deposits, and custom sourcing requests. Payment does not reveal full data unless entitlement is approved."
    >
      {orderData.authenticated ? (
        <div className="space-y-5">
          {orderData.loadErrors.length ? (
            <div className="rounded-xl border border-accent-300/30 bg-accent-300/10 p-4 text-sm leading-6 text-accent-100">
              {orderData.loadErrors[0]}
            </div>
          ) : null}

          <section className="grid gap-4 md:grid-cols-4">
            <Stat label="Orders" value={String(orderData.orders.length)} />
            <Stat label="Manual review" value={String(orderData.orders.filter((order) => order.status === "manual_review").length)} />
            <Stat label="Pending payment" value={String(orderData.orders.filter((order) => order.status === "pending_payment").length)} />
            <Stat label="Fulfilled" value={String(orderData.orders.filter((order) => order.status === "fulfilled").length)} />
          </section>

          <section className="rounded-xl border border-white/10 bg-[#060a11]/92 p-5 shadow-2xl shadow-black/25">
            <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
              <div>
                <h2 className="text-2xl font-black text-white">Order history</h2>
                <p className="mt-2 text-sm leading-6 text-ink-300">
                  Restricted fields stay locked until an active entitlement exists.
                </p>
              </div>
              <Link href="/marketplace" className="inline-flex min-h-10 items-center justify-center gap-2 rounded-lg border border-cyan-300/30 px-3 text-sm font-bold text-cyan-100 hover:bg-cyan-300/10">
                Browse marketplace
                <ArrowRight className="h-4 w-4" />
              </Link>
            </div>

            <div className="mt-5 grid gap-3">
              {orderData.orders.length ? orderData.orders.map((order) => <OrderCard key={order.id} order={order} />) : (
                <div className="rounded-xl border border-white/10 bg-white/[0.035] p-6 text-center">
                  <LockKeyhole className="mx-auto h-8 w-8 text-cyan-300" />
                  <h3 className="mt-3 text-xl font-black text-white">No checkout orders yet.</h3>
                  <p className="mt-2 text-sm leading-6 text-ink-300">Request a sample, buy reviewed access, or start a custom sourcing request from the marketplace.</p>
                </div>
              )}
            </div>
          </section>
        </div>
      ) : null}
    </BuyerPortalShell>
  );
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-xl border border-white/10 bg-white/[0.04] p-4">
      <p className="text-[11px] font-extrabold uppercase tracking-wider text-ink-400">{label}</p>
      <p className="mt-2 text-3xl font-black text-white">{value}</p>
    </div>
  );
}

function OrderCard({
  order,
}: {
  order: LeadFlowOrderRecord & { productTitle: string; productPath: string; accessStatus: string; nextAction: string };
}) {
  const Icon = statusIcon(order.status);
  return (
    <article className="rounded-xl border border-white/10 bg-white/[0.035] p-4">
      <div className="flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
        <div className="min-w-0">
          <div className="flex flex-wrap items-center gap-2">
            <span className={cn("inline-flex items-center gap-1 rounded-full border px-2.5 py-1 text-xs font-extrabold capitalize", statusTone(order.status))}>
              <Icon className="h-3.5 w-3.5" />
              {order.status.replace(/_/g, " ")}
            </span>
            <span className="rounded-full border border-white/10 bg-ink-950/70 px-2.5 py-1 text-xs font-bold text-ink-300">
              {order.order_type.replace(/_/g, " ")}
            </span>
          </div>
          <h3 className="mt-3 text-xl font-black text-white">{order.productTitle}</h3>
          <p className="mt-2 text-sm leading-6 text-ink-300">
            {formatMoney(order.amount, order.currency)} · created {formatDate(order.created_at)}
          </p>
          <p className="mt-1 text-sm leading-6 text-ink-400">Access status: {order.accessStatus}</p>
        </div>
        <div className="flex flex-col gap-2 sm:min-w-[190px]">
          <Link href={order.productPath} className="inline-flex min-h-10 items-center justify-center rounded-lg border border-white/10 px-3 text-sm font-bold text-ink-200 hover:bg-white/[0.04] hover:text-white">
            {order.nextAction}
          </Link>
          {order.payment_session_id ? (
            <span className="text-center text-[11px] font-bold uppercase tracking-wider text-ink-500">Stripe session recorded</span>
          ) : null}
        </div>
      </div>
    </article>
  );
}
