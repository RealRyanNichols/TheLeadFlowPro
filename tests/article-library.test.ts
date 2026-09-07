import test from "node:test";
import assert from "node:assert/strict";
import { getPublishedArticles } from "../lib/articles.ts";
import {
  articleLibraryEntry,
  filterArticleEntries,
  normalizeArticleQuery,
} from "../app/articles/article-library.ts";

test("article search tolerates case, accents, and separators", () => {
  assert.equal(normalizeArticleQuery("  Café / QR-CODES  "), "cafe qr codes");
  const entry = articleLibraryEntry({ slug: "follow-up", title: "Missed-call follow-up", description: "Write a useful reply." });
  assert.deepEqual(filterArticleEntries([entry], "MISSED call", "all"), [entry]);
  assert.equal(filterArticleEntries([entry], "missed invoice", "all").length, 0);
});

test("search and topic narrow together while clearing restores every guide", () => {
  const entries = getPublishedArticles().map(articleLibraryEntry);
  const matched = filterArticleEntries(entries, "qr", "website");
  assert.ok(matched.length > 0 && matched.length < entries.length);
  assert.ok(matched.every((entry) => entry.topics.includes("website")));
  assert.equal(filterArticleEntries(entries, "no-such-guide-qzxw", "money").length, 0);
  assert.equal(filterArticleEntries(entries, "", "all").length, entries.length);
  assert.equal(new Set(entries.map((entry) => entry.slug)).size, entries.length);
});

test("the search index includes tool labels but excludes full article content", () => {
  const article = {
    slug: "review-your-bills", title: "Review your bills", description: "Find what changed.",
    tool: { slug: "subscription-audit", heading: "Check each renewal" },
    body: "This full article body must remain on the article page.",
  };
  const entry = articleLibraryEntry(article);
  assert.deepEqual(Object.keys(entry).sort(), ["searchText", "slug", "topics"]);
  assert.equal(filterArticleEntries([entry], "subscription renewal", "time").length, 1);
  assert.ok(!JSON.stringify(entry).includes(article.body));
});

test("admin work is not categorized as advertising by a prefix accident", () => {
  const entry = articleLibraryEntry({ slug: "admin-time", title: "Reduce admin time", description: "Review a weekly task." });
  assert.ok(entry.topics.includes("time"));
  assert.ok(!entry.topics.includes("leads"));
});
