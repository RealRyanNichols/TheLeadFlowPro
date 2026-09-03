import Image from "next/image";
import Link from "next/link";
import { ArrowRight, MapPin, Phone, Radio, ShieldCheck, Wrench } from "lucide-react";
import LeadQualifier from "@/components/site/LeadQualifier";
import CtaLink from "@/components/site/CtaLink";
import { LADDER, PHONE_DISPLAY, PHONE_TEL, PROOF } from "@/lib/siteContent";

// THE COMPANY BUILDER homepage, cut down to one job: qualify the visitor and
// point them at the free website. The deep material moved to its own pages:
// what gets built lives at /services, the shipped proof lives at /results.
// The old in-page anchors (#what-we-build, #results) stay on the teaser
// sections below so links to them still land somewhere that makes sense.
//
// Every number on this page traces to the repository or to a live property.
// Nothing here claims revenue, leads, conversion rates, or ROI, because none
// of that is verifiable.

/* ---------------------------------------------------------- structured data -- */

// The address and phone match the Google Business Profile exactly, the legal
// name matches the footer, and every sameAs URL was confirmed to resolve. No
// revenue, rating, review, or outcome claim appears here, because none of it
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
      hasOfferCatalog: {
        "@type": "OfferCatalog",
        name: "Website and connected business system offers",
        itemListElement: LADDER.map((offer) => ({
          "@type": "Offer",
          url: `${SITE}${offer.href}`,
          description: offer.body,
          itemOffered: {
            "@type": "Service",
            name: offer.name,
          },
        })),
      },
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
      name: "More Attention. More Leads. More Revenue. | The LeadFlow Pro",
      description:
        "Turn attention into conversations, conversations into qualified leads, and qualified leads into customers with one connected business system.",
      isPartOf: { "@id": `${SITE}/#website` },
      about: { "@id": `${SITE}/#organization` },
    },
  ],
};

/* ------------------------------------------------------------------ page -- */

export default function HomePage() {
  return (
    <main className="cb-page cb-home-dark">
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(HOME_JSONLD) }}
      />
      {/* 1 ------------------------------------------------------------ hero */}
      <section className="cb-hero">
        <div className="cb-shell">
          <div className="cb-hero-layout">
            <div className="cb-hero-copy">
              <p className="cb-eyebrow">The LeadFlow Pro · East Texas</p>
              <h1 className="cb-h1">
                <span>More attention.</span>
                <span>More leads.</span>
                <em>More revenue.</em>
              </h1>
              <p className="cb-hero-lead">
                We build the website, the lead capture, and the follow-up behind it, in
                accounts you own. Answer four questions and find out if your first
                five-page website is free.
              </p>
              <div className="cb-actions">
                <Link className="cb-btn cb-btn--primary" href="#qualify">
                  See If You Qualify
                  <ArrowRight aria-hidden="true" className="h-4 w-4" />
                </Link>
                <a className="cb-btn cb-btn--ghost" href={PHONE_TEL}>
                  <Phone aria-hidden="true" className="h-4 w-4" />
                  Call or text {PHONE_DISPLAY}
                </a>
              </div>
              <div className="lfp-hero-trust" aria-label="LeadFlow Pro operating facts">
                <span><Radio aria-hidden="true" className="h-4 w-4" /> 8 live systems you can open</span>
                <span><ShieldCheck aria-hidden="true" className="h-4 w-4" /> Built in accounts you own</span>
                <span><MapPin aria-hidden="true" className="h-4 w-4" /> Longview, Texas</span>
              </div>
            </div>

            <figure className="cb-hero-visual lfp-founder-hero">
              <Image
                src="/images/ryan-wholesale-universe-owner.jpg"
                alt="Ryan Nichols standing above pallets in his wholesale warehouse beside a large American flag"
                width={1800}
                height={1350}
                priority
                sizes="(max-width: 900px) 100vw, 58vw"
              />
              <figcaption>
                <span>Ryan Nichols · Founder &amp; Operator</span>
                <strong>Built from real operating experience.</strong>
              </figcaption>
            </figure>
          </div>
        </div>
      </section>

      {/* 2 ------------------------------------------------------- qualifier */}
      <section id="qualify" className="cb-band cb-band--tint scroll-mt-20" tabIndex={-1}>
        <div className="cb-shell">
          <div className="text-center">
            <p className="cb-eyebrow justify-center">Sixty seconds</p>
            <h2 className="cb-h2 mx-auto max-w-[18ch]">Answer four questions.</h2>
            <p className="cb-lead mx-auto">
              If even one answer is no, you qualify for the Free Website Program. Zero
              dollars down for approved businesses.
            </p>
          </div>
          <LeadQualifier />
        </div>
      </section>

      {/* 3 -------------------------------------------------- services teaser */}
      <section id="what-we-build" className="cb-band" tabIndex={-1}>
        <div className="cb-shell">
          <div className="cb-headrow">
            <div>
              <p className="cb-eyebrow">What we build</p>
              <h2 className="cb-h2 cb-heading">
                The website and the system behind it.
              </h2>
            </div>
            <p className="cb-lead">
              For business owners who want a website that produces customers, not one that
              just sits there.
            </p>
          </div>
          <ul className="lfp-teaser-points">
            <li>
              <Wrench aria-hidden="true" className="h-5 w-5" />
              <span>
                <strong>The website.</strong> Five pages that say what you do, what it
                costs, and what to do next.
              </span>
            </li>
            <li>
              <Radio aria-hidden="true" className="h-5 w-5" />
              <span>
                <strong>The leads.</strong> Every call, text, form, and message lands in one
                place, with follow-up that runs on time.
              </span>
            </li>
            <li>
              <ShieldCheck aria-hidden="true" className="h-5 w-5" />
              <span>
                <strong>The ownership.</strong> Code, domain, data, and customer list stay
                in your accounts, not ours.
              </span>
            </li>
          </ul>
          <div className="cb-actions">
            <Link className="cb-btn cb-btn--primary" href="/services">
              See the services
              <ArrowRight aria-hidden="true" className="h-4 w-4" />
            </Link>
          </div>
        </div>
      </section>

      {/* 4 --------------------------------------------------- results teaser */}
      <section id="results" className="cb-band cb-band--ink" tabIndex={-1}>
        <div className="cb-shell">
          <div className="cb-headrow">
            <div>
              <p className="cb-eyebrow">Built, shipped, running</p>
              <h2 className="cb-h2 cb-heading">Proof before promises.</h2>
            </div>
            <p className="cb-lead">
              Every system is live and publicly inspectable right now. Open the work and
              check it yourself.
            </p>
          </div>
          <div className="cb-proof-grid">
            {PROOF.map((p) => (
              <div key={p.label} className="cb-proof-item">
                <strong>{p.figure}</strong>
                <span>{p.label}</span>
              </div>
            ))}
          </div>
          <div className="cb-actions">
            <Link className="cb-btn cb-btn--primary" href="/results">
              See the results
              <ArrowRight aria-hidden="true" className="h-4 w-4" />
            </Link>
          </div>
        </div>
      </section>

      {/* 5 --------------------------------------------------------- final CTA */}
      <section className="cb-final">
        <div className="cb-shell">
          <p className="cb-eyebrow">Your next move</p>
          <h2 className="cb-h2">
            <em>Own your website.</em>
            Start with the free build.
          </h2>
          <p className="cb-lead">
            Apply for the $0 five-page foundation, or call and talk to the person who
            builds it. Either way, the next step takes about a minute.
          </p>
          <div className="cb-actions">
            <CtaLink
              href="/free-build"
              event="apply_free_website"
              placement="home_final"
              className="cb-btn cb-btn--primary"
            >
              Start My Free Website
              <ArrowRight aria-hidden="true" className="h-4 w-4" />
            </CtaLink>
            <a className="cb-btn cb-btn--ghost" href={PHONE_TEL}>
              <Phone aria-hidden="true" className="h-4 w-4" />
              Call or text {PHONE_DISPLAY}
            </a>
          </div>
        </div>
      </section>
    </main>
  );
}
