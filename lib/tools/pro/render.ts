import type { Result, ToolDocument, Values } from "../types";
import { fillWhiteLabelSignatures, proAccessSecrets } from "../../proAccess";
import { documentPreview, getProTool, type ProTool } from "./index";

// Running a kit, and deciding how much of the answer the caller has paid for.
//
// Pure on purpose: it holds no secrets and reads no cookies, so the tests can
// exercise the locking rules directly. Deciding whether a given visitor is
// unlocked happens one layer up, in app/api/pro/render, which is the only
// thing that ever calls this with `unlocked` set to true.
//
// The whole result is computed here, on the server, every time. A locked
// visitor gets the numbers, the chart and an honest listing of the documents
// with the first couple of lines of each. An unlocked one gets the documents
// themselves. The generators never reach the browser either way, which is what
// makes the lock real rather than a blurred div over data the page already had.

export type DocumentListing = {
  id: string;
  title: string;
  blurb?: string;
  filename: string;
  format: ToolDocument["format"];
  /** Roughly how long the finished document is, for the locked listing. */
  size: string;
  /** The opening words, under a blur. Enough to prove it is real. */
  peek: string;
};

export type ProRender = {
  slug: string;
  unlocked: boolean;
  /** Everything except the documents. Always returned. */
  preview: Result;
  /** What the kit produces. Always listed; only filled in when unlocked. */
  listing: DocumentListing[];
  documents: ToolDocument[] | null;
};

const FORMAT_UNIT: Record<ToolDocument["format"], (body: string) => string> = {
  "print-html": (b) => `${Math.max(1, Math.round(b.length / 3400))} page document`,
  txt: (b) => `${Math.max(1, b.split("\n").filter(Boolean).length)} lines`,
  md: (b) => `${Math.max(1, b.split("\n").filter(Boolean).length)} lines`,
  csv: (b) => `${Math.max(1, b.split("\r\n").length - 1)} rows`,
  svg: () => "vector file",
  json: (b) => `${(b.length / 1024).toFixed(1)} KB`,
  ics: (b) => `${b.split("BEGIN:VEVENT").length - 1} reminders`,
};

function listingFor(doc: ToolDocument): DocumentListing {
  return {
    id: doc.id,
    title: doc.title,
    blurb: doc.blurb,
    filename: doc.filename,
    format: doc.format,
    size: FORMAT_UNIT[doc.format](doc.body),
    peek: documentPreview(doc),
  };
}

/** Fill in every field's default, then overlay whatever the caller sent. */
export function valuesFor(tool: ProTool, incoming: Values): Values {
  const values: Values = {};
  for (const field of tool.fields) {
    values[field.id] = field.type === "checks" ? [...field.def] : field.def;
  }
  for (const field of tool.fields) {
    const raw = incoming[field.id];
    if (raw === undefined) continue;
    if (field.type === "checks") {
      if (!Array.isArray(raw)) continue;
      const allowed = new Set(field.options.map((o) => o.value));
      values[field.id] = raw.filter((v) => typeof v === "string" && allowed.has(v)).slice(0, 200);
    } else if (field.type === "select") {
      if (typeof raw === "string" && field.options.some((o) => o.value === raw)) values[field.id] = raw;
    } else if (field.type === "text" || field.type === "textarea") {
      if (typeof raw === "string") values[field.id] = raw.slice(0, 4000);
    } else {
      const n = typeof raw === "number" ? raw : Number(raw);
      if (!Number.isFinite(n)) continue;
      if (field.type === "slider") {
        values[field.id] = Math.min(field.max, Math.max(field.min, n));
      } else {
        values[field.id] = Math.max(0, Math.min(1e12, n));
      }
    }
  }
  return values;
}

/** The brand kit rides alongside the fields and is clamped the same way. */
export function withBrand(values: Values, brand: Record<string, unknown> | undefined): Values {
  const out = { ...values };
  for (const id of [
    "brand_name",
    "brand_phone",
    "brand_email",
    "brand_site",
    "brand_city",
    "brand_color",
    "brand_logo",
  ]) {
    const raw = brand?.[id];
    if (typeof raw !== "string") continue;
    // The logo is a data URL and needs room; everything else is a short line.
    out[id] = raw.slice(0, id === "brand_logo" ? 400_000 : 300);
  }
  return out;
}

export function renderProTool(
  slug: string,
  incoming: Values,
  brand: Record<string, unknown> | undefined,
  unlocked: boolean,
): ProRender | null {
  const tool = getProTool(slug);
  if (!tool) return null;

  const values = withBrand(valuesFor(tool, incoming), brand);

  let result: Result;
  try {
    result = tool.run(values);
  } catch {
    return {
      slug,
      unlocked,
      preview: { note: "Something in those entries did not compute. Adjust them and it will come back." },
      listing: [],
      documents: null,
    };
  }

  const documents = result.documents ?? [];
  const { documents: _omit, ...preview } = result;

  // Kits whose documents carry white-label placeholders get them signed here,
  // and only on an unlocked render: run() is pure and holds no secrets, and a
  // locked visitor never receives document bodies to begin with.
  // includes() rather than the shared global regex: a g-flagged regex keeps
  // lastIndex between .test() calls and silently skips every other document.
  const signed = unlocked
    ? documents.map((doc) =>
        doc.body.includes("{{WL_SIGN:")
          ? { ...doc, body: fillWhiteLabelSignatures(doc.body, proAccessSecrets()) }
          : doc,
      )
    : documents;

  return {
    slug,
    unlocked,
    preview,
    listing: signed.map(listingFor),
    documents: unlocked ? signed : null,
  };
}
