"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { ArrowRight, ShieldCheck } from "lucide-react";

// Down payment on any build. The free build offer ends with "if you love it, a
// down payment moves it forward", and until now the only way to put money down
// was to pick one of the three packages. This works for a free-build customer,
// a custom scope, or anything quoted by real hours.
//
// The amount is chosen here but clamped server-side in /api/checkout, so a
// tampered client cannot charge a nonsense figure.

const PRESETS = [500, 1000, 2500, 5000];
const MIN = 250;
const MAX = 25000;

export default function DepositForm() {
  const router = useRouter();
  const [amount, setAmount] = useState<number>(1000);
  const [custom, setCustom] = useState("");
  const [reference, setReference] = useState("");
  const [email, setEmail] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  const usingCustom = custom.trim() !== "";
  const parsed = Math.round(Number(custom.replace(/[^0-9.]/g, "")));
  const effective = usingCustom && Number.isFinite(parsed) ? parsed : amount;
  const valid = effective >= MIN && effective <= MAX;

  async function pay() {
    setError("");
    if (!valid) {
      setError(`Enter an amount between $${MIN} and $${MAX.toLocaleString()}.`);
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
      const r = await fetch("/api/checkout", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          kind: "build_deposit",
          amount_usd: effective,
          reference,
          email,
        }),
      });
      if (r.status === 501) {
        router.push("/contact?interest=deposit");
        return;
      }
      const j = await r.json();
      if (j.url) {
        window.location.href = j.url;
        return;
      }
      setError(j.error || "Could not start checkout. Try again or send a message.");
    } catch {
      setError("Could not reach checkout. Try again or send a message.");
    }
    setBusy(false);
  }

  return (
    <div className="cb-deposit">
      <fieldset className="cb-deposit-field">
        <legend>Down payment amount</legend>
        <div className="cb-deposit-presets">
          {PRESETS.map((v) => {
            const on = !usingCustom && amount === v;
            return (
              <button
                key={v}
                type="button"
                aria-pressed={on}
                onClick={() => {
                  setAmount(v);
                  setCustom("");
                }}
                className={`cb-deposit-preset${on ? " is-on" : ""}`}
              >
                ${v.toLocaleString()}
              </button>
            );
          })}
        </div>
        <label className="cb-deposit-custom">
          <span>Or enter your own</span>
          <div>
            <span aria-hidden="true">$</span>
            <input
              inputMode="numeric"
              value={custom}
              onChange={(e) => setCustom(e.target.value)}
              placeholder="2,000"
              aria-label={`Custom down payment in dollars, between ${MIN} and ${MAX}`}
            />
          </div>
        </label>
      </fieldset>

      <label className="cb-deposit-label">
        What is this for?
        <input
          value={reference}
          onChange={(e) => setReference(e.target.value)}
          placeholder="Your business name, or what we agreed on"
          maxLength={120}
        />
      </label>

      <label className="cb-deposit-label">
        Email for the receipt
        <input
          type="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          placeholder="you@yourbusiness.com"
        />
      </label>

      {error ? (
        <p className="cb-deposit-error" role="alert">
          {error}
        </p>
      ) : null}

      <button
        type="button"
        onClick={pay}
        disabled={busy}
        className="cb-btn cb-btn--primary w-full"
      >
        {busy ? "Opening checkout" : `Pay $${effective.toLocaleString()} down payment`}
        {!busy && <ArrowRight aria-hidden="true" className="h-4 w-4" />}
      </button>

      <p className="cb-deposit-note">
        <ShieldCheck aria-hidden="true" className="h-4 w-4" />
        Credited in full toward your build. Card, and Klarna, Afterpay or Affirm where
        Stripe offers them at checkout.
      </p>
    </div>
  );
}
