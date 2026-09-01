import Link from "next/link";
import { ArrowRight, CalendarDays, Clock3, MapPin, Users } from "lucide-react";
import { formatWorkshopDate } from "@/lib/eventCommerce";

type EventRow = {
  slug: string;
  title: string;
  description: string | null;
  venue: string | null;
  city: string | null;
  starts_at: string | null;
  duration_minutes: number;
  price_usd: number;
  capacity: number;
};

export default function EventCard({ event }: { event: EventRow }) {
  return (
    <article className="card">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <p className="text-xs font-black uppercase tracking-[.18em] text-flow-400">Live working session</p>
          <h2 className="mt-2 text-2xl font-black text-[var(--heading)]">{event.title}</h2>
        </div>
        <span className="rounded-lg border border-yellow-400/40 bg-yellow-400/10 px-4 py-2 text-xl font-black text-yellow-300">
          {"$"}{Number(event.price_usd)}
        </span>
      </div>
      {event.description && <p className="mt-4 max-w-3xl text-[var(--text)]">{event.description}</p>}
      <div className="mt-5 grid gap-3 text-sm sm:grid-cols-2 lg:grid-cols-4">
        <span className="flex items-center gap-2"><CalendarDays size={18} />{formatWorkshopDate(event.starts_at)}</span>
        <span className="flex items-center gap-2"><Clock3 size={18} />{event.duration_minutes} minutes</span>
        <span className="flex items-center gap-2"><Users size={18} />{event.capacity} paid seats</span>
        <span className="flex items-center gap-2"><MapPin size={18} />{event.city || "Longview, Texas"}</span>
      </div>
      <div className="mt-6">
        <Link href={"/events/" + event.slug} className="btn-primary">
          See the Workshop
          <ArrowRight aria-hidden="true" />
        </Link>
      </div>
    </article>
  );
}
