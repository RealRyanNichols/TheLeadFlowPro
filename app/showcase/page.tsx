import Image from "next/image";
import Link from "next/link";
import { Activity, ArrowRight, ShieldCheck } from "lucide-react";
import ShowcaseDashboard from "@/components/ShowcaseDashboard";
import styles from "./showcase.module.css";

export const metadata = {
  title: "The Command Center | The LeadFlow Pro",
  description:
    "A clearly labeled simulation of the analytics and automation back office a larger LeadFlow Pro system can include.",
  openGraph: { images: [{ url: "/og/showcase.png", width: 1200, height: 630 }] },
};

export default function ShowcasePage() {
  return (
    <main className={`cb-page ${styles.page}`}>
      <section className="cb-hero">
        <div className="cb-shell cb-hero-layout">
          <div className="cb-hero-copy">
            <p className="cb-eyebrow">Live demo · simulated data</p>
            <h1 className="cb-h1">
              The Command Center.
              <em>See the business move.</em>
            </h1>
            <p className="cb-hero-lead">
              Traffic, leads, conversions, attribution, and automation in one owner view.
              The numbers below are simulated. The architecture is real, interactive, and
              based on the same back-office pattern running this site.
            </p>
            <div className="cb-actions">
              <a className="cb-btn cb-btn--primary" href="#command-center">
                Open the Command Center
                <ArrowRight aria-hidden="true" />
              </a>
              <Link className="cb-btn cb-btn--ghost" href="/live">
                See Real Live Analytics
              </Link>
            </div>
            <p className="cb-hero-own">
              <ShieldCheck aria-hidden="true" />
              Demo data is clearly labeled. No private customer data is displayed.
            </p>
          </div>

          <figure className="cb-hero-visual">
            <Image
              src="/images/homepage-v2/proof-cockpit.webp"
              alt="A dark analytics command center with connected measurement chambers"
              width={1920}
              height={1080}
              priority
              sizes="(max-width: 900px) 100vw, 56vw"
            />
            <figcaption>
              <span>Owner view</span>
              <strong>Attention, action, source, and outcome.</strong>
            </figcaption>
          </figure>
        </div>
      </section>

      <section id="command-center" className={`cb-band cb-band--ink ${styles.commandSection}`} tabIndex={-1}>
        <div className="cb-shell">
          <div className={styles.commandHeading}>
            <div>
              <p className="cb-eyebrow">Interactive proof surface</p>
              <h2 className="cb-h2">Watch the operating layer work.</h2>
            </div>
            <p className="cb-lead">
              The feed updates, the funnel moves, and the automated agents stay visible. Use
              this to understand the shape of the system, then use the Live page to inspect
              real privacy-safe aggregates.
            </p>
          </div>

          <div className={styles.demoBadge}>
            <Activity aria-hidden="true" />
            <div>
              <strong>Simulation running</strong>
              <span>Architecture demonstration · not customer performance data</span>
            </div>
          </div>

          <div className={styles.dashboard}>
            <ShowcaseDashboard />
          </div>
        </div>
      </section>
    </main>
  );
}
