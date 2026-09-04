import { it } from "node:test";
import assert from "node:assert/strict";
import { pageView, track } from "../lib/analytics/client.ts";

it("old engagement timers and visibility listeners cannot send private page details", () => {
  const originals = new Map<string, PropertyDescriptor | undefined>();
  const listeners = new Map<string, () => void>();
  const intervals: Array<() => void> = [];
  const timers: Array<() => void> = [];
  let sends = 0;
  const values = new Map<string, string>();
  const storage = {
    getItem: (key: string) => values.get(key) ?? null,
    setItem: (key: string, value: string) => values.set(key, value),
  };
  const location = {
    href: "https://www.theleadflowpro.com/",
    pathname: "/",
    search: "",
  };
  const documentMock = {
    cookie: "",
    title: "Public page",
    referrer: "https://search.example/search?q=private-search",
    visibilityState: "visible",
    addEventListener: (name: string, cb: () => void) => listeners.set(name, cb),
  };
  const replacements = {
    window: {
      location,
      addEventListener: (name: string, cb: () => void) =>
        listeners.set(name, cb),
    },
    document: documentMock,
    sessionStorage: storage,
    localStorage: storage,
    navigator: {
      webdriver: false,
      sendBeacon: () => {
        sends++;
        return true;
      },
    },
    fetch: async () => {
      sends++;
      return new Response("{}", { status: 200 });
    },
    setInterval: (cb: () => void) => {
      intervals.push(cb);
      return intervals.length;
    },
    setTimeout: (cb: () => void) => {
      timers.push(cb);
      return timers.length;
    },
    clearTimeout: () => {},
  };
  for (const [name, value] of Object.entries(replacements)) {
    originals.set(name, Object.getOwnPropertyDescriptor(globalThis, name));
    Object.defineProperty(globalThis, name, {
      value,
      configurable: true,
      writable: true,
    });
  }
  try {
    pageView("/");
    assert.ok(intervals.length > 0);
    assert.ok(timers.length > 0);
    location.href =
      "https://www.theleadflowpro.com/events/workshop/confirmed?t=private-seat-token";
    location.pathname = "/events/workshop/confirmed";
    location.search = "?t=private-seat-token";
    documentMock.title = "Private attendee name and seat";
    intervals.forEach((fn) => fn());
    listeners.get("visibilitychange")?.();
    listeners.get("pagehide")?.();
    timers.forEach((fn) => fn());
    track("payment_complete", { label: "private" });
    pageView(location.pathname);
    assert.equal(sends, 0);
  } finally {
    for (const [name, descriptor] of originals) {
      if (descriptor) Object.defineProperty(globalThis, name, descriptor);
      else Reflect.deleteProperty(globalThis, name);
    }
  }
});
