import assert from "node:assert/strict";
import { mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import test from "node:test";
import { checkOrphans, orphanPages, renderedLinks } from "../scripts/check-orphans.ts";

const ORIGIN = "https://www.theleadflowpro.com";

function page(path: string, body = "", head = ""): string {
  return `<html><head><link rel="canonical" href="${ORIGIN}${path}">${head}</head><body>${body}</body></html>`;
}

test("catalog membership and structured-data URLs do not prove an incoming link", () => {
  const catalog = [{ path: "/offer" }];
  const pages = new Map([
    ["/", page("/", '<script type="application/ld+json">{"url":"https://www.theleadflowpro.com/offer"}</script>')],
    ["/offer", page("/offer")],
  ]);
  assert.deepEqual(orphanPages(catalog, pages), ["/offer"]);
});

test("deleting the only real incoming anchor makes a catalog page fail", () => {
  const catalog = [{ path: "/offer" }];
  const pages = new Map([
    ["/", page("/", '<a href="/offer">Explore the offer</a>')],
    ["/offer", page("/offer")],
  ]);
  assert.deepEqual(orphanPages(catalog, pages), []);
  pages.set("/", page("/", "Explore the offer"));
  assert.deepEqual(orphanPages(catalog, pages), ["/offer"]);
});

test("self links and same-page queries or fragments cannot rescue an orphan", () => {
  const pages = new Map([
    ["/", page("/")],
    ["/offer", page("/offer", '<a href="/offer">Offer</a><a href="#details">Details</a><a href="?source=offer">Continue</a><a href="/offer?source=offer#details">Again</a>')],
  ]);
  assert.deepEqual(renderedLinks(pages.get("/offer")!, "/offer"), []);
  assert.deepEqual(orphanPages([{ path: "/offer" }], pages), ["/offer"]);
});

test("a disconnected group of pages cannot validate its own incoming links", () => {
  const catalog = [{ path: "/first" }, { path: "/second" }];
  const pages = new Map([
    ["/", page("/")],
    ["/first", page("/first", '<a href="/second">Next</a>')],
    ["/second", page("/second", '<a href="/first">Previous</a>')],
  ]);
  assert.deepEqual(orphanPages(catalog, pages), ["/first", "/second"]);
  pages.set("/", page("/", '<a href="/first">Start here</a>'));
  assert.deepEqual(orphanPages(catalog, pages), []);
});

test("noindex, nofollow, and private sources cannot supply link evidence", () => {
  for (const robots of ["noindex,follow", "index,nofollow"]) {
    const pages = new Map([
      ["/", page("/", '<a href="/guide">Read the guide</a>')],
      ["/guide", page("/guide", '<a href="/offer">Explore the offer</a>', `<meta name="robots" content="${robots}">`)],
      ["/offer", page("/offer")],
    ]);
    assert.deepEqual(renderedLinks(pages.get("/guide")!, "/guide"), [], robots);
    assert.deepEqual(orphanPages([{ path: "/offer" }], pages), ["/offer"], robots);
  }
  const privatePages = new Map([
    ["/", page("/", '<a href="/admin">Admin</a>')],
    ["/admin", page("/admin", '<a href="/offer">Explore the offer</a>')],
    ["/offer", page("/offer")],
  ]);
  assert.deepEqual(orphanPages([{ path: "/offer" }], privatePages), ["/offer"]);
});

test("a source canonicalized to a different page cannot supply link evidence", () => {
  const html = page("/different", '<a href="/offer">Explore the offer</a>');
  assert.deepEqual(renderedLinks(html, "/guide"), []);
  const pages = new Map([
    ["/", page("/", '<a href="/guide">Guide</a>')],
    ["/guide", html],
    ["/offer", page("/offer")],
  ]);
  assert.deepEqual(orphanPages([{ path: "/offer" }], pages), ["/offer"]);
});

test("canonical relationship tokens are case-insensitive", () => {
  const html = '<html><head><link rel="CANONICAL" href="https://www.theleadflowpro.com/different"></head><body><a href="/offer">Explore the offer</a></body></html>';
  assert.deepEqual(renderedLinks(html, "/guide"), []);
});

test("an external HTML base does not turn relative anchors into internal links", () => {
  const html = page("/guide", '<a href="/offer">Offer</a><a href="another-offer">Another offer</a>', '<base href="https://elsewhere.example/library/">');
  assert.deepEqual(renderedLinks(html, "/guide"), []);
});

test("relative anchors respect a same-origin HTML base directory", () => {
  const html = page("/guide", '<a href="offer">Offer</a><a href="../pricing">Prices</a>', '<base href="/library/">');
  assert.deepEqual(new Set(renderedLinks(html, "/guide")), new Set([
    "/library/offer", "/pricing",
  ]));
});

test("private dispute-building and tool-management pages cannot supply incoming links", () => {
  for (const source of ["/sellerproof/build", "/sellerproof/build/draft", "/go/tools/manage", "/go/tools/manage/settings"]) {
    const html = page(source, '<a href="/offer">Explore the offer</a>');
    const pages = new Map([
      ["/", page("/", `<a href="${source}">Open the workspace</a>`)],
      [source, html],
      ["/offer", page("/offer")],
    ]);
    assert.deepEqual(renderedLinks(html, source), [], source);
    assert.deepEqual(orphanPages([{ path: "/offer" }], pages), ["/offer"], source);
  }
});

test("real relative, absolute, and entity-encoded anchors normalize to public paths", () => {
  const html = page("/library/start", `
    <a href="../offer?source=guide#details">Relative offer</a>
    <a href="${ORIGIN}/pricing?source=guide&amp;campaign=one#scope" rel="noopener noreferrer">Prices</a>
    <a href="&#47;tools?source=guide&amp;campaign=one">Tools</a>
    <a href="//www.theleadflowpro.com/portfolio">Portfolio</a>
    <a href="https://elsewhere.example/offer">External</a>
    <a href="https://go.theleadflowpro.com/offer">Workspace host</a>
    <a href="mailto:hello@example.com">Email</a>
    <a href="/ignored" rel="noopener NOFOLLOW">Do not follow</a>
  `);
  assert.deepEqual(new Set(renderedLinks(html, "/library/start")), new Set([
    "/offer", "/pricing", "/tools", "/portfolio",
  ]));
});

test("anchor-shaped text in scripts, comments, textarea, and templates is ignored", () => {
  const html = page("/guide", `
    <!-- <a href="/comment">Not a link</a> -->
    <script>const example = '<a href="/script">Not a link</a>';</script>
    <script type="application/ld+json">{"example":"<a href='/schema'>Not a link</a>"}</script>
    <textarea><a href="/textarea">Not a link</a></textarea>
    <template><a href="/template">Inert link</a><template><a href="/nested-template">Still inert</a></template></template>
    <a href="/offer">Explore the offer</a>
  `);
  assert.deepEqual(renderedLinks(html, "/guide"), ["/offer"]);
});

test("rendered dynamic and additional sitemap source pages can provide incoming links", () => {
  const pages = new Map([
    ["/", page("/", '<a href="/product">Product</a><a href="/articles/useful-guide">Read a useful guide</a>')],
    ["/product", page("/product", '<a href="/product/terms">Purchase terms</a>')],
    ["/product/terms", page("/product/terms")],
    ["/articles/useful-guide", page("/articles/useful-guide", '<a href="/offer">Explore the offer</a>')],
    ["/offer", page("/offer")],
  ]);
  assert.deepEqual(orphanPages([{ path: "/product/terms" }, { path: "/offer" }], pages), []);
});

test("intentionally non-indexed catalog targets are excluded from the requirement", () => {
  const pages = new Map([["/", page("/")]]);
  assert.deepEqual(orphanPages([{ path: "/private-completion", index: false }], pages), []);
  assert.deepEqual(orphanPages([{ path: "/new-public-page" }], pages), ["/new-public-page"]);
});

test("the build guard fails rather than skipping when production artifacts are absent", async () => {
  const originalCwd = process.cwd();
  const directory = mkdtempSync(join(tmpdir(), "leadflow-orphan-check-"));
  try {
    process.chdir(directory);
    await assert.rejects(checkOrphans(), /requires a completed production build/);
  } finally {
    process.chdir(originalCwd);
    rmSync(directory, { recursive: true, force: true });
  }
});
