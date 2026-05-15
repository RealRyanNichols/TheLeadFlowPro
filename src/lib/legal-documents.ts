export const LEGAL_LAST_UPDATED = "May 15, 2026";
export const LEGAL_ENTITY = "REAL RYAN NICHOLS LLC";
export const LEGAL_EMAIL = "Hello@TheLeadFlowPro.com";

export type LegalDocument = {
  path: string;
  title: string;
  h1: string;
  description: string;
  sections: Array<{
    title: string;
    body: string[];
  }>;
};

export const PRIVACY_POLICY: LegalDocument = {
  path: "/privacy-policy",
  title: "Privacy Policy | The LeadFlow Pro",
  h1: "Privacy Policy",
  description:
    "How The LeadFlow Pro collects, uses, protects, and deletes business, lead, form, audit, and client workspace information.",
  sections: [
    {
      title: "What we collect",
      body: [
        "We collect the information needed to review your business path, respond to your request, deliver paid work, and operate the website. This can include your name, email, phone, business name, website, lead source, revenue range, form answers, chat messages, booking details, and payment status.",
        "For audits and custom builds, you may share website links, ad context, screenshots, tool ideas, platform notes, forms, process details, or account handoff instructions. Do not send passwords, API keys, private customer data, medical data, financial records, or other sensitive material unless Ryan gives you a secure handoff path.",
      ],
    },
    {
      title: "How we use it",
      body: [
        "We use your information to review lead flow, identify leaks, reply to your request, prepare a blueprint, deliver services, create client workspaces, process payments, track status, and improve the site.",
        "We may use anonymous or aggregate website behavior to understand which pages, buttons, forms, and offers are working. We do not publish private lead or client information.",
      ],
    },
    {
      title: "Tracking and advertising data",
      body: [
        "The site may use analytics, Meta Pixel, conversion events, UTM parameters, and server-side event tracking to understand traffic source, page views, lead submissions, checkout clicks, booking clicks, phone clicks, and email clicks.",
        "This tracking is used to measure the buyer path and improve follow-up. It is not a promise that ads will be approved, cheaper, profitable, or guaranteed to produce a specific result.",
      ],
    },
    {
      title: "Who receives data",
      body: [
        "We do not sell your data. We may use service providers such as hosting, database, email, analytics, payment processing, booking, automation, and communication tools to run the business.",
        "Payment information is processed by Stripe or another payment provider. The LeadFlow Pro does not store full card numbers.",
      ],
    },
    {
      title: "Client ownership and account control",
      body: [
        "When Ryan builds websites, tools, dashboards, automations, or software, the default goal is client-owned accounts and client-owned assets unless a separate agreement says otherwise.",
        "That means the client should control code, data, assets, API keys, platform logins, admin access, domains, repositories, deployments, and connected accounts after handoff.",
      ],
    },
    {
      title: "Export, deletion, and contact",
      body: [
        `You can request export or deletion of your account data by emailing ${LEGAL_EMAIL}. Some records may need to be kept for payment, tax, security, legal, fraud-prevention, or dispute reasons.`,
        "We will make a practical good-faith effort to respond within 30 days.",
      ],
    },
  ],
};

export const TERMS_OF_SERVICE: LegalDocument = {
  path: "/terms",
  title: "Terms of Service | The LeadFlow Pro",
  h1: "Terms of Service",
  description:
    "Plain-English terms for audits, custom builds, consulting, client handoff, account ownership, payment, and responsible use.",
  sections: [
    {
      title: "Who operates this service",
      body: [
        `The LeadFlow Pro is operated by ${LEGAL_ENTITY}, a Texas limited liability company.`,
        "By using the site, submitting a form, buying an audit, booking a call, using a client workspace, or purchasing a service, you agree to these terms.",
      ],
    },
    {
      title: "No guaranteed outcomes",
      body: [
        "We do not guarantee followers, leads, sales, ROAS, CPL, revenue, rankings, ad approval, platform approval, or any specific business outcome.",
        "Ryan gives practical review, build work, systems, content, tracking, and recommendations. Your market, offer, team, speed, budget, platform rules, and follow-through still matter.",
      ],
    },
    {
      title: "Audits, blueprints, and custom builds",
      body: [
        "A Lead Leak Audit is a review deliverable. A Stump Ryan blueprint is a planning deliverable. Neither is a finished software product unless a separate paid build agreement says so.",
        "Custom websites, apps, dashboards, automations, and internal tools are scoped by the agreed offer, checkout page, invoice, proposal, or written message thread.",
      ],
    },
    {
      title: "Ownership and no hostage hosting",
      body: [
        "Unless a separate written agreement says otherwise, Ryan builds in or transfers to the client's own Shopify, Wix, WordPress, Vercel, GitHub, Supabase, domain, ad account, CRM, or other relevant account.",
        "The client owns the code, assets, data, keys, logins, and access after handoff. Optional managed hosting, support, or maintenance can be purchased separately, but it is not the default hostage model.",
      ],
    },
    {
      title: "Client responsibilities",
      body: [
        "You are responsible for giving accurate information, lawful access, needed approvals, account permissions, brand assets, and timely feedback.",
        "You must not use The LeadFlow Pro for spam, deception, impersonation, harassment, illegal scraping, privacy violations, phishing, or unlawful activity.",
      ],
    },
    {
      title: "Limits of liability",
      body: [
        "The service is provided as-is and as-available. We are not liable for indirect damages, lost profits, platform outages, ad account decisions, software provider outages, or third-party policy changes.",
        "To the maximum extent allowed by law, total liability is limited to the amount you paid to The LeadFlow Pro for the specific service at issue in the 90 days before the claim.",
      ],
    },
    {
      title: "Texas law",
      body: [
        "These terms are governed by Texas law. If a dispute comes up, contact Ryan first so there is a chance to fix it directly.",
      ],
    },
  ],
};

export const REFUND_POLICY: LegalDocument = {
  path: "/refunds",
  title: "Refund Policy | The LeadFlow Pro",
  h1: "Refund Policy",
  description:
    "How refunds work for Lead Leak Audits, paid consulting, build deposits, custom software, subscriptions, and one-time services.",
  sections: [
    {
      title: "Lead Leak Audit refunds",
      body: [
        "If Ryan has not started reviewing your business path, you can request a refund for the $197 Lead Leak Audit.",
        "Once Ryan has started the audit review or delivered the readout, the audit is generally not refundable because the time and work have already been spent.",
      ],
    },
    {
      title: "Build deposits",
      body: [
        "Build deposits reserve capacity and start planning or production. If no work has started, Ryan can refund or credit the deposit at his discretion.",
        "After planning, design, coding, automation, research, or implementation work begins, deposits are generally credited toward the scoped work and are not treated as risk-free holds.",
      ],
    },
    {
      title: "Custom builds and delivered work",
      body: [
        "Custom websites, tools, dashboards, automations, and software are built around your specific business. Once delivered or substantially worked, they are generally not refundable.",
        "If something is broken because of Ryan's implementation, Ryan will make a reasonable effort to fix the issue within the agreed scope.",
      ],
    },
    {
      title: "Subscriptions and managed services",
      body: [
        "Subscription or managed-service cancellations stop future billing. They do not automatically refund time already worked, software already configured, or services already delivered.",
        "If a separate offer includes a specific refund window, that offer controls for that purchase.",
      ],
    },
    {
      title: "How to request a refund",
      body: [
        `Email ${LEGAL_EMAIL} with the purchase email, service purchased, date, and reason for the request.`,
        "Refunds approved by Ryan are returned to the original payment method when possible.",
      ],
    },
  ],
};

export const LEGAL_DOCUMENTS = [PRIVACY_POLICY, TERMS_OF_SERVICE, REFUND_POLICY];
