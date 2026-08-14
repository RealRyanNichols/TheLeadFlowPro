import Image from "next/image";
import Link from "next/link";
import {
  ArrowRight,
  BadgeCheck,
  Boxes,
  Check,
  Database,
  ExternalLink,
  Gift,
  KeyRound,
  Layers,
  LayoutDashboard,
  Minus,
  Radio,
  ShieldCheck,
} from "lucide-react";
import CompanyLoop from "@/components/site/CompanyLoop";
import CtaLink from "@/components/site/CtaLink";

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
  { figure: "78", label: "free working tools built and published" },
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
    name: "RepWatchr",
    what: "Proof this stack ships real software, not brochure pages.",
    problem:
      "Public voting records, campaign finance, and official profiles exist in a dozen incompatible places, which means nobody can actually check anything without days of work.",
    built:
      "A full software product: a searchable officials database across every level of government, voting records, campaign finance lookups, scorecards, a packet builder, and paid research tiers. Same stack we install for clients.",
    facts: [
      { v: "16,783", l: "official profiles in the database" },
      { v: "59,054", l: "sourced records behind them" },
      { v: "Packet builder", l: "Scorecards and research tiers, not a contact form" },
    ],
    outcome:
      "When an owner asks whether this goes past websites, this is the answer. It is a product with a database, a search layer, and paid tiers.",
    stack: "Next.js, Supabase, Vercel. Ryan's own product",
    href: "https://repwatchr.com",
    shot: "/og/portfolio/repwatchr.jpg",
    alt: "RepWatchr homepage over a photo of the US Capitol, showing the official profile and sourced record counts",
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
    head: "Shipped 8 live systems across 6 industries.",
    body: "Media, dental education, public-information software, commerce, legal services, local service, and nonprofit missions. Every one is publicly inspectable.",
  },
  {
    head: "Built real software, not brochure sites.",
    body: "A public-records product with 16,783 profiles and 59,054 sourced records. A marketplace with auctions, offers, an AI listing builder, and a live fee engine.",
  },
  {
    head: "Publishes on owned infrastructure, not rented reach.",
    body: "78 free working tools and 13 articles, all served from domains and databases under his own control.",
  },
];

// The free build offer, stated the way it actually runs: the build happens
// first, a down payment moves it forward. Matches /free-build and Notion
// "1. Business Model, Offers and Money Path".
const FREE_BUILD = [
  {
    num: "01",
    title: "Tell me about it",
    body: "As little or as much as you want. Name, photos, videos, voice memos, old links. Dump it all on me.",
  },
  {
    num: "02",
    title: "I build the whole thing",
    body: "Real pages, real forms, real follow-up. Built like the live systems above, customized to you.",
  },
  {
    num: "03",
    title: "You decide",
    body: "Love it? A down payment moves it forward and we price it by real hours, never agency math. Do not want it? You pay nothing.",
  },
];

const LADDER = [
  {
    kind: "Start here",
    name: "System Map",
    price: "$497",
    lead: true,
    body: "A working blueprint of your company before anyone sells you pages, software, or automation. Credited in full toward an approved build.",
    items: [
      "Full inventory of what you run today",
      "Customer path and data flow, mapped",
      "Ownership and handoff audit",
      "Recommended modules, phases, and honest price range",
    ],
    href: "/packages/system-map",
    cta: "See the System Map",
  },
  {
    kind: "Connected core",
    name: "LeadFlow Launch",
    price: "$7,500+",
    lead: false,
    body: "The owned public site and operating core a serious business needs to capture, route, and work demand.",
    items: [
      "Public site or sales home base",
      "Lead capture, CRM, admin workspace, reporting",
      "Transactional email and practical automation",
      "GitHub, Vercel, and Supabase in your accounts",
    ],
    href: "/packages/launch",
    cta: "See the full build",
  },
  {
    kind: "Full operating system",
    name: "Industry OS",
    price: "$15,000+",
    lead: false,
    body: "The connected core plus the portals, tools, records, training, and communications that make your business different.",
    items: [
      "Everything in LeadFlow Launch",
      "Customer, member, student, or partner portals",
      "Industry tools, courses, archives, calls, and texts",
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
      name: "The LeadFlow Pro | The Company Builder",
      isPartOf: { "@id": `${SITE}/#website` },
      about: { "@id": `${SITE}/#organization` },
    },
  ],
};

/* ------------------------------------------------------------------ page -- */

export default function HomePage() {
  return (
    <main className="cb-page">
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(HOME_JSONLD) }}
      />
      {/* 1 ------------------------------------------------------------ hero */}
      <section className="cb-hero">
        <div className="cb-shell">
          <p className="cb-eyebrow">The Company Builder</p>
          <h1 className="cb-h1">
            <em>We don&rsquo;t just build your website.</em>
            We build the company behind it.
          </h1>
          <p className="cb-hero-lead">
            The LeadFlow Pro connects your website, CRM, calls, texts, email, payments,
            portals, dashboards, automation, AI, and internal workflows into one business
            system built in accounts you control.
          </p>
          <div className="cb-actions">
            <CtaLink
              href="/start"
              event="map_my_company"
              placement="home_hero"
              className="cb-btn cb-btn--primary"
            >
              Map My Company
              <ArrowRight aria-hidden="true" className="h-4 w-4" />
            </CtaLink>
            <Link className="cb-btn cb-btn--ghost" href="/portfolio">
              See the Live Systems
            </Link>
          </div>
          <p className="cb-hero-own">
            <ShieldCheck aria-hidden="true" className="h-5 w-5" />
            Built by an operator. Installed in your accounts. Your business stays yours.
          </p>

          <CompanyLoop />
        </div>
      </section>

      {/* 2 ----------------------------------------------------- proof strip */}
      <section className="cb-proof" aria-label="Proof points">
        <div className="cb-shell">
          <div className="cb-proof-grid">
            {PROOF.map((p) => (
              <div key={p.label} className="cb-proof-item">
                <strong>{p.figure}</strong>
                <span>{p.label}</span>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* 3 ------------------------------------- website builder vs us */}
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

      {/* 4 ------------------------------------------------------- four parts */}
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

      {/* 5 -------------------------------------------------------- live work */}
      <section className="cb-band">
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
              See all 8 live systems
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

      {/* 8 ---------------------------------------------------------- packages */}
      <section className="cb-band cb-band--tint">
        <div className="cb-shell">
          <div className="cb-headrow">
            <div>
              <p className="cb-eyebrow">Engagement</p>
              <h2 className="cb-h2 cb-heading">Start with the map. Then price the real work.</h2>
            </div>
            <p className="cb-lead">
              A mortgage company, a dental academy, and a fleet washing crew should not get
              the same canned package. The entry point is fixed. Everything after it is
              scoped from what the map finds.
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
                $30,000+. The System Map still comes first.
              </p>
            </div>
            <Link className="cb-btn cb-btn--ghost" href="/start?goal=custom">
              Map the bigger idea
              <ArrowRight aria-hidden="true" className="h-4 w-4" />
            </Link>
          </div>
        </div>
      </section>

      {/* 8b ------------------------------------------------- the free build */}
      {/* The lead magnet, and the lowest-friction way in. It sits directly
          after the ladder on purpose: an owner who just read $7,500 needs to
          see the zero-risk door before they bounce. */}
      <section className="cb-band cb-band--ink cb-freebuild">
        <div className="cb-shell">
          <div className="cb-freebuild-grid">
            <div>
              <p className="cb-eyebrow">
                <Gift aria-hidden="true" className="h-4 w-4" />
                The free build offer
              </p>
              <h2 className="cb-h2 cb-heading">
                Not ready to pay for a map? I&rsquo;ll build it first.
              </h2>
              <p className="cb-lead">
                Tell me about the business. I build the whole thing before you pay anything.
                No card, no deposit, no contract. If you love it, a down payment moves it
                forward and we agree on a fair price by real hours. If you don&rsquo;t, we
                shake hands and part friends.
              </p>
              <div className="cb-actions">
                <CtaLink
                  href="/free-build"
                  event="start_free_build"
                  placement="home_freebuild"
                  className="cb-btn cb-btn--primary"
                >
                  Start My Free Build
                  <ArrowRight aria-hidden="true" className="h-4 w-4" />
                </CtaLink>
                <a className="cb-btn cb-btn--ghost" href="sms:+19035008898">
                  Text me: (903) 500-8898
                </a>
              </div>
            </div>
            <ol className="cb-freebuild-steps">
              {FREE_BUILD.map((s) => (
                <li key={s.title}>
                  <span className="cb-freebuild-num">{s.num}</span>
                  <div>
                    <strong>{s.title}</strong>
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
            <em>Show me the business.</em>
            I&rsquo;ll show you what to build.
          </h2>
          <p className="cb-lead">
            Answer a few questions about how your company actually runs and see the system
            that fits before you hand over any contact information. No pitch deck, no
            discovery call you have to sit through first.
          </p>
          <div className="cb-actions">
            <CtaLink
              href="/start"
              event="map_my_company"
              placement="home_final"
              className="cb-btn cb-btn--primary"
            >
              Map My Company
              <ArrowRight aria-hidden="true" className="h-4 w-4" />
            </CtaLink>
            <Link className="cb-btn cb-btn--ghost" href="/pricing">
              <Layers aria-hidden="true" className="h-4 w-4" />
              See the packages
            </Link>
          </div>
        </div>
      </section>
    </main>
  );
}
