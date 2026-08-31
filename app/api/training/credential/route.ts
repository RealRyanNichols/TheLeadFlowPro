import crypto from "node:crypto";
import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createServiceClient } from "@/lib/supabase/service";
import { getCourseAccess } from "@/lib/access";
import { courseCredentialConfig } from "@/lib/academyCredential";

export const runtime = "nodejs";

export async function POST(request: Request) {
  try {
    const body = await request.json().catch(() => ({}));
    const learnerName = typeof body.learnerName === "string" ? body.learnerName.trim().replace(/\s+/g, " ").slice(0, 200) : "";
    const courseSlug = typeof body.courseSlug === "string" ? body.courseSlug : "content-engine";
    const config = courseCredentialConfig(courseSlug);
    if (learnerName.length < 2) return NextResponse.json({ error: "Enter the learner name for the completion letter." }, { status: 400 });
    if (!config) return NextResponse.json({ error: "Course completion is not available." }, { status: 404 });

    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return NextResponse.json({ error: "Log in to request the completion letter." }, { status: 401 });
    const { data: course } = await supabase.from("courses").select("id, slug, is_free").eq("slug", courseSlug).single();
    if (!course) return NextResponse.json({ error: "Course not found." }, { status: 404 });
    const access = await getCourseAccess(course);
    if (!access.hasAccess) return NextResponse.json({ error: "Course access is required." }, { status: 403 });

    const service = createServiceClient();
    const { data: lessons, error: lessonError } = await service.from("lessons").select("id").eq("course_id", course.id).eq("is_published", true);
    if (lessonError || !lessons || lessons.length !== config.lessonCount) throw new Error("Published lesson count is not ready");
    const lessonIds = lessons.map((lesson) => lesson.id);
    const [progress, assignments, checks, finals, deliverables, existing] = await Promise.all([
      service.from("lesson_progress").select("lesson_id").eq("user_id", user.id).in("lesson_id", lessonIds),
      service.from("course_assignment_progress").select("lesson_id").eq("user_id", user.id).in("lesson_id", lessonIds),
      service.from("course_quiz_attempts").select("lesson_id").eq("user_id", user.id).eq("course_id", course.id).eq("assessment_kind", "lesson").eq("passed", true),
      service.from("course_quiz_attempts").select("score, max_score").eq("user_id", user.id).eq("course_id", course.id).eq("assessment_kind", "final").eq("passed", true).order("created_at", { ascending: false }).limit(1),
      service.from("course_deliverable_submissions").select("lesson_id").eq("user_id", user.id).eq("course_id", course.id).eq("status", "approved"),
      service.from("course_credentials").select("credential_code").eq("user_id", user.id).eq("course_id", course.id).maybeSingle(),
    ]);
    const queryError = progress.error || assignments.error || checks.error || finals.error || deliverables.error || existing.error;
    if (queryError) throw new Error(`Completion check failed: ${queryError.code}`);
    if (existing.data) return NextResponse.json({ issued: true, code: existing.data.credential_code });

    const completedLessons = new Set((progress.data ?? []).map((row) => row.lesson_id));
    const completedAssignments = new Set((assignments.data ?? []).map((row) => row.lesson_id));
    const passedChecks = new Set((checks.data ?? []).map((row) => row.lesson_id));
    const approvedDeliverables = new Set((deliverables.data ?? []).map((row) => row.lesson_id));
    const final = finals.data?.[0];
    const ready = lessonIds.every((id) => completedLessons.has(id) && completedAssignments.has(id) && passedChecks.has(id))
      && approvedDeliverables.size >= config.deliverableCount
      && !!final;
    if (!ready) {
      return NextResponse.json({ error: `Finish all ${config.lessonCount} lessons and assignments, pass every lesson check and the final, and receive approval on all ${config.deliverableCount} reviewed deliverables first.` }, { status: 409 });
    }

    const finalScore = Math.round((final.score / final.max_score) * 100);
    const credentialCode = `LFP-${config.code}-${crypto.randomBytes(4).toString("hex").toUpperCase()}`;
    const { error: insertError } = await service.from("course_credentials").insert({
      user_id: user.id,
      course_id: course.id,
      credential_code: credentialCode,
      learner_name: learnerName,
      final_score: finalScore,
      disclaimer: config.disclaimer,
    });
    if (insertError) throw new Error(`Credential issue failed: ${insertError.code}`);
    return NextResponse.json({ issued: true, code: credentialCode });
  } catch (error) {
    console.error("Credential request failed:", error instanceof Error ? error.message : "unknown error");
    return NextResponse.json({ error: "The completion letter could not be issued." }, { status: 500 });
  }
}
