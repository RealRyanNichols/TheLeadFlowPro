// The drafting queue stays honest or the drafting session inherits a broken
// brief. Every entry must point at a real tool with an existing 1200x630 OG
// card, use a slug no published article has, and use each tool only once,
// because the tool's card becomes the article's scene and article scenes must
// be distinct.

import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import path from "node:path";
import sharp from "sharp";
import { ARTICLES } from "../lib/articles.ts";
import { getTool } from "../lib/tools/index.ts";
import { TOOL_VISUALS } from "../lib/tools/visuals.ts";

type QueueEntry = {
  slug: string;
  trade: string;
  industry: string;
  tool: string;
  searchQuestion: string;
  workingTitle: string;
  status: string;
};

async function loadQueue(): Promise<QueueEntry[]> {
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
      ["queued", "drafted", "published"].includes(entry.status),
      `${entry.slug} has unknown status "${entry.status}"`,
    );
  }
});

test("queue slugs are unique and free of collisions with published articles", async () => {
  const queue = await loadQueue();
  const seen = new Set<string>();
  const published = new Set(ARTICLES.map((article) => article.slug));
  for (const entry of queue) {
    assert.equal(seen.has(entry.slug), false, `duplicate queue slug ${entry.slug}`);
    seen.add(entry.slug);
    if (entry.status !== "published") {
      assert.equal(
        published.has(entry.slug),
        false,
        `queue entry ${entry.slug} collides with a published article but is not marked published`,
      );
    }
  }
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
