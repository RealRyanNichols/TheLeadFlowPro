"use client";

import Image from "next/image";
import Link from "next/link";
import { useMemo, useRef, useState } from "react";
import { ArrowRight, Check, ExternalLink, MousePointerClick, Sparkles } from "lucide-react";
import { track } from "@/lib/analytics/client";

type MarketExample = {
  name: string;
  price: string;
  href?: string;
};

type Capability = {
  id: string;
  name: string;
  plain: string;
  value: string;
  build: string;
  examples: MarketExample[];
};

type Stage = {
  id: string;
  number: string;
  name: string;
  verb: string;
  body: string;
  capabilities: Capability[];
};

type CapabilityVisual = {
  image: string;
  width: number;
  height: number;
  alt: string;
  eyebrow: string;
  title: string;
  body: string;
  steps: [string, string, string];
  proofHref: string;
  proofLabel: string;
  guideHref: string;
};

const WEBFLOW = "https://webflow.com/pricing";
const HUBSPOT = "https://www.hubspot.com/products/crm?software=crm";
const HIGHLEVEL = "https://help.gohighlevel.com/support/solutions/articles/48001208376-billing-faq";
const CALENDLY = "https://calendly.com/pricing";
const STRIPE = "https://stripe.com/pricing";
const ZAPIER = "https://zapier.com/pricing";

const STAGES: Stage[] = [
  {
    id: "attract",
    number: "01",
    name: "Attract",
    verb: "Get attention",
    body: "Give the right people a reason to stop, understand the offer, and take the next step.",
    capabilities: [
      {
        id: "positioning",
        name: "Positioning",
        plain: "The one clear answer to who you help, what problem you solve, and why somebody should choose you.",
        value: "Without it, ads and pages make noise. With it, the right buyer understands the business fast.",
        build: "A plain-English market position, proof hierarchy, promise, objections, and message your team can repeat.",
        examples: [{ name: "Typical market", price: "Usually sold as consulting or a project; there is no useful universal seat price." }],
      },
      {
        id: "offers",
        name: "Offers",
        plain: "The exact thing a customer can buy: scope, price, proof, terms, and the next action.",
        value: "A strong offer removes uncertainty before a sales call and gives marketing something concrete to promote.",
        build: "The offer structure, page, qualification rules, checkout path, and approval points around the sale.",
        examples: [{ name: "Typical market", price: "Strategy, copy, checkout, and fulfillment are often sold as separate services." }],
      },
      {
        id: "public-website",
        name: "Public website",
        plain: "The business location you control on the internet: what you do, why it matters, and how to contact or buy from you.",
        value: "It gives search, referrals, ads, and word of mouth one credible place to land.",
        build: "An owned, mobile-first site connected to forms, analytics, follow-up, and the operating system behind it.",
        examples: [
          { name: "Webflow Basic", price: "$15/month billed yearly on its current public plan.", href: WEBFLOW },
          { name: "Custom owned build", price: "Scoped by pages, data, integrations, and ownership requirements." },
        ],
      },
      {
        id: "landing-pages",
        name: "Landing pages",
        plain: "A focused page built for one audience, one promise, and one next step.",
        value: "It keeps ad traffic from getting lost in a general website and makes response easier to measure.",
        build: "Campaign pages with source tracking, proof, qualification, forms, booking, or checkout built in.",
        examples: [
          { name: "Webflow Basic", price: "$15/month billed yearly before build work or add-ons.", href: WEBFLOW },
          { name: "HighLevel Starter", price: "$97/month and includes funnel and website tools.", href: HIGHLEVEL },
        ],
      },
      {
        id: "funnels",
        name: "Funnels",
        plain: "A sequence that moves a person from interest to action instead of hoping one page does everything.",
        value: "Each step answers the next question and shows exactly where people continue or leave.",
        build: "Entry page, qualification, follow-up, checkout, confirmation, and attribution as one path.",
        examples: [{ name: "HighLevel Starter", price: "$97/month on its current public agency plan.", href: HIGHLEVEL }],
      },
      {
        id: "content",
        name: "Content",
        plain: "Useful articles, video, email, and posts that answer the questions buyers already have.",
        value: "Good content earns attention before the sales conversation and keeps working after it is published.",
        build: "A repeatable research, production, approval, publishing, and measurement system, not a random post calendar.",
        examples: [{ name: "HubSpot CRM", price: "Free tools are available; paid CRM tiers begin per seat.", href: HUBSPOT }],
      },
      {
        id: "seo",
        name: "SEO",
        plain: "Making the site understandable to search engines and useful to people searching for the problem you solve.",
        value: "It can turn existing demand into qualified visits without paying for every click forever.",
        build: "Technical foundations, local and service pages, structured data, internal links, content, and measured search outcomes.",
        examples: [{ name: "Common tools", price: "Google Search Console is free; commercial research platforms use changing monthly plans." }],
      },
      {
        id: "ads",
        name: "Ads",
        plain: "Paid placement that puts a specific offer in front of a chosen audience now.",
        value: "Ads can create controlled traffic quickly, but only when the offer, page, tracking, and follow-up are ready.",
        build: "Campaign structure, creative, landing path, real conversion events, lead routing, and budget guardrails.",
        examples: [{ name: "Meta and Google", price: "Ad spend is separate from creative, setup, management, and the system receiving the lead." }],
      },
    ],
  },
  {
    id: "convert",
    number: "02",
    name: "Convert",
    verb: "Work the lead",
    body: "Capture every inquiry, preserve the history, and make the next action impossible to miss.",
    capabilities: [
      {
        id: "lead-capture",
        name: "Lead capture",
        plain: "The front door that turns a call, text, form, chat, or direct message into a real customer record.",
        value: "It stops valuable inquiries from living in separate inboxes where nobody owns the next move.",
        build: "Connected forms and channels with source, consent, contact details, routing, and immediate acknowledgement.",
        examples: [
          { name: "HubSpot CRM", price: "A free CRM is available for up to two users.", href: HUBSPOT },
          { name: "HighLevel Starter", price: "$97/month plus applicable communication usage.", href: HIGHLEVEL },
        ],
      },
      {
        id: "lead-scoring",
        name: "Lead scoring",
        plain: "A simple way to rank which inquiries are ready, qualified, urgent, or still early.",
        value: "The team spends attention on the people most likely to move instead of treating every name the same.",
        build: "Explainable rules based on fit and behavior, with human overrides and no mystery AI score.",
        examples: [{ name: "HubSpot CRM Professional", price: "Advanced CRM tiers and scoring are priced per seat and by product.", href: HUBSPOT }],
      },
      {
        id: "crm",
        name: "CRM",
        plain: "CRM means customer relationship management: one record showing who the person is, what happened, and what happens next.",
        value: "Nobody has to search five apps or ask who last spoke to the customer. The complete relationship stays together.",
        build: "A customer record, timeline, owner, tasks, pipeline, consent, source, notes, and reporting around the way your business sells.",
        examples: [
          { name: "HubSpot CRM", price: "Free for up to two users; paid CRM editions start per seat.", href: HUBSPOT },
          { name: "HighLevel", price: "$97, $297, or $497 per month on current agency plans.", href: HIGHLEVEL },
        ],
      },
      {
        id: "pipeline",
        name: "Pipeline",
        plain: "A visible board showing where every opportunity sits from new inquiry to won, lost, or follow-up.",
        value: "It makes stalled deals and missing next actions visible before they disappear.",
        build: "Stages, ownership, deadlines, reasons lost, values, and automations tied to real sales actions.",
        examples: [
          { name: "HubSpot CRM", price: "Free pipeline tools are available; advanced controls require paid tiers.", href: HUBSPOT },
          { name: "HighLevel Starter", price: "$97/month on its current public plan.", href: HIGHLEVEL },
        ],
      },
      {
        id: "calls",
        name: "Calls",
        plain: "Business calls connected to the customer record, the source, and the next task.",
        value: "The call stops being an isolated phone event and becomes part of the sale history.",
        build: "Click-to-call, tracking numbers, dispositions, recordings where lawful, ownership, and missed-call follow-up.",
        examples: [{ name: "HighLevel", price: "Platform plans start at $97/month; phone usage is billed separately.", href: HIGHLEVEL }],
      },
      {
        id: "texts",
        name: "Texts",
        plain: "Permission-based business messaging that is attached to the same customer history as calls and forms.",
        value: "Fast replies and reminders happen where customers already respond, without losing context.",
        build: "Consent, templates, routing, opt-out handling, reply ownership, and timed follow-up.",
        examples: [{ name: "HighLevel", price: "Platform plus carrier, number, registration, and message usage charges.", href: HIGHLEVEL }],
      },
      {
        id: "email",
        name: "Email",
        plain: "Direct messages and sequences sent from a business-controlled list and connected to the customer record.",
        value: "It keeps promises, delivers useful information, and follows up without depending on social reach.",
        build: "Transactional and campaign email, consent, segments, sequences, replies, delivery records, and attribution.",
        examples: [{ name: "Common platforms", price: "HubSpot, Mailchimp, Resend, and others price by seats, contacts, or sending volume.", href: HUBSPOT }],
      },
      {
        id: "booking",
        name: "Booking",
        plain: "A customer chooses a real available time without phone tag.",
        value: "It removes scheduling friction and can route the right lead to the right person automatically.",
        build: "Availability, qualification, routing, reminders, rescheduling, no-show recovery, and CRM updates.",
        examples: [
          { name: "Calendly Free", price: "Always-free tier with one event type and one calendar.", href: CALENDLY },
          { name: "Calendly Standard", price: "$10 per seat/month when billed yearly.", href: CALENDLY },
        ],
      },
      {
        id: "payments",
        name: "Payments",
        plain: "The secure step where an approved customer pays, starts a plan, or confirms an order.",
        value: "It connects the sale to the customer, offer, source, receipt, and fulfillment instead of leaving payment isolated.",
        build: "Checkout, invoices, deposits, plans, receipts, webhook records, and the handoff after payment.",
        examples: [{ name: "Stripe Standard", price: "2.9% + 30¢ per successful domestic-card transaction.", href: STRIPE }],
      },
    ],
  },
  {
    id: "operate",
    number: "03",
    name: "Operate",
    verb: "Deliver the work",
    body: "Give customers and the team the right view, task, permission, and next step after the sale.",
    capabilities: [
      {
        id: "customer-portals",
        name: "Customer portals",
        plain: "A private place where a customer sees their work, files, status, messages, and next actions.",
        value: "It replaces scattered email threads with one trusted place for the relationship after the sale.",
        build: "Secure sign-in, account data, deliverables, messages, approvals, billing, and role-based access.",
        examples: [{ name: "Market options", price: "HighLevel, HubSpot, membership platforms, and custom portals have very different seat and usage models." }],
      },
      {
        id: "member-student-areas",
        name: "Member and student areas",
        plain: "A private experience for lessons, resources, progress, community access, and member-only actions.",
        value: "It connects enrollment to access and progress instead of handing customers a pile of links.",
        build: "Enrollment, access rules, content, progress, resources, assessments, credentials, and support.",
        examples: [{ name: "HighLevel Starter", price: "$97/month includes membership and course capabilities on current plans.", href: HIGHLEVEL }],
      },
      {
        id: "admin-dashboards",
        name: "Admin dashboards",
        plain: "The private control room where owners see what is happening and act on it.",
        value: "It turns data into an operating queue: what changed, what is blocked, and who owns the next move.",
        build: "Real metrics, filters, approvals, exception queues, exports, and links back to the underlying record.",
        examples: [{ name: "Market options", price: "Generic dashboards may be free or per user; custom dashboards are scoped by data and actions." }],
      },
      {
        id: "team-workflows",
        name: "Team workflows",
        plain: "The repeatable handoff showing who does what, in what order, and what counts as done.",
        value: "Work stops living in one person’s memory and becomes visible, measurable, and recoverable.",
        build: "Tasks, owners, deadlines, dependencies, checklists, notifications, approvals, and audit history.",
        examples: [{ name: "Common platforms", price: "Asana, Monday, ClickUp, and similar tools generally charge per user and tier." }],
      },
      {
        id: "permissions",
        name: "Permissions",
        plain: "Rules controlling who can see, change, approve, export, or publish each kind of information.",
        value: "Customers, workers, vendors, and owners get only the access their role actually requires.",
        build: "Role-based access, protected routes, approval gates, audit events, and least-privilege vendor access.",
        examples: [{ name: "Market reality", price: "Fine-grained permissions are often reserved for higher software tiers or enterprise plans." }],
      },
      {
        id: "courses",
        name: "Courses",
        plain: "Structured learning that connects the lesson to access, progress, work, and the next module.",
        value: "A course becomes an operating product, not just a folder full of videos.",
        build: "Catalog, enrollment, payments, lessons, progress, workbooks, assessments, credentials, and publishing controls.",
        examples: [{ name: "HighLevel Starter", price: "$97/month includes course and membership tools on current plans.", href: HIGHLEVEL }],
      },
      {
        id: "archives",
        name: "Archives",
        plain: "A searchable, durable home for records, content, documents, history, or completed work.",
        value: "Important information can be found again, linked, reused, and preserved instead of disappearing in folders.",
        build: "Structured records, search, tags, dates, source labels, permissions, retention, and export.",
        examples: [{ name: "Common platforms", price: "Cloud storage and databases typically price by users, storage, bandwidth, and usage." }],
      },
      {
        id: "automation",
        name: "Automation",
        plain: "Rules that move information or trigger routine work when a real event happens.",
        value: "The system remembers repetitive promises while people keep judgment over the important decisions.",
        build: "Event triggers, conditions, actions, retry rules, human approval gates, logs, and failure alerts.",
        examples: [
          { name: "Zapier Free", price: "$0/month with 100 tasks on the current public plan.", href: ZAPIER },
          { name: "Zapier Professional", price: "Starts at $19.99/month on the current public plan.", href: ZAPIER },
        ],
      },
      {
        id: "ai-agents",
        name: "AI agents",
        plain: "Software that can read context, choose from approved actions, and complete bounded work with a record of what it did.",
        value: "Agents can reduce research and routine handling, but only when data, permissions, tools, and human gates are already sound.",
        build: "A narrow job, approved tools, source context, permissions, escalation, usage limits, logs, and human review.",
        examples: [{ name: "Market options", price: "HubSpot, Zapier, HighLevel, and model providers combine subscriptions with credits or usage fees.", href: ZAPIER }],
      },
    ],
  },
  {
    id: "own",
    number: "04",
    name: "Own",
    verb: "Keep control",
    body: "Build in accounts the business controls so the system survives any vendor, agency, or personnel change.",
    capabilities: [
      {
        id: "your-code",
        name: "Your code",
        plain: "The source files that make the website or software work, stored where your business controls access.",
        value: "You can maintain, move, audit, or hire another developer without rebuilding from screenshots.",
        build: "A documented repository, access controls, deployment path, dependency record, and handoff.",
        examples: [{ name: "Common platforms", price: "Git hosting may be free or per seat; engineering work is separate from storage." }],
      },
      {
        id: "your-database",
        name: "Your database",
        plain: "The structured source of truth for customers, transactions, content, and operating records.",
        value: "Your business data does not disappear because an agency account or app subscription ends.",
        build: "A business-controlled database with schema, permissions, backups, migrations, exports, and a data dictionary.",
        examples: [{ name: "Common platforms", price: "Managed Postgres platforms commonly combine a base plan with storage, compute, and bandwidth usage." }],
      },
      {
        id: "your-domains",
        name: "Your domains",
        plain: "The internet addresses customers use to find your company, registered in your business-controlled account.",
        value: "A domain is a core business asset. Nobody else should be able to hold the address hostage.",
        build: "Registrar ownership, DNS, renewals, access controls, records, and a documented recovery path.",
        examples: [{ name: "Common registrars", price: "Domain cost varies by extension and registrar and usually renews annually." }],
      },
      {
        id: "vendor-accounts",
        name: "Your vendor accounts",
        plain: "The hosting, email, payment, advertising, phone, and software accounts are opened in the company’s name.",
        value: "You can change agencies or contractors without losing the systems and history you paid to create.",
        build: "Business ownership, least-privilege collaborator access, billing control, recovery contacts, and an access register.",
        examples: [{ name: "Ownership rule", price: "Vendor subscription and usage fees remain visible and approved by the business." }],
      },
      {
        id: "your-analytics",
        name: "Your analytics",
        plain: "A business-controlled record of visits, sources, actions, leads, and outcomes.",
        value: "You can see what created a real result and keep the history when a vendor changes.",
        build: "First-party events, source tracking, consent boundaries, real outcome definitions, dashboards, and exports.",
        examples: [{ name: "Common tools", price: "GA4 has a free tier; first-party storage, dashboards, and implementation are separate." }],
      },
      {
        id: "customer-relationships",
        name: "Your customer relationships",
        plain: "The contact history, consent, purchases, service, and next actions belong to the company serving the customer.",
        value: "You are not renting access to your own buyers from a marketplace, ad platform, or former vendor.",
        build: "A portable customer record, documented consent, communication history, ownership, and retention rules.",
        examples: [{ name: "Core principle", price: "The relationship belongs in your CRM and database, not only inside a rented channel." }],
      },
      {
        id: "portability",
        name: "Portability",
        plain: "The practical ability to export, move, restore, and operate the system somewhere else.",
        value: "Ownership is not real if the data cannot be exported or the application cannot be redeployed.",
        build: "Documented exports, standard formats, migrations, backups, environment requirements, and tested handoff steps.",
        examples: [{ name: "What to verify", price: "Export formats, API limits, egress fees, and migration work matter more than a vendor’s ownership slogan." }],
      },
    ],
  },
];

const STAGE_VISUALS: Record<string, Omit<CapabilityVisual, "title" | "body">> = {
  attract: {
    image: "/images/homepage-v2/connected-company-hero.webp",
    width: 1920,
    height: 1080,
    alt: "A connected company system routing attention into measurable customer actions",
    eyebrow: "VISUAL WALKTHROUGH",
    steps: ["Attention source", "Clear offer", "Measured action"],
    proofHref: "/portfolio",
    proofLabel: "Open real website examples",
    guideHref: "/system/attention",
  },
  convert: {
    image: "/images/visual-system/one-customer-one-record.webp",
    width: 1254,
    height: 1254,
    alt: "Calls, texts, social messages, and website forms flowing into one customer record",
    eyebrow: "SEE THE LEAD MOVE",
    steps: ["Inquiry arrives", "One owned record", "Next action assigned"],
    proofHref: "/premier-system",
    proofLabel: "See the Premier system proof",
    guideHref: "/system/crm",
  },
  operate: {
    image: "/images/visual-system/course-system-blueprint.webp",
    width: 1254,
    height: 1254,
    alt: "A connected customer delivery system with access, progress, and the next action",
    eyebrow: "SEE THE WORK MOVE",
    steps: ["Customer need", "Owned workflow", "Delivered result"],
    proofHref: "/premier-system",
    proofLabel: "See a live operating system",
    guideHref: "/system/delivery",
  },
  own: {
    image: "/images/homepage-v2/company-operating-loop.webp",
    width: 1920,
    height: 1080,
    alt: "An owned company operating loop connecting the website, data, workflow, and reporting",
    eyebrow: "SEE WHAT STAYS YOURS",
    steps: ["Business account", "Connected asset", "Portable ownership"],
    proofHref: "/portfolio",
    proofLabel: "Inspect the owned builds",
    guideHref: "/system/reporting",
  },
};

const CAPABILITY_VISUALS: Record<string, Partial<CapabilityVisual>> = {
  "public-website": {
    image: "/og/portfolio/lonestar.jpg",
    width: 1200,
    height: 630,
    alt: "Lone Star Total Wash website showing a real LeadFlow Pro client build",
    eyebrow: "REAL CLIENT WEBSITE",
    title: "A real front door, not another template.",
    body: "Open a finished client website and see how the offer, proof, pricing, and next action work together on a phone or desktop.",
    steps: ["Buyer lands", "Offer becomes clear", "Quote starts"],
    proofHref: "https://www.lonestartotalwash.com",
    proofLabel: "Open the live client website",
    guideHref: "/system/website",
  },
  seo: {
    image: "/images/articles-v4/east-texas-business-website-guide.jpg",
    width: 1200,
    height: 630,
    alt: "A LeadFlow Pro search-focused business website guide",
    title: "Build the page that answers the search.",
    body: "Search visibility starts with a useful page, a clear service, a real location, strong internal links, and technical signals Google can understand.",
    steps: ["Question searched", "Useful page found", "Action measured"],
    proofHref: "/articles",
    proofLabel: "See the indexed article library",
    guideHref: "/system/attention",
  },
  "lead-capture": {
    image: "/images/proof/pda-lead-source-proof-2026-09-01.png",
    width: 1232,
    height: 326,
    alt: "Privacy-safe Premier Dental Academy charts showing new leads and their recorded sources",
    eyebrow: "REAL OPERATING SNAPSHOT",
    title: "Every source lands somewhere visible.",
    body: "This privacy-safe Premier Dental Academy snapshot shows calls, Facebook leads, tools, applications, and texts recorded in one operating view. It is a September 1, 2026 snapshot, not a promise of future results.",
    steps: ["Call, form, ad, or text", "Source recorded", "Lead ready to work"],
    proofHref: "/premier-system",
    proofLabel: "See the Premier build",
    guideHref: "/system/lead-capture",
  },
  "lead-scoring": {
    title: "Put the next best conversation first.",
    body: "Fit, timing, source, and behavior become understandable signals. A person can see why a lead moved up the list and override the rule when judgment matters.",
    steps: ["Fit + intent", "Explainable priority", "Human review"],
    guideHref: "/system/crm",
  },
  crm: {
    title: "One person. One history. One next move.",
    body: "This is the same connected-record pattern used behind The LeadFlow Pro and Premier Dental Academy: the source, conversation, owner, stage, and next action stay together while private customer details stay protected.",
    steps: ["Identity + source", "Complete timeline", "Owner + next task"],
    proofHref: "/premier-system",
    proofLabel: "See the Premier CRM system",
    guideHref: "/system/crm",
  },
  pipeline: {
    image: "/images/proof/pda-kpi-proof-2026-09-01.png",
    width: 1240,
    height: 121,
    alt: "Privacy-safe Premier Dental Academy KPI cards from its owned operating dashboard",
    eyebrow: "REAL DASHBOARD PROOF",
    title: "See the work that is moving, and the work that is stuck.",
    body: "A pipeline is the operating view between a new inquiry and a finished outcome. The proof image uses aggregate Academy data only; no student or lead record is exposed.",
    steps: ["New", "Contacted + qualified", "Won, lost, or next action"],
    proofHref: "/proof-floor",
    proofLabel: "Open the public proof floor",
    guideHref: "/system/crm",
  },
  calls: {
    image: "/images/proof/pda-lead-source-proof-2026-09-01.png",
    width: 1232,
    height: 326,
    alt: "Privacy-safe lead-source chart including calls recorded through Quo",
    eyebrow: "CALLS CONNECTED TO THE RECORD",
    title: "A call becomes part of the sale history.",
    body: "Quo calls can be connected to the same source, customer record, owner, and follow-up queue as forms and texts. The chart is a real aggregate snapshot with private conversations removed.",
    steps: ["Call received", "History attached", "Follow-up owned"],
    proofHref: "/premier-system",
    proofLabel: "See the connected-system proof",
    guideHref: "/system/lead-capture",
  },
  texts: {
    image: "/images/proof/pda-lead-source-proof-2026-09-01.png",
    width: 1232,
    height: 326,
    alt: "Privacy-safe lead-source chart including SMS recorded through Quo",
    eyebrow: "TEXTS CONNECTED TO THE RECORD",
    title: "The text and the call share one history.",
    body: "Permission-based Quo texting can live beside calls, forms, ownership, and the next task. The visual shows real aggregate source data without exposing a phone number or message.",
    steps: ["Consent captured", "Reply recorded", "Next move assigned"],
    proofHref: "/premier-system",
    proofLabel: "See the connected-system proof",
    guideHref: "/system/follow-up",
  },
  email: {
    image: "/images/proof/pda-kpi-proof-2026-09-01.png",
    width: 1240,
    height: 121,
    alt: "Privacy-safe Premier Dental Academy dashboard cards including its owned email-list total",
    eyebrow: "OWNED AUDIENCE SNAPSHOT",
    title: "Keep the list. Keep the history.",
    body: "The Academy dashboard measures its owned email audience alongside leads and enrollment. The screenshot is aggregate proof only and does not expose any subscriber.",
    steps: ["Permission", "Useful message", "Recorded response"],
    guideHref: "/system/follow-up",
  },
  payments: {
    image: "/images/visual-system/trace-the-sale.webp",
    width: 1254,
    height: 1254,
    alt: "A payment traced back through the customer record to the source that created the sale",
    eyebrow: "TRACE THE SALE",
    title: "Payment should start the next workflow automatically.",
    body: "The approved checkout, receipt, customer record, fulfillment task, and source can be connected without putting private card data inside the business application.",
    steps: ["Approved checkout", "Payment recorded", "Delivery starts"],
    proofHref: "/premier-system",
    proofLabel: "See the enrollment and payment system",
    guideHref: "/system/sale",
  },
  "customer-portals": {
    title: "Give the customer one trusted place to return.",
    body: "Premier connects interest, application, payment, student access, progress, and resources inside one owned experience instead of scattering the relationship across links.",
    steps: ["Secure access", "Right information", "Clear next action"],
    proofHref: "/premier-system",
    proofLabel: "See the Premier portal system",
    guideHref: "/system/delivery",
  },
  "member-student-areas": {
    title: "Enrollment should open the right experience.",
    body: "A member or student area connects access, lessons, progress, resources, and support to the person who actually enrolled.",
    steps: ["Enrollment", "Access + progress", "Next lesson"],
    proofHref: "/training",
    proofLabel: "Preview the training platform",
    guideHref: "/system/delivery",
  },
  "admin-dashboards": {
    image: "/images/proof/pda-kpi-proof-2026-09-01.png",
    width: 1240,
    height: 121,
    alt: "Privacy-safe KPI cards from the Premier Dental Academy owner dashboard",
    eyebrow: "REAL OWNER DASHBOARD",
    title: "The owner should know what needs attention today.",
    body: "These real Academy KPI cards sit inside a private operator cockpit. The public proof keeps only aggregate values and removes names, contact details, messages, and admin controls.",
    steps: ["Real records", "Useful exception", "Owner action"],
    proofHref: "/proof-floor",
    proofLabel: "Open the public proof floor",
    guideHref: "/system/reporting",
  },
  courses: {
    title: "A course becomes a working product.",
    body: "The visual connects interest, payment, access, lessons, progress, and the next module instead of treating the course as a folder of videos.",
    steps: ["Interest", "Enrollment + access", "Progress"],
    proofHref: "/training",
    proofLabel: "Preview the training platform",
    guideHref: "/system/delivery",
  },
  archives: {
    image: "/og/portfolio/realryannichols.jpg",
    width: 1200,
    height: 630,
    alt: "RealRyanNichols.com searchable archive built on owned infrastructure",
    eyebrow: "REAL SEARCHABLE ARCHIVE",
    title: "Make years of work findable again.",
    body: "RealRyanNichols.com shows how a large publishing archive can stay searchable, linked, and controlled on owned infrastructure.",
    steps: ["Structured record", "Search + filter", "Reusable history"],
    proofHref: "https://www.realryannichols.com",
    proofLabel: "Open the live archive",
    guideHref: "/system/delivery",
  },
  automation: {
    image: "/images/visual-system/automate-the-reminder.webp",
    width: 1254,
    height: 1254,
    alt: "A quote, timed follow-up, and human owner review connected in one workflow",
    title: "Automate the reminder. Keep the judgment.",
    body: "The system can remember timing, route routine work, and surface failures while a person keeps control of the consequential move.",
    steps: ["Verified trigger", "Bounded action", "Human gate"],
    proofHref: "/proof-floor",
    proofLabel: "See the action and approval views",
    guideHref: "/system/follow-up",
  },
  "your-analytics": {
    image: "/images/proof/pda-lead-source-proof-2026-09-01.png",
    width: 1232,
    height: 326,
    alt: "Privacy-safe first-party lead-source reporting from Premier Dental Academy",
    eyebrow: "FIRST-PARTY REPORTING",
    title: "Name the source before you increase the budget.",
    body: "The Academy snapshot shows how calls, ads, tools, applications, and texts can be measured in a business-controlled reporting view.",
    steps: ["Source", "Customer action", "Business outcome"],
    proofHref: "/live",
    proofLabel: "See the live proof system",
    guideHref: "/system/reporting",
  },
};

function getCapabilityVisual(stage: Stage, capability: Capability): CapabilityVisual {
  const base = STAGE_VISUALS[stage.id];
  const override = CAPABILITY_VISUALS[capability.id] ?? {};

  return {
    ...base,
    ...override,
    title: override.title ?? `${capability.name}, shown as a working system.`,
    body:
      override.body ??
      `Follow ${capability.name.toLowerCase()} from the first signal to the owned record and the next accountable action.`,
  };
}

function sendSignal(kind: "view" | "interest", stage: Stage, capability: Capability) {
  const event = kind === "interest" ? "capability_interest" : "capability_open";
  const pixelEvent = kind === "interest" ? "CapabilityInterest" : "CapabilityViewed";
  const meta = { stage: stage.id, capability: capability.id };

  track(event, { label: capability.id, meta });
  try {
    window.fbq?.("trackCustom", pixelEvent, meta);
    window.gtag?.("event", event, meta);
  } catch {
    /* Tracking must never block the explorer. */
  }
}

export default function CapabilityExplorer() {
  const [stageId, setStageId] = useState("attract");
  const [capabilityId, setCapabilityId] = useState("positioning");
  const [interested, setInterested] = useState<Set<string>>(() => new Set());
  const detailRef = useRef<HTMLElement>(null);

  const stage = useMemo(
    () => STAGES.find((item) => item.id === stageId) ?? STAGES[0],
    [stageId]
  );
  const capability = useMemo(
    () => stage.capabilities.find((item) => item.id === capabilityId) ?? stage.capabilities[0],
    [capabilityId, stage]
  );
  const visual = useMemo(() => getCapabilityVisual(stage, capability), [capability, stage]);

  function chooseStage(next: Stage) {
    const first = next.capabilities[0];
    setStageId(next.id);
    setCapabilityId(first.id);
    sendSignal("view", next, first);
  }

  function chooseCapability(next: Capability) {
    setCapabilityId(next.id);
    sendSignal("view", stage, next);
    if (window.matchMedia("(max-width: 760px)").matches) {
      requestAnimationFrame(() => detailRef.current?.scrollIntoView({ behavior: "smooth", block: "start" }));
    }
  }

  function markInterested() {
    setInterested((current) => new Set(current).add(capability.id));
    sendSignal("interest", stage, capability);
  }

  return (
    <div className="lfp-capability-explorer">
      <div className="lfp-capability-instruction" aria-hidden="true">
        <Sparkles className="h-4 w-4" />
        <span>START HERE</span>
        Choose a station, then open a visual module.
      </div>
      <div className="lfp-capability-rail" aria-label="Connected company stages">
        {STAGES.map((item) => {
          const active = item.id === stage.id;
          return (
            <button
              type="button"
              key={item.id}
              className={`lfp-capability-stage${active ? " is-active" : ""}`}
              aria-pressed={active}
              onClick={() => chooseStage(item)}
            >
              <span>{item.number}</span>
              <strong>{item.name}</strong>
              <small>{item.verb}</small>
              {active ? <em>Now viewing</em> : null}
            </button>
          );
        })}
      </div>

      <div className="lfp-capability-workbench">
        <div className="lfp-capability-menu">
          <div className="lfp-capability-menu-head">
            <div>
              <span>{stage.number} / {stage.name}</span>
              <h3>{stage.verb}</h3>
            </div>
            <p>{stage.body}</p>
          </div>
          <p className="lfp-capability-module-prompt">
            <MousePointerClick aria-hidden="true" className="h-4 w-4" />
            Tap a module to see the visual, the real-world proof, and the next move.
          </p>
          <div className="lfp-capability-module-grid" role="list" aria-label={`${stage.name} capabilities`}>
            {stage.capabilities.map((item, index) => {
              const active = item.id === capability.id;
              return (
                <button
                  type="button"
                  key={item.id}
                  className={`lfp-capability-module${active ? " is-active" : ""}`}
                  aria-pressed={active}
                  aria-controls="capability-detail"
                  onClick={() => chooseCapability(item)}
                >
                  <span>{String(index + 1).padStart(2, "0")}</span>
                  <strong>{item.name}</strong>
                  <ArrowRight aria-hidden="true" className="h-4 w-4" />
                </button>
              );
            })}
          </div>
        </div>

        <section
          ref={detailRef}
          id="capability-detail"
          className="lfp-capability-detail"
          aria-live="polite"
          aria-labelledby="capability-detail-title"
        >
          <div className="lfp-capability-detail-topline">
            <span>OPEN MODULE</span>
            <strong>{stage.name.toUpperCase()} / {capability.name.toUpperCase()}</strong>
          </div>
          <h3 id="capability-detail-title">{capability.name}</h3>
          <p className="lfp-capability-definition">{capability.plain}</p>

          <figure className="lfp-capability-visual">
            <div className="lfp-capability-visual-media">
              <Image
                src={visual.image}
                alt={visual.alt}
                width={visual.width}
                height={visual.height}
                sizes="(max-width: 980px) 100vw, 52vw"
              />
              <span>{visual.eyebrow}</span>
            </div>
            <figcaption>
              <p className="lfp-capability-visual-kicker">SEE IT. FOLLOW IT. OWN IT.</p>
              <h4>{visual.title}</h4>
              <p>{visual.body}</p>
              <ol aria-label={`${capability.name} visual path`}>
                {visual.steps.map((step, index) => (
                  <li key={step}>
                    <span>{String(index + 1).padStart(2, "0")}</span>
                    <strong>{step}</strong>
                    {index < visual.steps.length - 1 ? <ArrowRight aria-hidden="true" /> : null}
                  </li>
                ))}
              </ol>
              <div className="lfp-capability-visual-actions">
                <Link href={visual.proofHref}>
                  {visual.proofLabel}
                  <ArrowRight aria-hidden="true" className="h-4 w-4" />
                </Link>
                <Link href={visual.guideHref}>Read the indexed guide</Link>
              </div>
            </figcaption>
          </figure>

          <div className="lfp-capability-explainer">
            <div>
              <span>WHY IT MATTERS</span>
              <p>{capability.value}</p>
            </div>
            <div>
              <span>WHAT WE CAN BUILD</span>
              <p>{capability.build}</p>
            </div>
          </div>

          <div className="lfp-capability-market">
            <span>MARKET REFERENCE</span>
            <div>
              {capability.examples.map((example) => (
                <article key={`${capability.id}-${example.name}`}>
                  <strong>{example.name}</strong>
                  <p>{example.price}</p>
                  {example.href ? (
                    <a href={example.href} target="_blank" rel="noreferrer">
                      Check current vendor pricing
                      <ExternalLink aria-hidden="true" className="h-3.5 w-3.5" />
                    </a>
                  ) : null}
                </article>
              ))}
            </div>
            <small>
              Reference prices checked September 1, 2026. Vendors change plans and usage fees. We compare total cost, required features, ownership, portability, and integration before recommending a build, not a blanket promise that custom is cheaper for every business.
            </small>
          </div>

          <div className="lfp-capability-interest">
            <div>
              <span>WOULD THIS HELP YOUR BUSINESS?</span>
              <p>Your answer records this capability as an interest signal. It does not submit a form or commit you to buy.</p>
            </div>
            <div className="lfp-capability-interest-actions">
              <button
                type="button"
                className={interested.has(capability.id) ? "is-recorded" : ""}
                aria-pressed={interested.has(capability.id)}
                onClick={markInterested}
              >
                {interested.has(capability.id) ? (
                  <><Check aria-hidden="true" className="h-4 w-4" /> Interest recorded</>
                ) : (
                  <>Yes, this would help <ArrowRight aria-hidden="true" className="h-4 w-4" /></>
                )}
              </button>
              <Link href={`/start?capability=${capability.id}`} data-analytics={`capability-talk-${capability.id}`}>
                Talk through this
              </Link>
            </div>
          </div>
        </section>
      </div>
    </div>
  );
}
