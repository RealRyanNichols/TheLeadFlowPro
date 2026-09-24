import type { Metadata } from "next";
import { notFound } from "next/navigation";
import DirectoryPage from "@/components/longview/DirectoryPage";
import BusinessCard from "@/components/longview/BusinessCard";
import Pagination, { pageHref } from "@/components/longview/Pagination";
import { BrowseBand } from "@/components/longview/DirectoryLinks";
import {
  DEFAULT_PAGE_SIZE,
  hasDirectory,
  hiringBusinesses,
  isDirectoryIndexable,
  loadDirectory,
  paginate,
} from "@/lib/longviewDirectory/data";
import { ROLE_LABELS, formatDay, websiteHost } from "@/lib/longviewDirectory/display";
import { directoryPageMetadata } from "@/lib/longviewDirectory/metadata";
import { pageNumber } from "@/lib/longviewDirectory/query";
import { DIRECTORY_PATH } from "@/lib/longviewDirectory/types";

// "Longview is hiring": businesses with a careers page on their own website.
// We link out to it and name the roles we saw there in plain words; we never
// take applications or contact anyone.

type SearchParams = Promise<Record<string, string | string[] | undefined>>;

const PATH = `${DIRECTORY_PATH}/hiring`;
const REL = "nofollow noopener noreferrer";

function pageParam(params: Record<string, string | string[] | undefined>): number {
  const value = params.page;
  return pageNumber(Array.isArray(value) ? value[0] : value);
}

export async function generateMetadata({ searchParams }: { searchParams: SearchParams }): Promise<Metadata> {
  const directory = loadDirectory();
  const page = pageParam(await searchParams);
  return directoryPageMetadata({
    path: PATH,
    title: "Longview is hiring | Longview businesses",
    description: "Longview businesses with a careers page on their own website, linked out, with the roles mentioned there and the date each page was checked.",
    index: isDirectoryIndexable(directory) && page === 1,
  });
}

export default async function LongviewHiringPage({ searchParams }: { searchParams: SearchParams }) {
  const directory = loadDirectory();
  if (!hasDirectory(directory)) notFound();
  const names = new Map(directory.categories.map((c) => [c.slug, c.name]));
  const all = hiringBusinesses(directory);
  const result = paginate(all, pageParam(await searchParams), DEFAULT_PAGE_SIZE);

  return (
    <DirectoryPage
      directory={directory}
      eyebrow="Longview businesses"
      title="Longview is hiring"
      lead="Businesses with a careers page on their own website, A to Z. Apply on their site; we do not take applications."
      crumbs={[{ label: "Longview businesses", href: DIRECTORY_PATH }, { label: "Longview is hiring" }]}
    >
      <section className="lvd-band lvd-band--tint" aria-labelledby="lvd-list-title">
        <div className="cb-shell">
          <h2 id="lvd-list-title" className="lvd-h2">
            Careers pages
          </h2>
          {all.length ? (
            <>
              <ul className="lvd-cards">
                {result.results.map((business) => {
                  const checked = business.facts.find((f) => f.field === "careers")?.checkedAt;
                  return (
                    <BusinessCard key={business.id} business={business} categoryName={names.get(business.category) ?? business.category}>
                      <p className="lvd-card-extra">
                        <a href={business.careersUrl as string} rel={REL}>
                          Careers page on {websiteHost(business.careersUrl as string)}
                        </a>
                      </p>
                      {business.hiringRoles.length ? (
                        <p className="lvd-card-extra">Roles mentioned: {business.hiringRoles.map((role) => ROLE_LABELS[role]).join(", ")}</p>
                      ) : null}
                      {checked ? <p className="lvd-card-extra">checked {formatDay(checked)}</p> : null}
                    </BusinessCard>
                  );
                })}
              </ul>
              <Pagination page={result.page} pages={result.pages} href={(page) => pageHref(PATH, {}, page)} />
            </>
          ) : (
            <div className="lvd-empty">
              <p>No careers pages found on business websites in the current batch.</p>
            </div>
          )}
        </div>
      </section>
      <BrowseBand directory={directory} current="hiring" />
    </DirectoryPage>
  );
}
