export type IndustryToolLink = {
  label: string;
  href: string;
  fit: string;
};

export type IndustryLeadProfile = {
  title: string;
  score: number;
  confidence: "High" | "Medium" | "Review";
  sourceType: string;
  bestBuyer: string;
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
};

const standardTools: IndustryToolLink[] = [
  {
    label: "Lead Leak Audit",
    href: "/tools",
    fit: "Find missed calls, missed texts, missed DMs, form gaps, and slow follow-up.",
  },
  {
    label: "What Type of Leads Should You Buy?",
    href: "/tools",
    fit: "Match the buyer to the right lead marketplace product and release mode.",
  },
  {
    label: "Business Signal Score",
    href: "/tools",
    fit: "Score website funnel, lead scoring, CRM automation, and appointment booking readiness.",
  },
];

const systemKeywordFit =
  "This vertical can connect lead generation, lead flow, business automation, lead scoring, CRM automation, website funnel cleanup, appointment booking, buyer intent, lead marketplace access, and source-backed leads. When the buyer needs the system built, the stack can include an AI receptionist, AI chatbot, AI agent, Facebook ads, Instagram ads, local business marketing, and missed-call, missed-text, and missed-DM follow-up.";

export const leadFlowIndustryPages: LeadFlowIndustryPage[] = [
  {
    slug: "ecommerce-leads",
    title: "Ecommerce Lead Signals",
    shortTitle: "Ecommerce",
    eyebrow: "Ecommerce lead generation",
    metaTitle: "Ecommerce Leads and Buyer Signals | The LeadFlow Pro",
    metaDescription:
      "Buy source-backed ecommerce lead signals or build a lead flow system for vendors, stores, agencies, product sourcers, and marketplace operators.",
    hero:
      "Ecommerce buyers do not need another scraped vendor CSV. They need source-backed leads that show product category, platform clue, sourcing pain, buyer intent, and a reason to start the conversation.",
    buyerPain: [
      "Vendor lists go stale before the first outreach sequence starts.",
      "Agencies and sourcers cannot tell which stores need traffic, sourcing, conversion, or automation help.",
      "Facebook ads and Instagram ads create attention, but weak website funnel and CRM automation paths lose the signal.",
    ],
    signalsMatter: [
      "Platform, product type, storefront quality, and marketplace activity.",
      "Revenue band, sourcing pain, ad traffic clue, abandoned cart or conversion path issue.",
      "Freshness, source proof, lead scoring, contactability, and suppression status.",
    ],
    sampleProfile: {
      title: "Ecommerce Vendor Signal Pack",
      score: 87,
      confidence: "High",
      sourceType: "Public marketplace plus submitted source review",
      bestBuyer: "Ecommerce agency, product sourcer, marketplace operator",
      proof: "Sample rows, public source links, platform tags, product category, and review status.",
      nextAction: "Request a reviewed sample, then decide shared or exclusive access.",
    },
    availableTools: [
      {
        label: "Ecommerce Growth Finder",
        href: "/tools",
        fit: "Map product, platform, sourcing, traffic, and conversion pain.",
      },
      {
        label: "Website Money Leak Checker",
        href: "/tools/seo-grader",
        fit: "Check whether the store or landing page is losing buyer intent.",
      },
      ...standardTools,
    ],
    complianceNote:
      "Ecommerce profiles are reviewed for source proof, permission status, suppression status, and buyer use case. LeadFlow does not release hacked stores, private account access, minors, or protected-trait targeting.",
    faq: [
      {
        question: "What makes an ecommerce lead signal different from a vendor list?",
        answer:
          "A lead signal includes why the opportunity exists: product category, platform clue, source proof, score, confidence, freshness, and buyer use case. A plain list usually gives names without context.",
      },
      {
        question: "Can LeadFlow build the ecommerce lead flow system too?",
        answer:
          "Yes. The build path can include a website funnel, AI chatbot, AI agent, CRM automation, follow-up, appointment booking, dashboards, and paid traffic setup without promising guaranteed sales or ROAS.",
      },
    ],
    marketplaceAngle: "Browse ecommerce signal packs with source proof attached.",
    buildSystemAngle: "Build the ecommerce capture, follow-up, ads, and automation system.",
    primaryKeywords: ["ecommerce lead generation", "source-backed leads", "buyer intent", "lead marketplace"],
  },
  {
    slug: "real-estate-leads",
    title: "Real Estate Lead Signals",
    shortTitle: "Real Estate",
    eyebrow: "Real estate lead flow",
    metaTitle: "Real Estate Leads and Opportunity Signals | The LeadFlow Pro",
    metaDescription:
      "Source-backed real estate lead signals for brokerages, agent teams, CRM operators, and local market builders without blind lists or hidden owner dossiers.",
    hero:
      "Real estate teams need market signals they can trust: listing movement, coverage gaps, neighborhood demand, agent opportunity, and clear follow-up paths.",
    buyerPain: [
      "Blind real estate lead lists are often stale, recycled, or already worked by too many people.",
      "Teams spend on traffic before they know whether their appointment booking, CRM automation, and follow-up path can catch the demand.",
      "Agents need buyer intent and source proof, not trademark-adjacent pages or hidden identity dossiers.",
    ],
    signalsMatter: [
      "Listing movement, neighborhood demand, coverage gaps, and inquiry patterns.",
      "Agent or brokerage fit, market freshness, source proof, and lead scoring.",
      "Missed calls, missed texts, missed DMs, website funnel gaps, and booking path weakness.",
    ],
    sampleProfile: {
      title: "Real Estate Agent Opportunity Map",
      score: 76,
      confidence: "Medium",
      sourceType: "Public listing pattern and market coverage review",
      bestBuyer: "Brokerage, agent team, CRM operator",
      proof: "Listing movement, public source context, coverage gap, and buyer-use review.",
      nextAction: "Request the opportunity map and confirm allowed market use.",
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
    complianceNote:
      "Real estate data products must stay source-backed and review-gated. LeadFlow does not sell hidden homeowner dossiers, protected-trait targeting, private financial account data, or contact routing without the right consent mode.",
    faq: [
      {
        question: "Is this a blind real estate lead list?",
        answer:
          "No. The page is built around market signals, source proof, lead scoring, freshness, buyer fit, and review status. The goal is a better reason to start a conversation.",
      },
      {
        question: "Can a real estate team use this for local business marketing?",
        answer:
          "Yes, when the use case is reviewed and lawful. The system can support local business marketing, website funnel cleanup, AI receptionist routing, and CRM automation.",
      },
    ],
    marketplaceAngle: "Open reviewed real estate opportunity signals.",
    buildSystemAngle: "Build the real estate follow-up, booking, and automation system.",
    primaryKeywords: ["real estate leads", "lead flow", "appointment booking", "CRM automation"],
  },
  {
    slug: "mortgage-leads",
    title: "Mortgage Lead Signals",
    shortTitle: "Mortgage",
    eyebrow: "Mortgage lead readiness",
    metaTitle: "Mortgage Leads and Refi Interest Signals | The LeadFlow Pro",
    metaDescription:
      "Consent-aware mortgage and refi interest signals for licensed buyers, with source proof, suppression checks, and named routing controls.",
    hero:
      "Mortgage buyers need permissioned interest, not vague lead resale. The signal has to show timing, loan interest type, consent path, licensed-area fit, and clean follow-up status.",
    buyerPain: [
      "Shared mortgage leads often arrive late, over-sold, or without a clear consent path.",
      "Teams cannot safely act when the lead source, seller permission, or suppression status is unclear.",
      "Slow replies, missed texts, and weak appointment booking turn expensive interest into dead follow-up.",
    ],
    signalsMatter: [
      "Loan interest type, timing, state or licensed-area fit, and named consent status.",
      "Lead scoring, urgency, source proof, contactability, and suppression status.",
      "Non-account financial ranges only when disclosed and useful. No private account access.",
    ],
    sampleProfile: {
      title: "Mortgage Refi Interest Signal",
      score: 81,
      confidence: "High",
      sourceType: "Consented questionnaire and named partner path",
      bestBuyer: "Licensed mortgage team or approved refi partner",
      proof: "Consent snapshot, source URL, timing, broad interest category, and suppression status.",
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
    complianceNote:
      "Mortgage and refi signals require careful review. LeadFlow does not collect SSNs, credit report credentials, bank account access, private financial account data, minors, or hidden sensitive data. Licensed partner fit matters before release.",
    faq: [
      {
        question: "Can mortgage leads be routed to any buyer?",
        answer:
          "No. Mortgage routing must account for consent, named partner scope, licensed-area fit, suppression status, source proof, and buyer-use review.",
      },
      {
        question: "Does LeadFlow guarantee mortgage lead volume or closing rate?",
        answer:
          "No. LeadFlow can provide source-backed signals, scoring, review, routing logic, automation, and follow-up systems. It does not guarantee lead volume, CPL, ROAS, closings, or revenue.",
      },
    ],
    marketplaceAngle: "Review mortgage and refi signals with compliance status visible.",
    buildSystemAngle: "Build the mortgage response, booking, AI receptionist, and CRM automation system.",
    primaryKeywords: ["mortgage leads", "buyer intent", "AI receptionist", "lead scoring"],
  },
  {
    slug: "home-service-leads",
    title: "Home Service Lead Signals",
    shortTitle: "Home Services",
    eyebrow: "Home service lead generation",
    metaTitle: "Home Service Leads and Local Demand Signals | The LeadFlow Pro",
    metaDescription:
      "Source-backed home service lead signals for contractors, roofers, HVAC, plumbing, restoration, and local operators who need cleaner demand.",
    hero:
      "Home service businesses lose money when calls, texts, forms, and DMs are not caught fast enough. The best lead flow shows local demand, service category, timing, and follow-up readiness.",
    buyerPain: [
      "Contractors buy generic lead generation lists with no proof, no freshness, and too many competitors.",
      "Missed calls, missed texts, missed DMs, and weak appointment booking waste demand the business already earned.",
      "Local business marketing breaks when Facebook ads, Instagram ads, and website funnels are not connected to CRM automation.",
    ],
    signalsMatter: [
      "City, service category, urgency, search demand, directory gaps, review patterns, and route fit.",
      "Source-backed leads with lead scoring, confidence, freshness, and suppression checks.",
      "Speed-to-lead, AI receptionist fit, booking path, and owner-visible dashboard status.",
    ],
    sampleProfile: {
      title: "Contractor Demand Signal",
      score: 84,
      confidence: "High",
      sourceType: "Public demand clue and service route review",
      bestBuyer: "Roofing, HVAC, plumbing, remodeling, restoration",
      proof: "Search demand, directory gap, review pattern, source link, and category tags.",
      nextAction: "Request the local sample and confirm category, city, and release mode.",
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
    complianceNote:
      "Home service signals are reviewed for source proof, suppression status, and buyer use case. LeadFlow does not promise jobs, booked appointments, ROAS, CPL, or exclusive volume.",
    faq: [
      {
        question: "What home service businesses fit this page?",
        answer:
          "Roofing, HVAC, plumbing, electrical, remodeling, restoration, landscaping, pest control, and other local operators can use source-backed demand signals and lead flow systems.",
      },
      {
        question: "Can LeadFlow help fix missed calls and texts?",
        answer:
          "Yes. The build path can include AI receptionist logic, AI chatbot intake, CRM automation, appointment booking, owner alerts, and follow-up sequences.",
      },
    ],
    marketplaceAngle: "Browse reviewed local service route and contractor demand signals.",
    buildSystemAngle: "Build the missed-call, booking, follow-up, and local ads system.",
    primaryKeywords: ["home service leads", "local business marketing", "missed calls", "CRM automation"],
  },
  {
    slug: "dental-marketing-leads",
    title: "Dental Marketing Lead Signals",
    shortTitle: "Dental",
    eyebrow: "Dental marketing lead flow",
    metaTitle: "Dental Marketing Leads and Appointment Signals | The LeadFlow Pro",
    metaDescription:
      "Dental marketing lead signals and lead flow systems for appointment demand, missed calls, local ads, AI reception, and compliant follow-up.",
    hero:
      "Dental offices need non-medical appointment intent, fast response, and a cleaner path from ad click or local search to booked visit.",
    buyerPain: [
      "Dental marketing spend leaks when calls are missed, texts sit unanswered, and forms are not routed.",
      "Facebook ads, Instagram ads, and local business marketing do not work well if the office cannot catch appointment intent.",
      "Generic dental lists often lack source proof, freshness, consent status, and compliance boundaries.",
    ],
    signalsMatter: [
      "Broad appointment interest, location, timing, service category, source path, and contact preference.",
      "Missed calls, missed texts, missed DMs, booking gaps, and website funnel friction.",
      "Lead scoring, confidence, suppression status, and review-gated buyer access.",
    ],
    sampleProfile: {
      title: "Dental Appointment Demand Signal",
      score: 83,
      confidence: "High",
      sourceType: "Consented tool answer and local funnel review",
      bestBuyer: "Dental office, dental marketer, call handling team",
      proof: "Source URL, broad appointment category, timing, contact preference, and suppression status.",
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
    complianceNote:
      "Dental pages must avoid collecting medical details, health history, minors, or sensitive health data in the general product. Broad appointment interest and contact preference can be reviewed without turning the profile into a health dossier.",
    faq: [
      {
        question: "Can this collect dental patient health information?",
        answer:
          "No. The general LeadFlow product should collect broad appointment intent, location, timing, and contact path only. Medical details and minors are out of scope.",
      },
      {
        question: "What can be built for a dental office?",
        answer:
          "LeadFlow can build an AI receptionist path, AI chatbot intake, CRM automation, appointment booking flow, follow-up sequences, and a website funnel without guaranteeing patient volume or revenue.",
      },
    ],
    marketplaceAngle: "Review dental appointment demand signals and sample structure.",
    buildSystemAngle: "Build the dental missed-call, booking, and follow-up system.",
    primaryKeywords: ["dental marketing leads", "appointment booking", "AI receptionist", "website funnel"],
  },
  {
    slug: "legal-leads",
    title: "Legal Lead Signals",
    shortTitle: "Legal",
    eyebrow: "Legal lead generation",
    metaTitle: "Legal Leads and Consented Inquiry Signals | The LeadFlow Pro",
    metaDescription:
      "Consent-aware legal lead signals and intake systems for attorneys and legal marketers, with source proof, suppression controls, and review-gated release.",
    hero:
      "Legal leads are too sensitive for mystery lists. The usable signal is a consented inquiry, jurisdiction fit, case category, urgency, source proof, and a clean next step.",
    buyerPain: [
      "Legal lead generation breaks when the source, consent, jurisdiction, or case category is unclear.",
      "Attorneys and legal marketers waste time on recycled inquiries with no proof of current intent.",
      "Missed calls, missed texts, missed DMs, and slow intake can lose serious inquiries before review.",
    ],
    signalsMatter: [
      "Case category, jurisdiction, urgency, contact preference, source URL, and consent status.",
      "Named seller or selected seller permission before attorney or legal vendor routing.",
      "Lead scoring, suppression status, buyer use case, and review history.",
    ],
    sampleProfile: {
      title: "Legal Inquiry Readiness Signal",
      score: 78,
      confidence: "Review",
      sourceType: "Consented inquiry and source-path review",
      bestBuyer: "Attorney, intake team, legal marketing operator",
      proof: "Questionnaire path, category, jurisdiction band, consent text, and suppression check.",
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
    complianceNote:
      "Legal signals require review. LeadFlow does not provide legal advice, guarantee case outcomes, sell minors, publish hidden sensitive records, or route inquiries to unnamed sellers. Buyer access must match consent, jurisdiction, suppression, and use case.",
    faq: [
      {
        question: "Are legal lead signals sold like ordinary business leads?",
        answer:
          "No. Legal inquiries need stricter consent, source proof, jurisdiction fit, conflict-aware review, suppression controls, and buyer-use limits.",
      },
      {
        question: "Can LeadFlow build legal intake automation?",
        answer:
          "Yes. It can build intake forms, AI chatbot triage, CRM automation, appointment booking, and dashboards. It should not replace licensed legal advice.",
      },
    ],
    marketplaceAngle: "Request review-gated legal inquiry signal samples.",
    buildSystemAngle: "Build the legal intake, routing, CRM, and follow-up system.",
    primaryKeywords: ["legal leads", "lead generation", "AI chatbot", "lead scoring"],
  },
  {
    slug: "ai-saas-leads",
    title: "AI SaaS Lead Signals",
    shortTitle: "AI SaaS",
    eyebrow: "AI and SaaS lead marketplace",
    metaTitle: "AI SaaS Leads and Launch Signals | The LeadFlow Pro",
    metaDescription:
      "AI SaaS lead signals for agencies, integration builders, automation shops, and software teams looking for source-backed buyer intent.",
    hero:
      "AI and SaaS teams need launch, pricing, integration, usage, and workflow signals before the market gets crowded.",
    buyerPain: [
      "AI tool lists are noisy and rarely show who needs setup, integration, automation, or distribution help.",
      "SaaS teams can get attention but miss the lead flow when website funnel, CRM automation, and follow-up are weak.",
      "Buyers need source-backed leads, not fake AI screenshots or scraped private identity records.",
    ],
    signalsMatter: [
      "Launch page, pricing page, product category, integration clue, founder signal, and traffic clue.",
      "Buyer intent from tool comparisons, workflow pain, automation readiness, and implementation budget band.",
      "Freshness, lead scoring, source proof, confidence, and aggregate versus named release mode.",
    ],
    sampleProfile: {
      title: "AI Tool Launch Signal",
      score: 82,
      confidence: "Medium",
      sourceType: "Launch page, pricing page, and public adoption clue",
      bestBuyer: "SaaS agency, integration builder, automation shop",
      proof: "Launch post, pricing page, category tags, traffic clue, and review notes.",
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
    complianceNote:
      "AI SaaS signals are reviewed for public source proof, permission status, and buyer use case. LeadFlow does not use hacked accounts, hidden private workspace data, protected traits, or individual political persuasion targeting.",
    faq: [
      {
        question: "Who buys AI SaaS lead signals?",
        answer:
          "Agencies, integration builders, automation shops, productized service providers, software companies, and operators looking for workflow pain and implementation demand.",
      },
      {
        question: "Can this feed an AI agent sales system?",
        answer:
          "Yes. The build path can connect source-backed signals to scoring, CRM automation, AI agent follow-up, appointment booking, and dashboards without guaranteeing conversion rates.",
      },
    ],
    marketplaceAngle: "Open AI SaaS launch and automation demand signals.",
    buildSystemAngle: "Build the AI SaaS capture, scoring, chatbot, and CRM system.",
    primaryKeywords: ["AI SaaS leads", "AI agent", "business automation", "buyer intent"],
  },
  {
    slug: "local-business-leads",
    title: "Local Business Lead Signals",
    shortTitle: "Local Business",
    eyebrow: "Local business marketing",
    metaTitle: "Local Business Leads and Lead Flow Systems | The LeadFlow Pro",
    metaDescription:
      "Local business lead generation, source-backed demand signals, AI receptionist paths, CRM automation, and lead flow systems for operators.",
    hero:
      "Local businesses already create signals every day. Calls, texts, DMs, forms, reviews, searches, and ad clicks show demand if the lead flow is built to catch it.",
    buyerPain: [
      "Owners buy lead generation before fixing missed calls, missed texts, missed DMs, and weak website funnels.",
      "Local business marketing gets judged too early when appointment booking and follow-up are not connected.",
      "The owner cannot see which Facebook ads, Instagram ads, forms, or calls created real buyer intent.",
    ],
    signalsMatter: [
      "City, category, service need, local search demand, ad click, form path, and response speed.",
      "AI receptionist fit, AI chatbot fit, CRM automation status, lead scoring, and booking path.",
      "Source-backed leads, confidence, freshness, suppression status, and marketplace release mode.",
    ],
    sampleProfile: {
      title: "Local Business Signal Score",
      score: 86,
      confidence: "High",
      sourceType: "Tool answers, public page review, and local demand clue",
      bestBuyer: "Local operator, agency, web builder, automation shop",
      proof: "Website URL, source path, local category, missed follow-up clue, and scoring explanation.",
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
    complianceNote:
      "Local business signals must keep source context, suppression status, and buyer-use review attached. LeadFlow does not promise rankings, calls, booked appointments, CPL, ROAS, or revenue.",
    faq: [
      {
        question: "What does a local business lead flow system include?",
        answer:
          "It can include AI receptionist routing, AI chatbot intake, website funnel cleanup, CRM automation, appointment booking, missed-call text-back, dashboards, and ads tracking.",
      },
      {
        question: "Can local businesses buy signals instead of building the system?",
        answer:
          "Yes. A buyer can start with the lead marketplace, request source-backed samples, and then decide if building the capture system is the better next move.",
      },
    ],
    marketplaceAngle: "Browse local business demand and website neglect signals.",
    buildSystemAngle: "Build the local business marketing, follow-up, and automation system.",
    primaryKeywords: ["local business leads", "local business marketing", "lead flow", "AI receptionist"],
  },
  {
    slug: "political-data-and-issue-signals",
    title: "Political Data and Issue Signals",
    shortTitle: "Issue Signals",
    eyebrow: "Aggregate civic issue signals",
    metaTitle: "Political Data and Issue Signals | The LeadFlow Pro",
    metaDescription:
      "Aggregate political issue signals and civic data products focused on public issue demand, district-level trends, and source-backed insight.",
    hero:
      "Civic data should measure public issue signals without turning people into persuasion dossiers. The useful product is aggregate issue demand, source context, and transparent limits.",
    buyerPain: [
      "Political and civic buyers often see noisy opinion data without source proof, freshness, or clear geography.",
      "Individual persuasion targeting creates privacy and trust risk when the user expected an issue pulse or public-interest tool.",
      "Issue campaigns need aggregate buyer intent style signals, not hidden private identity or protected-trait targeting.",
    ],
    signalsMatter: [
      "Issue priority, geography band, public source context, district trend, and aggregate response count.",
      "Source proof, freshness, confidence, sample size, suppression status, and review status.",
      "Anonymous analytics and aggregate-only release mode unless a separate explicit permission path exists.",
    ],
    sampleProfile: {
      title: "Aggregate Issue Pulse Signal",
      score: 74,
      confidence: "Review",
      sourceType: "Aggregate tool responses and public issue source review",
      bestBuyer: "Civic organization, media desk, issue researcher, campaign analyst",
      proof: "Aggregate count, issue category, geography band, source path, and review notes.",
      nextAction: "Request aggregate insight only and review methodology before use.",
    },
    availableTools: [
      {
        label: "Political Issue Pulse",
        href: "/tools",
        fit: "Collect aggregate issue priority and public opinion signals without individual persuasion targeting.",
      },
      {
        label: "Buyer Personality Signal Quiz",
        href: "/tools",
        fit: "Use general preference logic only outside protected or persuasion-sensitive targeting.",
      },
      ...standardTools,
    ],
    complianceNote:
      "Political issue products must stay aggregate unless explicit, purpose-specific permission exists. LeadFlow does not build individual political persuasion targeting, protected-trait targeting, hidden sensitive dossiers, or minor-focused civic profiles.",
    faq: [
      {
        question: "Can LeadFlow sell individual political persuasion profiles?",
        answer:
          "No. This page is for aggregate civic issue signals, public source context, and transparent data products. Individual political persuasion targeting is out of scope.",
      },
      {
        question: "Who can use aggregate issue signals?",
        answer:
          "Civic organizations, media teams, researchers, public-interest groups, and campaign analysts can request aggregate issue insight when the use case matches the collection context.",
      },
    ],
    marketplaceAngle: "Request aggregate civic issue signal products.",
    buildSystemAngle: "Build an aggregate issue pulse, dashboard, and public intake system.",
    primaryKeywords: ["political data", "issue signals", "source-backed leads", "buyer intent"],
  },
];

export const leadFlowIndustrySlugs = leadFlowIndustryPages.map((page) => page.slug);

export function getLeadFlowIndustryPage(slug: string) {
  return leadFlowIndustryPages.find((page) => page.slug === slug) ?? null;
}

export function industrySystemKeywordFit() {
  return systemKeywordFit;
}
