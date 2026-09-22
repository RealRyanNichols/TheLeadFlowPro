import "server-only";
import type { SupabaseClient } from "@supabase/supabase-js";
import {
  buildCallSheet,
  touchesFromRows,
  type CallSheet,
  type CallSheetCallRow,
  type CallSheetLead,
  type CallSheetMessageRow,
  type CallSheetNoteRow,
} from "@/lib/callSheet";
import { SPEED_WINDOW_DAYS, speedToLead, type SpeedToLead } from "@/lib/speedToLead";

// Reads for the call sheet. The admin page passes the signed-in user's
// client (row level security decides what an admin can see); the cron passes
// the service client. Both produce the same sheet for the same instant.
//
// Strictly read-only. The rules that turn history rows into touches live in
// touchesFromRows (lib/callSheet.ts) so they are tested, not trusted: no
// automatic texts, no rejected sends, no calls scoped out of the company.
// The speed-to-lead count rides along on the same rows, so the page shows it
// without another query.

/** How far back a lead can be and still appear. Older than this is a list, not a call sheet. */
export const LOOKBACK_DAYS = 90;
const LEAD_LIMIT = 400;
/**
 * PostgREST returns at most this many rows per request by default. A history
 * query that comes back this full may have been cut short, so the result is
 * marked partial instead of quietly undercounting.
 */
export const TOUCH_ROW_CAP = 1000;

export type CallSheetLoad =
  | {
      ok: true;
      sheet: CallSheet;
      speed: SpeedToLead;
      /** True when some history may be missing (a query hit its row cap). */
      partial: boolean;
    }
  | { ok: false; error: string };

export async function loadCallSheet(supabase: SupabaseClient, now: Date): Promise<CallSheetLoad> {
  const since = new Date(now.getTime() - LOOKBACK_DAYS * 86_400_000).toISOString();
  const leadsResult = await supabase
    .from("leads")
    .select(
      "id, created_at, full_name, business_name, email, phone, interest, status, source, utm_source, best_contact_method, sms_consent, sms_unsubscribed_at, is_test, next_follow_up_at",
    )
    .is("deleted_at", null)
    .gte("created_at", since)
    .order("created_at", { ascending: false })
    .limit(LEAD_LIMIT);
  if (leadsResult.error) return { ok: false, error: leadsResult.error.message };
  const leads = (leadsResult.data ?? []) as CallSheetLead[];
  const ids = leads.map((l) => l.id);
  if (ids.length === 0) {
    return { ok: true, sheet: buildCallSheet([], [], now), speed: speedToLead([], [], now), partial: false };
  }

  // Newest first, so a capped read keeps the touches that decide today's sheet.
  const [notes, calls, messages] = await Promise.all([
    supabase.from("lead_notes").select("lead_id, created_at, body").in("lead_id", ids).order("created_at", { ascending: false }),
    supabase
      .from("lead_calls")
      .select("lead_id, started_at, direction, outcome, scope_status")
      .in("lead_id", ids)
      .order("started_at", { ascending: false }),
    supabase
      .from("lead_messages")
      .select("lead_id, direction, channel, body, created_at, delivered")
      .in("lead_id", ids)
      .order("created_at", { ascending: false }),
  ]);
  for (const r of [notes, calls, messages]) {
    if (r.error) return { ok: false, error: r.error.message };
  }

  const touches = touchesFromRows({
    notes: (notes.data ?? []) as CallSheetNoteRow[],
    calls: (calls.data ?? []) as CallSheetCallRow[],
    messages: (messages.data ?? []) as CallSheetMessageRow[],
  });

  const historyCapped = [notes, calls, messages].some((r) => (r.data?.length ?? 0) >= TOUCH_ROW_CAP);
  // The lead read is capped too. If the oldest lead it returned is still
  // inside the speed window, older leads in that window were left out.
  const oldest = leads[leads.length - 1]?.created_at;
  const speedWindowStart = now.getTime() - SPEED_WINDOW_DAYS * 86_400_000;
  const leadsCapped = leads.length >= LEAD_LIMIT && typeof oldest === "string" && Date.parse(oldest) > speedWindowStart;

  return {
    ok: true,
    sheet: buildCallSheet(leads, touches, now),
    speed: speedToLead(leads, touches, now, { windowDays: SPEED_WINDOW_DAYS, partial: historyCapped || leadsCapped }),
    partial: historyCapped,
  };
}
