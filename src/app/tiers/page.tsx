import { AutomatedDoorwayPage } from "@/components/site/AutomatedDoorwayPage";
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
  return (
    <AutomatedDoorwayPage
      activePath="/action-menu"
      eyebrow="Paid unlock ladder"
      title="The tier page is now a menu of automated unlocks."
      body="Start free, then unlock the asset that matches the pressure point: a report, follow-up kit, lead leak document, automation blueprint, public loop, or full Growth OS path."
      primaryHref="/action-menu"
      primaryLabel="Open unlock menu"
      secondaryHref="/tools/growth-machine#tool"
      secondaryLabel="Run free snapshot"
    />
  );
}
