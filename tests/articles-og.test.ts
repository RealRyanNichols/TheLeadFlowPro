import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import { readFile } from "node:fs/promises";
import path from "node:path";
import test from "node:test";
import sharp from "sharp";
import { ARTICLES } from "../lib/articles";

const ogSourcePath = path.join(process.cwd(), "lib", "articles-og.tsx");

async function articleOgSource() {
  return readFile(ogSourcePath, "utf8");
}

function sourceBlock(source: string, name: string, terminator: string) {
  const start = source.indexOf(`const ${name}`);
  assert.notEqual(start, -1, `${name} is missing from the article OG system`);
  const end = source.indexOf(terminator, start);
  assert.notEqual(end, -1, `${name} is not closed correctly`);
  return source.slice(start, end);
}

function stringRecord(source: string, name: string) {
  const block = sourceBlock(source, name, "};");
  return Object.fromEntries(
    [...block.matchAll(/"([^"]+)":\s*"([^"]+)"/g)].map((match) => [match[1], match[2]]),
  );
}

async function articleOgData() {
  const source = await articleOgSource();
  const v4Block = sourceBlock(source, "V4_ARTICLE_SLUGS", "] as const");
  const v4Slugs = new Set([...v4Block.matchAll(/"([^"]+)"/g)].map((match) => match[1]));
  const v3Art = stringRecord(source, "PREMIUM_ARTICLE_ART");
  return {
    pathFor(slug: string) {
      return v4Slugs.has(slug) ? `/images/articles-v4/${slug}.jpg` : v3Art[slug] ?? null;
    },
    headlines: stringRecord(source, "VISUAL_HEADLINES"),
    alt: stringRecord(source, "PREMIUM_ARTICLE_ALT"),
  };
}

// These two follow-on field notes intentionally reuse their subject's existing
// illustration. Keep the exception explicit; arbitrary duplicate art still fails.
const INTENTIONAL_SCENE_REUSE: Record<string, string> = {
  "one-useful-business-task-with-ai": "ai-website-small-business-2026",
  "give-every-inquiry-an-owner-and-next-step": "does-my-business-need-a-crm",
};

test("every article has a 1200 by 630 editorial scene with deliberate reuse documented", async () => {
  const data = await articleOgData();
  const hashes = new Map<string, string>();

  for (const article of ARTICLES) {
    const publicPath = data.pathFor(article.slug);
    assert.ok(publicPath, `${article.slug} is missing its editorial scene`);

    const filePath = path.join(process.cwd(), "public", publicPath.replace(/^\//, ""));
    const file = await readFile(filePath);
    const metadata = await sharp(file).metadata();
    assert.equal(metadata.width, 1200, `${article.slug} scene must be 1200 pixels wide`);
    assert.equal(metadata.height, 630, `${article.slug} scene must be 630 pixels tall`);

    const hash = createHash("sha256").update(file).digest("hex");
    const previousSlug = hashes.get(hash);
    if (previousSlug) {
      assert.equal(INTENTIONAL_SCENE_REUSE[article.slug], previousSlug, `${article.slug} unexpectedly repeats ${previousSlug}`);
    } else {
      hashes.set(hash, article.slug);
    }
  }
});

test("every article has a short visual headline that differs from its title", async () => {
  const data = await articleOgData();
  for (const article of ARTICLES) {
    const headline = data.headlines[article.slug];
    assert.ok(headline, `${article.slug} is missing its visual headline`);
    assert.notEqual(headline.toLowerCase(), article.title.toLowerCase());
    const wordCount = headline.trim().split(/\s+/).length;
    assert.ok(wordCount >= 3 && wordCount <= 8, `${article.slug} headline has ${wordCount} words`);
  }
});

test("every article scene has subject-specific alternative text", async () => {
  const data = await articleOgData();
  for (const article of ARTICLES) {
    const alt = data.alt[article.slug];
    assert.ok(alt.length >= 35, `${article.slug} alternative text is too vague`);
    assert.notEqual(alt, "A visual explainer from The LeadFlow Pro");
  }
});
