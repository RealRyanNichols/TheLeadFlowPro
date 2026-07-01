import type { ConfidenceLevel, SignalStatus } from "@/components/leadflow-system";

export type SourceProofLink = {
  label: string;
  href: string;
  type: string;
  status: "verified" | "review" | "sample";
  description: string;
};

export type LeadSignalInsight = {
  label: string;
  value: string;
  score: number;
  explanation: string;
  fieldsUsed: string[];
  fieldsMissing: string[];
};

export type BuyerFitNote = {
  label: string;
  value: string;
  detail: string;
};

export type ComplianceCheck = {
  label: string;
  status: SignalStatus;
  description: string;
};

export type ProfileHistoryEntry = {
  date: string;
  label: string;
  detail: string;
  status: SignalStatus;
};

export type LeadProfileScoreBreakdown = {
  key: string;
  label: string;
  score: number;
  scoreLabel: string;
  explanation: string;
  confidence: ConfidenceLevel;
  fieldsUsed: string[];
  fieldsMissing: string[];
};

export type LeadProfileSourceProofRecord = {
  id: string;
  sourceUrl: string;
  sourceTitle: string;
  sourceType: string;
  foundDate: string;
  verifiedDate: string;
  proofSnippet: string;
  status: string;
  confidence: ConfidenceLevel;
  screenshotUrl?: string | null;
  adminNotes?: string | null;
  buyerVisible: boolean;
};

export type LeadProfileSignalRecord = {
  id: string;
  signalType: string;
  tag: string;
  value: string;
  timestamp: string;
  source: string;
  confidence: ConfidenceLevel;
  explanation: string;
};

export type LeadProfileBuyerFitRecord = {
  bestBuyerTypes: string[];
  matchingIndustries: string[];
  estimatedValueCategory: string;
  urgencyCategory: string;
  suggestedServiceOrProductFit: string[];
  disqualifiers: string[];
  openQuestions: string[];
};

export type LeadProfileComplianceRecord = {
  consentStatus: string;
  suppressionStatus: string;
  doNotContactStatus: string;
  sourceType: string;
  allowedUse: string[];
  restrictedUse: string[];
  reviewStatus: string;
  exportEligibility: string;
  notes: string[];
};

export type LeadProfileHistoryRecord = {
  id: string;
  eventType: string;
  label: string;
  detail: string;
  timestamp: string;
  actor: string;
  status: string;
};

export type LeadProfileDetail = {
  id: string;
  title: string;
  category: string;
  vertical: string;
  leadScore: number;
  confidence: ConfidenceLevel;
  sourceType: string;
  sourceProofLinks: SourceProofLink[];
  summary: string;
  whyThisProfileExists: string;
  bestBuyerType: string;
  buyerUseCase: string;
  contactRouteHints: string[];
  consentStatus: string;
  suppressionStatus: SignalStatus;
  lastVerifiedDate: string;
  openQuestions: string[];
  recommendedNextAction: string;
  releaseMode: string;
  priceBand: string;
  sampleCount: string;
  tags: string[];
  signals: LeadSignalInsight[];
  buyerFit: BuyerFitNote[];
  complianceChecks: ComplianceCheck[];
  history: ProfileHistoryEntry[];
};

export type ProtectedLeadProfileDetail = LeadProfileDetail & {
  freshnessLabel: string;
  sourceProofStatus: string;
  reviewStatus: string;
  missingInformation: string[];
  riskCautionNote: string;
  keyFacts: string[];
  suggestedOfferAngle: string;
  recommendedOutreachPath: string;
  notes: string[];
  scoreBreakdown: LeadProfileScoreBreakdown[];
  sourceProofRecords: LeadProfileSourceProofRecord[];
  signalRecords: LeadProfileSignalRecord[];
  buyerFitRecord: LeadProfileBuyerFitRecord;
  complianceRecord: LeadProfileComplianceRecord;
  historyRecords: LeadProfileHistoryRecord[];
  exportAllowed: boolean;
};

const standardComplianceChecks: ComplianceCheck[] = [
  {
    label: "Suppression check",
    status: "review",
    description: "Profile must clear do-not-contact, delete, and suppression controls before buyer release.",
  },
  {
    label: "Source review",
    status: "sampleAvailable",
    description: "Source context is visible in sample form, while private raw answers remain withheld until approval.",
  },
  {
    label: "Buyer-use review",
    status: "approved",
    description: "Release is limited to the stated buyer use case, permitted vertical, and entitlement level.",
  },
];

const standardHistory = (lastVerifiedDate: string): ProfileHistoryEntry[] => [
  {
    date: lastVerifiedDate,
    label: "Verification refresh",
    detail: "Source proof, freshness, suppression status, and buyer-fit notes were checked for release readiness.",
    status: "sampleAvailable",
  },
  {
    date: "June 25, 2026",
    label: "Scoring pass",
    detail: "Intent, source proof, freshness, buyer fit, contactability, and compliance-readiness scores were recalculated.",
    status: "review",
  },
  {
    date: "June 20, 2026",
    label: "Profile created",
    detail: "Signal was normalized into a review-gated profile with open questions and buyer-use controls.",
    status: "submitted",
  },
];

function proof(
  label: string,
  type: string,
  description: string,
  status: SourceProofLink["status"] = "sample",
  href = "/profile-model",
): SourceProofLink {
  return { label, type, description, status, href };
}

function signal(
  label: string,
  value: string,
  score: number,
  explanation: string,
  fieldsUsed: string[],
  fieldsMissing: string[] = [],
): LeadSignalInsight {
  return { label, value, score, explanation, fieldsUsed, fieldsMissing };
}

export const leadProfileDetails: LeadProfileDetail[] = [
  {
    id: "ecommerce-vendor-signal-pack",
    title: "Ecommerce Vendor Signal Pack",
    category: "Ecommerce",
    vertical: "Ecommerce and marketplace sourcing",
    leadScore: 87,
    confidence: "high",
    sourceType: "Public marketplace plus platform tags",
    sourceProofLinks: [
      proof("Sample source map", "Sample rows", "Redacted sample rows show vendor category, platform clue, public source label, and freshness bucket."),
      proof("Platform tag review", "Public source", "Tags group vendors by product lane, marketplace context, and buyer-use fit without exposing private account access.", "verified"),
      proof("Suppression review", "Release control", "Release is blocked if a source, person, or business has a matching suppression request.", "review", "/privacy-center"),
    ],
    summary: "A scored set of ecommerce vendor opportunities built from source-backed marketplace signals, public platform clues, and category tags.",
    whyThisProfileExists: "Buyers keep wasting time on vendor lists with no proof, no freshness, and no reason to believe the opportunity still exists. This profile exists because the source path, category fit, and buyer-use case are strong enough for sample review.",
    bestBuyerType: "Agency, product sourcer, marketplace operator",
    buyerUseCase: "Use the sample to find vendor categories, product sourcing lanes, and marketplace opportunities worth deeper manual review.",
    contactRouteHints: [
      "Start with business-facing public contact routes, not personal accounts.",
      "Reference the product category and platform context in the first message.",
      "Use a source-backed offer, sample audit, or sourcing fit question instead of a cold list blast.",
    ],
    consentStatus: "Source-backed profile with release review before any buyer entitlement.",
    suppressionStatus: "sampleAvailable",
    lastVerifiedDate: "July 1, 2026",
    openQuestions: [
      "Which ecommerce category should be exclusive first?",
      "Does the buyer need product sourcing, ads help, or acquisition targets?",
      "Which platform tag has the clearest purchase intent?",
    ],
    recommendedNextAction: "Request a redacted sample, choose the ecommerce lane, then request buyer-use approval.",
    releaseMode: "Review-gated shared access",
    priceBand: "$149 to $499",
    sampleCount: "4,800 sample rows",
    tags: ["vendor", "marketplace", "product sourcing", "review gated"],
    signals: [
      signal("Intent score", "High", 88, "Multiple marketplace and category clues point to a useful sourcing or agency conversation.", ["category tag", "platform clue", "freshness bucket", "buyer use case"], ["exclusive territory preference"]),
      signal("Source proof score", "Strong", 91, "The sample has public source labels and proof notes attached before release.", ["source label", "sample row", "review status"]),
      signal("Contactability score", "Medium high", 76, "Public business routes appear usable, but direct outreach details stay gated until approval.", ["business route hint", "suppression check"], ["approved contact path"]),
    ],
    buyerFit: [
      { label: "Best first buyer", value: "Ecommerce operator", detail: "Best fit when the buyer can turn vendor and category clues into sourcing, wholesale, or marketplace conversations." },
      { label: "Strong secondary buyer", value: "Agency", detail: "Useful for agencies that sell catalog cleanup, marketplace growth, sourcing support, or operator outreach." },
      { label: "Weak fit", value: "Generic cold email sender", detail: "This product is proof-first. It should not be treated as a blind outbound list." },
    ],
    complianceChecks: standardComplianceChecks,
    history: standardHistory("July 1, 2026"),
  },
  {
    id: "local-service-route-signal",
    title: "Local Service Route Signal",
    category: "Local services",
    vertical: "Local service demand and territory routing",
    leadScore: 79,
    confidence: "medium",
    sourceType: "Directory plus submitted route",
    sourceProofLinks: [
      proof("Route notes", "Submitted source", "Submitted territory context with category, city, and service-area notes.", "review"),
      proof("Directory context", "Public source", "Public category and service-area clues used to validate the route."),
      proof("Release gate", "Suppression control", "Buyer access waits for review, suppression, and permitted-use checks.", "review", "/privacy-center"),
    ],
    summary: "A local route signal for service operators who need territory context, category demand, and follow-up opportunities before choosing a market.",
    whyThisProfileExists: "Local buyers need to know where demand is likely rising and whether a route is worth calling on. This profile turns route notes, public directory context, and category demand into a usable review package.",
    bestBuyerType: "Contractor, agency, local operator",
    buyerUseCase: "Use the profile to select a territory, validate category demand, and plan a compliant local follow-up sequence.",
    contactRouteHints: [
      "Use business directory routes and public company contact paths.",
      "Lead with the service-area problem or response-time gap.",
      "Avoid personal household targeting unless the consumer has submitted a named request.",
    ],
    consentStatus: "Submitted route data is review-gated and source-labeled before buyer access.",
    suppressionStatus: "review",
    lastVerifiedDate: "June 29, 2026",
    openQuestions: [
      "Which service radius should be priced separately?",
      "Does the buyer need shared access or exclusive territory?",
      "Which category has the clearest urgent demand?",
    ],
    recommendedNextAction: "Request route sample, confirm service radius, and choose shared or exclusive access review.",
    releaseMode: "Named buyer request",
    priceBand: "$99 to $299",
    sampleCount: "1,250 sample rows",
    tags: ["local services", "route", "territory", "suppression review"],
    signals: [
      signal("Urgency score", "Medium high", 78, "Directory gaps and submitted route notes suggest a real local follow-up window.", ["route note", "directory gap", "category"], ["live call outcome"]),
      signal("Freshness score", "Medium", 70, "The profile is recent, but route signals need short refresh cycles.", ["last verified date", "freshness bucket"]),
      signal("Buyer fit score", "Strong", 84, "Best fit is clear for contractors and local agencies with defined territory coverage.", ["buyer type", "location scope", "service category"]),
    ],
    buyerFit: [
      { label: "Best first buyer", value: "Local contractor", detail: "Strongest when the buyer can act inside a defined city, county, or service radius." },
      { label: "Second buyer lane", value: "Local agency", detail: "Useful for agencies that build local SEO, paid search, and speed-to-lead systems." },
      { label: "Access caution", value: "Route conflict", detail: "Exclusive requests need conflict review before another buyer gets overlapping access." },
    ],
    complianceChecks: standardComplianceChecks,
    history: standardHistory("June 29, 2026"),
  },
  {
    id: "ai-tool-launch-signal",
    title: "AI Tool Launch Signal",
    category: "AI and SaaS",
    vertical: "AI tools, SaaS launches, and integration demand",
    leadScore: 82,
    confidence: "medium",
    sourceType: "Launch page plus pricing clue",
    sourceProofLinks: [
      proof("Launch proof packet", "Public launch clue", "Launch page, pricing clue, and public positioning context are grouped for review."),
      proof("Pricing-page context", "Public page", "Pricing and packaging clues help identify integration or setup need.", "verified"),
      proof("Aggregate-first release", "Privacy control", "Default release is aggregate insight unless a named business route is approved.", "review", "/privacy-center"),
    ],
    summary: "A watchlist of AI and SaaS launches with pricing, positioning, and adoption clues that point to integration or implementation demand.",
    whyThisProfileExists: "AI builders and agencies need to know which launches are likely to need setup, integration, distribution, or automation help. This profile turns launch clues into a buyer-readable opportunity map.",
    bestBuyerType: "SaaS agency, integration builder, automation shop",
    buyerUseCase: "Use the profile to find tools needing integrations, setup workflows, sales enablement, onboarding, or distribution support.",
    contactRouteHints: [
      "Use business-facing founder or support routes listed publicly by the company.",
      "Reference the public launch, pricing, or integration gap.",
      "Offer a concrete implementation idea, not a generic AI pitch.",
    ],
    consentStatus: "Aggregate insight first, named release only after source and use-case review.",
    suppressionStatus: "approved",
    lastVerifiedDate: "July 1, 2026",
    openQuestions: [
      "Which integration category is most valuable?",
      "Is this best sold as aggregate insight or named source-backed opportunities?",
      "Which launch signal predicts follow-up need best?",
    ],
    recommendedNextAction: "Open the aggregate sample, choose a use case, then request named-source review if needed.",
    releaseMode: "Aggregated insight plus sample",
    priceBand: "$199 to $699",
    sampleCount: "680 signal rows",
    tags: ["AI", "SaaS", "launch", "integration"],
    signals: [
      signal("Revenue potential score", "Medium high", 80, "Pricing and launch context suggest there may be paid implementation or distribution work.", ["pricing clue", "launch category", "buyer use case"], ["conversion outcome"]),
      signal("Source proof score", "Medium high", 83, "Public launch and pricing context are attachable, but adoption depth requires follow-up.", ["launch page", "pricing page", "traffic clue"], ["confirmed buyer need"]),
      signal("Compliance readiness score", "High", 90, "The profile can remain aggregate-first unless a named business release is approved.", ["aggregate mode", "source label", "suppression status"]),
    ],
    buyerFit: [
      { label: "Best first buyer", value: "Integration builder", detail: "Strong when the buyer can turn public launch pain into setup, API, onboarding, or workflow help." },
      { label: "Good buyer", value: "SaaS agency", detail: "Good fit for agencies that build go-to-market assets, onboarding, demos, and partner integrations." },
      { label: "Access limit", value: "Aggregate by default", detail: "Named release should be approved only when source proof and outreach route are business-facing." },
    ],
    complianceChecks: standardComplianceChecks,
    history: standardHistory("July 1, 2026"),
  },
  {
    id: "real-estate-agent-opportunity-map",
    title: "Real Estate Agent Opportunity Map",
    category: "Real estate",
    vertical: "Real estate operator and brokerage growth",
    leadScore: 76,
    confidence: "medium",
    sourceType: "Public listing pattern",
    sourceProofLinks: [
      proof("Market movement sample", "Public listing pattern", "Redacted market pattern shows listing movement and coverage gaps."),
      proof("Agent coverage notes", "Public source", "Public coverage indicators are grouped by territory and category.", "review"),
      proof("Use-case gate", "Review control", "Release cannot imitate or reference unrelated trademarked lead-intake brands.", "verified", "/profile-model"),
    ],
    summary: "A real estate opportunity map built around public market movement, agent coverage gaps, and buyer-use review.",
    whyThisProfileExists: "Brokerages and agent teams need territory intelligence without hidden owner dossiers or copied competitor framing. This profile packages public movement and coverage clues into a review-gated signal.",
    bestBuyerType: "Brokerage, agent team, CRM operator",
    buyerUseCase: "Use the profile to choose territories, identify service gaps, and build compliant follow-up campaigns around public market context.",
    contactRouteHints: [
      "Use brokerage-facing or business-facing contact paths.",
      "Reference territory coverage, market movement, or service gaps.",
      "Do not route sensitive financial or household-level assumptions without explicit consumer intake.",
    ],
    consentStatus: "Public market intelligence with no hidden private owner dossier release.",
    suppressionStatus: "review",
    lastVerifiedDate: "June 27, 2026",
    openQuestions: [
      "Which metro should be broken into territories?",
      "Does the buyer want agent recruitment, seller demand, or CRM cleanup?",
      "Should the first release stay aggregate only?",
    ],
    recommendedNextAction: "Request the territory sample and select a compliant brokerage use case.",
    releaseMode: "Exclusive or aggregate by territory",
    priceBand: "$249 to $799",
    sampleCount: "920 sample rows",
    tags: ["real estate", "territory", "brokerage", "public market"],
    signals: [
      signal("Buyer fit score", "Medium high", 78, "The buyer fit is clear for brokerages, but the use case must be narrowed before release.", ["territory", "buyer type", "public pattern"], ["named use case"]),
      signal("Compliance readiness score", "Medium", 68, "Real estate release needs tighter review because buyer expectations vary by use case.", ["review gate", "source type", "suppression status"], ["approved partner use case"]),
      signal("Freshness score", "Medium", 72, "Market movement ages quickly and should be refreshed before exclusive access.", ["last verified date", "listing movement bucket"]),
    ],
    buyerFit: [
      { label: "Best first buyer", value: "Brokerage operator", detail: "Useful when the buyer needs territory, recruiting, CRM, or service-gap intelligence." },
      { label: "Secondary buyer", value: "Agent team", detail: "Good fit when an agent team can act within a defined territory and permitted route." },
      { label: "Release caution", value: "No hidden owner dossiers", detail: "This profile should stay market-context first unless a consumer directly submits a request." },
    ],
    complianceChecks: standardComplianceChecks,
    history: standardHistory("June 27, 2026"),
  },
  {
    id: "contractor-demand-signal",
    title: "Contractor Demand Signal",
    category: "Home services",
    vertical: "Contractor and home-service demand",
    leadScore: 84,
    confidence: "high",
    sourceType: "Public demand clue",
    sourceProofLinks: [
      proof("Demand clue sample", "Public source", "Category demand, review gaps, and service-area clues grouped for buyer review."),
      proof("Directory gap review", "Public source", "Business listings and category gaps show where follow-up systems may be weak.", "verified"),
      proof("Home-service controls", "Compliance control", "Household-level routing requires direct consumer intake or approved business route.", "review", "/privacy-center"),
    ],
    summary: "A contractor demand signal built from public demand clues, directory gaps, review patterns, and service-category opportunity notes.",
    whyThisProfileExists: "Contractors often miss demand because they chase attention without knowing where service gaps exist. This profile shows where category interest and follow-up gaps may justify outreach or a local campaign.",
    bestBuyerType: "Roofing, HVAC, plumbing, remodeling, restoration",
    buyerUseCase: "Use the profile to prioritize service categories, local ad angles, route coverage, and follow-up automation opportunities.",
    contactRouteHints: [
      "Use public business and service-area routes.",
      "Lead with the category problem, response gap, or maintenance need.",
      "Route individual homeowner requests only through explicit intake and named consent.",
    ],
    consentStatus: "Public demand signal with explicit consumer intake required for person-level routing.",
    suppressionStatus: "sampleAvailable",
    lastVerifiedDate: "June 30, 2026",
    openQuestions: [
      "Which trade should get first release?",
      "Which market needs exclusive access?",
      "Is the buyer prepared for same-day follow-up?",
    ],
    recommendedNextAction: "Request the service-category sample and confirm the buyer can follow up fast enough.",
    releaseMode: "Shared or exclusive by territory",
    priceBand: "$199 to $599",
    sampleCount: "2,400 sample rows",
    tags: ["contractor", "home services", "local demand", "speed to lead"],
    signals: [
      signal("Urgency score", "High", 86, "Service demand and response gaps point to a timely buyer opportunity.", ["category demand", "directory gap", "freshness bucket"]),
      signal("Buyer fit score", "High", 88, "The buyer lane is specific and actionable for local operators.", ["trade category", "territory", "buyer type"]),
      signal("Contactability score", "Medium", 70, "Business routes are usable, but individual consumer routes require direct intake.", ["business route", "suppression check"], ["named consumer consent"]),
    ],
    buyerFit: [
      { label: "Best first buyer", value: "Fast-response contractor", detail: "Best for operators with phone coverage, quoting ability, and a clear service area." },
      { label: "Agency fit", value: "Home-service growth shop", detail: "Useful for teams that build landing pages, ads, call tracking, and missed-call follow-up." },
      { label: "Weak fit", value: "Slow follow-up team", detail: "Demand signals decay when the buyer cannot respond quickly." },
    ],
    complianceChecks: standardComplianceChecks,
    history: standardHistory("June 30, 2026"),
  },
  {
    id: "creator-audience-signal",
    title: "Creator Audience Signal",
    category: "Creator and influencer",
    vertical: "Creator audience fit and brand partnership",
    leadScore: 73,
    confidence: "medium",
    sourceType: "Public channel and category tags",
    sourceProofLinks: [
      proof("Public channel tags", "Public source", "Creator category, audience fit, and content-lane notes grouped for brand review."),
      proof("Audience-fit notes", "Review note", "Audience notes are category-based and do not include protected-trait targeting.", "review"),
      proof("Brand-use limit", "Privacy control", "Release is limited to business partnership fit and aggregate audience context.", "verified", "/privacy-center"),
    ],
    summary: "A creator audience signal for brands and agencies that need category fit, public channel context, and partnership clues without private identity records.",
    whyThisProfileExists: "Brands waste time on creator lists that do not show why the audience fits. This profile packages public channel clues, category tags, and proof notes so buyers can decide whether a partnership conversation makes sense.",
    bestBuyerType: "Brand, affiliate manager, agency, newsletter operator",
    buyerUseCase: "Use the profile to shortlist creator categories, partnership angles, affiliate offers, and audience-fit hypotheses.",
    contactRouteHints: [
      "Use public creator business inquiry routes.",
      "Reference the public content lane and the brand-fit reason.",
      "Avoid protected-trait, minor, or private personal targeting.",
    ],
    consentStatus: "Public business-channel context only, with protected-trait targeting excluded.",
    suppressionStatus: "approved",
    lastVerifiedDate: "June 25, 2026",
    openQuestions: [
      "Which brand category has the strongest fit?",
      "Is affiliate, sponsorship, or newsletter growth the first use case?",
      "Should this remain aggregate unless a public business route is clear?",
    ],
    recommendedNextAction: "Review the public channel sample, choose the brand-fit lane, then request access.",
    releaseMode: "Shared brand-fit signal",
    priceBand: "$99 to $399",
    sampleCount: "1,100 sample rows",
    tags: ["creator", "brand fit", "public channel", "affiliate"],
    signals: [
      signal("Intent score", "Medium", 72, "Public content and channel positioning suggest partnership potential, not confirmed purchase intent.", ["public channel", "category tag", "buyer use case"], ["confirmed brand interest"]),
      signal("Source proof score", "Medium high", 79, "Public channel proof is attachable, but audience quality still needs buyer-side review.", ["channel tag", "content lane", "review note"]),
      signal("Compliance readiness score", "High", 92, "The profile excludes protected-trait targeting and keeps release to public business partnership context.", ["public route", "protected-trait exclusion", "release mode"]),
    ],
    buyerFit: [
      { label: "Best first buyer", value: "Brand partnership team", detail: "Best when the buyer has a specific audience category and a real offer to test." },
      { label: "Agency fit", value: "Creator marketing agency", detail: "Useful for agencies that need source-backed shortlists instead of bulk creator spreadsheets." },
      { label: "Release caution", value: "Public channel only", detail: "No private identity enrichment or sensitive audience inference should be added." },
    ],
    complianceChecks: standardComplianceChecks,
    history: standardHistory("June 25, 2026"),
  },
  {
    id: "website-neglect-signal",
    title: "Website Neglect Signal",
    category: "Business owners",
    vertical: "Website conversion and follow-up systems",
    leadScore: 88,
    confidence: "high",
    sourceType: "Website audit plus questionnaire intake",
    sourceProofLinks: [
      proof("Questionnaire path", "First-party intake", "Problem, website, follow-up, and budget-band answers are captured through a tool flow.", "verified"),
      proof("Page review sample", "Website audit", "CTA, form, speed-to-lead, and route gaps are scored from the submitted website."),
      proof("Consent ledger", "Consent control", "Named routing requires consent scope and release mode before buyer entitlement.", "review", "/privacy-center"),
    ],
    summary: "A high-intent signal built from business-owner problem intake, website review, missed-follow-up clues, and conversion-path gaps.",
    whyThisProfileExists: "Some businesses already have attention but lose it through weak forms, slow follow-up, bad CTAs, or no routing. This profile exists because the problem is visible and the buyer path is clear.",
    bestBuyerType: "Web builder, ads operator, AI automation shop",
    buyerUseCase: "Use the profile to offer a website fix, AI agent, missed-call recovery, CRM routing, or follow-up automation system.",
    contactRouteHints: [
      "Use the submitted business contact route only under the approved consent scope.",
      "Lead with the exact leak found in the audit.",
      "Offer the next fix before pitching a full system.",
    ],
    consentStatus: "First-party intake, value shown before identity capture, named routing only after consent.",
    suppressionStatus: "sampleAvailable",
    lastVerifiedDate: "July 1, 2026",
    openQuestions: [
      "Which leak costs the most money right now?",
      "Does the buyer want the website fix or full lead machine?",
      "Which consent mode should route this profile?",
    ],
    recommendedNextAction: "Request sample, confirm the website leak, and route to a buyer that can fix follow-up first.",
    releaseMode: "One seller or named seller",
    priceBand: "$249 to $899",
    sampleCount: "Live scored inquiries",
    tags: ["website audit", "first-party intake", "follow-up", "AI automation"],
    signals: [
      signal("Intent score", "High", 90, "The visitor submitted a business problem and received a website leak score before identity capture.", ["tool slug", "submitted URL", "problem category", "budget band"]),
      signal("Contactability score", "High", 86, "The profile can route through the submitted business path if consent scope is approved.", ["identity capture", "consent status", "business route"], ["named seller selection"]),
      signal("Compliance readiness score", "High", 89, "The profile is strongest when routed through a named consent mode and suppression check.", ["consent scope", "suppression status", "source URL"]),
    ],
    buyerFit: [
      { label: "Best first buyer", value: "Web and automation operator", detail: "Best when the buyer can fix website capture, missed calls, forms, and follow-up in one system." },
      { label: "Ads buyer fit", value: "Paid traffic operator", detail: "Good if the buyer can prove the funnel catches traffic before scaling spend." },
      { label: "Immediate fix", value: "Speed to lead", detail: "The strongest first action is usually routing, reply speed, and a cleaner CTA." },
    ],
    complianceChecks: standardComplianceChecks,
    history: standardHistory("July 1, 2026"),
  },
  {
    id: "mortgage-refi-interest-signal",
    title: "Mortgage Refi Interest Signal",
    category: "Mortgage and refi",
    vertical: "Mortgage and refinance inquiry routing",
    leadScore: 81,
    confidence: "high",
    sourceType: "Consented questionnaire",
    sourceProofLinks: [
      proof("Named consent path", "First-party intake", "Consumer-facing intake must show named seller or approved partner route before release.", "review"),
      proof("Inquiry context sample", "Questionnaire sample", "Loan-interest category, timing, and follow-up preference are shown in redacted sample form."),
      proof("Licensed-partner gate", "Compliance control", "Access is limited to licensed mortgage teams or approved refi partners.", "verified", "/privacy-center"),
    ],
    summary: "A mortgage/refi interest profile that stays consent-led, licensed-partner gated, and suppression-checked before any routing.",
    whyThisProfileExists: "Mortgage and refi buyers need actual inquiry context, not blind personal lists. This profile exists when a user gives a permitted interest signal and the routing path matches the consent language.",
    bestBuyerType: "Licensed mortgage team or approved refi partner",
    buyerUseCase: "Use the profile to start a compliant follow-up conversation based on stated interest, timing, and preferred contact route.",
    contactRouteHints: [
      "Only route to licensed or approved partners inside the permitted service area.",
      "Use the consented contact method and timing preference.",
      "Do not use private financial account data or infer protected traits.",
    ],
    consentStatus: "Named or approved-partner consent required before release.",
    suppressionStatus: "review",
    lastVerifiedDate: "July 1, 2026",
    openQuestions: [
      "Which licensed partner should be named in the consent flow?",
      "Is the consumer asking for refinance, purchase, or education?",
      "What state and license coverage applies before routing?",
    ],
    recommendedNextAction: "Confirm license coverage, named consent, and suppression status before any buyer access.",
    releaseMode: "Named buyer only",
    priceBand: "$299 to $999",
    sampleCount: "Live consented inquiries",
    tags: ["mortgage", "refi", "named consent", "licensed partner"],
    signals: [
      signal("Urgency score", "Medium high", 82, "Stated timing and inquiry type can support fast follow-up when consent and license gates clear.", ["timing bucket", "loan interest type", "contact preference"], ["licensed partner assignment"]),
      signal("Compliance readiness score", "Medium high", 78, "The profile is usable only after named consent, suppression, and licensing checks are complete.", ["consent scope", "suppression status", "vertical"], ["license coverage"]),
      signal("Contactability score", "High", 85, "The contact route can be clear when the consumer has selected a permitted follow-up path.", ["contact preference", "consent status"], ["final partner entitlement"]),
    ],
    buyerFit: [
      { label: "Best first buyer", value: "Licensed mortgage partner", detail: "Only suitable for buyers with license coverage and a matching consent path." },
      { label: "Education lane", value: "Mortgage team", detail: "Good when the first conversation is informational and consistent with the stated user request." },
      { label: "Release caution", value: "Named consent required", detail: "No blind resale, no hidden routing, and no private financial account data." },
    ],
    complianceChecks: [
      ...standardComplianceChecks,
      {
        label: "Licensed-partner gate",
        status: "review",
        description: "Mortgage/refi access requires license coverage, named or approved partner consent, and audit logging.",
      },
    ],
    history: standardHistory("July 1, 2026"),
  },
];

export function getLeadProfileDetail(id: string) {
  return leadProfileDetails.find((profile) => profile.id === id) ?? null;
}

export function getLeadProfileIds() {
  return leadProfileDetails.map((profile) => profile.id);
}

function scoreLabel(score: number) {
  if (score >= 85) return "High";
  if (score >= 70) return "Medium high";
  if (score >= 55) return "Medium";
  return "Low";
}

function confidenceForScore(score: number): ConfidenceLevel {
  if (score >= 84) return "high";
  if (score >= 65) return "medium";
  return "low";
}

function scoreFromSignal(profile: LeadProfileDetail, search: string, fallback: number) {
  const found = profile.signals.find((item) => item.label.toLowerCase().includes(search.toLowerCase()));
  return found?.score ?? Math.max(0, Math.min(100, fallback));
}

function scoreExplanation(profile: LeadProfileDetail, search: string, fallback: string) {
  const found = profile.signals.find((item) => item.label.toLowerCase().includes(search.toLowerCase()));
  return found?.explanation ?? fallback;
}

function fieldsUsed(profile: LeadProfileDetail, search: string, fallback: string[]) {
  const found = profile.signals.find((item) => item.label.toLowerCase().includes(search.toLowerCase()));
  return found?.fieldsUsed?.length ? found.fieldsUsed : fallback;
}

function fieldsMissing(profile: LeadProfileDetail, search: string, fallback: string[]) {
  const found = profile.signals.find((item) => item.label.toLowerCase().includes(search.toLowerCase()));
  return found?.fieldsMissing?.length ? found.fieldsMissing : fallback;
}

function scoreBreakdownItem(
  profile: LeadProfileDetail,
  key: string,
  label: string,
  score: number,
  explanation: string,
  used: string[],
  missing: string[],
): LeadProfileScoreBreakdown {
  return {
    key,
    label,
    score,
    scoreLabel: scoreLabel(score),
    explanation,
    confidence: confidenceForScore(score),
    fieldsUsed: used,
    fieldsMissing: missing,
  };
}

function buildScoreBreakdown(profile: LeadProfileDetail): LeadProfileScoreBreakdown[] {
  const sourceProofScore = scoreFromSignal(profile, "Source proof", Math.round(profile.leadScore * 0.95));
  const complianceScore = scoreFromSignal(profile, "Compliance", Math.round(profile.leadScore * 0.9));
  const buyerFitScore = scoreFromSignal(profile, "Buyer fit", Math.round(profile.leadScore * 0.97));
  const contactabilityScore = scoreFromSignal(profile, "Contactability", Math.round(profile.leadScore * 0.86));
  const urgencyScore = scoreFromSignal(profile, "Urgency", Math.round(profile.leadScore * 0.9));
  const revenueScore = scoreFromSignal(profile, "Revenue", Math.round(profile.leadScore * 0.88));
  const freshnessScore = scoreFromSignal(profile, "Freshness", Math.round(profile.leadScore * 0.92));

  return [
    scoreBreakdownItem(
      profile,
      "intent",
      "Intent score",
      scoreFromSignal(profile, "Intent", profile.leadScore),
      scoreExplanation(profile, "Intent", "The profile has enough source context, category fit, and buyer-use clarity to justify review."),
      fieldsUsed(profile, "Intent", ["category", "source context", "buyer use case", "tags"]),
      fieldsMissing(profile, "Intent", ["confirmed buying timeline"]),
    ),
    scoreBreakdownItem(
      profile,
      "urgency",
      "Urgency score",
      urgencyScore,
      scoreExplanation(profile, "Urgency", "Freshness and problem timing suggest a real follow-up window, but urgency should be rechecked before release."),
      fieldsUsed(profile, "Urgency", ["last verified date", "source type", "problem category"]),
      fieldsMissing(profile, "Urgency", ["live response outcome"]),
    ),
    scoreBreakdownItem(
      profile,
      "source_proof",
      "Source proof score",
      sourceProofScore,
      scoreExplanation(profile, "Source proof", "Source labels, proof notes, and review status are attached before buyer release."),
      fieldsUsed(profile, "Source proof", ["source proof links", "review status", "proof snippets"]),
      fieldsMissing(profile, "Source proof", ["fresh screenshot capture"]),
    ),
    scoreBreakdownItem(
      profile,
      "freshness",
      "Freshness score",
      freshnessScore,
      scoreExplanation(profile, "Freshness", "The profile has a recent verification date, but some source signals decay and need refresh before export."),
      fieldsUsed(profile, "Freshness", ["last verified date", "freshness label", "source timestamp"]),
      fieldsMissing(profile, "Freshness", ["same-day source recrawl"]),
    ),
    scoreBreakdownItem(
      profile,
      "buyer_fit",
      "Buyer fit score",
      buyerFitScore,
      scoreExplanation(profile, "Buyer fit", "The best buyer type and use case are clear enough for a serious access request."),
      fieldsUsed(profile, "Buyer fit", ["best buyer type", "buyer use case", "matching vertical"]),
      fieldsMissing(profile, "Buyer fit", ["buyer-specific eligibility rules"]),
    ),
    scoreBreakdownItem(
      profile,
      "contactability",
      "Contactability score",
      contactabilityScore,
      scoreExplanation(profile, "Contactability", "Business-facing contact route hints are available, while restricted personal routes stay gated."),
      fieldsUsed(profile, "Contactability", ["contact route hints", "source type", "consent status"]),
      fieldsMissing(profile, "Contactability", ["approved direct contact field"]),
    ),
    scoreBreakdownItem(
      profile,
      "compliance_readiness",
      "Compliance readiness score",
      complianceScore,
      scoreExplanation(profile, "Compliance", "Release depends on source proof, consent/suppression status, and buyer-use review."),
      fieldsUsed(profile, "Compliance", ["consent status", "suppression status", "release mode"]),
      fieldsMissing(profile, "Compliance", ["final entitlement scope"]),
    ),
    scoreBreakdownItem(
      profile,
      "revenue_potential",
      "Revenue potential score",
      revenueScore,
      scoreExplanation(profile, "Revenue", "The buyer use case can support paid access when proof and fit are strong enough."),
      fieldsUsed(profile, "Revenue", ["price band", "buyer fit", "category demand"]),
      fieldsMissing(profile, "Revenue", ["historical close outcome"]),
    ),
  ];
}

function buildSourceProofRecords(profile: LeadProfileDetail): LeadProfileSourceProofRecord[] {
  return profile.sourceProofLinks.map((item, index) => ({
    id: `${profile.id}-proof-${index + 1}`,
    sourceUrl: item.href.startsWith("http") ? item.href : `https://www.theleadflowpro.com${item.href}`,
    sourceTitle: item.label,
    sourceType: item.type,
    foundDate: profile.lastVerifiedDate,
    verifiedDate: profile.lastVerifiedDate,
    proofSnippet: item.description,
    status: item.status,
    confidence: item.status === "verified" ? "high" : item.status === "review" ? "medium" : profile.confidence,
    screenshotUrl: null,
    adminNotes: null,
    buyerVisible: true,
  }));
}

function buildSignalRecords(profile: LeadProfileDetail): LeadProfileSignalRecord[] {
  return profile.signals.map((item, index) => ({
    id: `${profile.id}-signal-${index + 1}`,
    signalType: item.label,
    tag: profile.tags[index % profile.tags.length] || profile.category,
    value: item.value,
    timestamp: profile.lastVerifiedDate,
    source: profile.sourceType,
    confidence: confidenceForScore(item.score),
    explanation: item.explanation,
  }));
}

function buildBuyerFitRecord(profile: LeadProfileDetail): LeadProfileBuyerFitRecord {
  return {
    bestBuyerTypes: [profile.bestBuyerType, ...profile.buyerFit.slice(0, 2).map((item) => item.value)],
    matchingIndustries: [profile.category, profile.vertical, ...profile.tags.slice(0, 3)],
    estimatedValueCategory: profile.priceBand,
    urgencyCategory: scoreLabel(scoreFromSignal(profile, "Urgency", profile.leadScore)),
    suggestedServiceOrProductFit: profile.buyerFit.map((item) => item.value),
    disqualifiers: profile.buyerFit.filter((item) => /weak|caution|limit|slow|release/i.test(item.label)).map((item) => item.detail),
    openQuestions: profile.openQuestions,
  };
}

function buildComplianceRecord(profile: LeadProfileDetail): LeadProfileComplianceRecord {
  const isMortgage = /mortgage|refi/i.test(profile.category + profile.vertical);
  const isCivic = /political|civic/i.test(profile.category + profile.vertical);

  return {
    consentStatus: profile.consentStatus,
    suppressionStatus: statusText(profile.suppressionStatus),
    doNotContactStatus: profile.suppressionStatus === "suppressed" ? "Blocked" : "No active block in profile preview",
    sourceType: profile.sourceType,
    allowedUse: [
      "Review the source-backed business opportunity",
      "Use the approved buyer use case only",
      "Start with proof-aware, business-facing outreach",
      isMortgage ? "Route only through licensed and approved mortgage partners" : "Respect the release mode shown on this profile",
    ],
    restrictedUse: [
      "No hidden resale or blind list redistribution",
      "No minors, protected-trait targeting, or sensitive personal inference",
      "No raw answer export unless explicitly approved",
      isCivic ? "Civic issue profiles must stay aggregated unless explicit consent exists" : "No contact outside the approved route",
    ],
    reviewStatus: "Review gated",
    exportEligibility: profile.suppressionStatus === "approved" || profile.suppressionStatus === "sampleAvailable" ? "Summary export review available" : "Export blocked until review clears",
    notes: profile.complianceChecks.map((item) => item.description),
  };
}

function buildHistoryRecords(profile: LeadProfileDetail): LeadProfileHistoryRecord[] {
  return profile.history.map((item, index) => ({
    id: `${profile.id}-history-${index + 1}`,
    eventType: index === 0 ? "source proof changes" : index === 1 ? "score changes" : "created_at",
    label: item.label,
    detail: item.detail,
    timestamp: item.date,
    actor: index === 0 ? "LeadFlow review" : "system",
    status: statusText(item.status),
  }));
}

function statusText(status: string) {
  if (status === "sampleAvailable") return "Sample available";
  if (status === "review") return "In review";
  return status.charAt(0).toUpperCase() + status.slice(1);
}

export function buildProtectedLeadProfile(profile: LeadProfileDetail): ProtectedLeadProfileDetail {
  const missingInformation = Array.from(
    new Set(
      buildScoreBreakdown(profile)
        .flatMap((score) => score.fieldsMissing)
        .filter(Boolean),
    ),
  ).slice(0, 8);

  return {
    ...profile,
    freshnessLabel: `Verified ${profile.lastVerifiedDate}`,
    sourceProofStatus: profile.sourceProofLinks.some((item) => item.status === "verified") ? "Source proof attached" : "Source proof in review",
    reviewStatus: "Review gated",
    missingInformation,
    riskCautionNote:
      profile.suppressionStatus === "suppressed"
        ? "Suppression is active. Do not route, export, or contact until resolved."
        : "Do not treat this as a blind contact list. Use only the approved buyer use case and release mode.",
    keyFacts: [
      `Category: ${profile.category}`,
      `Vertical: ${profile.vertical}`,
      `Best buyer: ${profile.bestBuyerType}`,
      `Release mode: ${profile.releaseMode}`,
      `Source type: ${profile.sourceType}`,
    ],
    suggestedOfferAngle: `Lead with ${profile.recommendedNextAction.toLowerCase()}`,
    recommendedOutreachPath: profile.contactRouteHints.join(" "),
    notes: [
      "Full contact fields remain hidden unless the entitlement permits them.",
      "Raw answers stay private unless explicitly approved for buyer release.",
      "Suppression and permitted-use checks must clear before export.",
    ],
    scoreBreakdown: buildScoreBreakdown(profile),
    sourceProofRecords: buildSourceProofRecords(profile),
    signalRecords: buildSignalRecords(profile),
    buyerFitRecord: buildBuyerFitRecord(profile),
    complianceRecord: buildComplianceRecord(profile),
    historyRecords: buildHistoryRecords(profile),
    exportAllowed: profile.suppressionStatus === "approved" || profile.suppressionStatus === "sampleAvailable",
  };
}
