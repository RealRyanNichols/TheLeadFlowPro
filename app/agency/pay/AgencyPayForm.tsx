"use client";

// Pay an agency scope by card. The browser sends the service slug, the
// billing choice, the scope reference, the receipt email, and (only while the
// service has no published price) the whole-dollar amount from the written
// scope. /api/checkout rebuilds the charge from lib/agencyPayment.ts, so
// nothing typed here can change what a live-priced service costs.

import { useMemo, useState } from "react";
import { ArrowRight, ShieldCheck } from "lucide-react";
import { AGENCY_BILLING, AGENCY_PAYMENT, type AgencyBilling } from "@/lib/agencyPayment";
import { BUSINESS } from "@/lib/site/business";

export type PayableService = {
  slug: string;
  name: string;
  eyebrow: string;
  /** Whole dollars when Ryan has published a price; null while it is TBD. */
  fixedUsd: number | null;
  fixedLabel: string | null;
  /** The cadence a published price is sold at; null while the service is TBD. */
  fixedBilling: AgencyBilling | null;
};

const PRESETS = [750, 1500, 2500, 4000];

type Status = "idle" | "opening" | "unavailable";

export default function AgencyPayForm({
  services,
  preselected,
  cancelled,
  leadId = null,
}: {
  services: PayableService[];
  preselected: string | null;
  cancelled: boolean;
  /** From /agency/pay?lead=<id>, so the payment lands on the lead Ryan sent the link from. Never shown. */
  leadId?: string | null;
}) {
  const [slug, setSlug] = useState<string>(preselected ?? "");
  const [billing, setBilling] = useState<AgencyBilling>("one_time");
  const [amount, setAmount] = useState<number>(PRESETS[0]);
  const [custom, setCustom] = useState("");
  const [reference, setReference] = useState("");
  const [email, setEmail] = useState("");
  const [status, setStatus] = useState<Status>("idle");
  const [error, setError] = useState(cancelled ? "Checkout was closed before payment. Nothing was charged. Pick up where you left off." : "");

  const service = useMemo(() => services.find((s) => s.slug === slug) ?? null, [services, slug]);
  const usingCustom = custom.trim() !== "";
  const parsed = Math.round(Number(custom.replace(/[^0-9.]/g, "")));
  const effective = service?.fixedUsd ?? (usingCustom ? parsed : amount);
  // A published price carries its cadence; the server enforces the same rule.
  const effectiveBilling: AgencyBilling = service?.fixedBilling ?? billing;
  const amountValid =
    Number.isFinite(effective) && effective >= AGENCY_PAYMENT.minUsd && effective <= AGENCY_PAYMENT.maxUsd;
  const min = AGENCY_PAYMENT.minUsd.toLocaleString("en-US");
  const max = AGENCY_PAYMENT.maxUsd.toLocaleString("en-US");

  async function pay() {
    setError("");
    if (!service) {
      setError("Pick the service this payment is for.");
      return;
    }
    if (!amountValid) {
      setError(`Enter the amount from your written scope, between $${min} and $${max}.`);
      return;
    }
    if (!reference.trim()) {
      setError("Add your business name or the reference printed on the scope.");
      return;
    }
    if (!email.trim()) {
      setError("Add the email the scope was sent to, so the receipt and the payment match.");
      return;
    }
    setStatus("opening");
    try {
      window.fbq?.("track", "InitiateCheckout", { value: effective, currency: "USD" });
      window.gtag?.("event", "begin_checkout", { value: effective, currency: "USD" });
    } catch {
      /* analytics must never block checkout */
    }
    try {
      const response = await fetch("/api/checkout", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          kind: AGENCY_PAYMENT.kind,
          service: service.slug,
          billing: effectiveBilling,
          amount_usd: effective,
          reference: reference.trim(),
          email: email.trim(),
          ...(leadId ? { lead_id: leadId } : {}),
        }),
      });
      if (response.status === 501) {
        setStatus("unavailable");
        return;
      }
      const result = (await response.json().catch(() => ({}))) as { url?: string; error?: string };
      if (result.url) {
        window.location.href = result.url;
        return;
      }
      setError(result.error || "Could not start checkout. Try again, or call or text Ryan.");
    } catch {
      setError("Could not reach checkout. Try again, or call or text Ryan.");
    }
    setStatus("idle");
  }

  if (status === "unavailable") {
    return (
      <div className="cb-deposit" role="status">
        <p className="cb-eyebrow">Card payment is not switched on yet</p>
        <p className="cb-deposit-note" style={{ fontSize: 16 }}>
          Nothing was charged. Ryan takes this one by hand: call or text{" "}
          <a className="cb-textlink" href={BUSINESS.phone.tel}>{BUSINESS.phone.display}</a> or reply to the
          email that carried your scope, and he sends a payment link the same day.
        </p>
      </div>
    );
  }

  const cadence = effectiveBilling === "monthly" ? "a month" : "one time";
  const buttonLabel =
    status === "opening"
      ? "Opening secure checkout"
      : service && amountValid
        ? `Pay $${effective.toLocaleString("en-US")} ${cadence}`
        : "Pay the written scope";

  return (
    <form
      className="cb-deposit"
      aria-label="Pay an agency scope"
      onSubmit={(event) => {
        event.preventDefault();
        void pay();
      }}
    >
      <fieldset className="cb-deposit-field">
        <legend>1. The service</legend>
        <div className="cb-choicelist">
          {services.map((s) => (
            <label key={s.slug} className="cb-choice">
              <input
                type="radio"
                name="service"
                value={s.slug}
                checked={slug === s.slug}
                onChange={() => setSlug(s.slug)}
              />
              <div>
                <strong>{s.name}</strong>
                <span>{s.fixedLabel ? `${s.fixedLabel}. ` : ""}{s.eyebrow}</span>
              </div>
            </label>
          ))}
        </div>
      </fieldset>

      <fieldset className="cb-deposit-field">
        <legend>2. One-time or monthly</legend>
        {service?.fixedBilling ? (
          <div className="cb-deposit-fixed">
            <strong>{AGENCY_BILLING.find((b) => b.id === service.fixedBilling)?.label}</strong>
            <span>{service.name} is sold {service.fixedBilling === "monthly" ? "as a monthly fee" : "as a one-time price"}. Set with the price, not editable here.</span>
          </div>
        ) : (
          <div className="cb-choicelist cb-choicelist--row">
            {AGENCY_BILLING.map((b) => (
              <label key={b.id} className="cb-choice">
                <input
                  type="radio"
                  name="billing"
                  value={b.id}
                  checked={billing === b.id}
                  onChange={() => setBilling(b.id)}
                />
                <div>
                  <strong>{b.label}</strong>
                  <span>{b.note}</span>
                </div>
              </label>
            ))}
          </div>
        )}
      </fieldset>

      <fieldset className="cb-deposit-field">
        <legend>3. The amount from your written scope</legend>
        {service?.fixedUsd ? (
          <div className="cb-deposit-fixed">
            <strong>${service.fixedUsd.toLocaleString("en-US")}</strong>
            <span>{service.name}, the published price. Set by Ryan, not editable here.</span>
          </div>
        ) : (
          <>
            <div className="cb-deposit-presets">
              {PRESETS.map((value) => {
                const selected = !usingCustom && amount === value;
                return (
                  <button
                    key={value}
                    type="button"
                    aria-pressed={selected}
                    onClick={() => {
                      setAmount(value);
                      setCustom("");
                    }}
                    className={`cb-deposit-preset${selected ? " is-on" : ""}`}
                  >
                    ${value.toLocaleString("en-US")}
                  </button>
                );
              })}
            </div>
            <label className="cb-deposit-custom">
              <span>Or type the exact number Ryan wrote down</span>
              <div>
                <span aria-hidden="true">$</span>
                <input
                  inputMode="numeric"
                  value={custom}
                  onChange={(event) => setCustom(event.target.value)}
                  placeholder="1,250"
                  aria-label={`Amount in dollars from your written scope, between ${min} and ${max}`}
                />
              </div>
            </label>
          </>
        )}
      </fieldset>

      <label className="cb-deposit-label">
        4. Business name or scope reference
        <input
          value={reference}
          onChange={(event) => setReference(event.target.value)}
          placeholder="Fixture Fence Co, scope of Sept 20"
          maxLength={120}
          autoComplete="organization"
        />
      </label>

      <label className="cb-deposit-label">
        5. Email the scope was sent to
        <input
          type="email"
          value={email}
          onChange={(event) => setEmail(event.target.value)}
          placeholder="you@yourbusiness.com"
          maxLength={200}
          autoComplete="email"
          inputMode="email"
        />
      </label>

      {error ? (
        <p className="cb-deposit-error" role="alert">
          {error}
        </p>
      ) : null}

      <button
        type="submit"
        disabled={status === "opening"}
        className="cb-btn cb-btn--primary w-full"
        data-cta="agency_pay_submit"
        data-cta-placement="agency_pay"
      >
        {buttonLabel}
        {status !== "opening" ? <ArrowRight aria-hidden="true" className="h-4 w-4" /> : null}
      </button>

      <p className="cb-deposit-note">
        <ShieldCheck aria-hidden="true" className="h-4 w-4" />
        Use this page only for a number already confirmed in writing. Secure checkout is handled by
        Stripe; card details never touch this site. Ad spend is separate and is paid by you to Meta or
        Google directly.
      </p>
    </form>
  );
}
