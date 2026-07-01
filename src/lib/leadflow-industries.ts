export type IndustryToolLink = {
  label: string;
  href: string;
  fit: string;
};

export type IndustryLeadProfile = {
  title: string;
  category: string;
  score: number;
  confidence: "High" | "Medium" | "Review";
  sourceType: string;
  bestBuyer: string;
  buyerUseCase: string;
  proof: string;
  nextAction: string;
};

export type IndustryFaq = {
  question: string;
  answer: string;
};

export type LeadFlowIndustryPage = {
  slug: string;
  title: string;
  shortTitle: string;
  industryLabel: string;
  opportunityLabel: string;
  eyebrow: string;
  metaTitle: string;
  metaDescription: string;
  hero: string;
  buyerPain: string[];
  signalsMatter: string[];
  sampleProfile: IndustryLeadProfile;
  availableTools: IndustryToolLink[];
  complianceNote: string;
  faq: IndustryFaq[];
  marketplaceAngle: string;
  buildSystemAngle: string;
  primaryKeywords: string[];
  relatedSlugs: string[];
};

const standardComplianceNote =
  "LeadFlow Pro uses public, submitted, permissioned, or consented signal data. Access is review-gated, suppression-aware, and source-backed. We do not promise guaranteed sales, revenue, lead volume, ROAS, conversion rate, or cost per lead.";

const standardTools: IndustryToolLink[] = [
  {
    label: "Lead Leak Audit",
    href: "/tools",
    fit: "Find missed calls, missed texts, missed DMs, form gaps, and slow follow-up.",
  },
  {
    label: "What Type of Leads Should You Buy?",
    href: "/tools",
    fit: "Match the buyer to the right lead marketplace product, sample path, and release mode.",
  },
  {
    label: "Business Signal Score",
    href: "/tools",
    fit: "Score website funnel, lead scoring, CRM automation, and appointment booking readiness.",
  },
];

const systemKeywordFit =
  "The system path connects lead generation, lead flow, business automation, lead scoring, CRM automation, website funnel cleanup, appointment booking, buyer intent, lead marketplace access, and source-backed leads. When the buyer needs implementation, the build can include an AI receptionist, AI chatbot, AI agent, Facebook ads, Instagram ads, local business marketing, and missed-call, missed-text, and missed-DM follow-up.";

function heroFor(opportunity: string) {
  return `The LeadFlow Pro helps serious buyers find, score, review, and route ${opportunity} opportunities using source-backed signals, confidence labels, and clean follow-up paths.`;
}

function commonPain(industry: string, extra: string[] = []) {
  return [
    `Blind ${industry} lists get recycled, resold, and worked before a serious buyer can trust them.`,
    "Old data kills follow-up because nobody knows when the signal was found, verified, or last reviewed.",
    "Slow follow-up turns calls, texts, DMs, forms, comments, and ad clicks into missed revenue conversations.",
    "Weak websites, unclear CTAs, no lead scoring, and no CRM routing make good attention hard to catch.",
    "Most lists do not show source proof, suppression status, buyer fit, or a clear reason the person or business may care right now.",
    ...extra,
  ];
}

function commonFaq(input: {
  industry: string;
  signalAnswer: string;
  differenceAnswer: string;
  verifyAnswer: string;
  exclusiveAnswer: string;
  buildAnswer: string;
}) {
  return [
    {
      question: "What is a lead signal?",
      answer: input.signalAnswer,
    },
    {
      question: `How is this different from a ${input.industry} lead list?`,
      answer: input.differenceAnswer,
    },
    {
      question: "Do you verify the source?",
      answer: input.verifyAnswer,
    },
    {
      question: "Can I buy exclusive access?",
      answer: input.exclusiveAnswer,
    },
    {
      question: "Can you build this system inside my business?",
      answer: input.buildAnswer,
    },
  ];
}

export const leadFlowIndustryPages: LeadFlowIndustryPage[] = [
  {
    slug: "ecommerce-leads",
    title: "Ecommerce lead signals with source proof.",
    shortTitle: "Ecommerce",
    industryLabel: "Ecommerce",
    opportunityLabel: "ecommerce",
    eyebrow: "Ecommerce lead generation",
    metaTitle: "Ecommerce Lead Signals | The LeadFlow Pro",
    metaDescription:
      "Source-backed ecommerce lead signals for vendors, stores, agencies, product sourcers, and marketplace operators.",
    hero: heroFor("ecommerce"),
    buyerPain: commonPain("ecommerce", [
      "Stores and vendors can look active from the outside while the real pain sits in sourcing, fulfillment, abandoned sites, weak offers, or poor conversion paths.",
    ]),
    signalsMatter: [
      "Vendor lists",
      "Product sourcing signals",
      "Marketplace seller signals",
      "Abandoned brand sites",
      "Active offer pages",
      "Fulfillment pain",
      "Product launch clues",
      "Storefront conversion gaps",
    ],
    sampleProfile: {
      title: "Ecommerce Vendor Signal Pack",
      category: "Ecommerce",
      score: 87,
      confidence: "High",
      sourceType: "Public marketplace plus submitted source review",
      bestBuyer: "Ecommerce agency, product sourcer, marketplace operator",
      buyerUseCase: "Find vendors or stores that may need sourcing help, traffic, conversion cleanup, automation, or marketplace support.",
      proof: "Sample rows, public source links, platform tags, product category, freshness, and review status.",
      nextAction: "Request a reviewed sample, then decide shared, limited-seat, or exclusive access.",
    },
    availableTools: [
      {
        label: "Ecommerce Growth Finder",
        href: "/tools",
        fit: "Map platform, product, sourcing, traffic, conversion, and follow-up pain.",
      },
      {
        label: "Website Money Leak Checker",
        href: "/tools/seo-grader",
        fit: "Check whether the store or landing page is losing buyer intent.",
      },
      ...standardTools,
    ],
    complianceNote: standardComplianceNote,
    faq: commonFaq({
      industry: "ecommerce",
      signalAnswer:
        "An ecommerce lead signal is a source-backed clue that a store, vendor, marketplace seller, or product operator may have a real business need. It can include category, platform clue, offer page, sourcing pain, freshness, score, and proof.",
      differenceAnswer:
        "A list usually gives names without context. A signal product explains why the opportunity exists, how fresh it is, what proof is attached, what buyer use case fits, and what is still missing.",
      verifyAnswer:
        "Every released ecommerce profile should show source context, proof status, confidence, suppression status, and review status before a buyer sees more than the preview.",
      exclusiveAnswer:
        "Some ecommerce packs can be shared, limited-seat, or exclusive. Exclusive access depends on source rights, category, geography, risk level, buyer use case, and admin review.",
      buildAnswer:
        "Yes. The build path can include a website funnel, AI chatbot, AI agent, CRM automation, follow-up, appointment booking, dashboards, and paid traffic setup.",
    }),
    marketplaceAngle: "Browse ecommerce signal packs with proof attached.",
    buildSystemAngle: "Build the ecommerce capture, follow-up, ads, and automation system.",
    primaryKeywords: ["ecommerce lead generation", "lead marketplace", "buyer intent", "source-backed leads"],
    relatedSlugs: ["ai-saas-leads", "creator-audience-leads", "local-business-leads"],
  },
  {
    slug: "real-estate-leads",
    title: "Real estate lead signals with source proof.",
    shortTitle: "Real Estate",
    industryLabel: "Real estate",
    opportunityLabel: "real estate",
    eyebrow: "Real estate lead flow",
    metaTitle: "Real Estate Lead Signals | The LeadFlow Pro",
    metaDescription:
      "Source-backed real estate opportunity signals for brokerages, agent teams, CRM operators, and local market builders.",
    hero: heroFor("real estate"),
    buyerPain: commonPain("real estate", [
      "Real estate teams often spend on traffic before their intake, appointment booking, and CRM follow-up can catch active market demand.",
    ]),
    signalsMatter: [
      "Agent activity",
      "Neglected listing pages",
      "Local demand",
      "Expired listing-related public signals where legally allowed",
      "Buyer education demand",
      "Relocation content",
      "Neighborhood search interest",
      "CRM and booking path gaps",
    ],
    sampleProfile: {
      title: "Real Estate Agent Opportunity Map",
      category: "Real estate",
      score: 76,
      confidence: "Medium",
      sourceType: "Public market activity and listing pattern review",
      bestBuyer: "Brokerage, agent team, CRM operator",
      buyerUseCase: "Spot agent, market, content, or follow-up gaps where a reviewed outreach or system build makes sense.",
      proof: "Listing movement, public source context, coverage gap, freshness, and review notes.",
      nextAction: "Request the opportunity map and confirm the allowed market use.",
    },
    availableTools: [
      {
        label: "Local Demand Finder",
        href: "/tools",
        fit: "Map demand by city, category, timing, and market clue.",
      },
      {
        label: "Lead Leak Audit",
        href: "/tools",
        fit: "Find missed calls, missed texts, missed DMs, and weak appointment booking.",
      },
      ...standardTools,
    ],
    complianceNote: standardComplianceNote,
    faq: commonFaq({
      industry: "real estate",
      signalAnswer:
        "A real estate lead signal is a reviewed market clue tied to source proof, timing, geography, buyer education demand, listing activity, or a follow-up gap.",
      differenceAnswer:
        "A list can hide stale records and unclear origin. A signal page keeps source context, confidence, freshness, review status, and buyer use case attached.",
      verifyAnswer:
        "Real estate profiles are reviewed for public source context, freshness, suppression status, and appropriate buyer use before deeper access is released.",
      exclusiveAnswer:
        "Some real estate signal products may be available by market, category, or time window. Exclusive access is manually reviewed before release.",
      buildAnswer:
        "Yes. LeadFlow can build real estate landing pages, AI receptionist routing, CRM automation, appointment booking, follow-up, dashboards, and ad tracking.",
    }),
    marketplaceAngle: "Open reviewed real estate opportunity signals.",
    buildSystemAngle: "Build the real estate follow-up, booking, and automation system.",
    primaryKeywords: ["real estate leads", "lead flow", "appointment booking", "CRM automation"],
    relatedSlugs: ["mortgage-leads", "home-service-leads", "local-business-leads"],
  },
  {
    slug: "mortgage-leads",
    title: "Mortgage lead signals with source proof.",
    shortTitle: "Mortgage",
    industryLabel: "Mortgage",
    opportunityLabel: "mortgage",
    eyebrow: "Mortgage lead readiness",
    metaTitle: "Mortgage Lead Signals | The LeadFlow Pro",
    metaDescription:
      "Consent-aware mortgage and refinance interest signals for licensed buyers, with source proof and suppression checks.",
    hero: heroFor("mortgage and refinance"),
    buyerPain: commonPain("mortgage", [
      "Mortgage teams cannot act safely when loan interest, state fit, consent, seller scope, or suppression status is unclear.",
    ]),
    signalsMatter: [
      "Refinance interest",
      "VA loan education",
      "Rate concern signals",
      "Mortgage statement review requests",
      "Homeowner education pages",
      "Consented questionnaire responses",
      "Licensed-area fit",
      "Contact preference and named routing permission",
    ],
    sampleProfile: {
      title: "Mortgage Refi Interest Signal",
      category: "Mortgage",
      score: 81,
      confidence: "High",
      sourceType: "Consented questionnaire and named partner path",
      bestBuyer: "Licensed mortgage team or approved refinance partner",
      buyerUseCase: "Review broad refinance interest, timing, consent scope, licensed-area fit, and allowed follow-up path.",
      proof: "Consent snapshot, source URL, timing, broad interest category, review status, and suppression check.",
      nextAction: "Review licensed-area fit before any named routing or contact.",
    },
    availableTools: [
      {
        label: "Mortgage Lead Readiness Tool",
        href: "/tools",
        fit: "Route adults to education, review, or a licensed partner path.",
      },
      {
        label: "AI Automation Readiness Score",
        href: "/tools",
        fit: "Check whether an AI receptionist or AI agent can improve speed to lead.",
      },
      ...standardTools,
    ],
    complianceNote: standardComplianceNote,
    faq: commonFaq({
      industry: "mortgage",
      signalAnswer:
        "A mortgage lead signal is a consent-aware clue about broad loan interest, timing, state fit, education need, or follow-up preference. It should not include SSNs, bank access, credit credentials, or private account data.",
      differenceAnswer:
        "A mortgage list can be over-sold or unclear. A signal product shows source proof, consent scope, suppression status, licensed-area fit, confidence, and review status.",
      verifyAnswer:
        "Mortgage signals are reviewed for consent path, source context, licensed-area fit, suppression status, and allowed use before release.",
      exclusiveAnswer:
        "Exclusive mortgage access requires manual review because consent, licensing, geography, contact fields, and source rights matter.",
      buildAnswer:
        "Yes. LeadFlow can build mortgage intake, AI receptionist response, appointment booking, CRM automation, follow-up, dashboards, and reporting.",
    }),
    marketplaceAngle: "Review mortgage and refinance signals with compliance status visible.",
    buildSystemAngle: "Build the mortgage response, booking, AI receptionist, and CRM automation system.",
    primaryKeywords: ["mortgage leads", "lead scoring", "AI receptionist", "buyer intent"],
    relatedSlugs: ["va-irrrl-leads", "real-estate-leads", "home-service-leads"],
  },
  {
    slug: "va-irrrl-leads",
    title: "VA IRRRL lead signals with source proof.",
    shortTitle: "VA IRRRL",
    industryLabel: "VA IRRRL",
    opportunityLabel: "VA IRRRL education and refinance",
    eyebrow: "VA refinance education signals",
    metaTitle: "VA IRRRL Lead Signals | The LeadFlow Pro",
    metaDescription:
      "Consent-aware VA IRRRL education and refinance interest signals for licensed mortgage buyers and approved routing paths.",
    hero: heroFor("VA IRRRL education and refinance"),
    buyerPain: commonPain("VA IRRRL", [
      "VA refinance interest is easy to mishandle when buyers cannot see consent, timing, licensed-area fit, or allowed use.",
    ]),
    signalsMatter: [
      "VA refinance education interest",
      "Rate concern signals",
      "Mortgage payment review requests",
      "Broad timeline and state fit",
      "Consent to contact",
      "Named seller or selected seller permission",
      "Suppression status",
      "Licensed buyer fit",
    ],
    sampleProfile: {
      title: "VA IRRRL Education Interest Signal",
      category: "Mortgage",
      score: 80,
      confidence: "Review",
      sourceType: "Consented education tool and licensed routing review",
      bestBuyer: "Licensed VA mortgage team",
      buyerUseCase: "Identify consented VA refinance education interest and route only when the buyer, state, consent, and allowed use fit.",
      proof: "Consent text, source path, broad timeline, state band, review notes, and suppression check.",
      nextAction: "Confirm licensing and named consent before routing or deeper access.",
    },
    availableTools: [
      {
        label: "Mortgage Lead Readiness Tool",
        href: "/tools",
        fit: "Collect broad education intent and route only through the right consent path.",
      },
      {
        label: "Lead Leak Audit",
        href: "/tools",
        fit: "Find missed calls, texts, and follow-up failures in the mortgage response path.",
      },
      ...standardTools,
    ],
    complianceNote: standardComplianceNote,
    faq: commonFaq({
      industry: "VA IRRRL",
      signalAnswer:
        "A VA IRRRL lead signal is a consent-aware clue about refinance education interest, timing, state fit, or follow-up preference. It is not a credit file, benefit claim, or private financial account record.",
      differenceAnswer:
        "A basic list may not show where the interest came from or what consent allows. A VA IRRRL signal should show source proof, consent version, suppression status, licensed-area fit, and review status.",
      verifyAnswer:
        "VA IRRRL signals require review for consent, source path, licensing fit, suppressed records, and allowed use before any named buyer receives deeper access.",
      exclusiveAnswer:
        "Exclusive VA IRRRL access can be requested, but it is manually reviewed for territory, license fit, source rights, consent scope, and compliance risk.",
      buildAnswer:
        "Yes. LeadFlow can build education pages, intake tools, AI receptionist follow-up, appointment booking, CRM automation, dashboards, and reporting.",
    }),
    marketplaceAngle: "Review consent-aware VA IRRRL education signals.",
    buildSystemAngle: "Build the VA refinance education, intake, and follow-up system.",
    primaryKeywords: ["VA IRRRL leads", "mortgage leads", "lead scoring", "appointment booking"],
    relatedSlugs: ["mortgage-leads", "real-estate-leads", "home-service-leads"],
  },
  {
    slug: "home-service-leads",
    title: "Home service lead signals with source proof.",
    shortTitle: "Home Services",
    industryLabel: "Home service",
    opportunityLabel: "home service",
    eyebrow: "Home service lead generation",
    metaTitle: "Home Service Lead Signals | The LeadFlow Pro",
    metaDescription:
      "Source-backed home service demand signals for contractors, HVAC, plumbing, restoration, and local operators.",
    hero: heroFor("home service"),
    buyerPain: commonPain("home service", [
      "Seasonal demand moves fast, and local operators lose serious jobs when calls, quote forms, and texts sit too long.",
    ]),
    signalsMatter: [
      "Missed call demand",
      "Quote request behavior",
      "Local service gaps",
      "Seasonal demand",
      "Neighborhood growth",
      "Competitor website weakness",
      "Review pattern changes",
      "Appointment booking friction",
    ],
    sampleProfile: {
      title: "Local Service Route Signal",
      category: "Home services",
      score: 84,
      confidence: "High",
      sourceType: "Public demand clue and local route review",
      bestBuyer: "Roofing, HVAC, plumbing, restoration, remodeling, landscaping",
      buyerUseCase: "Find local service categories where demand, weak follow-up, or competitor gaps create a better entry point.",
      proof: "Search demand clue, directory gap, review pattern, source link, category tags, and suppression status.",
      nextAction: "Request the local sample and confirm category, city, and access model.",
    },
    availableTools: [
      {
        label: "Local Demand Finder",
        href: "/tools",
        fit: "Find city, category, service need, and timing signals.",
      },
      {
        label: "Lead Leak Audit",
        href: "/tools",
        fit: "Find missed calls, missed texts, missed DMs, and slow follow-up.",
      },
      ...standardTools,
    ],
    complianceNote: standardComplianceNote,
    faq: commonFaq({
      industry: "home service",
      signalAnswer:
        "A home service lead signal is a source-backed clue about local demand, quote behavior, missed response paths, seasonal need, or competitor weakness.",
      differenceAnswer:
        "A lead list usually gives contact rows. A signal product explains city, category, source proof, score, confidence, freshness, suppression status, and buyer use case.",
      verifyAnswer:
        "Released home service signals should include source proof status, freshness, review status, suppression checks, and a clear allowed use.",
      exclusiveAnswer:
        "Some local packs may be exclusive by city, service category, territory, or time window after review.",
      buildAnswer:
        "Yes. LeadFlow can build an AI receptionist, missed-call text-back, quote forms, CRM automation, appointment booking, ads tracking, and owner dashboards.",
    }),
    marketplaceAngle: "Browse reviewed home service demand signals.",
    buildSystemAngle: "Build the missed-call, booking, follow-up, and local ads system.",
    primaryKeywords: ["home service leads", "missed calls", "local business marketing", "CRM automation"],
    relatedSlugs: ["contractor-leads", "local-business-leads", "real-estate-leads"],
  },
  {
    slug: "contractor-leads",
    title: "Contractor lead signals with source proof.",
    shortTitle: "Contractor",
    industryLabel: "Contractor",
    opportunityLabel: "contractor",
    eyebrow: "Contractor demand signals",
    metaTitle: "Contractor Lead Signals | The LeadFlow Pro",
    metaDescription:
      "Source-backed contractor lead signals for roofers, remodelers, trades, local crews, agencies, and operators.",
    hero: heroFor("contractor"),
    buyerPain: commonPain("contractor", [
      "Contractors need jobs, but many lead sellers give them recycled rows with no source proof, no job context, and no clear follow-up path.",
    ]),
    signalsMatter: [
      "Quote request behavior",
      "Storm, repair, remodel, and seasonal demand",
      "Weak contractor websites",
      "Missed call and slow text signals",
      "Service area gaps",
      "Review and reputation clues",
      "Public directory gaps",
      "Budget and timeline ranges where consented",
    ],
    sampleProfile: {
      title: "Contractor Demand Signal",
      category: "Contractor",
      score: 85,
      confidence: "High",
      sourceType: "Local demand review and consented tool path",
      bestBuyer: "Contractor, trades agency, local service operator",
      buyerUseCase: "Find service demand and weak follow-up paths that can support a sample request, access request, or system build.",
      proof: "Source URL, category, city, service need, freshness, proof status, and suppression status.",
      nextAction: "Request a category sample or start a custom sourcing request for a territory.",
    },
    availableTools: [
      {
        label: "Website Money Leak Checker",
        href: "/tools/seo-grader",
        fit: "Find the website funnel and CTA problems that make contractors lose jobs.",
      },
      {
        label: "Local Demand Finder",
        href: "/tools",
        fit: "Map local service category and timing demand.",
      },
      ...standardTools,
    ],
    complianceNote: standardComplianceNote,
    faq: commonFaq({
      industry: "contractor",
      signalAnswer:
        "A contractor lead signal is a reviewed clue tied to service need, geography, timing, website weakness, quote behavior, or follow-up gap.",
      differenceAnswer:
        "A list can be stale and overworked. A contractor signal explains why the opportunity exists, where it came from, how fresh it is, and what use is allowed.",
      verifyAnswer:
        "Contractor signals are reviewed for source proof, suppression status, category fit, confidence, and buyer use case before deeper access.",
      exclusiveAnswer:
        "A contractor buyer can request exclusive territory, service category, or time-window access when the listing supports it and admin review approves it.",
      buildAnswer:
        "Yes. LeadFlow can build contractor funnels, AI receptionist response, quote forms, missed-call follow-up, CRM routing, appointment booking, dashboards, and ads setup.",
    }),
    marketplaceAngle: "Browse contractor demand signals with proof attached.",
    buildSystemAngle: "Build the contractor quote, booking, and follow-up system.",
    primaryKeywords: ["contractor leads", "home service leads", "lead flow", "website funnel"],
    relatedSlugs: ["home-service-leads", "local-business-leads", "dental-marketing-leads"],
  },
  {
    slug: "dental-marketing-leads",
    title: "Dental marketing lead signals with source proof.",
    shortTitle: "Dental",
    industryLabel: "Dental marketing",
    opportunityLabel: "dental marketing and appointment",
    eyebrow: "Dental appointment demand",
    metaTitle: "Dental Marketing Lead Signals | The LeadFlow Pro",
    metaDescription:
      "Dental marketing lead signals and lead flow systems for appointment demand, missed calls, local ads, AI reception, and compliant follow-up.",
    hero: heroFor("dental marketing and appointment"),
    buyerPain: commonPain("dental marketing", [
      "Dental offices lose appointment demand when calls are missed, texts sit unanswered, forms go nowhere, and front-desk follow-up is not measured.",
    ]),
    signalsMatter: [
      "Broad appointment interest",
      "Missed calls and missed texts",
      "Local search gaps",
      "Website funnel issues",
      "Appointment booking friction",
      "Ad response path",
      "Location and timing",
      "Contact preference with consent",
    ],
    sampleProfile: {
      title: "Dental Appointment Demand Signal",
      category: "Dental marketing",
      score: 83,
      confidence: "High",
      sourceType: "Consented tool answer and local funnel review",
      bestBuyer: "Dental office, dental marketer, call handling team",
      buyerUseCase: "Identify broad appointment demand and the office follow-up path needed to handle it.",
      proof: "Source URL, broad appointment category, timing, contact preference, suppression status, and review notes.",
      nextAction: "Request sample structure, then decide whether to buy signals or build the office system.",
    },
    availableTools: [
      {
        label: "Lead Leak Audit",
        href: "/tools",
        fit: "Find missed calls, missed texts, booking gaps, and slow front-desk follow-up.",
      },
      {
        label: "Website Money Leak Checker",
        href: "/tools/seo-grader",
        fit: "Find the website funnel issue before spending more on ads.",
      },
      ...standardTools,
    ],
    complianceNote: standardComplianceNote,
    faq: commonFaq({
      industry: "dental marketing",
      signalAnswer:
        "A dental marketing signal is a business-safe clue about appointment demand, local search friction, website leaks, call handling, or follow-up readiness.",
      differenceAnswer:
        "A basic list does not explain timing, source proof, suppression status, contact permission, or office follow-up readiness. A signal product does.",
      verifyAnswer:
        "Dental signals should be reviewed for source proof, consent, suppression status, and allowed use. The general product should not collect medical details or health histories.",
      exclusiveAnswer:
        "Exclusive access may be available by market, service category, or time window after review.",
      buildAnswer:
        "Yes. LeadFlow can build dental funnels, AI receptionist routing, appointment booking, missed-call follow-up, CRM automation, local ads tracking, and reporting.",
    }),
    marketplaceAngle: "Review dental appointment demand signals and sample structure.",
    buildSystemAngle: "Build the dental missed-call, booking, and follow-up system.",
    primaryKeywords: ["dental marketing leads", "appointment booking", "AI receptionist", "website funnel"],
    relatedSlugs: ["local-business-leads", "home-service-leads", "legal-leads"],
  },
  {
    slug: "legal-leads",
    title: "Legal lead signals with source proof.",
    shortTitle: "Legal",
    industryLabel: "Legal",
    opportunityLabel: "legal inquiry",
    eyebrow: "Legal inquiry signals",
    metaTitle: "Legal Lead Signals | The LeadFlow Pro",
    metaDescription:
      "Consent-aware legal inquiry signals and intake systems for attorneys and legal marketers, with source proof and review-gated release.",
    hero: heroFor("legal inquiry"),
    buyerPain: commonPain("legal", [
      "Legal buyers need jurisdiction, practice area, consent scope, urgency, conflict awareness, and a clean source path before intake can be trusted.",
    ]),
    signalsMatter: [
      "Practice-area demand",
      "Local search gaps",
      "Intake form issues",
      "Missed consultation flow",
      "Jurisdiction and category fit",
      "Consented inquiry path",
      "Source-backed public business signals",
      "Suppression and do-not-contact status",
    ],
    sampleProfile: {
      title: "Legal Inquiry Readiness Signal",
      category: "Legal",
      score: 78,
      confidence: "Review",
      sourceType: "Consented inquiry and source-path review",
      bestBuyer: "Attorney, intake team, legal marketing operator",
      buyerUseCase: "Review category, jurisdiction, urgency, consent, and intake path before routing or buying deeper access.",
      proof: "Questionnaire path, category, jurisdiction band, consent text, proof status, and suppression check.",
      nextAction: "Review buyer eligibility, conflict rules, and named routing before access.",
    },
    availableTools: [
      {
        label: "Lead Leak Audit",
        href: "/tools",
        fit: "Find where calls, forms, texts, DMs, and intake handoffs break.",
      },
      {
        label: "What Type of Leads Should You Buy?",
        href: "/tools",
        fit: "Decide whether the buyer needs exclusive, shared, or aggregate-only legal signal products.",
      },
      ...standardTools,
    ],
    complianceNote: standardComplianceNote,
    faq: commonFaq({
      industry: "legal",
      signalAnswer:
        "A legal lead signal is a consent-aware clue about inquiry category, jurisdiction fit, urgency, source path, and allowed follow-up. It is not legal advice and not a guaranteed case.",
      differenceAnswer:
        "A list can hide old or unclear inquiries. A legal signal keeps category, source proof, consent, suppression, buyer fit, review status, and caution notes attached.",
      verifyAnswer:
        "Legal signals require review for source proof, consent scope, jurisdiction, suppression, and buyer use before release.",
      exclusiveAnswer:
        "Exclusive legal access is manually reviewed because source rights, jurisdiction, conflicts, seller scope, and consent matter.",
      buildAnswer:
        "Yes. LeadFlow can build legal intake, AI chatbot triage, CRM automation, appointment booking, dashboards, and follow-up. It should not replace licensed legal advice.",
    }),
    marketplaceAngle: "Request review-gated legal inquiry signal samples.",
    buildSystemAngle: "Build the legal intake, routing, CRM, and follow-up system.",
    primaryKeywords: ["legal leads", "lead generation", "AI chatbot", "lead scoring"],
    relatedSlugs: ["dental-marketing-leads", "local-business-leads", "political-data-and-issue-signals"],
  },
  {
    slug: "ai-saas-leads",
    title: "AI SaaS lead signals with source proof.",
    shortTitle: "AI SaaS",
    industryLabel: "AI SaaS",
    opportunityLabel: "AI SaaS",
    eyebrow: "AI and SaaS demand signals",
    metaTitle: "AI SaaS Lead Signals | The LeadFlow Pro",
    metaDescription:
      "AI SaaS lead signals for agencies, integration builders, automation shops, and software teams looking for source-backed buyer intent.",
    hero: heroFor("AI SaaS"),
    buyerPain: commonPain("AI SaaS", [
      "AI tool lists are noisy, and many do not show who needs setup, integration, workflow automation, distribution, or CRM follow-up.",
    ]),
    signalsMatter: [
      "AI tool launch signals",
      "Pricing page changes",
      "Integration needs",
      "Workflow pain",
      "Automation readiness",
      "Comparison and buying intent",
      "Product category and adoption clue",
      "Implementation budget band where consented",
    ],
    sampleProfile: {
      title: "AI Tool Launch Signal",
      category: "AI SaaS",
      score: 82,
      confidence: "Medium",
      sourceType: "Launch page, pricing page, and public adoption clue",
      bestBuyer: "SaaS agency, integration builder, automation shop",
      buyerUseCase: "Find AI tools, SaaS teams, and businesses that may need setup, integration, automation, or distribution support.",
      proof: "Launch post, pricing page, category tags, traffic clue, freshness, and review notes.",
      nextAction: "Request sample profiles and build a watchlist for relevant categories.",
    },
    availableTools: [
      {
        label: "AI Automation Readiness Score",
        href: "/tools",
        fit: "Find businesses ready for an AI receptionist, AI chatbot, AI agent, or workflow automation.",
      },
      {
        label: "Business Signal Score",
        href: "/tools",
        fit: "Score the lead flow before a SaaS team spends more on acquisition.",
      },
      ...standardTools,
    ],
    complianceNote: standardComplianceNote,
    faq: commonFaq({
      industry: "AI SaaS",
      signalAnswer:
        "An AI SaaS lead signal is a source-backed clue about launch activity, workflow pain, implementation interest, pricing review, integration need, or automation readiness.",
      differenceAnswer:
        "A tool list gives names. A signal product explains why the opportunity exists, what proof is attached, how fresh it is, and what buyer use case fits.",
      verifyAnswer:
        "AI SaaS signals are reviewed for public source proof, permission status, confidence, suppression, and buyer use case.",
      exclusiveAnswer:
        "Some AI SaaS signal products can be sold as shared, limited-seat, exclusive category, or time-window access after review.",
      buildAnswer:
        "Yes. LeadFlow can build AI SaaS funnels, demo request paths, AI agent follow-up, CRM automation, lead scoring, dashboards, and reporting.",
    }),
    marketplaceAngle: "Open AI SaaS launch and automation demand signals.",
    buildSystemAngle: "Build the AI SaaS capture, scoring, chatbot, and CRM system.",
    primaryKeywords: ["AI SaaS leads", "AI agent", "business automation", "buyer intent"],
    relatedSlugs: ["ecommerce-leads", "creator-audience-leads", "local-business-leads"],
  },
  {
    slug: "local-business-leads",
    title: "Local business lead signals with source proof.",
    shortTitle: "Local Business",
    industryLabel: "Local business",
    opportunityLabel: "local business",
    eyebrow: "Local business marketing",
    metaTitle: "Local Business Lead Signals | The LeadFlow Pro",
    metaDescription:
      "Local business lead generation, source-backed demand signals, AI receptionist paths, CRM automation, and lead flow systems.",
    hero: heroFor("local business"),
    buyerPain: commonPain("local business", [
      "Owners often buy attention before they can catch attention, route it, score it, and follow up fast enough.",
    ]),
    signalsMatter: [
      "Missed calls",
      "Missed texts",
      "Missed DMs",
      "Weak websites",
      "Facebook ads and Instagram ads response paths",
      "Local search demand",
      "Appointment booking gaps",
      "CRM automation readiness",
    ],
    sampleProfile: {
      title: "Local Business Signal Score",
      category: "Local business",
      score: 86,
      confidence: "High",
      sourceType: "Tool answers, public page review, and local demand clue",
      bestBuyer: "Local operator, agency, web builder, automation shop",
      buyerUseCase: "Find the business problem behind the lead flow issue and decide whether to buy signals or build the system.",
      proof: "Website URL, source path, local category, missed follow-up clue, score explanation, and review status.",
      nextAction: "Run the tool, then choose buy lead signals or build the lead machine.",
    },
    availableTools: [
      {
        label: "Local Demand Finder",
        href: "/tools",
        fit: "Map local service demand, category, and timing.",
      },
      {
        label: "Website Money Leak Checker",
        href: "/tools/seo-grader",
        fit: "Find website funnel and local SEO gaps.",
      },
      ...standardTools,
    ],
    complianceNote: standardComplianceNote,
    faq: commonFaq({
      industry: "local business",
      signalAnswer:
        "A local business lead signal is a source-backed clue about demand, missed follow-up, local search, website weakness, ad response, or buyer intent.",
      differenceAnswer:
        "A list gives rows. A local signal shows why the opportunity exists, where the source came from, how fresh it is, what the score means, and what path should happen next.",
      verifyAnswer:
        "Local business signals are reviewed for source proof, freshness, confidence, suppression, and allowed use before deeper access.",
      exclusiveAnswer:
        "Exclusive access may be available by city, category, route, or time window if the listing and source rights allow it.",
      buildAnswer:
        "Yes. LeadFlow can build local funnels, AI receptionist response, missed-call text-back, CRM automation, appointment booking, ads tracking, and dashboards.",
    }),
    marketplaceAngle: "Browse local business demand and website neglect signals.",
    buildSystemAngle: "Build the local business marketing, follow-up, and automation system.",
    primaryKeywords: ["local business leads", "local business marketing", "lead flow", "AI receptionist"],
    relatedSlugs: ["home-service-leads", "contractor-leads", "dental-marketing-leads"],
  },
  {
    slug: "political-data-and-issue-signals",
    title: "Political data and issue signals with source proof.",
    shortTitle: "Issue Signals",
    industryLabel: "Political data and issue",
    opportunityLabel: "aggregate civic issue",
    eyebrow: "Aggregate civic issue signals",
    metaTitle: "Political Data and Issue Signals | The LeadFlow Pro",
    metaDescription:
      "Aggregate political issue signals and civic data products focused on public issue demand, district-level trends, and source-backed insight.",
    hero: heroFor("aggregate civic issue"),
    buyerPain: commonPain("political and civic", [
      "Civic data becomes risky when it turns public issue interest into hidden individual persuasion profiles instead of aggregate issue signals.",
    ]),
    signalsMatter: [
      "Issue-level public sentiment",
      "Public meeting interest",
      "District-level concern patterns",
      "Petition or survey responses with consent",
      "Aggregate civic issue dashboards",
      "Public source context",
      "Approved public comments",
      "Anonymous issue priority counts",
    ],
    sampleProfile: {
      title: "Aggregate Issue Pulse Signal",
      category: "Civic issue signals",
      score: 74,
      confidence: "Review",
      sourceType: "Aggregate tool responses and public issue source review",
      bestBuyer: "Civic organization, media desk, issue researcher, campaign analyst",
      buyerUseCase: "Understand aggregate public issue demand by geography or topic without building an individual persuasion dossier.",
      proof: "Aggregate count, issue category, geography band, source path, methodology note, and review status.",
      nextAction: "Request aggregate insight only and review methodology before use.",
    },
    availableTools: [
      {
        label: "Political Issue Pulse",
        href: "/tools",
        fit: "Collect aggregate issue priority and public opinion signals without individual persuasion targeting.",
      },
      {
        label: "Lead Leak Audit",
        href: "/tools",
        fit: "Use only for civic organization intake, response, and follow-up system gaps.",
      },
      ...standardTools,
    ],
    complianceNote: standardComplianceNote,
    faq: commonFaq({
      industry: "political data and issue",
      signalAnswer:
        "A civic issue signal is an aggregate or consented clue about what issues people care about, where attention is moving, and what public sources show.",
      differenceAnswer:
        "A voter or persuasion list can target people in ways they did not expect. LeadFlow civic pages are built for aggregate issue insight, public source context, consented survey responses, and manual review.",
      verifyAnswer:
        "Civic signals require source review, aggregate thresholds, consent checks, suppression controls, and methodology notes before release.",
      exclusiveAnswer:
        "Civic exclusivity is limited and review-heavy. Individual political persuasion profiles are not built or sold without explicit, lawful, informed consent and legal review.",
      buildAnswer:
        "Yes. LeadFlow can build an issue pulse survey, public intake, aggregate dashboard, source monitor, opt-in updates, and review workflow.",
    }),
    marketplaceAngle: "Request aggregate civic issue signal products.",
    buildSystemAngle: "Build an aggregate issue pulse, dashboard, and public intake system.",
    primaryKeywords: ["political data", "issue signals", "source-backed leads", "buyer intent"],
    relatedSlugs: ["legal-leads", "local-business-leads", "creator-audience-leads"],
  },
  {
    slug: "creator-audience-leads",
    title: "Creator audience lead signals with source proof.",
    shortTitle: "Creator Audience",
    industryLabel: "Creator audience",
    opportunityLabel: "creator audience",
    eyebrow: "Creator and audience signals",
    metaTitle: "Creator Audience Lead Signals | The LeadFlow Pro",
    metaDescription:
      "Creator audience lead signals for brands, agencies, operators, sponsors, and partners looking for source-backed audience demand.",
    hero: heroFor("creator audience"),
    buyerPain: commonPain("creator audience", [
      "Brands and agencies see follower counts but miss audience need, buyer intent, offer fit, and whether a creator channel can actually route demand.",
    ]),
    signalsMatter: [
      "Creator channel category",
      "Audience intent clues",
      "Engagement pattern",
      "Offer and sponsor fit",
      "Comment and question themes",
      "Landing page or link-in-bio gaps",
      "Email or community capture readiness",
      "Consent for submitted audience sources",
    ],
    sampleProfile: {
      title: "Creator Audience Signal",
      category: "Creator audience",
      score: 79,
      confidence: "Medium",
      sourceType: "Public creator channel and submitted audience review",
      bestBuyer: "Brand, agency, sponsor, productized service operator",
      buyerUseCase: "Find audience demand and sponsor fit without relying only on follower count or vanity metrics.",
      proof: "Public channel link, audience category, engagement clue, offer fit, source review, and suppression status.",
      nextAction: "Request a redacted sample or submit a creator source for review.",
    },
    availableTools: [
      {
        label: "Buyer Personality Signal Quiz",
        href: "/tools",
        fit: "Collect general preference and buying style signals for non-sensitive commercial categories.",
      },
      {
        label: "Ecommerce Growth Finder",
        href: "/tools",
        fit: "Match creator audiences to product, offer, and marketplace opportunity.",
      },
      ...standardTools,
    ],
    complianceNote: standardComplianceNote,
    faq: commonFaq({
      industry: "creator audience",
      signalAnswer:
        "A creator audience lead signal is a source-backed clue about audience demand, category fit, engagement pattern, offer interest, or sponsor opportunity.",
      differenceAnswer:
        "A creator list often stops at handles and follower counts. A signal product explains audience context, source proof, confidence, buyer use case, and what can be done next.",
      verifyAnswer:
        "Creator audience signals are reviewed for public source context, submitted-source rights, suppression status, confidence, and buyer use case.",
      exclusiveAnswer:
        "Some creator audience products may be available as shared, limited-seat, sponsor-category, or time-window access after review.",
      buildAnswer:
        "Yes. LeadFlow can build creator landing pages, quiz funnels, audience capture, CRM automation, sponsor intake, dashboards, and reporting.",
    }),
    marketplaceAngle: "Browse creator audience signals with proof attached.",
    buildSystemAngle: "Build the creator audience capture, scoring, and sponsor routing system.",
    primaryKeywords: ["creator audience leads", "lead marketplace", "buyer intent", "source-backed leads"],
    relatedSlugs: ["ecommerce-leads", "ai-saas-leads", "political-data-and-issue-signals"],
  },
];

export const leadFlowIndustrySlugs = leadFlowIndustryPages.map((page) => page.slug);

export function getLeadFlowIndustryPage(slug: string) {
  return leadFlowIndustryPages.find((page) => page.slug === slug) ?? null;
}

export function industrySystemKeywordFit() {
  return systemKeywordFit;
}
