import type { Metadata } from "next";
import AddOnsMenu from "./AddOnsMenu";

export const metadata: Metadata = {
  title: "The Add-On Menu | The LeadFlow Pro",
  description:
    "Inspect proven LeadFlow modules and request a written scope. Approved first five-page websites have a $0 build fee; tools and growth systems are priced separately.",
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
};

export default function AddOnsPage() {
  return <AddOnsMenu />;
}
