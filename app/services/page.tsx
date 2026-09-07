import { withPublicPageMetadata } from "@/lib/publicPageMetadata";
import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import { ArrowRight, Check, ShieldCheck } from "lucide-react";
import ServicesPreview from "@/components/site/ServicesPreview";
import CtaLink from "@/components/site/CtaLink";
import { FREE_BUILD } from "@/lib/freeBuild";
import { LADDER, PHONE_DISPLAY, PHONE_TEL } from "@/lib/siteContent";
import styles from "./services.module.css";

const SITE = "https://www.theleadflowpro.com";

export const metadata: Metadata = withPublicPageMetadata("/services", {
  title: "Services | The LeadFlow Pro",
  description:
    "Websites, lead capture, CRM, follow-up, payments, portals, and analytics, built in accounts you control. See what The LeadFlow Pro builds and what it costs.",
  alternates: { canonical: `${SITE}/services` },
  openGraph: {
    title: "Services | The LeadFlow Pro",
    description:
      "The website, the system behind it, and the back office that runs it, built in accounts you control.",
    url: `${SITE}/services`,
    siteName: "The LeadFlow Pro",
    images: [{ url: "/og/home.png", width: 1200, height: 630 }],
    type: "website",
  },
});

const GUIDE_LINKS = [
  ["Get found", "Ads, search, and useful content", "/system/attention"],
  [
    "Your website",
    "Explain the offer. Make the next step easy.",
    "/system/website",
  ],
  ["Capture inquiries", "Forms, calls, and messages", "/system/lead-capture"],
  ["Customer records", "The history, owner, and next task", "/system/crm"],
  ["Follow-up", "Reminders and replies", "/system/follow-up"],
  ["Get paid", "Quotes, deposits, and checkout", "/system/sale"],
  [
    "Deliver the work",
    "Files, approvals, and client portals",
    "/system/delivery",
  ],
  [
    "See what works",
    "Sources, inquiries, and recorded sales",
    "/system/reporting",
  ],
];

export default function ServicesPage() {
  return (
    <main className={styles.page}>
      <section className={styles.hero}>
        <div className={styles.shell + " " + styles.heroGrid}>
          <div className={styles.heroCopy}>
            <p className={styles.eyebrow}>WEBSITES + THE WORK BEHIND THEM</p>
            <h1>
              A better website.
              <br />
              <em>A clearer workday.</em>
            </h1>
            <p className={styles.lead}>
              Help customers find you, ask for a quote, and get an answer. We
              build the website and connect the next steps.
            </p>
            <div className={styles.actions}>
              <Link className={styles.button} href="/free-build">
                Apply for the $0 website{" "}
                <ArrowRight size={19} aria-hidden="true" />
              </Link>
              <Link className={styles.textLink} href="#what-we-build">
                Show me how it works <ArrowRight size={18} aria-hidden="true" />
              </Link>
            </div>
            <p className={styles.small}>
              Five pages. Application required. Optional services cost extra.
              <br />
              Prefer to buy outright?{" "}
              <Link href="/packages/launch">
                Website Launch is $1,000, with $500 to start.
              </Link>
            </p>
            <p className={styles.ownership}>
              <ShieldCheck size={18} aria-hidden="true" /> Your website. Your
              accounts. Your customer data.
            </p>
          </div>
          <figure className={styles.heroArt}>
            <Image
              src="/images/services/customer-record-light.webp"
              alt="A blue laptop holds one customer card, connected to a phone, a message, and a red calendar on a bright cream desk."
              width={1448}
              height={1086}
              sizes="(max-width: 800px) 94vw, 50vw"
              priority
            />
            <figcaption>
              <strong>One customer. One record.</strong>
              <span>
                Calls, messages, appointments, and the next task together.
              </span>
            </figcaption>
          </figure>
        </div>
      </section>

      <section id="what-we-build" className={styles.section}>
        <div className={styles.shell}>
          <div className={styles.heading}>
            <p className={styles.eyebrow}>SEE THE DIFFERENCE</p>
            <h2>What happens after someone clicks?</h2>
            <p>
              Choose an everyday situation. See the useful thing we can build
              around it.
            </p>
          </div>
          <ServicesPreview />
        </div>
      </section>

      <section
        className={styles.tintedSection}
        aria-labelledby="follow-up-title"
      >
        <div className={styles.shell + " " + styles.featureGrid}>
          <figure className={styles.featureArt}>
            <Image
              src="/images/services/quote-follow-up-light.webp"
              alt="A quote clipboard, red reminder bell, calendar, and blue phone with a message are connected across a sunlit cream desk."
              width={1448}
              height={1086}
              sizes="(max-width: 800px) 94vw, 50vw"
            />
          </figure>
          <div className={styles.featureCopy}>
            <p className={styles.eyebrow}>FOLLOW-UP THAT HAS AN OWNER</p>
            <h2 id="follow-up-title">
              You sent the quote.
              <br />
              Who follows up?
            </h2>
            <p>
              Give every open quote a next step, a date, and a person
              responsible. The system remembers. Your team stays in control.
            </p>
            <ol className={styles.shortSteps}>
              <li>
                <span>1</span>
                <div>
                  <strong>Keep the quote with the customer.</strong>
                  <p>No hunting through old messages.</p>
                </div>
              </li>
              <li>
                <span>2</span>
                <div>
                  <strong>Set the next reminder.</strong>
                  <p>See what needs attention and when.</p>
                </div>
              </li>
              <li>
                <span>3</span>
                <div>
                  <strong>Review and reply.</strong>
                  <p>Approve the message. Keep the conversation human.</p>
                </div>
              </li>
            </ol>
            <Link className={styles.textLink} href="/system/follow-up">
              Explore follow-up options{" "}
              <ArrowRight size={18} aria-hidden="true" />
            </Link>
          </div>
        </div>
      </section>

      <section
        className={styles.section}
        aria-labelledby="service-guides-title"
      >
        <div className={styles.shell}>
          <div className={styles.heading}>
            <p className={styles.eyebrow}>BUILD ONLY WHAT YOU NEED</p>
            <h2 id="service-guides-title">
              Where would a little help go a long way?
            </h2>
            <p>
              Start with one part of the business. Connect more when it makes
              sense.
            </p>
          </div>
          <nav className={styles.guideGrid} aria-label="Explore our services">
            {GUIDE_LINKS.map(([title, body, href]) => (
              <Link key={href} href={href}>
                <div>
                  <strong>{title}</strong>
                  <span>{body}</span>
                </div>
                <ArrowRight size={20} aria-hidden="true" />
              </Link>
            ))}
          </nav>
          <div className={styles.proofBar}>
            <div>
              <strong>Want to see the work already built?</strong>
              <p>
                Explore public business boards with source labels and real
                recorded activity.
              </p>
            </div>
            <Link className={styles.textLink} href="/scoreboard">
              Open the scoreboard <ArrowRight size={18} aria-hidden="true" />
            </Link>
          </div>
        </div>
      </section>

      <section id="how-it-works" className={styles.tintedSection}>
        <div className={styles.shell}>
          <div className={styles.heading}>
            <p className={styles.eyebrow}>A CLEAR PLAN BEFORE WE BUILD</p>
            <h2>Know what you’re getting.</h2>
          </div>
          <ol className={styles.process}>
            <li>
              <span>01</span>
              <h3>Show us the problem.</h3>
              <p>
                What takes too long? Where do customers get stuck? We look at
                the way you work now.
              </p>
            </li>
            <li>
              <span>02</span>
              <h3>Approve the plan.</h3>
              <p>
                You get the pages, features, cost, and responsibilities in
                writing before the build.
              </p>
            </li>
            <li>
              <span>03</span>
              <h3>Use it with confidence.</h3>
              <p>
                We build in your accounts, test the agreed customer path, and
                show you how to run it.
              </p>
            </li>
          </ol>
        </div>
      </section>

      <section id="packages" className={styles.section}>
        <div className={styles.shell}>
          <div className={styles.heading}>
            <p className={styles.eyebrow}>YOUR STARTING POINT</p>
            <h2>A website first. More when you need it.</h2>
            <p>
              Choose a foundation or explore a larger build. Every project
              starts with a written scope.
            </p>
          </div>
          <div className={styles.packages}>
            {LADDER.map((offer) => (
              <article
                key={offer.name}
                className={
                  styles.package +
                  (offer.lead ? " " + styles.featuredPackage : "")
                }
              >
                <span className={styles.packageKind}>{offer.kind}</span>
                <h3>{offer.name}</h3>
                <p className={styles.price}>{offer.price}</p>
                <p>{offer.body}</p>
                <ul>
                  {offer.items.map((item) => (
                    <li key={item}>
                      <Check size={18} aria-hidden="true" />
                      <span>{item}</span>
                    </li>
                  ))}
                </ul>
                <Link
                  className={offer.lead ? styles.button : styles.outlineButton}
                  href={offer.href}
                >
                  {offer.cta}
                  <ArrowRight size={18} aria-hidden="true" />
                </Link>
              </article>
            ))}
          </div>
          <div className={styles.custom}>
            <div>
              <h3>Have something to sell?</h3>
              <p>
                Products, services, or downloads. Plan the path from the offer
                to payment and delivery, and try the tools that support it.
              </p>
            </div>
            <Link className={styles.textLink} href="/commerce">
              Explore commerce <ArrowRight size={18} aria-hidden="true" />
            </Link>
          </div>
          <div className={styles.custom}>
            <div>
              <h3>Need a custom platform?</h3>
              <p>
                Multi-location systems, complex migrations, deeper permissions,
                and software products are scoped from $15,000+. A System Map
                comes first when the dependencies are complex.
              </p>
            </div>
            <Link className={styles.textLink} href="/start?goal=custom">
              Talk through the idea <ArrowRight size={18} aria-hidden="true" />
            </Link>
          </div>
        </div>
      </section>

      <section
        className={styles.tintedSection}
        aria-labelledby="free-program-title"
      >
        <div className={styles.shell + " " + styles.programGrid}>
          <div>
            <p className={styles.eyebrow}>THE FREE WEBSITE PROGRAM</p>
            <h2 id="free-program-title">
              The build fee is $0.
              <br />
              The website is yours.
            </h2>
            <p>
              Apply for one of {FREE_BUILD.monthlySlots} monthly openings.
              Approved businesses receive a five-page website with no required
              add-on. Your code, domain, accounts, and leads stay under your
              control.
            </p>
            <CtaLink
              href="/free-build"
              event="apply_free_website"
              placement="services_final"
              className={styles.button}
            >
              Apply for the $0 website{" "}
              <ArrowRight size={19} aria-hidden="true" />
            </CtaLink>
            <p className={styles.small}>
              Domain registration, paid hosting after the included 90 days, ad
              spend, subscriptions, extra pages, CRM, automation, content,
              video, and ongoing marketing are separate and quoted before
              approval.
            </p>
          </div>
          <aside className={styles.helpCard}>
            <h3>Want to learn it yourself?</h3>
            <p>
              Use the free tools, work through a practical lesson, or bring your
              laptop to a workshop.
            </p>
            <Link href="/tools">
              Find a free tool <ArrowRight size={18} aria-hidden="true" />
            </Link>
            <Link href="/training">
              Explore the training <ArrowRight size={18} aria-hidden="true" />
            </Link>
            <Link href="/events">
              See upcoming workshops <ArrowRight size={18} aria-hidden="true" />
            </Link>
            <a href={PHONE_TEL}>Call or text {PHONE_DISPLAY}</a>
          </aside>
        </div>
      </section>
    </main>
  );
}
