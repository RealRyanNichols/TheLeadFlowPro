import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { buildWindows, centralToday, formatCount, recentSeries, scoreboardBusiness } from "@/lib/scoreboard";
import { fetchScoreboardDays } from "@/lib/scoreboardFeeds";
import { fetchCaptureCoverage } from "@/lib/scoreboardCaptureFeeds";
import { CAPTURE_SOURCES } from "@/lib/scoreboardCaptureCoverage";
import { feedObservationLabel } from "@/lib/scoreboardMetrics";
import { ownerMetrics, ownerReading, verifyOwnerKey } from "@/lib/scoreboardOwner";
import ScoreboardBoard from "@/components/scoreboard/ScoreboardBoard";
import styles from "../../scoreboard.module.css";

// The private owner view. Reached only by the signed link Ryan gives the
// client. Same aggregate feed as the public board, plus what the public
// board withholds for this client and a plain-English reading. No
// names, contact details, or dollar figures exist in this view because the
// feed does not carry them.

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Owner view | Scoreboard | The LeadFlow Pro",
  robots: { index: false, follow: false, noarchive: true },
  referrer: "no-referrer",
};

export default async function OwnerScoreboardPage({ params, searchParams }: { params: Promise<{ business: string }>; searchParams: Promise<{ k?: string }> }) {
  const { business: slug } = await params;
  const { k } = await searchParams;
  const business = scoreboardBusiness(slug);
  if (!business || !business.optIn.ownerView || !verifyOwnerKey(slug, k)) notFound();

  const [result, capture] = await Promise.all([fetchScoreboardDays(business, 90), fetchCaptureCoverage(business, 30)]);
  const today = centralToday();
  const windows = result.ok ? buildWindows(result.days, today) : null;
  const series = result.ok ? recentSeries(result.days, 30, today) : null;
  const reading = result.ok && windows ? ownerReading(business, windows, result.days, today) : null;
  const metrics = ownerMetrics(business);
  const csvHref = `/api/scoreboard/owner?business=${encodeURIComponent(slug)}&k=${encodeURIComponent(k ?? "")}`;

  return (
    <main className={styles.page}>
      <section className={styles.hero}>
        <div className={styles.shell}>
          <p className={styles.eyebrow}>Owner view · private link</p>
          <h1>{business.name}</h1>
          <p className={styles.lead}>
            The same aggregate feed as your public board, read from your own database, plus the parts the public board leaves out. Nothing on this page is a name, a contact, or a dollar amount.
          </p>
          <div className={styles.heroActions}>
            {business.optIn.publicBoard && <Link href={`/scoreboard/${slug}`}>Your public board</Link>}
            <a href={csvHref}>Download the 90-day aggregates (CSV)</a>
          </div>
        </div>
      </section>

      <section className={styles.board} aria-label="Owner reading">
        <div className={styles.shell}>
          <div className={styles.boardPanel}>
            <p className={styles.eyebrow}>The reading</p>
            {reading ? (
              <>
                <h2>{reading.headline}</h2>
                <ul>
                  {reading.notes.map((n) => (
                    <li key={n}>{n}</li>
                  ))}
                </ul>
              </>
            ) : (
              <p>Your feed did not answer just now. Nothing is substituted. Try again in a few minutes.</p>
            )}
          </div>
        </div>
      </section>

      <section className={styles.board} aria-label="Counts">
        <div className={styles.shell}>
          {result.ok && windows && series ? (
            <ScoreboardBoard windows={windows} series={series} showSales={true} updatedLabel={feedObservationLabel(result.fetchedAt)} unsupportedMetrics={(business.unsupportedMetrics ?? [])} />
          ) : (
            <div className={styles.boardPanel}>
              <p className={styles.eyebrow}>Feed unavailable</p>
            </div>
          )}
          {business.paymentSourceNote && (
            <p className={styles.boardFoot}>
              <strong>Payment records:</strong> {business.paymentSourceNote}
            </p>
          )}
        </div>
      </section>

      {CAPTURE_SOURCES[business.slug] && capture && (
        <section className={styles.board} aria-label="Capture sources">
          <div className={styles.shell}>
            <div className={styles.boardPanel}>
              <p className={styles.eyebrow}>Capture sources · Last 30 days</p>
              <div className={styles.captureGrid}>
                {capture.map((row) => (
                  <div key={row.source} className={styles.tile}>
                    <span>{CAPTURE_SOURCES[business.slug][row.source]}</span>
                    <strong>{row.records.toLocaleString("en-US")}</strong>
                    <small>
                      {row.records === 1 ? "record" : "records"} from {row.start_day} through {row.end_day}
                    </small>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </section>
      )}

      {result.ok && (
        <section className={styles.board} aria-label="Ninety days">
          <div className={styles.shell}>
            <div className={styles.boardPanel} style={{ overflowX: "auto" }}>
              <p className={styles.eyebrow}>Every day · last 90</p>
              <table style={{ width: "100%", fontSize: 13, borderCollapse: "collapse" }}>
                <thead>
                  <tr>
                    <th style={{ textAlign: "left", padding: "6px 8px" }}>Day</th>
                    {metrics.map((m) => (
                      <th key={m.key} style={{ textAlign: "right", padding: "6px 8px" }}>
                        {m.label}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {[...result.days].reverse().map((d) => (
                    <tr key={d.day}>
                      <td style={{ padding: "4px 8px", whiteSpace: "nowrap" }}>{d.day}</td>
                      {metrics.map((m) => (
                        <td key={m.key} style={{ textAlign: "right", padding: "4px 8px" }}>
                          {formatCount(d[m.key])}
                        </td>
                      ))}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </section>
      )}

      <section className={styles.board} aria-label="Definitions" id="legend">
        <div className={styles.shell}>
          <div className={styles.boardPanel}>
            <p className={styles.eyebrow}>What each number means</p>
            <dl>
              {metrics.map((m) => (
                <div key={m.key} style={{ marginBottom: 10 }}>
                  <dt>
                    <strong>{m.label}</strong>
                  </dt>
                  <dd style={{ margin: 0 }}>
                    {m.what} <Link href={m.move.href}>{m.move.label}</Link>
                  </dd>
                </div>
              ))}
            </dl>
            <p className={styles.boardFoot}>
              Opted in by {business.optIn.approvedBy} on {business.optIn.approvedOn}. To withdraw the public board or this link, tell Ryan; both are one flag.
            </p>
          </div>
        </div>
      </section>
    </main>
  );
}
