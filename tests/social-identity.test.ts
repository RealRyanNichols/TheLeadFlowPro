import assert from "node:assert/strict";
import test from "node:test";
import { LEADFLOW_META } from "../lib/metaCampaignGuard.ts";
import {
  LEADFLOW_SOCIAL_PAGE_ID,
  leadFlowSocialPublishIdentityIssues,
  leadFlowSocialRuntimeIdentityIssues,
} from "../lib/social-identity.ts";

const approvedSupabaseUrl =
  `https://${LEADFLOW_META.supabaseProjectRef}.supabase.co`;

test("LeadFlow social runtime accepts only its exact Page and Supabase origin", () => {
  assert.equal(LEADFLOW_SOCIAL_PAGE_ID, "887023637835514");
  assert.deepEqual(
    leadFlowSocialRuntimeIdentityIssues({
      configuredPageId: LEADFLOW_SOCIAL_PAGE_ID,
      supabaseUrl: approvedSupabaseUrl,
    }),
    [],
  );

  const issues = leadFlowSocialRuntimeIdentityIssues({
    configuredPageId: "61586176300453",
    supabaseUrl: "https://premier-example.supabase.co",
  }).join("\n");
  assert.match(issues, /Runtime Facebook Page ID must equal 887023637835514/);
  assert.match(issues, /Runtime Supabase origin/);
});

test("publish approval rejects an existing row assigned to another Page", () => {
  const issues = leadFlowSocialPublishIdentityIssues({
    configuredPageId: LEADFLOW_SOCIAL_PAGE_ID,
    supabaseUrl: approvedSupabaseUrl,
    provider: "facebook",
    postPageId: "123456789",
  }).join("\n");

  assert.match(issues, /Stored social post Page ID must equal 887023637835514/);
});

test("publish approval rejects a stale non-Facebook row", () => {
  const issues = leadFlowSocialPublishIdentityIssues({
    configuredPageId: LEADFLOW_SOCIAL_PAGE_ID,
    supabaseUrl: approvedSupabaseUrl,
    provider: "instagram",
    postPageId: LEADFLOW_SOCIAL_PAGE_ID,
  }).join("\n");

  assert.match(issues, /Social post provider must equal facebook/);
});

test("publish approval accepts the exact LeadFlow Facebook identity", () => {
  assert.deepEqual(
    leadFlowSocialPublishIdentityIssues({
      configuredPageId: LEADFLOW_SOCIAL_PAGE_ID,
      supabaseUrl: approvedSupabaseUrl,
      provider: "facebook",
      postPageId: LEADFLOW_SOCIAL_PAGE_ID,
    }),
    [],
  );
});
