import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import {
  ArrowRight,
  BadgeCheck,
  BarChart3,
  Captions,
  Check,
  FileText,
  Layers3,
  MessageSquareText,
  MonitorPlay,
  Route,
  ShieldCheck,
  Target,
  TrendingUp,
  Video,
} from "lucide-react";
import CheckoutForm from "./CheckoutForm";
import MobilePurchaseBar from "./MobilePurchaseBar";
import RevenueMath from "./RevenueMath";
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
    "Learn the exact process Ryan uses to plan with ChatGPT, record with Teleprompter, edit in CapCut, and post business videos that lead somewhere.",
  alternates: { canonical: "/operator-academy/content-engine" },
  openGraph: {
    title: "Operator Academy 02: The Content Engine",
    description: CONTENT_ENGINE.promise,
    type: "website",
    images: ["/images/operator-academy/content-engine-hero-v2.png"],
  },
};

const DELIVERABLES = [
  "A clear offer your customer can understand",
  "Thirty video ideas shaped around your customer and what you sell",
  "Ten ready to read scripts built for fast recording",
  "The ChatGPT prompt process I use to plan the videos",
  "A repeatable Teleprompter, phone, or QuickTime setup",
  "A simple CapCut editing and caption checklist",
  "A posting process for your website and social media",
  "A downloadable workbook with planning and review checklists",
  "Twelve assignments, lesson checks, and a final assessment",
  "A private completion certificate and letter after verified completion",
];

const SYSTEM_STEPS = [
  {
    number: "01",
    label: "Plan it with ChatGPT",
    detail: "Tell ChatGPT what you sell, who needs it, and what question the video should answer. Leave with topics and scripts that sound like you.",
    tools: ["ChatGPT", "30 ideas", "10 scripts"],
    icon: MessageSquareText,
  },
  {
    number: "02",
    label: "Load it and record",
    detail: "Put the script in Teleprompter. Record on your phone or in QuickTime with the camera and microphone you already have. Add a background only when it helps.",
    tools: ["Teleprompter", "Phone or QuickTime", "Mic optional"],
    icon: MonitorPlay,
  },
  {
    number: "03",
    label: "Edit it and post it",
    detail: "Cut the beginning and end, add captions in CapCut, and ask ChatGPT for the shorter post. Publish to your website, social media, or both.",
    tools: ["CapCut", "Captions", "Website and social"],
    icon: Captions,
  },
  {
    number: "04",
    label: "See what people did",
    detail: "Check the numbers that match the video's job. Look at watch time, page clicks, forms, calls, checkouts, and sales instead of guessing.",
    tools: ["Views", "Clicks", "Leads and sales"],
    icon: TrendingUp,
  },
  {
    number: "05",
    label: "Make the next ten better",
    detail: "Compare the videos. Keep the hooks, topics, and calls to action that worked. Give that proof back to ChatGPT and build the next ten.",
    tools: ["Compare", "Improve", "Repeat"],
    icon: Layers3,
  },
];

const BACKGROUND_PREVIEWS = [
  { src: "/images/operator-academy/creator-background-offer.jpg", label: "Build one clear offer" },
  { src: "/images/operator-academy/creator-background-process.jpg", label: "Teach a five step process" },
  { src: "/images/operator-academy/creator-background-lead-flow.jpg", label: "Show where the lead goes" },
  { src: "/images/operator-academy/creator-background-results.jpg", label: "Walk through real results" },
  { src: "/images/operator-academy/creator-background-comparison.jpg", label: "Compare two choices" },
  { src: "/images/operator-academy/creator-background-demo.jpg", label: "Demonstrate a product" },
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
            <p className={styles.heroKicker}><span>02</span> Operator Academy</p>
            <h1>Stop making random videos.</h1>
            <p className={styles.heroAccent}>Make videos the way I make mine.</p>
            <p className={styles.lead}>{CONTENT_ENGINE.promise}</p>
            <div className={styles.heroActions}>
              <a className={styles.heroPurchase} href="#enroll">
                <span>Get founding access</span>
                <strong>$127</strong>
                <ArrowRight aria-hidden="true" />
              </a>
              <a className={styles.heroMathLink} href="#content-math">See a simple ten video example <ArrowRight aria-hidden="true" /></a>
            </div>
            <div className={styles.proofRow}>
              <span><FileText aria-hidden="true" /> 12 written lessons</span>
              <span><MonitorPlay aria-hidden="true" /> Learn at your own pace</span>
              <span><FileText aria-hidden="true" /> Workbook and 12 assignments</span>
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
            <nav className={styles.productRoute} aria-label="Learn what each Content Engine stage does">
              <a href="#stage-content"><MessageSquareText aria-hidden="true" /><span>PLAN</span><small>What you say</small></a>
              <i />
              <a href="#stage-attention"><Video aria-hidden="true" /><span>RECORD</span><small>How you make it</small></a>
              <i />
              <a href="#stage-action"><Target aria-hidden="true" /><span>CUSTOMER</span><small>Where they go</small></a>
            </nav>
            <div className={styles.productFooter}>
              <span>30 VIDEO IDEAS</span><span>10 SCRIPTS</span><span>PRINTABLE WORKBOOK</span>
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
          <div><strong>30</strong><span>video ideas built around what you sell</span></div>
          <div><strong>10</strong><span>scripts ready to read out loud</span></div>
          <div><strong>12</strong><span>assignments to put the lessons to work</span></div>
          <div><strong>1</strong><span>routine from ChatGPT to customer</span></div>
        </div>
      </section>

      <RevenueMath />

      <section className={styles.originSection}>
        <div className={styles.shell}>
          <div className={styles.originGrid}>
            <div className={styles.originStory}>
              <p className={styles.eyebrow}>Built from the work</p>
              <h2>I recorded eight videos. Then I was ready to make twenty more.</h2>
              <p>
                The breakthrough was not a new camera. I had the topics, scripts, Teleprompter,
                backgrounds, file names, and customer destination ready before I pressed Record.
              </p>
              <p>
                This course shows another business owner how to follow that same process with the
                phone, laptop, camera, and microphone they already have.
              </p>
            </div>
            <div className={styles.originProof}>
              <div className={styles.sessionHeader}>
                <span>ONE REAL RECORDING DAY</span>
                <strong>8 videos finished</strong>
              </div>
              <ul className={styles.sessionChecklist}>
                <li><Check aria-hidden="true" /><span>Topics chosen before setup</span></li>
                <li><Check aria-hidden="true" /><span>Scripts loaded in Teleprompter</span></li>
                <li><Check aria-hidden="true" /><span>Backgrounds and file names ready</span></li>
                <li><Check aria-hidden="true" /><span>One customer destination chosen</span></li>
              </ul>
              <div className={styles.sessionOutcome}>
                <span>WHAT THE SYSTEM CHANGED</span>
                <strong>I was ready to make twenty more.</strong>
                <p>I did not have to stop and make another decision between every video.</p>
              </div>
            </div>
          </div>
        </div>
      </section>

      <section className={styles.systemSection} id="system">
        <div className={styles.shell}>
          <div className={styles.sectionHeadLight}>
            <p className={styles.eyebrow}>The operating loop</p>
            <h2>Here is the exact five step process.</h2>
            <p>Plan it, record it, post it, check what happened, and use the proof to make the next ten better.</p>
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
                  <div className={styles.stepTools}>
                    {step.tools.map((tool) => <small key={tool}>{tool}</small>)}
                  </div>
                </article>
              );
            })}
          </div>
          <div className={styles.engineReturn}>
            <span />
            <p><TrendingUp aria-hidden="true" /> Take what worked back to ChatGPT. Build the next ten from proof.</p>
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
              <h2>Use a 4K teaching background. Or keep the video raw. You decide.</h2>
              <p>
                These examples show how a teaching background can give your words room to breathe.
                The written lessons and workbook help you plan the shot and keep the message clear.
                Use a background only when it helps your viewer understand the point.
              </p>
              <ul>
                <li><Check aria-hidden="true" /> Keep the teaching point easy to read</li>
                <li><Check aria-hidden="true" /> Leave space for your face and captions</li>
                <li><Check aria-hidden="true" /> Choose a layout that fits what you are explaining</li>
                <li><Check aria-hidden="true" /> Charts, comparisons, checklists, timelines, and process maps</li>
              </ul>
            </div>
          </div>
          <div className={styles.backgroundGalleryHead}>
            <div>
              <p className={styles.eyebrow}>Teaching examples</p>
              <h3>Point to the lesson while you teach it.</h3>
            </div>
            <p>Six examples from our production workspace. These are visual previews; the current learner download is the printable workbook.</p>
          </div>
          <div className={styles.backgroundGallery}>
            {BACKGROUND_PREVIEWS.map((background, index) => (
              <figure key={background.src}>
                <Image
                  src={background.src}
                  alt={`${background.label} presenter background`}
                  width={1200}
                  height={675}
                  sizes="(max-width: 680px) 100vw, (max-width: 1000px) 50vw, 33vw"
                />
                <figcaption><span>{String(index + 1).padStart(2, "0")}</span>{background.label}</figcaption>
              </figure>
            ))}
          </div>
        </div>
      </section>

      <section className={styles.valueBand}>
        <div className={styles.shell}>
          <div className={styles.sectionHead}>
            <p className={styles.eyebrow}>What you finish</p>
            <h2>You will know what to say, how to record it, and where the customer goes next.</h2>
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
                <li><Check aria-hidden="true" /> Twelve self-guided written lessons</li>
                <li><Check aria-hidden="true" /> Workbook and 12 assignments</li>
                <li><Check aria-hidden="true" /> Printable workbook</li>
                <li><Check aria-hidden="true" /> Completion pathway included</li>
              </ul>
              <a className={styles.pricePurchase} href="#enroll">
                <span>Get founding access</span><strong>$127</strong><ArrowRight aria-hidden="true" />
              </a>
            </aside>
          </div>
        </div>
      </section>

      <section className={styles.curriculum} id="curriculum">
        <div className={styles.shell}>
          <div className={styles.sectionHead}>
            <p className={styles.eyebrow}>Inside the engine</p>
            <h2>Five plain English modules. Twelve lessons you can put to work.</h2>
          </div>
          <div className={styles.moduleGrid}>
            {CONTENT_ENGINE_MODULES.map((module, index) => (
              <article key={module.title}>
                <div className={styles.moduleNumber}>{String(index + 1).padStart(2, "0")}</div>
                <span>MODULE {String(index + 1).padStart(2, "0")}</span>
                <h3>{module.title.replace(/^Module [^:]+:\s*/, "")}</h3>
                <p>{module.result}</p>
                <ul>
                  {module.lessons.map((lesson) => <li key={lesson.code}><Check aria-hidden="true" />{lesson.title}</li>)}
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
              <p>ChatGPT, Teleprompter, QuickTime, CapCut, cameras, microphones, and paid tool accounts are separate from the course.</p>
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
          <p className={styles.eyebrow}>Use the process I use</p>
          <h2>Make the next ten videos easier than the first one.</h2>
          <p>Know what to say before you press Record. Know where the customer goes before you press Post.</p>
          <CheckoutForm />
          <Link href="/login?next=/training/content-engine">Already purchased? Log in to continue.</Link>
        </div>
      </section>

      <MobilePurchaseBar />
    </main>
  );
}
