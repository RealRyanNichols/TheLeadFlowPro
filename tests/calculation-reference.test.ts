import assert from "node:assert/strict";
import test from "node:test";
import { TOOLS, getTool, type Result, type Values } from "../lib/tools";
import { CALCULATION_CASES } from "./fixtures/tool-calculation-cases";

function defaults(slug: string): Values {
  return Object.fromEntries(getTool(slug)!.fields.map((f) => [f.id, f.def]));
}
for (const example of CALCULATION_CASES)
  test(`reference arithmetic: ${example.slug}`, () => {
    const tool = getTool(example.slug);
    assert.ok(tool);
    const result = tool.run({ ...defaults(tool.slug), ...example.input });
    const actual = (example.path ?? "headline.value")
      .split(".")
      .reduce<unknown>(
        (part, key) =>
          part && typeof part === "object"
            ? (part as Record<string, unknown>)[key]
            : undefined,
        result,
      );
    assert.equal(
      typeof actual,
      "string",
      `${example.reasoning}: missing ${example.path ?? "headline.value"}`,
    );
    if (typeof example.expected === "string")
      assert.equal(actual, example.expected, example.reasoning);
    else {
      assert.match(actual as string, /\d/);
      const value = Number((actual as string).replace(/[^\d.\-]/g, ""));
      assert.ok(
        Math.abs(value - example.expected) <= (example.tolerance ?? 0.501),
        `${example.reasoning}: expected ${example.expected}, got ${actual}`,
      );
    }
  });

const NON_ARITHMETIC = new Set([
  "google-review-link",
  "review-response-writer",
  "qr-code-maker",
  "wifi-qr-code",
  "digital-business-card",
  "click-to-call-button",
  "sms-link-generator",
  "utm-link-builder",
  "email-signature-generator",
  "missed-call-textback-script",
  "review-request-script",
  "estimate-terms-generator",
  "late-payment-language",
  "cancellation-policy-generator",
  "localbusiness-schema-generator",
  "faq-schema-generator",
  "meta-title-description-writer",
  "ad-character-counter",
  "google-maps-link-generator",
  "add-to-calendar-link",
  "voicemail-script-generator",
  "job-post-writer",
  "google-post-writer",
  "robots-txt-generator",
]);

test("every published tool is classified for arithmetic or document/link verification", () => {
  const covered = new Set(CALCULATION_CASES.map((x) => x.slug));
  for (const tool of TOOLS)
    assert.ok(
      covered.has(tool.slug) || NON_ARITHMETIC.has(tool.slug),
      `New tool requires audit: ${tool.slug}`,
    );
  assert.equal(covered.size + NON_ARITHMETIC.size, TOOLS.length);
});

function assertFinite(value: unknown, location: string): void {
  if (typeof value === "number") assert.ok(Number.isFinite(value), location);
  else if (typeof value === "string")
    assert.doesNotMatch(value, /(?:\bNaN\b|\bInfinity\b|\$∞)/, location);
  else if (value && typeof value === "object")
    for (const [key, child] of Object.entries(value))
      assertFinite(child, `${location}.${key}`);
}
for (const tool of TOOLS)
  test(`numeric boundaries and export values: ${tool.slug}`, () => {
    const normal = defaults(tool.slug);
    assertFinite(tool.run(normal), tool.slug);
    for (const field of tool.fields) {
      if (!["money", "number", "slider"].includes(field.type)) continue;
      for (const invalid of [
        NaN,
        Infinity,
        -Infinity,
        field.type === "slider" ? field.min - 1 : -1,
        field.type === "slider" ? field.max + 1 : 1e100,
      ]) {
        const result = tool.run({ ...normal, [field.id]: invalid });
        assert.equal(
          result.headline?.value,
          "Check inputs",
          `${tool.slug}.${field.id}=${invalid}`,
        );
        assert.equal(
          result.documents,
          undefined,
          "Invalid inputs must not produce invoice or document exports",
        );
        assert.equal(result.csv, undefined);
        assertFinite(result, `${tool.slug}.${field.id}`);
      }
      for (const edge of field.type === "slider"
        ? [field.min, field.max]
        : [0, 0.01, 1_000_000_000_000])
        assertFinite(
          tool.run({ ...normal, [field.id]: edge }),
          `${tool.slug}.${field.id}=${edge}`,
        );
    }
  });
