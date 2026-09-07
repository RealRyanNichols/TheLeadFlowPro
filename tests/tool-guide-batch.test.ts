import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import { readFile, mkdir, writeFile } from "node:fs/promises";
import { createRequire } from "node:module";
import path from "node:path";
import test from "node:test";
import type { ReactElement } from "react";
import sharp from "sharp";
import ts from "typescript";
import { ARTICLES, getPublishedArticles, type Article } from "../lib/articles";
import { TOOL_BUSINESS_ARTICLES } from "../lib/articles-tool-business";
import { TOOL_GENERATOR_ARTICLES } from "../lib/articles-tool-generators";
import { TOOL_HOUSEHOLD_ARTICLES } from "../lib/articles-tool-household";
import { getToolArticleGuides } from "../lib/toolArticleGuides";
import { TOOLS } from "../lib/tools";
import { proUpgradesFor } from "../lib/tools/pro";

const batch = [
  ...TOOL_BUSINESS_ARTICLES,
  ...TOOL_GENERATOR_ARTICLES,
  ...TOOL_HOUSEHOLD_ARTICLES,
];
const now = new Date("2026-09-06T18:00:00Z");

test("the authorized batch contains exactly the 45 planned unique substantive guides", async () => {
  const plan = JSON.parse(
    await readFile("docs/tool-article-coverage-plan-2026-09-06.json", "utf8"),
  );
  assert.equal(batch.length, 45);
  assert.equal(new Set(batch.map((a) => a.slug)).size, 45);
  assert.equal(
    new Set(batch.map((a) => createHash("sha256").update(a.body).digest("hex")))
      .size,
    45,
  );
  for (const article of batch) {
    const brief = plan.briefs.find(
      (b: { queueSlug: string }) => b.queueSlug === article.slug,
    );
    assert.ok(brief, article.slug);
    assert.equal(article.title, brief.proposedTitle);
    assert.equal(article.tool?.slug, brief.tool);
    assert.equal(article.publishedAt, "2026-09-06");
    assert.ok(article.body.trim().split(/\s+/).length >= 600, article.slug);
    assert.equal(article.body.match(/\{\{TOOL\}\}/g)?.length, 1, article.slug);
    assert.ok(article.body.includes(`](/tools/${brief.tool})`), article.slug);
    assert.equal(article.tool?.steps.length, 4, article.slug);
    assert.equal(article.faq?.length, 3, article.slug);
    assert.doesNotMatch(article.body, /—|\bTODO\b|\bTBD\b/);
    assert.equal(ARTICLES.filter((a) => a.slug === article.slug).length, 1);
  }
});

test("every current free tool has a published relevant guide while the next daily articles stay scheduled", () => {
  for (const tool of TOOLS)
    assert.ok(getToolArticleGuides(tool.slug, now).length > 0, tool.slug);
  const published = getPublishedArticles(now);
  for (const article of batch)
    assert.ok(
      published.some((a) => a.slug === article.slug),
      article.slug,
    );
  for (const [slug, date] of [
    ["locksmith-after-hours-calls", "2026-09-07"],
    ["insurance-agent-lead-response", "2026-09-08"],
  ]) {
    assert.equal(ARTICLES.find((a) => a.slug === slug)?.publishedAt, date);
    assert.ok(!published.some((a) => a.slug === slug));
  }
});

test("paid guide links match the embedded tool's actual upgrade catalog", () => {
  for (const article of batch) {
    const allowed = new Set(
      proUpgradesFor(article.tool!.slug).map((t) => t.slug),
    );
    for (const match of article.body.matchAll(
      /\]\(\/tools\/pro\/([a-z0-9-]+)\)/g,
    )) {
      assert.ok(
        allowed.has(match[1]),
        `${article.slug}: unrelated paid kit ${match[1]}`,
      );
    }
  }
});

test("all 45 article previews render distinct 1200 by 630 PNGs from their own tool scenes", async () => {
  const require = createRequire(import.meta.url);
  const { ImageResponse }: typeof import("next/og") = require("next/og");
  const compiled = ts.transpileModule(
    await readFile("lib/articles-og.tsx", "utf8"),
    {
      compilerOptions: {
        module: ts.ModuleKind.CommonJS,
        target: ts.ScriptTarget.ES2022,
        jsx: ts.JsxEmit.ReactJSX,
      },
    },
  ).outputText;
  const renderer: {
    articleOgCard?: (input: {
      article: Article;
      backgroundUrl: string;
    }) => ReactElement;
  } = {};
  new Function("require", "exports", compiled)(require, renderer);
  assert.ok(renderer.articleOgCard);
  const hashes = new Set<string>();
  const evidenceDir = process.env.LFP_OG_EVIDENCE_DIR;
  if (evidenceDir) await mkdir(evidenceDir, { recursive: true });
  for (const article of batch) {
    const file = await readFile(path.join("public", article.ogImage));
    const response: Response = new ImageResponse(
      renderer.articleOgCard({
        article,
        backgroundUrl: `data:image/jpeg;base64,${file.toString("base64")}`,
      }),
      { width: 1200, height: 630 },
    );
    const bytes: Buffer = Buffer.from(await response.arrayBuffer());
    const meta: sharp.Metadata = await sharp(bytes).metadata();
    assert.equal(meta.format, "png", article.slug);
    assert.equal(meta.width, 1200, article.slug);
    assert.equal(meta.height, 630, article.slug);
    const hash = createHash("sha256").update(bytes).digest("hex");
    assert.ok(!hashes.has(hash), article.slug);
    hashes.add(hash);
    if (evidenceDir)
      await writeFile(path.join(evidenceDir, article.slug + ".png"), bytes);
  }
  assert.equal(hashes.size, 45);
});
