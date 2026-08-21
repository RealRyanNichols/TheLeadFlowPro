"use client";

// Checkout form for the Hold The Line offer pages (/offers/[slug]).
//
// The email field is optional: Stripe collects the address at checkout either
// way, but prefilling it saves the buyer a step and keeps the receipt, the
// fulfillment email, and the CRM record on the same address. Price never
// travels from the client; the server reads it from lib/offers.ts by slug.

import { useState } from "react";
import { useRouter } from "next/navigation";

export default function OfferCheckoutForm({
  slug,
  priceLabel,
  amountUsd,
  buttonLabel,
}: {
  slug: string;
  priceLabel: string;
  amountUsd: number;
  buttonLabel?: string;
}) {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setBusy(true);
    setError(null);
    if (window.fbq) {
      window.fbq("track", "InitiateCheckout", { value: amountUsd, currency: "USD" });
    }
    try {
      const r = await fetch("/api/checkout", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          kind: "hold_the_line_offer",
          offer: slug,
          email: email.trim() || undefined,
        }),
      });
      if (r.status === 501) {
        // Stripe is not configured in this environment; the contact page is
        // the graceful landing instead of a dead button.
        router.push("/contact");
        return;
      }
      const j = await r.json().catch(() => ({}));
      if (j.url) {
        window.location.href = j.url;
        return;
      }
      setError(j.error ?? "Could not start checkout. Try again.");
    } catch {
      setError("Could not start checkout. Try again.");
    }
    setBusy(false);
  }

  // Lives on the dark hero, so the label and legal line carry their own
  // light-on-ink colors instead of the light-background .label/.form-legal.
  return (
    <form onSubmit={onSubmit} className="offer-checkout">
      <label
        className="text-[13px] font-bold uppercase tracking-[0.12em] text-white/75"
        htmlFor={`${slug}-email`}
      >
        Email for your receipt and delivery
      </label>
      <div className="mt-2 flex flex-col gap-3 sm:flex-row">
        <input
          className="input flex-1"
          id={`${slug}-email`}
          type="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          maxLength={200}
          autoComplete="email"
          placeholder="you@yourbusiness.com"
        />
        <button
          type="submit"
          disabled={busy}
          className="cb-btn cb-btn--primary disabled:opacity-60"
          data-analytics={`cta-offer-${slug}`}
        >
          {busy ? "Opening checkout..." : (buttonLabel ?? `Buy now | ${priceLabel}`)}
        </button>
      </div>
      {error ? (
        <p className="mt-3 text-[13px] font-semibold text-[#fca5a5]">{error}</p>
      ) : null}
      <p className="mt-3 text-[13px] text-white/55">
        Secure checkout through Stripe. The receipt and next step arrive by email.
      </p>
    </form>
  );
}
