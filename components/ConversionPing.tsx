"use client";

import { useEffect } from "react";

/**
 * Fires ad-platform conversion events once when mounted.
 * Lead on the standard thank-you; Purchase (with value) after checkout.
 *
 * VALUE: `value` is the real amount in dollars. It used to be hardcoded to 497
 * for every purchase on the site, which meant a $500 deposit, a $1,000 full
 * payment and a $25,000 custom deposit all reported to Meta and Google as a
 * $497 sale. Every caller that takes money should pass the actual number.
 * The 497 default is kept only so existing call sites behave exactly as they
 * did before; it is not a sensible default for anything new.
 *
 * DEDUPE: pass `dedupeKey` (the Stripe session id is ideal) on any page a
 * buyer can reload. Without it, a refresh on a post-payment page fires a
 * second Purchase and inflates the number the ad platform optimizes against.
 */
export default function ConversionPing({
  googleAdsId,
  conversionLabel,
  purchase = false,
  value = 497,
  dedupeKey,
}: {
  googleAdsId: string;
  conversionLabel: string;
  purchase?: boolean;
  value?: number;
  dedupeKey?: string | null;
}) {
  useEffect(() => {
    // One fire per key, per browser session. Storage can throw in private
    // windows and locked-down browsers, so a failure here must never stop the
    // event: worst case we are back to the old behavior.
    if (dedupeKey) {
      const storageKey = `cping:${purchase ? "purchase" : "lead"}:${dedupeKey}`;
      try {
        if (window.sessionStorage.getItem(storageKey)) return;
        window.sessionStorage.setItem(storageKey, "1");
      } catch {
        // fall through and fire
      }
    }

    if (window.fbq) {
      if (purchase) {
        window.fbq("track", "Purchase", { value, currency: "USD" });
      } else {
        window.fbq("track", "Lead");
      }
    }
    if (window.gtag && googleAdsId && conversionLabel) {
      window.gtag("event", "conversion", {
        send_to: `${googleAdsId}/${conversionLabel}`,
        ...(purchase ? { value, currency: "USD" } : {}),
      });
    }
  }, [googleAdsId, conversionLabel, purchase, value, dedupeKey]);

  return null;
}
