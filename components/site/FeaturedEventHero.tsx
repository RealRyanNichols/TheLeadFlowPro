import Image from "next/image";
import Link from "next/link";
import { ArrowRight } from "lucide-react";
import { PAST_EVENT_COPY, type FeaturedEventState } from "@/lib/site/events";
import { usd } from "@/lib/site/prices";
import WorkshopListForm from "./WorkshopListForm";

// The homepage hero card. While the workshop is on it sells the seat; once
// the room has closed it becomes the "next workshop" list, with the free
// lesson as the thing to do today. The card keeps its id so the banner and
// the "03 / DO" card can point at it in every state.

const PAST_ARTWORK = {
  src: "/images/workshops/chatgpt-workshop-stop-watching-ai-4x5.webp",
  alt: "Hands-on ChatGPT workshop in Longview from The LeadFlow Pro",
  width: 1003,
  height: 1568,
};

export default function FeaturedEventHero({ state }: { state: FeaturedEventState }) {
  const { event, when, status } = state;

  if (status === "past") {
    return (
      <div className="lf-hero-feature" id="next-workshop">
        <figure className="lf-workshop-creative lf-workshop-creative--past">
          <Link href="/events" aria-label="See upcoming workshops">
            <Image
              src={PAST_ARTWORK.src}
              alt={PAST_ARTWORK.alt}
              width={PAST_ARTWORK.width}
              height={PAST_ARTWORK.height}
              priority
              sizes="(max-width: 800px) 94vw, 48vw"
            />
          </Link>
        </figure>
        <div className="lf-workshop-booking lf-workshop-booking--past">
          <div className="lf-workshop-booking-copy">
            <span>{PAST_EVENT_COPY.kicker.toUpperCase()}</span>
            <strong>{PAST_EVENT_COPY.headline}</strong>
            <p>{PAST_EVENT_COPY.body}</p>
          </div>
          <WorkshopListForm eventSlug={event.slug} placement="home_hero" />
          <p className="lf-workshop-booking-note">
            <Link href={PAST_EVENT_COPY.lessonPath}>{PAST_EVENT_COPY.lessonCta}</Link>
          </p>
        </div>
      </div>
    );
  }

  const soldOut = status === "sold_out";
  return (
    <div className="lf-hero-feature" id="next-workshop">
      <figure className="lf-workshop-creative">
        <a href={state.detailsHref} aria-label={`Explore the ${when.shortDate} ChatGPT workshop in Longview`}>
          <Image
            src={event.artwork.src}
            alt={event.artwork.alt}
            width={event.artwork.width}
            height={event.artwork.height}
            priority
            sizes="(max-width: 800px) 94vw, 48vw"
          />
        </a>
      </figure>
      <div className="lf-workshop-booking">
        <time className="lf-workshop-date" dateTime={when.isoStart} aria-label={when.dateLabel}>
          <span>{when.monthUpper}</span>
          <strong>{when.day}</strong>
          <small>{when.weekdayUpper}</small>
        </time>
        <div className="lf-workshop-booking-copy">
          <span>{event.kicker.toUpperCase()}</span>
          <strong>Live in {event.city}</strong>
          <p>
            {when.timeRange}
            <br />
            <b>{usd(state.priceUsd)} per attendee</b>
            {soldOut ? (
              <>
                <br />
                <b>Sold out</b>
              </>
            ) : state.seatsRemaining !== null ? (
              <>
                <br />
                {state.seatsRemaining} of {state.seats} seats open
              </>
            ) : null}
          </p>
        </div>
        {soldOut ? (
          <Link className="lf-workshop-seat" href="/events">
            Join the list for the next date <ArrowRight size={21} aria-hidden="true" />
          </Link>
        ) : (
          <Link className="lf-workshop-seat" href={state.reserveHref} data-cta="workshop_reserve" data-cta-placement="home_hero">
            Reserve my seat <ArrowRight size={21} aria-hidden="true" />
          </Link>
        )}
        <p className="lf-workshop-booking-note">{event.bringLine}</p>
      </div>
    </div>
  );
}
