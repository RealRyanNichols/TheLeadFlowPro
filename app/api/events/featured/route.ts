import { NextResponse } from "next/server";
import { BUSINESS } from "@/lib/site/business";
import { EXTERNAL_LINKS } from "@/lib/site/external-links";
import { PAST_EVENT_COPY } from "@/lib/site/events";
import { getFeaturedEventState } from "@/lib/site/eventState.server";

// The featured event's marketing state for anything rendered outside this
// app: the standalone workshop subdomain reads it to decide between the
// registration view and the post-event view. Aggregate facts only: no
// registrations, no names, no addresses.
//
// Same CORS allowance as /api/events/availability. Never cached, because
// the whole point is the swap the moment the room closes.

export const dynamic = "force-dynamic";

export async function GET() {
  const headers = {
    "Cache-Control": "no-store",
    "Access-Control-Allow-Origin": new URL(EXTERNAL_LINKS.workshopSite).origin,
  };
  const state = await getFeaturedEventState();
  const site = BUSINESS.siteUrl;
  return NextResponse.json(
    {
      slug: state.event.slug,
      title: state.event.title,
      status: state.status,
      starts_at: state.when.isoStart,
      ends_at: state.when.isoEnd,
      timezone: state.event.timezone,
      date_label: state.when.dateLabel,
      time_label: state.when.timeRange,
      price_usd: state.priceUsd,
      seats: state.seats,
      seats_remaining: state.seatsRemaining,
      live_facts: state.live,
      registration_url: `${site}${state.event.registrationPath}`,
      next_event: state.next
        ? {
            slug: state.next.slug,
            title: state.next.title,
            starts_at: state.next.startsAt,
            registration_url: `${site}${state.next.registrationPath}`,
          }
        : null,
      past: {
        headline: PAST_EVENT_COPY.headline,
        body: PAST_EVENT_COPY.body,
        list_cta: PAST_EVENT_COPY.listCta,
        list_url: `${site}/events#next-workshop`,
        lesson_cta: PAST_EVENT_COPY.lessonCta,
        lesson_url: `${site}${PAST_EVENT_COPY.lessonPath}`,
      },
    },
    { headers },
  );
}
