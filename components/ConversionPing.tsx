"use client";

import { useEffect } from "react";

/**
 * Fires ad-platform conversion events once when mounted.
 * Lead on the standard thank-you; Purchase (with value) after checkout.
 */
export default function ConversionPing({
  googleAdsId,
  conversionLabel,
  purchase = false,
}: {
  googleAdsId: string;
  conversionLabel: string;
  purchase?: boolean;
}) {
  useEffect(() => {
    if (window.fbq) {
      if (purchase) {
        window.fbq("track", "Purchase", { value: 497, currency: "USD" });
      } else {
        window.fbq("track", "Lead");
      }
    }
    if (window.gtag && googleAdsId && conversionLabel) {
      window.gtag("event", "conversion", {
        send_to: `${googleAdsId}/${conversionLabel}`,
        ...(purchase ? { value: 497, currency: "USD" } : {}),
      });
    }
  }, [googleAdsId, conversionLabel, purchase]);

  return null;
}
