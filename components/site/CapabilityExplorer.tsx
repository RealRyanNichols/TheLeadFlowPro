"use client";

import Link from "next/link";
import { useMemo, useRef, useState } from "react";
import { ArrowRight, Check, ExternalLink } from "lucide-react";
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
        build: "A repeatable research, production, approval, publishing, and measurement system—not a random post calendar.",
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
  const [stageId, setStageId] = useState("convert");
  const [capabilityId, setCapabilityId] = useState("crm");
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
              Reference prices checked September 1, 2026. Vendors change plans and usage fees. We compare total cost, required features, ownership, portability, and integration before recommending a build—not a blanket promise that custom is cheaper for every business.
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
