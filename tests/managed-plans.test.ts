import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";
import { PRICES } from "../lib/site/prices.ts";
import { liveOffers } from "../lib/site/offers.ts";
import { getPublicOgPage } from "../lib/publicOgCatalog.ts";
import {
  ACQUISITION_PLANNING_TARGETS,
  MANAGED_COMMERCIAL_TERMS,
  MANAGED_PLANS,
  acquisitionPlanningExplanation,
  managedAdditionalScopeExplanation,
  managedAdvertisingExplanation,
  managedBillingExplanation,
  managedCampaignSummary,
  managedCompletionExplanation,
  managedPlanPrice,
  managedRenewalExplanation,
} from "../lib/site/managedPlans.ts";

test("public discovery has one prepaid initial campaign and does not describe a monthly subscription", () => {
  assert.equal(MANAGED_PLANS.length, 1);
  assert.equal(MANAGED_PLANS[0].id, "recommended");
  assert.equal(
    MANAGED_PLANS[0].initialCampaignUsd,
    PRICES.managedStartingUpfront,
  );
  assert.deepEqual(managedPlanPrice(MANAGED_PLANS[0]), {
    amount: "$7,500",
    unit: "minimum upfront · up to 90 days",
  });
  const offers = liveOffers().filter((offer) =>
    offer.id.startsWith("managed_"),
  );
  assert.equal(offers.length, 1);
  assert.equal(offers[0].priceUsd, 7500);
  assert.equal(offers[0].billingPeriod, undefined);
  assert.doesNotMatch(offers[0].priceLabel, /month/);
  assert.equal(MANAGED_COMMERCIAL_TERMS.automaticRenewal, false);
});

test("owner rates distinguish acquired jobs from unclosed leads and published industry averages", () => {
  assert.equal(ACQUISITION_PLANNING_TARGETS[0].amountUsd, 500);
  assert.equal(ACQUISITION_PLANNING_TARGETS[1].amountUsd, 1500);
  assert.equal(MANAGED_COMMERCIAL_TERMS.farmJobTarget, 15);
  assert.equal(MANAGED_COMMERCIAL_TERMS.propertyDealPlanningTarget, 5);
  assert.match(
    acquisitionPlanningExplanation(),
    /signed or paid acquired jobs/,
  );
  assert.match(
    acquisitionPlanningExplanation(),
    /not measured industry averages or guaranteed results/,
  );
  assert.match(
    acquisitionPlanningExplanation(),
    /Leads and appointments do not count/,
  );
  assert.match(
    managedAdditionalScopeExplanation(),
    /\$500.*additional acquisition.*\$1,500.*real estate/,
  );
  assert.match(
    managedAdditionalScopeExplanation(),
    /in writing before you pay/,
  );
});

test("campaign completion preserves inquiries and makes day 90 a review without an automatic extension", () => {
  assert.equal(MANAGED_COMMERCIAL_TERMS.initialCampaignDays, 90);
  const completion = managedCompletionExplanation();
  assert.match(
    completion,
    /target is reached or day 90, whichever comes first/,
  );
  assert.match(
    completion,
    /signed or paid confirmation and agreed attribution/,
  );
  assert.match(completion, /day 45, new acquisition is complete/);
  assert.match(
    completion,
    /Every inquiry already captured is still handed over/,
  );
  assert.match(completion, /review results; there is no automatic extension/);
  assert.match(managedRenewalExplanation(), /scales up/);
  assert.match(
    managedRenewalExplanation(),
    /new written agreement and approval/,
  );
});

test("prepaid scope includes advertising and build work without authorizing an automatic outcome charge", () => {
  assert.equal(MANAGED_COMMERCIAL_TERMS.upfrontTreatment, "initial_campaign");
  assert.equal(MANAGED_COMMERCIAL_TERMS.adSpendTreatment, "included");
  assert.match(
    managedBillingExplanation(),
    /initial campaign.*onboarding.*agreed build.*advertising allocation/,
  );
  assert.match(managedAdvertisingExplanation(), /agreed and paid upfront/);
  assert.match(managedAdvertisingExplanation(), /not an automatic charge/);
  assert.ok(!("checkoutHref" in MANAGED_COMMERCIAL_TERMS));
});

test("pricing routes the single campaign to scoping and keeps old checkout offers out", () => {
  const source = readFileSync("app/pricing/page.tsx", "utf8");
  assert.match(source, /MANAGED_PLANS\[0\]\.id/);
  assert.match(source, /href="\/service-areas"/);
  assert.doesNotMatch(
    source,
    /WEBSITE_LAUNCH|OFFER_LADDER|SYSTEM_MAP|api\/checkout|stripe|firstMonthUsd|minimumMonthlyUsd|pricing_custom/,
  );
  const preview = getPublicOgPage("/pricing")!;
  assert.match(preview.imagePath, /\/og\/pages\/pricing\/campaign90-20261003$/);
  assert.ok(preview.description.includes(managedCampaignSummary()));
  assert.doesNotMatch(
    preview.description,
    /\$5,000|\$15,000|month|Website Launch|System Map/,
  );
});
