import { withPublicPageMetadata } from "@/lib/publicPageMetadata";
import type { Metadata } from "next";
import Link from "next/link";
import { ArrowRight, Check, ShieldCheck } from "lucide-react";
import SiteHero from "@/components/site/system/SiteHero";
import FinalCta from "@/components/site/system/FinalCta";
import CaseStudies from "@/components/site/CaseStudy";
import { AGENCY_HUB, AGENCY_PROCESS, AGENCY_SERVICES, OWNERSHIP_PROMISE, agencyOffer } from "@/lib/site/agency";
import { BUSINESS } from "@/lib/site/business";
import { TBD_PRICE_LABEL } from "@/lib/site/offers";
import { breadcrumbJsonLd, graph, jsonLdText, localBusinessJsonLd } from "@/lib/site/structuredData";

// The agency hub: the "run it for me" lane. Every child page reads from
// lib/site/agency.ts; pricing reads from lib/site/offers.ts and prints the
// TBD line until Ryan sets a number.

export const metadata: Metadata = withPublicPageMetadata("/agency", {
  title: "Agency: Meta ads, Google Ads, websites, automation, video, content | The LeadFlow Pro",
  description:
    "Full-service ads, websites, automation, video, and content for East Texas businesses, run in accounts you own. You pay the platforms directly and keep the pixel, audiences, leads, and reporting.",
});

export default function AgencyHubPage() {
  const jsonLd = graph(
    localBusinessJsonLd({
      id: `${BUSINESS.siteUrl}/agency#localbusiness`,
      name: `${BUSINESS.name} Agency`,
      catalogName: "Agency services",
      offerIds: AGENCY_SERVICES.map((s) => s.offerId),
      knowsAbout: ["Meta ads management", "Google Ads management", "Business websites", "Marketing automation", "Video production", "Content marketing"],
    }),
    breadcrumbJsonLd([
      { name: "Home", path: "/" },
      { name: "Agency", path: "/agency" },
    ]),
  );
  return (
    <main className="cb-page">
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: jsonLdText(jsonLd) }} />
      <SiteHero
        compact
        eyebrow={AGENCY_HUB.eyebrow}
        mutedTitle={AGENCY_HUB.title}
        title="Ads, websites, automation, video, and content. Run for you, owned by you."
        body={AGENCY_HUB.lead}
        media={{
          src: "/images/homepage-v2/company-operating-loop.webp",
          alt: "The operating loop: capture, record, follow-up, sale, delivery, reporting",
          kicker: "The loop",
          caption: "Capture, record, follow up, sell, deliver, report. In your accounts.",
        }}
        primary={{ href: "/agency/start", label: "Start the agency intake" }}
        secondary={{ href: "#services", label: "See the six services" }}
        trustLine={OWNERSHIP_PROMISE.headline}
      />

      <section id="services" className="cb-band" tabIndex={-1}>
        <div className="cb-shell">
          <div className="cb-headrow">
            <div>
              <p className="cb-eyebrow">Six services, one loop</p>
              <h2 className="cb-h2 cb-heading">Pick the piece that is leaking.</h2>
            </div>
            <p className="cb-lead">
              Each one is scoped on its own, priced in writing before it starts, and built so it keeps
              working if we ever part ways.
            </p>
          </div>
          <div className="cb-toolgrid mt-10">
            {AGENCY_SERVICES.map((service) => {
              const offer = agencyOffer(service);
              return (
                <Link key={service.slug} href={`/agency/${service.slug}`} className="cb-toolcard">
                  <span className="cb-eyebrow">{service.eyebrow}</span>
                  <strong>{service.name}</strong>
                  <p>{service.promise}</p>
                  <small>
                    {offer.status === "live" ? offer.priceLabel : TBD_PRICE_LABEL}
                  </small>
                  <span className="cb-textlink">
                    See what is included <ArrowRight aria-hidden="true" className="h-4 w-4" />
                  </span>
                </Link>
              );
            })}
          </div>
        </div>
      </section>

      <section className="cb-band cb-band--tint" aria-labelledby="ownership-title">
        <div className="cb-shell">
          <div className="cb-headrow">
            <div>
              <p className="cb-eyebrow">The ownership promise</p>
              <h2 id="ownership-title" className="cb-h2 cb-heading">
                {OWNERSHIP_PROMISE.headline}
              </h2>
            </div>
            <p className="cb-lead">
              The same promise the free-website program makes, applied to ads, automation, and media.
            </p>
          </div>
          <ul className="sv-form-points mt-8">
            {OWNERSHIP_PROMISE.points.map((point) => (
              <li key={point}>
                <ShieldCheck aria-hidden="true" className="h-5 w-5" />
                {point}
              </li>
            ))}
          </ul>
        </div>
      </section>

      <section className="cb-band" aria-labelledby="process-title">
        <div className="cb-shell">
          <div className="cb-headrow">
            <div>
              <p className="cb-eyebrow">How it runs</p>
              <h2 id="process-title" className="cb-h2 cb-heading">
                Map, scope, build, launch, measure.
              </h2>
            </div>
            <p className="cb-lead">{AGENCY_HUB.budgetNote}</p>
          </div>
          <ol className="cb-steps mt-8">
            {AGENCY_PROCESS.map((step) => (
              <li key={step.step} className="cb-step">
                <span className="cb-step-num">{step.step}</span>
                <div>
                  <h3 className="cb-h3">{step.name}</h3>
                  <p>{step.body}</p>
                </div>
              </li>
            ))}
          </ol>
        </div>
      </section>

      <section className="cb-band cb-band--tint" aria-labelledby="proof-title">
        <div className="cb-shell">
          <div className="cb-headrow">
            <div>
              <p className="cb-eyebrow">Proof, with definitions</p>
              <h2 id="proof-title" className="cb-h2 cb-heading">
                Businesses running on the same loop.
              </h2>
            </div>
            <p className="cb-lead">
              Every figure names the business, the window, the source, and the date it was read. Lead
              records are not unique people and not customers.
            </p>
          </div>
          <div className="mt-10">
            <CaseStudies />
          </div>
        </div>
      </section>

      <section className="cb-band" aria-labelledby="fit-title">
        <div className="cb-shell">
          <div className="cb-headrow">
            <div>
              <p className="cb-eyebrow">Before you fill in the form</p>
              <h2 id="fit-title" className="cb-h2 cb-heading">
                Three things that are always true here.
              </h2>
            </div>
          </div>
          <ul className="sv-form-points mt-8">
            {[
              "No guaranteed leads, cost per lead, ranking, or return on ad spend. Anyone promising those is guessing with your money.",
              "The free five-page website stays the front door. If that is what you need first, apply for it and skip the intake.",
              `Prices for the agency services are confirmed on the scoping call and written down before anything starts. Call or text ${BUSINESS.phone.display} if you would rather talk first.`,
            ].map((line) => (
              <li key={line}>
                <Check aria-hidden="true" className="h-5 w-5" />
                {line}
              </li>
            ))}
          </ul>
        </div>
      </section>

      <FinalCta
        eyebrow="Run it for me"
        title="Tell Ryan what is leaking. Get the scope in writing."
        body="Ten questions. Business, channels, the ad budget you are genuinely prepared to spend, the bottleneck, who decides, and when. Ryan reaches out within one business day."
        primary={{ href: "/agency/start", label: "Start the agency intake" }}
        secondary={{ href: "/free-build", label: "I just need the website first" }}
      />
    </main>
  );
}
