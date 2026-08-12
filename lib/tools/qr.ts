// QR generation, done here instead of by somebody else's server.
//
// The old QR block pointed an <img> at a third-party API, which meant every code
// on the site depended on a service we do not control, could not be exported as
// SVG, and leaked whatever was being encoded to a third party. This encodes
// locally, so codes keep working inside an embed on someone else's site, export
// cleanly at print resolution, and never leave the browser.

import qrcode from "qrcode-generator";

export type ErrorCorrection = "L" | "M" | "Q" | "H";

export const ERROR_CORRECTION_LEVELS: { value: ErrorCorrection; label: string; recovers: string }[] = [
  { value: "L", label: "Low", recovers: "about 7 percent damage. Smallest code, screens only." },
  { value: "M", label: "Medium", recovers: "about 15 percent damage. The usual choice." },
  { value: "Q", label: "High", recovers: "about 25 percent damage. Good for printed signs." },
  { value: "H", label: "Highest", recovers: "about 30 percent damage. Use outdoors or with a logo." },
];

export type QrOptions = {
  data: string;
  /** Error correction level. Higher survives more scuffs and takes more modules. */
  level?: ErrorCorrection;
  /** Quiet zone in modules. Four is the specified minimum. Below that, scanners fail. */
  quietZone?: number;
  dark?: string;
  light?: string;
};

export type QrModel = {
  /** modules[row][col], true where the code is dark. */
  modules: boolean[][];
  /** Side length in modules, excluding the quiet zone. */
  count: number;
  /** Side length in modules, including the quiet zone. */
  total: number;
  quietZone: number;
  dark: string;
  light: string;
};

export const QR_MAX_BYTES = 2_300;

/** Encode once. Everything else renders from this model. */
export function buildQr(opts: QrOptions): QrModel {
  const { data, level = "M", quietZone = 4, dark = "#0A1220", light = "#FFFFFF" } = opts;
  const qz = Math.max(0, Math.min(16, Math.round(quietZone)));

  // Version 0 lets the library pick the smallest version that fits.
  const qr = qrcode(0, level);
  qr.addData(data);
  qr.make();

  const count = qr.getModuleCount();
  const modules: boolean[][] = [];
  for (let r = 0; r < count; r++) {
    const row: boolean[] = [];
    for (let c = 0; c < count; c++) row.push(qr.isDark(r, c));
    modules.push(row);
  }

  return { modules, count, total: count + qz * 2, quietZone: qz, dark, light };
}

/** Vector output. Prints at any size and is what a sign shop wants. */
export function qrToSvg(model: QrModel, pixelSize = 1024): string {
  const { modules, count, quietZone, total, dark, light } = model;

  // One path for every dark module keeps the file small and avoids hairline gaps
  // between adjacent rectangles when a printer rasterises it.
  let d = "";
  for (let r = 0; r < count; r++) {
    for (let c = 0; c < count; c++) {
      if (modules[r][c]) d += `M${c + quietZone} ${r + quietZone}h1v1h-1z`;
    }
  }

  return `<svg xmlns="http://www.w3.org/2000/svg" width="${pixelSize}" height="${pixelSize}" viewBox="0 0 ${total} ${total}" shape-rendering="crispEdges" role="img" aria-label="QR code">
<rect width="${total}" height="${total}" fill="${light}"/>
<path d="${d}" fill="${dark}"/>
</svg>`;
}

/**
 * Raster output at an exact pixel size. Modules are snapped to whole pixels so
 * the code never comes out blurry, which is the usual reason a printed code
 * fails to scan.
 */
export function qrToCanvas(model: QrModel, targetPx = 1024): HTMLCanvasElement {
  const { modules, count, quietZone, total, dark, light } = model;
  const scale = Math.max(1, Math.floor(targetPx / total));
  const size = scale * total;

  const canvas = document.createElement("canvas");
  canvas.width = size;
  canvas.height = size;
  const ctx = canvas.getContext("2d");
  if (!ctx) return canvas;

  ctx.fillStyle = light;
  ctx.fillRect(0, 0, size, size);
  ctx.fillStyle = dark;
  for (let r = 0; r < count; r++) {
    for (let c = 0; c < count; c++) {
      if (modules[r][c]) {
        ctx.fillRect((c + quietZone) * scale, (r + quietZone) * scale, scale, scale);
      }
    }
  }
  return canvas;
}

/* ------------------------------ contrast check ----------------------------- */

function channel(v: number) {
  const s = v / 255;
  return s <= 0.03928 ? s / 12.92 : ((s + 0.055) / 1.055) ** 2.4;
}

export function parseHex(hex: string): [number, number, number] | null {
  const m = /^#?([0-9a-f]{3}|[0-9a-f]{6})$/i.exec(hex.trim());
  if (!m) return null;
  let h = m[1];
  if (h.length === 3) h = h.split("").map((c) => c + c).join("");
  return [parseInt(h.slice(0, 2), 16), parseInt(h.slice(2, 4), 16), parseInt(h.slice(4, 6), 16)];
}

export function luminance(hex: string): number | null {
  const rgb = parseHex(hex);
  if (!rgb) return null;
  const [r, g, b] = rgb.map(channel);
  return 0.2126 * r + 0.7152 * g + 0.0722 * b;
}

/** Contrast ratio between the dark and light modules, on the WCAG scale. */
export function qrContrast(dark: string, light: string): number | null {
  const a = luminance(dark);
  const b = luminance(light);
  if (a === null || b === null) return null;
  const [hi, lo] = a > b ? [a, b] : [b, a];
  return (hi + 0.05) / (lo + 0.05);
}

export type ContrastVerdict = { ratio: number; tone: "good" | "warn" | "bad"; text: string };

/**
 * Scanner tolerance is not a published standard, so this reports the measured
 * ratio and gives practical guidance rather than claiming a pass or fail.
 */
export function qrContrastVerdict(dark: string, light: string): ContrastVerdict | null {
  const ratio = qrContrast(dark, light);
  if (ratio === null) return null;
  const r = Math.round(ratio * 10) / 10;
  if (ratio >= 7) {
    return { ratio: r, tone: "good", text: `Contrast ratio ${r} to 1. Scans reliably, including on a printed sign in poor light.` };
  }
  if (ratio >= 4) {
    return { ratio: r, tone: "warn", text: `Contrast ratio ${r} to 1. Fine on a screen. Test a printed copy before you order a hundred of them.` };
  }
  return { ratio: r, tone: "bad", text: `Contrast ratio ${r} to 1. Too low. Many phones will not lock onto this. Darken the code or lighten the background.` };
}

/** A light code on a dark background is inverted, which many scanners reject. */
export function qrIsInverted(dark: string, light: string): boolean {
  const d = luminance(dark);
  const l = luminance(light);
  return d !== null && l !== null && d > l;
}
