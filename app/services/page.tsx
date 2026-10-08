import { withPublicPageMetadata } from "@/lib/publicPageMetadata";
import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import { ArrowRight, ShieldCheck } from "lucide-react";
import ServicesPreview from "@/components/site/ServicesPreview";
import CtaLink from "@/components/site/CtaLink";
import { PHONE_DISPLAY, PHONE_TEL } from "@/lib/siteContent";
import { CONSULTATION } from "@/lib/site/consultation";
import { productProjectIntakeHref } from "@/lib/site/agencyIntake";
import { PROJECT_QUOTE_SUMMARY } from "@/lib/site/projectQuotes";
import {
  MANAGED_PLANS,
  managedPlanPrice,
  managedAdvertisingExplanation,
  managedBillingExplanation,
  managedCompletionExplanation,
  managedRenewalExplanation,
} from "@/lib/site/managedPlans";
import {
  areaServedJsonLd,
  breadcrumbJsonLd,
  graph,
  jsonLdText,
  organizationJsonLd,
  webPageJsonLd,
  websiteJsonLd,
} from "@/lib/site/structuredData";
import { TEXT_LABEL, smsHref } from "@/lib/site/textLinks";
import styles from "./services.module.css";

const SITE = "https://www.theleadflowpro.com";

const SERVICES_TITLE =
  "Websites & Business Systems for Businesses and Communities | The LeadFlow Pro";
const SERVICES_DESCRIPTION = "Website and storefront projects for local businesses, online businesses and communities, quoted to your scope. Connect payments, delivery and customer records. Managed acquisition is a separate decision.";

export const metadata: Metadata = withPublicPageMetadata("/services", {
  title: SERVICES_TITLE,
  description: SERVICES_DESCRIPTION,
  openGraph: {
    description:
      "The website, the system behind it, and the back office that runs it, built in accounts you control.",
  },
});

// The organization and website nodes ride along so the @id references
// (provider, isPartOf, about) resolve inside this one document.
const SERVICES_JSONLD = graph(
  organizationJsonLd(),
  websiteJsonLd(),
  webPageJsonLd("/services", SERVICES_TITLE, SERVICES_DESCRIPTION),
  breadcrumbJsonLd([
    { name: "Home", path: "/" },
    { name: "Services", path: "/services" },
  ]),
  {
    "@type": "Service",
    "@id": `${SITE}/services#service`,
    name: "Website design and lead system build",
    serviceType: "Website design",
    description: SERVICES_DESCRIPTION,
    areaServed: areaServedJsonLd(),
    provider: { "@id": `${SITE}/#organization` },
  },
);

const GUIDE_LINKS = [
  ["Picture packages", "Branded social pictures and captions for your business", "/services/picture-packages"],
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
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: jsonLdText(SERVICES_JSONLD) }}
      />
      <section className={styles.hero}>
        <div className={styles.shell + " " + styles.heroGrid}>
          <div className={styles.heroCopy}>
            <p className={styles.eyebrow}>WEBSITES + THE WORK BEHIND THEM</p>
            <h1>
              A better home for your business or community.
              <br />
              <em>A clearer workday.</em>
            </h1>
            <p className={styles.lead}>
              Help people discover your work, buy from you, or join your community.
              We build the website and connect the next steps, then show your
              team how to run it.
            </p>
            <div className={styles.actions}>
              <CtaLink
                href={productProjectIntakeHref({ service: "websites" })}
                event="product_project_quote"
                placement="services_hero"
                className={styles.button}
              >
                Get my project quote{" "}
                <ArrowRight size={19} aria-hidden="true" />
              </CtaLink>
              <a
                className={styles.textLink}
                href={PHONE_TEL}
                data-cta="call"
                data-cta-placement="services_hero"
              >
                Call {PHONE_DISPLAY} <ArrowRight size={18} aria-hidden="true" />
              </a>
            </div>
            <p className={styles.small}>
              You get the pages, features, operating costs, and support in
              writing before any build starts.
              <br />
              Website, storefront, and product projects are quoted separately.
              <br />
              <Link href="/pricing">
                See optional managed acquisition pricing.
              </Link>
              <br />
              Want the acquisition campaign run for you?{" "}
              <Link href="/agency">Explore managed ads and follow-up.</Link>
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

      <section id="project-quotes" className={styles.section}>
        <div className={styles.shell}>
          <div className={styles.heading}>
            <p className={styles.eyebrow}>YOUR WEBSITE OR PRODUCT PROJECT</p>
            <h2>Build what you need. Agree the scope.</h2>
            <p>{PROJECT_QUOTE_SUMMARY}</p>
          </div>
          <div className={styles.custom}>
            <div>
              <h3>A storefront, a product launch, or a useful customer path.</h3>
              <p>
                Start with the pages, catalog, payment and delivery steps you need.
                We quote the build and identify usage costs and ongoing support.
                The request does not enroll you in a campaign or authorize payment.
              </p>
            </div>
            <Link className={styles.button} href={productProjectIntakeHref({ service: "websites" })}>
              Get my project quote <ArrowRight size={18} aria-hidden="true" />
            </Link>
          </div>
          <Link className={styles.textLink} href="/commerce">
            Explore storefront and product planning <ArrowRight size={18} aria-hidden="true" />
          </Link>
        </div>
      </section>

      <section id="packages" className={styles.section}>
        <div className={styles.shell}>
          <div className={styles.heading}>
            <p className={styles.eyebrow}>OPTIONAL MANAGED ACQUISITION</p>
            <h2>One campaign. Up to 90 days. A clear scope.</h2>
            <p>
              {managedBillingExplanation()}{" "}
              <Link href="/pricing" className={styles.textLink}>
                See the 90-day campaign.
              </Link>
            </p>
          </div>
          <div className={styles.packages} style={{ gridTemplateColumns: "minmax(0, 1fr)" }}>
            {MANAGED_PLANS.map((offer) => (
              <article
                key={offer.name}
                className={
                  styles.package +
                  (offer.id === "recommended"
                    ? " " + styles.featuredPackage
                    : "")
                }
              >
                <span className={styles.packageKind}>
                  {offer.badge ?? "90-day campaign"}
                </span>
                <h3>{offer.name}</h3>
                <p className={styles.price}>
                  {managedPlanPrice(offer).amount}{" "}
                  {managedPlanPrice(offer).unit}
                </p>
                <p>{offer.description}</p>
                <Link
                  className={
                    offer.id === "recommended"
                      ? styles.button
                      : styles.outlineButton
                  }
                  href={`/agency/start?plan=${offer.id}`}
                >
                  {offer.cta}
                  <ArrowRight size={18} aria-hidden="true" />
                </Link>
              </article>
            ))}
          </div>
          <div className={styles.custom}>
            <div>
              <h3>Complete the target. Review the next scope.</h3>
              <p>{managedCompletionExplanation()}</p>
              <p>{managedRenewalExplanation()}</p>
            </div>
            <Link className={styles.textLink} href="/pricing">
              See campaign terms <ArrowRight size={18} aria-hidden="true" />
            </Link>
          </div>
          <div className={styles.custom}>
            <div>
              <h3>Need us to run acquisition?</h3>
              <p>
                Managed ads, follow-up, video, and content have their own
                written scope. Check your service area before discussing a
                competing campaign.
              </p>
            </div>
            <Link className={styles.textLink} href="/service-areas">
              Check my service area <ArrowRight size={18} aria-hidden="true" />
            </Link>
          </div>
        </div>
      </section>

      <section
        className={styles.tintedSection}
        aria-labelledby="consultation-title"
      >
        <div className={styles.shell + " " + styles.programGrid}>
          <div>
            <p className={styles.eyebrow}>
              FREE {CONSULTATION.minutes}-MINUTE CONSULTATION
            </p>
            <h2 id="consultation-title">{CONSULTATION.headline}</h2>
            <p>{CONSULTATION.body}</p>
            <CtaLink
              href={CONSULTATION.href}
              event="consultation_cta"
              placement="services_final"
              className={styles.button}
            >
              Book the free consultation{" "}
              <ArrowRight size={19} aria-hidden="true" />
            </CtaLink>
            <p className={styles.small}>
              Longview and East Texas businesses can meet at their shop or at
              the Longview office. Anywhere else, it is a phone or video call.
              Product projects define their build, usage costs, and support in a
              separate quote. {managedAdvertisingExplanation()} Domain, hosting,
              and other provider subscriptions are identified in the written scope.
            </p>
          </div>
          <aside className={styles.helpCard}>
            <h3>Rather talk it through now?</h3>
            <p>
              Ryan answers his own phone. Call him, send a text, or run one of
              the free tools on your own numbers first.
            </p>
            <a href={PHONE_TEL} data-cta="call" data-cta-placement="services">
              Call {PHONE_DISPLAY}
            </a>
            <a
              href={smsHref("services")}
              data-cta="text"
              data-cta-placement="services"
            >
              {TEXT_LABEL}
            </a>
            <Link href="/tools">
              Find a free tool <ArrowRight size={18} aria-hidden="true" />
            </Link>
          </aside>
        </div>
      </section>
    </main>
  );
}
