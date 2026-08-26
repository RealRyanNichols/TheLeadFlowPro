"use client";

import { useEffect } from "react";

/**
 * Fires ad-platform conversion events once when mounted.
 * Lead on the standard thank-you; Purchase after checkout.
 *
 * `value` is the amount actually collected, in dollars, read server-side from
 * the Stripe session. It is deliberately optional: when Stripe cannot confirm
 * the amount, the Purchase still fires with no value rather than with a made
 * up one. A conversion missing its value is a gap in the data. A conversion
 * carrying the wrong value is a lie the ad platform will happily optimize on.
 */
export default function ConversionPing({
  googleAdsId,
  conversionLabel,
  purchase = false,
  value = null,
}: {
  googleAdsId: string;
  conversionLabel: string;
  purchase?: boolean;
  value?: number | null;
}) {
  useEffect(() => {
    const amount = purchase && typeof value === "number" && value > 0 ? value : null;

    if (window.fbq) {
      if (purchase) {
        window.fbq("track", "Purchase", amount === null ? {} : { value: amount, currency: "USD" });
      } else {
        window.fbq("track", "Lead");
      }
    }
    if (window.gtag && googleAdsId && conversionLabel) {
      window.gtag("event", "conversion", {
        send_to: `${googleAdsId}/${conversionLabel}`,
        ...(amount === null ? {} : { value: amount, currency: "USD" }),
      });
    }
  }, [googleAdsId, conversionLabel, purchase, value]);

  return null;
}
