"use client";

import { FormEvent, useState } from "react";
import { ArrowRight, CheckCircle2, LockKeyhole, ShieldCheck } from "lucide-react";
import type { WorkshopPolicies } from "@/lib/eventCommerce";
import styles from "./workshop.module.css";

type Workshop = {
  id: string;
  title: string;
  price_usd: number;
  capacity: number;
};

export default function WorkshopCheckout({
  event,
  policies,
  salesOpen,
}: {
  event: Workshop;
  policies: WorkshopPolicies | null;
  salesOpen: boolean;
}) {
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [registered, setRegistered] = useState(false);

  async function submit(eventForm: FormEvent<HTMLFormElement>) {
    eventForm.preventDefault();
    if (!salesOpen || !policies) return;
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
        website: form.get("website"),
        terms_acknowledged: form.get("terms_acknowledged") === "on",
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

    setMessage(checkoutBody.error ?? "Your registration is saved, but checkout did not open. Please try again.");
    setBusy(false);
  }

  return (
    <aside id="reserve" className={styles.checkoutCard} aria-labelledby="checkout-title">
      <p className={styles.checkoutKicker}>Founding workshop rate</p>
      <div className={styles.priceRow}>
        <strong>{"$"}{Number(event.price_usd)}</strong>
        <span>one paid seat</span>
      </div>
      <h2 id="checkout-title">Reserve one of {event.capacity} seats.</h2>
      <p>One short form. Stripe holds the seat for 30 minutes while payment is completed.</p>

      {salesOpen && policies ? (
        <form onSubmit={submit} className={styles.checkoutForm}>
          <label>
            Your name
            <input name="full_name" required maxLength={200} autoComplete="name" />
          </label>
          <label>
            Email
            <input name="email" type="email" required maxLength={200} autoComplete="email" inputMode="email" />
          </label>
          <div className={styles.formPair}>
            <label>
              Phone
              <input name="phone" type="tel" maxLength={50} autoComplete="tel" inputMode="tel" />
            </label>
            <label>
              Business
              <input name="business_name" maxLength={200} autoComplete="organization" />
            </label>
          </div>
          <label>
            What is the first business bottleneck you want AI to help with?
            <textarea name="notes" rows={3} maxLength={1000} />
          </label>
          <label className={styles.honeypot} aria-hidden="true">
            Website
            <input name="website" tabIndex={-1} autoComplete="off" />
          </label>
          <details className={styles.terms}>
            <summary>Read workshop policies</summary>
            <div>
              <strong>Recording</strong><p>{policies.recording_consent_text}</p>
              <strong>Cancellation</strong><p>{policies.cancellation_policy}</p>
              <strong>Seat transfer</strong><p>{policies.seat_transfer_policy}</p>
            </div>
          </details>
          <label className={styles.termsCheck}>
            <input name="terms_acknowledged" type="checkbox" required />
            <span>I reviewed and accept the workshop policies shown above.</span>
          </label>
          <button type="submit" disabled={busy} className="cb-btn cb-btn--primary">
            {busy ? "Holding your seat..." : <>Reserve My Seat | {"$"}{Number(event.price_usd)}</>}
            {!busy && <ArrowRight aria-hidden="true" />}
          </button>
        </form>
      ) : (
        <div className={styles.salesGate}>
          <ShieldCheck aria-hidden="true" />
          <strong>September 10 is the target date.</strong>
          <p>Ticket sales stay closed until Ryan confirms the date and buyer policies.</p>
        </div>
      )}

      {message && (
        <div className={registered ? styles.success : styles.error} role="status">
          {registered && <CheckCircle2 aria-hidden="true" />}
          {message}
        </div>
      )}
      <p className={styles.secureNote}>
        <LockKeyhole aria-hidden="true" />
        Secure payment through Stripe. No automatic sales text messages.
      </p>
    </aside>
  );
}
