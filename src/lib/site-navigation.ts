export type SiteNavItem = {
  href: string;
  label: string;
  activePaths?: string[];
};

export const SITE_PRIMARY_NAV: SiteNavItem[] = [
  { href: "/action-menu", label: "Buy Menu", activePaths: ["/action-menu", "/offers", "/tiers", "/pricing"] },
  {
    href: "/lead-leak-audit-197",
    label: "$197 Audit",
    activePaths: ["/lead-leak-audit-197", "/lead-leak-audit"],
  },
  { href: "/stump-ryan", label: "Custom Builds", activePaths: ["/stump-ryan", "/challenge"] },
  { href: "/proof", label: "Build Proof" },
  { href: "/contact", label: "Leave Message" },
];

export const SITE_MORE_NAV: SiteNavItem[] = [
  { href: "/tiers", label: "Full Pricing" },
  { href: "/organic-growth", label: "Follow-Up Plan" },
  { href: "/tools/ad-account-autopsy", label: "Ad Account Check" },
  { href: "/pulse", label: "Live Activity" },
  { href: "/story", label: "Ryan's Story" },
];

export const SITE_MOBILE_NAV: SiteNavItem[] = [
  { href: "/", label: "Home" },
  ...SITE_PRIMARY_NAV,
  ...SITE_MORE_NAV,
];

export const SITE_FOOTER_NAV = {
  funnel: [
    { href: "/action-menu", label: "Buy menu" },
    { href: "/offers/quick-look", label: "$47 Quick-Look" },
    { href: "/lead-leak-audit-197", label: "$197 Lead Leak Audit" },
    { href: "/stump-ryan", label: "Custom Build Blueprint" },
    { href: "/proof", label: "Build proof" },
    { href: "/contact", label: "Leave message" },
  ],
  company: [
    { href: "/tiers", label: "Pricing" },
    { href: "/story", label: "Ryan's story" },
    { href: "/contact", label: "Contact" },
  ],
  tools: [
    { href: "/organic-growth", label: "Follow-up plan" },
    { href: "/tools/ad-account-autopsy", label: "Ad account check" },
    { href: "/pulse", label: "Live activity" },
  ],
  legal: [
    { href: "/legal", label: "Legal overview" },
    { href: "/privacy-policy", label: "Privacy policy" },
    { href: "/terms", label: "Terms" },
    { href: "/refunds", label: "Refunds" },
  ],
};

export function isActiveNavItem(item: SiteNavItem, activePath?: string) {
  if (!activePath) return false;
  const paths = item.activePaths ?? [item.href];
  return paths.some((path) => activePath === path || activePath.startsWith(`${path}/`));
}
