import { AutomatedDoorwayPage } from "@/components/site/AutomatedDoorwayPage";
import { createSeoMetadata } from "@/lib/seo-metadata";

export const metadata = createSeoMetadata({
  title: "Automated Growth Tools | The LeadFlow Pro",
  description:
    "The LeadFlow Pro now routes services traffic into automated growth tools, free snapshots, paid reports, scripts, maps, dashboards, and Growth OS paths.",
  path: "/services",
  imageTitle: "Automated Growth Tools",
  imageSubtitle: "Run the tool first. Unlock the document or system path when the gap is clear.",
});

export default function ServicesPage() {
  return (
    <AutomatedDoorwayPage
      activePath="/tools/growth-machine"
      eyebrow="Services became tools"
      title="The service page now routes into the automated Growth Machine."
      body="Instead of asking a visitor to pick a vague service, the site asks for business data, creates a useful score, and points them to the report, script kit, automation map, dashboard spec, or Growth OS path that fits."
    />
  );
}
