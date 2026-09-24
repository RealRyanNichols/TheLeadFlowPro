import type { Metadata } from "next";
import Link from "next/link";
import DirectoryPage from "@/components/longview/DirectoryPage";
import { BrowseBand } from "@/components/longview/DirectoryLinks";
import { withPublicPageMetadata } from "@/lib/publicPageMetadata";
import { BUSINESS } from "@/lib/site/business";
import {
  ABOUT_PATH,
  CRAWLER_LIMITS,
  CRAWLER_TOKEN,
  CRAWLER_USER_AGENT,
  DIRECTORY_DISCLAIMER,
  batchDate,
  hasDirectory,
  isDirectoryIndexable,
  loadDirectory,
} from "@/lib/longviewDirectory/data";
import { directoryMailto, formatDay } from "@/lib/longviewDirectory/display";
import { directoryRobots } from "@/lib/longviewDirectory/metadata";
import { DIRECTORY_PATH } from "@/lib/longviewDirectory/types";

// What the directory is, where its facts come from, what it never does, how
// the crawler behaves and how to opt out, and how to claim, correct, or
// remove a listing. Always available, even before the first batch. Counts
// and licences are shown only when a published batch supplies them.

const TITLE = "About the Longview business directory | The LeadFlow Pro";
const DESCRIPTION =
  "Where the directory's facts come from, how they are checked, what it never shows, how the crawler behaves, and how to claim, correct, or remove a listing.";

export async function generateMetadata(): Promise<Metadata> {
  return withPublicPageMetadata(ABOUT_PATH, {
    title: TITLE,
    description: DESCRIPTION,
    robots: directoryRobots(isDirectoryIndexable(loadDirectory())),
  });
}

const REL = "nofollow noopener noreferrer";

const SOURCES = [
  {
    name: "Texas Comptroller of Public Accounts",
    what: "Sales-tax permit holders, published as open data on the Texas Open Data Portal.",
    use: "The business or trade name, the location, the kind of business, and the date the permit started.",
    href: "https://data.texas.gov",
  },
  {
    name: "Texas Alcoholic Beverage Commission",
    what: "License records.",
    use: "Confirming a business name and a storefront address.",
    href: "https://www.tabc.texas.gov",
  },
  {
    name: "CMS NPI Registry",
    what: "Organization records for health care providers, from the Centers for Medicare & Medicaid Services.",
    use: "Practice names and practice-location addresses. Names of individual providers and officials are never used.",
    href: "https://npiregistry.cms.hhs.gov",
  },
  {
    name: "The business's own website",
    what: "Pages the business publishes itself.",
    use: "Website, phone, email, hours, social links, careers page, and service tags, only as the business lists them.",
    href: null,
  },
] as const;

export default function AboutDirectoryPage() {
  const directory = loadDirectory();
  const published = directory.businesses.length;
  const asOf = batchDate(directory);

  return (
    <DirectoryPage
      directory={directory}
      eyebrow="Longview business directory"
      title="About this directory"
      lead="A free, sourced list of businesses in the City of Longview, Texas, kept by The LeadFlow Pro. Every fact on a listing shows where it came from and the date it was checked."
      crumbs={[{ label: "Longview businesses", href: hasDirectory(directory) ? DIRECTORY_PATH : undefined }, { label: "About" }]}
      footer={false}
    >
      <section className="lvd-band" aria-labelledby="lvd-what">
        <div className="cb-shell lvd-prose">
          <h2 id="lvd-what" className="lvd-h2">
            What it is
          </h2>
          <p>
            One listing per business location in the City of Longview, drawn from public records and each business's own website. Listings are A to Z. Nothing
            is ranked, scored, or promoted.
          </p>
          {asOf ? (
            <p>
              Latest batch: {formatDay(asOf)}. {published.toLocaleString("en-US")} {published === 1 ? "business is" : "businesses are"} listed. The archive
              holds {directory.counts.inArchive.toLocaleString("en-US")} records in all; {directory.counts.heldForPrivacy.toLocaleString("en-US")} are held back
              for privacy and {directory.counts.needsReview.toLocaleString("en-US")} are waiting for a person to review them.
            </p>
          ) : (
            <p>No batch has been published yet. Listings appear here once the first one is reviewed and merged.</p>
          )}
        </div>
      </section>

      <section className="lvd-band lvd-band--tint" aria-labelledby="lvd-sources">
        <div className="cb-shell lvd-prose">
          <h2 id="lvd-sources" className="lvd-h2">
            Where the facts come from
          </h2>
          <ul>
            {SOURCES.map((source) => (
              <li key={source.name}>
                <strong>{source.href ? <a href={source.href} rel={REL}>{source.name}</a> : source.name}.</strong> {source.what} Used for: {source.use}
              </li>
            ))}
          </ul>
          <p>
            Map data used for discovery: ©{" "}
            <a href="https://www.openstreetmap.org/copyright" rel={REL}>
              OpenStreetMap contributors
            </a>
            , ODbL. OpenStreetMap helps find businesses and their websites. Names, addresses, and phone numbers from OpenStreetMap are never shown.
          </p>
          {directory.sources.length ? (
            <ul className="lvd-datasets" aria-label="Datasets in the latest batch">
              {directory.sources.map((source) => (
                <li key={source.id}>
                  <strong>{source.url ? <a href={source.url} rel={REL}>{source.name}</a> : source.name}</strong>
                  <dl>
                    <dt>Publisher</dt>
                    <dd>{source.publisher}</dd>
                    <dt>Licence</dt>
                    <dd>{source.license}</dd>
                    <dt>Last read</dt>
                    <dd>{source.lastSyncedAt ? formatDay(source.lastSyncedAt) : "Not yet"}</dd>
                  </dl>
                </li>
              ))}
            </ul>
          ) : (
            <p>Each dataset's licence is recorded from the publisher's dataset page at every sync, and is listed here with the first published batch.</p>
          )}
        </div>
      </section>

      <section className="lvd-band" aria-labelledby="lvd-checks">
        <div className="cb-shell lvd-prose">
          <h2 id="lvd-checks" className="lvd-h2">
            How facts are checked
          </h2>
          <ul>
            <li>Only public records and each business's own website are used.</li>
            <li>Every fact on a listing shows its source, a link to it, and the date it was checked.</li>
            <li>
              A phone number, email, or opening hours appear only when the business publishes them on its own website. An email address appears only when it is
              a general office inbox on the business's own domain.
            </li>
            <li>A verified fact is never quietly overwritten. When sources disagree, or anything is uncertain, a person reviews it before it is shown.</li>
            <li>A missing fact stays missing. The page says so instead of guessing.</li>
          </ul>
        </div>
      </section>

      <section className="lvd-band lvd-band--tint" aria-labelledby="lvd-never">
        <div className="cb-shell lvd-prose">
          <h2 id="lvd-never" className="lvd-h2">
            What it never does
          </h2>
          <ul>
            <li>No ratings, reviews, rankings, or endorsements.</li>
            <li>No photos and no text copied from a business's website. Service tags come from a fixed word list matched to the site's own headings and menus.</li>
            <li>No personal names. Only business and trade names are shown.</li>
            <li>No home addresses. A street address is shown only with public evidence of a storefront; otherwise the listing says Longview, TX.</li>
            <li>No contact details a business did not publish itself.</li>
            <li>It never contacts a listed business: no calls, texts, emails, or messages, and the crawler never fills in forms or logs in.</li>
          </ul>
        </div>
      </section>

      <section className="lvd-band" aria-labelledby="lvd-crawler">
        <div className="cb-shell lvd-prose">
          <h2 id="lvd-crawler" className="lvd-h2">
            The crawler
          </h2>
          <p>The archive reads business websites with this user agent:</p>
          <code className="lvd-code">{CRAWLER_USER_AGENT}</code>
          <ul>
            <li>At most {CRAWLER_LIMITS.sitesAtOnce} sites at a time.</li>
            <li>At least {CRAWLER_LIMITS.secondsBetweenRequests} seconds between requests to the same site.</li>
            <li>At most {CRAWLER_LIMITS.pagesPerVisit} pages per visit.</li>
            <li>At most {CRAWLER_LIMITS.maxPageMegabytes} MB per page.</li>
            <li>Obeys robots.txt and re-reads it every day.</li>
            <li>No cookies, no JavaScript, no forms, no logins.</li>
          </ul>
          <p>To keep it off your website, add these two lines to your robots.txt:</p>
          <code className="lvd-code lvd-code--lines">{`User-agent: ${CRAWLER_TOKEN}\nDisallow: /`}</code>
          <p>It stops reading the site within a day of the change.</p>
        </div>
      </section>

      <section className="lvd-band lvd-band--tint" aria-labelledby="lvd-claim">
        <div className="cb-shell lvd-prose lvd-claim">
          <h2 id="lvd-claim" className="lvd-h2">
            Claim, correct, or remove a listing
          </h2>
          <p>
            Email <a href={`mailto:${BUSINESS.email.hello}`}>{BUSINESS.email.hello}</a> with the business name and what should change. A business can ask us to
            correct a fact, add one from its own website, or remove its listing.
          </p>
          <a className="cb-btn cb-btn--primary" href={directoryMailto()}>
            Claim, correct, or remove a listing
          </a>
        </div>
      </section>

      <section className="lvd-band" aria-labelledby="lvd-affiliation">
        <div className="cb-shell lvd-prose">
          <h2 id="lvd-affiliation" className="lvd-h2">
            Not affiliated
          </h2>
          <p className="lvd-disclaimer">{DIRECTORY_DISCLAIMER}</p>
          <p>
            The LeadFlow Pro is a marketing agency in Longview. The directory is a free community resource; a listing is not an ad.{" "}
            <Link href="/longview">What The LeadFlow Pro does in Longview</Link>.
          </p>
        </div>
      </section>

      {hasDirectory(directory) ? <BrowseBand directory={directory} current="about" /> : null}
    </DirectoryPage>
  );
}
