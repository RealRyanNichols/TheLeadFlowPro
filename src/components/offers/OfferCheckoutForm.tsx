"use client";

import { useState } from "react";
import { ArrowRight, Loader2, MessageSquareText, ShieldCheck } from "lucide-react";
import { E164_US_MOBILE_PATTERN } from "@/lib/phone";

type Props = {
  slug: string;
  offerName: string;
  priceLabel: string;
  ctaLabel: string;
};

export function OfferCheckoutForm({ slug, offerName, priceLabel, ctaLabel }: Props) {
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [smsOptOut, setSmsOptOut] = useState(false);
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    setErr(null);

    try {
      const res = await fetch("/api/offers/checkout", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          slug,
          email,
          phone: smsOptOut ? null : phone,
          smsOptOut,
        }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok || !data.url) {
        setErr(data?.error || "Could not open checkout.");
        setBusy(false);
        return;
      }
      window.location.assign(data.url);
    } catch (error) {
      setErr(error instanceof Error ? error.message : "Network error.");
      setBusy(false);
    }
  }

  return (
    <form
      id="offer-checkout"
      onSubmit={submit}
      className="mt-5 rounded-2xl border border-slate-200 bg-white p-4 shadow-sm"
    >
      <div className="flex items-start gap-2">
        <MessageSquareText className="mt-0.5 h-4 w-4 shrink-0 text-cyan-700" />
        <div>
          <div className="text-sm font-bold text-slate-950">Checkout contact</div>
          <p className="mt-1 text-xs leading-relaxed text-slate-600">
            Stripe emails the legal payment record. Ryan texts the working receipt and kickoff note.
          </p>
        </div>
      </div>

      <div className="mt-4 grid gap-3">
        <label className="block">
          <span className="text-[11px] font-bold uppercase tracking-widest text-slate-600">
            Email for Stripe record
          </span>
          <input
            type="email"
            required
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="you@business.com"
            className="mt-1 w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm focus:border-cyan-500 focus:outline-none focus:ring-2 focus:ring-cyan-200"
          />
        </label>

        <label className="block">
          <span className="text-[11px] font-bold uppercase tracking-widest text-slate-600">
            Mobile (we text receipts)
          </span>
          <input
            type="tel"
            inputMode="tel"
            required={!smsOptOut}
            disabled={smsOptOut}
            pattern={E164_US_MOBILE_PATTERN}
            value={phone}
            onChange={(e) => setPhone(e.target.value)}
            placeholder="+19031234567"
            className="mt-1 w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm focus:border-cyan-500 focus:outline-none focus:ring-2 focus:ring-cyan-200 disabled:bg-slate-100 disabled:text-slate-400"
          />
          <span className="mt-1 block text-[11px] leading-relaxed text-slate-500">
            Use E.164 format: +1 followed by 10 digits.
          </span>
        </label>

        <label className="flex items-start gap-2 rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-xs leading-relaxed text-slate-700">
          <input
            type="checkbox"
            checked={smsOptOut}
            onChange={(e) => setSmsOptOut(e.target.checked)}
            className="mt-0.5"
          />
          <span>I&rsquo;d rather not text. Show me the confirmation on the success page.</span>
        </label>
      </div>

      {err && <div className="mt-3 rounded-lg border border-rose-200 bg-rose-50 p-2 text-xs text-rose-900">{err}</div>}

      <button
        type="submit"
        disabled={busy}
        className="mt-4 inline-flex w-full items-center justify-center gap-2 rounded-xl bg-slate-900 px-5 py-3 text-sm font-bold text-white shadow-lg shadow-slate-900/20 hover:bg-slate-800 disabled:opacity-60"
      >
        {busy ? (
          <>
            <Loader2 className="h-4 w-4 animate-spin" /> Opening checkout
          </>
        ) : (
          <>
            {ctaLabel} <ArrowRight className="h-4 w-4" />
          </>
        )}
      </button>

      <div className="mt-3 flex items-start gap-2 text-[11px] leading-relaxed text-slate-500">
        <ShieldCheck className="mt-0.5 h-3.5 w-3.5 shrink-0 text-cyan-700" />
        <span>
          {offerName} · {priceLabel}. Stripe handles payment. No specific outcome guarantees.
        </span>
      </div>
    </form>
  );
}
