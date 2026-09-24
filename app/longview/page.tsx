import { withPublicPageMetadata } from "@/lib/publicPageMetadata";
import type { Metadata } from "next";
import Link from "next/link";
import { ArrowRight, Check, MapPin, ShieldCheck } from "lucide-react";
import SiteHero from "@/components/site/system/SiteHero";
import ConsultationForm from "@/components/site/ConsultationForm";
import { AGENCY_SERVICES, OWNERSHIP_PROMISE } from "@/lib/site/agency";
import { BUSINESS } from "@/lib/site/business";
import { CONSULTATION } from "@/lib/site/consultation";
import { PRICES, usd } from "@/lib/site/prices";
import { TOOL_COUNT } from "@/lib/tools";
import { CALL_LABEL, TEXT_LABEL, smsHref } from "@/lib/site/textLinks";
import { breadcrumbJsonLd, graph, jsonLdText, localBusinessJsonLd, organizationJsonLd, webPageJsonLd, websiteJsonLd } from "@/lib/site/structuredData";

// The one local landing page. Not a city-page farm: Longview is where the
// office is and East Texas is where Ryan drives to, so one page carries both.
// Every fact on it comes from the config layer (business, consultation,
// agency services, prices). No counts, no rankings, no testimonials.

const PATH = "/longview";
const TITLE = "Marketing Agency in Longview, TX | The LeadFlow Pro";
const DESCRIPTION =
  "Ads, websites, and follow-up for Longview and East Texas businesses, built and run in accounts you own. Free 30-minute consultation at your business, the Longview office, or by phone.";

export const metadata: Metadata = withPublicPageMetadata(PATH, {
  title: TITLE,
  description: DESCRIPTION,
});

// The organization and website nodes ride along so every @id reference in
// this graph resolves inside this one document.
const JSONLD = graph(
  organizationJsonLd(),
  websiteJsonLd(),
  webPageJsonLd(PATH, TITLE, DESCRIPTION),
  breadcrumbJsonLd([
    { name: "Home", path: "/" },
    { name: `${BUSINESS.city}, TX`, path: PATH },
  ]),
  localBusinessJsonLd({
    id: `${BUSINESS.siteUrl}${PATH}#localbusiness`,
    catalogName: "Ads, websites, and follow-up for Longview and East Texas businesses",
  }),
);

const WHERE = [
  {
    title: "At your business",
    body: `${BUSINESS.city} and ${BUSINESS.region}. Ryan comes to you and sees the business the way your customers do.`,
  },
  {
    title: `At the ${BUSINESS.city} office`,
    body: "Sit down at the table with everything you want looked at. The address comes with the confirmation.",
  },
  {
    title: "By phone or video",
    body: "Anywhere. Same thirty minutes, same next three moves.",
  },
] as const;

export default function LongviewPage() {
  return (
    <main className="cb-page">
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: jsonLdText(JSONLD) }} />
      <SiteHero
        compact
        eyebrow={`${BUSINESS.city}, Texas and ${BUSINESS.region}`}
        mutedTitle="A marketing agency you can drive to."
        title={`Ads, websites, and follow-up for ${BUSINESS.city} and ${BUSINESS.region} businesses, built in accounts you own.`}
        body={`${BUSINESS.operator} runs ${BUSINESS.name} from ${BUSINESS.city}. The work is the lead system: the ad, the page, the form, the first reply, and the follow-up that keeps going when you are on a job. It is built in your accounts, so it is still yours if we ever part ways.`}
        media={{
          src: "/images/homepage-v2/company-operating-loop.webp",
          alt: "The operating loop: capture, record, follow-up, sale, delivery, reporting",
          kicker: "In your accounts",
          caption: OWNERSHIP_PROMISE.headline,
        }}
        primary={{ href: `#${CONSULTATION.anchor}`, label: `Book the free ${CONSULTATION.minutes}-minute consultation` }}
        secondary={{ href: BUSINESS.phone.tel, label: CALL_LABEL, external: true }}
        trustLine="No guaranteed leads, rankings, or return on ad spend. Anyone promising those is guessing with your money."
      />

      <section className="cb-band" id="services">
        <div className="cb-shell">
          <div className="cb-headrow">
            <div>
              <p className="cb-eyebrow">What we build and run</p>
              <h2 className="cb-h2 cb-heading">Six pieces of one system. Take the one that is leaking.</h2>
            </div>
            <p className="cb-lead">
              Each service is scoped on its own and priced in writing before it starts. You pay the platforms directly and keep the accounts, the leads, and the reporting.
            </p>
          </div>
          <div className="cb-servicegrid">
            {AGENCY_SERVICES.map((service) => (
              <article key={service.slug} className="cb-servicecard" data-service={service.slug}>
                <p className="cb-eyebrow">{service.eyebrow}</p>
                <h3>{service.name}</h3>
                <p>{service.promise}</p>
                <Link href={`/agency/${service.slug}`} className="cb-textlink" data-cta="agency_service_open" data-cta-placement={`longview_${service.slug}`}>
                  See what is included <ArrowRight aria-hidden="true" />
                </Link>
              </article>
            ))}
          </div>
          <p className="cb-lead mt-6">
            Need the website first? The five-page Website Launch is {usd(PRICES.websiteLaunchTotal)}.{" "}
            <Link href="/packages/launch">See the Website Launch</Link> or <Link href="/services">everything we build</Link>.
          </p>
        </div>
      </section>

      <section className="cb-band cb-band--tint" id="where">
        <div className="cb-shell">
          <div className="cb-headrow">
            <div>
              <p className="cb-eyebrow">Where the thirty minutes happen</p>
              <h2 className="cb-h2 cb-heading">Your shop, the {BUSINESS.city} office, or a call.</h2>
            </div>
            <p className="cb-lead">
              You bring the business. You leave with the first thing to fix and your next three moves, whether you hire us or not.
            </p>
          </div>
          <div className="cb-servicegrid">
            {WHERE.map((w) => (
              <article key={w.title} className="cb-servicecard">
                <p className="cb-eyebrow">
                  <MapPin aria-hidden="true" className="inline h-4 w-4" /> {BUSINESS.region}
                </p>
                <h3>{w.title}</h3>
                <p>{w.body}</p>
              </article>
            ))}
          </div>
          <ul className="sv-form-points mt-8">
            {CONSULTATION.bring.map((item) => (
              <li key={item}>
                <Check aria-hidden="true" className="h-5 w-5" />
                {item}
              </li>
            ))}
          </ul>
        </div>
      </section>

      <section className="cb-band" id={CONSULTATION.anchor}>
        <div className="cb-shell">
          <div className="cb-headrow">
            <div>
              <p className="cb-eyebrow">{CONSULTATION.eyebrow}</p>
              <h2 className="cb-h2 cb-heading" id="longview-consultation-title">
                {CONSULTATION.headline}
              </h2>
            </div>
            <p className="cb-lead">{CONSULTATION.body}</p>
          </div>
          <ConsultationForm placement="longview_page" labelledBy="longview-consultation-title" />
          <p className="cb-lead mt-6">
            <ShieldCheck aria-hidden="true" className="inline h-4 w-4" /> {OWNERSHIP_PROMISE.headline} Prefer to talk first?{" "}
            <a href={BUSINESS.phone.tel} data-cta="call" data-cta-placement="longview">
              Call {BUSINESS.phone.display}
            </a>
            ,{" "}
            <a href={smsHref("longview")} data-cta="text" data-cta-placement="longview">
              {TEXT_LABEL.toLowerCase()}
            </a>
            , or email <a href={`mailto:${BUSINESS.email.hello}`}>{BUSINESS.email.hello}</a>.
          </p>
        </div>
      </section>

      <section className="cb-band cb-band--tint" id="tools">
        <div className="cb-shell">
          <div className="cb-headrow">
            <div>
              <p className="cb-eyebrow">Before you call</p>
              <h2 className="cb-h2 cb-heading">Run the numbers on your own business first.</h2>
            </div>
            <p className="cb-lead">
              {TOOL_COUNT} free calculators and writers, no login. Two worth running before we talk:
            </p>
          </div>
          <div className="cb-actions">
            <Link href="/tools/missed-call-calculator" className="cb-btn cb-btn--ghost">
              What missed calls cost you
            </Link>
            <Link href="/tools/google-business-profile-scorecard" className="cb-btn cb-btn--ghost">
              Score your Google Business Profile
            </Link>
            <Link href="/tools" className="cb-textlink">
              All the free tools <ArrowRight aria-hidden="true" />
            </Link>
          </div>
        </div>
      </section>
    </main>
  );
}
