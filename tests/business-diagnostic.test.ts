import assert from "node:assert/strict";
import test from "node:test";
import {
  cleanDiagnosticAnswers,
  deriveDiagnosticTags,
  diagnosticPriority,
  diagnosticReadinessLabel,
  missingRequiredFields,
  scoreDiagnosticCompleteness,
  scoreDiagnosticOpportunity,
} from "../lib/businessDiagnostic";

test("diagnostic cleaning keeps only versioned fields and allowed option values", () => {
  const clean = cleanDiagnosticAnswers({
    email: "  owner@example.com  ",
    full_name: "  Jane Owner  ",
    help_categories: ["website_repair", "not-a-real-option", "website_repair"],
    goal_types: ["more_revenue", "more_leads", "time_freedom", "more_visibility"],
    seven_day_email_consent: true,
    sms_consent: "true",
    injected_admin_field: "owner",
  });

  assert.equal(clean.email, "owner@example.com");
  assert.equal(clean.full_name, "Jane Owner");
  assert.deepEqual(clean.help_categories, ["website_repair"]);
  assert.deepEqual(clean.goal_types, ["more_revenue", "more_leads", "time_freedom"]);
  assert.equal(clean.seven_day_email_consent, true);
  assert.equal(clean.sms_consent, undefined);
  assert.equal(clean.injected_admin_field, undefined);
});

test("conditional Shopify fields appear only for a Shopify diagnostic", () => {
  const noSiteMissing = new Set(
    missingRequiredFields({ website_state: "no_site" }).map((field) => field.id),
  );
  assert.equal(noSiteMissing.has("full_name"), true);
  assert.equal(noSiteMissing.has("shopify_store_status"), false);

  const shopifyMissing = new Set(
    missingRequiredFields({
      website_state: "partly_broken",
      website_platform: "shopify",
    }).map((field) => field.id),
  );
  assert.equal(shopifyMissing.has("full_name"), true);
  // Shopify repair questions are intentionally optional detail. The form can
  // still be submitted after the core brief is complete.
  assert.equal(shopifyMissing.has("shopify_store_status"), false);
});

test("readiness measures detail without requiring private revenue data", () => {
  const detailed = cleanDiagnosticAnswers({
    full_name: "Jane Owner",
    email: "owner@example.com",
    business_name: "Example Co",
    job_title: "Owner",
    preferred_contact_method: "email",
    decision_role: "decision_maker",
    industry: "local_service",
    business_model: ["local_service"],
    city_state: "Longview, Texas",
    help_categories: ["website_repair", "follow_up"],
    situation_summary: "The site is locked and inquiries are being missed.",
    primary_problem: "The website cannot be updated.",
    desired_outcome: "Restore control and capture every inquiry.",
    goal_types: ["more_leads", "time_freedom"],
    success_definition: "The site works and every lead enters one follow-up process.",
    timeframe: "7_days",
    main_offer: "Residential repair services",
    ideal_customer: "Homeowners in East Texas",
    customer_geography: "East Texas",
    revenue_model: ["project"],
    capacity_status: "yes",
    website_state: "locked",
    website_platform: "shopify",
    website_issue_detail: "A former developer changed the theme and locked the homepage.",
    facebook_page_status: "not_created",
    youtube_status: "not_created",
    best_marketing_sources: ["referrals"],
    lead_channels: ["calls", "forms"],
    lead_response_time: "next_day",
    crm_status: "inboxes",
    follow_up_process: "Handled manually when someone notices the message.",
    biggest_lead_leak: "No single inbox or owner.",
    domain_control: "full",
    admin_access_status: "partial",
    access_readiness: "yes",
    requested_services: ["website_repair", "follow_up_automation"],
    must_have_scope: "Restore the homepage and connect lead capture.",
    ready_to_start: "now",
    initial_investment_range: "need_recommendation",
    approval_process: "Owner approval",
  });

  const completeness = scoreDiagnosticCompleteness(detailed);
  assert.ok(completeness >= 80);
  assert.equal(diagnosticReadinessLabel(completeness), "Proposal-ready detail");
  assert.equal(detailed.monthly_revenue_range, undefined);
});

test("routing recognizes urgent access, visibility, and follow-up leaks", () => {
  const answers = cleanDiagnosticAnswers({
    help_categories: ["shopify_ecommerce", "follow_up"],
    situation_summary: "The checkout is down and the homepage is locked.",
    primary_problem: "Customers cannot pay.",
    desired_outcome: "Restore sales and follow-up.",
    success_definition: "Checkout restored.",
    timeframe: "emergency",
    decision_role: "decision_maker",
    website_state: "locked",
    website_platform: "shopify",
    admin_access_status: "none",
    shopify_store_status: "unavailable",
    checkout_status: "no",
    previous_provider_context: "A former employee controlled the code.",
    facebook_page_status: "not_created",
    youtube_status: "not_created",
    crm_status: "inboxes",
    lead_response_time: "next_day",
    access_readiness: "partly",
    initial_investment_range: "need_recommendation",
    seven_day_email_consent: true,
  });

  const opportunity = scoreDiagnosticOpportunity(answers);
  assert.equal(diagnosticPriority(opportunity, answers), "hot");
  assert.deepEqual(
    new Set(deriveDiagnosticTags(answers, "facebook_messenger")),
    new Set([
      "source:facebook_messenger",
      "form:growth-diagnostic-v1",
      "service:shopify_ecommerce",
      "service:follow_up",
      "platform:shopify",
      "issue:website-locked",
      "issue:no-admin-access",
      "issue:former-provider",
      "presence:facebook-missing",
      "presence:youtube-missing",
      "leak:no-connected-crm",
      "leak:slow-response",
      "urgency:emergency",
      "authority:decision_maker",
      "sequence:diagnostic-7d",
    ]),
  );
});
