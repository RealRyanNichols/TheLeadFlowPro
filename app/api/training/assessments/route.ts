import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createServiceClient } from "@/lib/supabase/service";
import { getCourseAccess } from "@/lib/access";
import { CONTENT_ENGINE, contentEngineLessonCode } from "@/lib/contentEngineCourse";
import { CONTENT_ENGINE_ASSESSMENTS } from "@/lib/contentEngineAssessments";

export const runtime = "nodejs";

export async function POST(request: Request) {
  try {
    const body = await request.json().catch(() => ({}));
    const kind = body.kind === "final" ? "final" : body.kind === "lesson" ? "lesson" : null;
    const answers = Array.isArray(body.answers) ? body.answers : null;
    if (!kind || !answers || !answers.every((answer: unknown) => Number.isInteger(answer))) {
      return NextResponse.json({ error: "Invalid assessment submission." }, { status: 400 });
    }

    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return NextResponse.json({ error: "Log in to submit an assessment." }, { status: 401 });

    const { data: course } = await supabase.from("courses").select("id, slug, is_free").eq("slug", CONTENT_ENGINE.slug).single();
    if (!course) return NextResponse.json({ error: "Course not found." }, { status: 404 });
    const access = await getCourseAccess(course);
    if (!access.hasAccess) return NextResponse.json({ error: "Course access is required." }, { status: 403 });

    let lessonId: string | null = null;
    let questions: readonly { question: string; options: readonly string[]; answer_index: number; explanation: string }[];
    if (kind === "lesson") {
      const lessonSlug = typeof body.lessonSlug === "string" ? body.lessonSlug : "";
      const code = contentEngineLessonCode(lessonSlug);
      if (!code) return NextResponse.json({ error: "Lesson assessment not found." }, { status: 404 });
      const { data: lesson } = await supabase.from("lessons").select("id").eq("course_id", course.id).eq("slug", lessonSlug).single();
      if (!lesson) return NextResponse.json({ error: "Lesson not found." }, { status: 404 });
      lessonId = lesson.id;
      questions = CONTENT_ENGINE_ASSESSMENTS.lesson_checks[
        code as keyof typeof CONTENT_ENGINE_ASSESSMENTS.lesson_checks
      ];
    } else {
      questions = CONTENT_ENGINE_ASSESSMENTS.final_assessment.map((reference) =>
        CONTENT_ENGINE_ASSESSMENTS.lesson_checks[reference.source_lesson][reference.question_index],
      );
    }
    if (answers.length !== questions.length || answers.some((answer: number, index: number) => answer < 0 || answer >= questions[index].options.length)) {
      return NextResponse.json({ error: "Answer every question once." }, { status: 400 });
    }

    const score = questions.reduce((total, question, index) => total + (answers[index] === question.answer_index ? 1 : 0), 0);
    const percent = Math.round((score / questions.length) * 100);
    const passed = percent >= CONTENT_ENGINE_ASSESSMENTS.passing_score_percent;
    const service = createServiceClient();
    const { error } = await service.from("course_quiz_attempts").insert({
      user_id: user.id,
      course_id: course.id,
      lesson_id: lessonId,
      assessment_kind: kind,
      score,
      max_score: questions.length,
      passed,
      answers,
    });
    if (error) throw new Error(`Assessment save failed: ${error.code}`);

    return NextResponse.json({
      passed,
      score,
      maxScore: questions.length,
      percent,
      feedback: questions.map((question, index) => ({
        correct: answers[index] === question.answer_index,
        explanation: question.explanation,
      })),
    });
  } catch (error) {
    console.error("Assessment grading failed:", error instanceof Error ? error.message : "unknown error");
    return NextResponse.json({ error: "The assessment could not be graded." }, { status: 500 });
  }
}
