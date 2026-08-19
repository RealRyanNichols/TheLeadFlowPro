"use client";

import { useMemo, useState } from "react";

type Lead = { id: string; full_name: string; business_name: string | null; email: string };
type Line = { description: string; quantity: string; unitPrice: string };
type Invoice = {
  id: string;
  lead_id: string;
  invoice_number: string | null;
  status: string;
  subtotal_cents: number;
  customer_name: string;
  customer_email: string;
  due_date: string;
  hosted_invoice_url: string | null;
  created_at: string;
  sent_at: string | null;
};

function defaultDueDate() {
  const date = new Date();
  date.setDate(date.getDate() + 7);
  return date.toISOString().slice(0, 10);
}

function money(cents: number) {
  return new Intl.NumberFormat("en-US", { style: "currency", currency: "USD" }).format(cents / 100);
}

export default function InvoiceBuilder({
  leads,
  initialInvoices,
  initialLeadId,
}: {
  leads: Lead[];
  initialInvoices: Invoice[];
  initialLeadId: string;
}) {
  const firstLeadId = leads.some((lead) => lead.id === initialLeadId) ? initialLeadId : leads[0]?.id ?? "";
  const [leadId, setLeadId] = useState(firstLeadId);
  const [customerName, setCustomerName] = useState(() => {
    const lead = leads.find((item) => item.id === firstLeadId);
    return lead?.business_name || lead?.full_name || "";
  });
  const [dueDate, setDueDate] = useState(defaultDueDate());
  const [memo, setMemo] = useState("Thank you for choosing The LeadFlow Pro. This invoice reflects the agreed scope.");
  const [lines, setLines] = useState<Line[]>([{ description: "", quantity: "1", unitPrice: "500.00" }]);
  const [invoices, setInvoices] = useState(initialInvoices);
  const [reviewing, setReviewing] = useState(false);
  const [confirmed, setConfirmed] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState<Invoice | null>(null);

  const lead = leads.find((item) => item.id === leadId);
  const normalized = useMemo(
    () => lines.map((line) => ({
      description: line.description.trim(),
      quantity: Number(line.quantity),
      unit_amount_cents: Math.round(Number(line.unitPrice) * 100),
    })),
    [lines],
  );
  const total = normalized.reduce((sum, line) => sum + (Number.isFinite(line.quantity * line.unit_amount_cents) ? line.quantity * line.unit_amount_cents : 0), 0);

  function chooseLead(id: string) {
    const next = leads.find((item) => item.id === id);
    setLeadId(id);
    setCustomerName(next?.business_name || next?.full_name || "");
    setReviewing(false);
    setConfirmed(false);
    setSuccess(null);
  }

  function updateLine(index: number, field: keyof Line, value: string) {
    setLines((items) => items.map((item, itemIndex) => itemIndex === index ? { ...item, [field]: value } : item));
  }

  function review() {
    setError("");
    if (!lead) return setError("Choose a lead");
    if (!customerName.trim()) return setError("Customer name is required");
    if (!dueDate) return setError("Choose a due date");
    if (normalized.some((line) => !line.description || !Number.isInteger(line.quantity) || line.quantity < 1 || !Number.isInteger(line.unit_amount_cents) || line.unit_amount_cents < 100)) {
      return setError("Every line item needs a description, whole-number quantity, and price of at least $1");
    }
    if (total > 25_000_000) return setError("Invoice total cannot exceed $250,000");
    setReviewing(true);
  }

  async function sendInvoice() {
    if (!confirmed || !lead || busy) return;
    setBusy(true);
    setError("");
    try {
      const response = await fetch("/api/sales/invoices", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          confirmed: true,
          lead_id: lead.id,
          customer_name: customerName,
          due_date: dueDate,
          memo,
          line_items: normalized,
          idempotency_key: window.crypto.randomUUID(),
        }),
      });
      const json = await response.json();
      if (!response.ok) throw new Error(json.error || "Invoice could not be sent");
      setSuccess(json.invoice as Invoice);
      setInvoices((items) => [json.invoice as Invoice, ...items.filter((item) => item.id !== json.invoice.id)]);
      setReviewing(false);
      setConfirmed(false);
    } catch (sendError) {
      setError(sendError instanceof Error ? sendError.message : "Invoice could not be sent");
    }
    setBusy(false);
  }

  return (
    <div className="space-y-8">
      <div>
        <h2 className="text-2xl font-black text-[var(--heading)]">Create a Stripe invoice</h2>
        <p className="mt-1 text-sm text-[var(--muted)]">
          Build the scope here. Stripe emails the invoice and hosts the secure payment page.
        </p>
      </div>

      {success && (
        <div className="rounded-xl border border-mint/30 bg-mint/10 p-4 text-sm text-[var(--text)]">
          <p className="font-bold text-mint">Invoice {success.invoice_number || "created"} was sent to {success.customer_email}.</p>
          {success.hosted_invoice_url && <a href={success.hosted_invoice_url} target="_blank" rel="noreferrer" className="mt-2 inline-block font-bold text-flow-400">Open hosted invoice ↗</a>}
        </div>
      )}
      {error && <p className="rounded-lg border border-[var(--danger-line)] bg-[var(--danger-tint)] p-3 text-sm text-[var(--danger)]">{error}</p>}

      <div className="grid gap-6 lg:grid-cols-[1.15fr_.85fr]">
        <section className="card !p-5">
          {!reviewing ? (
            <div className="space-y-5">
              <div>
                <label className="label" htmlFor="invoice-lead">Client lead</label>
                <select id="invoice-lead" className="input" value={leadId} onChange={(event) => chooseLead(event.target.value)}>
                  {leads.map((item) => <option key={item.id} value={item.id}>{item.business_name ? `${item.business_name} · ${item.full_name}` : item.full_name}</option>)}
                </select>
              </div>
              <div className="grid gap-4 sm:grid-cols-2">
                <div>
                  <label className="label" htmlFor="invoice-name">Invoice name</label>
                  <input id="invoice-name" className="input" value={customerName} onChange={(event) => setCustomerName(event.target.value)} maxLength={200} />
                </div>
                <div>
                  <label className="label" htmlFor="invoice-email">Recipient email</label>
                  <input id="invoice-email" className="input opacity-75" value={lead?.email ?? ""} readOnly />
                  <p className="mt-1 text-[11px] text-[var(--quiet)]">Locked to the CRM lead for safety.</p>
                </div>
              </div>

              <div>
                <div className="mb-2 flex items-center justify-between">
                  <h3 className="font-bold text-[var(--heading)]">Line items</h3>
                  <button type="button" onClick={() => setLines((items) => [...items, { description: "", quantity: "1", unitPrice: "0.00" }])} disabled={lines.length >= 12} className="text-sm font-bold text-flow-400 disabled:opacity-40">+ Add item</button>
                </div>
                <div className="space-y-3">
                  {lines.map((line, index) => (
                    <div key={index} className="grid gap-2 rounded-xl border border-line p-3 sm:grid-cols-[1fr_90px_130px_36px]">
                      <input className="input text-sm" value={line.description} onChange={(event) => updateLine(index, "description", event.target.value)} placeholder="Service or deliverable" maxLength={200} />
                      <input className="input text-sm" type="number" min="1" max="1000" step="1" value={line.quantity} onChange={(event) => updateLine(index, "quantity", event.target.value)} aria-label="Quantity" />
                      <input className="input text-sm" type="number" min="1" max="100000" step="0.01" value={line.unitPrice} onChange={(event) => updateLine(index, "unitPrice", event.target.value)} aria-label="Unit price in dollars" />
                      <button type="button" onClick={() => setLines((items) => items.filter((_, itemIndex) => itemIndex !== index))} disabled={lines.length === 1} className="text-lg text-[var(--danger)] disabled:opacity-30" aria-label="Remove line item">×</button>
                    </div>
                  ))}
                </div>
              </div>

              <div className="grid gap-4 sm:grid-cols-2">
                <div>
                  <label className="label" htmlFor="invoice-due">Payment due</label>
                  <input id="invoice-due" className="input" type="date" value={dueDate} onChange={(event) => setDueDate(event.target.value)} />
                </div>
                <div className="rounded-xl bg-[var(--page)] p-4 text-right">
                  <p className="text-xs uppercase tracking-wide text-[var(--muted)]">Invoice total</p>
                  <p className="text-3xl font-black text-[var(--heading)]">{money(total)}</p>
                </div>
              </div>
              <div>
                <label className="label" htmlFor="invoice-memo">Memo</label>
                <textarea id="invoice-memo" className="input" rows={4} value={memo} onChange={(event) => setMemo(event.target.value)} maxLength={2000} />
              </div>
              <div className="rounded-lg bg-[var(--warn-tint)] p-3 text-xs text-warn">
                Tax is not calculated automatically. Confirm any tax obligation with Ryan before adding it to a client scope.
              </div>
              <button type="button" onClick={review} className="btn-primary w-full">Review invoice</button>
            </div>
          ) : (
            <div className="space-y-5">
              <div className="flex items-center justify-between">
                <h3 className="text-xl font-black text-[var(--heading)]">Final review</h3>
                <button type="button" onClick={() => { setReviewing(false); setConfirmed(false); }} className="text-sm font-bold text-flow-400">Edit</button>
              </div>
              <div className="rounded-xl bg-[var(--page)] p-4 text-sm">
                <p className="font-bold text-[var(--heading)]">{customerName}</p>
                <p className="text-[var(--muted)]">{lead?.email}</p>
                <p className="mt-1 text-[var(--muted)]">Due {new Date(`${dueDate}T12:00:00`).toLocaleDateString()}</p>
              </div>
              <ul className="divide-y divide-line rounded-xl border border-line">
                {normalized.map((line, index) => (
                  <li key={index} className="flex justify-between gap-4 p-3 text-sm">
                    <span>{line.description} <span className="text-[var(--muted)]">× {line.quantity}</span></span>
                    <span className="font-bold">{money(line.quantity * line.unit_amount_cents)}</span>
                  </li>
                ))}
                <li className="flex justify-between p-3 text-lg font-black"><span>Total</span><span>{money(total)}</span></li>
              </ul>
              <p className="whitespace-pre-wrap text-sm text-[var(--muted)]">{memo}</p>
              <label className="flex items-start gap-3 rounded-xl border border-[var(--line-strong)] p-4 text-sm text-[var(--text)]">
                <input type="checkbox" className="mt-1" checked={confirmed} onChange={(event) => setConfirmed(event.target.checked)} />
                I confirm the client, scope, prices, total, and due date. Send this invoice through Stripe now.
              </label>
              <button type="button" onClick={sendInvoice} disabled={!confirmed || busy} className="btn-primary w-full disabled:opacity-50">
                {busy ? "Creating and sending" : `Confirm and send ${money(total)} invoice`}
              </button>
            </div>
          )}
        </section>

        <section className="card !p-5">
          <h3 className="font-bold text-[var(--heading)]">Invoice history</h3>
          <div className="mt-4 space-y-3">
            {invoices.map((invoice) => (
              <div key={invoice.id} className="rounded-xl border border-line p-3 text-sm">
                <div className="flex items-start justify-between gap-3">
                  <div><p className="font-bold text-[var(--heading)]">{invoice.customer_name}</p><p className="text-xs text-[var(--muted)]">{invoice.customer_email}</p></div>
                  <span className="rounded-full bg-[var(--fill-3)] px-2 py-1 text-[11px] font-bold uppercase text-[var(--text)]">{invoice.status.replace(/_/g, " ")}</span>
                </div>
                <div className="mt-3 flex items-end justify-between gap-3">
                  <div className="text-xs text-[var(--muted)]"><p>{invoice.invoice_number || "Stripe draft"}</p><p>{new Date(invoice.created_at).toLocaleDateString()} · due {new Date(`${invoice.due_date}T12:00:00`).toLocaleDateString()}</p></div>
                  <div className="text-right"><p className="font-black text-[var(--heading)]">{money(invoice.subtotal_cents)}</p>{invoice.hosted_invoice_url && <a href={invoice.hosted_invoice_url} target="_blank" rel="noreferrer" className="text-xs font-bold text-flow-400">Open ↗</a>}</div>
                </div>
              </div>
            ))}
            {invoices.length === 0 && <p className="text-sm text-[var(--muted)]">No invoices sent from the Sales Desk yet.</p>}
          </div>
        </section>
      </div>
    </div>
  );
}
