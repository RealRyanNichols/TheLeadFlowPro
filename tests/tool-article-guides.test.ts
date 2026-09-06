import assert from "node:assert/strict";
import test from "node:test";
import { getPublishedArticles } from "../lib/articles.ts";
import { getToolArticleGuides } from "../lib/toolArticleGuides.ts";
import { TOOLS } from "../lib/tools/index.ts";

test("tool guides always come from an actual embedded tool or exact article link", () => {
  const now = new Date("2026-09-06T18:00:00Z");
  const published = getPublishedArticles(now);
  let linkedTools = 0;
  for (const tool of TOOLS) {
    const guides = getToolArticleGuides(tool.slug, now);
    if (guides.length) linkedTools += 1;
    assert.equal(
      new Set(guides.map((guide) => guide.slug)).size,
      guides.length,
    );
    for (const guide of guides) {
      const article = published.find((item) => item.slug === guide.slug)!;
      assert.ok(article);
      assert.ok(
        article.tool?.slug === tool.slug ||
          article.body.includes(`](/tools/${tool.slug})`) ||
          article.body.includes(`](/tools/${tool.slug}?`) ||
          article.body.includes(`](/tools/${tool.slug}#`),
      );
      assert.equal(guide.embedded, article.tool?.slug === tool.slug);
    }
  }
  assert.ok(linkedTools > 10);
});

test("tool discovery respects the publication gate and rejects slug injection or prefix matches", () => {
  const slug = "insurance-agent-lead-response";
  assert.ok(
    !getToolArticleGuides(
      "lead-response-time",
      new Date("2026-09-08T04:59:59Z"),
    ).some((guide) => guide.slug === slug),
  );
  assert.ok(
    getToolArticleGuides(
      "lead-response-time",
      new Date("2026-09-08T05:00:00Z"),
    ).some((guide) => guide.slug === slug),
  );
  for (const invalid of [
    ".*",
    "lead-response-time?email=private@example.com",
    "lead-response",
    "../admin",
    "",
  ])
    assert.deepEqual(getToolArticleGuides(invalid), []);
});
