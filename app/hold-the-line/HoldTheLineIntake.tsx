"use client";

// The Hold The Line intake. Signing up IS the consent: the form exists to
// join the email series and says so in plain words, so marketing consent is
// recorded as express on submit. SMS stays an unticked opt-in, house style.
// Posts to /api/hold-the-line/lead, which writes the lead the same way
// /api/leads does and fires the hold-the-line-lead event to Resend.

import { useState } from "react";
import { AlertCircle, Check } from "lucide-react";

export default function HoldTheLineIntake() {
  const [sending, setSending] = useState(false);
  const [done, setDone] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setSending(true);
    setError(null);

    const fd = new FormData(e.currentTarget);
    const params =
      typeof window === "undefined" ? null : new URLSearchParams(window.location.search);

    try {
      const res = await fetch("/api/hold-the-line/lead", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          full_name: fd.get("full_name"),
          email: fd.get("email"),
          phone: fd.get("phone") || null,
          business_name: fd.get("business_name") || null,
          goals: fd.get("goals") || null,
          marketing_email_consent: true,
          sms_consent: fd.get("sms_consent") === "on",
          utm_source: params?.get("utm_source") ?? null,
          utm_medium: params?.get("utm_medium") ?? null,
          utm_campaign: params?.get("utm_campaign") ?? "hold-the-line",
        }),
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        setError(data.error ?? "Something went wrong. Try again.");
        setSending(false);
        return;
      }
      setDone(true);
    } catch {
      setError("Something went wrong. Try again.");
      setSending(false);
    }
  }

  if (done) {
    return (
      <div className="rounded-2xl border border-[var(--green-line)] bg-[var(--green-tint)] p-6">
        <p className="flex items-center gap-2 text-[15px] font-semibold text-[var(--green)]">
          <Check aria-hidden="true" className="h-5 w-5" />
          You are in. Day one is on its way.
        </p>
        <p className="mt-2 text-[14px] text-[var(--quiet)]">
          Check your inbox. If something is happening in your comments right now and it
          cannot wait for an email, the playbook is $47 and instant.
        </p>
      </div>
    );
  }

  return (
    <form
      onSubmit={onSubmit}
      className="rounded-2xl border border-[var(--line-strong)] bg-[var(--fill-2)] p-6"
    >
      <h3 className="text-[19px] font-extrabold text-[var(--text)]">
        Take the training by email.
      </h3>
      <p className="mt-2 text-[14px] leading-relaxed text-[var(--quiet)]">
        The first seven days teach the doctrine one rule at a time, free. After that it
        slows down but does not stop. Unsubscribe any time, one click, no hard feelings.
      </p>

      <div className="mt-5 grid gap-4 sm:grid-cols-2">
        <div>
          <label className="label" htmlFor="htl-name">
            Your name *
          </label>
          <input
            className="input"
            id="htl-name"
            name="full_name"
            required
            maxLength={200}
            autoComplete="name"
          />
        </div>
        <div>
          <label className="label" htmlFor="htl-email">
            Email *
          </label>
          <input
            className="input"
            id="htl-email"
            name="email"
            type="email"
            required
            maxLength={200}
            autoComplete="email"
          />
        </div>
        <div>
          <label className="label" htmlFor="htl-business">
            Business name
          </label>
          <input
            className="input"
            id="htl-business"
            name="business_name"
            maxLength={200}
            autoComplete="organization"
          />
        </div>
        <div>
          <label className="label" htmlFor="htl-phone">
            Phone
          </label>
          <input
            className="input"
            id="htl-phone"
            name="phone"
            type="tel"
            maxLength={50}
            autoComplete="tel"
          />
        </div>
      </div>

      <div className="mt-4">
        <label className="label" htmlFor="htl-goals">
          What is happening? One or two lines is plenty.
        </label>
        <textarea className="input" id="htl-goals" name="goals" rows={3} maxLength={2000} />
      </div>

      <div className="consent-list mt-5">
        <label className="flex items-start gap-2.5 text-[13px] text-[var(--quiet)]">
          <input type="checkbox" name="sms_consent" className="mt-0.5 h-4 w-4" />
          <span>You can text me at the number above. Reply STOP to end it.</span>
        </label>
      </div>

      {error ? (
        <p className="form-error mt-4 flex items-center gap-2">
          <AlertCircle aria-hidden="true" className="h-4 w-4 shrink-0" />
          {error}
        </p>
      ) : null}

      <button className="button-primary form-submit mt-5" type="submit" disabled={sending}>
        {sending ? "Sending..." : "Start day one"}
      </button>
      <p className="form-legal mt-3">
        Signing up puts you on the Hold The Line email series and nothing else. No spam,
        no list swapping, one person reads the replies.
      </p>
    </form>
  );
}
