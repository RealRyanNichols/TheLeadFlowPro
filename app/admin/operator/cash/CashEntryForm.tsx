"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { CheckCircle2, CircleDollarSign, LoaderCircle } from "lucide-react";

function localNow() {
  const date = new Date();
  const offset = date.getTimezoneOffset();
  return new Date(date.getTime() - offset * 60_000).toISOString().slice(0, 16);
}

export default function CashEntryForm() {
  const router = useRouter();
  const [form, setForm] = useState({
    amountUsd: "",
    receivedAt: localNow(),
    source: "check",
    payerName: "",
    memo: "",
    externalReference: "",
    verified: false,
  });
  const [busy, setBusy] = useState(false);
  const [notice, setNotice] = useState("");

  function set<K extends keyof typeof form>(key: K, value: (typeof form)[K]) {
    setForm((current) => ({ ...current, [key]: value }));
  }

  async function submit(event: React.FormEvent) {
    event.preventDefault();
    if (busy) return;
    setBusy(true);
    setNotice("");
    try {
      const response = await fetch("/api/admin/operator/cash", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ...form, receivedAt: new Date(form.receivedAt).toISOString() }),
      });
      const payload = (await response.json().catch(() => ({}))) as { error?: string };
      if (!response.ok) throw new Error(payload.error || "The payment could not be recorded");
      setNotice("Payment recorded and the cash mission was refreshed.");
      setForm({
        amountUsd: "",
        receivedAt: localNow(),
        source: "check",
        payerName: "",
        memo: "",
        externalReference: "",
        verified: false,
      });
      router.refresh();
    } catch (error) {
      setNotice(error instanceof Error ? error.message : "The payment could not be recorded");
    } finally {
      setBusy(false);
    }
  }

  const success = notice.startsWith("Payment recorded");

  return (
    <form onSubmit={submit} className="rounded-2xl border border-[var(--line)] bg-white p-5 shadow-[0_12px_32px_rgba(10,18,32,0.04)] sm:p-6">
      <div className="flex items-start gap-3">
        <CircleDollarSign className="mt-0.5 h-5 w-5 text-[var(--blue)]" />
        <div>
          <h2 className="text-xl font-black text-[var(--heading)]">Record money received outside Stripe</h2>
          <p className="mt-1 text-sm leading-6 text-[var(--muted)]">Use this for a check, ACH, cash, wire, or another verified receipt. Do not record an unpaid promise, open invoice, or expected deal.</p>
        </div>
      </div>

      <div className="mt-5 grid gap-4 sm:grid-cols-2">
        <label className="text-xs font-black uppercase tracking-wide text-[var(--muted)]">
          Amount received
          <div className="mt-1 flex rounded-lg border border-[var(--line-strong)] bg-white focus-within:border-[var(--blue)]">
            <span className="flex items-center px-3 text-sm font-black text-[var(--muted)]">$</span>
            <input
              required
              inputMode="decimal"
              min="0.01"
              max="250000"
              step="0.01"
              value={form.amountUsd}
              onChange={(event) => set("amountUsd", event.target.value)}
              className="min-w-0 flex-1 rounded-r-lg px-1 py-2 text-sm font-semibold text-[var(--text)] outline-none"
            />
          </div>
        </label>
        <label className="text-xs font-black uppercase tracking-wide text-[var(--muted)]">
          Received on your device
          <input
            required
            type="datetime-local"
            value={form.receivedAt}
            onChange={(event) => set("receivedAt", event.target.value)}
            className="mt-1 w-full rounded-lg border border-[var(--line-strong)] bg-white px-3 py-2 text-sm font-semibold text-[var(--text)]"
          />
        </label>
        <label className="text-xs font-black uppercase tracking-wide text-[var(--muted)]">
          Source
          <select value={form.source} onChange={(event) => set("source", event.target.value)} className="mt-1 w-full rounded-lg border border-[var(--line-strong)] bg-white px-3 py-2 text-sm font-semibold text-[var(--text)]">
            <option value="check">Check</option>
            <option value="ach">ACH</option>
            <option value="cash">Cash</option>
            <option value="wire">Wire</option>
            <option value="other">Other</option>
          </select>
        </label>
        <label className="text-xs font-black uppercase tracking-wide text-[var(--muted)]">
          Payer or business
          <input required maxLength={300} value={form.payerName} onChange={(event) => set("payerName", event.target.value)} className="mt-1 w-full rounded-lg border border-[var(--line-strong)] px-3 py-2 text-sm font-semibold text-[var(--text)]" />
        </label>
        <label className="text-xs font-black uppercase tracking-wide text-[var(--muted)] sm:col-span-2">
          Reference
          <input maxLength={300} value={form.externalReference} onChange={(event) => set("externalReference", event.target.value)} placeholder="Check number, ACH trace, bank memo, or another unique reference" className="mt-1 w-full rounded-lg border border-[var(--line-strong)] px-3 py-2 text-sm font-semibold text-[var(--text)]" />
        </label>
      </div>

      <label className="mt-4 block text-xs font-black uppercase tracking-wide text-[var(--muted)]">
        Memo
        <textarea rows={3} maxLength={3000} value={form.memo} onChange={(event) => set("memo", event.target.value)} placeholder="What was paid for, deposit/final payment, or anything needed to reconcile it later." className="mt-1 w-full rounded-xl border border-[var(--line-strong)] px-3 py-3 text-sm leading-6 text-[var(--text)]" />
      </label>

      <label className="mt-4 flex items-start gap-3 rounded-xl border border-emerald-200 bg-emerald-50 p-3 text-sm font-semibold text-emerald-950">
        <input required type="checkbox" checked={form.verified} onChange={(event) => set("verified", event.target.checked)} className="mt-1" />
        <span><span className="inline-flex items-center gap-1 font-black"><CheckCircle2 className="h-4 w-4" /> Money received</span><br /><span className="text-xs font-normal leading-5">I verified that this money has cleared or is physically in hand. This is not an estimate, proposal, or unpaid invoice.</span></span>
      </label>

      <button type="submit" disabled={busy} className="mt-4 inline-flex min-h-[44px] items-center gap-2 rounded-lg bg-[var(--blue)] px-5 text-sm font-black text-white disabled:opacity-50">
        {busy ? <LoaderCircle className="h-4 w-4 animate-spin" /> : <CircleDollarSign className="h-4 w-4" />} Record verified cash
      </button>
      {notice && <p className={`mt-3 rounded-lg border px-3 py-2 text-xs font-bold ${success ? "border-emerald-200 bg-emerald-50 text-emerald-800" : "border-red-200 bg-red-50 text-red-800"}`}>{notice}</p>}
    </form>
  );
}
