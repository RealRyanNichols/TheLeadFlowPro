"use client";

import { ArrowRight, ShieldCheck } from "lucide-react";
import { WEBSITE_LAUNCH_CHECKOUT } from "@/lib/offers";
import { PRICES, usd } from "@/lib/site/prices";

export default function DepositForm() {
  function trackCheckout() {
    try {
      window.fbq?.("track", "InitiateCheckout", { value: PRICES.websiteLaunchDeposit, currency: "USD" });
      window.gtag?.("event", "begin_checkout", { value: PRICES.websiteLaunchDeposit, currency: "USD" });
    } catch {
      /* analytics must never block checkout */
    }
  }

  return (
    <div className="cb-deposit">
      <fieldset className="cb-deposit-field">
        <legend>Website Launch payment schedule</legend>
        <div className="cb-deposit-presets">
          <span className="cb-deposit-preset is-on">{usd(PRICES.websiteLaunchDeposit)} due now</span>
          <span className="cb-deposit-preset">{usd(PRICES.websiteLaunchFinal)} after approval</span>
        </div>
        <p className="cb-deposit-note">
          The second {usd(PRICES.websiteLaunchFinal)} is due after you approve the working site and before it launches.
        </p>
      </fieldset>

      <a
        href={WEBSITE_LAUNCH_CHECKOUT}
        onClick={trackCheckout}
        className="cb-btn cb-btn--primary w-full"
        data-analytics="cta-website-launch-deposit"
      >
        Pay {usd(PRICES.websiteLaunchDeposit)} deposit on Stripe
        <ArrowRight aria-hidden="true" className="h-4 w-4" />
      </a>

      <p className="cb-deposit-note">
        <ShieldCheck aria-hidden="true" className="h-4 w-4" />
        Secure checkout and receipt are handled by Stripe. The deposit is the first half
        of the {usd(PRICES.websiteLaunchTotal)} Website Launch price. Once intake begins, the {usd(PRICES.websiteLaunchDeposit)} deposit is
        non-refundable, except where the written agreement or applicable law requires
        otherwise.
      </p>
    </div>
  );
}
