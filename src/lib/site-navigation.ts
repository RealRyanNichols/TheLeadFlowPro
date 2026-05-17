export type SiteNavItem = {
  href: string;
  label: string;
  activePaths?: string[];
};

export const SITE_PRIMARY_NAV: SiteNavItem[] = [
  { href: "/lead-leak-audit-197", label: "Lead Leak Audit", activePaths: ["/lead-leak-audit-197", "/lead-leak-audit"] },
  { href: "/proof", label: "Proof" },
  { href: "/services", label: "Services" },
  { href: "/tiers", label: "Pricing", activePaths: ["/tiers", "/pricing"] },
  { href: "/tools", label: "Tools" },
  { href: "/leaderboard", label: "Top 10" },
  { href: "/book", label: "Book Call" },
];

export const SITE_MORE_NAV: SiteNavItem[] = [
  { href: "/stump-ryan", label: "Stump Ryan", activePaths: ["/stump-ryan", "/challenge"] },
  { href: "/organic-growth", label: "Organic Plan" },
  { href: "/services/consulting", label: "Consulting" },
  { href: "/start", label: "Start Here" },
  { href: "/tools/ad-account-autopsy", label: "Ad Autopsy" },
  { href: "/pulse", label: "Live Pulse" },
  { href: "/story", label: "Story" },
  { href: "/contact", label: "Contact" },
  { href: "/community", label: "Community" },
  { href: "/support", label: "Support" },
  { href: "/rewards", label: "Rewards" },
];

export const SITE_MOBILE_NAV: SiteNavItem[] = [
  { href: "/", label: "Home" },
  ...SITE_PRIMARY_NAV,
  ...SITE_MORE_NAV,
  { href: "/login", label: "Sign in" },
];

export const SITE_FOOTER_NAV = {
  funnel: [
    { href: "/lead-leak-audit-197", label: "$197 Lead Leak Audit" },
    { href: "/lead-leak-audit", label: "Free Lead Leak Audit" },
    { href: "/stump-ryan", label: "Stump Ryan" },
    { href: "/proof", label: "Proof" },
    { href: "/book", label: "Book call" },
  ],
  company: [
    { href: "/services", label: "Services" },
    { href: "/tiers", label: "Pricing" },
    { href: "/story", label: "Story" },
    { href: "/contact", label: "Contact" },
    { href: "/login", label: "Sign in" },
  ],
  tools: [
    { href: "/tools", label: "Tools hub" },
    { href: "/organic-growth", label: "Organic plan" },
    { href: "/tools/ad-account-autopsy", label: "Ad autopsy" },
    { href: "/pulse", label: "Live pulse" },
    { href: "/start", label: "Start here" },
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
