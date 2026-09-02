import assert from "node:assert/strict";
import test from "node:test";
import {
  FOREIGN_CLIENT_ASSETS,
  isAllowedLeadFlowAdId,
  isRegisteredMetaForm,
  LEADFLOW_META,
  metaRuntimeIdentityIssues,
  parseRegisteredFormIds,
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
    destinationUrl: LEADFLOW_META.destinationUrl,
    privacyUrl: LEADFLOW_META.privacyUrl,
    objective: LEADFLOW_META.objective,
    conversionLocation: LEADFLOW_META.conversionLocation,
    lifetimeBudgetCents: LEADFLOW_META.lifetimeBudgetCents,
    durationDays: LEADFLOW_META.durationDays,
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
