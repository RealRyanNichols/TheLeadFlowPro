// Renders the OG share card for /hold-the-line and its offer pages.
//
// Run: node --experimental-strip-types --no-warnings --import ./scripts/register-ts.mjs scripts/generate-hold-the-line-og.ts
//
// Same approach as the tools cards in generate-og-images.ts: a designed static
// card rendered headlessly and committed, never generated at request time.
// House rules per the brand SOP: minimal text, one headline plus one short
// support line, the brand lockup, and the domain. No AI faces, no stock-photo
// robots. The motif is a shield over a held line on the dark tech ground.
//
// The accent is the Hold The Line steel-cyan #0ea5e9, deliberately not the
// Free Build blue #2563eb, so the two lanes read as different divisions of
// the same company.
//
// Output: public/og/hold-the-line.jpg, 1200x630 JPEG.

import { existsSync, mkdirSync, statSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { chromium } from "playwright";

const ROOT = process.cwd();
const OUT_DIR = join(ROOT, "public", "og");
const FONT_DIR = join(ROOT, "node_modules", "@fontsource", "inter", "files");
mkdirSync(OUT_DIR, { recursive: true });

const NAVY = "#0e1a2e";
const WHITE = "#f4f8ff";
const SUB = "#c3d0e4";
const DIM = "#8299b8";
const STEEL = "#0ea5e9";
const STEEL_DEEP = "#0369a1";

const grad = `linear-gradient(120deg, #38bdf8, ${STEEL_DEEP})`;

const glow = (cx: number, cy: number, r: number, o: number) =>
  `<div style="position:absolute;left:${cx - r}px;top:${cy - r}px;width:${r * 2}px;height:${r * 2}px;border-radius:50%;background:${grad};opacity:${o}"></div>`;

// The shield with the held line through it, drawn as inline SVG so the edge
// stays crisp at 1x.
const shield = `
<svg width="360" height="420" viewBox="0 0 360 420" fill="none"
  style="position:absolute;left:790px;top:105px">
  <path d="M180 14 L330 70 V210 C330 312 268 376 180 406 C92 376 30 312 30 210 V70 Z"
    stroke="${STEEL}" stroke-width="7" fill="rgba(14,165,233,0.08)" stroke-linejoin="round"/>
  <path d="M180 52 L296 96 V208 C296 288 248 340 180 366 C112 340 64 288 64 208 V96 Z"
    stroke="${STEEL}" stroke-width="2.5" opacity="0.45" fill="none" stroke-linejoin="round"/>
  <rect x="8" y="196" width="344" height="14" rx="7" fill="${STEEL}"/>
  <rect x="86" y="240" width="188" height="8" rx="4" fill="${WHITE}" opacity="0.28"/>
  <rect x="118" y="266" width="124" height="8" rx="4" fill="${WHITE}" opacity="0.16"/>
</svg>`;

const lockup =
  `<div style="position:absolute;left:84px;top:66px;width:30px;height:16px;border-radius:5px;background:${grad}"></div>` +
  `<div style="position:absolute;left:126px;top:64px;font-size:19px;font-weight:700;letter-spacing:2.4px;color:${WHITE};line-height:1.12">THE LEADFLOW PRO</div>` +
  `<div style="position:absolute;left:84px;top:100px;font-size:15px;font-weight:700;letter-spacing:3.6px;color:${STEEL}">HOLD THE LINE</div>`;

const body =
  glow(970, 315, 300, 0.1) +
  glow(970, 315, 205, 0.14) +
  `<div style="position:absolute;left:0;top:0;width:1200px;height:6px;background:${grad}"></div>` +
  shield +
  lockup +
  `<div style="position:absolute;left:84px;top:196px;width:640px">` +
  `<div style="font-size:56px;font-weight:800;line-height:1.08;color:${WHITE}">Answer back without losing your account.</div>` +
  `<div style="margin-top:24px;width:600px;font-size:26px;font-weight:600;line-height:1.46;color:${SUB}">How to handle critics, trolls, and pile-ons. And how to recover if you already got hit.</div>` +
  `</div>` +
  `<div style="position:absolute;left:84px;top:540px;font-size:20px;font-weight:500;color:${DIM};line-height:1.12">theleadflowpro.com/hold-the-line</div>`;

const face = (weight: number) =>
  `@font-face{font-family:Inter;font-style:normal;font-weight:${weight};src:url("file://${FONT_DIR}/inter-latin-${weight}-normal.woff2") format("woff2")}`;
const html = `<!doctype html><html><head><meta charset="utf-8"><style>
${face(500)}${face(600)}${face(700)}${face(800)}
*{margin:0;padding:0;box-sizing:border-box}
body{width:1200px;height:630px;overflow:hidden;position:relative;background:${NAVY};font-family:Inter,sans-serif}
</style></head><body>${body}</body></html>`;

const PREINSTALLED = "/opt/pw-browsers/chromium";
const executablePath = existsSync(PREINSTALLED) ? PREINSTALLED : undefined;
const browser = await chromium.launch({
  executablePath,
  args: ["--no-sandbox", "--disable-dev-shm-usage"],
});
const page = await browser.newPage({
  viewport: { width: 1200, height: 630 },
  deviceScaleFactor: 1,
});
await page.setContent(html, { waitUntil: "load" });
await page.evaluate(() => (document as unknown as { fonts: { ready: Promise<unknown> } }).fonts.ready);
const file = join(OUT_DIR, "hold-the-line.jpg");
writeFileSync(file, await page.screenshot({ type: "jpeg", quality: 80 }));
await browser.close();
console.log(`og: hold-the-line.jpg written, ${(statSync(file).size / 1024).toFixed(0)}KB`);
