"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { ArrowRight, ShieldCheck } from "lucide-react";

const PRESETS = [500, 1000, 2500, 5000];
const MIN = 250;
const MAX = 25000;

export default function CustomDepositForm() {
  const router = useRouter();
  const [amount, setAmount] = useState<number>(500);
  const [custom, setCustom] = useState("");
  const [reference, setReference] = useState("");
  const [email, setEmail] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  const usingCustom = custom.trim() !== "";
  const parsed = Math.round(Number(custom.replace(/[^0-9.]/g, "")));
  const effective = usingCustom ? parsed : amount;
  const valid = Number.isFinite(effective) && effective >= MIN && effective <= MAX;

  async function pay() {
    setError("");
    if (!valid) {
      setError(`Enter the deposit amount shown in your written scope, between $${MIN} and $${MAX.toLocaleString()}.`);
      return;
    }
    if (!reference.trim()) {
      setError("Add the business name or written-scope reference for this payment.");
      return;
    }
    setBusy(true);
    try {
      window.fbq?.("track", "InitiateCheckout", { value: effective, currency: "USD" });
      window.gtag?.("event", "begin_checkout", { value: effective, currency: "USD" });
    } catch {
      /* analytics must never block checkout */
    }
    try {
      const response = await fetch("/api/checkout", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          kind: "build_deposit",
          amount_usd: effective,
          reference,
          email,
        }),
      });
      if (response.status === 501) {
        router.push("/contact?interest=deposit");
        return;
      }
      const result = await response.json();
      if (result.url) {
        window.location.href = result.url;
        return;
      }
      setError(result.error || "Could not start checkout. Try again or send a message.");
    } catch {
      setError("Could not reach checkout. Try again or send a message.");
    }
    setBusy(false);
  }

  return (
    <form
      className="cb-deposit"
      onSubmit={(event) => {
        event.preventDefault();
        void pay();
      }}
    >
      <fieldset className="cb-deposit-field">
        <legend>Amount from your written scope</legend>
        <div className="cb-deposit-presets">
          {PRESETS.map((value) => {
            const selected = !usingCustom && amount === value;
            return (
              <button
                key={value}
                type="button"
                aria-pressed={selected}
                onClick={() => {
                  setAmount(value);
                  setCustom("");
                }}
                className={`cb-deposit-preset${selected ? " is-on" : ""}`}
              >
                ${value.toLocaleString()}
              </button>
            );
          })}
        </div>
        <label className="cb-deposit-custom">
          <span>Or enter the exact amount</span>
          <div>
            <span aria-hidden="true">$</span>
            <input
              inputMode="numeric"
              value={custom}
              onChange={(event) => setCustom(event.target.value)}
              placeholder="2,000"
              aria-label={`Custom deposit in dollars, between ${MIN} and ${MAX}`}
            />
          </div>
        </label>
      </fieldset>

      <label className="cb-deposit-label">
        Business or scope reference
        <input
          value={reference}
          onChange={(event) => setReference(event.target.value)}
          placeholder="Business name or proposal reference"
          maxLength={120}
        />
      </label>

      <label className="cb-deposit-label">
        Email for the receipt
        <input
          type="email"
          value={email}
          onChange={(event) => setEmail(event.target.value)}
          placeholder="you@yourbusiness.com"
        />
      </label>

      {error ? <p className="cb-deposit-error" role="alert">{error}</p> : null}

      <button type="submit" disabled={busy} className="cb-btn cb-btn--primary w-full">
        {busy
          ? "Opening checkout"
          : valid
            ? `Pay $${effective.toLocaleString()} deposit`
            : "Enter a valid deposit amount"}
        {!busy ? <ArrowRight aria-hidden="true" className="h-4 w-4" /> : null}
      </button>

      <p className="cb-deposit-note">
        <ShieldCheck aria-hidden="true" className="h-4 w-4" />
        Use this page only for a deposit amount already confirmed in writing.
      </p>
    </form>
  );
}
