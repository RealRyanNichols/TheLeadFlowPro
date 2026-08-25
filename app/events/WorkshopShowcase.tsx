import Image from "next/image";
import Link from "next/link";
import {
  ArrowRight,
  BadgeCheck,
  CalendarDays,
  Check,
  Clock3,
  Laptop,
  MapPin,
  Users,
  X,
} from "lucide-react";
import {
  STANDS_ALONE_DISCLOSURE,
  formatEventWhen,
  priceUsd,
  workshopContent,
  type EventAvailability,
  type EventRow,
} from "@/lib/events";
import styles from "./[slug]/workshop.module.css";
import local from "./events.module.css";

// The founding workshop, marketed in full on /events. The long-form content
// lives in lib/events.ts, so this section is complete even while the event
// row is an unpublished draft: everything is real except the register button,
// which only appears once the event is published. Until then the CTA is
// first-pick interest, and no date is shown that isn't confirmed.

const FOUNDING_SLUG = "chatgpt-for-business-owners-longview";

export default function WorkshopShowcase({
  event,
  availability,
}: {
  /** The published event row, or null while it is still a draft. */
  event: EventRow | null;
  availability: EventAvailability | null;
}) {
  const content = workshopContent(FOUNDING_SLUG);
  if (!content) return null;

  const published = Boolean(event?.is_published);
  const price = event ? priceUsd(event) : 97;
  const capacity = event?.capacity ?? 10;
  const when = event ? formatEventWhen(event) : null;
  const dateLine =
    published && event?.date_confirmed && when?.iso
      ? when.full
      : "Date announced soon — founding class";
  const funnelHref = `/events/${FOUNDING_SLUG}`;
  const soldOut = availability?.sold_out ?? false;
  const seatsRemaining = availability?.seats_remaining ?? capacity;

  const primaryCta = published ? (
    <Link className="cb-btn cb-btn--primary" href={funnelHref}>
      {soldOut ? "Sold Out — See Details" : `Reserve My Seat | $${price}`}
      <ArrowRight aria-hidden="true" />
    </Link>
  ) : (
    <Link className="cb-btn cb-btn--primary" href="/book?interest=workshop_founding">
      Get First Pick of the Founding Seats
      <ArrowRight aria-hidden="true" />
    </Link>
  );

  return (
    <section id="founding-workshop" className="cb-band" tabIndex={-1}>
      <div className="cb-shell">
        {/* ------------------------------------------------------- header --- */}
        <div className={local.showcaseHead}>
          <div>
            <p className="cb-eyebrow">Founding workshop · Longview, Texas</p>
            <h2 className="cb-h2">ChatGPT for Business Owners: Live in Longview.</h2>
            <p className="cb-lead">{content.promise}</p>
          </div>
          <div className={local.showcaseFacts}>
            <p>
              <CalendarDays aria-hidden="true" />
              <span>
                {dateLine}
                {!published && <em>Founding seats get the date first.</em>}
              </span>
            </p>
            <p>
              <Clock3 aria-hidden="true" />
              <span>
                90 minutes
                <em>Plus an optional 30-minute AI Business Clinic after class.</em>
              </span>
            </p>
            <p>
              <MapPin aria-hidden="true" />
              <span>
                Longview Training Center · Longview, TX
                <em>Exact arrival instructions are sent after your seat is paid.</em>
              </span>
            </p>
            <p>
              <Users aria-hidden="true" />
              <span>
                {capacity} seats, first come first served
                <em>
                  ${price} founding ticket — a seat is confirmed only after payment, and this
                  price goes up after the founding class.
                </em>
              </span>
            </p>
            <p>
              <Laptop aria-hidden="true" />
              <span>Bring your laptop — this is a working session, not a lecture.</span>
            </p>
            <div className={local.showcaseCta}>
              {primaryCta}
              {published && !soldOut && (
                <span className={local.seatNote}>
                  {seatsRemaining} of {capacity} seats open
                </span>
              )}
            </div>
          </div>
        </div>

        {/* ------------------------------------------------------- learn --- */}
        <div className={local.showcaseBlock}>
          <p className="cb-eyebrow">What you will learn</p>
          <div className={styles.cardGrid}>
            {content.learn.map((item) => (
              <div key={item.title} className={styles.miniCard}>
                <h3>{item.title}</h3>
                <p>{item.detail}</p>
              </div>
            ))}
          </div>
        </div>

        {/* ------------------------------------------------------ agenda --- */}
        <div className={local.showcaseBlock}>
          <p className="cb-eyebrow">The 90-minute agenda — every minute has a job</p>
          <div className={styles.agenda}>
            {content.agenda.map((block) => (
              <div key={block.window} className={styles.agendaRow}>
                <span className={styles.agendaWindow}>{block.window}</span>
                <div>
                  <p className={styles.agendaTitle}>{block.title}</p>
                  <p className={styles.agendaDetail}>{block.detail}</p>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* ------------------------------------------------------ clinic --- */}
        <div className={`${local.showcaseBlock} ${local.showcaseClinic}`}>
          <div>
            <p className="cb-eyebrow">After the 90 minutes</p>
            <h3 className={local.showcaseH3}>The Founding AI Business Clinic.</h3>
            <p className="cb-lead">{content.clinic.intro}</p>
            <ul className={styles.checkList}>
              {content.clinic.points.map((point) => (
                <li key={point}>
                  <BadgeCheck aria-hidden="true" />
                  {point}
                </li>
              ))}
            </ul>
          </div>
          <Image
            src="/images/workshops/chatgpt-workshop-first-use-case-4x5.webp"
            alt="A workshop map turning business bottlenecks into practical AI use cases"
            width={1122}
            height={1402}
            sizes="(max-width: 900px) 92vw, 40vw"
            className={local.showcaseImage}
          />
        </div>

        {/* ------------------------------------------------- fit + bring --- */}
        <div className={local.showcaseBlock}>
          <div className={styles.splitGrid}>
            <div className={styles.miniCard}>
              <h3>This is for you if</h3>
              <ul className={styles.checkList}>
                {content.forYou.map((item) => (
                  <li key={item}>
                    <Check aria-hidden="true" />
                    {item}
                  </li>
                ))}
              </ul>
            </div>
            <div className={styles.miniCard}>
              <h3>This is not for</h3>
              <ul className={styles.crossList}>
                {content.notForYou.map((item) => (
                  <li key={item}>
                    <X aria-hidden="true" />
                    {item}
                  </li>
                ))}
              </ul>
            </div>
            <div className={styles.miniCard}>
              <h3>Bring with you</h3>
              <ul className={styles.checkList}>
                {content.bring.map((item) => (
                  <li key={item}>
                    <Check aria-hidden="true" />
                    {item}
                  </li>
                ))}
              </ul>
            </div>
            <div className={styles.miniCard}>
              <h3>Straight answers</h3>
              <p>
                No AI experience needed. The free ChatGPT tier is enough. It is recorded, and
                you can be seated out of frame. {STANDS_ALONE_DISCLOSURE}
              </p>
            </div>
          </div>
        </div>

        <div className={local.showcaseFoot}>
          {primaryCta}
          {published && (
            <Link className="cb-btn cb-btn--ghost" href={funnelHref}>
              Full Details &amp; FAQ
              <ArrowRight aria-hidden="true" />
            </Link>
          )}
        </div>
      </div>
    </section>
  );
}
