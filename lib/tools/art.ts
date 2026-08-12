// Original artwork for every tool, generated from the registry.
//
// Why generated SVG instead of stock photography: a library heading for 250
// tools needs 250 relevant, on-brand, correctly cropped images. Stock photos of
// people pointing at laptops are not relevant to a concrete calculator, they
// carry licence baggage, and they weigh more than the page around them. These
// are original compositions built from the same palette as the site, they are
// crisp at any size, they lazy-load in a few kilobytes, and the tool type is
// readable at thumbnail size. Every file is written to /public and served from
// our own origin. Nothing is hotlinked. See docs/TOOL_IMAGE_SOURCES.md.
//
// This module is pure string building with no imports from the registry, so the
// generator script, the pages and the OG route can all share it.

import { DOMAINS, TOOL_TYPES, type Domain, type ToolType } from "./taxonomy";

/** Deterministic hue per slug so two tools never draw the same picture. */
export function artHash(slug: string): number {
  let h = 2166136261;
  for (let i = 0; i < slug.length; i++) {
    h ^= slug.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return Math.abs(h);
}

const PAGE = "#F7F5F2";
const INK = "#0A1220";
const PANEL = "#FFFFFF";

/* --------------------------------- glyphs ---------------------------------- */

/**
 * Line-art marks drawn on a 64 x 64 grid. `a` is the domain accent, `i` the ink.
 * Each one has to be recognisable at 40 pixels, which rules out fine detail.
 */
type Glyph = (a: string, i: string) => string;

const S = (d: string, stroke: string, w = 3.2, extra = "") =>
  `<path d="${d}" fill="none" stroke="${stroke}" stroke-width="${w}" stroke-linecap="round" stroke-linejoin="round"${extra ? " " + extra : ""}/>`;

const GLYPHS: Record<ToolType, Glyph> = {
  // calculator: body, display, keypad
  calculator: (a, i) =>
    `<rect x="14" y="6" width="36" height="52" rx="6" fill="none" stroke="${i}" stroke-width="3.2"/>` +
    `<rect x="20" y="13" width="24" height="10" rx="2.5" fill="${a}" opacity="0.9"/>` +
    [0, 1, 2].
      map((r) =>
        [0, 1, 2]
          .map(
            (c) =>
              `<circle cx="${23 + c * 9}" cy="${33 + r * 9}" r="2.6" fill="${r === 2 && c === 2 ? a : i}" opacity="${r === 2 && c === 2 ? 1 : 0.55}"/>`,
          )
          .join(""),
      )
      .join(""),

  // estimator: a bracketed range with a needle landing inside it
  estimator: (a, i) =>
    S("M10 44 L10 52 M54 44 L54 52 M10 48 L54 48", i) +
    S("M32 12 L32 40", a, 3.6) +
    `<circle cx="32" cy="42" r="4.5" fill="${a}"/>` +
    S("M18 26 A 18 18 0 0 1 46 26", i, 3.2, 'stroke-dasharray="4 5" opacity="0.75"'),

  // generator: a page with a spark coming off it
  generator: (a, i) =>
    S("M16 8 L38 8 L48 18 L48 56 L16 56 Z", i) +
    S("M38 8 L38 18 L48 18", i) +
    S("M23 30 L41 30 M23 38 L41 38 M23 46 L34 46", i, 2.8, 'opacity="0.6"') +
    `<path d="M50 30 L53 38 L61 41 L53 44 L50 52 L47 44 L39 41 L47 38 Z" fill="${a}"/>`,

  // planner: month grid with a scheduled run highlighted
  planner: (a, i) =>
    S("M10 14 L54 14 L54 56 L10 56 Z", i) +
    S("M10 26 L54 26 M20 8 L20 18 M44 8 L44 18", i) +
    `<rect x="16" y="32" width="20" height="7" rx="2" fill="${a}"/>` +
    `<rect x="28" y="43" width="20" height="7" rx="2" fill="${a}" opacity="0.45"/>`,

  // builder: modules snapping into a frame
  builder: (a, i) =>
    S("M8 12 L8 52 M56 12 L56 52 M8 12 L16 12 M8 52 L16 52 M56 12 L48 12 M56 52 L48 52", i) +
    `<rect x="18" y="16" width="28" height="12" rx="3" fill="${i}" opacity="0.85"/>` +
    `<rect x="18" y="32" width="28" height="12" rx="3" fill="${a}"/>` +
    S("M22 50 L42 50", i, 2.8, 'opacity="0.5"'),

  // checker: magnifier over a document, one line flagged
  checker: (a, i) =>
    S("M14 8 L44 8 L44 56 L14 56 Z", i) +
    S("M21 20 L37 20 M21 28 L37 28", i, 2.8, 'opacity="0.55"') +
    `<circle cx="40" cy="40" r="12" fill="${PANEL}" stroke="${a}" stroke-width="3.6"/>` +
    S("M49 49 L58 58", a, 3.6),

  // scorecard: ranked columns with the winner ticked
  scorecard: (a, i) =>
    S("M10 56 L56 56", i) +
    `<rect x="14" y="38" width="10" height="18" rx="2.5" fill="${i}" opacity="0.35"/>` +
    `<rect x="28" y="28" width="10" height="28" rx="2.5" fill="${i}" opacity="0.55"/>` +
    `<rect x="42" y="16" width="10" height="40" rx="2.5" fill="${a}"/>` +
    S("M43 8 L46 11 L52 5", a, 3.6),

  // converter: two frames, one becoming the other
  converter: (a, i) =>
    `<rect x="6" y="14" width="22" height="22" rx="4" fill="none" stroke="${i}" stroke-width="3.2"/>` +
    `<rect x="36" y="28" width="22" height="22" rx="4" fill="${a}" opacity="0.9"/>` +
    S("M31 21 L44 21 M39 16 L44 21 L39 26", i) +
    S("M33 43 L20 43 M25 38 L20 43 L25 48", i),

  // checklist: ticked boxes and one still open
  checklist: (a, i) =>
    `<rect x="10" y="10" width="13" height="13" rx="3" fill="${a}"/>` +
    S("M13.5 16.5 L16 19 L20 14", PANEL, 2.8) +
    `<rect x="10" y="28" width="13" height="13" rx="3" fill="${a}"/>` +
    S("M13.5 34.5 L16 37 L20 32", PANEL, 2.8) +
    `<rect x="10" y="46" width="13" height="13" rx="3" fill="none" stroke="${i}" stroke-width="3"/>` +
    S("M30 16 L56 16 M30 34 L56 34 M30 52 L47 52", i, 2.8, 'opacity="0.6"'),

  // template: a page with the fields still to fill
  template: (a, i) =>
    S("M14 6 L50 6 L50 58 L14 58 Z", i) +
    `<rect x="21" y="14" width="22" height="8" rx="2" fill="${a}"/>` +
    `<rect x="21" y="28" width="22" height="6" rx="2" fill="${i}" opacity="0.18"/>` +
    `<rect x="21" y="38" width="22" height="6" rx="2" fill="${i}" opacity="0.18"/>` +
    S("M21 50 L36 50", i, 2.8, 'stroke-dasharray="3 4"'),

  // qr: finder patterns plus modules
  qr: (a, i) => {
    const finder = (x: number, y: number, c: string) =>
      `<rect x="${x}" y="${y}" width="17" height="17" rx="3" fill="none" stroke="${c}" stroke-width="3.4"/>` +
      `<rect x="${x + 5.5}" y="${y + 5.5}" width="6" height="6" rx="1.5" fill="${c}"/>`;
    const mods = [
      [38, 38], [46, 38], [38, 46], [52, 46], [46, 52], [38, 58], [52, 58],
    ]
      .map(([x, y]) => `<rect x="${x}" y="${y}" width="5.5" height="5.5" rx="1" fill="${i}" opacity="0.7"/>`)
      .join("");
    return finder(6, 6, i) + finder(41, 6, a) + finder(6, 41, i) + mods;
  },

  // link: a chain that holds
  link: (a, i) =>
    S("M26 38 L38 26", i, 3.6) +
    S("M22 30 L15 37 A 10 10 0 0 0 29 51 L36 44", a, 3.6) +
    S("M42 34 L49 27 A 10 10 0 0 0 35 13 L28 20", i, 3.6),

  // social-preview: an image frame with the share card sitting on it
  "social-preview": (a, i) =>
    `<rect x="6" y="12" width="42" height="30" rx="4" fill="none" stroke="${i}" stroke-width="3.2"/>` +
    S("M11 34 L21 25 L28 31 L36 22 L43 30", i, 2.8, 'opacity="0.6"') +
    `<circle cx="38" cy="21" r="3.2" fill="${i}" opacity="0.35"/>` +
    `<rect x="24" y="36" width="34" height="20" rx="4" fill="${PANEL}" stroke="${a}" stroke-width="3.2"/>` +
    S("M30 43 L52 43 M30 49 L44 49", a, 2.6, 'opacity="0.8"'),
};

/* ------------------------------- composition ------------------------------- */

export type ArtVariant = "card" | "hero";

const DIMS: Record<ArtVariant, { w: number; h: number }> = {
  card: { w: 1200, h: 675 },
  hero: { w: 1600, h: 900 },
};

/**
 * The picture. A warm paper ground, a soft field of the domain colour, a fine
 * measuring grid, and the tool-type mark at a size you can read in a thumbnail.
 * The hash moves the field and the rules so the wall of cards has rhythm without
 * any two looking the same.
 */
export function toolArtSvg(opts: {
  slug: string;
  domain: Domain;
  toolType: ToolType;
  variant?: ArtVariant;
}): string {
  const { slug, domain, toolType, variant = "card" } = opts;
  const { w, h } = DIMS[variant];
  const accent = DOMAINS[domain].ink;
  const hash = artHash(slug);

  // Four arrangements. The mark alternates sides and the colour field sits
  // behind it rather than off in the corner, which is what stopped the earlier
  // version reading as a wall of empty paper.
  const layout = hash % 4;
  const markLeft = layout === 0 || layout === 3;
  const gridGap = variant === "card" ? 56 : 74;

  const glyphSize = Math.round(h * (variant === "card" ? 0.56 : 0.54));
  const cx = w * (markLeft ? 0.33 : 0.67) + (((hash >> 5) % 40) - 20);
  const cy = h * 0.5 + (((hash >> 7) % 26) - 13);
  const glyphX = cx - glyphSize / 2;
  const glyphY = cy - glyphSize / 2;
  const scale = glyphSize / 64;

  const blobR = h * (0.60 + ((hash >> 3) % 14) / 100);

  const gridLines: string[] = [];
  for (let x = gridGap; x < w; x += gridGap) gridLines.push(`<line x1="${x}" y1="0" x2="${x}" y2="${h}"/>`);
  for (let y = gridGap; y < h; y += gridGap) gridLines.push(`<line x1="0" y1="${y}" x2="${w}" y2="${y}"/>`);

  // A measuring rule sitting under the mark. The one nod to "this computes
  // something", anchored to the mark rather than floating in a corner.
  const ruleW = glyphSize * 1.15;
  const ruleX = cx - ruleW / 2;
  const ruleY = cy + glyphSize * 0.66;
  const ticks = Array.from({ length: 9 }, (_, k) => {
    const x = ruleX + (ruleW / 8) * k;
    return `<line x1="${x}" y1="${ruleY}" x2="${x}" y2="${ruleY + (k % 4 === 0 ? 16 : 9)}"/>`;
  }).join("");

  // A second, smaller field on the opposite side keeps the empty half from
  // reading as unfinished.
  const echoX = w * (markLeft ? 0.86 : 0.14);
  const echoY = h * (layout < 2 ? 0.24 : 0.78);

  return `<svg xmlns="http://www.w3.org/2000/svg" width="${w}" height="${h}" viewBox="0 0 ${w} ${h}" role="img">
<defs>
<clipPath id="c"><rect width="${w}" height="${h}"/></clipPath>
<radialGradient id="f" cx="50%" cy="50%" r="50%">
<stop offset="0%" stop-color="${accent}" stop-opacity="0.30"/>
<stop offset="55%" stop-color="${accent}" stop-opacity="0.11"/>
<stop offset="100%" stop-color="${accent}" stop-opacity="0"/>
</radialGradient>
<radialGradient id="e" cx="50%" cy="50%" r="50%">
<stop offset="0%" stop-color="${accent}" stop-opacity="0.16"/>
<stop offset="100%" stop-color="${accent}" stop-opacity="0"/>
</radialGradient>
</defs>
<g clip-path="url(#c)">
<rect width="${w}" height="${h}" fill="${PAGE}"/>
<g stroke="${INK}" stroke-width="1" opacity="0.055">${gridLines.join("")}</g>
<circle cx="${echoX}" cy="${echoY}" r="${h * 0.42}" fill="url(#e)"/>
<circle cx="${cx}" cy="${cy}" r="${blobR}" fill="url(#f)"/>
<g stroke="${accent}" stroke-width="2.5" opacity="0.55" stroke-linecap="round">${ticks}<line x1="${ruleX}" y1="${ruleY}" x2="${ruleX + ruleW}" y2="${ruleY}"/></g>
<g transform="translate(${glyphX} ${glyphY}) scale(${scale})">${GLYPHS[toolType](accent, INK)}</g>
</g>
</svg>`;
}

/** Alt text describing the picture, not the tool. Screen readers get the name elsewhere. */
export function toolArtAlt(name: string, toolType: ToolType, domain: Domain): string {
  return `Illustration for the ${name}: a ${TOOL_TYPES[toolType].label.toLowerCase()} mark on a ${DOMAINS[domain].label.toLowerCase()} background in The LeadFlow Pro colours.`;
}

export const ART_DIMS = DIMS;
