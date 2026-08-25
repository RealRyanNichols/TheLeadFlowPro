import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import { notFound } from "next/navigation";
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
import { createClient } from "@/lib/supabase/server";
import {
  EVENT_PUBLIC_FIELDS,
  STANDS_ALONE_DISCLOSURE,
  addressIsPublic,
  eventLocationLine,
  formatEventWhen,
  priceUsd,
  workshopContent,
  type EventAvailability,
  type EventRow,
} from "@/lib/events";
import WorkshopRegister from "./WorkshopRegister";
import styles from "./workshop.module.css";

// The workshop funnel. Everything that can change without a deploy — date,
// time, price, capacity, venue, publish state — comes from the events table.
// The long-form curriculum copy lives in lib/events.ts next to the rest of
// the workshop logic. Unpublished events 404 for the public; admins see them
// with a DRAFT banner because RLS lets is_admin() read drafts.

export const dynamic = "force-dynamic";

async function getEvent(slug: string): Promise<EventRow | null> {
  const supabase = await createClient();
  const { data } = await supabase
    .from("events")
    .select(EVENT_PUBLIC_FIELDS)
    .eq("slug", slug)
    .maybeSingle();
  return (data as EventRow | null) ?? null;
}

async function getAvailability(slug: string): Promise<EventAvailability | null> {
  const supabase = await createClient();
  const { data } = await supabase.rpc("event_availability", { p_slug: slug });
  const row = Array.isArray(data) ? data[0] : data;
  return (row as EventAvailability | null) ?? null;
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>;
}): Promise<Metadata> {
  const { slug } = await params;
  const event = await getEvent(slug);
  if (!event || !event.is_published) return { robots: { index: false, follow: false } };
  const when = formatEventWhen(event);
  const description =
    `${event.subtitle ?? "A hands-on workshop for East Texas business owners."} ` +
    `${when.iso && event.date_confirmed ? when.dateLabel + ". " : ""}` +
    `${event.capacity ?? 10} seats. Taught by ${event.instructor_name} in Longview, Texas.`;
  const url = `https://www.theleadflowpro.com/events/${event.slug}`;
  return {
    title: `${event.title} | The LeadFlow Pro`,
    description,
    alternates: { canonical: url },
    openGraph: {
      title: event.title,
      description,
      url,
      siteName: "The LeadFlow Pro",
      type: "website",
      images: [{ url: `/og/events/${event.slug}.jpg`, width: 1200, height: 630 }],
    },
    twitter: {
      card: "summary_large_image",
      title: event.title,
      description,
      images: [`/og/events/${event.slug}.jpg`],
    },
  };
}

export default async function WorkshopPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const event = await getEvent(slug);
  // RLS already hides unpublished events from the public; if the row came
  // back unpublished, the reader is an admin previewing the draft.
  if (!event) notFound();

  const availability = await getAvailability(slug);
  const content = workshopContent(slug);
  const when = formatEventWhen(event);
  const price = priceUsd(event);
  const place = eventLocationLine(event, { includeAddress: addressIsPublic(event) });
  const capacity = event.capacity ?? 10;
  const seatsTaken = availability?.seats_taken ?? 0;
  const seatsRemaining = availability?.seats_remaining ?? capacity;
  const soldOut = availability?.sold_out ?? false;
  const registrationOpen = (availability?.registration_open ?? true) && event.is_published;

  const dateLine = event.date_confirmed
    ? when.full
    : when.iso
      ? `${when.full} (date being finalized)`
      : "Date being finalized";

  return (
    <main className={`cb-page ${styles.page}`}>
      {!event.is_published && (
        <p className={styles.draftBanner}>
          DRAFT — this event is not published. Only admins can see this page.
        </p>
      )}

      {/* ------------------------------------------------------------ hero --- */}
      <section className="cb-hero">
        <div className={`cb-shell ${styles.heroGrid}`}>
          <div>
            <p className="cb-eyebrow">
              {content?.kicker ?? "Live workshop"} · {event.instructor_name}, instructor
            </p>
            <h1 className="cb-h1">
              Stop watching AI.
              <em>Start using it.</em>
            </h1>
            <p className="cb-hero-lead">
              {content?.promise ??
                event.description ??
                "A hands-on working session for business owners."}
            </p>
            <ul className={styles.factList}>
              <li>
                <CalendarDays aria-hidden="true" />
                <span>
                  {dateLine}
                  {!event.date_confirmed && (
                    <em>Paid seats transfer automatically if the date moves.</em>
                  )}
                </span>
              </li>
              <li>
                <Clock3 aria-hidden="true" />
                <span>
                  {event.duration_minutes ?? 90} minutes
                  {event.clinic_enabled && (
                    <em>Plus an optional 30-minute AI Business Clinic after class.</em>
                  )}
                </span>
              </li>
              <li>
                <MapPin aria-hidden="true" />
                <span>
                  {place || "Longview, Texas"}
                  {!addressIsPublic(event) && (
                    <em>Exact arrival instructions are sent after your seat is paid.</em>
                  )}
                </span>
              </li>
              <li>
                <Users aria-hidden="true" />
                <span>
                  {capacity} seats, first come first served
                  <em>A seat is confirmed only after payment.</em>
                </span>
              </li>
              <li>
                <Laptop aria-hidden="true" />
                <span>Bring your laptop — this is a working session, not a lecture.</span>
              </li>
            </ul>
            <div className="cb-actions">
              <a className="cb-btn cb-btn--primary" href="#reserve">
                Reserve My Seat | ${price}
                <ArrowRight aria-hidden="true" />
              </a>
              <a className="cb-btn cb-btn--ghost" href="#agenda">
                See the 90 Minutes
              </a>
            </div>
          </div>

          {/* price + live seat count */}
          <aside className={styles.priceCard} aria-label="Price and seats">
            <p className={styles.seatLabel}>Founding workshop ticket</p>
            <div className={styles.priceRow}>
              <span className={styles.price}>${price}</span>
              <span className={styles.priceUnit}>per seat</span>
            </div>
            {event.price_note && <p className={styles.priceNote}>{event.price_note}</p>}
            <div className={styles.seatMeter}>
              <p className={styles.seatLabel}>
                {soldOut
                  ? "Sold out"
                  : `${seatsRemaining} of ${capacity} seats open`}
              </p>
              <div className={styles.seatDots} aria-hidden="true">
                {Array.from({ length: capacity }, (_, i) => (
                  <span
                    key={i}
                    className={`${styles.seatDot} ${i < seatsTaken ? styles.seatDotTaken : ""}`}
                  />
                ))}
              </div>
            </div>
            {soldOut ? (
              <p className={styles.soldOut}>
                This workshop is sold out. Register interest on the events page and you will
                hear about the next date first.
              </p>
            ) : (
              <a className={`cb-btn cb-btn--primary ${styles.priceCardCta}`} href="#reserve">
                Reserve My Seat
                <ArrowRight aria-hidden="true" />
              </a>
            )}
            <ul className={styles.fineprint}>
              <li>{STANDS_ALONE_DISCLOSURE}</li>
              <li>
                Payment is processed by Stripe. The LeadFlow Pro never sees or stores your card
                number.
              </li>
            </ul>
          </aside>
        </div>
      </section>

      {/* --------------------------------------------------------- learn --- */}
      {content && (
        <section className="cb-band cb-band--tint">
          <div className="cb-shell">
            <div className="cb-headrow">
              <div>
                <p className="cb-eyebrow">What you will learn</p>
                <h2 className="cb-h2">Leave with skills, not notes.</h2>
              </div>
              <p className="cb-lead">
                The examples stay simple enough to follow and real enough to use when you get
                back to work on Monday.
              </p>
            </div>
            <div className={styles.cardGrid}>
              {content.learn.map((item) => (
                <div key={item.title} className={styles.miniCard}>
                  <h3>{item.title}</h3>
                  <p>{item.detail}</p>
                </div>
              ))}
            </div>
          </div>
        </section>
      )}

      {/* -------------------------------------------------------- agenda --- */}
      {content && (
        <section id="agenda" className="cb-band">
          <div className="cb-shell">
            <div className="cb-headrow">
              <div>
                <p className="cb-eyebrow">The 90-minute agenda</p>
                <h2 className="cb-h2">Every minute has a job.</h2>
              </div>
            </div>
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
        </section>
      )}

      {/* -------------------------------------------------------- clinic --- */}
      {content && event.clinic_enabled && (
        <section className="cb-band cb-band--tint">
          <div className={`cb-shell ${styles.heroGrid}`}>
            <div>
              <p className="cb-eyebrow">Founding cohort bonus</p>
              <h2 className="cb-h2">Stay for the 30-minute AI Business Clinic.</h2>
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
              sizes="(max-width: 900px) 92vw, 42vw"
              style={{ width: "100%", height: "auto", borderRadius: 18 }}
            />
          </div>
        </section>
      )}

      {/* ---------------------------------------------------- who it's for --- */}
      {content && (
        <section className="cb-band">
          <div className="cb-shell">
            <div className="cb-headrow">
              <div>
                <p className="cb-eyebrow">The right room matters</p>
                <h2 className="cb-h2">Ten seats means the fit has to be right.</h2>
              </div>
            </div>
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
            </div>
            <div className={styles.splitGrid}>
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
                <h3>Recording notice</h3>
                <p>
                  {event.recording_notice ??
                    "This workshop is recorded for training and marketing. Cameras face the instructor and the screen. If you would rather not appear on camera, tell us when you arrive and we will seat you out of frame."}
                </p>
              </div>
            </div>
          </div>
        </section>
      )}

      {/* ---------------------------------------------------- instructor --- */}
      <section className="cb-band cb-band--ink">
        <div className={`cb-shell ${styles.heroGrid}`}>
          <figure className={styles.instructorShot}>
            <Image
              src="/images/ryan-meta-raybans-production-clean.jpg"
              alt={`${event.instructor_name}, workshop instructor`}
              width={768}
              height={1024}
              sizes="(max-width: 900px) 92vw, 38vw"
              style={{ width: "100%", height: "auto", borderRadius: 18 }}
            />
          </figure>
          <div>
            <p className="cb-eyebrow">Your instructor</p>
            <h2 className="cb-h2">{event.instructor_name} builds with this every day.</h2>
            {(content?.instructor ?? []).map((paragraph) => (
              <p key={paragraph.slice(0, 24)} className="cb-lead">
                {paragraph}
              </p>
            ))}
          </div>
        </div>
      </section>

      {/* ------------------------------------------------------ register --- */}
      <section id="reserve" className="cb-band" tabIndex={-1}>
        <div className="cb-shell">
          <div className="cb-headrow">
            <div>
              <p className="cb-eyebrow">Reserve your seat</p>
              <h2 className="cb-h2">
                {soldOut ? "This workshop is sold out." : "Two minutes, and the seat work is done."}
              </h2>
            </div>
            {!soldOut && (
              <p className="cb-lead">
                Register, pay, done. Your seat is confirmed the moment payment clears, and your
                confirmation email carries everything you need for the day.
              </p>
            )}
          </div>
          <WorkshopRegister
            event={{
              id: event.id,
              slug: event.slug,
              title: event.title,
              price_usd: price,
              clinic_enabled: event.clinic_enabled,
            }}
            soldOut={soldOut}
            registrationOpen={registrationOpen}
          />
        </div>
      </section>

      {/* ----------------------------------------------------------- faq --- */}
      {content && (
        <section className="cb-band cb-band--tint">
          <div className="cb-shell">
            <div className="cb-headrow">
              <div>
                <p className="cb-eyebrow">Straight answers</p>
                <h2 className="cb-h2">Before you reserve.</h2>
              </div>
            </div>
            <div className={styles.faq}>
              {content.faq.map((item) => (
                <details key={item.q}>
                  <summary>{item.q}</summary>
                  <p>{item.a}</p>
                </details>
              ))}
            </div>
            <p className={styles.formNote} style={{ marginTop: 24 }}>
              {event.cancellation_policy ??
                "If you cannot make it, email us before the workshop and we will move your seat to the next date or transfer it to someone else from your business."}
            </p>
            <Link href="/events" className="cb-textlink" style={{ marginTop: 16, display: "inline-flex" }}>
              See all events <ArrowRight aria-hidden="true" />
            </Link>
          </div>
        </section>
      )}

      {/* sticky mobile reserve bar */}
      {!soldOut && registrationOpen && (
        <div className={styles.stickyBar}>
          <p className={styles.stickyCopy}>
            ${price} founding seat
            <span>
              {seatsRemaining} of {capacity} left · {event.duration_minutes ?? 90} min ·
              Longview
            </span>
          </p>
          <a className="cb-btn cb-btn--primary cb-btn--sm" href="#reserve">
            Reserve
          </a>
        </div>
      )}
    </main>
  );
}
