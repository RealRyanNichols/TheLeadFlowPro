// The free tool engine. Every tool is a data definition: fields in, a pure
// run() out. That keeps 250+ tools consistent, fast, and impossible to break
// one at a time. Add a tool by adding an object, not a page.
//
// Taxonomy, imagery, disclaimers and SEO live in lib/tools/meta.ts and are
// merged onto these objects at registry build time, so a tool file stays about
// the formula. lib/tools/validate.ts fails the build when a published tool is
// missing anything it needs.

import type {
  Audience,
  DataSensitivity,
  DisclaimerType,
  Domain,
  Goal,
  Industry,
  ToolType,
} from "./taxonomy";

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

/**
 * Every field may name a `section`. Fields sharing a section render under one
 * numbered step heading, which is how a pro kit becomes a guided walk instead
 * of a wall of inputs. Free tools leave it off and render exactly as before.
 */
type Sectioned = { section?: string };

export type Field = Sectioned &
  (
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
      }
  );

export type Values = Record<string, number | string | string[]>;

/* ------------------------------- brand kit -------------------------------- */

/**
 * The Brand Kit is set once in the browser and injected into every pro kit's
 * run() under these ids. It never leaves the browser. Tools must produce a
 * complete result when every one of these is empty.
 */
export const BRAND_FIELD_IDS = [
  "brand_name",
  "brand_phone",
  "brand_email",
  "brand_site",
  "brand_city",
  "brand_color",
  "brand_logo",
] as const;

export type BrandFieldId = (typeof BRAND_FIELD_IDS)[number];

export type BrandKit = Record<BrandFieldId, string>;

export const EMPTY_BRAND_KIT: BrandKit = {
  brand_name: "",
  brand_phone: "",
  brand_email: "",
  brand_site: "",
  brand_city: "",
  brand_color: "",
  brand_logo: "",
};

/** Read the brand kit out of a Values bag with safe fallbacks. */
export const brandOf = (v: Values): BrandKit => {
  const out = { ...EMPTY_BRAND_KIT };
  for (const id of BRAND_FIELD_IDS) {
    const raw = v[id];
    if (typeof raw === "string") out[id] = raw.trim();
  }
  if (!/^#[0-9a-fA-F]{6}$/.test(out.brand_color)) out.brand_color = "";
  return out;
};

/* ------------------------------- documents -------------------------------- */

/**
 * What a pro kit hands over. Every document is a string produced by run(), so
 * the whole kit is generated in the browser from the buyer's own numbers.
 *
 * `print-html` is a complete HTML document; the engine opens it in a new tab
 * where the buyer prints it or saves it as a PDF. The others download as files.
 */
export type DocumentFormat = "print-html" | "txt" | "md" | "csv" | "svg" | "json" | "ics";

export type ToolDocument = {
  id: string;
  title: string;
  /** One line on what is inside. Shown before purchase, so it sells the kit. */
  blurb?: string;
  filename: string;
  format: DocumentFormat;
  body: string;
};

/* ---------------------------------- pro ----------------------------------- */

/**
 * What makes a tool a paid kit. The price is the one number the checkout route
 * trusts; the browser never sends a dollar amount.
 */
export type ProInfo = {
  priceUsd: number;
  /** One line under the price: the outcome, never a guarantee. */
  promise: string;
  /** What is in the box. Rendered as the kit list before and after purchase. */
  kit: string[];
  /** Free tool slugs this upgrades. Those pages show the upgrade card. */
  upgradeFrom: string[];
  /** What a visitor sees and can use before paying. */
  freePreview: string;
};

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
  /**
   * What the number actually means, in plain language, written from the values
   * they entered. A big number on its own is not an answer.
   */
  explain?: string;
  /** The assumptions the math made. Shown under the result, always visible. */
  assumptions?: string[];
  /** Extra export formats this particular result supports beyond text. */
  csv?: { filename: string; headers: string[]; rows: (string | number)[][] };
  /** Calendar tools return a .ics body here. */
  ics?: { filename: string; text: string };
  /**
   * Pro kits return their deliverables here. The engine lists them, downloads
   * them, and prints the printable ones. Locked until the kit is unlocked.
   */
  documents?: ToolDocument[];
};

/* ---------------------------- industry presets ----------------------------- */

/**
 * One formula, many industries. A preset changes the starting numbers, the
 * example copy and the suggested next tools. It never changes the math, which
 * is what keeps this from turning into fifteen duplicate pages.
 */
export type Preset = {
  id: string;
  label: string;
  industry?: Industry;
  /** Why these starting numbers, in one sentence. */
  blurb: string;
  /** Starting values for this industry. Keys must be real field ids. */
  values: Values;
  /** A concrete example sentence shown with the preset. */
  example?: string;
};

/* ------------------------------- imagery ---------------------------------- */

export type ToolImage = {
  /** Path under /public. Never a remote URL. */
  src: string;
  alt: string;
  width: number;
  height: number;
};

/**
 * The OG composition families. At least eight distinct layouts so the catalog
 * never reads as one template. Assigned per tool in lib/tools/visuals.ts and
 * validated so no family dominates and directory neighbors differ.
 */
export type OgLayout =
  /** Scene art right, headline left. The article-thumbnail composition. */
  | "scene-right"
  /** Scene art left, headline right. */
  | "scene-left"
  /** Full-bleed scene with a solid headline panel over the lower half. */
  | "panel-over-scene"
  /** Scene across the top, solid title band across the bottom. */
  | "band-bottom"
  /** Two scenes side by side for before/after and versus tools. */
  | "split-compare"
  /** A device (phone, terminal, screen) carries the scene, headline beside it. */
  | "device"
  /** A document, worksheet or checklist carries the scene, headline beside it. */
  | "document"
  /** A large result figure is the hero, scene art supports it. */
  | "big-number"
  /** Centered scene with the headline above and support line below. */
  | "centered"
  /** A spatial flow or route diagram carries the scene, headline beside it. */
  | "diagram";

export type SceneType =
  | "scene"
  | "still-life"
  | "device"
  | "document"
  | "diagram"
  | "comparison";

export type VisualReviewStatus = "draft" | "review" | "approved";

/**
 * Everything about a tool's artwork that is not the formula. Authored per slug
 * in lib/tools/visuals.ts, produced in the Figma art file, exported into
 * /public, and validated by scripts/validate-visuals.ts.
 */
export type ToolVisual = {
  /** One sentence describing the picture. The tool's real-world problem decides it. */
  visualConcept: string;
  /** Grouping used by the similarity checks: phone-comms, money-flow, route, ... */
  visualFamily: string;
  primarySubject: string;
  supportingSubjects: string[];
  sceneType: SceneType;
  /** Composition note: where the subject sits, where the negative space lives. */
  composition: string;
  /** Index 1 to 6 into the brand's six-gradient family. An accent, never the differentiator. */
  colorAccent: 1 | 2 | 3 | 4 | 5 | 6;
  /** Paths under /public. */
  cardImage: string;
  cardImageAlt: string;
  heroImage: string;
  heroImageAlt: string;
  ogImage: string;
  ogLayout: OgLayout;
  /** Defaults to the tool name. Override when the name is too long for two lines. */
  ogTitle?: string;
  /** One short line under the title. Never wraps. */
  ogHook: string;
  /** 0 to 1 in both axes. Where crops must keep the subject. */
  focalPoint: { x: number; y: number };
  mobileFocalPoint?: { x: number; y: number };
  /** Where the picture came from, e.g. "Original vector illustration, Figma". */
  imageSource: string;
  license: string;
  /** ISO date the asset was produced or last replaced. */
  sourceDate: string;
  visualReviewStatus: VisualReviewStatus;
};

/* ------------------------- collection relevance ---------------------------- */

/**
 * How strongly a tool belongs to an industry. `industries` on the tool stays
 * the generous "could this ever help" list that search falls back to; these
 * tiers are what collections and industry ranking actually use, so a generic
 * QR maker stops counting as a core mortgage tool.
 */
export type ToolRelevance = {
  /** The tool was built for this work. Leads collection pages and search. */
  coreIndustries: Industry[];
  /** Strongly related: the tool's examples and presets speak this industry's language. */
  secondaryIndustries: Industry[];
  /** Useful to almost anyone. Shown under "Broadly useful", never counted as core. */
  broadlyUseful: boolean;
  /** 0 to 100. Orders tools inside a collection tier. */
  collectionPriority: number;
  /** One honest line: why this tool is in the collection at all. */
  collectionReason?: string;
};

/* ---------------------------- registry metadata --------------------------- */

/**
 * Everything about a tool that is not its formula. Authored in lib/tools/meta.ts
 * so the tool files stay readable, merged onto the Tool at registry build time.
 */
export type ToolMeta = {
  domain: Domain;
  toolType: ToolType;
  goals: Goal[];
  industries: Industry[];
  audiences: Audience[];
  /** Words people type that are not already in the name or description. */
  keywords: string[];
  /** Alternate names for the same thing. Feeds the search expander. */
  synonyms?: string[];
  disclaimer: DisclaimerType;
  dataSensitivity: DataSensitivity;
  /** 0 to 100. Hand-ranked usefulness, used by the default sort. */
  popularity: number;
  /** Shown as a NEW ribbon and sorted to the front of "Newest". */
  isNew?: boolean;
  seoTitle?: string;
  seoDescription?: string;
  /** Overrides the automatic related-tool picker when a better set exists. */
  relatedSlugs?: string[];
  presets?: Preset[];
  /** Static assumptions shown on the page regardless of inputs. */
  assumptions?: string[];
  /** Extra formats the download menu offers for this tool. */
  exportFormats?: ExportFormat[];
  /** Only "published" tools are routable, in the sitemap, or in the directory. */
  status?: PublicationStatus;
};

export type ExportFormat = "txt" | "csv" | "png" | "svg" | "ics" | "print";

export type PublicationStatus =
  | "proposed"
  | "formula-review"
  | "implementation"
  | "image-needed"
  | "qa"
  | "ready"
  | "published";

/**
 * What a tool file authors. Taxonomy fields are optional here: new tools declare
 * them inline, and the original 78 get theirs from lib/tools/meta.ts.
 */
export type ToolDef = {
  slug: string;
  name: string;
  /** Short label for tight card space. Falls back to name. */
  short?: string;
  /** A minor label accent only. Never the card artwork. */
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
  /** Present only on paid kits. Free tools never carry it. */
  pro?: ProInfo;
} & Partial<ToolMeta>;

/**
 * A tool after the registry has merged its metadata and artwork on. Everything
 * downstream (pages, search, sitemap, OG) consumes this, so those consumers can
 * rely on the taxonomy being present instead of guarding every field.
 */
export type Tool = ToolDef &
  ToolMeta & {
    status: PublicationStatus;
    image: ToolImage;
    hero: ToolImage;
    /** Resolved once at build so search does not rebuild it per keystroke. */
    searchText: string;
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
