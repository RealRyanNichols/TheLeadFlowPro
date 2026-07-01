export type SiteNavItem = {
  href: string;
  label: string;
  shortLabel?: string;
  description?: string;
  icon?: "map" | "market" | "source" | "profile" | "rate" | "score" | "guardrail" | "dashboard" | "admin" | "contact" | "home";
  activePaths?: string[];
};

export const SITE_PRIMARY_NAV: SiteNavItem[] = [
  {
    href: "/buy-leads",
    label: "Buy Leads",
    shortLabel: "Buy Leads",
    description: "Source-backed signal products.",
    icon: "market",
    activePaths: ["/buy-leads"]
  },
  {
    href: "/build-my-system",
    label: "Build System",
    shortLabel: "Build System",
    description: "Website, AI, forms, follow-up, and routing.",
    icon: "score",
    activePaths: ["/build-my-system", "/problem-intake"]
  },
  {
    href: "/tools",
    label: "Tools",
    shortLabel: "Tools",
    description: "Quizzes, calculators, scorecards, and questionnaires.",
    icon: "map",
    activePaths: ["/tools", "/problem-intake", "/tools/seo-grader", "/tools/ad-account-autopsy", "/tools/growth-machine", "/tools/leadsource-clarity", "/tools/sales-rep-signal"]
  },
  {
    href: "/marketplace",
    label: "Marketplace",
    shortLabel: "Marketplace",
    description: "Search scored demand and lead signal products.",
    icon: "market",
    activePaths: ["/marketplace", "/data-marketplace"]
  },
  {
    href: "/submit-source",
    label: "Submit Source",
    shortLabel: "Submit Source",
    description: "Send a source, list, tool, or audience for review.",
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
    href: "/machine",
    label: "LeadFlow Machine",
    shortLabel: "Machine",
    description: "Phase 3 intake, scoring, routing, and review system.",
    icon: "dashboard",
    activePaths: ["/machine"]
  },
  {
    href: "/problem-intake",
    label: "Problem Intake",
    shortLabel: "Intake",
    description: "Build and save a preference map.",
    icon: "map",
    activePaths: ["/problem-intake"]
  },
  { href: "/profile-model", label: "Profile Model", shortLabel: "Profiles", description: "Proof, scores, tags, suppression, and open questions.", icon: "profile" },
  { href: "/privacy-center", label: "Privacy Center", shortLabel: "Privacy", description: "Consent, suppression, deletion, and data controls.", icon: "guardrail" },
  { href: "/dashboard", label: "Dashboard", shortLabel: "Dashboard", description: "Internal scoring, review, export, and routing console.", icon: "dashboard" },
  { href: "/login?next=/admin", label: "Operator Login", shortLabel: "Admin", description: "Private operator access.", icon: "admin" },
];

export const SITE_MOBILE_NAV: SiteNavItem[] = [
  { href: "/", label: "Home", description: "Live preference lab.", icon: "home" },
  ...SITE_PRIMARY_NAV,
  ...SITE_MORE_NAV,
];

export const SITE_FOOTER_NAV = {
  funnel: [
    { href: "/buy-leads", label: "Buy leads" },
    { href: "/industries", label: "Industries" },
    { href: "/build-my-system", label: "Build system" },
    { href: "/tools", label: "Tools" },
    { href: "/marketplace", label: "Marketplace" },
    { href: "/submit-source", label: "Submit source" },
    { href: "/profile-model", label: "Profile model" },
  ],
  company: [
    { href: "/privacy-center", label: "Privacy center" },
    { href: "/login?next=/admin", label: "Operator login" },
    { href: "/contact", label: "Contact" },
    { href: "/dashboard", label: "Dashboard" },
  ],
  tools: [
    { href: "/tools", label: "Public tools" },
    { href: "/problem-intake", label: "Problem intake" },
    { href: "/machine", label: "Phase 3 machine" },
    { href: "/data-marketplace", label: "Request builder" },
    { href: "/dashboard/data-requests", label: "Request dashboard" },
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
