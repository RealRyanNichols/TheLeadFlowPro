import type { Metadata } from "next";
import AddOnsMenu from "./AddOnsMenu";

export const metadata: Metadata = {
  title: "The Add-On Menu | The LeadFlow Pro",
  description:
    "Inspect proven modules and request a written scope. Website Launch is $1,000: $500 to start and $500 after approval, before launch. Other modules are priced separately.",
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
