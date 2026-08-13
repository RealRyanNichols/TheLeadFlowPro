// Flags near-duplicate scenes so the set never reads as one template.
//
//   node scripts/art-similarity.mjs [threshold]
//
// Renders every art/scenes/*.svg to a 64x36 thumbnail in one Chromium page,
// then compares every pair by mean per-pixel channel distance. Pairs scoring
// under the threshold (default 18 of 255) are reported and the run fails.
// Scenes in the same accent family share a palette, so some closeness is
// expected — the threshold catches shared skeletons, not shared colors.

import { readdirSync, existsSync } from "node:fs";
import { join } from "node:path";
import { chromium } from "playwright";

const ROOT = process.cwd();
const SCENES = join(ROOT, "art", "scenes");
const THRESHOLD = Number(process.argv[2] || 18);

const slugs = readdirSync(SCENES).filter((f) => f.endsWith(".svg")).map((f) => f.replace(/\.svg$/, "")).sort();
if (!slugs.length) {
  console.error("no scenes found in art/scenes");
  process.exit(1);
}

const PREINSTALLED = "/opt/pw-browsers/chromium";
const executablePath = existsSync(PREINSTALLED) ? PREINSTALLED : undefined;
const browser = await chromium.launch({ executablePath, args: ["--no-sandbox", "--disable-dev-shm-usage"] });
const page = await browser.newPage({ viewport: { width: 100, height: 100 } });

const thumbs = await page.evaluate(async (files) => {
  const W = 64, H = 36;
  const canvas = document.createElement("canvas");
  canvas.width = W; canvas.height = H;
  const ctx = canvas.getContext("2d", { willReadFrequently: true });
  const out = {};
  for (const [slug, url] of files) {
    const img = new Image();
    await new Promise((res, rej) => { img.onload = res; img.onerror = () => rej(new Error(slug)); img.src = url; });
    ctx.fillStyle = "#fff";
    ctx.fillRect(0, 0, W, H);
    ctx.drawImage(img, 0, 0, W, H);
    out[slug] = Array.from(ctx.getImageData(0, 0, W, H).data);
  }
  return out;
}, slugs.map((s) => [s, `file://${SCENES}/${s}.svg`]));

await browser.close();

const dist = (a, b) => {
  let sum = 0;
  for (let i = 0; i < a.length; i += 4) {
    sum += Math.abs(a[i] - b[i]) + Math.abs(a[i + 1] - b[i + 1]) + Math.abs(a[i + 2] - b[i + 2]);
  }
  return sum / ((a.length / 4) * 3);
};

const close = [];
for (let i = 0; i < slugs.length; i++) {
  for (let j = i + 1; j < slugs.length; j++) {
    const d = dist(thumbs[slugs[i]], thumbs[slugs[j]]);
    if (d < THRESHOLD) close.push({ a: slugs[i], b: slugs[j], d: Math.round(d * 10) / 10 });
  }
}

close.sort((x, y) => x.d - y.d);
if (close.length) {
  console.error(`similarity: ${close.length} pair(s) under threshold ${THRESHOLD}:`);
  for (const p of close) console.error(`  ${p.d}  ${p.a} ~ ${p.b}`);
  process.exit(1);
}
console.log(`similarity: ${slugs.length} scenes, all pairwise distances >= ${THRESHOLD}`);
