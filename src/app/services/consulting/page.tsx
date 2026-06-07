import { redirect } from "next/navigation";
import { createSeoMetadata } from "@/lib/seo-metadata";

export const metadata = createSeoMetadata({
  title: "Automated Growth Tools | The LeadFlow Pro",
  description:
    "The old consulting lane now routes to automated growth tools, paid unlocks, reports, scripts, maps, and Growth OS paths.",
  path: "/services/consulting",
  imageTitle: "Automated Growth Tools",
  imageSubtitle: "Run the tool first. Unlock the report, kit, map, or Growth OS path when it matters.",
});

export default function ConsultingRedirectPage() {
  redirect("/tools/growth-machine");
}
