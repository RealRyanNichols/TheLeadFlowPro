import { AutomatedDoorwayPage } from "@/components/site/AutomatedDoorwayPage";
import { createSeoMetadata } from "@/lib/seo-metadata";

export const metadata = createSeoMetadata({
  title: "Paid Unlocks | The LeadFlow Pro",
  description: "See the automated LeadFlow Pro price ladder for reports, scripts, maps, dashboards, and Growth OS.",
  path: "/pricing",
  imageTitle: "Paid Unlocks",
  imageSubtitle: "Free preview first. Paid documents and systems when the gap is clear.",
});

export default function PricingPage() {
  return (
    <AutomatedDoorwayPage
      activePath="/action-menu"
      eyebrow="Automated pricing"
      title="Pricing now starts with a free score and paid document unlocks."
      body="The model is simple: run the free snapshot, then pay for the useful asset at the moment it matters. Reports, kits, maps, dashboards, public loops, and Growth OS paths all route from the same machine."
      primaryHref="/action-menu"
      primaryLabel="Open unlock menu"
      secondaryHref="/tools/growth-machine#tool"
      secondaryLabel="Run free snapshot"
    />
  );
}
