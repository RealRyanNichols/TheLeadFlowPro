import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowRight, ShieldCheck, X } from "lucide-react";
import HoldTheLineOfferCard from "@/components/HoldTheLineOfferCard";
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
          <ol className="mt-8 grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
            {offer.included.map((item, i) => (
              <li
                key={item.title}
                className="relative overflow-hidden rounded-3xl border border-[var(--line-strong)] bg-[var(--panel)] p-6 shadow-[0_18px_50px_#0a12200f]"
              >
                <span
                  aria-hidden="true"
                  className="absolute inset-x-0 top-0 h-1 bg-[#0ea5e9]"
                />
                <span className="inline-flex h-10 w-10 items-center justify-center rounded-xl bg-[#0ea5e91a] text-[15px] font-extrabold text-[#0284c7]">
                  {String(i + 1).padStart(2, "0")}
                </span>
                <h3 className="mt-4 text-[17px] font-extrabold leading-snug text-[var(--heading)]">
                  {item.title}
                </h3>
                <p className="mt-2 text-[14px] leading-relaxed text-[var(--quiet)]">
                  {item.detail}
                </p>
              </li>
            ))}
          </ol>
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
              <div className="relative overflow-hidden rounded-3xl border border-[var(--line-strong)] bg-[var(--panel)] p-7 shadow-[0_18px_50px_#0a12200f]">
                <span
                  aria-hidden="true"
                  className="absolute inset-x-0 top-0 h-1 bg-[#0ea5e9]"
                />
                <p className="text-[12px] font-extrabold uppercase tracking-[0.16em] text-[#0284c7]">
                  From the response library
                </p>
                <h3 className="mt-2 text-[17px] font-extrabold text-[var(--heading)]">
                  The &quot;I could do this myself for free&quot; objection
                </h3>
                <div className="mt-5 rounded-2xl border border-[#0ea5e94d] bg-[#0ea5e90d] p-5">
                  <div className="flex items-center gap-3">
                    <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-[#0ea5e9] text-[15px] font-extrabold text-[#0a1220]">
                      R
                    </span>
                    <span className="text-[14px] font-extrabold text-[var(--heading)]">
                      Ryan
                    </span>
                    <span className="rounded-full bg-[#0ea5e91a] px-2.5 py-0.5 text-[10px] font-extrabold uppercase tracking-[0.14em] text-[#0284c7]">
                      Sorted · answered once
                    </span>
                  </div>
                  <blockquote className="mt-3 text-[15px] leading-relaxed text-[var(--text)]">
                    <p>You&apos;re right. The tools are free. Every one of them.</p>
                    <p className="mt-2">So is a table saw.</p>
                    <p className="mt-2">
                      The tools were never the product. What people pay for is the months
                      somebody already spent finding out which ones break, which ones
                      actually talk to each other, and what to do at 11pm when it stops
                      working.
                    </p>
                    <p className="mt-2">
                      If you can build it yourself, you should. Seriously. You&apos;ll
                      save money and learn more than any course teaches.
                    </p>
                    <p className="mt-2">
                      The guy running a shop 60 hours a week can&apos;t, and doesn&apos;t
                      want to. That&apos;s who this is for.
                    </p>
                    <p className="mt-2">Appreciate the heads up.</p>
                  </blockquote>
                </div>
                <p className="mt-4 text-[13px] font-semibold leading-relaxed text-[var(--quiet)]">
                  Notice the shape: concede, reframe, respect, close to the reader. That
                  shape is the product. The book teaches it once and you keep it forever.
                </p>
              </div>
              <div className="relative flex flex-col overflow-hidden rounded-3xl border border-[var(--line-strong)] bg-[var(--panel)] p-7 shadow-[0_18px_50px_#0a12200f]">
                <span
                  aria-hidden="true"
                  className="absolute inset-x-0 top-0 h-1 bg-[var(--danger)]"
                />
                <p className="text-[12px] font-extrabold uppercase tracking-[0.16em] text-[var(--danger)]">
                  From the never-type list
                </p>
                <h3 className="mt-2 text-[17px] font-extrabold text-[var(--heading)]">
                  Three of the lines that end accounts
                </h3>
                <ul className="mt-5 grid gap-3">
                  {[
                    "Anything about their family, their kids, or their spouse",
                    'Anything that can be read as physical: "say it to my face," "come see me"',
                    "Anything typed inside twenty minutes of the feeling",
                  ].map((item) => (
                    <li
                      key={item}
                      className="flex items-start gap-3 rounded-2xl border border-[var(--danger-line)] bg-[var(--danger-tint)] p-4 text-[15px] leading-relaxed text-[var(--text)]"
                    >
                      <X
                        aria-hidden="true"
                        className="mt-1 h-4 w-4 shrink-0 text-[var(--danger)]"
                      />
                      <span>{item}</span>
                    </li>
                  ))}
                </ul>
                <p className="mt-4 text-[14px] leading-relaxed text-[var(--quiet)]">
                  The full list has eight, and the 60-second pre-send check runs you
                  through it before anything goes out. This list alone is worth the
                  price. It is the difference between a business page and a memory.
                </p>
                <div className="mt-auto pt-5">
                  <Link
                    className="cb-btn cb-btn--primary"
                    href="/offers/hold-the-line-playbook#offer-title"
                    data-analytics="cta-offer-playbook-inside"
                  >
                    Get the other nine parts | $47
                    <ArrowRight aria-hidden="true" className="h-4 w-4" />
                  </Link>
                </div>
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
              We teach defense and disciplined offense. These three rules are not fine
              print. They are the product working as designed, because the fastest way to
              lose a platform is to become the thing you are fighting.
            </p>
          </div>
          <div className="mt-8 grid gap-5 md:grid-cols-3">
            {[
              {
                title: "We never go after a person.",
                detail:
                  "No researching, profiling, or publishing personal details about a private individual. Not their employer, not their family, not their history. Not for you and not for us.",
              },
              {
                title: "We never promise an account comes back.",
                detail:
                  "Nobody can promise that, and anybody who does is selling you hope. We teach the method and we tell you the truth about your odds.",
              },
              {
                title: "We never do revenge.",
                detail:
                  "If you want somebody hurt instead of a problem handled, this is not it and we will not do it. Results, not retaliation.",
              },
            ].map((rule) => (
              <article
                key={rule.title}
                className="relative overflow-hidden rounded-3xl border border-[var(--line-strong)] bg-[var(--panel)] p-6 shadow-[0_18px_50px_#0a12200f]"
              >
                <span
                  aria-hidden="true"
                  className="absolute inset-x-0 top-0 h-1 bg-[var(--danger)]"
                />
                <span className="inline-flex h-10 w-10 items-center justify-center rounded-xl bg-[var(--danger-tint)]">
                  <X aria-hidden="true" className="h-5 w-5 text-[var(--danger)]" />
                </span>
                <h3 className="mt-4 text-[17px] font-extrabold leading-snug text-[var(--heading)]">
                  {rule.title}
                </h3>
                <p className="mt-2 text-[14px] leading-relaxed text-[var(--quiet)]">
                  {rule.detail}
                </p>
              </article>
            ))}
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
          <div className="mt-8 grid gap-6 sm:grid-cols-2 xl:grid-cols-4">
            {otherOffers.map((o) => (
              <HoldTheLineOfferCard
                key={o.slug}
                href={`/offers/${o.slug}`}
                art={HERO_ART[o.slug].src}
                artAlt={`${o.name}: ${HERO_ART[o.slug].strong}`}
                price={o.priceLabel}
                name={o.name}
                summary={o.summary}
                cta={`See ${o.name}`}
              />
            ))}
            <HoldTheLineOfferCard
              href="/packages/launch"
              art="/images/offer-v2/website-launch-approval-path.webp"
              artAlt="The Website Launch approval path from intake through build, review, and launch"
              price="$1,000, $500 down"
              name="Own Your Voice Build"
              summary="The existing Website Launch, sold to this audience. Domain, site, email list, phone list. All in accounts with their name on them."
              cta="See the Website Launch"
              flag="The permanent fix"
            />
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
