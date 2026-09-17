import Link from "next/link";
import { ArrowRight } from "lucide-react";
import { PAST_EVENT_COPY, type FeaturedEventState } from "@/lib/site/events";

// The strip above the homepage hero. Three states, one config.

export default function FeaturedEventBanner({ state }: { state: FeaturedEventState }) {
  const { when, status } = state;
  if (status === "past") {
    return (
      <Link className="lf-announcement" href="#next-workshop">
        {PAST_EVENT_COPY.announcement} <span>{PAST_EVENT_COPY.announcementDetail}</span>
        <ArrowRight size={17} aria-hidden="true" />
      </Link>
    );
  }
  if (status === "sold_out") {
    return (
      <Link className="lf-announcement" href="#next-workshop">
        LIVE IN LONGVIEW · {when.monthUpper} {when.day} · SOLD OUT{" "}
        <span>Join the list for the next date.</span>
        <ArrowRight size={17} aria-hidden="true" />
      </Link>
    );
  }
  return (
    <a className="lf-announcement" href={state.detailsHref}>
      LIVE IN LONGVIEW · {when.monthUpper} {when.day}{" "}
      <span>One evening. One useful business workflow.</span>
      <ArrowRight size={17} aria-hidden="true" />
    </a>
  );
}
