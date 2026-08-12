// The registry contract. If any of this fails, something shipped that should
// not have.

import { test, describe } from "node:test";
import assert from "node:assert/strict";
import { existsSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { ALL_TOOLS, TOOLS, getTool, relatedTools, DISCLAIMERS } from "../lib/tools/index.ts";
import { validateTools, formatProblems } from "../lib/tools/validate.ts";
import { PUBLISHED_COLLECTIONS, collectionTools, MIN_TOOLS } from "../lib/tools/collections.ts";
import ORIGINAL_SLUGS from "./fixtures/original-78-slugs.json" with { type: "json" };

const ROOT = process.cwd();

describe("registry", () => {
  test("passes full validation", () => {
    const problems = validateTools(ALL_TOOLS);
    assert.equal(problems.length, 0, `\n${formatProblems(problems)}`);
  });

  test("every slug is unique", () => {
    const seen = new Set<string>();
    for (const t of ALL_TOOLS) {
      assert.ok(!seen.has(t.slug), `duplicate slug: ${t.slug}`);
      seen.add(t.slug);
    }
  });

  test("publishes at least the original catalogue", () => {
    assert.ok(TOOLS.length >= 78, `expected 78 or more published tools, got ${TOOLS.length}`);
  });
});

describe("the original 78 URLs are preserved", () => {
  // These are live URLs with links and rankings pointed at them. A rename here
  // is a 404 in the wild, so this is the single most important test in the repo.
  test("every original slug still resolves to a published tool", () => {
    const missing = (ORIGINAL_SLUGS as string[]).filter((slug) => !getTool(slug));
    assert.deepEqual(missing, [], `these live URLs would 404: ${missing.join(", ")}`);
  });

  test("the fixture itself still describes 78 tools", () => {
    assert.equal((ORIGINAL_SLUGS as string[]).length, 78);
  });
});

describe("metadata every published tool needs", () => {
  for (const tool of TOOLS) {
    test(`${tool.slug} is complete`, () => {
      assert.ok(tool.domain, "domain");
      assert.ok(tool.toolType, "toolType");
      assert.ok(tool.goals.length > 0, "at least one goal");
      assert.ok(tool.industries.length > 0, "at least one industry");
      assert.ok(tool.audiences.length > 0, "at least one audience");
      assert.ok(tool.keywords.length >= 3, "three or more keywords");
      assert.ok(DISCLAIMERS[tool.disclaimer], "a real disclaimer type");
      assert.ok(tool.steps.length >= 2, "visible instructions");
      assert.ok(tool.description.length >= 60, "a real description");
      assert.ok(tool.who && tool.problem && tool.payoff, "who, problem and payoff");
    });
  }
});

describe("imagery", () => {
  for (const tool of TOOLS) {
    test(`${tool.slug} has card and hero art on disk`, () => {
      for (const img of [tool.image, tool.hero]) {
        assert.ok(img.src.startsWith("/"), "must be a local path, never hotlinked");
        assert.ok(img.alt.trim().length > 10, "needs real alt text");
        const abs = join(ROOT, "public", img.src.replace(/^\//, ""));
        assert.ok(existsSync(abs), `missing ${img.src}. Run npm run art.`);
        const svg = readFileSync(abs, "utf8");
        const w = /\bwidth="(\d+)"/.exec(svg);
        const h = /\bheight="(\d+)"/.exec(svg);
        assert.ok(w && h, "SVG must declare width and height or the grid shifts");
        assert.equal(Number(w![1]), img.width);
        assert.equal(Number(h![1]), img.height);
      }
    });
  }

  test("card art is at least 1200 wide and hero at least 1600", () => {
    for (const tool of TOOLS) {
      assert.ok(tool.image.width >= 1200, `${tool.slug} card too small`);
      assert.ok(tool.hero.width >= 1600, `${tool.slug} hero too small`);
    }
  });

  test("no two unrelated tools share the same artwork", () => {
    const byContent = new Map<string, string[]>();
    for (const tool of TOOLS) {
      const svg = readFileSync(join(ROOT, "public", tool.image.src.replace(/^\//, "")), "utf8");
      const list = byContent.get(svg);
      if (list) list.push(tool.slug);
      else byContent.set(svg, [tool.slug]);
    }
    const dupes = [...byContent.values()].filter((v) => v.length > 1);
    assert.deepEqual(dupes, [], "these tools draw identical pictures");
  });
});

describe("relationships", () => {
  test("related tools resolve, are published, and never point at themselves", () => {
    for (const tool of TOOLS) {
      const related = relatedTools(tool, 4);
      assert.ok(related.length > 0, `${tool.slug} has no related tools`);
      for (const r of related) {
        assert.notEqual(r.slug, tool.slug, `${tool.slug} relates to itself`);
        assert.ok(getTool(r.slug), `${tool.slug} points at unpublished ${r.slug}`);
      }
    }
  });

  test("explicit relatedSlugs all exist", () => {
    for (const tool of TOOLS) {
      for (const slug of tool.relatedSlugs || []) {
        assert.ok(getTool(slug), `${tool.slug} lists missing tool "${slug}"`);
      }
    }
  });
});

describe("industry presets", () => {
  test("every preset sets real fields, inside their real ranges", () => {
    for (const tool of TOOLS) {
      for (const preset of tool.presets || []) {
        for (const [key, value] of Object.entries(preset.values)) {
          const field = tool.fields.find((f) => f.id === key);
          assert.ok(field, `${tool.slug}/${preset.id} sets unknown field "${key}"`);
          if (field!.type === "slider") {
            const n = value as number;
            assert.ok(n >= field!.min && n <= field!.max, `${tool.slug}/${preset.id}: ${key}=${n} outside [${field!.min}, ${field!.max}]`);
            const steps = (n - field!.min) / field!.step;
            assert.ok(Math.abs(steps - Math.round(steps)) < 1e-9, `${tool.slug}/${preset.id}: ${key}=${n} is off the step grid`);
          }
          if (field!.type === "select") {
            assert.ok(field!.options.some((o) => o.value === value), `${tool.slug}/${preset.id}: ${key}="${value}" is not an option`);
          }
        }
      }
    }
  });

  test("a preset produces a working result", () => {
    for (const tool of TOOLS) {
      if (tool.custom) continue;
      for (const preset of tool.presets || []) {
        const values: Record<string, unknown> = {};
        for (const f of tool.fields) values[f.id] = f.type === "checks" ? [...f.def] : f.def;
        Object.assign(values, preset.values);
        const r = tool.run(values as never);
        assert.ok(r && typeof r === "object", `${tool.slug}/${preset.id} returned nothing`);
        const shown = [r.headline?.value, ...(r.stats || []).map((s) => s.value)].filter(Boolean) as string[];
        for (const v of shown) {
          assert.ok(!/NaN|Infinity/.test(v), `${tool.slug}/${preset.id} produced "${v}"`);
        }
      }
    }
  });
});

describe("disclaimers", () => {
  test("regulated subjects carry the right disclaimer", () => {
    const expectations: Record<string, string> = {
      "quarterly-tax-estimator": "tax",
      "sales-tax-calculator": "tax",
      "mileage-deduction-calculator": "tax",
      "loan-payment-calculator": "financial",
      "cash-runway-calculator": "financial",
      "estimate-terms-generator": "legal",
      "late-payment-language": "legal",
      "cancellation-policy-generator": "legal",
    };
    for (const [slug, want] of Object.entries(expectations)) {
      const tool = getTool(slug);
      assert.ok(tool, `${slug} missing`);
      assert.equal(tool!.disclaimer, want, `${slug} should carry the "${want}" disclaimer`);
    }
  });

  test("every disclaimer type has a body long enough to be meaningful", () => {
    for (const [id, d] of Object.entries(DISCLAIMERS)) {
      assert.ok(d.body.length > 80, `${id} disclaimer is too thin`);
      assert.ok(d.label.length > 3, `${id} has no label`);
    }
  });
});

describe("collections", () => {
  test("every published collection has enough real tools behind it", () => {
    for (const c of PUBLISHED_COLLECTIONS) {
      const tools = collectionTools(c);
      assert.ok(tools.length >= MIN_TOOLS, `${c.slug} only resolves ${tools.length} tools`);
    }
  });

  test("every published collection carries its own written content", () => {
    for (const c of PUBLISHED_COLLECTIONS) {
      assert.ok(c.intro.length > 120, `${c.slug} intro is thin`);
      assert.ok(c.serves.length > 30, `${c.slug} does not say who it serves`);
      assert.ok(c.problems.length >= 3, `${c.slug} needs real problems`);
      assert.ok(c.faqs.length >= 2, `${c.slug} needs FAQs`);
      assert.ok(c.cta.length > 30, `${c.slug} has no next step`);
    }
  });

  test("pinned lead tools actually belong to their collection", () => {
    for (const c of PUBLISHED_COLLECTIONS) {
      const slugs = collectionTools(c).map((t) => t.slug);
      for (const lead of c.filter.lead || []) {
        assert.ok(slugs.includes(lead), `${c.slug} pins "${lead}" which its own filter excludes`);
      }
    }
  });
});
