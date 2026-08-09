"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

export default function BuyButton({
  kind = "learn_it",
  label = "Start Learning — $497",
  className = "btn-primary",
}: {
  kind?: string;
  label?: string;
  className?: string;
}) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);

  async function buy() {
    setBusy(true);
    if (window.fbq) window.fbq("track", "InitiateCheckout", { value: 497, currency: "USD" });
    try {
      const r = await fetch("/api/checkout", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ kind }),
      });
      if (r.status === 501) {
        // Checkout not configured yet — route to a call instead of a dead end.
        router.push("/book?interest=learn");
        return;
      }
      const j = await r.json();
      if (j.url) {
        window.location.href = j.url;
        return;
      }
    } catch { /* fall through */ }
    router.push("/book?interest=learn");
  }

  return (
    <button onClick={buy} disabled={busy} className={`${className} disabled:opacity-60`}>
      {busy ? "Opening checkout…" : label}
    </button>
  );
}
