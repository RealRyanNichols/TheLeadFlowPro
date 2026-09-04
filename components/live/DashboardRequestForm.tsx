"use client";

import { useState } from "react";

// The /live page's own conversion point: "get this dashboard on my website."
// Posts into the same /api/leads pipeline as every other capture form, with
// clean attribution so these leads are traceable to the live proof page —
// and because form starts, submits, and lead_created are all tracked, using
// this form shows up on the very dashboard above it.

declare global {
  interface Window {
    fbq?: (...args: unknown[]) => void;
  }
}

export default function DashboardRequestForm() {
  const [busy, setBusy] = useState(false);
  const [done, setDone] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function submit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setBusy(true);
    setError(null);
    const form = new FormData(e.currentTarget);
    try {
      const res = await fetch("/api/leads", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          full_name: form.get("full_name"),
          email: form.get("email"),
          phone: form.get("phone") || null,
          website_url: form.get("website_url") || null,
          business_name: form.get("business_name") || null,
          interest: "build_with_you",
          goals:
            "Asked for the live analytics dashboard on their own website (submitted from /live).",
          utm_source: "live",
          utm_medium: "dashboard",
          utm_campaign: "live_proof",
          diagnostic: { version: 1, source: "live_dashboard_request" },
        }),
      });
      if (!res.ok) throw new Error("save failed");
      try {
        window.fbq?.("track", "Lead");
      } catch {
        /* pixels must never block the thank-you state */
      }
      setDone(true);
    } catch {
      setError("Could not send that. Try again, or text 903-500-8898.");
    } finally {
      setBusy(false);
    }
  }

  if (done) {
    return (
      <div className="mx-auto max-w-xl rounded-xl border border-[var(--green-line)] bg-[var(--green-tint)] p-6 text-center" role="status">
        <p className="font-bold text-[var(--green)]">Got it. Ryan will reach out.</p>
        <p className="mt-1.5 text-sm text-[var(--text)]">
          Your request just became a lead in the same CRM this dashboard reports on.
          Watch the numbers above.
        </p>
      </div>
    );
  }

  return (
    <form
      onSubmit={submit}
      data-analytics="live_dashboard_request"
      className="mx-auto max-w-xl text-left"
      aria-label="Request this dashboard for your business"
    >
      <div className="grid gap-3 sm:grid-cols-2">
        <div>
          <label className="label" htmlFor="ldr-name">Name</label>
          <input id="ldr-name" name="full_name" className="input" required maxLength={200} autoComplete="name" />
        </div>
        <div>
          <label className="label" htmlFor="ldr-email">Email</label>
          <input id="ldr-email" name="email" type="email" className="input" required maxLength={200} autoComplete="email" />
        </div>
        <div>
          <label className="label" htmlFor="ldr-phone">Phone (optional)</label>
          <input id="ldr-phone" name="phone" type="tel" className="input" maxLength={50} autoComplete="tel" />
        </div>
        <div>
          <label className="label" htmlFor="ldr-site">Your website (optional)</label>
          <input id="ldr-site" name="website_url" type="url" className="input" maxLength={300} placeholder="https://" autoComplete="url" />
        </div>
      </div>
      {error && (
        <p className="mt-3 text-sm font-semibold text-[var(--danger)]" role="alert">{error}</p>
      )}
      <button type="submit" disabled={busy} className="button-primary mt-4 w-full sm:w-auto">
        {busy ? "Sending..." : "Get This Dashboard on My Website"}
      </button>
      <p className="mt-3 text-xs text-[var(--quiet)]">
        No spam, no pressure. Ryan replies personally.
      </p>
    </form>
  );
}
