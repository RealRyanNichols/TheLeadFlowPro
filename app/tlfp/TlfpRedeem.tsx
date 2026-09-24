"use client";

import { useState } from "react";
import { ArrowRight } from "lucide-react";
import { redeemableCredits } from "@/lib/tlfpCredits";
import { usd } from "@/lib/site/prices";

// "Use credits on" buttons. Each one posts the offer's checkout kind plus the
// number of credits to apply; /api/checkout holds the credits, discounts the
// Stripe session, and the card covers whatever is left (nothing, when the
// credits cover it all).

export type RedeemOffer = {
  kind: string;
  label: string;
  priceUsd: number;
  /** Extra body fields the checkout route expects for this kind. */
  body?: Record<string, unknown>;
  note?: string;
};

export default function TlfpRedeem({ balance, offers }: { balance: number; offers: RedeemOffer[] }) {
  const [busy, setBusy] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function redeem(offer: RedeemOffer) {
    setError(null);
    const credits = redeemableCredits(balance, offer.priceUsd * 100);
    if (credits < 1) {
      setError("No credits to apply yet.");
      return;
    }
    setBusy(offer.kind);
    try {
      const r = await fetch("/api/checkout", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ kind: offer.kind, ...(offer.body ?? {}), tlfp_credits: credits }),
      });
      const j = await r.json().catch(() => ({}));
      if (!r.ok || !j.url) {
        setError(typeof j.error === "string" ? j.error : "Could not start checkout.");
        return;
      }
      window.location.href = j.url;
    } catch {
      setError("Could not start checkout.");
    } finally {
      setBusy(null);
    }
  }

  return (
    <div>
      <ul className="divide-y divide-[var(--line)] rounded-2xl border border-[var(--line)] bg-[var(--panel)]">
        {offers.map((offer) => {
          const credits = redeemableCredits(balance, offer.priceUsd * 100);
          const remainder = Math.max(0, offer.priceUsd - credits);
          return (
            <li key={offer.kind} className="flex flex-col gap-3 px-4 py-4 sm:flex-row sm:items-center sm:justify-between">
              <div className="min-w-0">
                <p className="font-bold text-[var(--heading)]">{offer.label}</p>
                <p className="text-sm text-[var(--muted)]">
                  {usd(offer.priceUsd)}. {credits > 0 ? `Credits cover ${usd(credits)}` : "No credits applied"}
                  {credits > 0 ? (remainder > 0 ? `, card covers ${usd(remainder)}.` : ", nothing on the card.") : "."}
                  {offer.note ? ` ${offer.note}` : ""}
                </p>
              </div>
              <button
                type="button"
                onClick={() => redeem(offer)}
                disabled={busy !== null || credits < 1}
                className="btn-ghost flex-none disabled:opacity-50"
              >
                {busy === offer.kind ? "Opening..." : `Use ${credits.toLocaleString("en-US")} credits`}
                <ArrowRight className="h-4 w-4" aria-hidden="true" />
              </button>
            </li>
          );
        })}
      </ul>
      {error ? (
        <p role="alert" className="mt-4 rounded-xl border border-[var(--danger-line)] bg-[var(--danger-tint)] px-4 py-3 text-sm font-semibold text-[var(--danger)]">
          {error}
        </p>
      ) : null}
    </div>
  );
}
