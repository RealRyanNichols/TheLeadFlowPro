// The one navigation and the one footer. SiteHeader and SiteFooter render
// these; nothing else defines a link set. Labels that carry a price read the
// number from lib/site/prices.ts so the footer can never drift from checkout.
//
// The header CTA is the free consultation on the homepage
// (lib/site/consultation.ts). Existing tools and learning pages remain
// discoverable under Resources; every existing destination is retained.

import { CONSULTATION } from "./consultation";
import { PRICES, usd, usdPerMonth, usdRange } from "./prices";

export type NavLink = { href: string; label: string };

export type NavGroup = NavLink & { links: readonly NavLink[] };

export const NAV_GROUPS: readonly NavGroup[] = [
  { href: "/agency", label: "Services", links: [
    { href: "/services", label: "Websites & business systems" },
    { href: "/agency", label: "Managed marketing" },
    { href: "/commerce", label: "Online stores & products" },
    { href: "/agency/community-help-desk", label: "Community help desks" },
    { href: "/pricing", label: "Managed campaign pricing" },
  ] },
  { href: "/results", label: "Our work", links: [
    { href: "/results", label: "Results & client stories" },
    { href: "/portfolio", label: "Explore the portfolio" },
    { href: "/premier-system", label: "Inside the Premier system" },
    { href: "/live", label: "Live site activity" },
  ] },
  { href: "/tools", label: "Resources", links: [
    { href: "/tools", label: "Free business tools" },
    { href: "/articles", label: "Articles & guides" },
    { href: "/academy", label: "Courses & learning" },
    { href: "/tools/pro", label: "Pro kits" },
  ] },
  { href: "/about", label: "About", links: [
    { href: "/about", label: "Meet Ryan & the team" },
    { href: "/contact", label: "Get in touch" },
    { href: "/service-areas", label: "Service areas & availability" },
    { href: "/longview", label: "Our Longview roots" },
  ] },
];
export const NAV_LINKS: readonly NavLink[] = NAV_GROUPS.map(({ href, label }) => ({ href, label }));

export const HEADER_PORTAL: NavLink = { href: "/login", label: "Portal" };
export const HEADER_CTA: NavLink = {
  href: CONSULTATION.href,
  label: "Free consultation",
};

export type FooterColumn = {
  heading: string;
  links: readonly NavLink[];
  /** Keep the first decision visible; optional products remain one click away. */
  featuredHrefs?: readonly string[];
  moreLabel?: string;
};

export const FOOTER_COLUMNS: readonly FooterColumn[] = [
  {
    heading: "Services",
    featuredHrefs: ["/services", "/agency", "/commerce", "/agency/community-help-desk", "/pricing"],
    moreLabel: "Tools, products & custom options",
    links: [
      { href: "/services", label: "Websites & business systems" },
      { href: "/agency", label: "Run my marketing" },
      { href: "/pricing", label: "Managed campaign pricing" },
      { href: "/commerce", label: "Commerce & online selling" },
      { href: "/agency/community-help-desk", label: "Community help desks" },
      { href: "/operator-academy", label: "Courses & learning" },
      { href: "/add-ons", label: "Custom build options" },
      { href: "/tools", label: "Free Tools" },
      {
        href: "/tools/pro",
        label: `Pro Kits | ${usdRange(PRICES.proKitMin, PRICES.proKitMax)}`,
      },
      {
        href: "/chase-sheet",
        label: `Chase Sheet | ${usdPerMonth(PRICES.chaseSheetMonthly)} or ${usd(PRICES.chaseSheetLifetime)} once`,
      },
      {
        href: "/post-creator",
        label: `Post Creator | Free ideas, AI ${usdPerMonth(PRICES.postCreatorMonthly)} or ${usd(PRICES.postCreatorLifetime)} once`,
      },
      {
        href: "/plugin",
        label: `Plugin for ChatGPT and Claude | ${usdPerMonth(PRICES.pluginMonthly)}`,
      },
      { href: "/sellerproof", label: "SellerProof | Chargeback packets" },
      { href: "/chatgpt/free", label: "Free starter lesson" },
    ],
  },
  {
    heading: "Our work",
    featuredHrefs: ["/results", "/scoreboard", "/portfolio", "/about"],
    moreLabel: "More examples & guides",
    links: [
      { href: "/results", label: "Results" },
      { href: "/premier-system", label: "Premier System" },
      { href: "/scoreboard", label: "Scoreboard" },
      { href: "/proof-floor", label: "Proof Floor" },
      { href: "/live", label: "Live Proof" },
      { href: "/portfolio", label: "The Work" },
      { href: "/articles", label: "Articles" },
      { href: "/about", label: "Meet Ryan & the team" },
    ],
  },
  {
    heading: "Work together",
    featuredHrefs: [CONSULTATION.href, "/service-areas", "/contact", "/login"],
    moreLabel: "More ways to get started",
    links: [
      {
        href: CONSULTATION.href,
        label: `Free ${CONSULTATION.minutes}-minute consultation`,
      },
      { href: "/service-areas", label: "Check my service area" },
      { href: "/longview", label: "Longview and East Texas" },
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
  "Websites, marketing and useful systems for local businesses, online brands and communities. Built around your next move.";

export const LEGAL_LINKS: readonly NavLink[] = [
  { href: "/privacy", label: "Privacy" },
  { href: "/terms", label: "Terms" },
];

/** Public paths that never show the marketing header or footer. */
export const CHROME_FREE_PATHS = [
  "/start",
  "/agency/start",
  "/agency/pay",
] as const;
export const WORKSPACE_PREFIXES = [
  "/admin",
  "/sales",
  "/dashboard",
  "/factory/preview",
] as const;

export function hidesSiteChrome(pathname: string): boolean {
  if ((CHROME_FREE_PATHS as readonly string[]).includes(pathname)) return true;
  return WORKSPACE_PREFIXES.some(
    (base) => pathname === base || pathname.startsWith(`${base}/`),
  );
}

/** Every internal href the header and footer render, for the link check. */
export function chromeInternalHrefs(): string[] {
  const all = [
    ...NAV_LINKS,
    ...NAV_GROUPS.flatMap((group) => group.links),
    HEADER_PORTAL,
    HEADER_CTA,
    ...FOOTER_COLUMNS.flatMap((c) => c.links),
    ...LEGAL_LINKS,
  ].map((l) => l.href);
  return [...new Set(all.filter((h) => h.startsWith("/")))];
}
