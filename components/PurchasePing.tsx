import ConversionPing from "@/components/ConversionPing";
import { getSettings } from "@/lib/settings";
import { fetchPaidSession } from "@/lib/stripeSession";

/**
 * Server component for post-payment pages. Verifies the Checkout session with
 * Stripe, then fires one Purchase conversion with the real amount, deduped on
 * the session id. Renders nothing when the session is missing or unpaid, so a
 * welcome page can never report a sale that did not happen.
 */
export default async function PurchasePing({ sessionId }: { sessionId?: string | null }) {
  const paid = await fetchPaidSession(sessionId);
  if (!paid) return null;
  const settings = await getSettings();
  return (
    <ConversionPing
      googleAdsId={settings.google_ads_id}
      conversionLabel={settings.google_ads_conversion_label}
      purchase
      value={paid.amountUsd}
      dedupeKey={paid.sessionId}
    />
  );
}
