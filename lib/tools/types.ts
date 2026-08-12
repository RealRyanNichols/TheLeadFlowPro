// The free tool engine. Every tool is a data definition: fields in, a pure
// run() out. That keeps 50+ tools consistent, fast, and impossible to break
// one at a time. Add a tool by adding an object, not a page.

export type Tone = "good" | "bad" | "warn" | "neutral";

export type Category =
  | "Money"
  | "Leads"
  | "Ads"
  | "Reputation"
  | "Time"
  | "Website"
  | "Generators"
  | "Costs";

export type Field =
  | {
      id: string;
      label: string;
      type: "slider";
      min: number;
      max: number;
      step: number;
      def: number;
      prefix?: string;
      suffix?: string;
      help?: string;
    }
  | { id: string; label: string; type: "money"; def: number; help?: string }
  | {
      id: string;
      label: string;
      type: "number";
      def: number;
      suffix?: string;
      help?: string;
    }
  | {
      id: string;
      label: string;
      type: "text";
      def: string;
      placeholder?: string;
      help?: string;
    }
  | {
      id: string;
      label: string;
      type: "textarea";
      def: string;
      placeholder?: string;
      rows?: number;
      help?: string;
    }
  | {
      id: string;
      label: string;
      type: "select";
      def: string;
      options: { value: string; label: string }[];
      help?: string;
    }
  | {
      id: string;
      label: string;
      type: "checks";
      def: string[];
      options: { value: string; label: string }[];
      help?: string;
    };

export type Values = Record<string, number | string | string[]>;

export type Stat = { label: string; value: string; sub?: string; tone?: Tone };
export type Bar = { label: string; value: number; display: string; tone?: Tone };

export type Result = {
  /** The one number they came for. */
  headline?: { value: string; label: string; sub?: string; tone?: Tone };
  stats?: Stat[];
  bars?: { title?: string; caption?: string; items: Bar[] };
  /** Month-by-month pile-up chart. Values are already formatted for display. */
  ramp?: {
    title: string;
    caption?: string;
    points: { label: string; value: number; display: string }[];
    tone?: Tone;
  };
  /** Generated text output: script, code, link, policy. */
  output?: { title: string; text: string; filename: string; mono?: boolean };
  /** Encode this string as a scannable QR code. */
  qr?: { data: string; caption?: string; size?: number };
  table?: { title?: string; headers: string[]; rows: (string | number)[][] };
  note?: string;
  /** What to do about the number. Shown under the result. */
  verdict?: { tone: Tone; text: string };
};

export type Tool = {
  slug: string;
  name: string;
  /** Short label for tight card space. Falls back to name. */
  short?: string;
  emoji: string;
  category: Category;
  tagline: string;
  description: string;
  /** Who this is for, in plain English. */
  who: string;
  /** The painful problem it points at. */
  problem: string;
  /** What it does for their business. */
  payoff: string;
  steps: string[];
  faqs?: { q: string; a: string }[];
  fields: Field[];
  run: (v: Values) => Result;
  embedHeight?: number;
  /** Marks tools that render their own component instead of the engine. */
  custom?: "review-link";
  featured?: boolean;
};

/* ---------- value helpers, used inside every run() ---------- */

export const num = (v: Values, id: string, fallback = 0): number => {
  const raw = v[id];
  const n = typeof raw === "number" ? raw : Number(raw);
  return Number.isFinite(n) ? n : fallback;
};

export const str = (v: Values, id: string, fallback = ""): string => {
  const raw = v[id];
  return typeof raw === "string" ? raw : fallback;
};

export const list = (v: Values, id: string): string[] => {
  const raw = v[id];
  return Array.isArray(raw) ? raw : [];
};

/* ---------- formatters ---------- */

export const money = (n: number) =>
  (Number.isFinite(n) ? n : 0).toLocaleString("en-US", {
    style: "currency",
    currency: "USD",
    maximumFractionDigits: 0,
  });

export const money2 = (n: number) =>
  (Number.isFinite(n) ? n : 0).toLocaleString("en-US", {
    style: "currency",
    currency: "USD",
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });

export const pct = (n: number, digits = 0) =>
  `${(Number.isFinite(n) ? n : 0).toFixed(digits)}%`;

export const count = (n: number) =>
  Math.round(Number.isFinite(n) ? n : 0).toLocaleString("en-US");

export const dec = (n: number, digits = 1) =>
  (Number.isFinite(n) ? n : 0).toFixed(digits);

/** 12 months of the same number stacking up. Used by the loss calculators. */
export const rampMonths = (
  monthly: number,
  title: string,
  caption?: string,
  tone: Tone = "bad",
): Result["ramp"] => ({
  title,
  caption,
  tone,
  points: Array.from({ length: 12 }, (_, i) => ({
    label: `Month ${i + 1}`,
    value: monthly * (i + 1),
    display: money(monthly * (i + 1)),
  })),
});

export const clean = (s: string) => s.trim().replace(/\s+/g, " ");

export const slugify = (s: string) =>
  s
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "");

/** Digits only, for tel: links. Assumes US if 10 digits. */
export const telDigits = (s: string) => {
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

export const normUrl = (s: string) => {
  const t = s.trim();
  if (!t) return "";
  return /^https?:\/\//i.test(t) ? t : `https://${t}`;
};
