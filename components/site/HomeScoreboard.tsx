import Link from "next/link";
import { ArrowUpRight, Radio } from "lucide-react";
import {
  SCOREBOARD_BUSINESSES,
  formatCount,
  summarizeWindow,
} from "@/lib/scoreboard";
import { fetchScoreboardDays } from "@/lib/scoreboardFeeds";

export default async function HomeScoreboard() {
  const boards = await Promise.all(
    SCOREBOARD_BUSINESSES.map(async (business) => ({
      business,
      result: await fetchScoreboardDays(business, 30),
    })),
  );
  return (
    <div
      className="lf-scoreboard"
      aria-label="Business results over the last 30 days"
    >
      <div className="lf-board-heading">
        <span>
          <Radio size={16} aria-hidden="true" /> THE SHARED SCOREBOARD
        </span>
        <span>LAST 30 DAYS</span>
      </div>
      {boards.map(({ business, result }) => {
        const totals = result.ok ? summarizeWindow(result.days, 30) : null;
        return (
          <Link
            className="lf-board-row"
            href={`/scoreboard/${business.slug}`}
            key={business.slug}
          >
            <div>
              <strong>{business.shortName}</strong>
              <span>{business.town}</span>
            </div>
            <div>
              <strong>{totals ? formatCount(totals.views) : "—"}</strong>
              <span>page views</span>
            </div>
            <div>
              <strong>{totals ? formatCount(totals.leads) : "—"}</strong>
              <span>{totals ? "lead records" : "feed unavailable"}</span>
            </div>
            <ArrowUpRight size={18} aria-hidden="true" />
          </Link>
        );
      })}
      <p>
        Counts from each business’s records. Lead records can include inquiries
        and manually logged contacts; they are not unique customers or completed
        sales. Open a board for definitions and source details.
      </p>
    </div>
  );
}
