"use client";

import { useState } from "react";

export default function ContactForm() {
  const [done, setDone] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setBusy(true);
    setError(null);
    const fd = new FormData(e.currentTarget);
    const res = await fetch("/api/contact", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        visitor_name: fd.get("visitor_name"),
        visitor_email: fd.get("visitor_email"),
        body: fd.get("body"),
      }),
    });
    if (res.ok) {
      setDone(true);
      if (window.fbq) window.fbq("track", "Contact");
    } else {
      const data = await res.json().catch(() => ({}));
      setError(data.error ?? "Something went wrong.");
      setBusy(false);
    }
  }

  if (done) {
    return (
      <p className="text-center font-semibold text-mint">
        Message received. I will get back to you within one business day.
      </p>
    );
  }

  return (
    <form onSubmit={onSubmit} className="space-y-4">
      <div className="grid gap-4 sm:grid-cols-2">
        <div>
          <label className="label">Your name *</label>
          <input className="input" name="visitor_name" required maxLength={200} />
        </div>
        <div>
          <label className="label">Email *</label>
          <input className="input" name="visitor_email" type="email" required maxLength={200} />
        </div>
      </div>
      <div>
        <label className="label">Your message *</label>
        <textarea className="input" name="body" rows={5} required maxLength={3000} />
      </div>
      {error && <p className="text-sm text-red-400">{error}</p>}
      <button type="submit" disabled={busy} className="btn-primary w-full disabled:opacity-50">
        {busy ? "Sending..." : "Send Message"}
      </button>
    </form>
  );
}
