"use client";

// The order form at the bottom of every package sales page. Website Launch has
// a fixed $1,000 schedule: $500 to start and $500 after approval, before launch.
// Other packages retain their existing purchase, deposit, map-first, and
// question paths. The CRM capture still runs before any checkout handoff.

import Link from "next/link";
import { useState } from "react";
import { ArrowRight, CircleCheck, Lock } from "lucide-react";
import BuyButton from "@/components/BuyButton";
import { WEBSITE_LAUNCH_CHECKOUT } from "@/lib/offers";

declare global {
  interface Window {
    fbq?: (...args: unknown[]) => void;
  }
}

const INTENTS: Array<{ id: string; label: string; desc: string }> = [
  {
    id: "pay_full",
    label: "I want to purchase in full",
    desc: "Pay the base price by card right now under the written scope.",
  },
  {
    id: "down_payment",
    label: "I want to put a down payment on it",
    desc: "Pick your amount, pay by card, reserve your build slot.",
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

const BASE_PRICE: Record<string, number> = {
  "system-map": 497,
  launch: 1000,
};

const DEPOSIT_PRESETS = [500, 1000, 2500, 5000];
const DEPOSIT_MIN = 250;

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
  const isWebsiteLaunch = slug === "launch";
  const isCompanyOS = slug === "industry-os" || slug === "company_os";
  const [intent, setIntent] = useState<string>(
    isCompanyOS ? "map_first" : buyable ? "pay_full" : "down_payment",
  );
  const [deposit, setDeposit] = useState<number>(500);
  const [customDeposit, setCustomDeposit] = useState<string>("");
  const [sending, setSending] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [payNotice, setPayNotice] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const basePrice = BASE_PRICE[slug] ?? 0;
  const maxDeposit = Math.min(25000, basePrice);
  const parsedCustomDeposit = Math.round(Number(customDeposit));
  const activeDeposit = isWebsiteLaunch
    ? 500
    : customDeposit
      ? parsedCustomDeposit
      : deposit;
  const depositIsValid =
    Number.isFinite(activeDeposit) &&
    activeDeposit >= DEPOSIT_MIN &&
    activeDeposit <= maxDeposit;
  const availableIntents = isCompanyOS
    ? INTENTS.filter((option) => option.id === "map_first" || option.id === "questions")
    : isWebsiteLaunch
      ? INTENTS.filter((option) => option.id === "down_payment" || option.id === "questions")
      : INTENTS;
  const paysNow = intent === "pay_full" || intent === "down_payment";
  const payAmount = intent === "pay_full" ? basePrice : activeDeposit;

  function fmt(n: number) {
    return `$${n.toLocaleString("en-US")}`;
  }

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setSending(true);
    setError(null);
    const form = new FormData(e.currentTarget);
    const phone = String(form.get("phone") ?? "").trim();
    const email = String(form.get("email") ?? "").trim();
    const smsConsent = form.get("sms_consent") === "on";
    if (smsConsent && !phone) {
      setError("Add a mobile number before choosing call or text consent.");
      setSending(false);
      return;
    }
    if (isCompanyOS && (intent === "pay_full" || intent === "down_payment")) {
      setError("Company OS requires a System Map before any build payment.");
      setSending(false);
      return;
    }
    if (intent === "down_payment" && !isWebsiteLaunch && !depositIsValid) {
      setError(`Enter a deposit between ${fmt(DEPOSIT_MIN)} and ${fmt(maxDeposit)}.`);
      setSending(false);
      return;
    }
    const intentLabel = INTENTS.find((i) => i.id === intent)?.label ?? intent;
    const notes = String(form.get("notes") ?? "").trim();
    const params = new URLSearchParams(window.location.search);
    const payLine =
      intent === "pay_full"
        ? `Paying in full by card now: ${fmt(basePrice)}.`
        : intent === "down_payment"
          ? `Paying down payment by card now: ${fmt(activeDeposit)}.`
          : "";

    // 1) The order lands in the CRM first, so nothing is lost if checkout is
    //    abandoned on the Stripe page.
    let res: Response;
    try {
      res = await fetch("/api/leads", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
        full_name: form.get("full_name"),
        business_name: form.get("business_name"),
        email,
        phone: phone || null,
        website_url: form.get("website_url"),
        interest,
        goals: [
          `PACKAGE ORDER: ${packageName} (${price}).`,
          `Payment intent: ${intentLabel}.`,
          payLine,
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
          pay_now_usd: paysNow ? payAmount : null,
          owner_notes: notes || null,
          next_action:
            "Package order from the sales page. If payment initiated, confirm it in Stripe and follow the written scope and milestone schedule.",
        },
        }),
      });
    } catch {
      setError("Could not reach the project intake. Check the connection and try again.");
      setSending(false);
      return;
    }
    if (!res.ok) {
      setError(
        (await res.json().catch(() => ({}) as { error?: string })).error ??
          "The request did not go through. Please try again.",
      );
      setSending(false);
      return;
    }
    window.fbq?.("track", "Lead");

    // 2) If they chose to pay now, hand off to Stripe's secure hosted checkout.
    if (paysNow) {
      window.fbq?.("track", "InitiateCheckout", { value: payAmount, currency: "USD" });
      if (isWebsiteLaunch && intent === "down_payment") {
        window.location.href = WEBSITE_LAUNCH_CHECKOUT;
        return;
      }
      try {
        const co = await fetch("/api/checkout", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(
            slug === "system-map" && intent === "pay_full"
              ? { kind: "system_map", email }
              : {
                  kind: intent === "pay_full" ? "package_full" : "package_deposit",
                  package: slug,
                  amount_usd: activeDeposit,
                  email,
                },
          ),
        });
        if (co.ok) {
          const j = await co.json();
          if (j.url) {
            window.location.href = j.url;
            return;
          }
        }
        // Checkout not configured or failed: the order is already saved.
        setPayNotice(
          "Card checkout is being switched on. Your order is locked in, and a secure payment link for " +
            fmt(payAmount) +
            " will be in your inbox within one business day.",
        );
      } catch {
        setPayNotice(
          "Card checkout could not start. Your order is locked in, and a secure payment link for " +
            fmt(payAmount) +
            " will be in your inbox within one business day.",
        );
      }
    }
    setSubmitted(true);
  }

  if (submitted) {
    return (
      <div className="rounded-[20px] border border-[var(--green-line)] bg-emerald-500/[0.06] p-9 text-center">
        <CircleCheck className="mx-auto h-12 w-12 text-[var(--green)]" />
        <h2 className="mt-4 text-3xl font-black text-[var(--heading)]">Your order is in.</h2>
        <p className="mx-auto mt-3 max-w-xl text-[var(--text)]">
          {payNotice ??
            `I have your ${packageName} request and how you want to move. I will reach out within one business day on the channel you chose.`}{" "}
          The next step follows the written scope and payment schedule shown on this page.
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
    <div className="rounded-[20px] border border-line bg-[var(--fill-2)] p-6 shadow-[0_20px_60px_rgba(0,0,0,0.4)] sm:p-9">
      <span className="eyebrow">Start your {packageName}</span>
      <h2 className="mt-4 text-3xl font-black tracking-tight text-[var(--heading)]">
        Tell me how you want to move.
      </h2>
      <p className="mt-2 text-[var(--muted)]">
        {isWebsiteLaunch
          ? "The five-page Website Launch is $1,000: $500 to start and $500 after approval, before launch. Once intake begins, the deposit is non-refundable, except where the written agreement or applicable law requires otherwise."
          : isCompanyOS
            ? "Company OS begins with a $497 System Map so the scope, dependencies, and implementation plan are clear before any build payment."
            : "Pick your path and add your details. Card payments run on Stripe secure checkout, and every dollar you put down is credited in full toward your build."}
      </p>

      <div className="mt-6 grid gap-3 sm:grid-cols-2">
        {availableIntents.map((opt) => {
          const on = intent === opt.id;
          return (
            <button
              key={opt.id}
              type="button"
              aria-pressed={on}
              onClick={() => setIntent(opt.id)}
              className={`rounded-xl border p-4 text-left transition ${
                on
                  ? "border-[var(--accent-line)] bg-sky-500/[0.08] shadow-[0_8px_20px_rgba(18,64,232,0.12)]"
                  : "border-[var(--line-strong)] bg-[var(--panel)] hover:border-[var(--line-strong)]"
              }`}
            >
              <span className="flex items-center justify-between gap-2">
                <span className="text-[15px] font-bold text-[var(--heading)]">{opt.label}</span>
                <span
                  className={`flex h-5 w-5 flex-none items-center justify-center rounded-full border-2 ${
                    on ? "border-sky-400 bg-sky-400" : "border-[var(--line-strong)]"
                  }`}
                >
                  {on && <CircleCheck className="h-4 w-4 text-[#0b0f14]" strokeWidth={3} />}
                </span>
              </span>
              <span className="mt-1 block text-[12.5px] text-[var(--muted)]">{opt.desc}</span>
            </button>
          );
        })}
      </div>

      {intent === "down_payment" && isWebsiteLaunch && (
        <div className="mt-4 rounded-xl border border-[var(--accent-line)] bg-sky-500/[0.06] p-5">
          <p className="text-sm font-bold text-[var(--heading)]">
            $500 reserves your Website Launch.
          </p>
          <p className="mt-1 text-[12.5px] text-[var(--muted)]">
            The remaining $500 is due after you approve the working site and before it
            launches. Once intake begins, the deposit is non-refundable, except where the
            written agreement or applicable law requires otherwise. After the order is
            saved, Stripe opens for the deposit.
          </p>
        </div>
      )}

      {intent === "down_payment" && !isWebsiteLaunch && (
        <div className="mt-4 rounded-xl border border-[var(--accent-line)] bg-sky-500/[0.06] p-5">
          <p className="text-sm font-bold text-[var(--heading)]">
            How much do you want to put down?
          </p>
          <p className="mt-1 text-[12.5px] text-[var(--muted)]">
            Your call. Every dollar is credited in full toward the {packageName} build.
            Minimum {fmt(DEPOSIT_MIN)}.
          </p>
          <div className="mt-3 flex flex-wrap items-center gap-2">
            {DEPOSIT_PRESETS.filter((v) => v <= maxDeposit).map((v) => {
              const on = !customDeposit && deposit === v;
              return (
                <button
                  key={v}
                  type="button"
                  onClick={() => {
                    setDeposit(v);
                    setCustomDeposit("");
                  }}
                  className={`rounded-lg border px-4 py-2 text-sm font-bold transition ${
                    on
                      ? "border-sky-400 bg-[var(--accent-tint)] text-[var(--heading)] shadow-[0_0_14px_rgba(56,189,248,0.3)]"
                      : "border-[var(--line-strong)] bg-[var(--panel)] text-[var(--text)] hover:border-[var(--line-strong)]"
                  }`}
                >
                  {fmt(v)}
                </button>
              );
            })}
            <div className="flex items-center gap-1.5">
              <span className="text-sm font-bold text-[var(--muted)]">$</span>
              <input
                type="number"
                aria-label="Custom deposit amount in dollars"
                inputMode="numeric"
                min={DEPOSIT_MIN}
                max={maxDeposit}
                step={50}
                placeholder="Custom"
                value={customDeposit}
                onChange={(e) => setCustomDeposit(e.target.value)}
                className="w-28 rounded-lg border border-[var(--line-strong)] bg-[var(--panel)] px-3 py-2 text-sm font-bold text-[var(--heading)] placeholder:font-medium placeholder:text-[var(--quiet)]"
              />
            </div>
          </div>
          <p className="mt-3 flex items-center gap-2 text-[12.5px] font-semibold text-[var(--blue)]">
            <Lock className="h-3.5 w-3.5" />
            {depositIsValid
              ? `You will pay ${fmt(activeDeposit)} on Stripe secure checkout after you send the order below.`
              : `Enter a deposit between ${fmt(DEPOSIT_MIN)} and ${fmt(maxDeposit)}.`}
          </p>
        </div>
      )}

      {intent === "pay_full" && (
        <div className="mt-4 rounded-xl border border-[var(--accent-line)] bg-sky-500/[0.06] p-5">
          <p className="flex items-center gap-2 text-sm font-bold text-[var(--heading)]">
            <Lock className="h-4 w-4 text-[var(--blue)]" />
            Pay {fmt(basePrice)} now on Stripe secure checkout.
          </p>
          <p className="mt-1 text-[12.5px] text-[var(--muted)]">
            That covers the base scope. If the System Map scopes your build bigger, the
            difference is a separate approval. If it scopes smaller, the difference is
            credited or refunded. Every phase follows its written scope and milestone.
          </p>
        </div>
      )}

      {intent === "map_first" && (
        <div className="mt-4 flex flex-wrap items-center gap-4 rounded-xl border border-[var(--accent-line)] bg-sky-500/[0.06] p-4">
          <p className="min-w-0 flex-1 text-sm text-[var(--text)]">
            The System Map is the fastest yes. $497, credited in full toward this build.
          </p>
          <BuyButton
            kind="system_map"
            label="Buy the Map | $497"
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
          {sending
            ? paysNow
              ? "Opening Secure Checkout..."
              : "Sending Your Order..."
            : paysNow
              ? Number.isFinite(payAmount)
                ? `Send Order + Pay ${fmt(payAmount)} Now`
                : "Enter a valid deposit amount"
              : `Send My ${packageName} Order`}
          {!sending && <ArrowRight aria-hidden="true" className="h-4 w-4" />}
        </button>
        <p className="form-legal mt-4">
          By submitting, you agree to our <Link href="/terms">Terms</Link> and acknowledge
          our <Link href="/privacy">Privacy Policy</Link>. Card payments are processed by
          Stripe on their secure checkout page. Deposits and payments follow the written
          scope. Website Launch is $500 now and $500 after approval, before launch. Once
          intake begins, the initial $500 is non-refundable, except where the written
          agreement or applicable law requires otherwise.
        </p>
      </form>
    </div>
  );
}
