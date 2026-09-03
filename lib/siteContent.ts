import { TOOL_COUNT } from "@/lib/tools";
import { ARTICLES } from "@/lib/articles";

// Shared marketing content for the public pages. The homepage, /services, and
// /results all draw from here so the numbers and case studies stay identical
// everywhere they appear. Every figure traces to the repository or to a live
// property; nothing here claims revenue, leads, conversion rates, or ROI.

export { PHONE_DISPLAY, PHONE_TEL, PHONE_SMS } from "@/lib/contactInfo";

export const PROOF = [
  { figure: "8", label: "live systems shipped and running right now" },
  { figure: "6", label: "industries represented, from local service to software" },
  { figure: String(TOOL_COUNT), label: "free working tools built and published" },
  { figure: "4", label: "real software products running on the owned stack" },
  { figure: "100%", label: "built in accounts the client controls" },
];

export const WEBSITE_BUILDER = [
  "Pages that describe the business",
  "A contact form",
  "A template someone else owns",
  "Your leads in their inbox",
  "Your customer list on their servers",
  "A monthly bill that never ends",
  "Nothing that follows up",
  "No idea what produced revenue",
];

export const COMPANY_BUILDER = [
  "The public site and the offer behind it",
  "Lead capture from forms, calls, texts, and DMs",
  "A CRM with one record per person",
  "Follow-up that runs whether you are free or not",
  "Payments, contracts, and enrollment",
  "Portals and dashboards for the work itself",
  "First-party analytics that name the source",
  "Code, data, domains, and accounts in your name",
];

export const FEATURED = [
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

export const STEPS = [
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

export const RECEIPTS = [
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

export const LADDER = [
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
