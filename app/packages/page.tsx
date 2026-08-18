import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import {
  ArrowRight,
  ArrowUpRight,
  Check,
  MoveRight,
  ShieldCheck,
} from "lucide-react";
import styles from "./product-studio.module.css";
import { WEBSITE_LAUNCH_CHECKOUT as CHECKOUT_URL } from "@/lib/offers";

export const metadata: Metadata = {
  title: "Product Studio & Website Launch | The LeadFlow Pro",
  description:
    "Start a conversion-led five-page Website Launch for $1,000: $500 to reserve the build and $500 after approval, before launch. Add funnels, CRM, tools, portals, courses, ads and automation as separately scoped modules.",
  alternates: { canonical: "https://www.theleadflowpro.com/packages" },
  openGraph: {
    title: "Not another website. A working business system.",
    description:
      "Website Launch is $1,000 total: $500 to start and $500 after approval, before launch.",
    url: "https://www.theleadflowpro.com/packages",
    siteName: "The LeadFlow Pro",
    images: [
      {
        url: "/images/product-studio/connected-system-path.webp",
        width: 1672,
        height: 941,
        alt: "A connected business path from attention through lead capture, customer record, follow up, and sale",
      },
    ],
    type: "website",
  },
  twitter: {
    card: "summary_large_image",
    title: "Not another website. A working business system.",
    description: "A $1,000 Website Launch with a clear two-payment schedule.",
    images: ["/images/product-studio/connected-system-path.webp"],
  },
};

const FLOW = ["Attention", "Lead capture", "Follow-up", "Booked call", "Sale"];

const INCLUDED = [
  ["01", "Conversion map", "One goal, one buyer path and one measurable next action."],
  ["02", "Five premium pages", "A focused public experience, not a stack of filler pages."],
  ["03", "Lead capture + routing", "Forms reach the right place with the context needed to follow up."],
  ["04", "Responsive production build", "Fast, accessible and deliberate from desktop to phone."],
  ["05", "Analytics + deployment", "Launch on production infrastructure with the core signals connected."],
  ["06", "Two revision rounds", "Two focused rounds against the approved scope before launch."],
  ["07", "Three premium visual scenes", "A founding-rate visual pack that explains the offer, process, or system without a wall of copy."],
];

const SERVICES = [
  {
    number: "01",
    name: "Funnel + CRM",
    outcome: "Capture demand, qualify it and give every lead a visible next step.",
    price: "Scoped module",
  },
  {
    number: "02",
    name: "Tools + portals",
    outcome: "Turn expertise into useful software for customers, members or the team.",
    price: "Scoped module",
  },
  {
    number: "03",
    name: "Course platform",
    outcome: "Training modules, member access, progress and an operator-owned curriculum.",
    price: "$5,000+",
  },
  {
    number: "04",
    name: "Ads + automations",
    outcome: "Connect traffic, response, nurture and reporting without pretending one ad fixes everything.",
    price: "Scoped module",
  },
  {
    number: "05",
    name: "Company operating system",
    outcome: "Join the public site, database, dashboards and delivery workflows into one owned stack.",
    price: "$7,500+",
  },
  {
    number: "06",
    name: "Custom platform",
    outcome: "Build the product, marketplace or multi-role system that cannot come from a template.",
    price: "$15,000+",
  },
];

const PROCESS = [
  ["01", "Reserve", "The $500 deposit reserves the Website Launch and starts intake."],
  ["02", "Map", "We confirm the audience, goal, pages, assets and written scope."],
  ["03", "Build", "The working experience comes together in a reviewable environment."],
  ["04", "Approve", "Two revision rounds tighten the work against the agreed direction."],
  ["05", "Launch", "The remaining $500 is due after approval and before production launch."],
];

const WORK = [
  {
    name: "Premier Dental Academy",
    type: "Enrollment system",
    image: "/og/portfolio/premier-dental.jpg",
    href: "https://www.premierdentalacademyoflongview.com",
    alt: "Premier Dental Academy of Longview enrollment website",
  },
  {
    name: "RealRyanNichols.com",
    type: "Independent media system",
    image: "/og/portfolio/realryannichols.jpg",
    href: "https://realryannichols.com",
    alt: "RealRyanNichols.com independent publishing and searchable archive platform",
  },
  {
    name: "Lone Star Total Wash",
    type: "Service sales system",
    image: "/og/portfolio/lonestar.jpg",
    href: "https://www.lonestartotalwash.com",
    alt: "Lone Star Total Wash service website",
  },
];

const JSON_LD = {
  "@context": "https://schema.org",
  "@type": "Service",
  name: "The LeadFlow Pro Website Launch",
  serviceType: "Conversion-led business website design and development",
  provider: {
    "@type": "Organization",
    name: "The LeadFlow Pro",
    legalName: "Longview Training Center, LLC",
    url: "https://www.theleadflowpro.com",
  },
  offers: {
    "@type": "Offer",
    price: "1000",
    priceCurrency: "USD",
    url: CHECKOUT_URL,
    description: "$500 deposit and $500 after approval, before launch.",
  },
};

export default function ProductStudioPage() {
  return (
    <main className={styles.page}>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(JSON_LD) }}
      />

      <section className={styles.hero}>
        <Image
          className={styles.heroImage}
          src="/images/product-studio/connected-system-path.webp"
          alt="A connected business path from attention through lead capture, customer record, follow up, and sale"
          fill
          priority
          sizes="100vw"
        />
        <div className={styles.heroWash} />
        <div className={styles.shell}>
          <div className={styles.heroGrid}>
            <div className={styles.heroCopy}>
              <p className={styles.kicker}>Proof-led Product Studio</p>
              <h1>
                Not another website.
                <span>A working business system.</span>
              </h1>
              <p className={styles.heroLead}>
                Strategy, design, funnels, automation and training infrastructure, built to
                turn attention into a measurable next step.
              </p>
              <div className={styles.actions}>
                <a
                  className={styles.primaryAction}
                  href={CHECKOUT_URL}
                  data-analytics="cta-website-launch-packages-hero"
                >
                  Start with $500
                  <ArrowUpRight aria-hidden="true" />
                </a>
                <a className={styles.secondaryAction} href="#website-launch">
                  See the exact scope
                  <ArrowRight aria-hidden="true" />
                </a>
              </div>
              <p className={styles.heroNote}>
                <ShieldCheck aria-hidden="true" />
                $1,000 total · written scope · the second $500 is due after approval, before
                launch · the initial deposit becomes non-refundable once intake begins,
                except where the written agreement or applicable law requires otherwise
              </p>
            </div>

            <aside className={styles.launchBrief} aria-label="Website Launch offer summary">
              <div className={styles.briefTopline}>
                <span>Website Launch</span>
                <span>01 / Foundation</span>
              </div>
              <div className={styles.briefPrice}>
                <strong>$1,000</strong>
                <span>total investment</span>
              </div>
              <div className={styles.briefPayments}>
                <div>
                  <span>Now</span>
                  <strong>$500</strong>
                  <small>Reserve + intake</small>
                </div>
                <MoveRight aria-hidden="true" />
                <div>
                  <span>Before launch</span>
                  <strong>$500</strong>
                  <small>After approval</small>
                </div>
              </div>
              <a
                href={CHECKOUT_URL}
                className={styles.briefLink}
                data-analytics="cta-website-launch-packages-brief"
              >
                Reserve the build
                <ArrowUpRight aria-hidden="true" />
              </a>
              <small>
                Once intake begins, the $500 deposit is non-refundable, except where the
                written agreement or applicable law requires otherwise.
              </small>
            </aside>
          </div>
        </div>
      </section>

      <section className={styles.flow} aria-label="Lead flow from attention to sale">
        <div className={styles.shell}>
          <ol>
            {FLOW.map((step, index) => (
              <li key={step}>
                <span>{String(index + 1).padStart(2, "0")}</span>
                <strong>{step}</strong>
                {index < FLOW.length - 1 ? <ArrowRight aria-hidden="true" /> : null}
              </li>
            ))}
          </ol>
        </div>
      </section>

      <section className={styles.proofSection}>
        <div className={styles.shell}>
          <div className={styles.sectionHead}>
            <div>
              <p className={styles.kickerDark}>Proof before promise</p>
              <h2>Real systems. Publicly inspectable.</h2>
            </div>
            <p>
              Open the work. A school enrollment system, a public-records platform and a
              service-business sales experience are different products because they solve
              different operating problems.
            </p>
          </div>

          <div className={styles.workRail}>
            {WORK.map((item, index) => (
              <a key={item.name} href={item.href} target="_blank" rel="noreferrer">
                <div className={styles.workImage}>
                  <Image src={item.image} alt={item.alt} fill sizes="(max-width: 760px) 92vw, 34vw" />
                </div>
                <div className={styles.workCaption}>
                  <span>{String(index + 1).padStart(2, "0")}</span>
                  <div>
                    <strong>{item.name}</strong>
                    <small>{item.type}</small>
                  </div>
                  <ArrowUpRight aria-hidden="true" />
                </div>
              </a>
            ))}
          </div>
          <Link href="/portfolio" className={styles.textLink}>
            Inspect the full body of work <ArrowRight aria-hidden="true" />
          </Link>
        </div>
      </section>

      <section id="website-launch" className={styles.launchSection}>
        <div className={styles.shell}>
          <div className={styles.launchGrid}>
            <div className={styles.launchIntro}>
              <p className={styles.kickerDark}>The foundation</p>
              <h2>Website Launch</h2>
              <div className={styles.priceLockup}>
                <strong>$1,000</strong>
                <span>$500 down / $500 before launch</span>
              </div>
              <p>
                A focused first release for a real business that needs credibility, lead
                capture and a clean path to the next conversation. The scope is deliberately
                tight so the work can be excellent.
              </p>
              <a
                className={styles.primaryActionLight}
                href={CHECKOUT_URL}
                data-analytics="cta-website-launch-packages-scope"
              >
                Reserve Website Launch | $500
                <ArrowUpRight aria-hidden="true" />
              </a>
              <small>
                Payment reserves the build and is applied to the $1,000 project total. Final
                scope is confirmed in writing before production work begins. Once intake
                begins, the $500 deposit is non-refundable, except where the written
                agreement or applicable law requires otherwise.
              </small>
            </div>

            <ol className={styles.scopeLedger}>
              {INCLUDED.map(([number, title, body]) => (
                <li key={number}>
                  <span>{number}</span>
                  <div>
                    <strong>{title}</strong>
                    <p>{body}</p>
                  </div>
                  <Check aria-hidden="true" />
                </li>
              ))}
            </ol>
          </div>
        </div>
      </section>

      <section className={styles.moduleSection}>
        <div className={styles.shell}>
          <div className={styles.moduleTitle}>
            <p className={styles.kicker}>Build the next layer</p>
            <h2>Add only what the business actually needs.</h2>
            <p>
              Funnels, CRM, tools, portals, courses, ads and automation are not buried inside
              a $1,000 website promise. Each is scoped as its own module or assembled into a
              larger system.
            </p>
          </div>

          <div className={styles.serviceLedger}>
            {SERVICES.map((service) => (
              <div key={service.number} className={styles.serviceRow}>
                <span>{service.number}</span>
                <strong>{service.name}</strong>
                <p>{service.outcome}</p>
                <em>{service.price}</em>
              </div>
            ))}
          </div>

          <div className={styles.moduleFooter}>
            <p>
              Need the map before the build? The deeper System Map remains available for
              complex businesses and is priced separately.
            </p>
            <Link href="/packages/system-map">
              Explore the System Map <ArrowRight aria-hidden="true" />
            </Link>
          </div>
        </div>
      </section>

      <section className={styles.processSection}>
        <div className={styles.shell}>
          <div className={styles.sectionHead}>
            <div>
              <p className={styles.kickerDark}>A clean engagement</p>
              <h2>Five moves. No unpaid guessing.</h2>
            </div>
            <p>
              The deposit starts a defined process. Working previews prove the direction;
              written scope and milestone approval keep both sides clear.
            </p>
          </div>
          <ol className={styles.process}>
            {PROCESS.map(([number, title, body]) => (
              <li key={number}>
                <span>{number}</span>
                <strong>{title}</strong>
                <p>{body}</p>
              </li>
            ))}
          </ol>
        </div>
      </section>

      <section className={styles.academySection}>
        <div className={styles.shell}>
          <div className={styles.academyGrid}>
            <div>
              <p className={styles.kicker}>Operator Academy</p>
              <h2>Learn the systems. Own the operation.</h2>
              <p>
                Practical training on ChatGPT setup, projects, plugins, content engines,
                funnels and client delivery, organized as a growing operating library, not a
                pile of disconnected videos.
              </p>
              <Link href="/training" className={styles.secondaryAction}>
                Explore the training area <ArrowRight aria-hidden="true" />
              </Link>
            </div>
            <div className={styles.academyConsole} aria-label="Operator Academy module preview">
              {["ChatGPT for business", "The content engine", "Client system delivery"].map(
                (title, index) => (
                  <div key={title}>
                    <span>{String(index + 1).padStart(2, "0")}</span>
                    <strong>{title}</strong>
                    <small>{index === 0 ? "Foundation" : "Coming through the build room"}</small>
                  </div>
                ),
              )}
            </div>
          </div>
        </div>
      </section>

      <section className={styles.finalSection}>
        <div className={styles.shell}>
          <div className={styles.finalGrid}>
            <div>
              <p className={styles.kicker}>The next move</p>
              <h2>Build the system your business can grow into.</h2>
            </div>
            <div>
              <p>
                Start with the five-page Website Launch. Add the funnel, CRM, tools, portal,
                course platform, ads or automation when the business case is clear.
              </p>
              <a
                className={styles.finalAction}
                href={CHECKOUT_URL}
                data-analytics="cta-website-launch-packages-final"
              >
                Start Website Launch | $500
                <ArrowUpRight aria-hidden="true" />
              </a>
              <span>
                Secure checkout through Longview Training Center, LLC. Once intake begins,
                the $500 deposit is non-refundable, except where the written agreement or
                applicable law requires otherwise.
              </span>
            </div>
          </div>
        </div>
      </section>
    </main>
  );
}
