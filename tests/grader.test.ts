import { describe, it } from "node:test";
import assert from "node:assert/strict";
import {
  normalizeGradeUrl,
  isPrivateAddress,
  analyzeHtml,
  searchReadinessScore,
  leadReadinessScore,
  overallScore,
  letterFor,
  parsePagespeed,
} from "../lib/analytics/grader.ts";

describe("normalizeGradeUrl", () => {
  it("accepts bare domains and adds https", () => {
    const r = normalizeGradeUrl("example.com/page?q=1#top");
    assert.equal(r.error, undefined);
    assert.equal(r.host, "example.com");
    assert.equal(r.url, "https://example.com/page"); // query + hash stripped
  });

  it("refuses non-http schemes, credentials, and IP literals", () => {
    assert.ok(normalizeGradeUrl("ftp://example.com").error);
    assert.ok(normalizeGradeUrl("javascript:alert(1)").error);
    assert.ok(normalizeGradeUrl("https://user:pass@example.com").error);
    assert.ok(normalizeGradeUrl("http://192.168.1.1").error);
    assert.ok(normalizeGradeUrl("http://127.0.0.1:8080").error);
  });

  it("refuses local and internal hostnames", () => {
    assert.ok(normalizeGradeUrl("localhost").error);
    assert.ok(normalizeGradeUrl("http://foo.local").error);
    assert.ok(normalizeGradeUrl("db.internal").error);
    assert.ok(normalizeGradeUrl("nodots").error);
    assert.ok(normalizeGradeUrl("").error);
  });
});

describe("isPrivateAddress", () => {
  it("flags private and loopback ranges", () => {
    for (const addr of ["10.0.0.5", "172.16.0.1", "172.31.255.255", "192.168.0.1",
      "127.0.0.1", "169.254.10.10", "100.64.0.1", "0.0.0.0", "::1", "fc00::1", "fe80::1"]) {
      assert.equal(isPrivateAddress(addr), true, addr);
    }
  });

  it("passes public addresses", () => {
    for (const addr of ["8.8.8.8", "76.76.21.21", "172.15.0.1", "172.32.0.1", "2606:4700::1111"]) {
      assert.equal(isPrivateAddress(addr), false, addr);
    }
  });
});

describe("analyzeHtml", () => {
  const GOOD = `
    <html><head>
      <title>Roofing Company in Longview TX</title>
      <meta name="description" content="We repair and replace roofs across East Texas with free inspections.">
      <link rel="canonical" href="https://example.com/">
      <meta name="viewport" content="width=device-width">
      <meta property="og:title" content="Roofing">
      <script type="application/ld+json">{}</script>
      <script src="https://www.googletagmanager.com/gtag/js"></script>
    </head><body>
      <a href="tel:+19035551234">Call now</a>
      <form><input name="email_address"></form>
      <a class="btn">Get a Quote</a>
    </body></html>`;

  it("detects everything on a well-built page", () => {
    const c = analyzeHtml(GOOD, true);
    assert.equal(c.title, true);
    assert.equal(c.meta_description, true);
    assert.equal(c.canonical, true);
    assert.equal(c.viewport, true);
    assert.equal(c.og_tags, true);
    assert.equal(c.json_ld, true);
    assert.equal(c.has_form, true);
    assert.equal(c.has_tel_or_sms, true);
    assert.equal(c.has_analytics, true);
    assert.equal(c.has_cta, true);
  });

  it("finds nothing on an empty brochure page", () => {
    const c = analyzeHtml("<html><head><title>Hi</title></head><body>Welcome.</body></html>", false);
    assert.equal(c.title, false); // under 3 chars of real title content? "Hi" is 2
    assert.equal(c.meta_description, false);
    assert.equal(c.has_form, false);
    assert.equal(c.has_tel_or_sms, false);
    assert.equal(c.has_cta, false);
    assert.equal(c.https, false);
  });
});

describe("readiness scores", () => {
  it("sums to 100 when everything passes", () => {
    const all = {
      https: true, title: true, meta_description: true, canonical: true,
      viewport: true, og_tags: true, json_ld: true, robots_txt: true,
      sitemap: true, has_form: true, has_tel_or_sms: true,
      has_analytics: true, has_cta: true,
    };
    assert.equal(searchReadinessScore(all), 100);
    assert.equal(leadReadinessScore(all), 100);
  });

  it("is zero when nothing passes", () => {
    const none = {
      https: false, title: false, meta_description: false, canonical: false,
      viewport: false, og_tags: false, json_ld: false, robots_txt: false,
      sitemap: false, has_form: false, has_tel_or_sms: false,
      has_analytics: false, has_cta: false,
    };
    assert.equal(searchReadinessScore(none), 0);
    assert.equal(leadReadinessScore(none), 0);
  });
});

describe("overall grade", () => {
  it("computes a letter from full measurements", () => {
    const { overall, letter } = overallScore({
      performance: 90, seo: 92, accessibility: 88, best_practices: 96,
      lcp_s: 2.1, search_readiness: 95, lead_readiness: 100,
    });
    assert.ok(overall != null && overall >= 90, String(overall));
    assert.equal(letter, "A");
  });

  it("renormalizes when Lighthouse was unavailable instead of padding", () => {
    const { overall, letter } = overallScore({
      performance: null, seo: null, accessibility: null, best_practices: null,
      lcp_s: null, search_readiness: 80, lead_readiness: 80,
    });
    assert.equal(overall, 80); // (80*.2 + 80*.25) / .45
    assert.equal(letter, "B");
  });

  it("refuses to grade when almost nothing was measured", () => {
    const { overall, letter } = overallScore({
      performance: null, seo: null, accessibility: null, best_practices: null,
      lcp_s: null, search_readiness: 50, lead_readiness: null as unknown as number,
    });
    assert.equal(overall, null);
    assert.equal(letter, null);
  });

  it("letter bands", () => {
    assert.equal(letterFor(95), "A");
    assert.equal(letterFor(80), "B");
    assert.equal(letterFor(70), "C");
    assert.equal(letterFor(60), "D");
    assert.equal(letterFor(59), "F");
  });
});

describe("parsePagespeed", () => {
  it("extracts category scores and LCP seconds", () => {
    const parsed = parsePagespeed({
      lighthouseResult: {
        categories: {
          performance: { score: 0.87 },
          seo: { score: 1 },
          accessibility: { score: 0.905 },
          "best-practices": { score: 0.75 },
        },
        audits: { "largest-contentful-paint": { numericValue: 2340 } },
      },
    });
    assert.equal(parsed.performance, 87);
    assert.equal(parsed.seo, 100);
    assert.equal(parsed.accessibility, 91);
    assert.equal(parsed.best_practices, 75);
    assert.equal(parsed.lcp_s, 2.3);
  });

  it("returns nulls for a malformed response", () => {
    const parsed = parsePagespeed({});
    assert.equal(parsed.performance, null);
    assert.equal(parsed.lcp_s, null);
  });
});
