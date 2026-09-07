import { withPublicPageMetadata } from "@/lib/publicPageMetadata";
import type { Metadata } from "next";
import type { CSSProperties, ReactNode } from "react";
import Image from "next/image";
import Link from "next/link";
import {
  ArrowRight,
  ExternalLink,
  Lock,
  Check,
  GraduationCap,
  Truck,
  HeartHandshake,
  BookOpen,
  ShoppingBag,
  Wrench,
  FileText,
} from "lucide-react";
import CtaLink from "@/components/site/CtaLink";
import { TOOL_COUNT } from "@/lib/tools";
import styles from "./portfolio.module.css";

export const metadata: Metadata = withPublicPageMetadata("/portfolio", {
  title: "Business Websites & Client Systems | The LeadFlow Pro",
  description:
    "Explore Premier Dental Academy, Lone Star Total Wash, and other business websites. Real photos, clear customer journeys, and links to inspect the work.",
  alternates: { canonical: "https://www.theleadflowpro.com/portfolio" },
  openGraph: {
    title: "Real businesses. See the people and the systems behind them.",
    type: "website",
  },
});

const CLIENTS = [
  {
    id: "premier",
    name: "Premier Dental Academy of Longview",
    category: "Dental assistant education · Longview, Texas",
    icon: GraduationCap,
    color: "#0e746b",
    tint: "#e5f5ef",
    logo: "/images/brand/premier-dental-academy-logo.png",
    image: "/images/premier/premier-students.jpg",
    alt: "Premier Dental Academy students pictured together at the school",
    caption:
      "Real Premier students. The academy supplies the training; the website helps people find their way to it.",
    title: "Help the next student see a future here.",
    summary:
      "Amanda and the Premier team bring the school to life. We connected the website, enrollment steps, study tools, and student portal around their work.",
    features: [
      "Explore the program",
      "Practice with free tools",
      "Apply and keep learning",
    ],
    steps: [
      { title: "Meet the school", text: "See the people, program, and place." },
      {
        title: "Find a way to start",
        text: "Explore tuition and ask the team a question.",
      },
      {
        title: "Keep learning",
        text: "Use study tools and the student portal.",
      },
    ],
    href: "/premier-system",
    link: "Explore Premier’s full story",
    url: "https://www.premierdentalacademyoflongview.com",
    goal: "delivery",
    detail:
      "The build connects public program information, applications, tuition planning, learning tools, and student access. Premier’s team teaches the curriculum and handles enrollment decisions. Training and employment outcomes remain the school’s work, not a claim about the website.",
  },
  {
    id: "lone-star",
    name: "Lone Star Total Wash",
    category: "Fleet & pressure washing · East Texas",
    icon: Truck,
    color: "#a92a31",
    tint: "#fcebea",
    logo: "/images/portfolio/lone-star-logo.png",
    image: "/images/portfolio/lone-star-fleet-before-after.jpg",
    alt: "An actual truck before and after washing, from Lone Star Total Wash’s completed-jobs gallery",
    caption:
      "The before-and-after belongs to Lone Star’s crew. Our work gives customers a place to see it and request a quote.",
    title: "Let the finished job start the conversation.",
    summary:
      "A truck owner can see what Lone Star washes, browse the prices, inspect finished jobs, and contact the team from a phone.",
    features: [
      "Show finished work",
      "Answer pricing questions",
      "Request a free quote",
    ],
    steps: [
      {
        title: "See the difference",
        text: "Browse photos of actual completed jobs.",
      },
      {
        title: "Check the service",
        text: "Find the right wash and published prices.",
      },
      {
        title: "Request a quote",
        text: "Send the job details or call the team.",
      },
    ],
    href: "https://www.lonestartotalwash.com/jobs",
    link: "See Lone Star’s finished jobs",
    url: "https://www.lonestartotalwash.com",
    goal: "demand",
    detail:
      "The mobile website brings the service list, pricing, completed-job photos, quote request, and click-to-call together. Lone Star performs the washing and provides the final quote. The website makes those first customer steps easier to find.",
  },
  {
    id: "don-and-patti",
    name: "Don & Patti Nichols",
    category: "Belize medical missions · Mission website",
    icon: HeartHandshake,
    color: "#306e49",
    tint: "#edf3e2",
    logo: null,
    image: "/images/portfolio/belize-mission-team.jpg",
    alt: "The mission team gathered outside the Belize Anchor Mission church",
    caption:
      "The real mission team, photographed in Belize and published on Don and Patti’s website.",
    title: "Show the people behind the mission.",
    summary:
      "Their team brings medical care, vision care, and ministry to Belize. The website lets supporters see the work, explore the photo archive, and find a practical way to help.",
    features: [
      "Follow the mission",
      "Explore the photo archive",
      "Sponsor supplies",
    ],
    steps: [
      {
        title: "Understand the need",
        text: "Meet the team and read about the mission.",
      },
      {
        title: "Choose a way to help",
        text: "Explore supplies, giving, and prayer.",
      },
      {
        title: "Stay connected",
        text: "Read updates and visit the Open Book page.",
      },
    ],
    href: "https://www.donandpatti.com",
    link: "Explore Don & Patti’s mission",
    url: "https://www.donandpatti.com",
    goal: "delivery",
    detail:
      "The mission platform connects the public story, giving paths, photo archive, trip updates, and Open Book page. Medical care and ministry are delivered by the mission team. The site presents their work and makes supporting it easier.",
  },
] as const;

const FOUNDER_PROJECTS = [
  {
    name: "RealRyanNichols.com",
    icon: BookOpen,
    logo: "/images/brand/real-ryan-nichols-logo.png",
    title: "Give the story a home.",
    text: "An independent publishing platform with articles, a searchable public-records archive, book offers, and ways for readers to stay connected.",
    href: "https://realryannichols.com",
    link: "Explore Ryan’s platform",
    second: "/scoreboard/realryannichols",
    secondLabel: "See recorded activity",
    color: "#a92a31",
  },
  {
    name: "The LeadFlow Pro",
    icon: Wrench,
    logo: "/images/brand/leadflow-logo.png",
    title: "Let people try the work.",
    text: `${TOOL_COUNT} free tools, practical guides, training, lead capture, and a public scoreboard. This is the business system you are using right now.`,
    href: "/tools",
    link: "Try a free tool",
    second: "/live",
    secondLabel: "See our live analytics",
    color: "#194cbd",
  },
  {
    name: "Gideon Commerce",
    icon: ShoppingBag,
    logo: null,
    title: "Build a better way to sell.",
    text: "Ryan’s developing commerce platform, now being connected to The LeadFlow Pro. Explore the direction and map the selling features your business needs.",
    href: "/commerce",
    link: "Explore the commerce plan",
    second: null,
    secondLabel: null,
    color: "#885321",
  },
  {
    name: "Faretta.legal",
    icon: FileText,
    logo: null,
    title: "Make the service easy to choose.",
    text: "Ryan’s Wix-based offer catalog shows how defined deliverables and clear next steps can make a service easier to understand. Included for the offer design.",
    href: "https://faretta.legal",
    link: "Visit the service catalog",
    second: null,
    secondLabel: null,
    color: "#4c5b6b",
  },
] as const;

function DestinationLink({
  href,
  className,
  children,
}: {
  href: string;
  className?: string;
  children: ReactNode;
}) {
  return href.startsWith("https://") ? (
    <a
      href={href}
      className={className}
      target="_blank"
      rel="noopener noreferrer"
    >
      {children}
      <ExternalLink aria-hidden="true" />
    </a>
  ) : (
    <Link href={href} className={className}>
      {children}
      <ArrowRight aria-hidden="true" />
    </Link>
  );
}

export default function PortfolioPage() {
  return (
    <main className={`cb-page ${styles.page}`}>
      <section className={styles.hero}>
        <div className={styles.shell}>
          <p className={styles.eyebrow}>
            The work · Real businesses, real people
          </p>
          <h1>
            Real businesses.
            <br />
            <em>Built around real people.</em>
          </h1>
          <p className={styles.intro}>
            See how a school, a wash crew, and a mission team turn a visit into
            a next step.
          </p>
          <nav
            className={styles.jumpLinks}
            aria-label="Choose a business to explore"
          >
            {CLIENTS.map((client) => (
              <a key={client.id} href={`#${client.id}`}>
                <client.icon aria-hidden="true" />
                {client.id === "premier"
                  ? "Premier Dental"
                  : client.id === "lone-star"
                    ? "Lone Star"
                    : "Don & Patti"}
                <ArrowRight aria-hidden="true" />
              </a>
            ))}
          </nav>
        </div>
      </section>
      <section
        className={styles.shell}
        aria-label="Client websites and business systems"
      >
        <div className={styles.cases}>
          {CLIENTS.map((client, index) => (
            <article
              id={client.id}
              key={client.id}
              className={styles.case}
              style={
                {
                  "--case-accent": client.color,
                  "--case-tint": client.tint,
                } as CSSProperties
              }
            >
              <div className={styles.caseHeader}>
                {client.logo ? (
                  <Image
                    src={client.logo}
                    width={64}
                    height={64}
                    alt=""
                    className={styles.logo}
                  />
                ) : (
                  <span className={styles.brandIcon}>
                    <client.icon aria-hidden="true" />
                  </span>
                )}
                <div>
                  <p className={styles.label}>
                    Client system · {client.category}
                  </p>
                  <h2>{client.name}</h2>
                </div>
              </div>
              <div className={styles.caseBody}>
                <figure className={styles.photo}>
                  <Image
                    src={client.image}
                    alt={client.alt}
                    width={1400}
                    height={1000}
                    sizes="(max-width: 850px) 100vw, 50vw"
                    priority={index === 0}
                  />
                  <figcaption>{client.caption}</figcaption>
                </figure>
                <div className={styles.caseCopy}>
                  <h3>{client.title}</h3>
                  <p>{client.summary}</p>
                  <ul className={styles.features}>
                    {client.features.map((feature) => (
                      <li key={feature}>
                        <Check aria-hidden="true" />
                        {feature}
                      </li>
                    ))}
                  </ul>
                  <DestinationLink
                    href={client.href}
                    className={styles.primaryLink}
                  >
                    {client.link}
                  </DestinationLink>
                  <CtaLink
                    href={`/start?goal=${client.goal}`}
                    event="build_this_for_me"
                    placement={`portfolio_${client.id}`}
                    className={styles.textLink}
                  >
                    Plan something like this for me
                    <ArrowRight aria-hidden="true" />
                  </CtaLink>
                </div>
              </div>
              <div className={styles.pathArea}>
                <p className={styles.label}>The visitor’s next three steps</p>
                <ol className={styles.path}>
                  {client.steps.map((step, i) => (
                    <li key={step.title}>
                      <span>{i + 1}</span>
                      <div>
                        <h4>{step.title}</h4>
                        <p>{step.text}</p>
                      </div>
                    </li>
                  ))}
                </ol>
              </div>
              <details className={styles.details}>
                <summary>What the build includes</summary>
                <p>{client.detail}</p>
                <a href={client.url} target="_blank" rel="noopener noreferrer">
                  Visit the business website <ExternalLink aria-hidden="true" />
                </a>
              </details>
            </article>
          ))}
        </div>
      </section>
      <section
        className={`${styles.shell} ${styles.section}`}
        aria-labelledby="founder-projects"
      >
        <p className={styles.eyebrow}>Founder-built platforms</p>
        <h2 id="founder-projects" className={styles.sectionTitle}>
          Ryan uses the tools, too.
        </h2>
        <p className={styles.sectionIntro}>
          These are Ryan’s own ventures. Each one has a different job, and each
          is labeled clearly.
        </p>
        <div className={styles.founderGrid}>
          {FOUNDER_PROJECTS.map((project) => (
            <article
              key={project.name}
              className={styles.founderCard}
              style={{ "--case-accent": project.color } as CSSProperties}
            >
              <div className={styles.founderBrand}>
                {project.logo ? (
                  <Image
                    src={project.logo}
                    width={54}
                    height={54}
                    alt=""
                    className={styles.logo}
                  />
                ) : (
                  <span className={styles.brandIcon}>
                    <project.icon aria-hidden="true" />
                  </span>
                )}
                <div>
                  <p className={styles.label}>
                    Founder-built{" "}
                    {project.name === "Gideon Commerce"
                      ? "· In development"
                      : "platform"}
                  </p>
                  <h3>{project.name}</h3>
                </div>
              </div>
              <h4>{project.title}</h4>
              <p>{project.text}</p>
              <DestinationLink href={project.href} className={styles.textLink}>
                {project.link}
              </DestinationLink>
              {project.second && (
                <Link href={project.second} className={styles.secondaryLink}>
                  {project.secondLabel}
                  <ArrowRight aria-hidden="true" />
                </Link>
              )}
            </article>
          ))}
        </div>
      </section>
      <section className={`${styles.shell} ${styles.private}`}>
        <Lock aria-hidden="true" />
        <div>
          <h2>Private client work stays private.</h2>
          <p>
            Mortgage, real-estate, and event builds covered by confidentiality
            are not shown here. Client records are never part of the public
            portfolio.
          </p>
        </div>
      </section>
      <section className={`${styles.shell} ${styles.final}`}>
        <p className={styles.eyebrow}>Your business is next</p>
        <h2>What should your website help someone do?</h2>
        <p>
          Get a quote. Apply. Book. Buy. Start with that one job, then connect
          the pieces that make it work.
        </p>
        <div className={styles.actions}>
          <CtaLink
            href="/start"
            event="map_my_company"
            placement="portfolio_final"
            className={styles.primaryLink}
          >
            Map my business
            <ArrowRight aria-hidden="true" />
          </CtaLink>
          <Link href="/pricing" className={styles.secondaryLink}>
            See options and pricing
            <ArrowRight aria-hidden="true" />
          </Link>
        </div>
      </section>
    </main>
  );
}
