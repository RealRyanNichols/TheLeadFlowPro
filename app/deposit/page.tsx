import { permanentRedirect } from "next/navigation";
import { buyerHref } from "@/lib/site/publicBuyerRoutes";

// The former new-buyer website deposit is retired. Preserve shared-link
// attribution; signed-client custom payments and completion paths are separate.
export default async function DepositPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const incoming = await searchParams;
  permanentRedirect(buyerHref("/pricing", incoming));
}
