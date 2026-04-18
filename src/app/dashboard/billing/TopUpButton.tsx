"use client";

/**
 * Manual top-up trigger. Creates a PaymentIntent on the default card.
 *
 * If the user has no Stripe customer on file yet, we route them to the
 * Add-Payment-Method flow (reuse the existing /dashboard/billing checkout
 * session endpoint with the "setup" price).
 */

import { useState, useTransition } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Loader2, Plus } from "lucide-react";

interface Props {
  hasPaymentMethod: boolean;
  defaultCents: number;
}

export function TopUpButton({ hasPaymentMethod, defaultCents }: Props) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  if (!hasPaymentMethod) {
    return (
      <Link href="/pricing" className="btn-primary text-sm whitespace-nowrap">
        Add payment method
      </Link>
    );
  }

  const handle = () => {
    setError(null);
    startTransition(async () => {
      try {
        const res = await fetch("/api/billing/micro-purchase", {
          method: "POST",
          headers: { "content-type": "application/json" },
          body: JSON.stringify({ cents: defaultCents, description: "Manual top-up" }),
        });
        const data = await res.json();
        if (!res.ok) {
          setError(data?.reason ?? "Top-up failed.");
          return;
        }
        // Webhook will promote to succeeded; refresh to show the pending row.
        router.refresh();
      } catch {
        setError("Network hiccup — please try again.");
      }
    });
  };

  return (
    <div className="flex flex-col items-end gap-1">
      <button
        type="button"
        onClick={handle}
        disabled={pending}
        className="btn-primary text-sm whitespace-nowrap disabled:opacity-60 inline-flex items-center gap-1.5"
      >
        {pending ? (
          <Loader2 className="h-4 w-4 animate-spin" />
        ) : (
          <>
            <Plus className="h-4 w-4" /> Top up ${(defaultCents / 100).toFixed(0)}
          </>
        )}
      </button>
      {error && <span className="text-[11px] text-red-400">{error}</span>}
    </div>
  );
}
