import Link from "next/link";
import { notFound } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { getTrainingAccess } from "@/lib/access";
import BuyButton from "@/components/BuyButton";

export default async function CoursePage({
  params,
}: {
  params: Promise<{ course: string }>;
}) {
  const { course: courseSlug } = await params;
  const supabase = await createClient();

  const { data: course } = await supabase
    .from("courses")
    .select("*")
    .eq("slug", courseSlug)
    .single();

  if (!course) notFound();

  if (!course.is_free) {
    const { hasTraining } = await getTrainingAccess();
    if (!hasTraining) {
      return (
        <section className="mx-auto max-w-3xl px-4 py-16">
          <Link href="/training" className="text-sm text-flow-400 hover:underline">
            ← All courses
          </Link>
          <div className="card mt-6 border border-[var(--accent-line)] text-center shadow-[0_12px_32px_rgba(18,64,232,0.16)]">
            <h1 className="text-2xl font-black text-[var(--heading)]">{course.title}</h1>
            <p className="mt-3 text-[var(--text)]">
              This course is part of the full Own Your Platform training. One
              payment, lifetime access, every course — and the capstone where
              you build your own platform.
            </p>
            <div className="mt-6 flex flex-wrap justify-center gap-3">
              <BuyButton label="Unlock Everything — $497" />
              <Link href="/pricing/learn-it" className="btn-ghost">
                See What's Inside
              </Link>
            </div>
            <p className="mt-4 text-xs text-[var(--quiet)]">
              Already purchased? Log in with the same email you bought with.
            </p>
          </div>
        </section>
      );
    }
  }

  const { data: lessons } = await supabase
    .from("lessons")
    .select("id, slug, title, summary, sort_order")
    .eq("course_id", course.id)
    .order("sort_order");

  const {
    data: { user },
  } = await supabase.auth.getUser();

  const { data: progress } = await supabase
    .from("lesson_progress")
    .select("lesson_id")
    .eq("user_id", user!.id);

  const doneIds = new Set((progress ?? []).map((p) => p.lesson_id));

  return (
    <section className="mx-auto max-w-3xl px-4 py-12">
      <Link href="/training" className="text-sm text-flow-400 hover:underline">
        ← All courses
      </Link>
      <h1 className="mt-3 text-3xl font-black text-[var(--heading)]">{course.title}</h1>
      <p className="mt-2 text-[var(--muted)]">{course.description}</p>

      <div className="mt-8 space-y-3">
        {(lessons ?? []).length === 0 && (
          <div className="card text-center text-[var(--muted)]">
            Lessons for this course are being recorded. The Start Here course is
            live now.
          </div>
        )}
        {lessons?.map((l, i) => (
          <Link
            key={l.id}
            href={`/training/${course.slug}/${l.slug}`}
            className="card flex items-center gap-4 transition hover:border-flow-500"
          >
            <span
              className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-sm font-bold ${
                doneIds.has(l.id) ? "bg-mint/20 text-mint" : "bg-line text-[var(--muted)]"
              }`}
            >
              {doneIds.has(l.id) ? "✓" : i + 1}
            </span>
            <div>
              <h2 className="font-bold text-[var(--heading)]">{l.title}</h2>
              {l.summary && <p className="text-sm text-[var(--muted)]">{l.summary}</p>}
            </div>
          </Link>
        ))}
      </div>
    </section>
  );
}
