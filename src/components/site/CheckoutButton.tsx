"use client";
import { useState } from "react";
import { Loader2 } from "lucide-react";
import { cn } from "@/lib/utils";

export function CheckoutButton({
  priceKey,
  children,
  variant = "ghost",
  className
}: {
  priceKey: string;
  children: React.ReactNode;
  variant?: "accent" | "ghost" | "primary";
  className?: string;
}) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function go() {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/checkout", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ key: priceKey })
      });
      const data = await res.json().catch(() => ({}));
      // Not signed in? Send them to signup, then come back to billing.
      if (res.status === 401) {
        const next = data.redirect || `/signup?callbackUrl=${encodeURIComponent("/dashboard/billing")}`;
        window.location.href = next;
        return;
      }
      if (!res.ok || !data.url) throw new Error(data.error || "Checkout failed");
      window.location.href = data.url;
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : "Checkout failed");
      setLoading(false);
    }
  }

  const base =
    variant === "accent"  ? "btn-accent"  :
    variant === "primary" ? "btn-primary" :
                            "btn-ghost";

  return (
    <div>
      <button
        onClick={go}
        disabled={loading}
        className={cn(base, "text-sm py-2.5 w-full disabled:opacity-60", className)}
      >
        {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
        {children}
      </button>
      {error && <p className="mt-2 text-[11px] text-red-400">{error}</p>}
    </div>
  );
}
