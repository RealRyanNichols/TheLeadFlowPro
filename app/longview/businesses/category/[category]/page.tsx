import type { Metadata } from "next";
import { notFound } from "next/navigation";
import DirectoryPage from "@/components/longview/DirectoryPage";
import BusinessCard from "@/components/longview/BusinessCard";
import Pagination, { pageHref } from "@/components/longview/Pagination";
import { BrowseBand } from "@/components/longview/DirectoryLinks";
import {
  DEFAULT_PAGE_SIZE,
  businessesByCategory,
  categoryBySlug,
  categoryPath,
  isDirectoryIndexable,
  loadDirectory,
  paginate,
} from "@/lib/longviewDirectory/data";
import { NOINDEX, directoryPageMetadata } from "@/lib/longviewDirectory/metadata";
import { pageNumber } from "@/lib/longviewDirectory/query";
import { DIRECTORY_PATH } from "@/lib/longviewDirectory/types";

// One category, every business in it, A to Z. Rendered per request (it reads
// ?page=); an unknown or empty category is a 404.

type Params = Promise<{ category: string }>;
type SearchParams = Promise<Record<string, string | string[] | undefined>>;

const SUBTITLE = "Every one we could verify, listed A to Z. Not ranked.";

function pageParam(params: Record<string, string | string[] | undefined>): number {
  const value = params.page;
  return pageNumber(Array.isArray(value) ? value[0] : value);
}

export async function generateMetadata({ params, searchParams }: { params: Params; searchParams: SearchParams }): Promise<Metadata> {
  const { category: slug } = await params;
  const directory = loadDirectory();
  const category = categoryBySlug(slug, directory);
  if (!category) return { title: "Category not found | Longview businesses", robots: NOINDEX };
  const page = pageParam(await searchParams);
  return directoryPageMetadata({
    path: categoryPath(category.slug),
    title: `${category.name} in Longview, TX | Longview businesses`,
    description: `${category.name} in the City of Longview, Texas, listed A to Z with the source and check date for every fact. Not ranked, no reviews.`,
    index: isDirectoryIndexable(directory) && page === 1,
  });
}

export default async function CategoryPage({ params, searchParams }: { params: Params; searchParams: SearchParams }) {
  const { category: slug } = await params;
  const directory = loadDirectory();
  const category = categoryBySlug(slug, directory);
  const businesses = category ? businessesByCategory(category.slug, directory) : [];
  if (!category || !businesses.length) notFound();

  const result = paginate(businesses, pageParam(await searchParams), DEFAULT_PAGE_SIZE);
  const start = (result.page - 1) * DEFAULT_PAGE_SIZE + 1;
  const end = start + result.results.length - 1;

  return (
    <DirectoryPage
      directory={directory}
      eyebrow="Longview businesses"
      title={`${category.name} in Longview`}
      lead={SUBTITLE}
      crumbs={[{ label: "Longview businesses", href: DIRECTORY_PATH }, { label: category.name }]}
    >
      <section className="lvd-band lvd-band--tint" aria-labelledby="lvd-list-title">
        <div className="cb-shell">
          <h2 id="lvd-list-title" className="lvd-h2">
            {businesses.length.toLocaleString("en-US")} {businesses.length === 1 ? "business" : "businesses"}
          </h2>
          {result.pages > 1 ? (
            <p className="lvd-count">
              Showing {start.toLocaleString("en-US")} to {end.toLocaleString("en-US")} of {result.total.toLocaleString("en-US")}.
            </p>
          ) : null}
          <ul className="lvd-cards">
            {result.results.map((business) => (
              <BusinessCard key={business.id} business={business} categoryName={category.name} />
            ))}
          </ul>
          <Pagination page={result.page} pages={result.pages} href={(page) => pageHref(categoryPath(category.slug), {}, page)} />
        </div>
      </section>
      <BrowseBand directory={directory} category={category.slug} />
    </DirectoryPage>
  );
}
