// Publishes the authored card and hero artwork for every tool in the registry.
//
// Run: npm run art
//
// The artwork itself is hand-authored, one original scene per tool, in
// art/scenes/<slug>.svg (see art/STYLE.md). This script publishes each scene
// to the two paths the site serves — card (1200x675) and hero (1600x900),
// the same 16:9 drawing at two declared sizes — and writes the manifest.
// A published tool with no scene fails the run: art is part of the contract.

import { mkdirSync, readFileSync, writeFileSync, readdirSync, unlinkSync } from "node:fs";
import { createHash } from "node:crypto";
import { join } from "node:path";
import { ALL_TOOLS } from "../lib/tools/index.ts";
import { ART_DIMS } from "../lib/tools/art.ts";

const ROOT = process.cwd();
const SCENE_DIR = join(ROOT, "art", "scenes");
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

/** The scene at a declared size: rewrite the root tag, keep the drawing. */
function sized(scene: string, w: number, h: number): string {
  const open = scene.match(/<svg\b[^>]*>/);
  if (!open) throw new Error("no <svg> root tag");
  const viewBox = open[0].match(/viewBox="([^"]+)"/)?.[1];
  if (viewBox !== "0 0 1600 900") throw new Error(`viewBox is "${viewBox}", expected "0 0 1600 900"`);
  return scene.replace(
    open[0],
    `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 1600 900" width="${w}" height="${h}">`,
  );
}

const wanted = new Set<string>();
const missing: string[] = [];
const manifest: Entry[] = [];
let written = 0;
let unchanged = 0;

for (const tool of ALL_TOOLS) {
  let scene: string;
  try {
    scene = readFileSync(join(SCENE_DIR, `${tool.slug}.svg`), "utf8");
  } catch {
    missing.push(tool.slug);
    continue;
  }
  if (scene.includes("<text") || scene.includes("<image")) {
    throw new Error(`${tool.slug}: scenes must not contain <text> or raster <image> elements`);
  }

  const entry: Partial<Entry> = { slug: tool.slug };
  for (const [variant, dir] of [["card", CARD_DIR], ["hero", HERO_DIR]] as const) {
    const dims = ART_DIMS[variant];
    const svg = sized(scene, dims.w, dims.h);
    const file = join(dir, `${tool.slug}.svg`);
    wanted.add(file);

    let existing: string | null = null;
    try {
      existing = readFileSync(file, "utf8");
    } catch {
      /* first publish */
    }
    if (existing === svg) unchanged++;
    else {
      writeFileSync(file, svg, "utf8");
      written++;
    }

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

if (missing.length) {
  console.error(`art: ${missing.length} published tool(s) have no scene in art/scenes:`);
  for (const slug of missing) console.error(`  - ${slug}`);
  process.exit(1);
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
