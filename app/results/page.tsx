import { withPublicPageMetadata } from "@/lib/publicPageMetadata";
import type { Metadata } from "next";
import type { CSSProperties } from "react";
import Image from "next/image";
import Link from "next/link";
import {
  ArrowRight,
  BarChart3,
  MousePointerClick,
  ShieldCheck,
  ExternalLink,
} from "lucide-react";
import CtaLink from "@/components/site/CtaLink";
import styles from "../portfolio/portfolio.module.css";

export const metadata: Metadata = withPublicPageMetadata("/results", {
  title: "Business Websites & Real Work | The LeadFlow Pro",
  description:
    "See Premier Dental Academy, Lone Star Total Wash, and Ryan’s publishing platform. Explore real work, working websites, and privacy-safe activity reports.",
  alternates: { canonical: "https://www.theleadflowpro.com/results" },
  openGraph: {
    title: "Meet the businesses. See the work. Check the numbers.",
    type: "website",
  },
});

const EXAMPLES = [
  {
    name: "Premier Dental Academy of Longview",
    label: "Client system · Dental education",
    color: "#0e746b",
    image: "/images/premier/premier-classroom.jpg",
    alt: "A real classroom at Premier Dental Academy of Longview",
    logo: "/images/brand/premier-dental-academy-logo.png",
    title: "A school people can picture themselves in.",
    description:
      "Meet Amanda’s academy and see how the website, enrollment steps, study tools, and student portal connect around the school.",
    href: "/premier-system",
    link: "See Premier’s story",
    evidence: "/scoreboard/premier-dental-academy-of-longview",
    evidenceLabel: "See Premier’s recorded activity",
    contain: false,
  },
  {
    name: "Lone Star Total Wash",
    label: "Client system · Local services",
    color: "#a92a31",
    image: "/images/portfolio/lone-star-storefront-before-after.jpg",
    alt: "A storefront before and after cleaning, from Lone Star Total Wash’s public job gallery",
    logo: "/images/portfolio/lone-star-logo.png",
    title: "Finished work that earns a second look.",
    description:
      "The crew does the washing. The website shows its actual jobs, answers service questions, and gives customers a clear way to request a quote.",
    href: "/portfolio#lone-star",
    link: "See the Lone Star build",
    evidence: "https://www.lonestartotalwash.com/jobs",
    evidenceLabel: "Browse the actual job gallery",
    contain: false,
  },
  {
    name: "RealRyanNichols.com",
    label: "Founder-built · Publishing",
    color: "#a92a31",
    image: "/images/portfolio/fighting-shadows-book-cover.png",
    alt: "The published cover for Fighting Shadows, Ryan Nichols’s memoir",
    logo: "/images/brand/real-ryan-nichols-logo.png",
    title: "A place for the story to keep growing.",
    description:
      "Ryan’s own publishing platform connects articles, public records, book offers, and reader signups. Each gives the reader a useful next step.",
    href: "https://realryannichols.com",
    link: "Explore Ryan’s platform",
    evidence: "/scoreboard/realryannichols",
    evidenceLabel: "See Ryan’s recorded activity",
    contain: true,
  },
] as const;

export default function ResultsPage() {
  return (
    <main className={`cb-page ${styles.page}`}>
      <section className={styles.hero}>
        <div className={styles.shell}>
          <p className={styles.eyebrow}>Results · Start with the real work</p>
          <h1>
            Meet the businesses.
            <br />
            <em>See what moves people forward.</em>
          </h1>
          <p className={styles.intro}>
            The people, the photos, and the work belong to each business. We
            build the website and the connections that help customers take the
            next step.
          </p>
          <div className={styles.proofChoices}>
            {EXAMPLES.map((example) => (
              <article
                key={example.name}
                className={styles.proofChoice}
                style={{ "--case-accent": example.color } as CSSProperties}
              >
                <Image
                  src={example.image}
                  alt={example.alt}
                  width={1000}
                  height={750}
                  priority={
                    example.name === "Premier Dental Academy of Longview"
                  }
                  sizes="(max-width: 560px) 100vw, (max-width: 850px) 50vw, 33vw"
                  className={
                    example.contain ? styles.containedPhoto : undefined
                  }
                />
                <div className={styles.proofChoiceCopy}>
                  <div className={styles.proofBrand}>
                    <Image
                      src={example.logo}
                      width={44}
                      height={44}
                      alt=""
                      className={styles.logo}
                    />
                    <p className={styles.label}>{example.label}</p>
                  </div>
                  <h2>{example.name}</h2>
                  <h3>{example.title}</h3>
                  <p>{example.description}</p>
                  {example.href.startsWith("https://") ? (
                    <a
                      href={example.href}
                      target="_blank"
                      rel="noopener noreferrer"
                      className={styles.textLink}
                    >
                      {example.link}
                      <ExternalLink aria-hidden="true" />
                    </a>
                  ) : (
                    <Link href={example.href} className={styles.textLink}>
                      {example.link}
                      <ArrowRight aria-hidden="true" />
                    </Link>
                  )}
                  {example.evidence.startsWith("https://") ? (
                    <a
                      href={example.evidence}
                      target="_blank"
                      rel="noopener noreferrer"
                      className={styles.secondaryLink}
                    >
                      {example.evidenceLabel}
                      <ExternalLink aria-hidden="true" />
                    </a>
                  ) : (
                    <Link
                      href={example.evidence}
                      className={styles.secondaryLink}
                    >
                      {example.evidenceLabel}
                      <ArrowRight aria-hidden="true" />
                    </Link>
                  )}
                </div>
              </article>
            ))}
          </div>
        </div>
      </section>
      <section
        className={`${styles.shell} ${styles.section}`}
        aria-labelledby="check-work"
      >
        <p className={styles.eyebrow}>Take a closer look</p>
        <h2 id="check-work" className={styles.sectionTitle}>
          Three ways to check the work.
        </h2>
        <div className={styles.evidenceGrid}>
          <article className={styles.evidenceCard}>
            <MousePointerClick aria-hidden="true" />
            <h3>Use a real website.</h3>
            <p>
              Open the portfolio. Follow the same path a customer follows, from
              the first visit to the next action.
            </p>
            <Link href="/portfolio" className={styles.textLink}>
              Explore all the builds
              <ArrowRight aria-hidden="true" />
            </Link>
          </article>
          <article className={styles.evidenceCard}>
            <BarChart3 aria-hidden="true" />
            <h3>Read the activity.</h3>
            <p>
              The scoreboard reads aggregate records from connected businesses.
              Choose a date range and see what each number counts.
            </p>
            <Link href="/scoreboard" className={styles.textLink}>
              Open the scoreboard
              <ArrowRight aria-hidden="true" />
            </Link>
          </article>
          <article className={styles.evidenceCard}>
            <ShieldCheck aria-hidden="true" />
            <h3>See this site working.</h3>
            <p>
              Explore The LeadFlow Pro’s live analytics. Visitor identities and
              anything people type stay private.
            </p>
            <Link href="/live" className={styles.textLink}>
              View our live analytics
              <ArrowRight aria-hidden="true" />
            </Link>
          </article>
        </div>
        <p className={styles.evidenceNote}>
          A view is attention. A lead record is an inquiry or recorded contact.
          Neither automatically means a sale, a new student, or a completed job.
          Each scoreboard explains its sources.
        </p>
      </section>
      <section className={`${styles.shell} ${styles.final}`}>
        <p className={styles.eyebrow}>Let’s build around your work</p>
        <h2>
          You bring the business.
          <br />
          We help people see the next step.
        </h2>
        <p>
          Show us what you do and where customers get stuck. We’ll help you
          choose the website, form, tool, or follow-up that belongs there.
        </p>
        <div className={styles.actions}>
          <CtaLink
            href="/start"
            event="map_my_company"
            placement="results_final"
            className={styles.primaryLink}
          >
            Map my business
            <ArrowRight aria-hidden="true" />
          </CtaLink>
          <Link href="/free-build" className={styles.secondaryLink}>
            Explore the free website offer
            <ArrowRight aria-hidden="true" />
          </Link>
        </div>
      </section>
    </main>
  );
}
