import assert from "node:assert/strict";
import test from "node:test";
import { getTool } from "../lib/tools";
import { GROWTH_TOOLS } from "../lib/tools/growth";

const tool = getTool("google-business-profile-scorecard")!;

test("profile checklist ignores forged, duplicate and retired check IDs", () => {
  const values = { checks: ["claimed", "claimed", "hours", "qa", "reviews50", "messaging", "not-a-check"] };
  assert.equal(tool.run(values).headline?.value, "Check inputs");
  const result = GROWTH_TOOLS.find((item) => item.slug === tool.slug)!.run(values);
  assert.equal(result.headline?.value, "10 / 100");
  assert.equal(result.headline?.label, "Your checklist coverage");
  assert.equal(result.stats?.[0].value, "18");
  assert.match(result.verdict?.text ?? "", /not Google's ranking system/);
});

test("checklist starts unverified and does not require unavailable profile features", () => {
  const field = tool.fields.find((f) => f.id === "checks");
  assert.ok(field?.type === "checks");
  assert.deepEqual(field.def, []);
  assert.equal(field.options.length, 20);
  const copy = JSON.stringify([field, tool.run({ checks: [] })]);
  assert.doesNotMatch(copy, /20\+ real photos|50 or more reviews|single biggest ranking factor|Cost to fix all of it|Hours it would take|Seed the Q&A|Turn on messaging/);
  assert.match(copy, /If WhatsApp or SMS is available/);
  const result = tool.run({ checks: field.options.map((o) => o.value) });
  assert.equal(result.headline?.value, "100 / 100");
  assert.equal(result.stats?.[0].value, "0");
});
