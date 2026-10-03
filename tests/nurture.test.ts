import assert from "node:assert/strict";
import test from "node:test";
import {
  BUSINESS_DIAGNOSTIC_SOURCE,
  isBusinessDiagnosticLead,
  isFreeWebsiteProgramNurtureLead,
  NURTURE_FIRST_STEP,
  NURTURE_LAST_STEP,
  NURTURE_STEPS,
  stepsDueBy,
} from "../lib/nurture";
import { PRICES, usd } from "../lib/site/prices";
import { LEADFLOW_META } from "../lib/metaCampaignGuard";

test("business diagnostic attribution is isolated from the general nurture campaign", () => {
  assert.equal(
    isBusinessDiagnosticLead({
      source: BUSINESS_DIAGNOSTIC_SOURCE,
      diagnostic: null,
    }),
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
  assert.equal(
    isBusinessDiagnosticLead({ source: "website", diagnostic: null }),
    false,
  );
  assert.equal(
    isBusinessDiagnosticLead({ source: null, diagnostic: {} }),
    false,
  );
  assert.equal(
    isBusinessDiagnosticLead({ source: "meta", diagnostic: [] }),
    false,
  );
  assert.equal(
    isBusinessDiagnosticLead({
      source: "website",
      diagnostic: { source: "free_build" },
    }),
    false,
  );
});

test("free-build nurture admits only explicit-consent website and exact Meta v2 leads", () => {
  const base = {
    interest: "free_website_program",
    marketing_email_consent: true,
    diagnostic: { source: "free_build_funnel" },
  };
  assert.equal(
    isFreeWebsiteProgramNurtureLead({ ...base, source: "website" }),
    true,
  );
  assert.equal(
    isFreeWebsiteProgramNurtureLead({
      ...base,
      source: "meta_lead_ad",
      diagnostic: {
        source: "free_build_funnel",
        form_id: LEADFLOW_META.formId,
      },
    }),
    true,
  );

  assert.equal(
    isFreeWebsiteProgramNurtureLead({
      ...base,
      marketing_email_consent: false,
      source: "website",
    }),
    false,
  );
  assert.equal(
    isFreeWebsiteProgramNurtureLead({
      ...base,
      interest: "done_for_you",
      source: "website",
    }),
    false,
  );
  assert.equal(
    isFreeWebsiteProgramNurtureLead({
      ...base,
      source: "meta_lead_ad",
      diagnostic: {
        source: "free_build_funnel",
        form_id: "legacy-or-foreign-form",
      },
    }),
    false,
  );
  assert.equal(
    isFreeWebsiteProgramNurtureLead({
      ...base,
      source: "website",
      diagnostic: null,
    }),
    false,
  );
});

test("the general nurture step range cannot overlap diagnostic steps 200 through 206", () => {
  assert.equal(NURTURE_FIRST_STEP, 101);
  assert.equal(NURTURE_LAST_STEP, 130);
  assert.equal(NURTURE_STEPS.length, 30);
  assert.deepEqual(
    NURTURE_STEPS.map((step) => step.day),
    Array.from({ length: 30 }, (_, i) => i + 1),
  );
  assert.equal(
    NURTURE_STEPS.some((step) => step.step >= 200 && step.step <= 206),
    false,
  );
});

test("future historical-sequence sends use current campaign terms without resurrecting retired purchase offers", () => {
  const copy = NURTURE_STEPS.map(
    (step) => `${step.subject}\n${step.body("Ryan")}`,
  ).join("\n");
  assert.doesNotMatch(
    copy,
    /\$0|\$197|\$497|free build|free scope|paid growth services stay separate|ad spend are outside costs/i,
  );
  const first = NURTURE_STEPS[0].body("Ryan");
  const last = NURTURE_STEPS.at(-1)!.body("Ryan");
  for (const body of [first, last]) {
    assert.ok(body.includes(`${usd(PRICES.managedStartingUpfront)} upfront`));
    assert.match(body, /up to 90 days/);
    assert.match(body, /advertising allocation are included/);
    assert.match(
      body,
      /(?:Earlier|Existing) approved agreements keep their own/i,
    );
    assert.match(body, /\/pricing\?utm_source=email/);
  }
  assert.match(last, /Captured inquiries are still handed over/);
  assert.match(last, /no automatic extension/);
  assert.match(last, /new written scope and price/);
  assert.match(copy, /never reused across clients/i);
});

test("general nurture eligibility remains based on lead age", () => {
  assert.deepEqual(stepsDueBy(0), []);
  assert.deepEqual(
    stepsDueBy(2).map((step) => step.step),
    [101, 102],
  );
});
