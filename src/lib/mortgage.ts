// src/lib/mortgage.ts
// Mortgage OS — typed catalog of lead verticals, document checklists, scoring
// rules, and Flo qualifier prompts. This file is the single source of truth for
// every other mortgage component (sales page, pre-qual widget, API, dashboard,
// compliance scanner). Update here, the rest follows.

export type LoanType =
  | "purchase_preapproved"
  | "purchase_fthb"
  | "refi_rate_term"
  | "refi_cashout"
  | "va"
  | "fha"
  | "usda"
  | "jumbo"
  | "non_qm"
  | "reverse";

export type LeadGrade = "A" | "B" | "C" | "D";

export type LoanVertical = {
  type: LoanType;
  label: string;
  /** Short pitch shown on the sales page card */
  blurb: string;
  /** Borrower-facing prompt the widget uses */
  borrowerPrompt: string;
  /** Typical close cycle in days */
  closeDays: [number, number];
  /** Per-deal LO revenue in USD */
  perDealUsd: [number, number];
  /** The tone-matched Flo sub-agent voice for this vertical */
  floVoice: string;
  /** Required doc keys (see DOC_CATALOG) */
  docs: string[];
  /** Compliance overlays that always apply */
  compliance: ComplianceTag[];
  /** Default qualifier weights — drives the lead grade */
  scoringHints: string[];
};

export type ComplianceTag =
  | "RESPA_8"
  | "TILA_LE_3DAY"
  | "TILA_CD_3DAY"
  | "ECOA_AAN_30DAY"
  | "TCPA_CONSENT"
  | "SAFE_NMLS_DISCLOSURE"
  | "HMDA_FAIRLENDING"
  | "GLBA_ENCRYPTION"
  | "TX_A6_HOMEEQUITY"
  | "STATE_OVERLAY";

export type DocKey =
  | "id_photo"
  | "ssn_disclosure"
  | "urla_1003"
  | "credit_auth"
  | "patriot_act"
  | "econsent"
  | "paystubs_30d"
  | "w2_2yr"
  | "vvoe"
  | "personal_1040_2yr"
  | "business_returns_2yr"
  | "ytd_pl"
  | "biz_license"
  | "cpa_letter"
  | "bank_statements_2mo"
  | "retirement_statement"
  | "brokerage_statement"
  | "gift_letter"
  | "emd_proof"
  | "purchase_contract"
  | "hoi_decpage"
  | "appraisal"
  | "title_commitment"
  | "hoa_docs"
  | "flood_determination"
  | "survey"
  | "dd214"
  | "coe"
  | "vafunding_election"
  | "fha_case_num"
  | "fha_appraisal"
  | "ufmip_ack"
  | "current_mortgage_stmt"
  | "current_hoi"
  | "property_tax_stmt"
  | "hoa_dues_proof"
  | "tx_a6_notices"
  | "le_disclosure"
  | "intent_to_proceed"
  | "cd_disclosure";

export type DocSpec = {
  key: DocKey;
  label: string;
  helpText: string;
  /** Plaid / Work Number / etc. can collect this without an upload */
  autoSource?: "plaid" | "vvoe" | "credit" | "title" | "appraisal";
  /** Borrower may need to provide all pages, not just summary */
  requireAllPages?: boolean;
};

export const DOC_CATALOG: Record<DocKey, DocSpec> = {
  id_photo: { key: "id_photo", label: "Photo ID", helpText: "Driver's license or passport — front and back." },
  ssn_disclosure: { key: "ssn_disclosure", label: "SSN Disclosure", helpText: "We'll auto-generate this for e-signature." },
  urla_1003: { key: "urla_1003", label: "Loan Application (1003)", helpText: "Pre-filled from your pre-qual answers." },
  credit_auth: { key: "credit_auth", label: "Credit Pull Authorization", helpText: "Soft pull first; hard pull only if you proceed." },
  patriot_act: { key: "patriot_act", label: "Patriot Act / BSA Disclosure", helpText: "Federal anti-fraud requirement." },
  econsent: { key: "econsent", label: "Electronic Consent", helpText: "Lets us send everything digitally." },
  paystubs_30d: { key: "paystubs_30d", label: "30 days of paystubs", helpText: "Most recent — covering the last 30 calendar days." },
  w2_2yr: { key: "w2_2yr", label: "2 years of W-2s", helpText: "Both years even if you switched jobs." },
  vvoe: { key: "vvoe", label: "Verbal Verification of Employment", helpText: "We'll handle this via The Work Number — no action needed.", autoSource: "vvoe" },
  personal_1040_2yr: { key: "personal_1040_2yr", label: "2 years personal tax returns (1040)", helpText: "All schedules included." },
  business_returns_2yr: { key: "business_returns_2yr", label: "2 years business returns", helpText: "1120S, 1065, or Schedule C — whichever your entity files." },
  ytd_pl: { key: "ytd_pl", label: "Year-to-date Profit & Loss", helpText: "Doesn't have to be CPA-prepared for most loan types." },
  biz_license: { key: "biz_license", label: "Business license / operating agreement", helpText: "Or articles of incorporation." },
  cpa_letter: { key: "cpa_letter", label: "CPA letter", helpText: "Required for jumbo and non-QM only." },
  bank_statements_2mo: { key: "bank_statements_2mo", label: "2 months of bank statements", helpText: "All pages, even blank ones — auto-pull via Plaid is fastest.", requireAllPages: true, autoSource: "plaid" },
  retirement_statement: { key: "retirement_statement", label: "401k or retirement statement", helpText: "Used for reserves, not withdrawn." },
  brokerage_statement: { key: "brokerage_statement", label: "Brokerage account statement", helpText: "Most recent quarterly statement." },
  gift_letter: { key: "gift_letter", label: "Gift letter + donor's bank statement", helpText: "Only if any portion of down payment is a gift." },
  emd_proof: { key: "emd_proof", label: "Earnest Money Deposit proof", helpText: "Cleared check or wire receipt." },
  purchase_contract: { key: "purchase_contract", label: "Fully executed purchase contract", helpText: "Including all addenda." },
  hoi_decpage: { key: "hoi_decpage", label: "Homeowner's Insurance declarations page", helpText: "Quote works for now; binder before close." },
  appraisal: { key: "appraisal", label: "Appraisal", helpText: "Ordered by us once you sign Intent to Proceed.", autoSource: "appraisal" },
  title_commitment: { key: "title_commitment", label: "Title commitment", helpText: "Ordered by your title company once we engage them.", autoSource: "title" },
  hoa_docs: { key: "hoa_docs", label: "HOA documents", helpText: "Bylaws, master insurance, CC&Rs if applicable." },
  flood_determination: { key: "flood_determination", label: "Flood determination", helpText: "We'll run this — auto-cleared in non-flood zones." },
  survey: { key: "survey", label: "Property survey", helpText: "Existing survey usually OK on rate/term refi." },
  dd214: { key: "dd214", label: "DD-214 or Statement of Service", helpText: "Required for VA loans." },
  coe: { key: "coe", label: "VA Certificate of Eligibility", helpText: "We'll pull this for you once we have your DD-214." },
  vafunding_election: { key: "vafunding_election", label: "VA funding fee election", helpText: "Pay upfront or finance — your call." },
  fha_case_num: { key: "fha_case_num", label: "FHA Case Number", helpText: "Auto-assigned by FHA Connection — we handle it." },
  fha_appraisal: { key: "fha_appraisal", label: "FHA-specific appraisal", helpText: "Stays with the property for 6 months." },
  ufmip_ack: { key: "ufmip_ack", label: "Upfront Mortgage Insurance Premium acknowledgment", helpText: "FHA-only disclosure." },
  current_mortgage_stmt: { key: "current_mortgage_stmt", label: "Current mortgage statement", helpText: "Most recent — refis only." },
  current_hoi: { key: "current_hoi", label: "Current homeowner's insurance dec page", helpText: "We'll re-shop if it's time." },
  property_tax_stmt: { key: "property_tax_stmt", label: "Property tax statement", helpText: "Most recent year." },
  hoa_dues_proof: { key: "hoa_dues_proof", label: "HOA dues proof", helpText: "Coupon book or association statement." },
  tx_a6_notices: { key: "tx_a6_notices", label: "Texas A6 Home Equity notices", helpText: "TX-only — required on cash-out refis on a primary residence." },
  le_disclosure: { key: "le_disclosure", label: "Loan Estimate (LE)", helpText: "We issue within 3 business days of full application." },
  intent_to_proceed: { key: "intent_to_proceed", label: "Intent to Proceed", helpText: "Your green light to start ordering services." },
  cd_disclosure: { key: "cd_disclosure", label: "Closing Disclosure (CD)", helpText: "Issued at least 3 business days before closing." },
};

export const UNIVERSAL_DOCS: DocKey[] = [
  "id_photo",
  "ssn_disclosure",
  "urla_1003",
  "credit_auth",
  "patriot_act",
  "econsent",
];

export const VERTICALS: Record<LoanType, LoanVertical> = {
  purchase_preapproved: {
    type: "purchase_preapproved",
    label: "Purchase — Pre-Approved",
    blurb: "Borrower has a realtor and is under contract or actively shopping. The fastest-closing vertical.",
    borrowerPrompt: "Tell me about the home you're buying.",
    closeDays: [20, 35],
    perDealUsd: [3500, 6000],
    floVoice: "Friendly, fast, deadline-aware. References the contract date and inspection period.",
    docs: [
      ...UNIVERSAL_DOCS,
      "paystubs_30d", "w2_2yr", "bank_statements_2mo",
      "purchase_contract", "emd_proof", "hoi_decpage",
    ],
    compliance: ["RESPA_8", "TILA_LE_3DAY", "TILA_CD_3DAY", "TCPA_CONSENT", "SAFE_NMLS_DISCLOSURE"],
    scoringHints: ["Has signed contract", "Has realtor named", "Close date < 45 days"],
  },
  purchase_fthb: {
    type: "purchase_fthb",
    label: "Purchase — First-Time Home Buyer",
    blurb: "Renters making the leap. Education-heavy, often DPA-eligible. 12-week nurture pays off.",
    borrowerPrompt: "What's your dream home look like?",
    closeDays: [45, 90],
    perDealUsd: [3000, 4500],
    floVoice: "Patient teacher. Explains every term in plain English. Celebrates milestones.",
    docs: [
      ...UNIVERSAL_DOCS,
      "paystubs_30d", "w2_2yr", "bank_statements_2mo",
      "gift_letter",
    ],
    compliance: ["RESPA_8", "TILA_LE_3DAY", "TCPA_CONSENT", "SAFE_NMLS_DISCLOSURE"],
    scoringHints: ["FICO ≥ 620", "Stable 2-yr employment", "Down payment savings ≥ 3%"],
  },
  refi_rate_term: {
    type: "refi_rate_term",
    label: "Refinance — Rate / Term",
    blurb: "Lower the rate, shorten the term. Fastest path to a closed loan when rates dip.",
    borrowerPrompt: "What's your current rate?",
    closeDays: [18, 30],
    perDealUsd: [2500, 4500],
    floVoice: "Math-forward. Leads with the monthly savings number.",
    docs: [
      ...UNIVERSAL_DOCS,
      "paystubs_30d", "w2_2yr", "bank_statements_2mo",
      "current_mortgage_stmt", "current_hoi", "property_tax_stmt",
    ],
    compliance: ["TILA_LE_3DAY", "TILA_CD_3DAY", "TCPA_CONSENT", "SAFE_NMLS_DISCLOSURE"],
    scoringHints: ["Current rate ≥ 6.5%", "FICO ≥ 680", "LTV ≤ 80%", "Owner-occupied"],
  },
  refi_cashout: {
    type: "refi_cashout",
    label: "Refinance — Cash-Out / Debt Consolidation",
    blurb: "Use equity to wipe out high-interest debt. Watch state overlays — TX A6 is its own world.",
    borrowerPrompt: "How much equity do you have?",
    closeDays: [21, 35],
    perDealUsd: [3500, 5500],
    floVoice: "Numbers-first. Always shows blended monthly debt before/after.",
    docs: [
      ...UNIVERSAL_DOCS,
      "paystubs_30d", "w2_2yr", "bank_statements_2mo",
      "current_mortgage_stmt", "current_hoi", "property_tax_stmt", "tx_a6_notices",
    ],
    compliance: ["TILA_LE_3DAY", "TILA_CD_3DAY", "TCPA_CONSENT", "SAFE_NMLS_DISCLOSURE", "TX_A6_HOMEEQUITY", "STATE_OVERLAY"],
    scoringHints: ["Equity > 30%", "FICO ≥ 660", "Has consumer debt > $10k"],
  },
  va: {
    type: "va",
    label: "VA Loan",
    blurb: "$0 down for veterans and active duty. Funding fee waivable for disabled vets.",
    borrowerPrompt: "Tell me about your service.",
    closeDays: [25, 40],
    perDealUsd: [3500, 5500],
    floVoice: "Respectful, military-fluent. Knows the difference between active duty and reservist.",
    docs: [
      ...UNIVERSAL_DOCS,
      "paystubs_30d", "w2_2yr", "bank_statements_2mo",
      "dd214", "coe", "vafunding_election",
    ],
    compliance: ["TILA_LE_3DAY", "TILA_CD_3DAY", "TCPA_CONSENT", "SAFE_NMLS_DISCLOSURE"],
    scoringHints: ["Has DD-214 or active duty", "Entitlement available", "FICO ≥ 580"],
  },
  fha: {
    type: "fha",
    label: "FHA Loan",
    blurb: "Lower FICO floor, lower down payment. Comes with mortgage insurance for life of loan.",
    borrowerPrompt: "How much down payment do you have saved?",
    closeDays: [25, 45],
    perDealUsd: [2500, 4000],
    floVoice: "Encouraging. Frames MIP as the cost of getting in early.",
    docs: [
      ...UNIVERSAL_DOCS,
      "paystubs_30d", "w2_2yr", "bank_statements_2mo",
      "fha_case_num", "fha_appraisal", "ufmip_ack",
    ],
    compliance: ["TILA_LE_3DAY", "TILA_CD_3DAY", "TCPA_CONSENT", "SAFE_NMLS_DISCLOSURE"],
    scoringHints: ["FICO 580–660", "Down payment ≥ 3.5%", "DTI ≤ 50%"],
  },
  usda: {
    type: "usda",
    label: "USDA Rural Loan",
    blurb: "$0 down for properties in eligible rural geographies. Income caps apply.",
    borrowerPrompt: "Where is the home located?",
    closeDays: [30, 45],
    perDealUsd: [2500, 4000],
    floVoice: "Geographic. Pulls eligibility from USDA map first thing.",
    docs: [
      ...UNIVERSAL_DOCS,
      "paystubs_30d", "w2_2yr", "bank_statements_2mo",
    ],
    compliance: ["TILA_LE_3DAY", "TILA_CD_3DAY", "TCPA_CONSENT", "SAFE_NMLS_DISCLOSURE"],
    scoringHints: ["Property in USDA-eligible zone", "Household income ≤ 115% AMI"],
  },
  jumbo: {
    type: "jumbo",
    label: "Jumbo Loan",
    blurb: "Loan amounts above 2026 conforming limit ($766,550). Tighter overlays, bigger commission.",
    borrowerPrompt: "What's the purchase price?",
    closeDays: [30, 50],
    perDealUsd: [6000, 15000],
    floVoice: "Polished. Higher financial literacy assumed. Talks reserves and asset depletion.",
    docs: [
      ...UNIVERSAL_DOCS,
      "paystubs_30d", "w2_2yr", "personal_1040_2yr",
      "bank_statements_2mo", "retirement_statement", "brokerage_statement",
      "purchase_contract", "hoi_decpage", "cpa_letter",
    ],
    compliance: ["TILA_LE_3DAY", "TILA_CD_3DAY", "TCPA_CONSENT", "SAFE_NMLS_DISCLOSURE"],
    scoringHints: ["Loan amount > $766,550", "FICO ≥ 720", "Reserves ≥ 12 months"],
  },
  non_qm: {
    type: "non_qm",
    label: "Non-QM / DSCR / Bank Statement",
    blurb: "Self-employed, 1099, or investor borrowers. Bank-statement income or DSCR property cash-flow.",
    borrowerPrompt: "How do you earn your living?",
    closeDays: [30, 60],
    perDealUsd: [5000, 12000],
    floVoice: "Entrepreneur-aware. Talks gross deposits, NOI, and add-backs without flinching.",
    docs: [
      ...UNIVERSAL_DOCS,
      "personal_1040_2yr", "business_returns_2yr", "ytd_pl",
      "biz_license", "bank_statements_2mo", "cpa_letter",
    ],
    compliance: ["TILA_LE_3DAY", "TILA_CD_3DAY", "TCPA_CONSENT", "SAFE_NMLS_DISCLOSURE"],
    scoringHints: ["2+ yrs self-employment", "12mo bank statements available", "DSCR ≥ 1.0 if investment"],
  },
  reverse: {
    type: "reverse",
    label: "Reverse / HECM",
    blurb: "Age 62+ equity unlock. High-touch, regulatory-heavy, deeply meaningful for the right borrower.",
    borrowerPrompt: "Tell me about your retirement plans.",
    closeDays: [45, 75],
    perDealUsd: [5000, 10000],
    floVoice: "Slow-paced. Patient. Always offers to include a family member on the call.",
    docs: [
      ...UNIVERSAL_DOCS,
      "current_mortgage_stmt", "current_hoi", "property_tax_stmt",
    ],
    compliance: ["TILA_LE_3DAY", "TILA_CD_3DAY", "TCPA_CONSENT", "SAFE_NMLS_DISCLOSURE", "STATE_OVERLAY"],
    scoringHints: ["Borrower age ≥ 62", "Owner-occupied", "Counseling cert obtained"],
  },
};

export const LOAN_TYPE_ORDER: LoanType[] = [
  "purchase_preapproved",
  "purchase_fthb",
  "refi_rate_term",
  "refi_cashout",
  "va",
  "fha",
  "usda",
  "jumbo",
  "non_qm",
  "reverse",
];

// ────────────────────────────────────────────────────────────────────────────
// Lead scoring — mortgage A/B/C/D grade
// ────────────────────────────────────────────────────────────────────────────
export type PreQualInput = {
  loanType: LoanType;
  ficoBand: "740+" | "700-739" | "660-699" | "620-659" | "580-619" | "<580" | "unknown";
  estIncomeUsd?: number;
  estDtiPct?: number;
  estLoanAmountUsd?: number;
  estPropertyValueUsd?: number;
  timeline: "now" | "30d" | "60d" | "90d" | "6mo+";
  state: string;
  hasRealtor?: boolean;
  hasContract?: boolean;
  ownerOccupied?: boolean;
  consentTcpa: boolean;
};

export function scoreLead(input: PreQualInput): { grade: LeadGrade; reasons: string[] } {
  const reasons: string[] = [];
  let pts = 0;

  // FICO
  switch (input.ficoBand) {
    case "740+":
      pts += 30; reasons.push("Premium FICO (740+)"); break;
    case "700-739":
      pts += 25; reasons.push("Strong FICO (700–739)"); break;
    case "660-699":
      pts += 20; reasons.push("Good FICO (660–699)"); break;
    case "620-659":
      pts += 12; reasons.push("Marginal FICO (620–659)"); break;
    case "580-619":
      pts += 6; reasons.push("FHA/VA-only FICO band"); break;
    default: break;
  }

  // Timeline
  switch (input.timeline) {
    case "now": pts += 25; reasons.push("Ready now"); break;
    case "30d": pts += 22; reasons.push("Closing within 30 days"); break;
    case "60d": pts += 17; reasons.push("60-day timeline"); break;
    case "90d": pts += 10; reasons.push("90-day timeline"); break;
    case "6mo+": pts += 3; reasons.push("Long timeline — nurture"); break;
  }

  // Vertical-specific signals
  if (input.loanType === "purchase_preapproved" && input.hasContract) {
    pts += 20; reasons.push("Has signed contract");
  }
  if (input.loanType === "purchase_preapproved" && input.hasRealtor) {
    pts += 8; reasons.push("Realtor named");
  }
  if (input.loanType === "refi_rate_term" && input.estPropertyValueUsd && input.estLoanAmountUsd) {
    const ltv = input.estLoanAmountUsd / input.estPropertyValueUsd;
    if (ltv <= 0.8) { pts += 10; reasons.push(`LTV ${(ltv * 100).toFixed(0)}% — clean rate/term`); }
  }
  if (input.loanType === "jumbo" && input.estLoanAmountUsd && input.estLoanAmountUsd > 766_550) {
    pts += 10; reasons.push("Confirmed jumbo amount");
  }
  if (input.loanType === "va") {
    pts += 8; reasons.push("VA — entitlement value");
  }

  // DTI penalty
  if (input.estDtiPct && input.estDtiPct > 50) {
    pts -= 10; reasons.push(`High DTI (${input.estDtiPct.toFixed(0)}%)`);
  }

  // Consent gate — without it we can't auto-contact, downgrades grade
  if (!input.consentTcpa) {
    pts -= 15; reasons.push("No TCPA consent yet — manual contact only");
  }

  let grade: LeadGrade;
  if (pts >= 65) grade = "A";
  else if (pts >= 45) grade = "B";
  else if (pts >= 25) grade = "C";
  else grade = "D";

  return { grade, reasons };
}

// ────────────────────────────────────────────────────────────────────────────
// Conforming loan limits (2026, baseline). High-cost areas will exceed.
// ────────────────────────────────────────────────────────────────────────────
export const CONFORMING_LIMIT_2026 = 766_550;

// ────────────────────────────────────────────────────────────────────────────
// Mortgage Pricing Plans (these slot alongside the 4 LeadFlow plans)
// ────────────────────────────────────────────────────────────────────────────
export type MortgagePlanSlug = "originator" | "pro" | "team" | "enterprise";

export const MORTGAGE_PLANS: Record<MortgagePlanSlug, {
  slug: MortgagePlanSlug;
  name: string;
  priceMonthly: number;
  perLeadFee?: number;
  seats: number | "unlimited";
  activeLeads: number | "unlimited";
  highlights: string[];
  stripePriceEnv: string;
}> = {
  originator: {
    slug: "originator",
    name: "Originator",
    priceMonthly: 197,
    perLeadFee: 0.25,
    seats: 1,
    activeLeads: 100,
    highlights: ["Flo Inbox", "Doc Chaser (3 verticals)", "Compliance Guard (national)"],
    stripePriceEnv: "STRIPE_PRICE_MORTGAGE_ORIGINATOR",
  },
  pro: {
    slug: "pro",
    name: "Pro",
    priceMonthly: 497,
    seats: 1,
    activeLeads: 500,
    highlights: ["Everything in Originator", "All 10 verticals", "Rate-Watch Reactivation", "Daily content engine"],
    stripePriceEnv: "STRIPE_PRICE_MORTGAGE_PRO",
  },
  team: {
    slug: "team",
    name: "Team",
    priceMonthly: 997,
    seats: 5,
    activeLeads: 2_000,
    highlights: ["Everything in Pro", "Partner Portal", "Pipeline board + branch SLA monitor", "Round-robin routing"],
    stripePriceEnv: "STRIPE_PRICE_MORTGAGE_TEAM",
  },
  enterprise: {
    slug: "enterprise",
    name: "Enterprise",
    priceMonthly: 1997,
    seats: "unlimited",
    activeLeads: "unlimited",
    highlights: ["Everything in Team", "LOS API sync (Encompass / Arive / LendingPad)", "PPE integration", "Dedicated success engineer"],
    stripePriceEnv: "STRIPE_PRICE_MORTGAGE_ENTERPRISE",
  },
};

export const MORTGAGE_ADDONS = [
  { slug: "rate_watch", name: "Rate-Watch Reactivation", priceMonthly: 97, env: "STRIPE_PRICE_MORTGAGE_RATEWATCH" },
  { slug: "partner_portal", name: "Partner Portal", priceMonthly: 147, env: "STRIPE_PRICE_MORTGAGE_PARTNERPORTAL" },
  { slug: "compliance_plus", name: "Compliance Guard+ (multi-state deep rules)", priceMonthly: 97, env: "STRIPE_PRICE_MORTGAGE_COMPLIANCEPLUS" },
  { slug: "content_engine", name: "Flo Content Engine", priceMonthly: 67, env: "STRIPE_PRICE_MORTGAGE_CONTENT" },
] as const;

export const MORTGAGE_ONETIME = [
  { slug: "wg_launch", name: "Mortgage White-Glove Launch", price: 1497, env: "STRIPE_PRICE_MORTGAGE_WGLAUNCH" },
  { slug: "audit", name: "Mortgage Audit (30-day loss-point report)", price: 397, env: "STRIPE_PRICE_MORTGAGE_AUDIT" },
  { slug: "compliance_retrofit", name: "Compliance Retrofit (90-day backfill)", price: 997, env: "STRIPE_PRICE_MORTGAGE_RETROFIT" },
] as const;

// ────────────────────────────────────────────────────────────────────────────
// Helpers
// ────────────────────────────────────────────────────────────────────────────
export function docsForLoan(type: LoanType): DocSpec[] {
  return VERTICALS[type].docs.map((k) => DOC_CATALOG[k as DocKey]);
}

export function complianceFlagsForLoan(type: LoanType, state?: string): ComplianceTag[] {
  const base = [...VERTICALS[type].compliance];
  if (state?.toUpperCase() === "TX" && type === "refi_cashout" && !base.includes("TX_A6_HOMEEQUITY")) {
    base.push("TX_A6_HOMEEQUITY");
  }
  return base;
}
