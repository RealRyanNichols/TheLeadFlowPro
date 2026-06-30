export type SiteNavItem = {
  href: string;
  label: string;
  activePaths?: string[];
};

export const SITE_PRIMARY_NAV: SiteNavItem[] = [
  { href: "/problem-intake", label: "Find Signal", activePaths: ["/problem-intake"] },
  { href: "/data-marketplace", label: "Marketplace", activePaths: ["/data-marketplace"] },
  { href: "/#data", label: "Data" },
  { href: "/#profiles", label: "Profiles" },
  { href: "/#fair-rates", label: "Fair Rates" },
  { href: "/#workflow", label: "Workflow" },
];

export const SITE_MORE_NAV: SiteNavItem[] = [
  { href: "/admin", label: "Admin Login" },
  { href: "/contact", label: "Contact" },
];

export const SITE_MOBILE_NAV: SiteNavItem[] = [
  { href: "/", label: "Home" },
  ...SITE_PRIMARY_NAV,
  ...SITE_MORE_NAV,
];

export const SITE_FOOTER_NAV = {
  funnel: [
    { href: "/problem-intake", label: "Find signal" },
    { href: "/data-marketplace", label: "Marketplace" },
    { href: "/#data", label: "Lead sources" },
    { href: "/#profiles", label: "Profile model" },
    { href: "/#fair-rates", label: "Fair rates" },
    { href: "/#workflow", label: "Workflow" },
  ],
  company: [
    { href: "/admin", label: "Admin login" },
    { href: "/contact", label: "Contact" },
    { href: "/dashboard", label: "Dashboard" },
  ],
  tools: [
    { href: "/problem-intake", label: "Signal intake" },
    { href: "/data-marketplace", label: "Data requests" },
    { href: "/#fair-rates", label: "Buyer rate card" },
    { href: "/dashboard/data-requests", label: "Request dashboard" },
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
