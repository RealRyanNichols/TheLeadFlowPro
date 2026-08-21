import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowRight, Check, ShieldCheck, X } from "lucide-react";
import OfferCheckoutForm from "@/components/OfferCheckoutForm";
import { HOLD_THE_LINE_OFFERS, holdTheLineOffer } from "@/lib/offers";

// Hold The Line offer pages. One page per rung of the ladder, all served from
// the data in lib/offers.ts so the sales page, the checkout API, and these
// pages can never disagree about a price. The fifth rung is the existing
// Website Launch and keeps its own page at /packages/launch.

const SITE = "https://www.theleadflowpro.com";

// Hero art per offer: the product mid-use, rendered by
// scripts/generate-hold-the-line-art.ts in the lane's steel-cyan language.
// The figcaption pair follows the house hero pattern: a quiet label and one
// claim the scene actually shows.
const HERO_ART: Record<string, { src: string; span: string; strong: string }> = {
  "hold-the-line-playbook": {
    src: "/images/hold-the-line/playbook.jpg",
    span: "Inside the playbook",
    strong: "Sort them, answer once, keep the account.",
  },
  "comment-rescue": {
    src: "/images/hold-the-line/comment-rescue.jpg",
    span: "A rescue, start to finish",
    strong: "The thread goes in. The exact reply comes back.",
  },
  "voice-recovery": {
    src: "/images/hold-the-line/voice-recovery.jpg",
    span: "The 60-minute session",
    strong: "Find out what happened. Write the appeal together.",
  },
  "comment-cover": {
    src: "/images/hold-the-line/comment-cover.jpg",
    span: "Your page, covered",
    strong: "Sorted for you. Nothing posts without your sign-off.",
  },
};

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
  const art = HERO_ART[offer.slug];
  const isPlaybook = offer.slug === "hold-the-line-playbook";

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
            <p className="cb-eyebrow">
              <ShieldCheck aria-hidden="true" className="h-4 w-4" />
              Hold The Line · {offer.tagline}
            </p>
            <h1 id="offer-title" className="cb-h1">
              {offer.name}
            </h1>
            <p className="cb-hero-lead">{offer.summary}</p>
            <p className="mt-5 flex flex-wrap items-baseline gap-3">
              <strong className="text-4xl font-extrabold text-white">
                {offer.priceLabel}
              </strong>
              <span className="text-sm font-bold uppercase tracking-[0.14em] text-[#7dd3fc]">
                {offer.mode === "subscription"
                  ? "Monthly · cancel any time"
                  : offer.slug === "hold-the-line-playbook"
                    ? "One time · instant delivery"
                    : "One time"}
              </span>
            </p>
            <div className="mt-6 max-w-xl">
              <OfferCheckoutForm
                slug={offer.slug}
                priceLabel={offer.priceLabel}
                amountUsd={Math.round(offer.amountCents / 100)}
              />
            </div>
            <p className="cb-hero-own">
              <ShieldCheck aria-hidden="true" />
              No outcome guarantees, and we never help anybody go after a person.
            </p>
          </div>

          <figure className="cb-hero-visual">
            <Image
              src={art.src}
              alt={`${offer.name}: ${art.strong}`}
              width={1672}
              height={941}
              priority
              sizes="(max-width: 900px) 100vw, 56vw"
            />
            <figcaption>
              <span>{art.span}</span>
              <strong>{art.strong}</strong>
            </figcaption>
          </figure>
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
          <ul className="mt-8 grid gap-4 sm:grid-cols-2">
            {offer.included.map((item) => (
              <li
                key={item}
                className="flex items-start gap-3 rounded-2xl border border-[var(--line-strong)] bg-[var(--fill-2)] p-5 text-[15px] leading-relaxed text-[var(--text)]"
              >
                <Check aria-hidden="true" className="mt-1 h-4 w-4 shrink-0" />
                <span>{item}</span>
              </li>
            ))}
          </ul>
        </div>
      </section>

      {isPlaybook ? (
        // Show, don't describe: one full reply from the response library and a
        // slice of the never-type list, straight out of the product. The $47
        // question answers itself when a page of the book is on the table.
        <section className="cb-band" aria-labelledby="offer-inside-title">
          <div className="cb-shell">
            <div className="cb-headrow">
              <div>
                <p className="cb-eyebrow">Look inside</p>
                <h2 id="offer-inside-title" className="cb-h2 cb-heading">
                  A page from the book, free.
                </h2>
              </div>
              <p className="cb-lead">
                This is one of the replies in the library, word for word. There is one
                for every situation that keeps business owners up at night, plus the
                sorting table that tells you which one to reach for.
              </p>
            </div>
            <div className="mt-8 grid gap-6 lg:grid-cols-2">
              <div className="rounded-2xl border border-[var(--line-strong)] bg-[var(--fill-2)] p-6">
                <p className="text-[12px] font-extrabold uppercase tracking-[0.16em] text-[#0284c7]">
                  From the response library
                </p>
                <h3 className="mt-2 text-[17px] font-extrabold text-[var(--text)]">
                  The &quot;I could do this myself for free&quot; objection
                </h3>
                <blockquote className="mt-4 border-l-2 border-[var(--line-strong)] pl-4 text-[15px] leading-relaxed text-[var(--quiet)]">
                  <p>You&apos;re right. The tools are free. Every one of them.</p>
                  <p className="mt-2">So is a table saw.</p>
                  <p className="mt-2">
                    The tools were never the product. What people pay for is the months
                    somebody already spent finding out which ones break, which ones
                    actually talk to each other, and what to do at 11pm when it stops
                    working.
                  </p>
                  <p className="mt-2">
                    If you can build it yourself, you should. Seriously. You&apos;ll save
                    money and learn more than any course teaches.
                  </p>
                  <p className="mt-2">
                    The guy running a shop 60 hours a week can&apos;t, and doesn&apos;t
                    want to. That&apos;s who this is for.
                  </p>
                  <p className="mt-2">Appreciate the heads up.</p>
                </blockquote>
                <p className="mt-4 text-[13px] font-semibold text-[var(--quiet)]">
                  Notice the shape: concede, reframe, respect, close to the reader. That
                  shape is the product. The book teaches it once and you keep it forever.
                </p>
              </div>
              <div className="rounded-2xl border border-[var(--line-strong)] bg-[var(--fill-2)] p-6">
                <p className="text-[12px] font-extrabold uppercase tracking-[0.16em] text-[#0284c7]">
                  From the never-type list
                </p>
                <h3 className="mt-2 text-[17px] font-extrabold text-[var(--text)]">
                  Three of the lines that end accounts
                </h3>
                <ul className="mt-4 grid gap-3">
                  {[
                    "Anything about their family, their kids, or their spouse",
                    'Anything that can be read as physical: "say it to my face," "come see me"',
                    "Anything typed inside twenty minutes of the feeling",
                  ].map((item) => (
                    <li
                      key={item}
                      className="flex items-start gap-3 text-[15px] leading-relaxed text-[var(--text)]"
                    >
                      <X aria-hidden="true" className="mt-1 h-4 w-4 shrink-0" />
                      <span>{item}</span>
                    </li>
                  ))}
                </ul>
                <p className="mt-4 text-[14px] leading-relaxed text-[var(--quiet)]">
                  The full list has eight, and the 60-second pre-send check runs you
                  through it before anything goes out. This list alone is worth the
                  price. It is the difference between a business page and a memory.
                </p>
                <Link
                  className="cb-btn cb-btn--primary mt-5"
                  href="/offers/hold-the-line-playbook#offer-title"
                  data-analytics="cta-offer-playbook-inside"
                >
                  Get the other nine parts | $47
                  <ArrowRight aria-hidden="true" className="h-4 w-4" />
                </Link>
              </div>
            </div>
          </div>
        </section>
      ) : null}

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
