"use client";

import { usePathname, useSearchParams } from "next/navigation";
import { useEffect, Suspense } from "react";
import { pageView } from "@/lib/analytics/client";
import { analyticsAllowedNow, initializeMarketingAnalytics } from "@/lib/analytics/browserPrivacy";

declare global {
  interface Window {
    fbq?: (...args: unknown[]) => void;
    gtag?: (...args: unknown[]) => void;
    dataLayer?: unknown[];
  }
}

type TrackingProps = { metaPixelId: string; googleAdsId: string; ga4Id: string };

function PageViewTracker({ metaPixelId, googleAdsId, ga4Id }: TrackingProps) {
  const pathname = usePathname();
  const searchParams = useSearchParams();
  useEffect(() => {
    initializeMarketingAnalytics(metaPixelId, googleAdsId, ga4Id);
    // Private transitions also reach pageView so it can discard timers and
    // queued engagement from the previous page without reading private text.
    pageView(pathname);
    if (!analyticsAllowedNow()) return;
    if (metaPixelId) window.fbq?.("track", "PageView");
    if (googleAdsId || ga4Id) window.gtag?.("event", "page_view");
  }, [pathname, searchParams, metaPixelId, googleAdsId, ga4Id]);
  return null;
}

export default function TrackingScripts(props: TrackingProps) {
  return <Suspense><PageViewTracker {...props} /></Suspense>;
}
