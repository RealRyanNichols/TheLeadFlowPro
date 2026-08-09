import { createClient } from "@/lib/supabase/server";
import EventsManager from "./EventsManager";

export default async function AdminEvents() {
  const supabase = await createClient();
  const { data: events } = await supabase
    .from("events")
    .select("*, event_registrations(*)")
    .order("created_at", { ascending: false });

  return <EventsManager initialEvents={events ?? []} />;
}
