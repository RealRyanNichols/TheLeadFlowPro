import "server-only";
import type { SupabaseClient } from "@supabase/supabase-js";
import { INBOUND_AUTO_REPLY } from "@/lib/quo";
import { buildCallSheet, type CallSheet, type CallSheetLead, type CallSheetTouch } from "@/lib/callSheet";

// Reads for the call sheet. The admin page passes the signed-in user's
// client (row level security decides what an admin can see); the cron passes
// the service client. Both produce the same sheet for the same instant.

/** How far back a lead can be and still appear. Older than this is a list, not a call sheet. */
export const LOOKBACK_DAYS = 90;
const LEAD_LIMIT = 400;

export type CallSheetLoad = { ok: true; sheet: CallSheet } | { ok: false; error: string };

export async function loadCallSheet(supabase: SupabaseClient, now: Date): Promise<CallSheetLoad> {
  const since = new Date(now.getTime() - LOOKBACK_DAYS * 86_400_000).toISOString();
  const leadsResult = await supabase
    .from("leads")
    .select("id, created_at, full_name, business_name, email, phone, interest, status, source, utm_source, best_contact_method, sms_consent, is_test")
    .is("deleted_at", null)
    .gte("created_at", since)
    .order("created_at", { ascending: false })
    .limit(LEAD_LIMIT);
  if (leadsResult.error) return { ok: false, error: leadsResult.error.message };
  const leads = (leadsResult.data ?? []) as CallSheetLead[];
  const ids = leads.map((l) => l.id);
  if (ids.length === 0) return { ok: true, sheet: buildCallSheet([], [], now) };

  const [notes, calls, messages] = await Promise.all([
    supabase.from("lead_notes").select("lead_id, created_at").in("lead_id", ids),
    supabase.from("lead_calls").select("lead_id, started_at").in("lead_id", ids),
    supabase.from("lead_messages").select("lead_id, direction, body, created_at").in("lead_id", ids),
  ]);
  for (const r of [notes, calls, messages]) {
    if (r.error) return { ok: false, error: r.error.message };
  }

  const touches: CallSheetTouch[] = [];
  for (const n of (notes.data ?? []) as { lead_id: string; created_at: string }[]) {
    touches.push({ lead_id: n.lead_id, at: n.created_at, kind: "note" });
  }
  for (const c of (calls.data ?? []) as { lead_id: string | null; started_at: string }[]) {
    if (c.lead_id) touches.push({ lead_id: c.lead_id, at: c.started_at, kind: "call" });
  }
  for (const m of (messages.data ?? []) as { lead_id: string; direction: "in" | "out"; body: string; created_at: string }[]) {
    if (m.direction === "in") {
      touches.push({ lead_id: m.lead_id, at: m.created_at, kind: "message_in" });
    } else if (m.body !== INBOUND_AUTO_REPLY) {
      // The one automatic text (lib/quo.ts) is logged on the thread under
      // Ryan's name. It is software, not a person, so it does not count.
      touches.push({ lead_id: m.lead_id, at: m.created_at, kind: "message_out" });
    }
  }

  return { ok: true, sheet: buildCallSheet(leads, touches, now) };
}
