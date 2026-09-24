import Link from "next/link";

// Previous / next links that keep the current filters. Plain links, so paging
// works without JavaScript and every page has its own URL.

type PaginationProps = {
  page: number;
  pages: number;
  href: (page: number) => string;
};

export default function Pagination({ page, pages, href }: PaginationProps) {
  if (pages <= 1) return null;
  return (
    <nav className="lvd-pages" aria-label="Pages">
      {page > 1 ? (
        <Link href={href(page - 1)} rel="prev">
          Previous
        </Link>
      ) : (
        <span className="lvd-pages-off" />
      )}
      <span>
        Page {page} of {pages}
      </span>
      {page < pages ? (
        <Link href={href(page + 1)} rel="next">
          Next
        </Link>
      ) : (
        <span className="lvd-pages-off" />
      )}
    </nav>
  );
}

/** A path plus query string, dropping empty values and page 1. */
export function pageHref(path: string, params: Record<string, string | undefined>, page: number): string {
  const query = new URLSearchParams();
  for (const [key, value] of Object.entries(params)) if (value) query.set(key, value);
  if (page > 1) query.set("page", String(page));
  const text = query.toString();
  return text ? `${path}?${text}` : path;
}
