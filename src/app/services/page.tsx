import { redirect } from "next/navigation";
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
  redirect("/tools/growth-machine");
}
