import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";
import { PRICES } from "../lib/site/prices.ts";
import { getPublicOgPage } from "../lib/publicOgCatalog.ts";
import {
  ACQUISITION_PLANNING_TARGETS,
  MANAGED_COMMERCIAL_TERMS,
  MANAGED_PLANS,
  acquisitionPlanningExplanation,
  managedAdvertisingExplanation,
  managedBillingExplanation,
  managedMonthlySummary,
  managedPlanPrice,
  managedUpfrontSummary,
} from "../lib/site/managedPlans.ts";

test("acquisition targets describe completed outcomes rather than lead prices or promised volumes", () => {
  assert.deepEqual(ACQUISITION_PLANNING_TARGETS, [
    {
      industry: "Farm & agricultural work",
      outcome: "Acquired job",
      amountUsd: 500,
    },
    {
      industry: "Real estate & mortgage",
      outcome: "Completed deal",
      amountUsd: 1250,
    },
  ]);
  const explanation = acquisitionPlanningExplanation();
  assert.match(explanation, /Our planning targets are estimates/);
  assert.match(explanation, /not extra charges or promised outcomes/);
  assert.match(
    explanation,
    /A lead or appointment is not an acquired job or completed deal/,
  );
  assert.match(
    explanation,
    /full package price does not translate into a promised number/,
  );
});

test("managed plans distinguish the first month paid upfront from ongoing monthly prices", () => {
  const plans = new Map(MANAGED_PLANS.map((plan) => [plan.id, plan]));
  const recommended = plans.get("recommended")!;
  const foundation = plans.get("foundation")!;
  const structured = plans.get("structured")!;
  assert.equal(recommended.amountUsd, PRICES.managedStartingUpfront);
  assert.equal(recommended.firstMonthUsd, PRICES.managedStartingUpfront);
  assert.deepEqual(managedPlanPrice(recommended), {
    amount: "$7,500",
    unit: "/ month",
  });
  assert.equal(foundation.amountUsd, PRICES.managedMonthlyMinimum);
  assert.equal(foundation.firstMonthUsd, PRICES.managedStartingUpfront);
  assert.deepEqual(managedPlanPrice(foundation), {
    amount: "$5,000",
    unit: "/ month minimum",
  });
  assert.equal(structured.amountUsd, PRICES.managedStructuredPlan);
  assert.equal(structured.firstMonthUsd, PRICES.managedStructuredPlan);
  assert.deepEqual(managedPlanPrice(structured), {
    amount: "$15,000",
    unit: "/ month",
  });
  assert.equal(MANAGED_PLANS.filter((plan) => plan.badge).length, 1);
  assert.equal(recommended.badge, "Most chosen");
  assert.equal(MANAGED_PLANS[0].id, "recommended");
});

test("the first month bundles onboarding and advertising without a second setup payment", () => {
  assert.equal(MANAGED_COMMERCIAL_TERMS.upfrontTreatment, "first_month");
  assert.equal(MANAGED_COMMERCIAL_TERMS.adSpendTreatment, "included");
  assert.match(
    managedBillingExplanation(),
    /covers the first month.*onboarding.*agreed build.*advertising allocation/,
  );
  assert.doesNotMatch(
    managedBillingExplanation(),
    /covers setup\. Your agreement shows setup and monthly service separately/,
  );
  assert.match(
    managedAdvertisingExplanation(),
    /Advertising spend is included/,
  );
  assert.doesNotMatch(
    managedAdvertisingExplanation(),
    /Advertising spend is separate from the service price/,
  );
  assert.equal(managedUpfrontSummary(), "Expect $7,500 upfront.");
  assert.equal(
    managedMonthlySummary(),
    "Ongoing service starts at $5,000/month.",
  );
  assert.ok(!("checkoutHref" in MANAGED_COMMERCIAL_TERMS));
});

test("the managed pricing page leads with the commitment and routes to scoping without retired checkout links", () => {
  const source = readFileSync("app/pricing/page.tsx", "utf8");
  assert.match(source, /MANAGED_COMMERCIAL_TERMS/);
  assert.match(source, /\{upfront\} upfront\./);
  assert.match(source, /href="\/service-areas"/);
  assert.doesNotMatch(
    source,
    /WEBSITE_LAUNCH|OFFER_LADDER|SYSTEM_MAP|api\/checkout|stripe|packages\/launch|packages\/system-map/,
  );
});

test("the pricing share card makes the upfront expectation and monthly floor visible", () => {
  const preview = getPublicOgPage("/pricing")!;
  assert.match(preview.imagePath, /\/og\/pages\/pricing\/violet-20261003$/);
  assert.equal(preview.title, managedUpfrontSummary());
  assert.ok(
    preview.description.includes("$5,000"),
    "The monthly minimum must be visible in the shared preview",
  );
  assert.doesNotMatch(preview.description, /Website Launch|System Map/);
});
