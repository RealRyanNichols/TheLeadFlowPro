import Link from "next/link";
import { ABOUT_PATH, categoryPath } from "@/lib/longviewDirectory/display";
import { DIRECTORY_PATH, type Directory } from "@/lib/longviewDirectory/types";

// Ways into the directory besides search: every category with its real count,
// the "new" and "hiring" lists, and the about page.

export function CategoryChips({ directory, current }: { directory: Directory; current?: string }) {
  return (
    <ul className="lvd-chips">
      {directory.categories.map((category) => (
        <li key={category.slug}>
          <Link href={categoryPath(category.slug)} aria-current={category.slug === current ? "page" : undefined}>
            {category.name} <small>{category.count.toLocaleString("en-US")}</small>
          </Link>
        </li>
      ))}
    </ul>
  );
}

export function MoreLinks({ current }: { current?: "all" | "new" | "hiring" | "about" }) {
  const links = [
    { key: "all", href: DIRECTORY_PATH, label: "All businesses" },
    { key: "new", href: `${DIRECTORY_PATH}/new`, label: "New in Longview" },
    { key: "hiring", href: `${DIRECTORY_PATH}/hiring`, label: "Longview is hiring" },
    { key: "about", href: ABOUT_PATH, label: "About this directory" },
  ].filter((link) => link.key !== current);
  return (
    <ul className="lvd-links">
      {links.map((link) => (
        <li key={link.key}>
          <Link href={link.href}>{link.label}</Link>
        </li>
      ))}
    </ul>
  );
}

/** The closing "browse" band used under every list page. */
export function BrowseBand({ directory, current, category }: { directory: Directory; current?: "all" | "new" | "hiring" | "about"; category?: string }) {
  return (
    <section className="lvd-band" aria-labelledby="lvd-browse-title">
      <div className="cb-shell">
        <h2 id="lvd-browse-title" className="lvd-h2">
          Browse by category
        </h2>
        <CategoryChips directory={directory} current={category} />
        <h2 className="lvd-h2 lvd-subhead">More ways in</h2>
        <MoreLinks current={current} />
      </div>
    </section>
  );
}
