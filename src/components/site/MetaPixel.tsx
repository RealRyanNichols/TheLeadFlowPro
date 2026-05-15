"use client";

import { useEffect } from "react";
import Script from "next/script";
import { usePathname, useSearchParams } from "next/navigation";

declare global {
  interface Window {
    fbq?: (...args: unknown[]) => void;
    _fbq?: unknown;
  }
}

const PIXEL_ID = process.env.NEXT_PUBLIC_META_PIXEL_ID;

function eventKey(pathname: string, search: string, eventName: string) {
  return `leadflow.meta.${eventName}.${pathname}.${search}`;
}

export function MetaPixel() {
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const search = searchParams.toString();

  useEffect(() => {
    if (!PIXEL_ID || typeof window.fbq !== "function") return;
    window.fbq("track", "PageView");
  }, [pathname, search]);

  useEffect(() => {
    if (!PIXEL_ID || typeof window.fbq !== "function") return;

    const submitted = searchParams.get("submitted");
    if (submitted !== "1") return;

    let contentName: string | null = null;
    if (pathname === "/stump-ryan" || pathname === "/challenge") {
      contentName = "Stump Ryan Build Blueprint";
    } else if (pathname.startsWith("/audit/") || pathname === "/lead-leak-audit/thank-you") {
      contentName = "Lead Leak Audit";
    }

    if (!contentName) return;

    const key = eventKey(pathname, search, "Lead");
    if (window.sessionStorage.getItem(key)) return;
    window.sessionStorage.setItem(key, "1");
    window.fbq("track", "Lead", {
      content_name: contentName,
      source: "leadflow_site",
    });
  }, [pathname, search, searchParams]);

  if (!PIXEL_ID) return null;

  return (
    <>
      <Script id="meta-pixel" strategy="afterInteractive">
        {`
          !function(f,b,e,v,n,t,s)
          {if(f.fbq)return;n=f.fbq=function(){n.callMethod?
          n.callMethod.apply(n,arguments):n.queue.push(arguments)};
          if(!f._fbq)f._fbq=n;n.push=n;n.loaded=!0;n.version='2.0';
          n.queue=[];t=b.createElement(e);t.async=!0;
          t.src=v;s=b.getElementsByTagName(e)[0];
          s.parentNode.insertBefore(t,s)}(window, document,'script',
          'https://connect.facebook.net/en_US/fbevents.js');
          fbq('init', '${PIXEL_ID}');
          fbq('track', 'PageView');
        `}
      </Script>
      <noscript>
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          height="1"
          width="1"
          style={{ display: "none" }}
          src={`https://www.facebook.com/tr?id=${PIXEL_ID}&ev=PageView&noscript=1`}
          alt=""
        />
      </noscript>
    </>
  );
}
