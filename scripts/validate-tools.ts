// The gate. Runs before every build.
//
// Run: npm run validate:tools
//
// Checks the registry itself, then checks that every published tool actually has
// the artwork it claims to have. A published tool that is missing metadata, a
// formula, instructions, a disclaimer or an image stops the build here rather
// than shipping as a broken card.

import { existsSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { createHash } from "node:crypto";
import { ALL_TOOLS, TOOLS } from "../lib/tools/index.ts";
import { ALL_PRO_TOOLS, PRO_TOOLS } from "../lib/tools/pro/index.ts";
import { validateTools, formatProblems, type Problem } from "../lib/tools/validate.ts";
import { validateProTools } from "../lib/tools/pro/validate.ts";

const ROOT = process.cwd();

// Pro kits go through the same registry rules as the free library, then
// through the extra rules that apply once somebody is paying for the result.
const problems: Problem[] = [
  ...validateTools([...ALL_TOOLS, ...ALL_PRO_TOOLS]),
  ...validateProTools(ALL_PRO_TOOLS),
];

/* ------------------------------ artwork checks ----------------------------- */

const MIN_BYTES = 250;
const MAX_BYTES = 120_000;
const hashes = new Map<string, string[]>();

for (const tool of [...TOOLS, ...PRO_TOOLS]) {
  for (const [label, img] of [["card", tool.image], ["hero", tool.hero]] as const) {
    const rel = img.src.replace(/^\//, "");
    const abs = join(ROOT, "public", rel);

    if (!existsSync(abs)) {
      problems.push({ slug: tool.slug, field: `${label} image`, message: `missing file public/${rel}. Run npm run art.` });
      continue;
    }

    const svg = readFileSync(abs, "utf8");

    if (svg.length < MIN_BYTES) {
      problems.push({ slug: tool.slug, field: `${label} image`, message: "file is too small to be real artwork" });
    }
    if (Buffer.byteLength(svg, "utf8") > MAX_BYTES) {
      problems.push({ slug: tool.slug, field: `${label} image`, message: "file is larger than the 120 KB budget" });
    }

    const w = /\bwidth="(\d+)"/.exec(svg);
    const h = /\bheight="(\d+)"/.exec(svg);
    if (!w || !h) {
      problems.push({ slug: tool.slug, field: `${label} image`, message: "SVG has no explicit width and height, which causes layout shift" });
    } else {
      if (Number(w[1]) !== img.width || Number(h[1]) !== img.height) {
        problems.push({
          slug: tool.slug,
          field: `${label} image`,
          message: `is ${w[1]}x${h[1]} but the registry declares ${img.width}x${img.height}`,
        });
      }
      const ratio = Number(w[1]) / Number(h[1]);
      const wantRatio = img.width / img.height;
      if (Math.abs(ratio - wantRatio) > 0.01) {
        problems.push({ slug: tool.slug, field: `${label} image`, message: "aspect ratio does not match the declared size" });
      }
      if (label === "card" && Number(w[1]) < 1200) {
        problems.push({ slug: tool.slug, field: "card image", message: "card source must be at least 1200 wide" });
      }
      if (label === "hero" && Number(w[1]) < 1600) {
        problems.push({ slug: tool.slug, field: "hero image", message: "hero source must be at least 1600 wide" });
      }
    }

    if (/https?:\/\/(?!www\.w3\.org)/.test(svg)) {
      problems.push({ slug: tool.slug, field: `${label} image`, message: "references a remote URL. Artwork must be self contained." });
    }

    if (!img.alt?.trim()) {
      problems.push({ slug: tool.slug, field: `${label} image`, message: "missing alt text" });
    }

    if (label === "card") {
      const digest = createHash("sha256").update(svg).digest("hex");
      const list = hashes.get(digest);
      if (list) list.push(tool.slug);
      else hashes.set(digest, [tool.slug]);
    }
  }
}

// Two unrelated tools drawing byte-identical art means the generator lost its
// per-tool variation, which would make the whole catalogue look duplicated.
for (const [, slugs] of hashes) {
  if (slugs.length > 1) {
    problems.push({
      slug: slugs[0],
      field: "card image",
      message: `identical artwork shared with: ${slugs.slice(1).join(", ")}`,
    });
  }
}

/* --------------------------------- report ---------------------------------- */

const counts = [...ALL_TOOLS, ...ALL_PRO_TOOLS].reduce<Record<string, number>>((acc, t) => {
  acc[t.status] = (acc[t.status] || 0) + 1;
  return acc;
}, {});

if (problems.length) {
  console.error(`\ntool registry: ${problems.length} problem(s)\n`);
  console.error(formatProblems(problems));
  console.error("");
  process.exit(1);
}

console.log(
  `tool registry OK: ${TOOLS.length} free published, ${PRO_TOOLS.length} pro kit(s) (${Object.entries(counts)
    .map(([k, v]) => `${k}: ${v}`)
    .join(", ")})`,
);
