import { redirect } from "next/navigation";
import { createSeoMetadata } from "@/lib/seo-metadata";

export const metadata = createSeoMetadata({
  title: "Paid Unlocks | The LeadFlow Pro",
  description:
    "See the automated LeadFlow Pro unlock ladder: free snapshot, $47 report, $90 follow-up kit, $197 lead leak document, automation map, and Growth OS.",
  path: "/tiers",
  imageTitle: "Paid Unlocks",
  imageSubtitle: "Free preview first. Paid documents and systems when the gap is clear.",
});

export default function TiersPage() {
  redirect("/action-menu");
}
