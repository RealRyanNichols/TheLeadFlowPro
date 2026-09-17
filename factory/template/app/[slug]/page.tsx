import { notFound } from "next/navigation";
import { ConversionPage } from "../../components/Site";
import { loadConfig } from "../../lib/load";

// The one conversion page (quote, booking, estimate, or campaign). Its slug
// comes from site.config.json; anything else is a 404.
export default async function Page({ params, searchParams }: { params: Promise<{ slug: string }>; searchParams: Promise<{ sent?: string; error?: string }> }) {
  const c = loadConfig();
  const { slug } = await params;
  if (slug !== c.pages.conversion.slug) notFound();
  const { sent, error } = await searchParams;
  return <ConversionPage ctx={{ config: c, path: `/${slug}`, formAction: "/api/lead" }} submitted={sent === "1"} error={error ?? null} />;
}
