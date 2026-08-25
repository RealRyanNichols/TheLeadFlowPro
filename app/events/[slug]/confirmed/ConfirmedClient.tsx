"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { ArrowRight, CalendarPlus, CheckCircle2, MapPin } from "lucide-react";
import { track } from "@/lib/analytics/client";
import styles from "../workshop.module.css";

// Post-checkout confirmation. Reads the registration through its token, fires
// the payment analytics exactly once per browser, shows the exact address for
// a paid seat, and collects the business bottleneck for the clinic.

type Confirmation = {
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
  const [state, setState] = useState<"loading" | "missing" | "ready">("loading");
  const [confirmation, setConfirmation] = useState<Confirmation | null>(null);
  const [token, setToken] = useState<string>("");
  const [bottleneck, setBottleneck] = useState("");
  const [bottleneckSaved, setBottleneckSaved] = useState(false);
  const [bottleneckError, setBottleneckError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const pinged = useRef(false);

  useEffect(() => {
    const t = new URLSearchParams(window.location.search).get("t") ?? "";
    setToken(t);
    if (t.length < 24) {
      setState("missing");
      return;
    }
    fetch(`/api/events/confirmation?t=${encodeURIComponent(t)}`)
      .then((res) => (res.ok ? res.json() : null))
      .then((data: Confirmation | null) => {
        if (!data?.event_slug) {
          setState("missing");
          return;
        }
        setConfirmation(data);
        setBottleneckSaved(data.has_bottleneck);
        setState("ready");

        // Fire the paid conversion once per registration per browser.
        const paid = data.seat_status === "paid" || data.seat_status === "attended";
        if (paid && !pinged.current) {
          pinged.current = true;
          let already = false;
          try {
            const key = `lfp_paid_${t.slice(0, 12)}`;
            already = localStorage.getItem(key) === "1";
            if (!already) localStorage.setItem(key, "1");
          } catch {
            /* storage blocked — worst case one duplicate ping */
          }
          if (!already) {
            track("payment_complete", { label: data.event_slug });
            if (window.fbq) window.fbq("track", "Purchase", { value: 97, currency: "USD" });
          }
        }
      })
      .catch(() => setState("missing"));
  }, []);

  async function saveBottleneck(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setBusy(true);
    setBottleneckError(null);
    const res = await fetch("/api/events/bottleneck", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ token, bottleneck }),
    });
    if (res.ok) {
      setBottleneckSaved(true);
    } else {
      const data = await res.json().catch(() => ({}));
      setBottleneckError(data.error ?? "Could not save. Try again.");
    }
    setBusy(false);
  }

  if (state === "loading") {
    return (
      <main className={`cb-page ${styles.page}`}>
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
      <main className={`cb-page ${styles.page}`}>
        <section className="cb-band">
          <div className="cb-shell">
            <h1 className="cb-h2">We could not find that registration.</h1>
            <p className="cb-lead">
              Use the confirmation link from your email, or head back to the workshop page.
            </p>
            <Link href={`/events/${slug}`} className="cb-btn cb-btn--primary" style={{ marginTop: 20 }}>
              Back to the Workshop
              <ArrowRight aria-hidden="true" />
            </Link>
          </div>
        </section>
      </main>
    );
  }

  const paid =
    confirmation.seat_status === "paid" || confirmation.seat_status === "attended";
  const overbooked = confirmation.seat_status === "overbooked";

  return (
    <main className={`cb-page ${styles.page}`}>
      <section className="cb-band">
        <div className="cb-shell" style={{ maxWidth: 760 }}>
          {paid ? (
            <>
              <p className="cb-eyebrow">
                <CheckCircle2
                  aria-hidden="true"
                  style={{ display: "inline", verticalAlign: "-3px", marginRight: 6, width: 16, height: 16 }}
                />
                Seat {confirmation.seat_number ?? ""} confirmed
              </p>
              <h1 className="cb-h2">
                {confirmation.first_name}, your seat is locked.
              </h1>
              <p className="cb-lead">
                You are in for {confirmation.event_title}. A confirmation email with everything
                below is on its way to your inbox.
              </p>

              {confirmation.exact_address && (
                <div className={styles.miniCard} style={{ marginTop: 24 }}>
                  <h3>
                    <MapPin
                      aria-hidden="true"
                      style={{ display: "inline", verticalAlign: "-3px", marginRight: 6, width: 18, height: 18 }}
                    />
                    Where to go
                  </h3>
                  <p>
                    {confirmation.exact_address}
                    {confirmation.arrival_notes ? ` — ${confirmation.arrival_notes}` : ""}
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
                      Your Next Move card gets built from it: one use case, one tool, one next
                      action, written for your business. Want to change it? Just submit again.
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
                    <p className={styles.formNote} style={{ marginBottom: 12 }}>
                      What is the one bottleneck in your business right now? Every attendee who
                      answers gets a Next Move card in the AI Business Clinic, and two
                      businesses get a live hot seat.
                    </p>
                    <textarea
                      className="input"
                      rows={3}
                      maxLength={1000}
                      required
                      value={bottleneck}
                      onChange={(e) => setBottleneck(e.target.value)}
                      placeholder="Example: leads come in but nobody follows up the same day."
                    />
                    {bottleneckError && (
                      <p className={styles.formError} role="alert" style={{ marginTop: 10 }}>
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
              <h1 className="cb-h2">Your payment arrived after the last seat was taken.</h1>
              <p className="cb-lead">
                {confirmation.first_name}, the room filled while your checkout was open. Your
                payment is being refunded in full, and you are first in line for the next date.
                Watch your email — Ryan will follow up personally.
              </p>
            </>
          ) : (
            <>
              <h1 className="cb-h2">Registration saved — payment is the last step.</h1>
              <p className="cb-lead">
                {confirmation.first_name}, your seat is not confirmed until payment clears. If
                your checkout was interrupted, head back to the workshop page and pay to lock
                your seat.
              </p>
              <Link href={`/events/${slug}#reserve`} className="cb-btn cb-btn--primary" style={{ marginTop: 20 }}>
                Complete My Registration
                <ArrowRight aria-hidden="true" />
              </Link>
            </>
          )}
        </div>
      </section>
    </main>
  );
}
