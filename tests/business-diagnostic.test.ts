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

// ---------------------------------------------------------------------------
// The follow-up stamp: once, on the first submit, and never over a time a
// person set. Run against a fake leads table that applies the filters sent.
// ---------------------------------------------------------------------------

type StampRow = { id: string; next_follow_up_at: string | null };

function stampDb(rows: StampRow[], options: { fail?: boolean } = {}) {
  const updates: { patch: Record<string, unknown>; filters: [string, string, unknown][] }[] = [];
  return {
    updates,
    from(table: string) {
      assert.equal(table, "leads");
      let patch: Record<string, unknown> = {};
      const filters: [string, string, unknown][] = [];
      const chain = {
        update(values: Record<string, unknown>) {
          patch = values;
          return chain;
        },
        eq(col: string, value: unknown) {
          filters.push(["eq", col, value]);
          return chain;
        },
        is(col: string, value: unknown) {
          filters.push(["is", col, value]);
          return chain;
        },
        select() {
          updates.push({ patch, filters });
          if (options.fail) return Promise.resolve({ data: null, error: { message: "offline", code: "08006" } });
          const hit = rows.filter((r) =>
            filters.every(([op, col, value]) => (op === "eq" ? (r as Record<string, unknown>)[col] === value : ((r as Record<string, unknown>)[col] ?? null) === value)),
          );
          for (const r of hit) Object.assign(r, patch);
          return Promise.resolve({ data: hit.map((r) => ({ id: r.id })), error: null });
        },
      };
      return chain;
    },
  };
}

test("the diagnostic stamps a follow-up time only when none is set, so a call back set on the draft survives the submit", async () => {
  const { diagnosticReviewDueDate, stampDiagnosticFollowUp } = await import("../lib/diagnosticFollowUp.ts");
  const { taskFollowUpAt } = await import("../lib/taskFollowUp.ts");
  const { planCallOutcome } = await import("../lib/callCloser.ts");
  const { SAMPLE_CALL_LEAD, SAMPLE_NOW } = await import("../lib/callCloserFixtures.ts");

  // Ryan called the draft lead Tuesday and logged a call back for Thursday at 3 PM.
  const plan = planCallOutcome({
    lead: { ...SAMPLE_CALL_LEAD, next_follow_up_at: null },
    request: {
      outcome: "call_back",
      idempotencyKey: "0f6d7c1a-2b3e-4f5a-8b9c-1d2e3f4a5b6c",
      note: null,
      offers: [],
      meeting: null,
      callback: { localDate: "2026-09-24", time: "15:00" },
      lostReason: null,
    },
    actorName: "Ryan",
    now: SAMPLE_NOW,
    priorAttempts: 0,
  });
  assert.ok(plan.ok);
  const promised = String(plan.leadPatch.next_follow_up_at);
  assert.equal(promised, "2026-09-24T20:00:00.000Z");

  type Client = Parameters<typeof stampDiagnosticFollowUp>[0];
  const asClient = (fake: ReturnType<typeof stampDb>) => fake as unknown as Client;
  const rows: StampRow[] = [
    { id: "called", next_follow_up_at: promised },
    { id: "brand_new", next_follow_up_at: null },
  ];
  const db = stampDb(rows);
  // Wednesday the lead finishes the questionnaire.
  const submittedAt = "2026-09-23T15:02:00.000Z";
  assert.equal(await stampDiagnosticFollowUp(asClient(db), "called", submittedAt), "kept");
  assert.equal(rows[0].next_follow_up_at, promised, "the Thursday call back is still the follow-up time");
  assert.equal(await stampDiagnosticFollowUp(asClient(db), "brand_new", submittedAt), "stamped");
  // The stamp is the time the review task sets (9:00 AM Central on its due day), so finishing
  // or moving that task clears or moves it. The lead still shows on the sales boards.
  assert.equal(diagnosticReviewDueDate(submittedAt), "2026-09-23");
  assert.equal(rows[1].next_follow_up_at, taskFollowUpAt("2026-09-23"), "a lead with no time set still shows on the sales boards");
  assert.equal(rows[1].next_follow_up_at, "2026-09-23T14:00:00.000Z");
  // The empty check runs in the database, not on a value read earlier.
  for (const u of db.updates) assert.ok(u.filters.some(([op, col, v]) => op === "is" && col === "next_follow_up_at" && v === null));

  assert.equal(await stampDiagnosticFollowUp(asClient(stampDb([], { fail: true })), "x", submittedAt), "failed");
  assert.equal(await stampDiagnosticFollowUp(asClient(db), "brand_new", null), "kept", "no submission time, nothing to stamp");
});

test("the review task is due on the Central day of the submission, the same day the stamp uses", async () => {
  const { diagnosticReviewDueDate } = await import("../lib/diagnosticFollowUp.ts");
  // Tue 7:30 PM CDT is Wednesday in UTC; the task and the stamp stay on Tuesday.
  assert.equal(diagnosticReviewDueDate("2026-09-23T00:30:00.000Z"), "2026-09-22");
  assert.equal(diagnosticReviewDueDate("2026-09-22T19:37:00.000Z"), "2026-09-22");
  assert.equal(diagnosticReviewDueDate(null), null);
  assert.equal(diagnosticReviewDueDate("garbage"), null);
  const { readFileSync } = await import("node:fs");
  const route = readFileSync("app/api/business-diagnostic/route.ts", "utf8");
  const create = route.slice(route.indexOf("async function createFollowUp("), route.indexOf("async function claimAndSendResumeEmail("));
  assert.ok(!create.includes("toISOString().slice(0, 10)"), "no UTC day for the review task");
  assert.match(create, /due_date: dueDate,/);
  assert.match(route, /diagnosticReviewDueDate\(persisted\.row\.submitted_at\)/);
});

test("the diagnostic route never rewrites next_follow_up_at on a re-save; it stamps only on the first submit", async () => {
  const { readFileSync } = await import("node:fs");
  const route = readFileSync("app/api/business-diagnostic/route.ts", "utf8");
  const updateLead = route.slice(route.indexOf("async function updateLead("), route.indexOf("async function persistDiagnostic("));
  assert.ok(updateLead.length > 100, "found updateLead");
  assert.ok(!/update\.next_follow_up_at\s*=/.test(updateLead), "updateLead runs on every save, so it must not set the follow-up time");
  assert.ok(!/next_follow_up_at\s*:/.test(route), "the route writes the follow-up time only through the helper");
  const submitted = route.slice(route.indexOf("if (persisted.newlySubmitted) {"));
  const stampAt = submitted.indexOf("stampDiagnosticFollowUp(");
  assert.ok(stampAt > 0 && stampAt < submitted.indexOf("createFollowUp("), "the stamp runs inside the first-submit block");
});
