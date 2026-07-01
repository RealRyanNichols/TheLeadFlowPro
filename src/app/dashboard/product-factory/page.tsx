import type { Metadata } from "next";
import { auth } from "@/lib/auth";
import { getProductFactoryData } from "@/lib/product-factory";
import { ProductFactoryClient } from "./ProductFactoryClient";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Product Factory | The LeadFlow Pro",
  description: "Admin-only Product Factory for turning reviewed signal groups into marketplace listings, samples, and exclusive offers.",
  robots: {
    index: false,
    follow: false,
  },
};

export default async function ProductFactoryPage() {
  const session = await auth();
  const data = await getProductFactoryData(session?.user?.email || undefined);
  return <ProductFactoryClient data={data} />;
}

