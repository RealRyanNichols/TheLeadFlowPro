import { withPublicPageMetadata } from "@/lib/publicPageMetadata";
import ServiceAreas from "@/components/service-areas/ServiceAreas";
import { readPublicCoverage } from "@/lib/service-areas/server";
export const dynamic = "force-dynamic";
export const metadata = withPublicPageMetadata("/service-areas", {
  title: "Service Areas & Industry Protection | The LeadFlow Pro",
  description:
    "Explore service areas by industry. Check local, statewide, or national coverage and see verified interest, temporary holds, and protected client territories.",
});
export default async function ServiceAreaPage() {
  const coverage = await readPublicCoverage();
  return <ServiceAreas {...coverage} />;
}
