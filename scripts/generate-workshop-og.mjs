// Renders the 1200x630 Open Graph share card for the workshop funnel.
//
//   node scripts/generate-workshop-og.mjs
//
// Same visual system as the evergreen 4:5 ad stills in
// public/images/workshops/: midnight navy, electric blue and cyan system
// connectors, large white type, small yellow price accent, brand lockup and
// TheLeadFlowPro.com/events. Deliberately no date — the date is not final and
// share cards get cached.
//
// Output: public/og/events/chatgpt-for-business-owners-longview.jpg

import { mkdirSync, writeFileSync, readFileSync, existsSync } from "node:fs";
import { join } from "node:path";
import { chromium } from "playwright";

const ROOT = process.cwd();
const OUT_DIR = join(ROOT, "public", "og", "events");
const FONT_DIR = join(ROOT, "node_modules", "@fontsource", "inter", "files");
mkdirSync(OUT_DIR, { recursive: true });

const PREINSTALLED = "/opt/pw-browsers/chromium";
const executablePath = existsSync(PREINSTALLED) ? PREINSTALLED : undefined;

const NAVY = "#0a1220";
const NAVY_2 = "#0e1a2e";
const BLUE = "#1240e8";
const BLUE_SOFT = "#5b87ff";
const CYAN = "#35c6f4";
const WHITE = "#f4f8ff";
const SUB = "#c3d0e4";
const YELLOW = "#ffd84d";

const link = (x1, y1, x2, y2, color = CYAN, w = 3, o = 0.85) => {
  const len = Math.hypot(x2 - x1, y2 - y1);
  const angle = (Math.atan2(y2 - y1, x2 - x1) * 180) / Math.PI;
  return `<div style="position:absolute;left:${x1}px;top:${y1}px;width:${len}px;height:${w}px;
    background:linear-gradient(90deg,${color},${BLUE_SOFT});border-radius:${w}px;opacity:${o};
    transform:rotate(${angle}deg);transform-origin:0 50%;box-shadow:0 0 12px ${color}66"></div>`;
};

const node = (x, y, label, icon) => `
  <div style="position:absolute;left:${x}px;top:${y}px;width:120px">
    <div style="width:64px;height:64px;margin:0 auto;border-radius:16px;background:${NAVY_2};
      border:2px solid ${BLUE_SOFT};box-shadow:0 0 18px ${CYAN}55, inset 0 1px 0 #ffffff22;
      display:flex;align-items:center;justify-content:center;font-size:28px">${icon}</div>
    <div style="margin-top:8px;text-align:center;font:800 15px Inter,system-ui;color:${SUB};
      letter-spacing:.06em;text-transform:uppercase">${label}</div>
  </div>`;

const html = `<!doctype html><meta charset="utf-8">
<style>
  ${[700, 800, 900]
    .map((weight) => {
      const woff2 = readFileSync(join(FONT_DIR, `inter-latin-${weight}-normal.woff2`)).toString("base64");
      return `@font-face{font-family:Inter;font-style:normal;font-weight:${weight};src:url("data:font/woff2;base64,${woff2}") format("woff2")}`;
    })
    .join("\n")}
  * { margin:0; box-sizing:border-box }
  body { width:1200px; height:630px; overflow:hidden; position:relative;
    background: radial-gradient(1200px 700px at 18% -10%, #14264a 0%, ${NAVY_2} 45%, ${NAVY} 100%);
    font-family: Inter, system-ui, sans-serif }
</style>
<body>
  <!-- faint grid -->
  <div style="position:absolute;inset:0;opacity:.16;background-image:
    linear-gradient(#ffffff12 1px, transparent 1px),
    linear-gradient(90deg, #ffffff12 1px, transparent 1px);
    background-size:60px 60px"></div>

  <!-- headline block -->
  <div style="position:absolute;left:64px;top:58px;width:700px">
    <div style="display:inline-block;border:2px solid ${YELLOW};border-radius:12px;
      padding:8px 18px;font:900 20px Inter;color:${YELLOW};letter-spacing:.14em">
      LIVE IN LONGVIEW, TEXAS</div>
    <div style="margin-top:24px;font:900 74px/1.02 Inter;color:${WHITE};letter-spacing:-.03em">
      ChatGPT for<br>Business Owners</div>
    <div style="margin-top:18px;font:700 27px/1.3 Inter;color:${SUB}">
      Hands-on. Ten seats. Bring your laptop.<br>
      Taught live by Ryan Nichols.</div>
    <div style="margin-top:26px;display:flex;gap:14px;align-items:center">
      <div style="background:${YELLOW};color:${NAVY};border-radius:12px;
        font:900 30px Inter;padding:10px 22px">$97</div>
      <div style="font:800 22px Inter;color:${WHITE}">Founding Workshop</div>
    </div>
  </div>

  <!-- system diagram: idea -> offer -> page -> form -> follow-up -->
  <div style="position:absolute;right:36px;top:96px;width:360px;height:420px">
    ${link(70, 68, 250, 68)}
    ${link(250, 100, 250, 190)}
    ${link(250, 222, 70, 222)}
    ${link(70, 254, 70, 344)}
    ${node(10, 30, "Idea", "💡")}
    ${node(190, 30, "Offer", "🏷️")}
    ${node(190, 186, "Page", "🖥️")}
    ${node(10, 186, "Form", "📋")}
    ${node(10, 342, "Follow-up", "✉️")}
  </div>

  <!-- footer bar -->
  <div style="position:absolute;left:0;right:0;bottom:0;height:86px;background:${NAVY};
    border-top:1px solid #ffffff1f;display:flex;align-items:center;justify-content:space-between;
    padding:0 64px">
    <div style="font:900 30px Inter;color:${WHITE}">The LeadFlow <span style="color:${BLUE_SOFT}">Pro</span></div>
    <div style="font:800 24px Inter;color:${CYAN}">TheLeadFlowPro.com/events</div>
  </div>
</body>`;

const browser = await chromium.launch({
  executablePath,
  args: ["--no-sandbox", "--disable-dev-shm-usage"],
});
const page = await browser.newPage({ viewport: { width: 1200, height: 630 } });
await page.setContent(html, { waitUntil: "networkidle" });
const out = join(OUT_DIR, "chatgpt-for-business-owners-longview.jpg");
writeFileSync(out, await page.screenshot({ type: "jpeg", quality: 90 }));
await browser.close();
console.log(`wrote ${out}`);
