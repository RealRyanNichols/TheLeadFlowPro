// Scaffold an approved backlog item into the tool registry.
//
//   npm run tool:new -- --list
//   npm run tool:new -- --spec content/tools/specs/<slug>.json
//   npm run tool:new -- --spec ... --out build/tools --no-wire   (dry run)
//
// The spec's slug must be an approved item in content/tools/backlog.json.
// A free tool lands in lib/tools/batches/<slug>.ts with status "proposed"
// and is wired into lib/tools/new.ts; a pro kit lands in lib/tools/pro/kits/
// and is wired into its index. Nothing becomes routable until the status is
// changed to "published" after the formula source, the known-value test,
// and the artwork exist. The script never sets "published".

import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { join, resolve } from "node:path";
import { ALL_TOOLS } from "../lib/tools/index.ts";
import { ALL_PRO_TOOLS } from "../lib/tools/pro/index.ts";
import { backlogProblems, canScaffold, loadBacklog, type BacklogItem } from "../lib/tools/backlog.ts";
import { TOOL_CTA_LANE_IDS } from "../lib/tools/cta.ts";
import { PRO_PRICES } from "../lib/tools/pro/types.ts";
import { AUDIENCE_IDS, DISCLAIMER_IDS, DOMAIN_IDS, GOAL_IDS, INDUSTRY_IDS, TOOL_TYPE_IDS } from "../lib/tools/taxonomy.ts";

export type ToolSpec = {
  slug: string;
  kind: "free" | "pro";
  emoji: string;
  tagline: string;
  description: string;
  who: string;
  problem: string;
  payoff: string;
  steps: string[];
  domain: string;
  goals: string[];
  industries: string[];
  audiences: string[];
  keywords: string[];
  disclaimer: string;
  dataSensitivity: "none" | "personal" | "sensitive";
  fields: { id: string; label: string; type: "money" | "number" | "text"; def: number | string; suffix?: string; help?: string }[];
  formulaSource: string;
  pro?: { priceUsd: number; promise: string; kit: string[]; upgradeFrom: string[]; freePreview: string };
};

const BANNED = ["guarantee", "#1", "best in", "double your", "triple your", "—", "–"];

export function specProblems(spec: ToolSpec, backlog: BacklogItem[]): string[] {
  const problems: string[] = [];
  const bad = (m: string) => problems.push(m);
  const item = backlog.find((b) => b.slug === spec.slug);
  if (!item) bad(`slug "${spec.slug}" is not in content/tools/backlog.json; add it there first`);
  else {
    const gate = canScaffold(item);
    if (!gate.ok) bad(`backlog item is ${gate.reason}`);
    if (item.kind !== spec.kind) bad(`backlog says kind ${item.kind}, spec says ${spec.kind}`);
  }
  if (spec.slug === "replace-with-backlog-slug" || spec.slug?.startsWith("replace-with")) bad("slug is still the template placeholder");
  if (!spec.emoji?.trim()) bad("emoji missing");
  if ((spec.tagline ?? "").length < 10) bad("tagline too short");
  if ((spec.description ?? "").length < 60) bad("description needs 60+ characters");
  for (const k of ["who", "problem", "payoff", "formulaSource"] as const) if (!spec[k]?.trim()) bad(`${k} missing`);
  if (!Array.isArray(spec.steps) || spec.steps.length < 2) bad("at least two steps");
  if (!(DOMAIN_IDS as readonly string[]).includes(spec.domain)) bad(`unknown domain "${spec.domain}"`);
  for (const g of spec.goals ?? []) if (!(GOAL_IDS as readonly string[]).includes(g)) bad(`unknown goal "${g}"`);
  for (const i of spec.industries ?? []) if (!(INDUSTRY_IDS as readonly string[]).includes(i)) bad(`unknown industry "${i}"`);
  for (const a of spec.audiences ?? []) if (!(AUDIENCE_IDS as readonly string[]).includes(a)) bad(`unknown audience "${a}"`);
  if (!spec.goals?.length || !spec.industries?.length || !spec.audiences?.length) bad("goals, industries, and audiences each need one entry");
  if ((spec.keywords ?? []).length < 3) bad("at least three keywords");
  if (!(DISCLAIMER_IDS as readonly string[]).includes(spec.disclaimer)) bad(`unknown disclaimer "${spec.disclaimer}"`);
  if (!["none", "personal", "sensitive"].includes(spec.dataSensitivity)) bad("dataSensitivity must be none, personal, or sensitive");
  if (!Array.isArray(spec.fields) || spec.fields.length === 0) bad("at least one field");
  else {
    const ids = new Set<string>();
    for (const f of spec.fields) {
      if (!/^[a-z][a-z0-9_]*$/.test(f.id ?? "")) bad(`field id "${f.id}" must be snake_case`);
      if (ids.has(f.id)) bad(`duplicate field id "${f.id}"`);
      ids.add(f.id);
      if (!["money", "number", "text"].includes(f.type)) bad(`field "${f.id}": type must be money, number, or text`);
      if (!f.label?.trim()) bad(`field "${f.id}" needs a label`);
    }
  }
  if (spec.kind === "pro") {
    const p = spec.pro;
    if (!p) bad("a pro kit needs the pro block");
    else {
      if (!(PRO_PRICES as readonly number[]).includes(p.priceUsd)) bad(`pro.priceUsd must be one of ${PRO_PRICES.join(", ")}`);
      if (!p.promise?.trim()) bad("pro.promise missing");
      if ((p.kit ?? []).length < 3) bad("pro.kit lists at least three things");
      if (!(p.upgradeFrom ?? []).length) bad("pro.upgradeFrom names at least one free tool");
      for (const s of p.upgradeFrom ?? []) if (!ALL_TOOLS.some((t) => t.slug === s && t.status === "published")) bad(`pro.upgradeFrom "${s}" is not a published free tool`);
      if (!p.freePreview?.trim()) bad("pro.freePreview missing");
    }
  }
  const text = [spec.tagline, spec.description, spec.who, spec.problem, spec.payoff, ...(spec.steps ?? []), spec.pro?.promise ?? ""].join(" ").toLowerCase();
  for (const b of BANNED) if (text.includes(b)) bad(`copy must not contain "${b}"`);
  if (ALL_TOOLS.some((t) => t.slug === spec.slug) || ALL_PRO_TOOLS.some((t) => t.slug === spec.slug)) bad(`"${spec.slug}" already exists in the registry`);
  return problems;
}

const q = (s: string) => JSON.stringify(s);
const constName = (slug: string) => slug.replace(/-([a-z0-9])/g, (_, c: string) => c.toUpperCase()).replace(/^[a-z]/, (c) => c.toUpperCase());

function fieldLines(spec: ToolSpec): string {
  return spec.fields
    .map((f) => {
      const extra = [f.suffix ? `suffix: ${q(f.suffix)}` : "", f.help ? `help: ${q(f.help)}` : ""].filter(Boolean).join(", ");
      return `      { id: ${q(f.id)}, label: ${q(f.label)}, type: ${q(f.type)}, def: ${typeof f.def === "string" ? q(f.def) : f.def}${extra ? `, ${extra}` : ""} },`;
    })
    .join("\n");
}

function metaLines(spec: ToolSpec, item: BacklogItem): string {
  return [
    `    domain: ${q(spec.domain)},`,
    `    toolType: ${q(item.toolType)},`,
    `    goals: ${JSON.stringify(spec.goals)},`,
    `    industries: ${JSON.stringify(spec.industries)},`,
    `    audiences: ${JSON.stringify(spec.audiences)},`,
    `    keywords: ${JSON.stringify(spec.keywords)},`,
    `    disclaimer: ${q(spec.disclaimer)},`,
    `    dataSensitivity: ${q(spec.dataSensitivity)},`,
    `    popularity: 50,`,
    `    isNew: true,`,
    `    cta: ${q(item.cta)},`,
    `    // Proposed. Set to "published" only after the formula source, the known-value test, and the artwork exist.`,
    `    status: "proposed",`,
  ].join("\n");
}

export function renderFreeTool(spec: ToolSpec, item: BacklogItem): string {
  const name = constName(spec.slug);
  return `// ${item.name}.
//
// Scaffolded from content/tools/specs/${spec.slug}.json on ${new Date().toISOString().slice(0, 10)}.
// Backlog approval: ${item.approvedBy} on ${item.approvedOn}.
// Formula source: ${spec.formulaSource}
//
// TODO before publishing: write run(), add a known-value test in
// tests/formulas.test.ts, record the source in docs/TOOL_FORMULA_SOURCES.md,
// run \`npm run art\`, then set status to "published".

import { type ToolDef, num, str } from "../types";

export const ${name}: ToolDef[] = [
  {
    slug: ${q(spec.slug)},
    name: ${q(item.name)},
    emoji: ${q(spec.emoji)},
    category: ${q(item.category)},
    tagline: ${q(spec.tagline)},
    description: ${q(spec.description)},
    who: ${q(spec.who)},
    problem: ${q(spec.problem)},
    payoff: ${q(spec.payoff)},
    steps: ${JSON.stringify(spec.steps)},
${metaLines(spec, item)}
    fields: [
${fieldLines(spec)}
    ],
    run(v) {
      // Formula pending review. The inputs are read so the shape is checked.
      void num(v, ${q(spec.fields[0]?.id ?? "input")});
      void str(v, ${q(spec.fields[0]?.id ?? "input")});
      return { note: "This tool is in formula review and is not published yet." };
    },
  },
];
`;
}

export function renderProKit(spec: ToolSpec, item: BacklogItem): string {
  const p = spec.pro!;
  return `// ${item.name}.
//
// Scaffolded from content/tools/specs/${spec.slug}.json on ${new Date().toISOString().slice(0, 10)}.
// Backlog approval: ${item.approvedBy} on ${item.approvedOn}.
// Formula source: ${spec.formulaSource}
//
// TODO before publishing: write run() so it returns documents built from the
// buyer's own numbers, add a known-value test, write the artwork brief,
// run \`npm run art\`, then set status to "published".

import { num, str, type ToolVisual } from "../../types";
import type { ProToolDef } from "../types";

export const KIT: ProToolDef = {
  slug: ${q(spec.slug)},
  name: ${q(item.name)},
  emoji: ${q(spec.emoji)},
  category: ${q(item.category)},
  tagline: ${q(spec.tagline)},
  description: ${q(spec.description)},
  who: ${q(spec.who)},
  problem: ${q(spec.problem)},
  payoff: ${q(spec.payoff)},
  steps: ${JSON.stringify(spec.steps)},
${metaLines(spec, item).replace(/^ {4}/gm, "  ")}
  fields: [
${fieldLines(spec).replace(/^ {6}/gm, "    ")}
  ],
  pro: {
    priceUsd: ${p.priceUsd},
    promise: ${q(p.promise)},
    kit: ${JSON.stringify(p.kit)},
    upgradeFrom: ${JSON.stringify(p.upgradeFrom)},
    freePreview: ${q(p.freePreview)},
  },
  run(v) {
    void num(v, ${q(spec.fields[0]?.id ?? "input")});
    void str(v, ${q(spec.fields[0]?.id ?? "input")});
    return { note: "This kit is in formula review and is not published yet." };
  },
};

export const VISUAL: ToolVisual = {
  visualConcept: "TODO: one sentence describing the picture; the real-world problem decides it.",
  visualFamily: "money-flow",
  primarySubject: "TODO",
  supportingSubjects: [],
  sceneType: "still-life",
  composition: "TODO",
  colorAccent: 1,
  cardImage: "/tools-art/card/${spec.slug}.svg",
  cardImageAlt: "",
  heroImage: "/tools-art/hero/${spec.slug}.svg",
  heroImageAlt: "TODO",
  ogImage: "/og/tools/${spec.slug}.jpg",
  ogLayout: "big-number",
};
`;
}

export function scaffoldTool(spec: ToolSpec, backlog: BacklogItem[], opts: { outRoot?: string; wire?: boolean } = {}): { file: string; wired: boolean } {
  const problems = specProblems(spec, backlog);
  if (problems.length) throw new Error(`spec is not ready:\n${problems.map((p) => `  ${p}`).join("\n")}`);
  const item = backlog.find((b) => b.slug === spec.slug)!;
  const root = opts.outRoot ?? process.cwd();
  const wire = opts.wire ?? true;
  if (spec.kind === "free") {
    const dir = join(root, "lib/tools/batches");
    mkdirSync(dir, { recursive: true });
    const file = join(dir, `${spec.slug}.ts`);
    if (existsSync(file)) throw new Error(`${file} already exists`);
    writeFileSync(file, renderFreeTool(spec, item));
    if (wire) {
      const indexPath = join(root, "lib/tools/new.ts");
      const src = readFileSync(indexPath, "utf8");
      const name = constName(spec.slug);
      const next = src
        .replace("// factory:imports", `import { ${name} } from "./batches/${spec.slug}";\n// factory:imports`)
        .replace("  // factory:tools", `  ...${name},\n  // factory:tools`);
      writeFileSync(indexPath, next);
    }
    return { file, wired: wire };
  }
  const dir = join(root, "lib/tools/pro/kits");
  mkdirSync(dir, { recursive: true });
  const file = join(dir, `${spec.slug}.ts`);
  if (existsSync(file)) throw new Error(`${file} already exists`);
  writeFileSync(file, renderProKit(spec, item));
  if (wire) {
    const indexPath = join(root, "lib/tools/pro/kits/index.ts");
    const src = readFileSync(indexPath, "utf8");
    const alias = constName(spec.slug).replace(/^[A-Z]/, (c) => c.toLowerCase());
    const next = src
      .replace("// factory:imports", `import * as ${alias} from "./${spec.slug}";\n// factory:imports`)
      .replace("  // factory:kits", `  ${alias},\n  // factory:kits`);
    writeFileSync(indexPath, next);
  }
  return { file, wired: wire };
}

function arg(name: string): string | undefined {
  const i = process.argv.indexOf(`--${name}`);
  return i >= 0 ? process.argv[i + 1] : undefined;
}

if (process.argv[1] && resolve(process.argv[1]).endsWith("new-tool.ts")) {
  const backlog = loadBacklog();
  const existing = new Set([...ALL_TOOLS.map((t) => t.slug), ...ALL_PRO_TOOLS.map((t) => t.slug)]);
  const problems = backlogProblems(backlog, existing);
  if (problems.length) {
    console.error("content/tools/backlog.json has problems:");
    for (const p of problems) console.error(`  ${p}`);
    process.exit(1);
  }
  if (process.argv.includes("--list")) {
    for (const it of backlog) console.log(`${it.status.padEnd(10)} ${it.kind.padEnd(4)} ${it.slug.padEnd(40)} ${it.cta.padEnd(10)} ${it.name}`);
    console.log(`\n${backlog.length} items. Approve one by setting status, approvedBy, and approvedOn in the file.`);
    process.exit(0);
  }
  const specPath = arg("spec");
  if (!specPath) {
    console.error("usage: npm run tool:new -- --spec content/tools/specs/<slug>.json [--out <dir>] [--no-wire]");
    process.exit(2);
  }
  const spec = JSON.parse(readFileSync(resolve(specPath), "utf8")) as ToolSpec;
  try {
    const r = scaffoldTool(spec, backlog, { outRoot: arg("out") ? resolve(arg("out")!) : undefined, wire: !process.argv.includes("--no-wire") });
    console.log(`Scaffolded ${spec.slug} at ${r.file}${r.wired ? " and wired it in" : " (not wired)"}.`);
    console.log("\nNext, in order:");
    console.log("  1. Write run() and a known-value test (tests/formulas.test.ts).");
    console.log("  2. Record the formula source in docs/TOOL_FORMULA_SOURCES.md.");
    console.log("  3. npm run art, then npm run validate:tools.");
    console.log("  4. Ryan reviews the page copy; set status to \"published\"; mark the backlog item published.");
  } catch (error) {
    console.error(error instanceof Error ? error.message : error);
    process.exit(1);
  }
}
