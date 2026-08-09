"use client";

// The order form at the bottom of every package sales page. The visitor picks
// how they want to move: pay in full, put money down, start with the $497 map,
// or just ask questions. Everything lands in the CRM with the intent attached.

import Link from "next/link";
import { useState } from "react";
import { ArrowRight, CircleCheck } from "lucide-react";
import BuyButton from "@/components/BuyButton";

declare global {
  interface Window {
    fbq?: (...args: unknown[]) => void;
  }
}

const INTENTS: Array<{ id: string; label: string; desc: string }> = [
  {
    id: "pay_full",
    label: "I want to purchase in full",
    desc: "Scope it fast and send me the invoice. I am ready.",
  },
  {
    id: "down_payment",
    label: "I want to put a down payment on it",
    desc: "Reserve my build slot and phase the rest.",
  },
  {
    id: "map_first",
    label: "Start me with the $497 System Map",
    desc: "Blueprint first, credited toward the build.",
  },
  {
    id: "questions",
    label: "I have questions first",
    desc: "Reach out and walk me through it.",
  },
];

export default function PackageOrderForm({
  slug,
  packageName,
  price,
  interest,
  buyable,
}: {
  slug: string;
  packageName: string;
  price: string;
  interest: string;
  buyable: boolean;
}) {
  const [intent, setIntent] = useState<string>(buyable ? "pay_full" : "down_payment");
  const [sending, setSending] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setSending(true);
    setError(null);
    const form = new FormData(e.currentTarget);
    const phone = String(form.get("phone") ?? "").trim();
    const smsConsent = form.get("sms_consent") === "on";
    if (smsConsent && !phone) {
      setError("Add a mobile number before choosing call or text consent.");
      setSending(false);
      return;
    }
    const intentLabel = INTENTS.find((i) => i.id === intent)?.label ?? intent;
    const notes = String(form.get("notes") ?? "").trim();
    const params = new URLSearchParams(window.location.search);

    const res = await fetch("/api/leads", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        full_name: form.get("full_name"),
        business_name: form.get("business_name"),
        email: form.get("email"),
        phone: phone || null,
        website_url: form.get("website_url"),
        interest,
        goals: [
          `PACKAGE ORDER: ${packageName} (${price}).`,
          `Payment intent: ${intentLabel}.`,
          notes ? `Notes: ${notes}` : "",
        ]
          .filter(Boolean)
          .join(" "),
        best_contact_method: form.get("best_contact_method"),
        sms_consent: smsConsent,
        marketing_email_consent: form.get("marketing_email_consent") === "on",
        utm_source: params.get("utm_source"),
        utm_medium: params.get("utm_medium"),
        utm_campaign: params.get("utm_campaign"),
        diagnostic: {
          version: 2,
          source: "package_page",
          package: slug,
          payment_intent: intent,
          owner_notes: notes || null,
          next_action:
            "Package order from the sales page. Scope, invoice per intent, build. No pay if they do not like it.",
        },
      }),
    });
    if (!res.ok) {
      setError(
        (await res.json().catch(() => ({}) as { error?: string })).error ??
          "The request did not go through. Please try again.",
      );
      setSending(false);
      return;
    }
    window.fbq?.("track", "Lead");
    setSubmitted(true);
  }

  if (submitted) {
    return (
      <div className="rounded-[20px] border border-emerald-400/30 bg-emerald-500/[0.06] p-9 text-center">
        <CircleCheck className="mx-auto h-12 w-12 text-emerald-300" />
        <h2 className="mt-4 text-3xl font-black text-white">Your order is in.</h2>
        <p className="mx-auto mt-3 max-w-xl text-slate-300">
          I have your {packageName} request and how you want to move. I will reach out
          within one business day on the channel you chose. Payment happens on a secure
          invoice after we confirm scope, and the guarantee stands: you do not pay for
          anything you do not like.
        </p>
        <div className="mt-7 flex flex-wrap justify-center gap-3">
          <Link href="/portfolio" className="button-secondary">
            See the Live Work
          </Link>
          <Link href="/add-ons" className="button-secondary">
            Browse the Add-On Menu
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="rounded-[20px] border border-line bg-white/[0.04] p-6 shadow-[0_20px_60px_rgba(0,0,0,0.4)] sm:p-9">
      <span className="eyebrow">Start your {packageName}</span>
      <h2 className="mt-4 text-3xl font-black tracking-tight text-white">
        Tell me how you want to move.
      </h2>
      <p className="mt-2 text-slate-400">
        Pick your path, add your details, and it lands on my desk with everything
        attached. No payment is collected on this page.
      </p>

      <div className="mt-6 grid gap-3 sm:grid-cols-2">
        {INTENTS.map((opt) => {
          const on = intent === opt.id;
          return (
            <button
              key={opt.id}
              type="button"
              aria-pressed={on}
              onClick={() => setIntent(opt.id)}
              className={`rounded-xl border p-4 text-left transition ${
                on
                  ? "border-sky-400/70 bg-sky-500/[0.08] shadow-[0_0_20px_rgba(56,189,248,0.15)]"
                  : "border-white/10 bg-[#0c1220] hover:border-white/25"
              }`}
            >
              <span className="flex items-center justify-between gap-2">
                <span className="text-[15px] font-bold text-white">{opt.label}</span>
                <span
                  className={`flex h-5 w-5 flex-none items-center justify-center rounded-full border-2 ${
                    on ? "border-sky-400 bg-sky-400" : "border-white/25"
                  }`}
                >
                  {on && <CircleCheck className="h-4 w-4 text-[#0b0f14]" strokeWidth={3} />}
                </span>
              </span>
              <span className="mt-1 block text-[12.5px] text-slate-400">{opt.desc}</span>
            </button>
          );
        })}
      </div>

      {intent === "map_first" && (
        <div className="mt-4 flex flex-wrap items-center gap-4 rounded-xl border border-sky-400/30 bg-sky-500/[0.06] p-4">
          <p className="min-w-0 flex-1 text-sm text-slate-300">
            The System Map is the one thing you can buy right now, no waiting. $497,
            credited in full toward this build.
          </p>
          <BuyButton
            kind="system_map"
            label="Buy the Map — $497"
            className="button-primary !min-h-[42px]"
          />
        </div>
      )}

      <form onSubmit={handleSubmit} className="mt-7">
        <div className="grid gap-4 sm:grid-cols-2">
          <label className="form-field">
            <span>Your name *</span>
            <input name="full_name" autoComplete="name" required maxLength={200} />
          </label>
          <label className="form-field">
            <span>Business name</span>
            <input name="business_name" autoComplete="organization" maxLength={200} />
          </label>
          <label className="form-field">
            <span>Email *</span>
            <input name="email" type="email" autoComplete="email" required maxLength={200} />
          </label>
          <label className="form-field">
            <span>Mobile phone</span>
            <input name="phone" type="tel" autoComplete="tel" maxLength={50} />
          </label>
          <label className="form-field">
            <span>Website or main profile</span>
            <input
              name="website_url"
              type="text"
              inputMode="url"
              placeholder="Website, page, or none yet"
              maxLength={300}
            />
          </label>
          <label className="form-field">
            <span>Best way to reach you</span>
            <select name="best_contact_method" defaultValue="email">
              <option value="email">Email</option>
              <option value="call">Call</option>
              <option value="text">Text</option>
              <option value="any">Any</option>
            </select>
          </label>
        </div>
        <label className="form-field mt-4">
          <span>Anything I should know going in?</span>
          <textarea
            name="notes"
            rows={3}
            maxLength={1000}
            placeholder="Your business, your timeline, the thing that finally made you look for this."
          />
        </label>
        <div className="consent-list mt-4">
          <label>
            <input type="checkbox" name="sms_consent" />
            <span>
              If I provided a mobile number, The LeadFlow Pro may call or text me about
              this request and related project updates. Consent is not a condition of
              purchase. Message and data rates may apply. Reply STOP to opt out.
            </span>
          </label>
          <label>
            <input type="checkbox" name="marketing_email_consent" />
            <span>
              Send me occasional LeadFlow articles, tools, and launch updates by email. I
              can unsubscribe at any time.
            </span>
          </label>
        </div>
        {error && (
          <p className="form-error mt-3" role="alert">
            {error}
          </p>
        )}
        <button type="submit" className="button-primary mt-6 w-full sm:w-auto" disabled={sending}>
          {sending ? "Sending Your Order..." : `Send My ${packageName} Order`}
          {!sending && <ArrowRight aria-hidden="true" className="h-4 w-4" />}
        </button>
        <p className="form-legal mt-4">
          By submitting, you agree to our <Link href="/terms">Terms</Link> and acknowledge
          our <Link href="/privacy">Privacy Policy</Link>. Payment happens later on a
          secure invoice, and only for work you approve.
        </p>
      </form>
    </div>
  );
}
