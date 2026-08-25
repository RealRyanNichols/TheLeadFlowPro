import Link from "next/link";
import { ArrowRight } from "lucide-react";

// One upcoming event on /events. Registration and payment live on the event's
// own funnel page, which carries the consent language, the live seat count,
// and the capacity checks — this card just gets people there.

type EventRow = {
  id: string;
  slug: string;
  title: string;
  subtitle?: string | null;
  description: string | null;
  venue: string | null;
  city: string | null;
  starts_at: string | null;
  duration_minutes: number | null;
  price_usd: number;
  capacity: number | null;
  date_confirmed?: boolean | null;
};

export default function EventCard({ event }: { event: EventRow }) {
  const when = event.starts_at
    ? new Date(event.starts_at).toLocaleString("en-US", {
        weekday: "long",
        month: "long",
        day: "numeric",
        hour: "numeric",
        minute: "2-digit",
        timeZone: "America/Chicago",
      }) + (event.date_confirmed ? "" : " (date being finalized)")
    : "Date being finalized";

  return (
    <div className="card">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h3 className="text-xl font-bold text-[var(--heading)]">{event.title}</h3>
          <p className="mt-1 text-sm text-flow-400">
            {when}
            {event.venue && ` · ${event.venue}`}
            {event.city && `, ${event.city}`}
          </p>
        </div>
        <span className="rounded-lg border border-flow-600/30 border-l-4 bg-flow-600/10 px-3 py-1.5 text-sm font-black text-flow-400">
          {Number(event.price_usd) > 0 ? `$${Number(event.price_usd)}` : "FREE"}
        </span>
      </div>
      {(event.subtitle || event.description) && (
        <p className="mt-3 text-sm text-[var(--text)]">
          {event.subtitle ?? event.description}
        </p>
      )}
      <div className="mt-4 flex flex-wrap items-center gap-3">
        <Link href={`/events/${event.slug}`} className="btn-primary">
          See Details &amp; Reserve a Seat
          <ArrowRight aria-hidden="true" className="h-4 w-4" />
        </Link>
        {event.capacity != null && (
          <span className="text-xs font-bold uppercase tracking-wide text-[var(--muted)]">
            {event.capacity} seats · first come, first served
          </span>
        )}
      </div>
    </div>
  );
}
