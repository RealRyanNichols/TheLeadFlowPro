import Image from "next/image";
import Link from "next/link";
import { ArrowRight, CalendarDays, Laptop, MapPin } from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import EventCard from "./EventCard";
import styles from "./events.module.css";

export const metadata = {
  title: "Events & Workshops | The LeadFlow Pro",
  description:
    "Live seminars and hands-on workshops in East Texas: learn to build and own your business platform with AI. Plus on-site training for your team.",
};

export default async function EventsPage() {
  const supabase = await createClient();
  const { data: events } = await supabase
    .from("workshop_events")
    .select("*")
    .eq("is_published", true)
    .eq("sales_status", "open")
    .order("starts_at", { ascending: true });

  const upcoming = (events ?? []).filter(
    (event) => !event.starts_at || new Date(event.starts_at) > new Date(),
  );

  return (
    <main className={`cb-page ${styles.page}`}>
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
                East Texas
              </span>
              <span>
                <Laptop aria-hidden="true" />
                Hands-on work
              </span>
            </div>
            <div className="cb-actions">
              <a className="cb-btn cb-btn--primary" href="#upcoming-events">
                See Upcoming Events
                <ArrowRight aria-hidden="true" />
              </a>
              <Link className="cb-btn cb-btn--ghost" href="/book?interest=training_platform">
                Ask About Team Training
              </Link>
            </div>
          </div>

          <figure className={`cb-hero-visual ${styles.operatorVisual}`}>
            <Image
              src="/images/workshops/chatgpt-workshop-stop-watching-ai-4x5-v2.webp"
              alt="Hands-on ChatGPT workshop in Longview from The LeadFlow Pro"
              width={1440}
              height={1800}
              priority
              sizes="(max-width: 900px) 100vw, 42vw"
            />
            <figcaption>
              <span>Ryan Nichols, instructor</span>
              <strong>Ten seats. Ninety minutes. Build something real.</strong>
            </figcaption>
          </figure>
        </div>
      </section>

      <section id="upcoming-events" className="cb-band" tabIndex={-1}>
        <div className="cb-shell">
          <div className={styles.eventHeading}>
            <div>
              <p className="cb-eyebrow">Upcoming schedule</p>
              <h2 className="cb-h2">Reserve your place in the room.</h2>
            </div>
            <p className="cb-lead">
              Published events appear here as dates are confirmed. Registration and payment
              behavior stay attached to each event card.
            </p>
          </div>

          <div className={styles.eventList}>
            {upcoming.length === 0 && (
              <div className={styles.emptyState}>
                <CalendarDays aria-hidden="true" />
                <p className="cb-eyebrow">Dates in progress</p>
                <h2>Next event dates coming soon.</h2>
                <p>
                  Workshops are being scheduled across East Texas. Book a call and Ryan will
                  make sure you hear about the next one first.
                </p>
                <Link href="/book" className="cb-btn cb-btn--primary">
                  Book a Call
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

      <section className="cb-band cb-band--ink">
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
