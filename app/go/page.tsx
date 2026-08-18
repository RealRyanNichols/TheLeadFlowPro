import { permanentRedirect } from "next/navigation";

type GoSearchParams = Record<string, string | string[] | undefined>;

// /go was the original paid-traffic landing page. Keep its short URL and every
// attribution parameter, but send the visit into the proof-led Premier funnel.
export default async function GoPage({
  searchParams,
}: {
  searchParams: Promise<GoSearchParams>;
}) {
  const incoming = await searchParams;
  const forwarded = new URLSearchParams();

  for (const [key, value] of Object.entries(incoming)) {
    if (Array.isArray(value)) {
      for (const item of value) forwarded.append(key, item);
    } else if (value !== undefined) {
      forwarded.set(key, value);
    }
  }

  const query = forwarded.toString();
  permanentRedirect(query ? `/premier-system?${query}` : "/premier-system");
}
