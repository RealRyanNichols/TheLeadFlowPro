"use client";

import { useState } from "react";

// The qualifying questions are optional here on purpose: the message is the
// required part, the answers just ride along. They are folded into the message
// body so the existing /api/contact contract and messages table stay unchanged.
const QUESTIONS = [
  { key: "leads", label: "Are you getting enough leads?" },
  { key: "money", label: "Are you making enough money?" },
  { key: "social", label: "Is your social media doing what you wanted?" },
  { key: "website", label: "Is your website doing what you wanted?" },
] as const;

export default function ContactForm() {
  const [done, setDone] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [answers, setAnswers] = useState<Record<string, "Yes" | "No">>({});

  async function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setBusy(true);
    setError(null);
    const fd = new FormData(e.currentTarget);

    const phone = String(fd.get("visitor_phone") ?? "").trim();
    const extras: string[] = [];
    if (phone) extras.push(`Phone: ${phone}`);
    const answered = QUESTIONS.filter((q) => answers[q.key]);
    if (answered.length) {
      extras.push(
        "Qualifying answers:",
        ...answered.map((q) => `- ${q.label} ${answers[q.key]}`),
      );
    }
    const message = String(fd.get("body") ?? "");
    const body = extras.length ? `${message}\n\n---\n${extras.join("\n")}` : message;

    try {
      const res = await fetch("/api/contact", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          visitor_name: fd.get("visitor_name"),
          visitor_email: fd.get("visitor_email"),
          body,
        }),
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        setError(
          typeof data?.error === "string"
            ? data.error
            : "Your message could not be sent. Please try again.",
        );
        return;
      }
      setDone(true);
      try {
        window.fbq?.("track", "Contact");
      } catch {
        // Optional analytics must not change the saved-message result.
      }
    } catch {
      setError(
        "Could not reach the form. Your message is still here. Check your connection and try again.",
      );
    } finally {
      setBusy(false);
    }
  }

  if (done) {
    return (
      <p className="text-center font-semibold text-[var(--green)]" role="status" aria-live="polite">
        Message received. I will get back to you within one business day.
      </p>
    );
  }

  return (
    <form onSubmit={onSubmit} className="space-y-4" aria-busy={busy}>
      <div className="grid gap-4 sm:grid-cols-2">
        <div>
          <label className="label" htmlFor="contact-name">Your name *</label>
          <input className="input" id="contact-name" name="visitor_name" required maxLength={200} />
        </div>
        <div>
          <label className="label" htmlFor="contact-email">Email *</label>
          <input className="input" id="contact-email" name="visitor_email" type="email" required maxLength={200} />
        </div>
      </div>
      <div>
        <label className="label" htmlFor="contact-phone">Cell phone (so Ryan can call or text you back)</label>
        <input className="input" id="contact-phone" name="visitor_phone" type="tel" maxLength={50} />
      </div>
      <div>
        <label className="label" htmlFor="contact-message">Your message *</label>
        <textarea className="input" id="contact-message" name="body" rows={5} required maxLength={2500} />
      </div>

      <fieldset className="space-y-3 rounded-xl border border-[var(--line-strong)] p-4">
        <legend className="px-1 text-base font-semibold text-[var(--heading)]">
          Four quick questions. Optional, but they speed up the answer.
        </legend>
        {QUESTIONS.map((q) => (
          <div key={q.key} className="flex flex-wrap items-center justify-between gap-2">
            <span className="text-base text-[var(--text)]">{q.label}</span>
            <div className="flex gap-2" role="group" aria-label={q.label}>
              {(["Yes", "No"] as const).map((value) => {
                const active = answers[q.key] === value;
                return (
                  <button
                    key={value}
                    type="button"
                    aria-pressed={active}
                    onClick={() =>
                      setAnswers((current) =>
                        current[q.key] === value
                          ? Object.fromEntries(Object.entries(current).filter(([k]) => k !== q.key))
                          : { ...current, [q.key]: value },
                      )
                    }
                    className={`min-h-11 min-w-16 rounded-lg border px-4 text-base font-semibold transition ${
                      active
                        ? "border-sky-400 bg-sky-500/20 text-[var(--heading)]"
                        : "border-[var(--line-strong)] bg-[var(--fill-2)] text-[var(--text)] hover:text-[var(--heading)]"
                    }`}
                  >
                    {value}
                  </button>
                );
              })}
            </div>
          </div>
        ))}
      </fieldset>

      {error && <p className="text-base text-[var(--danger)]" role="alert">{error}</p>}
      <button type="submit" disabled={busy} className="btn-primary w-full disabled:opacity-50">
        {busy ? "Sending..." : "Send Message"}
      </button>
      <p className="text-center text-base text-[var(--text)]">
        Fastest answer: call or text{" "}
        <a className="font-bold text-[var(--heading)] underline underline-offset-4" href="tel:+19035008898">
          (903) 500-8898
        </a>
      </p>
    </form>
  );
}
