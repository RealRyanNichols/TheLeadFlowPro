"use client";

import { FormEvent, useState } from "react";
import styles from "./academy.module.css";

export function AcademyFreeAccessForm() {
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState("");

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setBusy(true);
    setMessage("");
    const form = new FormData(event.currentTarget);
    try {
      const response = await fetch("/api/academy/free-access", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          fullName: form.get("fullName"),
          email: form.get("email"),
          phone: form.get("phone"),
          marketingEmailConsent: form.get("marketingEmailConsent") === "yes",
          smsConsent: form.get("smsConsent") === "yes",
        }),
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || "Access could not be created.");
      window.location.assign(data.redirectTo || "/training/offer-engine");
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Access could not be created.");
      setBusy(false);
    }
  }

  return (
    <form className={styles.form} onSubmit={submit}>
      <label>
        Full name
        <input name="fullName" autoComplete="name" required minLength={2} />
      </label>
      <label>
        Email address
        <input name="email" type="email" autoComplete="email" required />
      </label>
      <label>
        Phone number
        <input name="phone" type="tel" autoComplete="tel" required />
      </label>
      <label className={styles.consent}>
        <input name="marketingEmailConsent" type="checkbox" value="yes" />
        <span>Email me practical training updates and related LeadFlow Pro offers. Optional.</span>
      </label>
      <label className={styles.consent}>
        <input name="smsConsent" type="checkbox" value="yes" />
        <span>Call or text me about training and related services. Optional. Message and data rates may apply. Reply STOP to opt out.</span>
      </label>
      <p className={styles.disclosure}>
        Name, email, and phone are required to create free academy access. Promotional consent is optional and is not required for access.
      </p>
      <button type="submit" disabled={busy}>
        {busy ? "Creating access..." : "Unlock the two free courses"}
      </button>
      <p aria-live="polite" className={styles.message}>{message}</p>
    </form>
  );
}

export function AcademyCheckoutForm() {
  const [email, setEmail] = useState("");
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState("");

  async function submit(event: FormEvent) {
    event.preventDefault();
    setBusy(true);
    setMessage("");
    try {
      const response = await fetch("/api/academy/checkout", {
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
      <label htmlFor="academy-checkout-email">Email used for course access</label>
      <div>
        <input
          id="academy-checkout-email"
          type="email"
          autoComplete="email"
          value={email}
          onChange={(event) => setEmail(event.target.value)}
          required
        />
        <button type="submit" disabled={busy}>
          {busy ? "Opening checkout..." : "Get founding all-access"}
        </button>
      </div>
      <p aria-live="polite" className={styles.message}>{message}</p>
    </form>
  );
}
