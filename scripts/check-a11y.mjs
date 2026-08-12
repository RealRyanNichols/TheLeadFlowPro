// Browser checks for the tool library.
//
//   npm run build && npm run start          (in one terminal)
//   node scripts/check-a11y.mjs             (in another)
//
// Covers the things a unit test cannot see: horizontal overflow at real widths,
// consent defaults as rendered, keyboard close and focus restoration, and touch
// target sizes. Playwright is a dev dependency; Chromium is expected at
// PLAYWRIGHT_BROWSERS_PATH or wherever the local install put it.

import { chromium } from "playwright";
import { existsSync, readdirSync } from "node:fs";
import { join } from "node:path";

const BASE = process.env.BASE_URL || "http://localhost:3000";

/**
 * Playwright wants the exact browser build it shipped with. On a machine where
 * Chromium is already provisioned (CI images usually do), point at that instead
 * of downloading a second copy. Set CHROMIUM_PATH to override.
 */
function findChromium() {
  if (process.env.CHROMIUM_PATH) return process.env.CHROMIUM_PATH;
  const root = process.env.PLAYWRIGHT_BROWSERS_PATH;
  if (!root || !existsSync(root)) return undefined;
  for (const dir of readdirSync(root).filter((d) => d.startsWith("chromium-")).sort().reverse()) {
    for (const rel of ["chrome-linux/chrome", "chrome-mac/Chromium.app/Contents/MacOS/Chromium"]) {
      const candidate = join(root, dir, rel);
      if (existsSync(candidate)) return candidate;
    }
  }
  return undefined;
}
const WIDTHS = [320, 360, 390, 768, 1024, 1440];
const PAGES = [
  "/tools",
  "/tools/missed-call-calculator",
  "/tools/qr-code-maker",
  "/tools/household-budget-planner",
  "/tools/collections/home-services",
  "/embed/missed-call-calculator",
];

const failures = [];
const notes = [];
const fail = (m) => failures.push(m);

const browser = await chromium.launch({ executablePath: findChromium() });

/* ------------------------------ overflow sweep ----------------------------- */

for (const width of WIDTHS) {
  const ctx = await browser.newContext({ viewport: { width, height: 900 } });
  const page = await ctx.newPage();
  for (const path of PAGES) {
    const res = await page.goto(BASE + path, { waitUntil: "networkidle" }).catch(() => null);
    if (!res || res.status() >= 400) {
      fail(`${path} returned ${res ? res.status() : "no response"}`);
      continue;
    }
    await page.waitForTimeout(250);

    const overflow = await page.evaluate(() => {
      if (document.documentElement.scrollWidth <= window.innerWidth + 1) return null;
      let worst = null;
      for (const el of document.querySelectorAll("*")) {
        const r = el.getBoundingClientRect();
        if (r.right > window.innerWidth + 2 && r.width > 20) {
          if (!worst || r.right > worst.right) {
            worst = { right: Math.round(r.right), tag: el.tagName, cls: String(el.className || "").slice(0, 70) };
          }
        }
      }
      return { docWidth: document.documentElement.scrollWidth, viewport: window.innerWidth, worst };
    });
    if (overflow) fail(`horizontal overflow on ${path} at ${width}px: ${JSON.stringify(overflow)}`);

    // Touch targets, on the widths where a finger is the input device.
    if (width <= 768) {
      const small = await page.evaluate(() => {
        const out = [];
        for (const el of document.querySelectorAll("button, a[href], select, input[type=checkbox]")) {
          const r = el.getBoundingClientRect();
          if (r.width === 0 && r.height === 0) continue;
          if (r.height < 44 - 0.5 || r.width < 24) {
            out.push({ tag: el.tagName, text: (el.textContent || "").trim().slice(0, 30), h: Math.round(r.height), w: Math.round(r.width) });
          }
        }
        return out.slice(0, 6);
      });
      if (small.length) notes.push(`small targets on ${path} at ${width}px: ${JSON.stringify(small)}`);
    }
  }
  await ctx.close();
}

/* ---------------------------- dialog behaviour ----------------------------- */

for (const width of [1440, 390]) {
  const ctx = await browser.newContext({ viewport: { width, height: 900 } });
  const page = await ctx.newPage();
  await page.goto(`${BASE}/tools/missed-call-calculator`, { waitUntil: "networkidle" });
  await page.waitForTimeout(250);

  const trigger = page.getByRole("button", { name: /email it to me/i }).first();
  if (!(await trigger.count())) {
    fail(`no "Email it to me" button at ${width}px`);
    await ctx.close();
    continue;
  }

  await trigger.click();
  await page.waitForTimeout(400);

  if ((await page.getByRole("dialog").count()) !== 1) fail(`dialog did not open at ${width}px`);

  const consents = await page.evaluate(() =>
    [...document.querySelectorAll('input[type="checkbox"]')].map((c) => ({ name: c.name, checked: c.checked })),
  );
  for (const c of consents) {
    if (c.checked) fail(`consent "${c.name}" is pre-checked at ${width}px`);
  }
  if (consents.length < 2) fail(`expected two separate consent checkboxes, found ${consents.length}`);

  // Focus should land in the dialog, not stay on the page behind it.
  const focusInDialog = await page.evaluate(() => {
    const dlg = document.querySelector('[role="dialog"]');
    return Boolean(dlg && document.activeElement && dlg.contains(document.activeElement));
  });
  if (!focusInDialog) fail(`focus did not move into the dialog at ${width}px`);

  // Background must not scroll while a dialog is open.
  const locked = await page.evaluate(() => getComputedStyle(document.body).overflow === "hidden");
  if (!locked) fail(`background scrolling not locked at ${width}px`);

  await page.keyboard.press("Escape");
  await page.waitForTimeout(300);

  if ((await page.getByRole("dialog").count()) !== 0) fail(`Escape did not close the dialog at ${width}px`);

  const restored = await page.evaluate(() => (document.activeElement?.textContent || "").trim().slice(0, 40));
  if (!/email it to me/i.test(restored)) {
    fail(`focus not restored to the trigger after Escape at ${width}px, landed on "${restored}"`);
  }

  await ctx.close();
}

/* ------------------------- downloads need no form -------------------------- */

{
  const ctx = await browser.newContext({ viewport: { width: 1440, height: 900 }, acceptDownloads: true });
  const page = await ctx.newPage();
  await page.goto(`${BASE}/tools/missed-call-calculator`, { waitUntil: "networkidle" });
  const [download] = await Promise.all([
    page.waitForEvent("download", { timeout: 8000 }).catch(() => null),
    page.getByRole("button", { name: /download my result/i }).first().click(),
  ]);
  if (!download) fail("downloading a result did not produce a file without a form");
  else if ((await page.getByRole("dialog").count()) > 0) fail("downloading a result opened a form, which it must not");
  await ctx.close();
}

await browser.close();

for (const n of notes) console.log(`note: ${n}`);
if (failures.length) {
  console.error(`\n${failures.length} accessibility problem(s):\n`);
  for (const f of failures) console.error(`  ${f}`);
  process.exit(1);
}
console.log(`\naccessibility checks passed across ${WIDTHS.length} widths and ${PAGES.length} pages`);
