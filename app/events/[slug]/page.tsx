import type { Metadata } from "next";
import { notFound } from "next/navigation";
import {
  CalendarDays,
  Clock3,
  MapPin,
  Users,
  ArrowLeft,
  Check,
} from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import {
  EVENT_PUBLIC_FIELDS,
  DEFAULT_CANCELLATION_POLICY,
  DEFAULT_RECORDING_NOTICE,
  formatEventWhen,
  priceUsd,
  type EventAvailability,
  type EventRow,
} from "@/lib/events";
import { missingEventPaymentConfig } from "@/lib/eventPayments";
import WorkshopRegister from "./WorkshopRegister";

export const dynamic = "force-dynamic";
export const metadata: Metadata = {
  title: "Workshop registration | The LeadFlow Pro",
  robots: { index: false, follow: true },
  referrer: "no-referrer",
};

export default async function WorkshopPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const supabase = await createClient();
  const { data } = await supabase
    .from("events")
    .select(EVENT_PUBLIC_FIELDS)
    .eq("slug", slug)
    .eq("is_published", true)
    .maybeSingle();
  const event = data as EventRow | null;
  if (!event) notFound();
  const { data: status, error } = await supabase.rpc("event_availability", {
    p_slug: slug,
  });
  const availability = (
    Array.isArray(status) ? status[0] : status
  ) as EventAvailability | null;
  const when = formatEventWhen(event);
  const price = priceUsd(event);
  const registrationOpen =
    missingEventPaymentConfig(process.env).length === 0 &&
    !error &&
    Boolean(availability?.registration_open) &&
    !event.registration_closed &&
    event.date_confirmed &&
    Boolean(
      event.starts_at && new Date(event.starts_at).getTime() > Date.now(),
    );
  const workshopUrl = "https://workshop.theleadflowpro.com/";
  return (
    <main className="lf-home lf-event-registration">
      <div className="lf-shell lf-event-shell">
        <a className="lf-text-link" href={workshopUrl}>
          <ArrowLeft size={17} aria-hidden="true" /> Workshop details
        </a>
        <div className="lf-event-grid">
          <section>
            <p className="lf-eyebrow">LIVE BUSINESS WORKSHOP</p>
            <h1>{event.title}</h1>
            <p className="lf-intro">
              Bring one real task. Build a process you can use again. Beginners
              welcome.
            </p>
            <ul className="lf-event-facts">
              <li>
                <CalendarDays aria-hidden="true" />
                <div>
                  <strong>{when.dateLabel}</strong>
                  <span>
                    {event.date_confirmed
                      ? "Confirmed date"
                      : "Date being finalized"}
                  </span>
                </div>
              </li>
              <li>
                <Clock3 aria-hidden="true" />
                <div>
                  <strong>{when.timeLabel}</strong>
                  {event.clinic_enabled && (
                    <span>
                      Optional 30-minute business clinic immediately after
                      class, included.
                    </span>
                  )}
                </div>
              </li>
              <li>
                <MapPin aria-hidden="true" />
                <div>
                  <strong>{event.city || "Longview, Texas"}</strong>
                  <span>
                    {event.address_visibility === "public"
                      ? event.address_line
                      : "Exact arrival instructions are provided after payment."}
                  </span>
                </div>
              </li>
              <li>
                <Users aria-hidden="true" />
                <div>
                  <strong>
                    {event.capacity
                      ? `${event.capacity} paid seats total`
                      : "Small-group workshop"}
                  </strong>
                  <span>
                    {error || !availability
                      ? "Live availability could not be checked. Please try again."
                      : availability.sold_out
                        ? "This session is full."
                        : `${availability.seats_remaining ?? "Limited"} available. A seat is confirmed after payment.`}
                  </span>
                </div>
              </li>
            </ul>
            <div className="lf-event-included">
              <h2>What your ticket includes</h2>
              {[
                "A live, guided working session with Ryan",
                "One repeatable process for your own task",
                "Preparation checklist and private arrival details",
                "A written next step to use after the workshop",
              ].map((text) => (
                <p key={text}>
                  <Check size={17} aria-hidden="true" />
                  {text}
                </p>
              ))}
              <p>
                Bring your laptop, charger, and access to your own ChatGPT
                account. Use fictional or anonymized customer details.
              </p>
            </div>
            <details className="lf-event-policy" open>
              <summary>Ticket and cancellation details</summary>
              <p>{event.cancellation_policy || DEFAULT_CANCELLATION_POLICY}</p>
              <p>
                One ticket admits one person. The workshop stands on its own.
                There is no obligation to purchase implementation help or
                another service.
              </p>
              <p>
                Questions before paying?{" "}
                <a href="mailto:hello@theleadflowpro.com">
                  hello@theleadflowpro.com
                </a>
              </p>
            </details>
            <details className="lf-event-policy">
              <summary>Recording and privacy</summary>
              <p>{event.recording_notice || DEFAULT_RECORDING_NOTICE}</p>
            </details>
          </section>
          <section className="lf-ticket-panel" id="reserve">
            <div className="lf-ticket-price">
              <div>
                <p className="lf-eyebrow">ONE PERSON / ONE WORKSHOP</p>
                <h2>${price}</h2>
              </div>
              <span>
                One-time payment
                <br />
                No subscription
              </span>
            </div>
            <p>
              {registrationOpen
                ? "Your details first. Then secure payment through Stripe."
                : availability?.sold_out
                  ? "This session is full. Join the workshop list for the next opening."
                  : "Paid registration is being prepared. Join the first-access list for the opening announcement."}
            </p>
            <WorkshopRegister
              event={{
                id: event.id,
                slug: event.slug,
                title: event.title,
                price_usd: price,
                clinic_enabled: event.clinic_enabled,
              }}
              registrationOpen={registrationOpen}
              soldOut={Boolean(availability?.sold_out)}
            />
            {!registrationOpen && (
              <a className="lf-button" href={`${workshopUrl}#priority-access`}>
                Get registration updates
              </a>
            )}
          </section>
        </div>
      </div>
    </main>
  );
}
