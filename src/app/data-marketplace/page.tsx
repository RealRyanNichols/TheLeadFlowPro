import type { Metadata } from "next";
import { Header } from "@/components/site/Header";
import { Footer } from "@/components/site/Footer";
import { DataMarketplaceClient } from "./DataMarketplaceClient";

export const metadata: Metadata = {
  title: "Universal Lead Intake - The LeadFlow Pro",
  description:
    "Request leads or submit public-source lead sources for scoring, tagging, review, and storage in the LeadFlow brain."
};

export default function DataMarketplacePage() {
  return (
    <>
      <Header />
      <main>
        <DataMarketplaceClient />
      </main>
      <Footer />
    </>
  );
}
