import { describe, it } from "node:test";
import assert from "node:assert/strict";
import {
  filterVendorAnalyticsEvent,
  isPublicAnalyticsUrl,
  safeAnalyticsReferrer,
  safeAnalyticsUrl,
  thirdPartyAnalyticsAllowed,
} from "../lib/analytics/privacy.ts";
import {
  analyticsAllowedNow,
  installAnalyticsPrivacyGuards,
} from "../lib/analytics/browserPrivacy.ts";

describe("analytics URL privacy", () => {
  it("excludes local development and private network hosts from analytics", () => {
    for (const host of [
      "localhost:3000", "LOCALHOST.:3000", "workshop.localhost:3000", "macbook.local:3000",
      "127.0.0.1:3000", "127.1:3000", "0.0.0.0:3000", "10.0.0.5:3000",
      "172.16.0.1:3000", "172.31.255.254:3000", "192.168.1.2:3000", "169.254.1.2:3000",
      "100.64.0.1:3000", "[::1]:3000", "[::]:3000", "[fd00::1]:3000", "[fe80::1]:3000",
      "[::ffff:127.0.0.1]:3000",
    ]) {
      const url = `http://${host}/pricing`;
      assert.equal(isPublicAnalyticsUrl(url), false, url);
      assert.equal(thirdPartyAnalyticsAllowed(url), false, url);
      assert.equal(safeAnalyticsUrl(url), undefined, url);
    }
    assert.equal(isPublicAnalyticsUrl("https://www.theleadflowpro.com/pricing"), true);
    assert.equal(isPublicAnalyticsUrl("/pricing"), true);
  });
  it("excludes private routes and credentials even on otherwise public paths", () => {
    for (const value of [
      "/events/workshop/confirmed",
      "/events/workshop/confirmed?t=private-seat-token",
      "/events/workshop/%63onfirmed",
      "/admin",
      "/dashboard/project",
      "/login",
      "/training/chatgpt-operator",
      "/tools?session_id=cs_live_private",
      "/?registration_token=private",
      "/?payment_intent_client_secret=private",
      "/?email=person@example.test",
      "/#access_token=private",
      "/auth/callback?code=private",
      "https://user:password@example.test/",
      "javascript:alert(1)",
    ])
      assert.equal(isPublicAnalyticsUrl(value), false, value);
    for (const value of [
      "/",
      "/events/workshop#reserve",
      "/tools?utm_source=facebook",
      "/articles/a-useful-article",
    ]) {
      assert.equal(isPublicAnalyticsUrl(value), true, value);
    }
  });
  it("removes query and hash from outbound URL and referrer fields", () => {
    assert.equal(
      safeAnalyticsUrl(
        "https://www.theleadflowpro.com/tools?utm_source=ad#calculator",
      ),
      "https://www.theleadflowpro.com/tools",
    );
    assert.equal(
      safeAnalyticsReferrer("https://search.example/results?q=business#top"),
      "https://search.example/results",
    );
    assert.equal(
      safeAnalyticsReferrer(
        "https://www.theleadflowpro.com/events/workshop/confirmed?t=private",
      ),
      undefined,
    );
    assert.equal(safeAnalyticsReferrer(""), undefined);
  });
  it("filters SDK events after navigation and withholds an SDK with an unsanitizable referrer", () => {
    const event = {
      type: "pageview",
      url: "https://www.theleadflowpro.com/tools?utm_source=ad#top",
    };
    assert.equal(
      filterVendorAnalyticsEvent(
        event,
        "https://www.theleadflowpro.com/events/workshop/confirmed?t=private",
      ),
      null,
    );
    assert.equal(
      filterVendorAnalyticsEvent({ ...event, url: "/?token=private" }, "/"),
      null,
    );
    assert.equal(
      thirdPartyAnalyticsAllowed("/", "https://search.example/?query=value"),
      false,
    );
    assert.equal(
      thirdPartyAnalyticsAllowed("/", "https://search.example/results"),
      true,
    );
    assert.deepEqual(filterVendorAnalyticsEvent(event, "/tools"), {
      ...event,
      url: "https://www.theleadflowpro.com/tools",
    });
  });
});

it("disables already-loaded vendors before they can observe a private history destination", () => {
  const originals = new Map<string, PropertyDescriptor | undefined>();
  const metaCalls: unknown[][] = [];
  const googleCalls: unknown[][] = [];
  const assigned: string[] = [];
  let nativeHistoryCalls = 0;
  let vendorHistoryCalls = 0;
  const current = new URL(
    "https://www.theleadflowpro.com/tools?utm_source=ad#top",
  );
  const fakeWindow = {
    location: {
      href: current.href,
      origin: current.origin,
      assign: (url: string) => assigned.push(url),
      replace: (url: string) => assigned.push(url),
    },
    history: {
      pushState: (
        _data: unknown,
        _title: string,
        _url?: string | URL | null,
      ) => {
        nativeHistoryCalls++;
      },
      replaceState: (
        _data: unknown,
        _title: string,
        _url?: string | URL | null,
      ) => {
        nativeHistoryCalls++;
      },
    },
    addEventListener: () => {},
    fbq: (...args: unknown[]) => {
      metaCalls.push(args);
    },
    gtag: (...args: unknown[]) => {
      googleCalls.push(args);
    },
  };
  for (const [name, value] of Object.entries({
    window: fakeWindow,
    document: { referrer: "https://search.example/results" },
  })) {
    originals.set(name, Object.getOwnPropertyDescriptor(globalThis, name));
    Object.defineProperty(globalThis, name, {
      value,
      configurable: true,
      writable: true,
    });
  }
  try {
    installAnalyticsPrivacyGuards(["G-TEST"]);
    assert.equal(analyticsAllowedNow(), true);
    fakeWindow.gtag("event", "page_view", {
      page_location: "should-be-replaced",
    });
    assert.deepEqual(googleCalls[0][2], {
      page_location: "https://www.theleadflowpro.com/tools",
      page_referrer: "https://search.example/results",
    });
    const earlier = fakeWindow.history.pushState;
    fakeWindow.history.pushState = (...args) => {
      vendorHistoryCalls++;
      return earlier(...args);
    };
    installAnalyticsPrivacyGuards(["G-TEST"]);
    fakeWindow.history.pushState(
      {},
      "",
      "/events/workshop/confirmed?t=private-seat-token",
    );
    assert.equal(nativeHistoryCalls, 0);
    assert.equal(vendorHistoryCalls, 0);
    assert.deepEqual(assigned, [
      "https://www.theleadflowpro.com/events/workshop/confirmed?t=private-seat-token",
    ]);
    assert.equal(
      (fakeWindow as unknown as Record<string, unknown>)["ga-disable-G-TEST"],
      true,
    );
    assert.ok(
      metaCalls.some((call) => call[0] === "consent" && call[1] === "revoke"),
    );
    const metaBefore = metaCalls.length;
    const googleBefore = googleCalls.length;
    fakeWindow.fbq("track", "Purchase");
    fakeWindow.gtag("event", "conversion");
    assert.equal(metaCalls.length, metaBefore);
    assert.equal(googleCalls.length, googleBefore);
    assert.equal(analyticsAllowedNow(), false);
  } finally {
    for (const [name, descriptor] of originals) {
      if (descriptor) Object.defineProperty(globalThis, name, descriptor);
      else Reflect.deleteProperty(globalThis, name);
    }
  }
});
