// Every LeadFlow Pro price number lives here and only here.
//
// This is a leaf module on purpose: no imports, safe in client components,
// middleware, scripts, and tests. The checkout modules (lib/offers.ts,
// lib/freeBuild.ts, lib/leadFollowUp.ts, lib/hq/types.ts, lib/toolStudio.ts)
// read their numbers from here, and the public pages read the formatted
// labels from lib/site/offers.ts. `npm run validate:facts` fails the build
// when one of these amounts is typed out by hand anywhere under app/ or
// components/, so changing a price means changing it in exactly one place.
//
// A price that Ryan has not approved is `null` in lib/site/offers.ts, never
// a guessed number here.

export const PRICES = {
  /** Ryan-approved September 2026 introductory package, one time. */
  septemberSpecialTotal: 1497,
  septemberSpecialAds: 500,
  septemberSpecialEstimateLow: 5000,
  septemberSpecialEstimateHigh: 7500,

  /** Website Launch: buy the five-page foundation outright. */
  websiteLaunchTotal: 1000,
  websiteLaunchDeposit: 500,
  websiteLaunchFinal: 500,

  /** System Map: paid diagnosis, credited toward an approved larger build. */
  systemMap: 497,

  /** Free Website Program: the build fee is genuinely zero for approved businesses. */
  freeBuildFee: 0,
  freeBuildFollowUpPack: 197,
  freeBuildContentEngine: 497,
  freeBuildGrowthEngine: 997,

  /** Managed hosting after the included window on a free build. */
  hostingIncludedDays: 90,
  hostingManagedMonthly: 49,
  hostingWithEditsMonthly: 99,

  /** Lead Follow-Up Campaign (/go/lead-follow-up), one time. */
  leadFollowUpCampaign: 197,

  /** Larger systems, "from" prices. Written scope sets the exact number. */
  leadEngineFrom: 3500,
  trainingPlatformFrom: 5000,
  companyOsFrom: 7500,
  customPlatformFrom: 15000,

  /** The LeadFlow Pro Plugin for ChatGPT and Claude. */
  pluginMonthly: 49,
  pluginTrialDays: 14,

  /**
   * Pro Kits: the published range. Each kit's own price sits on the kit and
   * must be one of these three (PRO_PRICES in lib/tools/pro/types.ts).
   */
  proKitMin: 10,
  proKitMid: 19,
  proKitMax: 29,

  /** Every Pro Kit on one key (PRO_BUNDLE in lib/tools/pro/index.ts), one time. */
  proBundle: 39,

  /** SellerProof: one chargeback evidence packet export. */
  sellerProofPacket: 49,

  /**
   * SellerProof Membership: unlimited packets in the SellerProof app
   * (sellerproof.theleadflowpro.com), monthly or one payment for life.
   * Ryan-approved 2026-09-22. lib/sellerproof/membership.ts links to it.
   */
  sellerProofMemberMonthly: 20,
  sellerProofMemberLifetime: 97,

  /**
   * Chase Sheet (/chase-sheet): the open-quote follow-up engine. Monthly, or
   * one payment for life. lib/chaseSheet/product.ts is what checkout charges.
   */
  chaseSheetMonthly: 20,
  chaseSheetLifetime: 97,

  /**
   * Time Back (/go/time-back) entry price: 3 posts a day for 7 days, one time.
   * lib/timeback.ts PRICE_GRID[3][7] is what /api/checkout charges; this is
   * the "from" number the page prints.
   */
  timeBackFrom: 297,

  /** Operator Academy 01: The ChatGPT Operator, founding price (lib/chatgptOperatorCourse.ts foundingPriceCents). */
  chatgptOperatorFounding: 297,

  /**
   * Workshop seat. The database `events.price_usd` is the authority for a
   * published event; this is the marketing fallback and the seed value.
   */
  workshopSeat: 97,

  /** Tool Studio (/go/tools) builds, one time (TOOL_BUILDS in lib/toolStudio.ts). */
  toolStudioBlueprint: 97,
  toolStudioProduction: 497,
  toolStudioFunnel: 997,

  /** Tool Studio monthly menu (MONTHLY_MENU in lib/toolStudio.ts), per month. */
  toolCareMonthly: 97,
  followUpTuneUpMonthly: 197,
  contentRefreshMonthly: 197,
  seoArchiveBatchMonthly: 297,
  funnelTestMonthly: 297,
} as const;

export type PriceKey = keyof typeof PRICES;

/** "$1,000" */
export function usd(amount: number): string {
  return `$${amount.toLocaleString("en-US")}`;
}

/** "$7,500+" */
export function usdFrom(amount: number): string {
  return `${usd(amount)}+`;
}

/** "$49/mo" */
export function usdPerMonth(amount: number): string {
  return `${usd(amount)}/mo`;
}

/** "$10 to $29" */
export function usdRange(low: number, high: number): string {
  return `${usd(low)} to ${usd(high)}`;
}

/**
 * The dollar strings the build gate looks for outside this module. Derived
 * from PRICES so a new price is guarded the moment it is added.
 */
export function guardedPriceStrings(): string[] {
  const amounts = new Set<number>();
  for (const [key, value] of Object.entries(PRICES)) {
    // Day counts and the zero build fee are not dollar amounts worth guarding.
    if (key.endsWith("Days")) continue;
    if (value >= 10) amounts.add(value);
  }
  return [...amounts].sort((a, b) => a - b).map((n) => usd(n));
}
