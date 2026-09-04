import type { Metadata } from "next";
import Link from "next/link";
import { ArrowLeft, ArrowRight, BookOpenCheck, Check } from "lucide-react";
import PromptCopyButton from "./PromptCopyButton";
import styles from "../chatgpt-course.module.css";

export const metadata: Metadata = {
  title: "Your First ChatGPT Page | Free LeadFlow Lesson",
  description: "Build a practice landing page, check the result, and make one useful revision. A free written lesson for beginners.",
  robots: { index: false, follow: false },
};

const PROMPT = `Help me practice building a simple landing page. Use a fictional East Texas pressure-washing business called Pine Ridge Pressure Washing. Clearly label it as a practice example.

The reader is a homeowner who wants to understand the services and request a quote. Create one self-contained HTML file with embedded CSS and minimal JavaScript.

Include:
- A clear headline explaining the service
- Three services: house washing, driveways, and storefronts
- A three-step process: request a quote, review the scope, schedule the work
- An honest trust section without invented reviews, awards, certifications, or guarantees
- A clearly labeled practice quote form with name, email, property type, and message
- A button labeled "Preview quote request"
- A short FAQ and one clear next step

This is a local practice page. Do not send, store, or transmit form data. When the form is submitted, show "Practice only: nothing was sent." Do not add real contact details, analytics, external scripts, payments, or network requests.

Use navy, blue, white, readable type, accessible labels, and a layout that works on a phone. Show a preview if available. Otherwise provide the complete HTML file with simple steps to save and open it in my browser. Before finishing, check the mobile layout, button contrast, labels, and spelling.`;

const REVISION_PROMPT = `Review the practice page you just created. Explain the three biggest problems a first-time visitor would notice, then fix them. Keep the business fictional, keep the form local-only, and preserve the "Practice only: nothing was sent" message. Do not add claims or contact details. Show the revised preview or complete updated HTML file, then tell me exactly what changed.`;

export default function FreeChatGPTBuildPage() {
  return (
    <main className={`${styles.page} ${styles.freeLessonPage}`}>
      <section className={styles.lessonIntro}>
        <div className={styles.shell}>
          <Link href="/chatgpt" className={styles.backLink}><ArrowLeft aria-hidden="true" /> The ChatGPT Operator</Link>
          <p className={styles.kicker}><span>FREE</span> Written starter lesson</p>
          <h1>Build your first page. One step at a time.</h1>
          <p>You do not need to know how to code. You will give ChatGPT a clear task, inspect the result, and make one useful revision. Work at your own pace.</p>
        </div>
      </section>

      <section className={styles.lessonBody}>
        <div className={styles.lessonShell}>
          <article>
            <p className={styles.eyebrow}>Step 1 · Get ready</p>
            <h2>Start with a practice business.</h2>
            <ol className={styles.instructionList}>
              <li><span>1</span><div><strong>Open ChatGPT and start a new chat.</strong><p>A laptop or desktop gives you more room to compare the instructions with the result. Keep this lesson open beside it.</p></div></li>
              <li><span>2</span><div><strong>Use the fictional example below.</strong><p>You can practice with made-up information. There is no need to upload customer records or connect a business account.</p></div></li>
              <li><span>3</span><div><strong>Know what you are finishing.</strong><p>A page draft with an understandable offer, a practice form, and one improvement you can explain. Publishing a real business site is a separate step.</p></div></li>
            </ol>
          </article>

          <article>
            <p className={styles.eyebrow}>Step 2 · Give it a clear job</p>
            <h2>Copy this prompt into your new chat.</h2>
            <p>A prompt is simply the instruction you give the tool. This one names the business, the customer, the result, and the limits.</p>
            <PromptCopyButton text={PROMPT} label="Copy the starter prompt" />
            <pre className={styles.promptCode}>{PROMPT}</pre>
          </article>

          <article>
            <p className={styles.eyebrow}>Step 3 · Open the result</p>
            <h2>Look at the page as a customer would.</h2>
            <div className={styles.scriptCard}>
              <p>If a Preview control appears with the code, open it. Read the headline first, then find the main button.</p>
              <p>If you only see code, ask: “Give me this as a downloadable HTML file.” Save it and open that file in your browser. The practice page can run locally without publishing it.</p>
              <p>If something looks wrong, describe what you see in ordinary words. “The heading is cut off on a narrow screen” is a useful instruction.</p>
            </div>
            <p><a href="https://help.openai.com/en/articles/20001246" target="_blank" rel="noreferrer">OpenAI’s guide to code blocks and previews</a> explains the available controls.</p>
          </article>

          <article>
            <p className={styles.eyebrow}>Step 4 · Check the basics</p>
            <h2>Make sure the page does its job.</h2>
            <div className={styles.reviewGrid}>
              <span><Check aria-hidden="true" /> Can you tell what the business offers in one sentence?</span>
              <span><Check aria-hidden="true" /> Is the main button easy to find and understand?</span>
              <span><Check aria-hidden="true" /> When you narrow the window, is everything readable without sideways scrolling?</span>
              <span><Check aria-hidden="true" /> Does the practice form say nothing was sent, with no invented reviews or guarantees?</span>
            </div>
            <p>Use fictional values when you try the form. A button that looks finished is not proof that a real quote request will reach a business.</p>
          </article>

          <article>
            <p className={styles.eyebrow}>Step 5 · Make one improvement</p>
            <h2>Ask for a review, then compare the versions.</h2>
            <PromptCopyButton text={REVISION_PROMPT} label="Copy the revision prompt" />
            <pre className={styles.followupCode}>{REVISION_PROMPT}</pre>
            <p>Save the revised file. Write one sentence: “I changed ___ because ___.” You have finished this lesson when you can show the page and explain the improvement.</p>
          </article>

          <aside className={styles.lessonUpsell}>
            <BookOpenCheck aria-hidden="true" />
            <div><p className={styles.eyebrow}>Keep learning</p><h2>Use the same process for your next business task.</h2><p>The written course walks through posts, emails, images, research, page drafts, and reviewed practical work. Each lesson gives you something to finish.</p></div>
            <Link href="/chatgpt#enroll">See the written course <ArrowRight aria-hidden="true" /></Link>
          </aside>
        </div>
      </section>
    </main>
  );
}
