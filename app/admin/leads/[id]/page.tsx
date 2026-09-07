import { notFound, redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { safeLeadDiagnostic } from "@/lib/leadTimeline";
import LeadWorkspace from "./LeadWorkspace";

export const metadata = { title: "Lead Workspace | The LeadFlow Pro" };

export default async function LeadWorkspacePage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const supabase = await createClient();
  // Keep authorization next to the private data reads, not only in a layout.
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user)
    redirect(`/login?next=${encodeURIComponent(`/admin/leads/${id}`)}`);
  const { data: profile } = await supabase
    .from("profiles")
    .select("role, full_name")
    .eq("id", user.id)
    .single();
  if (profile?.role !== "admin") redirect("/dashboard");

  const { data: lead } = await supabase
    .from("leads")
    .select(
      "id, created_at, full_name, email, phone, business_name, website_url, current_platform, monthly_platform_spend, industry, desired_modules, interest, goals, budget_range, timeline, best_contact_method, status, notes, owner, source, utm_source, utm_medium, utm_campaign, is_test, sms_consent, marketing_email_consent, consent_at, email_unsubscribed_at, sms_unsubscribed_at, diagnostic",
    )
    .eq("id", id)
    .is("deleted_at", null)
    .single();
  if (!lead) notFound();

  const results = await Promise.all([
    supabase
      .from("lead_notes")
      .select("id, lead_id, body, author, created_at")
      .eq("lead_id", id)
      .order("created_at", { ascending: false }),
    supabase
      .from("lead_tasks")
      .select("id, title, due_date, completed_at, created_at")
      .eq("lead_id", id)
      .order("created_at", { ascending: false }),
    supabase
      .from("lead_activity")
      .select("id, lead_id, kind, detail, created_at")
      .eq("lead_id", id)
      .order("created_at", { ascending: false }),
    supabase
      .from("lead_emails")
      .select(
        "id, lead_id, step, sent_at, delivery_status, first_attempt_at, last_attempt_at",
      )
      .eq("lead_id", id)
      .order("sent_at", { ascending: false }),
    // Conversation reads oldest first, the way a phone thread does.
    supabase
      .from("lead_messages")
      .select(
        "id, lead_id, direction, channel, body, author, delivered, created_at",
      )
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
    // Only associated company calls. Recording URLs, transcripts, provider
    // IDs, and unrelated personal calls do not enter the client bundle.
    supabase
      .from("lead_calls")
      .select(
        "id, lead_id, direction, status, outcome, started_at, created_at, duration_seconds, summary, next_steps, source, scope_status",
      )
      .eq("lead_id", id)
      .eq("scope_status", "company")
      .order("started_at", { ascending: false }),
  ]);
  const [
    notes,
    tasks,
    activity,
    emails,
    thread,
    businessDiagnostic,
    diagnosticNotifications,
    calls,
  ] = results;
  const labels = [
    "Team notes",
    "Follow-up tasks",
    "CRM activity",
    "Automated email log",
    "Messages",
    "Questionnaire answers",
    "Notification delivery",
    "Business calls",
  ];
  const unavailableSections = results.flatMap((result, index) =>
    result.error ? [labels[index]] : [],
  );

  return (
    <LeadWorkspace
      lead={{
        ...lead,
        diagnostic: safeLeadDiagnostic(lead.diagnostic) as Record<
          string,
          unknown
        > | null,
      }}
      initialNotes={notes.data ?? []}
      initialTasks={tasks.data ?? []}
      initialActivity={activity.data ?? []}
      emails={emails.data ?? []}
      initialThread={thread.data ?? []}
      businessDiagnostic={
        businessDiagnostic.data
          ? {
              ...businessDiagnostic.data,
              answers: safeLeadDiagnostic(
                businessDiagnostic.data.answers,
              ) as Record<string, unknown> | null,
            }
          : null
      }
      diagnosticNotifications={diagnosticNotifications.data ?? []}
      calls={calls.data ?? []}
      actorName={profile.full_name || user.email || "Admin"}
      unavailableSections={unavailableSections}
    />
  );
}
