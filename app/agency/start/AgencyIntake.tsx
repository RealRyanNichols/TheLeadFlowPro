"use client";

// The agency intake form. Every answer rides along in the lead record: the
// summary in `goals` for the owner alert, the structured answers in
// `diagnostic` for the admin workspace. Consent boxes use the same wording as
// the homepage consultation form. Entries are preserved on an error so nobody
// retypes ten answers.

import { useState } from "react";
import { ArrowRight, Check } from "lucide-react";
import { SmsConsentText } from "@/components/site/SmsConsentText";

type ServiceOption = { slug: string; label: string };

const CHANNELS = [
  ["facebook_instagram", "Facebook or Instagram"],
  ["google_ads", "Google Ads"],
  ["google_business", "Google Business Profile and reviews"],
  ["referrals", "Referrals and word of mouth"],
  ["website", "Our website"],
  ["none", "Nothing steady yet"],
] as const;

// Monthly ad spend paid straight to Meta or Google. Not LeadFlow prices.
const BUDGETS = [
  ["ads_0", "$0 right now"],
  ["ads_under_500", "Under $500 a month"],
  ["ads_500_1500", "$500 to $1,500 a month"],
  ["ads_1500_5000", "$1,500 to $5,000 a month"],
  ["ads_5000_plus", "$5,000 or more a month"],
] as const;

const DECIDERS = [
  ["me", "I decide"],
  ["shared", "A partner or spouse decides with me"],
  ["someone_else", "Someone else signs off"],
] as const;

const TIMELINES = [
  ["this_month", "This month"],
  ["30_60_days", "In the next 30 to 60 days"],
  ["this_quarter", "This quarter"],
  ["researching", "Just researching for now"],
] as const;

type Status = "idle" | "sending" | "done";

export default function AgencyIntake({
  services,
  preselected,
  placement = "agency_start",
}: {
  services: ServiceOption[];
  preselected: string | null;
  /** Which page the form was on, so the admin workspace can tell the hub from the intake page. */
  placement?: "agency_start" | "agency_hub";
}) {
  const [status, setStatus] = useState<Status>("idle");
  const [error, setError] = useState<string | null>(null);

  async function submit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);
    const form = new FormData(event.currentTarget);
    const phone = String(form.get("phone") ?? "").trim();
    const smsConsent = form.get("sms_consent") === "on";
    if (smsConsent && !phone) {
      setError("Add a mobile number before choosing call or text consent.");
      return;
    }
    const picked = services.filter((s) => form.get(`service_${s.slug}`) === "on");
    if (picked.length === 0) {
      setError("Pick at least one service so the reply lands in the right lane.");
      return;
    }
    const channels = CHANNELS.filter(([id]) => form.get(`channel_${id}`) === "on");
    const budget = BUDGETS.find(([id]) => id === form.get("ad_budget"));
    const decider = DECIDERS.find(([id]) => id === form.get("decision_maker"));
    const timeline = TIMELINES.find(([id]) => id === form.get("timeline"));
    const bottleneck = String(form.get("bottleneck") ?? "").trim();

    const summary = [
      `AGENCY INTAKE: ${picked.map((s) => s.label).join(", ")}.`,
      channels.length ? `Current channels: ${channels.map(([, label]) => label).join(", ")}.` : "",
      budget ? `Monthly ad budget genuinely prepared to spend: ${budget[1]}.` : "",
      decider ? `Decision-maker: ${decider[1]}.` : "",
      timeline ? `Timeline: ${timeline[1]}.` : "",
      bottleneck ? `Bottleneck: ${bottleneck}` : "",
    ]
      .filter(Boolean)
      .join(" ");

    setStatus("sending");
    const params = new URLSearchParams(window.location.search);
    try {
      const res = await fetch("/api/leads", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          full_name: form.get("full_name"),
          business_name: form.get("business_name"),
          email: form.get("email"),
          phone: phone || null,
          website_url: String(form.get("website_url") ?? "").trim() || null,
          interest: "done_for_you",
          goals: summary.slice(0, 2000),
          budget_range: budget?.[0] ?? null,
          timeline: timeline?.[0] ?? null,
          best_contact_method: smsConsent && phone ? "phone" : "email",
          sms_consent: smsConsent && Boolean(phone),
          marketing_email_consent: form.get("marketing_email_consent") === "on",
          utm_source: params.get("utm_source"),
          utm_medium: params.get("utm_medium") ?? "agency_intake",
          utm_campaign: params.get("utm_campaign"),
          diagnostic: {
            version: 1,
            source: "agency_intake",
            services: picked.map((s) => s.slug),
            channels: channels.map(([id]) => id),
            ad_budget: budget?.[0] ?? null,
            decision_maker: decider?.[0] ?? null,
            timeline: timeline?.[0] ?? null,
            bottleneck: bottleneck.slice(0, 1000),
            preselected,
            placement,
          },
        }),
      });
      if (!res.ok) {
        const data = (await res.json().catch(() => ({}))) as { error?: string };
        setError(data.error ?? "That did not go through. Try again, or call or text us.");
        setStatus("idle");
        return;
      }
      setStatus("done");
    } catch {
      setError("That did not go through. Try again, or call or text us.");
      setStatus("idle");
    }
  }

  if (status === "done") {
    return (
      <div className="hq-card" role="status">
        <p className="cb-eyebrow">It is in</p>
        <h2 className="cb-h2">Ryan has it.</h2>
        <p className="cb-lead">
          A short note is on its way to your inbox now. Expect a text or call within one business day
          to map the first ninety days. Nothing is scoped, built, or billed until you see it in writing.
        </p>
      </div>
    );
  }

  return (
    <form className="grid gap-7" onSubmit={submit} aria-label="Agency intake">
      <fieldset className="hq-card grid gap-4">
        <legend className="cb-eyebrow">1. The business</legend>
        <label className="hq-label">
          Business name
          <input className="hq-input" name="business_name" type="text" required maxLength={200} autoComplete="organization" />
        </label>
        <label className="hq-label">
          Your name
          <input className="hq-input" name="full_name" type="text" required maxLength={200} autoComplete="name" />
        </label>
        <div className="grid gap-4 sm:grid-cols-2">
          <label className="hq-label">
            Email
            <input className="hq-input" name="email" type="email" required maxLength={200} autoComplete="email" inputMode="email" />
          </label>
          <label className="hq-label">
            Mobile (optional)
            <input className="hq-input" name="phone" type="tel" maxLength={50} autoComplete="tel" inputMode="tel" />
          </label>
        </div>
        <label className="hq-label">
          Website or Facebook page (optional)
          <input className="hq-input" name="website_url" type="url" maxLength={300} placeholder="https://" inputMode="url" />
        </label>
      </fieldset>

      <fieldset className="hq-card grid gap-3">
        <legend className="cb-eyebrow">2. What you want run for you</legend>
        {services.map((s) => (
          <label key={s.slug} className="flex items-start gap-3 text-sm">
            <input type="checkbox" name={`service_${s.slug}`} defaultChecked={preselected === s.slug} className="mt-1 h-5 w-5" />
            <span>{s.label}</span>
          </label>
        ))}
      </fieldset>

      <fieldset className="hq-card grid gap-3">
        <legend className="cb-eyebrow">3. Where customers come from today</legend>
        {CHANNELS.map(([id, label]) => (
          <label key={id} className="flex items-start gap-3 text-sm">
            <input type="checkbox" name={`channel_${id}`} className="mt-1 h-5 w-5" />
            <span>{label}</span>
          </label>
        ))}
      </fieldset>

      <fieldset className="hq-card grid gap-3">
        <legend className="cb-eyebrow">4. The monthly ad budget you are genuinely prepared to spend</legend>
        <p className="text-sm text-[var(--muted)]">
          Paid by you, directly to Meta or Google. A $0 answer does not disqualify you; it routes you to
          the right lane.
        </p>
        {BUDGETS.map(([id, label]) => (
          <label key={id} className="flex items-start gap-3 text-sm">
            <input type="radio" name="ad_budget" value={id} required className="mt-1 h-5 w-5" />
            <span>{label}</span>
          </label>
        ))}
      </fieldset>

      <fieldset className="hq-card grid gap-3">
        <legend className="cb-eyebrow">5. The bottleneck</legend>
        <label className="hq-label">
          What is getting stuck, in your own words
          <textarea className="hq-textarea" name="bottleneck" required maxLength={1000} rows={4} placeholder="Leads come in on Facebook and nobody follows up. Or: the phone rings while I am on a job and the voicemail never gets returned." />
        </label>
      </fieldset>

      <fieldset className="hq-card grid gap-3">
        <legend className="cb-eyebrow">6. Who decides</legend>
        {DECIDERS.map(([id, label]) => (
          <label key={id} className="flex items-start gap-3 text-sm">
            <input type="radio" name="decision_maker" value={id} required className="mt-1 h-5 w-5" />
            <span>{label}</span>
          </label>
        ))}
      </fieldset>

      <fieldset className="hq-card grid gap-3">
        <legend className="cb-eyebrow">7. Timeline</legend>
        {TIMELINES.map(([id, label]) => (
          <label key={id} className="flex items-start gap-3 text-sm">
            <input type="radio" name="timeline" value={id} required className="mt-1 h-5 w-5" />
            <span>{label}</span>
          </label>
        ))}
      </fieldset>

      <fieldset className="hq-card grid gap-3">
        <legend className="cb-eyebrow">8. How we may contact you</legend>
        <label className="flex items-start gap-3 text-sm">
          <input type="checkbox" name="sms_consent" className="mt-1 h-5 w-5" />
          <span>
            <SmsConsentText topic="this application" />
          </span>
        </label>
        <label className="flex items-start gap-3 text-sm">
          <input type="checkbox" name="marketing_email_consent" className="mt-1 h-5 w-5" />
          <span>
            Send me Ryan&rsquo;s daily practical business emails for up to 30 days. Optional, and one
            click unsubscribes at any time.
          </span>
        </label>
        <p className="text-xs text-[var(--muted)]">
          The reply to this intake and the scope are sent to your email regardless. Neither box is
          required.
        </p>
      </fieldset>

      {error ? (
        <p className="hq-error" role="alert">
          {error}
        </p>
      ) : null}

      <button type="submit" className="pro-buy-button" disabled={status === "sending"} data-cta="agency_intake_submit" data-cta-placement={placement}>
        {status === "sending" ? "Sending…" : "Send it to Ryan"}
        <ArrowRight aria-hidden="true" className="h-4 w-4" />
      </button>
      <p className="flex items-start gap-2 text-xs text-[var(--muted)]">
        <Check aria-hidden="true" className="mt-0.5 h-4 w-4" />
        <span>
          No guaranteed leads, cost per lead, ranking, or return on ad spend. Your accounts stay in your
          name. Nothing runs without your written approval.
        </span>
      </p>
    </form>
  );
}
