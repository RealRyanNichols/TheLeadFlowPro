import assert from "node:assert/strict";
import test from "node:test";
import {
  CONTENT_ENGINE,
  CONTENT_ENGINE_LESSONS,
  CONTENT_ENGINE_MODULES,
} from "../lib/contentEngineCourse";

test("Content Engine has a complete unique twelve lesson path", () => {
  assert.equal(CONTENT_ENGINE_LESSONS.length, 12);
  assert.equal(new Set(CONTENT_ENGINE_LESSONS.map((lesson) => lesson.slug)).size, 12);
  assert.equal(new Set(CONTENT_ENGINE_LESSONS.map((lesson) => lesson.code)).size, 12);
  assert.equal(CONTENT_ENGINE_MODULES.length, 5);
});

test("Content Engine founding access is lower than the regular price", () => {
  assert.equal(CONTENT_ENGINE.foundingPriceCents, 12700);
  assert.equal(CONTENT_ENGINE.regularPriceCents, 19700);
  assert.ok(CONTENT_ENGINE.foundingPriceCents < CONTENT_ENGINE.regularPriceCents);
});

test("Content Engine completion credential keeps the accreditation boundary", () => {
  assert.match(CONTENT_ENGINE.credentialDisclaimer, /not a degree/i);
  assert.match(CONTENT_ENGINE.credentialDisclaimer, /not.*accreditation/i);
  assert.match(CONTENT_ENGINE.credentialDisclaimer, /not.*state or federal certification/i);
});
