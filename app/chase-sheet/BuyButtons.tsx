"use client";

import { useState } from "react";
import { ArrowRight, LockKeyhole } from "lucide-react";
import { CHASE_SHEET, type ChaseSheetPlan, kindForPlan, priceUsdForPlan } from "@/lib/chaseSheet/product";
import { BUSINESS } from "@/lib/site/business";
import styles from "./chase-sheet.module.css";

// Two buttons, one product. The browser names the plan and nothing else; the
// amount and the checkout mode come from the server's product record.

declare global {
  interface Window {
    fbq?: (...args: unknown[]) => void;
  }
}

export function BuyButton({
  plan,
  label,
  className,
}: {
  plan: ChaseSheetPlan;
  label: string;
  className?: string;
}) {
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function buy() {
    setBusy(true);
    setError(null);
    try {
      const r = await fetch("/api/checkout", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ kind: kindForPlan(plan) }),
      });
      const body = (await r.json().catch(() => ({}))) as { url?: string; error?: string };
      if (r.ok && body.url) {
        try {
          window.fbq?.("track", "InitiateCheckout", { value: priceUsdForPlan(plan), currency: "USD", content_name: `${CHASE_SHEET.name} ${plan}` });
        } catch {
          // Measurement must never block a checkout.
        }
        window.location.href = body.url;
        return;
      }
      setError(
        body.error === "not_configured"
          ? `Card payment is not switched on yet. Text ${BUSINESS.phone.display} and Ryan will open your sheet by hand.`
          : `Checkout did not open. Try again, or text ${BUSINESS.phone.display}.`,
      );
    } catch {
      setError(`Checkout did not open. Try again, or text ${BUSINESS.phone.display}.`);
    } finally {
      setBusy(false);
    }
  }

  return (
    <>
      <button type="button" className={className ?? styles.primary} onClick={buy} disabled={busy}>
        <LockKeyhole aria-hidden="true" size={17} />
        {busy ? "Opening secure checkout" : label}
        {!busy ? <ArrowRight aria-hidden="true" size={17} /> : null}
      </button>
      {error ? (
        <p role="alert" className={styles.buyError}>
          {error}
        </p>
      ) : null}
    </>
  );
}

export default function BuyButtons({ compact = false }: { compact?: boolean }) {
  return (
    <div className={styles.actions}>
      <BuyButton plan="monthly" label={`Start chasing for ${CHASE_SHEET.monthlyLabel}`} />
      <BuyButton plan="lifetime" label={compact ? `Or ${CHASE_SHEET.lifetimeLabel}` : `Or pay ${CHASE_SHEET.lifetimeLabel}, yours for good`} className={compact ? styles.secondary : styles.lightButton} />
    </div>
  );
}
