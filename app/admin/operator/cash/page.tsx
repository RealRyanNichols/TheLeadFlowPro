import Link from "next/link";
import { ArrowRight, BadgeDollarSign, Banknote, CircleDollarSign, FileClock, Landmark, ReceiptText, ShieldCheck } from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import { centralDate, money, number } from "@/lib/operatoros/growth";
import CashEntryForm from "./CashEntryForm";
import VoidCashButton from "./VoidCashButton";

export const metadata = { title: "Verified Cash Ledger | The LeadFlow Pro" };
export const dynamic = "force-dynamic";

type CashEntry = {
  workspace_id: string;
  source_type: string;
  source_id: string;
  external_reference: string | null;
  payer_label: string | null;
  description: string | null;
  amount_cents: number;
  received_at: string;
};

type Mission = {
  name: string;
  target_value: number | string | null;
  current_value: number | string | null;
  starts_at: string | null;
  target_at: string | null;
};

function sourceLabel(source: string) {
  const labels: Record<string, string> = {
    checkout: "Stripe checkout",
    invoice: "Paid Stripe invoice",
    manual_check: "Check",
    manual_ach: "ACH",
    manual_cash: "Cash",
    manual_wire: "Wire",
    manual_other: "Other verified payment",
  };
  return labels[source] || source.replaceAll("_", " ");
}

function sourceTone(source: string) {
  if (source === "checkout") return "border-violet-200 bg-violet-50 text-violet-800";
  if (source === "invoice") return "border-cyan-200 bg-cyan-50 text-cyan-800";
  return "border-emerald-200 bg-emerald-50 text-emerald-800";
}

function when(value: string) {
  return new Intl.DateTimeFormat("en-US", {
    dateStyle: "medium",
    timeStyle: "short",
    timeZone: "America/Chicago",
  }).format(new Date(value));
}

export default async function VerifiedCashLedger() {
  const supabase = await createClient();
  const { data: workspace, error: workspaceError } = await supabase
    .from("operator_workspaces")
    .select("id")
    .eq("slug", "the-leadflow-pro")
    .single();
  if (workspaceError || !workspace) throw new Error("OperatorOS workspace is unavailable.");

  const since365 = new Date(Date.now() - 365 * 86400_000).toISOString();
  const [cashResult, missionResult, invoiceResult, voidResult] = await Promise.all([
    supabase
      .from("operator_verified_cash_entries")
      .select("workspace_id,source_type,source_id,external_reference,payer_label,description,amount_cents,received_at")
      .eq("workspace_id", workspace.id)
      .gte("received_at", since365)
      .order("received_at", { ascending: false })
      .limit(5000),
    supabase
      .from("operator_missions")
      .select("name,target_value,current_value,starts_at,target_at")
      .eq("workspace_id", workspace.id)
      .eq("status", "active")
      .eq("target_metric", "cash_collected_usd")
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle(),
    supabase
      .from("sales_invoices")
      .select("id,invoice_number,customer_name,customer_email,status,subtotal_cents,due_date,hosted_invoice_url")
      .not("status", "in", "(paid,void,uncollectible)")
      .order("due_date", { ascending: true, nullsFirst: false })
      .limit(50),
    supabase
      .from("operator_manual_cash_events")
      .select("id,payer_name,amount_cents,received_at,source,voided_at,void_reason")
      .eq("workspace_id", workspace.id)
      .eq("status", "void")
      .order("voided_at", { ascending: false })
      .limit(10),
  ]);

  const firstError = [cashResult, missionResult, invoiceResult, voidResult]
    .map((result) => result.error)
    .find(Boolean);
  if (firstError) throw new Error(`Verified Cash Ledger is temporarily unavailable: ${firstError.message}`);

  const entries = (cashResult.data ?? []) as CashEntry[];
  const mission = missionResult.data as Mission | null;
  const openInvoices = invoiceResult.data ?? [];
  const voidEntries = voidResult.data ?? [];
  const today = centralDate();
  const since30 = Date.now() - 30 * 86400_000;
  const missionStart = mission?.starts_at ? new Date(mission.starts_at).getTime() : -Infinity;
  const missionEnd = mission?.target_at ? new Date(mission.target_at).getTime() : Infinity;

  const totalCents = entries.reduce((sum, entry) => sum + Number(entry.amount_cents || 0), 0);
  const todayCents = entries
    .filter((entry) => centralDate(entry.received_at) === today)
    .reduce((sum, entry) => sum + Number(entry.amount_cents || 0), 0);
  const last30Cents = entries
    .filter((entry) => new Date(entry.received_at).getTime() >= since30)
    .reduce((sum, entry) => sum + Number(entry.amount_cents || 0), 0);
  const missionCents = entries
    .filter((entry) => {
      const received = new Date(entry.received_at).getTime();
      return received >= missionStart && received <= missionEnd;
    })
    .reduce((sum, entry) => sum + Number(entry.amount_cents || 0), 0);
  const missionTargetCents = Number(mission?.target_value || 0) * 100;
  const missionGapCents = Math.max(0, missionTargetCents - missionCents);
  const openInvoiceCents = openInvoices.reduce((sum, invoice) => sum + Number(invoice.subtotal_cents || 0), 0);

  const sourceTotals = new Map<string, { count: number; cents: number }>();
  entries.forEach((entry) => {
    const current = sourceTotals.get(entry.source_type) || { count: 0, cents: 0 };
    sourceTotals.set(entry.source_type, {
      count: current.count + 1,
      cents: current.cents + Number(entry.amount_cents || 0),
    });
  });

  const cards = [
    { label: "Verified today", value: money(todayCents / 100), note: `${entries.filter((entry) => centralDate(entry.received_at) === today).length} receipts`, icon: CircleDollarSign },
    { label: "Verified 30 days", value: money(last30Cents / 100), note: "checkout + paid invoices + verified offline cash", icon: BadgeDollarSign },
    { label: "Mission cash", value: money(missionCents / 100), note: mission ? `${money(missionGapCents / 100)} remaining to ${money(missionTargetCents / 100)}` : "No active cash mission", icon: Landmark },
    { label: "Open invoices", value: money(openInvoiceCents / 100), note: `${openInvoices.length} unpaid or unresolved · excluded from cash`, icon: FileClock },
  ];

  return (
    <div className="space-y-7">
      <section className="overflow-hidden rounded-[28px] border border-[#ffffff1f] bg-[#07111f] p-6 text-white shadow-[0_30px_90px_rgba(7,17,31,0.24)] sm:p-8">
        <div className="flex flex-col justify-between gap-5 lg:flex-row lg:items-end">
          <div>
            <p className="text-xs font-black uppercase tracking-[0.22em] text-[#50d4ff]">OperatorOS · money received</p>
            <h1 className="mt-2 text-4xl font-black tracking-tight sm:text-5xl">Verified Cash Ledger</h1>
            <p className="mt-3 max-w-3xl text-sm leading-6 text-[#b8c5d9]">One conservative cash number built from three separate sources. Paid checkouts, paid invoices, and offline payments confirmed by a human are included. Open invoices, proposals, expected value, and verbal commitments are excluded.</p>
          </div>
          <Link href="/admin/operator/growth" className="inline-flex min-h-[44px] items-center justify-center gap-2 rounded-xl bg-[#1240e8] px-5 text-sm font-black text-white">Open Goal Mode <ArrowRight className="h-4 w-4" /></Link>
        </div>
      </section>

      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        {cards.map(({ label, value, note, icon: Icon }) => (
          <section key={label} className="rounded-2xl border border-[var(--line)] bg-white p-5 shadow-[0_10px_30px_rgba(10,18,32,0.04)]">
            <Icon className="h-5 w-5 text-[var(--blue)]" />
            <p className="mt-3 text-xs font-black uppercase tracking-wide text-[var(--muted)]">{label}</p>
            <p className="mt-1 text-3xl font-black tracking-tight text-[var(--heading)]">{value}</p>
            <p className="mt-1 text-xs leading-5 text-[var(--muted)]">{note}</p>
          </section>
        ))}
      </div>

      <div className="grid gap-6 xl:grid-cols-[minmax(0,1fr)_minmax(360px,.72fr)]">
        <CashEntryForm />

        <section className="rounded-2xl border border-[var(--line)] bg-white p-5 shadow-[0_12px_32px_rgba(10,18,32,0.04)] sm:p-6">
          <div className="flex items-start gap-3">
            <ReceiptText className="mt-0.5 h-5 w-5 text-[var(--blue)]" />
            <div><h2 className="text-xl font-black text-[var(--heading)]">Cash by source</h2><p className="mt-1 text-sm leading-6 text-[var(--muted)]">Separate lanes make reconciliation visible and prevent a paid invoice from being mistaken for an open one.</p></div>
          </div>
          <div className="mt-5 space-y-3">
            {[...sourceTotals.entries()].sort((a, b) => b[1].cents - a[1].cents).map(([source, total]) => (
              <div key={source} className="flex items-center justify-between gap-3 rounded-xl border border-[var(--line)] bg-[var(--fill-2)] px-4 py-3">
                <div><p className="font-black text-[var(--heading)]">{sourceLabel(source)}</p><p className="text-xs text-[var(--muted)]">{number(total.count)} verified entries</p></div>
                <p className="text-xl font-black text-[var(--blue)]">{money(total.cents / 100)}</p>
              </div>
            ))}
            {!sourceTotals.size && <div className="rounded-xl border border-dashed border-[var(--line-strong)] p-5 text-center"><Banknote className="mx-auto h-5 w-5 text-[var(--muted)]" /><p className="mt-2 font-black text-[var(--heading)]">No verified cash entries yet</p><p className="mt-1 text-xs text-[var(--muted)]">The ledger is ready for the first checkout, paid invoice, check, ACH, cash, or wire receipt.</p></div>}
          </div>
          <div className="mt-5 rounded-xl border border-emerald-200 bg-emerald-50 p-4 text-sm leading-6 text-emerald-950">
            <p className="inline-flex items-center gap-2 font-black"><ShieldCheck className="h-4 w-4" /> Accounting rule</p>
            <p className="mt-1">Money enters this total only after the underlying record says paid or a human explicitly confirms the offline receipt. Voids stay in the audit history and immediately leave the total.</p>
          </div>
        </section>
      </div>

      <section className="overflow-hidden rounded-2xl border border-[var(--line)] bg-white shadow-[0_12px_32px_rgba(10,18,32,0.04)]">
        <div className="border-b border-[var(--line)] px-5 py-4"><h2 className="font-black text-[var(--heading)]">Verified receipt history</h2><p className="mt-1 text-xs text-[var(--muted)]">Most recent first. Offline entries can be voided but not erased.</p></div>
        <div className="overflow-x-auto">
          <table className="w-full min-w-[820px] text-left text-sm">
            <thead className="bg-[var(--fill-2)] text-[11px] uppercase tracking-wide text-[var(--muted)]"><tr><th className="px-5 py-3">Received</th><th className="px-4 py-3">Source</th><th className="px-4 py-3">Payer</th><th className="px-4 py-3">Description / reference</th><th className="px-4 py-3 text-right">Amount</th><th className="px-4 py-3"></th></tr></thead>
            <tbody className="divide-y divide-[var(--line)]">
              {entries.map((entry) => (
                <tr key={`${entry.source_type}-${entry.source_id}`}>
                  <td className="px-5 py-4 font-semibold text-[var(--heading)]">{when(entry.received_at)}</td>
                  <td className="px-4 py-4"><span className={`rounded-full border px-2.5 py-1 text-xs font-black ${sourceTone(entry.source_type)}`}>{sourceLabel(entry.source_type)}</span></td>
                  <td className="px-4 py-4 font-semibold text-[var(--text)]">{entry.payer_label || "—"}</td>
                  <td className="px-4 py-4"><p className="max-w-[360px] font-semibold text-[var(--text)]">{entry.description || "Verified cash"}</p>{entry.external_reference && <p className="mt-1 max-w-[360px] truncate text-xs text-[var(--muted)]">{entry.external_reference}</p>}</td>
                  <td className="px-4 py-4 text-right text-lg font-black text-emerald-700">{money(Number(entry.amount_cents || 0) / 100)}</td>
                  <td className="px-4 py-4">{entry.source_type.startsWith("manual_") && <VoidCashButton entryId={entry.source_id} />}</td>
                </tr>
              ))}
              {!entries.length && <tr><td colSpan={6} className="px-5 py-12 text-center text-sm text-[var(--muted)]">No verified receipts are recorded yet.</td></tr>}
            </tbody>
          </table>
        </div>
      </section>

      {(openInvoices.length > 0 || voidEntries.length > 0) && (
        <div className="grid gap-6 lg:grid-cols-2">
          <section className="rounded-2xl border border-[var(--line)] bg-white p-5">
            <h2 className="font-black text-[var(--heading)]">Open invoices excluded from cash</h2>
            <div className="mt-4 space-y-3">{openInvoices.map((invoice) => <div key={invoice.id} className="flex items-center justify-between gap-3 rounded-xl border border-[var(--line)] p-3"><div><p className="font-black text-[var(--heading)]">{invoice.customer_name || invoice.customer_email || invoice.invoice_number || "Invoice"}</p><p className="mt-1 text-xs text-[var(--muted)]">{invoice.status} · due {invoice.due_date || "not set"}</p></div><p className="font-black text-[var(--text)]">{money(Number(invoice.subtotal_cents || 0) / 100)}</p></div>)}</div>
          </section>
          <section className="rounded-2xl border border-[var(--line)] bg-white p-5">
            <h2 className="font-black text-[var(--heading)]">Recent voids</h2>
            <div className="mt-4 space-y-3">{voidEntries.map((entry) => <div key={entry.id} className="rounded-xl border border-red-100 bg-red-50 p-3"><div className="flex items-center justify-between gap-3"><p className="font-black text-red-950">{entry.payer_name || "Offline payment"}</p><p className="font-black text-red-800">{money(Number(entry.amount_cents || 0) / 100)}</p></div><p className="mt-1 text-xs text-red-800">{entry.source} · {entry.void_reason || "No reason recorded"}</p></div>)}</div>
          </section>
        </div>
      )}

      <p className="text-center text-xs text-[var(--muted)]">Last 12 months loaded: {money(totalCents / 100)} across {entries.length} verified receipt records.</p>
    </div>
  );
}
