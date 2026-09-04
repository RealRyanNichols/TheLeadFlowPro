import type { Metadata } from "next";
import Link from "next/link";
import {
  ArrowRight,
  BadgeCheck,
  BookOpenCheck,
  BrainCircuit,
  Check,
  CirclePlay,
  FileCheck2,
  GraduationCap,
  Image as ImageIcon,
  LockKeyhole,
  Mail,
  MonitorPlay,
  SearchCheck,
  ShieldCheck,
  Sparkles,
} from "lucide-react";
import { FreeAccessForm, PaidCheckoutForm } from "./CourseActions";
import styles from "./chatgpt-course.module.css";
import {
  CHATGPT_OPERATOR,
  CHATGPT_OPERATOR_LEVELS,
  formatChatGPTCoursePrice,
} from "@/lib/chatgptOperatorCourse";

export const metadata: Metadata = {
  title: "The ChatGPT Operator Course | The LeadFlow Pro",
  description: CHATGPT_OPERATOR.promise,
  alternates: { canonical: "/chatgpt" },
  openGraph: {
    title: "The ChatGPT Operator",
    description: "From your first useful prompt to a complete business system.",
    type: "website",
  },
};

const BUILDS = [
  { icon: ImageIcon, title: "Professional image", copy: "Create and refine a profile image, branded visual, or social graphic." },
  { icon: Mail, title: "Post and email", copy: "Turn one idea into platform-ready copy that still sounds human." },
  { icon: MonitorPlay, title: "Landing page", copy: "Build and preview a responsive one-page site from a single clear brief." },
  { icon: SearchCheck, title: "Research brief", copy: "Gather current information, cite the sources, and separate fact from inference." },
  { icon: FileCheck2, title: "Client deliverable", copy: "Turn notes and files into finished work, then run a quality-control pass." },
  { icon: BrainCircuit, title: "Operator system", copy: "Design a repeatable workflow with inputs, review gates, and a measurable result." },
];

export default function ChatGPTCoursePage() {
  return (
    <main className={styles.page}>
      <section className={styles.hero}>
        <div className={styles.heroGlow} />
        <div className={styles.shell}>
          <div className={styles.heroGrid}>
            <div className={styles.heroCopy}>
              <p className={styles.kicker}><span>01</span> LeadFlow Operator Academy</p>
              <h1>Stop asking ChatGPT random questions.</h1>
              <p className={styles.heroAccent}>Make it produce real work.</p>
              <p className={styles.lead}>{CHATGPT_OPERATOR.promise}</p>
              <div className={styles.heroActions}>
                <a href="#free-build" className={styles.primaryAction}>Start free <ArrowRight aria-hidden="true" /></a>
                <a href="#enroll" className={styles.secondaryAction}>See the full course</a>
              </div>
              <div className={styles.proofRow}>
                <span><BookOpenCheck aria-hidden="true" /> 12 written lessons</span>
                <span><FileCheck2 aria-hidden="true" /> 4 reviewed builds</span>
                <span><BadgeCheck aria-hidden="true" /> Quizzes and capstone</span>
              </div>
            </div>

            <div className={styles.demoCard} aria-label="Example ChatGPT build sequence">
              <div className={styles.windowBar}><i /><i /><i /><span>CHATGPT OPERATOR BUILD</span></div>
              <div className={styles.promptBlock}>
                <small>YOUR PROMPT</small>
                <p>Build a polished mobile landing page for a local service business. Make it ready to preview.</p>
              </div>
              <div className={styles.buildFlow}>
                <span><Check aria-hidden="true" /> Offer clarified</span>
                <span><Check aria-hidden="true" /> Copy written</span>
                <span><Check aria-hidden="true" /> Page built</span>
                <span><Check aria-hidden="true" /> Mobile checked</span>
              </div>
              <div className={styles.previewCard}>
                <div><small>LIVE PREVIEW</small><strong>Pine Ridge Pressure Washing</strong><p>Clean property. Clear price. Fast quote.</p></div>
                <button type="button">Get a free quote</button>
              </div>
              <div className={styles.cursorLine}><Sparkles aria-hidden="true" /> One prompt. A result you can see.</div>
            </div>
          </div>
        </div>
      </section>

      <section className={styles.buildStrip}>
        <div className={styles.shell}>
          <p>YOU WILL BUILD</p>
          <div>{BUILDS.map(({ icon: Icon, title }) => <span key={title}><Icon aria-hidden="true" /> {title}</span>)}</div>
        </div>
      </section>

      <section className={styles.freeSection} id="free-build">
        <div className={styles.shell}>
          <div className={styles.freeGrid}>
            <div>
              <p className={styles.eyebrow}>Start tonight</p>
              <h2>Build your first landing-page draft.</h2>
              <p>Follow a short written lesson with a copyable prompt, a fictional practice business, and a checklist to review the result. Start with what you know. No payment required.</p>
              <ul>
                <li><CirclePlay aria-hidden="true" /> A simple task you can work through at your own pace</li>
                <li><MonitorPlay aria-hidden="true" /> A page draft you can preview and improve</li>
                <li><FileCheck2 aria-hidden="true" /> A reusable prompt you can adapt after practicing</li>
              </ul>
            </div>
            <FreeAccessForm />
          </div>
        </div>
      </section>

      <section className={styles.curriculum} id="curriculum">
        <div className={styles.shell}>
          <div className={styles.sectionHead}>
            <div><p className={styles.eyebrow}>The course path</p><h2>Four levels. Every level ends with proof.</h2></div>
            <p>Read, build, and check your result. Submit the practical work for review, then revise it when needed.</p>
          </div>
          <div className={styles.levelGrid}>
            {CHATGPT_OPERATOR_LEVELS.map((level) => (
              <article key={level.number}>
                <div className={styles.levelNumber}>{level.number}</div>
                <p className={styles.levelLabel}>Level {level.number}</p>
                <h3>{level.title}</h3>
                <p>{level.result}</p>
                <ol>
                  {level.lessons.map((lesson) => <li key={lesson.slug}><span>{lesson.code.replace("CG L", "")}</span>{lesson.title}{lesson.deliverable ? <FileCheck2 aria-label="Practical deliverable" /> : null}</li>)}
                </ol>
              </article>
            ))}
          </div>
        </div>
      </section>

      <section className={styles.gradingSection}>
        <div className={styles.shell}>
          <div className={styles.gradingGrid}>
            <div>
              <p className={styles.eyebrow}>How completion works</p>
              <h2>Show what you can do.</h2>
              <p>You pass when the lesson checks are complete, the four practical builds are approved, and the final assessment reaches the required score.</p>
            </div>
            <div className={styles.scoreCard}>
              <div><strong>80%</strong><span>minimum quiz and final score</span></div>
              <div><strong>4</strong><span>submitted and approved builds</span></div>
              <div><strong>12</strong><span>lessons marked complete</span></div>
              <div><strong>1</strong><span>operator capstone system</span></div>
            </div>
          </div>
        </div>
      </section>

      <section className={styles.enrollSection} id="enroll">
        <div className={styles.shell}>
          <div className={styles.priceGrid}>
            <div className={styles.offerCopy}>
              <p className={styles.eyebrow}>Founding access</p>
              <h2>Learn it once. Keep the system.</h2>
              <p>{CHATGPT_OPERATOR.accessDisclosure}</p>
              <ul>
                <li><Check aria-hidden="true" /> Beginner, Intermediate, Professional, and Expert levels</li>
                <li><Check aria-hidden="true" /> Copy-and-use prompt library</li>
                <li><Check aria-hidden="true" /> Four practical submissions with review status</li>
                <li><Check aria-hidden="true" /> Lesson checks and final assessment</li>
                <li><Check aria-hidden="true" /> Private completion credential after verified completion</li>
              </ul>
            </div>
            <div className={styles.priceCard}>
              <span className={styles.foundingBadge}>FOUNDING PRICE</span>
              <p className={styles.wasPrice}>Regular price {formatChatGPTCoursePrice(CHATGPT_OPERATOR.regularPriceCents)}</p>
              <div className={styles.price}>{formatChatGPTCoursePrice(CHATGPT_OPERATOR.foundingPriceCents)}<small>one time</small></div>
              <p>Start now with the full written course and workbook. Move through the lessons at your own pace.</p>
              <PaidCheckoutForm />
              <div className={styles.trustStack}>
                <span><LockKeyhole aria-hidden="true" /> Paid lessons stay behind your login</span>
                <span><ShieldCheck aria-hidden="true" /> No guaranteed income, leads, or business results</span>
                <span><GraduationCap aria-hidden="true" /> Completion credential is private and non-accredited</span>
              </div>
            </div>
          </div>
        </div>
      </section>

      <section className={styles.footerCta}>
        <div className={styles.shell}>
          <div><p className={styles.eyebrow}>Already purchased?</p><h2>Go back to your course.</h2></div>
          <Link href="/login?next=/training/chatgpt-operator">Log in and continue <ArrowRight aria-hidden="true" /></Link>
        </div>
      </section>
    </main>
  );
}
