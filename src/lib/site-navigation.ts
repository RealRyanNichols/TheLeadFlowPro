export type SiteNavItem = {
  href: string;
  label: string;
  activePaths?: string[];
};

export const SITE_PRIMARY_NAV: SiteNavItem[] = [
  {
    href: "/tools/growth-machine",
    label: "Growth Tool",
    activePaths: ["/tools/growth-machine", "/action-menu", "/tiers", "/pricing", "/offers"],
  },
  { href: "/action-menu", label: "Unlocks", activePaths: ["/action-menu"] },
  { href: "/pulse", label: "Pulse", activePaths: ["/pulse"] },
  { href: "/tools/ad-account-autopsy", label: "Ad Autopsy" },
  { href: "/proof", label: "Proof" },
];

export const SITE_MORE_NAV: SiteNavItem[] = [
  { href: "/tools/seo-grader", label: "SEO Grader" },
  { href: "/leaderboard", label: "Public Loops" },
  { href: "/voice", label: "Voice Votes" },
  { href: "/stump-ryan", label: "Blueprint Form" },
  { href: "/contact", label: "Assistant" },
];

export const SITE_MOBILE_NAV: SiteNavItem[] = [
  { href: "/", label: "Home" },
  ...SITE_PRIMARY_NAV,
  ...SITE_MORE_NAV,
];

export const SITE_FOOTER_NAV = {
  funnel: [
    { href: "/tools/growth-machine", label: "Run growth tool" },
    { href: "/action-menu", label: "Paid unlocks" },
    { href: "/tools/growth-machine#unlock-47", label: "$47 Growth Snapshot" },
    { href: "/tools/growth-machine#follow-up-kit", label: "$90 Follow-Up Kit" },
    { href: "/tools/growth-machine#lead-leak-report", label: "$197 Lead Leak Report" },
    { href: "/tools/growth-machine#growth-os", label: "Growth OS" },
  ],
  company: [
    { href: "/proof", label: "Proof" },
    { href: "/backend", label: "Login" },
    { href: "/contact", label: "Assistant" },
  ],
  tools: [
    { href: "/pulse", label: "Pulse analytics" },
    { href: "/tools/ad-account-autopsy", label: "Ad autopsy" },
    { href: "/tools/seo-grader", label: "SEO grader" },
    { href: "/leaderboard", label: "Public loops" },
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
