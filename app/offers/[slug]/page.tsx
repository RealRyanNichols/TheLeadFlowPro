import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowRight, Check, ShieldCheck } from "lucide-react";
import OfferCheckoutForm from "@/components/OfferCheckoutForm";
import { HOLD_THE_LINE_OFFERS, holdTheLineOffer } from "@/lib/offers";

// Hold The Line offer pages. One page per rung of the ladder, all served from
// the data in lib/offers.ts so the sales page, the checkout API, and these
// pages can never disagree about a price. The fifth rung is the existing
// Website Launch and keeps its own page at /packages/launch.

const SITE = "https://www.theleadflowpro.com";

export function generateStaticParams() {
  return HOLD_THE_LINE_OFFERS.map((offer) => ({ slug: offer.slug }));
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>;
}): Promise<Metadata> {
  const { slug } = await params;
  const offer = holdTheLineOffer(slug);
  if (!offer) return {};
  const canonical = `${SITE}/offers/${offer.slug}`;
  return {
    title: `${offer.name} | ${offer.priceLabel} | The LeadFlow Pro`,
    description: offer.summary,
    alternates: { canonical },
    openGraph: {
      title: `${offer.name} | Hold The Line`,
      description: offer.summary,
      url: canonical,
      siteName: "The LeadFlow Pro",
      type: "website",
      images: [
        {
          url: "/og/hold-the-line.jpg",
          width: 1200,
          height: 630,
          alt: "Hold The Line: answer back without losing your account",
        },
      ],
    },
    twitter: {
      card: "summary_large_image",
      title: `${offer.name} | Hold The Line`,
      description: offer.summary,
      images: ["/og/hold-the-line.jpg"],
    },
  };
}

export default async function OfferPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const offer = holdTheLineOffer(slug);
  if (!offer) notFound();

  const canonical = `${SITE}/offers/${offer.slug}`;
  const otherOffers = HOLD_THE_LINE_OFFERS.filter((o) => o.slug !== offer.slug);

  const JSON_LD = {
    "@context": "https://schema.org",
    "@type": "Product",
    "@id": `${canonical}#product`,
    name: offer.name,
    description: offer.summary,
    brand: { "@type": "Brand", name: "Hold The Line" },
    offers: {
      "@type": "Offer",
      price: (offer.amountCents / 100).toFixed(0),
      priceCurrency: "USD",
      url: canonical,
      availability: "https://schema.org/InStock",
      ...(offer.mode === "subscription"
        ? {
            priceSpecification: {
              "@type": "UnitPriceSpecification",
              price: (offer.amountCents / 100).toFixed(0),
              priceCurrency: "USD",
              billingIncrement: 1,
              unitText: "month",
            },
          }
        : {}),
    },
  };

  return (
    <main className="cb-page">
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(JSON_LD) }}
      />

      <section className="cb-hero" aria-labelledby="offer-title">
        <div className="cb-shell cb-hero-layout">
          <div className="cb-hero-copy">
            <p className="cb-eyebrow">Hold The Line</p>
            <h1 id="offer-title" className="cb-h1">
              {offer.name}
              <em>{offer.tagline}</em>
            </h1>
            <p className="cb-hero-lead">{offer.summary}</p>
            <p className="cb-rung-price">{offer.priceLabel}</p>
            <div className="mt-6 max-w-xl">
              <OfferCheckoutForm
                slug={offer.slug}
                priceLabel={offer.priceLabel}
                amountUsd={Math.round(offer.amountCents / 100)}
              />
            </div>
          </div>
        </div>
      </section>

      <section className="cb-band cb-band--tint" aria-labelledby="offer-included-title">
        <div className="cb-shell">
          <div className="cb-headrow">
            <div>
              <p className="cb-eyebrow">What you get</p>
              <h2 id="offer-included-title" className="cb-h2 cb-heading">
                Everything in {offer.name}.
              </h2>
            </div>
            <p className="cb-lead">{offer.afterCheckout}</p>
          </div>
          <div className="cb-ladder">
            <article className="cb-rung cb-rung--lead">
              <span className="cb-rung-kind">{offer.priceLabel}</span>
              <h3>{offer.name}</h3>
              <p>{offer.tagline}</p>
              <ul>
                {offer.included.map((item) => (
                  <li key={item}>
                    <Check aria-hidden="true" className="h-4 w-4" />
                    <span>{item}</span>
                  </li>
                ))}
              </ul>
            </article>
          </div>
        </div>
      </section>

      <section className="cb-band" aria-labelledby="offer-line-title">
        <div className="cb-shell">
          <div className="cb-headrow">
            <div>
              <p className="cb-eyebrow">
                <ShieldCheck aria-hidden="true" className="h-4 w-4" />
                The line we hold
              </p>
              <h2 id="offer-line-title" className="cb-h2 cb-heading">
                What this is not.
              </h2>
            </div>
            <p className="cb-lead">
              We teach defense and disciplined offense. We never research, profile, or
              publish personal details about a private individual, and we never promise an
              account comes back. We teach the method and we are honest about the odds. If
              you want help going after a person, this is not it and we will not do it.
            </p>
          </div>
        </div>
      </section>

      <section className="cb-band cb-band--tint" aria-labelledby="offer-ladder-title">
        <div className="cb-shell">
          <div className="cb-headrow">
            <div>
              <p className="cb-eyebrow">The rest of the ladder</p>
              <h2 id="offer-ladder-title" className="cb-h2 cb-heading">
                Where this fits.
              </h2>
            </div>
            <p className="cb-lead">
              Every rung ends at the same question: where does your voice live if this
              happens again? The permanent answer is the Website Launch, a site, a list,
              and a number you own.
            </p>
          </div>
          <div className="cb-ladder">
            {otherOffers.map((o) => (
              <article key={o.slug} className="cb-rung">
                <span className="cb-rung-kind">{o.priceLabel}</span>
                <h3>{o.name}</h3>
                <p>{o.summary}</p>
                <Link className="cb-btn cb-btn--ghost" href={`/offers/${o.slug}`}>
                  See {o.name}
                  <ArrowRight aria-hidden="true" className="h-4 w-4" />
                </Link>
              </article>
            ))}
            <article className="cb-rung">
              <span className="cb-rung-kind">$1,000, $500 down</span>
              <h3>Own Your Voice Build</h3>
              <p>
                The existing Website Launch, sold to this audience. Domain, site, email
                list, phone list. All in accounts with their name on them.
              </p>
              <Link className="cb-btn cb-btn--ghost" href="/packages/launch">
                See the Website Launch
                <ArrowRight aria-hidden="true" className="h-4 w-4" />
              </Link>
            </article>
          </div>
          <div className="cb-actions mt-8">
            <Link className="cb-btn cb-btn--ghost" href="/hold-the-line">
              Back to Hold The Line
              <ArrowRight aria-hidden="true" className="h-4 w-4" />
            </Link>
          </div>
        </div>
      </section>
    </main>
  );
}
