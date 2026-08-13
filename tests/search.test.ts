// Search behaviour.
//
// The headline requirement: a search for "mortgage" used to return nothing at
// all, even though a dozen tools are useful to a loan officer. These tests lock
// in the fix and the rest of the vocabulary along with it.

import { test, describe } from "node:test";
import assert from "node:assert/strict";
import { TOOLS, toolIndex, searchTools, suggestFor, resolveQuery, sortTools } from "../lib/tools/index.ts";

const index = toolIndex();
const find = (q: string) => searchTools(index, q).map((h) => h.tool.slug);
const top = (q: string, n = 10) => find(q).slice(0, n);

describe("the mortgage failure, fixed", () => {
  test("returns a useful set instead of nothing", () => {
    const hits = find("mortgage");
    assert.ok(hits.length >= 8, `expected a real set, got ${hits.length}`);
  });

  test("reaches the loan, lead, pricing and follow-up tools a loan officer needs", () => {
    const hits = new Set(find("mortgage"));
    for (const slug of [
      "loan-payment-calculator",
      "lead-response-time",
      "lead-value-calculator",
      "missed-call-calculator",
      "commission-calculator",
      "quote-follow-up-calculator",
    ]) {
      assert.ok(hits.has(slug), `"mortgage" should reach ${slug}`);
    }
  });

  test("related phrasings land in the same place", () => {
    for (const q of ["loan officer", "home loan", "refinance", "lender"]) {
      assert.ok(find(q).length >= 4, `"${q}" returned ${find(q).length}`);
    }
  });
});

describe("tiered relevance", () => {
  // The flat-ranking failure: "mortgage" returned 61 tools within a point of
  // each other, so a generic QR maker sat among the top suggestions. Tiers
  // from lib/tools/relevance.ts now outrank score, and these lock that in.

  test("every hit carries a tier", () => {
    const tiers = new Set(["core", "strong", "broad", "incidental"]);
    for (const h of searchTools(index, "mortgage")) {
      assert.ok(tiers.has(h.tier), `${h.tool.slug} has tier "${h.tier}"`);
    }
  });

  test("mortgage leads with core and strong tools", () => {
    const hits = searchTools(index, "mortgage");
    const best = hits.filter((h) => h.tier === "core" || h.tier === "strong");
    assert.ok(best.length > 0, "mortgage should have core or strong hits");
    for (const h of hits.slice(0, best.length)) {
      assert.ok(
        h.tier === "core" || h.tier === "strong",
        `${h.tool.slug} (${h.tier}) ranked among the close matches`,
      );
    }
  });

  test("generic tools stay out of the mortgage top five", () => {
    const top5 = searchTools(index, "mortgage").slice(0, 5).map((h) => h.tool.slug);
    assert.ok(!top5.includes("qr-code-maker"), "the QR maker is not a mortgage tool");
    assert.ok(!top5.includes("google-review-link"), "the review link is not a mortgage tool");
  });

  test("tier order is monotonic, so no broad hit outranks a core one", () => {
    const rank = { core: 3, strong: 2, broad: 1, incidental: 0 } as const;
    for (const q of ["mortgage", "roofer", "restaurant", "doctor"]) {
      const hits = searchTools(index, q);
      for (let i = 1; i < hits.length; i++) {
        assert.ok(
          rank[hits[i].tier] <= rank[hits[i - 1].tier],
          `"${q}": ${hits[i - 1].tool.slug} (${hits[i - 1].tier}) ranked above ${hits[i].tool.slug} (${hits[i].tier})`,
        );
      }
    }
  });

  test("an empty query still returns every tool, all tiered", () => {
    const hits = searchTools(index, "");
    assert.equal(hits.length, TOOLS.length);
    for (const h of hits) assert.ok(h.tier, `${h.tool.slug} is missing a tier`);
  });
});

describe("industry vocabulary", () => {
  test("doctor reaches practice operations tools, not clinical ones", () => {
    const hits = find("doctor");
    assert.ok(hits.length >= 5, `got ${hits.length}`);
    const set = new Set(hits);
    assert.ok(set.has("no-show-calculator"));
    assert.ok(set.has("missed-call-calculator"));
  });

  test("police reaches public service planning tools", () => {
    const { facets } = resolveQuery("police");
    assert.ok(facets.industries.includes("law-enforcement"), "police resolves to law enforcement");
    assert.ok(facets.domains.includes("public-service"), "police resolves to the public service domain");
    assert.ok(find("police").length > 0, "and returns something to work with");
  });

  test("mom reaches household, budgeting and planning", () => {
    const { facets } = resolveQuery("mom");
    assert.ok(facets.audiences.includes("parents"));
    assert.ok(facets.industries.includes("household"));
    assert.ok(facets.domains.includes("home-family"));
  });

  test("trade names resolve to their industry", () => {
    const cases: [string, string][] = [
      ["roofer", "roofing"],
      ["plumber", "plumbing"],
      ["dentist", "dental-practice"],
      ["realtor", "real-estate"],
      ["barber", "barbershop"],
      ["restaurant", "restaurant"],
      ["attorney", "legal"],
      ["airbnb", "vacation-rental"],
    ];
    for (const [q, industry] of cases) {
      const { facets } = resolveQuery(q);
      assert.ok(facets.industries.includes(industry as never), `"${q}" should resolve to ${industry}`);
    }
  });
});

describe("tool type vocabulary", () => {
  test("QR returns every QR tool", () => {
    const hits = new Set(find("QR"));
    const qrTools = TOOLS.filter((t) => t.toolType === "qr").map((t) => t.slug);
    assert.ok(qrTools.length >= 4, "there should be several QR tools");
    for (const slug of qrTools) {
      assert.ok(hits.has(slug), `"QR" should return ${slug}`);
    }
  });

  test("qr code and barcode behave the same way", () => {
    for (const q of ["qr code", "barcode"]) {
      const { facets } = resolveQuery(q);
      assert.ok(facets.toolTypes.includes("qr"), `"${q}" should resolve to the QR type`);
    }
  });

  test("checklist and template resolve to their types", () => {
    assert.ok(resolveQuery("checklist").facets.toolTypes.includes("checklist"));
    assert.ok(resolveQuery("template").facets.toolTypes.includes("template"));
  });
});

describe("plain matching", () => {
  test("an exact tool name ranks first", () => {
    for (const name of ["QR Code Maker", "Break-Even Calculator", "Meeting Cost Calculator"]) {
      const hits = searchTools(index, name);
      assert.equal(hits[0].tool.name, name, `"${name}" should rank itself first`);
    }
  });

  test("plurals and stems match", () => {
    assert.ok(find("reviews").length > 0);
    assert.ok(find("pricing").length > 0);
    assert.ok(find("roofers").length > 0);
  });

  test("typos still find the tool", () => {
    for (const [typo, slug] of [["mortage", "loan-payment-calculator"], ["calulator", null], ["resturant", null]] as [string, string | null][]) {
      const hits = find(typo);
      assert.ok(hits.length > 0, `"${typo}" returned nothing`);
      if (slug) assert.ok(hits.includes(slug), `"${typo}" should still reach ${slug}`);
    }
  });

  test("nonsense returns nothing rather than everything", () => {
    assert.equal(find("zzzqqqxyzzy").length, 0);
    assert.equal(find("mortgage zzzqqqxyzzy giraffe").length, 0);
  });

  test("an empty query returns the whole catalogue", () => {
    assert.equal(find("").length, TOOLS.length);
  });
});

describe("suggestions", () => {
  test("offers tools and a way to browse an industry", () => {
    const s = suggestFor(index, "mortgage");
    assert.ok(s.length > 0);
    assert.ok(s.some((x) => x.kind === "tool"), "should offer tools");
    assert.ok(s.some((x) => x.kind === "industry" && x.href.includes("industry=")), "should offer the industry");
  });

  test("stays quiet until there is something to go on", () => {
    assert.equal(suggestFor(index, "m").length, 0);
  });
});

describe("filter combinations", () => {
  const filterBy = (fn: (t: (typeof index)[number]) => boolean) => index.filter(fn);

  test("domain and tool type together narrow correctly", () => {
    const both = filterBy((t) => t.domain === "websites-digital" && t.toolType === "qr");
    assert.ok(both.length > 0, "there is at least one digital QR tool");
    for (const t of both) {
      assert.equal(t.domain, "websites-digital");
      assert.equal(t.toolType, "qr");
    }
  });

  test("industry plus goal returns only tools carrying both", () => {
    const both = filterBy((t) => t.industries.includes("restaurant") && t.goals.includes("save-money"));
    assert.ok(both.length > 0);
    for (const t of both) {
      assert.ok(t.industries.includes("restaurant"));
      assert.ok(t.goals.includes("save-money"));
    }
  });

  test("an impossible combination returns nothing, which is the empty state", () => {
    const none = filterBy((t) => t.industries.includes("hunting-fishing") && t.toolType === "social-preview");
    assert.equal(none.length, 0);
  });

  test("searching inside a filtered set stays inside it", () => {
    const scoped = filterBy((t) => t.domain === "business-money");
    const hits = searchTools(scoped, "cost");
    for (const h of hits) assert.equal(h.tool.domain, "business-money");
  });
});

describe("sorting", () => {
  test("A to Z is alphabetical", () => {
    const names = sortTools(index, "az").map((t) => t.name);
    assert.deepEqual(names, [...names].sort((a, b) => a.localeCompare(b)));
  });

  test("most popular is descending", () => {
    const pops = sortTools(index, "popular").map((t) => t.popularity);
    for (let i = 1; i < pops.length; i++) assert.ok(pops[i] <= pops[i - 1]);
  });

  test("most useful leads with the featured set", () => {
    const sorted = sortTools(index, "useful");
    const featuredCount = index.filter((t) => t.featured).length;
    if (featuredCount > 0) {
      assert.ok(sorted[0].featured, "the first tool should be a featured one");
    }
  });

  test("every sort returns the same tools, just reordered", () => {
    for (const key of ["useful", "popular", "newest", "az"] as const) {
      assert.equal(sortTools(index, key).length, index.length);
    }
  });
});
