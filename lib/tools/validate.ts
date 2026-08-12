// Registry validation. Run by the test suite and by `npm run validate:tools`,
// which the build runs first, so a published tool that is missing metadata,
// imagery, instructions, a disclaimer or a working formula fails the build
// instead of shipping as a broken card.

import {
  AUDIENCE_IDS,
  DISCLAIMER_IDS,
  DOMAIN_IDS,
  GOAL_IDS,
  INDUSTRY_IDS,
  TOOL_TYPE_IDS,
} from "./taxonomy";
import type { Tool, Values } from "./types";

export type Problem = { slug: string; field: string; message: string };

const SLUG_RE = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;

/** Copy rules from the brand direction, enforced instead of remembered. */
const BANNED_PHRASES = [
  "in today's digital landscape",
  "in todays digital landscape",
  "unlock your potential",
  "game changer",
  "game-changer",
  "seamless solution",
  "robust framework",
  "tailored strateg",
  "elevate your brand",
  "whether you are starting or scaling",
  "whether you're starting or scaling",
  "take it to the next level",
  "best in class",
  "cutting edge",
  "revolutioniz",
];

/** Claims we are not allowed to make anywhere in public tool copy. */
const BANNED_CLAIMS = [
  "guaranteed results",
  "guarantee more leads",
  "guaranteed leads",
  "guaranteed revenue",
  "guaranteed ranking",
  "guarantee you will rank",
  "100% guaranteed",
];

function copyFields(t: Tool): { field: string; text: string }[] {
  return [
    { field: "name", text: t.name },
    { field: "tagline", text: t.tagline },
    { field: "description", text: t.description },
    { field: "who", text: t.who },
    { field: "problem", text: t.problem },
    { field: "payoff", text: t.payoff },
    ...t.steps.map((s, i) => ({ field: `steps[${i}]`, text: s })),
    ...(t.faqs || []).flatMap((f, i) => [
      { field: `faqs[${i}].q`, text: f.q },
      { field: `faqs[${i}].a`, text: f.a },
    ]),
    ...(t.assumptions || []).map((s, i) => ({ field: `assumptions[${i}]`, text: s })),
    ...t.fields.map((f, i) => ({ field: `fields[${i}].label`, text: f.label })),
  ];
}

export function validateTools(all: Tool[]): Problem[] {
  const problems: Problem[] = [];
  const p = (slug: string, field: string, message: string) => problems.push({ slug, field, message });

  const seen = new Map<string, number>();
  for (const t of all) seen.set(t.slug, (seen.get(t.slug) || 0) + 1);
  for (const [slug, n] of seen) if (n > 1) p(slug, "slug", `duplicated ${n} times`);

  const slugSet = new Set(all.map((t) => t.slug));
  const published = all.filter((t) => t.status === "published");

  for (const t of all) {
    if (!SLUG_RE.test(t.slug)) p(t.slug, "slug", "must be lowercase words joined by single hyphens");
    if (t.status !== "published") continue;

    /* ---- taxonomy ---- */
    if (!(DOMAIN_IDS as readonly string[]).includes(t.domain)) p(t.slug, "domain", `unknown domain "${t.domain}"`);
    if (!(TOOL_TYPE_IDS as readonly string[]).includes(t.toolType)) p(t.slug, "toolType", `unknown tool type "${t.toolType}"`);
    if (!(DISCLAIMER_IDS as readonly string[]).includes(t.disclaimer)) p(t.slug, "disclaimer", `unknown disclaimer "${t.disclaimer}"`);
    if (!t.goals.length) p(t.slug, "goals", "a published tool needs at least one goal");
    if (!t.industries.length) p(t.slug, "industries", "a published tool needs at least one industry");
    if (!t.audiences.length) p(t.slug, "audiences", "a published tool needs at least one audience");
    for (const g of t.goals) if (!(GOAL_IDS as readonly string[]).includes(g)) p(t.slug, "goals", `unknown goal "${g}"`);
    for (const i of t.industries) if (!(INDUSTRY_IDS as readonly string[]).includes(i)) p(t.slug, "industries", `unknown industry "${i}"`);
    for (const a of t.audiences) if (!(AUDIENCE_IDS as readonly string[]).includes(a)) p(t.slug, "audiences", `unknown audience "${a}"`);
    if (t.keywords.length < 3) p(t.slug, "keywords", "needs at least 3 search keywords");
    if (t.popularity < 0 || t.popularity > 100) p(t.slug, "popularity", "must be 0 to 100");

    /* ---- page content ---- */
    if (t.name.length < 4) p(t.slug, "name", "too short");
    if (t.tagline.length < 10) p(t.slug, "tagline", "too short");
    if (t.description.length < 60) p(t.slug, "description", "needs a real plain-language description");
    if (!t.who.trim()) p(t.slug, "who", "missing");
    if (!t.problem.trim()) p(t.slug, "problem", "missing");
    if (!t.payoff.trim()) p(t.slug, "payoff", "missing");
    if (t.steps.length < 2) p(t.slug, "steps", "needs visible usage instructions");
    for (const f of t.faqs || []) {
      if (!f.q.trim() || !f.a.trim()) p(t.slug, "faqs", "a FAQ has an empty question or answer");
    }

    /* ---- imagery ---- */
    if (!t.image?.src?.startsWith("/")) p(t.slug, "image", "card art must be a local path");
    if (!t.hero?.src?.startsWith("/")) p(t.slug, "hero", "hero art must be a local path");
    if (!t.image?.alt?.trim()) p(t.slug, "image.alt", "missing alt text");
    if (!t.hero?.alt?.trim()) p(t.slug, "hero.alt", "missing alt text");

    /* ---- copy rules ---- */
    for (const { field, text } of copyFields(t)) {
      if (text.includes("—") || text.includes("–")) p(t.slug, field, "no em or en dashes in public copy");
      const low = text.toLowerCase();
      for (const b of BANNED_PHRASES) if (low.includes(b)) p(t.slug, field, `banned filler phrase "${b}"`);
      for (const b of BANNED_CLAIMS) if (low.includes(b)) p(t.slug, field, `unsupported claim "${b}"`);
    }

    /* ---- fields ---- */
    const ids = new Set<string>();
    for (const f of t.fields) {
      if (ids.has(f.id)) p(t.slug, `fields.${f.id}`, "duplicate field id");
      ids.add(f.id);
      if (!f.label.trim()) p(t.slug, `fields.${f.id}`, "missing label");
      if (f.type === "slider") {
        if (f.min >= f.max) p(t.slug, `fields.${f.id}`, "slider min must be below max");
        if (f.def < f.min || f.def > f.max) p(t.slug, `fields.${f.id}`, "slider default is outside its range");
        if (f.step <= 0) p(t.slug, `fields.${f.id}`, "slider step must be positive");
      }
      if (f.type === "select") {
        if (!f.options.length) p(t.slug, `fields.${f.id}`, "select has no options");
        if (!f.options.some((o) => o.value === f.def)) p(t.slug, `fields.${f.id}`, "select default is not one of its options");
      }
      if (f.type === "checks") {
        const opts = new Set(f.options.map((o) => o.value));
        for (const d of f.def) if (!opts.has(d)) p(t.slug, `fields.${f.id}`, `default "${d}" is not an option`);
      }
    }

    /* ---- presets ---- */
    for (const preset of t.presets || []) {
      if (!preset.label.trim()) p(t.slug, "presets", "preset has no label");
      if (!preset.blurb.trim()) p(t.slug, `presets.${preset.id}`, "preset needs a one-line reason for its numbers");
      for (const key of Object.keys(preset.values)) {
        if (!ids.has(key)) p(t.slug, `presets.${preset.id}`, `sets unknown field "${key}"`);
      }
      for (const f of t.fields) {
        const v = preset.values[f.id];
        if (v === undefined) continue;
        if (f.type === "select" && !f.options.some((o) => o.value === v)) {
          p(t.slug, `presets.${preset.id}`, `field "${f.id}" set to a value that is not an option`);
        }
        if (f.type === "slider" && typeof v === "number" && (v < f.min || v > f.max)) {
          p(t.slug, `presets.${preset.id}`, `field "${f.id}" set outside its slider range`);
        }
      }
    }

    /* ---- relationships ---- */
    for (const r of t.relatedSlugs || []) {
      if (r === t.slug) p(t.slug, "relatedSlugs", "a tool cannot relate to itself");
      else if (!slugSet.has(r)) p(t.slug, "relatedSlugs", `points at missing tool "${r}"`);
    }

    /* ---- the formula actually runs ---- */
    if (t.custom) continue;
    const defaults: Values = {};
    for (const f of t.fields) defaults[f.id] = f.type === "checks" ? [...f.def] : f.def;
    try {
      const r = t.run(defaults);
      // A generator whose text fields start empty correctly returns only a note
      // telling the user what to type, so a note counts as a visible result.
      if (!r || typeof r !== "object") {
        p(t.slug, "run", "returned nothing at default values");
      } else if (
        !r.headline && !r.output && !r.qr && !r.table && !r.stats?.length && !r.bars && !r.note && !r.verdict
      ) {
        p(t.slug, "run", "produced no visible result at default values");
      }
      const numbers = [
        r.headline?.value,
        ...(r.stats || []).map((s) => s.value),
      ].filter(Boolean) as string[];
      for (const n of numbers) {
        if (/NaN|Infinity|undefined|\$NaN/.test(n)) p(t.slug, "run", `result contains "${n}"`);
      }
    } catch (err) {
      p(t.slug, "run", `threw at default values: ${(err as Error).message}`);
    }

    /* ---- boundary safety: zeroes and maxima must not explode ---- */
    if (!t.custom) {
      for (const mode of ["min", "max"] as const) {
        const v: Values = {};
        for (const f of t.fields) {
          if (f.type === "slider") v[f.id] = mode === "min" ? f.min : f.max;
          else if (f.type === "money" || f.type === "number") v[f.id] = mode === "min" ? 0 : 1_000_000;
          else if (f.type === "checks") v[f.id] = mode === "min" ? [] : f.options.map((o) => o.value);
          else v[f.id] = f.def;
        }
        try {
          const r = t.run(v);
          const vals = [r.headline?.value, ...(r.stats || []).map((s) => s.value)].filter(Boolean) as string[];
          for (const n of vals) {
            if (/NaN|Infinity/.test(n)) p(t.slug, "run", `result contains "${n}" at ${mode} inputs`);
          }
        } catch (err) {
          p(t.slug, "run", `threw at ${mode} inputs: ${(err as Error).message}`);
        }
      }
    }
  }

  if (!published.length) p("(registry)", "TOOLS", "no published tools");
  return problems;
}

export function formatProblems(problems: Problem[]): string {
  if (!problems.length) return "";
  const byTool = new Map<string, Problem[]>();
  for (const pr of problems) {
    const list = byTool.get(pr.slug);
    if (list) list.push(pr);
    else byTool.set(pr.slug, [pr]);
  }
  return [...byTool.entries()]
    .map(([slug, list]) => `  ${slug}\n${list.map((l) => `    ${l.field}: ${l.message}`).join("\n")}`)
    .join("\n");
}
