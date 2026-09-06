import { withPublicPageMetadata } from "@/lib/publicPageMetadata";
import Link from "next/link";
import Image from "next/image";
import MetricCards from "./MetricCards";
import { ArrowRight, Eye, PhoneCall, Users } from "lucide-react";
import {
  SCOREBOARD_BUSINESSES,
  formatCount,
  summarizeWindow,
} from "@/lib/scoreboard";
import { fetchScoreboardDays } from "@/lib/scoreboardFeeds";
import styles from "./scoreboard.module.css";

export const revalidate = 900;

const TITLE = "Scoreboard | Real views, clicks and leads per business | The LeadFlow Pro";
const DESCRIPTION =
  "One live scoreboard per business we run or built: recorded views, clicks, leads, calls and form activity, with daily charts, source definitions and practical next steps.";

const BUSINESS_STORIES: Record<string, { tone: string; purpose: string; detail: string }> = {
  "the-leadflow-pro": {
    tone: "lavenderCard",
    purpose: "Give a visitor a useful next step.",
    detail: "Free tools, practical lessons, and clear offers connect the website to the work behind it.",
  },
  "premier-dental-academy-of-longview": {
    tone: "sageCard",
    purpose: "Help future students find their way.",
    detail: "Study tools, course information, and enrollment forms put the next step within reach.",
  },
  realryannichols: {
    tone: "peachCard",
    purpose: "Give readers a place to go deeper.",
    detail: "Articles and searchable public records sit alongside contact and signup forms.",
  },
};

export const metadata = withPublicPageMetadata("/scoreboard", {
  title: TITLE,
  description: DESCRIPTION,
  alternates: { canonical: "https://www.theleadflowpro.com/scoreboard" },
  openGraph: {
    title: TITLE,
    description: DESCRIPTION,
    url: "https://www.theleadflowpro.com/scoreboard",
    type: "website",
  },
});

export default async function ScoreboardIndexPage() {
  const results = await Promise.all(
    SCOREBOARD_BUSINESSES.map(async (business) => ({
      business,
      result: await fetchScoreboardDays(business, 30),
    })),
  );

  return (
    <main className={styles.page}>
      <section className={styles.hero}>
        <div className={styles.shell}>
          <div className={styles.heroRow}>
            <div>
              <p className={styles.eyebrow}>The Scoreboard</p>
              <h1>Real businesses.<br /><em>Work you can follow.</em></h1>
              <p className={styles.lead}>
                See what happens after a site goes live: people arrive, take action, and become
                recorded inquiries. Open a business to follow the work.
              </p>
              <p className={styles.heroNote}>Activity and contact records, not unique customers or revenue.</p>
            </div>
            <div className={styles.liveBadge}>
              <p>Data source</p>
              <strong>Each business&apos;s own database</strong>
              <small>Aggregate counts only. Checks for updates every 15 minutes when requested.</small>
              <span className={styles.sourceNote}>Real records. Room to improve.</span>
            </div>
          </div>
          <nav className={styles.pageJourney} aria-label="Explore the scoreboard">
            <a href="#boards"><span>01</span> See the work <ArrowRight aria-hidden="true" /></a>
            <a href="#legend"><span>02</span> Understand the numbers <ArrowRight aria-hidden="true" /></a>
            <a href="#your-business"><span>03</span> Your business next <ArrowRight aria-hidden="true" /></a>
          </nav>
        </div>
      </section>

      <section className={styles.boards} id="boards" aria-label="Business scoreboards">
        <div className={styles.shell}>
          <div className={styles.sectionIntro}>
            <div>
              <p className={styles.eyebrow}>01 / See the work</p>
              <h2>Different businesses.<br />A useful next step.</h2>
            </div>
            <p>Start with the last 30 days. Open a board to see the daily activity and what each number counts.</p>
          </div>
          <div className={styles.boardGrid}>
            {results.map(({ business, result }) => {
              const totals = result.ok ? summarizeWindow(result.days, 30) : null;
              const story = BUSINESS_STORIES[business.slug] ?? {
                tone: "lavenderCard",
                purpose: "Follow the work behind the website.",
                detail: business.what,
              };
              return (
                <Link key={business.slug} href={`/scoreboard/${business.slug}`} className={`${styles.boardCard} ${styles[story.tone]}`}>
                  <div className={styles.cardIdentity}>
                    <Image src={business.logo} alt="" aria-hidden="true" width={64} height={64} className={styles.businessLogo} />
                    <div>
                      <p className={styles.cardMeta}>{business.town}</p>
                      <h3>{business.name}</h3>
                    </div>
                  </div>
                  <div className={styles.cardStory}>
                    <strong>{story.purpose}</strong>
                    <p>{story.detail}</p>
                  </div>
                  <p className={styles.cardPeriod}>The last 30 days</p>
                  <div className={styles.cardStats}>
                    <div>
                      <span><Eye aria-hidden="true" size={15} /> Page views</span>
                      {totals ? <strong>{formatCount(totals.views)}</strong> : <strong className={styles.unavailable}>Unavailable</strong>}
                    </div>
                    <div>
                      <span><Users aria-hidden="true" size={15} /> Lead records</span>
                      {totals ? <strong>{formatCount(totals.leads)}</strong> : <strong className={styles.unavailable}>Unavailable</strong>}
                    </div>
                    <div>
                      <span><PhoneCall aria-hidden="true" size={15} /> Other lead records</span>
                      {totals ? <strong>{formatCount(totals.unpaid_leads)}</strong> : <strong className={styles.unavailable}>Unavailable</strong>}
                    </div>
                  </div>
                  <div className={styles.cardFoot}>
                    <span>Follow this business</span>
                    <ArrowRight aria-hidden="true" />
                  </div>
                </Link>
              );
            })}
          </div>
          <p className={styles.recordNote}>
            A lead record can be an inquiry, signup, call, or manually entered contact. Other lead records
            have no paid-ad attribution. These counts do not establish unique customers or completed sales.
          </p>
        </div>
      </section>

      <section className={styles.legend} id="legend" aria-labelledby="legend-title">
        <div className={styles.shell}>
          <p className={styles.eyebrow}>02 / Understand the numbers</p>
          <h2 id="legend-title">What each number means, and what moves it.</h2>
          <p className={styles.boardFoot}>Actual combined counts for the last 30 Central days. Open a metric to see the daily numbers, each business’s contribution, and a practical next step.</p>
          <MetricCards feeds={results} />
          <div className={styles.callout}>
            <p>
              <strong>Know what the board is counting.</strong> A lead record is not a paying customer.
              Ad-attributed leads have an advertising source or campaign tag. Other records may come from
              organic traffic, referrals, direct contact, manual entries, or an unknown source. We show
              the recorded counts so you can ask better questions about the work behind them.
            </p>
            <Link href="/free-build">Build the owned side <ArrowRight aria-hidden="true" /></Link>
          </div>
        </div>
      </section>

      <section className={styles.cta} id="your-business">
        <div className={styles.shell}>
          <p className={styles.eyebrow}>03 / Your business next</p>
          <h2>Your business has a next step, too.</h2>
          <p>
            Start with the part that needs help: getting found, capturing inquiries, or following up.
            Tell us what is happening now and find the next step that fits your business.
          </p>
          <div>
            <Link href="/start">Find my next step <ArrowRight aria-hidden="true" /></Link>
            <Link href="/free-build">Explore the free website program <ArrowRight aria-hidden="true" /></Link>
          </div>
        </div>
      </section>
    </main>
  );
}
