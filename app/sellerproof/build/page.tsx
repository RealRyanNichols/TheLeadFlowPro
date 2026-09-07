import type { Metadata } from "next";
import Builder from "./Builder";
export const metadata: Metadata = {
  title: "Build your evidence packet | SellerProof",
  robots: { index: false, follow: false },
  referrer: "no-referrer",
  alternates: { canonical: "/sellerproof/build" },
};
export default function SellerProofBuilderPage() {
  return <Builder />;
}
