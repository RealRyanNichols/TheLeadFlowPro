import type { Metadata } from "next";
import { notFound } from "next/navigation";
import DirectoryPage from "@/components/longview/DirectoryPage";
import BusinessCard from "@/components/longview/BusinessCard";
import Pagination, { pageHref } from "@/components/longview/Pagination";
import { BrowseBand } from "@/components/longview/DirectoryLinks";
import {
  DEFAULT_PAGE_SIZE,
  NEW_WINDOW_DAYS,
  batchDate,
  hasDirectory,
  isDirectoryIndexable,
  loadDirectory,
  newInLongview,
  paginate,
} from "@/lib/longviewDirectory/data";
import { formatDay } from "@/lib/longviewDirectory/display";
import { directoryPageMetadata } from "@/lib/longviewDirectory/metadata";
import { pageNumber } from "@/lib/longviewDirectory/query";
import { DIRECTORY_PATH } from "@/lib/longviewDirectory/types";

// "New in Longview": sales-tax permits that started in the 180 days before
// the batch was generated, newest first. A new permit is a public-record
// event, not proof of a brand-new business, and the page says so.

type SearchParams = Promise<Record<string, string | string[] | undefined>>;

const PATH = `${DIRECTORY_PATH}/new`;

function pageParam(params: Record<string, string | string[] | undefined>): number {
  const value = params.page;
  return pageNumber(Array.isArray(value) ? value[0] : value);
}

export async function generateMetadata({ searchParams }: { searchParams: SearchParams }): Promise<Metadata> {
  const directory = loadDirectory();
  const page = pageParam(await searchParams);
  return directoryPageMetadata({
    path: PATH,
    title: "New in Longview, TX | Longview businesses",
    description: `Longview businesses whose Texas sales-tax permit started in the ${NEW_WINDOW_DAYS} days before the latest batch, newest first.`,
    index: isDirectoryIndexable(directory) && page === 1,
  });
}

export default async function NewInLongviewPage({ searchParams }: { searchParams: SearchParams }) {
  const directory = loadDirectory();
  if (!hasDirectory(directory)) notFound();
  const names = new Map(directory.categories.map((c) => [c.slug, c.name]));
  const all = newInLongview(directory);
  const result = paginate(all, pageParam(await searchParams), DEFAULT_PAGE_SIZE);
  const asOf = batchDate(directory);

  return (
    <DirectoryPage
      directory={directory}
      eyebrow="Longview businesses"
      title="New in Longview"
      lead={`Businesses whose Texas sales-tax permit started in the ${NEW_WINDOW_DAYS} days before this batch${asOf ? ` (${formatDay(asOf)})` : ""}, newest first.`}
      crumbs={[{ label: "Longview businesses", href: DIRECTORY_PATH }, { label: "New in Longview" }]}
    >
      <section className="lvd-band lvd-band--tint" aria-labelledby="lvd-list-title">
        <div className="cb-shell">
          <h2 id="lvd-list-title" className="lvd-h2">
            New sales-tax permits
          </h2>
          <p className="lvd-note">
            A new sales-tax permit can also mean a new owner, a move, or a new location, not only a brand-new business.
          </p>
          {all.length ? (
            <>
              <ul className="lvd-cards">
                {result.results.map((business) => (
                  <BusinessCard key={business.id} business={business} categoryName={names.get(business.category) ?? business.category}>
                    <p className="lvd-card-extra">Permit on file since {formatDay(business.permitSince as string)}</p>
                  </BusinessCard>
                ))}
              </ul>
              <Pagination page={result.page} pages={result.pages} href={(page) => pageHref(PATH, {}, page)} />
            </>
          ) : (
            <div className="lvd-empty">
              <p>No new sales-tax permits in this window in the current batch.</p>
            </div>
          )}
        </div>
      </section>
      <BrowseBand directory={directory} current="new" />
    </DirectoryPage>
  );
}
