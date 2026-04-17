"use client";
import { useSearchParams } from "next/navigation";
import { Suspense, useState } from "react";
import { CheckCircle2, CreditCard, Loader2 } from "lucide-react";

export function CheckoutBanner() {
  return (
    <Suspense fallback={null}>
      <CheckoutBannerInner />
    </Suspense>
  );
}

function CheckoutBannerInner() {
  const search = useSearchParams();
  const checkout = search.get("checkout");
  const item = search.get("item");

  if (checkout === "success") {
    return (
      <div className="glass-strong rounded-2xl p-4 border border-lead-500/30 flex items-start gap-3">
        <CheckCircle2 className="h-5 w-5 text-lead-400 shrink-0 mt-0.5" />
        <div>
          <p className="text-sm font-bold text-white">Payment successful</p>
          <p className="text-xs text-ink-300">
            {item ? <>Thanks for picking up <span className="text-cyan-400">{item}</span> — it's already activated.</> : "You're all set."}
          </p>
        </div>
      </div>
    );
  }
  if (checkout === "cancel") {
    return (
      <div className="glass rounded-2xl p-4 border border-accent-500/30 text-sm text-ink-200">
        Checkout was cancelled. No charge made.
      </div>
    );
  }
  return null;
}

export function ManagePaymentButton() {
  const [loading, setLoading] = useState(false);
  const [error, setError]     = useState<string | null>(null);

  async function openPortal() {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/billing-portal", { method: "POST" });
      const data = await res.json().catch(() => ({}));
      if (!res.ok || !data.url) {
        throw new Error(data.error || "Couldn't open portal.");
      }
      window.location.href = data.url;
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : "Portal error");
      setLoading(false);
    }
  }

  return (
    <div>
      <button
        onClick={openPortal}
        disabled={loading}
        className="btn-ghost text-sm py-2 px-3 disabled:opacity-60"
      >
        {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <CreditCard className="h-4 w-4" />}
        Manage payment
      </button>
      {error && <p className="mt-1 text-[11px] text-red-400">{error}</p>}
    </div>
  );
}
