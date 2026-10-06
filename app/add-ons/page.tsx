import { withPublicPageMetadata } from "@/lib/publicPageMetadata";
import type { Metadata } from "next";
import AddOnsMenu from "./AddOnsMenu";

export const metadata: Metadata = withPublicPageMetadata("/add-ons", {
  title: "The Add-On Menu | The LeadFlow Pro",
  description:
    "Choose LeadFlow modules for a written scope. Managed work includes its agreed advertising allocation; custom work beyond that scope is quoted before approval.",
  alternates: { canonical: "https://www.theleadflowpro.com/add-ons" },
  openGraph: {
    title: "Choose the capability. Get the scope before the build.",
    description:
      "Select proven LeadFlow modules and request a written scope, timeline, and price before production begins.",
    url: "https://www.theleadflowpro.com/add-ons",
    siteName: "The LeadFlow Pro",
    images: [
      {
        url: "/images/offer-v2/premier-operating-system.webp",
        width: 3840,
        height: 2160,
      },
    ],
    type: "website",
  },
});

export default async function AddOnsPage({
  searchParams,
}: {
  searchParams: Promise<{ module?: string | string[] }>;
}) {
  const { module } = await searchParams;
  return <AddOnsMenu initialModule={module === "courses" ? "courses" : null} />;
}
