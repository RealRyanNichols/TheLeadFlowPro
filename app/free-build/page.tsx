import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import {
  ArrowRight,
  Check,
  Clock3,
  KeyRound,
  MessageSquareText,
  ShieldCheck,
  X,
} from "lucide-react";
import { FREE_BUILD } from "@/lib/freeBuild";
import FreeBuildOrder from "./FreeBuildOrder";
import styles from "./free-build.module.css";

// The Free Website Program. Destination for Meta Instant Form leads and the
// homepage application CTA. The first phone screen answers the real question:
// the five-page build fee is $0, paid growth services are optional, and the
// client owns the website, accounts, tracking, and leads.

export const metadata: Metadata = {
  title: "Free Five-Page Website | The LeadFlow Pro",
  description:
    "Apply for a five-page business website with a $0 build fee. Own the site, lead route, analytics and accounts. Paid growth services are optional.",
  alternates: { canonical: "https://www.theleadflowpro.com/free-build" },
  openGraph: {
    title: "Own your website. Your first five-page build is $0.",
    description:
      "Application required. Up to five pages, mobile-first lead capture, search foundation and 90 days of scoped corrections. Paid growth services are optional.",
    url: "https://www.theleadflowpro.com/free-build",
    siteName: "The LeadFlow Pro",
    type: "website",
    images: [
      {
        url: "/og/free-build.jpg",
        width: 1200,
        height: 630,
        alt: "The Free Build from The LeadFlow Pro",
      },
    ],
  },
  twitter: {
    card: "summary_large_image",
    title: "Own your website. Your first five-page build is $0.",
    description: "Application required. Paid growth services are optional and separately approved.",
    images: ["/og/free-build.jpg"],
  },
};

export default function FreeBuildPage() {
  return (
    <main className={`cb-page ${styles.page}`}>
      {/* -------------------------------------------------------------- hero --- */}
      <section className="cb-hero">
        <div className={`cb-shell ${styles.heroGrid}`}>
          <div>
            <p className="cb-eyebrow">The LeadFlow Pro Free Website Program</p>
            <h1 className="cb-h1">
              {FREE_BUILD.headline}
              <em>{FREE_BUILD.subhead}</em>
            </h1>
            <p className="cb-hero-lead">{FREE_BUILD.promise}</p>

            <ul className={styles.factList}>
              <li>
                <ShieldCheck aria-hidden="true" />
                <span>
                  Up to five scoped pages with a $0 build fee
                  <em>
                    Mobile-first, lead capture, analytics, search foundation, and a defined
                    90-day correction window.
                  </em>
                </span>
              </li>
              <li>
                <Clock3 aria-hidden="true" />
                <span>
                  Working-preview target: {FREE_BUILD.guaranteeDays} business days
                  <em>The clock starts after the written scope, complete intake, and assets are in.</em>
                </span>
              </li>
              <li>
                <KeyRound aria-hidden="true" />
                <span>
                  Your website, customer records, and tracking stay yours
                  <em>No hidden lead copy, cross-client audience, or undisclosed LeadFlow pixel.</em>
                </span>
              </li>
            </ul>

            <div className="cb-actions">
              <a className="cb-btn cb-btn--primary" href="#why">
                See What $0 Includes
                <ArrowRight aria-hidden="true" />
              </a>
              <a className="cb-btn cb-btn--ghost" href="#pick">
                Apply Now
              </a>
            </div>

            <p className={styles.textUs}>
              <MessageSquareText aria-hidden="true" />
              <span>
                Rather just ask me something? Text{" "}
                <a href="sms:+19035008898?&body=Free%20Build%20question:%20">
                  (903) 500-8898
                </a>
                . You text me first, I answer myself. I do not send marketing texts to
                people who have not written to me.
              </span>
            </p>

            <p className={styles.slots}>{FREE_BUILD.slotsNote}</p>
          </div>

          <div className={styles.tradeCard}>
            <div className={styles.tradeRow}>
              <span className={styles.tradeLabel}>Your first five-page website</span>
              <span className={styles.tradeFree}>$0 build fee</span>
            </div>
            <p className={styles.tradeNote}>
              Application required. Approved businesses own the website. Domain registration,
              vendor software, ad spend, and any growth services are disclosed separately before
              you approve them.
            </p>
            <div className={styles.tradeDivider} />
            <div className={styles.tradeRow}>
              <span className={styles.tradeLabel}>Paid growth services</span>
              <span className={styles.tradePaid}>optional</span>
            </div>
            <p className={styles.tradeNote}>
              Ads, follow-up, content, CRM, automation, SEO, video, and larger systems receive a
              separate written price. Domain, hosting after 90 days, software, and ad spend are disclosed.
            </p>
            <a className={`cb-btn cb-btn--primary ${styles.tradeBtn}`} href="#pick">
              Apply Or Add Growth Services
              <ArrowRight aria-hidden="true" />
            </a>
          </div>
        </div>
      </section>

      {/* -------------------------------------------------------------- why --- */}
      {/* Answer the material conditions before any service price appears. */}
      <section id="why" className="cb-band" tabIndex={-1}>
        <div className="cb-shell">
          <p className="cb-eyebrow">No hidden catch</p>
          <h2 className="cb-h2">You are right to be suspicious of the word free.</h2>
          <p className="cb-lead">
            So here are the three questions everybody asks, answered before I show you a single
            price.
          </p>
          <div className={styles.whyGrid}>
            {FREE_BUILD.whyFree.map((item, i) => (
              <div key={item.q} className={styles.whyCard}>
                <span className={styles.whyNum}>{String(i + 1).padStart(2, "0")}</span>
                <h3>{item.q}</h3>
                <p>{item.a}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ------------------------------------------------------------ proof --- */}
      <section
        id="proof"
        className={`cb-band cb-band--tint ${styles.proofBand}`}
        aria-labelledby="pda-proof-title"
        tabIndex={-1}
      >
        <div className="cb-shell">
          <p className="cb-eyebrow">Operating proof · September 1, 2026 snapshot</p>
          <h2 id="pda-proof-title" className="cb-h2">
            This is what it looks like when a business owns the numbers.
          </h2>
          <p className="cb-lead">
            The Premier Dental Academy owner cockpit brings lead sources, enrollment, audience,
            site traffic, and logged revenue into one place. It helps the owner see what needs
            attention instead of guessing from disconnected apps.
          </p>

          <div className={styles.proofGrid}>
            <figure className={styles.proofFigure}>
              <div className={styles.proofImage}>
                <Image
                  src="/images/proof/pda-kpi-proof-2026-09-01.png"
                  alt="Public-safe Premier Dental Academy KPI dashboard showing aggregate leads, enrolled students, email subscribers, pageviews, and logged revenue"
                  width={1232}
                  height={121}
                  sizes="(max-width: 900px) 100vw, 58vw"
                />
              </div>
              <div className={styles.proofImage}>
                <Image
                  src="/images/proof/pda-lead-source-proof-2026-09-01.png"
                  alt="Premier Dental Academy 30-day lead chart and aggregate lead-source breakdown, including 43 Facebook lead-ad leads"
                  width={1232}
                  height={326}
                  sizes="(max-width: 900px) 100vw, 58vw"
                />
              </div>
              <figcaption>
                Public-safe dashboard crops. Individual names, contact details, inbox links, and
                private operating records are not shown.
              </figcaption>
            </figure>

            <div className={styles.proofCopy}>
              <dl className={styles.proofStats} aria-label="Premier Dental Academy KPI snapshot">
                <div>
                  <dt>Leads recorded · last 30 days</dt>
                  <dd>261</dd>
                </div>
                <div>
                  <dt>From Facebook lead ads · last 30 days</dt>
                  <dd>43</dd>
                </div>
                <div>
                  <dt>Enrolled students · current database</dt>
                  <dd>47</dd>
                </div>
                <div>
                  <dt>Email subscribers · current list</dt>
                  <dd>853</dd>
                </div>
                <div>
                  <dt>First-party pageviews · last 30 days</dt>
                  <dd>3,211</dd>
                </div>
                <div>
                  <dt>Revenue logged · Supabase snapshot</dt>
                  <dd>$2,642*</dd>
                </div>
              </dl>

              <div className={styles.proofTruth}>
                <strong>Read the snapshot correctly.</strong>
                <p>
                  The 261 leads, 43 Facebook lead-ad leads, and 3,211 pageviews are 30-day
                  figures. Enrollment and email-list figures are current totals. *The $2,642 is
                  revenue logged in Supabase; Square remains the academy&apos;s payment source of
                  truth.
                </p>
                <p>
                  What LeadFlow built is the connected reporting and operating layer. These are
                  academy-wide metrics—not a claim that LeadFlow, Meta ads, or one campaign caused
                  every result. Premier Dental Academy and The LeadFlow Pro share common ownership;
                  this is an operating example, not an independent client testimonial or a promise
                  of your results.
                </p>
              </div>

              <div className="cb-actions">
                <a className="cb-btn cb-btn--primary" href="#pick">
                  Apply For My Free Website
                  <ArrowRight aria-hidden="true" />
                </a>
                <Link className="cb-btn cb-btn--ghost" href="/premier-system">
                  See The Premier Build
                </Link>
              </div>
            </div>
          </div>

          <p className={styles.proofSource}>
            Source: Premier Dental Academy KPI Cockpit, Supabase-backed snapshot captured September
            1, 2026 at 6:00 PM CT. Figures can change as business records update.
          </p>
        </div>
      </section>

      {/* ------------------------------------------------------------- pick --- */}
      <section id="pick" className="cb-band" tabIndex={-1}>
        <div className="cb-shell">
          <p className="cb-eyebrow">Apply free or add a growth service</p>
          <h2 className="cb-h2">Start with the website. Add only what the business needs.</h2>
          <p className="cb-lead">
            The $0 application is the first option below. The paid cards are optional fixed-scope
            work products for owners who already know they want follow-up, content, or a 30-day
            growth foundation. No ad spend or subscription is hidden inside these prices.
          </p>
          <FreeBuildOrder />
        </div>
      </section>

      {/* --------------------------------------------------------- free only --- */}
      <section id="free-only" className="cb-band cb-band--tint" tabIndex={-1}>
        <div className="cb-shell">
          <p className="cb-eyebrow">The genuine $0 lane</p>
          <h2 className="cb-h2">{FREE_BUILD.freeOnly.name}</h2>
          <p className="cb-lead">{FREE_BUILD.freeOnly.line}</p>

          <div className={styles.splitGrid}>
            <div className={styles.miniCard}>
              <h3>{FREE_BUILD.freeOnly.tradeTitle}</h3>
              <p style={{ marginBottom: 14 }}>
                There is no required purchase. The limits protect the build capacity and keep the
                promise honest. Here is the applicant&apos;s part in writing.
              </p>
              <ul className={styles.checkList}>
                {FREE_BUILD.freeOnly.trade.map((t) => (
                  <li key={t.title}>
                    <Check aria-hidden="true" />
                    <span>
                      <strong>{t.title}.</strong> {t.detail}
                    </span>
                  </li>
                ))}
              </ul>
            </div>
            <div className={styles.miniCard}>
              <h3>What is not included</h3>
              <ul className={styles.crossList}>
                {FREE_BUILD.freeOnly.notIncluded.map((n) => (
                  <li key={n}>
                    <X aria-hidden="true" />
                    {n}
                  </li>
                ))}
              </ul>
            </div>
          </div>

          <div className={styles.guarantee} style={{ marginTop: 22 }}>
            <ShieldCheck aria-hidden="true" />
            <p>{FREE_BUILD.freeOnly.removal}</p>
          </div>

          <div className="cb-actions" style={{ marginTop: 26 }}>
            <a className="cb-btn cb-btn--ghost" href="#order">
              {FREE_BUILD.freeOnly.cta}
              <ArrowRight aria-hidden="true" />
            </a>
          </div>
        </div>
      </section>

      {/* ------------------------------------------------------------ build --- */}
      <section className="cb-band cb-band--tint">
        <div className="cb-shell">
          <p className="cb-eyebrow">Inside the five-page foundation</p>
          <h2 className="cb-h2">What the $0 build fee covers.</h2>
          <div className={styles.cardGrid}>
            {FREE_BUILD.buildIncludes.map((item) => (
              <div key={item.title} className={styles.miniCard}>
                <h3>{item.title}</h3>
                <p>{item.detail}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ------------------------------------------------------------ steps --- */}
      <section className="cb-band">
        <div className="cb-shell">
          <p className="cb-eyebrow">How it runs</p>
          <h2 className="cb-h2">Five steps from application to owned website.</h2>
          <div className={styles.steps}>
            {FREE_BUILD.steps.map((step) => (
              <div key={step.number} className={styles.step}>
                <span className={styles.stepNum}>{step.number}</span>
                <div>
                  <h3>{step.name}</h3>
                  <p>{step.body}</p>
                </div>
              </div>
            ))}
          </div>
          <div className={styles.guarantee}>
            <ShieldCheck aria-hidden="true" />
            <p>{FREE_BUILD.guarantee}</p>
          </div>
        </div>
      </section>

      {/* ------------------------------------------------------------ catch --- */}
      <section id="catch" className="cb-band cb-band--tint" tabIndex={-1}>
        <div className="cb-shell">
          <p className="cb-eyebrow">Before you ask</p>
          <h2 className="cb-h2">Here is the catch, in my own words.</h2>
          <div className={styles.splitGrid}>
            <div className={styles.miniCard}>
              <h3>What the free build is</h3>
              <ul className={styles.checkList}>
                {FREE_BUILD.buildIncludes.map((item) => (
                  <li key={item.title}>
                    <Check aria-hidden="true" />
                    {item.title}
                  </li>
                ))}
              </ul>
            </div>
            <div className={styles.miniCard}>
              <h3>What the free build is not</h3>
              <ul className={styles.crossList}>
                {FREE_BUILD.buildExcludes.map((item) => (
                  <li key={item}>
                    <X aria-hidden="true" />
                    {item}
                  </li>
                ))}
              </ul>
            </div>
          </div>
        </div>
      </section>

      {/* --------------------------------------------------------------- faq --- */}
      <section className="cb-band cb-band--tint">
        <div className="cb-shell">
          <p className="cb-eyebrow">Straight answers</p>
          <h2 className="cb-h2">Questions people ask first.</h2>
          <div className={styles.faq}>
            {FREE_BUILD.faq.map((item) => (
              <details key={item.q}>
                <summary>{item.q}</summary>
                <p>{item.a}</p>
              </details>
            ))}
          </div>
        </div>
      </section>

      {/* --------------------------------------------------------------- cta --- */}
      <section className="cb-band cb-band--ink">
        <div className="cb-shell">
          <p className="cb-eyebrow">Own your website</p>
          <h2 className="cb-h2">Start with the foundation. Build the engine when it makes sense.</h2>
          <p className="cb-lead">
            Apply for the five-page website at $0. Keep the site, accounts, tracking, and customer
            records under your control. If you want LeadFlow Pro to add ads, follow-up, CRM,
            automation, content, video, SEO, or a larger system, approve that work separately.
          </p>
          <div className="cb-actions">
            <a className="cb-btn cb-btn--primary" href="#pick">
              Apply For My Free Website
              <ArrowRight aria-hidden="true" />
            </a>
            <Link className="cb-btn cb-btn--ghost" href="/book">
              Ask Me A Question First
            </Link>
            <a className="cb-btn cb-btn--ghost" href="sms:+19035008898?&body=Free%20Build%20question:%20">
              Text Me: (903) 500-8898
            </a>
          </div>
        </div>
      </section>
    </main>
  );
}
