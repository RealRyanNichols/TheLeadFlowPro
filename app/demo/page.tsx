import Image from "next/image";
import Link from "next/link";
import {
  ArrowRight,
  BarChart3,
  CalendarDays,
  Coffee,
  Database,
  Settings2,
  ShoppingBag,
} from "lucide-react";
import styles from "./demo.module.css";

export const metadata = {
  title: "Demo Build: Piney Woods Coffee Co. | The LeadFlow Pro",
  description:
    "A sample client build on the Own Your Platform stack. See the funnel, tracking, lead capture, and back office a larger LeadFlow Pro system can include.",
  openGraph: { images: [{ url: "/og/demo.png", width: 1200, height: 630 }] },
};

function Hood({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <aside className={styles.hood}>
      <div>
        <Settings2 aria-hidden="true" />
        <span>Under the hood · {label}</span>
      </div>
      <p>{children}</p>
    </aside>
  );
}

const OFFERS = [
  {
    icon: Coffee,
    name: "Roast Club",
    description: "Monthly beans, member pricing, and first pour on new batches.",
    tag: "Subscription",
  },
  {
    icon: ShoppingBag,
    name: "Order Ahead",
    description: "Skip the line. Your usual, ready when you walk in.",
    tag: "Repeat sales",
  },
  {
    icon: CalendarDays,
    name: "Events at the Shop",
    description: "Cuppings, latte-art nights, and small-business meetups.",
    tag: "Community",
  },
];

const METRICS = [
  ["1,284", "Page views · 30 days"],
  ["312", "Visitors"],
  ["47", "Roast Club signups"],
  ["$0", "Paid to Mailchimp"],
];

const LEADS = [
  ["Katie B.", "Facebook / roast-club ad", "2 min ago", "New"],
  ["Marcus T.", "Google / order-ahead", "1 hr ago", "Emailed"],
  ["Deb W.", "Shared link", "3 hrs ago", "Member"],
];

export default function DemoPage() {
  return (
    <main className={`cb-page ${styles.page}`}>
      <section className="cb-hero">
        <div className="cb-shell cb-hero-layout">
          <div className="cb-hero-copy">
            <p className="cb-eyebrow">Sample client build</p>
            <h1 className="cb-h1">
              This is what a build looks like.
              <em>Front door and back office.</em>
            </h1>
            <p className="cb-hero-lead">
              Piney Woods Coffee Co. is fictional. The funnel, tracking, lead capture,
              follow-up, and owner dashboard below show the real architecture a LeadFlow Pro
              build can ship with.
            </p>
            <div className="cb-actions">
              <a className="cb-btn cb-btn--primary" href="#sample-build">
                Open the Sample Build
                <ArrowRight aria-hidden="true" />
              </a>
              <Link className="cb-btn cb-btn--ghost" href="/portfolio">
                Inspect Real Builds
              </Link>
            </div>
            <p className="cb-hero-own">
              <Database aria-hidden="true" />
              Sample data is labeled. The system pattern is the proof.
            </p>
          </div>

          <figure className="cb-hero-visual">
            <Image
              src="/images/homepage-v2/connected-company-hero.webp"
              alt="A connected company system linking attention, follow-up, approval, and revenue"
              width={1920}
              height={1080}
              priority
              sizes="(max-width: 900px) 100vw, 56vw"
            />
            <figcaption>
              <span>Demo architecture</span>
              <strong>One customer path. Every layer connected.</strong>
            </figcaption>
          </figure>
        </div>
      </section>

      <section id="sample-build" className="cb-band" tabIndex={-1}>
        <div className="cb-shell">
          <div className={styles.sampleNote}>
            <strong>Fictional business. Real system pattern.</strong>
            <p>
              The coffee-shop name and numbers are sample data. The annotations explain the
              machinery that sits behind a production build.
            </p>
          </div>

          <div className={styles.siteFrame}>
            <header className={styles.demoNav}>
              <div>
                <Coffee aria-hidden="true" />
                <strong>Piney Woods Coffee Co.</strong>
              </div>
              <span>Order Ahead</span>
            </header>

            <section className={styles.demoHero}>
              <p className={styles.demoKicker}>Small-batch roasting · Longview, Texas</p>
              <h2>East Texas roasts. Zero corporate coffee.</h2>
              <p>
                Join the Roast Club and get first pour on every new batch. One offer, one
                clear action, and a reason to come back.
              </p>
              <div className={styles.demoActions}>
                <span>Join the Roast Club</span>
                <span>This Week&apos;s Menu</span>
              </div>
              <Hood label="the funnel">
                One message and one action, built for Facebook and Google ad traffic. Every
                visit is logged with its UTM source, while the Meta Pixel and Google tag can
                optimize around real conversions.
              </Hood>
            </section>

            <section className={styles.offerGrid} aria-label="Sample coffee shop offers">
              {OFFERS.map((offer) => (
                <article key={offer.name}>
                  <offer.icon aria-hidden="true" />
                  <span>{offer.tag}</span>
                  <h3>{offer.name}</h3>
                  <p>{offer.description}</p>
                </article>
              ))}
            </section>

            <section className={styles.captureGrid}>
              <div>
                <p className="cb-eyebrow">Lead capture</p>
                <h2>Join the Roast Club</h2>
                <p>
                  First batch alert goes out Friday. Members get 20% off their first bag.
                </p>
                <Hood label="lead capture and instant follow-up">
                  A real build saves the form into the owner&apos;s database, alerts the owner
                  when it lands, and can send an immediate welcome email in the owner&apos;s
                  voice. No separate Mailchimp or AWeber bill is required for that path.
                </Hood>
                <Hood label="the money math">
                  This sample architecture runs on roughly $0–25 per month of infrastructure
                  the owner controls, replacing a rented stack that can cost $200–500 per
                  month. The sourced pricing is the same model shown on the home page.
                </Hood>
              </div>

              <div className={styles.demoForm} aria-label="Disabled sample lead form">
                <label>
                  Your name
                  <input disabled placeholder="Demo form | inputs disabled" />
                </label>
                <label>
                  Email
                  <input disabled placeholder="you@example.com" />
                </label>
                <label>
                  Usual order
                  <input disabled placeholder="Oat milk latte, extra shot" />
                </label>
                <span>Count Me In</span>
                <p>
                  Demo form. A real one writes to your database and triggers your automation.
                </p>
              </div>
            </section>
          </div>
        </div>
      </section>

      <section className="cb-band cb-band--ink">
        <div className="cb-shell">
          <div className={styles.officeHeading}>
            <div>
              <p className="cb-eyebrow">The owner view</p>
              <h2 className="cb-h2">The part a basic website never gives you.</h2>
            </div>
            <p className="cb-lead">
              Every build includes an owner dashboard for leads, messages, analytics, and
              project tracking. The coffee-shop numbers shown here are sample data.
            </p>
          </div>

          <div className={styles.metricGrid}>
            {METRICS.map(([value, label]) => (
              <div key={label}>
                <strong>{value}</strong>
                <span>{label}</span>
              </div>
            ))}
          </div>

          <div className={styles.leadPanel}>
            <header>
              <div>
                <BarChart3 aria-hidden="true" />
                <strong>Latest leads</strong>
              </div>
              <span>Sample data</span>
            </header>
            <div className={styles.leadRows}>
              {LEADS.map(([name, source, time, status]) => (
                <div key={name}>
                  <div>
                    <strong>{name}</strong>
                    <span>{source}</span>
                  </div>
                  <div>
                    <time>{time}</time>
                    <span>{status}</span>
                  </div>
                </div>
              ))}
            </div>
            <p>
              Attribution flows in from UTM-tagged ads so the owner can see which source
              created each lead.
            </p>
          </div>
        </div>
      </section>

      <section className={`cb-band ${styles.finalSection}`}>
        <div className="cb-shell">
          <div className={styles.finalGrid}>
            <div>
              <p className="cb-eyebrow">Put your name on the door</p>
              <h2 className="cb-h2">Your funnel. Your data. Your keys.</h2>
            </div>
            <div>
              <p className="cb-lead">
                Coffee shop, dental office, law firm, gym, church, or home service business:
                the architecture starts with the same question. Where should attention go next?
                Thirty minutes and you&apos;ll know your next three moves.
              </p>
              <div className="cb-actions">
                <Link
                  href="/book?utm_source=demo&utm_medium=site&utm_campaign=demo-build"
                  className="cb-btn cb-btn--primary"
                >
                  Book a Call
                  <ArrowRight aria-hidden="true" />
                </Link>
                <Link href="/showcase" className="cb-btn cb-btn--ghost">
                  See the Live Command Center
                </Link>
              </div>
            </div>
          </div>
        </div>
      </section>
    </main>
  );
}
