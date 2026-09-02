import assert from "node:assert/strict";
import test from "node:test";
import {
  FOREIGN_CLIENT_ASSETS,
  isAllowedLeadFlowAdId,
  isAllowedMetaTestLeadId,
  isRegisteredMetaForm,
  LEADFLOW_META,
  metaRuntimeIdentityIssues,
  parseRegisteredFormIds,
  resolveLeadFlowMetaPixelId,
  type MetaCampaignPreflightInput,
  validateMetaCampaignPreflight,
} from "../lib/metaCampaignGuard";

function validInput(): MetaCampaignPreflightInput {
  return {
    adsManagerUrl:
      `https://adsmanager.facebook.com/adsmanager/manage/campaigns?act=${LEADFLOW_META.adAccountId}` +
      `&business_id=${LEADFLOW_META.businessPortfolioId}`,
    businessPortfolioId: LEADFLOW_META.businessPortfolioId,
    adAccountId: LEADFLOW_META.adAccountId,
    pageId: LEADFLOW_META.pageId,
    pixelId: LEADFLOW_META.pixelId,
    vercelProjectId: LEADFLOW_META.vercelProjectId,
    supabaseProjectRef: LEADFLOW_META.supabaseProjectRef,
    formId: LEADFLOW_META.formId,
    campaignId: LEADFLOW_META.campaignId,
    adSetId: LEADFLOW_META.adSetId,
    crmDatasetId: LEADFLOW_META.crmDatasetId,
    destinationUrl: LEADFLOW_META.destinationUrl,
    privacyUrl: LEADFLOW_META.privacyUrl,
    objective: LEADFLOW_META.objective,
    conversionLocation: LEADFLOW_META.conversionLocation,
    performanceGoal: LEADFLOW_META.performanceGoal,
    budgetType: LEADFLOW_META.budgetType,
    dailyBudgetCents: LEADFLOW_META.dailyBudgetCents,
    hasEndDate: LEADFLOW_META.hasEndDate,
    location: LEADFLOW_META.location,
    radiusMiles: LEADFLOW_META.radiusMiles,
  };
}

test("the exact LeadFlow campaign identity passes", () => {
  assert.deepEqual(validateMetaCampaignPreflight(validInput()), []);
  assert.equal(isRegisteredMetaForm(LEADFLOW_META.formId), true);
  assert.equal(isAllowedLeadFlowAdId(LEADFLOW_META.allowedAdIds[0]), true);
  assert.equal(isAllowedLeadFlowAdId("999999"), false);
});

test("the launch is pinned to the verified draft, qualified-lead dataset, and ongoing daily budget", () => {
  assert.equal(LEADFLOW_META.campaignId, "120253551492770154");
  assert.equal(LEADFLOW_META.adSetId, "120253551492780154");
  assert.equal(LEADFLOW_META.crmDatasetId, "2550895935381476");
  assert.equal(LEADFLOW_META.performanceGoal, "MAXIMIZE_QUALIFIED_LEADS");
  assert.equal(LEADFLOW_META.budgetType, "DAILY");
  assert.equal(LEADFLOW_META.dailyBudgetCents, 2_500);
  assert.equal(LEADFLOW_META.hasEndDate, false);

  const wrong = validInput();
  wrong.campaignId = "120253128015450154";
  wrong.adSetId = "999";
  wrong.crmDatasetId = LEADFLOW_META.pixelId;
  wrong.dailyBudgetCents = 12_500;
  wrong.hasEndDate = true;
  const issues = validateMetaCampaignPreflight(wrong).join("\n");
  assert.match(issues, /Campaign ID must equal 120253551492770154/);
  assert.match(issues, /Ad set ID must equal 120253551492780154/);
  assert.match(issues, /CRM dataset ID must equal 2550895935381476/);
  assert.match(issues, /Daily budget must equal 2500 cents/);
  assert.match(issues, /ongoing with no end date/);
});

test("suffix-only account matching is rejected", () => {
  const input = validInput();
  input.adAccountId = "8602";
  input.adsManagerUrl = `https://adsmanager.facebook.com/adsmanager/manage/campaigns?act=8602&business_id=${LEADFLOW_META.businessPortfolioId}`;

  const issues = validateMetaCampaignPreflight(input).join("\n");
  assert.match(issues, /Ad account ID must equal 1637329904238602/);
  assert.match(issues, /Ads Manager act must equal 1637329904238602/);
});

test("wrong and Premier Dental accounts are explicit LeadFlow rejects", () => {
  for (const accountId of [
    FOREIGN_CLIENT_ASSETS.wrongPersonalAdAccountId,
    FOREIGN_CLIENT_ASSETS.premierDentalAdAccountId,
  ]) {
    const input = validInput();
    input.adAccountId = accountId;
    input.adsManagerUrl =
      `https://adsmanager.facebook.com/adsmanager/manage/campaigns?act=${accountId}` +
      `&business_id=${LEADFLOW_META.businessPortfolioId}`;
    assert.match(
      validateMetaCampaignPreflight(input).join("\n"),
      /Foreign client asset is forbidden/,
    );
  }
});

test("the registry rejects unknown forms while retaining the exact v2 form", () => {
  assert.deepEqual(parseRegisteredFormIds(`${LEADFLOW_META.formId},999999`), {
    ids: [LEADFLOW_META.formId],
    unknown: ["999999"],
  });
});

test("missing-ad test leads require an exact one-lead allowlist", () => {
  assert.equal(isAllowedMetaTestLeadId("lead-2", "lead-1, lead-2"), true);
  assert.equal(isAllowedMetaTestLeadId("lead-2", "lead-20"), false);
  assert.equal(isAllowedMetaTestLeadId("lead-2", ""), false);
});

test("public tracking resolves only to the exact LeadFlow pixel", () => {
  assert.equal(resolveLeadFlowMetaPixelId(LEADFLOW_META.pixelId, undefined), LEADFLOW_META.pixelId);
  assert.equal(resolveLeadFlowMetaPixelId("foreign-pixel", LEADFLOW_META.pixelId), LEADFLOW_META.pixelId);
  assert.equal(resolveLeadFlowMetaPixelId("foreign-pixel", "another-pixel"), "");
  assert.equal(resolveLeadFlowMetaPixelId("", undefined), "");
});

test("runtime identity requires the exact LeadFlow Supabase origin", () => {
  assert.deepEqual(
    metaRuntimeIdentityIssues({
      pageId: LEADFLOW_META.pageId,
      supabaseUrl: `https://${LEADFLOW_META.supabaseProjectRef}.supabase.co`,
    }),
    [],
  );
  assert.match(
    metaRuntimeIdentityIssues({
      pageId: LEADFLOW_META.pageId,
      supabaseUrl: "https://premier-example.supabase.co",
    }).join("\n"),
    /Runtime Supabase origin/,
  );
  assert.match(
    metaRuntimeIdentityIssues({
      pageId: LEADFLOW_META.pageId,
      supabaseUrl: `https://${LEADFLOW_META.supabaseProjectRef}.attacker.example`,
    }).join("\n"),
    /Runtime Supabase origin/,
  );
  assert.match(
    metaRuntimeIdentityIssues({
      pageId: LEADFLOW_META.pageId,
      supabaseUrl: `https://${LEADFLOW_META.supabaseProjectRef}.supabase.co/foreign-path`,
    }).join("\n"),
    /bare approved project origin/,
  );
});
