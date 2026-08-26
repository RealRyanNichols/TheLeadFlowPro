import type { Metadata } from "next";
import { Check } from "lucide-react";
import styles from "./connect.module.css";

const LEADSIE_EMBED = "https://app.leadsie.com/embed/connect/theleadflowpro/manage";
const LEADSIE_DIRECT = "https://app.leadsie.com/connect/theleadflowpro/manage";

export const metadata: Metadata = {
  title: "Connect Your Accounts | The LeadFlow Pro",
  description:
    "Give The LeadFlow Pro access to run your ads and follow-up, in accounts that stay in your name.",
  alternates: { canonical: "https://www.theleadflowpro.com/connect" },
  // Client utility page, not a marketing page. Direct links still work.
  robots: { index: false, follow: false },
};

const STEPS = [
  {
    title: "Log in with Facebook",
    body: "Use the login you already have on your phone. Nothing new to create.",
  },
  {
    title: "Tap approve",
    body: "You pick what to share. If you do not have a business account yet, one gets created for you.",
  },
  {
    title: "That is it",
    body: "We build everything from our end. You do not have to touch it again.",
  },
];

const PROMISES = [
  "Everything stays in your name. Your business account, your ad account, your page, your leads.",
  "Your ad budget is billed to you by Facebook directly. We do not touch your card and we do not mark up your spend.",
  "You can remove our access any time, in about ten seconds, and you keep all of it.",
  "Before we spend a dollar on ads, we make sure your business does not leak.",
];

export default function ConnectPage() {
  return (
    <main className="cb-page">
      <section className="cb-band cb-band--tight">
        <div className="cb-shell">
          <p className="cb-eyebrow">Setup, about three minutes</p>
          <h1 className="cb-h1">Connect your accounts.</h1>
          <p className="cb-lead">
            This is how we get set up to run your ads and your follow-up without you having to
            learn any of it. You log in, you tap approve, and we take it from there.
          </p>

          <div className={styles.steps}>
            {STEPS.map((step, i) => (
              <div key={step.title} className={styles.step}>
                <span className={styles.stepIndex} aria-hidden="true">
                  {i + 1}
                </span>
                <strong>{step.title}</strong>
                <p>{step.body}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className="cb-band cb-band--tint">
        <div className="cb-shell">
          <div className={styles.frameCard}>
            <iframe
              src={LEADSIE_EMBED}
              title="Grant The LeadFlow Pro access to your Meta accounts"
              className={styles.frame}
              scrolling="auto"
            />
            <div className={styles.fallback}>
              <span>Having trouble in this window?</span>
              <a
                className="cb-textlink"
                href={LEADSIE_DIRECT}
                target="_blank"
                rel="noopener noreferrer"
              >
                Open it in a new tab
              </a>
            </div>
          </div>
        </div>
      </section>

      <section className="cb-band">
        <div className="cb-shell">
          <h2 className="cb-h2">What you are agreeing to, in plain English.</h2>
          <ul className={styles.promise}>
            {PROMISES.map((line) => (
              <li key={line}>
                <Check aria-hidden="true" className="h-5 w-5" />
                <span>{line}</span>
              </li>
            ))}
          </ul>
          <p className="cb-lead" style={{ marginTop: "24px" }}>
            Questions before you click anything? Call or text{" "}
            <a className="cb-textlink" href="tel:+19035008898">
              (903) 500-8898
            </a>{" "}
            or email{" "}
            <a className="cb-textlink" href="mailto:hello@theleadflowpro.com">
              hello@theleadflowpro.com
            </a>
            .
          </p>
        </div>
      </section>
    </main>
  );
}
