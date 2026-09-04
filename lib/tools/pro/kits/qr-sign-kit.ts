// QR Sign Kit.
//
// The free QR maker gives a working code. This gives the printed matter the
// code was always for: a poster, a counter card, a table tent, a sticker
// sheet and a window decal, in the buyer's brand, plus the vector file and a
// written order sheet a print shop can work from without a phone call.
//
// The quiet engineering is the sizing table: a code's reliable scan distance
// is roughly ten times its printed width, so every piece in the pack states
// the distance it is good for, and the pack refuses to render a code too
// dense for a sticker.

import {
  brandOf, count, num, str,
  type ProInfo, type Result, type ToolDocument, type ToolVisual, type Values,
} from "../../types";
import type { ProToolDef } from "../types";
import { buildQr, qrToSvg, qrContrastVerdict, QR_MAX_BYTES, type ErrorCorrection } from "../../qr";
import {
  bigNumbers, bullets, callout, checklist, esc, heading, MADE_WITH, numbered, pLead,
  paragraph, prettyPhone, printDoc, printDocument, resolveBrand, svgDoc, table, textDoc,
} from "../docs";

/* -------------------------------- payloads -------------------------------- */

export type CodeKind = "website" | "call" | "text" | "wifi" | "directions" | "pay" | "review";

const KIND_LABEL: Record<CodeKind, { label: string; verb: string }> = {
  website: { label: "Open our website", verb: "Visit the site" },
  call: { label: "Call us", verb: "Call now" },
  text: { label: "Text us", verb: "Send the text" },
  wifi: { label: "Join our WiFi", verb: "Connect" },
  directions: { label: "Get directions", verb: "Navigate" },
  pay: { label: "Pay us", verb: "Open payment" },
  review: { label: "Leave us a review", verb: "Review us" },
};

const wifiEscape = (s: string) => s.replace(/([\\;,:"])/g, "\\$1");

const telDigits = (s: string) => {
  const d = s.replace(/\D/g, "");
  if (d.length === 10) return `+1${d}`;
  if (d.length === 11 && d.startsWith("1")) return `+${d}`;
  return d ? `+${d}` : "";
};

const asUrl = (raw: string) => {
  const t = raw.trim();
  if (!t) return "";
  return /^https?:\/\//i.test(t) ? t : `https://${t}`;
};

/**
 * What the code actually encodes, per kind. Returns empty when the inputs a
 * kind needs are missing, and the signage says so instead of encoding junk.
 */
export function encodePayload(kind: CodeKind, v: { link: string; phone: string; smsBody: string; ssid: string; wifiPass: string; wifiSec: string; address: string }): string {
  switch (kind) {
    case "call": {
      const tel = telDigits(v.phone);
      return tel ? `tel:${tel}` : "";
    }
    case "text": {
      const tel = telDigits(v.phone);
      if (!tel) return "";
      // SMSTO survives more scanner apps than the sms: URI with a query.
      return `SMSTO:${tel}:${v.smsBody.trim().slice(0, 140)}`;
    }
    case "wifi": {
      const ssid = v.ssid.trim();
      if (!ssid) return "";
      const sec = v.wifiSec === "nopass" ? "nopass" : v.wifiSec === "WEP" ? "WEP" : "WPA";
      const pass = sec === "nopass" ? "" : `P:${wifiEscape(v.wifiPass)};`;
      return `WIFI:T:${sec};S:${wifiEscape(ssid)};${pass};`;
    }
    case "directions": {
      const q = (v.address.trim() || "").slice(0, 300);
      return q ? `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(q)}` : "";
    }
    default:
      return asUrl(v.link).slice(0, 1200);
  }
}

/* ---------------------------------- fields --------------------------------- */

const FIELDS: ProToolDef["fields"] = [
  {
    id: "kind", label: "What should scanning do", type: "select", def: "website", section: "The code",
    options: (Object.keys(KIND_LABEL) as CodeKind[]).map((k) => ({ value: k, label: KIND_LABEL[k].label })),
  },
  {
    id: "link", label: "The link", type: "text", def: "", section: "The code",
    placeholder: "yourbusiness.com/menu",
    help: "Used for website, pay and review codes. Paste exactly where the scan should land.",
  },
  {
    id: "phone", label: "The phone number", type: "text", def: "", section: "The code",
    placeholder: "(903) 555-0142", help: "Used for call and text codes.",
  },
  {
    id: "smsBody", label: "Pre-filled text message", type: "text", def: "I would like a quote", section: "The code",
    help: "Text codes open messaging with this already typed. Keep it short.",
  },
  {
    id: "ssid", label: "WiFi network name", type: "text", def: "", section: "The code",
    placeholder: "ShopGuest", help: "WiFi codes only.",
  },
  {
    id: "wifiPass", label: "WiFi password", type: "text", def: "", section: "The code",
    help: "WiFi codes only. It is baked into the code, so use the guest network.",
  },
  {
    id: "wifiSec", label: "WiFi security", type: "select", def: "WPA", section: "The code",
    options: [
      { value: "WPA", label: "WPA or WPA2 (the usual)" },
      { value: "WEP", label: "WEP (older routers)" },
      { value: "nopass", label: "Open network, no password" },
    ],
  },
  {
    id: "address", label: "The address", type: "text", def: "", section: "The code",
    placeholder: "2800 Gilmer Rd Suite 106, Longview, TX", help: "Directions codes only.",
  },
  {
    id: "headline", label: "The words on the sign", type: "text", def: "", section: "The sign",
    placeholder: "Scan for our menu", help: "Blank writes one that fits the code type.",
  },
  {
    id: "subline", label: "The smaller line under it", type: "text", def: "", section: "The sign",
    placeholder: "Takes about ten seconds", help: "Optional.",
  },
  {
    id: "level", label: "Toughness of the code", type: "select", def: "Q", section: "The sign",
    options: [
      { value: "M", label: "Standard, screens and clean prints" },
      { value: "Q", label: "Print grade, survives scuffs (recommended)" },
      { value: "H", label: "Outdoor grade, survives weather and damage" },
    ],
    help: "Tougher codes are denser. The kit checks the density still scans at sticker size.",
  },
];

/* ----------------------------------- run ----------------------------------- */

/** The pieces in the pack: name, printed code width in inches, where it lives. */
const PIECES = [
  { id: "poster", name: "Letter poster", codeInches: 3.4, home: "the wall or the window" },
  { id: "counter", name: "Counter card", codeInches: 2.4, home: "beside the till" },
  { id: "tent", name: "Table tent", codeInches: 2, home: "tables and waiting areas" },
  { id: "decal", name: "Window decal page", codeInches: 4.5, home: "the door glass, printed by a sign shop" },
  { id: "stickers", name: "Sticker sheet, six up", codeInches: 1.6, home: "equipment, invoices, packaging" },
] as const;

function run(v: Values): Result {
  const brand = resolveBrand(brandOf(v));
  const kind = (str(v, "kind", "website") || "website") as CodeKind;
  const level = (str(v, "level", "Q") || "Q") as ErrorCorrection;
  const payload = encodePayload(kind, {
    link: str(v, "link").slice(0, 1200),
    phone: str(v, "phone").slice(0, 40),
    smsBody: str(v, "smsBody").slice(0, 200),
    ssid: str(v, "ssid").slice(0, 80),
    wifiPass: str(v, "wifiPass").slice(0, 80),
    wifiSec: str(v, "wifiSec", "WPA"),
    address: str(v, "address").slice(0, 300),
  });
  const headline = (str(v, "headline").trim() || KIND_LABEL[kind].label).slice(0, 80);
  const subline = str(v, "subline").trim().slice(0, 120);

  const hasPayload = payload.length > 0;
  const tooLong = payload.length > QR_MAX_BYTES;
  const encoded = hasPayload && !tooLong ? payload : "https://www.theleadflowpro.com/tools/qr-code-maker";

  const verdict = qrContrastVerdict(brand.color, "#FFFFFF");
  const qrDark = verdict && verdict.tone === "good" ? brand.color : "#0A1220";
  const model = buildQr({ data: encoded, level, quietZone: 4, dark: qrDark, light: "#FFFFFF" });
  const qrSvg = qrToSvg(model, 2048);

  // Reliable scan distance is roughly ten times the printed width, and each
  // module should print at a millimeter or more for cheap phone cameras.
  const scanFeet = (inches: number) => Math.max(1, Math.round((inches * 10) / 12));
  const moduleMm = (inches: number) => (inches * 25.4) / model.total;
  const smallestSafe = PIECES.filter((p) => moduleMm(p.codeInches) >= 0.8);
  const stickerSafe = smallestSafe.some((p) => p.id === "stickers");

  const qrInline = (inches: number) =>
    `<span class="qr" style="width:${inches}in;height:${inches}in;display:inline-block">${qrSvg.replace(
      /width="\d+" height="\d+"/,
      `width="100%" height="100%"`,
    )}</span>`;

  const sampleNote = !hasPayload
    ? `<p style="margin-top:10px;font-size:11px;color:#b3261e;font-weight:700">SAMPLE CODE. Fill in the ${esc(kind)} details in the kit and reprint before using this.</p>`
    : tooLong
      ? `<p style="margin-top:10px;font-size:11px;color:#b3261e;font-weight:700">THAT CONTENT IS TOO LONG TO ENCODE RELIABLY. Shorten it and reprint.</p>`
      : "";

  const face = (inches: number) =>
    `<div class="sign cardface">
      <p class="headline">${esc(headline)}</p>
      ${subline ? `<p class="sub">${esc(subline)}</p>` : ""}
      ${qrInline(inches)}
      ${sampleNote}
      <p class="foot">${esc(brand.name)}${brand.phone ? ` &nbsp;·&nbsp; ${esc(brand.phone)}` : ""}</p>
    </div>`;

  const stickerCell =
    `<div class="cardface" style="display:inline-block;width:2.4in;margin:0 .12in .18in 0;padding:.14in;border:1px dashed #b9c6da;border-radius:10px;text-align:center;vertical-align:top">
      ${qrInline(1.6)}
      <p style="margin:6px 0 0;font-size:10.5px;font-weight:800">${esc(headline)}</p>
      <p style="margin:2px 0 0;font-size:9px;color:#5a6b85">${esc(brand.name)}</p>
    </div>`;

  const pack = printDocument(
    brand,
    `QR sign pack for ${brand.name}`,
    [
      {
        eyebrow: "Letter poster",
        title: "For the wall or the window",
        html: paragraph(`Readable from about ${scanFeet(3.4)} feet. Print on letter, trim if you like.`) + face(3.4),
      },
      {
        breakBefore: true,
        eyebrow: "Counter card",
        title: "Beside the till",
        html: paragraph(`Readable from about ${scanFeet(2.4)} feet. Cardstock holds up better than paper.`) + face(2.4),
      },
      {
        breakBefore: true,
        eyebrow: "Table tent",
        title: "Fold on the dashed line",
        html:
          paragraph("Same face on both sides so it reads from either seat.") +
          face(2) +
          `<div style="border-top:2px dashed #b9c6da;margin:18px 0"></div>` +
          face(2),
      },
      {
        breakBefore: true,
        eyebrow: "Window decal artwork",
        title: "For the sign shop",
        html:
          paragraph(
            `This page is the layout reference; the decal itself should be cut from the vector file in this kit. At six inches wide it reads from about ${scanFeet(6)} feet.`,
          ) + face(4.5),
      },
      {
        breakBefore: true,
        eyebrow: "Sticker sheet",
        title: "Six up, for equipment and invoices",
        html:
          (stickerSafe
            ? paragraph(`Readable from about ${scanFeet(1.6)} feet, close range on purpose.`)
            : callout(
                "This code is too dense for stickers",
                "What you encoded needs more squares than a sticker can print cleanly. Shorten the content or drop the toughness a level, and this page comes back.",
              )) + (stickerSafe ? stickerCell.repeat(6) : ""),
      },
    ],
    { footNote: MADE_WITH },
  );

  const orderSheet = [
    `PRINT ORDER SHEET, ${brand.name}`,
    "",
    "Hand this and the vector file (qr-code.svg in this kit) to any print or sign shop.",
    "",
    "WHAT THE CODE IS",
    `  Type: ${KIND_LABEL[kind].label}`,
    `  Encodes: ${hasPayload && !tooLong ? payload : "NOT SET YET, do not print until it is"}`,
    `  Error correction: level ${level}`,
    `  Colors: ${qrDark} on white. Never invert to light-on-dark; many phones will not scan it.`,
    "",
    "PIECES AND SIZES",
    ...PIECES.map(
      (p) =>
        `  ${p.name}: code ${p.codeInches} inches wide, lives at ${p.home}, scans from about ${scanFeet(p.codeInches)} feet`,
    ),
    "",
    "RULES THAT KEEP IT SCANNING",
    "  Keep the white margin around the code. It is part of the code.",
    "  Matte finish beats gloss; glare kills scans in sunlight.",
    "  Do not stretch it. Scale it square from the vector file only.",
    `  Smallest reliable print for this exact code: about ${dec2(model.total * 0.8 / 25.4)} inches wide.`,
    "",
    "TEST BEFORE VOLUME",
    "  Print one, scan it with two different phones, in the actual light it will live in.",
  ].join("\n");

  const vcard = [
    "BEGIN:VCARD",
    "VERSION:3.0",
    `FN:${brand.name}`,
    `ORG:${brand.name}`,
    ...(brand.phoneHref ? [`TEL;TYPE=WORK,VOICE:${brand.phoneHref}`] : []),
    ...(brand.email ? [`EMAIL;TYPE=WORK:${brand.email}`] : []),
    ...(brand.siteHref ? [`URL:${brand.siteHref}`] : []),
    ...(brand.city ? [`ADR;TYPE=WORK:;;${brand.city};;;;`] : []),
    "END:VCARD",
  ].join("\r\n");

  const documents: ToolDocument[] = [
    printDoc(
      "pack",
      "The sign pack",
      "Poster, counter card, table tent, decal artwork and sticker sheet, each sized to the distance it will be scanned from.",
      "qr-sign-pack.html",
      pack,
    ),
    svgDoc(
      "vector",
      "The code, vector",
      "The file a print or sign shop asks for. Scales from a sticker to a storefront without a blur.",
      "qr-code.svg",
      qrSvg,
    ),
    textDoc(
      "order",
      "Print shop order sheet",
      "Sizes, colors, finish and the rules that keep the code scanning, written so the shop needs no phone call.",
      "print-order-sheet.txt",
      orderSheet,
    ),
    // Only worth shipping once the brand kit can fill it. With no name set it
    // would be a five line file, and an empty deliverable cheapens the box.
    ...(brand.personalized
      ? [
          textDoc(
            "vcf",
            "Your contact card file",
            "A .vcf built from your brand kit. Attach it to emails or encode it later; phones save it straight to contacts.",
            "contact-card.vcf",
            vcard,
          ),
        ]
      : []),
  ];

  return {
    headline: {
      value: hasPayload && !tooLong ? `${model.count}×${model.count}` : "Not set",
      label: hasPayload && !tooLong ? "Your code, ready to print" : "The code needs its details",
      sub: hasPayload && !tooLong
        ? `level ${level}, scans from ${scanFeet(3.4)} feet on the poster`
        : tooLong
          ? "what you entered is too long to encode reliably"
          : `fill in the ${KIND_LABEL[kind].label.toLowerCase()} details above`,
      tone: hasPayload && !tooLong ? "good" : "warn",
    },
    explain: hasPayload && !tooLong
      ? `The code carries ${count(payload.length)} characters at toughness ${level}, which makes a ${model.count} by ${model.count} square grid. The pack prints it at five sizes, and the rule of thumb is simple: a code scans reliably from about ten times its printed width, so the poster works from across a room and the sticker works at arm's length.`
      : `Pick what scanning should do, fill in its one or two details, and the pack builds itself: poster, counter card, table tent, decal artwork and stickers, each sized honestly for the distance it will be scanned from.`,
    stats: [
      { label: "Encoded length", value: `${count(payload.length)} chars`, sub: `${count(QR_MAX_BYTES)} max` },
      { label: "Toughness", value: `Level ${level}`, sub: level === "H" ? "outdoor grade" : level === "Q" ? "print grade" : "standard" },
      {
        label: "Code color",
        value: qrDark === "#0A1220" ? "Ink" : "Your brand color",
        sub: qrDark === "#0A1220" && brand.color !== "#1240E8" ? "brand color lacks scan contrast" : undefined,
      },
      { label: "Sticker safe", value: stickerSafe ? "Yes" : "Too dense", tone: stickerSafe ? "good" : "warn" },
    ],
    table: {
      title: "Every piece, and the distance it is honest at",
      headers: ["Piece", "Code width", "Scans from about"],
      rows: PIECES.map((p) => [p.name, `${p.codeInches} in`, `${scanFeet(p.codeInches)} ft`]),
    },
    verdict: {
      tone: "neutral",
      text: "Print one page, scan it with two phones in the real light, then print the rest. The order sheet in the kit says the same thing to the print shop.",
    },
    assumptions: [
      "Scan distances use the ten times width rule of thumb; bright glare, curved surfaces and old cameras shorten it.",
      "A WiFi code carries the password in plain text inside the code. Use the guest network.",
      "The code renders in your brand color only when the contrast is strong enough to scan; otherwise it stays ink and says why.",
    ],
    documents,
  };
}

const dec2 = (n: number) => (Math.round(n * 10) / 10).toFixed(1);

/* ----------------------------------- kit ----------------------------------- */

const pro: ProInfo = {
  priceUsd: 10,
  promise:
    "One code, five finished pieces in your brand: poster, counter card, table tent, decal artwork and stickers, plus the vector file and the print shop order sheet.",
  kit: [
    "Sign pack: poster, counter card, table tent, decal, sticker sheet",
    "Vector code file a sign shop can scale to a storefront",
    "Print shop order sheet with sizes, colors and finish rules",
    "Contact card .vcf built from your brand kit",
  ],
  upgradeFrom: [
    "qr-code-maker",
    "wifi-qr-code",
    "sms-link-generator",
    "click-to-call-button",
    "google-maps-link-generator",
    "digital-business-card",
  ],
  freePreview:
    "Build the code, see its density, its scan distances and everything in the pack before paying.",
};

export const KIT: ProToolDef = {
  slug: "qr-sign-kit",
  name: "QR Sign Kit",
  short: "QR Sign Kit",
  emoji: "📐",
  category: "Generators",
  tagline: "The printed matter your code was always for",
  description:
    "Turn one QR code into the finished print set: a poster, a counter card, a table tent, decal artwork and a sticker sheet in your brand, each sized to the distance it will really be scanned from, with the vector file and a written order sheet for the print shop.",
  who: "Restaurants, shops, salons, trades, offices, churches, anyone who wants a code on paper, glass or a truck door.",
  problem:
    "The free code works, and then it gets pasted into a document at a random size, printed glossy, scanned by nobody, and the sign shop calls twice with questions.",
  payoff:
    "Five ready pieces and the exact file and instructions a printer needs, with the scan distances stated honestly on every one.",
  steps: [
    "Put your business name, color and logo in the brand kit once.",
    "Pick what scanning should do and fill in its one or two details.",
    "Choose the toughness; print grade survives scuffs, outdoor grade survives weather.",
    "Print the pack, hand the vector file and order sheet to the sign shop for the big pieces.",
  ],
  faqs: [
    {
      q: "Why does the kit talk about scan distance?",
      a: "Because most printed codes fail there. A code scans reliably from about ten times its printed width, so a one inch sticker is an arm's length code and a window decal needs six inches. Every piece in the pack states its honest distance.",
    },
    {
      q: "Can the code be in my brand color?",
      a: "When the contrast against white is strong enough to scan, yes, automatically. When it is not, the code stays ink and the kit says why, because a pretty code that does not scan is worth nothing.",
    },
    {
      q: "Is the WiFi password safe in a code?",
      a: "The password is baked into the code in plain text; that is how phones join with one scan. Use it for the guest network and change that password on its own schedule.",
    },
    {
      q: "Can I change the destination later?",
      a: "The content is encoded in the code itself, so a new destination means a reprint. Open the kit, change the details, print again; the kit rebuilds at no extra cost.",
    },
  ],
  domain: "websites-digital",
  toolType: "builder",
  goals: ["share-information", "create-marketing", "capture-leads"],
  industries: [
    "restaurant", "coffee-shop", "bar", "food-truck", "hair-salon", "nail-salon",
    "barbershop", "spa", "fitness", "retail", "auto-repair", "general-contracting",
    "church", "nonprofit", "event-venue", "hotel", "vacation-rental", "photography",
    "pet-services", "tourism",
  ],
  audiences: ["owners", "managers", "administrators", "volunteers"],
  keywords: [
    "qr code sign", "scan here sign", "qr code table tent", "qr code sticker sheet",
    "wifi qr sign", "qr code poster", "print qr code the right size", "qr code for sign shop",
  ],
  synonyms: ["qr signage pack", "qr print kit", "scan to pay sign"],
  disclaimer: "general-estimate",
  dataSensitivity: "none",
  popularity: 88,
  isNew: true,
  embedHeight: 1000,
  fields: FIELDS,
  run,
  pro,
};

export const VISUAL: ToolVisual = {
  visualConcept:
    "A family of printed pieces at their true relative sizes, poster to sticker, each carrying the same code, with a tape measure running under them.",
  visualFamily: "print-matter",
  primarySubject: "row of printed QR pieces at descending sizes",
  supportingSubjects: ["tape measure", "phone scanning the smallest piece"],
  sceneType: "still-life",
  composition: "pieces stepping down left to right across the middle band, tape measure along the base, phone entering lower right, negative space upper left",
  colorAccent: 2,
  cardImage: "/tools-art/card/qr-sign-kit.svg",
  cardImageAlt: "",
  heroImage: "/tools-art/hero/qr-sign-kit.svg",
  heroImageAlt: "Printed QR pieces from poster to sticker at their true relative sizes, with a tape measure beneath",
  ogImage: "/og/tools/qr-sign-kit.jpg",
  ogLayout: "split-compare",
  ogHook: "Poster to sticker, sized to the distance it scans from.",
  focalPoint: { x: 0.5, y: 0.55 },
  imageSource: "Original vector illustration, The LeadFlow Pro",
  license: "Original work, The LeadFlow Pro",
  sourceDate: "2026-09-03",
  visualReviewStatus: "review",
};
