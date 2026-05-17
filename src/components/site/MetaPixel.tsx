"use client";

// MetaPixel — SPA navigation + conversion tracker.
//
// The base pixel <script> + <noscript> are rendered server-side in
// src/app/layout.tsx <head>, which is what Meta Pixel Helper looks for first.
// This component does NOT re-inject the script. It only:
//   1. Fires fbq("track", "PageView") on App-Router client navigation
//      (Next.js doesn't reload, so the head-injected PageView would miss
//      every internal nav without this).
//   2. Fires fbq("track", "Lead") when ?submitted=1 appears on known intake
//      pages, idempotent per pathname+search via sessionStorage.
//
// Skip the first PageView fire to avoid double-counting the head-injected one.

import { useEffect, useRef } from "react";
import { usePathname, useSearchParams } from "next/navigation";

declare global {
  interface Window {
    fbq?: (...args: unknown[]) => void;
    _fbq?: unknown;
  }
}

function eventKey(pathname: string, search: string, eventName: string) {
  return `leadflow.meta.${eventName}.${pathname}.${search}`;
}

export function MetaPixel() {
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const search = searchParams.toString();
  const initialPageView = useRef(true);

  // SPA route-change PageView (skip first run — head script already fired it)
  useEffect(() => {
    if (initialPageView.current) {
      initialPageView.current = false;
      return;
    }
    if (typeof window.fbq !== "function") return;
    window.fbq("track", "PageView");
  }, [pathname, search]);

  // Lead conversion event
  useEffect(() => {
    if (typeof window.fbq !== "function") return;

    const submitted = searchParams.get("submitted");
    if (submitted !== "1") return;

    let contentName: string | null = null;
    if (pathname === "/stump-ryan" || pathname === "/challenge" || pathname === "/stump-ryan/thank-you") {
      contentName = "Stump Ryan Build Blueprint";
    } else if (pathname === "/lead-leak-audit-197") {
      contentName = "$197 Lead Leak Audit";
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

  return null;
}
