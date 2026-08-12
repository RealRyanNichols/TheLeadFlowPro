import { createClient } from "@/lib/supabase/server";
import EventCard from "./EventCard";

export const metadata = {
  title: "Events & Workshops | The LeadFlow Pro",
  description:
    "Live seminars and hands-on workshops in East Texas: learn to build and own your business platform with AI. Plus on-site training for your team.",
};

export default async function EventsPage() {
  const supabase = await createClient();
  const { data: events } = await supabase
    .from("events")
    .select("*")
    .eq("is_published", true)
    .order("starts_at", { ascending: true });

  const upcoming = (events ?? []).filter(
    (e) => !e.starts_at || new Date(e.starts_at) > new Date()
  );

  return (
    <section className="mx-auto max-w-4xl px-4 py-20">
      <h1 className="text-center text-4xl font-black text-[var(--heading)] sm:text-5xl">
        Live events. <span className="text-flow-400">Real answers.</span>
      </h1>
      <p className="mx-auto mt-4 max-w-2xl text-center text-lg text-[var(--text)]">
        Seminars and hands-on workshops in East Texas. Bring your laptop and your
        questions. Leave knowing exactly how to own your platform instead of
        renting it.
      </p>

      <div className="mt-12 space-y-6">
        {upcoming.length === 0 && (
          <div className="card text-center">
            <h2 className="text-xl font-bold text-[var(--heading)]">
              Next event dates coming soon
            </h2>
            <p className="mt-2 text-[var(--muted)]">
              Workshops are being scheduled now across East Texas. Book a call and
              I will make sure you hear about the next one first.
            </p>
            <a href="/book" className="btn-primary mt-6">
              Book a Call
            </a>
          </div>
        )}
        {upcoming.map((e) => (
          <EventCard key={e.id} event={e} />
        ))}
      </div>

      <div className="card mt-12 text-center">
        <h2 className="text-xl font-bold text-[var(--heading)]">
          Want this taught at YOUR business?
        </h2>
        <p className="mt-2 text-[var(--muted)]">
          I come on site, train your team on the full stack, and we build your
          actual system together. Scoped per company.
        </p>
        <a href="/book?interest=done_for_you" className="btn-ghost mt-6">
          Ask About On-Site Training
        </a>
      </div>
    </section>
  );
}
