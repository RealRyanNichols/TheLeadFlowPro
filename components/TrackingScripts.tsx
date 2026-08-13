"use client";

import Script from "next/script";
import { usePathname, useSearchParams } from "next/navigation";
import { useEffect, Suspense } from "react";
import { pageView } from "@/lib/analytics/client";

declare global {
  interface Window {
    fbq?: (...args: unknown[]) => void;
    gtag?: (...args: unknown[]) => void;
    dataLayer?: unknown[];
  }
}

function PageViewTracker({ metaPixelId }: { metaPixelId: string }) {
  const pathname = usePathname();
  const searchParams = useSearchParams();

  useEffect(() => {
    // First-party analytics: the tracker batches page_view plus interaction
    // events (clicks, scroll depth, forms, engagement) into /api/track.
    pageView(pathname);

    // Meta Pixel SPA page views
    if (metaPixelId && window.fbq) {
      window.fbq("track", "PageView");
    }
  }, [pathname, searchParams, metaPixelId]);

  return null;
}

export default function TrackingScripts({
  metaPixelId,
  googleAdsId,
  ga4Id,
}: {
  metaPixelId: string;
  googleAdsId: string;
  ga4Id: string;
}) {
  const gtagId = googleAdsId || ga4Id;

  return (
    <>
      {metaPixelId && (
        <Script id="meta-pixel" strategy="afterInteractive">
          {`!function(f,b,e,v,n,t,s){if(f.fbq)return;n=f.fbq=function(){n.callMethod?
          n.callMethod.apply(n,arguments):n.queue.push(arguments)};if(!f._fbq)f._fbq=n;
          n.push=n;n.loaded=!0;n.version='2.0';n.queue=[];t=b.createElement(e);t.async=!0;
          t.src=v;s=b.getElementsByTagName(e)[0];s.parentNode.insertBefore(t,s)}(window,
          document,'script','https://connect.facebook.net/en_US/fbevents.js');
          fbq('init', '${metaPixelId}');
          fbq('track', 'PageView');`}
        </Script>
      )}
      {gtagId && (
        <>
          <Script
            src={`https://www.googletagmanager.com/gtag/js?id=${gtagId}`}
            strategy="afterInteractive"
          />
          <Script id="gtag-init" strategy="afterInteractive">
            {`window.dataLayer = window.dataLayer || [];
            function gtag(){dataLayer.push(arguments);}
            gtag('js', new Date());
            ${googleAdsId ? `gtag('config', '${googleAdsId}');` : ""}
            ${ga4Id ? `gtag('config', '${ga4Id}');` : ""}`}
          </Script>
        </>
      )}
      <Suspense>
        <PageViewTracker metaPixelId={metaPixelId} />
      </Suspense>
    </>
  );
}
