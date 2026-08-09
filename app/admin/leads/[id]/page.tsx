import { notFound } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import LeadWorkspace from "./LeadWorkspace";

export const metadata = { title: "Lead Workspace | The LeadFlow Pro" };

export default async function LeadWorkspacePage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const supabase = await createClient();

  const { data: lead } = await supabase.from("leads").select("*").eq("id", id).single();
  if (!lead) notFound();

  const [{ data: notes }, { data: tasks }, { data: activity }, { data: emails }] =
    await Promise.all([
      supabase
        .from("lead_notes")
        .select("*")
        .eq("lead_id", id)
        .order("created_at", { ascending: false }),
      supabase
        .from("lead_tasks")
        .select("*")
        .eq("lead_id", id)
        .order("created_at", { ascending: false }),
      supabase
        .from("lead_activity")
        .select("*")
        .eq("lead_id", id)
        .order("created_at", { ascending: false }),
      supabase
        .from("lead_emails")
        .select("*")
        .eq("lead_id", id)
        .order("sent_at", { ascending: false }),
    ]);

  return (
    <LeadWorkspace
      lead={lead}
      initialNotes={notes ?? []}
      initialTasks={tasks ?? []}
      initialActivity={activity ?? []}
      emails={emails ?? []}
    />
  );
}
