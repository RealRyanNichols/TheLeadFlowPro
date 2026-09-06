import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import { readFile, readdir } from "node:fs/promises";
import { createRequire } from "node:module";
import path from "node:path";
import test from "node:test";
import sharp from "sharp";
import ts from "typescript";
import type { ReactElement } from "react";
import { getPublicOgPage, getPublicOgPages } from "../lib/publicOgCatalog.ts";
import { PUBLIC_PAGE_CATALOG } from "../lib/publicPageCatalog.ts";
import {
  PUBLIC_SITE_URL,
  publicPageImagePath,
  withPublicPageMetadata,
} from "../lib/publicPageMetadata.ts";
import sitemap from "../app/sitemap.ts";

const require = createRequire(import.meta.url);
const { ImageResponse }: typeof import("next/og") = require("next/og");
const observedAt = new Date("2026-09-06T18:00:00Z");

test("every catalogued public URL has one distinct social image URL", () => {
  const pages = getPublicOgPages(observedAt);
  assert.ok(pages.length >= 200);
  assert.equal(new Set(pages.map((page) => page.path)).size, pages.length);
  assert.equal(new Set(pages.map((page) => page.imagePath)).size, pages.length);
  for (const page of pages) {
    assert.ok(page.title.trim().length > 5, page.path);
    assert.ok(page.description.trim().length > 20, page.path);
    assert.equal(getPublicOgPage(page.path, observedAt)?.path, page.path);
  }
});

test("canonical and social metadata agree while preserving page-specific and privacy fields", () => {
  for (const page of PUBLIC_PAGE_CATALOG) {
    const result = withPublicPageMetadata(page.path, {
      title: page.title,
      description: page.description,
      keywords: ["retained"],
      robots: { index: false, follow: false },
    });
    const canonical = `${PUBLIC_SITE_URL}${page.path === "/" ? "" : page.path}`;
    assert.equal(result.alternates?.canonical, canonical);
    assert.equal(result.openGraph?.url, canonical);
    assert.equal(result.openGraph?.title, page.title);
    assert.equal(result.twitter?.title, page.title);
    assert.deepEqual(result.keywords, ["retained"]);
    assert.deepEqual(result.robots, { index: false, follow: false });
    const images = result.openGraph?.images as {
      url: string;
      width: number;
      height: number;
    }[];
    assert.equal(
      images[0].url,
      `${PUBLIC_SITE_URL}${publicPageImagePath(page.path)}`,
    );
    assert.equal(images[0].width, 1200);
    assert.equal(images[0].height, 630);
    assert.deepEqual(result.twitter?.images, images);
  }
});

test("unknown, private, query, and traversal paths never become public social records", () => {
  for (const invalid of [
    "/admin",
    "/dashboard",
    "/sales",
    "/account/password",
    "/training/offer-engine/credential",
    "/not-a-page",
    "/articles/not-a-guide",
    "/scoreboard/metrics/not-a-metric",
    "/start?email=private@example.com",
    "/start#private",
    "/../admin",
    "//start",
    "/%61dmin",
    "https://example.com/start",
  ]) {
    assert.equal(getPublicOgPage(invalid, observedAt), undefined, invalid);
  }
  assert.throws(() => publicPageImagePath("/start?token=private"));
});

test("future articles enter the social catalog only on their Central publication day", () => {
  const future = "/articles/insurance-agent-lead-response";
  assert.equal(
    getPublicOgPage(future, new Date("2026-09-08T04:59:59Z")),
    undefined,
  );
  assert.equal(
    getPublicOgPage(future, new Date("2026-09-08T05:00:00Z"))?.imagePath,
    "/articles/insurance-agent-lead-response/opengraph-image",
  );
});

test("sitemap covers indexable canonical pages once, including all metric guides", () => {
  const entries = sitemap();
  const urls = entries.map((entry) => entry.url);
  assert.equal(new Set(urls).size, urls.length);
  for (const page of getPublicOgPages().filter((page) => page.index)) {
    assert.ok(
      urls.includes(`${PUBLIC_SITE_URL}${page.path === "/" ? "" : page.path}`),
      page.path,
    );
  }
  for (const omitted of [
    "/events",
    "/businesses",
    "/go",
    "/go/time-back",
    "/admin",
    "/academy/welcome",
    "/account/password",
  ]) {
    assert.ok(!urls.includes(`${PUBLIC_SITE_URL}${omitted}`), omitted);
  }
  assert.equal(
    urls.filter((url) => url.includes("/scoreboard/metrics/")).length,
    8,
  );
});

test("generated social artwork uses distinct existing local files and never the shared blue hero", async () => {
  const usedArt = new Set<string>();
  for (const page of getPublicOgPages(observedAt)) {
    if (!page.art) continue;
    assert.ok(
      !usedArt.has(page.art),
      `${page.path} repeats another page's artwork`,
    );
    usedArt.add(page.art);
    assert.ok(!page.art.includes("connected-company"), page.path);
    assert.ok(
      (await readFile(path.join(process.cwd(), "public", page.art))).length > 0,
      page.art,
    );
  }
});

test("page and layout files never export both static and generated metadata", async () => {
  const files = await readdir("app", { recursive: true });
  for (const file of files.filter((file) =>
    /(?:page|layout)\.tsx$/.test(file),
  )) {
    const source = await readFile(path.join("app", file), "utf8");
    assert.ok(
      !(
        source.includes("export const metadata") &&
        /export (?:async )?function generateMetadata/.test(source)
      ),
      file,
    );
  }
});

test("all generated previews really render as distinct 1200 by 630 PNGs", async () => {
  // Compile the pure JSX view for Node's existing TypeScript test runner.
  const source = await readFile(
    path.join(process.cwd(), "lib/publicOgCard.tsx"),
    "utf8",
  );
  const compiled = ts.transpileModule(source, {
    compilerOptions: {
      module: ts.ModuleKind.CommonJS,
      jsx: ts.JsxEmit.ReactJSX,
    },
  }).outputText;
  const cardExports: { publicOgCard?: (input: unknown) => ReactElement } = {};
  new Function("require", "exports", compiled)(require, cardExports);
  assert.ok(cardExports.publicOgCard);
  const logoData = `data:image/png;base64,${(await readFile("public/images/brand/leadflow-logo.png")).toString("base64")}`;
  const hashes = new Set<string>();
  for (const page of getPublicOgPages(observedAt).filter((page) =>
    page.imagePath.startsWith("/og/pages/"),
  )) {
    const route = page.path;
    const mime = page.art?.endsWith(".svg")
      ? "image/svg+xml"
      : page.art?.endsWith(".png")
        ? "image/png"
        : "image/jpeg";
    const artData = page.art
      ? `data:${mime};base64,${(await readFile(path.join("public", page.art))).toString("base64")}`
      : undefined;
    const response: Response = new ImageResponse(
      cardExports.publicOgCard({ page, logoData, artData }),
      { width: 1200, height: 630 },
    );
    const bytes: Buffer = Buffer.from(await response.arrayBuffer());
    const dimensions: sharp.Metadata = await sharp(bytes).metadata();
    assert.equal(dimensions.format, "png", route);
    assert.equal(dimensions.width, 1200, route);
    assert.equal(dimensions.height, 630, route);
    const hash = createHash("sha256").update(bytes).digest("hex");
    assert.ok(!hashes.has(hash), `${route} repeats another rendered card`);
    hashes.add(hash);
  }
});
