import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

async function source(relativePath: string) {
  return readFile(new URL(relativePath, import.meta.url), "utf8");
}

test("nurture checks the exact LeadFlow Supabase origin before reading the service key", async () => {
  const route = await source("../app/api/cron/nurture/route.ts");
  const identityCheck = route.indexOf("leadFlowSupabaseRuntimeIssues(SUPABASE_URL)");
  const serviceKeyRead = route.indexOf("process.env.SUPABASE_SERVICE_ROLE_KEY");
  const clientCreation = route.indexOf("createSupabaseClient(SUPABASE_URL, serviceKey)");

  assert.ok(identityCheck >= 0);
  assert.ok(serviceKeyRead > identityCheck);
  assert.ok(clientCreation > identityCheck);
  assert.match(route, /\.eq\("marketing_email_consent", true\)/);
  assert.match(route, /\.eq\("interest", "free_website_program"\)/);
  assert.match(route, /filter\(isFreeWebsiteProgramNurtureLead\)/);
});

test("unsubscribe checks the exact LeadFlow Supabase origin before service-role use", async () => {
  const route = await source("../app/api/unsubscribe/route.ts");
  const identityCheck = route.indexOf("leadFlowSupabaseRuntimeIssues(SUPABASE_URL)");
  const serviceKeyRead = route.indexOf("process.env.SUPABASE_SERVICE_ROLE_KEY");
  const clientCreation = route.indexOf("createSupabaseClient(SUPABASE_URL, serviceKey)");

  assert.ok(identityCheck >= 0);
  assert.ok(serviceKeyRead > identityCheck);
  assert.ok(clientCreation > identityCheck);
});

test("Meta v2 records consent only when given and rejects unowned missing-ad leads", async () => {
  const route = await source("../app/api/meta-leads/route.ts");
  assert.match(
    route,
    /consent_at:\s*smsConsent \|\| marketingEmailConsent \? new Date\(\)\.toISOString\(\) : null/,
  );
  assert.match(route, /if \(raw\.form_id === LEADFLOW_META\.formId\)/);
  assert.match(route, /if \(isAllowedLeadFlowAdId\(raw\.ad_id\)\) return true/);
  assert.match(route, /!raw\.ad_id[\s\S]*isAllowedMetaTestLeadId/);
  assert.doesNotMatch(route, /if \(!raw\.ad_id\) return true/);
});

test("the root layout can use the public pixel env but never passes it through unchecked", async () => {
  const layout = await source("../app/layout.tsx");
  assert.match(layout, /resolveLeadFlowMetaPixelId\(/);
  assert.match(layout, /process\.env\.NEXT_PUBLIC_META_PIXEL_ID/);
  assert.match(layout, /metaPixelId=\{metaPixelId\}/);
  assert.doesNotMatch(layout, /metaPixelId=\{settings\.meta_pixel_id\}/);
});
