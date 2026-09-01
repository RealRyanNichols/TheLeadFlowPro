import {
  LEADFLOW_META,
  type MetaCampaignPreflightInput,
  validateMetaCampaignPreflight,
} from "../lib/metaCampaignGuard";

function args(): Map<string, string> {
  const out = new Map<string, string>();
  for (const raw of process.argv.slice(2)) {
    if (!raw.startsWith("--")) continue;
    const equals = raw.indexOf("=");
    if (equals < 0) out.set(raw.slice(2), "true");
    else out.set(raw.slice(2, equals), raw.slice(equals + 1));
  }
  return out;
}

function required(values: Map<string, string>, key: string): string {
  const value = values.get(key)?.trim();
  if (!value) throw new Error(`Missing required --${key}=... preflight value`);
  return value;
}

function requiredNumber(values: Map<string, string>, key: string): number {
  const raw = required(values, key);
  const value = Number(raw);
  if (!Number.isFinite(value)) throw new Error(`--${key} must be a number; received ${raw}`);
  return value;
}

async function liveIssues(input: MetaCampaignPreflightInput): Promise<string[]> {
  const issues: string[] = [];
  for (const [label, url] of [
    ["destination", input.destinationUrl],
    ["privacy", input.privacyUrl],
  ] as const) {
    try {
      const response = await fetch(url, { redirect: "follow" });
      if (!response.ok) issues.push(`${label} returned HTTP ${response.status}`);
      if (label === "destination") {
        const html = await response.text();
        if (!html.includes(LEADFLOW_META.pixelId)) {
          issues.push(`destination HTML does not contain LeadFlow pixel ${LEADFLOW_META.pixelId}`);
        }
        if (!/Free Website|five-page build is \$0/i.test(html)) {
          issues.push("destination HTML does not contain the approved Free Website offer");
        }
      }
    } catch (error) {
      issues.push(`${label} request failed: ${error instanceof Error ? error.message : "unknown error"}`);
    }
  }
  return issues;
}

async function main() {
  const values = args();
  const input: MetaCampaignPreflightInput = {
    adsManagerUrl: required(values, "ads-manager-url"),
    businessPortfolioId: required(values, "business-id"),
    adAccountId: required(values, "ad-account-id"),
    pageId: required(values, "page-id"),
    pixelId: required(values, "pixel-id"),
    vercelProjectId: required(values, "vercel-project-id"),
    supabaseProjectRef: required(values, "supabase-ref"),
    formId: required(values, "form-id"),
    destinationUrl: required(values, "destination-url"),
    privacyUrl: required(values, "privacy-url"),
    objective: required(values, "objective"),
    conversionLocation: required(values, "conversion-location"),
    lifetimeBudgetCents: requiredNumber(values, "lifetime-budget-cents"),
    durationDays: requiredNumber(values, "duration-days"),
    location: required(values, "location"),
    radiusMiles: requiredNumber(values, "radius-miles"),
  };

  const issues = validateMetaCampaignPreflight(input);
  if (values.get("check-live") === "true") issues.push(...(await liveIssues(input)));

  if (issues.length) {
    console.error("META PREFLIGHT: BLOCKED");
    for (const issue of [...new Set(issues)]) console.error(`- ${issue}`);
    process.exitCode = 1;
    return;
  }

  console.log("META PREFLIGHT: PASS");
  console.log(`Business portfolio: ${LEADFLOW_META.businessPortfolioId}`);
  console.log(`Ad account: ${LEADFLOW_META.adAccountId}`);
  console.log(`Page: ${LEADFLOW_META.pageId}`);
  console.log(`Form: ${LEADFLOW_META.formId} (${LEADFLOW_META.formName})`);
  console.log(`Destination: ${LEADFLOW_META.destinationUrl}`);
  console.log(`Budget: $${(LEADFLOW_META.lifetimeBudgetCents / 100).toFixed(2)} lifetime`);
  console.log(`Schedule: ${LEADFLOW_META.durationDays} days`);
}

await main();
