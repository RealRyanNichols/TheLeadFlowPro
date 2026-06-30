import type { Metadata } from "next";
import { Header } from "@/components/site/Header";
import { Footer } from "@/components/site/Footer";
import { DataMarketplaceClient } from "./DataMarketplaceClient";

export const metadata: Metadata = {
  title: "Data Marketplace - The LeadFlow Pro",
  description:
    "Start with the problem to solve, then request or list source-backed lead data with scoring, proof, exclusions, and fair-rate pricing."
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
