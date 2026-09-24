// The offer registry: every product, package, program, and service the site
// sells, with its price label, status, URL, and where the number is owned.
//
// Numbers come from lib/site/prices.ts (the only place a price is typed).
// Pages read labels from here. Checkout code keeps reading its own module
// (lib/offers.ts, lib/freeBuild.ts, lib/leadFollowUp.ts, lib/hq/types.ts),
// and those modules read the same PRICES, so the browser can never render a
// price the server would not charge.
//
// `status`:
//   live      -> published, purchasable or applicable today
//   tbd_ryan  -> the page exists, the price does not. Renders a neutral
//                "pricing confirmed on the call" line, never a guessed number.
//   retired   -> kept for history; never rendered as a current offer.

import { EXTERNAL_LINKS } from "./external-links";
import { PRICES, usd, usdFrom, usdPerMonth, usdRange } from "./prices";

export type OfferStatus = "live" | "tbd_ryan" | "retired";
export type OfferCategory =
  | "website"
  | "growth"
  | "system"
  | "product"
  | "event"
  | "hosting"
  | "agency";

export type Offer = {
  id: string;
  name: string;
  category: OfferCategory;
  /** Null when Ryan has not set a price. */
  priceUsd: number | null;
  /** What the page prints: "$497", "$7,500+", "$49/mo", "$0 build fee". */
  priceLabel: string;
  /** One line of terms that travels with the price wherever it appears. */
  terms: string;
  status: OfferStatus;
  /** YYYY-MM-DD the current price took effect. */
  effectiveDate: string;
  /** YYYY-MM-DD to re-confirm with Ryan. */
  reviewDate: string;
  href: string;
  /** Hosted Stripe Payment Link, when the offer uses one. */
  stripeLink?: string;
  /** Which module owns the charged amount. */
  source: string;
};

export const TBD_PRICE_LABEL = "Pricing confirmed on the scoping call";
export const TBD_PRICE_TERMS =
  "Ryan has not published a price for this yet. You will see the number in writing before anything is scoped or billed.";

const EFFECTIVE = "2026-09-01";
const REVIEW = "2026-12-01";

export const OFFERS: readonly Offer[] = [
  // ---------------------------------------------------------- websites --
  {
    id: "free_website_program",
    name: "Free Website Program",
    category: "website",
    priceUsd: PRICES.freeBuildFee,
    priceLabel: `${usd(PRICES.freeBuildFee)} build fee`,
    terms: "Application required. Ten approved businesses a month. You own the site, accounts, tracking, and leads.",
    status: "live",
    effectiveDate: EFFECTIVE,
    reviewDate: REVIEW,
    href: "/free-build",
    source: "lib/freeBuild.ts",
  },
  {
    id: "free_build_followup",
    name: "Free Website + Follow-Up Pack",
    category: "growth",
    priceUsd: PRICES.freeBuildFollowUpPack,
    priceLabel: usd(PRICES.freeBuildFollowUpPack),
    terms: "One time. A fixed follow-up work product for one offer. No recurring management.",
    status: "live",
    effectiveDate: EFFECTIVE,
    reviewDate: REVIEW,
    href: "/free-build",
    source: "lib/freeBuild.ts",
  },
  {
    id: "free_build_content",
    name: "Free Website + Content Engine",
    category: "growth",
    priceUsd: PRICES.freeBuildContentEngine,
    priceLabel: usd(PRICES.freeBuildContentEngine),
    terms: "One time. Two weeks of business-specific content around the offer. No ad spend hidden inside.",
    status: "live",
    effectiveDate: EFFECTIVE,
    reviewDate: REVIEW,
    href: "/free-build",
    source: "lib/freeBuild.ts",
  },
  {
    id: "free_build_launch",
    name: "Free Website + 30-Day Growth Engine",
    category: "growth",
    priceUsd: PRICES.freeBuildGrowthEngine,
    priceLabel: usd(PRICES.freeBuildGrowthEngine),
    terms: "One time. A 30-day campaign and follow-up foundation. Ad spend and subscriptions quoted separately.",
    status: "live",
    effectiveDate: EFFECTIVE,
    reviewDate: REVIEW,
    href: "/free-build",
    source: "lib/freeBuild.ts",
  },
  {
    id: "website_launch",
    name: "Website Launch",
    category: "website",
    priceUsd: PRICES.websiteLaunchTotal,
    priceLabel: usd(PRICES.websiteLaunchTotal),
    terms: `${usd(PRICES.websiteLaunchDeposit)} to start, ${usd(PRICES.websiteLaunchFinal)} after approval, before launch. Once intake begins, the deposit is non-refundable, except where the written agreement or applicable law requires otherwise.`,
    status: "live",
    effectiveDate: EFFECTIVE,
    reviewDate: REVIEW,
    href: "/packages/launch",
    stripeLink: EXTERNAL_LINKS.stripeWebsiteLaunchDeposit,
    source: "lib/offers.ts",
  },
  {
    id: "system_map",
    name: "System Map",
    category: "system",
    priceUsd: PRICES.systemMap,
    priceLabel: usd(PRICES.systemMap),
    terms: "Paid diagnosis, architecture, priorities, and an implementation roadmap. Credited toward an approved larger build.",
    status: "live",
    effectiveDate: EFFECTIVE,
    reviewDate: REVIEW,
    href: "/packages/system-map",
    source: "lib/offers.ts",
  },
  {
    id: "lead_engine",
    name: "Lead Engine",
    category: "system",
    priceUsd: PRICES.leadEngineFrom,
    priceLabel: usdFrom(PRICES.leadEngineFrom),
    terms: "Website, conversion funnel, CRM, lead routing, and response automation. Written scope sets the exact price.",
    status: "live",
    effectiveDate: EFFECTIVE,
    reviewDate: REVIEW,
    href: "/start?goal=follow_up",
    source: "lib/offers.ts",
  },
  {
    id: "training_platform",
    name: "Course platform",
    category: "system",
    priceUsd: PRICES.trainingPlatformFrom,
    priceLabel: usdFrom(PRICES.trainingPlatformFrom),
    terms: "Course catalog, member dashboard, enrollment, progress, and admin tools. Written scope sets the exact price.",
    status: "live",
    effectiveDate: EFFECTIVE,
    reviewDate: REVIEW,
    href: "/start?goal=delivery",
    source: "lib/offers.ts",
  },
  {
    id: "company_os",
    name: "Company OS",
    category: "system",
    priceUsd: PRICES.companyOsFrom,
    priceLabel: usdFrom(PRICES.companyOsFrom),
    terms: "Website, CRM, client portal, analytics, automation, and operating dashboard. Begins with a System Map.",
    status: "live",
    effectiveDate: EFFECTIVE,
    reviewDate: REVIEW,
    href: "/packages/industry-os",
    source: "lib/offers.ts",
  },
  {
    id: "custom_platform",
    name: "Custom Platform",
    category: "system",
    priceUsd: PRICES.customPlatformFrom,
    priceLabel: usdFrom(PRICES.customPlatformFrom),
    terms: "Custom software, multi-role workflows, advanced integrations, and platform architecture.",
    status: "live",
    effectiveDate: EFFECTIVE,
    reviewDate: REVIEW,
    href: "/start?goal=custom",
    source: "lib/offers.ts",
  },

  // ------------------------------------------------------------ growth --
  {
    id: "lead_followup_campaign",
    name: "Follow-Up Campaign",
    category: "growth",
    priceUsd: PRICES.leadFollowUpCampaign,
    priceLabel: usd(PRICES.leadFollowUpCampaign),
    terms: "One time. Your follow-up written and handed over. Nothing is sent on your behalf.",
    status: "live",
    effectiveDate: EFFECTIVE,
    reviewDate: REVIEW,
    href: "/go/lead-follow-up",
    source: "lib/leadFollowUp.ts",
  },

  // ---------------------------------------------------------- products --
  {
    id: "pro_kits",
    name: "Pro Kits",
    category: "product",
    priceUsd: PRICES.proKitMin,
    priceLabel: usdRange(PRICES.proKitMin, PRICES.proKitMax),
    terms: "One-time purchases. Each kit shows its own price.",
    status: "live",
    effectiveDate: EFFECTIVE,
    reviewDate: REVIEW,
    href: "/tools/pro",
    source: "lib/tools/pro/kits/*.ts",
  },
  {
    id: "pro_bundle",
    name: "Every Pro Kit",
    category: "product",
    priceUsd: PRICES.proBundle,
    priceLabel: usd(PRICES.proBundle),
    terms: "One time. Every kit on the shelf, and every kit added after, unlocked on one key.",
    status: "live",
    effectiveDate: "2026-09-21",
    reviewDate: REVIEW,
    href: "/tools/pro",
    source: "lib/tools/pro/index.ts",
  },
  {
    id: "plugin",
    name: "Plugin for ChatGPT and Claude",
    category: "product",
    priceUsd: PRICES.pluginMonthly,
    priceLabel: usdPerMonth(PRICES.pluginMonthly),
    terms: `${PRICES.pluginTrialDays} days free, then ${usdPerMonth(PRICES.pluginMonthly)}. Cancel any time from your account; it stops at the end of the period.`,
    status: "live",
    effectiveDate: EFFECTIVE,
    reviewDate: REVIEW,
    href: "/plugin",
    source: "lib/hq/types.ts",
  },
  {
    id: "chase_sheet_monthly",
    name: "Chase Sheet, monthly",
    category: "product",
    priceUsd: PRICES.chaseSheetMonthly,
    priceLabel: usdPerMonth(PRICES.chaseSheetMonthly),
    terms: "Monthly. Renews on the same date each month until cancelled from inside the sheet; stops at the end of the paid month. You send every message yourself.",
    status: "live",
    effectiveDate: "2026-09-23",
    reviewDate: REVIEW,
    href: "/chase-sheet",
    stripeLink: EXTERNAL_LINKS.stripeChaseSheetMonthly,
    source: "lib/chaseSheet/product.ts",
  },
  {
    id: "chase_sheet_lifetime",
    name: "Chase Sheet, one payment",
    category: "product",
    priceUsd: PRICES.chaseSheetLifetime,
    priceLabel: usd(PRICES.chaseSheetLifetime),
    terms: "One time. The sheet, every trade library and message added after, for as long as it exists. Nothing renews. You send every message yourself.",
    status: "live",
    effectiveDate: "2026-09-23",
    reviewDate: REVIEW,
    href: "/chase-sheet",
    stripeLink: EXTERNAL_LINKS.stripeChaseSheetLifetime,
    source: "lib/chaseSheet/product.ts",
  },
  {
    id: "sellerproof_packet",
    name: "SellerProof chargeback packet",
    category: "product",
    priceUsd: PRICES.sellerProofPacket,
    priceLabel: usd(PRICES.sellerProofPacket),
    terms: "Free preview. One-time export of one dispute packet. You review and submit it yourself.",
    status: "live",
    effectiveDate: EFFECTIVE,
    reviewDate: REVIEW,
    href: "/sellerproof",
    source: "lib/sellerproof/packet.ts",
  },
  {
    id: "tool_studio_blueprint",
    name: "Tool Studio blueprint",
    category: "product",
    priceUsd: PRICES.toolStudioBlueprint,
    priceLabel: usd(PRICES.toolStudioBlueprint),
    terms: `A paid blueprint with a defined deliverable. Finished production starts at ${usd(PRICES.toolStudioProduction)}.`,
    status: "live",
    effectiveDate: EFFECTIVE,
    reviewDate: REVIEW,
    href: "/go/tools",
    source: "lib/toolStudio.ts",
  },
  {
    id: "tool_studio_quick_tool",
    name: "Tool Studio quick tool",
    category: "product",
    priceUsd: PRICES.toolStudioProduction,
    priceLabel: usd(PRICES.toolStudioProduction),
    terms: "One time. One single-purpose interactive tool with up to five inputs and one result screen, mobile styling on the approved brand, an embed or stand-alone page, an analytics event, and one correction round. No accounts, uploads, paid APIs, or databases.",
    status: "live",
    effectiveDate: "2026-09-21",
    reviewDate: REVIEW,
    href: "/go/tools",
    source: "lib/toolStudio.ts",
  },
  {
    id: "tool_studio_funnel",
    name: "Tool Studio funnel",
    category: "product",
    priceUsd: PRICES.toolStudioFunnel,
    priceLabel: usd(PRICES.toolStudioFunnel),
    terms: "One time. One interactive tool with the landing page, lead capture, owner alert, tracking, and two correction rounds. Ad spend, paid vendors, and custom databases are quoted separately.",
    status: "live",
    effectiveDate: "2026-09-21",
    reviewDate: REVIEW,
    href: "/go/tools",
    source: "lib/toolStudio.ts",
  },
  // Tool Studio monthly menu (MONTHLY_MENU). Each item renews monthly and is
  // added to a build or bought on its own from /go/tools.
  {
    id: "tool_studio_tool_care",
    name: "Tool Studio: Tool Care",
    category: "product",
    priceUsd: PRICES.toolCareMonthly,
    priceLabel: usdPerMonth(PRICES.toolCareMonthly),
    terms: "Monthly. Monitoring, one minor in-scope update, and a monthly performance note.",
    status: "live",
    effectiveDate: "2026-09-21",
    reviewDate: REVIEW,
    href: "/go/tools",
    source: "lib/toolStudio.ts",
  },
  {
    id: "tool_studio_follow_up_tuneup",
    name: "Tool Studio: Follow-Up Tune-Up",
    category: "product",
    priceUsd: PRICES.followUpTuneUpMonthly,
    priceLabel: usdPerMonth(PRICES.followUpTuneUpMonthly),
    terms: "Monthly. Refresh one email, call, or owner-response sequence using the month's real questions.",
    status: "live",
    effectiveDate: "2026-09-21",
    reviewDate: REVIEW,
    href: "/go/tools",
    source: "lib/toolStudio.ts",
  },
  {
    id: "tool_studio_content_refresh",
    name: "Tool Studio: Content Refresh",
    category: "product",
    priceUsd: PRICES.contentRefreshMonthly,
    priceLabel: usdPerMonth(PRICES.contentRefreshMonthly),
    terms: "Monthly. One new supporting article, landing-page section, or campaign content batch.",
    status: "live",
    effectiveDate: "2026-09-21",
    reviewDate: REVIEW,
    href: "/go/tools",
    source: "lib/toolStudio.ts",
  },
  {
    id: "tool_studio_seo_archive_batch",
    name: "Tool Studio: Search + Archive Batch",
    category: "product",
    priceUsd: PRICES.seoArchiveBatchMonthly,
    priceLabel: usdPerMonth(PRICES.seoArchiveBatchMonthly),
    terms: "Monthly. Add and index one approved batch of niche records, resources, FAQs, or local pages.",
    status: "live",
    effectiveDate: "2026-09-21",
    reviewDate: REVIEW,
    href: "/go/tools",
    source: "lib/toolStudio.ts",
  },
  {
    id: "tool_studio_funnel_test",
    name: "Tool Studio: Funnel Test",
    category: "product",
    priceUsd: PRICES.funnelTestMonthly,
    priceLabel: usdPerMonth(PRICES.funnelTestMonthly),
    terms: "Monthly. One measured offer, form, headline, or result-screen test with a written finding.",
    status: "live",
    effectiveDate: "2026-09-21",
    reviewDate: REVIEW,
    href: "/go/tools",
    source: "lib/toolStudio.ts",
  },

  // ----------------------------------------------------------- hosting --
  {
    id: "hosting_managed",
    name: "Managed hosting",
    category: "hosting",
    priceUsd: PRICES.hostingManagedMonthly,
    priceLabel: usdPerMonth(PRICES.hostingManagedMonthly),
    terms: `After the included ${PRICES.hostingIncludedDays} days on a free build. Nothing renews without written approval.`,
    status: "live",
    effectiveDate: EFFECTIVE,
    reviewDate: REVIEW,
    href: "/free-build",
    source: "lib/site/prices.ts",
  },
  {
    id: "hosting_with_edits",
    name: "Managed hosting with two edits",
    category: "hosting",
    priceUsd: PRICES.hostingWithEditsMonthly,
    priceLabel: usdPerMonth(PRICES.hostingWithEditsMonthly),
    terms: "Two minor edits a month inside the existing scope.",
    status: "live",
    effectiveDate: EFFECTIVE,
    reviewDate: REVIEW,
    href: "/free-build",
    source: "lib/site/prices.ts",
  },

  // ------------------------------------------------------------- event --
  {
    id: "workshop_chatgpt_longview",
    name: "ChatGPT for Business Owners workshop",
    category: "event",
    priceUsd: PRICES.workshopSeat,
    priceLabel: usd(PRICES.workshopSeat),
    terms: "Per attendee. A seat is confirmed only after payment. The database event row is the authority for a published date.",
    status: "live",
    effectiveDate: EFFECTIVE,
    reviewDate: REVIEW,
    href: "/events",
    source: "events.price_usd (database), lib/site/prices.ts fallback",
  },

  // ------------------------------------------------------------ agency --
  // Prices are Ryan's call. Pages render TBD_PRICE_LABEL until he sets them.
  {
    id: "agency_meta_ads",
    name: "Meta ads management",
    category: "agency",
    priceUsd: null,
    priceLabel: TBD_PRICE_LABEL,
    terms: TBD_PRICE_TERMS,
    status: "tbd_ryan",
    effectiveDate: "2026-09-17",
    reviewDate: "2026-10-01",
    href: "/agency/meta-ads",
    source: "docs/decisions-needed.md",
  },
  {
    id: "agency_google_ads",
    name: "Google Ads management",
    category: "agency",
    priceUsd: null,
    priceLabel: TBD_PRICE_LABEL,
    terms: TBD_PRICE_TERMS,
    status: "tbd_ryan",
    effectiveDate: "2026-09-17",
    reviewDate: "2026-10-01",
    href: "/agency/google-ads",
    source: "docs/decisions-needed.md",
  },
  {
    id: "agency_automation",
    name: "Automation build",
    category: "agency",
    priceUsd: null,
    priceLabel: TBD_PRICE_LABEL,
    terms: TBD_PRICE_TERMS,
    status: "tbd_ryan",
    effectiveDate: "2026-09-17",
    reviewDate: "2026-10-01",
    href: "/agency/automation",
    source: "docs/decisions-needed.md",
  },
  {
    id: "agency_video",
    name: "Video and media production",
    category: "agency",
    priceUsd: null,
    priceLabel: TBD_PRICE_LABEL,
    terms: TBD_PRICE_TERMS,
    status: "tbd_ryan",
    effectiveDate: "2026-09-17",
    reviewDate: "2026-10-01",
    href: "/agency/video",
    source: "docs/decisions-needed.md",
  },
  {
    id: "agency_content",
    name: "Content production",
    category: "agency",
    priceUsd: null,
    priceLabel: TBD_PRICE_LABEL,
    terms: TBD_PRICE_TERMS,
    status: "tbd_ryan",
    effectiveDate: "2026-09-17",
    reviewDate: "2026-10-01",
    href: "/agency/content",
    source: "docs/decisions-needed.md",
  },

  // -------------------------------------------------- plugin vertical packs --
  // Industry editions of the plugin (lib/hq/verticals.ts). A pack is marketed
  // only once every workflow in it exists, and priced only when Ryan sets a
  // number. Until both, the page 404s and the price is the TBD line.
  {
    id: "plugin_pack_contractor",
    name: "Plugin: Contractor edition",
    category: "product",
    priceUsd: null,
    priceLabel: TBD_PRICE_LABEL,
    terms: TBD_PRICE_TERMS,
    status: "tbd_ryan",
    effectiveDate: "2026-09-17",
    reviewDate: "2026-10-01",
    href: "/plugin/packs/contractor",
    source: "lib/hq/verticals.ts",
  },
  {
    id: "plugin_pack_dental_medical",
    name: "Plugin: Dental and medical office edition",
    category: "product",
    priceUsd: null,
    priceLabel: TBD_PRICE_LABEL,
    terms: TBD_PRICE_TERMS,
    status: "tbd_ryan",
    effectiveDate: "2026-09-17",
    reviewDate: "2026-10-01",
    href: "/plugin/packs/dental_medical",
    source: "lib/hq/verticals.ts",
  },
  {
    id: "plugin_pack_realtor",
    name: "Plugin: Realtor edition",
    category: "product",
    priceUsd: null,
    priceLabel: TBD_PRICE_LABEL,
    terms: TBD_PRICE_TERMS,
    status: "tbd_ryan",
    effectiveDate: "2026-09-17",
    reviewDate: "2026-10-01",
    href: "/plugin/packs/realtor",
    source: "lib/hq/verticals.ts",
  },
];

export function offer(id: string): Offer {
  const found = OFFERS.find((o) => o.id === id);
  if (!found) throw new Error(`Unknown offer id: ${id}`);
  return found;
}

/** The label a page prints. Retired offers never print a price. */
export function priceLabel(id: string): string {
  const o = offer(id);
  return o.status === "retired" ? TBD_PRICE_LABEL : o.priceLabel;
}

export function liveOffers(category?: OfferCategory): Offer[] {
  return OFFERS.filter((o) => o.status === "live" && (!category || o.category === category));
}

/** Offers still waiting on Ryan, for docs/decisions-needed.md and the tests. */
export function offersAwaitingRyan(): Offer[] {
  return OFFERS.filter((o) => o.status === "tbd_ryan");
}
