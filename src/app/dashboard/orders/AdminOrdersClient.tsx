"use client";

import { useMemo, useState } from "react";
import type { ElementType } from "react";
import { BadgeCheck, Clock3, CreditCard, Loader2, ShieldCheck, Undo2, XCircle } from "lucide-react";
import { trackLeadFlowEvent } from "@/lib/leadflow-events-client";
import type { AdminOrdersPageData } from "@/lib/leadflow-checkout";
import { cn } from "@/lib/utils";

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

export function AdminOrdersClient({ data }: { data: AdminOrdersPageData }) {
  const [statusFilter, setStatusFilter] = useState("all");
  const filteredOrders = useMemo(
    () => data.orders.filter((order) => statusFilter === "all" || order.status === statusFilter),
    [data.orders, statusFilter],
  );

  return (
    <div className="mx-auto max-w-[1540px] space-y-6">
      <section className="overflow-hidden rounded-2xl border border-white/10 bg-[radial-gradient(circle_at_12%_10%,rgba(35,184,255,0.18),transparent_30%),radial-gradient(circle_at_82%_18%,rgba(255,186,61,0.12),transparent_28%),linear-gradient(135deg,#07101b,#050711)] p-5 shadow-2xl shadow-black/30 md:p-7">
        <div className="flex flex-col gap-5 xl:flex-row xl:items-end xl:justify-between">
          <div>
            <p className="inline-flex items-center gap-2 rounded-lg border border-cyan-300/25 bg-cyan-300/10 px-3 py-1 text-xs font-extrabold uppercase tracking-wider text-cyan-200">
              <CreditCard className="h-4 w-4" />
              Orders and checkout
            </p>
            <h1 className="mt-4 max-w-5xl text-4xl font-black leading-tight text-white md:text-6xl">
              Review payment before access.
            </h1>
            <p className="mt-4 max-w-4xl text-sm leading-6 text-ink-200 md:text-base md:leading-7">
              Orders are payment records, not permission to dump data. Use this page to approve manual review, grant scoped entitlement, revoke access, or mark refund state.
            </p>
          </div>
          <div className="rounded-lg border border-white/10 bg-white/[0.045] px-3 py-2 text-xs font-extrabold uppercase tracking-wider text-ink-200">
            {data.mode === "live" ? "Live data" : "Safe placeholders"}
          </div>
        </div>
        {data.loadErrors.length ? (
          <div className="mt-5 rounded-lg border border-accent-300/30 bg-accent-300/10 p-3 text-sm leading-6 text-accent-100">
            {data.loadErrors[0]}
          </div>
        ) : null}
      </section>

      <section className="grid gap-4 md:grid-cols-3 xl:grid-cols-6">
        <Stat icon={CreditCard} label="Orders" value={String(data.stats.totalOrders)} />
        <Stat icon={Clock3} label="Pending" value={String(data.stats.pendingPayment)} />
        <Stat icon={ShieldCheck} label="Manual review" value={String(data.stats.manualReview)} />
        <Stat icon={BadgeCheck} label="Paid" value={String(data.stats.paid)} />
        <Stat icon={BadgeCheck} label="Fulfilled" value={String(data.stats.fulfilled)} />
        <Stat icon={CreditCard} label="Revenue" value={formatMoney(data.stats.revenue)} />
      </section>

      <section className="rounded-xl border border-white/10 bg-[#060a11]/92 p-5 shadow-2xl shadow-black/25">
        <div className="flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
          <div>
            <h2 className="text-2xl font-black text-white">Order queue</h2>
            <p className="mt-2 text-sm leading-6 text-ink-300">
              Confirm high-impact actions. Entitlement grants are audited.
            </p>
          </div>
          <label className="text-sm font-bold text-ink-200">
            Status
            <select
              value={statusFilter}
              onChange={(event) => {
                setStatusFilter(event.target.value);
                trackLeadFlowEvent("admin_table_filtered", { route: "/dashboard/orders", status: event.target.value, user_role: "admin" });
              }}
              className="mt-2 min-h-10 rounded-lg border border-white/10 bg-ink-950 px-3 text-sm text-white outline-none focus:border-cyan-300/50"
            >
              {["all", "pending_payment", "manual_review", "paid", "fulfilled", "failed", "refunded"].map((status) => (
                <option key={status} value={status}>{status.replace(/_/g, " ")}</option>
              ))}
            </select>
          </label>
        </div>

        <div className="mt-5 overflow-x-auto rounded-lg border border-white/10">
          <table className="min-w-full divide-y divide-white/10 text-left text-sm">
            <thead>
              <tr>
                {["Buyer", "Product", "Type", "Amount", "Status", "Created", "Payment", "Actions"].map((header) => (
                  <th key={header} className="whitespace-nowrap bg-white/[0.035] px-3 py-3 text-xs font-extrabold uppercase tracking-wider text-ink-400">
                    {header}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {filteredOrders.length ? filteredOrders.map((order) => <OrderRow key={order.id} order={order} />) : (
                <tr>
                  <td colSpan={8} className="border-t border-white/10 px-3 py-8 text-center text-sm text-ink-300">No orders match this filter.</td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </section>

      <section className="rounded-xl border border-white/10 bg-[#060a11]/92 p-5 shadow-2xl shadow-black/25">
        <h2 className="text-2xl font-black text-white">Recent payment records</h2>
        <div className="mt-5 overflow-x-auto rounded-lg border border-white/10">
          <table className="min-w-full divide-y divide-white/10 text-left text-sm">
            <thead>
              <tr>
                {["Payment", "Order", "Amount", "Status", "Session", "Created"].map((header) => (
                  <th key={header} className="whitespace-nowrap bg-white/[0.035] px-3 py-3 text-xs font-extrabold uppercase tracking-wider text-ink-400">
                    {header}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {data.payments.length ? data.payments.slice(0, 40).map((payment) => (
                <tr key={payment.id}>
                  <td className="border-t border-white/10 px-3 py-3 font-mono text-xs text-ink-300">{payment.id.slice(0, 8)}</td>
                  <td className="border-t border-white/10 px-3 py-3 font-mono text-xs text-ink-300">{payment.order_id?.slice(0, 8) || "sample"}</td>
                  <td className="border-t border-white/10 px-3 py-3 text-ink-200">{formatMoney(payment.amount, payment.currency)}</td>
                  <td className="border-t border-white/10 px-3 py-3">
                    <Badge label={payment.status.replace(/_/g, " ")} tone={statusTone(payment.status)} />
                  </td>
                  <td className="border-t border-white/10 px-3 py-3 font-mono text-xs text-ink-400">{payment.payment_session_id?.slice(0, 18) || "none"}</td>
                  <td className="border-t border-white/10 px-3 py-3 text-ink-300">{formatDate(payment.created_at)}</td>
                </tr>
              )) : (
                <tr>
                  <td colSpan={6} className="border-t border-white/10 px-3 py-8 text-center text-sm text-ink-300">No payment records loaded.</td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </section>
    </div>
  );
}

function OrderRow({ order }: { order: AdminOrdersPageData["orders"][number] }) {
  const [pendingAction, setPendingAction] = useState<string | null>(null);
  const [adminNotes, setAdminNotes] = useState("");
  const [result, setResult] = useState<string | null>(null);

  async function submit(action: "approve_manual_review" | "grant_entitlement" | "revoke_entitlement" | "mark_fulfilled" | "mark_refunded") {
    const requiresConfirmation = action === "grant_entitlement" || action === "revoke_entitlement" || action === "mark_refunded";
    if (requiresConfirmation && !window.confirm("This order action affects access, refund state, or entitlement. Continue?")) return;
    setPendingAction(action);
    setResult(null);
    trackLeadFlowEvent(action === "grant_entitlement" ? "entitlement_granted_after_payment" : "admin_order_reviewed", {
      route: "/dashboard/orders",
      order_id: order.id,
      checkout_type: order.order_type,
      action,
      status: order.status,
      user_role: "admin",
    });
    try {
      const response = await fetch("/api/leadflow/orders/admin", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          action,
          orderId: order.id,
          adminNotes: adminNotes || `${action} from admin orders`,
          confirmedImpact: requiresConfirmation,
        }),
      });
      const payload = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error(payload.error || "Order action failed.");
      setResult(`${action.replace(/_/g, " ")} saved`);
    } catch (error) {
      setResult(error instanceof Error ? error.message : "Order action failed.");
    } finally {
      setPendingAction(null);
    }
  }

  return (
    <tr>
      <td className="border-t border-white/10 px-3 py-3">
        <p className="font-bold text-white">{order.buyerName}</p>
        <p className="mt-1 text-xs text-ink-400">{order.buyerCompany}</p>
      </td>
      <td className="border-t border-white/10 px-3 py-3">
        <p className="max-w-[260px] truncate font-bold text-white">{order.productTitle}</p>
        <p className="mt-1 font-mono text-[11px] text-ink-500">{order.id.slice(0, 8)}</p>
      </td>
      <td className="border-t border-white/10 px-3 py-3 capitalize text-ink-200">{order.order_type.replace(/_/g, " ")}</td>
      <td className="border-t border-white/10 px-3 py-3 text-ink-200">{formatMoney(order.amount, order.currency)}</td>
      <td className="border-t border-white/10 px-3 py-3">
        <Badge label={order.status.replace(/_/g, " ")} tone={statusTone(order.status)} />
      </td>
      <td className="border-t border-white/10 px-3 py-3 text-ink-300">{formatDate(order.created_at)}</td>
      <td className="border-t border-white/10 px-3 py-3">
        <p className="text-xs text-ink-300">{order.payment_provider}</p>
        <p className="mt-1 font-mono text-[11px] text-ink-500">{order.payment_session_id?.slice(0, 18) || "no session"}</p>
      </td>
      <td className="border-t border-white/10 px-3 py-3">
        <div className="grid min-w-[360px] gap-2">
          <textarea
            value={adminNotes}
            onChange={(event) => setAdminNotes(event.target.value)}
            rows={2}
            placeholder="Admin note for review, entitlement, or refund state."
            className="rounded-lg border border-white/10 bg-ink-950 px-3 py-2 text-xs leading-5 text-white outline-none focus:border-cyan-300/50"
          />
          <div className="flex flex-wrap gap-2">
            {([
              ["approve_manual_review", ShieldCheck],
              ["grant_entitlement", BadgeCheck],
              ["revoke_entitlement", XCircle],
              ["mark_fulfilled", ShieldCheck],
              ["mark_refunded", Undo2],
            ] as const).map(([action, Icon]) => (
              <button
                key={action}
                type="button"
                onClick={() => submit(action)}
                disabled={Boolean(pendingAction)}
                className={cn(
                  "inline-flex min-h-9 items-center justify-center gap-1 rounded-md border px-2.5 text-xs font-bold disabled:opacity-50",
                  action === "grant_entitlement" || action === "approve_manual_review" || action === "mark_fulfilled"
                    ? "border-cyan-300/30 text-cyan-100 hover:bg-cyan-300/10"
                    : "border-red-300/30 text-red-100 hover:bg-red-300/10",
                )}
              >
                {pendingAction === action ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Icon className="h-3.5 w-3.5" />}
                {action.replace(/_/g, " ")}
              </button>
            ))}
          </div>
          {result ? <p className="text-xs text-ink-300">{result}</p> : null}
        </div>
      </td>
    </tr>
  );
}

function Stat({ icon: Icon, label, value }: { icon: ElementType; label: string; value: string }) {
  return (
    <div className="rounded-xl border border-white/10 bg-white/[0.04] p-4">
      <div className="flex items-center justify-between gap-3">
        <p className="text-[11px] font-extrabold uppercase tracking-wider text-ink-400">{label}</p>
        <Icon className="h-4 w-4 text-cyan-300" />
      </div>
      <p className="mt-2 text-3xl font-black text-white">{value}</p>
    </div>
  );
}

function Badge({ label, tone }: { label: string; tone: string }) {
  return <span className={cn("inline-flex rounded-full border px-2.5 py-1 text-xs font-extrabold capitalize", tone)}>{label}</span>;
}
