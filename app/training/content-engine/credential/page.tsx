import Link from "next/link";
import { Award, ArrowLeft } from "lucide-react";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { getCourseAccess } from "@/lib/access";
import { CONTENT_ENGINE } from "@/lib/contentEngineCourse";
import CredentialRequest from "./CredentialRequest";
import PrintButton from "./PrintButton";
import styles from "../../training.module.css";

export default async function CredentialPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login?next=/training/content-engine/credential");
  const { data: course } = await supabase.from("courses").select("id, slug, is_free").eq("slug", CONTENT_ENGINE.slug).single();
  if (!course) redirect("/training");
  const access = await getCourseAccess(course);
  if (!access.hasAccess) redirect("/training/content-engine");
  const { data: credential } = await supabase.from("course_credentials").select("credential_code, learner_name, final_score, issuer, disclaimer, issued_at").eq("user_id", user.id).eq("course_id", course.id).maybeSingle();
  const defaultName = typeof user.user_metadata?.full_name === "string" ? user.user_metadata.full_name : "";

  return (
    <main className={`cb-page ${styles.page}`}>
      <section className={styles.lessonContent}>
        <div className={styles.lessonContentShell}>
          <Link href="/training/content-engine" className={styles.backLink}><ArrowLeft aria-hidden="true" /> The Content Engine</Link>
          {credential ? (
            <>
              <article className={styles.credential}>
                <Award aria-hidden="true" />
                <p>PRIVATE COURSE COMPLETION LETTER</p>
                <h1>{credential.learner_name}</h1>
                <h2>completed {CONTENT_ENGINE.title}</h2>
                <p>Final assessment score: {credential.final_score} percent</p>
                <p>Issued {new Intl.DateTimeFormat("en-US", { dateStyle: "long" }).format(new Date(credential.issued_at))}</p>
                <strong>{credential.issuer}</strong>
                <small>Record code: {credential.credential_code}</small>
                <footer>{credential.disclaimer}</footer>
              </article>
              <div className={styles.printAction}><PrintButton /></div>
            </>
          ) : (
            <div className={styles.assessmentHeader}>
              <Award aria-hidden="true" />
              <p className="cb-eyebrow">Completion record</p>
              <h1>Finish it. Verify it. Put your name on it.</h1>
              <p>The system checks all 12 lesson completions, all 12 assignments, every lesson check, and the final assessment before issuing the letter.</p>
              <CredentialRequest defaultName={defaultName} />
              <p>{CONTENT_ENGINE.credentialDisclaimer}</p>
            </div>
          )}
        </div>
      </section>
    </main>
  );
}
