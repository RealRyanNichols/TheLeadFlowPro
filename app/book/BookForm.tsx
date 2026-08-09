"use client";

import { useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";

export default function BookForm() {
  const router = useRouter();
  const params = useSearchParams();
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const defaultInterest = ["learn", "build_with_you", "done_for_you"].includes(
    params.get("interest") ?? ""
  )
    ? (params.get("interest") as string)
    : "unsure";

  async function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setSubmitting(true);
    setError(null);

    const fd = new FormData(e.currentTarget);
    const payload = Object.fromEntries(fd.entries());
    payload.utm_source = params.get("utm_source") ?? "";
    payload.utm_medium = params.get("utm_medium") ?? "";
    payload.utm_campaign = params.get("utm_campaign") ?? "";

    const res = await fetch("/api/leads", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });

    if (res.ok) {
      router.push("/thank-you");
    } else {
      const data = await res.json().catch(() => ({}));
      setError(data.error ?? "Something went wrong. Try again.");
      setSubmitting(false);
    }
  }

  return (
    <form onSubmit={onSubmit} className="space-y-5">
      <div className="grid gap-5 sm:grid-cols-2">
        <div>
          <label className="label" htmlFor="full_name">Your name *</label>
          <input className="input" id="full_name" name="full_name" required maxLength={200} />
        </div>
        <div>
          <label className="label" htmlFor="business_name">Business name</label>
          <input className="input" id="business_name" name="business_name" maxLength={200} />
        </div>
      </div>

      <div className="grid gap-5 sm:grid-cols-2">
        <div>
          <label className="label" htmlFor="email">Email *</label>
          <input className="input" id="email" name="email" type="email" required maxLength={200} />
        </div>
        <div>
          <label className="label" htmlFor="phone">Phone</label>
          <input className="input" id="phone" name="phone" type="tel" maxLength={50} />
        </div>
      </div>

      <div>
        <label className="label" htmlFor="website_url">Current website (if any)</label>
        <input className="input" id="website_url" name="website_url" maxLength={300} placeholder="https://" />
      </div>

      <div className="grid gap-5 sm:grid-cols-2">
        <div>
          <label className="label" htmlFor="current_platform">What are you on now?</label>
          <select className="input" id="current_platform" name="current_platform" defaultValue="">
            <option value="">Pick one</option>
            <option value="shopify">Shopify</option>
            <option value="wix">Wix / Squarespace</option>
            <option value="wordpress">WordPress</option>
            <option value="aweber_mailchimp">AWeber / Mailchimp heavy</option>
            <option value="multiple">Several of these</option>
            <option value="none">Nothing yet</option>
            <option value="other">Other</option>
          </select>
        </div>
        <div>
          <label className="label" htmlFor="monthly_platform_spend">
            Monthly software spend
          </label>
          <select className="input" id="monthly_platform_spend" name="monthly_platform_spend" defaultValue="">
            <option value="">Pick one</option>
            <option value="under_100">Under $100/mo</option>
            <option value="100_300">$100 to $300/mo</option>
            <option value="300_600">$300 to $600/mo</option>
            <option value="600_plus">$600+/mo</option>
            <option value="not_sure">Honestly not sure</option>
          </select>
        </div>
      </div>

      <div>
        <label className="label" htmlFor="interest">Which path interests you?</label>
        <select className="input" id="interest" name="interest" defaultValue={defaultInterest}>
          <option value="learn">Learn It: teach me the system</option>
          <option value="build_with_you">Build It With You: build mine together</option>
          <option value="done_for_you">Done For You: build it and hand me the keys</option>
          <option value="unsure">Not sure yet, let's talk</option>
        </select>
      </div>

      <div>
        <label className="label" htmlFor="goals">
          What would change in your business if this worked? *
        </label>
        <textarea className="input" id="goals" name="goals" rows={4} required maxLength={2000} />
      </div>

      <div className="grid gap-5 sm:grid-cols-2">
        <div>
          <label className="label" htmlFor="timeline">How soon?</label>
          <select className="input" id="timeline" name="timeline" defaultValue="">
            <option value="">Pick one</option>
            <option value="asap">ASAP</option>
            <option value="30_days">Within 30 days</option>
            <option value="90_days">Within 90 days</option>
            <option value="exploring">Just exploring</option>
          </select>
        </div>
        <div>
          <label className="label" htmlFor="best_contact_method">Best way to reach you</label>
          <select className="input" id="best_contact_method" name="best_contact_method" defaultValue="">
            <option value="">Pick one</option>
            <option value="call">Call</option>
            <option value="text">Text</option>
            <option value="email">Email</option>
            <option value="any">Any</option>
          </select>
        </div>
      </div>

      {error && <p className="text-sm font-medium text-red-400">{error}</p>}

      <button type="submit" disabled={submitting} className="btn-primary w-full disabled:opacity-50">
        {submitting ? "Sending..." : "Send It"}
      </button>
      <p className="text-center text-xs text-slate-400">
        No spam. No list-selling. I read every one of these myself.
      </p>
    </form>
  );
}
