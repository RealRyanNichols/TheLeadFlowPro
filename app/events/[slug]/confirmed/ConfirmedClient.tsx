"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { ArrowRight, CalendarPlus, CheckCircle2, MapPin } from "lucide-react";
import styles from "../workshop.module.css";

// Paid access is verified by the server; this private token page has no analytics.

type Confirmation = {
  amount_paid_cents: number | null;
  confirmation_sent: boolean;
  payment_state: string;
  can_retry_payment: boolean;
  first_name: string;
  event_slug: string;
  event_title: string;
  seat_status: string;
  seat_number: number | null;
  has_bottleneck: boolean;
  exact_address: string | null;
  arrival_notes: string | null;
};

export default function ConfirmedClient({ slug }: { slug: string }) {
  const [state, setState] = useState<"loading" | "missing" | "ready">(
    "loading",
  );
  const [confirmation, setConfirmation] = useState<Confirmation | null>(null);
  const [token, setToken] = useState<string>("");
  const [bottleneck, setBottleneck] = useState("");
  const [bottleneckSaved, setBottleneckSaved] = useState(false);
  const [bottleneckError, setBottleneckError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [paymentError, setPaymentError] = useState<string | null>(null);
  const [refresh, setRefresh] = useState(0);
  const [waiting, setWaiting] = useState(false);

  useEffect(() => {
    const t = new URLSearchParams(window.location.search).get("t") ?? "";
    setToken(t);
    if (!/^[a-f0-9]{48}$/.test(t)) {
      setState("missing");
      return;
    }
    let stopped = false;
    let timer: ReturnType<typeof setTimeout>;
    let attempts = 0;
    setWaiting(true);
    async function load() {
      try {
        const res = await fetch(
          `/api/events/confirmation?t=${encodeURIComponent(t)}`,
          { cache: "no-store", referrerPolicy: "no-referrer" },
        );
        if (!res.ok)
          throw new Error(
            "Registration could not be checked. Please try again.",
          );
        const data: Confirmation = await res.json();
        if (!data?.event_slug || data.event_slug !== slug)
          throw new Error("This link does not match the workshop.");
        if (stopped) return;
        setConfirmation(data);
        setBottleneckSaved(data.has_bottleneck);
        setPaymentError(null);
        setState("ready");
        const pending = ["processing", "confirming", "unpaid"].includes(
          data.payment_state,
        );
        if (pending && ++attempts < 30) timer = setTimeout(load, 2000);
        else setWaiting(false);
      } catch {
        if (!stopped) {
          setWaiting(false);
          setPaymentError(
            "We could not check your registration. Please try again. No additional payment was made.",
          );
          setState("ready");
        }
      }
    }
    void load();
    return () => {
      stopped = true;
      clearTimeout(timer);
    };
  }, [slug, refresh]);

  async function resumePayment() {
    setBusy(true);
    setPaymentError(null);
    try {
      const res = await fetch("/api/checkout", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ kind: "event", registration_token: token }),
        referrerPolicy: "no-referrer",
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok || !data.url)
        throw new Error(data.error || "Checkout could not open. Try again.");
      window.location.assign(data.url);
    } catch (error) {
      setPaymentError(
        error instanceof Error
          ? error.message
          : "Checkout could not open. Try again.",
      );
    } finally {
      setBusy(false);
    }
  }

  async function saveBottleneck(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setBusy(true);
    setBottleneckError(null);
    try {
      const res = await fetch("/api/events/bottleneck", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ token, bottleneck }),
        referrerPolicy: "no-referrer",
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data.error || "Could not save. Try again.");
      setBottleneckSaved(true);
    } catch (error) {
      setBottleneckError(
        error instanceof Error ? error.message : "Could not save. Try again.",
      );
    } finally {
      setBusy(false);
    }
  }

  if (state === "loading") {
    return (
      <main className={`cb-page lf-event-registration ${styles.page}`}>
        <section className="cb-band">
          <div className="cb-shell">
            <p className="cb-lead">Loading your registration…</p>
          </div>
        </section>
      </main>
    );
  }

  if (state === "missing" || !confirmation) {
    return (
      <main className={`cb-page lf-event-registration ${styles.page}`}>
        <section className="cb-band">
          <div className="cb-shell">
            <h1 className="cb-h2">We could not find that registration.</h1>
            <p className="cb-lead">
              {paymentError ||
                "Use your private registration link, or head back to the workshop page."}
            </p>
            {token && (
              <button
                type="button"
                className="cb-btn cb-btn--primary"
                onClick={() => {
                  setState("loading");
                  setRefresh((n) => n + 1);
                }}
              >
                Check again
              </button>
            )}
            <Link
              href={`/events/${slug}`}
              className="cb-btn cb-btn--primary"
              style={{ marginTop: 20 }}
            >
              Back to the Workshop
              <ArrowRight aria-hidden="true" />
            </Link>
          </div>
        </section>
      </main>
    );
  }

  const paid = confirmation.payment_state === "paid";
  const overbooked = confirmation.seat_status === "overbooked";

  return (
    <main className={`cb-page lf-event-registration ${styles.page}`}>
      <section className="cb-band">
        <div className="cb-shell" style={{ maxWidth: 760 }}>
          {paid ? (
            <>
              <p className="cb-eyebrow">
                <CheckCircle2
                  aria-hidden="true"
                  style={{
                    display: "inline",
                    verticalAlign: "-3px",
                    marginRight: 6,
                    width: 16,
                    height: 16,
                  }}
                />
                Seat {confirmation.seat_number ?? ""} confirmed
              </p>
              <h1 className="cb-h2">
                {confirmation.first_name}, your seat is locked.
              </h1>
              <p className="cb-lead">
                You are in for {confirmation.event_title}.{" "}
                {confirmation.confirmation_sent
                  ? "Your confirmation email has been sent."
                  : "Your seat is confirmed. Keep this private page for your details while we check the confirmation email."}
              </p>

              {confirmation.exact_address && (
                <div className={styles.miniCard} style={{ marginTop: 24 }}>
                  <h3>
                    <MapPin
                      aria-hidden="true"
                      style={{
                        display: "inline",
                        verticalAlign: "-3px",
                        marginRight: 6,
                        width: 18,
                        height: 18,
                      }}
                    />
                    Where to go
                  </h3>
                  <p>
                    {confirmation.exact_address}
                    {confirmation.arrival_notes
                      ? ` · ${confirmation.arrival_notes}`
                      : ""}
                  </p>
                </div>
              )}

              <div className="cb-actions" style={{ marginTop: 24 }}>
                <a
                  className="cb-btn cb-btn--primary"
                  href={`/api/events/calendar?t=${encodeURIComponent(token)}`}
                >
                  <CalendarPlus aria-hidden="true" />
                  Add to Calendar
                </a>
                <Link className="cb-btn cb-btn--ghost" href={`/events/${slug}`}>
                  Workshop Details
                </Link>
              </div>

              <div className={styles.registerPanel} style={{ marginTop: 36 }}>
                {bottleneckSaved ? (
                  <div className={styles.paidStep}>
                    <h3>Bottleneck received.</h3>
                    <p>
                      Ryan can use this to prepare your workshop discussion.
                      Want to change it? Submit it again.
                    </p>
                    <button
                      type="button"
                      className="cb-btn cb-btn--ghost"
                      onClick={() => setBottleneckSaved(false)}
                    >
                      Edit My Bottleneck
                    </button>
                  </div>
                ) : (
                  <form onSubmit={saveBottleneck}>
                    <h3 style={{ marginTop: 0 }}>One question before class.</h3>
                    <p
                      className={styles.formNote}
                      style={{ marginBottom: 12 }}
                      id="bottleneck-help"
                    >
                      What is the one bottleneck in your business right now?
                      Share the task you want to improve. Please leave out
                      customer names, passwords, and private records.
                    </p>
                    <textarea
                      aria-label="Your business bottleneck"
                      aria-describedby="bottleneck-help"
                      className="input"
                      rows={3}
                      maxLength={1000}
                      required
                      value={bottleneck}
                      onChange={(e) => setBottleneck(e.target.value)}
                      placeholder="Example: leads come in but nobody follows up the same day."
                    />
                    {bottleneckError && (
                      <p
                        className={styles.formError}
                        role="alert"
                        style={{ marginTop: 10 }}
                      >
                        {bottleneckError}
                      </p>
                    )}
                    <button
                      type="submit"
                      disabled={busy}
                      className="cb-btn cb-btn--primary"
                      style={{ marginTop: 14 }}
                    >
                      {busy ? "Saving…" : "Send My Bottleneck"}
                    </button>
                  </form>
                )}
              </div>
            </>
          ) : overbooked ? (
            <>
              <h1 className="cb-h2">
                Your payment arrived after the last seat was taken.
              </h1>
              <p className="cb-lead">
                {confirmation.first_name}, the room filled while your checkout
                was open. Your payment needs review by our team. A seat has not
                been assigned. Email hello@theleadflowpro.com so we can resolve
                this; please do not pay again.
              </p>
            </>
          ) : (
            <>
              <h1 className="cb-h2">
                {["processing", "confirming"].includes(
                  confirmation.payment_state,
                )
                  ? "We’re checking your payment."
                  : confirmation.can_retry_payment
                    ? "Registration saved. Payment is the last step."
                    : "Your registration needs attention."}
              </h1>
              <p className="cb-lead">
                {confirmation.first_name},{" "}
                {confirmation.can_retry_payment
                  ? "your seat is confirmed when payment clears. Continue with this saved registration below."
                  : ["processing", "confirming"].includes(
                        confirmation.payment_state,
                      )
                    ? "your payment is still being confirmed. Please keep this private link and check again. Do not start another payment."
                    : "contact hello@theleadflowpro.com about this registration before making another payment."}
              </p>
              <div className="cb-actions" style={{ marginTop: 20 }}>
                {confirmation.can_retry_payment && (
                  <button
                    type="button"
                    disabled={busy}
                    onClick={resumePayment}
                    className="cb-btn cb-btn--primary"
                  >
                    {busy ? "Opening secure checkout…" : "Continue to payment"}
                    <ArrowRight aria-hidden="true" />
                  </button>
                )}
                <button
                  type="button"
                  onClick={() => setRefresh((n) => n + 1)}
                  disabled={waiting}
                  className="cb-btn cb-btn--ghost"
                >
                  {waiting ? "Checking payment…" : "Check status again"}
                </button>
              </div>
              {paymentError && (
                <p role="alert" className={styles.formError}>
                  {paymentError}
                </p>
              )}
            </>
          )}
        </div>
      </section>
    </main>
  );
}
