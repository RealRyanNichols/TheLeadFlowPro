import type { Metadata } from "next";
import Link from "next/link";
import { ArrowLeft, ArrowRight, Check, Copy, MonitorPlay } from "lucide-react";
import styles from "../chatgpt-course.module.css";

export const metadata: Metadata = {
  title: "Free ChatGPT Starter Build | The LeadFlow Pro",
  description: "Build a working one-page landing page inside ChatGPT with one practical prompt.",
  robots: { index: false, follow: false },
};

const PROMPT = `Build a polished, mobile-friendly one-page landing page for a fictional East Texas pressure-washing company called Pine Ridge Pressure Washing.

The goal is to turn a visitor into a quote request. The audience is homeowners and small commercial property owners.

Build the page as one self-contained HTML file with embedded CSS and only the minimum JavaScript needed. Include:
- a strong headline and short supporting promise
- services for house washing, driveways, roofs, and storefronts
- a simple three-step process
- a short proof and trust section without inventing reviews or certifications
- a quote-request form with name, phone, email, property type, and message
- a click-to-call button using the fictional number (903) 555-0147
- a clear final call to action

Use a clean East Texas visual direction with deep navy, pressure-wash blue, white, and one warm accent. Make it look professional on a phone first and desktop second. Use no copyrighted logos, no external libraries, and no claims that cannot be verified.

Show the finished page in an interactive preview inside ChatGPT. Make reasonable copy and design decisions without asking me questions. Before finishing, check the mobile layout, form labels, button contrast, and obvious spelling problems.`;

export default function FreeChatGPTBuildPage() {
  return (
    <main className={`${styles.page} ${styles.freeLessonPage}`}>
      <section className={styles.lessonIntro}>
        <div className={styles.shell}>
          <Link href="/chatgpt" className={styles.backLink}><ArrowLeft aria-hidden="true" /> The ChatGPT Operator</Link>
          <p className={styles.kicker}><span>FREE</span> Starter build</p>
          <h1>Build a landing page while people watch.</h1>
          <p>Use regular ChatGPT in a browser. The finished result should appear as a code preview viewers can recognize immediately.</p>
        </div>
      </section>

      <section className={styles.lessonBody}>
        <div className={styles.lessonShell}>
          <article>
            <p className={styles.eyebrow}>Before recording</p>
            <h2>Set the screen up first.</h2>
            <ol className={styles.instructionList}>
              <li><span>1</span><div><strong>Open ChatGPT.com in a clean browser window.</strong><p>Close personal tabs. Collapse or hide the sidebar. Turn off notifications. Zoom to 110 or 125 percent so the words are readable on a phone.</p></div></li>
              <li><span>2</span><div><strong>Start a new chat inside your course-demo project.</strong><p>Use a fresh chat so the viewer sees one prompt and one result without unrelated history.</p></div></li>
              <li><span>3</span><div><strong>Record the ChatGPT window and your microphone.</strong><p>Keep your camera optional. The important part is the prompt, the live build, and the finished preview.</p></div></li>
            </ol>
          </article>

          <article>
            <div className={styles.promptHeading}><div><p className={styles.eyebrow}>Paste this exact prompt</p><h2>The public build prompt</h2></div><Copy aria-hidden="true" /></div>
            <pre className={styles.promptCode}>{PROMPT}</pre>
          </article>

          <article>
            <p className={styles.eyebrow}>What to say while it builds</p>
            <h2>Keep the narration useful.</h2>
            <div className={styles.scriptCard}>
              <p>“I did not tell ChatGPT how to code every section. I told it the business, the customer, the job of the page, the pieces it must include, and the boundaries it cannot cross.”</p>
              <p>“Watch the first version come together. This is not automatically a finished business website. It is a working first build we can see, test, and improve.”</p>
              <p>“The real skill is not typing a magic sentence. The skill is giving ChatGPT enough context to make good decisions and then knowing what to check.”</p>
            </div>
          </article>

          <article>
            <p className={styles.eyebrow}>When the preview appears</p>
            <h2>Check four things on screen.</h2>
            <div className={styles.reviewGrid}>
              <span><Check aria-hidden="true" /> Can you understand the offer in five seconds?</span>
              <span><Check aria-hidden="true" /> Is the main button obvious?</span>
              <span><Check aria-hidden="true" /> Does the page look clean on a phone?</span>
              <span><Check aria-hidden="true" /> Did ChatGPT invent reviews, awards, or guarantees?</span>
            </div>
          </article>

          <article>
            <p className={styles.eyebrow}>The follow-up prompt</p>
            <h2>Show viewers how revision works.</h2>
            <pre className={styles.followupCode}>Review the page you just built as a skeptical customer and as a conversion-focused web designer. Fix the three highest-impact problems you find. Preserve the business name, services, fictional phone number, and honest-claims boundary. Then show the updated preview.</pre>
          </article>

          <aside className={styles.lessonUpsell}>
            <MonitorPlay aria-hidden="true" />
            <div><p className={styles.eyebrow}>Keep building</p><h2>This is one lesson. The paid course builds the whole operating system.</h2><p>Move from first prompts into images, social posts, email, research, client deliverables, quality control, repeatable workflows, and a final capstone.</p></div>
            <Link href="/chatgpt#enroll">See founding access <ArrowRight aria-hidden="true" /></Link>
          </aside>
        </div>
      </section>
    </main>
  );
}
