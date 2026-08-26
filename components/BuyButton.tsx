"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

export default function BuyButton({
  kind = "system_map",
  label = "Start with a System Map | $497",
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
    // InitiateCheckout carries no value. The amount is decided server-side in
    // /api/checkout and confirmed by Stripe on the way back out, and a number
    // guessed in the browser here is exactly the kind of hardcoded constant
    // that had every Purchase event reporting $497.
    if (window.fbq) {
      window.fbq("track", "InitiateCheckout", { currency: "USD" });
    }
    try {
      const r = await fetch("/api/checkout", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ kind }),
      });
      if (r.status === 501) {
        router.push("/book?interest=system_map");
        return;
      }
      const j = await r.json();
      if (j.url) {
        window.location.href = j.url;
        return;
      }
    } catch { /* fall through */ }
    router.push("/book?interest=system_map");
  }

  return (
    <button type="button" onClick={buy} disabled={busy} className={`${className} disabled:opacity-60`}>
      {busy ? "Opening checkout..." : label}
    </button>
  );
}
