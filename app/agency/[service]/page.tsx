import { withPublicPageMetadata } from "@/lib/publicPageMetadata";
import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowRight, Check, CreditCard, KeyRound, ShieldCheck, X } from "lucide-react";
import SiteHero from "@/components/site/system/SiteHero";
import FinalCta from "@/components/site/system/FinalCta";
import { agencyPayHref } from "@/lib/agencyPayment";
import { AGENCY_PROCESS, AGENCY_SERVICES, OWNERSHIP_PROMISE, agencyOffer, agencyService } from "@/lib/site/agency";
import { BUSINESS } from "@/lib/site/business";
import { TBD_PRICE_LABEL, TBD_PRICE_TERMS } from "@/lib/site/offers";
import { breadcrumbJsonLd, faqJsonLd, graph, jsonLdText } from "@/lib/site/structuredData";

// One agency service page. Everything comes from lib/site/agency.ts; the
// price block reads lib/site/offers.ts and prints the neutral TBD line when
// Ryan has not set a number.

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
  const offer = agencyOffer(s);
  const priced = offer.status === "live";
  // Websites is paid through the Website Launch deposit or the free program;
  // the other five take the written-scope payment on /agency/pay.
  const payable = s.slug !== "websites";
  // Ads and automation are built inside the client's own accounts, so the
  // access step is the first thing after payment.
  const connects = ["meta-ads", "google-ads", "automation"].includes(s.slug);
  const jsonLd = graph(
    {
      "@type": "Service",
      "@id": `${BUSINESS.siteUrl}/agency/${s.slug}#service`,
      name: s.name,
      serviceType: s.name,
      description: s.promise,
      areaServed: BUSINESS.areaServed.map((name) => ({ "@type": "Place", name })),
      provider: { "@type": "Organization", "@id": `${BUSINESS.siteUrl}/#organization`, name: BUSINESS.name, legalName: BUSINESS.legalName, url: BUSINESS.siteUrl },
      ...(priced && typeof offer.priceUsd === "number" && offer.priceUsd > 0
        ? { offers: { "@type": "Offer", price: String(offer.priceUsd), priceCurrency: "USD", url: `${BUSINESS.siteUrl}${offer.href}`, description: offer.terms } }
        : {}),
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
        mutedTitle={s.name}
        title={s.promise}
        body={`For ${s.audience.charAt(0).toLowerCase()}${s.audience.slice(1)}`}
        media={{
          src: "/images/homepage-v2/company-operating-loop.webp",
          alt: "The operating loop: capture, record, follow-up, sale, delivery, reporting",
          kicker: "In your accounts",
          caption: OWNERSHIP_PROMISE.headline,
        }}
        primary={{ href: s.intakeHref, label: s.slug === "websites" ? "Apply for the free website" : "Start the intake" }}
        secondary={{ href: "#included", label: "What is included" }}
        trustLine="No guaranteed leads, cost per lead, ranking, or return on ad spend."
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
                What you own, and what you pay directly.
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
              <p className="cb-vs-label">You pay vendors directly</p>
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
                {priced ? offer.priceLabel : TBD_PRICE_LABEL}
              </h2>
            </div>
            <p className="cb-lead">{priced ? offer.terms : TBD_PRICE_TERMS}</p>
          </div>
          <div className="cb-actions">
            {payable ? (
              <Link href={agencyPayHref(s.slug)} className="cb-btn cb-btn--primary" data-cta="agency_service_pay" data-cta-placement={s.slug}>
                {priced ? `Pay ${offer.priceLabel}` : "Pay a written scope"}
                <CreditCard aria-hidden="true" className="h-4 w-4" />
              </Link>
            ) : (
              <Link href="/packages/launch" className="cb-btn cb-btn--primary" data-cta="agency_service_pay" data-cta-placement={s.slug}>
                Buy the Website Launch
                <CreditCard aria-hidden="true" className="h-4 w-4" />
              </Link>
            )}
            <Link href={s.intakeHref} className="cb-btn cb-btn--ghost" data-cta="agency_service_intake" data-cta-placement={s.slug}>
              {s.slug === "websites" ? "Apply for the free website" : "No scope yet? Start the intake"}
            </Link>
            {connects ? (
              <Link href="/connect" className="cb-btn cb-btn--ghost" data-cta="agency_service_connect" data-cta-placement={s.slug}>
                Connect your accounts
                <KeyRound aria-hidden="true" className="h-4 w-4" />
              </Link>
            ) : null}
          </div>
          {payable ? (
            <p className="cb-lead mt-6" style={{ fontSize: 16 }}>
              The pay page takes the number from your written scope, one-time or monthly, by card
              through Stripe. Nothing on it can change what was agreed, and ad spend is paid by you to
              the platform directly.
            </p>
          ) : null}
          {s.related.length > 0 ? (
            <p className="cb-lead mt-6">
              Already priced on this site:{" "}
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
        primary={{ href: s.intakeHref, label: s.slug === "websites" ? "Apply for the free website" : "Start the intake" }}
        secondary={{ href: "/agency", label: "All six services" }}
      />
      <p className="cb-shell" style={{ paddingBlock: 24 }}>
        <Link href="/agency" className="cb-textlink">
          <ArrowRight aria-hidden="true" className="h-4 w-4" style={{ transform: "rotate(180deg)" }} /> Back to the agency lane
        </Link>
      </p>
    </main>
  );
}
