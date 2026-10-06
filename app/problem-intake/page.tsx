import { permanentRedirect } from "next/navigation";
import {
  retiredBuyerDestination,
  type BuyerQuery,
} from "@/lib/site/publicBuyerRoutes";

// Keep the shared entry URL and campaign context. Existing paid-customer
// completion routes and written agreements remain separate from this inquiry.
export default async function BuyerEntryPage({
  searchParams,
}: {
  searchParams: Promise<BuyerQuery>;
}) {
  permanentRedirect(
    retiredBuyerDestination("/problem-intake", await searchParams),
  );
}
