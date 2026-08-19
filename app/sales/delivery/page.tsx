import { createClient } from "@/lib/supabase/server";
import DeliveryManager from "./DeliveryManager";

export const metadata = { title: "Delivery Center | LeadFlow Pro Sales Desk" };

export default async function SalesDeliveryPage() {
  const supabase = await createClient();
  const [{ data: projects }, { data: leads }, { data: profile }] = await Promise.all([
    supabase
      .from("projects")
      .select("*, leads(id, full_name, business_name, email, phone, status), profiles(full_name, email), milestones(*), deliverables(*)")
      .order("created_at", { ascending: false }),
    supabase
      .from("leads")
      .select("id, full_name, business_name, email, phone, status")
      .is("deleted_at", null)
      .eq("is_test", false)
      .not("status", "eq", "lost")
      .order("created_at", { ascending: false }),
    supabase.auth.getUser().then(async ({ data }) => {
      if (!data.user) return { data: null };
      return supabase.from("profiles").select("full_name").eq("id", data.user.id).single();
    }),
  ]);

  return (
    <DeliveryManager
      initialProjects={projects ?? []}
      leads={leads ?? []}
      operatorName={profile?.full_name || "Sales Desk"}
    />
  );
}
