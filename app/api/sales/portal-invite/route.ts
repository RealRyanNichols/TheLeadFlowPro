import { NextResponse } from "next/server";
import { createClient as createPublicClient } from "@supabase/supabase-js";
import { createClient } from "@/lib/supabase/server";
import { SUPABASE_ANON_KEY, SUPABASE_URL } from "@/lib/config";

export async function POST(request: Request) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Not signed in" }, { status: 401 });

  const { data: profile } = await supabase.from("profiles").select("role, full_name").eq("id", user.id).single();
  if (profile?.role !== "admin" && profile?.role !== "sales") {
    return NextResponse.json({ error: "Sales access required" }, { status: 403 });
  }

  const body = await request.json().catch(() => null) as { project_id?: unknown } | null;
  const projectId = typeof body?.project_id === "string" ? body.project_id : "";
  if (!/^[0-9a-f-]{36}$/i.test(projectId)) {
    return NextResponse.json({ error: "Choose a valid client project" }, { status: 400 });
  }

  const { data: project } = await supabase
    .from("projects")
    .select("id, name, lead_id, leads(id, full_name, email)")
    .eq("id", projectId)
    .single();
  const leadValue = project?.leads as unknown;
  const lead = (Array.isArray(leadValue) ? leadValue[0] : leadValue) as { id: string; full_name: string; email: string } | null;
  const email = lead?.email?.trim().toLowerCase();
  if (!project || !lead || !email || !email.includes("@")) {
    return NextResponse.json({ error: "This project must be connected to a lead with an email address" }, { status: 400 });
  }

  const origin = new URL(request.url).origin;
  const auth = createPublicClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
  const { error: inviteError } = await auth.auth.signInWithOtp({
    email,
    options: {
      shouldCreateUser: true,
      emailRedirectTo: `${origin}/login?next=${encodeURIComponent("/dashboard/build-room")}`,
      data: { full_name: lead.full_name },
    },
  });
  if (inviteError) return NextResponse.json({ error: inviteError.message }, { status: 502 });

  const invitedAt = new Date().toISOString();
  await Promise.all([
    supabase.from("projects").update({ client_portal_invited_at: invitedAt }).eq("id", project.id),
    supabase.from("lead_activity").insert({
      lead_id: lead.id,
      kind: "delivery",
      detail: `Build Room access sent to ${email} by ${profile.full_name || user.email || "Sales Desk"}`,
    }),
  ]);

  return NextResponse.json({ ok: true, email, invited_at: invitedAt });
}
