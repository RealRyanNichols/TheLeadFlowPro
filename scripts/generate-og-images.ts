// Renders the OG share card for every published tool.
//
// Run: npm run og
//
// The card design system is authored in the Figma file "LeadFlow Tools — OG
// Cards" (https://www.figma.com/design/da2xDWeTFFd9HGfcplPAcI), one frame per
// tool across ten composition families. This script renders the identical spec
// headlessly — same geometry, same six-gradient family, same Inter type — so
// the committed JPEGs can be regenerated deterministically without a Figma
// export step. Every card carries the four required words per the brand SOP:
// one headline, one support line, the brand lockup, and the domain.
//
// Output: public/og/tools/<slug>.jpg, 1200x630 JPEG.

import { mkdirSync, writeFileSync, readdirSync, unlinkSync, statSync, existsSync } from "node:fs";
import { join } from "node:path";
import { chromium } from "playwright";
import { ALL_TOOLS } from "../lib/tools/index.ts";
import { ALL_PRO_TOOLS, PRO_TOOL_VISUALS } from "../lib/tools/pro/index.ts";
import { TOOL_VISUALS } from "../lib/tools/visuals.ts";

const ROOT = process.cwd();
const OUT_DIR = join(ROOT, "public", "og", "tools");
const FONT_DIR = join(ROOT, "node_modules", "@fontsource", "inter", "files");
mkdirSync(OUT_DIR, { recursive: true });

// The six-gradient family, fixed order, never randomized (brand SOP).
const GRADS = [
  ["#38bdf8", "#2563eb"],
  ["#a78bfa", "#d946ef"],
  ["#34d399", "#0ea371"],
  ["#fbbf24", "#f97316"],
  ["#f87171", "#ef4444"],
  ["#22d3ee", "#3b82f6"],
];

const NAVY = "#0e1a2e";
const DEEP = "#0a1220";
const WHITE = "#f4f8ff";
const SUB = "#c3d0e4";
const DIM = "#8299b8";
const LINE = "#b9c6da";
const SHEET = "#eef3fa";
const GRAY = "#41536e";

const grad = (a: number) => `linear-gradient(120deg, ${GRADS[a - 1][0]}, ${GRADS[a - 1][1]})`;

const ci = (cx: number, cy: number, r: number, a: number, o = 1) =>
  `<div style="position:absolute;left:${cx - r}px;top:${cy - r}px;width:${r * 2}px;height:${r * 2}px;border-radius:50%;background:${grad(a)};opacity:${o}"></div>`;

const dot = (cx: number, cy: number, r: number, color: string, o: number) =>
  `<div style="position:absolute;left:${cx - r}px;top:${cy - r}px;width:${r * 2}px;height:${r * 2}px;border-radius:50%;background:${color};opacity:${o}"></div>`;

const rcG = (x: number, y: number, w: number, h: number, a: number, o = 1, r = 0, rot = 0) =>
  `<div style="position:absolute;left:${x}px;top:${y}px;width:${w}px;height:${h}px;border-radius:${r}px;background:${grad(a)};opacity:${o};transform:rotate(${-rot}deg);transform-origin:top left"></div>`;

const rcS = (x: number, y: number, w: number, h: number, color: string, o = 1, r = 0) =>
  `<div style="position:absolute;left:${x}px;top:${y}px;width:${w}px;height:${h}px;border-radius:${r}px;background:${color};opacity:${o}"></div>`;

const link = (x1: number, y1: number, x2: number, y2: number, a: number) => {
  const len = Math.hypot(x2 - x1, y2 - y1);
  const ang = (Math.atan2(y2 - y1, x2 - x1) * 180) / Math.PI;
  return `<div style="position:absolute;left:${x1}px;top:${y1 - 2}px;width:${len}px;height:4px;border-radius:2px;background:${grad(a)};opacity:0.55;transform:rotate(${ang}deg);transform-origin:2px 2px"></div>`;
};

const lockup = (a: number, x: number, y: number) =>
  `<div style="position:absolute;left:${x}px;top:${y + 2}px;width:30px;height:16px;border-radius:5px;background:${grad(a)}"></div>` +
  `<div style="position:absolute;left:${x + 42}px;top:${y}px;font-size:19px;font-weight:700;letter-spacing:2.4px;color:${WHITE};line-height:1.12">THE LEADFLOW PRO</div>`;

// The standard left column: lockup, headline, support line, domain.
const col = (name: string, hook: string, a: number, x: number, w: number, sz = 56, hy = 190) =>
  lockup(a, x, 64) +
  `<div style="position:absolute;left:${x}px;top:${hy}px;width:${w}px">` +
  `<div style="font-size:${sz}px;font-weight:800;line-height:1.06;color:${WHITE}">${esc(name)}</div>` +
  `<div style="margin-top:22px;width:${w - 16}px;font-size:26px;font-weight:600;line-height:1.48;color:${SUB}">${esc(hook)}</div>` +
  `</div>` +
  `<div style="position:absolute;left:${x}px;top:528px;font-size:20px;font-weight:500;color:${DIM};line-height:1.12">theleadflowpro.com</div>`;

function esc(s: string): string {
  return s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
}

function scene(d: { name: string; hook: string; accent: number; layout: string }): string {
  const a = d.accent;
  switch (d.layout) {
    case "scene-right":
      return ci(950, 300, 215, a, 0.16) + ci(950, 300, 150, a) + ci(1090, 150, 42, a, 0.85) +
        dot(808, 442, 26, WHITE, 0.25) + rcG(1010, 430, 160, 14, a, 0.9, 7, -18) +
        col(d.name, d.hook, a, 84, 600);
    case "scene-left":
      return ci(250, 300, 215, a, 0.16) + ci(250, 300, 150, a) + ci(110, 150, 42, a, 0.85) +
        dot(392, 442, 26, WHITE, 0.25) + rcG(60, 430, 160, 14, a, 0.9, 7, 18) +
        col(d.name, d.hook, a, 560, 560);
    case "panel-over-scene":
      return ci(220, 130, 260, a, 0.35) + ci(1010, 530, 300, a, 0.25) + rcG(850, 70, 230, 18, a, 0.5, 9, 14) +
        `<div style="position:absolute;left:64px;top:112px;width:752px;height:406px;border-radius:24px;background:rgba(10,18,32,0.87)"></div>` +
        rcG(64, 112, 8, 406, a, 1, 4) + lockup(a, 112, 152) +
        `<div style="position:absolute;left:112px;top:206px;width:640px">` +
        `<div style="font-size:46px;font-weight:800;line-height:1.06;color:${WHITE}">${esc(d.name)}</div>` +
        `<div style="margin-top:18px;width:620px;font-size:25px;font-weight:600;line-height:1.48;color:${SUB}">${esc(d.hook)}</div></div>` +
        `<div style="position:absolute;left:112px;top:466px;font-size:19px;font-weight:500;color:${DIM}">theleadflowpro.com</div>`;
    case "band-bottom":
      return ci(1040, 190, 95, a, 0.2) + ci(1040, 190, 62, a, 0.55) + rcG(0, 498, 1200, 132, a) +
        `<div style="position:absolute;left:84px;top:552px;font-size:22px;font-weight:700;color:${DEEP}">theleadflowpro.com</div>` +
        lockup(a, 84, 64) +
        `<div style="position:absolute;left:84px;top:168px;width:840px">` +
        `<div style="font-size:58px;font-weight:800;line-height:1.06;color:${WHITE}">${esc(d.name)}</div>` +
        `<div style="margin-top:20px;width:700px;font-size:26px;font-weight:600;line-height:1.48;color:${SUB}">${esc(d.hook)}</div></div>`;
    case "split-compare":
      return rcG(640, 0, 560, 630, a, 0.12) + rcG(637, 0, 6, 630, a) +
        rcG(760, 320, 140, 190, a, 1, 12) + rcS(952, 412, 140, 98, GRAY, 1, 12) +
        rcS(760, 532, 332, 4, WHITE, 0.25, 2) + col(d.name, d.hook, a, 84, 480, 50);
    case "device":
      return ci(1005, 390, 240, a, 0.15) +
        `<div style="position:absolute;left:880px;top:110px;width:250px;height:560px;border-radius:36px;background:${DEEP};border:3px solid ${GRADS[a - 1][0]}"></div>` +
        rcG(898, 128, 214, 524, a, 0.9, 26) +
        rcS(918, 172, 174, 44, WHITE, 0.25, 10) + rcS(918, 236, 174, 44, WHITE, 0.2, 10) +
        rcS(918, 300, 174, 44, WHITE, 0.15, 10) + col(d.name, d.hook, a, 84, 600);
    case "document": {
      let lines = "";
      for (let i = 0; i < 5; i++) lines += rcS(898, 214 + i * 44, i % 2 ? 176 : 234, 10, LINE, 1, 5);
      return ci(1000, 330, 235, a, 0.12) + rcS(870, 110, 290, 450, SHEET, 1, 14) +
        `<div style="position:absolute;left:870px;top:110px;width:290px;height:64px;border-radius:14px 14px 0 0;background:${grad(a)}"></div>` +
        lines + ci(1146, 140, 24, a) + col(d.name, d.hook, a, 84, 600);
    }
    case "big-number": {
      const ch = (d.name.replace(/[^A-Za-z0-9]/g, "")[0] || "T").toUpperCase();
      return ci(952, 330, 235, a, 0.12) +
        `<div style="position:absolute;left:790px;top:80px;font-size:380px;font-weight:800;line-height:1;opacity:0.95;background:${grad(a)};-webkit-background-clip:text;background-clip:text;color:transparent">${ch}</div>` +
        col(d.name, d.hook, a, 84, 560);
    }
    case "centered":
      return ci(600, 290, 300, a, 0.2) + ci(600, 760, 380, a, 0.14) +
        `<div style="position:absolute;left:0;top:72px;width:1200px;display:flex;justify-content:center;align-items:center;gap:12px">` +
        `<div style="width:30px;height:16px;border-radius:5px;background:${grad(a)}"></div>` +
        `<div style="font-size:19px;font-weight:700;letter-spacing:2.4px;color:${WHITE}">THE LEADFLOW PRO</div></div>` +
        rcG(540, 168, 120, 8, a, 1, 4) +
        `<div style="position:absolute;left:100px;top:206px;width:1000px;display:flex;flex-direction:column;align-items:center;text-align:center">` +
        `<div style="font-size:60px;font-weight:800;line-height:1.06;color:${WHITE}">${esc(d.name)}</div>` +
        `<div style="margin-top:22px;width:800px;font-size:26px;font-weight:600;line-height:1.48;color:${SUB}">${esc(d.hook)}</div></div>` +
        `<div style="position:absolute;left:0;top:528px;width:1200px;text-align:center;font-size:20px;font-weight:500;color:${DIM}">theleadflowpro.com</div>`;
    case "diagram":
      return link(880, 190, 1058, 318, a) + link(1058, 318, 892, 448, a) + link(880, 190, 892, 448, a) +
        ci(880, 190, 48, a) + ci(1058, 318, 40, a, 0.85) + ci(892, 448, 44, a, 0.7) +
        dot(1052, 168, 16, WHITE, 0.3) + col(d.name, d.hook, a, 84, 600);
    default:
      throw new Error(`unknown og layout: ${d.layout}`);
  }
}

function pageHtml(body: string): string {
  const face = (weight: number) =>
    `@font-face{font-family:Inter;font-style:normal;font-weight:${weight};src:url("file://${FONT_DIR}/inter-latin-${weight}-normal.woff2") format("woff2")}`;
  return `<!doctype html><html><head><meta charset="utf-8"><style>
${face(500)}${face(600)}${face(700)}${face(800)}
*{margin:0;padding:0;box-sizing:border-box}
body{width:1200px;height:630px;overflow:hidden;position:relative;background:${NAVY};font-family:Inter,sans-serif}
</style></head><body>${body}</body></html>`;
}

// In managed environments a Chromium may be pre-installed at a stable path
// that does not match the npm-pinned Playwright build; prefer it when present.
const PREINSTALLED = "/opt/pw-browsers/chromium";
const executablePath = existsSync(PREINSTALLED) ? PREINSTALLED : undefined;
const browser = await chromium.launch({ executablePath, args: ["--no-sandbox", "--disable-dev-shm-usage"] });
const page = await browser.newPage({ viewport: { width: 1200, height: 630 }, deviceScaleFactor: 1 });

const wanted = new Set<string>();
let written = 0;
let biggest = 0;

for (const tool of [...ALL_TOOLS, ...ALL_PRO_TOOLS]) {
  const v = TOOL_VISUALS[tool.slug] ?? PRO_TOOL_VISUALS[tool.slug];
  if (!v) throw new Error(`no visual entry for ${tool.slug}`);
  const html = pageHtml(scene({ name: tool.name, hook: v.ogHook, accent: v.colorAccent, layout: v.ogLayout }));
  await page.setContent(html, { waitUntil: "load" });
  await page.evaluate(() => (document as any).fonts.ready);
  const file = join(OUT_DIR, `${tool.slug}.jpg`);
  const buf = await page.screenshot({ type: "jpeg", quality: 80 });
  writeFileSync(file, buf);
  wanted.add(`${tool.slug}.jpg`);
  biggest = Math.max(biggest, statSync(file).size);
  written++;
}

await browser.close();

// A card for a tool that no longer exists would pass "file exists" forever.
let removed = 0;
for (const name of readdirSync(OUT_DIR)) {
  if (name.endsWith(".jpg") && !wanted.has(name)) {
    unlinkSync(join(OUT_DIR, name));
    removed++;
  }
}

console.log(`og: ${written} card(s) written, ${removed} removed, largest ${(biggest / 1024).toFixed(0)}KB`);
