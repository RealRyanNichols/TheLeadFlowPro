import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { readFileSync, existsSync } from "node:fs";
import { fileURLToPath } from "node:url";
import sitemap from "../app/sitemap.ts";

const root = fileURLToPath(new URL("../", import.meta.url));
const BASE = "https://www.theleadflowpro.com";

function read(relative: string): string | null {
  const path = `${root}${relative}`;
  return existsSync(path) ? readFileSync(path, "utf8") : null;
}

/**
 * The page module that renders a sitemap route. Dynamic segments collapse to
 * their [param] directory, because one module serves every slug under it.
 */
function pageModuleFor(route: string): string | null {
  const clean = route.replace(BASE, "") || "/";
  const direct = `app${clean === "/" ? "" : clean}/page.tsx`;
  if (existsSync(`${root}${direct}`)) return direct;

  const segments = clean.split("/").filter(Boolean);
  // Walk parents looking for the [param] directory that serves this route.
  for (let depth = segments.length; depth > 0; depth--) {
    const parent = segments.slice(0, depth - 1).join("/");
    const prefix = parent ? `app/${parent}` : "app";
    for (const candidate of ["[slug]", "[stage]", "[tier]", "[course]"]) {
      const path = `${prefix}/${candidate}/page.tsx`;
      if (existsSync(`${root}${path}`)) return path;
    }
  }
  return null;
}

describe("canonical URLs", () => {
  // The bug: app/layout.tsx set alternates.canonical to the site root, and
  // Next.js hands root-layout metadata to every page that does not override
  // it. Indexable pages were therefore telling Google they were the homepage,
  // which is a request to drop them from the index in favor of it.
  it("the root layout declares no canonical for every page to inherit", () => {
    const layout = read("app/layout.tsx");
    assert.ok(layout, "app/layout.tsx is missing");
    const code = layout.replace(/\/\/[^\n]*/g, "").replace(/\/\*[\s\S]*?\*\//g, "");
    assert.ok(
      !/canonical/.test(code),
      "app/layout.tsx declares a canonical again; every page without an override will inherit it",
    );
  });

  it("the homepage declares its own", () => {
    const home = read("app/page.tsx");
    assert.ok(home?.includes(`canonical: "${BASE}"`), "app/page.tsx lost its canonical");
  });

  const routes = [...new Set(sitemap().map((entry) => entry.url))];

  it("has routes to check", () => {
    assert.ok(routes.length > 20, `expected a populated sitemap, got ${routes.length}`);
  });

  // Every indexable page has to name itself. A page in the sitemap with no
  // canonical of its own is the exact shape of the bug above.
  for (const route of routes) {
    const module = pageModuleFor(route);
    it(`${route.replace(BASE, "") || "/"} names its own canonical`, () => {
      assert.ok(module, `no page module found for ${route}`);
      const source = read(module);
      assert.ok(source, `could not read ${module}`);
      assert.ok(
        source.includes("canonical"),
        `${module} is in the sitemap but declares no canonical, so it inherits one`,
      );
    });
  }
});
