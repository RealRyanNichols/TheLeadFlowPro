import Link from "next/link";
import { ArrowRight, CalendarDays } from "lucide-react";
import { PAST_EVENT_COPY, type FeaturedEventState } from "@/lib/site/events";
import { usd } from "@/lib/site/prices";

// The "03 / DO" card in the homepage path grid.

export default function FeaturedEventPathCard({ state }: { state: FeaturedEventState }) {
  const { event, when, status } = state;
  if (status === "past") {
    return (
      <article>
        <span className="lf-path-number">03 / DO</span>
        <CalendarDays aria-hidden="true" />
        <h3>{PAST_EVENT_COPY.pathCardTitle}</h3>
        <p>{PAST_EVENT_COPY.pathCardBody}</p>
        <Link href="#next-workshop">
          {PAST_EVENT_COPY.listCta} <ArrowRight size={18} aria-hidden="true" />
        </Link>
        <small>
          Want to start today?{" "}
          <Link href={PAST_EVENT_COPY.lessonPath}>{PAST_EVENT_COPY.lessonCta}</Link>
        </small>
      </article>
    );
  }
  const soldOut = status === "sold_out";
  return (
    <article>
      <span className="lf-path-number">03 / DO</span>
      <CalendarDays aria-hidden="true" />
      <h3>One evening. Your laptop. Real help.</h3>
      <p>
        Bring a follow-up, content, or admin task to the {when.shortDate} workshop. Build a process
        you can repeat the next day.
      </p>
      <Link href={soldOut ? "/events" : state.detailsHref}>
        {soldOut ? "Sold out. Join the list for the next date" : "See the Longview workshop"}{" "}
        <ArrowRight size={18} aria-hidden="true" />
      </Link>
      <small>
        {when.timeRange} · {usd(state.priceUsd)} · {state.seats} paid seats
        {soldOut ? " · sold out" : ""}
      </small>
    </article>
  );
}
