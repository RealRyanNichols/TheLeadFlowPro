import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { ArrowLeft, Mail, Phone } from "lucide-react";
import { getHqSession } from "@/lib/hq/session";
import { getLead, listConnections, listEvents, listMessages } from "@/lib/hq/server";
import { scoreLead } from "@/lib/hq/score";
import { formatPhone } from "@/lib/hq/phone";
import { ago } from "@/lib/hq/time";
import FollowUpPicker from "../../_components/FollowUpPicker";
import LeadNotes from "../../_components/LeadNotes";
import LogTouch from "../../_components/LogTouch";
import MessageComposer from "../../_components/MessageComposer";
import { SOURCE_LABEL, STATUS_LABEL, STATUS_TONE } from "../../_components/labels";

// One lead, everything about them. The contact card at the top is built to
// be tapped on a phone: the number dials, the address opens mail. Below it,
// the whole history in one column so nothing about this person is anywhere
// else.

export const dynamic = "force-dynamic";

const EVENT_LABEL: Record<string, string> = {
  lead_in: "Lead arrived",
  text_out: "Text sent",
  email_out: "Email sent",
  text_in: "Text received",
  email_in: "Email received",
  call: "Call",
  note: "Note",
  status: "Status",
  alert: "Alert",
  brief: "Brief",
  report: "Report",
  content: "Content",
  follow_up: "Follow-up",
  system: "System",
  plugin: "Assistant",
};

type TimelineItem = { id: string; at: string; title: string; body: string; meta: string };

export default async function HqLeadPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const session = await getHqSession();
  if (!session) redirect(`/login?next=/hq/leads/${id}`);
  if (!session.workspace) redirect("/hq/start");

  const ws = session.workspace;
  const lead = await getLead(session.db, ws.id, id);
  if (!lead) notFound();

  const now = new Date();
  const [events, messages, connections] = await Promise.all([
    listEvents(session.db, ws.id, { leadId: lead.id, limit: 200 }),
    listMessages(session.db, ws.id, { leadId: lead.id, limit: 200 }),
    listConnections(session.db, ws.id),
  ]);

  const smsConnected = connections.some((c) => (c.kind === "openphone" || c.kind === "twilio") && c.status === "connected");
  const scored = scoreLead(lead, now);

  const timeline: TimelineItem[] = [
    ...events.map((e) => ({
      id: `event-${e.id}`,
      at: e.created_at,
      title: EVENT_LABEL[e.kind] ?? e.kind,
      body: e.detail,
      meta: e.actor.startsWith("owner:") ? "You" : e.actor,
    })),
    ...messages.map((m) => ({
      id: `message-${m.id}`,
      at: m.sent_at ?? m.created_at,
      title: `${m.direction === "in" ? "Received" : "Sent"} ${m.channel === "sms" ? "text" : "email"}${m.status === "draft" ? " (draft, not sent)" : m.status === "failed" ? " (failed)" : ""}`,
      body: m.subject ? `${m.subject}\n${m.body}` : m.body,
      meta: m.created_by.startsWith("owner:") ? "You" : m.created_by,
    })),
  ].sort((a, b) => b.at.localeCompare(a.at));

  return (
    <main className="mx-auto max-w-4xl px-4 py-8">
      <Link href="/hq/leads" className="inline-flex min-h-[44px] items-center gap-2 text-sm font-bold text-[var(--blue)] hover:underline">
        <ArrowLeft aria-hidden="true" className="h-4 w-4" /> Back to leads
      </Link>

      <header className="mt-3 flex flex-wrap items-start justify-between gap-3">
        <div className="min-w-0">
          <h1 className="text-2xl font-black tracking-tight text-[var(--heading)] sm:text-3xl">{lead.name || "No name given"}</h1>
          <p className="mt-2 flex flex-wrap items-center gap-x-2 gap-y-1 text-sm text-[var(--muted)]">
            <span>{SOURCE_LABEL[lead.source] ?? lead.source}</span>
            {lead.source_detail && (
              <>
                <span aria-hidden="true">·</span>
                <span>{lead.source_detail}</span>
              </>
            )}
            <span aria-hidden="true">·</span>
            <span>Arrived {ago(new Date(lead.created_at), now)}</span>
          </p>
        </div>
        <span className="hq-pill" data-tone={STATUS_TONE[lead.status]}>
          {STATUS_LABEL[lead.status]}
        </span>
      </header>

      <section className="hq-card mt-5">
        <div className="flex flex-wrap gap-2">
          {lead.phone ? (
            <a href={`tel:${lead.phone}`} className="pro-buy-button">
              <Phone aria-hidden="true" className="h-4 w-4" /> Call {formatPhone(lead.phone)}
            </a>
          ) : (
            <p className="hq-note">No phone number on this lead.</p>
          )}
          {lead.email && (
            <a href={`mailto:${lead.email}`} className="hq-btn">
              <Mail aria-hidden="true" className="h-4 w-4" /> {lead.email}
            </a>
          )}
        </div>

        <dl className="mt-4 grid gap-3 sm:grid-cols-3">
          <div>
            <dt className="hq-eyebrow">Call priority</dt>
            <dd className="mt-1 text-sm font-bold text-[var(--heading)]">
              {scored.score > 0 ? `${scored.score} of 100` : "Closed, nothing to do"}
            </dd>
            {scored.reasons.length > 0 && <dd className="mt-1 text-xs text-[var(--muted)]">{scored.reasons.join(", ")}</dd>}
          </div>
          <div>
            <dt className="hq-eyebrow">What they want</dt>
            <dd className="mt-1 text-sm text-[var(--text)]">{lead.service || "Not said"}</dd>
          </div>
          <div>
            <dt className="hq-eyebrow">Job value</dt>
            <dd className="mt-1 text-sm text-[var(--text)]">
              {lead.value_cents ? `$${Math.round(lead.value_cents / 100).toLocaleString("en-US")}` : "Not set"}
            </dd>
          </div>
        </dl>

        {lead.message && (
          <div className="mt-4 rounded-xl border border-[var(--line)] bg-[var(--fill-2)] p-4">
            <p className="hq-eyebrow">What they said</p>
            <p className="mt-2 whitespace-pre-wrap text-sm leading-relaxed text-[var(--text)]">{lead.message}</p>
          </div>
        )}

        <div className="mt-4 border-t border-[var(--line)] pt-4">
          <LogTouch
            leadId={lead.id}
            outcomes={["contacted", "no_answer", "quoted", "booked", "won", "lost", "spam"]}
            withDetails
            heading="What happened"
          />
        </div>
      </section>

      <div className="mt-5 grid gap-5">
        <FollowUpPicker leadId={lead.id} current={lead.next_follow_up_at} />

        <MessageComposer
          leadId={lead.id}
          leadName={lead.name}
          hasPhone={!!lead.phone}
          hasEmail={!!lead.email}
          consentSms={lead.consent_sms}
          unsubscribed={!!lead.unsubscribed_at}
          smsConnected={smsConnected}
        />

        <LeadNotes leadId={lead.id} notes={lead.notes ?? ""} consentSms={lead.consent_sms} hasPhone={!!lead.phone} />

        <section className="hq-card">
          <h2 className="text-lg font-black text-[var(--heading)]">History</h2>
          {timeline.length === 0 ? (
            <p className="mt-2 text-sm text-[var(--muted)]">Nothing has happened on this lead yet.</p>
          ) : (
            <ol className="mt-2">
              {timeline.map((item) => (
                <li key={item.id} className="hq-row">
                  <div className="flex flex-wrap items-baseline justify-between gap-2">
                    <span className="text-sm font-black text-[var(--heading)]">{item.title}</span>
                    <span className="text-xs text-[var(--muted)]">
                      {ago(new Date(item.at), now)} · {item.meta}
                    </span>
                  </div>
                  {item.body && <p className="mt-1 whitespace-pre-wrap text-sm leading-relaxed text-[var(--text)]">{item.body}</p>}
                </li>
              ))}
            </ol>
          )}
        </section>
      </div>
    </main>
  );
}
