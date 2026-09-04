// The drafting queue stays honest or the drafting session inherits a broken
// brief. Every entry must point at a real tool with an existing 1200x630 OG
// card, keep queue state consistent with the authored catalog, and use each tool only once,
// because the tool's card becomes the article's scene and article scenes must
// be distinct.

import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import path from "node:path";
import sharp from "sharp";
import { ARTICLES } from "../lib/articles.ts";
import {
  ARTICLE_QUEUE_STATUSES,
  articleQueueCatalogIssues,
  nextArticlePublicationDate,
  type ArticleQueueEntry,
} from "../lib/article-queue.ts";
import { getTool } from "../lib/tools/index.ts";
import { TOOL_VISUALS } from "../lib/tools/visuals.ts";

async function loadQueue(): Promise<ArticleQueueEntry[]> {
  const raw = await readFile(path.join(process.cwd(), "content", "article-queue.json"), "utf8");
  return JSON.parse(raw).queue;
}

test("every queue entry is complete and carries a valid status", async () => {
  const queue = await loadQueue();
  assert.ok(queue.length > 0, "the queue should never be empty");
  for (const entry of queue) {
    for (const field of ["slug", "trade", "industry", "tool", "searchQuestion", "workingTitle"] as const) {
      assert.ok(entry[field]?.trim(), `${entry.slug || "(no slug)"} is missing ${field}`);
    }
    assert.ok(
      ARTICLE_QUEUE_STATUSES.includes(entry.status),
      `${entry.slug} has unknown status "${entry.status}"`,
    );
  }
});

test("queue slugs are unique and their status matches the authored catalog", async () => {
  const queue = await loadQueue();
  const seen = new Set<string>();
  for (const entry of queue) {
    assert.equal(seen.has(entry.slug), false, `duplicate queue slug ${entry.slug}`);
    seen.add(entry.slug);
    assert.deepEqual(articleQueueCatalogIssues(entry, ARTICLES), [], entry.slug);
  }
});

test("authored articles accept scheduled status without exposing future articles as published", () => {
  const articles = [{ slug: "next-task", publishedAt: "2026-09-05" }];
  const before = new Date("2026-09-05T04:59:59.999Z");
  const midnight = new Date("2026-09-05T05:00:00.000Z");
  for (const status of ["queued", "drafted"] as const) {
    assert.ok(articleQueueCatalogIssues({ slug: "next-task", status }, articles, before).length);
    assert.deepEqual(articleQueueCatalogIssues({ slug: "unwritten", status }, articles, before), []);
  }
  assert.deepEqual(articleQueueCatalogIssues({ slug: "next-task", status: "scheduled" }, articles, before), []);
  // A due article stays scheduled until its live publication is verified.
  assert.deepEqual(articleQueueCatalogIssues({ slug: "next-task", status: "scheduled" }, articles, midnight), []);
  assert.ok(articleQueueCatalogIssues({ slug: "next-task", status: "published" }, articles, before).length);
  assert.deepEqual(articleQueueCatalogIssues({ slug: "next-task", status: "published" }, articles, midnight), []);
  for (const status of ["scheduled", "published"] as const) {
    assert.ok(articleQueueCatalogIssues({ slug: "unwritten", status }, articles, midnight).length);
    assert.ok(articleQueueCatalogIssues({ slug: "next-task", status }, [{ slug: "next-task", publishedAt: "2026-02-30" }], midnight).length);
  }
  assert.ok(articleQueueCatalogIssues({ slug: "next-task", status: "unknown" as ArticleQueueEntry["status"] }, articles, midnight).length);
});

test("brief dates fill the first uncovered Central day without mutating the catalog", () => {
  const before = new Date("2026-09-05T04:59:59.999Z");
  assert.equal(nextArticlePublicationDate([], before), "2026-09-04");
  const articles = [{ publishedAt: "2026-09-04" }, { publishedAt: "2026-09-06" }];
  assert.equal(nextArticlePublicationDate(articles, before), "2026-09-05");
  assert.deepEqual(articles, [{ publishedAt: "2026-09-04" }, { publishedAt: "2026-09-06" }]);
  assert.equal(nextArticlePublicationDate([{ publishedAt: "2026-12-31" }], new Date("2027-01-01T05:59:59Z")), "2027-01-01");
  assert.equal(nextArticlePublicationDate([{ publishedAt: "2026-11-01" }], new Date("2026-11-01T06:59:59Z")), "2026-11-02");
  assert.equal(nextArticlePublicationDate([{ publishedAt: "2026-11-01" }], new Date("2026-11-01T07:00:00Z")), "2026-11-02");
});

test("every queue entry points at a real tool, used once, with 1200x630 art", async () => {
  const queue = await loadQueue();
  const toolsSeen = new Set<string>();
  for (const entry of queue) {
    const tool = getTool(entry.tool);
    assert.ok(tool, `${entry.slug} points at unknown tool "${entry.tool}"`);
    assert.equal(toolsSeen.has(entry.tool), false, `tool ${entry.tool} appears twice in the queue`);
    toolsSeen.add(entry.tool);

    const visuals = TOOL_VISUALS[entry.tool];
    assert.ok(visuals, `${entry.slug}: tool ${entry.tool} has no visuals entry`);

    const artFile = path.join(process.cwd(), "public", visuals.ogImage.replace(/^\//, ""));
    const metadata = await sharp(await readFile(artFile)).metadata();
    assert.equal(metadata.width, 1200, `${entry.slug}: scene ${visuals.ogImage} must be 1200 wide`);
    assert.equal(metadata.height, 630, `${entry.slug}: scene ${visuals.ogImage} must be 630 tall`);
  }
});

test("no queue text carries an em dash", async () => {
  const raw = await readFile(path.join(process.cwd(), "content", "article-queue.json"), "utf8");
  assert.equal(raw.includes("—"), false, "the queue must follow the same no-em-dash rule as the articles");
});
