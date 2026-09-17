import assert from "node:assert/strict";
import test from "node:test";
import { brokenLinks, collectInternalHrefs, routeExists } from "../scripts/check-links.ts";
import { findFactProblems, formatFactProblems } from "../scripts/validate-facts.ts";

test("every configured internal link resolves to a route under app/", () => {
  assert.ok(collectInternalHrefs().length > 40);
  assert.equal(routeExists("/"), true);
  assert.equal(routeExists("/agency/meta-ads"), true);
  assert.equal(routeExists("/packages/industry-os"), true);
  assert.equal(routeExists("/tools/pro"), true);
  assert.equal(routeExists("/not-a-real-page"), false);
  const broken = brokenLinks();
  assert.deepEqual(broken, [], broken.map((b) => `${b.href} (${b.from})`).join("\n"));
});

test("no hard-coded price, phone, email, legal entity, or workshop date outside lib/site", () => {
  const problems = findFactProblems();
  assert.equal(problems.length, 0, `\n${formatFactProblems(problems)}`);
});
