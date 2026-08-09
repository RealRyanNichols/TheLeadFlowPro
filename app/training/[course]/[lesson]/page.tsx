import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import ReactMarkdown from "react-markdown";
import { createClient } from "@/lib/supabase/server";
import { getTrainingAccess } from "@/lib/access";
import CompleteButton from "./CompleteButton";

export default async function LessonPage({
  params,
}: {
  params: Promise<{ course: string; lesson: string }>;
}) {
  const { course: courseSlug, lesson: lessonSlug } = await params;
  const supabase = await createClient();

  const { data: course } = await supabase
    .from("courses")
    .select("id, slug, title")
    .eq("slug", courseSlug)
    .single();
  if (!course) notFound();

  const { data: courseFull } = await supabase
    .from("courses")
    .select("is_free")
    .eq("id", course.id)
    .single();
  if (!courseFull?.is_free) {
    const { hasTraining } = await getTrainingAccess();
    if (!hasTraining) redirect(`/training/${courseSlug}`);
  }

  const { data: lesson } = await supabase
    .from("lessons")
    .select("*")
    .eq("course_id", course.id)
    .eq("slug", lessonSlug)
    .single();
  if (!lesson) notFound();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  const { data: done } = await supabase
    .from("lesson_progress")
    .select("id")
    .eq("user_id", user!.id)
    .eq("lesson_id", lesson.id)
    .maybeSingle();

  return (
    <section className="mx-auto max-w-3xl px-4 py-12">
      <Link href={`/training/${course.slug}`} className="text-sm text-flow-400 hover:underline">
        ← {course.title}
      </Link>

      {lesson.video_url && (
        <div className="card mt-6 aspect-video overflow-hidden !p-0">
          <iframe
            src={lesson.video_url}
            className="h-full w-full"
            allowFullScreen
            title={lesson.title}
          />
        </div>
      )}

      <article className="prose-lfp mt-4">
        <ReactMarkdown>{lesson.content ?? ""}</ReactMarkdown>
      </article>

      <div className="mt-10 border-t border-line pt-6">
        <CompleteButton lessonId={lesson.id} initiallyDone={!!done} />
      </div>
    </section>
  );
}
