import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import DirectoryPage from "@/components/longview/DirectoryPage";
import BusinessCard from "@/components/longview/BusinessCard";
import Pagination, { pageHref } from "@/components/longview/Pagination";
import { CategoryChips, MoreLinks } from "@/components/longview/DirectoryLinks";
import { withPublicPageMetadata } from "@/lib/publicPageMetadata";
import {
  DEFAULT_PAGE_SIZE,
  hasDirectory,
  isDirectoryIndexable,
  loadDirectory,
  publicZips,
  searchDirectory,
} from "@/lib/longviewDirectory/data";
import { directoryRobots } from "@/lib/longviewDirectory/metadata";
import { DIRECTORY_PATH } from "@/lib/longviewDirectory/types";

// The Longview business directory: search, filter, and browse, A to Z.
//
// Rendered per request because it reads the search form's query string; the
// data itself is the committed publish export, parsed once per server
// process. A GET form, so search works with JavaScript turned off. Filtered
// and paged URLs are always noindex; the bare page follows the owner's
// indexable switch. No published businesses, no page.

type SearchParams = Promise<Record<string, string | string[] | undefined>>;

const TITLE = "Longview businesses, A to Z | The LeadFlow Pro";
const DESCRIPTION =
  "Businesses in the City of Longview, Texas, listed A to Z with the source and check date for every fact. Not ranked, no reviews.";

function first(value: string | string[] | undefined): string {
  return (Array.isArray(value) ? value[0] : value ?? "").trim();
}

function readFilters(params: Record<string, string | string[] | undefined>) {
  return {
    q: first(params.q).slice(0, 100),
    category: first(params.category),
    zip: first(params.zip),
    open: first(params.open) === "1",
    page: first(params.page),
  };
}

export async function generateMetadata({ searchParams }: { searchParams: SearchParams }): Promise<Metadata> {
  const directory = loadDirectory();
  const f = readFilters(await searchParams);
  const filtered = Boolean(f.q || f.category || f.zip || f.open || f.page);
  return withPublicPageMetadata(DIRECTORY_PATH, {
    title: TITLE,
    description: DESCRIPTION,
    robots: directoryRobots(isDirectoryIndexable(directory) && !filtered),
  });
}

export default async function LongviewBusinessesPage({ searchParams }: { searchParams: SearchParams }) {
  const directory = loadDirectory();
  if (!hasDirectory(directory)) notFound();

  const f = readFilters(await searchParams);
  const zips = publicZips(directory);
  const category = directory.categories.some((c) => c.slug === f.category) ? f.category : "";
  const zip = zips.includes(f.zip) ? f.zip : "";
  const filtered = Boolean(f.q || category || zip || f.open);
  const result = searchDirectory(directory, { q: f.q, category, zip, openNow: f.open, now: new Date(), page: f.page });
  const names = new Map(directory.categories.map((c) => [c.slug, c.name]));
  const count = directory.businesses.length;
  const start = (result.page - 1) * DEFAULT_PAGE_SIZE + 1;
  const end = start + result.results.length - 1;
  const href = (page: number) =>
    pageHref(DIRECTORY_PATH, { q: f.q, category, zip, open: f.open ? "1" : undefined }, page);

  return (
    <DirectoryPage
      directory={directory}
      eyebrow="Longview, Texas"
      title="Longview businesses"
      lead={`${count.toLocaleString("en-US")} ${count === 1 ? "business" : "businesses"} in the City of Longview, each listed with the source and check date for every fact. A to Z, not ranked.`}
      heroExtra={<MoreLinks current="all" />}
    >
      <section className="lvd-band" aria-labelledby="lvd-search-title">
        <div className="cb-shell">
          <h2 id="lvd-search-title" className="lvd-h2">
            Find a business
          </h2>
          <form className="lvd-search" action={DIRECTORY_PATH} method="get" role="search">
            <div className="lvd-field lvd-field--q">
              <label htmlFor="lvd-q">Search businesses</label>
              <input
                id="lvd-q"
                name="q"
                type="search"
                defaultValue={f.q}
                maxLength={100}
                autoComplete="off"
                placeholder="Name, service, or kind of business"
              />
            </div>
            <div className="lvd-field">
              <label htmlFor="lvd-category">Category</label>
              <select id="lvd-category" name="category" defaultValue={category}>
                <option value="">All categories</option>
                {directory.categories.map((c) => (
                  <option key={c.slug} value={c.slug}>
                    {c.name}
                  </option>
                ))}
              </select>
            </div>
            <div className="lvd-field">
              <label htmlFor="lvd-zip">ZIP code</label>
              <select id="lvd-zip" name="zip" defaultValue={zip}>
                <option value="">All ZIP codes</option>
                {zips.map((z) => (
                  <option key={z} value={z}>
                    {z}
                  </option>
                ))}
              </select>
            </div>
            <div className="lvd-check">
              <input id="lvd-open" name="open" type="checkbox" value="1" defaultChecked={f.open} />
              <label htmlFor="lvd-open">Open now</label>
            </div>
            <button type="submit" className="cb-btn cb-btn--primary lvd-submit">
              Search
            </button>
          </form>
          <p className="lvd-note">
            Open now reads the hours each business lists on its own website, in Central time. Businesses without listed hours are left out of it. The ZIP filter
            covers businesses whose street address is shown.
          </p>
          <h2 className="lvd-h2 lvd-subhead">Browse by category</h2>
          <CategoryChips directory={directory} current={category || undefined} />
        </div>
      </section>

      <section className="lvd-band lvd-band--tint" aria-labelledby="lvd-results-title">
        <div className="cb-shell">
          <h2 id="lvd-results-title" className="lvd-h2">
            {filtered ? "Search results" : "All businesses, A to Z"}
          </h2>
          {result.total ? (
            <>
              <p className="lvd-count">
                Showing {start.toLocaleString("en-US")} to {end.toLocaleString("en-US")} of {result.total.toLocaleString("en-US")}
                {filtered ? " matching businesses." : "."}
              </p>
              <ul className="lvd-cards">
                {result.results.map((business) => (
                  <BusinessCard key={business.id} business={business} categoryName={names.get(business.category) ?? business.category} />
                ))}
              </ul>
              <Pagination page={result.page} pages={result.pages} href={href} />
            </>
          ) : (
            <div className="lvd-empty">
              <p>No businesses match that search.</p>
              <p>
                Try fewer words, another category, or leave Open now unchecked. <Link href={DIRECTORY_PATH}>Clear the search</Link>
              </p>
            </div>
          )}
        </div>
      </section>
    </DirectoryPage>
  );
}
