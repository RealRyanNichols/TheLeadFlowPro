"use client";

import Link from "next/link";
import { useState } from "react";
import { ArrowRight, CheckCircle2 } from "lucide-react";
import { MONTHLY_MENU, type MonthlyMenuId } from "@/lib/toolStudio";

export default function MonthlyMenuChange() {
  const [selected, setSelected] = useState<MonthlyMenuId[]>([]);
  const [sending, setSending] = useState(false);
  const [done, setDone] = useState(false);
  const [error, setError] = useState<string | null>(null);

  function toggle(id: MonthlyMenuId) {
    setSelected((items) => items.includes(id) ? items.filter((item) => item !== id) : [...items, id]);
  }

  async function submit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setSending(true);
    setError(null);
    const form = new FormData(event.currentTarget);
    const chosen = MONTHLY_MENU.filter((item) => selected.includes(item.id));
    const requestedAction = String(form.get("requested_action") ?? "replace");
    const response = await fetch("/api/leads", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        full_name: form.get("full_name"),
        email: form.get("email"),
        business_name: form.get("business_name"),
        interest: "company_os",
        desired_modules: ["forms_tools", "email_automation", "analytics_reporting"],
        goals: `MONTHLY BUILD MENU CHANGE. Action: ${requestedAction}. Requested menu: ${chosen.length ? chosen.map((item) => `${item.name} $${item.priceUsd}/month`).join("; ") : "No recurring menu items"}. Notes: ${String(form.get("notes") ?? "").trim()}`,
        best_contact_method: "email",
        sms_consent: false,
        marketing_email_consent: false,
        diagnostic: {
          version: 1,
          source: "tool_studio_monthly_change",
          requested_action: requestedAction,
          requested_monthly_ids: selected,
          next_action:
            "Verify the customer and renewal date in Stripe. Confirm the exact effective date and new recurring total in writing before changing billing.",
        },
      }),
    }).catch(() => null);
    if (!response?.ok) {
      setError("The change request did not save. Email hello@theleadflowpro.com before your renewal date.");
      setSending(false);
      return;
    }
    setDone(true);
    setSending(false);
  }

  return (
    <main className="min-h-screen bg-[#050b19] px-4 py-16 text-slate-200">
      <div className="mx-auto w-full max-w-3xl rounded-[28px] border border-cyan-300/30 bg-[#0b172b] p-6 sm:p-9">
        {!done ? (
          <>
            <p className="text-xs font-black uppercase tracking-[.2em] text-cyan-300">Next-month menu</p>
            <h1 className="mt-4 text-4xl font-black tracking-[-.045em] text-white sm:text-5xl">Change what gets worked next.</h1>
            <p className="mt-5 leading-7 text-slate-400">
              Submit this at least three business days before renewal. This form does not charge, refund, or change Stripe by itself. We verify the account and send written confirmation of the effective date and recurring total before billing changes.
            </p>
            <form onSubmit={submit} className="mt-8 grid gap-5">
              <div className="grid gap-4 sm:grid-cols-2">
                <label className="grid gap-2 text-sm font-bold">Your name *<input name="full_name" required maxLength={200} className="min-h-12 rounded-xl border border-white/15 bg-black/20 px-4 text-white" /></label>
                <label className="grid gap-2 text-sm font-bold">Billing email *<input name="email" type="email" required maxLength={200} className="min-h-12 rounded-xl border border-white/15 bg-black/20 px-4 text-white" /></label>
                <label className="grid gap-2 text-sm font-bold sm:col-span-2">Business name<input name="business_name" maxLength={200} className="min-h-12 rounded-xl border border-white/15 bg-black/20 px-4 text-white" /></label>
              </div>
              <fieldset className="grid gap-3">
                <legend className="text-sm font-black uppercase tracking-wider text-cyan-300">What should this request do?</legend>
                <label className="flex gap-3 text-sm"><input type="radio" name="requested_action" value="replace" defaultChecked className="accent-blue-600" />Replace my next-month menu with the selections below</label>
                <label className="flex gap-3 text-sm"><input type="radio" name="requested_action" value="cancel_all" className="accent-blue-600" />Cancel all recurring Tool Studio work before the next renewal</label>
              </fieldset>
              <div className="grid gap-3 sm:grid-cols-2">
                {MONTHLY_MENU.map((item) => (
                  <button key={item.id} type="button" aria-pressed={selected.includes(item.id)} onClick={() => toggle(item.id)} className={`rounded-xl border p-4 text-left ${selected.includes(item.id) ? "border-cyan-300 bg-cyan-300/10" : "border-white/10 bg-black/15"}`}>
                    <span className="flex justify-between gap-3"><strong className="text-white">{item.name}</strong><strong className="text-cyan-300">${item.priceUsd}/mo</strong></span>
                    <span className="mt-2 block text-xs leading-5 text-slate-400">{item.description}</span>
                  </button>
                ))}
              </div>
              <label className="grid gap-2 text-sm font-bold">Anything we need to know?<textarea name="notes" rows={4} maxLength={1200} className="rounded-xl border border-white/15 bg-black/20 px-4 py-3 text-white" /></label>
              {error ? <p role="alert" className="text-sm font-bold text-red-300">{error}</p> : null}
              <button disabled={sending} className="inline-flex min-h-12 items-center justify-center gap-2 rounded-xl bg-blue-600 px-5 font-black uppercase tracking-wider text-white disabled:opacity-60">
                {sending ? "Sending..." : "Send My Change Request"}<ArrowRight className="h-4 w-4" aria-hidden="true" />
              </button>
            </form>
          </>
        ) : (
          <div className="py-10 text-center">
            <CheckCircle2 className="mx-auto h-12 w-12 text-emerald-400" aria-hidden="true" />
            <h1 className="mt-5 text-4xl font-black text-white">Your request is in.</h1>
            <p className="mx-auto mt-4 max-w-xl leading-7 text-slate-400">We will verify the billing account and send the effective date and new monthly total in writing. Until that confirmation arrives, your current subscription remains unchanged.</p>
            <Link href="/go/tools" className="mt-7 inline-flex min-h-12 items-center rounded-xl border border-white/20 px-5 font-black text-white">Back to Tool Studio</Link>
          </div>
        )}
      </div>
    </main>
  );
}

