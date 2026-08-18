import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import { notFound } from "next/navigation";
import {
  ArrowRight,
  ArrowUpRight,
  BadgeDollarSign,
  Boxes,
  ChartNoAxesCombined,
  CircleCheck,
  CircleMinus,
  Database,
  ExternalLink,
  Gauge,
  Layers3,
  Megaphone,
  MessageSquareText,
  MonitorSmartphone,
  PackageCheck,
  RadioTower,
  ShieldCheck,
  TriangleAlert,
  Workflow,
  Wrench,
  type LucideIcon,
} from "lucide-react";
import {
  STAGES,
  STAGE_SLUGS,
  getStage,
  type StageSlug,
} from "@/lib/system-stages";
import { TOOLS } from "@/lib/tools";
import { WEBSITE_LAUNCH_CHECKOUT } from "@/lib/offers";
import CtaLink from "@/components/site/CtaLink";
import styles from "./stage.module.css";

type StagePresentation = {
  icon: LucideIcon;
  image: string;
  width: number;
  height: number;
  alt: string;
  caption: string;
};

const STAGE_PRESENTATION: Record<StageSlug, StagePresentation> = {
  attention: {
    icon: Megaphone,
    image: "/images/homepage-v2/connected-company-hero.webp",
    width: 1920,
    height: 1080,
    alt: "A connected company system routing attention toward customer conversations and measurable sales",
    caption: "Turn attention into a traceable next action.",
  },
  website: {
    icon: MonitorSmartphone,
    image: "/images/homepage-v2/company-operating-loop.webp",
    width: 1920,
    height: 1080,
    alt: "A premium company operating loop connecting a website to lead capture, follow up, sales, and reporting",
    caption: "The website is the front door to the operating system.",
  },
  "lead-capture": {
    icon: RadioTower,
    image: "/images/visual-system/one-customer-one-record.webp",
    width: 1254,
    height: 1254,
    alt: "Phone calls, text messages, social direct messages, and website forms flowing into one customer record",
    caption: "Every channel lands in one owned record.",
  },
  crm: {
    icon: Database,
    image: "/images/visual-system/one-customer-one-record.webp",
    width: 1254,
    height: 1254,
    alt: "Four lead sources converging into one complete customer record",
    caption: "One customer. One history. One next move.",
  },
  "follow-up": {
    icon: MessageSquareText,
    image: "/images/visual-system/automate-the-reminder.webp",
    width: 1254,
    height: 1254,
    alt: "A quote, timed follow up, and owner review connected in one workflow",
    caption: "The system remembers. The owner stays in control.",
  },
  sale: {
    icon: BadgeDollarSign,
    image: "/images/visual-system/trace-the-sale.webp",
    width: 1254,
    height: 1254,
    alt: "A customer journey traced from the first source through conversion and sale",
    caption: "Trace the sale back to the signal that started it.",
  },
  delivery: {
    icon: PackageCheck,
    image: "/images/visual-system/course-system-blueprint.webp",
    width: 1254,
    height: 1254,
    alt: "A connected delivery system with structured content, customer access, progress, and operations",
    caption: "Delivery becomes a system instead of a memory test.",
  },
  reporting: {
    icon: ChartNoAxesCombined,
    image: "/images/homepage-v2/proof-cockpit.webp",
    width: 1920,
    height: 1080,
    alt: "A premium reporting cockpit with connected performance instruments",
    caption: "See what moved, what converted, and what needs attention.",
  },
};

const OFFER_ICONS: LucideIcon[] = [Workflow, Layers3, Database, Boxes, Gauge];

// One full page per stage of the connected-company loop. The nodes on the
// homepage diagram link here.
//
// Every page is: the leak, what we build, rent versus own where it applies,
// proof, and live interactive tools that already exist on this site. The tools
// are the "interactive" part Ryan asked for and they are real, not mock-ups.

export const revalidate = 3600;

export function generateStaticParams() {
  return STAGE_SLUGS.map((stage) => ({ stage }));
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ stage: string }>;
}): Promise<Metadata> {
  const { stage: slug } = await params;
  const stage = getStage(slug);
  if (!stage) return {};
  const url = `https://www.theleadflowpro.com/system/${stage.slug}`;
  return {
    title: stage.title,
    description: stage.description,
    keywords: stage.keywords,
    alternates: { canonical: url },
    openGraph: {
      title: `${stage.name}: ${stage.h1Loud}`,
      description: stage.description,
      url,
      siteName: "The LeadFlow Pro",
      images: [{ url: "/og/home.png", width: 1200, height: 630 }],
      type: "article",
    },
    twitter: {
      card: "summary_large_image",
      title: `${stage.name}: ${stage.h1Loud}`,
      description: stage.description,
      images: ["/og/home.png"],
    },
  };
}

export default async function StagePage({
  params,
}: {
  params: Promise<{ stage: string }>;
}) {
  const { stage: slug } = await params;
  const stage = getStage(slug);
  if (!stage) notFound();

  const next = getStage(stage.next)!;
  const presentation = STAGE_PRESENTATION[stage.slug];
  const StageIcon = presentation.icon;
  const tools = stage.tools
    .map((s) => TOOLS.find((t) => t.slug === s))
    .filter((t): t is (typeof TOOLS)[number] => Boolean(t));

  const jsonLd = {
    "@context": "https://schema.org",
    "@type": "Service",
    name: `${stage.name} systems`,
    serviceType: stage.name,
    description: stage.description,
    provider: {
      "@type": "Organization",
      name: "The LeadFlow Pro",
      url: "https://www.theleadflowpro.com",
    },
    areaServed: "United States",
    hasOfferCatalog: {
      "@type": "OfferCatalog",
      name: stage.buildHeading,
      itemListElement: stage.offers.map((o) => ({
        "@type": "Offer",
        itemOffered: { "@type": "Service", name: o.name, description: o.body },
      })),
    },
  };

  return (
    <main className={styles.page}>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
      />

      <section className={styles.hero}>
        <div className={styles.shell}>
          <div className={styles.heroGrid}>
            <div className={styles.heroCopy}>
              <p className={styles.eyebrow}>
                <span className={styles.iconBadge}>
                  <StageIcon aria-hidden="true" />
                </span>
                <span>
                  Stage {stage.num} of 8
                  <small>{stage.short}</small>
                </span>
              </p>
              <h1>
                <em>{stage.h1Quiet}</em>
                {stage.h1Loud}
              </h1>
              <p className={styles.heroLead}>{stage.lead}</p>
              <div className={styles.actions}>
                <CtaLink
                  href={`/start?goal=${stage.goal}`}
                  event="map_my_company"
                  placement={`stage_${stage.slug}_hero`}
                  className={`${styles.button} ${styles.buttonPrimary}`}
                >
                  Map my company
                  <ArrowRight aria-hidden="true" />
                </CtaLink>
                <a
                  className={`${styles.button} ${styles.buttonGhost}`}
                  href={WEBSITE_LAUNCH_CHECKOUT}
                  data-analytics={`cta-website-launch-stage-${stage.slug}`}
                >
                  Start Website Launch · $500
                </a>
              </div>
              <p className={styles.checkoutNote}>
                $500 starts the five-page Website Launch. Once intake begins, the deposit
                is non-refundable, except where the written agreement or applicable law
                requires otherwise. CRM, automation, portals, and deeper systems are
                scoped separately.
              </p>
              <p className={styles.ownershipLine}>
                <ShieldCheck aria-hidden="true" />
                Built in accounts the business controls.
              </p>
            </div>

            <figure
              className={`${styles.heroVisual} ${
                presentation.width === presentation.height ? styles.heroVisualSquare : ""
              }`}
            >
              <Image
                src={presentation.image}
                alt={presentation.alt}
                width={presentation.width}
                height={presentation.height}
                priority
                sizes="(max-width: 900px) 100vw, 54vw"
              />
              <figcaption>
                <span>{stage.name} system</span>
                <strong>{presentation.caption}</strong>
              </figcaption>
            </figure>
          </div>

          <nav className={styles.stageRail} aria-label="The eight connected-company stages">
            {STAGES.map((s) => {
              const RailIcon = STAGE_PRESENTATION[s.slug].icon;
              return (
                <Link
                  key={s.slug}
                  href={`/system/${s.slug}`}
                  aria-current={s.slug === stage.slug ? "page" : undefined}
                  className={s.slug === stage.slug ? styles.stageCurrent : undefined}
                >
                  <RailIcon aria-hidden="true" />
                  <span>
                    <small>{s.num}</small>
                    {s.name}
                  </span>
                </Link>
              );
            })}
          </nav>
        </div>
      </section>

      <section className={styles.section}>
        <div className={styles.shell}>
          <div className={styles.sectionHead}>
            <div>
              <p className={styles.kicker}>
                <TriangleAlert aria-hidden="true" />
                {stage.problemHeading}
              </p>
              <h2>Find the leak before you buy the fix.</h2>
            </div>
            <p>{stage.problemBody}</p>
          </div>
          <ul className={styles.leakLedger}>
            {stage.leaks.map((l) => (
              <li key={l}>
                <CircleMinus aria-hidden="true" />
                <span>{l}</span>
              </li>
            ))}
          </ul>
        </div>
      </section>

      <section className={`${styles.section} ${styles.buildSection}`}>
        <div className={styles.shell}>
          <div className={styles.sectionHead}>
            <div>
              <p className={styles.kicker}>
                <Workflow aria-hidden="true" />
                What we build
              </p>
              <h2>{stage.buildHeading}</h2>
            </div>
            <p>{stage.buildLead}</p>
          </div>
          <div className={styles.offerGrid}>
            {stage.offers.map((o, index) => {
              const OfferIcon = OFFER_ICONS[index % OFFER_ICONS.length];
              return (
                <article key={o.name}>
                  <span className={styles.offerIcon}>
                    <OfferIcon aria-hidden="true" />
                  </span>
                  <div>
                    <h3>{o.name}</h3>
                    <p>{o.body}</p>
                  </div>
                </article>
              );
            })}
          </div>
          <div className={styles.actions}>
            <CtaLink
              href={`/start?goal=${stage.goal}`}
              event="map_my_company"
              placement={`stage_${stage.slug}_offers`}
              className={`${styles.button} ${styles.buttonPrimary}`}
            >
              Build this for my company
              <ArrowRight aria-hidden="true" />
            </CtaLink>
            <Link className={`${styles.button} ${styles.buttonGhost}`} href="/add-ons">
              See the full add-on menu
            </Link>
          </div>
        </div>
      </section>

      {stage.rentOwn && (
        <section className={`${styles.section} ${styles.comparisonSection}`}>
          <div className={styles.shell}>
            <div className={styles.sectionHead}>
              <div>
                <p className={styles.kicker}>
                  <ShieldCheck aria-hidden="true" />
                  Rent or own
                </p>
                <h2>{stage.rentOwn.heading}</h2>
              </div>
              <p>{stage.rentOwn.body}</p>
            </div>
            <div className={styles.comparisonGrid}>
              <div className={styles.rentColumn}>
                <span className={styles.columnLabel}>Keep renting it</span>
                <ul>
                  {stage.rentOwn.rented.map((r) => (
                    <li key={r}>
                      <CircleMinus aria-hidden="true" />
                      <span>{r}</span>
                    </li>
                  ))}
                </ul>
              </div>
              <div className={styles.ownColumn}>
                <span className={styles.columnLabel}>Own it once</span>
                <ul>
                  {stage.rentOwn.owned.map((r) => (
                    <li key={r}>
                      <CircleCheck aria-hidden="true" />
                      <span>{r}</span>
                    </li>
                  ))}
                </ul>
              </div>
            </div>
          </div>
        </section>
      )}

      {tools.length > 0 && (
        <section className={`${styles.section} ${styles.toolsSection}`}>
          <div className={styles.shell}>
            <div className={styles.sectionHead}>
              <div>
                <p className={styles.kicker}>
                  <Wrench aria-hidden="true" />
                  Run your own numbers
                </p>
                <h2>Free tools for this stage. No signup to use them.</h2>
              </div>
              <p>
                Put your real figures in. If the number that comes back is uncomfortable,
                that is the leak, and it is the thing worth fixing first.
              </p>
            </div>
            <div className={styles.toolGrid}>
              {tools.map((t) => (
                <Link key={t.slug} href={`/tools/${t.slug}`} className={styles.toolCard}>
                  <span className={styles.toolArt}>
                    <Image
                      src={t.image.src}
                      alt={t.image.alt}
                      width={t.image.width}
                      height={t.image.height}
                      sizes="(max-width: 680px) 112px, 160px"
                    />
                  </span>
                  <span className={styles.toolCopy}>
                    <small>Free working tool</small>
                    <strong>{t.name}</strong>
                    <span>{t.tagline}</span>
                  </span>
                  <ArrowUpRight aria-hidden="true" className={styles.toolArrow} />
                </Link>
              ))}
            </div>
          </div>
        </section>
      )}

      <section className={`${styles.section} ${styles.proofSection}`}>
        <div className={styles.shell}>
          <div className={styles.sectionHead}>
            <div>
              <p className={styles.kicker}>
                <CircleCheck aria-hidden="true" />
                Proof before promise
              </p>
              <h2>Already built. Go look.</h2>
            </div>
            <p>
              Live systems where this stage is running right now. Open any of them and check
              the work rather than taking our word for it.
            </p>
          </div>
          <div className={styles.proofGrid}>
            {stage.proof.map((p, index) => (
              <article key={p.name}>
                <span className={styles.proofNumber}>{String(index + 1).padStart(2, "0")}</span>
                <div>
                  <h3>{p.name}</h3>
                  <p>{p.what}</p>
                </div>
                {p.url && (
                  <a className={styles.proofLink} href={p.url} target="_blank" rel="noreferrer">
                    Visit it
                    <ExternalLink aria-hidden="true" />
                  </a>
                )}
              </article>
            ))}
          </div>
        </div>
      </section>

      <section className={styles.finalSection}>
        <div className={styles.shell}>
          <p className={styles.kicker}>Stage {next.num} is next</p>
          <h2>
            <em>{stage.name} feeds {next.name.toLowerCase()}.</em>
            That is the whole point.
          </h2>
          <p className={styles.finalLead}>
            Any one stage on its own is a tool. All eight, wired together, is a company that
            runs. Start with the map and find out which stage is actually costing you money.
          </p>
          <div className={styles.actions}>
            <CtaLink
              href={`/start?goal=${stage.goal}`}
              event="map_my_company"
              placement={`stage_${stage.slug}_final`}
              className={`${styles.button} ${styles.buttonPrimary}`}
            >
              Map my company
              <ArrowRight aria-hidden="true" />
            </CtaLink>
            <Link
              className={`${styles.button} ${styles.buttonGhost}`}
              href={`/system/${next.slug}`}
            >
              Stage {next.num}: {next.name}
              <ArrowRight aria-hidden="true" />
            </Link>
          </div>
        </div>
      </section>
    </main>
  );
}
