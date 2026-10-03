import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import test from "node:test";
import { BAR_LINKS, CALL_SHEET_HREF, MENU_GROUPS, MENU_ID, MENU_LINKS, currentHref } from "../app/admin/backOfficeNav.ts";
import { copyProblems } from "../lib/hq/copy.ts";
import { routeExists } from "../scripts/check-links.ts";

// The Back Office header's data (app/admin/backOfficeNav.ts): every page once,
// under a plain heading, with one line saying what it is for. The rendered
// header is checked in tests/call-queue.test.ts, next to Today's calls.

const src = (f: string) => readFileSync(join(process.cwd(), f), "utf8");
/** /admin/sales/* is served by app/sales/* (middleware rewrites it). */
const resolves = (href: string) =>
  routeExists(href) || (href.startsWith("/admin/sales") && routeExists(href.replace("/admin/sales", "/sales")));
const words = (s: string) => s.trim().split(/\s+/).length;

/** Every header destination before the regrouping. None may go missing. */
const BEFORE = [
  "/admin/sales/uncalled",
  "/admin/command-center",
  "/admin/business",
  "/admin/purchases",
  "/admin/tlfp",
  "/admin/operator",
  "/admin/content-engine",
  "/admin/content-command",
  "/admin/sales",
  "/admin",
  "/admin/time-back",
  "/admin/projects",
  "/admin/clients",
  "/admin/messages",
  "/admin/events",
  "/admin/analytics",
  "/admin/videos",
  "/admin/training",
  "/admin/social",
  "/admin/settings",
  "/admin/connections",
  "/dashboard",
  "https://sites.theleadflowpro.com",
  "https://trading.theleadflowpro.com/",
];

test("every page is in the menu once, every link resolves, and the call sheet is only in the bar", () => {
  const hrefs = MENU_LINKS.map((l) => l.href);
  assert.equal(new Set(hrefs).size, hrefs.length, "no page twice");
  assert.ok(resolves(CALL_SHEET_HREF));
  for (const link of MENU_LINKS) {
    if (link.external) assert.match(link.href, /^https:\/\/[a-z]+\.theleadflowpro\.com\/?$/, link.href);
    else assert.ok(resolves(link.href), `${link.href} is a real route`);
  }
  assert.ok(!hrefs.includes(CALL_SHEET_HREF), "Today's calls is in the bar, not the menu");
  assert.equal(BAR_LINKS.length, 4);
  for (const bar of BAR_LINKS) assert.ok(MENU_LINKS.includes(bar), `${bar.label} is in the menu too, so the menu is the whole map`);
  for (const href of BEFORE) assert.ok(hrefs.includes(href), `${href} is still reachable from the header`);
  // Two working pages that used to be reachable only from inside the Sales desk.
  assert.ok(hrefs.includes("/admin/sales/follow-ups") && hrefs.includes("/admin/sales/invoices"));
});

test("six plain headings, each with a line saying what it is for; every link has a short plain description", () => {
  assert.equal(MENU_GROUPS.length, 6);
  assert.equal(MENU_GROUPS[0].title, "Calls and leads", "the daily group comes first");
  for (const group of MENU_GROUPS) {
    assert.ok(words(group.title) <= 3, group.title);
    assert.ok(group.links.length >= 2 && group.links.length <= 6, `${group.title}: ${group.links.length} links`);
    assert.deepEqual(copyProblems(`${group.title} ${group.subtitle}`), [], group.title);
    for (const link of group.links) {
      assert.ok(words(link.label) <= 3, link.label);
      assert.ok(words(link.description) <= 9, `${link.label}: ${link.description}`);
      assert.deepEqual(copyProblems(`${link.label} ${link.description}`), [], link.label);
      assert.ok(!/undefined|TODO|lorem/i.test(`${link.label} ${link.description}`), link.label);
    }
  }
  // Labels a person would say. The old one-word labels that said nothing are gone.
  const labels = MENU_LINKS.map((l) => l.label);
  for (const old of ["Command", "Business", "Credits", "Content", "Content Command", "Connections", "Member portal"]) {
    assert.ok(!labels.includes(old), `${old} has a plainer name now`);
  }
  // Where a page's own heading is a product name, the description still carries it.
  const byHref = Object.fromEntries(MENU_LINKS.map((l) => [l.href, l]));
  assert.match(byHref["/admin/content-command"].description, /Content Command/);
  assert.match(byHref["/admin/tlfp"].description, /TLFP Credits/);
  assert.equal(byHref["/admin/operator"].label, "OperatorOS");
  // The frozen sample page says it is a preview, so nobody mistakes it for the working publisher.
  assert.match(byHref["/admin/content-engine"].description, /Preview only/);
  // The two links that leave for another site say so.
  for (const l of MENU_LINKS.filter((l) => l.external)) assert.match(l.description, /on its own site/);
});

test("the page you are on is found by the longest matching link", () => {
  const lead = "0a1b2c3d-0000-4000-8000-000000000001";
  assert.equal(currentHref("/admin/call-sheet"), CALL_SHEET_HREF);
  assert.equal(currentHref("/admin/call-sheet/next"), CALL_SHEET_HREF);
  assert.equal(currentHref(`/admin/call-sheet/${lead}`), CALL_SHEET_HREF);
  assert.equal(currentHref("/admin"), "/admin");
  assert.equal(currentHref("/admin/"), "/admin");
  assert.equal(currentHref(`/admin/leads/${lead}`), "/admin");
  assert.equal(currentHref("/admin/sales"), "/admin/sales");
  assert.equal(currentHref("/admin/sales/pipeline"), "/admin/sales");
  assert.equal(currentHref("/admin/sales/uncalled"), "/admin/sales/uncalled");
  assert.equal(currentHref("/admin/sales/follow-ups"), "/admin/sales/follow-ups");
  assert.equal(currentHref("/admin/sales/invoices"), "/admin/sales/invoices");
  assert.equal(currentHref("/admin/operator/cash"), "/admin/operator");
  assert.equal(currentHref("/admin/purchases/"), "/admin/purchases");
  assert.equal(currentHref("/dashboard/build-room"), "/dashboard");
  // Pages no header link owns, and nothing at all.
  assert.equal(currentHref("/admin/proposals/sample-build"), null);
  assert.equal(currentHref("/admin/purchases-old"), null);
  assert.equal(currentHref("/"), null);
  assert.equal(currentHref(""), null);
  assert.equal(currentHref(null), null);
  assert.equal(currentHref(undefined), null);
  // A separate site is never "the page you are on".
  assert.equal(currentHref("https://trading.theleadflowpro.com/"), null);
});

test("the header files keep the house style, and the closer finds the menu by its id", () => {
  for (const file of ["app/admin/backOfficeNav.ts", "app/admin/BackOfficeNav.tsx", "app/admin/layout.tsx"]) {
    const text = src(file);
    assert.ok(!/[–—]/.test(text), `${file}: no long dashes`);
    assert.ok(!/500-8898|19035008898|@theleadflowpro\.com/.test(text), `${file}: no hard-coded contact details`);
  }
  assert.equal(MENU_ID, "back-office-menu");
  assert.match(src("app/admin/BackOfficeNav.tsx"), /<details id=\{MENU_ID\}/);
  assert.match(src("app/admin/AdminMenuCloser.tsx"), /menu\.open = false/);
});
