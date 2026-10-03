import { permanentRedirect } from "next/navigation";

// Keep existing shared links and campaign attribution. Package detail pages
// now redirect too; existing paid-customer completion paths keep their terms.
export default async function PackagesPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const incoming = await searchParams;
  const forwarded = new URLSearchParams();
  for (const [key, value] of Object.entries(incoming)) {
    if (Array.isArray(value)) value.forEach((item) => forwarded.append(key, item));
    else if (value !== undefined) forwarded.set(key, value);
  }
  const query = forwarded.toString();
  permanentRedirect(query ? `/pricing?${query}` : "/pricing");
}
