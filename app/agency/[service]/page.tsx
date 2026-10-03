import { withPublicPageMetadata } from "@/lib/publicPageMetadata";
import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowRight, Check, ShieldCheck, X } from "lucide-react";
import SiteHero from "@/components/site/system/SiteHero";
import FinalCta from "@/components/site/system/FinalCta";
import { AGENCY_PROCESS, AGENCY_SERVICES, OWNERSHIP_PROMISE, agencyService, countWord } from "@/lib/site/agency";
import { BUSINESS } from "@/lib/site/business";
import {
  managedAdvertisingExplanation,
  managedBillingExplanation,
  managedCampaignSummary,
  managedCompletionExplanation,
  managedRenewalExplanation,
  managedUpfrontSummary,
} from "@/lib/site/managedPlans";
import { breadcrumbJsonLd, faqJsonLd, graph, jsonLdText } from "@/lib/site/structuredData";

// Service details explain the work within the agreed campaign, not a standalone
// low-priced checkout. The signed-scope payment handler remains separate.

export function generateStaticParams() {
  return AGENCY_SERVICES.map((s) => ({ service: s.slug }));
}

export async function generateMetadata({ params }: { params: Promise<{ service: string }> }): Promise<Metadata> {
  const { service } = await params;
  const s = agencyService(service);
  if (!s) return { title: "Agency | The LeadFlow Pro", robots: { index: false } };
  return withPublicPageMetadata(`/agency/${s.slug}`, {
    title: s.seoTitle,
    description: s.metaDescription,
  });
}

export default async function AgencyServicePage({ params }: { params: Promise<{ service: string }> }) {
  const { service } = await params;
  const s = agencyService(service);
  if (!s) notFound();
  const jsonLd = graph(
    {
      "@type": "Service",
      "@id": `${BUSINESS.siteUrl}/agency/${s.slug}#service`,
      name: s.name,
      serviceType: s.name,
      description: s.promise,
      areaServed: BUSINESS.areaServed.map((name) => ({ "@type": "Place", name })),
      provider: { "@type": "Organization", "@id": `${BUSINESS.siteUrl}/#organization`, name: BUSINESS.name, legalName: BUSINESS.legalName, url: BUSINESS.siteUrl },
    },
    faqJsonLd(s.faq),
    breadcrumbJsonLd([
      { name: "Home", path: "/" },
      { name: "Agency", path: "/agency" },
      { name: s.name, path: `/agency/${s.slug}` },
    ]),
  );

  return (
    <main className="cb-page">
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: jsonLdText(jsonLd) }} />
      <SiteHero
        compact
        eyebrow={`Agency · ${s.eyebrow}`}
        mutedTitle={s.navLabel}
        title="Handled for you."
        body={s.promise}
        media={{
          src: "/images/services/quote-follow-up-light.webp",
          alt: "A quote clipboard, phone, calendar, and reminder connected across a bright cream desk",
          kicker: "In your accounts",
          caption: OWNERSHIP_PROMISE.headline,
        }}
        primary={{ href: s.intakeHref, label: "Get my managed scope" }}
        secondary={{ href: "#included", label: "What is included" }}
        trustLine={s.trustLine ?? "No guaranteed leads, cost per lead, ranking, or return on ad spend."}
      />

      <section className="cb-band" aria-labelledby="problem-title">
        <div className="cb-shell">
          <div className="cb-headrow">
            <div>
              <p className="cb-eyebrow">The problem this solves</p>
              <h2 id="problem-title" className="cb-h2 cb-heading">
                {s.problem}
              </h2>
            </div>
          </div>
        </div>
      </section>

      <section id="included" className="cb-band cb-band--tint" tabIndex={-1}>
        <div className="cb-shell">
          <div className="cb-headrow">
            <div>
              <p className="cb-eyebrow">What is included</p>
              <h2 className="cb-h2 cb-heading">The work, itemised.</h2>
            </div>
          </div>
          <ul className="sv-form-points mt-8">
            {s.included.map((item) => (
              <li key={item}>
                <Check aria-hidden="true" className="h-5 w-5" />
                {item}
              </li>
            ))}
          </ul>
        </div>
      </section>

      <section className="cb-band" aria-labelledby="own-title">
        <div className="cb-shell">
          <div className="cb-headrow">
            <div>
              <p className="cb-eyebrow">Ownership and vendor costs</p>
              <h2 id="own-title" className="cb-h2 cb-heading">
                Your accounts, your allocation, your agreed scope.
              </h2>
            </div>
            <p className="cb-lead">{OWNERSHIP_PROMISE.points[2]}</p>
          </div>
          <div className="cb-vs mt-8">
            <div className="cb-vs-col cb-vs-col--us">
              <p className="cb-vs-label">You own</p>
              <ul className="cb-vs-list">
                {s.clientOwns.map((item) => (
                  <li key={item}>
                    <ShieldCheck aria-hidden="true" className="h-4 w-4" />
                    {item}
                  </li>
                ))}
              </ul>
            </div>
            <div className="cb-vs-col cb-vs-col--them">
              <p className="cb-vs-label">Outside the plan, only when disclosed</p>
              <ul className="cb-vs-list">
                {s.clientPaysDirectly.map((item) => (
                  <li key={item}>
                    <Check aria-hidden="true" className="h-4 w-4" />
                    {item}
                  </li>
                ))}
              </ul>
              <p className="cb-vs-label" style={{ marginTop: 18 }}>
                Not included
              </p>
              <ul className="cb-vs-list">
                {s.notIncluded.map((item) => (
                  <li key={item}>
                    <X aria-hidden="true" className="h-4 w-4" />
                    {item}
                  </li>
                ))}
              </ul>
            </div>
          </div>
        </div>
      </section>

      <section className="cb-band cb-band--tint" aria-labelledby="price-title">
        <div className="cb-shell">
          <div className="cb-headrow">
            <div>
              <p className="cb-eyebrow">Pricing</p>
              <h2 id="price-title" className="cb-h2 cb-heading">
                {managedUpfrontSummary()}
              </h2>
            </div>
            <p className="cb-lead">{managedCampaignSummary()} {managedBillingExplanation()}</p>
          </div>
          <p className="cb-lead mt-6">{managedAdvertisingExplanation()}</p>
          <p className="cb-lead mt-6">{managedCompletionExplanation()}</p>
          <p className="cb-lead mt-6">{managedRenewalExplanation()}</p>
          <div className="cb-actions">
            <Link href={s.intakeHref} className="cb-btn cb-btn--primary" data-cta="agency_service_intake" data-cta-placement={s.slug}>
              Get my scope <ArrowRight aria-hidden="true" className="h-4 w-4" />
            </Link>
            <Link href="/pricing" className="cb-btn cb-btn--ghost" data-cta="agency_service_plans" data-cta-placement={s.slug}>
              See the 90-day campaign
            </Link>
          </div>
          {s.related.length > 0 ? (
            <p className="cb-lead mt-6">
              Related details:{" "}
              {s.related.map((r, i) => (
                <span key={r.href}>
                  <Link href={r.href} className="cb-textlink">
                    {r.label}
                  </Link>
                  {i < s.related.length - 1 ? " · " : ""}
                </span>
              ))}
            </p>
          ) : null}
        </div>
      </section>

      <section className="cb-band" aria-labelledby="process-title">
        <div className="cb-shell">
          <div className="cb-headrow">
            <div>
              <p className="cb-eyebrow">Process</p>
              <h2 id="process-title" className="cb-h2 cb-heading">
                Map, scope, build, launch, measure.
              </h2>
            </div>
          </div>
          <ol className="cb-steps cb-steps--three mt-8">
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

      <section className="cb-band cb-band--tint" aria-labelledby="faq-title">
        <div className="cb-shell">
          <h2 id="faq-title" className="cb-h2 cb-heading">
            Straight answers.
          </h2>
          <div className="plugin-page">
            <div className="plugin-faq">
              {s.faq.map((f) => (
                <details key={f.q} className="plugin-faq-item">
                  <summary>{f.q}</summary>
                  <p>{f.a}</p>
                </details>
              ))}
            </div>
          </div>
        </div>
      </section>

      <FinalCta
        eyebrow={s.name}
        title="Get the scope in writing."
        body={`Ten questions, one business day to a reply from ${BUSINESS.operator}. Or call or text ${BUSINESS.phone.display}.`}
        primary={{ href: s.intakeHref, label: "Get my managed scope" }}
        secondary={{ href: "/agency", label: `All ${countWord(AGENCY_SERVICES.length)} services` }}
      />
      <p className="cb-shell" style={{ paddingBlock: 24 }}>
        <Link href="/agency" className="cb-textlink">
          <ArrowRight aria-hidden="true" className="h-4 w-4" style={{ transform: "rotate(180deg)" }} /> Back to the agency lane
        </Link>
      </p>
    </main>
  );
}
