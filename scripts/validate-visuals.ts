// Enforces the per-tool visuals map (lib/tools/visuals.ts).
//
// Run: npm run validate:visuals   (also part of npm run build)
//
// The rules, exactly as the map's header states them:
//   1. Every published tool has a visuals entry.
//   2. No entry points at a slug that no longer exists.
//   3. Each OG layout family is used at least 5 and at most 13 times.
//   4. All six accents are used, each between 8 and 20 times.
//   5. Every referenced asset file (card, hero, OG) exists and is non-empty.

import { statSync } from "node:fs";
import { join } from "node:path";
import { ALL_TOOLS } from "../lib/tools/index.ts";
import { TOOL_VISUALS, OG_LAYOUTS } from "../lib/tools/visuals.ts";

const PUBLIC = join(process.cwd(), "public");
const errors: string[] = [];

const slugs = new Set(ALL_TOOLS.map((t) => t.slug));

for (const tool of ALL_TOOLS) {
  if (!TOOL_VISUALS[tool.slug]) errors.push(`no visuals entry for published tool "${tool.slug}"`);
}
for (const slug of Object.keys(TOOL_VISUALS)) {
  if (!slugs.has(slug)) errors.push(`visuals entry "${slug}" points at no published tool`);
}

const layoutCounts = new Map<string, number>();
const accentCounts = new Map<number, number>();

for (const [slug, v] of Object.entries(TOOL_VISUALS)) {
  layoutCounts.set(v.ogLayout, (layoutCounts.get(v.ogLayout) || 0) + 1);
  accentCounts.set(v.colorAccent, (accentCounts.get(v.colorAccent) || 0) + 1);

  for (const rel of [v.cardImage, v.heroImage, v.ogImage]) {
    try {
      if (statSync(join(PUBLIC, rel)).size === 0) errors.push(`${slug}: asset is empty: ${rel}`);
    } catch {
      errors.push(`${slug}: asset file missing: ${rel}`);
    }
  }
  if (!v.ogHook || !v.ogHook.trim()) errors.push(`${slug}: ogHook is empty — every OG card carries words`);
}

for (const layout of OG_LAYOUTS) {
  const n = layoutCounts.get(layout) || 0;
  if (n < 5 || n > 13) errors.push(`OG layout "${layout}" used ${n} times, expected 5 to 13`);
}
for (let accent = 1; accent <= 6; accent++) {
  const n = accentCounts.get(accent) || 0;
  if (n < 8 || n > 20) errors.push(`accent ${accent} used ${n} times, expected 8 to 20`);
}

if (errors.length) {
  console.error(`visuals: ${errors.length} problem(s)`);
  for (const e of errors) console.error(`  - ${e}`);
  process.exit(1);
}
console.log(`visuals: ${Object.keys(TOOL_VISUALS).length} entries valid, all assets present`);
