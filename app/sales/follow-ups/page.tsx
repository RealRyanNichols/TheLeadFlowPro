import { createClient } from "@/lib/supabase/server";
import FollowUpBoard from "./FollowUpBoard";

export const metadata = { title: "Follow-ups | LeadFlow Pro Sales Desk" };

export default async function SalesFollowUpsPage() {
  const supabase = await createClient();
  const [{ data: tasks }, { data: leads }, { data: auth }] = await Promise.all([
    supabase
      .from("lead_tasks")
      .select("*, leads!inner(id, full_name, business_name, email, phone, status, priority, next_follow_up_at, owner)")
      .is("completed_at", null)
      .order("due_date", { ascending: true, nullsFirst: false })
      .limit(300),
    supabase
      .from("leads")
      .select("id, full_name, business_name, email, phone, status, priority, next_follow_up_at, owner")
      .is("deleted_at", null)
      .eq("is_test", false)
      .in("status", ["new", "contacted", "call_booked", "proposal"])
      .order("created_at", { ascending: false })
      .limit(300),
    supabase.auth.getUser(),
  ]);
  const userId = auth.user?.id;
  const { data: profile } = userId
    ? await supabase.from("profiles").select("full_name").eq("id", userId).single()
    : { data: null };

  return <FollowUpBoard initialTasks={tasks ?? []} initialLeads={leads ?? []} operatorName={profile?.full_name || "Sales Desk"} />;
}
