import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createServiceClient } from "@/lib/supabase/service";

export const runtime = "nodejs";

export async function POST(request: Request) {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return NextResponse.json({ error: "Unauthorized." }, { status: 401 });
    const { data: profile } = await supabase.from("profiles").select("role").eq("id", user.id).single();
    if (profile?.role !== "admin") return NextResponse.json({ error: "Forbidden." }, { status: 403 });
    const body = await request.json().catch(() => ({}));
    const id = typeof body.id === "string" ? body.id : "";
    const status = body.status === "approved" || body.status === "revision_requested" ? body.status : null;
    const reviewNotes = typeof body.reviewNotes === "string" ? body.reviewNotes.trim().slice(0, 4000) : "";
    if (!id || !status || (status === "revision_requested" && reviewNotes.length < 5)) {
      return NextResponse.json({ error: "Add a valid review decision and revision note." }, { status: 400 });
    }
    const now = new Date().toISOString();
    const service = createServiceClient();
    const { error } = await service.from("course_deliverable_submissions").update({
      status,
      review_notes: reviewNotes || null,
      reviewer_id: user.id,
      reviewed_at: now,
      updated_at: now,
    }).eq("id", id);
    if (error) throw new Error(`Review save failed: ${error.code}`);
    return NextResponse.json({ ok: true });
  } catch (error) {
    console.error("Deliverable review failed:", error instanceof Error ? error.message : "unknown error");
    return NextResponse.json({ error: "The review could not be saved." }, { status: 500 });
  }
}
