import assert from "node:assert/strict";
import test from "node:test";
import { FREE_BUILD, FREE_BUILD_OPTIONS } from "../lib/freeBuild";

test("the public front door is a genuine zero-dollar website application", () => {
  const first = FREE_BUILD_OPTIONS[0];

  assert.equal(first.id, "free_build_only");
  assert.equal(first.priceUsd, 0);
  assert.match(first.pages, /five/i);
  assert.equal(FREE_BUILD.freeOnly.engine, "No paid add-on required");
});

test("the free website scope protects ownership and discloses outside costs", () => {
  const publicCopy = JSON.stringify(FREE_BUILD);

  assert.match(publicCopy, /90-day correction window/i);
  assert.match(publicCopy, /Domain registration/i);
  assert.match(publicCopy, /client's own approved tracking/i);
  assert.match(publicCopy, /does not take a hidden copy/i);
  assert.match(publicCopy, /No promise of a particular ranking/i);
});
