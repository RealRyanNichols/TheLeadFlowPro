// Renders authored scenes to PNG for visual review.
//
//   node scripts/render-art.mjs <slug> [slug...]   render named scenes
//   node scripts/render-art.mjs --sheet            contact sheet of every scene
//
// Output goes to .art-review/ (gitignored). Uses the environment's Chromium.

import { readdirSync, mkdirSync, existsSync, readFileSync } from "node:fs";
import { join, resolve } from "node:path";
import { chromium } from "playwright";

const ROOT = process.cwd();
const SCENES = join(ROOT, "art", "scenes");
const OUT = join(ROOT, ".art-review");
mkdirSync(OUT, { recursive: true });

const PREINSTALLED = "/opt/pw-browsers/chromium";
const executablePath = existsSync(PREINSTALLED) ? PREINSTALLED : undefined;

const args = process.argv.slice(2);
const sheet = args.includes("--sheet");
const slugs = sheet
  ? readdirSync(SCENES).filter((f) => f.endsWith(".svg")).map((f) => f.replace(/\.svg$/, "")).sort()
  : args.filter((a) => !a.startsWith("--"));

if (!slugs.length) {
  console.error("usage: node scripts/render-art.mjs <slug...> | --sheet");
  process.exit(1);
}

// Chromium refuses file:// subresources on about:blank pages, so scenes are
// embedded as data: URIs (which also keeps <img> semantics — external refs
// inside a scene would fail to load, matching how the site serves the art).
const dataUri = (path) =>
  `data:image/svg+xml;base64,${readFileSync(path).toString("base64")}`;

const browser = await chromium.launch({
  executablePath,
  args: ["--no-sandbox", "--disable-dev-shm-usage"],
});

if (sheet) {
  // 4-up columns at 400x225 each; one long page, screenshotted whole.
  const cols = 4, w = 400, h = 225, label = 22;
  const rows = Math.ceil(slugs.length / cols);
  const cells = slugs.map((s, i) => {
    const x = (i % cols) * w, y = Math.floor(i / cols) * (h + label);
    return `<div style="position:absolute;left:${x}px;top:${y}px;width:${w}px;height:${h + label}px">
      <img src="${dataUri(join(SCENES, `${s}.svg`))}" width="${w}" height="${h}" style="display:block;background:#fff;border:1px solid #ccc;box-sizing:border-box">
      <div style="font:11px monospace;color:#333">${s}</div></div>`;
  }).join("");
  const page = await browser.newPage({ viewport: { width: cols * w, height: rows * (h + label) } });
  await page.setContent(`<body style="margin:0;background:#eee;position:relative">${cells}</body>`);
  await page.waitForTimeout(500);
  const file = join(OUT, "contact-sheet.png");
  await page.screenshot({ path: file, fullPage: true });
  console.log(file);
} else {
  const page = await browser.newPage({ viewport: { width: 800, height: 450 } });
  for (const slug of slugs) {
    const src = resolve(SCENES, `${slug}.svg`);
    if (!existsSync(src)) { console.error(`missing: ${src}`); continue; }
    await page.setContent(
      `<body style="margin:0"><img src="${dataUri(src)}" width="800" height="450" style="display:block;background:#fff"></body>`
    );
    await page.waitForTimeout(150);
    const file = join(OUT, `${slug}.png`);
    await page.screenshot({ path: file });
    console.log(file);
  }
}

await browser.close();
