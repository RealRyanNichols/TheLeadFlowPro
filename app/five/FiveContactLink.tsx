"use client";

import type { ReactNode } from "react";
import { track } from "@/lib/analytics/client";
import { FIVE_OFFER, FIVE_TRACKING } from "@/lib/fiveOffer";

// Text and call buttons that record the click. The number itself comes from
// the page (lib/site/business), never typed here.

export default function FiveContactLink({
  href,
  kind,
  className,
  children,
}: {
  href: string;
  kind: "sms" | "phone";
  className?: string;
  children: ReactNode;
}) {
  return (
    <a
      href={href}
      className={className}
      onClick={() =>
        track(kind === "sms" ? "sms_click" : "phone_click", {
          label: FIVE_TRACKING.contactLabel,
          path: FIVE_OFFER.path,
        })
      }
    >
      {children}
    </a>
  );
}
