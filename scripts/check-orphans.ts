// Post-build discovery check. Only rendered, followable anchors count as
// evidence; catalog, sitemap, canonical and schema URLs are not links.
// Static sources come from this build's prerender manifest. Dynamic public
// sources are read anonymously from a temporary localhost Next server.
// Run: npm run check:orphans (after next build).

import { spawn, type ChildProcess } from "node:child_process";
import { existsSync, readFileSync } from "node:fs";
import { createRequire } from "node:module";
import { createServer } from "node:net";
import { join } from "node:path";
import { fileURLToPath } from "node:url";
import { parse, type DefaultTreeAdapterTypes } from "parse5";
import sitemap from "../app/sitemap.ts";
import { isPublicAnalyticsUrl } from "../lib/analytics/privacy.ts";
import { PUBLIC_PAGE_CATALOG } from "../lib/publicPageCatalog.ts";
import { PUBLIC_SITE_URL } from "../lib/publicPageMetadata.ts";

type CatalogPage = { path: string; index?: boolean };
type HtmlNode = DefaultTreeAdapterTypes.Node;

// Analytics treats the entire training area as private, while SEO includes
// public course summaries. Keep this boundary specific to crawlable HTML.
const PRIVATE_PATH = /^\/(?:api|admin|auth|account|dashboard|sales|hq|design-preview|factory|embed|login|logout|unsubscribe|unsubscribed|thank-you|checkout|deposit|r|community)(?:\/|$)/;
const PRIVATE_FLOW = /^\/(?:chase-sheet\/app|post-creator\/app|sellerproof\/build|go\/tools\/(?:manage|welcome)|agency\/(?:start|pay|paid)|tools\/pro\/unlock|training\/[^/]+\/[^/]+|events\/[^/]+\/(?:worksheet|thanks|confirmed))(?:\/|$)/;

function publicPath(href: string, source: string): string | undefined {
  try {
    const url = new URL(href, new URL(source, PUBLIC_SITE_URL));
    if (url.origin !== PUBLIC_SITE_URL || url.username || url.password) return;
    const path = decodeURIComponent(url.pathname).replace(/\/+$/, "") || "/";
    if (!/^\/(?:[a-z0-9-]+(?:\/[a-z0-9-]+)*)?$/.test(path)) return;
    const publicSummary = /^\/training(?:\/[a-z0-9-]+)?$/.test(path);
    return !PRIVATE_PATH.test(path) && !PRIVATE_FLOW.test(path) &&
      (isPublicAnalyticsUrl(path) || publicSummary) ? path : undefined;
  } catch { return; }
}

export function renderedLinks(html: string, sourcePath: string): string[] {
  if (publicPath(sourcePath, "/") !== sourcePath) return [];
  const hrefs: string[] = [];
  const canonicals: string[] = [];
  let baseHref: string | undefined;
  let eligible = true;
  const visit = (node: HtmlNode) => {
    if ("tagName" in node) {
      const attrs = Object.fromEntries(node.attrs.map((attr) => [attr.name, attr.value]));
      if (node.tagName === "meta" && /^(robots|googlebot)$/i.test(attrs.name ?? "") &&
          /\b(noindex|nofollow|none)\b/i.test(attrs.content ?? "")) eligible = false;
      if (node.tagName === "base" && typeof attrs.href === "string" && baseHref === undefined) baseHref = attrs.href;
      if (node.tagName === "link" && (attrs.rel ?? "").toLowerCase().split(/\s+/).includes("canonical"))
        canonicals.push(attrs.href ?? "");
      if (node.tagName === "a" && attrs.href && !/\bnofollow\b/i.test(attrs.rel ?? "")) {
        hrefs.push(attrs.href);
      }
      // Templates are inert; raw-text nodes cannot supply real anchors.
      if (["template", "script", "style", "textarea", "title"].includes(node.tagName)) return;
    }
    if ("childNodes" in node) for (const child of node.childNodes) visit(child);
  };
  visit(parse(html));
  try {
    const base = new URL(baseHref ?? sourcePath, PUBLIC_SITE_URL + sourcePath).href;
    if (!eligible || canonicals.some((href) => publicPath(href, base) !== sourcePath)) return [];
    return [...new Set(hrefs.map((href) => publicPath(href, base))
      .filter((path): path is string => !!path && path !== sourcePath))];
  } catch { return []; }
}

export function orphanPages(catalog: readonly CatalogPage[], pages: ReadonlyMap<string, string>): string[] {
  const graph = new Map([...pages].map(([path, html]) => [path, renderedLinks(html, path)]));
  const reached = new Set<string>(["/"]);
  const pending = ["/"];
  const incoming = new Set<string>();
  // An isolated pair of pages cannot validate one another. A source must be
  // reachable through the public site's own anchors starting at the homepage.
  while (pending.length) {
    for (const target of graph.get(pending.pop()!) ?? []) {
      incoming.add(target);
      if (!reached.has(target)) { reached.add(target); pending.push(target); }
    }
  }
  return catalog.filter((page) => page.index !== false && !incoming.has(page.path)).map((page) => page.path);
}

async function startLocalServer(): Promise<{ child: ChildProcess; origin: string }> {
  const socket = createServer();
  await new Promise<void>((resolve, reject) => {
    socket.once("error", reject);
    socket.listen(0, "127.0.0.1", resolve);
  });
  const address = socket.address();
  if (!address || typeof address === "string") throw new Error("No local QA port available");
  await new Promise<void>((resolve) => socket.close(() => resolve()));
  const config = JSON.parse(readFileSync(join(process.cwd(), ".next/required-server-files.json"), "utf8")).config;
  const args = config.output === "standalone"
    ? [join(process.cwd(), ".next/standalone/server.js")]
    : [createRequire(import.meta.url).resolve("next/dist/bin/next"), "start", "--hostname", "127.0.0.1", "--port", String(address.port)];
  const child = spawn(process.execPath, args, {
    stdio: ["ignore", "pipe", "pipe"],
    env: { ...process.env, PORT: String(address.port), HOSTNAME: "127.0.0.1", NEXT_TELEMETRY_DISABLED: "1" },
  });
  try {
    await new Promise<void>((resolve, reject) => {
      const timer = setTimeout(() => reject(new Error("Local QA server startup timed out")), 20_000);
      child.once("error", (error) => { clearTimeout(timer); reject(error); });
      child.once("exit", () => { clearTimeout(timer); reject(new Error("Local QA server exited before it was ready")); });
      let output = "";
      child.stdout?.on("data", (data) => {
        output = (output + String(data)).slice(-1000);
        if (output.includes("Ready in")) { clearTimeout(timer); resolve(); }
      });
      // Do not echo server logs, which may contain environment-specific data.
      child.stderr?.resume();
    });
    return { child, origin: `http://127.0.0.1:${address.port}` };
  } catch (error) { child.kill(); throw error; }
}

export async function checkOrphans(): Promise<{ orphans: string[]; sources: number; skipped: string[] }> {
  const build = join(process.cwd(), ".next");
  if (!existsSync(join(build, "BUILD_ID")) || !existsSync(join(build, "prerender-manifest.json")))
    throw new Error("check:orphans requires a completed production build; run npm run build first");
  const manifest = JSON.parse(readFileSync(join(build, "prerender-manifest.json"), "utf8"));
  const paths = [...new Set(sitemap().map((entry) => publicPath(entry.url, "/")).filter((path): path is string => !!path))];
  const pages = new Map<string, string>();
  const dynamic: string[] = [];
  const skipped: string[] = [];
  for (const path of paths) {
    const route = manifest.routes[path];
    const file = join(build, "server/app", path === "/" ? "index.html" : `${path.slice(1)}.html`);
    if (route && (route.initialStatus ?? 200) === 200 && existsSync(file)) {
      const robots = Object.entries(route.initialHeaders ?? {}).filter(([name]) => name.toLowerCase() === "x-robots-tag").map(([, value]) => value).join(",");
      if (!/\b(noindex|nofollow|none)\b/i.test(robots)) pages.set(path, readFileSync(file, "utf8"));
    }
    else dynamic.push(path);
  }
  if (dynamic.length) {
    const { child, origin } = await startLocalServer();
    try {
      // Four concurrent anonymous GETs, only reviewed public sitemap paths.
      // Queries, cookies, redirect destinations and API routes are never read.
      let next = 0;
      await Promise.all(Array.from({ length: Math.min(4, dynamic.length) }, async () => {
        while (next < dynamic.length) {
          const path = dynamic[next++];
          try {
            const response = await fetch(origin + path, { redirect: "manual", signal: AbortSignal.timeout(30_000) });
            if (response.status !== 200 || !response.headers.get("content-type")?.includes("text/html")) {
              skipped.push(`${path}: HTTP ${response.status}`); continue;
            }
            if (/\b(noindex|nofollow|none)\b/i.test(response.headers.get("x-robots-tag") ?? "")) continue;
            pages.set(path, await response.text());
          } catch { skipped.push(`${path}: request failed`); }
        }
      }));
    } finally {
      await new Promise<void>((resolve) => {
        if (child.exitCode !== null || child.signalCode !== null) { resolve(); return; }
        const timer = setTimeout(() => child.kill("SIGKILL"), 5_000);
        child.once("exit", () => { clearTimeout(timer); resolve(); });
        child.kill();
      });
    }
  }
  return { orphans: orphanPages(PUBLIC_PAGE_CATALOG, pages), sources: pages.size, skipped: skipped.sort() };
}

if (process.argv[1] && fileURLToPath(import.meta.url) === process.argv[1]) {
  try {
    const report = await checkOrphans();
    if (report.skipped.length) console.warn(`check:orphans: ${report.skipped.length} unavailable source pages supplied no link evidence:\n  ${report.skipped.join("\n  ")}`);
    if (report.orphans.length) {
      console.error(`check:orphans: ${report.orphans.length} indexable catalog pages lack an incoming public anchor:\n  ${report.orphans.join("\n  ")}`);
      process.exitCode = 1;
    } else console.log(`check:orphans: every indexable catalog page has an incoming public anchor (${report.sources} rendered sources checked).`);
  } catch (error) { console.error(error instanceof Error ? error.message : "Orphan check failed"); process.exitCode = 1; }
}
