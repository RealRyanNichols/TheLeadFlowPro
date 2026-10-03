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
  AD_PAGE_SOCIAL_IMAGES,
  PUBLIC_OG_REVISION,
  PUBLIC_OG_REVISIONS,
  PUBLIC_OG_SIZE,
  PUBLIC_SITE_URL,
  publicPageImagePath,
  withPublicPageMetadata,
} from "../lib/publicPageMetadata.ts";
import sitemap from "../app/sitemap.ts";
import { UNIQUE_OG_IMAGES, uniqueOgImagePath } from "../lib/uniqueOgImages.ts";

const require = createRequire(import.meta.url);
const { ImageResponse }: typeof import("next/og") = require("next/og");
const observedAt = new Date("2026-09-06T18:00:00Z");

test("paid-traffic pages use distinct finished 1200 by 630 JPEG artwork", async () => {
  const expected = {
    "/scoreboard": "/images/social/scoreboard-20260907.jpg",
    "/premier-system": "/images/social/premier-system-20260907.jpg",
    "/portfolio": "/images/social/portfolio-20260907.jpg",
    "/results": "/images/social/results-20260907.jpg",
  };
  const hashes = new Set<string>();
  for (const [route, imagePath] of Object.entries(expected)) {
    assert.equal(AD_PAGE_SOCIAL_IMAGES[route], imagePath);
    assert.equal(publicPageImagePath(route), imagePath);
    assert.equal(getPublicOgPage(route, observedAt)?.imagePath, imagePath);
    const bytes = await readFile(path.join(process.cwd(), "public", imagePath));
    const dimensions = await sharp(bytes).metadata();
    assert.equal(dimensions.format, "jpeg", route);
    assert.equal(dimensions.width, 1200, route);
    assert.equal(dimensions.height, 630, route);
    const hash = createHash("sha256").update(bytes).digest("hex");
    assert.ok(
      !hashes.has(hash),
      `${route} repeats another ad page's image bytes`,
    );
    hashes.add(hash);
  }
  assert.equal(hashes.size, Object.keys(expected).length);
  // The retired free website build has no social card of its own any more.
  assert.equal(AD_PAGE_SOCIAL_IMAGES["/free-build"], undefined);
});

test("legacy ad preview URLs return the full finished image bytes and reject query/private paths", async () => {
  const source = await readFile("app/og/pages/[...path]/route.tsx", "utf8");
  const compiled = ts.transpileModule(source, {
    compilerOptions: {
      module: ts.ModuleKind.CommonJS,
      target: ts.ScriptTarget.ES2022,
      jsx: ts.JsxEmit.ReactJSX,
      esModuleInterop: true,
    },
  }).outputText;
  const routeExports = {} as {
    GET: (
      request: Request,
      context: { params: Promise<{ path: string[] }> },
    ) => Promise<Response>;
  };
  const localRequire = (name: string) => {
    if (name === "@/lib/publicOgCatalog") return { getPublicOgPage };
    if (name === "@/lib/publicPageMetadata")
      return {
        AD_PAGE_SOCIAL_IMAGES,
        PUBLIC_OG_SIZE,
        PUBLIC_OG_REVISION,
        PUBLIC_OG_REVISIONS,
      };
    if (name === "@/lib/publicOgCard")
      return {
        publicOgCard: () =>
          assert.fail(
            "Finished ad art must not be inserted into another generated card",
          ),
      };
    return require(name);
  };
  new Function("require", "exports", compiled)(localRequire, routeExports);
  for (const route of [
    ...Object.keys(UNIQUE_OG_IMAGES).filter((route) => route !== "/pricing"),
    "/scoreboard",
    "/premier-system",
    "/portfolio",
    "/results",
  ]) {
    const context = {
      params: Promise.resolve({ path: route.slice(1).split("/") }),
    };
    const response = await routeExports.GET(
      new Request(`${PUBLIC_SITE_URL}/og/pages${route}`),
      context,
    );
    assert.equal(response.status, 200, route);
    assert.equal(response.headers.get("Content-Type"), "image/jpeg", route);
    assert.equal(
      response.headers.get("X-Content-Type-Options"),
      "nosniff",
      route,
    );
    assert.deepEqual(
      Buffer.from(await response.arrayBuffer()),
      await readFile(
        path.join(
          process.cwd(),
          "public",
          uniqueOgImagePath(route) ?? AD_PAGE_SOCIAL_IMAGES[route],
        ),
      ),
      route,
    );
    const queryResponse = await routeExports.GET(
      new Request(`${PUBLIC_SITE_URL}/og/pages${route}?token=private-fixture`),
      context,
    );
    assert.equal(queryResponse.status, 404);
    assert.equal(queryResponse.headers.get("Cache-Control"), "no-store");
  }
  for (const segments of [["admin"], ["not-a-page"], ["..", "admin"]]) {
    const response = await routeExports.GET(
      new Request(`${PUBLIC_SITE_URL}/og/pages/unlisted`),
      {
        params: Promise.resolve({ path: segments }),
      },
    );
    assert.equal(response.status, 404);
    assert.equal(response.headers.get("X-Robots-Tag"), "noindex, nofollow");
  }
});

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

test("website project scope reaches generated share cards without imposing acquisition pricing", async () => {
  const source = await readFile("lib/publicOgCard.tsx", "utf8");
  const compiled = ts.transpileModule(source, {
    compilerOptions: {
      module: ts.ModuleKind.CommonJS,
      jsx: ts.JsxEmit.ReactJSX,
    },
  }).outputText;
  const cardExports: { publicOgCard?: (input: unknown) => ReactElement } = {};
  new Function("require", "exports", compiled)(require, cardExports);
  assert.ok(cardExports.publicOgCard);
  const { renderToStaticMarkup } = require("react-dom/server");
  for (const route of ["/services", "/agency/websites"]) {
    const page = getPublicOgPage(route, observedAt);
    assert.ok(page, route);
    const markup = renderToStaticMarkup(
      cardExports.publicOgCard({
        page,
        logoData: "/images/brand/leadflow-logo.png",
      }),
    );
    assert.match(markup, /separate written quote/, route);
    assert.match(markup, /[Mm]anaged acquisition is optional/, route);
    assert.doesNotMatch(
      markup,
      /\$7,500|90-day acquisition|within the written acquisition campaign/,
      route,
    );
    const metadata = withPublicPageMetadata(route, { title: page.title });
    assert.equal(metadata.openGraph?.description, page.description, route);
    assert.equal(metadata.twitter?.description, page.description, route);
  }
});

test("versioned generated routes retain legacy aliases and reject query text or unknown revisions", async () => {
  const source = await readFile("app/og/pages/[...path]/route.tsx", "utf8");
  const compiled = ts.transpileModule(source, {
    compilerOptions: {
      module: ts.ModuleKind.CommonJS,
      target: ts.ScriptTarget.ES2022,
      jsx: ts.JsxEmit.ReactJSX,
      esModuleInterop: true,
    },
  }).outputText;
  const routeExports = {} as {
    GET: (
      request: Request,
      context: { params: Promise<{ path: string[] }> },
    ) => Promise<Response>;
  };
  const localRequire = (name: string) => {
    if (name === "@/lib/publicOgCatalog") return { getPublicOgPage };
    if (name === "@/lib/publicPageMetadata")
      return {
        AD_PAGE_SOCIAL_IMAGES,
        PUBLIC_OG_SIZE,
        PUBLIC_OG_REVISION,
        PUBLIC_OG_REVISIONS,
      };
    if (name === "@/lib/publicOgCard")
      return {
        publicOgCard: ({ page }: { page: { title: string } }) =>
          require("react").createElement(
            "div",
            {
              style: {
                display: "flex",
                fontFamily: "LeadFlow Inter",
                fontWeight: 900,
              },
            },
            page.title,
          ),
      };
    return require(name);
  };
  new Function("require", "exports", compiled)(localRequire, routeExports);
  const images: Buffer[] = [];
  for (const suffix of [
    "",
    ...PUBLIC_OG_REVISIONS.map((revision) => `/${revision}`),
  ]) {
    const response = await routeExports.GET(
      new Request(`${PUBLIC_SITE_URL}/og/pages/agency${suffix}`),
      {
        params: Promise.resolve({
          path: ["agency", ...suffix.split("/").filter(Boolean)],
        }),
      },
    );
    assert.equal(response.status, 200);
    assert.equal(response.headers.get("Content-Type"), "image/png");
    assert.equal(response.headers.get("X-Content-Type-Options"), "nosniff");
    images.push(Buffer.from(await response.arrayBuffer()));
  }
  for (const image of images.slice(1)) assert.deepEqual(images[0], image);
  for (const suffix of [
    "",
    ...PUBLIC_OG_REVISIONS.map((revision) => `/${revision}`),
  ]) {
    const response = await routeExports.GET(
      new Request(`${PUBLIC_SITE_URL}/og/pages/services${suffix}`),
      {
        params: Promise.resolve({
          path: ["services", ...suffix.split("/").filter(Boolean)],
        }),
      },
    );
    assert.equal(response.status, 200);
    assert.equal(response.headers.get("Content-Type"), "image/png");
  }
  for (const [url, segments] of [
    [
      `agency/${PUBLIC_OG_REVISION}?email=private@example.test`,
      ["agency", PUBLIC_OG_REVISION],
    ],
    ["agency/unknown-revision", ["agency", "unknown-revision"]],
    [`admin/${PUBLIC_OG_REVISION}`, ["admin", PUBLIC_OG_REVISION]],
  ] as const) {
    const response = await routeExports.GET(
      new Request(`${PUBLIC_SITE_URL}/og/pages/${url}`),
      { params: Promise.resolve({ path: [...segments] }) },
    );
    assert.equal(response.status, 404, url);
    assert.equal(response.headers.get("Cache-Control"), "no-store", url);
  }
});

test("generated cards use one finite cache revision while finished scenes retain their public URLs", () => {
  for (const route of [
    "/",
    "/agency",
    "/services",
    "/service-areas",
    "/pricing",
    "/operatoros",
  ]) {
    const image = publicPageImagePath(route);
    assert.equal(
      image,
      `/og/pages${route === "/" ? "/home" : route}/${PUBLIC_OG_REVISION}`,
    );
    assert.equal(getPublicOgPage(route)?.imagePath, image);
  }
  assert.equal(
    publicPageImagePath("/tools/job-price-calculator"),
    uniqueOgImagePath("/tools/job-price-calculator"),
  );
});

test("remaining legacy tool previews are distinct light images with versioned URLs", async () => {
  const previews = getPublicOgPages().filter((page) =>
    page.imagePath.startsWith("/og/tools/violet-20261003/"),
  );
  assert.ok(
    previews.length > 50,
    "The active legacy tool cards must enter the new palette",
  );
  const hashes = new Set<string>();
  for (const page of previews) {
    const bytes = await readFile(
      path.join(process.cwd(), "public", page.imagePath),
    );
    const dimensions = await sharp(bytes).metadata();
    assert.equal(dimensions.format, "jpeg", page.path);
    assert.equal(dimensions.width, 1200, page.path);
    assert.equal(dimensions.height, 630, page.path);
    assert.ok(bytes.length < 500_000, page.path);
    const stats = await sharp(bytes).resize(16, 8).stats();
    const mean =
      stats.channels
        .slice(0, 3)
        .reduce((total, channel) => total + channel.mean, 0) / 3;
    assert.ok(mean > 150, `${page.path} still has the retired dark background`);
    const hash = createHash("sha256").update(bytes).digest("hex");
    assert.ok(!hashes.has(hash), `${page.path} repeats another tool image`);
    hashes.add(hash);
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

test("reviewed page descriptions fill missing metadata without replacing explicit copy or privacy flags", () => {
  for (const path of ["/sellerproof/privacy", "/sellerproof/terms"]) {
    const page = PUBLIC_PAGE_CATALOG.find((entry) => entry.path === path);
    assert.ok(page);
    const inherited = withPublicPageMetadata(path, {
      title: page.title,
      robots: { index: false, follow: false },
      referrer: "no-referrer",
    });
    assert.equal(inherited.description, page.description);
    assert.equal(inherited.openGraph?.description, page.description);
    assert.equal(inherited.twitter?.description, page.description);
    assert.deepEqual(inherited.robots, { index: false, follow: false });
    assert.equal(inherited.referrer, "no-referrer");

    const custom = withPublicPageMetadata(path, {
      title: "A deliberately distinct page title",
      description: "A page-specific description remains authoritative.",
      openGraph: { description: "A separately reviewed share description." },
    });
    assert.equal(
      custom.description,
      "A page-specific description remains authoritative.",
    );
    assert.equal(
      custom.openGraph?.description,
      "A separately reviewed share description.",
    );
    assert.equal(
      custom.twitter?.description,
      "A separately reviewed share description.",
    );
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
    "/og/unique/2026-09-19/articles--insurance-agent-lead-response.jpg",
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
  const fonts = [
    {
      name: "LeadFlow Inter",
      data: await readFile("public/fonts/og/inter-latin-400-normal.woff"),
      weight: 400 as const,
      style: "normal" as const,
    },
    {
      name: "LeadFlow Inter",
      data: await readFile("public/fonts/og/inter-latin-900-normal.woff"),
      weight: 900 as const,
      style: "normal" as const,
    },
  ];
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
      { width: 1200, height: 630, fonts },
    );
    const bytes: Buffer = Buffer.from(await response.arrayBuffer());
    const dimensions = await sharp(bytes).metadata();
    assert.equal(dimensions.format, "png", route);
    assert.equal(dimensions.width, 1200, route);
    assert.equal(dimensions.height, 630, route);
    const hash = createHash("sha256").update(bytes).digest("hex");
    assert.ok(!hashes.has(hash), `${route} repeats another rendered card`);
    hashes.add(hash);
  }
});

test("September 12 artwork covers 50 public URLs with distinct optimized 1200 by 630 JPEGs", async () => {
  const entries = Object.entries(UNIQUE_OG_IMAGES).filter(([, image]) =>
    image.startsWith("/og/unique/2026-09-12/"),
  );
  assert.equal(entries.length, 50);
  const hashes = new Set<string>();
  for (const [route, image] of entries) {
    if (route !== "/pricing")
      assert.equal(
        getPublicOgPage(route, new Date("2026-09-12T23:00:00Z"))?.imagePath,
        image,
        route,
      );
    assert.equal(uniqueOgImagePath(`${route}?token=private`), undefined);
    const bytes = await readFile(path.join(process.cwd(), "public", image));
    const metadata = await sharp(bytes).metadata();
    assert.equal(metadata.format, "jpeg", route);
    assert.equal(metadata.width, 1200, route);
    assert.equal(metadata.height, 630, route);
    assert.ok(
      bytes.length < 500_000,
      `${route} exceeds social image size budget`,
    );
    hashes.add(createHash("sha256").update(bytes).digest("hex"));
  }
  assert.equal(hashes.size, 50);
  for (const invalid of [
    "/admin",
    "/unknown",
    "__proto__",
    "/tools/../admin",
  ]) {
    assert.equal(uniqueOgImagePath(invalid), undefined);
  }
  assert.equal(getPublicOgPage("/chatgpt/free")?.index, false);
  assert.equal(
    getPublicOgPage("/events/chatgpt-for-business-owners-longview")?.index,
    false,
  );
});
