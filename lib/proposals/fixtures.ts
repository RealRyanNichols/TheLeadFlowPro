// Fictional intakes for the proposal generator: one from the guided
// /start router, one from the agency intake. Invented businesses and
// people; nothing here is a real lead.

import type { ProposalIntake } from "./build";

export const SAMPLE_NOW = new Date("2026-09-14T15:00:00Z");

export function sampleBuildIntake(): ProposalIntake {
  return {
    leadId: "sample-build",
    createdAt: "2026-09-12T16:20:00Z",
    fullName: "Jordan Fixture",
    businessName: "Fixture Roofing Co (fictional)",
    email: "jordan@fixture-roofing.example",
    industry: "local_service",
    websiteUrl: "https://fixture-roofing.example",
    currentPlatform: "wordpress",
    interest: "industry_os",
    goals: "We get calls from the website and from Facebook but half of them never get called back. I want one place to see every lead, a way for customers to check job status, and to stop paying for four different tools.",
    budgetRange: "5k_15k",
    timeline: "60_days",
    desiredModules: ["website_funnels", "crm_pipeline", "customer_portal", "calls_texts"],
    diagnostic: {
      version: 2,
      completed: true,
      answers: { goal: "replace_tools", industry: "local_service", presence: "wordpress", stages: ["disconnected"], selected_modules: ["website_funnels", "crm_pipeline", "customer_portal", "calls_texts"] },
      labels: { goal: "Replace scattered tools with one system", industry: "Local service business", presence: "WordPress site", stages: ["Disconnected tools"] },
      recommendation: {
        package: "industry_os",
        package_name: "Company OS",
        modules: ["website_funnels", "crm_pipeline", "customer_portal", "calls_texts"],
        module_labels: ["Website and funnels", "CRM and pipeline", "Customer or member portal", "Calls and text messages"],
      },
    },
  };
}

export function sampleAgencyIntake(): ProposalIntake {
  return {
    leadId: "sample-agency",
    createdAt: "2026-09-13T14:05:00Z",
    fullName: "Casey Fixture",
    businessName: "Fixture Dental Studio (fictional)",
    email: "casey@fixture-dental.example",
    industry: "health_dental",
    websiteUrl: null,
    currentPlatform: null,
    interest: "done_for_you",
    goals: "We want new patient inquiries from Facebook and Google and we want to know which ad each one came from.",
    budgetRange: null,
    timeline: null,
    desiredModules: null,
    diagnostic: { source: "agency_intake", services: ["meta-ads", "google-ads"], ad_budget: "ads_1500_5000" },
  };
}
