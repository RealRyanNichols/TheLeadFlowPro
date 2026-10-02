import { ArrowRight, CalendarCheck2, MessageSquareText, PhoneCall, PlayCircle } from "lucide-react";
import { BUSINESS } from "@/lib/site/business";
import { bookingPage } from "@/lib/site/external-links";
import { SCOTT_NUMBERS_NOTE, SCOTT_STATS } from "@/lib/contractorSeries";
import styles from "./contractors.module.css";

// Where the contractor email series sends people (lib/contractorSeries.ts):
// #scott is the video, #inquiry is the form we built for Scott, #call is the
// booking. Made for people who already applied through the Scott video ad,
// so it stays out of search. Scott's numbers are his, said on camera, and
// always carry the note. Nothing here promises leads, jobs or revenue.

export const metadata = {
  title: "More of the Right Work | The LeadFlow Pro",
  description:
    "For established dirt work, land clearing and pond businesses. Scott's story in his own words, the inquiry form we built for him, and a twenty minute call to map yours.",
  robots: { index: false, follow: true },
};

const FORM_QUESTIONS = [
  {
    question: "What is the project?",
    answers: "Pond or stock tank. Land clearing. Dirt work or grading. Excavation or site prep. Hay or commercial ag.",
  },
  {
    question: "How far is the property from Tyler?",
    answers: "In Tyler or right outside it. Within 15 miles. 15 to 30 miles. More than 30 miles.",
  },
  {
    question: "Anything else Scott should know?",
    answers: "Acres, access, timing.",
  },
];

function withUtm(url: string, content: string): string {
  return `${url}${url.includes("?") ? "&" : "?"}utm_source=site&utm_medium=landing&utm_campaign=contractor_owner&utm_content=${content}`;
}

export default function ContractorsPage() {
  const booking = bookingPage();
  const bookHref = booking ? withUtm(booking, "book") : BUSINESS.phone.tel;

  return (
    <main className={`cb-page ${styles.page}`}>
      <section className="cb-hero">
        <div className="cb-shell cb-hero-layout">
          <div className="cb-hero-copy">
            <p className="cb-eyebrow">Dirt work · Land clearing · Ponds</p>
            <h1 className="cb-h1">
              More of the right work.
              <em>Built around the jobs you want.</em>
            </h1>
            <p className="cb-hero-lead">
              Scott runs O-L Guy Farms out of Tyler. Watch one month of his, in his own words. Then
              pick a time and I will map yours.
            </p>
            <div className="cb-actions">
              <a className="cb-btn cb-btn--primary" href="#scott">
                Watch Scott tell it
                <PlayCircle aria-hidden="true" />
              </a>
              <a className="cb-btn cb-btn--ghost" href={bookHref}>
                Pick a time, I call you
              </a>
            </div>
            <p className="cb-hero-own">
              <PhoneCall aria-hidden="true" />
              {BUSINESS.phone.display}. I answer my own phone.
            </p>
          </div>
        </div>
      </section>

      <section id="scott" className={`cb-band ${styles.band}`} tabIndex={-1}>
        <div className={`cb-shell ${styles.storyGrid}`}>
          <div className={styles.videoFrame}>
            <video
              className={styles.video}
              controls
              playsInline
              preload="metadata"
              poster="/video/scott-contractor-story-poster.jpg"
            >
              <source src="/video/scott-contractor-story.mp4" type="video/mp4" />
              Your browser cannot play this video. Call or text {BUSINESS.phone.display} and I will walk you through it.
            </video>
          </div>
          <div className={styles.storyCopy}>
            <p className="cb-eyebrow">Case file · O-L Guy Farms</p>
            <h2 className="cb-h2">Scott, in his own words.</h2>
            <p className="cb-lead">
              Custom ag service and dirt work out of Tyler. For years, word of mouth kept him busy.
              Then he lost his two biggest customers. The equipment payments did not stop.
            </p>
            <p className="cb-lead">
              So my team and I built the system around the work he wanted. A website that shows his real
              work. Real job site video. Ads around Tyler. An inquiry form that screens the job before
              anyone drives out.
            </p>
            <blockquote className={styles.quote}>
              <p>At the end of the day, the profit margin is roughly $4,500, give or take a little bit.</p>
              <cite>Scott, O-L Guy Farms</cite>
            </blockquote>
            <div className={styles.stats}>
              {SCOTT_STATS.map((stat) => (
                <div key={stat.label} className={styles.stat}>
                  <strong>{stat.value}</strong>
                  <span>{stat.label}</span>
                </div>
              ))}
            </div>
            <p className={styles.note}>{SCOTT_NUMBERS_NOTE}</p>
          </div>
        </div>
      </section>

      <section id="inquiry" className={`cb-band cb-band--ink ${styles.band}`} tabIndex={-1}>
        <div className={`cb-shell ${styles.inquiryGrid}`}>
          <div>
            <p className="cb-eyebrow">The inquiry form we built for Scott</p>
            <h2 className="cb-h2">Screen it before you load the truck.</h2>
            <p className="cb-lead">
              The landowner answers these before anyone drives anywhere. Scott calls back knowing the job
              and how far out it is.
            </p>
            <blockquote className={styles.quote}>
              <p>They knew who I was, they knew what I was calling about, and I mean, it was simple, painless.</p>
              <cite>Scott, on calling back the inquiry that became his pond job</cite>
            </blockquote>
          </div>
          <ol className={styles.formCard} aria-label="The questions on Scott's inquiry form">
            {FORM_QUESTIONS.map((item, index) => (
              <li key={item.question}>
                <span className={styles.formNumber}>{index + 1}</span>
                <div>
                  <strong>{item.question}</strong>
                  <span>{item.answers}</span>
                </div>
              </li>
            ))}
          </ol>
        </div>
      </section>

      <section id="call" className={`cb-band ${styles.band}`} tabIndex={-1}>
        <div className={`cb-shell ${styles.callCard}`}>
          <p className="cb-eyebrow">Your next move</p>
          <h2 className="cb-h2">Twenty minutes. Your work, your area, the jobs you want.</h2>
          <p className="cb-lead">You leave with the next practical step, whether you hire me or not.</p>
          <div className="cb-actions">
            <a className="cb-btn cb-btn--primary" href={bookHref}>
              <CalendarCheck2 aria-hidden="true" />
              Pick a time, I call you
              <ArrowRight aria-hidden="true" />
            </a>
            <a className="cb-btn cb-btn--ghost" href={BUSINESS.phone.tel}>
              <PhoneCall aria-hidden="true" />
              Call Ryan
            </a>
            <a className="cb-btn cb-btn--ghost" href={BUSINESS.phone.sms}>
              <MessageSquareText aria-hidden="true" />
              Text Ryan
            </a>
          </div>
          <p className={styles.note}>
            I cannot promise you a job as fast as Scott got his. Nobody honest can. What I can do is build it
            around your real numbers and tell you the truth about them.
          </p>
        </div>
      </section>
    </main>
  );
}
