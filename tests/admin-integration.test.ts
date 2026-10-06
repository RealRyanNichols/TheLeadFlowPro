import test from "node:test";
import assert from "node:assert/strict";
import { MENU_LINKS, CALL_SHEET_HREF } from "../app/admin/backOfficeNav.ts";
import { adminGroupsFor, destinationActive, primaryDestinationsFor } from "../app/admin/adminNavigation.ts";
import { ownerDashboardLoginFor } from "../lib/adminOwnerAccess.ts";
import { safeOwnerView } from "../lib/adminOwnerViews.ts";

test("all canonical admin and extra staff destinations remain reachable", () => {
  const links = adminGroupsFor(true).flatMap(group => group.items.map(item => item.href));
  for (const original of [...MENU_LINKS.map(link => link.href), CALL_SHEET_HREF, "/admin/sales/pipeline", "/admin/sales/delivery"])
    assert(links.includes(original), `Missing original destination: ${original}`);
  assert.equal(new Set(links).size, links.length, "Each sidebar destination appears once");
  assert.equal(links.filter(link => link.includes("view=connections")).length, 1);
});

test("native and staff role boundaries do not become owner access", () => {
  const plainAdmin = adminGroupsFor(false).flatMap(group => group.items.map(item => item.href));
  assert(!plainAdmin.some(href => href.startsWith("/admin/overview")));
  const staff = adminGroupsFor(false, "sales").flatMap(group => group.items.map(item => item.href));
  assert(staff.includes("/admin/sales/pipeline"));
  assert(staff.includes("/admin/sales/delivery"));
  assert(!staff.includes("/admin/settings"));
  assert(!staff.includes("/admin"));
  assert(!staff.some(href => href.includes("/admin/overview")));
});

test("only exact existing owner mappings are accepted", () => {
  const map = "owner@leadflow.test:ryan, strategist@leadflow.test:pat, dental@leadflow.test:amanda";
  assert.equal(ownerDashboardLoginFor(" OWNER@LEADFLOW.TEST ", map), "ryan");
  assert.equal(ownerDashboardLoginFor("strategist@leadflow.test", map), "pat");
  assert.equal(ownerDashboardLoginFor("dental@leadflow.test", map), null);
  assert.equal(ownerDashboardLoginFor("other@leadflow.test", map), null);
  assert.equal(ownerDashboardLoginFor(null, map), null);
});

test("view inputs and deep active routes stay bounded and unambiguous", () => {
  assert.equal(safeOwnerView("connections"), "connections");
  assert.equal(safeOwnerView("__proto__"), "today");
  assert.equal(safeOwnerView("../../private"), "today");
  assert.equal(destinationActive("/admin/sales", "/admin/sales/uncalled"), false);
  assert.equal(destinationActive("/admin/sales/uncalled", "/admin/sales/uncalled"), true);
  assert.equal(destinationActive("/admin/sales/pipeline", "/admin/sales/pipeline"), true);
  assert.equal(destinationActive("/admin/overview?view=plan", "/admin/overview", "plan"), true);
  assert.equal(destinationActive("/admin/overview", "/admin/overview", "plan"), false);
});

test("daily navigation is five destinations while directory and search keep canonical routes", () => {
 const primary=primaryDestinationsFor(true);assert.equal(primary.length,5);assert.deepEqual(primary.map(x=>x.label),["Today","Sales","Clients","Analytics","Operations"]);
 const all=adminGroupsFor(true).flatMap(g=>g.items.map(i=>i.href));for(const p of primary)assert(all.includes(p.href));
 assert(!primaryDestinationsFor(false).some(x=>x.href.startsWith("/admin/overview")));
 assert(!primaryDestinationsFor(false,"sales").some(x=>x.href==="/admin/settings"));
});
