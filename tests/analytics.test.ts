import { describe, it } from "node:test";
import assert from "node:assert/strict";
import {
  validateEvent,
  sanitizeMeta,
  classifySourceFamily,
  trend,
  positionTrend,
  publicFeedSentence,
  publicPageLabel,
  isBotUserAgent,
  deviceFromUserAgent,
  browserFromUserAgent,
  referrerHostOf,
  relativeTime,
  compactNumber,
} from "../lib/analytics/shared.ts";

describe("validateEvent", () => {
  it("accepts a canonical event and normalizes fields", () => {
    const e = validateEvent({
      event_name: "cta_click",
      path: "/pricing?utm_source=facebook#top",
      label: "map_my_company",
      visitor_id: "abc123",
      session_id: "s1",
      visitor_type: "new",
      meta: { placement: "hero" },
    });
    assert.ok(e);
    assert.equal(e!.event_name, "cta_click");
    assert.equal(e!.path, "/pricing"); // query + hash stripped
    assert.equal(e!.visitor_type, "new");
    assert.deepEqual(e!.meta, { placement: "hero" });
  });

  it("rejects unknown event names", () => {
    assert.equal(validateEvent({ event_name: "drop table" }), null);
    assert.equal(validateEvent({ event_name: "made_up_event" }), null);
    assert.equal(validateEvent({ event_name: "PAGE_VIEW" }), null);
    assert.equal(validateEvent(null), null);
    assert.equal(validateEvent("page_view"), null);
  });

  it("drops events whose path looks sensitive", () => {
    assert.equal(
      validateEvent({ event_name: "page_view", path: "/reset-password" }),
      null
    );
    assert.equal(
      validateEvent({ event_name: "page_view", path: "/verify-email-address" }),
      null
    );
  });

  it("coerces bad visitor_type and bad paths", () => {
    const e = validateEvent({ event_name: "page_view", path: "javascript:x", visitor_type: "admin" });
    assert.ok(e);
    assert.equal(e!.path, "/");
    assert.equal(e!.visitor_type, undefined);
  });

  it("rejects legacy client private routes and credentials before stripping or truncating", () => {
    for (const path of [
      "/events/workshop/confirmed", "/events/workshop/%63onfirmed?t=secret",
      "/admin/leads", "/training/course/lesson", "/pricing?token=secret",
      `/pricing?campaign=${"x".repeat(400)}&session_id=secret`, "/#access_token=secret",
    ]) assert.equal(validateEvent({ event_name: "page_view", path, page_title: "Private attendee" }), null, path);
  });

  it("sanitizes legacy referrers at the server boundary", () => {
    const event = { event_name: "page_view", path: "/pricing" };
    assert.equal(validateEvent({ ...event, referrer: "https://search.example/results?q=private#fragment" })!.referrer, "https://search.example/results");
    assert.equal(validateEvent({ ...event, referrer: "https://www.theleadflowpro.com/events/workshop/confirmed?t=secret" })!.referrer, undefined);
    assert.equal(validateEvent({ ...event, referrer: "https://user:password@example.test/" })!.referrer, undefined);
  });

  it("keeps only well-formed client ids", () => {
    const good = validateEvent({
      event_name: "page_view",
      client_id: "123e4567-e89b-42d3-a456-426614174000",
    });
    assert.equal(good!.client_id, "123e4567-e89b-42d3-a456-426614174000");
    const bad = validateEvent({ event_name: "page_view", client_id: "x'; --" });
    assert.equal(bad!.client_id, undefined);
  });
});

describe("sanitizeMeta", () => {
  it("drops identity-shaped keys, even nested in names", () => {
    const out = sanitizeMeta({
      email: "a@b.com",
      user_email: "a@b.com",
      phone: "555",
      seconds: 12,
      depth: 50,
    });
    assert.deepEqual(out, { seconds: 12, depth: 50 });
  });

  it("drops values that look like contact details on allowed keys", () => {
    const out = sanitizeMeta({
      placement: "hero@header", // @ = email-shaped, dropped
      note2: "903-500-8898 call me", // phone-shaped, dropped
      ok: "plain label",
    });
    assert.deepEqual(out, { ok: "plain label" });
  });

  it("truncates long strings and ignores non-scalars", () => {
    const out = sanitizeMeta({ label: "x".repeat(500), nested: { a: 1 }, fn: (() => 1) as unknown });
    assert.equal((out.label as string).length, 120);
    assert.equal("nested" in out, false);
  });
});

describe("classifySourceFamily", () => {
  it("classifies referrer hosts", () => {
    assert.equal(classifySourceFamily(null, null, "www.google.com"), "google");
    assert.equal(classifySourceFamily(null, null, "duckduckgo.com"), "search_other");
    assert.equal(classifySourceFamily(null, null, "m.facebook.com"), "facebook");
    assert.equal(classifySourceFamily(null, null, "t.co"), "x");
    assert.equal(classifySourceFamily(null, null, "some-blog.com"), "referral");
    assert.equal(classifySourceFamily(null, null, null), "direct");
    assert.equal(classifySourceFamily(null, null, "www.theleadflowpro.com"), "internal");
  });

  it("prefers paid medium, then utm source", () => {
    assert.equal(classifySourceFamily("facebook", "cpc", null), "paid");
    assert.equal(classifySourceFamily("facebook", "social", null), "facebook");
    assert.equal(classifySourceFamily("newsletter", "email", null), "email");
    assert.equal(classifySourceFamily("partner-site", null, null), "campaign");
  });
});

describe("trend direction semantics", () => {
  it("more conversions is positive", () => {
    const t = trend(12, 8, "up_good");
    assert.equal(t.tone, "positive");
    assert.equal(t.arrow, "up");
    assert.equal(t.diff, 4);
  });

  it("higher abandonment is negative when down is good", () => {
    const t = trend(0.6, 0.4, "down_good");
    assert.equal(t.tone, "negative");
    assert.equal(t.arrow, "up");
  });

  it("lower load-time style metrics are positive when down is good", () => {
    const t = trend(1.2, 2.4, "down_good");
    assert.equal(t.tone, "positive");
    assert.equal(t.arrow, "down");
  });

  it("neutral direction never assigns tone", () => {
    assert.equal(trend(10, 5, "neutral").tone, "neutral");
  });

  it("handles a zero previous period without dividing by zero", () => {
    const t = trend(5, 0, "up_good");
    assert.equal(t.pct, null);
    assert.equal(t.tone, "positive");
  });
});

describe("Google position direction", () => {
  it("position 12 → 7 is an improvement even though the number fell", () => {
    const t = positionTrend(7, 12);
    assert.ok(t);
    assert.equal(t!.tone, "positive");
    assert.equal(t!.arrow, "down");
    assert.equal(t!.diff, -5);
  });

  it("position 3 → 8 is a decline even though the number rose", () => {
    const t = positionTrend(8, 3);
    assert.equal(t!.tone, "negative");
    assert.equal(t!.arrow, "up");
  });

  it("returns null instead of guessing when either side is missing", () => {
    assert.equal(positionTrend(null, 5), null);
    assert.equal(positionTrend(5, undefined), null);
    assert.equal(positionTrend(NaN, 5), null);
  });
});

describe("public feed sanitization", () => {
  it("names only allowlisted page groups", () => {
    assert.equal(publicPageLabel("/tools/roi-calculator"), "a free business tool");
    assert.equal(publicPageLabel("/free-build"), "the Free Build offer");
    assert.equal(publicPageLabel("/admin/leads"), "the site"); // never named
    assert.equal(publicPageLabel("/dashboard/x"), "the site");
    assert.equal(publicPageLabel(null), "the site");
  });

  it("produces sentences with zero identifying detail", () => {
    const s = publicFeedSentence({
      at: "2026-08-13T10:00:00Z",
      kind: "form_start",
      path: "/free-build",
      device: "mobile",
      source: "google",
    });
    assert.equal(s, "A visitor started a contact form");
    assert.ok(!/mobile|google/.test(s));
  });

  it("names the arrival source only for known families", () => {
    assert.equal(
      publicFeedSentence({ at: "", kind: "session_start", source: "google" }),
      "A visitor arrived from Google"
    );
    assert.equal(
      publicFeedSentence({ at: "", kind: "session_start", source: "weird_thing" }),
      "A new visitor arrived"
    );
  });
});

describe("user-agent handling", () => {
  it("filters bots and empty agents", () => {
    assert.equal(isBotUserAgent("Mozilla/5.0 (compatible; Googlebot/2.1)"), true);
    assert.equal(isBotUserAgent("curl/8.0"), true);
    assert.equal(isBotUserAgent(""), true);
    assert.equal(isBotUserAgent(null), true);
    assert.equal(
      isBotUserAgent(
        "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/126.0 Safari/537.36"
      ),
      false
    );
  });

  it("classifies device and browser", () => {
    const iphone =
      "Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.0 Mobile/15E148 Safari/604.1";
    assert.equal(deviceFromUserAgent(iphone), "mobile");
    assert.equal(browserFromUserAgent(iphone), "safari");
    const ipad = "Mozilla/5.0 (iPad; CPU OS 16_0 like Mac OS X) AppleWebKit/605.1.15";
    assert.equal(deviceFromUserAgent(ipad), "tablet");
    const edge = "Mozilla/5.0 (Windows NT 10.0) AppleWebKit/537.36 Chrome/126.0 Safari/537.36 Edg/126.0";
    assert.equal(browserFromUserAgent(edge), "edge");
  });
});

describe("formatting helpers", () => {
  it("referrerHostOf parses hosts and rejects junk", () => {
    assert.equal(referrerHostOf("https://WWW.Google.com/search?q=x"), "www.google.com");
    assert.equal(referrerHostOf("not a url"), null);
    assert.equal(referrerHostOf(null), null);
  });

  it("relativeTime buckets sensibly", () => {
    const now = new Date("2026-08-13T12:00:00Z");
    assert.equal(relativeTime("2026-08-13T11:59:18Z", now), "42s ago");
    assert.equal(relativeTime("2026-08-13T11:53:00Z", now), "7m ago");
    assert.equal(relativeTime("2026-08-13T09:00:00Z", now), "3h ago");
  });

  it("compactNumber", () => {
    assert.equal(compactNumber(12), "12");
    assert.equal(compactNumber(1234), "1.2K");
    assert.equal(compactNumber(30500), "30.5K");
    assert.equal(compactNumber(null), "—");
  });
});
