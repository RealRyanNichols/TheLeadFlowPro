"use client";

// "Get notified about the next workshop." The evergreen list that replaces
// the seat CTA once a workshop has run. Posts to the same /api/leads door as
// every other form, so the person lands in the CRM with an owner alert, a
// welcome email, and a timestamp. The consent box is required: this is a
// marketing list, not a transactional receipt, and nothing is sent to anyone
// who did not tick it.

import { useState } from "react";
import { ArrowRight, Check } from "lucide-react";

type Status = "idle" | "sending" | "done";

export default function WorkshopListForm({
  eventSlug,
  placement,
}: {
  eventSlug: string;
  placement: string;
}) {
  const [status, setStatus] = useState<Status>("idle");
  const [error, setError] = useState<string | null>(null);

  async function submit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);
    const form = new FormData(event.currentTarget);
    const consent = form.get("marketing_email_consent") === "on";
    if (!consent) {
      setError("Tick the box so we know it is okay to email you about the next date.");
      return;
    }
    setStatus("sending");
    const params = new URLSearchParams(window.location.search);
    try {
      const res = await fetch("/api/leads", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          full_name: form.get("full_name"),
          email: form.get("email"),
          business_name: String(form.get("business_name") ?? "").trim() || null,
          interest: "learn",
          goals: `WORKSHOP LIST: wants to hear about the next Longview workshop (${eventSlug} has run).`,
          marketing_email_consent: true,
          utm_source: params.get("utm_source"),
          utm_medium: params.get("utm_medium") ?? "workshop_list",
          utm_campaign: params.get("utm_campaign"),
          diagnostic: { version: 1, source: "workshop_waitlist", event_slug: eventSlug, placement },
        }),
      });
      if (!res.ok) {
        const data = (await res.json().catch(() => ({}))) as { error?: string };
        setError(data.error ?? "That did not go through. Try again, or text us.");
        setStatus("idle");
        return;
      }
      setStatus("done");
    } catch {
      setError("That did not go through. Try again, or text us.");
      setStatus("idle");
    }
  }

  if (status === "done") {
    return (
      <div className="lf-workshop-list-form lf-workshop-list-form--done" role="status">
        <Check aria-hidden="true" size={20} />
        <div>
          <strong>You are on the list.</strong>
          <p>Ryan will email you when the next date is set. A short note is on its way now.</p>
        </div>
      </div>
    );
  }

  return (
    <form className="lf-workshop-list-form" onSubmit={submit} aria-label="Get notified about the next workshop">
      <div className="lf-workshop-list-fields">
        <label>
          <span>Your name</span>
          <input name="full_name" type="text" autoComplete="name" required maxLength={200} />
        </label>
        <label>
          <span>Email</span>
          <input name="email" type="email" autoComplete="email" required maxLength={200} inputMode="email" />
        </label>
        <label>
          <span>Business (optional)</span>
          <input name="business_name" type="text" autoComplete="organization" maxLength={200} />
        </label>
      </div>
      <label className="lf-workshop-list-consent">
        <input type="checkbox" name="marketing_email_consent" required />
        <span>
          Email me when the next workshop date is set, plus the occasional practical note from Ryan.
          One click unsubscribes at any time.
        </span>
      </label>
      {error ? (
        <p className="lf-workshop-list-error" role="alert">
          {error}
        </p>
      ) : null}
      <button className="lf-workshop-seat" type="submit" disabled={status === "sending"} data-cta="workshop_list_join" data-cta-placement={placement}>
        {status === "sending" ? "Adding you…" : "Get notified about the next workshop"}
        <ArrowRight size={19} aria-hidden="true" />
      </button>
    </form>
  );
}
