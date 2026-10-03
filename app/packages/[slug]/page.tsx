import type { Metadata } from "next";
import { notFound, permanentRedirect } from "next/navigation";

const LEGACY_PACKAGES = ["launch", "system-map", "industry-os"] as const;
export const metadata: Metadata = {
  title: "Current monthly plans | The LeadFlow Pro",
  robots: { index: false, follow: true },
};
export function generateStaticParams() {
  return LEGACY_PACKAGES.map((slug) => ({ slug }));
}

// Retire the sales pages while preserving older customer fulfillment routes.
export default async function LegacyPackagePage({
  params,
  searchParams,
}: {
  params: Promise<{ slug: string }>;
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const { slug } = await params;
  if (!LEGACY_PACKAGES.includes(slug as (typeof LEGACY_PACKAGES)[number]))
    notFound();
  const incoming = await searchParams;
  const query = new URLSearchParams();
  for (const [key, value] of Object.entries(incoming)) {
    if (Array.isArray(value)) value.forEach((item) => query.append(key, item));
    else if (value !== undefined) query.set(key, value);
  }
  permanentRedirect(query.size ? `/pricing?${query}` : "/pricing");
}
