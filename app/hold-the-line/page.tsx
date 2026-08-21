import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import {
  ArrowRight,
  Check,
  MessageSquareText,
  ShieldCheck,
  X,
} from "lucide-react";
import HoldTheLineIntake from "./HoldTheLineIntake";
import HoldTheLineOfferCard from "@/components/HoldTheLineOfferCard";
import { HOLD_THE_LINE_OFFERS } from "@/lib/offers";

// HOLD THE LINE. The second offer lane of The LeadFlow Pro.
//
// Lane one gives a business owner a platform they own. This lane teaches them
// to keep speaking on it: how to answer critics and trolls without losing the
// account, and how to recover if they already did. Copy is from the approved
// sales page in Notion (14.5 The Offer) and is used close to verbatim; it is
// in Ryan's voice. Answering the three questions every LeadFlow page answers:
// what is this, who is it for, what do I do next.
//
// Two rules from the product spec survive into everything on this page: we
// never research, profile, or publish personal details about a private
// individual, and we never guarantee an account gets restored. The "not for"
// section is deliberate and stays. It is a trust asset, not a liability.

const CANONICAL_URL = "https://www.theleadflowpro.com/hold-the-line";

export const metadata: Metadata = {
  title: "Answer Back Without Losing Your Account | Hold The Line | The LeadFlow Pro",
  description:
    "How to respond to negative comments, critics, and trolls without getting suspended, demonetized, or de-recommended. And what to actually do if you already were. Training, exact replies, and recovery sessions from The LeadFlow Pro.",
  alternates: { canonical: CANONICAL_URL },
  openGraph: {
    title: "Answer back without losing your account.",
    description:
      "Most people lose their platform in the twenty minutes after somebody says something about them. This is how you handle it and keep everything.",
    url: CANONICAL_URL,
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
    title: "Answer back without losing your account.",
    description:
      "How to handle critics, trolls, and pile-ons without losing your platform. And how to recover if you already did.",
    images: ["/og/hold-the-line.jpg"],
  },
};

const TEACHES = [
  "How to tell an objection from a critic from a troll from a threat, in about four seconds.",
  "The four-part reply that wins the people reading instead of the person typing.",
  "The exact words for the eight situations that come up over and over.",
  "What never to type. This list alone is worth the price.",
  "How to build the record instead of taking the bait.",
  "What to actually do if you are already suspended or demonetized.",
  "How to keep the whole thing from eating your head while you are in it.",
];

const FOR_WHO = [
  "The business owner with somebody in the comments costing them customers.",
  "The person who already said the thing and lost the reach.",
  "The local citizen going up against an office with more lawyers than they have.",
  "Anybody who has ever closed the app shaking and did not know what to type.",
];

const NOT_FOR = [
  "Anybody looking for help going after a person. That is not what this is and we will not do it.",
  "Anybody who wants revenge instead of results.",
  "Anybody who wants a guarantee their account comes back. Nobody can promise that. We will tell you the truth about your odds.",
];

const JSON_LD = {
  "@context": "https://schema.org",
  "@graph": [
    {
      "@type": "Service",
      "@id": `${CANONICAL_URL}#service`,
      name: "Hold The Line",
      serviceType:
        "Online reputation defense training, comment response services, and account recovery sessions",
      description:
        "Training and services for answering negative comments, critics, and coordinated pile-ons without losing the account, and for recovering after a suspension or demonetization. No outcome guarantees, and no research or profiling of private individuals.",
      provider: {
        "@type": "Organization",
        name: "The LeadFlow Pro",
        legalName: "Longview Training Center, LLC",
        url: "https://www.theleadflowpro.com",
      },
      hasOfferCatalog: {
        "@type": "OfferCatalog",
        name: "Hold The Line ladder",
        itemListElement: HOLD_THE_LINE_OFFERS.map((offer) => ({
          "@type": "Offer",
          name: offer.name,
          description: offer.summary,
          price: (offer.amountCents / 100).toFixed(0),
          priceCurrency: "USD",
          url: `https://www.theleadflowpro.com/offers/${offer.slug}`,
        })),
      },
    },
  ],
};

export default function HoldTheLinePage() {
  const [playbook, ...serviceRungs] = HOLD_THE_LINE_OFFERS;

  return (
    <main className="cb-page">
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(JSON_LD) }}
      />

      {/* 1 ------------------------------------------------------------ hero */}
      <section className="cb-hero" aria-labelledby="htl-title">
        <div className="cb-shell cb-hero-layout">
          <div className="cb-hero-copy">
            <p className="cb-eyebrow">
              <ShieldCheck aria-hidden="true" className="h-4 w-4" />
              Hold The Line · Online defense
            </p>
            <h1 id="htl-title" className="cb-h1">
              Answer back
              <em>without losing your account.</em>
            </h1>
            <p className="cb-hero-lead">
              Most people lose their platform in the twenty minutes after somebody says
              something about them. This is how you handle it and keep everything.
            </p>
            <div className="cb-actions">
              <Link
                className="cb-btn cb-btn--primary"
                href="/offers/hold-the-line-playbook"
                data-analytics="cta-htl-hero-playbook"
              >
                Get the Playbook | $47
                <ArrowRight aria-hidden="true" className="h-4 w-4" />
              </Link>
              <Link className="cb-btn cb-btn--ghost" href="#email-training">
                Take the free email training
              </Link>
            </div>
            <p className="cb-hero-own">
              <ShieldCheck aria-hidden="true" />
              We teach defense, not retaliation. We will not help anybody go after a person.
            </p>
          </div>

          <figure className="cb-hero-visual">
            <Image
              src="/images/hold-the-line/landing.jpg"
              alt="A hostile comment thread being sorted and answered with one calm reply while the account stays intact"
              width={1672}
              height={941}
              priority
              sizes="(max-width: 900px) 100vw, 56vw"
            />
            <figcaption>
              <span>The skill, mid-use</span>
              <strong>Sort them. Answer once. Keep the account.</strong>
            </figcaption>
          </figure>
        </div>
      </section>

      {/* 2 ----------------------------------------------------- the problem */}
      <section className="cb-band" aria-labelledby="htl-problem-title">
        <div className="cb-shell">
          <div className="cb-headrow">
            <div>
              <p className="cb-eyebrow">The problem</p>
              <h2 id="htl-problem-title" className="cb-h2 cb-heading">
                You know the feeling.
              </h2>
            </div>
            <p className="cb-lead">
              Somebody posts something about your business that is not true. Or they knock
              your prices in front of every customer scrolling by. Or thirty accounts show
              up at once with the same sentence. And you have two options that both feel
              terrible.
            </p>
          </div>
          <div className="mt-8 grid gap-5 md:grid-cols-3">
            <article className="relative overflow-hidden rounded-3xl border border-[var(--line-strong)] bg-[var(--panel)] p-7 shadow-[0_18px_50px_#0a12200f]">
              <span aria-hidden="true" className="absolute inset-x-0 top-0 h-1 bg-[var(--line-strong)]" />
              <p className="text-[12px] font-extrabold uppercase tracking-[0.16em] text-[var(--quiet)]">
                Option one
              </p>
              <h3 className="mt-3 text-[22px] font-extrabold leading-snug text-[var(--heading)]">
                Say nothing
              </h3>
              <p className="mt-2 text-[16px] leading-relaxed text-[var(--quiet)]">
                And look guilty.
              </p>
            </article>
            <article className="relative overflow-hidden rounded-3xl border border-[var(--danger-line)] bg-[var(--panel)] p-7 shadow-[0_18px_50px_#0a12200f]">
              <span aria-hidden="true" className="absolute inset-x-0 top-0 h-1 bg-[var(--danger)]" />
              <p className="text-[12px] font-extrabold uppercase tracking-[0.16em] text-[var(--danger)]">
                Option two
              </p>
              <h3 className="mt-3 text-[22px] font-extrabold leading-snug text-[var(--heading)]">
                Say what you actually think
              </h3>
              <p className="mt-2 text-[16px] leading-relaxed text-[var(--quiet)]">
                And lose the account.
              </p>
            </article>
            <article className="relative overflow-hidden rounded-3xl border border-[#0ea5e9] bg-[var(--panel)] p-7 shadow-[0_18px_50px_#0ea5e922]">
              <span aria-hidden="true" className="absolute inset-x-0 top-0 h-1 bg-[#0ea5e9]" />
              <p className="text-[12px] font-extrabold uppercase tracking-[0.16em] text-[#0284c7]">
                Option three · the way through
              </p>
              <h3 className="mt-3 text-[22px] font-extrabold leading-snug text-[var(--heading)]">
                There is a third one
              </h3>
              <p className="mt-2 text-[16px] leading-relaxed text-[var(--quiet)]">
                It just takes training.
              </p>
            </article>
          </div>
        </div>
      </section>

      {/* 3 ------------------------------------- what most people get wrong */}
      <section className="cb-band cb-band--tint" aria-labelledby="htl-wrong-title">
        <div className="cb-shell">
          <div className="cb-headrow">
            <div>
              <p className="cb-eyebrow">What most people get wrong</p>
              <h2 id="htl-wrong-title" className="cb-h2 cb-heading">
                It is not a courage problem. It is a sorting problem.
              </h2>
            </div>
            <div className="cb-lead">
              <p>
                Most people who crash out online were plenty brave. That was the problem.
              </p>
              <p className="mt-4">
                There are seven kinds of people in your comments and they need seven
                different answers. Almost every account that gets taken down was taken down
                because somebody answered a mild objection like it was a threat.
              </p>
              <p className="mt-4">
                Learn to tell them apart and you will never type the sentence that costs
                you everything.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* 4 ---------------------------------------------- what this teaches */}
      <section className="cb-band" aria-labelledby="htl-teaches-title">
        <div className="cb-shell">
          <div className="cb-headrow">
            <div>
              <p className="cb-eyebrow">
                <MessageSquareText aria-hidden="true" className="h-4 w-4" />
                What this teaches
              </p>
              <h2 id="htl-teaches-title" className="cb-h2 cb-heading">
                Seven things, learned once, kept forever.
              </h2>
            </div>
          </div>
          <ol className="mt-8 grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
            {TEACHES.map((item, i) => (
              <li
                key={item}
                className="relative overflow-hidden rounded-3xl border border-[var(--line-strong)] bg-[var(--panel)] p-6 shadow-[0_18px_50px_#0a12200f]"
              >
                <span
                  aria-hidden="true"
                  className="absolute inset-x-0 top-0 h-1 bg-[#0ea5e9]"
                />
                <span className="inline-flex h-10 w-10 items-center justify-center rounded-xl bg-[#0ea5e91a] text-[15px] font-extrabold text-[#0284c7]">
                  {String(i + 1).padStart(2, "0")}
                </span>
                <p className="mt-4 text-[15px] font-semibold leading-relaxed text-[var(--text)]">
                  {item}
                </p>
              </li>
            ))}
          </ol>
        </div>
      </section>

      {/* 5 ------------------------------------------------------ the ladder */}
      <section className="cb-band cb-band--tint" aria-labelledby="htl-ladder-title">
        <div className="cb-shell">
          <div className="cb-headrow">
            <div>
              <p className="cb-eyebrow">The ladder</p>
              <h2 id="htl-ladder-title" className="cb-h2 cb-heading">
                Start at $47. Stop whenever you are covered.
              </h2>
            </div>
            <p className="cb-lead">
              Every rung ends at the same question: where does your voice live if this
              happens again? The permanent answer is the fifth step, a site, a list, and a
              number you own.
            </p>
          </div>
          <div className="mt-8 grid gap-6 sm:grid-cols-2 xl:grid-cols-4">
            <HoldTheLineOfferCard
              href={`/offers/${playbook.slug}`}
              art="/images/hold-the-line/playbook.jpg"
              artAlt="Inside the playbook: the sorting table, the never-type list, and the pre-send check"
              price={`${playbook.priceLabel} · instant`}
              name={playbook.name}
              summary={playbook.summary}
              cta="Get the Playbook"
              lead
              flag="Start here"
            />
            {serviceRungs.map((offer) => (
              <HoldTheLineOfferCard
                key={offer.slug}
                href={`/offers/${offer.slug}`}
                art={`/images/hold-the-line/${offer.slug}.jpg`}
                artAlt={`${offer.name}, mid-delivery`}
                price={offer.priceLabel}
                name={offer.name}
                summary={offer.summary}
                cta={`See ${offer.name}`}
              />
            ))}
          </div>
          <div className="cb-custom mt-8">
            <div>
              <p className="cb-eyebrow">
                <ShieldCheck aria-hidden="true" className="h-4 w-4" />
                The fifth step out
              </p>
              <h3>Own Your Voice Build · $1,000, $500 down</h3>
              <p>
                The existing Website Launch, sold to this audience. Domain, site, email
                list, phone list. All in accounts with their name on them. The permanent
                fix, and where every rung above points.
              </p>
            </div>
            <Link className="cb-btn cb-btn--ghost" href="/packages/launch">
              See the Website Launch
              <ArrowRight aria-hidden="true" className="h-4 w-4" />
            </Link>
          </div>
        </div>
      </section>

      {/* 6 --------------------------------------------- for and not for */}
      <section className="cb-band" aria-labelledby="htl-for-title">
        <div className="cb-shell">
          <div className="cb-headrow">
            <div>
              <p className="cb-eyebrow">Who this is for</p>
              <h2 id="htl-for-title" className="cb-h2 cb-heading">
                For the outnumbered. Not for the vengeful.
              </h2>
            </div>
            <p className="cb-lead">
              The second list matters as much as the first. Read both before you spend a
              dollar.
            </p>
          </div>
          <div className="mt-8 grid gap-6 lg:grid-cols-2">
            <div className="relative overflow-hidden rounded-3xl border border-[var(--line-strong)] bg-[var(--panel)] p-7 shadow-[0_18px_50px_#0a12200f]">
              <span aria-hidden="true" className="absolute inset-x-0 top-0 h-1 bg-[var(--green)]" />
              <h3 className="text-[18px] font-extrabold text-[var(--heading)]">
                This is for
              </h3>
              <ul className="mt-5 grid gap-3">
                {FOR_WHO.map((item) => (
                  <li
                    key={item}
                    className="flex items-start gap-3 rounded-2xl border border-[var(--green-line)] bg-[var(--green-tint)] p-4 text-[15px] leading-relaxed text-[var(--text)]"
                  >
                    <Check
                      aria-hidden="true"
                      className="mt-1 h-4 w-4 shrink-0 text-[var(--green)]"
                    />
                    <span>{item}</span>
                  </li>
                ))}
              </ul>
            </div>
            <div className="relative overflow-hidden rounded-3xl border border-[var(--line-strong)] bg-[var(--panel)] p-7 shadow-[0_18px_50px_#0a12200f]">
              <span aria-hidden="true" className="absolute inset-x-0 top-0 h-1 bg-[var(--danger)]" />
              <h3 className="text-[18px] font-extrabold text-[var(--heading)]">
                This is not for
              </h3>
              <ul className="mt-5 grid gap-3">
                {NOT_FOR.map((item) => (
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
            </div>
          </div>
        </div>
      </section>

      {/* 6b -------------------------------------------------- email intake */}
      <section
        id="email-training"
        className="cb-band cb-band--tint"
        aria-labelledby="htl-intake-title"
        tabIndex={-1}
      >
        <div className="cb-shell">
          <div className="cb-headrow">
            <div>
              <p className="cb-eyebrow">The free door</p>
              <h2 id="htl-intake-title" className="cb-h2 cb-heading">
                Not ready to spend a dollar? Fair.
              </h2>
            </div>
            <p className="cb-lead">
              The email series teaches the doctrine one rule at a time, free, starting the
              day you sign up. It will also tell you, honestly, when a paid rung is the
              faster answer and when it is not.
            </p>
          </div>
          <div className="mt-8 max-w-2xl">
            <HoldTheLineIntake />
          </div>
        </div>
      </section>

      {/* 7 ----------------------------------------------------------- close */}
      <section className="cb-band cb-band--ink" aria-labelledby="htl-close-title">
        <div className="cb-shell">
          <div className="cb-headrow">
            <div>
              <p className="cb-eyebrow">The close</p>
              <h2 id="htl-close-title" className="cb-h2 cb-heading">
                You built that audience.
              </h2>
            </div>
            <div className="cb-lead">
              <p>You wrote every post. You answered every message.</p>
              <p className="mt-4">
                Do not lose it in twenty minutes to somebody who does not even know you.
              </p>
              <p className="mt-4">Learn to hold the line.</p>
            </div>
          </div>
          <div className="cb-actions mt-8">
            <Link
              className="cb-btn cb-btn--primary"
              href="/offers/hold-the-line-playbook"
              data-analytics="cta-htl-close-playbook"
            >
              Get the Playbook | $47
              <ArrowRight aria-hidden="true" className="h-4 w-4" />
            </Link>
          </div>
        </div>
      </section>
    </main>
  );
}
