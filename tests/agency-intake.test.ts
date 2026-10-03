import assert from "node:assert/strict";
import test from "node:test";
import {
  agencyIntakeContext,
  agencyIntakeHref,
  agencyWebsiteUrl,
  validateAgencyIntake,
} from "../lib/site/agencyIntake.ts";
import { campaignTags } from "../lib/site/campaignTags.ts";

const services = [
  { slug: "meta-ads", label: "Meta ads" },
  { slug: "custom", label: "A custom build" },
];
const known = [
  ...services,
  { slug: "crypto-tax-intake", label: "Specialty intake" },
];
function completed() {
  const form = new FormData();
  for (const [key, value] of Object.entries({
    business_name: " Fixture Fence Co ",
    full_name: " Fixture Owner ",
    email: " fixture@example.com ",
    "service_meta-ads": "on",
    managed_plan_budget: "recommended",
    campaign_acknowledged: "on",
    bottleneck: " Follow-up is getting missed. ",
    decision_maker: "me",
    timeline: "researching",
  }))
    form.set(key, value);
  return form;
}

test("a completed inquiry trims answers without requiring phone, channel choices, or either optional consent", () => {
  const result = validateAgencyIntake(completed(), services);
  assert.equal(result.ok, true);
  if (!result.ok) return;
  assert.equal(result.value.businessName, "Fixture Fence Co");
  assert.equal(result.value.fullName, "Fixture Owner");
  assert.equal(result.value.email, "fixture@example.com");
  assert.equal(result.value.bottleneck, "Follow-up is getting missed.");
  assert.equal(result.value.phone, null);
  assert.equal(result.value.smsConsent, false);
  assert.equal(result.value.marketingEmailConsent, false);
  assert.deepEqual(result.value.channels, []);
  assert.equal(result.value.plan, "recommended");
  assert.equal(result.value.campaignAcknowledged, true);
});

test("required whitespace and malformed email produce field-specific errors before a request", () => {
  const form = completed();
  for (const field of ["business_name", "full_name", "bottleneck"])
    form.set(field, "  \n ");
  form.set("email", "owner@example");
  const result = validateAgencyIntake(form, services);
  assert.equal(result.ok, false);
  if (result.ok) return;
  assert.deepEqual(Object.keys(result.errors), [
    "business_name",
    "full_name",
    "email",
    "bottleneck",
  ]);
});

test("call/text permission requires a usable number but a number does not opt someone in", () => {
  const form = completed();
  form.set("sms_consent", "on");
  let result = validateAgencyIntake(form, services);
  assert.equal(result.ok, false);
  if (!result.ok) assert.match(result.errors.phone!, /mobile number/);
  form.set("phone", "not a number");
  result = validateAgencyIntake(form, services);
  assert.equal(result.ok, false);
  form.set("phone", "555-0100");
  result = validateAgencyIntake(form, services);
  assert.equal(result.ok, false);
  form.set("phone", "+1 (903) 555-0100");
  result = validateAgencyIntake(form, services);
  assert.equal(result.ok, true);
  if (result.ok) assert.equal(result.value.smsConsent, true);
  form.delete("sms_consent");
  result = validateAgencyIntake(form, services);
  assert.equal(result.ok, true);
  if (result.ok) assert.equal(result.value.smsConsent, false);
});

test("pasted website domains are normalized and invalid or credential-bearing links are refused", () => {
  assert.equal(agencyWebsiteUrl("fixture.example"), "https://fixture.example/");
  assert.equal(
    agencyWebsiteUrl("https://facebook.com/fixture?ref=site"),
    "https://facebook.com/fixture?ref=site",
  );
  assert.equal(agencyWebsiteUrl(""), null);
  for (const link of [
    "javascript:alert(1)",
    "ftp://fixture.example",
    "https://secret:password@fixture.example",
    "not a website",
    "localhost",
    `https://fixture.example/${"x".repeat(300)}`,
  ])
    assert.throws(() => agencyWebsiteUrl(link), link);
  const form = completed();
  form.set("website_url", "fixture.example");
  let result = validateAgencyIntake(form, services);
  assert.equal(result.ok, true);
  if (result.ok)
    assert.equal(result.value.websiteUrl, "https://fixture.example/");
  form.set("website_url", "not a link");
  result = validateAgencyIntake(form, services);
  assert.equal(result.ok, false);
  if (!result.ok) assert.ok(result.errors.website_url);
});

test("unrecognized plan, decision, timeline, and service answers cannot become a valid inquiry", () => {
  const form = completed();
  form.delete("service_meta-ads");
  form.set("service_unlisted", "on");
  form.set("managed_plan_budget", "old_750");
  form.set("decision_maker", "not_listed");
  form.set("timeline", "yesterday");
  const result = validateAgencyIntake(form, services);
  assert.equal(result.ok, false);
  if (!result.ok)
    assert.deepEqual(Object.keys(result.errors), [
      "services",
      "managed_plan_budget",
      "decision_maker",
      "timeline",
    ]);
});

test("historical plan identifiers normalize to the sole current campaign", () => {
  for (const choice of [
    "foundation",
    "recommended",
    "structured",
    "custom",
    "discuss",
  ]) {
    const form = completed();
    form.set("managed_plan_budget", choice);
    const result = validateAgencyIntake(form, services);
    assert.equal(result.ok, true, choice);
    if (result.ok) assert.equal(result.value.plan, "recommended");
  }
});

test("a campaign link or historical plan never substitutes for explicit acknowledgement", () => {
  for (const choice of [
    "recommended",
    "foundation",
    "structured",
    "custom",
    "discuss",
  ]) {
    const form = completed();
    form.set("managed_plan_budget", choice);
    form.delete("campaign_acknowledged");
    const result = validateAgencyIntake(form, services);
    assert.equal(result.ok, false, choice);
    if (!result.ok) {
      assert.deepEqual(Object.keys(result.errors), ["campaign_acknowledged"]);
      assert.match(
        result.errors.campaign_acknowledged!,
        /does not authorize a charge/,
      );
    }
  }
});

test("service and private lead attribution remain independent of a selected plan", () => {
  const lead = "ABCDEF01-0000-4000-8000-000000000001";
  assert.deepEqual(
    agencyIntakeContext(
      { service: "meta-ads", plan: "structured", lead },
      known,
      services,
    ),
    {
      requestedService: "meta-ads",
      preselected: "meta-ads",
      initialPlan: "recommended",
      originatingLead: lead.toLowerCase(),
    },
  );
  assert.deepEqual(
    agencyIntakeContext(
      { service: "crypto-tax-intake", plan: "custom", lead },
      known,
      services,
    ),
    {
      requestedService: "crypto-tax-intake",
      preselected: "custom",
      initialPlan: "recommended",
      originatingLead: lead.toLowerCase(),
    },
  );
});

test("unknown or repeated query choices do not silently select a plan, service, or private lead", () => {
  for (const params of [
    { service: "unknown", plan: "cheap", lead: "someone@example.com" },
    {
      service: ["meta-ads", "custom"],
      plan: ["foundation", "structured"],
      lead: ["00000000-0000-4000-8000-000000000001"],
    },
  ]) {
    assert.deepEqual(agencyIntakeContext(params, known, services), {
      requestedService: null,
      preselected: null,
      initialPlan: null,
      originatingLead: null,
    });
  }
});

test("pricing handoff carries the current campaign and attribution without private identifiers", () => {
  const href = agencyIntakeHref("foundation", {
    plan: "structured",
    utm_source: "facebook",
    utm_medium: "paid_social",
    utm_campaign: "contractors",
    utm_content: ["video", "proof"],
    service: "meta-ads",
    lead: "ABCDEF01-0000-4000-8000-000000000001",
    token: "do-not-forward",
    email: "private@example.com",
  });
  const query = new URL(href, "https://example.com").searchParams;
  assert.equal(query.get("plan"), "recommended");
  assert.equal(query.get("service"), "meta-ads");
  assert.equal(query.has("lead"), false);
  assert.deepEqual(query.getAll("utm_content"), ["video", "proof"]);
  assert.equal(query.has("token"), false);
  assert.equal(query.has("email"), false);
  assert.deepEqual(campaignTags(query, {}, "agency_intake"), {
    utm_source: "facebook",
    utm_medium: "paid_social",
    utm_campaign: "contractors",
  });
  assert.equal(agencyIntakeHref(null), "/agency/start");
  assert.equal(
    new URL(agencyIntakeHref("custom"), "https://example.com").searchParams.get(
      "plan",
    ),
    "recommended",
  );
});

test("handoff only forwards bounded named public fields", () => {
  const href = agencyIntakeHref("recommended", {
    utm_source: `  ${"x".repeat(150)}  `,
    service: ["meta-ads", "custom"],
    phone: "+1-903-555-0100",
    lead: "abcdef01-0000-4000-8000-000000000001",
    return_url: "https://private.example/secret",
    token: "private-token",
  });
  const query = new URL(href, "https://example.com").searchParams;
  assert.deepEqual(Array.from(query.keys()).sort(), ["plan", "utm_source"]);
  assert.equal(query.get("utm_source")?.length, 100);
});
