// Renders the hero art for the Hold The Line lane: the landing page scene and
// one scene per offer page, used in the cb-hero-visual panel exactly like the
// offer-v2 images on the other sales pages.
//
// Run: node --experimental-strip-types --no-warnings --import ./scripts/register-ts.mjs scripts/generate-hold-the-line-art.ts
//
// Same headless approach as the OG cards: designed scenes, rendered
// deterministically, committed. The visual language is the lane's own: the
// house dark ground, #111827 cards, and the steel-cyan #0ea5e9 accent instead
// of the Free Build blue, so the two lanes read as different divisions of the
// same company. No faces, no stock anything; every scene is the product doing
// its job: a hostile thread being sorted and answered calmly.
//
// Output: public/images/hold-the-line/<name>.jpg, 1672x941 JPEG.

import { existsSync, mkdirSync, statSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { chromium } from "playwright";

const ROOT = process.cwd();
const OUT_DIR = join(ROOT, "public", "images", "hold-the-line");
const FONT_DIR = join(ROOT, "node_modules", "@fontsource", "inter", "files");
mkdirSync(OUT_DIR, { recursive: true });

const W = 1672;
const H = 941;

const NAVY = "#0e1a2e";
const DEEP = "#0a1220";
const CARD = "#111827";
const LINE = "#24344d";
const WHITE = "#f4f8ff";
const SUB = "#c3d0e4";
const DIM = "#8299b8";
const STEEL = "#0ea5e9";
const STEEL_SOFT = "rgba(14,165,233,0.14)";
const RED_SOFT = "rgba(248,113,113,0.14)";
const RED = "#f87171";
const GREEN = "#34d399";

const esc = (s: string) =>
  s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");

// ---------------------------------------------------------------- primitives

const glow = (cx: number, cy: number, r: number, o: number) =>
  `<div style="position:absolute;left:${cx - r}px;top:${cy - r}px;width:${r * 2}px;height:${r * 2}px;border-radius:50%;background:radial-gradient(circle, ${STEEL} 0%, transparent 70%);opacity:${o}"></div>`;

const panel = (
  x: number,
  y: number,
  w: number,
  body: string,
  opts: { accent?: boolean; rot?: number; pad?: number } = {},
) =>
  `<div style="position:absolute;left:${x}px;top:${y}px;width:${w}px;padding:${opts.pad ?? 34}px;border-radius:26px;background:${CARD};border:1.5px solid ${opts.accent ? STEEL : LINE};box-shadow:0 36px 90px #0009${opts.accent ? `,0 0 60px rgba(14,165,233,0.18)` : ""};${opts.rot ? `transform:rotate(${opts.rot}deg);` : ""}">${body}</div>`;

const label = (text: string, color = STEEL) =>
  `<div style="font-size:17px;font-weight:800;letter-spacing:3.4px;color:${color};margin-bottom:18px">${esc(text)}</div>`;

const avatar = (letter: string, bg: string, fg = WHITE) =>
  `<div style="flex:none;width:52px;height:52px;border-radius:50%;background:${bg};display:flex;align-items:center;justify-content:center;font-size:22px;font-weight:800;color:${fg}">${esc(letter)}</div>`;

const comment = (
  letter: string,
  name: string,
  text: string,
  opts: { hostile?: boolean; you?: boolean; tag?: string; tagColor?: string } = {},
) =>
  `<div style="display:flex;gap:18px;padding:20px 22px;border-radius:18px;background:${opts.hostile ? RED_SOFT : opts.you ? STEEL_SOFT : "rgba(255,255,255,0.03)"};border:1px solid ${opts.hostile ? "rgba(248,113,113,0.35)" : opts.you ? "rgba(14,165,233,0.4)" : LINE};margin-top:16px">` +
  avatar(letter, opts.hostile ? RED_SOFT : opts.you ? STEEL : "rgba(255,255,255,0.08)", opts.hostile ? RED : opts.you ? DEEP : SUB) +
  `<div style="min-width:0">` +
  `<div style="display:flex;align-items:center;gap:12px;font-size:19px;font-weight:800;color:${WHITE}">${esc(name)}` +
  (opts.tag
    ? `<span style="font-size:13px;font-weight:800;letter-spacing:1.6px;padding:4px 12px;border-radius:99px;background:${opts.tagColor === RED ? RED_SOFT : STEEL_SOFT};color:${opts.tagColor ?? STEEL}">${esc(opts.tag)}</span>`
    : "") +
  `</div>` +
  `<div style="margin-top:8px;font-size:20px;line-height:1.5;color:${SUB}">${esc(text)}</div>` +
  `</div></div>`;

const bar = (w: number, o = 0.22) =>
  `<div style="height:12px;width:${w}px;border-radius:6px;background:${WHITE};opacity:${o};margin-top:14px"></div>`;

const shieldSvg = (x: number, y: number, size: number, o = 1) => {
  const s = size / 360;
  return `<svg width="${360 * s}" height="${420 * s}" viewBox="0 0 360 420" fill="none" style="position:absolute;left:${x}px;top:${y}px;opacity:${o}">
  <path d="M180 14 L330 70 V210 C330 312 268 376 180 406 C92 376 30 312 30 210 V70 Z" stroke="${STEEL}" stroke-width="7" fill="rgba(14,165,233,0.08)" stroke-linejoin="round"/>
  <rect x="8" y="196" width="344" height="14" rx="7" fill="${STEEL}"/>
</svg>`;
};

const ground = (extra = "") =>
  glow(1290, 240, 420, 0.16) +
  glow(360, 800, 380, 0.1) +
  `<div style="position:absolute;left:0;top:0;width:${W}px;height:8px;background:linear-gradient(90deg,#38bdf8,#0369a1)"></div>` +
  extra;

// -------------------------------------------------------------------- scenes

// Landing: a hostile thread on the left, the calm four-part reply on the
// right, the lurker count underneath. The product, mid-use.
function landingScene(): string {
  const thread =
    label("THE COMMENT SECTION, 7:41PM") +
    comment("D", "some_guy_1987", "Total ripoff. You can do all of this yourself for free with open source. People wake up", { hostile: true, tag: "OBJECTION", tagColor: RED }) +
    comment("K", "kelly.m", "I was actually wondering about this too", {}) +
    comment("D", "some_guy_1987", "Crickets lol. Thought so", { hostile: true }) +
    comment("T", "tbone.htx", "Following", {});

  const reply =
    label("THE REPLY THAT WINS THE READERS") +
    comment("R", "Ryan", "You're right, the tools are free. Every one of them. So is a table saw. What people pay for is the months somebody already spent finding out which ones break. If you can build it yourself, you should. The guy running a shop 60 hours a week can't, and doesn't want to. That's who this is for.", { you: true, tag: "SORTED · ANSWERED ONCE" }) +
    `<div style="display:flex;gap:14px;align-items:center;margin-top:22px">` +
    `<div style="font-size:18px;font-weight:800;color:${GREEN}">✓ Account intact</div>` +
    `<div style="font-size:18px;font-weight:700;color:${DIM}">· 340 people read this and said nothing. They are the customers.</div>` +
    `</div>`;

  return (
    ground() +
    shieldSvg(1390, 40, 230, 0.9) +
    panel(96, 76, 680, thread) +
    panel(840, 320, 730, reply, { accent: true }) +
    `<div style="position:absolute;left:96px;top:856px;font-size:21px;font-weight:800;letter-spacing:2.8px;color:${DIM}">SORT THEM · ANSWER ONCE · KEEP THE ACCOUNT</div>`
  );
}

// Playbook: the product open on the desk. Sorting table, a library reply,
// the never-type list.
function playbookScene(): string {
  const chips = ["OBJECTION", "CRITIC", "KNOW-IT-ALL", "TROLL", "PILE-ON", "LIE", "THREAT"]
    .map(
      (c, i) =>
        `<span style="display:inline-block;margin:8px 10px 0 0;padding:10px 20px;border-radius:99px;font-size:17px;font-weight:800;letter-spacing:1.6px;background:${i >= 5 ? RED_SOFT : STEEL_SOFT};color:${i >= 5 ? RED : STEEL}">${c}</span>`,
    )
    .join("");
  const sorting =
    label("PART TWO · THE SORTING TABLE") +
    `<div style="font-size:26px;font-weight:800;color:${WHITE};line-height:1.3">Seven kinds of people in your comments. Seven different answers.</div>` +
    `<div style="margin-top:10px">${chips}</div>`;

  const never =
    label("PART FIVE · WHAT NEVER TO TYPE", RED) +
    `<div style="font-size:20px;line-height:1.7;color:${SUB}">` +
    `<div>✕&nbsp; Anything about their family or their kids</div>` +
    `<div>✕&nbsp; Anything that can be read as physical</div>` +
    `<div>✕&nbsp; Anything typed inside twenty minutes of the feeling</div>` +
    `</div>`;

  const checkRows = [
    "Which of the seven types is this?",
    "Is my last sentence written to the reader?",
    "Would I be fine if this were screenshotted?",
    "Twenty minutes since I first read it?",
  ]
    .map(
      (t) =>
        `<div style="display:flex;gap:14px;align-items:center;margin-top:16px"><div style="width:28px;height:28px;border-radius:8px;border:2px solid ${STEEL};display:flex;align-items:center;justify-content:center;color:${STEEL};font-weight:900;font-size:16px">✓</div><div style="font-size:20px;color:${SUB}">${esc(t)}</div></div>`,
    )
    .join("");
  const check = label("THE 60-SECOND PRE-SEND CHECK") + checkRows;

  const library =
    label("PART FOUR · THE RESPONSE LIBRARY") +
    comment("R", "The price objection, answered", "It is a real number, and I'd rather say it out loud than hide it behind \"contact us for pricing.\" Add up what you pay every month right now and multiply by 12. If this costs less and you own it at the end, it's not expensive.", { you: true, tag: "READY TO ADAPT" });

  return (
    ground() +
    shieldSvg(1330, 40, 300, 0.35) +
    panel(96, 76, 800, sorting, { accent: true }) +
    panel(96, 430, 680, never, { rot: -1 }) +
    panel(940, 140, 620, check, { rot: 1 }) +
    panel(830, 560, 730, library, { accent: true }) +
    `<div style="position:absolute;left:96px;top:866px;font-size:21px;font-weight:800;letter-spacing:2.8px;color:${DIM}">NINE PARTS · YOURS TONIGHT · READ IT BEFORE YOU REPLY</div>`
  );
}

// Comment Rescue: the thread comes in, the exact reply goes back inside 24h.
function rescueScene(): string {
  const inbox =
    label("YOU SEND THE THREAD") +
    comment("A", "angry.customer", "Don't use this company. They doubled the quote halfway through. Scam artists.", { hostile: true, tag: "SENT 9:12AM", tagColor: RED }) +
    comment("A", "angry.customer", "And they know it. Watch them delete this", { hostile: true }) +
    `<div style="margin-top:20px;font-size:18px;font-weight:800;color:${DIM}">+ the link, a screenshot, one line of context. That is all we need.</div>`;
  const out =
    label("THE EXACT REPLY COMES BACK") +
    comment("R", "Written for you to paste", "You're right that the number changed, and I'm not going to argue about it in the comments. Here's what happened: the scope grew when we opened the wall. Here's what I'm doing about it. If you want to talk to me directly, I'm at the number on the site. I'll pick up.", { you: true, tag: "DELIVERED 2:40PM · SAME DAY" }) +
    `<div style="margin-top:22px;font-size:19px;font-weight:800;color:${GREEN}">✓ The read: a Critic, not a Troll. Answer once, fix it in public, do not delete.</div>`;

  return (
    ground() +
    shieldSvg(1400, 60, 220, 0.5) +
    panel(96, 76, 680, inbox) +
    panel(790, 320, 780, out, { accent: true }) +
    `<div style="position:absolute;left:850px;top:210px;padding:18px 34px;border-radius:99px;background:${STEEL};color:${DEEP};font-size:23px;font-weight:900;letter-spacing:1.4px;box-shadow:0 20px 60px rgba(14,165,233,0.4)">WITHIN 24 HOURS</div>` +
    `<div style="position:absolute;left:96px;top:640px;width:600px;padding:30px 34px;border-radius:22px;background:rgba(255,255,255,0.03);border:1px solid ${LINE}">` +
    `<div style="font-size:19px;line-height:1.6;color:${SUB}">What you get with the reply: the read on who they are, what they want, and what to do if they come back. One comment never becomes a week.</div></div>` +
    `<div style="position:absolute;left:96px;top:866px;font-size:21px;font-weight:800;letter-spacing:2.8px;color:${DIM}">SEND IT · GET THE READ · PASTE THE REPLY · BACK TO WORK</div>`
  );
}

// Voice Recovery: the notice, the diagnosis, the appeal written live.
function recoveryScene(): string {
  const notice =
    label("WHAT THE PLATFORM SENT", RED) +
    `<div style="font-size:25px;font-weight:800;color:${WHITE}">Your account has been suspended.</div>` +
    `<div style="margin-top:10px;font-size:19px;color:${SUB}">Community Guidelines · appeal window open</div>` +
    bar(420) +
    bar(330);
  const diagnosis =
    label("THE 60-MINUTE SESSION") +
    ["Suspended, restricted, demonetized, de-recommended, or nothing?", "The appeal, written together on the call", "The off-platform backup, mapped before we hang up"]
      .map(
        (t, i) =>
          `<div style="display:flex;gap:16px;align-items:flex-start;margin-top:${i ? 18 : 4}px"><div style="flex:none;width:34px;height:34px;border-radius:50%;background:${STEEL};color:${DEEP};display:flex;align-items:center;justify-content:center;font-weight:900;font-size:18px">${i + 1}</div><div style="font-size:21px;line-height:1.45;color:${SUB}">${esc(t)}</div></div>`,
      )
      .join("");
  const appeal =
    label("THE APPEAL, UNDER 200 WORDS") +
    `<div style="font-size:20px;line-height:1.6;color:${SUB};font-style:normal">"My account was restricted on [date] under [policy name]. The content in question was [plain description]. Specifically: [one fact a reviewer can verify in ten seconds]. I am asking for a human review. Thank you."</div>` +
    `<div style="margin-top:18px;font-size:18px;font-weight:800;color:${DIM}">No emotion. Argue the application, never the policy. Appeal once.</div>`;

  const wait =
    label("WHILE YOU WAIT", GREEN) +
    ["Export everything you still can, today", "Stand up one page you own", "Start the list nobody can switch off"]
      .map(
        (t) =>
          `<div style="display:flex;gap:14px;align-items:center;margin-top:14px"><div style="width:26px;height:26px;border-radius:8px;border:2px solid ${GREEN};display:flex;align-items:center;justify-content:center;color:${GREEN};font-weight:900;font-size:15px">✓</div><div style="font-size:19px;color:${SUB}">${esc(t)}</div></div>`,
      )
      .join("");

  return (
    ground() +
    shieldSvg(1380, 50, 250, 0.4) +
    panel(96, 76, 620, notice, { rot: -1 }) +
    panel(96, 420, 680, appeal, { accent: true }) +
    panel(820, 160, 740, diagnosis, { accent: true }) +
    panel(880, 560, 620, wait, { rot: 1 }) +
    `<div style="position:absolute;left:96px;top:866px;font-size:21px;font-weight:800;letter-spacing:2.8px;color:${DIM}">FIND OUT WHAT HAPPENED · WRITE THE APPEAL · MAP THE BACKUP</div>`
  );
}

// Comment Cover: the week's comments, sorted, replies ready to approve.
function coverScene(): string {
  const queue =
    label("THIS WEEK ON YOUR PAGE · SORTED FOR YOU") +
    comment("M", "mike_t", "How much for a 5 page site roughly?", { tag: "LEAD · REPLY READY" }) +
    comment("J", "jdub44", "Cheaper guy down the road does the same thing", { hostile: true, tag: "OBJECTION · REPLY READY", tagColor: RED }) +
    comment("S", "sarah.k", "These guys rebuilt our booking system. Worth every penny.", { tag: "THANK · REPLY READY" });
  const approve =
    label("YOU APPROVE. YOU POST.") +
    `<div style="font-size:21px;line-height:1.55;color:${SUB}">Every reply written in your voice, handed to you before it goes anywhere. Nothing posts under your name that you did not sign off on.</div>` +
    `<div style="display:flex;gap:16px;margin-top:24px">` +
    `<div style="padding:14px 30px;border-radius:12px;background:${STEEL};color:${DEEP};font-size:19px;font-weight:900">Approve all 3</div>` +
    `<div style="padding:14px 30px;border-radius:12px;border:2px solid ${LINE};color:${SUB};font-size:19px;font-weight:800">Edit first</div>` +
    `</div>`;

  const week =
    label("THE MONTH, IN NUMBERS") +
    `<div style="display:flex;gap:40px">` +
    [["31", "comments sorted"], ["9", "replies handed over"], ["0", "posted without you"]]
      .map(
        ([n, t]) =>
          `<div><div style="font-size:44px;font-weight:900;color:${WHITE}">${n}</div><div style="margin-top:4px;font-size:17px;font-weight:700;color:${DIM}">${t}</div></div>`,
      )
      .join("") +
    `</div>`;

  return (
    ground() +
    shieldSvg(1400, 40, 220, 0.4) +
    panel(96, 76, 820, queue, { accent: true }) +
    panel(970, 190, 590, approve, { rot: 1 }) +
    panel(970, 600, 590, week) +
    `<div style="position:absolute;left:96px;top:866px;font-size:21px;font-weight:800;letter-spacing:2.8px;color:${DIM}">WATCHED · SORTED · HANDED TO YOU · CANCEL ANY TIME</div>`
  );
}

// ------------------------------------------------------------------- render

const SCENES: Record<string, () => string> = {
  landing: landingScene,
  playbook: playbookScene,
  "comment-rescue": rescueScene,
  "voice-recovery": recoveryScene,
  "comment-cover": coverScene,
};

const face = (weight: number) =>
  `@font-face{font-family:Inter;font-style:normal;font-weight:${weight};src:url("file://${FONT_DIR}/inter-latin-${weight}-normal.woff2") format("woff2")}`;
const pageHtml = (body: string) => `<!doctype html><html><head><meta charset="utf-8"><style>
${face(500)}${face(700)}${face(800)}${face(900)}
*{margin:0;padding:0;box-sizing:border-box}
body{width:${W}px;height:${H}px;overflow:hidden;position:relative;font-family:Inter,sans-serif;background:radial-gradient(1200px 700px at 75% 20%, #12233f 0%, ${NAVY} 55%, ${DEEP} 100%)}
</style></head><body>${body}</body></html>`;

const PREINSTALLED = "/opt/pw-browsers/chromium";
const executablePath = existsSync(PREINSTALLED) ? PREINSTALLED : undefined;
const browser = await chromium.launch({
  executablePath,
  args: ["--no-sandbox", "--disable-dev-shm-usage"],
});
const page = await browser.newPage({
  viewport: { width: W, height: H },
  deviceScaleFactor: 1,
});

for (const [name, scene] of Object.entries(SCENES)) {
  await page.setContent(pageHtml(scene()), { waitUntil: "load" });
  await page.evaluate(() => (document as unknown as { fonts: { ready: Promise<unknown> } }).fonts.ready);
  const file = join(OUT_DIR, `${name}.jpg`);
  writeFileSync(file, await page.screenshot({ type: "jpeg", quality: 82 }));
  console.log(`art: ${name}.jpg written, ${(statSync(file).size / 1024).toFixed(0)}KB`);
}
await browser.close();
