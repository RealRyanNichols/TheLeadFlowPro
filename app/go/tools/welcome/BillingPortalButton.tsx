"use client";

import { useSearchParams } from "next/navigation";
import { useState } from "react";

export default function BillingPortalButton() {
  const search = useSearchParams();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const sessionId = search.get("session_id");
  if (!sessionId) return null;

  async function openPortal() {
    setLoading(true);
    setError(null);
    const response = await fetch("/api/billing-portal", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ session_id: sessionId }),
    }).catch(() => null);
    const body = (await response?.json().catch(() => ({}))) as { url?: string; error?: string };
    if (response?.ok && body.url) {
      window.location.href = body.url;
      return;
    }
    setError(body.error || "Billing management could not open. Email hello@theleadflowpro.com.");
    setLoading(false);
  }

  return (
    <div>
      <button onClick={openPortal} disabled={loading} className="inline-flex min-h-12 items-center rounded-xl border border-white/20 px-5 font-black text-white disabled:opacity-60">
        {loading ? "Opening Billing..." : "Manage Billing in Stripe"}
      </button>
      {error ? <p className="mt-2 max-w-sm text-xs font-bold text-red-300">{error}</p> : null}
    </div>
  );
}
