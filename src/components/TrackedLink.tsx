"use client";

// src/components/TrackedLink.tsx
// Drop-in replacement for next/link that fires a Vercel Analytics custom event
// on click. Use it on every key CTA so Ryan can see what visitors actually do.
//
// Usage:
//   <TrackedLink href="/book" event="cta_book_call" location="hero">Book the 10-min call</TrackedLink>
//
// Events show up in Vercel Dashboard → Analytics → Events tab once Web Analytics
// is enabled in the project settings.

import Link, { type LinkProps } from "next/link";
import type { ReactNode, MouseEvent } from "react";
import { trackEvent } from "@/lib/events";

type Props = LinkProps & {
  event: string;
  location?: string;
  children: ReactNode;
  className?: string;
};

export function TrackedLink({
  event, location, children, className, onClick, ...linkProps
}: Props) {
  function handleClick(e: MouseEvent<HTMLAnchorElement>) {
    trackEvent(event, location ? { location } : {});
    if (onClick) onClick(e as any);
  }
  return (
    <Link {...linkProps} onClick={handleClick} className={className}>
      {children}
    </Link>
  );
}
