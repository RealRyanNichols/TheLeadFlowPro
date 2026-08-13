// Flags near-duplicate scenes so the set never reads as one template.
//
//   node scripts/art-similarity.mjs [threshold]
//
// Renders every art/scenes/*.svg to a 64x36 thumbnail in one Chromium page,
// then compares every pair by mean per-pixel channel distance over SUBJECT
// pixels — positions that are near-white ground in both thumbnails are
// skipped, because the shared light background otherwise dominates the mean
// and makes every pair look alike. Pairs scoring under the threshold
// (default 12 of 255 on subject pixels) are reported and the run fails.
// Scenes in the same accent family share a palette, so some closeness is
// expected — the threshold catches shared skeletons, not shared colors.
//
// Calibration, Aug 2026, against the authored 86-scene set: visually distinct
// scenes bottom out at 12.4 on this metric (the low pairs were eyeballed at
// full size and share nothing), while a true clone — same skeleton, one glyph
// swapped — scores in the low single digits. 12 is the floor with a hair of
// margin; if a rework pushes legitimate pairs under it, look at them at full
// size before loosening anything.

import { readdirSync, existsSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { chromium } from "playwright";

const ROOT = process.cwd();
const SCENES = join(ROOT, "art", "scenes");
const THRESHOLD = Number(process.argv[2] || 12);

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
}, slugs.map((s) => [
  s,
  // data: URI — Chromium refuses file:// subresources on about:blank pages.
  `data:image/svg+xml;base64,${readFileSync(join(SCENES, `${s}.svg`)).toString("base64")}`,
]));

await browser.close();

const GROUND = 232; // all channels above this reads as the light page ground
const dist = (a, b) => {
  let sum = 0;
  let n = 0;
  for (let i = 0; i < a.length; i += 4) {
    const aGround = a[i] > GROUND && a[i + 1] > GROUND && a[i + 2] > GROUND;
    const bGround = b[i] > GROUND && b[i + 1] > GROUND && b[i + 2] > GROUND;
    if (aGround && bGround) continue;
    sum += Math.abs(a[i] - b[i]) + Math.abs(a[i + 1] - b[i + 1]) + Math.abs(a[i + 2] - b[i + 2]);
    n++;
  }
  // Two nearly-empty canvases have no subject pixels to compare; call them
  // identical rather than dividing by zero.
  return n === 0 ? 0 : sum / (n * 3);
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
