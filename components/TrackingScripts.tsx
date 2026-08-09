"use client";

import Script from "next/script";
import { usePathname, useSearchParams } from "next/navigation";
import { useEffect, Suspense } from "react";

declare global {
  interface Window {
    fbq?: (...args: unknown[]) => void;
    gtag?: (...args: unknown[]) => void;
    dataLayer?: unknown[];
  }
}

function getVisitorId(): string {
  try {
    let id = document.cookie.match(/lfp_vid=([^;]+)/)?.[1];
    if (!id) {
      id = Math.random().toString(36).slice(2) + Date.now().toString(36);
      document.cookie = `lfp_vid=${id}; path=/; max-age=31536000; SameSite=Lax`;
    }
    return id;
  } catch {
    return "unknown";
  }
}

function PageViewTracker({ metaPixelId }: { metaPixelId: string }) {
  const pathname = usePathname();
  const searchParams = useSearchParams();

  useEffect(() => {
    // First-party analytics: log the view into YOUR database
    fetch("/api/track", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        path: pathname,
        referrer: document.referrer || null,
        visitor_id: getVisitorId(),
        utm_source: searchParams.get("utm_source"),
        utm_medium: searchParams.get("utm_medium"),
        utm_campaign: searchParams.get("utm_campaign"),
      }),
      keepalive: true,
    }).catch(() => {});

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
