import { getSettings } from "@/lib/settings";
import ProPurchaseTracker from "./ProPurchaseTracker";

export default async function ProPurchaseTracking() {
  const settings = await getSettings();
  return <ProPurchaseTracker googleAdsId={settings.google_ads_id} conversionLabel={settings.google_ads_conversion_label} />;
}
