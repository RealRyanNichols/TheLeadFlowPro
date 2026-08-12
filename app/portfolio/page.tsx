import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import { ArrowRight, ExternalLink, Lock } from "lucide-react";
import CtaLink from "@/components/site/CtaLink";

// THE WORK.
//
// Rebuilt from a dense tag grid into full case studies. Two rules drive the
// structure:
//
//   1. Honest categorization. Ryan's own products are labeled as founder-built
//      platforms, never implied to be outside clients. Confidential builds are
//      named as confidential and carry no link.
//   2. Verified facts only. Every number below is visible on the live property
//      or traceable in this repository. No revenue, lead volume, conversion
//      rate, ROI, testimonial, or client quote is claimed anywhere, because none
//      of that is verifiable. Where financial outcomes do not exist, the facts
//      describe what the system does instead.

export const metadata: Metadata = {
  title: "The Work | The LeadFlow Pro",
  description:
    "Eight live systems across six industries. Client builds and founder-built platforms, labeled honestly, every one of them running right now and open to inspection.",
  alternates: { canonical: "https://www.theleadflowpro.com/portfolio" },
  openGraph: {
    title: "Eight live systems. Open them and check the work.",
    description:
      "Client systems and founder-built platforms from The LeadFlow Pro. Real screenshots, verified facts, live links.",
    url: "https://www.theleadflowpro.com/portfolio",
    siteName: "The LeadFlow Pro",
    images: [{ url: "/og/portfolio/repwatchr.jpg", width: 1200, height: 630 }],
    type: "website",
  },
};

type Kind = "client" | "founder";

type Project = {
  kind: Kind;
  kindLabel: string;
  name: string;
  context: string;
  what: string;
  problem: string;
  built: string;
  facts: Array<{ v: string; l: string }>;
  flow: string[];
  outcome: string;
  ownership: string;
  url: string;
  shot: string;
  alt: string;
  goal: string;
};

const CLIENT_SYSTEMS: Project[] = [
  {
    kind: "client",
    kindLabel: "Client system",
    name: "Premier Dental Academy of Longview",
    context: "Dental assistant school, East Texas",
    what: "A school that runs its own enrollment instead of renting one.",
    problem:
      "A real East Texas RDA program was handling applications, payment conversations, and student records by hand, while still paying for software that did not match how a school actually enrolls a class.",
    built:
      "An enrollment engine end to end: applications, payment plans with buy now pay later, an interactive tuition planner, free practice-management training simulators as the top of the funnel, career tools, and a hiring partner directory. Every inquiry is captured and every student record lives in a database the school owns.",
    facts: [
      { v: "Enrollment", l: "Applications, payment plans, and BNPL in one flow" },
      { v: "Tuition planner", l: "Interactive cost tool built into the funnel" },
      { v: "Simulators", l: "Free training on real practice software as the entry point" },
    ],
    flow: ["Search and social", "Free simulators", "Application", "Payment plan", "Student record", "Employer directory"],
    outcome:
      "The school owns the funnel, the student records, and the tools students train on. No enrollment platform to rent and no student data sitting in someone else's account.",
    ownership: "Next.js, Supabase, Vercel. Code, database, and domain in the school's accounts.",
    url: "https://www.premierdentalacademyoflongview.com",
    shot: "/og/portfolio/premier-dental.jpg",
    alt: "Premier Dental Academy of Longview homepage showing the 12 week RDA program, location, and enrollment phone number",
    goal: "delivery",
  },
  {
    kind: "client",
    kindLabel: "Client system",
    name: "Lone Star Total Wash",
    context: "Fleet and pressure washing, East Texas",
    what: "A local service business that can be found, priced, and booked without phone tag.",
    problem:
      "Commercial and residential washing sold entirely by phone call and word of mouth. Nothing online answered the three questions every customer asks first: what do you do, what does it cost, and what does your finished work look like.",
    built:
      "A mobile-first service site with a free quote request that reaches the owner instantly, a public price list, a completed-jobs gallery, and click to call. Covers service trucks, trailers, semis, and full-size oilfield equipment through to buildings, parking lots, sidewalks, rooftops, drive-throughs, and dumpster pads.",
    facts: [
      { v: "Quote intake", l: "Free quote request that reaches the owner instantly" },
      { v: "Public pricing", l: "What it costs, on the page, before anyone calls" },
      { v: "Job gallery", l: "Finished commercial and residential work, photographed" },
    ],
    flow: ["Local search", "Service page", "Quote request", "Click to call", "Job scheduled", "Gallery updated"],
    outcome:
      "The business answers its own sales questions before the phone rings, and the quote request lands somewhere instead of dying in a voicemail box.",
    ownership: "Next.js, Vercel. Site and domain in the owner's accounts.",
    url: "https://www.lonestartotalwash.com",
    shot: "/og/portfolio/lonestar.jpg",
    alt: "Lone Star Total Wash homepage showing the fleet washing offer, free quote request, and the company star logo",
    goal: "demand",
  },
  {
    kind: "client",
    kindLabel: "Client system",
    name: "Don and Patti Nichols, Belize Medical Missions",
    context: "Nonprofit medical missions",
    what: "A mission platform where the money is public and the archive is permanent.",
    problem:
      "Free medical mission clinics funded by supporters who had no way to see where their money went, and years of field photography with nowhere permanent to live.",
    built:
      "A complete mission platform: sponsorship checkout down to a 60 cent pair of reading glasses, recurring giving, live funding progress bars, a 509 photo archive spanning five countries, a Mission Partners login hub, prayer intake, and an Open Book page where every dollar in and out is posted publicly.",
    facts: [
      { v: "509", l: "photos archived across five countries" },
      { v: "Open Book", l: "Every dollar in and out, posted publicly" },
      { v: "Sponsorship", l: "Checkout, recurring giving, and live funding progress" },
    ],
    flow: ["Supporter arrives", "Sponsorship checkout", "Progress bar updates", "Partners hub", "Open Book ledger", "Photo archive"],
    outcome:
      "Trust is built in public. A supporter can see the specific thing they funded and check the ledger without asking anyone for a report.",
    ownership: "Next.js, Supabase, Vercel. Data and donor records held by the mission.",
    url: "https://www.donandpatti.com",
    shot: "/og/portfolio/donandpatti.jpg",
    alt: "Don and Patti Belize Medical Missions homepage reading Medical Care for the Body, Hope for the Soul",
    goal: "delivery",
  },
];

const FOUNDER_PLATFORMS: Project[] = [
  {
    kind: "founder",
    kindLabel: "Founder-built platform",
    name: "RepWatchr",
    context: "Public information software. Ryan's own product",
    what: "Proof this stack ships real software, not brochure pages.",
    problem:
      "Voting records, campaign finance, and official profiles are public but scattered across a dozen incompatible systems, so checking a single claim takes days.",
    built:
      "A full software product: a searchable officials database covering every level of government, voting records, campaign finance lookups, source chains, scorecards, an accountability packet builder, and paid research tiers.",
    facts: [
      { v: "16,783", l: "official profiles in the database" },
      { v: "59,054", l: "sourced records behind those profiles" },
      { v: "Packet builder", l: "Scorecards and paid research tiers, not a contact form" },
    ],
    flow: ["Public records ingested", "Source chain attached", "Official profile", "Scorecard", "Packet builder", "Research tier"],
    outcome:
      "When an owner asks whether this goes past websites, this is the answer: a product with a real database, a search layer, and paid tiers on the same stack installed for clients.",
    ownership: "Next.js, Supabase, Vercel. Ryan's own product, built on the client stack.",
    url: "https://repwatchr.com",
    shot: "/og/portfolio/repwatchr.jpg",
    alt: "RepWatchr homepage over a photograph of the US Capitol, showing official profile and sourced record counts",
    goal: "industry_tools",
  },
  {
    kind: "founder",
    kindLabel: "Founder-built platform",
    name: "Gideon Commerce",
    context: "Marketplace platform. Ryan's own product",
    what: "A seller-first marketplace built around a flat 1% platform fee.",
    problem:
      "Marketplace sellers hand over category fees, order fees, fulfillment fees, shipping fees, and ad fees, then still do not own the customer relationship they paid for.",
    built:
      "A commerce platform with listings, auctions and offers, branded seller storefronts, an AI listing builder, a live fee calculator, cross-listing exports, QR verified local pickup, and seller trust systems. The kind of build large platforms say a small team cannot ship.",
    facts: [
      { v: "1%", l: "flat platform fee, the model the product is built around" },
      { v: "Auctions + offers", l: "Full bidding and negotiation, not just fixed price" },
      { v: "QR pickup", l: "Verified local handoff built into the order flow" },
    ],
    flow: ["Listing created", "AI listing builder", "Auction or offer", "Fee calculator", "Payment", "QR verified pickup"],
    outcome:
      "A working answer to marketplace fee stacking, with the seller economics designed in rather than bolted on.",
    ownership: "Next.js, Supabase, Vercel. Ryan's own product.",
    url: "https://gideonhq.com",
    shot: "/og/portfolio/gideonhq.jpg",
    alt: "GideonHQ marketplace homepage reading Sell Almost Anything, Keep 99 percent, with a live fee calculator",
    goal: "replace_tools",
  },
  {
    kind: "founder",
    kindLabel: "Founder-built platform",
    name: "RealRyanNichols.com",
    context: "Independent media platform. Ryan's own site",
    what: "A publishing machine nobody else can switch off.",
    problem:
      "A story that lived entirely on platforms that could throttle it, demonetize it, or remove it, with an audience that could be disconnected without notice.",
    built:
      "Long-form publishing, a searchable archive of 1,568+ case profiles, public records collections, intake forms, an AI assistant trained on the owner's own writing, SMS alerts, and a store. All on a domain and database he controls.",
    facts: [
      { v: "1,568+", l: "case profiles in the searchable archive" },
      { v: "AI assistant", l: "Trained on the owner's own published writing" },
      { v: "Owned list", l: "SMS alerts and intake on first-party infrastructure" },
    ],
    flow: ["Article published", "Archive indexed", "Tip and intake forms", "AI assistant", "SMS alerts", "Store"],
    outcome:
      "When the platforms throttled the story, the story already had its own platform, its own archive, and its own way to reach the audience directly.",
    ownership: "Next.js, Supabase, Vercel. Ryan's own site, domain, and audience list.",
    url: "https://realryannichols.com",
    shot: "/og/portfolio/realryannichols.jpg",
    alt: "RealRyanNichols.com homepage with the author profile and links into the searchable public records archive",
    goal: "industry_tools",
  },
  {
    kind: "founder",
    kindLabel: "Founder-built platform",
    name: "Faretta.legal",
    context: "Productized legal help. Ryan's own product",
    what: "A flat-fee service catalog that beats a vague services page.",
    problem:
      "People representing themselves cannot find out what help costs until they have already sat through a consultation, so most of them never start.",
    built:
      "A productized catalog with a clear flat-fee ladder from $5 motion skeletons to $497 done-for-you trial binders, a free AI assistant as the entry point that recommends the right service, evidence and witness intake, supporter tiers with a live donation feed, a member dashboard, and case files documented in real time.",
    facts: [
      { v: "$5 to $497", l: "flat-fee ladder, priced on the page" },
      { v: "AI entry point", l: "Free assistant that routes to the right service" },
      { v: "Member dashboard", l: "Evidence intake, case files, supporter tiers" },
    ],
    flow: ["Free AI assistant", "Service recommended", "Flat-fee checkout", "Evidence intake", "Member dashboard", "Case file"],
    outcome:
      "A focused offer catalog with prices attached does the qualifying work that a services page and a contact form never do.",
    ownership: "Next.js, Supabase, Vercel. Ryan's own product.",
    url: "https://faretta.legal",
    shot: "/og/portfolio/faretta.jpg",
    alt: "Faretta.legal homepage reading Texas pro se help, investigative reporting, one place",
    goal: "replace_tools",
  },
  {
    kind: "founder",
    kindLabel: "Founder-built platform",
    name: "TheLeadFlowPro.com",
    context: "This site. Ryan's own system",
    what: "The proof you are standing on.",
    problem:
      "Every agency claims it can build a connected system. Almost none of them run one they can show you from the inside.",
    built:
      "Guided system mapping, lead capture with attribution and consent, an admin CRM with a per-lead workspace, client dashboards, a training portal, 78 free working tools, 13 owned articles, first-party analytics, and ad tracking.",
    facts: [
      { v: "78", l: "free working tools built and published" },
      { v: "13", l: "owned articles, in the repo and on the domain" },
      { v: "Own CRM", l: "Every lead lands with the full diagnostic attached" },
    ],
    flow: ["Visit tracked", "Guided system map", "Lead captured", "Admin CRM", "Follow-up", "First-party analytics"],
    outcome:
      "The page you are reading runs on the exact stack installed for clients. Every visit is logged in our own database and every lead lands in our own CRM.",
    ownership: "Next.js, Supabase, Vercel. Code in GitHub, data in Supabase, all first-party.",
    url: "https://www.theleadflowpro.com",
    shot: "/og/portfolio/theleadflowpro.jpg",
    alt: "TheLeadFlowPro.com shown in a browser, displaying the guided system mapping experience",
    goal: "custom",
  },
];

const PRIVATE_SYSTEMS = [
  {
    name: "Mortgage and real estate",
    body: "A private client build: intake, calculators, document flow, and follow-up for a lending workflow. Covered by client confidentiality, so it is named here and nowhere else.",
  },
  {
    name: "Local business and events",
    body: "A private client build covering event listings, registration, and local demand capture. Not publicly linked at the client's request.",
  },
];

/* ---------------------------------------------------------------- pieces -- */

function Case({ p, flip }: { p: Project; flip: boolean }) {
  return (
    <article className={`cb-case${flip ? " cb-case--flip" : ""}`}>
      <div className="cb-case-shot">
        <Image
          src={p.shot}
          alt={p.alt}
          width={1200}
          height={630}
          sizes="(max-width: 900px) 100vw, 55vw"
        />
      </div>
      <div>
        <span className={`cb-case-kind cb-case-kind--${p.kind}`}>{p.kindLabel}</span>
        <h3>{p.name}</h3>
        <p className="cb-case-what">{p.what}</p>

        <dl className="cb-case-block">
          <dt>Context</dt>
          <dd>{p.context}</dd>
        </dl>
        <dl className="cb-case-block">
          <dt>The problem</dt>
          <dd>{p.problem}</dd>
        </dl>
        <dl className="cb-case-block">
          <dt>What Ryan built</dt>
          <dd>{p.built}</dd>
        </dl>

        <ul className="cb-case-facts">
          {p.facts.map((f) => (
            <li key={f.l}>
              <strong>{f.v}</strong>
              <span>{f.l}</span>
            </li>
          ))}
        </ul>

        {/* The connected workflow, as it actually runs on the property. */}
        <div className="cb-flowchain" aria-label={`Connected workflow: ${p.flow.join(", then ")}`}>
          {p.flow.map((step) => (
            <span key={step}>{step}</span>
          ))}
        </div>

        <dl className="cb-case-block">
          <dt>What it changed</dt>
          <dd>{p.outcome}</dd>
        </dl>
        <dl className="cb-case-block">
          <dt>Ownership and technology</dt>
          <dd>{p.ownership}</dd>
        </dl>

        <div className="cb-case-foot">
          <a className="cb-textlink" href={p.url} target="_blank" rel="noreferrer">
            Visit the live system
            <ExternalLink aria-hidden="true" className="h-4 w-4" />
          </a>
          <CtaLink
            href={`/start?goal=${p.goal}`}
            event="build_this_for_me"
            placement={`portfolio_${p.name}`}
            className="cb-btn cb-btn--ghost cb-btn--sm"
          >
            Build this for my company
            <ArrowRight aria-hidden="true" className="h-4 w-4" />
          </CtaLink>
        </div>
      </div>
    </article>
  );
}

/* ------------------------------------------------------------------ page -- */

export default function PortfolioPage() {
  return (
    <main className="cb-page">
      <section className="cb-hero">
        <div className="cb-shell">
          <p className="cb-eyebrow">Proof before promise</p>
          <h1 className="cb-h1">
            <em>Eight live systems.</em>
            Open them and check the work.
          </h1>
          <p className="cb-hero-lead">
            Not mockups and not concept cards. Every system below is running right now for a
            real business or a real product. Client builds and Ryan&rsquo;s own platforms are
            labeled as exactly what they are, because pretending your own venture is a client
            is the oldest trick in this business.
          </p>
          <div className="cb-actions">
            <CtaLink
              href="/start"
              event="map_my_company"
              placement="portfolio_hero"
              className="cb-btn cb-btn--primary"
            >
              Map My Company
              <ArrowRight aria-hidden="true" className="h-4 w-4" />
            </CtaLink>
            <Link className="cb-btn cb-btn--ghost" href="/pricing">
              See the packages
            </Link>
          </div>
        </div>
      </section>

      <section className="cb-proof" aria-label="Portfolio summary">
        <div className="cb-shell">
          <div className="cb-proof-grid">
            <div className="cb-proof-item">
              <strong>8</strong>
              <span>live systems, all publicly inspectable</span>
            </div>
            <div className="cb-proof-item">
              <strong>3</strong>
              <span>client systems built for other businesses</span>
            </div>
            <div className="cb-proof-item">
              <strong>5</strong>
              <span>founder-built platforms, labeled as Ryan&rsquo;s own</span>
            </div>
            <div className="cb-proof-item">
              <strong>2</strong>
              <span>private client builds under confidentiality</span>
            </div>
            <div className="cb-proof-item">
              <strong>6</strong>
              <span>industries, from one truck to real software</span>
            </div>
          </div>
        </div>
      </section>

      {/* --------------------------------------------------- client systems */}
      <section className="cb-band">
        <div className="cb-shell">
          <div className="cb-headrow">
            <div>
              <p className="cb-eyebrow">Client systems</p>
              <h2 className="cb-h2 cb-heading">Built for other people&rsquo;s businesses.</h2>
            </div>
            <p className="cb-lead">
              Three businesses that had a problem in the operation, not just on the website.
              Each one is running in accounts the owner controls.
            </p>
          </div>
          <div className="cb-cases">
            {CLIENT_SYSTEMS.map((p, i) => (
              <Case key={p.name} p={p} flip={i % 2 === 1} />
            ))}
          </div>
        </div>
      </section>

      {/* ----------------------------------------------- founder platforms */}
      <section className="cb-band cb-band--tint">
        <div className="cb-shell">
          <div className="cb-headrow">
            <div>
              <p className="cb-eyebrow">Founder-built platforms</p>
              <h2 className="cb-h2 cb-heading">Ryan&rsquo;s own products, on the same stack.</h2>
            </div>
            <p className="cb-lead">
              These are not client engagements and they are not presented as any. They are
              products Ryan built and operates himself, which is how the stack got tested
              hard enough to install for someone else.
            </p>
          </div>
          <div className="cb-cases">
            {FOUNDER_PLATFORMS.map((p, i) => (
              <Case key={p.name} p={p} flip={i % 2 === 1} />
            ))}
          </div>
        </div>
      </section>

      {/* ------------------------------------------------- private systems */}
      <section className="cb-band cb-band--ink">
        <div className="cb-shell">
          <div className="cb-headrow">
            <div>
              <p className="cb-eyebrow">Private systems</p>
              <h2 className="cb-h2 cb-heading">Some builds do not get a link.</h2>
            </div>
            <p className="cb-lead">
              Two client systems are covered by confidentiality. They are listed here rather
              than hidden, because leaving them out would understate the work and dressing
              them up would overstate it.
            </p>
          </div>
          <div className="cb-private">
            {PRIVATE_SYSTEMS.map((s) => (
              <article key={s.name}>
                <Lock aria-hidden="true" className="h-5 w-5" />
                <div>
                  <h3 className="cb-h3">{s.name}</h3>
                  <p>{s.body}</p>
                </div>
              </article>
            ))}
          </div>
        </div>
      </section>

      <section className="cb-final">
        <div className="cb-shell">
          <p className="cb-eyebrow">Your next move</p>
          <h2 className="cb-h2">
            <em>See something you want?</em>
            Let&rsquo;s map yours.
          </h2>
          <p className="cb-lead">
            Every system on this page is made of pieces, and every piece can be built for your
            company. Start with the map and find out which pieces you actually need.
          </p>
          <div className="cb-actions">
            <CtaLink
              href="/start"
              event="map_my_company"
              placement="portfolio_final"
              className="cb-btn cb-btn--primary"
            >
              Map My Company
              <ArrowRight aria-hidden="true" className="h-4 w-4" />
            </CtaLink>
            <Link className="cb-btn cb-btn--ghost" href="/add-ons">
              Browse the Add-On Menu
            </Link>
          </div>
        </div>
      </section>
    </main>
  );
}
