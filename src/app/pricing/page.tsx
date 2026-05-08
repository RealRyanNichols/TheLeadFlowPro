import { redirect } from "next/navigation";
import { createSeoMetadata } from "@/lib/seo-metadata";

export const metadata = createSeoMetadata({
  title: "Pricing — The LeadFlow Pro",
  description: "See the full LeadFlow Pro price ladder.",
  path: "/pricing",
  imageTitle: "Pricing",
  imageSubtitle: "See the full LeadFlow Pro price ladder and pick the right entry point.",
});

export default function PricingPage() {
  redirect("/tiers");
}
