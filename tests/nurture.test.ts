import assert from "node:assert/strict";
import test from "node:test";
import {
  BUSINESS_DIAGNOSTIC_SOURCE,
  isBusinessDiagnosticLead,
  isFreeWebsiteProgramNurtureLead,
  isWorkshopNurtureLead,
  nurtureLink,
  NURTURE_FIRST_STEP,
  NURTURE_LAST_STEP,
  NURTURE_STEPS,
  stepsDueBy,
  WORKSHOP_META_FORM_ID,
} from "../lib/nurture";
import { LEADFLOW_META } from "../lib/metaCampaignGuard";

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

test("the retired free-build 30-day sequence admits nobody, not even its old lanes", () => {
  // Retired 2026-09-22 with the free website build it sold. Every lead that
  // used to qualify now gets no drip at all.
  const base = {
    interest: "free_website_program",
    marketing_email_consent: true,
    diagnostic: { source: "free_build_funnel" },
  };
  assert.equal(isFreeWebsiteProgramNurtureLead({ ...base, source: "website" }), false);
  for (const formId of [LEADFLOW_META.formId, "1602617814609528", "1001553739566746", "1072145798524733"]) {
    assert.equal(
      isFreeWebsiteProgramNurtureLead({
        ...base,
        interest: "website_launch",
        source: "meta_lead_ad",
        diagnostic: { source: "meta_lead_form", form_id: formId },
      }),
      false,
      formId,
    );
  }
});

test("the workshop lane still admits its own consented form and nothing else", () => {
  const workshop = {
    source: "meta_lead_ad",
    interest: "learn",
    marketing_email_consent: true,
    diagnostic: { form_id: WORKSHOP_META_FORM_ID },
  };
  assert.equal(isWorkshopNurtureLead(workshop), true);
  assert.equal(isWorkshopNurtureLead({ ...workshop, marketing_email_consent: false }), false);
  assert.equal(isWorkshopNurtureLead({ ...workshop, diagnostic: { form_id: LEADFLOW_META.formId } }), false);
});

test("no nurture link can send anyone to the retired /free-build page", () => {
  assert.match(nurtureLink(1), /^https:\/\/www\.theleadflowpro\.com\/services\?utm_source=email/);
  const copy = NURTURE_STEPS.map((step) => step.body("Ryan")).join("\n");
  assert.ok(!copy.includes("/free-build"));
});

test("the general nurture step range cannot overlap diagnostic steps 200 through 206", () => {
  assert.equal(NURTURE_FIRST_STEP, 101);
  assert.equal(NURTURE_LAST_STEP, 130);
  assert.equal(NURTURE_STEPS.length, 30);
  assert.deepEqual(NURTURE_STEPS.map((step) => step.day), Array.from({ length: 30 }, (_, i) => i + 1));
  assert.equal(NURTURE_STEPS.some((step) => step.step >= 200 && step.step <= 206), false);
});

test("general nurture eligibility remains based on lead age", () => {
  assert.deepEqual(stepsDueBy(0), []);
  assert.deepEqual(
    stepsDueBy(2).map((step) => step.step),
    [101, 102],
  );
});
