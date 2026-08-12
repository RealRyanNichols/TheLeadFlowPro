"use client";

import { useState } from "react";

type EventRow = {
  id: string;
  title: string;
  description: string | null;
  venue: string | null;
  city: string | null;
  starts_at: string | null;
  duration_minutes: number | null;
  price_usd: number;
  capacity: number | null;
};

export default function EventCard({ event }: { event: EventRow }) {
  const [open, setOpen] = useState(false);
  const [done, setDone] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [regId, setRegId] = useState<string | null>(null);
  const [regEmail, setRegEmail] = useState<string>("");
  const [payUnavailable, setPayUnavailable] = useState(false);
  const [paying, setPaying] = useState(false);

  async function register(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setBusy(true);
    setError(null);
    const fd = new FormData(e.currentTarget);
    const email = String(fd.get("email") ?? "");
    const res = await fetch("/api/register", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        event_id: event.id,
        full_name: fd.get("full_name"),
        email,
        phone: fd.get("phone"),
        business_name: fd.get("business_name"),
        notes: fd.get("notes"),
      }),
    });
    if (res.ok) {
      const data = await res.json().catch(() => ({}));
      setRegId(data.registration_id ?? null);
      setRegEmail(email);
      setDone(true);
      if (window.fbq) window.fbq("track", "CompleteRegistration");
    } else {
      const data = await res.json().catch(() => ({}));
      setError(data.error ?? "Something went wrong.");
    }
    setBusy(false);
  }

  async function payNow() {
    setPaying(true);
    try {
      const r = await fetch("/api/checkout", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          kind: "event",
          event_id: event.id,
          registration_id: regId,
          email: regEmail,
        }),
      });
      if (r.status === 501) {
        setPayUnavailable(true);
        return;
      }
      const j = await r.json();
      if (j.url) {
        window.location.href = j.url;
        return;
      }
      setPayUnavailable(true);
    } catch {
      setPayUnavailable(true);
    } finally {
      setPaying(false);
    }
  }

  const when = event.starts_at
    ? new Date(event.starts_at).toLocaleString("en-US", {
        weekday: "long",
        month: "long",
        day: "numeric",
        hour: "numeric",
        minute: "2-digit",
        timeZone: "America/Chicago",
      })
    : "Date TBA";

  return (
    <div className="card">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h2 className="text-xl font-bold text-[var(--heading)]">{event.title}</h2>
          <p className="mt-1 text-sm text-flow-400">
            {when}
            {event.venue && ` · ${event.venue}`}
            {event.city && `, ${event.city}`}
          </p>
        </div>
        <span className="rounded-full bg-flow-600/20 px-4 py-1.5 text-sm font-black text-flow-400">
          {Number(event.price_usd) > 0 ? `$${Number(event.price_usd)}` : "FREE"}
        </span>
      </div>
      {event.description && (
        <p className="mt-3 text-sm text-[var(--text)]">{event.description}</p>
      )}

      {done ? (
        <div className="mt-5 rounded-lg border border-mint bg-mint/10 p-4">
          <p className="text-mint">You're in. Watch your email for details.</p>
          {Number(event.price_usd) > 0 && !payUnavailable && (
            <button
              onClick={payNow}
              disabled={paying}
              className="btn-primary mt-3 disabled:opacity-60"
            >
              {paying ? "Opening checkout…" : `Pay $${Number(event.price_usd)} Now — Lock Your Seat`}
            </button>
          )}
          {Number(event.price_usd) > 0 && payUnavailable && (
            <p className="mt-2 text-sm text-[var(--text)]">
              Payment is collected at the door or by invoice before the event.
            </p>
          )}
        </div>
      ) : open ? (
        <form onSubmit={register} className="mt-5 space-y-4 border-t border-line pt-5">
          <div className="grid gap-4 sm:grid-cols-2">
            <div>
              <label className="label">Your name *</label>
              <input className="input" name="full_name" required maxLength={200} />
            </div>
            <div>
              <label className="label">Email *</label>
              <input className="input" name="email" type="email" required maxLength={200} />
            </div>
          </div>
          <div className="grid gap-4 sm:grid-cols-2">
            <div>
              <label className="label">Phone</label>
              <input className="input" name="phone" type="tel" maxLength={50} />
            </div>
            <div>
              <label className="label">Business</label>
              <input className="input" name="business_name" maxLength={200} />
            </div>
          </div>
          <div>
            <label className="label">What do you want to get out of it?</label>
            <textarea className="input" name="notes" rows={2} maxLength={1000} />
          </div>
          {error && <p className="text-sm text-[var(--danger)]">{error}</p>}
          <button type="submit" disabled={busy} className="btn-primary disabled:opacity-50">
            {busy ? "Saving..." : "Reserve My Seat"}
          </button>
        </form>
      ) : (
        <button onClick={() => setOpen(true)} className="btn-primary mt-5">
          Reserve a Seat
        </button>
      )}
    </div>
  );
}
