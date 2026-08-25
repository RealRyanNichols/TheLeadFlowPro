"use client";

import { FormEvent, useState } from "react";
import { ArrowRight, CheckCircle2, LockKeyhole } from "lucide-react";
import styles from "./workshop.module.css";

type Workshop = {
  id: string;
  title: string;
  price_usd: number;
  capacity: number | null;
};

export default function WorkshopCheckout({ event }: { event: Workshop }) {
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [registered, setRegistered] = useState(false);

  async function submit(eventForm: FormEvent<HTMLFormElement>) {
    eventForm.preventDefault();
    setBusy(true);
    setMessage(null);

    const form = new FormData(eventForm.currentTarget);
    const email = String(form.get("email") ?? "");
    const registration = await fetch("/api/register", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        event_id: event.id,
        full_name: form.get("full_name"),
        email,
        phone: form.get("phone"),
        business_name: form.get("business_name"),
        notes: form.get("notes"),
      }),
    });
    const registrationBody = await registration.json().catch(() => ({}));
    if (!registration.ok) {
      setMessage(registrationBody.error ?? "We could not save your registration. Please try again.");
      setBusy(false);
      return;
    }

    setRegistered(true);
    if (window.fbq) window.fbq("track", "InitiateCheckout");
    const checkout = await fetch("/api/checkout", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        kind: "event",
        event_id: event.id,
        registration_id: registrationBody.registration_id,
        email,
      }),
    });
    const checkoutBody = await checkout.json().catch(() => ({}));
    if (checkoutBody.url) {
      window.location.href = checkoutBody.url;
      return;
    }

    setMessage(
      checkoutBody.error === "not_configured"
        ? "Your registration is saved. Online payment is being connected, and Ryan will follow up to complete your seat."
        : checkoutBody.error ?? "Your registration is saved, but checkout did not open. Please try again.",
    );
    setBusy(false);
  }

  return (
    <aside id="reserve" className={styles.checkoutCard} aria-labelledby="checkout-title">
      <p className={styles.checkoutKicker}>Founding workshop rate</p>
      <div className={styles.priceRow}>
        <strong>${Number(event.price_usd)}</strong>
        <span>per person</span>
      </div>
      <h2 id="checkout-title">Reserve one of {event.capacity ?? 10} seats.</h2>
      <p>Registration takes one minute. Your seat is locked when payment is complete.</p>

      <form onSubmit={submit} className={styles.checkoutForm}>
        <label>
          Your name
          <input name="full_name" required maxLength={200} autoComplete="name" />
        </label>
        <label>
          Email
          <input name="email" type="email" required maxLength={200} autoComplete="email" />
        </label>
        <div className={styles.formPair}>
          <label>
            Phone
            <input name="phone" type="tel" maxLength={50} autoComplete="tel" />
          </label>
          <label>
            Business
            <input name="business_name" maxLength={200} autoComplete="organization" />
          </label>
        </div>
        <label>
          What do you want AI to help you do first?
          <textarea name="notes" rows={3} maxLength={1000} />
        </label>
        <button type="submit" disabled={busy} className="cb-btn cb-btn--primary">
          {busy ? "Opening secure checkout..." : `Reserve My Seat | $${Number(event.price_usd)}`}
          {!busy && <ArrowRight aria-hidden="true" />}
        </button>
      </form>

      {message && (
        <div className={registered ? styles.success : styles.error} role="status">
          {registered && <CheckCircle2 aria-hidden="true" />}
          {message}
        </div>
      )}
      <p className={styles.secureNote}>
        <LockKeyhole aria-hidden="true" />
        Secure payment through Stripe. First come, first served.
      </p>
    </aside>
  );
}
