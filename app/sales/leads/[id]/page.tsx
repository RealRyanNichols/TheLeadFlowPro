import { notFound } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import SalesLeadWorkspace from "./SalesLeadWorkspace";

export const metadata = { title: "Lead Call Sheet | The LeadFlow Pro" };

export default async function SalesLeadPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const supabase = await createClient();

  const { data: lead } = await supabase.from("leads").select("*").eq("id", id).is("deleted_at", null).single();
  if (!lead) notFound();

  const [{ data: notes }, { data: tasks }, { data: activity }, { data: emails }, { data: thread }, { data: projects }, { data: businessDiagnostic }] = await Promise.all([
    supabase.from("lead_notes").select("*").eq("lead_id", id).order("created_at", { ascending: false }),
    supabase.from("lead_tasks").select("*").eq("lead_id", id).order("created_at", { ascending: false }),
    supabase.from("lead_activity").select("*").eq("lead_id", id).order("created_at", { ascending: false }),
    supabase.from("lead_emails").select("*").eq("lead_id", id).order("sent_at", { ascending: false }),
    supabase.from("lead_messages").select("*").eq("lead_id", id).order("created_at", { ascending: true }),
    supabase.from("projects").select("id, name, status, target_launch, client_portal_invited_at, milestones(id, status), deliverables(id, title, status, visible_to_client, client_decision)").eq("lead_id", id).order("created_at", { ascending: false }),
    // Keep resume credentials server-only by selecting the exact CRM-safe fields.
    supabase.from("business_growth_diagnostics").select("status, form_version, answers, completeness_score, opportunity_score, tags, source_channel, submitted_at, updated_at").eq("lead_id", id).maybeSingle(),
  ]);

  return (
    <SalesLeadWorkspace
      lead={lead}
      initialNotes={notes ?? []}
      initialTasks={tasks ?? []}
      initialActivity={activity ?? []}
      emails={emails ?? []}
      initialThread={thread ?? []}
      projects={projects ?? []}
      businessDiagnostic={businessDiagnostic}
    />
  );
}
