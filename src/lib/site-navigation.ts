export type SiteNavItem = {
  href: string;
  label: string;
  shortLabel?: string;
  description?: string;
  icon?: "map" | "market" | "source" | "profile" | "rate" | "score" | "guardrail" | "dashboard" | "admin" | "contact" | "home";
  activePaths?: string[];
};

// Clean four-item front door. Every href below resolves to a real, kept route.
export const SITE_PRIMARY_NAV: SiteNavItem[] = [
  {
    href: "/buy-leads",
    label: "Buy Leads",
    shortLabel: "Buy Leads",
    description: "Source-backed buyer-signal products.",
    icon: "market",
    activePaths: ["/buy-leads", "/offers"]
  },
  {
    href: "/pricing",
    label: "Pricing",
    shortLabel: "Pricing",
    description: "Offers, sample, and audit pricing.",
    icon: "rate",
    activePaths: ["/pricing"]
  },
  {
    href: "/submit-source",
    label: "Submit Source",
    shortLabel: "Submit Source",
    description: "Send a source, list, or audience for review.",
    icon: "source",
    activePaths: ["/submit-source"]
  },
  {
    href: "/contact",
    label: "Contact",
    shortLabel: "Contact",
    description: "Talk through buying, building, or submitting sources.",
    icon: "contact",
    activePaths: ["/contact"]
  },
];

export const SITE_MORE_NAV: SiteNavItem[] = [
  {
    href: "/build-my-system",
    label: "Build My System",
    shortLabel: "Build System",
    description: "Website, AI, forms, follow-up, and routing.",
    icon: "score",
    activePaths: ["/build-my-system", "/problem-intake"]
  },
  {
    href: "/industries",
    label: "Industries",
    shortLabel: "Industries",
    description: "How the signal machine maps to your market.",
    icon: "map",
    activePaths: ["/industries"]
  },
  {
    href: "/problem-intake",
    label: "Problem Intake",
    shortLabel: "Intake",
    description: "Build and save a preference map.",
    icon: "map",
    activePaths: ["/problem-intake"]
  },
  { href: "/privacy-center", label: "Privacy Center", shortLabel: "Privacy", description: "Consent, suppression, deletion, and data controls.", icon: "guardrail" },
  { href: "/dashboard", label: "Review Console", shortLabel: "Console", description: "Internal scoring, review, and routing console.", icon: "dashboard" },
  { href: "/login?next=/dashboard", label: "Operator Login", shortLabel: "Login", description: "Private operator access.", icon: "admin" },
];

export const SITE_MOBILE_NAV: SiteNavItem[] = [
  { href: "/", label: "Home", description: "Buyer-signal lead data.", icon: "home" },
  ...SITE_PRIMARY_NAV,
  ...SITE_MORE_NAV,
];

export const SITE_FOOTER_NAV = {
  funnel: [
    { href: "/buy-leads", label: "Buy leads" },
    { href: "/pricing", label: "Pricing" },
    { href: "/offers/business-audit", label: "Lead Leak Audit — $497" },
    { href: "/offers/quick-look", label: "Quick-Look — $47" },
    { href: "/build-my-system", label: "Build system" },
    { href: "/industries", label: "Industries" },
    { href: "/submit-source", label: "Submit source" },
  ],
  company: [
    { href: "/privacy-center", label: "Privacy center" },
    { href: "/contact", label: "Contact" },
    { href: "/dashboard", label: "Review console" },
    { href: "/login?next=/dashboard", label: "Operator login" },
  ],
  tools: [
    { href: "/problem-intake", label: "Problem intake" },
    { href: "/build-my-system", label: "Build my system" },
    { href: "/industries", label: "Industries" },
  ],
  legal: [
    { href: "/legal", label: "Legal overview" },
    { href: "/privacy-policy", label: "Privacy policy" },
    { href: "/privacy-center", label: "Privacy center" },
    { href: "/terms", label: "Terms" },
    { href: "/refunds", label: "Refunds" },
  ],
};

export function isActiveNavItem(item: SiteNavItem, activePath?: string) {
  if (!activePath) return false;
  const paths = item.activePaths ?? [item.href];
  return paths.some((path) => activePath === path || activePath.startsWith(`${path}/`));
}
