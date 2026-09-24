"use client";

import { useState } from "react";
import { ArrowRight, LockKeyhole } from "lucide-react";
import { POST_CREATOR, postCreatorKindForPlan, postCreatorPriceUsd } from "@/lib/postCreator/product";
import type { PostCreatorPlan } from "@/lib/postCreator/types";
import { BUSINESS } from "@/lib/site/business";
import { usd } from "@/lib/site/prices";

// Two buttons, one product. The browser names the plan's kind and nothing
// else; the amount, the checkout mode, and whether sales are open at all are
// decided by the server (app/api/checkout, lib/postCreator/product.ts).

export const CHECKOUT_ERRORS = {
  notConfigured: `Card payment is not switched on yet. Text ${BUSINESS.phone.display} and Ryan will set you up by hand.`,
  notOpen: "The paid plan is not open yet. The idea machine works now, free.",
  other: `Checkout did not open. Try again, or text ${BUSINESS.phone.display}.`,
} as const;

type Fbq = (...args: unknown[]) => void;

export function BuyButton({ plan, label, className }: { plan: PostCreatorPlan; label: string; className?: string }) {
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function buy() {
    setBusy(true);
    setError(null);
    try {
      const r = await fetch("/api/checkout", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ kind: postCreatorKindForPlan(plan) }),
      });
      const body = (await r.json().catch(() => ({}))) as { url?: unknown; error?: unknown };
      if (r.ok && typeof body.url === "string" && body.url) {
        try {
          (window as unknown as { fbq?: Fbq }).fbq?.("track", "InitiateCheckout", {
            value: postCreatorPriceUsd(plan),
            currency: "USD",
            content_name: `${POST_CREATOR.name} ${plan}`,
          });
        } catch {
          // Measurement must never block a checkout.
        }
        // Stays busy while the browser leaves for Stripe.
        window.location.href = body.url;
        return;
      }
      setError(
        body.error === "not_open" ? CHECKOUT_ERRORS.notOpen : body.error === "not_configured" ? CHECKOUT_ERRORS.notConfigured : CHECKOUT_ERRORS.other,
      );
      setBusy(false);
    } catch {
      setError(CHECKOUT_ERRORS.other);
      setBusy(false);
    }
  }

  return (
    <span className="flex w-full flex-col gap-2 sm:w-auto">
      <button type="button" className={className ?? "button-primary"} onClick={buy} disabled={busy} aria-busy={busy}>
        <LockKeyhole aria-hidden="true" className="h-4 w-4" />
        {busy ? "Opening checkout..." : label}
        {!busy ? <ArrowRight aria-hidden="true" className="h-4 w-4" /> : null}
      </button>
      {error ? (
        <span role="alert" className="tool-field-error">
          {error}
        </span>
      ) : null}
    </span>
  );
}

/** The two button labels. "Pay once" already says once, so the price follows on its own, not the "once" label. */
export const BUY_LABELS = {
  monthly: `Start monthly, ${POST_CREATOR.monthlyLabel}`,
  lifetime: `Pay once, ${usd(POST_CREATOR.lifetimeUsd)}`,
} as const;

/** Both plans' buttons when sales are open; otherwise the closed line, with no buttons. */
export default function BuyButtons({ salesOpen, closedMessage }: { salesOpen: boolean; closedMessage: string }) {
  if (!salesOpen) return <p className="text-[15px] leading-relaxed text-[var(--text)]">{closedMessage}</p>;
  return (
    <div className="flex flex-wrap gap-3">
      <BuyButton plan="monthly" label={BUY_LABELS.monthly} />
      <BuyButton plan="lifetime" label={BUY_LABELS.lifetime} className="button-secondary" />
    </div>
  );
}
