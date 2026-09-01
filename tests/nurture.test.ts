import assert from "node:assert/strict";
import test from "node:test";
import {
  BUSINESS_DIAGNOSTIC_SOURCE,
  isBusinessDiagnosticLead,
  NURTURE_FIRST_STEP,
  NURTURE_LAST_STEP,
  NURTURE_STEPS,
  stepsDueBy,
} from "../lib/nurture";

test("business diagnostic attribution is isolated from the general nurture campaign", () => {
  assert.equal(
    isBusinessDiagnosticLead({ source: BUSINESS_DIAGNOSTIC_SOURCE, diagnostic: null }),
    true,
  );
  assert.equal(
    isBusinessDiagnosticLead({
      source: "facebook_messenger",
      diagnostic: { source: BUSINESS_DIAGNOSTIC_SOURCE },
    }),
    true,
  );
  assert.equal(
    isBusinessDiagnosticLead({
      source: "website",
      diagnostic: { campaign: BUSINESS_DIAGNOSTIC_SOURCE },
    }),
    true,
  );
});

test("legacy and malformed diagnostic payloads stay eligible for general nurture", () => {
  assert.equal(isBusinessDiagnosticLead({ source: "website", diagnostic: null }), false);
  assert.equal(isBusinessDiagnosticLead({ source: null, diagnostic: {} }), false);
  assert.equal(isBusinessDiagnosticLead({ source: "meta", diagnostic: [] }), false);
  assert.equal(
    isBusinessDiagnosticLead({ source: "website", diagnostic: { source: "free_build" } }),
    false,
  );
});

test("the general nurture step range cannot overlap diagnostic steps 200 through 206", () => {
  assert.equal(NURTURE_FIRST_STEP, 101);
  assert.equal(NURTURE_LAST_STEP, 130);
  assert.equal(NURTURE_STEPS.length, 30);
  assert.deepEqual(NURTURE_STEPS.map((step) => step.day), Array.from({ length: 30 }, (_, i) => i + 1));
  assert.equal(NURTURE_STEPS.some((step) => step.step >= 200 && step.step <= 206), false);
});

test("the active sequence describes the free website without a required paid service", () => {
  const copy = NURTURE_STEPS.map((step) => `${step.subject}\n${step.body("Ryan")}`).join("\n");

  assert.match(copy, /five-page website with a \$0 build fee/i);
  assert.match(copy, /No add-on purchase is required/i);
  assert.match(copy, /domain registration/i);
  assert.match(copy, /never reused across clients/i);
});

test("general nurture eligibility remains based on lead age", () => {
  assert.deepEqual(stepsDueBy(0), []);
  assert.deepEqual(
    stepsDueBy(2).map((step) => step.step),
    [101, 102],
  );
});
