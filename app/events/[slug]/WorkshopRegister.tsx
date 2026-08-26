"use client";

import { useState } from "react";
import { ArrowRight, CheckCircle2, LockKeyhole } from "lucide-react";
import { track } from "@/lib/analytics/client";
import styles from "./workshop.module.css";

// Registration → Stripe checkout, in one panel. The server decides price and
// capacity; this component only carries the form and the handoff token.
//
// Flow: /api/register creates a pending registration and returns a token.
// /api/checkout re-verifies capacity, then opens Stripe with that token. The
// seat itself is claimed by the Stripe webhook after payment clears.

type WorkshopEvent = {
  id: string;
  slug: string;
  title: string;
  price_usd: number;
  clinic_enabled: boolean;
};

export default function WorkshopRegister({
  event,
  soldOut,
  registrationOpen,
}: {
  event: WorkshopEvent;
  soldOut: boolean;
  registrationOpen: boolean;
}) {
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [registered, setRegistered] = useState(false);
  const [token, setToken] = useState<string | null>(null);
  const [payFallback, setPayFallback] = useState(false);
  const [started, setStarted] = useState(false);

  function markStarted() {
    if (started) return;
    setStarted(true);
    track("registration_start", { label: event.slug });
  }

  async function openCheckout(registrationToken: string) {
    track("checkout_start", { label: event.slug });
    if (window.fbq) window.fbq("track", "InitiateCheckout");
    const res = await fetch("/api/checkout", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        kind: "event",
        registration_token: registrationToken,
      }),
    });
    const data = await res.json().catch(() => ({}));
    if (data.url) {
      window.location.href = data.url;
      return true;
    }
    if (res.status === 501 || data.error === "not_configured") {
      setPayFallback(true);
      return false;
    }
    setError(data.error ?? "Checkout did not open. Your registration is saved — try again.");
    return false;
  }

  async function submit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setBusy(true);
    setError(null);
    const fd = new FormData(e.currentTarget);

    const res = await fetch("/api/register", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        event_id: event.id,
        full_name: fd.get("full_name"),
        email: fd.get("email"),
        phone: fd.get("phone"),
        business_name: fd.get("business_name"),
        bottleneck: fd.get("bottleneck"),
        recording_consent: fd.get("recording_consent") === "on",
        marketing_consent: fd.get("marketing_consent") === "on",
        utm_source: new URLSearchParams(window.location.search).get("utm_source"),
        utm_medium: new URLSearchParams(window.location.search).get("utm_medium"),
        utm_campaign: new URLSearchParams(window.location.search).get("utm_campaign"),
        utm_content: new URLSearchParams(window.location.search).get("utm_content"),
      }),
    });
    const data = await res.json().catch(() => ({}));
    if (!res.ok) {
      setError(data.error ?? "Could not register. Try again.");
      setBusy(false);
      return;
    }

    track("registration_complete", { label: event.slug });
    if (window.fbq) window.fbq("track", "CompleteRegistration");
    setRegistered(true);
    setToken(data.registration_token ?? null);

    if (data.registration_token) {
      const opened = await openCheckout(data.registration_token);
      if (opened) return; // navigating to Stripe
    }
    setBusy(false);
  }

  async function payAgain() {
    if (!token) return;
    setBusy(true);
    setError(null);
    const opened = await openCheckout(token);
    if (!opened) setBusy(false);
  }

  if (soldOut || !registrationOpen) {
    return (
      <div className={styles.registerPanel}>
        <h3 style={{ marginTop: 0 }}>Registration is closed.</h3>
        <p className={styles.formNote}>
          {soldOut
            ? "All seats for this workshop are paid for. The next date opens to this list first."
            : "Registration for this workshop is not open right now."}
        </p>
      </div>
    );
  }

  if (registered) {
    return (
      <div className={styles.registerPanel}>
        <div className={styles.paidStep}>
          <h3>
            <CheckCircle2
              aria-hidden="true"
              style={{ display: "inline", verticalAlign: "-3px", marginRight: 8, width: 22, height: 22 }}
            />
            Registration saved. One step left.
          </h3>
          {payFallback ? (
            <p>
              Online payment is being connected. Your registration is saved, and Ryan will
              follow up by email to complete your seat. The seat is confirmed only after
              payment.
            </p>
          ) : (
            <>
              <p>
                Your seat is <strong>not</strong> confirmed yet — payment locks it. Ten seats,
                first come, first served.
              </p>
              <button
                type="button"
                onClick={payAgain}
                disabled={busy}
                className="cb-btn cb-btn--primary"
              >
                {busy ? "Opening secure checkout…" : `Pay $${event.price_usd} | Lock My Seat`}
                {!busy && <ArrowRight aria-hidden="true" />}
              </button>
            </>
          )}
          {error && (
            <p className={styles.formError} role="alert" style={{ marginTop: 14 }}>
              {error}
            </p>
          )}
        </div>
      </div>
    );
  }

  return (
    <form className={styles.registerPanel} onSubmit={submit} onFocus={markStarted}>
      <div className={`${styles.formGrid} ${styles.formGridTwo}`}>
        <div>
          <label className="label" htmlFor="wr-name">
            Your name *
          </label>
          <input id="wr-name" className="input" name="full_name" required maxLength={200} autoComplete="name" />
        </div>
        <div>
          <label className="label" htmlFor="wr-email">
            Email *
          </label>
          <input
            id="wr-email"
            className="input"
            name="email"
            type="email"
            required
            maxLength={200}
            autoComplete="email"
          />
        </div>
      </div>
      <div className={`${styles.formGrid} ${styles.formGridTwo}`}>
        <div>
          <label className="label" htmlFor="wr-phone">
            Phone
          </label>
          <input id="wr-phone" className="input" name="phone" type="tel" maxLength={50} autoComplete="tel" />
        </div>
        <div>
          <label className="label" htmlFor="wr-business">
            Business
          </label>
          <input
            id="wr-business"
            className="input"
            name="business_name"
            maxLength={200}
            autoComplete="organization"
          />
        </div>
      </div>
      <div className={styles.formGrid}>
        <div>
          <label className="label" htmlFor="wr-bottleneck">
            {event.clinic_enabled
              ? "What is the one bottleneck in your business right now? *"
              : "What do you want AI to help you do first?"}
          </label>
          <textarea
            id="wr-bottleneck"
            className="input"
            name="bottleneck"
            rows={3}
            maxLength={1000}
            required={event.clinic_enabled}
            placeholder="Example: leads come in but nobody follows up the same day."
          />
          {event.clinic_enabled && (
            <p className={styles.formNote} style={{ marginTop: 6 }}>
              This feeds your Next Move card in the AI Business Clinic: one use case, one tool,
              one next action, written for your business.
            </p>
          )}
        </div>
        <label className={styles.consentRow}>
          <input type="checkbox" name="recording_consent" />
          <span>
            I understand the workshop is recorded for training and marketing, and I can ask to
            be seated out of frame. Nothing I say is used in marketing without my written
            permission.
          </span>
        </label>
        <label className={styles.consentRow}>
          <input type="checkbox" name="marketing_consent" />
          <span>Email me about future workshops and events. No spam, unsubscribe anytime.</span>
        </label>
        {error && (
          <p className={styles.formError} role="alert">
            {error}
          </p>
        )}
        <button type="submit" disabled={busy} className="cb-btn cb-btn--primary">
          {busy ? "Saving…" : `Continue to Payment | $${event.price_usd}`}
          {!busy && <ArrowRight aria-hidden="true" />}
        </button>
        <p className={styles.formNote}>
          <LockKeyhole
            aria-hidden="true"
            style={{ display: "inline", verticalAlign: "-2px", marginRight: 6, width: 14, height: 14 }}
          />
          Secure payment through Stripe. Your seat is confirmed only after payment. Registering
          without paying does not hold a seat.
        </p>
      </div>
    </form>
  );
}
