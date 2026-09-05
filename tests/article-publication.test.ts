import assert from "node:assert/strict";
import test from "node:test";
import {
  ARTICLES,
  getArticle,
  getPublishedArticles,
  getRelatedArticles,
} from "../lib/articles";
import { ARTICLE_PUBLICATION_DATES } from "../lib/articles-schedule";
import {
  centralPublicationDate,
  isArticlePublished,
  isPublicationDate,
  isUnpublishedArticlePath,
} from "../lib/article-publication";

const beforeMidnight = new Date("2026-09-05T04:59:59.999Z");
const atMidnight = new Date("2026-09-05T05:00:00.000Z");
const nextSlug = "give-every-inquiry-an-owner-and-next-step";

test("publication dates use Longview midnight, including daylight and standard time", () => {
  assert.equal(centralPublicationDate(beforeMidnight), "2026-09-04");
  assert.equal(centralPublicationDate(atMidnight), "2026-09-05");
  assert.equal(
    centralPublicationDate(new Date("2026-12-05T05:59:59.999Z")),
    "2026-12-04",
  );
  assert.equal(
    centralPublicationDate(new Date("2026-12-05T06:00:00.000Z")),
    "2026-12-05",
  );
  assert.equal(
    centralPublicationDate(new Date("2026-11-01T06:59:59Z")),
    "2026-11-01",
  );
  assert.equal(
    centralPublicationDate(new Date("2026-11-01T07:00:00Z")),
    "2026-11-01",
  );
});

test("invalid and normalized-overflow dates fail closed", () => {
  for (const value of [
    "",
    "2026-9-05",
    "2026-02-30",
    "2026-13-01",
    "bad",
    "2026-09-05T00:00:00Z",
  ]) {
    assert.equal(isPublicationDate(value), false, value);
    assert.equal(
      isArticlePublished({ publishedAt: value }, atMidnight),
      false,
      value,
    );
  }
  assert.equal(isPublicationDate("2028-02-29"), true);
});

test("public lookup and listing open a scheduled article at Central midnight", () => {
  assert.equal(getArticle(nextSlug, beforeMidnight), undefined);
  assert.ok(
    !getPublishedArticles(beforeMidnight).some(
      (article) => article.slug === nextSlug,
    ),
  );
  assert.equal(getArticle(nextSlug, atMidnight)?.slug, nextSlug);
  assert.ok(
    getPublishedArticles(atMidnight).some(
      (article) => article.slug === nextSlug,
    ),
  );
  assert.equal(
    getArticle("article-that-does-not-exist", atMidnight),
    undefined,
  );
  assert.equal(
    getArticle("bring-one-real-task-to-your-business-workshop", atMidnight),
    undefined,
  );
});

test("related article recommendations exclude future dates and the current article", () => {
  const related = getRelatedArticles(
    "one-useful-business-task-with-ai",
    100,
    beforeMidnight,
  );
  assert.ok(
    !related.some(
      (article) => article.slug === "one-useful-business-task-with-ai",
    ),
  );
  assert.ok(!related.some((article) => article.slug === nextSlug));
  assert.ok(related.every((article) => article.publishedAt <= "2026-09-04"));
  assert.equal(getRelatedArticles(nextSlug, 0, atMidnight).length, 0);
});

test("the small middleware manifest exactly matches the complete authored catalog", () => {
  assert.equal(
    new Set(ARTICLES.map((article) => article.slug)).size,
    ARTICLES.length,
  );
  assert.deepEqual(
    Object.entries(ARTICLE_PUBLICATION_DATES).sort(),
    ARTICLES.map((article) => [article.slug, article.publishedAt]).sort(),
  );
});

test("middleware blocks future detail and image URLs before streaming, then releases them", () => {
  for (const pathname of [
    `/articles/${nextSlug}`,
    `/articles/${nextSlug}/`,
    `/articles/${nextSlug}/opengraph-image`,
    `/articles/${nextSlug}/opengraph-image/`,
  ]) {
    assert.equal(
      isUnpublishedArticlePath(
        pathname,
        ARTICLE_PUBLICATION_DATES,
        beforeMidnight,
      ),
      true,
      pathname,
    );
    assert.equal(
      isUnpublishedArticlePath(pathname, ARTICLE_PUBLICATION_DATES, atMidnight),
      false,
      pathname,
    );
  }
  assert.equal(
    isUnpublishedArticlePath(
      `/articles/${nextSlug.replace("give", "%67ive")}`,
      ARTICLE_PUBLICATION_DATES,
      beforeMidnight,
    ),
    true,
  );
  for (const pathname of [
    "/articles",
    "/about",
    "/events",
    "/articles/missing",
    "/articles/%ZZ",
    "/articles/constructor",
  ]) {
    assert.equal(
      isUnpublishedArticlePath(
        pathname,
        ARTICLE_PUBLICATION_DATES,
        beforeMidnight,
      ),
      false,
      pathname,
    );
  }
});

test("publication checks do not mutate, filter, or memoize the full authored catalog", () => {
  const allSlugs = ARTICLES.map((article) => article.slug);
  const first = getPublishedArticles(beforeMidnight);
  first.pop();
  assert.deepEqual(
    ARTICLES.map((article) => article.slug),
    allSlugs,
  );
  assert.ok(
    getPublishedArticles(atMidnight).length >
      getPublishedArticles(beforeMidnight).length,
  );
  // The publishing buffer grows each day. Check after the latest authored
  // date, rather than assuming the original September 6 buffer is the end.
  const lastDate = ARTICLES.map((article) => article.publishedAt)
    .sort()
    .at(-1)!;
  assert.equal(
    getPublishedArticles(new Date(`${lastDate}T18:00:00Z`)).length,
    ARTICLES.length,
  );
});
