export type SiteNavItem = {
  href: string;
  label: string;
  activePaths?: string[];
};

export const SITE_PRIMARY_NAV: SiteNavItem[] = [
  { href: "/", label: "Live Clock" },
  { href: "/boards", label: "Boards", activePaths: ["/boards"] },
  { href: "/requests", label: "Request Queue", activePaths: ["/requests"] },
  { href: "/unlock", label: "Unlocks", activePaths: ["/unlock"] },
  { href: "/request", label: "Request Stat", activePaths: ["/request"] },
];

export const SITE_MORE_NAV: SiteNavItem[] = [
  { href: "/stats/unused-subscriptions-today", label: "Sample Stat" },
  { href: "/stats/abandoned-carts-today", label: "Cart Clock" },
  { href: "/stats/meetings-that-could-have-been-emails", label: "Work Clock" },
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
    { href: "/", label: "Live weird clock" },
    { href: "/request", label: "Request a weird stat" },
    { href: "/unlock", label: "Micropurchase unlocks" },
    { href: "/requests", label: "Public request queue" },
    { href: "/boards", label: "Premium boards" },
  ],
  company: [
    { href: "/admin", label: "Admin login" },
    { href: "/contact", label: "Contact" },
    { href: "/proof", label: "Old proof archive" },
  ],
  tools: [
    { href: "/stats/unused-subscriptions-today", label: "Unused subscriptions" },
    { href: "/stats/abandoned-carts-today", label: "Abandoned carts" },
    { href: "/stats/ai-images-generated-today", label: "AI images" },
    { href: "/stats/forgotten-tabs-open", label: "Forgotten tabs" },
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
