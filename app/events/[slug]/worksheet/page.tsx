import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { workshopKit } from "@/lib/site/workshopKit";
import { siteEvent, eventWhen } from "@/lib/site/events";
import { BUSINESS } from "@/lib/site/business";

// The worksheet the room works from, printed from the event's kit. Unlisted
// and noindex: the link goes to paid attendees on their private page and in
// the same-night follow-up. It carries no attendee data.

export const metadata: Metadata = {
  title: "Workshop worksheet | The LeadFlow Pro",
  robots: { index: false, follow: false },
  referrer: "no-referrer",
};

export default async function WorksheetPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const kit = workshopKit(slug);
  const event = siteEvent(slug);
  if (!kit || !event || kit.worksheet.sections.length === 0) notFound();
  const when = eventWhen(event);
  return (
    <main className="cb-page">
      <section className="cb-band">
        <div className="cb-shell" style={{ maxWidth: 760 }}>
          <p className="cb-eyebrow">{event.kicker}</p>
          <h1 className="cb-h2">{kit.worksheet.title}</h1>
          <p className="cb-lead">
            {event.title}. {when.dateLabel}. {kit.worksheet.intro}
          </p>
          <div className="cb-actions noprint" style={{ marginTop: 16 }}>
            <a className="cb-btn cb-btn--ghost" href={`/events/${slug}`}>
              Workshop details
            </a>
          </div>
          {kit.worksheet.sections.map((s, i) => (
            <section key={s.heading} style={{ marginTop: 28, breakInside: "avoid" }}>
              <h2 style={{ fontSize: 20, margin: "0 0 4px" }}>
                {i + 1}. {s.heading}
              </h2>
              <p style={{ margin: "0 0 10px", color: "var(--muted)" }}>{s.prompt}</p>
              {Array.from({ length: s.lines }, (_, j) => (
                <div key={j} style={{ borderBottom: "1px solid var(--line-strong)", height: 32 }} aria-hidden="true" />
              ))}
            </section>
          ))}
          <p style={{ marginTop: 32, fontSize: 13, color: "var(--muted)" }}>
            {BUSINESS.name}. {BUSINESS.email.hello}. {BUSINESS.phone.display}. Use fictional or anonymized customer details on this sheet.
          </p>
        </div>
      </section>
    </main>
  );
}
