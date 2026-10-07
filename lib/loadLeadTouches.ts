import { createClient } from "@/lib/supabase/server";
import { latestTouches, type LeadTouch, type TouchRecord } from "./leadTouch";
// Existing access-controlled history only. Raw note/message content stays server-side.
export async function loadLeadTouches(supabase: Awaited<ReturnType<typeof createClient>>, ids: string[]) {
  if (!ids.length) return {};
  const results = await Promise.all([
    supabase.from("lead_notes").select("lead_id, author, created_at").in("lead_id", ids).order("created_at", { ascending: false }).limit(1000),
    supabase.from("lead_messages").select("lead_id, author, direction, created_at").in("lead_id", ids).eq("direction", "outbound").order("created_at", { ascending: false }).limit(1000),
    supabase.from("lead_activity").select("lead_id, kind, detail, created_at").in("lead_id", ids).eq("kind", "sales").order("created_at", { ascending: false }).limit(1000),
  ]);
  const unavailable = results.some(r => r.error);
  const limited = results.some(r => (r.data?.length ?? 0) === 1000);
  const touches = latestTouches(results.flatMap(r => r.data ?? []) as TouchRecord[]);
  return Object.fromEntries(ids.map(id => [id, { ...(touches[id] ?? { name: null, at: null }), unavailable, limited } satisfies LeadTouch]));
}
