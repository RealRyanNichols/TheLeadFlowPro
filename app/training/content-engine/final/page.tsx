import Link from "next/link";
import { ArrowLeft, GraduationCap } from "lucide-react";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { getCourseAccess } from "@/lib/access";
import { CONTENT_ENGINE } from "@/lib/contentEngineCourse";
import { CONTENT_ENGINE_ASSESSMENTS } from "@/lib/contentEngineAssessments";
import AssessmentForm from "../AssessmentForm";
import styles from "../../training.module.css";

export default async function FinalAssessmentPage() {
  const supabase = await createClient();
  const { data: course } = await supabase.from("courses").select("id, slug, is_free").eq("slug", CONTENT_ENGINE.slug).single();
  if (!course) redirect("/training");
  const access = await getCourseAccess(course);
  if (!access.hasAccess) redirect("/training/content-engine");
  const questions = CONTENT_ENGINE_ASSESSMENTS.final_assessment.map((reference) => {
    const item = CONTENT_ENGINE_ASSESSMENTS.lesson_checks[reference.source_lesson][reference.question_index];
    return { question: item.question, options: item.options };
  });
  const { data: passedAttempt } = await supabase.from("course_quiz_attempts").select("id").eq("course_id", course.id).eq("assessment_kind", "final").eq("passed", true).limit(1).maybeSingle();

  return (
    <main className={`cb-page ${styles.page}`}>
      <section className={styles.lessonContent}>
        <div className={styles.lessonContentShell}>
          <Link href="/training/content-engine" className={styles.backLink}><ArrowLeft aria-hidden="true" /> The Content Engine</Link>
          <div className={styles.assessmentHeader}>
            <GraduationCap aria-hidden="true" />
            <p className="cb-eyebrow">Final assessment</p>
            <h1>Prove that you can run the system.</h1>
            <p>Twelve questions. Score at least 80 percent. Retakes are allowed.</p>
          </div>
          <AssessmentForm kind="final" questions={questions} initiallyPassed={!!passedAttempt} />
        </div>
      </section>
    </main>
  );
}
