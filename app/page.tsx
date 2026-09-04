import Image from "next/image";
import Link from "next/link";
import {
  ArrowRight,
  ArrowUpRight,
  CalendarDays,
  BookOpen,
  Wrench,
  ShieldCheck,
} from "lucide-react";
import NextStepGuide from "@/components/site/NextStepGuide";
import HomeScoreboard from "@/components/site/HomeScoreboard";
import BusinessTaskPreview from "@/components/site/BusinessTaskPreview";
import { LADDER } from "@/lib/siteContent";
import { TOOL_COUNT } from "@/lib/tools";

export const revalidate = 900;

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
      logo: {
        "@type": "ImageObject",
        url: `${SITE}/icon-512.png`,
        width: 512,
        height: 512,
      },
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
      founder: {
        "@type": "Person",
        name: "Ryan Nichols",
        url: `${SITE}/about`,
      },
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

export default function HomePage() {
  return (
    <main className="lf-home">
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(HOME_JSONLD) }}
      />
      <a
        className="lf-announcement"
        href="https://workshop.theleadflowpro.com/"
      >
        LIVE IN LONGVIEW · SEPTEMBER 17{" "}
        <span>One evening. One useful business workflow.</span>
        <ArrowRight size={17} aria-hidden="true" />
      </a>
      <section className="lf-hero lf-shell">
        <div className="lf-hero-copy">
          <p className="lf-eyebrow">THE LEAD FLOW PRO / EAST TEXAS & BEYOND</p>
          <h1>
            More customers.
            <br />
            Less busywork.
            <br />
            <em>It’s not too late.</em>
          </h1>
          <p className="lf-intro">
            You don’t need to understand every new tool. You need a better way
            to get customers, follow up, and get work done. We’ll build it with
            you—or show you how.
          </p>
          <div className="lf-actions">
            <Link className="lf-button" href="#qualify">
              Find my next step <ArrowRight size={19} aria-hidden="true" />
            </Link>
            <Link className="lf-text-link" href="#see-it-work">
              See how this helps <ArrowUpRight size={18} aria-hidden="true" />
            </Link>
          </div>
          <div className="lf-hero-trust">
            <span>
              <ShieldCheck size={16} aria-hidden="true" /> Your business. Your
              accounts.
            </span>
            <span>Beginners welcome.</span>
          </div>
        </div>
        <div className="lf-hero-feature">
          <figure className="lf-founder-photo">
            <Image
              src="/images/ryan-wholesale-universe-owner.jpg"
              alt="Ryan Nichols in the warehouse of the wholesale business he built"
              width={1800}
              height={1350}
              priority
              sizes="(max-width: 800px) 100vw, 48vw"
            />
            <figcaption>
              <span>RYAN NICHOLS / FOUNDER</span>
              <strong>Built from doing the work.</strong>
            </figcaption>
          </figure>
          <a
            className="lf-workshop-ribbon"
            href="https://workshop.theleadflowpro.com/"
          >
            <div className="lf-date">
              <span>SEP</span>
              <strong>17</strong>
            </div>
            <div>
              <span>THE NEXT WORKSHOP</span>
              <strong>Stop guessing at ChatGPT.</strong>
              <p>Longview · $97 founding seat</p>
            </div>
            <ArrowUpRight aria-hidden="true" />
          </a>
        </div>
      </section>
      <BusinessTaskPreview />
      <section className="lf-section lf-section-raised" id="qualify">
        <div className="lf-shell">
          <div className="lf-section-heading">
            <div>
              <p className="lf-eyebrow">LET’S MAKE THIS SIMPLE</p>
              <h2>
                You have a business to run.
                <br />
                <em>Start with what you need.</em>
              </h2>
            </div>
            <p>
              More leads? More time? A skill you can use? You belong here. Two
              choices will point you in the right direction.
            </p>
          </div>
          <NextStepGuide />
        </div>
      </section>
      <section className="lf-section lf-shell" id="results">
        <div className="lf-section-heading">
          <div>
            <p className="lf-eyebrow">WE ALL WIN WHEN WE ALL WIN</p>
            <h2>
              The work should
              <br />
              <em>show up on the board.</em>
            </h2>
          </div>
          <p>
            Follow our progress and the businesses running on systems we’ve
            built. Real records. Clear definitions. Room to improve.
          </p>
        </div>
        <HomeScoreboard />
        <div className="lf-actions">
          <Link className="lf-text-link" href="/scoreboard">
            Explore every business’s scoreboard{" "}
            <ArrowRight size={18} aria-hidden="true" />
          </Link>
          <Link className="lf-text-link" href="/results">
            See the work behind the numbers{" "}
            <ArrowRight size={18} aria-hidden="true" />
          </Link>
        </div>
      </section>
      <section className="lf-section lf-section-raised" id="what-we-build">
        <div className="lf-shell">
          <div className="lf-section-heading">
            <div>
              <p className="lf-eyebrow">THREE WAYS TO MOVE FORWARD</p>
              <h2>
                Learn it. Build it.
                <br />
                <em>Put it to work.</em>
              </h2>
            </div>
            <p>
              Start where you are. Your age, experience, or last attempt does
              not decide what you can do next.
            </p>
          </div>
          <div className="lf-path-grid">
            <article>
              <span className="lf-path-number">01 / BUILD</span>
              <Wrench aria-hidden="true" />
              <h3>A website that gives people a next step.</h3>
              <p>
                Clear pages, an inquiry form, and the follow-up behind it. Apply
                for a five-page website with a $0 build fee.
              </p>
              <Link href="/free-build">
                Check the free website program{" "}
                <ArrowRight size={18} aria-hidden="true" />
              </Link>
              <small>
                For approved businesses. Hosting and optional services are
                explained before you commit.
              </small>
            </article>
            <article>
              <span className="lf-path-number">02 / LEARN</span>
              <BookOpen aria-hidden="true" />
              <h3>A useful skill you can learn at your pace.</h3>
              <p>
                Written lessons, worked examples, and practical exercises. Start
                free, then choose the course that solves your next problem.
              </p>
              <Link href="/operator-academy">
                Explore the courses <ArrowRight size={18} aria-hidden="true" />
              </Link>
              <small>
                Prefer to try it first?{" "}
                <Link href="/chatgpt/free">Open the free starter lesson.</Link>
              </small>
            </article>
            <article>
              <span className="lf-path-number">03 / DO</span>
              <CalendarDays aria-hidden="true" />
              <h3>One evening. Your laptop. Real help.</h3>
              <p>
                Bring a follow-up, content, or admin task to the September 17
                workshop. Build a process you can repeat the next day.
              </p>
              <Link href="https://workshop.theleadflowpro.com/">
                See the Longview workshop{" "}
                <ArrowRight size={18} aria-hidden="true" />
              </Link>
              <small>6:30–8:00 PM Central · $97 · 10 paid seats</small>
            </article>
          </div>
        </div>
      </section>
      <section className="lf-section lf-shell">
        <div className="lf-resource-grid">
          <Link href="/tools">
            <span className="lf-eyebrow">YOUR TOOLBOX</span>
            <strong>
              {TOOL_COUNT} free tools.
              <br />
              Find one that helps today.
            </strong>
            <p>
              Work out a price, spot a missed opportunity, or plan your next
              move.
            </p>
            <span className="lf-text-link">
              Open the tools <ArrowRight aria-hidden="true" />
            </span>
          </Link>
          <Link href="/articles">
            <span className="lf-eyebrow">PLAIN-ENGLISH GUIDES</span>
            <strong>
              Read it.
              <br />
              Try it in your business.
            </strong>
            <p>
              Practical answers with steps you can use. No wall of technical
              jargon.
            </p>
            <span className="lf-text-link">
              Read the articles <ArrowRight aria-hidden="true" />
            </span>
          </Link>
        </div>
      </section>
      <section className="lf-final">
        <div className="lf-shell">
          <p className="lf-eyebrow">YOUNG. OLDER. SOMEWHERE IN BETWEEN.</p>
          <h2>
            You’re not behind.
            <br />
            <em>You just need a next step.</em>
          </h2>
          <p>
            We’ll explain it in plain English and start with one thing that
            matters to you.
          </p>
          <div className="lf-actions">
            <Link className="lf-button" href="#qualify">
              Find my next step <ArrowRight aria-hidden="true" />
            </Link>
            <Link className="lf-text-link" href="/contact">
              Talk with Ryan <ArrowRight aria-hidden="true" />
            </Link>
          </div>
        </div>
      </section>
    </main>
  );
}
