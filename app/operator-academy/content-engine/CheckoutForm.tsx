"use client";

import { ArrowRight, LockKeyhole } from "lucide-react";
import { FormEvent, useId, useState } from "react";
import styles from "./page.module.css";

export default function CheckoutForm() {
  const inputId = useId();
  const [email, setEmail] = useState("");
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState("");

  async function submit(event: FormEvent) {
    event.preventDefault();
    setBusy(true);
    setMessage("");
    try {
      const response = await fetch("/api/operator-academy/content-engine/checkout", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email }),
      });
      const data = await response.json();
      if (!response.ok || !data.url) throw new Error(data.error || "Checkout could not start.");
      window.location.assign(data.url);
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Checkout could not start.");
      setBusy(false);
    }
  }

  return (
    <form className={styles.checkoutForm} onSubmit={submit}>
      <label htmlFor={inputId}>Email for course access</label>
      <div className={styles.checkoutRow}>
        <input
          id={inputId}
          name="email"
          type="email"
          autoComplete="email"
          required
          value={email}
          onChange={(event) => setEmail(event.target.value)}
          placeholder="you@example.com"
        />
        <button type="submit" disabled={busy}>
          {busy ? (
            "Opening secure checkout..."
          ) : (
            <>
              <span>Get founding access</span>
              <strong>$127</strong>
              <ArrowRight aria-hidden="true" />
            </>
          )}
        </button>
      </div>
      <p className={styles.checkoutTrust}>
        <LockKeyhole aria-hidden="true" /> Secure checkout through Stripe. Use this same email to log in.
      </p>
      <p className={styles.formMessage} aria-live="polite">{message}</p>
    </form>
  );
}
