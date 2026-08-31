import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createServiceClient } from "@/lib/supabase/service";
import { getCourseAccess } from "@/lib/access";
import { chatgptOperatorLesson } from "@/lib/chatgptOperatorCourse";
import { academyLesson } from "@/lib/operatorAcademyCatalog";

export const runtime = "nodejs";

function validUrl(value: unknown) {
  if (typeof value !== "string") return null;
  try {
    const url = new URL(value.trim());
    return url.protocol === "https:" && url.toString().length <= 2000
      ? url.toString()
      : null;
  } catch {
    return null;
  }
}

export async function POST(request: Request) {
  try {
    const body = await request.json().catch(() => ({}));
    const courseSlug = typeof body.courseSlug === "string" ? body.courseSlug : "";
    const lessonSlug = typeof body.lessonSlug === "string" ? body.lessonSlug : "";
    const submissionUrl = validUrl(body.submissionUrl);
    const notes = typeof body.notes === "string" ? body.notes.trim().slice(0, 4000) : "";
    const blueprint = courseSlug === "chatgpt-operator"
      ? chatgptOperatorLesson(lessonSlug)
      : academyLesson(courseSlug, lessonSlug);
    if (!blueprint?.deliverable || !submissionUrl || notes.length < 10) {
      return NextResponse.json(
        { error: "Add a valid HTTPS link and at least ten characters of notes for a reviewed deliverable." },
        { status: 400 },
      );
    }

    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return NextResponse.json({ error: "Log in to submit a deliverable." }, { status: 401 });
    const { data: course } = await supabase.from("courses").select("id, slug, is_free").eq("slug", courseSlug).single();
    if (!course) return NextResponse.json({ error: "Course not found." }, { status: 404 });
    const access = await getCourseAccess(course);
    if (!access.hasAccess) return NextResponse.json({ error: "Course access is required." }, { status: 403 });
    const { data: lesson } = await supabase.from("lessons").select("id").eq("course_id", course.id).eq("slug", lessonSlug).single();
    if (!lesson) return NextResponse.json({ error: "Lesson not found." }, { status: 404 });

    const service = createServiceClient();
    const now = new Date().toISOString();
    const title = "deliverableTitle" in blueprint && blueprint.deliverableTitle
      ? blueprint.deliverableTitle
      : `${blueprint.title} capstone build`;
    const { error } = await service.from("course_deliverable_submissions").upsert({
      user_id: user.id,
      course_id: course.id,
      lesson_id: lesson.id,
      title,
      submission_url: submissionUrl,
      notes,
      status: "pending",
      review_notes: null,
      reviewer_id: null,
      submitted_at: now,
      reviewed_at: null,
      updated_at: now,
    }, { onConflict: "user_id,lesson_id" });
    if (error) throw new Error(`Deliverable save failed: ${error.code}`);
    return NextResponse.json({ ok: true, status: "pending" });
  } catch (error) {
    console.error("Deliverable submission failed:", error instanceof Error ? error.message : "unknown error");
    return NextResponse.json({ error: "The deliverable could not be saved." }, { status: 500 });
  }
}
