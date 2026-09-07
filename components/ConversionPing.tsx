"use client";

import { useEffect } from "react";
import { purchaseEvent } from "@/lib/analytics/purchaseEvent";
import { analyticsAllowedNow } from "@/lib/analytics/browserPrivacy";

/**
 * Fires ad-platform conversion events once when mounted.
 * Lead on the standard thank-you; Purchase (with value) after checkout.
 *
 * Purchases require the verified Stripe amount and its opaque event ID.
 * No amount fallback or raw checkout credential is sent to an ad platform.
 * Existing route privacy guards remain authoritative.
 */
export default function ConversionPing({
  googleAdsId,
  conversionLabel,
  purchase = false,
  value,
  dedupeKey,
  sku,
}: {
  googleAdsId: string;
  conversionLabel: string;
  purchase?: boolean;
  value?: number;
  dedupeKey?: string | null;
  sku?: string;
}) {
  useEffect(() => {
    if (!analyticsAllowedNow()) return;
    const event = purchase ? purchaseEvent(value, dedupeKey, sku) : null;
    if (purchase && !event) return;
    if (!window.fbq && !(window.gtag && googleAdsId && conversionLabel)) return;
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

    try {
    if (window.fbq) {
      if (purchase) {
        window.fbq("track", "Purchase", {
          value: event!.value, currency: event!.currency,
          ...(event!.sku ? { content_type: "product", content_ids: [event!.sku], num_items: 1 } : {}),
        }, { eventID: event!.eventId });
      } else {
        window.fbq("track", "Lead");
      }
    }
    } catch { /* Optional vendor failure cannot interrupt the buyer or other measurement. */ }
    try {
    if (window.gtag && googleAdsId && conversionLabel) {
      window.gtag("event", "conversion", {
        send_to: `${googleAdsId}/${conversionLabel}`,
        ...(event ? {
          value: event.value, currency: event.currency, transaction_id: event.eventId,
          ...(event.sku ? { items: [{ item_id: event.sku, price: event.value, quantity: 1 }] } : {}),
        } : {}),
      });
    }
    } catch { /* Optional vendor failure cannot interrupt the buyer. */ }
  }, [googleAdsId, conversionLabel, purchase, value, dedupeKey, sku]);

  return null;
}
