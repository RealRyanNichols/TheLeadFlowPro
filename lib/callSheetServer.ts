import "server-only";
import type { SupabaseClient } from "@supabase/supabase-js";
import {
  buildCallSheet,
  latestInbound,
  touchesFromRows,
  type CallSheet,
  type CallSheetCallRow,
  type CallSheetLead,
  type CallSheetMessageRow,
  type CallSheetNoteRow,
  type CallSheetTouch,
  type LatestInbound,
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
//
// Two lead reads. The main one is the window: leads created in the last
// LOOKBACK_DAYS. The second keeps promises: the Call Closer lets Ryan set a
// call back or a sit-down up to 90 days out, so a lead can be older than the
// window by the time its follow-up comes due. That read takes only open leads
// created before the window whose follow-up came due inside it, and those
// leads may only appear while that promise is owed, as a call back or as a
// reply when the lead reached out since (buildCallSheet's promiseOnly). An old
// lead nobody touched still stays off: its only stored time is the
// diagnostic's stamp (its review task's time), which is either older than the window or
// ignored because nobody has touched the lead.

/** How far back a lead can be and still appear. Older than this is a list, not a call sheet. */
export const LOOKBACK_DAYS = 90;
/** Most leads the window read returns. */
export const LEAD_LIMIT = 400;
/** Most older leads read because their follow-up came due. */
export const PROMISE_LIMIT = 100;
/**
 * PostgREST returns at most this many rows per request by default. A history
 * query that comes back this full may have been cut short, so the result is
 * marked partial instead of quietly undercounting.
 */
export const TOUCH_ROW_CAP = 1000;

const LEAD_COLUMNS =
  "id, created_at, full_name, business_name, email, phone, interest, status, source, utm_source, best_contact_method, sms_consent, sms_unsubscribed_at, is_test, next_follow_up_at";
/** What touchesFromRows needs from lead_calls and lead_messages. */
const CALL_COLUMNS = "lead_id, started_at, direction, outcome, scope_status";
const MESSAGE_COLUMNS = "lead_id, direction, channel, body, created_at, delivered";
/** Most recent Quo calls and thread messages the call card reads for one lead. */
export const LEAD_TOUCH_ROWS = 25;

export type CallSheetLoad =
  | {
      ok: true;
      sheet: CallSheet;
      speed: SpeedToLead;
      /** True when some history may be missing (a query hit its row cap). */
      partial: boolean;
      /** True when a lead read came back full, so some older leads or call backs may be missing. */
      leadsCapped: boolean;
    }
  | { ok: false; error: string };

export async function loadCallSheet(supabase: SupabaseClient, now: Date): Promise<CallSheetLoad> {
  const since = new Date(now.getTime() - LOOKBACK_DAYS * 86_400_000).toISOString();
  const [leadsResult, promisedResult] = await Promise.all([
    supabase
      .from("leads")
      .select(LEAD_COLUMNS)
      .is("deleted_at", null)
      .gte("created_at", since)
      .order("created_at", { ascending: false })
      .limit(LEAD_LIMIT),
    supabase
      .from("leads")
      .select(LEAD_COLUMNS)
      .is("deleted_at", null)
      .lt("created_at", since)
      .gte("next_follow_up_at", since)
      .lte("next_follow_up_at", now.toISOString())
      .not("status", "in", "(won,lost)")
      .order("next_follow_up_at", { ascending: true })
      .limit(PROMISE_LIMIT),
  ]);
  if (leadsResult.error) return { ok: false, error: leadsResult.error.message };
  if (promisedResult.error) return { ok: false, error: promisedResult.error.message };
  // The window's leads. Speed to lead and the lead cap read only these.
  const leads = (leadsResult.data ?? []) as CallSheetLead[];
  const inWindow = new Set(leads.map((l) => l.id));
  const promisedRows = (promisedResult.data ?? []) as CallSheetLead[];
  const promised = promisedRows.filter((l) => !inWindow.has(l.id));
  const promiseOnly = new Set(promised.map((l) => l.id));
  const everyLead = [...leads, ...promised];
  const leadsCapped = leads.length >= LEAD_LIMIT || promisedRows.length >= PROMISE_LIMIT;

  const ids = everyLead.map((l) => l.id);
  if (ids.length === 0) {
    return { ok: true, sheet: buildCallSheet([], [], now), speed: speedToLead([], [], now), partial: false, leadsCapped: false };
  }

  // Newest first, so a capped read keeps the touches that decide today's sheet.
  const [notes, calls, messages] = await Promise.all([
    supabase.from("lead_notes").select("lead_id, created_at, body").in("lead_id", ids).order("created_at", { ascending: false }),
    supabase.from("lead_calls").select(CALL_COLUMNS).in("lead_id", ids).order("started_at", { ascending: false }),
    supabase.from("lead_messages").select(MESSAGE_COLUMNS).in("lead_id", ids).order("created_at", { ascending: false }),
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
  // The window read is capped too. If the oldest lead it returned is still
  // inside the speed window, older leads in that window were left out.
  const oldest = leads[leads.length - 1]?.created_at;
  const speedWindowStart = now.getTime() - SPEED_WINDOW_DAYS * 86_400_000;
  const speedCapped = leads.length >= LEAD_LIMIT && typeof oldest === "string" && Date.parse(oldest) > speedWindowStart;

  return {
    ok: true,
    sheet: buildCallSheet(everyLead, touches, now, { promiseOnly }),
    speed: speedToLead(leads, touches, now, { windowDays: SPEED_WINDOW_DAYS, partial: historyCapped || speedCapped }),
    partial: historyCapped,
    leadsCapped,
  };
}

/**
 * One lead's recent Quo calls and thread messages, as touches, for the call
 * card. Same columns and the same touchesFromRows mapping as the sheet, so
 * the card's "Call back due now" and the sheet's call back tier count the same
 * touches: a Quo call about the company, a text a person sent that was
 * delivered, and a reply logged by hand. From the same rows, `latestInbound`
 * is the newest message or missed call from the lead, so the card can show
 * what they asked before Ryan dials. Read-only. `ok` is false when either
 * read failed, so the touches may be short.
 */
export async function loadLeadTouches(
  supabase: SupabaseClient,
  leadId: string,
): Promise<{ ok: boolean; touches: CallSheetTouch[]; latestInbound: LatestInbound | null }> {
  const [calls, messages] = await Promise.all([
    supabase
      .from("lead_calls")
      .select(CALL_COLUMNS)
      .eq("lead_id", leadId)
      .order("started_at", { ascending: false })
      .limit(LEAD_TOUCH_ROWS),
    supabase
      .from("lead_messages")
      .select(MESSAGE_COLUMNS)
      .eq("lead_id", leadId)
      .order("created_at", { ascending: false })
      .limit(LEAD_TOUCH_ROWS),
  ]);
  const rows = {
    calls: calls.error ? [] : ((calls.data ?? []) as CallSheetCallRow[]),
    messages: messages.error ? [] : ((messages.data ?? []) as CallSheetMessageRow[]),
  };
  const touches = touchesFromRows({ notes: [], ...rows });
  return { ok: !calls.error && !messages.error, touches, latestInbound: latestInbound(rows) };
}
