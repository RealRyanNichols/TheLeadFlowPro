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

  const [
    { data: notes },
    { data: tasks },
    { data: activity },
    { data: emails },
    { data: thread },
    { data: businessDiagnostic },
    { data: diagnosticNotifications },
  ] = await Promise.all([
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
      // Conversation reads oldest first, the way a phone thread does.
      supabase
        .from("lead_messages")
        .select("*")
        .eq("lead_id", id)
        .order("created_at", { ascending: true }),
      // Select only the CRM-safe diagnostic fields. Resume credentials never
      // leave the server or get serialized into the lead workspace.
      supabase
        .from("business_growth_diagnostics")
        .select(
          "status, form_version, answers, completeness_score, opportunity_score, tags, source_channel, submitted_at, updated_at",
        )
        .eq("lead_id", id)
        .maybeSingle(),
      supabase
        .from("diagnostic_notifications")
        .select(
          "id, event_type, status, attempt_count, next_attempt_at, last_attempt_at, sent_at, last_error, created_at",
        )
        .eq("lead_id", id)
        .order("created_at", { ascending: true }),
    ]);

  return (
    <LeadWorkspace
      lead={lead}
      initialNotes={notes ?? []}
      initialTasks={tasks ?? []}
      initialActivity={activity ?? []}
      emails={emails ?? []}
      initialThread={thread ?? []}
      businessDiagnostic={businessDiagnostic}
      diagnosticNotifications={diagnosticNotifications ?? []}
    />
  );
}
