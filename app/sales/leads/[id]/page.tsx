import { notFound, redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { safeLeadDiagnostic } from "@/lib/leadTimeline";
import SalesLeadWorkspace from "./SalesLeadWorkspace";

export const metadata = { title: "Lead Call Sheet | The LeadFlow Pro" };

export default async function SalesLeadPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user)
    redirect(`/login?next=${encodeURIComponent(`/admin/sales/leads/${id}`)}`);
  const { data: profile } = await supabase
    .from("profiles")
    .select("role, full_name")
    .eq("id", user.id)
    .single();
  if (profile?.role !== "admin" && profile?.role !== "sales")
    redirect("/dashboard");

  const { data: lead, error: leadError } = await supabase
    .from("leads")
    .select(
      "id, created_at, full_name, email, phone, business_name, website_url, current_platform, monthly_platform_spend, industry, desired_modules, interest, goals, budget_range, timeline, best_contact_method, status, notes, owner, priority, next_follow_up_at, last_contacted_at, expected_value_cents, close_probability, lost_reason, source, utm_source, utm_medium, utm_campaign, sms_consent, marketing_email_consent, email_unsubscribed_at, sms_unsubscribed_at, diagnostic",
    )
    .eq("id", id)
    .is("deleted_at", null)
    .maybeSingle();
  if (leadError)
    return (
      <section className="card" role="alert">
        <h1 className="text-xl font-bold">The lead could not load.</h1>
        <p className="mt-2">
          The record is unavailable right now. This does not mean it was
          deleted.
        </p>
        <a
          className="btn-primary mt-4 inline-flex"
          href={`/admin/sales/leads/${id}`}
        >
          Try again
        </a>
      </section>
    );
  if (!lead) notFound();

  const results = await Promise.all([
    supabase
      .from("lead_notes")
      .select("id, lead_id, body, author, created_at")
      .eq("lead_id", id)
      .order("created_at", { ascending: false }),
    supabase
      .from("lead_tasks")
      .select(
        "id, title, due_date, completed_at, created_at, priority, assigned_to, task_type",
      )
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
    supabase
      .from("lead_messages")
      .select(
        "id, lead_id, direction, channel, body, author, delivered, created_at",
      )
      .eq("lead_id", id)
      .order("created_at", { ascending: true }),
    supabase
      .from("projects")
      .select(
        "id, name, status, target_launch, client_portal_invited_at, milestones(id, status), deliverables(id, title, status, visible_to_client, client_decision)",
      )
      .eq("lead_id", id)
      .order("created_at", { ascending: false }),
    supabase
      .from("business_growth_diagnostics")
      .select(
        "status, form_version, answers, completeness_score, opportunity_score, tags, source_channel, submitted_at, updated_at",
      )
      .eq("lead_id", id)
      .maybeSingle(),
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
    projects,
    businessDiagnostic,
    calls,
  ] = results;
  const sectionLabels = [
    "Team notes",
    "Follow-up tasks",
    "CRM activity",
    "Email delivery",
    "Messages",
    "Client projects",
    "Form answers",
    "Business calls",
  ];
  const unavailableSections = results.flatMap((result, index) =>
    result.error ? [sectionLabels[index]] : [],
  );

  return (
    <SalesLeadWorkspace
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
      projects={projects.data ?? []}
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
      calls={calls.data ?? []}
      actorName={profile.full_name || user.email || "Team member"}
      unavailableSections={unavailableSections}
    />
  );
}
