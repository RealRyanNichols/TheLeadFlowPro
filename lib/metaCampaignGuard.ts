export type MetaConsentKind = "sms" | "marketing";

/**
 * The LeadFlow Pro's exact production identity.
 *
 * Never match these values by suffix. Every operator preflight and every
 * server-side lead import must match the complete identifier so a similarly
 * named client asset cannot be selected by accident.
 */
export const LEADFLOW_META = {
  businessPortfolioId: "1154478850201530",
  adAccountId: "1637329904238602",
  pageId: "887023637835514",
  pixelId: "1012793881211964",
  vercelProjectId: "prj_u4h1Q6eAGJOf5QxBlsc2jQPFFOYY",
  supabaseProjectRef: "hpzpwfymwfgwspaixrxi",
  siteOrigin: "https://www.theleadflowpro.com",
  privacyUrl: "https://www.theleadflowpro.com/privacy",
  formName: "LFP | Free Website | Product + Budget | v2",
  formId: "2292508494936036",
  campaignKey: "free_website_longview_2026_09",
  destinationUrl:
    "https://www.theleadflowpro.com/free-build?utm_source=facebook&utm_medium=paid&utm_campaign=free_website_longview_2026_09&utm_content=instant_form_thank_you",
  objective: "LEADS",
  conversionLocation: "INSTANT_FORM",
  lifetimeBudgetCents: 12_500,
  durationDays: 5,
  location: "Longview, Texas",
  radiusMiles: 30,
  // Exact published LeadFlow ad IDs that may generate paid leads. Add every
  // new ad here after Meta creates it while the campaign is still paused, then
  // deploy this registry before delivery is enabled. The Graph account lookup
  // remains a secondary check for future ads when the system token has access.
  allowedAdIds: [
    "120253128015470154", // Existing LeadFlow mall-video ad.
    "120253551492760154", // Sep 1 Free Website v2 draft; keep off until creative QA.
  ],
} as const;

/** Assets that must never be accepted by a LeadFlow campaign preflight. */
export const FOREIGN_CLIENT_ASSETS = {
  wrongPersonalAdAccountId: "1439074857790304",
  premierDentalAdAccountId: "924465906541446",
  premierDentalVercelProjectId: "prj_Kylv6rMcDKid5w2mmLaaSaZmCsOT",
} as const;

export type MetaFormRegistration = {
  campaign: string;
  consentLayout?: ReadonlyArray<MetaConsentKind>;
};

/**
 * One registry for attribution, consent parsing, webhook admission, and poll
 * admission. Adding a form in one place prevents the old failure mode where a
 * form was live in Meta but absent from one of several independent maps.
 */
export const META_FORM_REGISTRY: Readonly<Record<string, MetaFormRegistration>> = {
  "1674448410325108": { campaign: "mall-video-leadform" },
  "2311682272983064": { campaign: "mall-video-leadform" },
  "2235052820606054": {
    campaign: "time_back",
    consentLayout: ["sms", "marketing"],
  },
  "1794058118689457": {
    campaign: "fix_first",
    consentLayout: ["marketing"],
  },
  "2043120369669082": {
    campaign: "free_build_volume",
    consentLayout: ["marketing"],
  },
  "2016689789051460": {
    campaign: LEADFLOW_META.campaignKey,
    consentLayout: ["marketing"],
  },
  [LEADFLOW_META.formId]: {
    campaign: LEADFLOW_META.campaignKey,
    consentLayout: ["marketing"],
  },
};

export function registeredMetaForm(formId: string | null | undefined) {
  return formId ? META_FORM_REGISTRY[formId] : undefined;
}

export function isRegisteredMetaForm(formId: string | null | undefined): boolean {
  return !!registeredMetaForm(formId);
}

export function isAllowedLeadFlowAdId(adId: string | null | undefined): boolean {
  return !!adId && (LEADFLOW_META.allowedAdIds as readonly string[]).includes(adId);
}

export function parseRegisteredFormIds(value: string | null | undefined): {
  ids: string[];
  unknown: string[];
} {
  const requested = String(value ?? "")
    .split(",")
    .map((item) => item.trim())
    .filter(Boolean);
  const unique = [...new Set(requested)];
  return {
    ids: unique.filter((id) => isRegisteredMetaForm(id)),
    unknown: unique.filter((id) => !isRegisteredMetaForm(id)),
  };
}

export type MetaCampaignPreflightInput = {
  adsManagerUrl: string;
  businessPortfolioId: string;
  adAccountId: string;
  pageId: string;
  pixelId: string;
  vercelProjectId: string;
  supabaseProjectRef: string;
  formId: string;
  destinationUrl: string;
  privacyUrl: string;
  objective: string;
  conversionLocation: string;
  lifetimeBudgetCents: number;
  durationDays: number;
  location: string;
  radiusMiles: number;
};

function exact(label: string, actual: string, expected: string, issues: string[]) {
  if (actual !== expected) {
    issues.push(`${label} must equal ${expected}; received ${actual || "<missing>"}`);
  }
}

export function validateMetaCampaignPreflight(input: MetaCampaignPreflightInput): string[] {
  const issues: string[] = [];
  let managerUrl: URL | null = null;
  try {
    managerUrl = new URL(input.adsManagerUrl);
  } catch {
    issues.push("Ads Manager URL is not a valid absolute URL");
  }

  if (managerUrl) {
    if (managerUrl.hostname !== "adsmanager.facebook.com") {
      issues.push(`Ads Manager URL host must be adsmanager.facebook.com; received ${managerUrl.hostname}`);
    }
    exact("Ads Manager act", managerUrl.searchParams.get("act") ?? "", LEADFLOW_META.adAccountId, issues);
    exact(
      "Ads Manager business_id",
      managerUrl.searchParams.get("business_id") ?? "",
      LEADFLOW_META.businessPortfolioId,
      issues,
    );
  }

  exact("Business portfolio ID", input.businessPortfolioId, LEADFLOW_META.businessPortfolioId, issues);
  exact("Ad account ID", input.adAccountId, LEADFLOW_META.adAccountId, issues);
  exact("Page ID", input.pageId, LEADFLOW_META.pageId, issues);
  exact("Pixel ID", input.pixelId, LEADFLOW_META.pixelId, issues);
  exact("Vercel project ID", input.vercelProjectId, LEADFLOW_META.vercelProjectId, issues);
  exact("Supabase project ref", input.supabaseProjectRef, LEADFLOW_META.supabaseProjectRef, issues);
  exact("Instant Form ID", input.formId, LEADFLOW_META.formId, issues);
  exact("Destination URL", input.destinationUrl, LEADFLOW_META.destinationUrl, issues);
  exact("Privacy URL", input.privacyUrl, LEADFLOW_META.privacyUrl, issues);
  exact("Objective", input.objective.toUpperCase(), LEADFLOW_META.objective, issues);
  exact(
    "Conversion location",
    input.conversionLocation.toUpperCase().replace(/\s+/g, "_"),
    LEADFLOW_META.conversionLocation,
    issues,
  );
  exact("Location", input.location, LEADFLOW_META.location, issues);

  if (input.lifetimeBudgetCents !== LEADFLOW_META.lifetimeBudgetCents) {
    issues.push(
      `Lifetime budget must equal ${LEADFLOW_META.lifetimeBudgetCents} cents; received ${input.lifetimeBudgetCents}`,
    );
  }
  if (input.durationDays !== LEADFLOW_META.durationDays) {
    issues.push(`Duration must equal ${LEADFLOW_META.durationDays} days; received ${input.durationDays}`);
  }
  if (input.radiusMiles !== LEADFLOW_META.radiusMiles) {
    issues.push(`Radius must equal ${LEADFLOW_META.radiusMiles} miles; received ${input.radiusMiles}`);
  }

  const serialized = JSON.stringify(input);
  for (const foreignId of Object.values(FOREIGN_CLIENT_ASSETS)) {
    if (serialized.includes(foreignId)) {
      issues.push(`Foreign client asset is forbidden in LeadFlow preflight: ${foreignId}`);
    }
  }

  return [...new Set(issues)];
}

export function metaRuntimeIdentityIssues(input: {
  pageId: string;
  supabaseUrl: string;
}): string[] {
  const issues: string[] = [];
  exact("Runtime Page ID", input.pageId, LEADFLOW_META.pageId, issues);
  issues.push(...leadFlowSupabaseRuntimeIssues(input.supabaseUrl));
  return issues;
}

/** Fail closed before any LeadFlow-only job reads or writes a CRM database. */
export function leadFlowSupabaseRuntimeIssues(supabaseUrl: string): string[] {
  const issues: string[] = [];
  try {
    const url = new URL(supabaseUrl);
    const expectedOrigin = `https://${LEADFLOW_META.supabaseProjectRef}.supabase.co`;
    exact("Runtime Supabase origin", url.origin, expectedOrigin, issues);
    if (url.username || url.password || url.pathname !== "/" || url.search || url.hash) {
      issues.push("Runtime Supabase URL must be the bare approved project origin");
    }
  } catch {
    issues.push("Runtime Supabase URL is invalid");
  }
  return issues;
}
