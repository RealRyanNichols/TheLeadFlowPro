// Draws the card and hero artwork for every tool in the registry.
//
// Run: npm run art
//
// Output is committed. The files are deterministic, so re-running only rewrites
// what actually changed, and a tool whose domain or type changed gets new art
// without anyone having to remember to redraw it.

import { mkdirSync, readFileSync, writeFileSync, readdirSync, unlinkSync } from "node:fs";
import { createHash } from "node:crypto";
import { join } from "node:path";
import { ALL_TOOLS } from "../lib/tools/index.ts";
import { toolArtSvg, ART_DIMS } from "../lib/tools/art.ts";

const ROOT = process.cwd();
const CARD_DIR = join(ROOT, "public", "tools-art", "card");
const HERO_DIR = join(ROOT, "public", "tools-art", "hero");
const MANIFEST = join(ROOT, "public", "tools-art", "manifest.json");

mkdirSync(CARD_DIR, { recursive: true });
mkdirSync(HERO_DIR, { recursive: true });

type Entry = {
  slug: string;
  card: { file: string; width: number; height: number; bytes: number; sha256: string };
  hero: { file: string; width: number; height: number; bytes: number; sha256: string };
};

const sha = (s: string) => createHash("sha256").update(s).digest("hex").slice(0, 16);

const wanted = new Set<string>();
const manifest: Entry[] = [];
let written = 0;
let unchanged = 0;

for (const tool of ALL_TOOLS) {
  const entry: Partial<Entry> = { slug: tool.slug };

  for (const [variant, dir] of [["card", CARD_DIR], ["hero", HERO_DIR]] as const) {
    const svg = toolArtSvg({
      slug: tool.slug,
      domain: tool.domain,
      toolType: tool.toolType,
      variant,
    });
    const file = join(dir, `${tool.slug}.svg`);
    wanted.add(file);

    let existing: string | null = null;
    try {
      existing = readFileSync(file, "utf8");
    } catch {
      /* first draw */
    }
    if (existing === svg) unchanged++;
    else {
      writeFileSync(file, svg, "utf8");
      written++;
    }

    const dims = ART_DIMS[variant];
    entry[variant] = {
      file: `/tools-art/${variant}/${tool.slug}.svg`,
      width: dims.w,
      height: dims.h,
      bytes: Buffer.byteLength(svg, "utf8"),
      sha256: sha(svg),
    };
  }

  manifest.push(entry as Entry);
}

// Art for a tool that no longer exists is dead weight in the repo and would
// quietly pass the "file exists" check forever.
let removed = 0;
for (const dir of [CARD_DIR, HERO_DIR]) {
  for (const name of readdirSync(dir)) {
    const full = join(dir, name);
    if (name.endsWith(".svg") && !wanted.has(full)) {
      unlinkSync(full);
      removed++;
    }
  }
}

writeFileSync(
  MANIFEST,
  `${JSON.stringify({ generated: "npm run art", count: manifest.length, tools: manifest }, null, 2)}\n`,
  "utf8",
);

console.log(
  `art: ${manifest.length} tools, ${written} file(s) written, ${unchanged} unchanged, ${removed} removed`,
);
