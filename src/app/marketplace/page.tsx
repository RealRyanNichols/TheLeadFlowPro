import { Footer } from "@/components/site/Footer";
import { Header } from "@/components/site/Header";
import { createSeoMetadata } from "@/lib/seo-metadata";
import { MarketplaceClient } from "./MarketplaceClient";

export const metadata = createSeoMetadata({
  title: "Lead Signal Marketplace | The LeadFlow Pro",
  description:
    "Browse source-backed lead signals, sample data products, and scored opportunity profiles with proof, confidence, suppression, and buyer-use review.",
  path: "/marketplace",
  imageTitle: "Buy lead signals with proof attached.",
  imageSubtitle: "No mystery spreadsheets. No blind lists. Review-gated access to source-backed buyer signals.",
  imageKicker: "LeadFlow marketplace",
});

export default function MarketplacePage() {
  return (
    <>
      <Header />
      <MarketplaceClient />
      <Footer />
    </>
  );
}
