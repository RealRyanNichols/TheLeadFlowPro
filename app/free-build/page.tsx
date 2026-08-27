import type { Metadata } from "next";
import Link from "next/link";
import {
  ArrowRight,
  Check,
  Clock3,
  KeyRound,
  MessageSquareText,
  ShieldCheck,
  X,
} from "lucide-react";
import { FREE_BUILD } from "@/lib/freeBuild";
import FreeBuildOrder from "./FreeBuildOrder";
import styles from "./free-build.module.css";

// The Free Build. Front door for cold paid traffic.
//
// The page has one job: make the trade obvious in the first phone screen.
// Site free, engine paid, here are the three engines. Everything below the
// fold exists to answer "what is the catch", because that is the only
// question a free offer ever gets.

export const metadata: Metadata = {
  title: "The Free Build | The LeadFlow Pro",
  description:
    "I will build your site for free. You pay for the engine that makes it work: follow-up written, posts scheduled in your own accounts, leads landing in your inbox. From $197 one time. Longview, Texas.",
  alternates: { canonical: "https://www.theleadflowpro.com/free-build" },
  openGraph: {
    title: "I will build your site for free.",
    description:
      "You pay for the engine that makes it work. Follow-up written, posts scheduled in your own accounts, leads landing in your inbox. From $197 one time.",
    url: "https://www.theleadflowpro.com/free-build",
    siteName: "The LeadFlow Pro",
    type: "website",
    images: [
      {
        url: "/og/free-build.jpg",
        width: 1200,
        height: 630,
        alt: "The Free Build from The LeadFlow Pro",
      },
    ],
  },
  twitter: {
    card: "summary_large_image",
    title: "I will build your site for free.",
    description: "You pay for the engine that makes it work. From $197 one time.",
    images: ["/og/free-build.jpg"],
  },
};

export default function FreeBuildPage() {
  return (
    <main className={`cb-page ${styles.page}`}>
      {/* -------------------------------------------------------------- hero --- */}
      <section className="cb-hero">
        <div className={`cb-shell ${styles.heroGrid}`}>
          <div>
            <p className="cb-eyebrow">The Free Build</p>
            <h1 className="cb-h1">
              {FREE_BUILD.headline}
              <em>{FREE_BUILD.subhead}</em>
            </h1>
            <p className="cb-hero-lead">{FREE_BUILD.promise}</p>

            <ul className={styles.factList}>
              <li>
                <ShieldCheck aria-hidden="true" />
                <span>
                  A ${FREE_BUILD.anchorUsd.toLocaleString("en-US")} build, for nothing
                  <em>
                    Not a trial and not a template you rent. It is the same site I sell for $
                    {FREE_BUILD.anchorUsd.toLocaleString("en-US")} on my packages page. Go check.
                  </em>
                </span>
              </li>
              <li>
                <Clock3 aria-hidden="true" />
                <span>
                  Live in {FREE_BUILD.guaranteeDays} business days
                  <em>Or the engine you paid for costs you nothing and you keep the site.</em>
                </span>
              </li>
              <li>
                <KeyRound aria-hidden="true" />
                <span>
                  You never hand over a password
                  <em>Official partner access, task level, and you can revoke me in one click.</em>
                </span>
              </li>
            </ul>

            <div className="cb-actions">
              <a className="cb-btn cb-btn--primary" href="#why">
                Show Me How This Works
                <ArrowRight aria-hidden="true" />
              </a>
              <a className="cb-btn cb-btn--ghost" href="#pick">
                Skip Ahead To The Options
              </a>
            </div>

            <p className={styles.textUs}>
              <MessageSquareText aria-hidden="true" />
              <span>
                Rather just ask me something? Text{" "}
                <a href="sms:+19035008898?&body=Free%20Build%20question:%20">
                  (903) 500-8898
                </a>
                . You text me first, I answer myself. I do not send marketing texts to
                people who have not written to me.
              </span>
            </p>

            <p className={styles.slots}>{FREE_BUILD.slotsNote}</p>
          </div>

          <div className={styles.tradeCard}>
            <div className={styles.tradeRow}>
              <span className={styles.tradeLabel}>The website</span>
              <span className={styles.tradeFree}>
                <s>${FREE_BUILD.anchorUsd.toLocaleString("en-US")}</s> $0
              </span>
            </div>
            <p className={styles.tradeNote}>
              Built for a phone, form that reaches you, your pixel installed, on a domain you own.
              This is the build on my packages page at $
              {FREE_BUILD.anchorUsd.toLocaleString("en-US")}. Same thing. No charge.
            </p>
            <div className={styles.tradeDivider} />
            <div className={styles.tradeRow}>
              <span className={styles.tradeLabel}>The engine behind it</span>
              <span className={styles.tradePaid}>from $197</span>
            </div>
            <p className={styles.tradeNote}>
              One time. Posting, follow-up, review asks. Pick one below. That is the whole deal.
            </p>
            <a className={`cb-btn cb-btn--primary ${styles.tradeBtn}`} href="#pick">
              See The Three Engines
              <ArrowRight aria-hidden="true" />
            </a>
          </div>
        </div>
      </section>

      {/* -------------------------------------------------------------- why --- */}
      {/* This section exists because "Free Build" next to "$197" was reading as
          bait and switch. Nobody sees a price until they have read these three
          answers. Ryan's call, and he is right: the value has to land before
          the number does. */}
      <section id="why" className="cb-band" tabIndex={-1}>
        <div className="cb-shell">
          <p className="cb-eyebrow">Before we talk about money</p>
          <h2 className="cb-h2">You are right to be suspicious of the word free.</h2>
          <p className="cb-lead">
            So here are the three questions everybody asks, answered before I show you a single
            price.
          </p>
          <div className={styles.whyGrid}>
            {FREE_BUILD.whyFree.map((item, i) => (
              <div key={item.q} className={styles.whyCard}>
                <span className={styles.whyNum}>{String(i + 1).padStart(2, "0")}</span>
                <h3>{item.q}</h3>
                <p>{item.a}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ------------------------------------------------------------- pick --- */}
      <section id="pick" className="cb-band" tabIndex={-1}>
        <div className="cb-shell">
          <p className="cb-eyebrow">Pick your engine</p>
          <h2 className="cb-h2">You were going to buy a website anyway.</h2>
          <p className="cb-lead">
            So buy the engine instead and take the ${FREE_BUILD.anchorUsd.toLocaleString("en-US")}{" "}
            site for nothing. Three ways to start. The build is free in all three, and the only
            difference is what runs behind it once it is live. One payment. Nothing recurring,
            nothing to cancel.
          </p>
          <FreeBuildOrder />
        </div>
      </section>

      {/* ------------------------------------------------------------ build --- */}
      <section className="cb-band cb-band--tint">
        <div className="cb-shell">
          <p className="cb-eyebrow">In every free build</p>
          <h2 className="cb-h2">What you get for nothing, at every tier.</h2>
          <div className={styles.cardGrid}>
            {FREE_BUILD.buildIncludes.map((item) => (
              <div key={item.title} className={styles.miniCard}>
                <h3>{item.title}</h3>
                <p>{item.detail}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ------------------------------------------------------------ steps --- */}
      <section className="cb-band">
        <div className="cb-shell">
          <p className="cb-eyebrow">How it runs</p>
          <h2 className="cb-h2">Five steps, and I do four of them.</h2>
          <div className={styles.steps}>
            {FREE_BUILD.steps.map((step) => (
              <div key={step.number} className={styles.step}>
                <span className={styles.stepNum}>{step.number}</span>
                <div>
                  <h3>{step.name}</h3>
                  <p>{step.body}</p>
                </div>
              </div>
            ))}
          </div>
          <div className={styles.guarantee}>
            <ShieldCheck aria-hidden="true" />
            <p>{FREE_BUILD.guarantee}</p>
          </div>
        </div>
      </section>

      {/* ------------------------------------------------------------ catch --- */}
      <section id="catch" className="cb-band cb-band--tint" tabIndex={-1}>
        <div className="cb-shell">
          <p className="cb-eyebrow">Before you ask</p>
          <h2 className="cb-h2">Here is the catch, in my own words.</h2>
          <div className={styles.splitGrid}>
            <div className={styles.miniCard}>
              <h3>What the free build is</h3>
              <ul className={styles.checkList}>
                {FREE_BUILD.buildIncludes.map((item) => (
                  <li key={item.title}>
                    <Check aria-hidden="true" />
                    {item.title}
                  </li>
                ))}
              </ul>
            </div>
            <div className={styles.miniCard}>
              <h3>What the free build is not</h3>
              <ul className={styles.crossList}>
                {FREE_BUILD.buildExcludes.map((item) => (
                  <li key={item}>
                    <X aria-hidden="true" />
                    {item}
                  </li>
                ))}
              </ul>
            </div>
          </div>
        </div>
      </section>

      {/* ------------------------------------------------------------- proof --- */}
      <section className="cb-band">
        <div className="cb-shell">
          <p className="cb-eyebrow">This is not theory</p>
          <h2 className="cb-h2">The same stack runs real businesses today.</h2>
          <p className="cb-lead">
            Premier Dental Academy of Longview runs on this exact setup: 455 first-party leads since
            May 4, and July ads at a 4.45 percent click-through rate and 72 cents a click. Premier
            Dental Academy of Longview and The LeadFlow Pro share common ownership, which is why I
            can show you those numbers straight out of the account instead of describing them.
          </p>
          <div className="cb-actions">
            <Link className="cb-btn cb-btn--ghost" href="/portfolio">
              See The Live Systems
            </Link>
            <Link className="cb-btn cb-btn--ghost" href="/premier-system">
              See The Premier Build
            </Link>
          </div>
        </div>
      </section>

      {/* --------------------------------------------------------------- faq --- */}
      <section className="cb-band cb-band--tint">
        <div className="cb-shell">
          <p className="cb-eyebrow">Straight answers</p>
          <h2 className="cb-h2">Questions people ask first.</h2>
          <div className={styles.faq}>
            {FREE_BUILD.faq.map((item) => (
              <details key={item.q}>
                <summary>{item.q}</summary>
                <p>{item.a}</p>
              </details>
            ))}
          </div>
        </div>
      </section>

      {/* --------------------------------------------------------------- cta --- */}
      <section className="cb-band cb-band--ink">
        <div className="cb-shell">
          <p className="cb-eyebrow">Own your platform</p>
          <h2 className="cb-h2">Stop renting your whole operation.</h2>
          <p className="cb-lead">
            Every month you pay a platform for a page you do not own, on an audience you do not
            control, with leads you cannot export. The build is free. The engine is one payment.
            Everything lands in accounts with your name on them.
          </p>
          <div className="cb-actions">
            <a className="cb-btn cb-btn--primary" href="#pick">
              Pick My Engine
              <ArrowRight aria-hidden="true" />
            </a>
            <Link className="cb-btn cb-btn--ghost" href="/book">
              Ask Me A Question First
            </Link>
            <a className="cb-btn cb-btn--ghost" href="sms:+19035008898?&body=Free%20Build%20question:%20">
              Text Me: (903) 500-8898
            </a>
          </div>
        </div>
      </section>
    </main>
  );
}
