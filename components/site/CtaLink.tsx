"use client";

import Link from "next/link";

// Primary CTAs fire a named event into whatever pixels are already loaded by
// TrackingScripts (Meta, GA4/Google Ads) and then navigate normally. No new
// dependency, no new endpoint, and nothing breaks when the pixels are absent.
export default function CtaLink({
  href,
  event,
  placement,
  className,
  children,
}: {
  href: string;
  event: string;
  placement: string;
  className?: string;
  children: React.ReactNode;
}) {
  function fire() {
    try {
      window.fbq?.("trackCustom", event, { placement });
      window.gtag?.("event", event, { placement });
    } catch {
      /* analytics must never block navigation */
    }
  }

  return (
    <Link href={href} className={className} onClick={fire} data-cta={event}>
      {children}
    </Link>
  );
}
