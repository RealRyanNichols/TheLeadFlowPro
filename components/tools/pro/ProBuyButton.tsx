"use client";

import { useState } from "react";
import { ArrowRight, LockKeyhole } from "lucide-react";
import { trackTool } from "@/lib/tools/analytics";

// One button, one price, one job: open Stripe Checkout for this kit.
//
// The browser sends the kit slug and nothing else. The price comes from the
// catalog on the server, so nothing here can be edited into a cheaper sale.

declare global {
  interface Window {
    fbq?: (...args: unknown[]) => void;
  }
}

export default function ProBuyButton({
  slug,
  priceUsd,
  name,
  bundle = false,
  label,
  className = "pro-buy-button",
}: {
  slug?: string;
  priceUsd: number;
  name: string;
  bundle?: boolean;
  label?: string;
  className?: string;
}) {
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function buy() {
    setBusy(true);
    setError(null);
    trackTool("tool_card_opened", { slug: slug || "pro_bundle", surface: "buy" });
    try {
      window.fbq?.("track", "InitiateCheckout", { value: priceUsd, currency: "USD" });
      const r = await fetch("/api/checkout", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(bundle ? { kind: "pro_bundle" } : { kind: "pro_tool", pro_slug: slug }),
      });
      const body = (await r.json().catch(() => ({}))) as { url?: string; error?: string };
      if (r.ok && body.url) {
        window.location.href = body.url;
        return;
      }
      setError(
        body.error === "not_configured"
          ? "Card payment is not switched on yet. Text (903) 500-8898 and Ryan will send you the kit."
          : "Checkout did not open. Try again, or text (903) 500-8898.",
      );
    } catch {
      setError("Checkout did not open. Try again, or text (903) 500-8898.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <>
      <button type="button" className={className} onClick={buy} disabled={busy}>
        <LockKeyhole aria-hidden="true" className="h-4 w-4" />
        {busy ? "Opening secure checkout" : label || `Unlock ${name} for $${priceUsd}`}
        {!busy ? <ArrowRight aria-hidden="true" className="h-4 w-4" /> : null}
      </button>
      {error ? (
        <p role="alert" className="pro-buy-error">
          {error}
        </p>
      ) : null}
    </>
  );
}
