"use client";

import { Analytics } from "@vercel/analytics/next";
import { SpeedInsights } from "@vercel/speed-insights/next";
import { usePathname, useSearchParams } from "next/navigation";
import { Suspense, useEffect, useState } from "react";
import { filterVendorAnalyticsEvent } from "@/lib/analytics/privacy";
import {
  analyticsAllowedNow,
  installAnalyticsPrivacyGuards,
} from "@/lib/analytics/browserPrivacy";

function beforeSend<T extends { url: string }>(event: T): T | null {
  if (!analyticsAllowedNow()) return null;
  return filterVendorAnalyticsEvent(
    event,
    window.location.href,
    document.referrer,
  );
}

function PublicAnalyticsRuntime() {
  const pathname = usePathname();
  const search = useSearchParams();
  const [enabled, setEnabled] = useState(false);
  useEffect(() => {
    installAnalyticsPrivacyGuards();
    setEnabled(analyticsAllowedNow());
  }, [pathname, search]);
  // The beforeSend guard rechecks every event. Unmounting alone would not stop
  // an already-loaded vendor script after a Next.js client-side transition.
  if (!enabled) return null;
  return (
    <>
      <Analytics beforeSend={beforeSend} />
      <SpeedInsights beforeSend={beforeSend} />
    </>
  );
}

export default function PublicAnalytics() {
  return (
    <Suspense>
      <PublicAnalyticsRuntime />
    </Suspense>
  );
}
