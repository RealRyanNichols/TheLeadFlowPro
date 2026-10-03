import assert from "node:assert/strict";
import { describe, it } from "node:test";
import sitemap from "../app/sitemap.ts";
import { TOOLS } from "../lib/tools/index.ts";
import { PRO_TOOLS } from "../lib/tools/pro/index.ts";
import { PUBLISHED_COLLECTIONS } from "../lib/tools/collections.ts";
import { ARTICLES, getPublishedArticles } from "../lib/articles.ts";
import { PUBLIC_PAGE_CATALOG } from "../lib/publicPageCatalog.ts";
import { OPERATOR_ACADEMY_COURSES } from "../lib/operatorAcademyCatalog.ts";
import { courseJsonLd, courseOfferUrl } from "../lib/courseSeo.ts";

const BASE = "https://www.theleadflowpro.com";

describe("public indexing boundaries", () => {
  it("lists unique canonical public URLs and excludes private, retired and draft pages", () => {
    const entries = sitemap();
    const urls = entries.map((entry) => entry.url);
    assert.equal(urls.length, new Set(urls).size);
    for (const url of urls) {
      const parsed = new URL(url);
      assert.equal(parsed.origin, BASE);
      assert.equal(parsed.search, "");
      assert.equal(parsed.hash, "");
      assert.doesNotMatch(parsed.pathname, /^\/(?:api|admin|auth|account|sales|dashboard|hq|design-preview|factory|embed)(?:\/|$)/);
    }
    for (const page of PUBLIC_PAGE_CATALOG) {
      if ("index" in page && page.index === false) {
        assert(!urls.includes(`${BASE}${page.path}`), page.path);
      }
    }
    for (const alias of ["/book", "/go/time-back", "/go/lead-follow-up", "/packages", "/packages/launch", "/packages/system-map"]) {
      assert(!urls.includes(`${BASE}${alias}`), alias);
    }
    const published = new Set(getPublishedArticles().map((article) => article.slug));
    for (const article of ARTICLES) {
      assert.equal(urls.includes(`${BASE}/articles/${article.slug}`), published.has(article.slug), article.slug);
    }
    // A publication date is not evidence of the most recent significant edit.
    assert(entries.filter((entry) => entry.url.startsWith(`${BASE}/articles/`)).every((entry) => entry.lastModified === undefined));
  });

  it("exposes every published tool, kit and reviewed collection through the sitemap", () => {
    const urls = new Set(sitemap().map((entry) => entry.url));
    for (const tool of TOOLS) assert(urls.has(`${BASE}/tools/${tool.slug}`), tool.slug);
    for (const kit of PRO_TOOLS) assert(urls.has(`${BASE}/tools/pro/${kit.slug}`), kit.slug);
    for (const collection of PUBLISHED_COLLECTIONS) assert(urls.has(`${BASE}/tools/collections/${collection.slug}`), collection.slug);
  });
});

describe("course offer identity", () => {
  it("takes each schema price to the actual corresponding enrollment offer", () => {
    for (const course of OPERATOR_ACADEMY_COURSES) {
      const expected = course.isFree ? "/academy#free-access"
        : course.slug === "chatgpt-operator" ? "/chatgpt#enroll"
        : course.slug === "content-engine" ? "/operator-academy/content-engine#enroll"
        : "/academy#pricing";
      assert.equal(courseOfferUrl(course), BASE + expected, course.slug);
      assert.equal(courseJsonLd(course).offers[0].url, BASE + expected, course.slug);
    }
  });
});
