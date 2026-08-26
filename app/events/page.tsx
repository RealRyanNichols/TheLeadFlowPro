import Image from "next/image";
import Link from "next/link";
import { ArrowRight, CalendarDays, Laptop, MapPin } from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import {
  EVENT_PUBLIC_FIELDS,
  type EventAvailability,
  type EventRow,
} from "@/lib/events";
import EventCard from "./EventCard";
import WorkshopShowcase from "./WorkshopShowcase";
import styles from "./events.module.css";

export const dynamic = "force-dynamic";

export const metadata = {
  title: "Events & Workshops | The LeadFlow Pro",
  description:
    "Hands-on AI workshops for East Texas business owners, live in Longview. Ten seats, ninety minutes, bring your laptop, build something real. Plus on-site training for your team.",
  alternates: { canonical: "https://www.theleadflowpro.com/events" },
  openGraph: {
    title: "Events & Workshops | The LeadFlow Pro",
    description:
      "Hands-on AI workshops for East Texas business owners, live in Longview. Ten seats, ninety minutes, bring your laptop, build something real.",
    url: "https://www.theleadflowpro.com/events",
    siteName: "The LeadFlow Pro",
    type: "website",
    images: [{ url: "/og/events/chatgpt-for-business-owners-longview.jpg", width: 1200, height: 630 }],
  },
};

const FOUNDING_SLUG = "chatgpt-for-business-owners-longview";

export default async function EventsPage() {
  const supabase = await createClient();
  const { data: events } = await supabase
    .from("events")
    .select(EVENT_PUBLIC_FIELDS)
    .eq("is_published", true)
    .order("starts_at", { ascending: true });

  const published = (events ?? []) as unknown as EventRow[];
  const upcoming = published.filter(
    (event) => !event.starts_at || new Date(event.starts_at) > new Date(),
  );
  const founding = published.find((event) => event.slug === FOUNDING_SLUG) ?? null;

  let availability: EventAvailability | null = null;
  if (founding) {
    const { data } = await supabase.rpc("event_availability", { p_slug: founding.slug });
    availability = ((Array.isArray(data) ? data[0] : data) as EventAvailability | null) ?? null;
  }

  return (
    <main className={`cb-page ${styles.page}`}>
      {/* -------------------------------------------------------------- hero --- */}
      <section className="cb-hero">
        <div className="cb-shell cb-hero-layout">
          <div className="cb-hero-copy">
            <p className="cb-eyebrow">East Texas workshops</p>
            <h1 className="cb-h1">
              Live events.
              <em>Real answers.</em>
            </h1>
            <p className="cb-hero-lead">
              Bring your laptop and your real business. Ryan will show you how to use AI to
              build something useful, then help you identify the next move that matters.
            </p>
            <div className={styles.heroFacts}>
              <span>
                <MapPin aria-hidden="true" />
                Longview, Texas
              </span>
              <span>
                <Laptop aria-hidden="true" />
                Hands-on work
              </span>
              <span>
                <CalendarDays aria-hidden="true" />
                Small rooms, real coaching
              </span>
            </div>
            <div className="cb-actions">
              <a className="cb-btn cb-btn--primary" href="#founding-workshop">
                See the Founding Workshop
                <ArrowRight aria-hidden="true" />
              </a>
              <a className="cb-btn cb-btn--ghost" href="#upcoming-events">
                Upcoming Dates
              </a>
            </div>
          </div>

          <figure className={`cb-hero-visual ${styles.operatorVisual}`}>
            <Image
              src="/images/workshops/chatgpt-workshop-stop-watching-ai-4x5.webp"
              alt="Hands-on ChatGPT workshop in Longview from The LeadFlow Pro"
              width={1003}
              height={1568}
              priority
              sizes="(max-width: 900px) 92vw, 460px"
            />
            <figcaption>
              <span>Ryan Nichols, instructor</span>
              <strong>Ten seats. Ninety minutes. Build something real.</strong>
            </figcaption>
          </figure>
        </div>
      </section>

      {/* ------------------------------------------- founding workshop deep --- */}
      <WorkshopShowcase event={founding} availability={availability} />

      {/* --------------------------------------------------------- schedule --- */}
      <section id="upcoming-events" className="cb-band cb-band--tint" tabIndex={-1}>
        <div className="cb-shell">
          <div className={styles.eventHeading}>
            <div>
              <p className="cb-eyebrow">Upcoming schedule</p>
              <h2 className="cb-h2">Reserve your place in the room.</h2>
            </div>
            <p className="cb-lead">
              Dates open here as they are confirmed. Ten paid seats per workshop, first come,
              first served — a seat is confirmed only after payment.
            </p>
          </div>

          <div className={styles.eventList}>
            {upcoming.length === 0 && (
              <div className={styles.emptyState}>
                <CalendarDays aria-hidden="true" />
                <p className="cb-eyebrow">Founding date being finalized</p>
                <h2>The founding class opens to this list first.</h2>
                <p>
                  The founding ChatGPT workshop above is being scheduled now. Book a call and
                  Ryan will make sure you get first pick of the ten seats before the date is
                  announced anywhere else.
                </p>
                <Link href="/book?interest=workshop_founding" className="cb-btn cb-btn--primary">
                  Get First Pick of the Seats
                  <ArrowRight aria-hidden="true" />
                </Link>
              </div>
            )}
            {upcoming.map((event) => (
              <EventCard key={event.id} event={event} />
            ))}
          </div>
        </div>
      </section>

      {/* ---------------------------------------------------------- cadence --- */}
      <section className="cb-band cb-band--ink">
        <div className="cb-shell">
          <div className={styles.eventHeading}>
            <div>
              <p className="cb-eyebrow">Where this is going</p>
              <h2 className="cb-h2">One founding class. Then a running calendar.</h2>
            </div>
            <p className="cb-lead">
              The founding workshop sets the format. After it runs, workshops move to a
              recurring Tuesday and Thursday rhythm — same room, same hands-on format,
              different builds.
            </p>
          </div>
          <div className={styles.cadenceGrid}>
            <div className={styles.cadenceCard}>
              <h3>1 · The founding class</h3>
              <p>
                Ten founding seats at the founding price. ChatGPT only, beginner-friendly, and
                deep enough for real operators. This is the cheapest this room will ever be.
              </p>
            </div>
            <div className={styles.cadenceCard}>
              <h3>2 · The recurring workshops</h3>
              <p>
                Tuesday and Thursday sessions open after the founding class proves the format.
                New builds, new hot seats, same ten-seat cap.
              </p>
            </div>
            <div className={styles.cadenceCard}>
              <h3>3 · The advanced room</h3>
              <p>
                A separate advanced workshop on Claude, Claude Code, and agent tooling comes
                later, at a higher price, for owners ready to go past ChatGPT.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* --------------------------------------------------- team training --- */}
      <section className="cb-band">
        <div className="cb-shell">
          <div className={styles.trainingGrid}>
            <div>
              <p className="cb-eyebrow">Bring the workshop to your company</p>
              <h2 className="cb-h2">Train the team on the system you actually need.</h2>
            </div>
            <div>
              <p className="cb-lead">
                Ryan comes on site, trains your team on the full stack, and works through the
                company&apos;s real system with you. On-site training is scoped per company.
              </p>
              <Link href="/book?interest=training_platform" className="cb-btn cb-btn--ghost">
                Ask About On-Site Training
                <ArrowRight aria-hidden="true" />
              </Link>
            </div>
          </div>
        </div>
      </section>
    </main>
  );
}
