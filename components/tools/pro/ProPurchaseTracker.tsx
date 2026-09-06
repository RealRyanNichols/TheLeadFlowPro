"use client";

import { useEffect, useState } from "react";
import ConversionPing from "@/components/ConversionPing";
import { analyticsAllowedNow } from "@/lib/analytics/browserPrivacy";
import { createProPurchaseReceiptConsumer } from "@/lib/analytics/proPurchaseClient";
import type { ProPurchaseEvent } from "@/lib/proPurchaseReceipt";

const receipts = createProPurchaseReceiptConsumer();

export default function ProPurchaseTracker({ googleAdsId, conversionLabel }: { googleAdsId: string; conversionLabel: string }) {
  const [event, setEvent] = useState<ProPurchaseEvent | null>(null);
  useEffect(() => {
    let active = true;
    let timer: number | undefined;
    let attempts = 0;
    const retry = () => {
      if (active && ++attempts < 20) timer = window.setTimeout(check, 500);
    };
    const check = async () => {
      if (!active) return;
      // Wait for the existing SDK setup. Never initialize it or relax its guards here.
      if (!analyticsAllowedNow() || !(window.fbq || (window.gtag && googleAdsId && conversionLabel))) {
        retry();
        return;
      }
      try {
        const receipt = await receipts.consume();
        if (active && receipt && analyticsAllowedNow() && receipts.claimEvent(receipt.eventId)) setEvent(receipt);
      } catch {
        retry();
      }
    };
    // Parent/sibling tracking effects finish before the first attempt.
    timer = window.setTimeout(check, 0);
    return () => { active = false; window.clearTimeout(timer); };
  }, [googleAdsId, conversionLabel]);
  return event ? (
    <ConversionPing
      googleAdsId={googleAdsId} conversionLabel={conversionLabel}
      purchase value={event.value} dedupeKey={event.eventId} sku={event.sku}
    />
  ) : null;
}
