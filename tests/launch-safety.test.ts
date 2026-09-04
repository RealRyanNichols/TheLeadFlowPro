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

test("Meta leads: consent only when given, registered forms only, and a missing ad id never drops a lead", async () => {
  const route = await source("../app/api/meta-leads/route.ts");
  assert.match(
    route,
    /consent_at:\s*smsConsent \|\| marketingEmailConsent \? new Date\(\)\.toISOString\(\) : null/,
  );
  // Ownership is the form registry plus the Page check, not the ad id.
  assert.match(route, /if \(!isRegisteredMetaForm\(raw\.form_id\)\)[\s\S]*return false/);
  // The Page token cannot see ad_id, so a missing one is accepted and marked.
  assert.match(route, /if \(!raw\.ad_id\) \{[\s\S]*attribution unverified[\s\S]*return true;/);
  assert.match(route, /ad_attribution: raw\.ad_id \? "ad_id_present" : "unverified_no_ad_id"/);
  // An ad id that belongs to a foreign account is still refused.
  assert.match(route, /ad belongs to a foreign account/);
  // Known leads are skipped before any ownership check or Graph call.
  const dedupe = route.indexOf('.eq("external_id", external_id)');
  const guard = route.indexOf("await paidLeadBelongsToLeadFlow(raw, token)");
  assert.ok(dedupe > 0 && guard > dedupe, "dedupe must run before the ownership guard");
});

test("the root layout can use the public pixel env but never passes it through unchecked", async () => {
  const layout = await source("../app/layout.tsx");
  assert.match(layout, /resolveLeadFlowMetaPixelId\(/);
  assert.match(layout, /process\.env\.NEXT_PUBLIC_META_PIXEL_ID/);
  assert.match(layout, /metaPixelId=\{metaPixelId\}/);
  assert.doesNotMatch(layout, /metaPixelId=\{settings\.meta_pixel_id\}/);
});
