// The copy rules every generated draft must pass. The same rules the free
// tools are validated against, applied to anything the engine writes on a
// customer's behalf. Tests run every draft path through this.

const BANNED_PHRASES = [
  "in today's digital landscape",
  "unlock your potential",
  "game changer",
  "game-changer",
  "seamless solution",
  "robust framework",
  "tailored strateg",
  "elevate your brand",
  "take it to the next level",
  "best in class",
  "cutting edge",
  "revolutioniz",
];

const BANNED_CLAIMS = [
  "guaranteed results",
  "guarantee more leads",
  "guaranteed leads",
  "guaranteed revenue",
  "guaranteed ranking",
  "guarantee you will rank",
  "100% guaranteed",
  "guarantee",
];

export function copyProblems(text: string): string[] {
  const problems: string[] = [];
  if (/[—–]/.test(text)) problems.push("contains an em or en dash");
  const low = text.toLowerCase();
  for (const b of BANNED_PHRASES) if (low.includes(b)) problems.push(`banned filler phrase "${b}"`);
  for (const b of BANNED_CLAIMS) if (low.includes(b)) problems.push(`unsupported claim "${b}"`);
  if (/\bundefined\b|\bNaN\b|\[object Object\]/.test(text)) problems.push("unrendered value");
  return problems;
}

// Control characters, bidi overrides, and zero-width joiners: none of them
// belong in a name, a text, or a subject line. Newlines and tabs stay. The
// class is built from code points so no raw line terminator can ever sit
// inside a regex literal in this file.
const CONTROL_RANGES: [number, number][] = [
  [0x0000, 0x0008],
  [0x000b, 0x000c],
  [0x000e, 0x001f],
  [0x007f, 0x009f],
  [0x200b, 0x200f],
  [0x2028, 0x202e],
  [0x2060, 0x2064],
  [0x2066, 0x2069],
  [0xfeff, 0xfeff],
];
const hex = (n: number) => `\\u${n.toString(16).padStart(4, "0")}`;
const CONTROL = new RegExp(`[${CONTROL_RANGES.map(([a, b]) => `${hex(a)}-${hex(b)}`).join("")}]`, "g");

/** Strip anything a customer typed that could carry markup into a document or email. */
export function plain(text: unknown, max = 2000): string {
  if (typeof text !== "string") return "";
  return text
    .replace(/\r\n?/g, "\n")
    .replace(/<[^>]*>?/g, "")
    .replace(CONTROL, "")
    .trim()
    .slice(0, max);
}

// A complete tag: "<b>", "</b>", "<br/>", '<a href="x">'. It starts with a
// letter (after an optional slash) and closes on the same line, so a bare "<"
// in sales shorthand ("<5 trucks", "budget <$1k", "<= 500", "<3") is not one.
const COMPLETE_TAG = /<\/?[a-z][a-z0-9-]*(?:\s[^<>\n]*)?\/?>/gi;

/**
 * Free text a person typed for the record, such as a call note. Line breaks
 * are normalized and control characters removed, and only complete tags come
 * out. Unlike plain(), a "<" with no tag after it stays, so "Crew of <5" does
 * not swallow the rest of the note. The text is stored as text and React
 * escapes it wherever it is shown.
 */
export function noteText(text: unknown, max = 2000): string {
  if (typeof text !== "string") return "";
  return text
    .replace(/\r\n?/g, "\n")
    .replace(COMPLETE_TAG, "")
    .replace(CONTROL, "")
    .trim()
    .slice(0, max);
}

/** A single-line value: names, services, subjects. */
export function line(text: unknown, max = 200): string {
  return plain(text, max).replace(/\s*\n\s*/g, " ").replace(/\s{2,}/g, " ").trim();
}
