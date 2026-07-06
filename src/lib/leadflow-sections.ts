import type { LucideIcon } from "lucide-react";
import {
  BadgeCheck,
  BarChart3,
  Bot,
  Building2,
  DatabaseZap,
  Eye,
  FileText,
  Gauge,
  GitBranch,
  Globe2,
  Inbox,
  LayoutDashboard,
  LockKeyhole,
  MousePointerClick,
  PackageCheck,
  Radar,
  Route,
  Search,
  ShieldCheck,
  SlidersHorizontal,
  Store,
  Tags,
  Target,
  UploadCloud,
  Workflow,
} from "lucide-react";

export type LeadFlowSection = {
  href: string;
  navLabel: string;
  eyebrow: string;
  title: string;
  body: string;
  primaryCta: string;
  secondaryCta?: string;
  secondaryHref?: string;
  icon: LucideIcon;
  accent: "cyan" | "accent" | "lead" | "violet";
  bullets: string[];
};

export const leadFlowSections: LeadFlowSection[] = [
  {
    href: "/buy-leads",
    navLabel: "Buy Leads",
    eyebrow: "Buyer lane",
    title: "Buy source-backed lead signals.",
    body: "For serious buyers who need proof, fit, confidence, freshness, and a clean next conversation instead of blind lists.",
    primaryCta: "Buy Lead Signals",
    secondaryCta: "See pricing",
    secondaryHref: "/pricing",
    icon: Store,
    accent: "accent",
    bullets: ["Signal packs", "Source proof", "Review-gated access"],
  },
  {
    href: "/build-my-system",
    navLabel: "Build System",
    eyebrow: "Operator lane",
    title: "Build the machine inside your business.",
    body: "Websites, AI agents, intake forms, automations, ads, dashboards, and follow-up systems that capture demand before it leaks.",
    primaryCta: "Build My System",
    secondaryCta: "Start Intake",
    secondaryHref: "/problem-intake",
    icon: Workflow,
    accent: "cyan",
    bullets: ["Website and forms", "AI agents", "Follow-up dashboard"],
  },
  {
    href: "/submit-source",
    navLabel: "Submit Source",
    eyebrow: "Source lane",
    title: "Submit a source for review.",
    body: "Send lead sources, datasets, lists, audiences, websites, directories, creator channels, local routes, or demand signals.",
    primaryCta: "Submit Source",
    secondaryCta: "Privacy Rules",
    secondaryHref: "/privacy-center",
    icon: UploadCloud,
    accent: "cyan",
    bullets: ["Source context", "Fit review", "Suppression checks"],
  },
  {
    href: "/privacy-center",
    navLabel: "Privacy Center",
    eyebrow: "Controls",
    title: "Consent, suppression, deletion, and data controls.",
    body: "Plain-English controls for consent, do-not-contact, deletion, data use, scoring opt-out, and named-seller routing.",
    primaryCta: "Open Privacy Center",
    secondaryCta: "Contact",
    secondaryHref: "/contact",
    icon: ShieldCheck,
    accent: "cyan",
    bullets: ["Consent", "Suppression", "Delete request"],
  },
  {
    href: "/dashboard",
    navLabel: "Review Console",
    eyebrow: "Internal console",
    title: "Review, score, tag, approve, suppress, export, and route.",
    body: "The internal command center for lead review, source proof, buyer requests, routing, exports, and audit history.",
    primaryCta: "Open Console",
    secondaryCta: "Submit Source",
    secondaryHref: "/submit-source",
    icon: LayoutDashboard,
    accent: "accent",
    bullets: ["Review queue", "Scoring", "Audit trail"],
  },
];

export const marketplaceFilters = [
  "Industry",
  "Location",
  "Buyer type",
  "Source type",
  "Confidence score",
  "Freshness",
  "Price range",
  "Exclusive or shared",
  "Suppression status",
  "Review state",
];

export const signalProducts = [
  {
    title: "Ecommerce Vendor Signal Pack",
    category: "Ecommerce",
    location: "United States",
    score: 87,
    confidence: "High",
    freshness: "7 days",
    releaseMode: "Review-gated shared",
    records: "4,800 sample set",
    buyerUseCase: "Agency, product sourcer, marketplace operator",
    sourceProof: "Sample rows, public source links, platform tags",
    suppression: "Checked before release",
    openQuestions: ["Which platform matters most?", "Is exclusive access needed?"],
    priceBand: "$149+",
  },
  {
    title: "Local Service Route Pack",
    category: "Local services",
    location: "City and county routes",
    score: 79,
    confidence: "Medium high",
    freshness: "14 days",
    releaseMode: "Named buyer request",
    records: "1,250 sample set",
    buyerUseCase: "Contractor, agency, local operator",
    sourceProof: "Directory source, submitted route, category tags",
    suppression: "Requires final contactability review",
    openQuestions: ["Which service radius matters?", "Does the buyer need exclusive territory?"],
    priceBand: "$99+",
  },
  {
    title: "AI Tool Launch Watchlist",
    category: "AI and SaaS",
    location: "Remote and English-language markets",
    score: 82,
    confidence: "Medium",
    freshness: "3 days",
    releaseMode: "Aggregated insight plus sample",
    records: "680 signal set",
    buyerUseCase: "SaaS agency, integration builder, automation shop",
    sourceProof: "Launch post, pricing page, traffic clue",
    suppression: "Aggregated by default",
    openQuestions: ["Which vertical is the strongest fit?", "Does pricing signal budget intent?"],
    priceBand: "$199+",
  },
  {
    title: "Website Money Leak Demand",
    category: "Business owners",
    location: "Local and online businesses",
    score: 84,
    confidence: "High",
    freshness: "Live intake",
    releaseMode: "One seller or named seller",
    records: "Live scored inquiries",
    buyerUseCase: "Web builder, AI automation shop, ads operator",
    sourceProof: "Questionnaire answers, URL review, event trail",
    suppression: "Consent and do-not-contact checked",
    openQuestions: ["What budget band is real?", "Which leak is most urgent?"],
    priceBand: "$249+",
  },
];

export const publicTools = [
  {
    title: "Lead Leak Audit",
    purpose: "Show a business owner where follow-up, forms, calls, DMs, and ads are losing opportunities.",
    collected: "Industry, current follow-up, budget band, pain, speed to lead",
    result: "Leak score and fix order",
    href: "/problem-intake",
    icon: Radar,
  },
  {
    title: "What Type of Leads Should You Buy?",
    purpose: "Help buyers choose a useful list instead of asking for vague volume.",
    collected: "Niche, target customer, location, urgency, desired exclusivity",
    result: "Recommended signal pack",
    href: "/buy-leads",
    icon: Store,
  },
  {
    title: "Business Signal Score",
    purpose: "Turn a messy lead-gen setup into a scorecard with next actions.",
    collected: "Website, ads, CRM, missed calls, response time, follow-up channels",
    result: "Signal readiness score",
    href: "/build-my-system",
    icon: Gauge,
  },
  {
    title: "Local Demand Finder",
    purpose: "Map local demand by city, category, service gap, and urgency.",
    collected: "City, category, service need, timing, search intent",
    result: "Local route map",
    href: "/buy-leads",
    icon: Globe2,
  },
  {
    title: "Ecommerce Growth Finder",
    purpose: "Find useful signals for ecommerce operators, vendors, and agencies.",
    collected: "Platform, product type, pain, revenue range, sourcing need",
    result: "Growth opportunity map",
    href: "/buy-leads",
    icon: PackageCheck,
  },
  {
    title: "AI Automation Readiness Score",
    purpose: "Identify tasks an AI agent should handle before the business buys more traffic.",
    collected: "Business type, repeated tasks, volume, budget band, handoff points",
    result: "Automation build path",
    href: "/build-my-system",
    icon: Bot,
  },
  {
    title: "Website Money Leak Checker",
    purpose: "Find what a page fails to answer before a visitor leaves.",
    collected: "URL, CTA, page goal, conversion path, problem areas",
    result: "Page fix map",
    href: "/offers/quick-look",
    icon: BarChart3,
  },
  {
    title: "Buyer Preference Signal Quiz",
    purpose: "Collect product, service, budget, and style preferences through useful recommendations.",
    collected: "Buying style, category interests, budget range, must-haves, dealbreakers",
    result: "Preference map",
    href: "/problem-intake",
    icon: Tags,
  },
];

export const profileModelFields = [
  {
    title: "Source proof",
    body: "Where the signal came from, when it was captured, whether it was submitted, public, permissioned, or questionnaire-based.",
    icon: FileText,
  },
  {
    title: "Confidence score",
    body: "A plain score backed by proof depth, freshness, specificity, contactability, and buyer fit.",
    icon: Gauge,
  },
  {
    title: "Buyer use case",
    body: "The reason a buyer would use the signal: outreach, research, route planning, demand report, or system build.",
    icon: Target,
  },
  {
    title: "Suppression status",
    body: "Do-not-contact, delete, opt-out, ADMT, and release restrictions travel with the record.",
    icon: LockKeyhole,
  },
  {
    title: "Tags and timestamps",
    body: "Vertical, location, source lane, freshness, score version, review state, and lifecycle stage.",
    icon: Tags,
  },
  {
    title: "Open questions",
    body: "What still needs review before the profile can be sold, routed, exported, or used in a model.",
    icon: Eye,
  },
];

export const dashboardReviewLanes = [
  {
    title: "Score",
    body: "Run quality, urgency, source depth, buyer fit, and contactability scoring without sensitive protected-trait inference.",
    icon: Gauge,
  },
  {
    title: "Tag",
    body: "Attach vertical, source lane, location band, use case, lifecycle stage, proof type, and confidence labels.",
    icon: Tags,
  },
  {
    title: "Approve",
    body: "Move reviewed records into sample, named buyer, exclusive, shared, or aggregate-only release modes.",
    icon: BadgeCheck,
  },
  {
    title: "Suppress",
    body: "Honor delete, do-not-contact, scoring opt-out, ADMT opt-out, consent limits, and partner restrictions.",
    icon: ShieldCheck,
  },
  {
    title: "Export",
    body: "Release only entitled fields, write export ledger rows, and block raw answers where access is summary-only.",
    icon: Inbox,
  },
  {
    title: "Route",
    body: "Send to one seller, multiple named sellers, marketplace request, or aggregated insight products.",
    icon: Route,
  },
];

export const privacyControls = [
  {
    title: "Consent mode",
    body: "One seller, multiple named sellers, anonymous insights, or no buyer routing until the user chooses a path.",
    icon: SlidersHorizontal,
  },
  {
    title: "Suppression",
    body: "Do-not-contact and deletion controls block partner views, exports, routing, and scoring jobs.",
    icon: ShieldCheck,
  },
  {
    title: "Data use",
    body: "Anonymous analytics stay separate from identified lead data and raw free text stays out of public analytics.",
    icon: DatabaseZap,
  },
  {
    title: "Audit trail",
    body: "Every collection, score, review, entitlement, export, delete request, and route decision needs a log entry.",
    icon: GitBranch,
  },
];
