import { permanentRedirect } from "next/navigation";

// The former new-buyer website deposit is retired. Preserve shared-link
// attribution; signed-client custom payments and completion paths are separate.
export default async function DepositPage({
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
