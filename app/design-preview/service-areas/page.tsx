import { headers } from "next/headers";
import { notFound } from "next/navigation";
import ServiceAreas from "@/components/service-areas/ServiceAreas";
import type { PublicTerritory } from "@/lib/service-areas/engine";
export const dynamic = "force-dynamic";
export const metadata = {
  title: "Service-area design preview",
  robots: { index: false, follow: false },
};
export default async function Preview() {
  const host = (await headers()).get("host")?.split(":")[0];
  if (
    process.env.NODE_ENV !== "development" ||
    !["localhost", "127.0.0.1"].includes(host ?? "")
  )
    notFound();
  const territories: PublicTerritory[] = [
    {
      id: "example-protected",
      industry: "farm-ag",
      services: ["land-clearing", "earthwork", "ponds", "hay", "ag-services"],
      stage: "protected",
      publicRegion: "Example: Tyler market",
      expiresAt: null,
      geometry: {
        kind: "radius",
        center: { lat: 32.3513, lng: -95.3011 },
        miles: 35,
      },
    },
    {
      id: "example-interest",
      industry: "farm-ag",
      services: ["land-clearing"],
      stage: "interest",
      publicRegion: "Example: Longview interest",
      expiresAt: "2026-11-02T05:00:00.000Z",
      geometry: {
        kind: "radius",
        center: { lat: 32.5007, lng: -94.7405 },
        miles: 25,
      },
    },
    {
      id: "example-hold",
      industry: "farm-ag",
      services: ["ponds"],
      stage: "held",
      publicRegion: "Example: Canton review",
      expiresAt: "2026-10-10T05:00:00.000Z",
      geometry: {
        kind: "radius",
        center: { lat: 32.5565, lng: -95.8633 },
        miles: 20,
      },
    },
  ];
  return <ServiceAreas preview available territories={territories} />;
}
