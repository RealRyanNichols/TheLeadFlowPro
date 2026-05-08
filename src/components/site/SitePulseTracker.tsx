"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import { Activity, BarChart3 } from "lucide-react";

type PulseSnapshot = {
  source: "live" | "offline";
  offlineReason?: string;
  activeNow: number;
  viewsToday: number;
};

type PulseClickSignal = {
  eventType: string;
  target: string;
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

function cleanSourceLabel(value: string, fallback = "unknown") {
  const cleaned = value
    .toLowerCase()
    .replace(/^www\./, "")
    .replace(/[^a-z0-9:._-]/g, "")
    .slice(0, 44);
  return cleaned || fallback;
}

function trafficFamily(hostname: string) {
  const host = hostname.toLowerCase().replace(/^www\./, "");
  if (host.includes("facebook.com") || host === "fb.com" || host === "m.facebook.com") return "facebook";
  if (host === "x.com" || host.includes("twitter.com") || host === "t.co") return "x";
  if (host.includes("instagram.com")) return "instagram";
  if (host.includes("tiktok.com")) return "tiktok";
  if (host.includes("linkedin.com")) return "linkedin";
  if (host.includes("youtube.com") || host === "youtu.be") return "youtube";
  if (host.includes("google.")) return "google";
  if (host.includes("bing.com")) return "bing";
  return cleanSourceLabel(host, "referral");
}

function getTrafficSource() {
  const params = new URLSearchParams(window.location.search);
  if (params.get("lf_share")) return "share-link";

  const utmSource = params.get("utm_source");
  if (utmSource) return `utm:${cleanSourceLabel(utmSource, "campaign")}`;

  if (!document.referrer) return "direct";

  try {
    const referrer = new URL(document.referrer);
    if (referrer.origin === window.location.origin) return "internal";
    return `ref:${trafficFamily(referrer.hostname)}`;
  } catch {
    return "ref:unknown";
  }
}

function markReturnVisit() {
  const key = "leadflow_last_seen_at";
  const now = Date.now();
  const previous = Number(window.localStorage.getItem(key) || 0);
  window.localStorage.setItem(key, String(now));

  if (!previous || !Number.isFinite(previous)) return null;

  const ageMinutes = Math.round((now - previous) / 60_000);
  return ageMinutes >= 30 ? Math.min(ageMinutes, 43_200) : null;
}

function fmt(value: number) {
  if (value >= 1000) return `${(value / 1000).toFixed(value >= 10_000 ? 0 : 1)}K`;
  return value.toLocaleString();
}

async function postPulse(eventType: string, path: string, target?: string, value?: number, source = getTrafficSource()) {
  const response = await fetch("/api/site-pulse", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      visitorId: getVisitorId(),
      eventType,
      path,
      source,
      target,
      value,
    }),
    cache: "no-store",
  });

  if (!response.ok) throw new Error("Pulse request failed");
  return (await response.json()) as PulseSnapshot;
}

function beaconPulse(eventType: string, path: string, target?: string, value?: number, source = getTrafficSource()) {
  const payload = JSON.stringify({
    visitorId: getVisitorId(),
    eventType,
    path,
    source,
    target,
    value,
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

function trackedEventForHref(href: string): PulseClickSignal | null {
  let path = href;
  let host = "";
  try {
    const url = new URL(href, window.location.origin);
    path = url.pathname;
    host = url.host;
  } catch {
    path = href.split("?")[0];
  }

  if (host === "buy.stripe.com") return { eventType: "cta_checkout", target: "stripe-checkout" };
  if (path === "/start" || path.startsWith("/start/")) return { eventType: "cta_start", target: "offer-router" };
  if (path === "/book" || path.startsWith("/book/")) return { eventType: "cta_book", target: "calendar" };
  if (path === "/availability" || path.startsWith("/availability/")) {
    return { eventType: "cta_capacity", target: "capacity" };
  }
  if (path === "/pulse" || path.startsWith("/pulse/")) return { eventType: "cta_pulse", target: "pulse-board" };
  if (
    path === "/challenge" ||
    path.startsWith("/challenge/") ||
    path === "/services" ||
    path.startsWith("/services/") ||
    path === "/tiers" ||
    path.startsWith("/pricing/") ||
    path.startsWith("/offers/")
  ) {
    return { eventType: "cta_service", target: path };
  }
  if (path === "/contact" || path.startsWith("/contact/")) return { eventType: "cta_contact", target: "contact" };
  return null;
}

function cleanTargetLabel(value: string) {
  return value.replace(/\s+/g, " ").replace(/[^\w\s:/.@#-]/g, "").trim().slice(0, 120);
}

function elementLabel(element: Element) {
  const explicit =
    element.getAttribute("data-pulse-label") ||
    element.getAttribute("aria-label") ||
    element.getAttribute("title") ||
    "";
  if (explicit) return cleanTargetLabel(explicit);

  if (
    element instanceof HTMLInputElement ||
    element instanceof HTMLTextAreaElement ||
    element instanceof HTMLSelectElement
  ) {
    return cleanTargetLabel(element.name || element.id || element.type || "field");
  }

  const text = "innerText" in element ? String((element as HTMLElement).innerText || "") : "";
  return cleanTargetLabel(text || element.id || element.tagName.toLowerCase() || "page");
}

function describeClickTarget(target: Element) {
  const interactive = target.closest(
    "a[href],button,input,select,textarea,summary,[role='button'],[data-pulse-target]",
  );
  const element = interactive || target;
  const label = elementLabel(element);

  if (element instanceof HTMLAnchorElement) {
    try {
      const url = new URL(element.href, window.location.origin);
      return cleanTargetLabel(`link:${url.pathname}:${label || "unlabeled"}`);
    } catch {
      return cleanTargetLabel(`link:${label || "unlabeled"}`);
    }
  }

  if (
    element instanceof HTMLInputElement ||
    element instanceof HTMLTextAreaElement ||
    element instanceof HTMLSelectElement
  ) {
    const type = element instanceof HTMLInputElement ? element.type : element.tagName.toLowerCase();
    return cleanTargetLabel(`field:${type}:${label || "unlabeled"}`);
  }

  const role = element.getAttribute("role") || element.tagName.toLowerCase();
  return cleanTargetLabel(`${role}:${label || "unlabeled"}`);
}

function describeExternalAnchor(anchor: HTMLAnchorElement) {
  try {
    const url = new URL(anchor.href, window.location.origin);
    return cleanTargetLabel(`${url.hostname}${url.pathname}`);
  } catch {
    return cleanTargetLabel(anchor.href);
  }
}

function sectionLabel(section: Element, index: number) {
  const explicit = section.getAttribute("data-pulse-section") || section.getAttribute("aria-label") || section.id;
  if (explicit) return cleanTargetLabel(explicit);

  const heading = section.querySelector("h1,h2,h3");
  if (heading?.textContent) return cleanTargetLabel(heading.textContent);

  return `section-${index + 1}`;
}

function describeFormTarget(target: Element) {
  const field = target.closest("input,select,textarea");
  if (!field) return "";

  const label = elementLabel(field);
  const form = field.closest("form");
  const formLabel = form
    ? cleanTargetLabel(form.getAttribute("aria-label") || form.id || form.getAttribute("name") || "form")
    : "form";
  const type = field instanceof HTMLInputElement ? field.type : field.tagName.toLowerCase();

  return cleanTargetLabel(`${formLabel}:${type}:${label || "unlabeled"}`);
}

export function SitePulseTracker() {
  const pathname = usePathname();
  const [snapshot, setSnapshot] = useState<PulseSnapshot>(EMPTY_SNAPSHOT);
  const formSeenRef = useRef<Set<string>>(new Set());

  const enabled = isPublicMarketingPath(pathname);

  useEffect(() => {
    if (!enabled) return;

    let mounted = true;
    const source = getTrafficSource();
    const returnAgeMinutes = markReturnVisit();

    postPulse("view", pathname, undefined, undefined, source)
      .then((next) => {
        if (mounted) setSnapshot(next);
      })
      .catch(() => undefined);

    beaconPulse("traffic_source", pathname, source, 1, source);
    if (returnAgeMinutes) {
      beaconPulse("return_visit", pathname, "minutes-since-last-visit", returnAgeMinutes, source);
    }

    const interval = window.setInterval(() => {
      postPulse("heartbeat", pathname, undefined, undefined, source)
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

    const source = getTrafficSource();
    const interval = window.setInterval(() => {
      if (document.visibilityState !== "visible") return;
      beaconPulse("engagement", pathname, "visible-seconds", 20, source);
    }, 20_000);

    return () => {
      window.clearInterval(interval);
    };
  }, [enabled, pathname]);

  useEffect(() => {
    if (!enabled || pathname !== "/start/thank-you") return;

    const params = new URLSearchParams(window.location.search);
    if (params.get("source") !== "stripe") return;

    const slug = params.get("slug") || "unknown-offer";
    const key = `leadflow_purchase_signal_${slug}`;
    if (window.sessionStorage.getItem(key)) return;
    window.sessionStorage.setItem(key, "1");
    beaconPulse("purchase_complete", pathname, slug, 1, getTrafficSource());
  }, [enabled, pathname]);

  useEffect(() => {
    if (!enabled) return;

    const params = new URLSearchParams(window.location.search);
    const shareToken = params.get("lf_share");
    if (!shareToken) return;

    const cleanToken = shareToken.replace(/[^a-zA-Z0-9_-]/g, "").slice(0, 80);
    if (!cleanToken) return;

    const key = `leadflow_share_click_${cleanToken}`;
    if (window.sessionStorage.getItem(key)) return;
    window.sessionStorage.setItem(key, "1");
    beaconPulse("share_click", pathname, cleanToken, 1, "share-link");
  }, [enabled, pathname]);

  useEffect(() => {
    if (!enabled) return;
    formSeenRef.current = new Set();
    const source = getTrafficSource();

    function onClick(event: MouseEvent) {
      const target = event.target;
      if (!(target instanceof Element)) return;
      if (target.closest("[data-pulse-ignore='true']")) return;

      const interactive = target.closest(
        "a[href],button,input,select,textarea,summary,[role='button'],[data-pulse-target]",
      );
      beaconPulse("click", pathname, describeClickTarget(target), undefined, source);
      if (!interactive) {
        beaconPulse("dead_click", pathname, describeClickTarget(target), 1, source);
      }

      const anchor = target.closest("a[href]");
      if (!(anchor instanceof HTMLAnchorElement)) return;
      if (anchor.dataset.pulseManual === "true") return;

      const url = new URL(anchor.href, window.location.origin);
      if (url.origin !== window.location.origin) {
        beaconPulse("external_click", pathname, describeExternalAnchor(anchor), 1, source);
      }

      const signal = trackedEventForHref(anchor.href);
      if (!signal) return;

      beaconPulse(signal.eventType, url.pathname, signal.target, undefined, source);
    }

    document.addEventListener("click", onClick, { capture: true });
    return () => document.removeEventListener("click", onClick, { capture: true });
  }, [enabled, pathname]);

  useEffect(() => {
    if (!enabled) return;
    const source = getTrafficSource();

    function onFocusIn(event: FocusEvent) {
      const target = event.target;
      if (!(target instanceof Element)) return;
      if (target.closest("[data-pulse-ignore='true']")) return;

      const descriptor = describeFormTarget(target);
      if (!descriptor || formSeenRef.current.has(descriptor)) return;
      formSeenRef.current.add(descriptor);
      beaconPulse("form_interaction", pathname, descriptor, undefined, source);
    }

    document.addEventListener("focusin", onFocusIn, { capture: true });
    return () => document.removeEventListener("focusin", onFocusIn, { capture: true });
  }, [enabled, pathname]);

  useEffect(() => {
    if (!enabled) return;

    const source = getTrafficSource();
    const seenDepths = new Set<number>();
    const thresholds = [25, 50, 75, 90];

    function onScroll() {
      const root = document.documentElement;
      const maxScroll = Math.max(0, root.scrollHeight - window.innerHeight);
      if (!maxScroll) return;

      const depth = Math.round((window.scrollY / maxScroll) * 100);
      thresholds.forEach((threshold) => {
        if (depth < threshold || seenDepths.has(threshold)) return;
        seenDepths.add(threshold);
        beaconPulse("scroll_depth", pathname, `${threshold}%`, threshold, source);
      });
    }

    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, [enabled, pathname]);

  useEffect(() => {
    if (!enabled) return;

    const source = getTrafficSource();
    const startedAt = Date.now();
    let sent = false;

    function sendExitSignal() {
      if (sent) return;
      sent = true;
      const seconds = Math.min(3600, Math.max(1, Math.round((Date.now() - startedAt) / 1000)));
      beaconPulse("page_exit", pathname, "dwell-seconds", seconds, source);
    }

    function onVisibilityChange() {
      if (document.visibilityState === "hidden") sendExitSignal();
    }

    document.addEventListener("visibilitychange", onVisibilityChange);
    window.addEventListener("pagehide", sendExitSignal);

    return () => {
      document.removeEventListener("visibilitychange", onVisibilityChange);
      window.removeEventListener("pagehide", sendExitSignal);
      sendExitSignal();
    };
  }, [enabled, pathname]);

  useEffect(() => {
    if (!enabled) return;

    const source = getTrafficSource();
    const seenSections = new Set<string>();
    const sections = Array.from(document.querySelectorAll("section,[data-pulse-section]")).slice(0, 18);
    if (!sections.length || typeof IntersectionObserver === "undefined") return;

    const observer = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) {
          if (!entry.isIntersecting || entry.intersectionRatio < 0.42) continue;
          const label = sectionLabel(entry.target, sections.indexOf(entry.target));
          if (!label || seenSections.has(label) || seenSections.size >= 12) continue;
          seenSections.add(label);
          beaconPulse("section_view", pathname, label, 1, source);
        }
      },
      { threshold: [0.42, 0.66] },
    );

    sections.forEach((section) => observer.observe(section));
    return () => observer.disconnect();
  }, [enabled, pathname]);

  useEffect(() => {
    if (!enabled) return;

    const source = getTrafficSource();
    let lastCopyAt = 0;

    function onCopy() {
      const now = Date.now();
      if (now - lastCopyAt < 2000) return;
      lastCopyAt = now;
      const copiedLength = Math.min(5000, window.getSelection()?.toString().length ?? 0);
      const bucket = copiedLength >= 500 ? "copy:long" : copiedLength >= 80 ? "copy:medium" : "copy:short";
      beaconPulse("copy_signal", pathname, bucket, copiedLength, source);
    }

    document.addEventListener("copy", onCopy);
    return () => document.removeEventListener("copy", onCopy);
  }, [enabled, pathname]);

  if (!enabled) return null;

  return (
    <Link
      href="/pulse"
      onClick={() => beaconPulse("cta_pulse", "/pulse", "floating-live-pulse")}
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
