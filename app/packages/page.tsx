import { permanentRedirect } from "next/navigation";
import { buyerHref } from "@/lib/site/publicBuyerRoutes";

// Keep existing shared links and campaign attribution. Package detail pages
// now redirect too; existing paid-customer completion paths keep their terms.
export default async function PackagesPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const incoming = await searchParams;
  permanentRedirect(buyerHref("/pricing", incoming));
}
