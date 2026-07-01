import type { LucideIcon } from "lucide-react";
import {
  Ban,
  Binary,
  ClipboardCheck,
  DatabaseZap,
  FileSearch,
  Gauge,
  GitBranch,
  LockKeyhole,
  Radar,
  Route,
  ShieldCheck,
  Store,
  UserCheck
} from "lucide-react";

export type MachineTone = "lead" | "cyan" | "accent";

export type MachinePath = {
  icon: LucideIcon;
  title: string;
  body: string;
  href: string;
  cta: string;
  eventName: string;
  tone: MachineTone;
};

export type IntakeTool = {
  title: string;
  purpose: string;
  collected: string;
  vertical: string;
  output: string;
  route: string;
};

export type RoutingMode = {
  icon: LucideIcon;
  title: string;
  mode: string;
  consumerExpectation: string;
  buyerAccess: string;
  releaseGate: string;
};

export type ReviewGate = {
  icon: LucideIcon;
  title: string;
  body: string;
};

export const machinePaths: MachinePath[] = [
  {
    icon: Store,
    title: "Buy reviewed signals",
    body: "See sample products, choose industries, request access, and buy only after source context, confidence, and suppression status are clear.",
    href: "/buy-leads",
    cta: "Open buyer lane",
    eventName: "phase3_machine_buy_lane_click",
    tone: "accent"
  },
  {
    icon: DatabaseZap,
    title: "Build the lead machine",
    body: "Use LeadFlow to create quizzes, scorecards, follow-up logic, buyer routing, dashboards, and review gates inside a business.",
    href: "/build-my-system",
    cta: "Build my system",
    eventName: "phase3_machine_build_lane_click",
    tone: "cyan"
  },
  {
    icon: FileSearch,
    title: "Submit a source",
    body: "Send a list, route, audience, directory, marketplace clue, or demand pattern into review before it becomes a data product.",
    href: "/submit-source",
    cta: "Submit source",
    eventName: "phase3_machine_source_lane_click",
    tone: "lead"
  }
];

export const intakeTools: IntakeTool[] = [
  {
    title: "Lead Leak Audit",
    purpose: "Find where a business is losing inquiries it already earned.",
    collected: "Industry, current follow-up, budget range, urgency, primary pain",
    vertical: "Local business",
    output: "Leak score and follow-up map",
    route: "/problem-intake"
  },
  {
    title: "What Type of Leads Should You Buy?",
    purpose: "Qualify buyers before they request a list.",
    collected: "Niche, target customer, location, timeline, preferred buyer route",
    vertical: "Buyer marketplace",
    output: "Signal-pack fit and request brief",
    route: "/buy-leads"
  },
  {
    title: "Business Signal Score",
    purpose: "Score whether a company has enough capture, proof, and follow-up infrastructure.",
    collected: "Website, ads, CRM, missed calls, form path, response speed",
    vertical: "B2B services",
    output: "Machine readiness score",
    route: "/build-my-system"
  },
  {
    title: "Local Demand Finder",
    purpose: "Turn a city and service category into a reviewed opportunity brief.",
    collected: "City, service category, demand clue, seasonality, source context",
    vertical: "Local services",
    output: "Local demand brief",
    route: "/marketplace"
  },
  {
    title: "Ecommerce Growth Finder",
    purpose: "Find product, vendor, traffic, and marketplace gaps for ecommerce operators.",
    collected: "Platform, category, product type, growth pain, revenue range",
    vertical: "Ecommerce",
    output: "Ecommerce signal pack",
    route: "/buy-leads"
  },
  {
    title: "AI Automation Readiness Score",
    purpose: "Identify tasks an AI agent or automation can handle first.",
    collected: "Business type, repeated tasks, monthly volume, budget band, urgency",
    vertical: "AI and SaaS",
    output: "Automation readiness map",
    route: "/build-my-system"
  },
  {
    title: "Website Money Leak Checker",
    purpose: "Show what a page asks for, what it hides, and where a visitor stalls.",
    collected: "URL, CTA path, conversion blocker, offer clarity, follow-up gap",
    vertical: "Websites",
    output: "Website leak report",
    route: "/tools/seo-grader"
  },
  {
    title: "Mortgage Lead Readiness Tool",
    purpose: "Qualify mortgage or refi interest without collecting sensitive financial account data.",
    collected: "Loan interest type, state, timing, consented contact path, broad budget band",
    vertical: "Mortgage and refi",
    output: "Readiness and routing note",
    route: "/solutions/mortgage"
  },
  {
    title: "Political Issue Pulse",
    purpose: "Measure civic issue interest as anonymous or aggregated public opinion only.",
    collected: "Issue priority, public geography level, opinion bucket, anonymous event path",
    vertical: "Civic aggregate",
    output: "Aggregated issue pulse",
    route: "/marketplace"
  },
  {
    title: "Buyer Personality Signal Quiz",
    purpose: "Turn preferences into a useful shortlist while avoiding sensitive-trait targeting.",
    collected: "Buying style, category interest, budget band, timeline, dealbreakers",
    vertical: "Consumer shopping",
    output: "Preference map and fit score",
    route: "/problem-intake"
  }
];

export const routingModes: RoutingMode[] = [
  {
    icon: UserCheck,
    title: "One seller",
    mode: "exclusive_single_seller",
    consumerExpectation: "The person asked for help from one named business, or selected one named seller.",
    buyerAccess: "One buyer receives the routed lead while suppression, consent, and audit state stay attached.",
    releaseGate: "Active consent ledger row, no suppression, review status approved"
  },
  {
    icon: GitBranch,
    title: "Named sellers",
    mode: "named_multi_partner",
    consumerExpectation: "The person picked multiple named providers or accepted a named partner list.",
    buyerAccess: "Only the selected buyers can view permitted fields. Raw answers stay hidden unless the scope allows it.",
    releaseGate: "Named consent, partner entitlement, field-level access tier"
  },
  {
    icon: Binary,
    title: "Aggregated insight",
    mode: "aggregated_only",
    consumerExpectation: "The person contributed to a trend, calculator, score, or anonymous market pulse.",
    buyerAccess: "Buyers see grouped demand patterns, not names, contact details, raw free text, or profile IDs.",
    releaseGate: "Aggregation threshold, no direct identifiers, review-gated export"
  }
];

export const reviewGates: ReviewGate[] = [
  {
    icon: ShieldCheck,
    title: "Adult and category guard",
    body: "Block minors and reject sensitive categories before routing, scoring, export, or marketplace packaging."
  },
  {
    icon: ClipboardCheck,
    title: "Consent ledger",
    body: "Every permission has a scope, version, capture URL, named buyer when required, timestamp, and revocation path."
  },
  {
    icon: Radar,
    title: "Source proof",
    body: "Signals carry source type, source URL or sample proof, provenance, confidence, freshness, and open questions."
  },
  {
    icon: Ban,
    title: "Suppression check",
    body: "Do-not-contact, do-not-sell-share, deletion, and ADMT opt-out states must be checked before scoring or release."
  },
  {
    icon: Gauge,
    title: "Explainable score",
    body: "Lead quality, urgency, fit, and objection scores show which permitted fields affected the result."
  },
  {
    icon: LockKeyhole,
    title: "Review-gated export",
    body: "No buyer export should happen without an entitlement, allowed fields, audit entry, purpose, and expiration window."
  }
];

export const auditEvents = [
  "page_view",
  "quiz_started",
  "question_answered",
  "branch_entered",
  "dropoff_recorded",
  "consent_viewed",
  "consent_accepted",
  "seller_selected",
  "score_run_created",
  "suppression_checked",
  "lead_reviewed",
  "lead_routed",
  "lead_exported",
  "delete_request_submitted",
  "admt_opt_out_submitted"
];

export const machineRules = [
  "No hidden resale of personal data.",
  "No minors, protected-trait targeting, health data, financial-account data, hacked data, leaked data, or covert sensitive inference.",
  "Anonymous analytics stay separate from identified lead data.",
  "Named partner access requires named consent or an aggregated non-personal product.",
  "Deleted, suppressed, or ADMT-opted-out records do not enter scoring jobs or buyer views.",
  "Every buyer-facing product must show source context, confidence, freshness, suppression status, and review state."
];

export const phase3Milestones = [
  {
    label: "MVP",
    title: "Public lanes and review console",
    body: "Buyer lane, build lane, source submission, problem intake, safe scoring, and manual review queue."
  },
  {
    label: "Phase 2",
    title: "Partner routing and package sales",
    body: "Named seller consent, buyer entitlements, Stripe access, export ledger, and dashboard review workflows."
  },
  {
    label: "Phase 3",
    title: "Prediction, aggregation, and repeat tools",
    body: "Explainable scoring runs, anonymous insights products, vertical tool stack, source proof vault, and audited suppression workflows."
  }
];

export const machineMetrics = [
  { value: "10", label: "intake tools" },
  { value: "3", label: "routing modes" },
  { value: "15", label: "audit events" },
  { value: "0", label: "hidden resale" }
];
