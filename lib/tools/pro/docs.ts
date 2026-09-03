// The document builders every pro kit shares.
//
// A kit's job is to hand the buyer things they keep: a sign they print, a
// sheet they hang by the phone, a CSV their platform imports, reminders their
// phone fires. These helpers are how those come out looking like one company
// made them instead of eight different ones.
//
// The print documents are complete HTML pages. The engine opens one in a new
// tab where the buyer prints it or saves it as a PDF, which is why there is no
// PDF library anywhere in this repo: the browser already has one.
//
// Everything here is pure. Nothing fetches, nothing reads the clock unless it
// is handed a date, and every value that reaches HTML goes through esc() or a
// validator first, because the brand kit is user input.

import type { BrandKit, ToolDocument } from "../types";

/* -------------------------------- escaping -------------------------------- */

export function esc(value: unknown): string {
  return String(value ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

/**
 * A brand color is only ever a six digit hex. Anything else falls back to the
 * house ink, so nothing the buyer types can close the style attribute and
 * inject markup.
 */
export function safeColor(value: string | undefined, fallback = "#1240E8"): string {
  return /^#[0-9a-fA-F]{6}$/.test(value || "") ? (value as string) : fallback;
}

/**
 * A logo is accepted only as a small inline PNG, JPEG, WebP or SVG data URL.
 * The kit never fetches a remote logo, so a printed document works offline and
 * a hostile URL cannot phone home from the buyer's browser.
 */
export function safeLogo(value: string | undefined): string {
  const raw = (value || "").trim();
  if (!/^data:image\/(png|jpeg|jpg|webp|svg\+xml);base64,[A-Za-z0-9+/=]+$/.test(raw)) return "";
  return raw.length <= 400_000 ? raw : "";
}

/** A link the document can be trusted to render. http, https, tel and mailto only. */
export function safeUrl(value: string | undefined): string {
  const raw = (value || "").trim();
  if (!raw) return "";
  if (/^(tel:|mailto:)[^\s<>"']+$/i.test(raw)) return raw;
  const withScheme = /^https?:\/\//i.test(raw) ? raw : `https://${raw}`;
  try {
    const url = new URL(withScheme);
    return url.protocol === "http:" || url.protocol === "https:" ? url.toString() : "";
  } catch {
    return "";
  }
}

/* ------------------------------- formatting ------------------------------- */

export const usd = (n: number) =>
  (Number.isFinite(n) ? n : 0).toLocaleString("en-US", {
    style: "currency",
    currency: "USD",
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });

export const usd0 = (n: number) =>
  (Number.isFinite(n) ? n : 0).toLocaleString("en-US", {
    style: "currency",
    currency: "USD",
    maximumFractionDigits: 0,
  });

/**
 * Dates are handled as plain YYYY-MM-DD strings and formatted without a
 * timezone, because a follow-up on day 5 has to say the same date to the buyer
 * in Longview and to the calendar file their phone reads.
 */
export function addDays(iso: string, days: number): string {
  const [y, m, d] = iso.split("-").map(Number);
  const base = Date.UTC(y || 1970, (m || 1) - 1, d || 1);
  const next = new Date(base + days * 86_400_000);
  return next.toISOString().slice(0, 10);
}

const MONTHS = [
  "January", "February", "March", "April", "May", "June",
  "July", "August", "September", "October", "November", "December",
];
const WEEKDAYS = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];

export function longDate(iso: string): string {
  const [y, m, d] = iso.split("-").map(Number);
  if (!y || !m || !d) return iso;
  return `${MONTHS[m - 1]} ${d}, ${y}`;
}

export function weekdayOf(iso: string): string {
  const [y, m, d] = iso.split("-").map(Number);
  if (!y || !m || !d) return "";
  return WEEKDAYS[new Date(Date.UTC(y, m - 1, d)).getUTCDay()];
}

/** Push a date off Saturday and Sunday, because nobody follows up on Sunday. */
export function nextBusinessDay(iso: string): string {
  let out = iso;
  for (let i = 0; i < 7; i++) {
    const day = weekdayOf(out);
    if (day !== "Saturday" && day !== "Sunday") return out;
    out = addDays(out, 1);
  }
  return out;
}

/* --------------------------------- brand ---------------------------------- */

export type ResolvedBrand = {
  name: string;
  phone: string;
  phoneHref: string;
  email: string;
  site: string;
  siteHref: string;
  city: string;
  color: string;
  logo: string;
  /** True when the buyer has filled in enough for the documents to feel theirs. */
  personalized: boolean;
};

const telDigits = (s: string) => {
  const d = s.replace(/\D/g, "");
  if (d.length === 10) return `+1${d}`;
  if (d.length === 11 && d.startsWith("1")) return `+${d}`;
  return d ? `+${d}` : "";
};

export const prettyPhone = (s: string) => {
  const d = s.replace(/\D/g, "").slice(-10);
  if (d.length !== 10) return s.trim();
  return `(${d.slice(0, 3)}) ${d.slice(3, 6)}-${d.slice(6)}`;
};

/**
 * The brand kit, made safe and given fallbacks. A kit with an empty brand still
 * produces a complete document; it just says "Your business" where the name
 * would be, so the preview is honest about what filling the kit in changes.
 */
export function resolveBrand(kit: BrandKit): ResolvedBrand {
  const name = kit.brand_name.slice(0, 120);
  const phone = kit.brand_phone.slice(0, 40);
  const site = kit.brand_site.slice(0, 200);
  return {
    name: name || "Your business",
    phone: phone ? prettyPhone(phone) : "",
    phoneHref: telDigits(phone),
    email: kit.brand_email.slice(0, 200),
    site: site.replace(/^https?:\/\//i, "").replace(/\/$/, ""),
    siteHref: safeUrl(site),
    city: kit.brand_city.slice(0, 120),
    color: safeColor(kit.brand_color),
    logo: safeLogo(kit.brand_logo),
    personalized: Boolean(name),
  };
}

/* ------------------------------- print pages ------------------------------ */

export type PrintSheet = {
  /** Optional label above the page title. */
  eyebrow?: string;
  title: string;
  /** Body HTML. Build it with the block helpers below. */
  html: string;
  /** Forces a page break before this sheet when several share one document. */
  breakBefore?: boolean;
};

export type PrintOptions = {
  /** Page size and margins. Signage uses landscape or a fixed card size. */
  page?: "letter" | "letter-landscape" | "card-4x6" | "card-5x7" | "sticker-sheet";
  /** Hides the brand header block on pieces that carry their own layout. */
  bareHeader?: boolean;
  /** A line at the very bottom of every page. */
  footNote?: string;
};

const PAGE_CSS: Record<NonNullable<PrintOptions["page"]>, string> = {
  letter: "@page{size:Letter;margin:14mm 13mm}",
  "letter-landscape": "@page{size:Letter landscape;margin:12mm}",
  "card-4x6": "@page{size:6in 4in;margin:0}",
  "card-5x7": "@page{size:7in 5in;margin:0}",
  "sticker-sheet": "@page{size:Letter;margin:8mm}",
};

/**
 * A complete, self-contained printable document. No external stylesheet, no
 * webfont, no script: it opens, it looks right, it prints the same on the
 * buyer's machine as it does here, and it still works in five years.
 */
export function printDocument(
  brand: ResolvedBrand,
  documentTitle: string,
  sheets: PrintSheet[],
  options: PrintOptions = {},
): string {
  const page = options.page ?? "letter";
  const accent = brand.color;
  const header = options.bareHeader
    ? ""
    : `<header class="brandbar">
        ${brand.logo ? `<img class="logo" src="${esc(brand.logo)}" alt="">` : `<span class="mark" aria-hidden="true"></span>`}
        <div class="who">
          <strong>${esc(brand.name)}</strong>
          <span>${[brand.phone, brand.city, brand.site].filter(Boolean).map(esc).join(" &nbsp;·&nbsp; ")}</span>
        </div>
      </header>`;

  const body = sheets
    .map(
      (s) => `<section class="sheet${s.breakBefore ? " break" : ""}">
        ${header}
        ${s.eyebrow ? `<p class="eyebrow">${esc(s.eyebrow)}</p>` : ""}
        <h1>${esc(s.title)}</h1>
        ${s.html}
        ${options.footNote ? `<p class="foot">${esc(options.footNote)}</p>` : ""}
      </section>`,
    )
    .join("\n");

  return `<!doctype html>
<html lang="en"><head><meta charset="utf-8">
<meta name="viewport" content="width=device-width,initial-scale=1">
<title>${esc(documentTitle)}</title>
<style>
${PAGE_CSS[page]}
*{box-sizing:border-box}
html,body{margin:0;padding:0}
body{background:#eef1f6;color:#0e1a2e;font:15px/1.55 -apple-system,BlinkMacSystemFont,"Segoe UI",Inter,Roboto,Helvetica,Arial,sans-serif;-webkit-print-color-adjust:exact;print-color-adjust:exact}
.sheet{background:#fff;max-width:8.5in;margin:18px auto;padding:34px 38px;box-shadow:0 10px 30px #0e1a2e1f;border-radius:6px}
.brandbar{display:flex;align-items:center;gap:14px;padding-bottom:14px;margin-bottom:22px;border-bottom:3px solid ${accent}}
.brandbar .logo{max-height:52px;max-width:210px;object-fit:contain}
.brandbar .mark{width:34px;height:34px;border-radius:9px;background:${accent};flex:none}
.brandbar .who{display:flex;flex-direction:column;gap:2px;min-width:0}
.brandbar strong{font-size:19px;font-weight:800;letter-spacing:-.01em}
.brandbar span{font-size:12.5px;color:#5a6b85}
.eyebrow{margin:0 0 6px;font-size:11px;font-weight:800;letter-spacing:.15em;text-transform:uppercase;color:${accent}}
h1{margin:0 0 18px;font-size:27px;line-height:1.16;font-weight:800;letter-spacing:-.02em}
h2{margin:26px 0 10px;font-size:17px;font-weight:800;letter-spacing:-.01em}
h3{margin:18px 0 6px;font-size:14px;font-weight:800;text-transform:uppercase;letter-spacing:.06em;color:#5a6b85}
p{margin:0 0 11px}
ul,ol{margin:0 0 12px;padding-left:20px}
li{margin:0 0 6px}
table{width:100%;border-collapse:collapse;margin:0 0 16px;font-size:13.5px}
th{text-align:left;font-size:10.5px;letter-spacing:.09em;text-transform:uppercase;color:#5a6b85;border-bottom:2px solid #cfd8e6;padding:0 10px 7px 0}
td{padding:9px 10px 9px 0;border-bottom:1px solid #e6ecf5;vertical-align:top}
tr.total td{font-weight:800;border-top:2px solid #0e1a2e;border-bottom:none;font-size:15px}
td.num,th.num{text-align:right;font-variant-numeric:tabular-nums;padding-right:0}
.lede{font-size:16px;color:#3c4d67;margin-bottom:18px}
.callout{border-left:4px solid ${accent};background:${accent}0f;padding:13px 16px;border-radius:0 8px 8px 0;margin:0 0 16px}
.callout strong{display:block;margin-bottom:3px}
.big{display:flex;gap:14px;margin:0 0 18px;flex-wrap:wrap}
.big div{flex:1 1 150px;border:1px solid #dbe3ef;border-radius:10px;padding:13px 15px}
.big b{display:block;font-size:26px;font-weight:800;letter-spacing:-.02em;line-height:1.1;color:${accent}}
.big span{display:block;font-size:11px;font-weight:700;text-transform:uppercase;letter-spacing:.07em;color:#5a6b85;margin-top:4px}
.script{border:1px solid #dbe3ef;border-radius:10px;padding:14px 16px;margin:0 0 12px;background:#fbfcfe}
.script .tag{font-size:10.5px;font-weight:800;letter-spacing:.09em;text-transform:uppercase;color:${accent};margin-bottom:7px}
.script .msg{white-space:pre-wrap;font-size:14px;line-height:1.6}
.script .note{font-size:12px;color:#5a6b85;margin-top:9px;padding-top:9px;border-top:1px dashed #dbe3ef}
.check{list-style:none;padding:0}
.check li{display:flex;gap:10px;align-items:flex-start;padding:8px 0;border-bottom:1px solid #eef2f8}
.check li:before{content:"";width:15px;height:15px;border:2px solid #9fb0c8;border-radius:4px;flex:none;margin-top:2px}
.sign{display:flex;flex-direction:column;align-items:center;justify-content:center;text-align:center;height:100%;padding:26px}
.sign .headline{font-size:44px;font-weight:800;line-height:1.04;letter-spacing:-.03em;margin:0 0 10px}
.sign .sub{font-size:17px;color:#3c4d67;margin:0 0 20px;max-width:78%}
.sign .qr{width:2.5in;height:2.5in}
.sign .qr svg{width:100%;height:100%;display:block}
.sign .foot{margin-top:16px;font-size:15px;font-weight:700;color:${accent}}
.grid2{display:grid;grid-template-columns:1fr 1fr;gap:16px}
.foot{margin-top:22px;padding-top:11px;border-top:1px solid #e6ecf5;font-size:11px;color:#7d8ca4}
.sigline{margin-top:26px;display:grid;grid-template-columns:1fr 150px;gap:22px}
.sigline div{border-top:1px solid #0e1a2e;padding-top:6px;font-size:11.5px;color:#5a6b85}
.mono{font-family:ui-monospace,SFMono-Regular,Menlo,Consolas,monospace;font-size:12px;white-space:pre-wrap;word-break:break-word;background:#f5f8fc;border:1px solid #dbe3ef;border-radius:8px;padding:12px}
@media print{
  body{background:#fff}
  .sheet{margin:0;padding:0;box-shadow:none;border-radius:0;max-width:none}
  .sheet.break{break-before:page}
  .cardface{break-inside:avoid}
}
</style></head>
<body>${body}</body></html>`;
}

/* ------------------------------ block helpers ----------------------------- */

export function pLead(text: string): string {
  return `<p class="lede">${esc(text)}</p>`;
}

export function callout(title: string, body: string): string {
  return `<div class="callout"><strong>${esc(title)}</strong>${esc(body)}</div>`;
}

export function bigNumbers(items: { value: string; label: string }[]): string {
  return `<div class="big">${items
    .map((i) => `<div><b>${esc(i.value)}</b><span>${esc(i.label)}</span></div>`)
    .join("")}</div>`;
}

export function table(
  headers: string[],
  rows: (string | number)[][],
  options: { numeric?: number[]; totalRow?: boolean } = {},
): string {
  const numeric = new Set(options.numeric ?? []);
  const head = headers
    .map((h, i) => `<th${numeric.has(i) ? ' class="num"' : ""}>${esc(h)}</th>`)
    .join("");
  const body = rows
    .map((row, r) => {
      const isTotal = options.totalRow && r === rows.length - 1;
      const cells = row
        .map((cell, i) => `<td${numeric.has(i) ? ' class="num"' : ""}>${esc(cell)}</td>`)
        .join("");
      return `<tr${isTotal ? ' class="total"' : ""}>${cells}</tr>`;
    })
    .join("");
  return `<table><thead><tr>${head}</tr></thead><tbody>${body}</tbody></table>`;
}

export function scriptBlock(tag: string, message: string, note?: string): string {
  return `<div class="script"><div class="tag">${esc(tag)}</div><div class="msg">${esc(message)}</div>${
    note ? `<div class="note">${esc(note)}</div>` : ""
  }</div>`;
}

export function checklist(items: string[]): string {
  return `<ul class="check">${items.map((i) => `<li><span>${esc(i)}</span></li>`).join("")}</ul>`;
}

export function bullets(items: string[]): string {
  return `<ul>${items.map((i) => `<li>${esc(i)}</li>`).join("")}</ul>`;
}

export function numbered(items: string[]): string {
  return `<ol>${items.map((i) => `<li>${esc(i)}</li>`).join("")}</ol>`;
}

export function heading(text: string): string {
  return `<h2>${esc(text)}</h2>`;
}

export function paragraph(text: string): string {
  return `<p>${esc(text)}</p>`;
}

export function monoBlock(text: string): string {
  return `<div class="mono">${esc(text)}</div>`;
}

/** A signature and date pair at the bottom of an estimate or a notice. */
export function signatureLines(left = "Signature", right = "Date"): string {
  return `<div class="sigline"><div>${esc(left)}</div><div>${esc(right)}</div></div>`;
}

/* -------------------------------- csv / ics ------------------------------- */

/**
 * A spreadsheet the buyer opens in Excel or Sheets.
 *
 * Every cell is quoted, and any cell that opens with a formula character is
 * prefixed with an apostrophe first. Without that, a business called "=Kirby"
 * or a message beginning with a plus sign is evaluated as a formula the moment
 * the file is opened, which is how a generated CSV turns into somebody else's
 * problem. The apostrophe is the standard escape and does not display.
 */
export function csv(headers: string[], rows: (string | number)[][]): string {
  const cell = (v: string | number) => {
    const text = String(v);
    const safe = /^[=+\-@\t\r]/.test(text) ? `'${text}` : text;
    return `"${safe.replace(/"/g, '""')}"`;
  };
  return [headers.map(cell).join(","), ...rows.map((r) => r.map(cell).join(","))].join("\r\n");
}

export type CalendarEvent = {
  /** YYYY-MM-DD. All-day unless `time` is given. */
  date: string;
  /** HH:MM in 24 hour local time. */
  time?: string;
  minutes?: number;
  title: string;
  description?: string;
};

/**
 * A calendar file the buyer's phone actually accepts. Local time with no
 * timezone block, because the reminder should fire at nine in the morning
 * wherever they are, and folded to 74 octets the way RFC 5545 asks.
 */
export function ics(events: CalendarEvent[], calendarName: string): string {
  const stamp = "20260101T000000Z";
  const clean = (s: string) =>
    String(s).replace(/\\/g, "\\\\").replace(/;/g, "\\;").replace(/,/g, "\\,").replace(/\r?\n/g, "\\n");
  const fold = (line: string) => {
    if (line.length <= 74) return line;
    const parts = [line.slice(0, 74)];
    let rest = line.slice(74);
    while (rest.length > 73) {
      parts.push(` ${rest.slice(0, 73)}`);
      rest = rest.slice(73);
    }
    if (rest) parts.push(` ${rest}`);
    return parts.join("\r\n");
  };

  const lines: string[] = [
    "BEGIN:VCALENDAR",
    "VERSION:2.0",
    "PRODID:-//The LeadFlow Pro//Pro Kit//EN",
    "CALSCALE:GREGORIAN",
    "METHOD:PUBLISH",
    fold(`X-WR-CALNAME:${clean(calendarName)}`),
  ];

  events.forEach((event, index) => {
    const day = event.date.replace(/-/g, "");
    lines.push("BEGIN:VEVENT");
    lines.push(`UID:lfp-${day}-${index}@theleadflowpro.com`);
    lines.push(`DTSTAMP:${stamp}`);
    if (event.time) {
      const start = `${day}T${event.time.replace(":", "")}00`;
      const [h, m] = event.time.split(":").map(Number);
      const endMinutes = h * 60 + m + (event.minutes ?? 30);
      const endDayOffset = Math.floor(endMinutes / 1440);
      const wrapped = ((endMinutes % 1440) + 1440) % 1440;
      const endDay = (endDayOffset ? addDays(event.date, endDayOffset) : event.date).replace(/-/g, "");
      const end = `${endDay}T${String(Math.floor(wrapped / 60)).padStart(2, "0")}${String(wrapped % 60).padStart(2, "0")}00`;
      lines.push(`DTSTART:${start}`);
      lines.push(`DTEND:${end}`);
    } else {
      lines.push(`DTSTART;VALUE=DATE:${day}`);
      lines.push(`DTEND;VALUE=DATE:${addDays(event.date, 1).replace(/-/g, "")}`);
    }
    lines.push(fold(`SUMMARY:${clean(event.title)}`));
    if (event.description) lines.push(fold(`DESCRIPTION:${clean(event.description)}`));
    lines.push("BEGIN:VALARM", "TRIGGER:-PT30M", "ACTION:DISPLAY", "DESCRIPTION:Reminder", "END:VALARM");
    lines.push("END:VEVENT");
  });

  lines.push("END:VCALENDAR");
  return lines.join("\r\n");
}

/* -------------------------------- documents ------------------------------- */

export function printDoc(
  id: string,
  title: string,
  blurb: string,
  filename: string,
  body: string,
): ToolDocument {
  return { id, title, blurb, filename, format: "print-html", body };
}

export function textDoc(
  id: string,
  title: string,
  blurb: string,
  filename: string,
  body: string,
): ToolDocument {
  return { id, title, blurb, filename, format: "txt", body };
}

export function csvDoc(
  id: string,
  title: string,
  blurb: string,
  filename: string,
  headers: string[],
  rows: (string | number)[][],
): ToolDocument {
  return { id, title, blurb, filename, format: "csv", body: csv(headers, rows) };
}

export function icsDoc(
  id: string,
  title: string,
  blurb: string,
  filename: string,
  events: CalendarEvent[],
  calendarName: string,
): ToolDocument {
  return { id, title, blurb, filename, format: "ics", body: ics(events, calendarName) };
}

export function jsonDoc(
  id: string,
  title: string,
  blurb: string,
  filename: string,
  value: unknown,
): ToolDocument {
  return { id, title, blurb, filename, format: "json", body: JSON.stringify(value, null, 2) };
}

export function svgDoc(
  id: string,
  title: string,
  blurb: string,
  filename: string,
  svg: string,
): ToolDocument {
  return { id, title, blurb, filename, format: "svg", body: svg };
}

/* --------------------------------- shared --------------------------------- */

/** The line every printed piece carries, so the buyer knows what it is not. */
export const MADE_WITH =
  "Made with a Pro Kit from The LeadFlow Pro. Edit anything here before you use it.";

/** Kits that produce customer-facing legal wording all carry this. */
export const REVIEW_BEFORE_SENDING =
  "This is a working draft, not legal advice. Read it once, change anything that does not sound like you, and have a professional check anything that matters.";
