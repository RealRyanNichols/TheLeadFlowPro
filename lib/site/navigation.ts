// The one navigation and the one footer. SiteHeader and SiteFooter render
// these; nothing else defines a link set. Labels that carry a price read the
// number from lib/site/prices.ts so the footer can never drift from checkout.
//
// The header CTA is the free consultation on the homepage
// (lib/site/consultation.ts). Events and courses are deliberately not in the
// primary navigation: the business sells done-for-you work, not seats or
// lessons. The pages still exist for people who already hold a link.

import { CONSULTATION } from "./consultation";
import { PRICES, usd, usdPerMonth, usdRange } from "./prices";

export type NavLink = { href: string; label: string };

export const NAV_LINKS: readonly NavLink[] = [
  { href: "/", label: "Home" },
  { href: "/services", label: "Build my business" },
  { href: "/agency", label: "Run it for me" },
  { href: "/scoreboard", label: "Scoreboard" },
  { href: "/tools", label: "Tools" },
  { href: "/articles", label: "Articles" },
];

export const HEADER_PORTAL: NavLink = { href: "/login", label: "Portal" };
export const HEADER_CTA: NavLink = { href: CONSULTATION.href, label: "Free consultation" };

export type FooterColumn = { heading: string; links: readonly NavLink[] };

export const FOOTER_COLUMNS: readonly FooterColumn[] = [
  {
    heading: "What we build",
    links: [
      { href: "/services", label: "Services" },
      { href: "/agency", label: "Agency: ads, websites, automation, media" },
      { href: "/commerce", label: "Commerce & online selling" },
      { href: "/operator-academy", label: "Courses & learning" },
      { href: "/add-ons", label: "Add-On Menu" },
      { href: "/tools", label: "Free Tools" },
      { href: "/tools/pro", label: `Pro Kits | ${usdRange(PRICES.proKitMin, PRICES.proKitMax)}` },
      { href: "/chase-sheet", label: `Chase Sheet | ${usdPerMonth(PRICES.chaseSheetMonthly)} or ${usd(PRICES.chaseSheetLifetime)} once` },
      { href: "/plugin", label: `Plugin for ChatGPT and Claude | ${usdPerMonth(PRICES.pluginMonthly)}` },
      { href: "/sellerproof", label: "SellerProof | Chargeback packets" },
      { href: "/chatgpt/free", label: "Free starter lesson" },
    ],
  },
  {
    heading: "Proof",
    links: [
      { href: "/results", label: "Results" },
      { href: "/premier-system", label: "Premier System" },
      { href: "/scoreboard", label: "Scoreboard" },
      { href: "/proof-floor", label: "Proof Floor" },
      { href: "/live", label: "Live Proof" },
      { href: "/portfolio", label: "The Work" },
      { href: "/articles", label: "Articles" },
      { href: "/about", label: "About Ryan" },
    ],
  },
  {
    heading: "Work together",
    links: [
      { href: CONSULTATION.href, label: `Free ${CONSULTATION.minutes}-minute consultation` },
      { href: "/longview", label: "Longview and East Texas" },
      { href: "/packages", label: "Packages" },
      { href: "/go/lead-follow-up", label: `Follow-Up Campaign | ${usd(PRICES.leadFollowUpCampaign)}` },
      { href: "/free-build", label: `Free Website | ${usd(PRICES.freeBuildFee)} Build Fee` },
      { href: "/tlfp", label: "TLFP Credits | Earn, buy, spend" },
      { href: "/agency/start", label: "Agency intake" },
      { href: "/start", label: "Map My Company" },
      {
        href: "/diagnostic?utm_source=website&utm_medium=footer&utm_campaign=business_diagnostic",
        label: "Business Growth Diagnostic",
      },
      { href: "/contact", label: "Contact" },
      { href: "/login", label: "Log in" },
    ],
  },
];

export const FOOTER_PITCH =
  "More attention. More leads. More revenue. We connect the website, follow-up, sales tools, and operating system in accounts you control.";

export const LEGAL_LINKS: readonly NavLink[] = [
  { href: "/privacy", label: "Privacy" },
  { href: "/terms", label: "Terms" },
];

/** Public paths that never show the marketing header or footer. */
export const CHROME_FREE_PATHS = ["/start", "/agency/start", "/agency/pay"] as const;
export const WORKSPACE_PREFIXES = ["/admin", "/sales", "/dashboard", "/factory/preview"] as const;

export function hidesSiteChrome(pathname: string): boolean {
  if ((CHROME_FREE_PATHS as readonly string[]).includes(pathname)) return true;
  return WORKSPACE_PREFIXES.some((base) => pathname === base || pathname.startsWith(`${base}/`));
}

/** Every internal href the header and footer render, for the link check. */
export function chromeInternalHrefs(): string[] {
  const all = [
    ...NAV_LINKS,
    HEADER_PORTAL,
    HEADER_CTA,
    ...FOOTER_COLUMNS.flatMap((c) => c.links),
    ...LEGAL_LINKS,
  ].map((l) => l.href);
  return [...new Set(all.filter((h) => h.startsWith("/")))];
}
