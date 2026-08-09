import Link from "next/link";
import {
  ArrowRight,
  Archive,
  Blocks,
  BookOpen,
  CalendarDays,
  ChartColumn,
  CircleCheck,
  Compass,
  GraduationCap,
  House,
  Landmark,
  Layers,
  LayoutTemplate,
  LibraryBig,
  ListChecks,
  Mail,
  MapPin,
  Megaphone,
  MessageSquareMore,
  Network,
  PanelsTopLeft,
  PhoneCall,
  ShieldCheck,
  ShoppingBag,
  Sparkles,
  Store,
  Target,
  UsersRound,
  Wrench,
} from "lucide-react";

const PATHFINDER = [
  {
    num: "01",
    goal: "demand",
    icon: Megaphone,
    title: "Get more qualified customers",
    body: "Build the pages, offers, tools, and tracking that turn attention into real inquiries.",
  },
  {
    num: "02",
    goal: "follow_up",
    icon: MessageSquareMore,
    title: "Stop losing leads after they reach us",
    body: "Catch calls, texts, forms, and DMs, then route every serious lead to the right next move.",
  },
  {
    num: "03",
    goal: "replace_tools",
    icon: Blocks,
    title: "Replace disconnected software",
    body: "Bring the website, CRM, portal, communications, reporting, and workflows together.",
  },
  {
    num: "04",
    goal: "delivery",
    icon: PanelsTopLeft,
    title: "Build a portal, course, or member experience",
    body: "Give customers, students, members, or partners a real place to log in and get the work.",
  },
  {
    num: "05",
    goal: "industry_tools",
    icon: Wrench,
    title: "Build tools or an industry archive",
    body: "Create calculators, assessments, applications, directories, archives, and searchable resources.",
  },
  {
    num: "06",
    goal: "custom",
    icon: Sparkles,
    title: "I have a bigger idea",
    body: "Show me what is possible. I do not want to force the idea into a box before we map it.",
  },
];

const FEATURES = [
  {
    icon: LayoutTemplate,
    title: "Website and funnels",
    body: "Pages that explain the offer, capture demand, and move people to the right next step.",
  },
  {
    icon: UsersRound,
    title: "CRM and pipeline",
    body: "Every lead, customer, status, note, source, and next action in one owned database.",
  },
  {
    icon: PanelsTopLeft,
    title: "Portals and dashboards",
    body: "Purpose-built back offices for admins, members, students, customers, or partners.",
  },
  {
    icon: ListChecks,
    title: "Tools and forms",
    body: "Calculators, applications, assessments, registrations, and workflows built for the job.",
  },
  {
    icon: BookOpen,
    title: "Courses and archives",
    body: "Private training, public records, searchable libraries, and gated knowledge without Kajabi.",
  },
  {
    icon: Mail,
    title: "Email with Resend",
    body: "Fast transactional email, segmented contacts, broadcasts, and measurable follow-up.",
  },
  {
    icon: PhoneCall,
    title: "Calls and texts with Quo",
    body: "Shared calling, SMS, contacts, transcripts, and communication events connected to the CRM.",
  },
  {
    icon: Target,
    title: "Ads and attribution",
    body: "First-party analytics and source tracking so the system shows what is producing revenue.",
  },
];

const INDUSTRIES = [
  { icon: House, title: "Mortgage and real estate", proof: "Proof: private client build" },
  { icon: GraduationCap, title: "Career and dental education", proof: "Proof: Premier Dental Academy" },
  { icon: LibraryBig, title: "Media and public archives", proof: "Proof: RealRyanNichols.com" },
  { icon: CalendarDays, title: "Local business and events", proof: "Proof: private client build" },
  { icon: Store, title: "Commerce and marketplaces", proof: "Proof: Gideon Commerce" },
  { icon: Landmark, title: "Professional services", proof: "Proof: custom systems" },
];

const WORK = [
  {
    href: "https://premierdentalacademyoflongview.com",
    tag: "Dental education",
    title: "Premier Dental Academy",
    body: "Enrollment, student intake, tools, training, and an East Texas dental archive in one system.",
  },
  {
    href: "https://gideonhq.com",
    tag: "Commerce platform",
    title: "Gideon Commerce",
    body: "A marketplace and commerce system built around direct ownership, seller economics, and a lower-fee operating model.",
  },
  {
    href: "https://realryannichols.com",
    tag: "Independent media",
    title: "RealRyanNichols.com",
    body: "Publishing, evidence collections, forms, profiles, and the January 6 Archive under one roof.",
  },
  {
    href: "https://repwatchr.com",
    tag: "Public information software",
    title: "RepWatchr",
    body: "A purpose-built product for organized public records, official profiles, and structured research. Far beyond a brochure site.",
  },
];

const CONNECTORS = [
  "GitHub",
  "Vercel",
  "Supabase",
  "Figma",
  "Notion",
  "Resend",
  "Quo",
  "Google Workspace",
  "ChatGPT",
  "Claude",
];

export default function HomePage() {
  return (
    <main>
      <section className="hero-section">
        <div className="hero-glow" />
        <div className="hero-inner">
          <div className="hero-copy">
            <span className="eyebrow">
              <Compass aria-hidden="true" className="h-4 w-4" />
              Industry-specific business systems
            </span>
            <h1>
              <span>Your website should</span>
              <span>run your business.</span>
              <strong>Not just sit there.</strong>
            </h1>
            <p>
              We build the website, CRM, portal, tools, forms, courses, archives, email,
              text, and automation your industry actually needs. One connected system,
              installed in accounts you control.
            </p>
            <div className="hero-actions">
              <a className="button-primary" href="#start">
                Find My Starting Point
                <ArrowRight aria-hidden="true" className="h-4 w-4" />
              </a>
              <Link className="button-secondary" href="/portfolio">
                See the Live Work
              </Link>
            </div>
            <div className="hero-checks">
              <span>
                <CircleCheck aria-hidden="true" className="h-4 w-4" />
                Built in your accounts
              </span>
              <span>
                <CircleCheck aria-hidden="true" className="h-4 w-4" />
                Your data stays portable
              </span>
              <span>
                <CircleCheck aria-hidden="true" className="h-4 w-4" />
                No one-size-fits-all template
              </span>
            </div>
          </div>
          <div className="hero-system-card" aria-label="Example LeadFlow Industry OS architecture">
            <div className="hero-system-heading">
              <div>
                <span>LeadFlow Industry OS</span>
                <strong>One business. One connected system.</strong>
              </div>
              <ShieldCheck aria-hidden="true" className="h-6 w-6" />
            </div>
            <div className="hero-system-grid">
              <div>
                <span><LayoutTemplate aria-hidden="true" className="h-4 w-4" /></span>
                <p><strong>Public site</strong><small>Demand</small></p>
              </div>
              <div>
                <span><UsersRound aria-hidden="true" className="h-4 w-4" /></span>
                <p><strong>CRM</strong><small>People</small></p>
              </div>
              <div>
                <span><PanelsTopLeft aria-hidden="true" className="h-4 w-4" /></span>
                <p><strong>Portal</strong><small>Delivery</small></p>
              </div>
              <div>
                <span><Wrench aria-hidden="true" className="h-4 w-4" /></span>
                <p><strong>Industry tools</strong><small>Workflow</small></p>
              </div>
              <div>
                <span><Mail aria-hidden="true" className="h-4 w-4" /></span>
                <p><strong>Resend</strong><small>Email</small></p>
              </div>
              <div>
                <span><PhoneCall aria-hidden="true" className="h-4 w-4" /></span>
                <p><strong>Quo</strong><small>Calls + SMS</small></p>
              </div>
            </div>
            <div className="hero-system-footer">
              <Layers aria-hidden="true" className="h-4 w-4" />
              <span>GitHub + Vercel + Supabase</span>
              <small>Owned core</small>
            </div>
          </div>
        </div>
      </section>

      <section className="proof-strip" aria-label="LeadFlow proof points">
        <span><strong>8+ live properties</strong> built and shipped</span>
        <span><strong>6 verticals</strong> already represented</span>
        <span><strong>One reusable core</strong> ready to scale</span>
      </section>

      <section id="start" className="pathfinder-section section-shell">
        <div className="section-heading section-heading-center">
          <span className="eyebrow">What brings you here today?</span>
          <h2>Pick the problem you want fixed first.</h2>
          <p>
            This is not a form and it does not lock you into a package. Start with the
            closest answer. We will show you the system before we ask who you are.
          </p>
        </div>
        <div className="pathfinder-grid">
          {PATHFINDER.map((p) => (
            <Link key={p.goal} className="pathfinder-card" href={`/start?goal=${p.goal}`}>
              <div className="pathfinder-card-topline">
                <span>{p.num}</span>
                <span className="pathfinder-icon">
                  <p.icon aria-hidden="true" className="h-5 w-5" />
                </span>
              </div>
              <h3>{p.title}</h3>
              <p>{p.body}</p>
              <span className="pathfinder-link">
                Start here
                <ArrowRight aria-hidden="true" className="h-4 w-4" />
              </span>
            </Link>
          ))}
        </div>
        <div className="pathfinder-footer">
          <span>
            <Compass aria-hidden="true" className="h-4 w-4" />
            You can go back, choose more than one module, or browse the whole system at any time.
          </span>
          <a href="#systems">Show me everything first</a>
        </div>
      </section>

      <section id="systems" className="section-shell">
        <div className="section-heading">
          <span className="eyebrow">The connected core</span>
          <h2>The normal business stack, rebuilt as one system.</h2>
          <p>
            A brochure website is not enough. The public site, internal back office,
            communications, delivery, and reporting have to share the same data and move
            the same customer forward.
          </p>
        </div>
        <div className="feature-grid">
          {FEATURES.map((f) => (
            <article key={f.title} className="feature-card">
              <span className="feature-icon">
                <f.icon aria-hidden="true" className="h-5 w-5" />
              </span>
              <h3>{f.title}</h3>
              <p>{f.body}</p>
            </article>
          ))}
        </div>
      </section>

      <section id="industries" className="section-shell section-tinted">
        <div className="section-heading section-heading-wide">
          <div>
            <span className="eyebrow">Industry packs</span>
            <h2>The core stays stable. The workflow changes by industry.</h2>
          </div>
          <p>
            Mortgage businesses need different calculators, records, intake, and follow-up
            than a dental school or a media archive. We keep the reliable foundation and
            install the tools, language, permissions, and automations that fit the vertical.
          </p>
        </div>
        <div className="industry-grid">
          {INDUSTRIES.map((i) => (
            <article key={i.title} className="industry-card feature-card">
              <span className="feature-icon">
                <i.icon aria-hidden="true" className="h-5 w-5" />
              </span>
              <h3>{i.title}</h3>
              <p>{i.proof}</p>
            </article>
          ))}
        </div>
        <p className="section-note">
          Do not see your vertical? That is the point of the system map. We can turn a
          repeatable industry workflow into the next pack.
        </p>
      </section>

      <section className="section-shell">
        <div className="section-heading section-heading-center">
          <span className="eyebrow">The product model</span>
          <h2>Three layers. No Frankenstein stack.</h2>
        </div>
        <div className="layer-grid">
          <article className="layer-card">
            <span>01</span>
            <h3>LeadFlow Core</h3>
            <p>
              Identity, people, permissions, CRM, portal, analytics, forms, and the owned
              infrastructure every build shares.
            </p>
          </article>
          <article className="layer-card">
            <span>02</span>
            <h3>Your Industry Pack</h3>
            <p>
              Vertical-specific tools, records, content, automations, dashboards, courses,
              archives, and vocabulary.
            </p>
          </article>
          <article className="layer-card">
            <span>03</span>
            <h3>Growth and Operations</h3>
            <p>
              Resend, Quo, ad attribution, reporting, content, campaigns, and ongoing
              operator support when you need it.
            </p>
          </article>
        </div>
      </section>

      <section className="section-shell section-tinted">
        <div className="section-heading section-heading-with-link">
          <div>
            <span className="eyebrow">Proof before promise</span>
            <h2>The pattern is already live.</h2>
          </div>
          <Link className="text-link" href="/portfolio">
            View the Full Portfolio
            <ArrowRight aria-hidden="true" className="h-4 w-4" />
          </Link>
        </div>
        <div className="work-grid">
          {WORK.map((w) => (
            <a key={w.title} href={w.href} target="_blank" rel="noreferrer" className="work-card">
              <span>{w.tag}</span>
              <h3>{w.title}</h3>
              <p>{w.body}</p>
              <small>
                Visit the live site <ArrowRight aria-hidden="true" className="h-3.5 w-3.5" />
              </small>
            </a>
          ))}
        </div>
      </section>

      <section className="section-shell">
        <div className="section-heading section-heading-center">
          <span className="eyebrow">A clear place to start</span>
          <h2>Package the outcome, then scope the complexity.</h2>
          <p>
            The entry point is fixed. Builds start from a defined core and expand only when
            the industry workflow earns it. You know which layer you are buying before the
            work starts.
          </p>
        </div>
        <div className="package-preview-grid">
          <article className="package-preview-card">
            <span>Start here</span>
            <h3>System Map</h3>
            <strong>$497</strong>
            <p>
              A working blueprint for what to build, what to connect, and what to stop
              paying for.
            </p>
            <Link href="/pricing">
              See what is included
              <ArrowRight aria-hidden="true" className="h-4 w-4" />
            </Link>
          </article>
          <article className="package-preview-card is-featured">
            <span>Core build</span>
            <h3>LeadFlow Launch</h3>
            <strong>$7,500+</strong>
            <p>
              Website, lead capture, CRM, admin workspace, analytics, and email response on
              the owned core.
            </p>
            <Link href="/pricing">
              See what is included
              <ArrowRight aria-hidden="true" className="h-4 w-4" />
            </Link>
          </article>
          <article className="package-preview-card">
            <span>Full operating system</span>
            <h3>Industry OS</h3>
            <strong>$15,000+</strong>
            <p>
              The core plus portals, vertical tools, courses or archives, Quo, and deeper
              automation.
            </p>
            <Link href="/pricing">
              See what is included
              <ArrowRight aria-hidden="true" className="h-4 w-4" />
            </Link>
          </article>
        </div>
      </section>

      <section className="connector-section section-shell">
        <div>
          <span className="eyebrow">Connector roadmap</span>
          <h2>Build once. Work from ChatGPT or Claude.</h2>
          <p>
            The system lives in the accounts the business already runs on: GitHub, Vercel,
            Supabase, Figma, Notion, Resend, Quo, and Google Workspace. LeadFlow is being
            structured around one secure remote MCP server, so the same tenant-scoped tools
            can power a public OpenAI plugin and a Claude custom connector without
            rebuilding the operating system twice.
          </p>
        </div>
        <div className="connector-pills">
          {CONNECTORS.map((c) => (
            <span key={c}>{c}</span>
          ))}
        </div>
      </section>

      <section className="final-cta section-shell">
        <div>
          <span className="eyebrow">Your next move</span>
          <h2>Show us the business. We will map the system.</h2>
          <p>
            Start with the problem, choose the workflow, and see your recommended build
            before you give us any contact information.
          </p>
        </div>
        <div>
          <Link className="button-primary" href="/start">
            Map My System
            <ArrowRight aria-hidden="true" className="h-4 w-4" />
          </Link>
          <a href="mailto:hello@theleadflowpro.com" className="button-secondary">
            Email Ryan
          </a>
        </div>
      </section>
    </main>
  );
}
