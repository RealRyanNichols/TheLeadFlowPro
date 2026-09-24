import "server-only";
import type { SupabaseClient } from "@supabase/supabase-js";
import type { CallSheetLead } from "@/lib/callSheet";
import { UNCALLED_LEAD_LIMIT, buildUncalledList, touchesFromRows, type UncalledList, type UncalledTouchRows } from "@/lib/uncalled";

// Reads for the Uncalled list. The page passes the signed-in user's client,
// so row level security decides what an admin or a salesperson can see.
// No lookback window: an open lead from last spring that nobody called is
// exactly what this page is for.

export type UncalledLoad = { ok: true; list: UncalledList; capped: boolean } | { ok: false; error: string };

// Lead ids per touch query (keeps the request URL short) and rows per page
// (the API returns at most 1000 rows per request; a silently truncated read
// would make touched leads look untouched).
const ID_CHUNK = 150;
const PAGE = 1000;

type PageResult<T> = { data: T[] | null; error: { message: string } | null };

async function readAll<T>(page: (from: number, to: number) => PromiseLike<PageResult<T>>): Promise<T[]> {
  const out: T[] = [];
  for (let from = 0; ; from += PAGE) {
    const { data, error } = await page(from, from + PAGE - 1);
    if (error) throw new Error(error.message);
    const rows = data ?? [];
    out.push(...rows);
    if (rows.length < PAGE) return out;
  }
}

export async function loadUncalledList(supabase: SupabaseClient, now: Date): Promise<UncalledLoad> {
  try {
    // Newest open leads first, so a cap drops the oldest, never today's.
    const leadsResult = await supabase
      .from("leads")
      .select("id, created_at, full_name, business_name, email, phone, interest, status, source, utm_source, best_contact_method, sms_consent, sms_unsubscribed_at, is_test, next_follow_up_at")
      .is("deleted_at", null)
      .not("is_test", "is", true)
      .not("status", "in", "(won,lost)")
      .order("created_at", { ascending: false })
      .limit(UNCALLED_LEAD_LIMIT);
    if (leadsResult.error) return { ok: false, error: leadsResult.error.message };
    const leads = (leadsResult.data ?? []) as CallSheetLead[];
    const capped = leads.length >= UNCALLED_LEAD_LIMIT;

    const rows: UncalledTouchRows = { notes: [], calls: [], messages: [] };
    const ids = leads.map((l) => l.id);
    for (let i = 0; i < ids.length; i += ID_CHUNK) {
      const chunk = ids.slice(i, i + ID_CHUNK);
      const [notes, calls, messages] = await Promise.all([
        readAll<UncalledTouchRows["notes"][number]>((from, to) =>
          supabase.from("lead_notes").select("lead_id, created_at").in("lead_id", chunk).order("id").range(from, to),
        ),
        readAll<UncalledTouchRows["calls"][number]>((from, to) =>
          supabase.from("lead_calls").select("lead_id, started_at, direction, outcome").in("lead_id", chunk).order("id").range(from, to),
        ),
        readAll<UncalledTouchRows["messages"][number]>((from, to) =>
          supabase.from("lead_messages").select("lead_id, direction, body, created_at").in("lead_id", chunk).order("id").range(from, to),
        ),
      ]);
      rows.notes.push(...notes);
      rows.calls.push(...calls);
      rows.messages.push(...messages);
    }

    return { ok: true, list: buildUncalledList(leads, touchesFromRows(rows), now), capped };
  } catch (error) {
    return { ok: false, error: error instanceof Error ? error.message : "load failed" };
  }
}
