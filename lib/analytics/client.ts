"use client";

// First-party event tracker. One instance per page load, mounted by
// AnalyticsTracker in the root layout. Batches events to /api/track with
// sendBeacon on page hide so nothing blocks navigation.
//
// Privacy rules, enforced here AND server-side AND in the database policy:
// anonymous ids only, no form values ever read, query strings never stored,
// admin/back-office routes never tracked.

import type { IncomingEvent } from "./shared";

const FLUSH_MS = 4000;
const MAX_BATCH = 20;
const SESSION_IDLE_MS = 30 * 60 * 1000;

/** Back-office and account surfaces produce no analytics events at all. */
const UNTRACKED = /^\/(admin|dashboard|login|training|api)(\/|$)/;

type TrackOpts = {
  label?: string;
  toolSlug?: string;
  targetHost?: string;
  path?: string;
  meta?: Record<string, string | number | boolean>;
};

let queue: IncomingEvent[] = [];
let flushTimer: ReturnType<typeof setTimeout> | null = null;
let started = false;
let currentPath = "/";
let engagedSent = false;
let sessionPageviews = 0;
let visibleSince: number | null = null;
let engagementMs = 0;
let scrollMarks = new Set<number>();
let formStarts = new Set<string>();
let formViews = new WeakSet<HTMLFormElement>();
let bookingStartSent = false;
let sessionUtm: Record<string, string> = {};

function uuid(): string {
  try {
    return crypto.randomUUID();
  } catch {
    return `${Date.now().toString(16)}-${Math.random().toString(16).slice(2, 10)}-4xxx-yxxx-xxxxxxxxxxxx`.replace(
      /[xy]/g,
      (c) => {
        const r = (Math.random() * 16) | 0;
        return (c === "x" ? r : (r & 0x3) | 0x8).toString(16);
      }
    );
  }
}

function readCookie(name: string): string | null {
  try {
    const m = document.cookie.match(new RegExp(`(?:^|; )${name}=([^;]+)`));
    return m ? decodeURIComponent(m[1]) : null;
  } catch {
    return null;
  }
}

function setCookie(name: string, value: string, maxAge?: number) {
  try {
    document.cookie = `${name}=${encodeURIComponent(value)}; path=/; SameSite=Lax${
      maxAge ? `; max-age=${maxAge}` : ""
    }`;
  } catch {
    /* cookies blocked — analytics degrades silently */
  }
}

/** Same visitor cookie TrackingScripts has always used. */
export function getVisitorId(): string {
  let id = readCookie("lfp_vid");
  if (!id) {
    id = Math.random().toString(36).slice(2) + Date.now().toString(36);
    setCookie("lfp_vid", id, 31536000);
  }
  return id;
}

/**
 * Session id lives in a session cookie (so /api/leads can attribute a
 * lead_created event to the same session) plus a last-activity stamp for the
 * 30-minute idle rule.
 */
function getSessionId(): { id: string; isNew: boolean } {
  const now = Date.now();
  const last = Number(sessionStorage.getItem("lfp_last") || 0);
  let id = readCookie("lfp_sid");
  let isNew = false;
  if (!id || (last && now - last > SESSION_IDLE_MS)) {
    id = uuid();
    setCookie("lfp_sid", id);
    isNew = true;
    sessionPageviews = 0;
    engagedSent = false;
  }
  sessionStorage.setItem("lfp_last", String(now));
  return { id, isNew };
}

function getVisitorType(sessionIsNew: boolean): "new" | "returning" {
  try {
    const seen = localStorage.getItem("lfp_seen");
    if (!seen) {
      localStorage.setItem("lfp_seen", String(Date.now()));
      return "new";
    }
    // First seen during this same session still counts as new.
    if (sessionIsNew) return "returning";
    const sessionStart = Number(sessionStorage.getItem("lfp_session_start") || 0);
    return Number(seen) >= sessionStart && sessionStart > 0 ? "new" : "returning";
  } catch {
    return "new";
  }
}

function captureUtm() {
  try {
    const params = new URLSearchParams(window.location.search);
    const keys = ["utm_source", "utm_medium", "utm_campaign", "utm_content"];
    const found: Record<string, string> = {};
    for (const k of keys) {
      const v = params.get(k);
      if (v) found[k] = v.slice(0, 100);
    }
    if (Object.keys(found).length > 0) {
      sessionStorage.setItem("lfp_utm", JSON.stringify(found));
    }
    sessionUtm = JSON.parse(sessionStorage.getItem("lfp_utm") || "{}");
  } catch {
    sessionUtm = {};
  }
}

function shouldTrack(): boolean {
  if (typeof window === "undefined") return false;
  if (UNTRACKED.test(window.location.pathname)) return false;
  if ((navigator as { webdriver?: boolean }).webdriver) return false;
  return true;
}

function isInternal(): boolean {
  return readCookie("lfp_int") === "1";
}

function baseEvent(name: string, opts: TrackOpts = {}): IncomingEvent {
  const { id: sessionId } = getSessionId();
  return {
    client_id: uuid(),
    event_name: name,
    path: opts.path ?? currentPath,
    page_title: document.title?.slice(0, 200) || undefined,
    label: opts.label,
    target_host: opts.targetHost,
    tool_slug: opts.toolSlug,
    referrer: document.referrer || undefined,
    utm_source: sessionUtm.utm_source,
    utm_medium: sessionUtm.utm_medium,
    utm_campaign: sessionUtm.utm_campaign,
    utm_content: sessionUtm.utm_content,
    visitor_id: getVisitorId(),
    session_id: sessionId,
    visitor_type: getVisitorType(false),
    meta: opts.meta ?? {},
  };
}

function send(body: string, useBeacon: boolean) {
  try {
    if (useBeacon && navigator.sendBeacon) {
      const ok = navigator.sendBeacon(
        "/api/track",
        new Blob([body], { type: "application/json" })
      );
      if (ok) return;
    }
    fetch("/api/track", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body,
      keepalive: true,
    }).catch(() => {});
  } catch {
    /* analytics must never break the page */
  }
}

function flush(useBeacon = false) {
  if (flushTimer) {
    clearTimeout(flushTimer);
    flushTimer = null;
  }
  if (queue.length === 0) return;
  const batch = queue.slice(0, MAX_BATCH);
  queue = queue.slice(MAX_BATCH);
  send(JSON.stringify({ events: batch, internal: isInternal() }), useBeacon);
  if (queue.length > 0) flush(useBeacon);
}

function enqueue(event: IncomingEvent) {
  queue.push(event);
  markEngagementSignal(event.event_name);
  if (queue.length >= MAX_BATCH) {
    flush();
    return;
  }
  if (!flushTimer) flushTimer = setTimeout(() => flush(), FLUSH_MS);
}

/** Public API: record one event. Safe to call anywhere on the client. */
export function track(name: string, opts: TrackOpts = {}) {
  if (!shouldTrack()) return;
  try {
    enqueue(baseEvent(name, opts));
  } catch {
    /* never throw from analytics */
  }
}

// ---------------------------------------------------------------------------
// Engagement: a session is "engaged" after 10s of visible time, a second
// page view, or any deliberate interaction. Sent once per session.
// ---------------------------------------------------------------------------

const INTERACTION_EVENTS = new Set([
  "cta_click", "navigation_click", "outbound_click", "phone_click",
  "sms_click", "email_click", "form_start", "form_submit",
  "booking_start", "booking_complete", "tool_start", "tool_complete",
]);

function markEngagementSignal(name: string) {
  if (engagedSent) return;
  if (INTERACTION_EVENTS.has(name) || sessionPageviews >= 2) {
    engagedSent = true;
    queue.push(baseEvent("engaged_session"));
  }
}

function accumulateEngagement() {
  if (visibleSince != null) {
    engagementMs += Date.now() - visibleSince;
    visibleSince = null;
  }
}

function checkEngagedByTime() {
  if (engagedSent) return;
  const total = engagementMs + (visibleSince != null ? Date.now() - visibleSince : 0);
  if (total >= 10_000) {
    engagedSent = true;
    enqueue(baseEvent("engaged_session"));
  }
}

function sendPageEngagement(path: string, useBeacon: boolean) {
  accumulateEngagement();
  const seconds = Math.round(engagementMs / 1000);
  engagementMs = 0;
  if (seconds >= 1) {
    queue.push(baseEvent("page_engagement", { path, meta: { seconds: Math.min(seconds, 1800) } }));
  }
  if (queue.length > 0) flush(useBeacon);
}

// ---------------------------------------------------------------------------
// Route changes (called by AnalyticsTracker on every pathname change).
// ---------------------------------------------------------------------------

const TOOL_PATH_RE = /^\/(?:tools|embed)\/(?!collections)([a-z0-9-]+)\/?$/;

export function pageView(pathname: string) {
  if (!shouldTrack()) return;
  try {
    const previousPath = currentPath;
    const hadView = started && sessionPageviews > 0;
    if (hadView && previousPath !== pathname) {
      sendPageEngagement(previousPath, false);
    }
    currentPath = pathname.split("?")[0] || "/";
    ensureStarted();

    const { isNew } = getSessionId();
    if (isNew || !sessionStorage.getItem("lfp_session_started")) {
      sessionStorage.setItem("lfp_session_started", "1");
      sessionStorage.setItem("lfp_session_start", String(Date.now()));
      enqueue(baseEvent("session_start"));
    }

    sessionPageviews += 1;
    scrollMarks = new Set();
    formStarts = new Set();
    enqueue(baseEvent("page_view"));

    const toolMatch = currentPath.match(TOOL_PATH_RE);
    if (toolMatch) {
      enqueue(baseEvent("tool_view", { toolSlug: toolMatch[1] }));
    }
    if (visibleSince == null && document.visibilityState === "visible") {
      visibleSince = Date.now();
    }
  } catch {
    /* never throw */
  }
}

// ---------------------------------------------------------------------------
// Global listeners: clicks, scroll depth, forms, visibility, Calendly.
// ---------------------------------------------------------------------------

function labelFor(el: HTMLElement): string {
  return (
    el.getAttribute("data-cta") ||
    el.getAttribute("data-analytics") ||
    el.id ||
    (el.textContent || "").trim().replace(/\s+/g, " ").slice(0, 80) ||
    "(unlabeled)"
  );
}

function onClick(e: MouseEvent) {
  try {
    if (!shouldTrack()) return;
    const target = e.target as HTMLElement | null;
    if (!target) return;
    const anchor = target.closest("a") as HTMLAnchorElement | null;
    const clickable = (target.closest(
      "a, button, [data-analytics], [data-cta], [data-track-tool]"
    ) ?? null) as HTMLElement | null;
    if (!clickable) return;

    const href = anchor?.getAttribute("href") || "";

    if (href.startsWith("tel:")) {
      track("phone_click", { label: labelFor(clickable) });
      return;
    }
    if (href.startsWith("sms:")) {
      track("sms_click", { label: labelFor(clickable) });
      return;
    }
    if (href.startsWith("mailto:")) {
      track("email_click", { label: labelFor(clickable) });
      return;
    }

    const toolSlug = clickable.getAttribute("data-track-tool");
    if (toolSlug) {
      track("tool_card_open", { toolSlug });
      return;
    }

    const cta =
      clickable.getAttribute("data-cta") || clickable.getAttribute("data-analytics");
    const placement = clickable.getAttribute("data-cta-placement");
    const isButtonish =
      clickable.classList.contains("header-cta") ||
      clickable.classList.contains("button-primary") ||
      clickable.classList.contains("btn-primary") ||
      clickable.classList.contains("cb-btn--primary");

    if (cta || isButtonish) {
      const pathToolMatch = currentPath.match(TOOL_PATH_RE);
      track("cta_click", {
        label: placement ? `${cta ?? labelFor(clickable)} · ${placement}` : cta ?? labelFor(clickable),
        toolSlug: pathToolMatch?.[1],
      });
      return;
    }

    if (anchor && href.startsWith("http")) {
      try {
        const url = new URL(href);
        if (url.hostname && !url.hostname.endsWith(location.hostname)) {
          track("outbound_click", { targetHost: url.hostname, label: labelFor(anchor) });
          return;
        }
      } catch {
        /* bad href */
      }
    }

    if (anchor && anchor.closest("header, nav, .site-header, .mobile-nav-panel, footer")) {
      track("navigation_click", { label: labelFor(anchor) });
    }
  } catch {
    /* never throw from a click handler */
  }
}

let scrollScheduled = false;
function onScroll() {
  if (scrollScheduled || !shouldTrack()) return;
  scrollScheduled = true;
  requestAnimationFrame(() => {
    scrollScheduled = false;
    try {
      const doc = document.documentElement;
      const total = doc.scrollHeight - window.innerHeight;
      if (total < 200) return;
      const pct = Math.round(((window.scrollY || doc.scrollTop) / total) * 100);
      for (const mark of [25, 50, 75, 100]) {
        if (pct >= mark && !scrollMarks.has(mark)) {
          scrollMarks.add(mark);
          track("scroll_depth", { meta: { depth: mark } });
        }
      }
    } catch {
      /* ignore */
    }
  });
}

function formLabel(form: HTMLFormElement): string {
  return (
    form.getAttribute("data-analytics") ||
    form.id ||
    form.getAttribute("name") ||
    `form@${currentPath}`
  ).slice(0, 120);
}

function onFocusIn(e: FocusEvent) {
  try {
    if (!shouldTrack()) return;
    const el = e.target as HTMLElement | null;
    if (!el || !/^(INPUT|TEXTAREA|SELECT)$/.test(el.tagName)) return;
    const form = el.closest("form");
    if (!form) return;
    const label = formLabel(form);
    if (formStarts.has(label)) return;
    formStarts.add(label);
    track("form_start", { label });
  } catch {
    /* ignore */
  }
}

function onSubmit(e: Event) {
  try {
    if (!shouldTrack()) return;
    const form = e.target as HTMLFormElement | null;
    if (!form || form.tagName !== "FORM") return;
    track("form_submit", { label: formLabel(form) });
    flush();
  } catch {
    /* ignore */
  }
}

function observeForms() {
  if (!("IntersectionObserver" in window)) return;
  const io = new IntersectionObserver(
    (entries) => {
      for (const entry of entries) {
        if (entry.isIntersecting) {
          const form = entry.target as HTMLFormElement;
          if (!formViews.has(form)) {
            formViews.add(form);
            track("form_view", { label: formLabel(form) });
          }
          io.unobserve(form);
        }
      }
    },
    { threshold: 0.4 }
  );
  const scan = () => {
    document.querySelectorAll("form").forEach((f) => {
      if (!formViews.has(f as HTMLFormElement)) io.observe(f);
    });
  };
  scan();
  // Re-scan after route transitions render new forms.
  const mo = new MutationObserver(() => scan());
  mo.observe(document.body, { childList: true, subtree: true });
}

/** Calendly embeds postMessage lifecycle events; that is our only honest
 * signal that the thank-you calendar actually produced a booking. */
function onMessage(e: MessageEvent) {
  try {
    if (!/https:\/\/([a-z0-9-]+\.)?calendly\.com$/.test(e.origin)) return;
    const kind = (e.data as { event?: string })?.event;
    if (!kind || typeof kind !== "string") return;
    if (!bookingStartSent && (kind === "calendly.profile_page_viewed" || kind === "calendly.event_type_viewed" || kind === "calendly.date_and_time_selected")) {
      bookingStartSent = true;
      track("booking_start", { label: "calendly" });
    }
    if (kind === "calendly.event_scheduled") {
      track("booking_complete", { label: "calendly" });
      flush();
    }
  } catch {
    /* ignore */
  }
}

function onVisibility() {
  try {
    if (document.visibilityState === "hidden") {
      accumulateEngagement();
      sendPageEngagement(currentPath, true);
    } else if (document.visibilityState === "visible" && visibleSince == null) {
      visibleSince = Date.now();
    }
  } catch {
    /* ignore */
  }
}

let engagementInterval: ReturnType<typeof setInterval> | null = null;

function ensureStarted() {
  if (started) return;
  started = true;
  captureUtm();
  document.addEventListener("click", onClick, { capture: true, passive: true });
  window.addEventListener("scroll", onScroll, { passive: true });
  document.addEventListener("focusin", onFocusIn, { passive: true });
  document.addEventListener("submit", onSubmit, { capture: true });
  document.addEventListener("visibilitychange", onVisibility);
  window.addEventListener("pagehide", () => {
    accumulateEngagement();
    sendPageEngagement(currentPath, true);
  });
  window.addEventListener("message", onMessage);
  observeForms();
  engagementInterval = setInterval(checkEngagedByTime, 2500);
  if (document.visibilityState === "visible") visibleSince = Date.now();
  void engagementInterval;
}
