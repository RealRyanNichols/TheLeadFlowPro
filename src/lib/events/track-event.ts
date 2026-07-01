"use client";

import { track } from "@vercel/analytics";
import {
  isSafeLeadFlowEventName,
  normalizeLeadFlowEventName,
  sanitizeLeadFlowEventProperties,
  type LeadFlowEventProperties,
} from "@/lib/leadflow-events";

export type TrackEventProperties = Record<string, unknown>;

const ANONYMOUS_USER_KEY = "leadflow.anonymousUserId";

function anonymousUserId() {
  if (typeof window === "undefined") return "";
  try {
    const existing = window.localStorage.getItem(ANONYMOUS_USER_KEY);
    if (existing) return existing;
    const generated =
      typeof crypto !== "undefined" && "randomUUID" in crypto
        ? crypto.randomUUID()
        : `lfp_${Date.now()}_${Math.random().toString(36).slice(2)}`;
    window.localStorage.setItem(ANONYMOUS_USER_KEY, generated);
    return generated;
  } catch {
    return "";
  }
}

function currentRoute() {
  if (typeof window === "undefined") return "";
  const allowedParams = new Set(["utm_source", "utm_medium", "utm_campaign", "utm_term", "utm_content"]);
  const params = new URLSearchParams();
  for (const [key, value] of new URLSearchParams(window.location.search)) {
    if (allowedParams.has(key)) params.set(key, value.slice(0, 120));
  }
  const query = params.toString();
  return `${window.location.pathname}${query ? `?${query}` : ""}`.slice(0, 700);
}

function sendInternalEvent(eventName: string, properties: Record<string, string | number | boolean>) {
  if (typeof window === "undefined") return;

  const body = JSON.stringify({
    eventName,
    properties,
    anonymousUserId: anonymousUserId(),
    route: typeof properties.route === "string" ? properties.route : currentRoute(),
    sourceUrl: window.location.href,
  });

  try {
    if (navigator.sendBeacon) {
      const blob = new Blob([body], { type: "application/json" });
      if (navigator.sendBeacon("/api/leadflow/events", blob)) return;
    }
  } catch {
    // Fall through to fetch.
  }

  fetch("/api/leadflow/events", {
    method: "POST",
    headers: { "content-type": "application/json" },
    body,
    keepalive: true,
  }).catch(() => null);
}

export function trackEvent(eventName: string, properties: TrackEventProperties = {}) {
  const safeEventName = normalizeLeadFlowEventName(eventName);
  if (!safeEventName || !isSafeLeadFlowEventName(safeEventName)) return;
  const safeProperties = sanitizeLeadFlowEventProperties({
    route: currentRoute(),
    ...properties,
  });

  try {
    track(safeEventName, safeProperties);
  } catch {
    // Analytics must never block buyer, admin, marketplace, or intake workflows.
  }

  sendInternalEvent(safeEventName, safeProperties);
}

export function trackLeadFlowEvent(eventName: string, properties: LeadFlowEventProperties = {}) {
  trackEvent(eventName, properties);
}
