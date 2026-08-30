import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import {
  ArrowRight,
  BadgeCheck,
  BarChart3,
  Check,
  CirclePlay,
  FileText,
  Layers3,
  Play,
  Route,
  ShieldCheck,
  Sparkles,
  Target,
  TrendingUp,
  Video,
  Zap,
} from "lucide-react";
import CheckoutForm from "./CheckoutForm";
import styles from "./page.module.css";
import {
  CONTENT_ENGINE,
  CONTENT_ENGINE_MODULES,
  CONTENT_ENGINE_PATHWAYS,
  formatCoursePrice,
} from "@/lib/contentEngineCourse";

export const metadata: Metadata = {
  title: "The Content Engine Course | The LeadFlow Pro",
  description:
    "Build a repeatable system for thirty video topics, ten camera ready scripts, efficient recording, and one owned path from content to action.",
  alternates: { canonical: "/operator-academy/content-engine" },
  openGraph: {
    title: "Operator Academy 02: The Content Engine",
    description: CONTENT_ENGINE.promise,
    type: "website",
    images: ["/images/operator-academy/content-engine-hero-v2.png"],
  },
};

const DELIVERABLES = [
  "One clear offer and honest outcome",
  "A thirty topic content matrix",
  "Ten camera ready scripts",
  "A repeatable recording setup",
  "A fast editing checklist",
  "One owned route from every video to action",
  "Twelve lesson checks and a final assessment",
  "A private completion letter after verified completion",
];

const SYSTEM_STEPS = [
  { number: "01", label: "Plan", detail: "Give the batch one job", icon: Target },
  { number: "02", label: "Record", detail: "Use one repeatable setup", icon: Video },
  { number: "03", label: "Publish", detail: "Send attention somewhere owned", icon: Zap },
  { number: "04", label: "Measure", detail: "Track the signal tied to the job", icon: TrendingUp },
  { number: "05", label: "Improve", detail: "Use proof to shape the next batch", icon: Layers3 },
];

export default function ContentEnginePage() {
  return (
    <main className={styles.page}>
      <section className={styles.hero}>
        <Image
          className={styles.heroImage}
          src="/images/operator-academy/content-engine-hero-v2.png"
          alt="A cinematic content production engine connecting a camera, editing timeline, analytics, and a lead pipeline"
          fill
          priority
          sizes="100vw"
        />
        <div className={styles.heroShade} />
        <div className={styles.heroGridLines} />
        <div className={styles.heroOrb} />
        <div className={`${styles.shell} ${styles.heroShell}`}>
          <div className={styles.heroCopy}>
            <div className={styles.heroBadge}>
              <Sparkles aria-hidden="true" />
              Operator Academy 02
            </div>
            <h1>Stop making random videos.</h1>
            <p className={styles.heroAccent}>Build a content engine.</p>
            <p className={styles.lead}>{CONTENT_ENGINE.promise}</p>
            <div className={styles.proofRow}>
              <span><CirclePlay aria-hidden="true" /> 12 complete lessons</span>
              <span><FileText aria-hidden="true" /> Workbook and assignments</span>
              <span><BadgeCheck aria-hidden="true" /> Verified completion path</span>
            </div>
            <CheckoutForm />
          </div>

          <div className={styles.heroProduct} aria-label="Course deliverables preview">
            <div className={styles.productGlow} />
            <div className={styles.productTopline}>
              <span>THE LEADFLOW PRO</span>
              <span>02</span>
            </div>
            <div className={styles.productTitle}>
              <small>OPERATOR ACADEMY</small>
              <strong>THE<br />CONTENT<br />ENGINE</strong>
            </div>
            <div className={styles.productRoute}>
              <div><Video aria-hidden="true" /><span>CONTENT</span></div>
              <i />
              <div><TrendingUp aria-hidden="true" /><span>ATTENTION</span></div>
              <i />
              <div><Target aria-hidden="true" /><span>ACTION</span></div>
            </div>
            <div className={styles.productFooter}>
              <span>30 TOPICS</span><span>10 SCRIPTS</span><span>1 SYSTEM</span>
            </div>
          </div>
        </div>
        <a className={styles.heroScroll} href="#system" aria-label="See how the system works">
          <span>See the system</span>
          <ArrowRight aria-hidden="true" />
        </a>
      </section>

      <section className={styles.statRail} aria-label="Course outputs">
        <div className={styles.shell}>
          <div><strong>30</strong><span>distinct video topics</span></div>
          <div><strong>10</strong><span>camera ready scripts</span></div>
          <div><strong>12</strong><span>complete lessons</span></div>
          <div><strong>1</strong><span>repeatable operating system</span></div>
        </div>
      </section>

      <section className={styles.originSection}>
        <div className={styles.shell}>
          <div className={styles.originGrid}>
            <div className={styles.originStory}>
              <p className={styles.eyebrow}>Built from the work</p>
              <h2>I recorded eight videos. Then I was ready to make twenty more.</h2>
              <p>
                The breakthrough was not a new camera. It was having the topics, scripts,
                Teleprompter, backgrounds, filenames, and destination ready before recording started.
              </p>
              <p>
                This course turns that working process into a system another business owner can use,
                inspect, and improve.
              </p>
            </div>
            <div className={styles.originProof}>
              <div className={styles.recordingRing}>
                <span><Play aria-hidden="true" /></span>
                <strong>8</strong>
                <small>VIDEOS RECORDED<br />IN ONE SESSION</small>
              </div>
              <div className={styles.proofSignal}>
                <span>THE SIGNAL</span>
                <strong>I wanted to keep recording.</strong>
                <p>A repeatable process removed the friction that usually ends the session.</p>
              </div>
            </div>
          </div>
        </div>
      </section>

      <section className={styles.systemSection} id="system">
        <div className={styles.shell}>
          <div className={styles.sectionHeadLight}>
            <p className={styles.eyebrow}>The operating loop</p>
            <h2>Five moves. One system that gets smarter every time you use it.</h2>
            <p>Each video gets a job before the camera comes on. Each result becomes proof for the next batch.</p>
          </div>
          <div className={styles.engineMap}>
            <div className={styles.engineBeam} />
            {SYSTEM_STEPS.map((step) => {
              const Icon = step.icon;
              return (
                <article key={step.number}>
                  <div className={styles.stepIcon}><Icon aria-hidden="true" /></div>
                  <span>{step.number}</span>
                  <h3>{step.label}</h3>
                  <p>{step.detail}</p>
                </article>
              );
            })}
          </div>
          <div className={styles.engineReturn}>
            <span />
            <p><TrendingUp aria-hidden="true" /> Measure what happened. Build the next batch from evidence.</p>
          </div>
        </div>
      </section>

      <section className={styles.studioSection}>
        <div className={styles.shell}>
          <div className={styles.studioGrid}>
            <div className={styles.studioFrame}>
              <Image
                src="/images/operator-academy/content-engine-studio-v2.png"
                alt="A high definition virtual production stage with space for a presenter and lesson graphics"
                fill
                sizes="(max-width: 900px) 100vw, 58vw"
              />
              <div className={styles.studioHud}>
                <span>4K LESSON STAGE</span>
                <span>3840 × 2160</span>
              </div>
              <div className={styles.studioLesson}>
                <small>CE L01</small>
                <strong>STOP POSTING<br />WITHOUT A<br />DESTINATION</strong>
                <div><span>ONE PERSON</span><i /><span>USEFUL PROMISE</span><i /><span>NEXT ACTION</span></div>
              </div>
            </div>
            <div className={styles.studioCopy}>
              <p className={styles.eyebrow}>Teach it on screen</p>
              <h2>A real lesson environment, not a PowerPoint pasted behind your head.</h2>
              <p>
                The course includes presenter-safe lesson stages with exact titles, diagrams,
                charts, and visual cues. You can point to the lesson, teach around it, and give the
                viewer more than a talking head.
              </p>
              <ul>
                <li><Check aria-hidden="true" /> Left and right presenter layouts</li>
                <li><Check aria-hidden="true" /> Exact, readable lesson overlays</li>
                <li><Check aria-hidden="true" /> Charts and process maps built for teaching</li>
                <li><Check aria-hidden="true" /> High definition QuickTime-ready backgrounds</li>
              </ul>
            </div>
          </div>
        </div>
      </section>

      <section className={styles.valueBand}>
        <div className={styles.shell}>
          <div className={styles.sectionHead}>
            <p className={styles.eyebrow}>What you finish</p>
            <h2>A working system, not another folder of videos you never use.</h2>
          </div>
          <div className={styles.valueGrid}>
            <div className={styles.deliverables}>
              {DELIVERABLES.map((item, index) => (
                <div key={item}><span>{String(index + 1).padStart(2, "0")}</span><Check aria-hidden="true" /><strong>{item}</strong></div>
              ))}
            </div>
            <aside className={styles.priceCard}>
              <div className={styles.priceGlow} />
              <p>Founding access</p>
              <strong>{formatCoursePrice(CONTENT_ENGINE.foundingPriceCents)}</strong>
              <span>One payment</span>
              <small>Regular price will be {formatCoursePrice(CONTENT_ENGINE.regularPriceCents)} after the founding revision.</small>
              <ul>
                <li><Check aria-hidden="true" /> Immediate course access</li>
                <li><Check aria-hidden="true" /> Workbook included</li>
                <li><Check aria-hidden="true" /> Completion pathway included</li>
              </ul>
              <a href="#enroll">Start the course <ArrowRight aria-hidden="true" /></a>
            </aside>
          </div>
        </div>
      </section>

      <section className={styles.curriculum}>
        <div className={styles.shell}>
          <div className={styles.sectionHead}>
            <p className={styles.eyebrow}>Inside the engine</p>
            <h2>Five modules. Twelve lessons. One operating loop.</h2>
          </div>
          <div className={styles.moduleGrid}>
            {CONTENT_ENGINE_MODULES.map((module, index) => (
              <article key={module.title}>
                <div className={styles.moduleNumber}>{String(index + 1).padStart(2, "0")}</div>
                <span>MODULE {String(index + 1).padStart(2, "0")}</span>
                <h3>{module.title.replace(/^Module [^:]+:\s*/, "")}</h3>
                <p>{module.result}</p>
                <ul>
                  {module.lessons.map((lesson) => <li key={lesson.code}><CirclePlay aria-hidden="true" />{lesson.title}</li>)}
                </ul>
              </article>
            ))}
          </div>
        </div>
      </section>

      <section className={styles.boundaryBand}>
        <div className={styles.shell}>
          <div className={styles.boundaryGrid}>
            <div>
              <ShieldCheck aria-hidden="true" />
              <p className={styles.eyebrow}>Straight answer</p>
              <h2>This course teaches a production and marketing workflow. It does not sell a fantasy.</h2>
            </div>
            <div>
              <p>No guaranteed views, leads, sales, search rankings, income, jobs, or viral results.</p>
              <p>{CONTENT_ENGINE.credentialDisclaimer}</p>
              <p>{CONTENT_ENGINE.accessDisclosure}</p>
            </div>
          </div>
        </div>
      </section>

      <section className={styles.pathways}>
        <div className={styles.shell}>
          <div className={styles.sectionHead}>
            <p className={styles.eyebrow}>Keep going after this course</p>
            <h2>Use the system here. Pursue outside credentials only through their official issuers.</h2>
          </div>
          <div className={styles.pathwayGrid}>
            {CONTENT_ENGINE_PATHWAYS.map((pathway) => (
              <a key={pathway.title} href={pathway.href} target="_blank" rel="noreferrer">
                <BarChart3 aria-hidden="true" />
                <span>{pathway.issuer}</span>
                <h3>{pathway.title}</h3>
                <p>{pathway.detail}</p>
                <strong>Open official source <ArrowRight aria-hidden="true" /></strong>
              </a>
            ))}
          </div>
        </div>
      </section>

      <section className={styles.finalCta} id="enroll">
        <div className={styles.finalGlow} />
        <div className={styles.shell}>
          <Route aria-hidden="true" />
          <p className={styles.eyebrow}>Build the route</p>
          <h2>Your next ten videos should lead somewhere.</h2>
          <p>Start with one person, one useful promise, and one next action you can measure.</p>
          <CheckoutForm />
          <Link href="/login?next=/training/content-engine">Already purchased? Log in to continue.</Link>
        </div>
      </section>
    </main>
  );
}
