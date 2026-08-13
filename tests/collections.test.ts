// The honest-count contract for collection pages. An industry page may only
// claim tools that are core or secondary for the work; the broadly useful pile
// is shown under its own label and never reaches the headline number.

import { test, describe } from "node:test";
import assert from "node:assert/strict";
import {
  PUBLISHED_COLLECTIONS,
  collectionCount,
  collectionSections,
  collectionTools,
  MIN_TOOLS,
  MIN_PROPER_TOOLS,
} from "../lib/tools/collections.ts";
import { relevanceTier } from "../lib/tools/relevance.ts";

describe("collection sections", () => {
  for (const c of PUBLISHED_COLLECTIONS) {
    test(`${c.slug} resolves sections with no empty section and no duplicates`, () => {
      const sections = collectionSections(c);
      assert.ok(sections.length > 0, `${c.slug} resolves no sections at all`);
      const seen = new Set<string>();
      for (const s of sections) {
        assert.ok(s.tools.length > 0, `${c.slug} renders an empty "${s.id}" section`);
        assert.ok(s.title.length > 0, `${c.slug}/${s.id} has no title`);
        for (const t of s.tools) {
          assert.ok(!seen.has(t.slug), `${c.slug} shows ${t.slug} in two sections`);
          seen.add(t.slug);
        }
      }
    });
  }

  test("every sectioned tool is one the collection actually resolves", () => {
    for (const c of PUBLISHED_COLLECTIONS) {
      const resolvable = new Set(collectionTools(c).map((t) => t.slug));
      for (const s of collectionSections(c)) {
        for (const t of s.tools) {
          assert.ok(resolvable.has(t.slug), `${c.slug}/${s.id} shows ${t.slug}, which the filter excludes`);
        }
      }
    }
  });
});

describe("honest counts", () => {
  test("the broad section is never part of an industry headline count", () => {
    for (const c of PUBLISHED_COLLECTIONS.filter((c) => c.kind === "industry")) {
      const sections = collectionSections(c);
      const countedSections = sections.filter((s) => s.id !== "broadly-useful");
      const counted = countedSections.reduce((n, s) => n + s.tools.length, 0);
      assert.equal(
        collectionCount(c),
        counted,
        `${c.slug} claims ${collectionCount(c)} but its counted sections hold ${counted}`,
      );
      const broad = sections.find((s) => s.id === "broadly-useful");
      if (broad) {
        assert.ok(
          collectionCount(c) <= collectionTools(c).length - broad.tools.length,
          `${c.slug} counts broadly useful tools in its headline number`,
        );
      }
    }
  });

  test("mortgage-lending counts only core and secondary tools, and few of them", () => {
    const c = PUBLISHED_COLLECTIONS.find((c) => c.slug === "mortgage-lending");
    assert.ok(c, "mortgage-lending is not published");
    const n = collectionCount(c!);
    assert.ok(n <= 12, `mortgage-lending claims ${n} tools, which is the old inflation back`);
    const counted = collectionSections(c!)
      .filter((s) => s.id !== "broadly-useful")
      .flatMap((s) => s.tools);
    assert.equal(counted.length, n);
    for (const t of counted) {
      const tier = relevanceTier(t.slug, "mortgage-lending");
      assert.ok(
        tier === "core" || tier === "secondary",
        `${t.slug} is counted as a mortgage tool but its tier is "${tier}"`,
      );
    }
  });

  test("goal and type collections keep their full, already honest count", () => {
    for (const c of PUBLISHED_COLLECTIONS.filter((c) => c.kind !== "industry")) {
      assert.equal(collectionCount(c), collectionTools(c).length, `${c.slug} count drifted`);
    }
  });
});

describe("publication gating", () => {
  test("every published industry collection earns its page", () => {
    for (const c of PUBLISHED_COLLECTIONS.filter((c) => c.kind === "industry")) {
      assert.ok(
        collectionCount(c) >= MIN_PROPER_TOOLS,
        `${c.slug} has only ${collectionCount(c)} core or secondary tools`,
      );
      assert.ok(collectionTools(c).length >= MIN_TOOLS, `${c.slug} resolves too few tools overall`);
    }
  });

  test("no currently live collection page went missing", () => {
    // These are live URLs. Losing one here is a 404 in the wild.
    const live = [
      "home-services",
      "real-estate",
      "mortgage-lending",
      "restaurants-and-food",
      "salons-and-barbers",
      "medical-and-dental-operations",
      "legal-practices",
      "qr-codes-and-links",
      "getting-more-leads",
      "pricing-and-margin",
      "website-and-online-presence",
    ];
    const published = new Set(PUBLISHED_COLLECTIONS.map((c) => c.slug));
    const missing = live.filter((slug) => !published.has(slug));
    assert.deepEqual(missing, [], `these collection URLs would 404: ${missing.join(", ")}`);
  });
});
