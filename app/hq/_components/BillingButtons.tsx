"use client";

import { useState } from "react";
import { CreditCard } from "lucide-react";
import { hqPost } from "./api";

// Both buttons do the same thing: ask the server for a Stripe address and
// send the browser there. Card details never touch this site.

export function StartPlanButton({ label }: { label: string }) {
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  async function go() {
    setBusy(true);
    setError("");
    const result = await hqPost("checkout");
    if (!result.ok) {
      setBusy(false);
      setError(result.error);
      return;
    }
    const url = result.data.url;
    if (typeof url !== "string") {
      setBusy(false);
      setError("Checkout did not come back with an address. Try again.");
      return;
    }
    window.location.href = url;
  }

  return (
    <div className="grid gap-2">
      <button type="button" className="pro-buy-button" onClick={go} disabled={busy}>
        {busy ? "Opening checkout..." : label}
      </button>
      {error && <p className="hq-error">{error}</p>}
    </div>
  );
}

export function ManageBillingButton() {
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  async function go() {
    setBusy(true);
    setError("");
    const result = await hqPost("billing_portal");
    if (!result.ok) {
      setBusy(false);
      setError(result.error);
      return;
    }
    const url = result.data.url;
    if (typeof url !== "string") {
      setBusy(false);
      setError("Billing did not come back with an address. Try again.");
      return;
    }
    window.location.href = url;
  }

  return (
    <div className="grid gap-2">
      <button type="button" className="hq-btn" onClick={go} disabled={busy}>
        <CreditCard aria-hidden="true" className="h-4 w-4" /> {busy ? "Opening..." : "Manage billing"}
      </button>
      {error && <p className="hq-error">{error}</p>}
    </div>
  );
}
