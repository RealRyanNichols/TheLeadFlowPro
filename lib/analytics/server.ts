import { createClient as createSupabaseClient } from "@supabase/supabase-js";
import { SUPABASE_URL, SUPABASE_ANON_KEY } from "@/lib/config";
import { persistServerEvent } from "./persistence";
import { serverEventRow, type ServerEventInput } from "./serverEvent";

/**
 * Record a saved conversion with public campaign labels and anonymous IDs.
 * Failure is observable but never invalidates an already-saved inquiry.
 */
export async function recordServerEvent(
  request: Request,
  input: ServerEventInput,
): Promise<boolean> {
  try {
    const row = serverEventRow(request, input);
    if (!row) return false;
    const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
    const supabase = createSupabaseClient(SUPABASE_URL, serviceKey || SUPABASE_ANON_KEY);
    const saved = await persistServerEvent(row, (value) =>
      supabase.from("analytics_events").insert(value));
    if (!saved) console.error("Server conversion event could not be saved");
    return saved;
  } catch {
    // Do not log database errors, submitted details, cookies, or attribution values.
    console.error("Server conversion analytics unavailable");
    return false;
  }
}
