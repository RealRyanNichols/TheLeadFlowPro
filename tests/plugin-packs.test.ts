import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import test from "node:test";
import { INDUSTRIES } from "../app/hq/_components/options.ts";
import { VERTICAL_PACKS, marketablePacks, packAudit, packForWorkspace, packStatus, requestNoun, verticalPack } from "../lib/hq/verticals.ts";
import { textBack, followUp } from "../lib/hq/drafts.ts";
import { copyProblems } from "../lib/hq/copy.ts";
import { PUBLIC_PAGE_CATALOG } from "../lib/publicPageCatalog.ts";
import { TBD_PRICE_LABEL, offer } from "../lib/site/offers.ts";
import { lead, workspace } from "./fixtures/hq.ts";

const MCP_TOOLS = new Set([...readFileSync(join(process.cwd(), "lib/hq/mcp.ts"), "utf8").matchAll(/^\s{4}name: "([a-z_]+)"/gm)].map((m) => m[1]));

test("three packs, each with an offer that is TBD until Ryan prices it, every industry label real, every tool name real", () => {
  assert.deepEqual(VERTICAL_PACKS.map((p) => p.id), ["contractor", "dental_medical", "realtor"]);
  for (const p of VERTICAL_PACKS) {
    const o = offer(p.offerId);
    assert.equal(o.status, "tbd_ryan", p.id);
    assert.equal(o.priceLabel, TBD_PRICE_LABEL, p.id);
    assert.equal(o.href, `/plugin/packs/${p.id}`);
    for (const i of p.industries) assert.ok(INDUSTRIES.includes(i), `${p.id}: industry "${i}"`);
    for (const w of p.workflows) for (const t of w.tools) assert.ok(MCP_TOOLS.has(t), `${p.id}/${w.id}: tool ${t}`);
    for (const pr of p.prompts) for (const t of pr.tools) assert.ok(MCP_TOOLS.has(t), `${p.id}: prompt tool ${t}`);
    assert.ok(p.notIncluded.some((n) => /promise of/i.test(n)), `${p.id} disclaims outcomes`);
    const text = JSON.stringify(p).toLowerCase();
    for (const b of ["guarantee", "#1", "best in", "roas"]) assert.ok(!text.includes(b), `${p.id} contains ${b}`);
    for (const w of p.workflows) assert.deepEqual(copyProblems(w.does), [], w.id);
  }
});

test("a pack is real only when every workflow exists; today every pack is a draft and none is marketed", () => {
  for (const p of VERTICAL_PACKS) {
    const a = packAudit(p);
    assert.equal(a.status, "draft", p.id);
    assert.ok(a.missing.length >= 1 && a.missing.every((m) => m.missing && m.missing.length > 20), `${p.id} says what is missing`);
    assert.ok(a.existing >= 3, `${p.id} has real workflows to build on`);
  }
  assert.deepEqual(marketablePacks(), []);
  const real = { ...VERTICAL_PACKS[0], workflows: VERTICAL_PACKS[0].workflows.map((w) => ({ ...w, exists: true })) };
  assert.equal(packStatus(real), "real");
  assert.equal(verticalPack("nope"), null);
});

test("draft packs are not in the catalog or sitemap sources, and the page refuses them", () => {
  assert.ok(!PUBLIC_PAGE_CATALOG.some((p) => p.path.startsWith("/plugin/packs/")));
  const page = readFileSync(join(process.cwd(), "app/plugin/packs/[pack]/page.tsx"), "utf8");
  assert.ok(page.includes("return marketablePacks().map("));
  assert.ok(page.includes("!marketablePacks().some((p) => p.id === pack.id)) notFound()"));
  assert.ok(!/coming soon|waitlist/i.test(page));
});

test("the engine picks a pack by the workspace industry and uses its vocabulary only when a lead has no service", () => {
  assert.equal(packForWorkspace({ industry: "Roofing" })?.id, "contractor");
  assert.equal(packForWorkspace({ industry: "dental" })?.id, "dental_medical");
  assert.equal(packForWorkspace({ industry: "Real estate" })?.id, "realtor");
  assert.equal(packForWorkspace({ industry: "Bakery" }), null);
  assert.equal(packForWorkspace({ industry: null }), null);
  assert.equal(requestNoun({ industry: "Dental" }), "your appointment request");
  assert.equal(requestNoun({ industry: "Bakery" }), "your request");

  const dental = workspace({ industry: "Dental", services: ["Cleanings", "Whitening"] });
  const noService = lead({ service: null });
  assert.ok(textBack(dental, noService).body.includes("about your appointment request"));
  assert.ok(followUp(dental, noService, 0).body.includes("Following up on your appointment request"));
  const withService = lead({ service: "Whitening" });
  assert.ok(textBack(dental, withService).body.includes("about whitening"), "a named service always wins");
  const plumbing = workspace({ services: ["A", "B"] });
  assert.ok(textBack(plumbing, noService).body.includes("about your estimate request"), "the fixture plumber falls in the contractor pack");
  const bakery = workspace({ industry: "Bakery", services: ["A", "B"] });
  assert.ok(textBack(bakery, noService).body.includes("about your request"));
  for (const d of [textBack(dental, noService), followUp(dental, noService, 0)]) assert.ok(d.body.includes("Reply STOP"));
});
