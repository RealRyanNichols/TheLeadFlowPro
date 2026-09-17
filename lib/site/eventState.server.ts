// Server-only: the featured event's marketing state, merged with the live
// database row. The config (lib/site/events.ts) is the fallback; the database
// wins for date, price, capacity, and seats whenever it can be read.
//
// Fails soft. If Supabase is unreachable the homepage still renders from the
// config, which is exactly what it rendered before this module existed.

import "server-only";
import { createClient } from "@supabase/supabase-js";
import { SUPABASE_ANON_KEY, SUPABASE_URL } from "@/lib/config";
import {
  featuredEvent,
  resolveFeaturedEvent,
  type FeaturedEventState,
  type LiveEventFacts,
} from "./events";

type EventLiveRow = {
  starts_at: string | null;
  duration_minutes: number | null;
  price_usd: number | string | null;
  capacity: number | null;
  is_published: boolean;
  registration_closed: boolean;
};

type AvailabilityRow = {
  seats_remaining: number | null;
  sold_out: boolean;
  registration_open: boolean;
};

const QUERY_TIMEOUT_MS = 2_500;

export async function readLiveEventFacts(slug: string): Promise<LiveEventFacts | null> {
  try {
    const db = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
      auth: { persistSession: false, autoRefreshToken: false },
      global: { fetch: (input, init) => fetch(input, { ...init, signal: AbortSignal.timeout(QUERY_TIMEOUT_MS) }) },
    });
    const [eventResult, seatResult] = await Promise.all([
      db
        .from("events")
        .select("starts_at,duration_minutes,price_usd,capacity,is_published,registration_closed")
        .eq("slug", slug)
        .eq("is_published", true)
        .maybeSingle(),
      db.rpc("event_availability", { p_slug: slug }),
    ]);
    const row = eventResult.data as EventLiveRow | null;
    if (eventResult.error || !row) return null;
    const seats = (Array.isArray(seatResult.data) ? seatResult.data[0] : seatResult.data) as
      | AvailabilityRow
      | null
      | undefined;
    const price = Number(row.price_usd);
    return {
      startsAt: row.starts_at,
      durationMinutes: row.duration_minutes,
      priceUsd: Number.isFinite(price) ? price : null,
      capacity: row.capacity,
      seatsRemaining: seats && Number.isSafeInteger(Number(seats.seats_remaining)) ? Number(seats.seats_remaining) : null,
      soldOut: seats?.sold_out ?? null,
      registrationOpen: seats?.registration_open ?? null,
      registrationClosed: row.registration_closed,
      published: row.is_published,
    };
  } catch {
    return null;
  }
}

/** The state every homepage surface renders from. */
export async function getFeaturedEventState(now = new Date()): Promise<FeaturedEventState> {
  const live = await readLiveEventFacts(featuredEvent().slug);
  return resolveFeaturedEvent({ now, live });
}
