import type { Metadata } from "next";
import Image from "next/image";
import {
  CalendarDays,
  Camera,
  Check,
  Eye,
  KeyRound,
  LayoutTemplate,
  Mail,
  Megaphone,
  MessageSquareText,
  PhoneCall,
  X,
} from "lucide-react";
import { withPublicPageMetadata } from "@/lib/publicPageMetadata";
import {
  FIVE_FAQ,
  FIVE_INCLUDED,
  FIVE_NOT_INCLUDED,
  FIVE_OFFER,
  FIVE_PROOF,
  FIVE_TIMELINE,
} from "@/lib/fiveOffer";
import { BUSINESS } from "@/lib/site/business";
import FiveBuyButton from "./FiveBuyButton";
import FiveContactLink from "./FiveContactLink";
import FiveCounters from "./FiveCounters";
import FiveLeadForm from "./FiveLeadForm";
import styles from "./five.module.css";

// The Five. Five East Texas businesses get the whole done-for-you month,
// paid once, then the door closes. This page is the ad, the business card,
// and the order form in one. Every price prints from lib/site/prices through
// lib/fiveOffer, every phone number from lib/site/business, and every proof
// number carries its date and its owner.

const title = `Five businesses. Thirty days. ${FIVE_OFFER.priceLabel}, once. | The LeadFlow Pro`;
const description = `The full done-for-you month, normally ${FIVE_OFFER.compareLabel}, for five East Texas businesses at ${FIVE_OFFER.priceLabel} paid once: on-site video, your ad run for ${FIVE_OFFER.days} days, ${FIVE_OFFER.posts} Facebook posts, a funnel page, and a ${FIVE_OFFER.emailDays} day email series. Closes ${FIVE_OFFER.deadlineLabel}.`;

export const metadata: Metadata = withPublicPageMetadata(FIVE_OFFER.path, {
  title,
  description,
  alternates: { canonical: `${BUSINESS.siteUrl}${FIVE_OFFER.path}` },
  openGraph: {
    title: `Thirty days of everything I do. ${FIVE_OFFER.priceLabel}. Five spots.`,
    description,
    url: `${BUSINESS.siteUrl}${FIVE_OFFER.path}`,
    siteName: BUSINESS.name,
    type: "website",
  },
  twitter: {
    card: "summary_large_image",
    title: `Thirty days of everything I do. ${FIVE_OFFER.priceLabel}. Five spots.`,
    description,
  },
});

const ICONS = {
  camera: Camera,
  megaphone: Megaphone,
  calendar: CalendarDays,
  layout: LayoutTemplate,
  eye: Eye,
  mail: Mail,
  key: KeyRound,
} as const;

export default function FivePage() {
  const buyLabel = `Take one of the five for ${FIVE_OFFER.priceLabel}`;

  return (
    <main className={`cb-page ${styles.page}`}>
      {/* ------------------------------------------------------------ hero --- */}
      <section className="cb-hero">
        <div className={`cb-shell ${styles.heroGrid}`}>
          <div className={styles.heroCopy}>
            <p className="cb-eyebrow">
              End of month special. Five businesses. Closes {FIVE_OFFER.deadlineLabel}.
            </p>
            <h1 className={`cb-h1 ${styles.heroH1}`}>
              Thirty days of everything I do for a business.
              <em>
                {FIVE_OFFER.priceLabel}. Once. Five spots.
              </em>
            </h1>
            <p className={styles.heroLead}>
              This is the month I sell for <strong>{FIVE_OFFER.compareLabel}</strong>. I come film
              you, build and run your ad, write and post {FIVE_OFFER.posts} Facebook posts, put up
              the page that catches the lead, wire a {FIVE_OFFER.emailDays} day email series, and
              watch all of it every day. For the next five East Texas businesses it is{" "}
              <strong>{FIVE_OFFER.priceLabel}, paid one time</strong>, and it starts this week.
            </p>
            <div className={styles.heroActions}>
              <FiveBuyButton
                label={buyLabel}
                phoneDisplay={BUSINESS.phone.display}
                smsHref={BUSINESS.phone.sms}
              />
              <FiveContactLink href={BUSINESS.phone.sms} kind="sms" className="cb-btn cb-btn--ghost">
                <MessageSquareText aria-hidden="true" />
                Text {BUSINESS.phone.display}
              </FiveContactLink>
            </div>
            <p className={styles.heroFine}>
              Ad spend is paid by you straight to Meta. Nothing renews on day 31. No promise of
              leads, sales, or revenue, from me or anyone honest.
            </p>

            <div className={styles.receipt} aria-label="The price">
              <div className={`${styles.receiptItem} ${styles["receiptItem--was"]}`}>
                <span>Regular rate</span>
                <strong>{FIVE_OFFER.compareLabel}</strong>
                <small>What this same month costs on the monthly plan</small>
              </div>
              <div className={`${styles.receiptItem} ${styles["receiptItem--now"]}`}>
                <span>The Five</span>
                <strong>{FIVE_OFFER.priceLabel}</strong>
                <small>Paid once. Same thirty days. Same work.</small>
              </div>
              <div className={styles.receiptItem}>
                <span>How many</span>
                <strong>{FIVE_OFFER.spots} businesses</strong>
                <small>Within {FIVE_OFFER.radiusMiles} miles of Longview for the shoot</small>
              </div>
            </div>
          </div>

          <aside className={styles.heroAside} aria-label="Live counters">
            <FiveCounters
              spots={FIVE_OFFER.spots}
              deadlineIso={FIVE_OFFER.deadlineIso}
              deadlineLabel={FIVE_OFFER.deadlineLabel}
            />
          </aside>
        </div>
      </section>

      {/* -------------------------------------------------------- included --- */}
      <section className="cb-band cb-band--tight" id="included">
        <div className="cb-shell">
          <div className={styles.sectionHead}>
            <p className="cb-eyebrow">What you get in the thirty days</p>
            <h2 className="cb-h2">Everything below is included. Nothing below is an upsell.</h2>
            <p>
              Seven pieces. I do all seven. You answer your phone.
            </p>
          </div>
          <div className={styles.cards}>
            {FIVE_INCLUDED.map((item) => {
              const Icon = ICONS[item.icon];
              const wide = item.id === "own";
              return (
                <article
                  key={item.id}
                  className={`${styles.card} ${wide ? styles["card--wide"] : ""}`}
                >
                  <span className={styles.chip} data-accent={item.accent} aria-hidden="true">
                    <Icon />
                  </span>
                  <h3>{item.title}</h3>
                  <p>{item.body}</p>
                </article>
              );
            })}
          </div>
        </div>
      </section>

      {/* ----------------------------------------------------------- proof --- */}
      <section className="cb-band cb-band--tint cb-band--tight" id="proof">
        <div className="cb-shell">
          <div className={styles.sectionHead}>
            <p className="cb-eyebrow">Proof with names and dates on it</p>
            <h2 className="cb-h2">Do not take my word for it. Take theirs.</h2>
            <p>
              Every number here belongs to a real business, on a real date, and I will show you
              the screen behind any of them. None of it is a promise about yours.
            </p>
          </div>
          <div className={styles.proofGrid}>
            {FIVE_PROOF.map((proof) => (
              <article key={proof.id} className={styles.proofCard}>
                <div className={styles.proofImg}>
                  <Image
                    src={proof.image}
                    alt={proof.imageAlt}
                    fill
                    sizes="(min-width: 900px) 33vw, 100vw"
                  />
                </div>
                <div className={styles.proofBody}>
                  <h3>{proof.name}</h3>
                  <p className={styles.proofWho}>{proof.who}</p>
                  <ul className={styles.facts}>
                    {proof.facts.map((fact) => (
                      <li key={fact.label}>
                        <strong>{fact.value}</strong>
                        <span>{fact.label}</span>
                      </li>
                    ))}
                  </ul>
                  <p className={styles.proofNote}>{proof.note}</p>
                </div>
              </article>
            ))}
          </div>
        </div>
      </section>

      {/* -------------------------------------------------------- timeline --- */}
      <section className="cb-band cb-band--tight" id="how">
        <div className="cb-shell">
          <div className={styles.sectionHead}>
            <p className="cb-eyebrow">How the thirty days run</p>
            <h2 className="cb-h2">The clock starts at the day 1 call, not at checkout.</h2>
            <p>So nothing is ticking while we find the shoot date. Here is the whole month.</p>
          </div>
          <ol className={styles.timeline}>
            {FIVE_TIMELINE.map((step) => (
              <li key={step.day}>
                <span className={styles.tlDay}>{step.day}</span>
                <h3>{step.title}</h3>
                <p>{step.body}</p>
              </li>
            ))}
          </ol>
        </div>
      </section>

      {/* ------------------------------------------------------------ math --- */}
      <section className="cb-band cb-band--tint cb-band--tight" id="price">
        <div className="cb-shell">
          <div className={styles.sectionHead}>
            <p className="cb-eyebrow">The arithmetic, in plain sight</p>
            <h2 className="cb-h2">Same month. Same work. One number is a fifth of the other.</h2>
          </div>
          <div className={styles.mathGrid}>
            <div className={styles.mathCol}>
              <span className={styles.mathLabel}>The regular way</span>
              <span className={styles.mathBig}>{FIVE_OFFER.compareLabel}</span>
              <p className={styles.mathSub}>
                Monthly retainer. Same seven pieces. Renews every month you keep it.
              </p>
              <ul className={styles.mathList}>
                {FIVE_INCLUDED.slice(0, 6).map((item) => (
                  <li key={item.id}>
                    <Check aria-hidden="true" />
                    {item.title}
                  </li>
                ))}
              </ul>
            </div>
            <div className={`${styles.mathCol} ${styles["mathCol--now"]}`}>
              <span className={styles.mathLabel}>The Five, through {FIVE_OFFER.deadlineLabel}</span>
              <span className={styles.mathBig}>{FIVE_OFFER.priceLabel}</span>
              <p className={styles.mathSub}>
                Paid once. Same seven pieces. Nothing renews. Five businesses, then it is gone.
              </p>
              <ul className={styles.mathList}>
                {FIVE_INCLUDED.slice(0, 6).map((item) => (
                  <li key={item.id}>
                    <Check aria-hidden="true" />
                    {item.title}
                  </li>
                ))}
                <li>
                  <Check aria-hidden="true" />
                  You own every account, file, and post on day 31
                </li>
              </ul>
              <FiveBuyButton
                label={buyLabel}
                phoneDisplay={BUSINESS.phone.display}
                smsHref={BUSINESS.phone.sms}
              />
            </div>
          </div>
          <div className={styles.mathCol} style={{ marginTop: 18 }}>
            <span className={styles.mathLabel}>Not included, said out loud</span>
            <ul className={`${styles.mathList} ${styles["mathList--no"]}`}>
              {FIVE_NOT_INCLUDED.map((line) => (
                <li key={line}>
                  <X aria-hidden="true" />
                  {line}
                </li>
              ))}
            </ul>
          </div>
          <p className={styles.mathFoot}>
            The two prices above are the two prices. The only other number on this page that is
            not a dated result is the ad spend range, which is what most owners I work with choose
            to run. Scott&apos;s first booked job is worth more than this whole package costs. That is
            his result, on his date, and not a promise about yours.
          </p>
        </div>
      </section>

      {/* ------------------------------------------------------------- who --- */}
      <section className="cb-band cb-band--tight" id="who">
        <div className="cb-shell">
          <div className={styles.sectionHead}>
            <p className="cb-eyebrow">Who this is for</p>
            <h2 className="cb-h2">Five spots go to five owners who will pick up the phone.</h2>
          </div>
          <div className={styles.whoGrid}>
            <div className={`${styles.whoCol} ${styles["whoCol--yes"]}`}>
              <h3>Take a spot if</h3>
              <ul>
                <li><Check aria-hidden="true" />You run a business within about {FIVE_OFFER.radiusMiles} miles of Longview, Texas, or you can shoot your own footage from my shot list.</li>
                <li><Check aria-hidden="true" />You can take on more customers, students, patients, or jobs in the next thirty days.</li>
                <li><Check aria-hidden="true" />You or somebody on your team will answer the phone and return the texts that come in.</li>
                <li><Check aria-hidden="true" />You want to own the account, the page, the footage, and the list when this is over.</li>
              </ul>
            </div>
            <div className={`${styles.whoCol} ${styles["whoCol--no"]}`}>
              <h3>Do not take a spot if</h3>
              <ul>
                <li><X aria-hidden="true" />You want somebody to promise you a lead count or a revenue number. I will not, and anyone who does is guessing.</li>
                <li><X aria-hidden="true" />You cannot spend anything on ad delivery. The ad runs on your card, and it needs fuel.</li>
                <li><X aria-hidden="true" />You will not be available for one two hour shoot and one thirty minute call in the first week.</li>
                <li><X aria-hidden="true" />You are looking for a logo and a pretty site. This is built to make the phone ring, not to win a design award.</li>
              </ul>
            </div>
          </div>
        </div>
      </section>

      {/* ------------------------------------------------------------- faq --- */}
      <section className="cb-band cb-band--tint cb-band--tight" id="questions">
        <div className="cb-shell">
          <div className={styles.sectionHead}>
            <p className="cb-eyebrow">Straight answers</p>
            <h2 className="cb-h2">The questions I would ask if I were you.</h2>
          </div>
          <div className={styles.faq}>
            {FIVE_FAQ.map((item) => (
              <details key={item.q}>
                <summary>{item.q}</summary>
                <p>{item.a}</p>
              </details>
            ))}
          </div>
        </div>
      </section>

      {/* ----------------------------------------------------------- final --- */}
      <section className="cb-band cb-band--ink" id="take-a-spot">
        <div className={`cb-shell ${styles.finalGrid}`}>
          <div className={styles.finalCopy}>
            <p className="cb-eyebrow">Five spots. Then the price goes back.</p>
            <h2 className="cb-h2">Thirty days from now you either have a machine or you have a story about why you waited.</h2>
            <p>
              {FIVE_OFFER.priceLabel}, once. Video, ad, {FIVE_OFFER.posts} posts, page, emails,
              and me on it every day. Closes {FIVE_OFFER.deadlineLabel} or when the fifth business
              takes it, whichever comes first.
            </p>
            <div className={styles.finalActions}>
              <FiveBuyButton
                label={buyLabel}
                phoneDisplay={BUSINESS.phone.display}
                smsHref={BUSINESS.phone.sms}
              />
              <FiveContactLink href={BUSINESS.phone.tel} kind="phone" className="cb-btn cb-btn--ghost">
                <PhoneCall aria-hidden="true" />
                Call {BUSINESS.phone.display}
              </FiveContactLink>
            </div>
            <p className={styles.heroFine}>
              I answer my own phone. If I am on a shoot, text and I call you back the same day.
            </p>
          </div>
          <FiveLeadForm phoneDisplay={BUSINESS.phone.display} />
        </div>
        <div className="cb-shell">
          <p className={styles.legal}>
            {BUSINESS.dbaLine}. Longview, Texas. Nothing on this page is a promise of leads,
            sales, revenue, or ad results. Every result shown belongs to the business named, on
            the date named, as reported to Ryan Nichols. Ad spend is paid by the client directly
            to Meta and is not part of the price. The only promise is the work itself, all seven
            pieces, delivered inside the thirty days.
          </p>
        </div>
      </section>
    </main>
  );
}
