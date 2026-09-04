"use client";

import { isPublicAnalyticsUrl, safeAnalyticsReferrer, safeAnalyticsUrl, thirdPartyAnalyticsAllowed } from "./privacy";

type TrackingFunction = ((...args: unknown[]) => void) & {
  callMethod?: (...args: unknown[]) => void;
  queue?: unknown[][];
  push?: TrackingFunction;
  loaded?: boolean;
  version?: string;
};

let installed = false;
let routeBlocked = true;
let privateDocument = false;
const googleIds = new Set<string>();
const guarded = new WeakSet<object>();
const guardedHistory = new WeakSet<object>();
let wasPublicDocument = false;

export function analyticsAllowedNow(): boolean {
  return typeof window !== "undefined" && !routeBlocked &&
    thirdPartyAnalyticsAllowed(window.location.href, document.referrer);
}

function setRoutePrivacy(url: string) {
  // A vendor might retain a queued event internally. Once this document has
  // entered a private surface, keep vendors disabled until a full page load.
  privateDocument ||= !thirdPartyAnalyticsAllowed(url, document.referrer);
  const nextBlocked = privateDocument;
  if (!nextBlocked) wasPublicDocument = true;
  const changed = nextBlocked !== routeBlocked;
  routeBlocked = nextBlocked;
  const globals = window as unknown as Record<string, unknown>;
  for (const id of googleIds) globals[`ga-disable-${id}`] = nextBlocked;
  // These are runtime transport controls, not a claim about user consent.
  if (changed && window.fbq) window.fbq("consent", nextBlocked ? "revoke" : "grant");
}

export function guardTrackingGlobals() {
  const originalMeta = window.fbq as TrackingFunction | undefined;
  if (originalMeta && !guarded.has(originalMeta)) {
    const proxy = new Proxy(originalMeta, {
      apply(target, thisArg, args: unknown[]) {
        if (["track", "trackCustom", "trackSingle", "trackSingleCustom"].includes(String(args[0])) && !analyticsAllowedNow()) return;
        return Reflect.apply(target, thisArg, args);
      },
    });
    guarded.add(proxy);
    window.fbq = proxy;
    (window as unknown as { _fbq?: TrackingFunction })._fbq = proxy;
  }
  const originalGoogle = window.gtag;
  if (originalGoogle && !guarded.has(originalGoogle)) {
    const proxy = new Proxy(originalGoogle, {
      apply(target, thisArg, args: unknown[]) {
        if (["event", "config"].includes(String(args[0]))) {
          if (!analyticsAllowedNow()) return;
          const supplied = args[2] && typeof args[2] === "object" ? args[2] as Record<string, unknown> : {};
          args[2] = {
            ...supplied,
            page_location: safeAnalyticsUrl(window.location.href),
            page_referrer: safeAnalyticsReferrer(document.referrer) ?? "",
            ...(args[0] === "config" ? { send_page_view: false } : {}),
          };
        }
        return Reflect.apply(target, thisArg, args);
      },
    });
    guarded.add(proxy);
    window.gtag = proxy;
  }
}

/**
 * Install before vendor scripts. History wrappers disable already-loaded
 * SDKs before their own history listeners can observe a private destination.
 * The wrappers remain installed across Next client-side navigation.
 */
export function installAnalyticsPrivacyGuards(ids: string[] = []) {
  if (typeof window === "undefined") return;
  ids.filter(Boolean).forEach((id) => googleIds.add(id));
  setRoutePrivacy(window.location.href);
  // Re-wrap if an SDK installed its own wrapper after loading. The privacy
  // boundary must run before a vendor can inspect the destination argument.
  for (const method of ["pushState", "replaceState"] as const) {
    if (guardedHistory.has(window.history[method])) continue;
    const original = window.history[method].bind(window.history);
    const wrapper = function (data: unknown, unused: string, url?: string | URL | null) {
      if (url != null) {
        let destination: URL | null = null;
        try { destination = new URL(String(url), window.location.href); } catch { /* native history handles invalid URLs */ }
        if (destination) {
          if (destination.origin !== window.location.origin) return original(data, unused, url);
          setRoutePrivacy(destination.href);
          if (wasPublicDocument && !isPublicAnalyticsUrl(destination.href) && isPublicAnalyticsUrl(window.location.href)) {
            // SDKs cannot be fully unloaded during an SPA transition. Cross
            // this privacy boundary with a new document that loads no SDKs.
            window.location.assign(destination.href);
            return;
          }
        }
      }
      return original(data, unused, url);
    };
    guardedHistory.add(wrapper);
    window.history[method] = wrapper;
  }
  if (!installed) {
    installed = true;
    const onHistory = (event: Event) => {
      setRoutePrivacy(window.location.href);
      if (wasPublicDocument && !isPublicAnalyticsUrl(window.location.href)) {
        event.stopImmediatePropagation();
        window.location.replace(window.location.href);
      }
    };
    window.addEventListener("popstate", onHistory, { capture: true });
    window.addEventListener("hashchange", onHistory, { capture: true });
  }
  guardTrackingGlobals();
}

export function initializeMarketingAnalytics(metaPixelId: string, googleAdsId: string, ga4Id: string) {
  installAnalyticsPrivacyGuards([googleAdsId, ga4Id]);
  if (!analyticsAllowedNow()) return;

  if (metaPixelId && !document.getElementById("lfp-meta-runtime")) {
    const queue = function (...args: unknown[]) {
      if (queue.callMethod) queue.callMethod(...args);
      else queue.queue!.push(args);
    } as TrackingFunction;
    queue.queue = []; queue.push = queue; queue.loaded = true; queue.version = "2.0";
    window.fbq = queue;
    guardTrackingGlobals();
    window.fbq?.("set", "autoConfig", false, metaPixelId);
    window.fbq?.("init", metaPixelId);
    const script = document.createElement("script");
    script.id = "lfp-meta-runtime"; script.async = true;
    script.src = "https://connect.facebook.net/en_US/fbevents.js";
    script.referrerPolicy = "no-referrer";
    script.onload = () => { installAnalyticsPrivacyGuards([googleAdsId, ga4Id]); };
    document.head.appendChild(script);
  }

  const googleId = googleAdsId || ga4Id;
  if (googleId && !document.getElementById("lfp-google-runtime")) {
    window.dataLayer = window.dataLayer || [];
    window.gtag = function () { window.dataLayer!.push(arguments); };
    guardTrackingGlobals();
    window.gtag("js", new Date());
    if (googleAdsId) window.gtag("config", googleAdsId, { send_page_view: false });
    if (ga4Id) window.gtag("config", ga4Id, { send_page_view: false });
    const script = document.createElement("script");
    script.id = "lfp-google-runtime"; script.async = true;
    script.src = `https://www.googletagmanager.com/gtag/js?id=${encodeURIComponent(googleId)}`;
    script.referrerPolicy = "no-referrer";
    script.onload = () => { installAnalyticsPrivacyGuards([googleAdsId, ga4Id]); };
    document.head.appendChild(script);
  }
}
