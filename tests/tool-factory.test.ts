import assert from "node:assert/strict";
import { existsSync, mkdtempSync, readFileSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import test from "node:test";
import ts from "typescript";
import { backlogProblems, canScaffold, loadBacklog, type BacklogItem } from "../lib/tools/backlog.ts";
import { TOOL_CTA_LANES, toolCta, toolCtaLane } from "../lib/tools/cta.ts";
import { ALL_TOOLS, TOOLS } from "../lib/tools/index.ts";
import { ALL_PRO_TOOLS } from "../lib/tools/pro/index.ts";
import { validateTools } from "../lib/tools/validate.ts";
import { renderFreeTool, renderProKit, scaffoldTool, specProblems, type ToolSpec } from "../scripts/new-tool.ts";

const existing = new Set([...ALL_TOOLS.map((t) => t.slug), ...ALL_PRO_TOOLS.map((t) => t.slug)]);

function spec(over: Partial<ToolSpec> = {}): ToolSpec {
  return {
    slug: "crew-day-rate-calculator",
    kind: "free",
    emoji: "🚚",
    tagline: "What a crew day really costs before you quote it",
    description: "Enter wages, the truck, insurance, and the days the crew actually works, and see the real cost of one crew day and the rate that covers it.",
    who: "Owners who send a crew and a truck out every morning.",
    problem: "The day rate in the quote never includes fuel, insurance, or the idle days, so the job pays less than it looks.",
    payoff: "One number for a crew day, with the parts that make it up.",
    steps: ["Enter what the crew is paid per day.", "Enter the truck, fuel, and insurance for a month.", "Enter the working days in a normal month."],
    domain: "business-money",
    goals: ["price-a-service"],
    industries: ["general-contracting"],
    audiences: ["owners"],
    keywords: ["crew day rate", "truck cost per day", "labor day rate"],
    disclaimer: "general-estimate",
    dataSensitivity: "none",
    fields: [
      { id: "crew_pay", label: "Crew pay per day", type: "money", def: 400 },
      { id: "vehicle_month", label: "Truck, fuel, and insurance per month", type: "money", def: 1800 },
      { id: "days", label: "Working days per month", type: "number", def: 20, suffix: "days" },
    ],
    formulaSource: "Owner-entered inputs; crew day cost = crew pay + monthly vehicle cost divided by working days.",
    ...over,
  };
}

const approved = (): BacklogItem[] => loadBacklog().map((b) => (b.slug === "crew-day-rate-calculator" ? { ...b, status: "approved", approvedBy: "Test", approvedOn: "2026-09-17" } : b));

test("the backlog is valid, aimed at named pains, and nothing in it is approved yet", () => {
  const items = loadBacklog();
  assert.ok(items.length >= 8);
  assert.deepEqual(backlogProblems(items, existing), []);
  assert.ok(items.every((i) => i.status === "idea" && i.approvedBy === null), "approval is Ryan's, in the file");
  assert.ok(items.some((i) => i.kind === "pro") && items.some((i) => i.kind === "free"));
  assert.ok(items.every((i) => !existing.has(i.slug)), "no backlog slug collides with a live tool");
});

test("backlog rules catch collisions, bad lanes, missing approval fields, and pro items without an upgrade path", () => {
  const items = loadBacklog();
  const bad: BacklogItem[] = [
    { ...items[0], slug: "missed-call-calculator" },
    { ...items[1], cta: "start" as unknown as "agency" },
    { ...items[2], status: "approved" },
    { ...items[5], upgradeFrom: [] },
    { ...items[6], proposedPriceUsd: 25 },
  ];
  const problems = backlogProblems(bad, existing);
  assert.ok(problems.some((p) => p.includes("already exists in the tool registry")));
  assert.ok(problems.some((p) => p.includes("cta must be one of")));
  assert.ok(problems.some((p) => p.includes("needs approvedBy and approvedOn")));
  assert.ok(problems.some((p) => p.includes("names the free tools it upgrades")));
  assert.ok(problems.some((p) => p.includes("proposedPriceUsd must be one of")));
});

test("only an approved item can be scaffolded", () => {
  const item = loadBacklog()[0];
  assert.equal(canScaffold(item).ok, false);
  assert.equal(canScaffold({ ...item, status: "approved" }).ok, false, "approved without a name and date is not approved");
  assert.equal(canScaffold({ ...item, status: "approved", approvedBy: "Ryan", approvedOn: "2026-09-17" }).ok, true);
  assert.equal(canScaffold({ ...item, status: "declined" }).ok, false);
  const problems = specProblems(spec(), loadBacklog());
  assert.ok(problems.some((p) => p.includes("not approved yet")));
});

test("spec checks: taxonomy ids, fields, copy rules, kind mismatch, and existing slugs", () => {
  const backlog = approved();
  assert.deepEqual(specProblems(spec(), backlog), []);
  const p = specProblems(spec({ domain: "nope", goals: ["nope"], keywords: ["one"], fields: [{ id: "Bad Id", label: "", type: "money", def: 1 }], tagline: "Guaranteed savings", kind: "pro" }), backlog);
  for (const needle of ['unknown domain "nope"', 'unknown goal "nope"', "three keywords", "snake_case", "needs a label", 'must not contain "guarantee"', "backlog says kind free", "a pro kit needs the pro block"]) {
    assert.ok(p.some((x) => x.includes(needle)), needle);
  }
  assert.ok(specProblems(spec({ slug: "missed-call-calculator" }), backlog).some((x) => x.includes("not in content/tools/backlog.json")));
  assert.ok(specProblems(spec({ slug: "replace-with-backlog-slug" }), backlog).some((x) => x.includes("template placeholder") || x.includes("not in content")));
});

test("the emitted tool file compiles, is proposed (never published), carries the lane, and reads the spec's fields", () => {
  const backlog = approved();
  const item = backlog.find((b) => b.slug === "crew-day-rate-calculator")!;
  const src = renderFreeTool(spec(), item);
  const out = ts.transpileModule(src, { reportDiagnostics: true, compilerOptions: { module: ts.ModuleKind.ESNext, target: ts.ScriptTarget.ES2022 } });
  assert.deepEqual(out.diagnostics ?? [], []);
  assert.ok(src.includes('status: "proposed"'));
  assert.ok(!src.includes('status: "published"'));
  assert.ok(src.includes(`cta: "${item.cta}"`));
  assert.ok(src.includes('id: "crew_pay"') && src.includes('suffix: "days"'));
  assert.ok(src.includes("Backlog approval: Test on 2026-09-17"));
  assert.ok(src.includes("Formula source:"));
});

test("the emitted pro kit compiles with a valid price, an upgrade path, and TODO artwork", () => {
  const backlog = loadBacklog().map((b) => (b.slug === "after-hours-call-plan-kit" ? { ...b, status: "approved" as const, approvedBy: "Test", approvedOn: "2026-09-17" } : b));
  const item = backlog.find((b) => b.slug === "after-hours-call-plan-kit")!;
  const s = spec({
    slug: item.slug,
    kind: "pro",
    domain: "sales-marketing",
    goals: ["capture-leads"],
    industries: ["plumbing"],
    audiences: ["owners"],
    pro: { priceUsd: 19, promise: "The greeting, the text-back, and the rota, written from your hours.", kit: ["Greeting script", "Text-back", "On-call rota"], upgradeFrom: ["missed-call-calculator"], freePreview: "The cost of the calls you miss after hours." },
  });
  assert.deepEqual(specProblems(s, backlog), []);
  const src = renderProKit(s, item);
  const out = ts.transpileModule(src, { reportDiagnostics: true, compilerOptions: { module: ts.ModuleKind.ESNext, target: ts.ScriptTarget.ES2022 } });
  assert.deepEqual(out.diagnostics ?? [], []);
  assert.ok(src.includes("priceUsd: 19") && src.includes('upgradeFrom: ["missed-call-calculator"]'));
  assert.ok(src.includes('status: "proposed"') && src.includes("TODO"));
});

test("scaffolding into a scratch root writes the file and wires the markers; wiring off leaves the index alone", () => {
  const root = mkdtempSync(join(tmpdir(), "tool-factory-"));
  try {
    const backlog = approved();
    const { file, wired } = scaffoldTool(spec(), backlog, { outRoot: root, wire: false });
    assert.ok(existsSync(file) && wired === false);
    assert.throws(() => scaffoldTool(spec(), backlog, { outRoot: root, wire: false }), /already exists/);
    assert.throws(() => scaffoldTool(spec(), loadBacklog(), { outRoot: root, wire: false }), /not approved/);
  } finally {
    rmSync(root, { recursive: true, force: true });
  }
  const index = readFileSync(join(process.cwd(), "lib/tools/new.ts"), "utf8");
  assert.ok(index.includes("// factory:imports") && index.includes("// factory:tools"));
  const kits = readFileSync(join(process.cwd(), "lib/tools/pro/kits/index.ts"), "utf8");
  assert.ok(kits.includes("// factory:imports") && kits.includes("// factory:kits"));
});

test("every published tool page ends on a door into work: the free build by default, the agency intake when chosen", () => {
  assert.equal(TOOL_CTA_LANES.free_build.href, "/free-build");
  assert.equal(TOOL_CTA_LANES.agency.href, "/agency/start");
  assert.equal(toolCtaLane(undefined), "free_build");
  assert.equal(toolCtaLane("agency"), "agency");
  assert.equal(toolCtaLane("start"), "free_build");
  for (const t of TOOLS) assert.ok(["/free-build", "/agency/start"].includes(toolCta(t).href), t.slug);
  const page = readFileSync(join(process.cwd(), "app/tools/[slug]/page.tsx"), "utf8");
  assert.ok(page.includes("const cta = toolCta(tool)") && page.includes("primary={{ href: cta.href, label: cta.label }}"));
  assert.ok(!page.includes('href: "/start", label: "Map My Company"'));
  const invalid = validateTools([{ ...TOOLS[0], slug: "cta-check-tool", cta: "start" as unknown as "agency" }]);
  assert.ok(invalid.some((p) => p.field === "cta"));
  for (const lane of Object.values(TOOL_CTA_LANES)) assert.ok(!/guarantee|#1|best in|promise of leads and/i.test(`${lane.title} ${lane.body} ${lane.label}`) || lane.body.includes("not a promise"));
});
