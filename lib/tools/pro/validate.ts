// What a pro kit has to satisfy before it can be sold.
//
// Everything the free library is checked for still applies (taxonomy, copy
// rules, a formula that survives its own boundaries, real instructions). These
// are the extra rules that exist because money changes hands:
//
//   - the price is one of the three we sell at, and the browser never sets it
//   - the kit list and the promise are filled in, because they are the offer
//   - every free tool it claims to upgrade actually exists
//   - it produces real documents at its default values, so the shelf is never
//     advertising a box with nothing in it
//   - no document is empty, unnamed, or missing the format it says it is

import { getTool } from "../index";
import type { Tool } from "../types";
import type { Problem } from "../validate";
import { PRO_PRICES } from "./types";

const FORMATS = new Set(["print-html", "txt", "md", "csv", "svg", "json", "ics"]);

export function validateProTools(all: Tool[]): Problem[] {
  const problems: Problem[] = [];
  const p = (slug: string, field: string, message: string) => problems.push({ slug, field, message });

  for (const tool of all) {
    const pro = tool.pro;
    if (!pro) {
      p(tool.slug, "pro", "a kit in the pro registry must carry its pro block");
      continue;
    }
    if (tool.status !== "published") continue;

    if (!(PRO_PRICES as readonly number[]).includes(pro.priceUsd)) {
      p(tool.slug, "pro.priceUsd", `price ${pro.priceUsd} is not one of ${PRO_PRICES.join(", ")}`);
    }
    if (pro.promise.trim().length < 40) {
      p(tool.slug, "pro.promise", "needs a real one line promise, and it cannot guarantee an outcome");
    }
    if (pro.kit.length < 3) {
      p(tool.slug, "pro.kit", "a paid kit lists at least three things in the box");
    }
    if (!pro.freePreview.trim()) {
      p(tool.slug, "pro.freePreview", "say what somebody gets to use before paying");
    }
    if (pro.upgradeFrom.length === 0) {
      p(tool.slug, "pro.upgradeFrom", "name the free tools this upgrades so the funnel has somewhere to start");
    }
    for (const slug of pro.upgradeFrom) {
      if (!getTool(slug)) p(tool.slug, "pro.upgradeFrom", `points at "${slug}", which is not a published free tool`);
    }

    // The box has to have something in it at the values a first visitor sees.
    const values: Record<string, number | string | string[]> = {};
    for (const f of tool.fields) values[f.id] = f.type === "checks" ? [...f.def] : f.def;
    try {
      const result = tool.run(values);
      const documents = result.documents ?? [];
      if (documents.length < 3) {
        p(tool.slug, "run", `produced ${documents.length} document(s) at default values, expected at least 3`);
      }
      const ids = new Set<string>();
      for (const doc of documents) {
        if (ids.has(doc.id)) p(tool.slug, "documents", `duplicate document id "${doc.id}"`);
        ids.add(doc.id);
        if (!doc.title.trim()) p(tool.slug, "documents", `document "${doc.id}" has no title`);
        if (!doc.filename.trim()) p(tool.slug, "documents", `document "${doc.id}" has no filename`);
        if (!FORMATS.has(doc.format)) p(tool.slug, "documents", `document "${doc.id}" has unknown format "${doc.format}"`);
        if (doc.body.trim().length < 120) {
          p(tool.slug, "documents", `document "${doc.id}" is too short to be worth paying for`);
        }
        if (doc.format === "print-html" && !doc.body.startsWith("<!doctype html>")) {
          p(tool.slug, "documents", `document "${doc.id}" claims print-html but is not a complete document`);
        }
        if (/undefined|NaN|\[object Object\]/.test(doc.body)) {
          p(tool.slug, "documents", `document "${doc.id}" contains an unrendered value`);
        }
      }
    } catch (error) {
      p(tool.slug, "run", `threw at default values: ${(error as Error).message}`);
    }

    // A kit that produced nothing at the extremes would sell an empty box to
    // whoever zeroed a field, so the boundaries are checked here too.
    for (const mode of ["min", "max"] as const) {
      const bounds: Record<string, number | string | string[]> = {};
      for (const f of tool.fields) {
        if (f.type === "slider") bounds[f.id] = mode === "min" ? f.min : f.max;
        else if (f.type === "money" || f.type === "number") bounds[f.id] = mode === "min" ? 0 : 1_000_000;
        else if (f.type === "checks") bounds[f.id] = mode === "min" ? [] : f.options.map((o) => o.value);
        else bounds[f.id] = f.def;
      }
      try {
        const result = tool.run(bounds);
        if ((result.documents ?? []).length === 0) {
          p(tool.slug, "run", `produced no documents at ${mode} inputs`);
        }
        for (const doc of result.documents ?? []) {
          if (/undefined|NaN|\[object Object\]/.test(doc.body)) {
            p(tool.slug, "documents", `document "${doc.id}" contains an unrendered value at ${mode} inputs`);
          }
        }
      } catch (error) {
        p(tool.slug, "run", `threw at ${mode} inputs: ${(error as Error).message}`);
      }
    }
  }

  return problems;
}
