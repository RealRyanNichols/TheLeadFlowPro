import { execFileSync } from "node:child_process";
import { mkdirSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";

const root = process.cwd();
const outDir = join(root, "public", "images", "social");
mkdirSync(outDir, { recursive: true });

const iconPath = join(root, "public", "images", "leadflow-pro-app-icon-512.png");
const iconBase64 = readFileSync(iconPath).toString("base64");

const cards = [
  {
    slug: "pulse",
    eyebrow: "Live LeadFlow Counter",
    title: "Watch The Site Think In Public.",
    subtitle:
      "Live views, dwell time, source trails, share backs, click intent, and probability signals.",
  },
  {
    slug: "book-call",
    eyebrow: "The LeadFlow Pro",
    title: "Book a 10-Minute Call",
    subtitle:
      "Ten minutes. We decide the next move. Serious buyers get routed into the right service fast.",
  },
  {
    slug: "pulse-live-views",
    eyebrow: "Pulse Signal: Live Views",
    title: "Live Views Show Whether Attention Is Actually Here",
    subtitle:
      "See active visitors, today's views, returning movement, and whether attention is building or fading in real time.",
  },
  {
    slug: "pulse-dwell-time",
    eyebrow: "Pulse Signal: Dwell Time",
    title: "Dwell Time Shows Whether The Page Holds Attention",
    subtitle:
      "Track visible time, engagement seconds, section views, and whether people stay long enough to understand the offer.",
  },
  {
    slug: "pulse-traffic-sources",
    eyebrow: "Pulse Signal: Sources",
    title: "Traffic Sources Show Where The Attention Came From",
    subtitle:
      "UTMs, share links, referrals, direct traffic, and social platforms become a source trail instead of mystery traffic.",
  },
  {
    slug: "pulse-click-intent",
    eyebrow: "Pulse Signal: Click Intent",
    title: "Click Intent Shows What Visitors Are Trying To Do",
    subtitle:
      "Service clicks, calendar clicks, checkout starts, dead clicks, copy signals, and external clicks reveal visitor intent.",
  },
  {
    slug: "pulse-share-backs",
    eyebrow: "Pulse Signal: Share Backs",
    title: "Share Backs Show Whether Social Attention Returns",
    subtitle:
      "Tracked share URLs connect social posts back to site visits, click-throughs, reported views, and platform performance.",
  },
  {
    slug: "pulse-predictions",
    eyebrow: "Pulse Signal: Predictions",
    title: "Prediction Scores Turn Behavior Into The Next Move",
    subtitle:
      "The model studies views, clicks, dwell time, shares, source quality, and conversion pressure to recommend what to build next.",
  },
  {
    slug: "pulse-speed-friction",
    eyebrow: "Pulse Signal: Speed + Friction",
    title: "Speed And Friction Show Where The Page Makes People Fight",
    subtitle:
      "Track page speed, CTA impressions, form submits, video actions, dead clicks, and rage clicks before buying more traffic.",
  },
  {
    slug: "pulse-reward-loop",
    eyebrow: "Pulse Signal: Reward Loop",
    title: "The Reward Loop Makes Attention Worth Coming Back For",
    subtitle:
      "Proof Points reward staying, clicking, sharing, learning, and returning before any crypto layer is needed.",
  },
];

function escapeXml(value) {
  return String(value)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

function wrapText(text, maxChars, maxLines) {
  const words = text.split(/\s+/).filter(Boolean);
  const lines = [];
  let line = "";
  for (const word of words) {
    const next = line ? `${line} ${word}` : word;
    if (next.length > maxChars && line) {
      lines.push(line);
      line = word;
      if (lines.length === maxLines - 1) break;
    } else {
      line = next;
    }
  }
  if (line && lines.length < maxLines) lines.push(line);
  return lines;
}

function svgCard(card) {
  const titleLines = wrapText(card.title, 28, 3);
  const subtitleLines = wrapText(card.subtitle, 58, 3);

  return `<?xml version="1.0" encoding="UTF-8"?>
<svg xmlns="http://www.w3.org/2000/svg" width="1200" height="630" viewBox="0 0 1200 630">
  <defs>
    <linearGradient id="bg" x1="0" x2="1" y1="0" y2="1">
      <stop offset="0%" stop-color="#041023"/>
      <stop offset="48%" stop-color="#071b38"/>
      <stop offset="100%" stop-color="#021025"/>
    </linearGradient>
    <linearGradient id="cyan" x1="0" x2="1">
      <stop offset="0%" stop-color="#5cd0ff"/>
      <stop offset="100%" stop-color="#21e6f2"/>
    </linearGradient>
    <linearGradient id="gold" x1="0" x2="1">
      <stop offset="0%" stop-color="#ffd66b"/>
      <stop offset="100%" stop-color="#f07a10"/>
    </linearGradient>
    <filter id="shadow" x="-20%" y="-20%" width="140%" height="140%">
      <feDropShadow dx="0" dy="18" stdDeviation="18" flood-color="#000000" flood-opacity="0.38"/>
    </filter>
  </defs>
  <rect width="1200" height="630" fill="url(#bg)"/>
  <circle cx="1035" cy="92" r="300" fill="#21e6f2" opacity="0.10"/>
  <circle cx="145" cy="560" r="260" fill="#ffd66b" opacity="0.10"/>
  <path d="M0 578 C230 530 436 620 651 550 C850 485 977 515 1200 430 L1200 630 L0 630 Z" fill="#0b254a" opacity="0.62"/>
  <image href="data:image/png;base64,${iconBase64}" x="70" y="54" width="140" height="140"/>
  <text x="230" y="122" font-family="Arial, Helvetica, sans-serif" font-size="44" font-weight="800" fill="#ffffff">The </text>
  <text x="318" y="122" font-family="Arial, Helvetica, sans-serif" font-size="44" font-weight="900" fill="#21e6f2">LeadFlow</text>
  <text x="548" y="122" font-family="Arial, Helvetica, sans-serif" font-size="44" font-weight="900" fill="#ffd66b"> Pro</text>
  <rect x="82" y="214" width="360" height="44" rx="22" fill="#071b38" stroke="#21e6f2" stroke-opacity="0.55"/>
  <text x="106" y="243" font-family="Arial, Helvetica, sans-serif" font-size="18" font-weight="800" letter-spacing="3" fill="#a8f4ff">${escapeXml(card.eyebrow.toUpperCase())}</text>
  ${titleLines
    .map(
      (line, index) =>
        `<text x="82" y="${322 + index * 64}" font-family="Arial, Helvetica, sans-serif" font-size="58" font-weight="900" fill="${
          index === titleLines.length - 1 ? "#ffd66b" : "#ffffff"
        }">${escapeXml(line)}</text>`,
    )
    .join("\n  ")}
  ${subtitleLines
    .map(
      (line, index) =>
        `<text x="84" y="${508 + index * 30}" font-family="Arial, Helvetica, sans-serif" font-size="24" font-weight="600" fill="#d8e9ff">${escapeXml(line)}</text>`,
    )
    .join("\n  ")}
  <g transform="translate(770 250)" filter="url(#shadow)">
    <path d="M70 72 C70 44 250 44 250 72 C250 100 70 100 70 72 Z" fill="url(#cyan)" opacity="0.98"/>
    <path d="M82 106 H238 L204 194 H116 Z" fill="url(#cyan)" opacity="0.91"/>
    <path d="M121 214 H194 L175 282 H140 Z" fill="url(#cyan)" opacity="0.82"/>
    <path d="M-8 290 C102 340 306 232 374 24" fill="none" stroke="url(#gold)" stroke-width="32" stroke-linecap="round"/>
    <path d="M351 26 L420 -14 L405 69 Z" fill="url(#gold)"/>
    <circle cx="260" cy="282" r="32" fill="url(#gold)"/>
    <rect x="311" y="238" width="20" height="74" rx="4" fill="url(#gold)"/>
    <rect x="347" y="198" width="20" height="114" rx="4" fill="url(#gold)"/>
  </g>
  <g transform="translate(710 178)">
    <circle cx="0" cy="0" r="34" fill="#071b38" stroke="#21e6f2" stroke-opacity="0.5"/>
    <circle cx="104" cy="0" r="34" fill="#071b38" stroke="#21e6f2" stroke-opacity="0.5"/>
    <circle cx="208" cy="0" r="34" fill="#071b38" stroke="#21e6f2" stroke-opacity="0.5"/>
    <path d="M34 0 H70 M138 0 H174" stroke="#21e6f2" stroke-width="5" opacity="0.65"/>
    <text x="-13" y="12" font-family="Arial, Helvetica, sans-serif" font-size="34" font-weight="900" fill="#21e6f2">1</text>
    <text x="91" y="12" font-family="Arial, Helvetica, sans-serif" font-size="34" font-weight="900" fill="#21e6f2">0</text>
    <text x="195" y="12" font-family="Arial, Helvetica, sans-serif" font-size="34" font-weight="900" fill="#ffd66b">1</text>
  </g>
</svg>`;
}

for (const card of cards) {
  const svgPath = join(tmpdir(), `${card.slug}-${Date.now()}.svg`);
  const pngPath = join(outDir, `${card.slug}.png`);
  writeFileSync(svgPath, svgCard(card), "utf8");
  execFileSync("sips", ["-s", "format", "png", svgPath, "--out", pngPath], {
    stdio: "ignore",
  });
  rmSync(svgPath, { force: true });
  console.log(`wrote ${pngPath}`);
}
