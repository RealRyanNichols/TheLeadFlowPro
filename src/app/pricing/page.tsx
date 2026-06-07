import { redirect } from "next/navigation";
import { createSeoMetadata } from "@/lib/seo-metadata";

export const metadata = createSeoMetadata({
  title: "Paid Unlocks | The LeadFlow Pro",
  description: "See the automated LeadFlow Pro price ladder for reports, scripts, maps, dashboards, and Growth OS.",
  path: "/pricing",
  imageTitle: "Paid Unlocks",
  imageSubtitle: "Free preview first. Paid documents and systems when the gap is clear.",
});

export default function PricingPage() {
  redirect("/action-menu");
}
