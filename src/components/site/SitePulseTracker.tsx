"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";
import { Activity, BarChart3 } from "lucide-react";

type PulseSnapshot = {
  source: "live" | "offline";
  offlineReason?: string;
  activeNow: number;
  viewsToday: number;
};

const EMPTY_SNAPSHOT: PulseSnapshot = {
  source: "offline",
  activeNow: 0,
  viewsToday: 0,
};

const SKIPPED_PREFIXES = [
  "/api",
  "/admin",
  "/dashboard",
  "/login",
  "/signup",
  "/onboarding",
  "/profile",
];

function isPublicMarketingPath(pathname: string) {
  return !SKIPPED_PREFIXES.some((prefix) => pathname === prefix || pathname.startsWith(`${prefix}/`));
}

function getVisitorId() {
  const key = "leadflow_public_visitor_id";
  const existing = window.localStorage.getItem(key);
  if (existing) return existing;

  const next =
    typeof window.crypto?.randomUUID === "function"
      ? window.crypto.randomUUID()
      : `${Date.now()}-${Math.random().toString(36).slice(2)}`;

  window.localStorage.setItem(key, next);
  return next;
}

function fmt(value: number) {
  if (value >= 1000) return `${(value / 1000).toFixed(value >= 10_000 ? 0 : 1)}K`;
  return value.toLocaleString();
}

async function postPulse(eventType: string, path: string) {
  const response = await fetch("/api/site-pulse", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      visitorId: getVisitorId(),
      eventType,
      path,
      source: "site-wide",
    }),
    cache: "no-store",
  });

  if (!response.ok) throw new Error("Pulse request failed");
  return (await response.json()) as PulseSnapshot;
}

function beaconPulse(eventType: string, path: string) {
  const payload = JSON.stringify({
    visitorId: getVisitorId(),
    eventType,
    path,
    source: "site-wide",
  });
  const body = new Blob([payload], { type: "application/json" });

  if (navigator.sendBeacon) {
    navigator.sendBeacon("/api/site-pulse", body);
    return;
  }

  fetch("/api/site-pulse", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: payload,
    keepalive: true,
  }).catch(() => undefined);
}

function trackedEventForHref(href: string): string | null {
  let path = href;
  try {
    path = new URL(href, window.location.origin).pathname;
  } catch {
    path = href.split("?")[0];
  }

  if (path === "/start" || path.startsWith("/start/")) return "cta_start";
  if (path === "/book" || path.startsWith("/book/")) return "cta_book";
  if (path === "/availability" || path.startsWith("/availability/")) return "cta_capacity";
  if (path === "/pulse" || path.startsWith("/pulse/")) return "cta_pulse";
  return null;
}

export function SitePulseTracker() {
  const pathname = usePathname();
  const [snapshot, setSnapshot] = useState<PulseSnapshot>(EMPTY_SNAPSHOT);

  const enabled = isPublicMarketingPath(pathname);

  useEffect(() => {
    if (!enabled) return;

    let mounted = true;

    postPulse("view", pathname)
      .then((next) => {
        if (mounted) setSnapshot(next);
      })
      .catch(() => undefined);

    const interval = window.setInterval(() => {
      postPulse("heartbeat", pathname)
        .then((next) => {
          if (mounted) setSnapshot(next);
        })
        .catch(() => undefined);
    }, 20_000);

    return () => {
      mounted = false;
      window.clearInterval(interval);
    };
  }, [enabled, pathname]);

  useEffect(() => {
    if (!enabled) return;

    function onClick(event: MouseEvent) {
      const target = event.target;
      if (!(target instanceof Element)) return;
      const anchor = target.closest("a[href]");
      if (!(anchor instanceof HTMLAnchorElement)) return;
      if (anchor.dataset.pulseManual === "true") return;

      const eventType = trackedEventForHref(anchor.href);
      if (!eventType) return;

      const path = new URL(anchor.href, window.location.origin).pathname;
      beaconPulse(eventType, path);
    }

    document.addEventListener("click", onClick, { capture: true });
    return () => document.removeEventListener("click", onClick, { capture: true });
  }, [enabled]);

  if (!enabled) return null;

  return (
    <Link
      href="/pulse"
      onClick={() => beaconPulse("cta_pulse", "/pulse")}
      data-pulse-manual="true"
      className="fixed bottom-4 left-4 z-40 inline-flex max-w-[calc(100vw-2rem)] items-center gap-2 rounded-full border border-cyan-200/80 bg-white/90 px-3 py-2 text-xs font-semibold text-slate-900 shadow-[0_18px_45px_-22px_rgba(15,23,42,0.65)] backdrop-blur hover:border-cyan-300 hover:bg-cyan-50"
      aria-label="Open the live website effectiveness board"
    >
      <span
        className={
          snapshot.source === "live"
            ? "relative flex h-2.5 w-2.5"
            : "relative flex h-2.5 w-2.5 opacity-60"
        }
      >
        <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-cyan-400 opacity-60" />
        <span className="relative inline-flex h-2.5 w-2.5 rounded-full bg-cyan-500" />
      </span>
      <Activity className="h-3.5 w-3.5 text-cyan-700" />
      <span className="hidden sm:inline">Live pulse</span>
      <span className="tabular-nums">{fmt(snapshot.activeNow)} watching</span>
      <span className="hidden items-center gap-1 rounded-full bg-slate-100 px-2 py-0.5 text-[10px] text-slate-600 sm:inline-flex">
        <BarChart3 className="h-3 w-3" />
        {fmt(snapshot.viewsToday)} today
      </span>
    </Link>
  );
}
