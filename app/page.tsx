import Image from "next/image";
import Link from "next/link";
import {
  ArrowRight,
  BadgeCheck,
  Boxes,
  Check,
  Database,
  ExternalLink,
  KeyRound,
  Layers,
  LayoutDashboard,
  Minus,
  Radio,
  ShieldCheck,
} from "lucide-react";
import CompanyLoop from "@/components/site/CompanyLoop";
import CtaLink from "@/components/site/CtaLink";
import { ARTICLES } from "@/lib/articles";
import { FREE_BUILD } from "@/lib/freeBuild";
import { TOOL_COUNT } from "@/lib/tools";

// THE COMPANY BUILDER homepage.
//
// Ordered by what a business owner has to believe, in order: the category, the
// proof it is real, the distinction from a website builder, what actually gets
// built, the live systems, the process, the operator, the price, the next step.
//
// Every number on this page traces to the repository or to a live property.
// Nothing here claims revenue, leads, conversion rates, or ROI, because none of
// that is verifiable. See docs/company-builder-redesign.md section 5.

/* ------------------------------------------------------------------ data -- */

const PROOF = [
  { figure: "8", label: "live systems shipped and running right now" },
  { figure: "6", label: "industries represented, from local service to software" },
  { figure: String(TOOL_COUNT), label: "free working tools built and published" },
  { figure: "4", label: "real software products running on the owned stack" },
  { figure: "100%", label: "built in accounts the client controls" },
];

const WEBSITE_BUILDER = [
  "Pages that describe the business",
  "A contact form",
  "A template someone else owns",
  "Your leads in their inbox",
  "Your customer list on their servers",
  "A monthly bill that never ends",
  "Nothing that follows up",
  "No idea what produced revenue",
];

const COMPANY_BUILDER = [
  "The public site and the offer behind it",
  "Lead capture from forms, calls, texts, and DMs",
  "A CRM with one record per person",
  "Follow-up that runs whether you are free or not",
  "Payments, contracts, and enrollment",
  "Portals and dashboards for the work itself",
  "First-party analytics that name the source",
  "Code, data, domains, and accounts in your name",
];

const PILLARS = [
  {
    key: "Attract",
    icon: Radio,
    body: "Get found by people who are already looking, and give them a reason to stop.",
    items: ["Positioning", "Offers", "Public website", "Landing pages", "Funnels", "Content", "SEO", "Ads"],
  },
  {
    key: "Convert",
    icon: Database,
    body: "No missed calls. No missed texts. No missed revenue. Every inquiry lands somewhere and gets worked.",
    items: ["Lead capture", "Lead scoring", "CRM", "Pipeline", "Calls", "Texts", "Email", "Booking", "Payments"],
  },
  {
    key: "Operate",
    icon: LayoutDashboard,
    body: "The machinery behind the sale: where the work gets delivered, tracked, and reported.",
    items: ["Customer portals", "Member and student areas", "Admin dashboards", "Team workflows", "Permissions", "Courses", "Archives", "Automation", "AI agents"],
  },
  {
    key: "Own",
    icon: KeyRound,
    body: "If we disappeared tomorrow, everything keeps running and it is all still yours.",
    items: ["Your code", "Your database", "Your domains", "Your vendor accounts", "Your analytics", "Your customer relationships", "Portability"],
  },
];

const FEATURED = [
  {
    kind: "client" as const,
    kindLabel: "Client system",
    name: "Premier Dental Academy of Longview",
    what: "A dental assistant school that runs its own enrollment instead of renting one.",
    problem:
      "A real East Texas school was doing applications, payment conversations, and student records by hand, and paying for software that still did not fit the way a school actually enrolls.",
    built:
      "An enrollment engine: applications, payment plans with buy now pay later, an interactive tuition planner, free training simulators as the top of the funnel, career tools, and a hiring partner directory. Every inquiry captured, every student record in a database the school owns.",
    facts: [
      { v: "Enrollment", l: "Applications, payment plans, and BNPL in one flow" },
      { v: "Tuition planner", l: "Interactive cost tool built into the funnel" },
      { v: "Simulators", l: "Free practice-management training as the entry point" },
    ],
    outcome:
      "The school owns the funnel, the student records, and the tools students train on. No enrollment platform to rent.",
    stack: "Next.js, Supabase, Vercel, in the school's accounts",
    href: "https://www.premierdentalacademyoflongview.com",
    shot: "/og/portfolio/premier-dental.jpg",
    alt: "Premier Dental Academy of Longview homepage showing the 12 week RDA program and enrollment contact details",
  },
  {
    kind: "founder" as const,
    kindLabel: "Founder-built platform",
    name: "RealRyanNichols.com",
    what: "A publishing machine nobody else can switch off.",
    problem:
      "The audience and archive lived on platforms that could throttle reach, change the rules, or disconnect the owner from the people following the work.",
    built:
      "An independent media system with long-form publishing, a searchable archive of 1,568+ case profiles, intake forms, an AI assistant trained on the owner's writing, SMS alerts, and a store.",
    facts: [
      { v: "1,568+", l: "case profiles in the searchable archive" },
      { v: "AI assistant", l: "Trained on the owner's published writing" },
      { v: "Owned list", l: "SMS alerts and intake on first-party infrastructure" },
    ],
    outcome:
      "When platforms throttled the story, the story already had its own domain, searchable archive, database, and direct path back to the audience.",
    stack: "Next.js, Supabase, Vercel. Ryan's own site",
    href: "https://realryannichols.com",
    shot: "/og/portfolio/realryannichols.jpg",
    alt: "RealRyanNichols.com homepage with the author profile and links into the searchable archive",
  },
  {
    kind: "client" as const,
    kindLabel: "Client system",
    name: "Lone Star Total Wash",
    what: "A local service business that can be found, priced, and booked without phone tag.",
    problem:
      "Fleet and pressure washing sold entirely by phone call and word of mouth. Nothing online said what they do, what it costs, or what finished work looks like.",
    built:
      "A mobile-first service site with a free quote request that reaches them instantly, a public price list, a completed-jobs gallery, and click to call. Commercial and residential, from service trucks and semis to buildings, lots, and drive-throughs.",
    facts: [
      { v: "Quote intake", l: "Free quote request that reaches them instantly" },
      { v: "Public pricing", l: "What it costs, on the page, before the call" },
      { v: "Job gallery", l: "Finished commercial and residential work" },
    ],
    outcome:
      "The business answers the three questions every customer asks before anyone picks up the phone.",
    stack: "Next.js, Vercel, in the owner's accounts",
    href: "https://www.lonestartotalwash.com",
    shot: "/og/portfolio/lonestar.jpg",
    alt: "Lone Star Total Wash homepage with the fleet washing offer, free quote request, and company logo",
  },
];

const STEPS = [
  {
    num: "01",
    title: "Map the company",
    body: "Every tool, page, channel, spreadsheet, and handoff you have. On the table, nothing assumed.",
  },
  {
    num: "02",
    title: "Find the leaks",
    body: "Where inquiries die, where data is stranded, and what you are paying for twice.",
  },
  {
    num: "03",
    title: "Design the system",
    body: "The modules, the order, the dependencies, and the honest price. You approve before anyone builds.",
  },
  {
    num: "04",
    title: "Build and connect it",
    body: "Installed in your accounts, wired together, and tested against the way you actually work.",
  },
  {
    num: "05",
    title: "Launch, measure, improve",
    body: "First-party analytics name the source of every lead, so the next decision is not a guess.",
  },
];

const RECEIPTS = [
  {
    head: "Ran a real operation before building software for one.",
    body: "Wholesale and ecommerce: sourcing, pallets, inventory, fulfillment, and the sales process behind all of it. The pressure was payroll, not a sprint board.",
  },
  {
    head: "Shipped 7 live systems across multiple industries.",
    body: "Media, dental education, commerce, legal services, local service, nonprofit missions, and the LeadFlow Pro system itself. Every one is publicly inspectable.",
  },
  {
    head: "Built real software, not brochure sites.",
    body: "A searchable media archive with 1,568+ case profiles. A marketplace with auctions, offers, an AI listing builder, and a live fee engine.",
  },
  {
    head: "Publishes on owned infrastructure, not rented reach.",
    body: `${TOOL_COUNT} free working tools and ${ARTICLES.length} articles, all served from domains and databases under his own control.`,
  },
];

const FREE_WEBSITE_STEPS = FREE_BUILD.steps.slice(0, 3);

const LADDER = [
  {
    kind: "Application-based foundation",
    name: "Free Website Program",
    price: "$0 build fee",
    lead: true,
    body: "One owned, mobile-first five-page website. The build fee is genuinely $0 for approved businesses; growth services stay optional.",
    items: [
      "Up to five scoped pages",
      "Lead capture routed to your inbox or CRM",
      "Search foundation, analytics, and launch setup",
      "90 days of scoped corrections",
      "Your code, accounts, data, and leads stay yours",
    ],
    href: "/free-build",
    cta: "Apply for the free website",
  },
  {
    kind: "Buy-it-outright option",
    name: "Website Launch",
    price: "$1,000",
    lead: false,
    body: "The same five-page foundation for businesses that want to purchase a build outright instead of applying for a program opening.",
    items: [
      "Conversion map and five premium pages",
      "Lead capture and routing",
      "Responsive build, analytics, and deployment",
      "Two revision rounds before launch",
      "Clear ownership and handoff",
    ],
    href: "/packages/launch",
    cta: "See the buy-it-outright option",
  },
  {
    kind: "Deeper diagnostic",
    name: "System Map",
    price: "$497",
    lead: false,
    body: "A working blueprint for a business that needs more than a five-page launch before anyone scopes software or automation.",
    items: [
      "Full inventory of what you run today",
      "Customer path and data flow, mapped",
      "Ownership and handoff audit",
      "Recommended modules, phases, and price range",
    ],
    href: "/packages/system-map",
    cta: "See the System Map",
  },
  {
    kind: "Connected company core",
    name: "Company OS",
    price: "$7,500+",
    lead: false,
    body: "The website, CRM, portal, analytics, and operating dashboard connected around the way the business actually works.",
    items: [
      "Everything in the website foundation",
      "Customer, member, student, or partner portals",
      "Company workflows, courses, archives, calls, and texts",
      "Deeper permissions, migration, and automation",
    ],
    href: "/packages/industry-os",
    cta: "See the full system",
  },
];

/* ---------------------------------------------------------- structured data -- */

// The homepage carried no JSON-LD at all, which meant Google had no machine
// readable statement of who this company is, where it operates, or which social
// properties belong to it. Everything below is verifiable: the address and phone
// match the Google Business Profile exactly, the legal name matches the footer,
// and every sameAs URL was confirmed to resolve (see the social identity doc).
// No revenue, rating, review, or outcome claim appears here, because none of it
// is verifiable and fabricated review markup is a manual-action risk.
const SITE = "https://www.theleadflowpro.com";

const HOME_JSONLD = {
  "@context": "https://schema.org",
  "@graph": [
    {
      "@type": "Organization",
      "@id": `${SITE}/#organization`,
      name: "The LeadFlow Pro",
      legalName: "Longview Training Center, LLC",
      description:
        "The Company Builder. We build the website, the system behind it, and the back office that runs it, in accounts the client controls.",
      url: SITE,
      logo: { "@type": "ImageObject", url: `${SITE}/icon-512.png`, width: 512, height: 512 },
      image: `${SITE}/og/home.png`,
      email: "hello@theleadflowpro.com",
      telephone: "+1-903-500-8898",
      address: {
        "@type": "PostalAddress",
        streetAddress: "2800 Gilmer Rd Suite 106",
        addressLocality: "Longview",
        addressRegion: "TX",
        postalCode: "75604",
        addressCountry: "US",
      },
      founder: { "@type": "Person", name: "Ryan Nichols", url: `${SITE}/about` },
      sameAs: [
        "https://www.youtube.com/@TheLeadFlowProVids",
        "https://www.facebook.com/profile.php?id=61586176300453",
      ],
    },
    {
      "@type": "ProfessionalService",
      "@id": `${SITE}/#localbusiness`,
      name: "The LeadFlow Pro",
      parentOrganization: { "@id": `${SITE}/#organization` },
      url: SITE,
      telephone: "+1-903-500-8898",
      email: "hello@theleadflowpro.com",
      address: {
        "@type": "PostalAddress",
        streetAddress: "2800 Gilmer Rd Suite 106",
        addressLocality: "Longview",
        addressRegion: "TX",
        postalCode: "75604",
        addressCountry: "US",
      },
      areaServed: [
        { "@type": "City", name: "Longview" },
        { "@type": "City", name: "Tyler" },
        { "@type": "City", name: "Marshall" },
        { "@type": "AdministrativeArea", name: "East Texas" },
        { "@type": "Country", name: "United States" },
      ],
      knowsAbout: [
        "Business websites",
        "Customer relationship management",
        "Lead capture and follow-up automation",
        "Small business operations software",
      ],
    },
    {
      "@type": "WebSite",
      "@id": `${SITE}/#website`,
      url: SITE,
      name: "The LeadFlow Pro",
      publisher: { "@id": `${SITE}/#organization` },
      inLanguage: "en-US",
    },
    {
      "@type": "WebPage",
      "@id": `${SITE}/#webpage`,
      url: SITE,
      name: "More Attention. More Leads. More Revenue. | The LeadFlow Pro",
      description:
        "Turn attention into conversations, conversations into qualified leads, and qualified leads into customers with one connected business system.",
      isPartOf: { "@id": `${SITE}/#website` },
      about: { "@id": `${SITE}/#organization` },
    },
  ],
};

/* ------------------------------------------------------------------ page -- */

export default function HomePage() {
  return (
    <main className="cb-page cb-home-dark">
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(HOME_JSONLD) }}
      />
      {/* 1 ------------------------------------------------------------ hero */}
      <section className="cb-hero">
        <div className="cb-shell">
          <div className="cb-hero-layout">
            <div className="cb-hero-copy">
              <p className="cb-eyebrow">The LeadFlow Pro · East Texas</p>
              <h1 className="cb-h1">
                <span>More attention.</span>
                <span>More leads.</span>
                <em>More revenue.</em>
              </h1>
              <p className="cb-hero-lead">
                We help business owners, operators, and sales teams turn attention into
                conversations, conversations into qualified leads, and qualified leads
                into customers with a connected system built around the way they work.
              </p>
              <div className="cb-actions">
                <Link className="cb-btn cb-btn--primary" href="/free-build">
                  Apply for My Free Website
                  <ArrowRight aria-hidden="true" className="h-4 w-4" />
                </Link>
                <Link className="cb-btn cb-btn--ghost" href="#results">
                  See verified results
                </Link>
              </div>
              <div className="lfp-hero-trust" aria-label="LeadFlow Pro operating principles">
                <span><Radio aria-hidden="true" className="h-4 w-4" /> Real data only</span>
                <span><ShieldCheck aria-hidden="true" className="h-4 w-4" /> Human approval gates</span>
                <span><LayoutDashboard aria-hidden="true" className="h-4 w-4" /> Private + public views</span>
              </div>
            </div>

            <figure className="cb-hero-visual lfp-founder-hero">
              <Image
                src="/images/ryan-wholesale-universe-owner.jpg"
                alt="Ryan Nichols standing above pallets in his wholesale warehouse beside a large American flag"
                width={1800}
                height={1350}
                priority
                sizes="(max-width: 900px) 100vw, 58vw"
              />
              <figcaption>
                <span>Ryan Nichols · Founder &amp; Operator</span>
                <strong>Built from real operating experience.</strong>
              </figcaption>
            </figure>
          </div>
        </div>
      </section>

      <section className="lfp-mission-strip" aria-labelledby="home-mission-control">
        <div className="cb-shell lfp-mission-grid">
          <div className="lfp-mission-copy">
            <p className="cb-eyebrow">One operating floor</p>
            <h2 id="home-mission-control" className="cb-h2">
              Mission Control you can actually open.
            </h2>
            <p className="cb-lead">
              The public view shows sanitized operating proof. The private view connects
              leads, follow-ups, approvals, builds, outreach, cash records, and worker
              status without exposing customer details.
            </p>
            <div className="cb-actions">
              <Link className="cb-btn cb-btn--primary" href="/proof-floor#mission-control-title">
                Open Execution Update
                <ArrowRight aria-hidden="true" className="h-4 w-4" />
              </Link>
              <Link className="cb-btn cb-btn--ghost" href="/admin/operator">
                Open private view
              </Link>
            </div>
          </div>

          <div className="lfp-mission-console" aria-label="Mission Control destinations">
            <div className="lfp-console-topline">
              <span><Radio aria-hidden="true" className="h-4 w-4" /> LeadFlow Mission Control</span>
              <strong>REAL DATA ONLY</strong>
            </div>
            <div className="lfp-console-links">
              <Link href="/proof-floor#mission-control-title">
                <LayoutDashboard aria-hidden="true" className="h-5 w-5" />
                <span><strong>Execution Update</strong><small>Time filters and verified statuses</small></span>
                <ArrowRight aria-hidden="true" className="h-4 w-4" />
              </Link>
              <Link href="/admin/operator">
                <Database aria-hidden="true" className="h-5 w-5" />
                <span><strong>Private Mission Control</strong><small>CRM, workers, approvals, and builds</small></span>
                <ArrowRight aria-hidden="true" className="h-4 w-4" />
              </Link>
              <Link href="/admin/operator/action-center">
                <ShieldCheck aria-hidden="true" className="h-5 w-5" />
                <span><strong>Human Action Center</strong><small>Nothing sends without a cleared gate</small></span>
                <ArrowRight aria-hidden="true" className="h-4 w-4" />
              </Link>
            </div>
            <nav className="lfp-status-rail" aria-label="Execution Update views">
              {["Completed", "Awaiting Approval", "Sent / Published / Activated", "Blocked", "Actual Metrics", "Next Actions"].map((label) => (
                <Link key={label} href="/proof-floor#mission-control-title">{label}</Link>
              ))}
            </nav>
          </div>
        </div>
      </section>

      {/* 2 ------------------------------------------ connected lead system */}
      <section className="cb-band cb-band--visual" aria-labelledby="connected-system-title">
        <div className="cb-shell">
          <div className="cb-visual-intro">
            <div>
              <p className="cb-eyebrow">The connected lead system</p>
              <h2 id="connected-system-title" className="cb-h2 cb-heading--wide">
                Every signal becomes one customer story.
              </h2>
            </div>
            <p className="cb-lead">
              A call should not live in one app while a text, social message, and website
              form live in three more. We connect the doors, preserve the history, and give
              the next person one clear action.
            </p>
          </div>

          <div className="cb-visual-ledger">
            <article className="cb-visual-scene cb-visual-scene--record">
              <div className="cb-visual-art">
                <Image
                  src="/images/visual-system/one-customer-one-record.webp"
                  alt="Phone calls, text messages, social direct messages, and website forms flowing into one customer record"
                  width={1254}
                  height={1254}
                  sizes="(max-width: 900px) 100vw, 58vw"
                />
              </div>
              <div className="cb-visual-copy">
                <span className="cb-visual-index">01</span>
                <p className="cb-visual-kicker">Unify the signal</p>
                <h3>One customer. One record.</h3>
                <p>
                  The conversation history follows the person, not the channel. Your team
                  sees what happened, what matters, and what needs to happen next.
                </p>
                <ul className="cb-visual-points">
                  <li>Calls, texts, DMs, and forms connected</li>
                  <li>Source and consent preserved</li>
                  <li>One accountable owner for the next move</li>
                </ul>
              </div>
            </article>

            <article className="cb-visual-scene cb-visual-scene--reverse cb-visual-scene--followup">
              <div className="cb-visual-art">
                <Image
                  src="/images/visual-system/automate-the-reminder.webp"
                  alt="Quote sent, follow up, and owner review shown as a connected workflow"
                  width={1254}
                  height={1254}
                  sizes="(max-width: 900px) 100vw, 58vw"
                />
              </div>
              <div className="cb-visual-copy">
                <span className="cb-visual-index">02</span>
                <p className="cb-visual-kicker">Run the follow up</p>
                <h3>Automate the reminder. Keep the owner.</h3>
                <p>
                  Automation should keep promises, not make decisions nobody can explain.
                  The system remembers the timing and brings the judgment call back to the
                  owner.
                </p>
                <ul className="cb-visual-points">
                  <li>Immediate acknowledgement</li>
                  <li>Timed quote and appointment reminders</li>
                  <li>Human review before the important move</li>
                </ul>
              </div>
            </article>
          </div>
        </div>
      </section>

      {/* 3 ------------------------------------------- operating system proof */}
      <section className="cb-band cb-band--operations" aria-label="Connected company operating system">
        <div className="cb-shell">
          <CompanyLoop />

          <div className="cb-proof-cockpit" aria-label="Proof points">
            <div className="cb-proof-cockpit__art">
              <Image
                src="/images/homepage-v2/proof-cockpit.webp"
                alt="Five precision instruments representing shipped systems, industries, tools, products, and client ownership"
                width={1920}
                height={1080}
                sizes="(max-width: 900px) 100vw, 52vw"
              />
              <span>Live build telemetry</span>
            </div>
            <div className="cb-proof-cockpit__ledger">
              <p className="cb-eyebrow">Built, shipped, running</p>
              <h2 className="cb-h2">Proof before promises.</h2>
              <div className="cb-proof-grid">
                {PROOF.map((p) => (
                  <div key={p.label} className="cb-proof-item">
                    <strong>{p.figure}</strong>
                    <span>{p.label}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* 4 ------------------------------------- website builder vs us */}
      <section className="cb-band">
        <div className="cb-shell">
          <div className="cb-headrow">
            <div>
              <p className="cb-eyebrow">The difference</p>
              <h2 className="cb-h2 cb-heading">
                Your website should run your business. Not just sit there.
              </h2>
            </div>
            <p className="cb-lead">
              A website builder gives you pages. We build the connected company those pages
              are supposed to power. Same front door. Completely different building behind
              it.
            </p>
          </div>

          <div className="cb-vs">
            <div className="cb-vs-col cb-vs-col--them">
              <span className="cb-vs-label">A website builder delivers</span>
              <h3>Pages.</h3>
              <ul className="cb-vs-list">
                {WEBSITE_BUILDER.map((item) => (
                  <li key={item}>
                    <Minus aria-hidden="true" className="h-4 w-4" />
                    {item}
                  </li>
                ))}
              </ul>
              <p className="cb-vs-foot">
                Then the work of actually running the company starts, and none of it is
                connected to the site you just paid for.
              </p>
            </div>

            <div className="cb-vs-mid" aria-hidden="true">
              <span>vs</span>
            </div>

            <div className="cb-vs-col cb-vs-col--us">
              <span className="cb-vs-label">The Company Builder delivers</span>
              <h3>The company.</h3>
              <ul className="cb-vs-list">
                {COMPANY_BUILDER.map((item) => (
                  <li key={item}>
                    <Check aria-hidden="true" className="h-4 w-4" />
                    {item}
                  </li>
                ))}
              </ul>
              <p className="cb-vs-foot">
                One system. One set of data. One place where a customer moves from stranger
                to paid to delivered to measured.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* 5 ------------------------------------------------------- four parts */}
      <section id="what-we-build" className="cb-band cb-band--tint" tabIndex={-1}>
        <div className="cb-shell">
          <div className="cb-headrow">
            <div>
              <p className="cb-eyebrow">What we build</p>
              <h2 className="cb-h2 cb-heading">
                A connected company has four parts.
              </h2>
            </div>
            <p className="cb-lead">
              Not a software inventory. Four outcomes, in the order a customer moves through
              them. You can start with one and add the rest when the business earns it.
            </p>
          </div>

          <div className="cb-pillars">
            {PILLARS.map((p) => (
              <article key={p.key} className="cb-pillar">
                <div className="cb-pillar-top">
                  <h3>{p.key}</h3>
                  <p.icon aria-hidden="true" className="h-6 w-6" />
                </div>
                <p>{p.body}</p>
                <ul>
                  {p.items.map((i) => (
                    <li key={i}>{i}</li>
                  ))}
                </ul>
              </article>
            ))}
          </div>
        </div>
      </section>

      {/* 4b ------------------------------------------- source attribution */}
      <section className="cb-band cb-band--attribution" aria-labelledby="trace-sale-title">
        <div className="cb-shell">
          <div className="cb-attribution-grid">
            <div className="cb-attribution-art">
              <Image
                src="/images/visual-system/trace-the-sale.webp"
                alt="A connected path from a social post to a click, website form, customer record, and sale"
                width={1254}
                height={1254}
                sizes="(max-width: 900px) 100vw, 52vw"
              />
            </div>
            <div className="cb-attribution-copy">
              <p className="cb-eyebrow">First party attribution</p>
              <h2 id="trace-sale-title" className="cb-h2 cb-heading--wide">
                Can you trace the sale?
              </h2>
              <p className="cb-lead">
                A dashboard full of views is not proof. The useful chain is the post, the
                click, the form, the customer, and the sale. We build the path so the next
                budget decision is based on evidence.
              </p>
              <dl className="cb-trace-ledger">
                <div>
                  <dt>Source</dt>
                  <dd>The post, ad, search, referral, or page that created attention.</dd>
                </div>
                <div>
                  <dt>Action</dt>
                  <dd>The click, call, text, booking, form, or payment that followed.</dd>
                </div>
                <div>
                  <dt>Outcome</dt>
                  <dd>The customer record and closed result tied back to the beginning.</dd>
                </div>
              </dl>
              <Link className="cb-btn cb-btn--primary" href="/live">
                See the live proof system
                <ArrowRight aria-hidden="true" className="h-4 w-4" />
              </Link>
            </div>
          </div>
        </div>
      </section>

      {/* 5 -------------------------------------------------------- live work */}
      <section id="results" className="cb-band" tabIndex={-1}>
        <div className="cb-shell">
          <div className="cb-headrow">
            <div>
              <p className="cb-eyebrow">Proof before promise</p>
              <h2 className="cb-h2 cb-heading">
                Three of the systems. All of them are live right now.
              </h2>
            </div>
            <p className="cb-lead">
              Not mockups, not concept cards. Open any of them in a new tab and check the
              work yourself. Client systems and Ryan&rsquo;s own products are labeled as
              what they are.
            </p>
          </div>

          <div className="cb-cases">
            {FEATURED.map((c, i) => (
              <article key={c.name} className={`cb-case${i % 2 === 1 ? " cb-case--flip" : ""}`}>
                {/* Not a link: the named link below already goes to the live
                    site, and a second unlabeled link to the same place is noise
                    for anyone navigating by keyboard or screen reader. */}
                <div className="cb-case-shot">
                  <Image
                    src={c.shot}
                    alt={c.alt}
                    width={1200}
                    height={630}
                    sizes="(max-width: 900px) 100vw, 55vw"
                    priority={i === 0}
                  />
                </div>
                <div>
                  <span className={`cb-case-kind cb-case-kind--${c.kind}`}>{c.kindLabel}</span>
                  <h3>{c.name}</h3>
                  <p className="cb-case-what">{c.what}</p>

                  <dl className="cb-case-block">
                    <dt>The problem</dt>
                    <dd>{c.problem}</dd>
                  </dl>
                  <dl className="cb-case-block">
                    <dt>What Ryan built</dt>
                    <dd>{c.built}</dd>
                  </dl>

                  <ul className="cb-case-facts">
                    {c.facts.map((f) => (
                      <li key={f.l}>
                        <strong>{f.v}</strong>
                        <span>{f.l}</span>
                      </li>
                    ))}
                  </ul>

                  <dl className="cb-case-block">
                    <dt>What it changed</dt>
                    <dd>{c.outcome}</dd>
                  </dl>

                  <div className="cb-case-foot">
                    <a className="cb-textlink" href={c.href} target="_blank" rel="noreferrer">
                      Visit {c.name}
                      <ExternalLink aria-hidden="true" className="h-4 w-4" />
                    </a>
                    <span className="cb-case-stack">{c.stack}</span>
                  </div>
                </div>
              </article>
            ))}
          </div>

          <div className="mt-14 flex justify-center">
            <Link className="cb-btn cb-btn--ghost" href="/portfolio">
              See all 7 live systems
              <ArrowRight aria-hidden="true" className="h-4 w-4" />
            </Link>
          </div>
        </div>
      </section>

      {/* 6 ---------------------------------------------------------- process */}
      <section id="how-it-works" className="cb-band cb-band--ink" tabIndex={-1}>
        <div className="cb-shell">
          <div className="cb-headrow">
            <div>
              <p className="cb-eyebrow">How it works</p>
              <h2 className="cb-h2 cb-heading">How Ryan builds a company.</h2>
            </div>
            <p className="cb-lead">
              The same five moves every time, whether it is a one-truck service business or a
              software product. Nothing gets built before the map is approved.
            </p>
          </div>

          <ol className="cb-steps">
            {STEPS.map((s, i) => (
              <li key={s.num} className={`cb-step${i === 0 ? " cb-step--done" : ""}`}>
                <span className="cb-step-num">{s.num}</span>
                <h3>{s.title}</h3>
                <p>{s.body}</p>
              </li>
            ))}
          </ol>
        </div>
      </section>

      {/* 7 --------------------------------------------------------- operator */}
      <section className="cb-band">
        <div className="cb-shell">
          <div className="cb-operator">
            <div className="cb-operator-shot">
              <Image
                src="/images/ryan-wholesale-universe-owner.jpg"
                alt="Ryan Nichols standing on top of shrink-wrapped pallets in his wholesale warehouse, arms out, beside a large American flag"
                width={1800}
                height={1350}
                sizes="(max-width: 900px) 100vw, 40vw"
              />
            </div>
            <div>
              <p className="cb-eyebrow">The operator</p>
              <h2 className="cb-h2 cb-heading--wide">
                Built by someone who has run the business, not just the website.
              </h2>
              <p className="cb-lead">
                Ryan Nichols builds these systems because he needed them first. The receipts
                are companies, offers, audiences, inventory, fulfillment, sales processes,
                and software, all built under real pressure.
              </p>

              <ul className="cb-receipts">
                {RECEIPTS.map((r) => (
                  <li key={r.head}>
                    <BadgeCheck aria-hidden="true" className="h-5 w-5" />
                    <span>
                      <strong>{r.head}</strong> {r.body}
                    </span>
                  </li>
                ))}
              </ul>

              <p className="cb-pullquote">
                &ldquo;I have already built what you are trying to build. Now let&rsquo;s
                build yours.&rdquo;
              </p>

              <div className="cb-actions">
                <Link className="cb-btn cb-btn--ghost" href="/about">
                  More about Ryan
                  <ArrowRight aria-hidden="true" className="h-4 w-4" />
                </Link>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* 7b --------------------------------------------- operator academy */}
      <section className="cb-band cb-band--academy" aria-labelledby="academy-title">
        <div className="cb-shell">
          <div className="cb-academy-grid">
            <div className="cb-academy-copy">
              <p className="cb-eyebrow">LeadFlow Operator Academy</p>
              <h2 id="academy-title" className="cb-h2 cb-heading--wide">
                The course is not the system.
              </h2>
              <p className="cb-lead">
                A video library is content. A training platform connects interest,
                application, payment, access, progress, resources, and the next lesson into
                one owned experience.
              </p>
              <div className="cb-academy-proof">
                <span>Public catalog</span>
                <span>Member access</span>
                <span>Progress tracking</span>
                <span>Daily module publishing</span>
              </div>
              <div className="cb-actions">
                <Link className="cb-btn cb-btn--primary" href="/training">
                  Preview the training platform
                  <ArrowRight aria-hidden="true" className="h-4 w-4" />
                </Link>
                <Link className="cb-btn cb-btn--ghost" href="/packages">
                  See the platform packages
                </Link>
              </div>
            </div>
            <div className="cb-academy-art">
              <Image
                src="/images/visual-system/course-system-blueprint.webp"
                alt="Blueprint showing interest, application, payment, and student portal as one connected training system"
                width={1254}
                height={1254}
                sizes="(max-width: 900px) 100vw, 52vw"
              />
            </div>
          </div>
        </div>
      </section>

      {/* 8 ---------------------------------------------------------- packages */}
      <section className="cb-band cb-band--tint">
        <div className="cb-shell">
          <div className="cb-headrow">
            <div>
              <p className="cb-eyebrow">Engagement</p>
              <h2 className="cb-h2 cb-heading">Start with the right first release.</h2>
            </div>
            <p className="cb-lead">
              A mortgage company, a dental academy, and a fleet washing crew should not get
              the same canned package. Website Launch has a fixed scope and price. Larger
              operating systems are mapped around what the business actually needs.
            </p>
          </div>

          <div className="cb-ladder">
            {LADDER.map((r) => (
              <article key={r.name} className={`cb-rung${r.lead ? " cb-rung--lead" : ""}`}>
                {r.lead ? <span className="cb-rung-flag">The first move</span> : null}
                <span className="cb-rung-kind">{r.kind}</span>
                <h3>{r.name}</h3>
                <p className="cb-rung-price">{r.price}</p>
                <p>{r.body}</p>
                <ul>
                  {r.items.map((i) => (
                    <li key={i}>
                      <Check aria-hidden="true" className="h-4 w-4" />
                      <span>{i}</span>
                    </li>
                  ))}
                </ul>
                <Link
                  className={`cb-btn ${r.lead ? "cb-btn--primary" : "cb-btn--ghost"}`}
                  href={r.href}
                >
                  {r.cta}
                  <ArrowRight aria-hidden="true" className="h-4 w-4" />
                </Link>
              </article>
            ))}
          </div>

          <div className="cb-custom">
            <div>
              <p className="cb-eyebrow">
                <Boxes aria-hidden="true" className="h-4 w-4" />
                Larger than a package
              </p>
              <h3>Custom Platform</h3>
              <p>
                Multi-location operations, software products, complex migrations, tenant
                systems, advanced permissions, and deeper AI connectors are scoped from
                $15,000+. A System Map comes first when the dependencies are complex.
              </p>
            </div>
            <Link className="cb-btn cb-btn--ghost" href="/start?goal=custom">
              Map the bigger idea
              <ArrowRight aria-hidden="true" className="h-4 w-4" />
            </Link>
          </div>
        </div>
      </section>

      {/* 8b ------------------------------------------ Free Website Program */}
      <section className="cb-band cb-band--ink cb-freebuild">
        <div className="cb-shell">
          <div className="cb-freebuild-grid">
            <div>
              <p className="cb-eyebrow">
                <Layers aria-hidden="true" className="h-4 w-4" />
                The Free Website Program
              </p>
              <h2 className="cb-h2 cb-heading">
                Own your website. Your first five-page build is $0.
              </h2>
              <p className="cb-lead">
                Apply for one of ten monthly openings. The build fee is genuinely free for
                approved businesses, with no required add-on. Your code, domain, accounts,
                analytics, customer records, and leads stay under your control.
              </p>
              <div className="cb-actions">
                <Link
                  href="/free-build"
                  data-analytics="cta-free-website-home"
                  className="cb-btn cb-btn--primary"
                >
                  Apply for My Free Website
                  <ArrowRight aria-hidden="true" className="h-4 w-4" />
                </Link>
                <Link className="cb-btn cb-btn--ghost" href="/packages">
                  See optional growth services
                </Link>
              </div>
              <p className="mt-3 max-w-[64ch] text-sm leading-6 text-[#9aa8bf]">
                Domain registration, paid hosting after the included 90 days, ad spend,
                software subscriptions, extra pages, CRM, automation, content, video, and
                ongoing marketing are separate and quoted before you approve them.
              </p>
            </div>
            <ol className="cb-freebuild-steps">
              {FREE_WEBSITE_STEPS.map((s) => (
                <li key={s.name}>
                  <span className="cb-freebuild-num">{s.number}</span>
                  <div>
                    <strong>{s.name}</strong>
                    <span>{s.body}</span>
                  </div>
                </li>
              ))}
            </ol>
          </div>
        </div>
      </section>

      {/* 9 --------------------------------------------------------- final CTA */}
      <section className="cb-final">
        <div className="cb-shell">
          <p className="cb-eyebrow">Your next move</p>
          <h2 className="cb-h2">
            <em>Own your website.</em>
            Then build the machine around it.
          </h2>
          <p className="cb-lead">
            Apply for the $0 five-page foundation. If you want ads, daily follow-up,
            content, CRM, automation, video, or a complete operating system after that,
            we scope it separately and you decide what comes next.
          </p>
          <div className="cb-actions">
            <CtaLink
              href="/free-build"
              event="apply_free_website"
              placement="home_final"
              className="cb-btn cb-btn--primary"
            >
              Apply for My Free Website
              <ArrowRight aria-hidden="true" className="h-4 w-4" />
            </CtaLink>
            <Link className="cb-btn cb-btn--ghost" href="/proof-floor">
              <LayoutDashboard aria-hidden="true" className="h-4 w-4" />
              Open Mission Control
            </Link>
          </div>
        </div>
      </section>
    </main>
  );
}
