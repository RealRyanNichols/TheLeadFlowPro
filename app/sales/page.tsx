import { createClient } from "@/lib/supabase/server";
import TodayQueue from "./TodayQueue";
import { OPEN_STATUSES, type InboundSignals, type QueueLead } from "@/lib/salesQueue";

// The home screen of the sales desk. It answers one question: who do I touch
// right now, and what do I do about it. The full lead table moved to
// /admin/sales/pipeline, which is where you go to browse rather than to work.

export const metadata = { title: "Today | LeadFlow Pro Sales Desk" };
export const dynamic = "force-dynamic";

const DAY_MS = 24 * 60 * 60 * 1000;

export default async function SalesToday() {
  const supabase = await createClient();
  const since = new Date(Date.now() - DAY_MS).toISOString();

  const [leadsResult, messagesResult, callsResult] = await Promise.all([
    supabase
      .from("leads")
      .select(
        "id, created_at, full_name, business_name, email, phone, status, priority, timeline, interest, goals, industry, next_follow_up_at, last_contacted_at, expected_value_cents, owner, source, sms_consent, sms_unsubscribed_at",
      )
      .is("deleted_at", null)
      .eq("is_test", false)
      .in("status", OPEN_STATUSES)
      .order("created_at", { ascending: false })
      .limit(300),
    supabase
      .from("lead_messages")
      .select("lead_id, created_at")
      .eq("direction", "in")
      .gte("created_at", since)
      .order("created_at", { ascending: false })
      .limit(500),
    supabase
      .from("lead_calls")
      .select("lead_id, started_at")
      .eq("direction", "incoming")
      .gte("started_at", since)
      .order("started_at", { ascending: false })
      .limit(500),
  ]);

  if (leadsResult.error) {
    return (
      <section role="alert" className="card border-[var(--danger-line)]">
        <h2 className="text-xl font-bold text-[var(--heading)]">
          Today could not load.
        </h2>
        <p className="mt-2 text-[var(--muted)]">
          This is a connection or access error, not an empty queue. Refresh to
          try again. No lead has been changed or removed.
        </p>
        <a
          href="/admin/sales"
          className="btn-primary mt-4 inline-flex min-h-[44px] items-center"
        >
          Reload Today
        </a>
      </section>
    );
  }

  // Most recent inbound touch per lead. A call ties ahead of a text at the same
  // instant, because a missed call is the one you lose fastest.
  const signals: InboundSignals = {};
  for (const m of messagesResult.data ?? []) {
    const leadId = m.lead_id as string | null;
    const at = Date.parse(m.created_at as string);
    if (!leadId || !Number.isFinite(at)) continue;
    const prior = signals[leadId];
    if (!prior || at > prior.at) signals[leadId] = { at, kind: "text" };
  }
  for (const c of callsResult.data ?? []) {
    const leadId = c.lead_id as string | null;
    const at = Date.parse(c.started_at as string);
    if (!leadId || !Number.isFinite(at)) continue;
    const prior = signals[leadId];
    if (!prior || at >= prior.at) signals[leadId] = { at, kind: "call" };
  }

  const leads = (leadsResult.data ?? []) as QueueLead[];

  return <TodayQueue leads={leads} signals={signals} loadedAt={Date.now()} />;
}
