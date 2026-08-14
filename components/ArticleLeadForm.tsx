"use client";

// The article form.
//
// It sits directly under the tool, because the moment someone has their own
// number on screen is the moment they care. It asks for the least it can and
// stamps the trade and the article onto the lead so the reply can be specific
// instead of generic. Both consents start unticked, same as the toolbox form.

import { useState } from "react";
import { Check, AlertCircle } from "lucide-react";

export default function ArticleLeadForm({
  heading,
  lead,
  interest,
  industry,
  articleSlug,
  toolSlug,
}: {
  heading: string;
  lead: string;
  interest: string;
  industry: string;
  articleSlug: string;
  toolSlug: string;
}) {
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

    const payload: Record<string, unknown> = {
      full_name: fd.get("full_name"),
      email: fd.get("email"),
      phone: fd.get("phone") || null,
      business_name: fd.get("business_name") || null,
      goals: fd.get("goals") || null,
      industry,
      interest,
      marketing_email_consent: fd.get("marketing_email_consent") === "on",
      sms_consent: fd.get("sms_consent") === "on",
      utm_source: params?.get("utm_source") ?? null,
      utm_medium: params?.get("utm_medium") ?? null,
      utm_campaign: params?.get("utm_campaign") ?? null,
      diagnostic: { from: "article", article: articleSlug, tool: toolSlug },
    };

    try {
      const res = await fetch("/api/leads", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
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
      <div className="not-prose mt-8 rounded-2xl border border-[var(--green-line)] bg-[var(--green-tint)] p-6">
        <p className="flex items-center gap-2 text-[15px] font-semibold text-[var(--green)]">
          <Check aria-hidden="true" className="h-5 w-5" />
          Got it. I read these myself.
        </p>
        <p className="mt-2 text-[14px] text-[var(--quiet)]">
          You will hear back from me, not a bot. In the meantime every tool on this site stays
          free and nothing here is locked.
        </p>
      </div>
    );
  }

  return (
    <form
      onSubmit={onSubmit}
      className="not-prose mt-8 rounded-2xl border border-[var(--line-strong)] bg-[var(--fill-2)] p-6"
    >
      <h3 className="text-[19px] font-extrabold text-[var(--text)]">{heading}</h3>
      <p className="mt-2 text-[14px] leading-relaxed text-[var(--quiet)]">{lead}</p>

      <div className="mt-5 grid gap-4 sm:grid-cols-2">
        <div>
          <label className="label" htmlFor={`${articleSlug}-name`}>
            Your name *
          </label>
          <input
            className="input"
            id={`${articleSlug}-name`}
            name="full_name"
            required
            maxLength={200}
            autoComplete="name"
          />
        </div>
        <div>
          <label className="label" htmlFor={`${articleSlug}-email`}>
            Email *
          </label>
          <input
            className="input"
            id={`${articleSlug}-email`}
            name="email"
            type="email"
            required
            maxLength={200}
            autoComplete="email"
          />
        </div>
        <div>
          <label className="label" htmlFor={`${articleSlug}-business`}>
            Business name
          </label>
          <input
            className="input"
            id={`${articleSlug}-business`}
            name="business_name"
            maxLength={200}
            autoComplete="organization"
          />
        </div>
        <div>
          <label className="label" htmlFor={`${articleSlug}-phone`}>
            Phone
          </label>
          <input
            className="input"
            id={`${articleSlug}-phone`}
            name="phone"
            type="tel"
            maxLength={50}
            autoComplete="tel"
          />
        </div>
      </div>

      <div className="mt-4">
        <label className="label" htmlFor={`${articleSlug}-goals`}>
          What did the number come out to, and what is the part you are stuck on?
        </label>
        <textarea
          className="input"
          id={`${articleSlug}-goals`}
          name="goals"
          rows={3}
          maxLength={2000}
        />
      </div>

      <div className="consent-list mt-5">
        <label className="flex items-start gap-2.5 text-[13px] text-[var(--quiet)]">
          <input type="checkbox" name="marketing_email_consent" className="mt-0.5 h-4 w-4" />
          <span>Email me occasional tips and new tools. Unsubscribe any time.</span>
        </label>
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
        {sending ? "Sending..." : "Send it to Ryan"}
      </button>
      <p className="form-legal mt-3">
        No spam, no list swapping, no call center. One person reads these.
      </p>
    </form>
  );
}
